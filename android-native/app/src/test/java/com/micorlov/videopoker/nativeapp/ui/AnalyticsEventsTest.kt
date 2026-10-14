package com.micorlov.videopoker.nativeapp.ui

import com.micorlov.videopoker.nativeapp.data.AnalyticsEvents
import com.micorlov.videopoker.nativeapp.data.EventLogger
import com.micorlov.videopoker.nativeapp.data.GameRepository
import com.micorlov.videopoker.nativeapp.data.InMemoryStore
import com.micorlov.videopoker.nativeapp.domain.Rules
import kotlin.random.Random
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class AnalyticsEventsTest {

    private class RecordingLogger : EventLogger {
        val events = mutableListOf<Pair<String, Map<String, Any>>>()
        override fun log(name: String, params: Map<String, Any>) {
            events += name to params
        }
        fun named(name: String) = events.filter { it.first == name }.map { it.second }
    }

    private val repository = GameRepository(InMemoryStore())

    @Test
    fun `a draw logs hand_completed and the next deal logs hand_started, with the web app's params`() {
        val logger = RecordingLogger()
        val vm = GameViewModel(repository, Random(5), events = logger)

        vm.onMainAction()
        val completed = logger.named(AnalyticsEvents.HAND_COMPLETED).single()
        val outcome = vm.state.value.game.outcome!!
        assertEquals("jacks", completed["variant"])
        assertEquals(1L, completed["hands"])
        assertEquals(outcome.bestType.key, completed["result"])
        assertEquals(outcome.isWin, completed["won"])

        vm.onMainAction()
        val started = logger.named(AnalyticsEvents.HAND_STARTED).single()
        assertEquals("jacks", started["variant"])
        assertEquals(1L, started["hands"])
        assertEquals(vm.state.value.game.bet.toLong(), started["bet"])
    }

    @Test
    fun `the first open of a day logs daily_bonus_claimed once`() {
        val logger = RecordingLogger()
        GameViewModel(repository, Random(5), todayKey = { "2026-10-14" }, events = logger)
        GameViewModel(repository, Random(5), todayKey = { "2026-10-14" }, events = logger)

        val claimed = logger.named(AnalyticsEvents.DAILY_BONUS_CLAIMED)
        assertEquals(1, claimed.size)
        assertEquals(Rules.DAILY_BONUS.toLong(), claimed.single()["amount"])
    }

    @Test
    fun `finishing onboarding and the review card are logged`() {
        val logger = RecordingLogger()
        val vm = GameViewModel(repository, Random(5), events = logger)

        vm.onOnboardingFinished()
        vm.onReviewRated()
        vm.onReviewDismissed()

        assertEquals(listOf(mapOf<String, Any>("step" to "complete")), logger.named(AnalyticsEvents.ONBOARDING_STEP))
        assertTrue(logger.named(AnalyticsEvents.REVIEW_CARD_RATE).isNotEmpty())
        assertTrue(logger.named(AnalyticsEvents.REVIEW_CARD_DISMISSED).isNotEmpty())
    }

    @Test
    fun `without a logger nothing breaks`() {
        val vm = GameViewModel(repository, Random(5))
        vm.onMainAction()
        vm.onMainAction()
    }
}
