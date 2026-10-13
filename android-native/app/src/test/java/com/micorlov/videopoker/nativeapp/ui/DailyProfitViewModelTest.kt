package com.micorlov.videopoker.nativeapp.ui

import com.micorlov.videopoker.nativeapp.data.GameRepository
import com.micorlov.videopoker.nativeapp.data.InMemoryStore
import com.micorlov.videopoker.nativeapp.domain.Phase
import com.micorlov.videopoker.nativeapp.domain.SavedGame
import kotlin.random.Random
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/** The game reports every settled hand and double-up so the friends' ranking can add them up. */
class DailyProfitViewModelTest {

    private val repository = GameRepository(InMemoryStore())
    private val reported = mutableListOf<Long>()

    private fun viewModel(): GameViewModel {
        repository.saveGame(SavedGame(balance = START))
        return GameViewModel(repository, Random(11), onNetResult = { reported += it })
    }

    @Test
    fun `the reported results add up to the balance the hands moved`() {
        val vm = viewModel()
        repeat(60) {
            vm.onMainAction()
            vm.onRevealed(vm.state.value.game.round)
            if (vm.state.value.game.phase == Phase.BET && it < 59) vm.onMainAction()
        }
        assertEquals(Phase.BET, vm.state.value.game.phase)
        assertEquals(vm.state.value.game.balance - START, reported.sum())
        assertTrue(reported.size >= 30)
    }

    @Test
    fun `a settled double up is reported once, with the hand before it`() {
        val vm = viewModel()
        repeat(500) {
            if (vm.state.value.game.phase == Phase.BET) vm.onMainAction()
            vm.onMainAction()
            vm.onRevealed(vm.state.value.game.round)
            if (vm.state.value.canDoubleUp) {
                val before = vm.state.value.game.balance
                val reportsBefore = reported.size
                vm.onDoubleUp()
                vm.onPickDoubleUp(2)
                vm.onPickDoubleUp(3)
                assertEquals(reportsBefore + 1, reported.size)
                assertEquals(vm.state.value.game.balance - before, reported.last())
                return
            }
        }
        error("no double up offered in 500 hands")
    }

    private companion object {
        const val START = 5_000L
    }
}
