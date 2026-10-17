package com.micorlov.videopoker.nativeapp.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import com.micorlov.videopoker.nativeapp.data.AnalyticsEvents
import com.micorlov.videopoker.nativeapp.data.AppTheme
import com.micorlov.videopoker.nativeapp.data.EventLogger
import com.micorlov.videopoker.nativeapp.data.GameSpeed
import com.micorlov.videopoker.nativeapp.data.GameRepository
import com.micorlov.videopoker.nativeapp.data.UserSettings
import com.micorlov.videopoker.nativeapp.domain.AllInOffer
import com.micorlov.videopoker.nativeapp.domain.AppLanguage
import com.micorlov.videopoker.nativeapp.domain.Card
import com.micorlov.videopoker.nativeapp.domain.DailyProfitPolicy
import com.micorlov.videopoker.nativeapp.domain.DoubleUpResult
import com.micorlov.videopoker.nativeapp.domain.DrawOutcome
import com.micorlov.videopoker.nativeapp.domain.GameEngine
import com.micorlov.videopoker.nativeapp.domain.GameEvent
import com.micorlov.videopoker.nativeapp.domain.GameState
import com.micorlov.videopoker.nativeapp.domain.HandEvaluator
import com.micorlov.videopoker.nativeapp.domain.HoldAnalysis
import com.micorlov.videopoker.nativeapp.domain.HoldAnalyzer
import com.micorlov.videopoker.nativeapp.domain.Phase
import com.micorlov.videopoker.nativeapp.domain.RemoteFlags
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
    /** The opening hand has already pointed at the hints lamp. */
    val hintsTipSeen: Boolean = false,
    /** The opening hand has already explained that ALL IN is once a day. */
    val allInTipSeen: Boolean = false,
    /** First-run walkthrough is up. */
    val showOnboarding: Boolean = false,
    /** Admin switches; defaults until the fetch lands. */
    val flags: RemoteFlags = RemoteFlags(),
    /** The hold maths for a deal, once it has been worked out. */
    val analysis: RoundAnalysis? = null,
    /** How the last draw's holds compared with the best play. */
    val review: DecisionReview? = null,
    /** The [com.micorlov.videopoker.nativeapp.domain.DoubleUp.number] whose cards finished turning over; 0 for none this hand. */
    val revealedDoubleUp: Int = 0,
) {
    /** True once the cards of the current round are face up, so results may be shown. */
    val revealed: Boolean get() = revealedRound == game.round

    /** Expected values for the hand on the table, while holds are being chosen. */
    val holdAnalysis: HoldAnalysis?
        get() = analysis?.takeIf { game.phase == Phase.HOLD && it.round == game.round }?.analysis

    /** The review of the hand on the table, once its cards are face up and feedback is on. */
    val visibleReview: DecisionReview?
        get() = review?.takeIf { settings.feedbackEnabled && revealed && it.round == game.round }

    /** True once a settled double-up's cards are face up, so its result may be shown. */
    val doubleUpRevealed: Boolean
        get() = game.doubleUp?.let { it.result != null && it.number == revealedDoubleUp } == true

    /** A double-up can be started right now. */
    val canDoubleUp: Boolean
        get() = settings.doubleUpEnabled && game.doubleUpStake != null && revealed && (game.doubleUp == null || doubleUpRevealed)
}

/** [analysis] belongs to the deal of [round]. */
data class RoundAnalysis(val round: Int, val analysis: HoldAnalysis)

/**
 * How a draw's holds measured up. [round] is the round the draw produced. [cost] is the chips
 * the choice gave up on average (zero for a best play); [bestCards] is what the best play kept.
 */
data class DecisionReview(
    val round: Int,
    val best: Boolean,
    val cost: Double,
    val bestCards: List<Card>,
    val chosenEv: Double,
    val bestEv: Double,
)

