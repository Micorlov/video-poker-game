package com.micorlov.videopoker.nativeapp.ui

import androidx.lifecycle.ViewModel
import com.micorlov.videopoker.nativeapp.data.AppTheme
import com.micorlov.videopoker.nativeapp.data.GameRepository
import com.micorlov.videopoker.nativeapp.data.UserSettings
import com.micorlov.videopoker.nativeapp.domain.AllInOffer
import com.micorlov.videopoker.nativeapp.domain.AppLanguage
import com.micorlov.videopoker.nativeapp.domain.DrawOutcome
import com.micorlov.videopoker.nativeapp.domain.GameEngine
import com.micorlov.videopoker.nativeapp.domain.GameEvent
import com.micorlov.videopoker.nativeapp.domain.GameState
import com.micorlov.videopoker.nativeapp.domain.Phase
import com.micorlov.videopoker.nativeapp.domain.ReviewAsk
import com.micorlov.videopoker.nativeapp.domain.ReviewPolicy
import com.micorlov.videopoker.nativeapp.domain.Rules
import com.micorlov.videopoker.nativeapp.domain.Transition
import com.micorlov.videopoker.nativeapp.domain.Variant
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.channels.ReceiveChannel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlin.random.Random

/** What the screens render. [revealedRound] is the last round whose cards finished flipping. */
data class UiState(
    val game: GameState,
    val settings: UserSettings,
    val revealedRound: Int,
    val toast: Toast?,
    /** ALL INs still available today. */
    val allInRemaining: Int = Rules.ALL_IN_DAILY_LIMIT,
    /** Set while the ALL IN confirmation sheet is open. */
    val allInOffer: AllInOffer? = null,
    /** The "Enjoying Video Poker?" card is up. */
    val reviewCardVisible: Boolean = false,
) {
    /** True once the cards of the current round are face up, so results may be shown. */
    val revealed: Boolean get() = revealedRound == game.round
}

data class Toast(val id: Int, val message: ToastMessage)

sealed interface ToastMessage {
    data class Rebuy(val amount: Long) : ToastMessage
    data class DailyBonus(val amount: Long) : ToastMessage
    data class VariantLocked(val level: Int) : ToastMessage
    data class MultiHandLocked(val level: Int) : ToastMessage
    data object FinishHandFirst : ToastMessage
    data object StatsReset : ToastMessage
    data object HintsOn : ToastMessage
    data object AllInGoodLuck : ToastMessage
    data object NoAllInLeft : ToastMessage
}

/** One-shot happenings the UI reacts to with sound, haptics and fireworks. */
sealed interface UiEffect {
    data class HandRevealed(val outcome: DrawOutcome) : UiEffect

    /** A quality win earned a rating ask: call [GameViewModel.onReviewTimer] after [ReviewPolicy.PROMPT_DELAY_MS]. */
    data object ReviewEarned : UiEffect

    /** Show Google Play's in-app review sheet. */
    data object RequestNativeReview : UiEffect
}

/**
 * Holds the table and the settings, applies the player's actions through [GameEngine],
 * and decides when to save. Contains no Android types, so it is unit-tested on the JVM.
 */
