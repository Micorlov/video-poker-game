package com.micorlov.videopoker.nativeapp.domain

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class DailyProfitPolicyTest {

    private fun outcome(totalWin: Int, totalBet: Int) = DrawOutcome(
        result = HandResult(HandType.NOTHING, emptyList()),
        bestType = HandType.NOTHING,
        extraHands = emptyList(),
        baseWin = totalWin,
        streakBonus = 0,
        totalWin = totalWin,
        totalBet = totalBet,
        multiplier = 0,
    )

    private fun doubleUp(result: DoubleUpResult?) =
        DoubleUp(stake = 40, dealer = Card.parse("2♥")!!, choices = emptyList(), number = 1, result = result)

    @Test
    fun `results on the same day add up`() {
        val first = DailyProfitPolicy.record(DailyProfit.NONE, "2026-10-13", 25)
        val second = DailyProfitPolicy.record(first, "2026-10-13", -10)
        assertEquals(DailyProfit("2026-10-13", 15), second)
    }

    @Test
    fun `a new day starts again from zero`() {
        val yesterday = DailyProfit("2026-10-12", 500)
        assertEquals(DailyProfit("2026-10-13", -5), DailyProfitPolicy.record(yesterday, "2026-10-13", -5))
    }

    @Test
    fun `a stale record has no value today`() {
        assertNull(DailyProfit("2026-10-12", 500).valueOn("2026-10-13"))
        assertEquals(500L, DailyProfit("2026-10-13", 500).valueOn("2026-10-13"))
    }

    @Test
    fun `a hand nets its payouts minus its whole stake`() {
        assertEquals(-50L, DailyProfitPolicy.handDelta(outcome(totalWin = 0, totalBet = 50)))
        assertEquals(0L, DailyProfitPolicy.handDelta(outcome(totalWin = 10, totalBet = 10)))
        assertEquals(240L, DailyProfitPolicy.handDelta(outcome(totalWin = 250, totalBet = 10)))
    }

    @Test
    fun `a double up wins or loses its stake and a push changes nothing`() {
        assertEquals(40L, DailyProfitPolicy.doubleUpDelta(doubleUp(DoubleUpResult.WIN)))
        assertEquals(-40L, DailyProfitPolicy.doubleUpDelta(doubleUp(DoubleUpResult.LOSE)))
        assertEquals(0L, DailyProfitPolicy.doubleUpDelta(doubleUp(DoubleUpResult.PUSH)))
        assertEquals(0L, DailyProfitPolicy.doubleUpDelta(doubleUp(null)))
    }
}
