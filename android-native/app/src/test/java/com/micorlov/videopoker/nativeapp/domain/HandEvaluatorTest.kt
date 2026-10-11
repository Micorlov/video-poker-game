package com.micorlov.videopoker.nativeapp.domain

import kotlin.test.Test
import kotlin.test.assertEquals

class HandEvaluatorTest {

    private fun eval(text: String, variant: Variant = Variant.JACKS) =
        HandEvaluator.evaluate(hand(text), variant)

    private fun typeOf(text: String, variant: Variant = Variant.JACKS) = eval(text, variant).type

    // ---- Jacks or Better ------------------------------------------------------------

    @Test
    fun `royal flush is ten to ace of one suit`() {
        val result = eval("10♠ J♠ Q♠ K♠ A♠")
        assertEquals(HandType.ROYAL_FLUSH, result.type)
        assertEquals(listOf(0, 1, 2, 3, 4), result.winIndices)
    }

    @Test
    fun `straight flush below the ace is not royal`() {
        assertEquals(HandType.STRAIGHT_FLUSH, typeOf("9♥ 10♥ J♥ Q♥ K♥"))
    }

    @Test
    fun `ace low wheel flush is a straight flush not royal`() {
        assertEquals(HandType.STRAIGHT_FLUSH, typeOf("A♠ 2♠ 3♠ 4♠ 5♠"))
    }

    @Test
    fun `ace low wheel is a straight`() {
        assertEquals(HandType.STRAIGHT, typeOf("A♠ 2♥ 3♦ 4♣ 5♠"))
    }

    @Test
    fun `ace high straight`() {
        assertEquals(HandType.STRAIGHT, typeOf("10♠ J♥ Q♦ K♣ A♠"))
    }

    @Test
    fun `king queen jack ten around the corner is not a straight`() {
        assertEquals(HandType.NOTHING, typeOf("Q♠ K♥ A♦ 2♣ 3♠"))
    }

    @Test
    fun `four of a kind highlights the four matching cards`() {
        val result = eval("9♠ 9♥ 9♦ 9♣ K♠")
        assertEquals(HandType.FOUR_OF_A_KIND, result.type)
        assertEquals(listOf(0, 1, 2, 3), result.winIndices)
    }

    @Test
    fun `full house splits highlights into trips and pair`() {
        val result = eval("K♠ 4♥ K♦ 4♣ K♣")
        assertEquals(HandType.FULL_HOUSE, result.type)
        assertEquals(listOf(0, 2, 4), result.winIndices)
        assertEquals(listOf(1, 3), result.secondPairIndices)
    }

    @Test
    fun `flush beats straight when suits match without a sequence`() {
        assertEquals(HandType.FLUSH, typeOf("2♥ 5♥ 9♥ J♥ K♥"))
    }

    @Test
    fun `three of a kind`() {
        val result = eval("7♠ 7♥ 7♦ 2♣ 9♠")
        assertEquals(HandType.THREE_OF_A_KIND, result.type)
        assertEquals(listOf(0, 1, 2), result.winIndices)
        assertEquals(emptyList(), result.thirdMatchIndices)
    }

    @Test
    fun `three jacks mark the first jack as the third match`() {
        val result = eval("4♣ J♠ J♥ J♦ 9♠")
        assertEquals(HandType.THREE_OF_A_KIND, result.type)
        assertEquals(listOf(1, 2, 3), result.winIndices)
        assertEquals(listOf(1), result.thirdMatchIndices)
    }

    @Test
    fun `two pair highlights the numeric pair first`() {
        // The web app iterates rank counts with JS object-key order: numeric ranks
        // ascending, then face ranks in the order they appear. The 5s come first.
        val result = eval("K♠ 5♥ K♦ 5♣ 9♠")
        assertEquals(HandType.TWO_PAIR, result.type)
        assertEquals(listOf(1, 3), result.winIndices)
        assertEquals(listOf(0, 2), result.secondPairIndices)
    }

