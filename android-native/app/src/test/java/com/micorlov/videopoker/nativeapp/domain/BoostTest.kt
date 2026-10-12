package com.micorlov.videopoker.nativeapp.domain

import kotlin.random.Random
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class BoostTest {

    private val alwaysLow = ConstantRandom(0)
    private val alwaysHigh = ConstantRandom(-1)

    private fun freshDeal(seed: Int): Deal {
        val shuffled = standardDeck().shuffled(Random(seed))
        return Deal(hand = shuffled.take(5), deck = shuffled.drop(5))
    }

    private fun assertConserved(before: Deal, after: Deal) {
        val everything = after.hand + after.deck
        assertEquals(52, everything.size)
        assertEquals(52, everything.toSet().size, "no card may be duplicated or lost")
        assertEquals(5, after.hand.size)
        assertEquals((before.hand + before.deck).toSet(), everything.toSet())
    }

    private fun hasPair(hand: List<Card>) = hand.groupingBy { it.rank }.eachCount().values.any { it >= 2 }

    private fun biggestSuit(hand: List<Card>) = hand.groupingBy { it.suit }.eachCount().values.max()

    // ---- chance ---------------------------------------------------------------------

    @Test
    fun `baseline chance with a healthy balance and no losses`() {
        assertEquals(0.18, Boost.chance(lossStreak = 0, balance = 100_000, bet = 10), 1e-9)
    }

    @Test
    fun `each consecutive loss adds mercy up to five`() {
        assertEquals(0.18 + 0.12, Boost.chance(2, 100_000, 10), 1e-9)
        assertEquals(0.18 + 0.30, Boost.chance(5, 100_000, 10), 1e-9)
        assertEquals(0.18 + 0.30, Boost.chance(9, 100_000, 10), 1e-9)
    }

    @Test
    fun `a low balance adds help`() {
        // 100 <= 10 * 10 but 100 > 10 * 4
        assertEquals(0.18 + 0.15, Boost.chance(0, 100, 10), 1e-9)
    }

    @Test
    fun `a critical balance adds strong comeback help instead of the low bonus`() {
        // 40 <= 10 * 4
        assertEquals(0.18 + 0.35, Boost.chance(0, 40, 10), 1e-9)
    }

    @Test
    fun `the strongest possible chance is a deep losing streak on an almost empty stack`() {
        // 0.18 + 5 * 0.06 + 0.35. The 0.85 cap in the web code can never actually bind.
        assertEquals(0.83, Boost.chance(99, 0, 10), 1e-9)
    }

    @Test
    fun `the critical and low balance thresholds are inclusive`() {
        assertEquals(0.18 + 0.35, Boost.chance(0, 40, 10), 1e-9) // exactly 4 bets: critical
        assertEquals(0.18 + 0.15, Boost.chance(0, 41, 10), 1e-9) // just above: only low
        assertEquals(0.18 + 0.15, Boost.chance(0, 100, 10), 1e-9) // exactly 10 bets: low
        assertEquals(0.18, Boost.chance(0, 101, 10), 1e-9) // just above: healthy
    }

    // ---- applying -------------------------------------------------------------------

    @Test
    fun `an unlucky roll leaves the deal alone`() {
        val deal = freshDeal(1)
        val result = Boost.apply(deal, balance = 5, bet = 10, lossStreak = 5, random = alwaysHigh)
        assertEquals(deal, result)
    }

    @Test
    fun `a critical balance with a triggered boost always reaches for a pair`() {
        repeat(300) { seed ->
            val deal = freshDeal(seed)
            val result = Boost.apply(deal, balance = 5, bet = 10, lossStreak = 0, random = alwaysLow)
            assertConserved(deal, result)
            assertTrue(hasPair(result.hand), "seed $seed: expected a pair in ${result.hand}")
        }
    }

    // ---- the two boosts -------------------------------------------------------------

    @Test
    fun `boost to pair keeps the deck whole and ends with a pair`() {
        repeat(500) { seed ->
            val deal = freshDeal(seed)
            val result = Boost.toPair(deal, Random(seed))
            assertConserved(deal, result)
            assertTrue(hasPair(result.hand), "seed $seed: expected a pair in ${result.hand}")
        }
    }

    @Test
    fun `boost to pair does nothing when the hand already has a pair`() {
        val dealt = hand("K♠ K♥ 4♦ 7♣ 9♠")
        val deal = Deal(dealt, standardDeck() - dealt.toSet())
        assertEquals(deal, Boost.toPair(deal, Random(3)))
    }

    @Test
    fun `boost to flush draw produces four to a flush and keeps the deck whole`() {
        repeat(500) { seed ->
            val deal = freshDeal(seed)
            val result = Boost.toFlushDraw(deal, Random(seed))
            assertConserved(deal, result)
            assertTrue(biggestSuit(result.hand) >= 4, "seed $seed: expected 4 suited in ${result.hand}")
        }
    }

    @Test
    fun `boost to flush draw does nothing when four are already suited`() {
        val dealt = hand("2♠ 5♠ 9♠ K♠ 7♦")
        val deal = Deal(dealt, standardDeck() - dealt.toSet())
        assertEquals(deal, Boost.toFlushDraw(deal, Random(3)))
    }

    @Test
    fun `swapped-out cards are shuffled back, not queued as the next cards drawn`() {
        // Draws take from the end of the deck. If the cards a boost removed always sat there,
        // a boosted flush draw would always draw an off-suit card first.
        val nextDrawnWasSwappedOut = (0 until 500).count { seed ->
            val deal = freshDeal(seed)
            val result = Boost.toFlushDraw(deal, Random(seed))
            val swappedOut = deal.hand - result.hand.toSet()
            swappedOut.isNotEmpty() && result.deck.last() in swappedOut
        }
        // At most three swapped-out cards among 47: about one deal in twenty, never every one.
        assertTrue(nextDrawnWasSwappedOut < 75, "next card drawn was a swapped-out card in $nextDrawnWasSwappedOut of 500 deals")
    }
}
