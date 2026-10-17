package com.micorlov.videopoker.nativeapp.ui

import com.micorlov.videopoker.nativeapp.data.GameRepository
import com.micorlov.videopoker.nativeapp.data.GameSpeed
import com.micorlov.videopoker.nativeapp.data.InMemoryStore
import com.micorlov.videopoker.nativeapp.data.UserSettings
import com.micorlov.videopoker.nativeapp.domain.DoubleUpResult
import com.micorlov.videopoker.nativeapp.domain.HoldAnalysis
import com.micorlov.videopoker.nativeapp.domain.Phase
import com.micorlov.videopoker.nativeapp.domain.SavedGame
import kotlin.random.Random
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertIs
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

/** Best-play hints and feedback, double up and game speed, driven through the view model. */
class GameplayViewModelTest {

    private val store = InMemoryStore()
    private val repository = GameRepository(store)

    private fun viewModel(
        settings: UserSettings = UserSettings(),
        mode: AnalysisMode = AnalysisMode.INLINE,
    ): GameViewModel {
        repository.saveGame(SavedGame())
        repository.saveSettings(settings)
        return GameViewModel(repository, Random(5), analysisMode = mode)
    }

    private fun GameViewModel.drainEffects(): List<UiEffect> = generateSequence { effects.tryReceive().getOrNull() }.toList()

    private fun GameViewModel.reveal() = onRevealed(state.value.game.round)

    /** Plays hands, holding nothing, until one wins; [reveal] says whether its cards end face up. */
    private fun GameViewModel.drawUntilAWin(reveal: Boolean = true) {
        repeat(500) {
            if (state.value.game.phase == Phase.BET) onMainAction()
            onMainAction()
            if (state.value.game.outcome?.isWin == true) {
                if (reveal) reveal()
                return
            }
            reveal()
        }
        error("no winning hand in 500 deals")
    }

    // ---- hints and feedback --------------------------------------------------------------

    @Test
    fun `the deal on the table is analysed`() {
        val vm = viewModel()

        val analysis = assertNotNull(vm.state.value.holdAnalysis)
        assertEquals(HoldAnalysis.MASKS, analysis.evs.size)
    }

    @Test
    fun `nothing is analysed when neither hints nor feedback need it`() {
        val vm = viewModel(UserSettings(hintsEnabled = false, feedbackEnabled = false))

        assertNull(vm.state.value.holdAnalysis)
    }

    @Test
    fun `turning hints on mid hand analyses the deal`() {
        val vm = viewModel(UserSettings(hintsEnabled = false, feedbackEnabled = false))

        vm.onToggleHints()

        assertNotNull(vm.state.value.holdAnalysis)
    }

    @Test
    fun `the lamp leaves with the hand and lights itself on the next face-up deal`() {
        val vm = viewModel(UserSettings(hintsEnabled = true, feedbackEnabled = false))

        assertFalse(vm.state.value.hintsLampVisible)

        vm.reveal()
        assertTrue(vm.state.value.hintsLampVisible)
        assertTrue(vm.state.value.settings.hintsEnabled)

        vm.onMainAction()
        assertTrue(vm.state.value.settings.hintsEnabled)
        assertFalse(vm.state.value.hintsLampVisible, "draw hides the lamp")

        vm.reveal()
        assertFalse(vm.state.value.hintsLampVisible, "the result is not a new deal")

        vm.onMainAction()
        assertFalse(vm.state.value.hintsLampVisible, "the next deal is still face down")
        vm.reveal()
        assertTrue(vm.state.value.hintsLampVisible)
        assertTrue(vm.state.value.settings.hintsEnabled)
    }

    @Test
    fun `playing the best hold is reviewed as best and counted`() {
        val vm = viewModel()
        val best = assertNotNull(vm.state.value.holdAnalysis).bestHolds()
        best.forEachIndexed { i, keep -> if (keep) vm.onToggleHold(i) }

        vm.onMainAction()
        vm.reveal()

        val review = assertNotNull(vm.state.value.visibleReview)
        assertTrue(review.best)
        assertEquals(0.0, review.cost)
        assertEquals(1, vm.state.value.game.today.reviewed)
        assertEquals(1, vm.state.value.game.today.bestPlays)
        assertEquals(1, repository.loadGame().allTime.bestPlays, "saved")
    }

    @Test
    fun `a worse hold is reviewed with the best play and its cost`() {
        val vm = viewModel()
        val analysis = assertNotNull(vm.state.value.holdAnalysis)
        val worst = analysis.evs.indices.minBy { analysis.evs[it] }
        HoldAnalysis.holdsOf(worst).forEachIndexed { i, keep -> if (keep) vm.onToggleHold(i) }
        val dealt = vm.state.value.game.dealtHand
        val bet = vm.state.value.game.totalBet

        vm.onMainAction()
        vm.reveal()

        val review = assertNotNull(vm.state.value.visibleReview)
        assertFalse(review.best)
        assertEquals((analysis.bestEv - analysis.evs[worst]) * bet, review.cost, 1e-9)
        assertEquals(dealt.filterIndexed { i, _ -> analysis.bestHolds()[i] }, review.bestCards)
        assertEquals(0, vm.state.value.game.today.bestPlays)
        assertEquals(review.cost, vm.state.value.game.today.mistakeCost, 1e-9)
    }

    @Test
    fun `the review waits for the cards to turn over`() {
        val vm = viewModel()

        vm.onMainAction()

        assertNull(vm.state.value.visibleReview)
        vm.reveal()
        assertNotNull(vm.state.value.visibleReview)
    }