class GameViewModel(
    private val repository: GameRepository,
    private val random: Random = Random.Default,
    /** Today's local day key; null turns the daily bonus off (tests that need exact balances). */
    private val todayKey: (() -> String)? = null,
    private val clock: () -> Long = System::currentTimeMillis,
    /** The review ask is for the real app only; tests leave it off. */
    private val reviewEnabled: Boolean = false,
) : ViewModel() {

    private val effectChannel = Channel<UiEffect>(Channel.UNLIMITED)
    private var toastCounter = 0

    private val _state: MutableStateFlow<UiState>
    private var allInUsed = 0
    private var reviewAskedThisSession = false
    private var reviewTimerPending = false

    /** One flow for the whole lifetime: collectors key on its identity, so it must not be rebuilt per read. */
    val state: StateFlow<UiState>
    val effects: ReceiveChannel<UiEffect> get() = effectChannel

    init {
        val settings = repository.loadSettings()
        val opening = GameEngine.newGame(repository.loadGame(), settings.defaultBet, random)
        allInUsed = repository.loadAllInUsed(today())
        _state = MutableStateFlow(
            UiState(opening.state, settings, revealedRound = -1, toast = null, allInRemaining = allInRemaining()),
        )
        state = _state.asStateFlow()
        // The opening deal can already carry news (a free rebuy for a player who left broke).
        applyEvents(opening.events, persist = opening.events.any { it is GameEvent.Rebuy }, game = opening.state)
        grantDailyBonus()
    }

    /** +[Rules.DAILY_BONUS] chips the first time the app opens on a new local day. Idempotent per day. */
    private fun grantDailyBonus() {
        val today = todayKey?.invoke() ?: return
        if (repository.loadDailyBonusDay() == today) return
        val game = _state.value.game
        val bonused = game.copy(balance = game.balance + Rules.DAILY_BONUS)
        _state.update { it.copy(game = bonused) }
        repository.saveGame(bonused.toSaved())
        repository.saveDailyBonusDay(today)
        showToast(ToastMessage.DailyBonus(Rules.DAILY_BONUS))
    }

    fun onMainAction() {
        val game = _state.value.game
        val transition = if (game.phase == Phase.BET) GameEngine.deal(game, random) else GameEngine.draw(game, random)
        val finishedHand = game.phase == Phase.HOLD
        commit(transition, persist = finishedHand || transition.events.any { it is GameEvent.Rebuy })
    }

    fun onToggleHold(index: Int) = commit(Transition(GameEngine.toggleHold(_state.value.game, index)))

    fun onSelectBet(amount: Int) = commit(Transition(GameEngine.selectBet(_state.value.game, amount)))

    fun onSelectVariant(variant: Variant) {
        val before = _state.value.game
        val transition = GameEngine.selectVariant(before, variant)
        commit(transition, persist = transition.state.variant != before.variant)
    }

    fun onSelectHandCount(count: Int) {
        val before = _state.value.game
        val transition = GameEngine.selectHandCount(before, count)
        commit(transition, persist = transition.state.handCount != before.handCount)
    }

    fun onResetStatistics() {
        val reset = GameEngine.resetStatistics(_state.value.game)
        commit(Transition(reset), persist = true)
        showToast(ToastMessage.StatsReset)
    }

    /** Called by the hand view when [round]'s flip animation has finished. */
    fun onRevealed(round: Int) {
        val current = _state.value
        if (round != current.game.round || current.revealed) return
        _state.update { it.copy(revealedRound = round) }
        current.game.outcome?.let {
            effectChannel.trySend(UiEffect.HandRevealed(it))
            if (ReviewPolicy.isQualityWin(it.bestType)) onQualityWin(current.game.level)
        }
    }

    private fun onQualityWin(level: Int) {
        if (!reviewEnabled) return
        val state = repository.loadReview().let { it.copy(wins = it.wins + 1) }
        repository.saveReview(state)
        if (reviewAskedThisSession || reviewTimerPending) return
        if (!ReviewPolicy.earnedAsk(state, level, clock())) return
        reviewTimerPending = true
        effectChannel.trySend(UiEffect.ReviewEarned)
    }

    /**
     * The ask timer fired. [blocked] is true when another prompt owns the screen: the ask is
     * skipped, not spent, so it can come back after a later win.
     */
    fun onReviewTimer(blocked: Boolean) {
        reviewTimerPending = false
        if (reviewAskedThisSession || blocked || _state.value.allInOffer != null || _state.value.reviewCardVisible) return
        val state = repository.loadReview()
        val now = clock()
        when (ReviewPolicy.decide(state, now)) {
            ReviewAsk.NONE -> Unit
            ReviewAsk.NATIVE_SHEET -> {
                reviewAskedThisSession = true
                repository.saveReview(state.copy(shown = true, shownAt = now))
                effectChannel.trySend(UiEffect.RequestNativeReview)
            }
            ReviewAsk.STAR_CARD -> {
                reviewAskedThisSession = true
                repository.saveReview(state.copy(cardCount = state.cardCount + 1, lastCardAt = now))
                _state.update { it.copy(reviewCardVisible = true) }
            }
        }
    }

    /** "Rate now" on the card: never ask again. */
    fun onReviewRated() {
        repository.saveReview(repository.loadReview().copy(rated = true))
        _state.update { it.copy(reviewCardVisible = false) }
    }

    fun onReviewDismissed() = _state.update { it.copy(reviewCardVisible = false) }

    fun onToggleSound() = updateSettings { it.copy(soundEnabled = !it.soundEnabled) }

    fun onToggleHints() {
        updateSettings { it.copy(hintsEnabled = !it.hintsEnabled) }
        if (_state.value.settings.hintsEnabled) showToast(ToastMessage.HintsOn)
    }

    /** ALL IN tapped: open the confirmation, or explain why not. Allowed mid-hand, as on the web. */
    fun onAllInRequested() {
        val game = _state.value.game
        if (_state.value.allInRemaining <= 0) return showToast(ToastMessage.NoAllInLeft)
        val offer = GameEngine.allInOffer(game)
        if (offer == null) {
            commit(GameEngine.rebuy(game), persist = true)
            return
        }
        _state.update { it.copy(allInOffer = offer) }
    }

    fun onAllInConfirmed() {
        val current = _state.value
        val offer = current.allInOffer ?: return
        allInUsed++
        repository.saveAllInUsed(today(), allInUsed)
        _state.update { it.copy(game = GameEngine.allIn(it.game, offer), allInOffer = null, allInRemaining = allInRemaining()) }
        showToast(ToastMessage.AllInGoodLuck)
    }

    fun onAllInDismissed() = _state.update { it.copy(allInOffer = null) }

    private fun today(): String = todayKey?.invoke().orEmpty()

    private fun allInRemaining(): Int = (Rules.ALL_IN_DAILY_LIMIT - allInUsed).coerceAtLeast(0)

    fun onSelectLanguage(language: AppLanguage) = updateSettings { it.copy(language = language) }

    fun onToggleVoice() = updateSettings { it.copy(voiceEnabled = !it.voiceEnabled) }

    fun onToggleHaptics() = updateSettings { it.copy(hapticsEnabled = !it.hapticsEnabled) }

    fun onSelectTheme(theme: AppTheme) = updateSettings { it.copy(theme = theme) }

    fun onSelectDefaultBet(amount: Int) {
        updateSettings { it.copy(defaultBet = amount) }
        commit(Transition(GameEngine.selectBet(_state.value.game, amount)))
    }

    fun onDismissToast(id: Int) = _state.update { if (it.toast?.id == id) it.copy(toast = null) else it }

    private fun updateSettings(change: (UserSettings) -> UserSettings) {
        val settings = change(_state.value.settings)
        repository.saveSettings(settings)
        _state.update { it.copy(settings = settings) }
    }

    private fun commit(transition: Transition, persist: Boolean = false) {
        _state.update { it.copy(game = transition.state) }
        applyEvents(transition.events, persist, transition.state)
    }

    private fun applyEvents(events: List<GameEvent>, persist: Boolean, game: GameState) {
        events.map(::toastFor).lastOrNull()?.let(::showToast)
        if (persist) repository.saveGame(game.toSaved())
    }

    private fun toastFor(event: GameEvent): ToastMessage = when (event) {
        is GameEvent.Rebuy -> ToastMessage.Rebuy(event.amount)
        is GameEvent.VariantLocked -> ToastMessage.VariantLocked(event.level)
        is GameEvent.MultiHandLocked -> ToastMessage.MultiHandLocked(event.level)
        GameEvent.FinishHandFirst -> ToastMessage.FinishHandFirst
    }

    private fun showToast(message: ToastMessage) {
        val toast = Toast(id = ++toastCounter, message = message)
        _state.update { it.copy(toast = toast) }
    }
}
