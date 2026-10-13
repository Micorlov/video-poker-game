package com.micorlov.videopoker.nativeapp.ui

import com.micorlov.videopoker.nativeapp.data.GameRepository
import com.micorlov.videopoker.nativeapp.data.InMemoryStore
import com.micorlov.videopoker.nativeapp.domain.SavedGame
import kotlin.random.Random
import kotlin.test.Test
import kotlin.test.assertEquals

/** Invite rewards reach the stack through pending credits, exactly once. */
class PendingCreditsTest {

    private val repository = GameRepository(InMemoryStore())

    private fun viewModel(): GameViewModel {
        repository.saveGame(SavedGame(balance = 2_000))
        return GameViewModel(repository, Random(3))
    }

    @Test
    fun `credits add up and are ignored when not positive`() {
        repository.addPendingCredit(1_000)
        repository.addPendingCredit(500)
        repository.addPendingCredit(-50)
        repository.addPendingCredit(0)
        assertEquals(1_500L, repository.loadPendingCredits())
    }

    @Test
    fun `credits waiting at launch are added to the stack and cleared`() {
        repository.addPendingCredit(1_000)
        val vm = viewModel()

        assertEquals(1_000L + 2_000L - vm.state.value.game.totalBet, vm.state.value.game.balance)
        assertEquals(0L, repository.loadPendingCredits())
        assertEquals(3_000L, repository.loadGame().balance, "saved with the stake on the table refunded")
    }

    @Test
    fun `credits arriving mid game are applied once and announced`() {
        val vm = viewModel()
        val before = vm.state.value.game.balance
        repository.addPendingCredit(1_000)

        vm.applyPendingCredits(ToastMessage.ReferralWelcome(1_000))
        vm.applyPendingCredits(ToastMessage.ReferralWelcome(1_000))

        assertEquals(before + 1_000, vm.state.value.game.balance)
        assertEquals(ToastMessage.ReferralWelcome(1_000), vm.state.value.toast?.message)
        assertEquals(0L, repository.loadPendingCredits())
    }
}