    @Test
    fun `a hand played with hints on is reviewed but not counted`() {
        val vm = viewModel(UserSettings(hintsEnabled = true))

        vm.onMainAction()
        vm.reveal()

        assertNotNull(vm.state.value.visibleReview)
        assertEquals(0, vm.state.value.game.today.reviewed)
    }

    @Test
    fun `feedback off hides the review and counts nothing`() {
        val vm = viewModel(UserSettings(hintsEnabled = true, feedbackEnabled = false))

        vm.onMainAction()
        vm.reveal()

        assertNull(vm.state.value.visibleReview)
        assertEquals(0, vm.state.value.game.today.reviewed)
    }

    @Test
    fun `the maths is never run when analysis is off`() {
        val vm = viewModel(mode = AnalysisMode.OFF)

        vm.onMainAction()
        vm.reveal()

        assertNull(vm.state.value.holdAnalysis)
        assertNull(vm.state.value.visibleReview)
    }

    @Test
    fun `turning feedback on mid hand still reviews the draw`() {
        val vm = viewModel(UserSettings(feedbackEnabled = false))
        assertNull(vm.state.value.holdAnalysis)

        vm.onToggleFeedback()
        vm.onMainAction()
        vm.reveal()

        assertNotNull(vm.state.value.visibleReview)
        assertEquals(1, vm.state.value.game.today.reviewed)
    }

    // ---- double up ------------------------------------------------------------------------

    @Test
    fun `a revealed win can be doubled up`() {
        val vm = viewModel(mode = AnalysisMode.OFF)
        vm.drawUntilAWin()
        val win = assertNotNull(vm.state.value.game.outcome).totalWin.toLong()
        val balance = vm.state.value.game.balance

        assertTrue(vm.state.value.canDoubleUp)
        vm.onDoubleUp()

        val game = vm.state.value.game
        assertEquals(Phase.DOUBLE_UP, game.phase)
        assertEquals(balance - win, game.balance)
        assertEquals(win, game.doubleUp?.stake)
        assertFalse(vm.state.value.canDoubleUp)
    }

    @Test
    fun `a win cannot be doubled before its cards are face up`() {
        val vm = viewModel(mode = AnalysisMode.OFF)
        vm.drawUntilAWin(reveal = false)

        assertFalse(vm.state.value.canDoubleUp)
        vm.onDoubleUp()
        assertEquals(Phase.BET, vm.state.value.game.phase)
    }

    @Test
    fun `picking a card settles the double up and reports once its cards are face up`() {
        val vm = viewModel(mode = AnalysisMode.OFF)
        vm.drawUntilAWin()
        vm.onDoubleUp()
        vm.drainEffects()

        vm.onPickDoubleUp(0)

        val doubleUp = assertNotNull(vm.state.value.game.doubleUp)
        val result = assertNotNull(doubleUp.result)
        assertFalse(vm.state.value.doubleUpRevealed)
        assertFalse(vm.state.value.canDoubleUp, "not until the cards are face up")
        assertTrue(vm.drainEffects().isEmpty())

        vm.onDoubleUpRevealed(doubleUp.number)
        assertTrue(vm.state.value.doubleUpRevealed)
        assertEquals(result, assertIs<UiEffect.DoubleUpRevealed>(vm.drainEffects().single()).result)
        assertEquals(result != DoubleUpResult.LOSE, vm.state.value.canDoubleUp)
    }

    @Test
    fun `dealing after a double up collects and starts the next hand`() {
        val vm = viewModel(mode = AnalysisMode.OFF)
        vm.drawUntilAWin()
        vm.onDoubleUp()
        vm.onPickDoubleUp(1)
        vm.onDoubleUpRevealed(1)
        val balance = vm.state.value.game.balance

        vm.onMainAction()

        val game = vm.state.value.game
        assertEquals(Phase.HOLD, game.phase)
        assertNull(game.doubleUp)
        assertEquals(balance - game.totalBet, game.balance)
        assertEquals(0, vm.state.value.revealedDoubleUp)
    }

    @Test
    fun `the main button does nothing while a card must be picked`() {
        val vm = viewModel(mode = AnalysisMode.OFF)
        vm.drawUntilAWin()
        vm.onDoubleUp()
        val before = vm.state.value.game

        vm.onMainAction()

        assertEquals(before, vm.state.value.game)
    }

    @Test
    fun `all in waits for the double up to finish`() {
        val vm = viewModel(mode = AnalysisMode.OFF)
        vm.drawUntilAWin()
        vm.onDoubleUp()

        vm.onAllInRequested()

        assertEquals(ToastMessage.FinishHandFirst, vm.state.value.toast?.message)
        assertNull(vm.state.value.allInOffer)
    }

    @Test
    fun `no double up is offered when it is switched off`() {
        val vm = viewModel(UserSettings(doubleUpEnabled = false), mode = AnalysisMode.OFF)
        vm.drawUntilAWin()

        assertFalse(vm.state.value.canDoubleUp)
        vm.onDoubleUp()
        assertEquals(Phase.BET, vm.state.value.game.phase)
    }

    // ---- settings -----------------------------------------------------------------------------

    @Test
    fun `game speed, feedback and double up settings are saved`() {
        val vm = viewModel(mode = AnalysisMode.OFF)

        vm.onSelectSpeed(GameSpeed.TURBO)
        vm.onToggleFeedback()
        vm.onToggleDoubleUp()

        val saved = repository.loadSettings()
        assertEquals(GameSpeed.TURBO, saved.gameSpeed)
        assertFalse(saved.feedbackEnabled)
        assertFalse(saved.doubleUpEnabled)
    }
}
