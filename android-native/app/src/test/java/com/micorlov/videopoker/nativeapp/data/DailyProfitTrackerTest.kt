package com.micorlov.videopoker.nativeapp.data

import com.micorlov.videopoker.nativeapp.domain.DailyProfit
import java.time.Instant
import kotlin.test.Test
import kotlin.test.assertEquals

class DailyProfitTrackerTest {

    private val store = InMemoryStore()
    private var now = Instant.parse("2026-10-13T22:00:00Z").toEpochMilli()

    private fun tracker() = DailyProfitTracker(DailyProfitStore(store)) { now }

    @Test
    fun `results are kept across restarts`() {
        tracker().record(120)
        tracker().record(-20)

        assertEquals(DailyProfit("2026-10-13", 100), DailyProfitStore(store).load())
        assertEquals(100L, tracker().today())
    }

    @Test
    fun `UTC midnight resets today's net`() {
        val tracker = tracker()
        tracker.record(300)

        now += 3 * 60 * 60 * 1000L
        assertEquals(0L, tracker.today())

        tracker.record(-10)
        assertEquals(DailyProfit("2026-10-14", -10), tracker.state.value)
    }

    @Test
    fun `a corrupted day key reads as nothing played`() {
        store.write { putString("profit.utcDay", "garbage"); putLong("profit.utcNet", 999) }
        assertEquals(DailyProfit.NONE, DailyProfitStore(store).load())
    }
}
