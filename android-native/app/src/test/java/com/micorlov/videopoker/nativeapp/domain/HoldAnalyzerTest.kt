package com.micorlov.videopoker.nativeapp.domain

import kotlin.random.Random
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class HoldAnalyzerTest {

    private fun analyze(cards: String, variant: Variant = Variant.JACKS) =
        HoldAnalyzer.analyze(hand(cards), variant, variant::basePayout)

    private fun holds(vararg indices: Int) = List(5) { it in indices }

    @Test
    fun `a pat royal is worth exactly the royal payout`() {
        val analysis = analyze("A♠ K♠ Q♠ J♠ 10♠")

        assertEquals(250.0, analysis.ev(holds(0, 1, 2, 3, 4)))
        assertEquals(holds(0, 1, 2, 3, 4), analysis.bestHolds())
    }

    @Test
    fun `four to a royal matches the hand count`() {
        // 47 unseen cards: 10♠ is the royal, 8 spades a flush, 3 tens a straight, 12 cards pair a high card.
        val analysis = analyze("A♠ K♠ Q♠ J♠ 3♦")

        assertEquals((250 + 8 * 5 + 3 * 4 + 12 * 1) / 47.0, analysis.ev(holds(0, 1, 2, 3)), 1e-12)
        assertEquals(holds(0, 1, 2, 3), analysis.bestHolds())
    }

    @Test
    fun `breaks a paying pair of jacks for four to a royal`() {
        val analysis = analyze("A♠ K♠ Q♠ J♠ J♥")

        assertEquals(holds(0, 1, 2, 3), analysis.bestHolds())
        assertFalse(analysis.isBest(holds(3, 4)))
    }

    @Test
    fun `four deuces pay the same whatever is drawn`() {
        val analysis = analyze("2♠ 2♥ 2♦ 2♣ 7♥", Variant.DEUCES)

        assertEquals(200.0, analysis.ev(holds(0, 1, 2, 3)))
        assertTrue(analysis.isBest(holds(0, 1, 2, 3)))
        assertTrue(analysis.isBest(holds(0, 1, 2, 3, 4)), "keeping the kicker is just as good")
    }

    @Test
    fun `a flat pay table returns exactly one per bet for every hold`() {
        val analysis = HoldAnalyzer.analyze(hand("9♣ 4♦ K♥ 7♠ 2♣"), Variant.JACKS) { 1 }

        analysis.evs.forEach { assertEquals(1.0, it, 1e-12) }
    }

    @Test
    fun `the payout function is applied, so the loss escalator changes the maths`() {
        val base = analyze("Q♠ Q♥ 5♦ 8♣ 3♠")
        val escalated = HoldAnalyzer.analyze(hand("Q♠ Q♥ 5♦ 8♣ 3♠"), Variant.JACKS) { type ->
            if (type == HandType.NOTHING) 0 else Variant.JACKS.basePayout(type) + 2
        }

        assertTrue(escalated.ev(holds(0, 1)) > base.ev(holds(0, 1)) + 1.9)
    }

    @Test
    fun `matches brute force over the shipping evaluator`() {
        val random = Random(42)
        repeat(4) { round ->
            val variant = Variant.entries[round]
            val dealt = standardDeck().shuffled(random).take(5)
            val analysis = HoldAnalyzer.analyze(dealt, variant, variant::basePayout)
            // Masks keeping two or more cards: at most C(47,3) = 16,215 draws each, cheap enough to brute force.
            (0 until HoldAnalysis.MASKS).filter { Integer.bitCount(it) >= 2 }.forEach { mask ->
                assertEquals(bruteForce(dealt, mask, variant), analysis.evs[mask], 1e-9, "$variant $dealt mask $mask")
            }
        }
    }

    @Test
    fun `masks and holds convert both ways`() {
        assertEquals(0b10101, HoldAnalysis.maskOf(holds(0, 2, 4)))
        assertEquals(holds(1, 3), HoldAnalysis.holdsOf(0b01010))
    }

    private fun bruteForce(dealt: List<Card>, mask: Int, variant: Variant): Double {
        val kept = dealt.filterIndexed { i, _ -> mask shr i and 1 == 1 }
        val unseen = standardDeck().filter { it !in dealt }
        var total = 0L
        var count = 0
        combinations(unseen, 5 - kept.size).forEach { drawn ->
            total += variant.basePayout(HandEvaluator.evaluate(kept + drawn, variant).type)
            count++
        }
        return total.toDouble() / count
    }

    private fun <T> combinations(items: List<T>, size: Int): Sequence<List<T>> = sequence {
        if (size == 0) {
            yield(emptyList())
            return@sequence
        }
        for (i in 0..items.size - size) {
            combinations(items.drop(i + 1), size - 1).forEach { yield(listOf(items[i]) + it) }
        }
    }
}
