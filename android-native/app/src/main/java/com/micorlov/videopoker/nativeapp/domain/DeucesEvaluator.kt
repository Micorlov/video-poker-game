package com.micorlov.videopoker.nativeapp.domain

/**
 * Port of evaluateDeucesHand() from js/hand-eval.js. Every 2 is wild; the lowest paying
 * hand is three of a kind.
 */
internal object DeucesEvaluator {
    private val ALL_CARDS = listOf(0, 1, 2, 3, 4)

    fun evaluate(hand: List<Card>): HandResult {
        val naturals = hand.filter { it.rank != Rank.TWO }
        val wilds = hand.size - naturals.size
        if (wilds == 4) return HandResult(HandType.FOUR_DEUCES, ALL_CARDS)

        val counts = naturals.groupingBy { it.rank }.eachCount().values.sortedDescending()
        val maxCount = counts.firstOrNull() ?: 0
        val secondCount = counts.getOrNull(1)
        val flush = naturals.map { it.suit }.distinct().size <= 1
        val values = naturals.map { it.rank.value }
        val distinct = values.toSet().size == naturals.size
        val straight = distinct && (fitsInWindow(values) || (ACE_HIGH in values && fitsInWindow(values.map { if (it == ACE_HIGH) 1 else it })))
        val allRoyalValues = distinct && values.all { it >= 10 }

        val type = when {
            wilds == 0 && flush && straight && values.min() == 10 -> HandType.ROYAL_FLUSH
            wilds > 0 && flush && allRoyalValues -> HandType.WILD_ROYAL_FLUSH
            maxCount + wilds >= 5 -> HandType.FIVE_OF_A_KIND
            flush && straight -> HandType.STRAIGHT_FLUSH
            maxCount + wilds >= 4 -> HandType.FOUR_OF_A_KIND
            (maxCount == 3 && secondCount == 2) || (wilds == 1 && maxCount == 2 && secondCount == 2) -> HandType.FULL_HOUSE
            flush -> HandType.FLUSH
            straight -> HandType.STRAIGHT
            maxCount + wilds >= 3 -> HandType.THREE_OF_A_KIND
            else -> HandType.NOTHING
        }

        return if (type == HandType.NOTHING) HandResult(type) else HandResult(type, ALL_CARDS)
    }

    private fun fitsInWindow(values: List<Int>): Boolean = values.isEmpty() || values.max() - values.min() <= 4

    private const val ACE_HIGH = 14
}
