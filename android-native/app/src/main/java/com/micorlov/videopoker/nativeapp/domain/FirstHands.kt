package com.micorlov.videopoker.nativeapp.domain

import kotlin.random.Random

/**
 * The first [ROUNDS] deals of a new player. Each one is already a paying hand, so the table
 * can walk them through marking the cards that pay and then drawing. Deuces Wild is left
 * alone: a pair of jacks pays nothing there, and that game is locked until well after
 * these rounds.
 */
object FirstHands {
    const val ROUNDS = 3

    private val HANDS = listOf(
        // Jacks or better, split apart so the hand travels across the row.
        cards("4♦ J♠ 7♣ J♥ 9♠"),
        // Three of a kind, again not bunched on the left.
        cards("K♠ 8♣ 3♥ 8♦ 8♥"),
        // A flush: every card stays.
        cards("A♥ K♥ 9♥ 6♥ 2♥"),
    )

    fun applies(lifetimeHands: Int, variant: Variant): Boolean =
        lifetimeHands in 0 until ROUNDS && variant != Variant.DEUCES

    /** The five cards to deal, or null when this hand is an ordinary shuffle. */
    fun scriptedHand(lifetimeHands: Int, variant: Variant): List<Card>? =
        if (applies(lifetimeHands, variant)) HANDS[lifetimeHands] else null

    /**
     * Where the floating hand should point, or null when this moment is not part of the
     * tutorial. [cardsFaceUp] waits out the flip, so the hand never points at a card the
     * player cannot see yet.
     */
    fun coach(
        lifetimeHands: Int,
        variant: Variant,
        phase: Phase,
        hand: List<Card>,
        held: List<Boolean>,
        cardsFaceUp: Boolean,
        /** The lamp tip, on the first hand once the cards are face up. */
        hintsExplained: Boolean = true,
        /** The once-a-day ALL IN tip, on the first hand after the lamp. */
        allInExplained: Boolean = true,
    ): CoachTarget? {
        if (!applies(lifetimeHands, variant) || !cardsFaceUp) return null
        return when (phase) {
            Phase.BET -> CoachTarget.Deal
            Phase.DOUBLE_UP -> null
            Phase.HOLD -> when {
                lifetimeHands == 0 && !hintsExplained -> CoachTarget.Hints
                lifetimeHands == 0 && !allInExplained -> CoachTarget.AllIn
                else -> holdCoach(variant, hand, held)
            }
        }
    }

    /** A fresh deck with [hand] removed, so the draw cannot deal a duplicate. */
    fun deal(hand: List<Card>, random: Random): Deal {
        val deck = standardDeck().filter { it !in hand }.shuffled(random)
        return Deal(hand, deck)
    }

    private fun holdCoach(variant: Variant, hand: List<Card>, held: List<Boolean>): CoachTarget? {
        if (hand.size != HandEvaluator.HAND_SIZE || held.size != hand.size) return null
        val result = HandEvaluator.evaluate(hand, variant)
        val keep = (result.winIndices + result.secondPairIndices).toSet()
        if (keep.isEmpty()) return CoachTarget.Draw
        val next = keep.sorted().firstOrNull { !held[it] }
        if (next != null) return CoachTarget.Hold(next)
        val extra = held.indices.firstOrNull { held[it] && it !in keep }
        if (extra != null) return CoachTarget.Release(extra)
        return CoachTarget.Draw
    }

    private fun cards(text: String): List<Card> = text.split(" ").map { card ->
        requireNotNull(Card.parse(card)) { "Bad tutorial card: $card" }
    }
}

/** The one control the opening tutorial wants pressed next. */
sealed interface CoachTarget {
    /** Tap this card to hold it. */
    data class Hold(val index: Int) : CoachTarget

    /** Tap this card to take the hold off. It is not part of the paying cards. */
    data class Release(val index: Int) : CoachTarget

    /** The paying cards are marked. Press Draw. */
    data object Draw : CoachTarget

    /** Between the opening hands. Press Deal. */
    data object Deal : CoachTarget

    /** The once-a-day ALL IN chip, once the cards are face up. */
    data object AllIn : CoachTarget

    /** The lamp in the header. Tapping it turns hints on. */
    data object Hints : CoachTarget
}
