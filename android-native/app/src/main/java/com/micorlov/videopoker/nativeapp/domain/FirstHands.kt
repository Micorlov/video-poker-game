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

    /**
     * After an opening draw's cards have landed, the held cards rest this long before the
     * win is spoken and the tutorial moves on. Long enough to feel the win.
     */
    const val WIN_HOLD_MS = 3_000L

    /**
     * How long the "you won" line stays up, once the cards are face up, before the coach
     * points at Deal. The next line speaks over this one, so the pause has to let the
     * sentence finish.
     */
    const val WIN_ANNOUNCE_MS = 3_000L

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
     * How long to rest on the held cards after a draw, before announcing the win.
     * [lifetimeHands] has already counted the hand just drawn, so 1, 2, and 3 are the
     * three opening wins. A loss, a later hand, and Deuces Wild announce immediately.
     */
    fun winHoldMs(lifetimeHands: Int, variant: Variant, won: Boolean): Long =
        if (won && variant != Variant.DEUCES && lifetimeHands in 1..ROUNDS) WIN_HOLD_MS else 0L

    /**
     * The first two opening wins are said by the coach ("you won"), not by the plain hand
     * name. The third hand is not coached, so its win is spoken the usual way.
     * [lifetimeHands] has already counted the hand just drawn.
     */
    fun announcesWin(lifetimeHands: Int, variant: Variant): Boolean =
        variant != Variant.DEUCES && lifetimeHands in 1 until ROUNDS

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
        /** The lamp tip, on the third hand after ALL IN. */
        hintsExplained: Boolean = true,
        /** The once-a-day ALL IN tip. The third hand, once its cards are face up. */
        allInExplained: Boolean = true,
        /** The win of the hand just drawn has already been said. Until then, say it. */
        winAnnounced: Boolean = true,
    ): CoachTarget? {
        if (!applies(lifetimeHands, variant) || !cardsFaceUp) return null
        return when (phase) {
            Phase.BET -> if (winAnnounced) CoachTarget.Deal else CoachTarget.Won
            Phase.DOUBLE_UP -> null
            Phase.HOLD -> when {
                lifetimeHands < 2 -> holdCoach(variant, hand, held)
                !allInExplained -> CoachTarget.AllIn
                !hintsExplained -> CoachTarget.Hints
                else -> null
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

    /** The hand just paid. Say so, pointing at the result, before Deal. */
    data object Won : CoachTarget

    /** The once-a-day ALL IN chip, once the cards are face up. */
    data object AllIn : CoachTarget

    /** The lamp in the header. Tapping it turns hints on. */
    data object Hints : CoachTarget
}
