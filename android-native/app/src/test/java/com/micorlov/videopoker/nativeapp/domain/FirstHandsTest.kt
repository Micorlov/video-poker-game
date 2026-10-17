package com.micorlov.videopoker.nativeapp.domain

import kotlin.random.Random
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotEquals
import kotlin.test.assertNull

class FirstHandsTest {

    @Test
    fun `the first three deals are fixed winning hands`() {
        repeat(FirstHands.ROUNDS) { n ->
            val dealt = GameEngine.deal(betting(lifetimeHands = n), Random(n)).state
            val scripted = checkNotNull(FirstHands.scriptedHand(n, Variant.JACKS))

            assertEquals(scripted, dealt.hand)
            assertEquals(52, (dealt.hand + dealt.deck).toSet().size)
            assertNotEquals(HandType.NOTHING, HandEvaluator.evaluate(dealt.hand, Variant.JACKS).type)
        }
    }

    @Test
    fun `an opening win rests before it is announced`() {
        assertEquals(FirstHands.WIN_HOLD_MS, FirstHands.winHoldMs(1, Variant.JACKS, won = true))
        assertEquals(FirstHands.WIN_HOLD_MS, FirstHands.winHoldMs(FirstHands.ROUNDS, Variant.JACKS, won = true))
        assertEquals(0L, FirstHands.winHoldMs(1, Variant.JACKS, won = false))
        assertEquals(0L, FirstHands.winHoldMs(0, Variant.JACKS, won = true))
        assertEquals(0L, FirstHands.winHoldMs(FirstHands.ROUNDS + 1, Variant.JACKS, won = true))
        assertEquals(0L, FirstHands.winHoldMs(1, Variant.DEUCES, won = true))
    }

    @Test
    fun `the fourth deal is a normal shuffle`() {
        val dealt = GameEngine.deal(betting(lifetimeHands = FirstHands.ROUNDS), ConstantRandom(-1)).state
        assertEquals(standardDeck().shuffled(ConstantRandom(-1)).take(5), dealt.hand)
    }

    @Test
    fun `deuces wild is never one of the scripted hands`() {
        val dealt = GameEngine.deal(
            betting(lifetimeHands = 0, variant = Variant.DEUCES),
            ConstantRandom(-1),
        ).state
        assertEquals(standardDeck().shuffled(ConstantRandom(-1)).take(5), dealt.hand)
        assertNull(FirstHands.coach(0, Variant.DEUCES, Phase.HOLD, dealt.hand, heldNone, cardsFaceUp = true))
    }

    @Test
    fun `the third hand points at all in then at the lamp`() {
        val hand = checkNotNull(FirstHands.scriptedHand(2, Variant.JACKS))

        assertEquals(CoachTarget.Hold(1), coach(checkNotNull(FirstHands.scriptedHand(0, Variant.JACKS)), heldNone, hintsExplained = false, allInExplained = false))
        assertEquals(CoachTarget.AllIn, coach(hand, heldNone, lifetimeHands = 2, hintsExplained = false, allInExplained = false))
        assertEquals(CoachTarget.Hints, coach(hand, heldNone, lifetimeHands = 2, hintsExplained = false, allInExplained = true))
        assertNull(coach(hand, heldNone, lifetimeHands = 2))
        assertNull(coach(hand, heldNone, lifetimeHands = 2, hintsExplained = false, allInExplained = false, cardsFaceUp = false))
    }

    @Test
    fun `the hand points at each winning card then at draw`() {
        val hand = checkNotNull(FirstHands.scriptedHand(0, Variant.JACKS))
        val keep = HandEvaluator.evaluate(hand, Variant.JACKS).winIndices.sorted()
        assertEquals(listOf(1, 3), keep)

        assertEquals(CoachTarget.Hold(1), coach(hand, heldNone))
        assertEquals(CoachTarget.Hold(3), coach(hand, listOf(false, true, false, false, false)))
        assertEquals(CoachTarget.Draw, coach(hand, listOf(false, true, false, true, false)))
    }

    @Test
    fun `an extra hold is pointed at before draw`() {
        val hand = checkNotNull(FirstHands.scriptedHand(0, Variant.JACKS))
        assertEquals(
            CoachTarget.Release(0),
            coach(hand, listOf(true, true, false, true, false)),
        )
    }

    @Test
    fun `the third hand is not coached card by card`() {
        val hand = checkNotNull(FirstHands.scriptedHand(2, Variant.JACKS))
        assertNull(coach(hand, heldNone, lifetimeHands = 2))
        assertNull(coach(hand, List(5) { true }, lifetimeHands = 2))
    }

    @Test
    fun `between hands the coach says the win then points at deal`() {
        val hand = checkNotNull(FirstHands.scriptedHand(0, Variant.JACKS))
        assertNull(coach(hand, heldNone, phase = Phase.BET, cardsFaceUp = false, lifetimeHands = 1, winAnnounced = false))
        assertEquals(
            CoachTarget.Won,
            coach(hand, heldNone, phase = Phase.BET, cardsFaceUp = true, lifetimeHands = 1, winAnnounced = false),
        )
        assertEquals(
            CoachTarget.Deal,
            coach(hand, heldNone, phase = Phase.BET, cardsFaceUp = true, lifetimeHands = 1, winAnnounced = true),
        )
        assertEquals(true, FirstHands.announcesWin(1, Variant.JACKS))
        assertEquals(true, FirstHands.announcesWin(2, Variant.JACKS))
        assertEquals(false, FirstHands.announcesWin(FirstHands.ROUNDS, Variant.JACKS))
        assertEquals(false, FirstHands.announcesWin(1, Variant.DEUCES))
    }

    @Test
    fun `the tutorial waits until the cards are face up and ends after three hands`() {
        val hand = checkNotNull(FirstHands.scriptedHand(0, Variant.JACKS))
        assertNull(coach(hand, heldNone, cardsFaceUp = false))
        assertNull(coach(hand, heldNone, lifetimeHands = FirstHands.ROUNDS))
        assertNull(coach(hand, heldNone, phase = Phase.DOUBLE_UP))
    }

    private fun coach(
        hand: List<Card>,
        held: List<Boolean>,
        phase: Phase = Phase.HOLD,
        cardsFaceUp: Boolean = true,
        lifetimeHands: Int = 0,
        hintsExplained: Boolean = true,
        allInExplained: Boolean = true,
        winAnnounced: Boolean = true,
    ) = FirstHands.coach(
        lifetimeHands,
        Variant.JACKS,
        phase,
        hand,
        held,
        cardsFaceUp,
        hintsExplained,
        allInExplained,
        winAnnounced,
    )

    private val heldNone = List(5) { false }

    /** A table in the betting phase, past whatever [newGame] dealt. */
    private fun betting(lifetimeHands: Int, variant: Variant = Variant.JACKS): GameState {
        val dealt = GameEngine.newGame(
            SavedGame(lifetimeHands = lifetimeHands, variant = variant),
            defaultBet = 10,
            random = Random(1),
        ).state
        return dealt.copy(phase = Phase.BET, balance = 1000, bet = 10, handCount = 1, outcome = null)
    }
}
