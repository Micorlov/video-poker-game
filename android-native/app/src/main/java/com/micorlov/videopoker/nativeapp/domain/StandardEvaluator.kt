package com.micorlov.videopoker.nativeapp.domain

/**
 * Port of evaluateHand() from js/hand-eval.js: the evaluator for every variant except
 * Deuces Wild. Quads are always reported as [HandType.FOUR_OF_A_KIND] here; the
 * Bonus variants relabel them by rank in [HandEvaluator].
 */
internal object StandardEvaluator {
    private val ALL_CARDS = listOf(0, 1, 2, 3, 4)
    private val HIGH_PAIR_RANKS = setOf(Rank.JACK, Rank.QUEEN, Rank.KING, Rank.ACE)

    fun evaluate(hand: List<Card>): HandResult {
        val counts = IntArray(ACE_HIGH + 1)
        var minValue = ACE_HIGH
        var maxValue = 0
        for (card in hand) {
            val value = card.rank.value
            counts[value]++
            if (value < minValue) minValue = value
            if (value > maxValue) maxValue = value
        }
        var top = 0
        var next = 0
        for (n in counts) {
            if (n > top) {
                next = top
                top = n
            } else if (n > next) {
                next = n
            }
        }

        val flush = hand.all { it.suit == hand[0].suit }
        val wheel = counts[ACE_HIGH] == 1 && counts[2] == 1 && counts[3] == 1 && counts[4] == 1 && counts[5] == 1
        val straight = top == 1 && (maxValue - minValue == 4 || wheel)

        return when {
            straight && flush -> {
                val royal = !wheel && minValue == 10
                HandResult(if (royal) HandType.ROYAL_FLUSH else HandType.STRAIGHT_FLUSH, ALL_CARDS)
            }
            top == 4 -> HandResult(HandType.FOUR_OF_A_KIND, indicesWithCount(hand, 4))
            top == 3 && next == 2 -> HandResult(
                HandType.FULL_HOUSE,
                winIndices = indicesWithCount(hand, 3),
                secondPairIndices = indicesWithCount(hand, 2),
            )
            flush -> HandResult(HandType.FLUSH, ALL_CARDS)
            straight -> HandResult(HandType.STRAIGHT, ALL_CARDS)
            top == 3 -> {
                val trips = indicesWithCount(hand, 3)
                val leadJack = if (hand[trips[0]].rank == Rank.JACK) listOf(trips[0]) else emptyList()
                HandResult(HandType.THREE_OF_A_KIND, trips, thirdMatchIndices = leadJack)
            }
            top == 2 && next == 2 -> {
                val (first, second) = pairRanksInWebOrder(hand)
                HandResult(
                    HandType.TWO_PAIR,
                    winIndices = indicesOfRank(hand, first),
                    secondPairIndices = indicesOfRank(hand, second),
                )
            }
            top == 2 -> {
                val pairRank = hand.groupingBy { it.rank }.eachCount().entries.first { it.value == 2 }.key
                if (pairRank in HIGH_PAIR_RANKS) {
                    HandResult(HandType.JACKS_OR_BETTER, indicesOfRank(hand, pairRank))
                } else {
                    HandResult(HandType.NOTHING)
                }
            }
            else -> HandResult(HandType.NOTHING)
        }
    }

    private fun indicesOfRank(hand: List<Card>, rank: Rank): List<Int> =
        hand.indices.filter { hand[it].rank == rank }

    private fun indicesWithCount(hand: List<Card>, count: Int): List<Int> {
        val tally = hand.groupingBy { it.rank }.eachCount()
        return hand.indices.filter { tally.getValue(hand[it].rank) == count }
    }

    /**
     * Which pair of a two-pair hand is "first" (primary highlight). The web app takes it
     * from JavaScript object-key order: integer-like ranks (2..10) ascending, then the
     * remaining ranks (A, J, Q, K) in the order they appear in the hand. Kept identical
     * so both apps highlight the same cards.
     */
    private fun pairRanksInWebOrder(hand: List<Card>): Pair<Rank, Rank> {
        val tally = hand.groupingBy { it.rank }.eachCount()
        val present = hand.map { it.rank }.distinct()
        val (numeric, faces) = present.partition { it.value in 2..10 }
        val ordered = numeric.sortedBy { it.value } + faces
        val pairs = ordered.filter { tally.getValue(it) == 2 }
        return pairs[0] to pairs[1]
    }

    private const val ACE_HIGH = 14
}
