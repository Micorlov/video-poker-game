package com.micorlov.videopoker.nativeapp.domain

/**
 * The hand type [HandEvaluator] would report, computed from five int-coded cards with no
 * allocation. [HoldAnalyzer] calls this millions of times per deal, which the list-based
 * evaluators are too slow for. `FastClassifierTest` pins it to [HandEvaluator] on every
 * five-card hand, for every variant.
 *
 * A card code is `rankIndex * 4 + suitIndex`, where rankIndex 0..12 is the deuce up to the ace.
 */
internal object FastClassifier {

    const val ACE = 12
    private const val JACK = 9
    private const val TEN = 8
    private const val FOUR = 2
    private const val FIVE_HIGH_MAX = 3
    private const val ACE_BIT = 1 shl ACE
    private const val WHEEL = ACE_BIT or 0b1111
    private const val ROYAL = 0b11111 shl TEN
    private const val FIVE_IN_A_ROW = 0b11111
    private const val BELOW_TEN = (1 shl TEN) - 1

    fun code(card: Card): Int = (card.rank.value - 2) * 4 + card.suit.ordinal

    /** [scratch] is a 13-slot rank tally, all zero on entry and left all zero on return. */
    fun classify(variant: Variant, hand: IntArray, scratch: IntArray): HandType =
        if (variant == Variant.DEUCES) deuces(hand, scratch) else standard(variant, hand, scratch)

    private fun standard(variant: Variant, hand: IntArray, tally: IntArray): HandType {
        var bits = 0
        var top = 0
        var pairRank = -1
        var quadRank = -1
        for (card in hand) {
            val rank = card shr 2
            bits = bits or (1 shl rank)
            val n = ++tally[rank]
            if (n > top) top = n
            if (n == 2) pairRank = rank
            if (n == 4) quadRank = rank
        }
        for (card in hand) tally[card shr 2] = 0

        return when (Integer.bitCount(bits)) {
            5 -> unpaired(bits, sameSuit(hand))
            4 -> if (pairRank >= JACK) HandType.JACKS_OR_BETTER else HandType.NOTHING
            3 -> if (top == 3) HandType.THREE_OF_A_KIND else HandType.TWO_PAIR
            else -> if (top == 4) quads(variant, quadRank) else HandType.FULL_HOUSE
        }
    }

    private fun unpaired(bits: Int, flush: Boolean): HandType {
        val lowest = bits and -bits
        val straight = bits == lowest * FIVE_IN_A_ROW || bits == WHEEL
        return when {
            straight && flush -> if (bits == ROYAL) HandType.ROYAL_FLUSH else HandType.STRAIGHT_FLUSH
            flush -> HandType.FLUSH
            straight -> HandType.STRAIGHT
            else -> HandType.NOTHING
        }
    }

    private fun quads(variant: Variant, rank: Int): HandType = when {
        variant != Variant.BONUS && variant != Variant.DOUBLE_BONUS -> HandType.FOUR_OF_A_KIND
        rank == ACE -> HandType.FOUR_ACES
        rank <= FOUR -> HandType.FOUR_2S_4S
        else -> HandType.FOUR_5S_KS
    }

    /** Mirrors [DeucesEvaluator] check for check, so every quirk of the web evaluator carries over. */
    private fun deuces(hand: IntArray, tally: IntArray): HandType {
        var wilds = 0
        var bits = 0
        var top = 0
        var suit = -1
        var flush = true
        for (card in hand) {
            val rank = card shr 2
            if (rank == 0) {
                wilds++
                continue
            }
            bits = bits or (1 shl rank)
            val n = ++tally[rank]
            if (n > top) top = n
            val cardSuit = card and 3
            if (suit == -1) suit = cardSuit else if (cardSuit != suit) flush = false
        }
        for (card in hand) tally[card shr 2] = 0
        if (wilds == 4) return HandType.FOUR_DEUCES

        val naturals = 5 - wilds
        val distinct = Integer.bitCount(bits)
        val allDistinct = distinct == naturals
        val straight = allDistinct && (fitsHigh(bits) || fitsAceLow(bits))
        val allRoyal = allDistinct && (bits and BELOW_TEN) == 0
        // Two distinct natural ranks: five naturals split 3+2 (not 4+1), or four split 2+2 (not 3+1).
        val fullHouse = distinct == 2 && ((wilds == 0 && top == 3) || (wilds == 1 && top == 2))

        return when {
            wilds == 0 && flush && straight && Integer.numberOfTrailingZeros(bits) == TEN -> HandType.ROYAL_FLUSH
            wilds > 0 && flush && allRoyal -> HandType.WILD_ROYAL_FLUSH
            top + wilds >= 5 -> HandType.FIVE_OF_A_KIND
            flush && straight -> HandType.STRAIGHT_FLUSH
            top + wilds >= 4 -> HandType.FOUR_OF_A_KIND
            fullHouse -> HandType.FULL_HOUSE
            flush -> HandType.FLUSH
            straight -> HandType.STRAIGHT
            top + wilds >= 3 -> HandType.THREE_OF_A_KIND
            else -> HandType.NOTHING
        }
    }

    private fun fitsHigh(bits: Int): Boolean =
        (31 - Integer.numberOfLeadingZeros(bits)) - Integer.numberOfTrailingZeros(bits) <= 4

    /** The ace counted as a one: every other natural must be a five or lower. */
    private fun fitsAceLow(bits: Int): Boolean {
        if (bits and ACE_BIT == 0) return false
        val rest = bits xor ACE_BIT
        return rest == 0 || 31 - Integer.numberOfLeadingZeros(rest) <= FIVE_HIGH_MAX
    }

    private fun sameSuit(hand: IntArray): Boolean {
        val suit = hand[0] and 3
        for (i in 1 until hand.size) if (hand[i] and 3 != suit) return false
        return true
    }
}
