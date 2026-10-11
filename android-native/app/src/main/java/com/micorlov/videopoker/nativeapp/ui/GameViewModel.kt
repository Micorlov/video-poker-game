package com.micorlov.videopoker.nativeapp.ui

import androidx.lifecycle.ViewModel
import com.micorlov.videopoker.nativeapp.data.AppTheme
import com.micorlov.videopoker.nativeapp.data.GameRepository
import com.micorlov.videopoker.nativeapp.data.UserSettings
import com.micorlov.videopoker.nativeapp.domain.DrawOutcome
import com.micorlov.videopoker.nativeapp.domain.GameEngine
import com.micorlov.videopoker.nativeapp.domain.GameEvent
import com.micorlov.videopoker.nativeapp.domain.GameState
import com.micorlov.videopoker.nativeapp.domain.Phase
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
) {
    /** True once the cards of the current round are face up, so results may be shown. */
    val revealed: Boolean get() = revealedRound == game.round
}

data class Toast(val id: Int, val message: ToastMessage)

sealed interface ToastMessage {
    data class Rebuy(val amount: Long) : ToastMessage
    data class VariantLocked(val level: Int) : ToastMessage
    data class MultiHandLocked(val level: Int) : ToastMessage
    data object FinishHandFirst : ToastMessage
    data object StatsReset : ToastMessage
}

/** One-shot happenings the UI reacts to with sound, haptics and fireworks. */
sealed interface UiEffect {
    data class HandRevealed(val outcome: DrawOutcome) : UiEffect
}

/**
 * Holds the table and the settings, applies the player's actions through [GameEngine],
 * and decides when to save. Contains no Android types, so it is unit-tested on the JVM.
 */
class GameViewModel(
    private val repository: GameRepository,
    private val random: Random = Random.Default,
) : ViewModel() {

    private val effectChannel = Channel<UiEffect>(Channel.UNLIMITED)
    private var toastCounter = 0

    private val _state: MutableStateFlow<UiState>

    /** One flow for the whole lifetime: collectors key on its identity, so it must not be rebuilt per read. */
    val state: StateFlow<UiState>
    val effects: ReceiveChannel<UiEffect> get() = effectChannel

    init {
        val settings = repository.loadSettings()
        val opening = GameEngine.newGame(repository.loadGame(), settings.defaultBet, random)
        _state = MutableStateFlow(UiState(opening.state, settings, revealedRound = -1, toast = null))
        state = _state.asStateFlow()
        // The opening deal can already carry news (a free rebuy for a player who left broke).
        applyEvents(opening.events, persist = opening.events.any { it is GameEvent.Rebuy }, game = opening.state)
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
        current.game.outcome?.let { effectChannel.trySend(UiEffect.HandRevealed(it)) }
    }

    fun onToggleSound() = updateSettings { it.copy(soundEnabled = !it.soundEnabled) }

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