    @Test
    fun `pair of jacks pays`() {
        val result = eval("J♠ 4♥ J♦ 7♣ 9♠")
        assertEquals(HandType.JACKS_OR_BETTER, result.type)
        assertEquals(listOf(0, 2), result.winIndices)
    }

    @Test
    fun `pair of tens does not pay`() {
        assertEquals(HandType.NOTHING, typeOf("10♠ 4♥ 10♦ 7♣ 9♠"))
    }

    @Test
    fun `pair of aces pays`() {
        assertEquals(HandType.JACKS_OR_BETTER, typeOf("A♠ 4♥ A♦ 7♣ 9♠"))
    }

    @Test
    fun `nothing has no highlights`() {
        val result = eval("2♠ 4♥ 6♦ 8♣ 10♠")
        assertEquals(HandType.NOTHING, result.type)
        assertEquals(emptyList(), result.winIndices)
    }

    // ---- Bonus Poker / Double Bonus: quads split by rank ---------------------------

    @Test
    fun `bonus poker relabels quad aces`() {
        assertEquals(HandType.FOUR_ACES, typeOf("A♠ A♥ A♦ A♣ 9♠", Variant.BONUS))
    }

    @Test
    fun `bonus poker relabels low quads`() {
        assertEquals(HandType.FOUR_2S_4S, typeOf("3♠ 3♥ 3♦ 3♣ 9♠", Variant.BONUS))
    }

    @Test
    fun `double bonus relabels high quads`() {
        assertEquals(HandType.FOUR_5S_KS, typeOf("K♠ K♥ K♦ K♣ 9♠", Variant.DOUBLE_BONUS))
    }

    @Test
    fun `jacks or better keeps generic four of a kind`() {
        assertEquals(HandType.FOUR_OF_A_KIND, typeOf("A♠ A♥ A♦ A♣ 9♠", Variant.JACKS))
    }

    // ---- Deuces Wild ----------------------------------------------------------------

    @Test
    fun `four deuces`() {
        val result = eval("2♠ 2♥ 2♦ 2♣ 9♠", Variant.DEUCES)
        assertEquals(HandType.FOUR_DEUCES, result.type)
        assertEquals(listOf(0, 1, 2, 3, 4), result.winIndices)
    }

    @Test
    fun `natural royal with no deuces`() {
        assertEquals(HandType.ROYAL_FLUSH, typeOf("10♠ J♠ Q♠ K♠ A♠", Variant.DEUCES))
    }

    @Test
    fun `wild royal uses a deuce`() {
        assertEquals(HandType.WILD_ROYAL_FLUSH, typeOf("2♥ J♠ Q♠ K♠ A♠", Variant.DEUCES))
    }

    @Test
    fun `five of a kind needs deuces`() {
        assertEquals(HandType.FIVE_OF_A_KIND, typeOf("2♥ 2♦ 9♠ 9♥ 9♦", Variant.DEUCES))
    }

    @Test
    fun `straight flush with a deuce`() {
        assertEquals(HandType.STRAIGHT_FLUSH, typeOf("2♥ 5♠ 6♠ 7♠ 8♠", Variant.DEUCES))
    }

    @Test
    fun `three of a kind via a deuce is the minimum payer`() {
        assertEquals(HandType.THREE_OF_A_KIND, typeOf("2♥ 9♠ 9♦ 4♣ 7♠", Variant.DEUCES))
    }

    @Test
    fun `a bare pair does not pay in deuces wild`() {
        assertEquals(HandType.NOTHING, typeOf("K♥ K♠ 4♦ 7♣ 9♠", Variant.DEUCES))
    }

    @Test
    fun `two pair with one deuce is a full house`() {
        assertEquals(HandType.FULL_HOUSE, typeOf("2♥ 9♠ 9♦ 4♣ 4♠", Variant.DEUCES))
    }
}
