package com.micorlov.videopoker.nativeapp.domain

/**
 * Suggested holds: a port of the simplified priority ladder in js/hints.js. Not a perfect
 * strategy, but it matches the web app's hints card for card.
 */
object StrategyHints {

    /** Which of the five cards to hold. */
    fun holds(hand: List<Card>, variant: Variant): List<Boolean> {
        val indices = if (variant == Variant.DEUCES) deucesHolds(hand) else jacksHolds(hand)
        return List(HandEvaluator.HAND_SIZE) { it in indices }
    }

    private val ALL = listOf(0, 1, 2, 3, 4)
    private const val ROYAL_MIN = 10
    private const val HIGH_MIN = 11
    private const val ACE_HIGH = 14

    private fun jacksHolds(h: List<Card>): List<Int> {
        val res = StandardEvaluator.evaluate(h)
        when (res.type) {
            HandType.ROYAL_FLUSH, HandType.STRAIGHT_FLUSH -> return ALL
            HandType.FOUR_OF_A_KIND -> return res.winIndices
            else -> Unit
        }
        suitedRun(h, ROYAL_MIN, 4)?.let { return it.take(4) }
        when (res.type) {
            HandType.FULL_HOUSE, HandType.FLUSH, HandType.STRAIGHT -> return ALL
            HandType.THREE_OF_A_KIND -> return res.winIndices
            else -> Unit
        }
        straightDraw(h, openEnded = false, requireSuited = true)?.let { return it }
        if (res.type == HandType.TWO_PAIR) return res.winIndices + res.secondPairIndices
        pairIndices(h, HIGH_MIN, ACE_HIGH)?.let { return it }
        suitedRun(h, ROYAL_MIN, 3)?.let { return it.take(3) }
        suitedRun(h, 0, 4)?.let { return it }
        pairIndices(h, 2, 10)?.let { return it }
        straightDraw(h, openEnded = true, requireSuited = false)?.let { return it }
        for (suit in Suit.entries) {
            val suitedHigh = ALL.filter { h[it].suit == suit && h[it].rank.value >= HIGH_MIN }
            if (suitedHigh.size >= 2) return suitedHigh.take(2)
        }
        // Same order as the web app: the lowest of the high cards go first.
        return ALL.filter { h[it].rank.value >= HIGH_MIN }.sortedBy { h[it].rank.value }.take(2)
    }

    private fun deucesHolds(h: List<Card>): List<Int> {
        val deuces = ALL.filter { h[it].rank == Rank.TWO }
        val naturals = ALL - deuces.toSet()
        val res = DeucesEvaluator.evaluate(h)
        if (res.type in DEUCES_KEEP_ALL) return ALL
        if (res.type == HandType.FOUR_OF_A_KIND || res.type == HandType.THREE_OF_A_KIND) {
            val best = rankGroups(h, naturals).fold(emptyList<Int>()) { acc, group -> if (group.size > acc.size) group else acc }
            return deuces + best
        }
        if (deuces.size >= 3) return deuces
        for (suit in Suit.entries) {
            val royals = naturals.filter { h[it].suit == suit && h[it].rank.value >= ROYAL_MIN }
            if (deuces.size + royals.size >= 4) return deuces + royals
        }
        pairIndices(h, 3, ACE_HIGH)?.let { return deuces + it }
        if (deuces.isNotEmpty()) return deuces
        suitedRun(h, 0, 4)?.let { return it }
        straightDraw(h, openEnded = true, requireSuited = false)?.let { return it }
        return emptyList()
    }

    private val DEUCES_KEEP_ALL = setOf(
        HandType.ROYAL_FLUSH, HandType.WILD_ROYAL_FLUSH, HandType.FIVE_OF_A_KIND, HandType.STRAIGHT_FLUSH,
        HandType.FULL_HOUSE, HandType.FLUSH, HandType.STRAIGHT, HandType.FOUR_DEUCES,
    )

    /** The first suit with at least [needed] cards worth [minValue] or more (royal draw: 10+, flush draw: any). */
    private fun suitedRun(h: List<Card>, minValue: Int, needed: Int): List<Int>? {
        for (suit in Suit.entries) {
            val indices = ALL.filter { h[it].suit == suit && h[it].rank.value >= minValue }
            if (indices.size >= needed) return indices
        }
        return null
    }

    /** The last four-card straight draw found, as the web app's nested loops do. */
    private fun straightDraw(h: List<Card>, openEnded: Boolean, requireSuited: Boolean): List<Int>? {
        var best: List<Int>? = null
        for (a in 0 until 5) for (b in a + 1 until 5) for (c in b + 1 until 5) for (d in c + 1 until 5) {
            val indices = listOf(a, b, c, d)
            if (requireSuited && indices.any { h[it].suit != h[a].suit }) continue
            val values = indices.map { h[it].rank.value }.sorted()
            val lowAce = indices.map { h[it].rank.value.let { v -> if (v == ACE_HIGH) 1 else v } }.sorted()
            if (fits(values, openEnded) || fits(lowAce, openEnded)) best = indices
        }
        return best
    }

    private fun fits(sorted: List<Int>, openEnded: Boolean): Boolean {
        if (sorted.toSet().size != 4) return false
        val span = sorted[3] - sorted[0]
        return if (openEnded) span == 3 else span <= 4
    }

    /** The first pair whose rank value lies in [minValue]..[maxValue]. */
    private fun pairIndices(h: List<Card>, minValue: Int, maxValue: Int): List<Int>? =
        rankGroups(h, ALL)
            .firstOrNull { it.size == 2 && h[it.first()].rank.value in minValue..maxValue }

    /**
     * Cards grouped by rank in the order a JavaScript object lists its keys: the numeric
     * ranks 2-10 ascending, then A / J / Q / K as first seen. Ties are broken by this order.
     */
    private fun rankGroups(h: List<Card>, indices: List<Int>): List<List<Int>> {
        val groups = indices.groupBy { h[it].rank }
        val (numeric, named) = groups.entries.partition { it.key.label.all(Char::isDigit) }
        return (numeric.sortedBy { it.key.value } + named).map { it.value }
    }
}
