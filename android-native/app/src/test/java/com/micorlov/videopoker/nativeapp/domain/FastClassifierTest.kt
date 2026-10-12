package com.micorlov.videopoker.nativeapp.domain

import kotlin.test.Test
import kotlin.test.assertEquals

class FastClassifierTest {

    private val deck = standardDeck()

    @Test
    fun `agrees with the shipping evaluator on every five-card hand, for every variant`() {
        val work = IntArray(5)
        val scratch = IntArray(13)
        val codes = deck.map(FastClassifier::code)
        Variant.entries.forEach { variant ->
            var checked = 0
            forEachHand { a, b, c, d, e ->
                work[0] = codes[a]; work[1] = codes[b]; work[2] = codes[c]; work[3] = codes[d]; work[4] = codes[e]
                val cards = listOf(deck[a], deck[b], deck[c], deck[d], deck[e])
                val expected = HandEvaluator.evaluate(cards, variant).type
                val actual = FastClassifier.classify(variant, work, scratch)
                if (actual != expected) throw AssertionError("$variant $cards: expected $expected, got $actual")
                checked++
            }
            assertEquals(2_598_960, checked)
        }
    }

    @Test
    fun `leaves the scratch tally clean`() {
        val scratch = IntArray(13)
        val work = hand("2♠ 2♥ 2♦ K♣ K♠").map(FastClassifier::code).toIntArray()

        FastClassifier.classify(Variant.DEUCES, work, scratch)
        FastClassifier.classify(Variant.JACKS, work, scratch)

        assertEquals(List(13) { 0 }, scratch.toList())
    }

    @Test
    fun `codes a card by rank then suit`() {
        assertEquals(0, FastClassifier.code(card("2♠")))
        assertEquals(51, FastClassifier.code(card("A♣")))
    }

    private inline fun forEachHand(block: (Int, Int, Int, Int, Int) -> Unit) {
        for (a in 0 until 48) for (b in a + 1 until 49) for (c in b + 1 until 50) for (d in c + 1 until 51) for (e in d + 1 until 52) {
            block(a, b, c, d, e)
        }
    }
}