/** Where the hold maths runs: off the main thread in the app; inline, or not at all, in tests. */
enum class AnalysisMode { OFF, INLINE, BACKGROUND }

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
    data object AllInAfterCards : ToastMessage
    data class ReferralWelcome(val amount: Long) : ToastMessage
    data class InvitesRewarded(val count: Int, val amount: Long) : ToastMessage
    data class FriendsAdded(val count: Int) : ToastMessage
    data object OwnInviteCode : ToastMessage
    data object NoPlayerForCode : ToastMessage
    data object AlreadyFriends : ToastMessage
    data object InvalidCode : ToastMessage
    data object SignInFailed : ToastMessage
    data object FriendsOffline : ToastMessage
    data object FriendsUnavailable : ToastMessage
    data object AccountDeleted : ToastMessage
    data object AccountDeleteFailed : ToastMessage
}

/** One-shot happenings the UI reacts to with sound, haptics and fireworks. */
sealed interface UiEffect {
    data class HandRevealed(val outcome: DrawOutcome) : UiEffect

    data class DoubleUpRevealed(val result: DoubleUpResult) : UiEffect

    /** A win earned a rating ask: call [GameViewModel.onReviewTimer] after [ReviewPolicy.PROMPT_DELAY_MS]. */
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
    /** First-run walkthrough. The shipped app leaves this off so a launch deals a hand at once. */
    private val onboardingEnabled: Boolean = false,
    /** Fetches the remote flags; null (tests, offline builds) keeps the cached ones. */
    private val flagFetcher: (suspend () -> RemoteFlags?)? = null,
    /** The app works the hold maths out in the background; most tests skip it. */
    private val analysisMode: AnalysisMode = AnalysisMode.OFF,
    /** Each settled hand or double-up's chips won minus chips staked, for the friends' daily ranking. */
    private val onNetResult: (Long) -> Unit = {},
    /** Product analytics (GA4 through Firebase in the app); tests and offline builds log nowhere. */
    private val events: EventLogger = EventLogger.NONE,
    /** True when the earlier WebView build's data is on the device: its player has history the native save lacks. */
    private val upgradedFromLegacy: Boolean = false,
) : ViewModel() {

    private val effectChannel = Channel<UiEffect>(Channel.UNLIMITED)
    private var toastCounter = 0

    private val _state: MutableStateFlow<UiState>
    private var allInUsed = 0
    private var allInLimit = repository.loadFlags().allInDailyLimit
    private var reviewAskedThisSession = false
    private var reviewTimerPending = false

    /** Deals whose hold maths is being worked out. */
    private val analysingRounds = mutableSetOf<Int>()

    /** Draws made before their deal's maths was ready, by deal round, waiting to be reviewed. */
    private val pendingReviews = mutableMapOf<Int, PendingReview>()

    private data class PendingReview(
        val dealRound: Int,
        val drawRound: Int,
        val dealt: List<Card>,
        val held: List<Boolean>,
        val totalBet: Int,
        val hinted: Boolean,
    )

    /** One flow for the whole lifetime: collectors key on its identity, so it must not be rebuilt per read. */
    val state: StateFlow<UiState>
    val effects: ReceiveChannel<UiEffect> get() = effectChannel

    init {
        val settings = repository.loadSettings()
        val opening = GameEngine.newGame(repository.loadGame(), settings.defaultBet, random)
        allInUsed = repository.loadAllInUsed(today())
        _state = MutableStateFlow(
            UiState(
                opening.state, settings, revealedRound = -1, toast = null, allInRemaining = allInRemaining(),
                showOnboarding = onboardingEnabled && !repository.isOnboardingSeen(),
                flags = repository.loadFlags(),
            ),
        )
        state = _state.asStateFlow()
        // The opening deal can already carry news (a free rebuy for a player who left broke).
        applyEvents(opening.events, persist = opening.events.any { it is GameEvent.Rebuy }, game = opening.state)
        stampFirstDay()
        grantDailyBonus()
        applyPendingCredits()
        requestAnalysis(_state.value.game)
        flagFetcher?.let { fetch -> viewModelScope.launch { fetch()?.let(::onFlagsLoaded) } }
    }

    /**
     * Records today as the install's first day, so a win today can earn the rating ask. Only a
     * fresh install is stamped: a player arriving from an earlier build has hands behind them
     * and must earn the ask the usual way, not be asked on their next win. The earlier WebView
     * build's progress is not carried over, so such a player shows no hands here and is
     * recognised by the leftover WebView data instead; a stamp an earlier native build already
     * made for them is withdrawn.
     */
    private fun stampFirstDay() {
        val today = todayKey?.invoke() ?: return
        val review = repository.loadReview()
        if (upgradedFromLegacy) {
            if (review.firstDay.isNotEmpty()) repository.saveReview(review.copy(firstDay = ""))
            return
        }
        if (review.firstDay.isNotEmpty() || _state.value.game.lifetimeHands > 0) return
        repository.saveReview(review.copy(firstDay = today))
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
        events.log(AnalyticsEvents.DAILY_BONUS_CLAIMED, mapOf("amount" to Rules.DAILY_BONUS.toLong()))
        showToast(ToastMessage.DailyBonus(Rules.DAILY_BONUS))
    }

    /**
     * Moves gifted chips (invite rewards) parked by the friends feature onto the stack, saving and
     * clearing them in one write. Safe mid-hand: the saved balance still refunds the stake on the table.
     */
    fun applyPendingCredits(announce: ToastMessage? = null) {
        val pending = repository.loadPendingCredits()
        if (pending <= 0) return
        val game = _state.value.game
        val credited = game.copy(balance = game.balance + pending)
        _state.update { it.copy(game = credited) }
        repository.saveGameConsumingCredits(credited.toSaved())
        announce?.let(::showToast)
    }

    /** A message from another screen (Friends) shown in the shared toast. */
    fun onExternalToast(message: ToastMessage) = showToast(message)

    fun onMainAction() {
        val game = _state.value.game
        when (game.phase) {
            Phase.BET -> {
                val transition = GameEngine.deal(game, random)
                _state.update { it.copy(revealedDoubleUp = 0) }
                commit(transition, persist = transition.events.any { it is GameEvent.Rebuy })
                if (transition.state.phase == Phase.HOLD) logHandStarted(transition.state)
                requestAnalysis(transition.state)
            }
            Phase.HOLD -> draw(game)
            Phase.DOUBLE_UP -> Unit
        }
    }

    private fun draw(game: GameState) {
        val transition = GameEngine.draw(game, random)
        todayKey?.invoke()?.let(repository::saveLastPlayedDay)
        commit(transition, persist = true)
        val drawn = transition.state.outcome ?: return
        onNetResult(DailyProfitPolicy.handDelta(drawn))
        events.log(
            AnalyticsEvents.HAND_COMPLETED,
            mapOf(
                "variant" to game.variant.storageKey,
                "hands" to game.handCount.toLong(),
                "result" to drawn.bestType.key,
                "won" to drawn.isWin,
            ),
        )
        val pending = PendingReview(
            dealRound = game.round,
            drawRound = transition.state.round,
            dealt = game.dealtHand,
            held = game.held,
            totalBet = drawn.totalBet,
            hinted = _state.value.settings.hintsEnabled,
        )
        val ready = _state.value.analysis?.takeIf { it.round == game.round }?.analysis
        when {
            ready != null -> review(pending, ready)
            !_state.value.settings.feedbackEnabled -> Unit
            else -> {
                pendingReviews[game.round] = pending
                requestAnalysis(game)
            }
        }
    }

    private fun logHandStarted(game: GameState) = events.log(
        AnalyticsEvents.HAND_STARTED,
        mapOf("variant" to game.variant.storageKey, "hands" to game.handCount.toLong(), "bet" to game.bet.toLong()),
    )

    /** Works out the hold maths for [game]'s deal (a hand being held), if anything needs it and it is not already known. */
    private fun requestAnalysis(game: GameState) {
        val settings = _state.value.settings
        if (analysisMode == AnalysisMode.OFF || (!settings.hintsEnabled && !settings.feedbackEnabled)) return
        val round = game.round
        if (game.phase != Phase.HOLD || game.dealtHand.size != HandEvaluator.HAND_SIZE) return
        if (round in analysingRounds || _state.value.analysis?.round == round) return
        analysingRounds += round
        val work = { HoldAnalyzer.analyze(game.dealtHand, game.variant, game::payoutFor) }
        when (analysisMode) {
            AnalysisMode.INLINE -> onAnalysed(round, work())
            AnalysisMode.BACKGROUND -> viewModelScope.launch { onAnalysed(round, withContext(Dispatchers.Default) { work() }) }
            AnalysisMode.OFF -> Unit
        }
    }

    private fun onAnalysed(round: Int, analysis: HoldAnalysis) {
        analysingRounds -= round
        // A slow result for an older deal must not replace the maths of the hand now on the table.
        _state.update { if ((it.analysis?.round ?: -1) > round) it else it.copy(analysis = RoundAnalysis(round, analysis)) }
        pendingReviews.remove(round)?.let { review(it, analysis) }
    }

    /** Scores the draw against the best play; a hand played with hints on does not count towards accuracy. */
    private fun review(pending: PendingReview, analysis: HoldAnalysis) {
        val best = analysis.isBest(pending.held)
        val chosenEv = analysis.ev(pending.held)
        val cost = if (best) 0.0 else (analysis.bestEv - chosenEv) * pending.totalBet
        val bestHolds = analysis.bestHolds()
        val review = DecisionReview(
            round = pending.drawRound,
            best = best,
            cost = cost,
            bestCards = pending.dealt.filterIndexed { i, _ -> bestHolds[i] },
            chosenEv = chosenEv,
            bestEv = analysis.bestEv,
        )
        _state.update { it.copy(review = review) }
        if (pending.hinted || !_state.value.settings.feedbackEnabled) return
        val counted = GameEngine.recordDecision(_state.value.game, best, cost)
        _state.update { it.copy(game = counted) }
        repository.saveGame(counted.toSaved())
    }

    /** Stakes the last win on a double-up. Deal instead collects it. */
    fun onDoubleUp() {
        if (!_state.value.canDoubleUp) return
        commit(Transition(GameEngine.startDoubleUp(_state.value.game, random)))
    }

    fun onPickDoubleUp(index: Int) {
        val before = _state.value.game.doubleUp
        commit(Transition(GameEngine.pickDoubleUp(_state.value.game, index)), persist = true)
        val after = _state.value.game.doubleUp ?: return
        if (before?.result == null && after.result != null) onNetResult(DailyProfitPolicy.doubleUpDelta(after))
    }

    /** Called when double-up [number]'s cards have finished turning over. */
    fun onDoubleUpRevealed(number: Int) {
        val doubleUp = _state.value.game.doubleUp ?: return
        val result = doubleUp.result ?: return
        if (doubleUp.number != number || _state.value.revealedDoubleUp == number) return
        _state.update { it.copy(revealedDoubleUp = number) }
        effectChannel.trySend(UiEffect.DoubleUpRevealed(result))
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
            if (it.isWin) onWin(current.game)
        }
    }

    /** Any paying hand can earn the rating ask; [ReviewPolicy] decides whether this one does. */
    private fun onWin(game: GameState) {
        if (!reviewEnabled) return
        val outcome = game.outcome ?: return
        var state = repository.loadReview()
        if (ReviewPolicy.isQualityWin(outcome.bestType)) {
            state = state.copy(wins = state.wins + 1)
            repository.saveReview(state)
        }
        if (reviewAskedThisSession || reviewTimerPending) return
        if (!ReviewPolicy.earnedAsk(state, game.level, game.winStreak, today(), clock())) return
        reviewTimerPending = true
        events.log(AnalyticsEvents.REVIEW_PROMPT_EARNED, emptyMap())
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
                events.log(AnalyticsEvents.REVIEW_CARD_SHOWN, emptyMap())
                _state.update { it.copy(reviewCardVisible = true) }
            }
        }
    }

    /** "Rate now" on the card: never ask again. */
    fun onReviewRated() {
        repository.saveReview(repository.loadReview().copy(rated = true))
        events.log(AnalyticsEvents.REVIEW_CARD_RATE, emptyMap())
        _state.update { it.copy(reviewCardVisible = false) }
    }

    fun onReviewDismissed() {
        events.log(AnalyticsEvents.REVIEW_CARD_DISMISSED, emptyMap())
        _state.update { it.copy(reviewCardVisible = false) }
    }

    fun onToggleSound() = updateSettings { it.copy(soundEnabled = !it.soundEnabled) }

    fun onToggleHints() {
        updateSettings { it.copy(hintsEnabled = !it.hintsEnabled) }
        if (_state.value.settings.hintsEnabled) {
            showToast(ToastMessage.HintsOn)
            requestAnalysis(_state.value.game)
        }
    }

    fun onToggleFeedback() {
        updateSettings { it.copy(feedbackEnabled = !it.feedbackEnabled) }
        requestAnalysis(_state.value.game)
    }

    fun onToggleDoubleUp() = updateSettings { it.copy(doubleUpEnabled = !it.doubleUpEnabled) }

    fun onSelectSpeed(speed: GameSpeed) = updateSettings { it.copy(gameSpeed = speed) }

    /** The first hand's floating hand pointed at the lamp; don't point there again. */
    fun onHintsTipSeen() = _state.update { it.copy(hintsTipSeen = true) }

    /** The first hand's floating hand pointed at ALL IN; don't point there again. */
    fun onAllInTipSeen() = _state.update { it.copy(allInTipSeen = true) }

    /**
     * ALL IN tapped: open the confirmation, or explain why not. Once a day, and only after
     * this hand's cards are face up.
     */
    fun onAllInRequested() {
        val game = _state.value.game
        if (game.phase == Phase.DOUBLE_UP) return showToast(ToastMessage.FinishHandFirst)
        if (game.phase != Phase.HOLD || !_state.value.revealed) return showToast(ToastMessage.AllInAfterCards)
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

    private fun allInRemaining(): Int = (allInLimit - allInUsed).coerceAtLeast(0)

    /** Applies freshly fetched flags and keeps them for the next offline start. */
    fun onFlagsLoaded(flags: RemoteFlags) {
        repository.saveFlags(flags)
        allInLimit = flags.allInDailyLimit
        _state.update { it.copy(flags = flags, allInRemaining = allInRemaining()) }
    }

    fun onSelectLanguage(language: AppLanguage) = updateSettings { it.copy(language = language) }

    fun onOnboardingFinished() {
        repository.markOnboardingSeen()
        events.log(AnalyticsEvents.ONBOARDING_STEP, mapOf("step" to "complete"))
        _state.update { it.copy(showOnboarding = false) }
    }

    /** "Enable Notifications" (onboarding and Settings): every category on, as the web app does. */
    fun onEnableNotifications() = updateSettings {
        it.copy(notifySocial = true, notifyLeaderboard = true, dailyReminderEnabled = true, notifyBestHand = true)
    }

    fun onToggleNotifySocial() = updateSettings { it.copy(notifySocial = !it.notifySocial) }

    fun onToggleNotifyLeaderboard() = updateSettings { it.copy(notifyLeaderboard = !it.notifyLeaderboard) }

    fun onToggleDailyReminder() = updateSettings { it.copy(dailyReminderEnabled = !it.dailyReminderEnabled) }

    fun onToggleNotifyBestHand() = updateSettings { it.copy(notifyBestHand = !it.notifyBestHand) }

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
