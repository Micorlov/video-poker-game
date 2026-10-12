package com.micorlov.videopoker.nativeapp.domain

/**
 * The expected return of every way to hold a dealt hand, in multiples of the bet. [evs] has
 * one entry per hold mask: bit i set means card i is kept (see [maskOf]).
 */
data class HoldAnalysis(val evs: List<Double>) {
    init {
        require(evs.size == MASKS) { "One expected value per hold mask: $MASKS, got ${evs.size}" }
    }

    /** The first mask with the highest return. Ties are equivalent plays, so any of them is "best". */
    val bestMask: Int = evs.indices.maxBy { evs[it] }
    val bestEv: Double get() = evs[bestMask]

    fun ev(held: List<Boolean>): Double = evs[maskOf(held)]

    /** True when [held] gives up nothing against the best play (equal-value alternatives included). */
    fun isBest(held: List<Boolean>): Boolean = ev(held) >= bestEv - TOLERANCE

    fun bestHolds(): List<Boolean> = holdsOf(bestMask)

    companion object {
        const val MASKS = 1 shl HandEvaluator.HAND_SIZE
        private const val TOLERANCE = 1e-9

        fun maskOf(held: List<Boolean>): Int = held.foldIndexed(0) { i, mask, keep -> if (keep) mask or (1 shl i) else mask }

        fun holdsOf(mask: Int): List<Boolean> = List(HandEvaluator.HAND_SIZE) { mask shr it and 1 == 1 }
    }
}

/**
 * Exact hold-or-draw maths: every one of the 32 holds is scored over every possible draw from
 * the 47 unseen cards, which is 2,598,960 hands per deal. Each draw is equally likely: the
 * hidden [Boost] only changes which cards are dealt, and shuffles the ones it swaps out back
 * into the deck. So this is the true optimum for the pay table passed in, not a rule of thumb.
 *
 * Takes a few hundred milliseconds on a phone: call it off the main thread.
 */
object HoldAnalyzer {
    private const val DECK_SIZE = 52
    private const val RANKS = 13

    /** [payout] is what each hand pays per unit bet right now (the loss escalator included). */
    fun analyze(hand: List<Card>, variant: Variant, payout: (HandType) -> Int): HoldAnalysis {
        require(hand.size == HandEvaluator.HAND_SIZE && hand.toSet().size == hand.size) { "Need five distinct cards, got $hand" }
        val pays = IntArray(HandType.entries.size) { payout(HandType.entries[it]) }
        val dealt = IntArray(hand.size) { FastClassifier.code(hand[it]) }
        val unseen = (0 until DECK_SIZE).filter { it !in dealt }.toIntArray()
        val counter = DrawCounter(variant, pays, unseen)
        return HoldAnalysis(List(HoldAnalysis.MASKS) { mask -> counter.expectedReturn(dealt, mask) })
    }

    /** Reuses its buffers across masks: the inner loop allocates nothing. */
    private class DrawCounter(private val variant: Variant, private val pays: IntArray, private val unseen: IntArray) {
        private val work = IntArray(HandEvaluator.HAND_SIZE)
        private val tally = IntArray(RANKS)

        fun expectedReturn(dealt: IntArray, mask: Int): Double {
            var kept = 0
            for (i in dealt.indices) if (mask shr i and 1 == 1) work[kept++] = dealt[i]
            val draws = work.size - kept
            if (draws == 0) return pays[FastClassifier.classify(variant, work, tally).ordinal].toDouble()

            // Walk every draws-sized combination of the unseen cards in lexicographic order.
            val n = unseen.size
            val picks = IntArray(draws) { it }
            for (j in 0 until draws) work[kept + j] = unseen[j]
            var total = 0L
            var combos = 0L
            while (true) {
                total += pays[FastClassifier.classify(variant, work, tally).ordinal]
                combos++
                var i = draws - 1
                while (i >= 0 && picks[i] == n - draws + i) i--
                if (i < 0) break
                picks[i]++
                work[kept + i] = unseen[picks[i]]
                for (j in i + 1 until draws) {
                    picks[j] = picks[j - 1] + 1
                    work[kept + j] = unseen[picks[j]]
                }
            }
            return total.toDouble() / combos
        }
    }
}
