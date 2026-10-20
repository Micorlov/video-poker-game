package com.micorlov.videopoker.nativeapp.data

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class DayStatsLedgerTest {

    @Test
    fun `a quiet install uploads nothing`() {
        val ledger = DayStatsLedger(InMemoryStore())
        ledger.seed("2026-10-20", playedToday = false, score = 0)
        assertNull(ledger.outbound())
    }

    @Test
    fun `profit already on the device is uploaded without inventing a hand count`() {
        val ledger = DayStatsLedger(InMemoryStore())
        ledger.seed("2026-10-20", playedToday = true, score = 40)
        val write = ledger.outbound()
        assertEquals(DayStatWrite("2026-10-20", 40, null), write)
        ledger.acknowledge(write!!)
        assertNull(ledger.outbound())
    }

    @Test
    fun `deals after an upgrade still do not pretend to know today's hands`() {
        val ledger = DayStatsLedger(InMemoryStore())
        ledger.seed("2026-10-20", playedToday = true, score = 40)
        ledger.record("2026-10-20", scoreDelta = -5, hand = true)
        assertEquals(DayStatWrite("2026-10-20", 35, null), ledger.outbound())
    }

    @Test
    fun `a fresh day counts hands and a later write only moves the count forward`() {
        val ledger = DayStatsLedger(InMemoryStore())
        ledger.seed("2026-10-20", playedToday = false, score = 0)
        ledger.record("2026-10-20", scoreDelta = 15, hand = true)
        ledger.record("2026-10-20", scoreDelta = -5, hand = true)
        val first = ledger.outbound()
        assertEquals(DayStatWrite("2026-10-20", 10, 2), first)
        ledger.acknowledge(first!!)
        repeat(DayStatsLedger.MAX_HAND_STEP + 10) {
            ledger.record("2026-10-20", scoreDelta = 0, hand = true)
        }
        val stepped = ledger.outbound()
        assertEquals(2 + DayStatsLedger.MAX_HAND_STEP, stepped!!.hands)
        ledger.acknowledge(stepped)
        assertEquals(2 + DayStatsLedger.MAX_HAND_STEP + 10, ledger.outbound()!!.hands)
    }

    @Test
    fun `the next day starts from zero with the count known`() {
        val ledger = DayStatsLedger(InMemoryStore())
        ledger.seed("2026-10-20", playedToday = true, score = 40)
        ledger.record("2026-10-21", scoreDelta = 8, hand = true)
        assertEquals(DayStatWrite("2026-10-21", 8, 1), ledger.outbound())
    }
}
