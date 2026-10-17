package com.micorlov.videopoker.nativeapp.ui

import com.micorlov.videopoker.nativeapp.data.AppTheme
import com.micorlov.videopoker.nativeapp.data.GameRepository
import com.micorlov.videopoker.nativeapp.data.InMemoryStore
import com.micorlov.videopoker.nativeapp.domain.FirstHands
import com.micorlov.videopoker.nativeapp.domain.Phase
import com.micorlov.videopoker.nativeapp.domain.RemoteFlags
import com.micorlov.videopoker.nativeapp.domain.ReviewState
import com.micorlov.videopoker.nativeapp.domain.SavedGame
import com.micorlov.videopoker.nativeapp.domain.Variant
import kotlin.random.Random
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertIs
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class GameViewModelTest {

    private val store = InMemoryStore()
    private val repository = GameRepository(store)

    private fun viewModel(saved: SavedGame = SavedGame()): GameViewModel {
        repository.saveGame(saved)
        return GameViewModel(repository, Random(5))
    }

    private fun GameViewModel.drainEffects(): List<UiEffect> {
        val collected = mutableListOf<UiEffect>()
        while (true) {
            val next = effects.tryReceive().getOrNull() ?: break
            collected += next
        }
        return collected
    }

    @Test
    fun `launching deals the opening hand`() {
        val vm = viewModel()
        val game = vm.state.value.game

        assertEquals(Phase.HOLD, game.phase)
        assertEquals(990L, game.balance)
        assertEquals(5, game.hand.size)
    }

    @Test
    fun `the main button draws and then deals`() {
        val vm = viewModel()

        vm.onMainAction()
        assertEquals(Phase.BET, vm.state.value.game.phase)
        assertNotNull(vm.state.value.game.outcome)

        vm.onMainAction()
        assertEquals(Phase.HOLD, vm.state.value.game.phase)
        assertNull(vm.state.value.game.outcome)
    }

    @Test
    fun `a finished hand is saved`() {
        val vm = viewModel()
        vm.onMainAction()

        val game = vm.state.value.game
        val saved = repository.loadGame()
        assertEquals(game.balance, saved.balance)
        assertEquals(1, saved.lifetimeHands)
        assertEquals(game.today, saved.today)
    }

    @Test
    fun `quitting mid hand saves the balance before the stake`() {
        val vm = viewModel()
        vm.onToggleHold(0)
        assertEquals(1000L, vm.state.value.game.toSaved().balance)
        assertEquals(1000L, repository.loadGame().balance)
    }

    @Test
    fun `highlights wait for the flip animation to report back`() {
        val vm = viewModel()
        vm.onMainAction()
        val round = vm.state.value.game.round

        assertFalse(vm.state.value.revealed)
        assertTrue(vm.drainEffects().isEmpty())

        vm.onRevealed(round)
        assertTrue(vm.state.value.revealed)
        val effect = assertIs<UiEffect.HandRevealed>(vm.drainEffects().single())
        assertEquals(vm.state.value.game.outcome, effect.outcome)
    }

    @Test
    fun `a stale reveal from a previous round is ignored`() {
        val vm = viewModel()
        vm.onMainAction()
        val staleRound = vm.state.value.game.round
        vm.onMainAction() // dealt again before the old flips finished

        vm.onRevealed(staleRound)
        assertFalse(vm.state.value.revealed)
        assertTrue(vm.drainEffects().isEmpty())
    }

    @Test
    fun `a round is only revealed once`() {
        val vm = viewModel()
        vm.onMainAction()
        val round = vm.state.value.game.round
        vm.onRevealed(round)
        vm.onRevealed(round)
        assertEquals(1, vm.drainEffects().size)
    }

    @Test
    fun `revealing a fresh deal produces no outcome effect`() {
        val vm = viewModel()
        vm.onRevealed(vm.state.value.game.round)
        assertTrue(vm.state.value.revealed)
        assertTrue(vm.drainEffects().isEmpty())
    }

    @Test
    fun `tapping a locked variant shows a toast and changes nothing`() {
        val vm = viewModel(SavedGame(lifetimeHands = 0))
        vm.onMainAction() // finish the opening hand so the table is between hands
        vm.onSelectVariant(Variant.DEUCES)

        assertEquals(Variant.JACKS, vm.state.value.game.variant)
        assertEquals(ToastMessage.VariantLocked(3), vm.state.value.toast?.message)
    }

    @Test
    fun `changing the variant mid hand explains itself`() {
        val vm = viewModel(SavedGame(lifetimeHands = 10))
        vm.onSelectVariant(Variant.DEUCES)
        assertEquals(ToastMessage.FinishHandFirst, vm.state.value.toast?.message)
    }

    @Test
    fun `an unlocked variant switches and is remembered`() {
        val vm = viewModel(SavedGame(lifetimeHands = 10))
        vm.onMainAction()
        vm.onSelectVariant(Variant.DEUCES)

        assertEquals(Variant.DEUCES, vm.state.value.game.variant)
        assertEquals(Variant.DEUCES, repository.loadGame().variant)
    }

    @Test
    fun `an empty stack rebuys with a toast and saves`() {
        val vm = viewModel(SavedGame(balance = 0))

        assertEquals(990L, vm.state.value.game.balance)
        assertEquals(ToastMessage.Rebuy(1000), vm.state.value.toast?.message)
        assertEquals(1000L, repository.loadGame().balance)
    }

    @Test
    fun `toasts can be dismissed but a newer one is not dismissed by an older id`() {
        val vm = viewModel(SavedGame(balance = 0))
        val first = assertNotNull(vm.state.value.toast)
        vm.onSelectVariant(Variant.DEUCES)
        val second = assertNotNull(vm.state.value.toast)
        assertTrue(second.id > first.id)

        vm.onDismissToast(first.id)
        assertEquals(second, vm.state.value.toast)
        vm.onDismissToast(second.id)
        assertNull(vm.state.value.toast)
    }

    @Test
    fun `settings are persisted and the default bet applies between hands`() {
        val vm = viewModel()
        vm.onMainAction()

        vm.onSelectDefaultBet(50)
        vm.onToggleSound()
        vm.onToggleHaptics()
        vm.onSelectTheme(AppTheme.BLUE)

        val settings = repository.loadSettings()
        assertEquals(50, settings.defaultBet)
        assertFalse(settings.soundEnabled)
        assertFalse(settings.hapticsEnabled)
        assertEquals(AppTheme.BLUE, settings.theme)
        assertEquals(50, vm.state.value.game.bet)
    }

    @Test
    fun `the saved default bet is used on the next launch`() {
        repository.saveSettings(repository.loadSettings().copy(defaultBet = 20))
        val vm = viewModel()
        assertEquals(20, vm.state.value.game.bet)
        assertEquals(980L, vm.state.value.game.balance)
    }

    @Test
    fun `resetting statistics mid hand still saves the stack from before the stake`() {
        val vm = viewModel() // the opening hand is in progress, 10 already staked
        vm.onResetStatistics()

        assertEquals(990L, vm.state.value.game.balance)
        assertEquals(1000L, repository.loadGame().balance)
    }

    @Test
    fun `an unlocked hand count is remembered`() {
        val vm = viewModel(SavedGame(lifetimeHands = 45))
        vm.onMainAction()
        vm.onSelectHandCount(3)

        assertEquals(3, vm.state.value.game.handCount)
        assertEquals(3, repository.loadGame().handCount)
    }

    @Test
    fun `a locked hand count is refused with a toast and not saved`() {
        val vm = viewModel(SavedGame(lifetimeHands = 0))
        vm.onMainAction()
        vm.onSelectHandCount(5)

        assertEquals(1, vm.state.value.game.handCount)
        assertEquals(1, repository.loadGame().handCount)
        assertEquals(ToastMessage.MultiHandLocked(10), vm.state.value.toast?.message)
    }

    @Test
    fun `resetting statistics clears the counters and tells the player`() {
        val vm = viewModel()
        vm.onMainAction()
        vm.onResetStatistics()

        assertEquals(0, vm.state.value.game.today.handsPlayed)
        assertEquals(0, repository.loadGame().allTime.handsPlayed)
        assertEquals(ToastMessage.StatsReset, vm.state.value.toast?.message)
        assertEquals(1, vm.state.value.game.lifetimeHands, "level progress survives a statistics reset")
    }

    @Test
    fun `the first launch of a day pays the daily bonus once`() {
        repository.saveGame(SavedGame(balance = 500))
        val first = GameViewModel(repository, Random(5), todayKey = { "2026-10-12" })
        assertEquals(700, first.state.value.game.toSaved().balance)
        assertEquals(ToastMessage.DailyBonus(200), first.state.value.toast?.message)

        val sameDay = GameViewModel(repository, Random(5), todayKey = { "2026-10-12" })
        assertEquals(700, sameDay.state.value.game.toSaved().balance)
        assertNull(sameDay.state.value.toast)

        val nextDay = GameViewModel(repository, Random(5), todayKey = { "2026-10-13" })
        assertEquals(900, nextDay.state.value.game.toSaved().balance)
    }

    @Test
    fun `all in is limited to once a day and resets on a new day`() {
        repository.saveGame(SavedGame(balance = 600))
        val day1 = GameViewModel(repository, Random(5), todayKey = { "2026-10-12" })
        assertEquals(1, day1.state.value.allInRemaining)

        day1.onAllInRequested()
        assertEquals(ToastMessage.AllInAfterCards, day1.state.value.toast?.message)
        day1.onRevealed(day1.state.value.game.round)
        day1.onAllInRequested()
        assertNotNull(day1.state.value.allInOffer)
        day1.onAllInConfirmed()
        assertEquals(0, day1.state.value.allInRemaining)
        assertEquals(ToastMessage.AllInGoodLuck, day1.state.value.toast?.message)

        day1.onAllInRequested()
        assertNull(day1.state.value.allInOffer)
        assertEquals(ToastMessage.NoAllInLeft, day1.state.value.toast?.message)

        val sameDayRestart = GameViewModel(repository, Random(5), todayKey = { "2026-10-12" })
        assertEquals(0, sameDayRestart.state.value.allInRemaining)
        val nextDay = GameViewModel(repository, Random(5), todayKey = { "2026-10-13" })
        assertEquals(1, nextDay.state.value.allInRemaining)
    }

    @Test
    fun `a guest who is out of all-ins can sign in for a second one today`() {
        repository.saveGame(SavedGame(balance = 600))
        val vm = GameViewModel(
            repository, Random(5), todayKey = { "2026-10-12" }, googleSignInAvailable = true,
        )
        assertEquals(1, vm.state.value.allInRemaining)

        vm.onRevealed(vm.state.value.game.round)
        vm.onAllInRequested()
        vm.onAllInConfirmed()
        assertEquals(0, vm.state.value.allInRemaining)

        vm.onAllInRequested()
        assertTrue(vm.state.value.allInSignInPrompt)
        assertNull(vm.state.value.allInOffer)

        vm.onAllInSignInDismissed()
        assertFalse(vm.state.value.allInSignInPrompt)
        assertEquals(0, vm.state.value.allInRemaining)

        vm.onAllInRequested()
        vm.onGoogleSignedIn(true)
        assertFalse(vm.state.value.allInSignInPrompt)
        assertEquals(1, vm.state.value.allInRemaining)

        // The first ALL IN already staked the stack, so the extra use waits until there are chips again.
        vm.onAllInRequested()
        assertEquals(1, vm.state.value.allInRemaining)
        assertNull(vm.state.value.allInOffer)
        vm.onAllInRequested()
        assertNotNull(vm.state.value.allInOffer)
        vm.onAllInConfirmed()
        assertEquals(0, vm.state.value.allInRemaining)

        vm.onAllInRequested()
        assertFalse(vm.state.value.allInSignInPrompt)
        assertEquals(ToastMessage.NoAllInLeft, vm.state.value.toast?.message)
    }

    @Test
    fun `signing in does not raise an all-in limit that is already above two`() {
        repository.saveGame(SavedGame(balance = 600))
        val vm = GameViewModel(
            repository, Random(5), todayKey = { "2026-10-12" },
            googleSignInAvailable = true, signedInWithGoogle = true,
        )
        vm.onFlagsLoaded(RemoteFlags(allInDailyLimit = 3))
        assertEquals(3, vm.state.value.allInRemaining)

        val restarted = GameViewModel(
            repository, Random(5), todayKey = { "2026-10-12" },
            googleSignInAvailable = true, signedInWithGoogle = true,
        )
        assertEquals(3, restarted.state.value.allInRemaining)
    }

    @Test
    fun `dismissing the all in sheet spends nothing`() {
        val vm = viewModel(SavedGame(balance = 600))
        vm.onRevealed(vm.state.value.game.round)
        vm.onAllInRequested()
        vm.onAllInDismissed()
        assertNull(vm.state.value.allInOffer)
        assertEquals(1, vm.state.value.allInRemaining)
    }

    @Test
    fun `the review card shows once per session and rating it ends the asks`() {
        val week = 7L * 24 * 60 * 60 * 1000
        repository.saveReview(ReviewState(shown = true, shownAt = 0))
        repository.saveGame(SavedGame())
        val vm = GameViewModel(repository, Random(5), clock = { 10 * week }, reviewEnabled = true)

        vm.onReviewTimer(blocked = true)
        assertFalse(vm.state.value.reviewCardVisible)

        vm.onReviewTimer(blocked = false)
        assertTrue(vm.state.value.reviewCardVisible)
        assertEquals(1, repository.loadReview().cardCount)

        vm.onReviewRated()
        assertFalse(vm.state.value.reviewCardVisible)
        assertTrue(repository.loadReview().rated)
    }

    /** A seed whose opening hand pays, so a streak test lands on a known hand. */
    private val WINNING_SEED = 8

    /** Plays hands until one pays, revealing each draw. Returns the hands played, or -1 if none won. */
    private fun GameViewModel.playUntilWin(maxHands: Int = 9): Int {
        repeat(maxHands) { played ->
            if (state.value.game.phase == Phase.BET) onMainAction()
            onMainAction()
            onRevealed(state.value.game.round)
            if (state.value.game.outcome?.isWin == true) return played + 1
        }
        return -1
    }

    @Test
    fun `a win completing three in a row earns the ask`() {
        repository.saveGame(SavedGame(winStreak = 2, lifetimeHands = FirstHands.ROUNDS))
        val vm = GameViewModel(repository, Random(WINNING_SEED), clock = { 5_000 }, reviewEnabled = true)

        assertTrue(vm.playUntilWin() > 0, "the seeded deal must produce a paying hand")
        assertEquals(3, vm.state.value.game.winStreak)
        assertTrue(vm.state.value.game.level < 3, "the streak must be the reason, not the level")
        assertTrue(vm.drainEffects().any { it == UiEffect.ReviewEarned })
    }

    @Test
    fun `two wins in a row do not earn the ask`() {
        repository.saveGame(SavedGame(winStreak = 1, lifetimeHands = FirstHands.ROUNDS))
        val vm = GameViewModel(repository, Random(WINNING_SEED), clock = { 5_000 }, reviewEnabled = true)

        assertTrue(vm.playUntilWin() > 0)
        assertEquals(2, vm.state.value.game.winStreak)
        assertFalse(vm.drainEffects().any { it == UiEffect.ReviewEarned })
    }

    @Test
    fun `a win on the install's first day earns the ask`() {
        val today = "2026-10-13"
        repository.saveReview(ReviewState(firstDay = today))
        repository.saveGame(SavedGame())
        val vm = GameViewModel(repository, Random(WINNING_SEED), todayKey = { today }, clock = { 5_000 }, reviewEnabled = true)

        assertTrue(vm.playUntilWin() > 0)
        assertEquals(1, vm.state.value.game.winStreak)
        assertTrue(vm.state.value.game.level < 3)
        assertTrue(vm.drainEffects().any { it == UiEffect.ReviewEarned })
    }

    @Test
    fun `a fresh install records today as its first day`() {
        val vm = GameViewModel(repository, Random(5), todayKey = { "2026-10-13" }, reviewEnabled = true)

        assertEquals("2026-10-13", repository.loadReview().firstDay)
        assertEquals(0, vm.state.value.game.lifetimeHands)
    }

    @Test
    fun `an install with hands behind it is never treated as first day`() {
        repository.saveGame(SavedGame(lifetimeHands = 4))
        GameViewModel(repository, Random(5), todayKey = { "2026-10-13" }, reviewEnabled = true)

        assertEquals("", repository.loadReview().firstDay)
    }

    @Test
    fun `a player upgrading from the WebView build is never stamped as first day`() {
        GameViewModel(repository, Random(5), todayKey = { "2026-10-13" }, reviewEnabled = true, upgradedFromLegacy = true)

        assertEquals("", repository.loadReview().firstDay)
    }

    @Test
    fun `a first-day stamp made before the legacy data was recognised is withdrawn`() {
        repository.saveReview(ReviewState(firstDay = "2026-10-13"))
        val vm = GameViewModel(
            repository, Random(WINNING_SEED), todayKey = { "2026-10-13" }, clock = { 5_000 },
            reviewEnabled = true, upgradedFromLegacy = true,
        )

        assertEquals("", repository.loadReview().firstDay)
        assertTrue(vm.playUntilWin() > 0)
        assertFalse(vm.drainEffects().any { it == UiEffect.ReviewEarned })
    }

    @Test
    fun `the first ask goes to Google Play's sheet and is recorded`() {
        repository.saveGame(SavedGame())
        val vm = GameViewModel(repository, Random(5), clock = { 5_000 }, reviewEnabled = true)
        vm.onReviewTimer(blocked = false)

        assertTrue(vm.drainEffects().any { it == UiEffect.RequestNativeReview })
        assertTrue(repository.loadReview().shown)
        assertFalse(vm.state.value.reviewCardVisible)
    }

    @Test
    fun `a remote all in limit raises today's allowance and is remembered`() {
        repository.saveGame(SavedGame(balance = 600))
        val vm = GameViewModel(repository, Random(5), todayKey = { "2026-10-12" })
        assertEquals(1, vm.state.value.allInRemaining)

        vm.onFlagsLoaded(RemoteFlags(allInDailyLimit = 3))
        assertEquals(3, vm.state.value.allInRemaining)

        val restarted = GameViewModel(repository, Random(5), todayKey = { "2026-10-12" })
        assertEquals(3, restarted.state.value.allInRemaining)
    }
}
