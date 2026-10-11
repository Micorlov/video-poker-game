package com.micorlov.videopoker.nativeapp.domain

/** Evaluates a five-card hand for a variant. Mirrors evaluateWithVariant() in js/hand-eval.js. */
object HandEvaluator {

    fun evaluate(hand: List<Card>, variant: Variant): HandResult {
        require(hand.size == HAND_SIZE) { "A hand has $HAND_SIZE cards, got ${hand.size}" }
        if (variant == Variant.DEUCES) return DeucesEvaluator.evaluate(hand)

        val result = StandardEvaluator.evaluate(hand)
        val splitsQuadsByRank = variant == Variant.BONUS || variant == Variant.DOUBLE_BONUS
        if (result.type != HandType.FOUR_OF_A_KIND || !splitsQuadsByRank) return result

        val quadRank = hand[result.winIndices.first()].rank
        val quadType = when (quadRank) {
            Rank.ACE -> HandType.FOUR_ACES
            Rank.TWO, Rank.THREE, Rank.FOUR -> HandType.FOUR_2S_4S
            else -> HandType.FOUR_5S_KS
        }
        return result.copy(type = quadType)
    }

    const val HAND_SIZE = 5
}
