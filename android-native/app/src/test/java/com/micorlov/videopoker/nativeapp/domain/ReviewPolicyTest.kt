package com.micorlov.videopoker.nativeapp.domain

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class ReviewPolicyTest {

    private val day = 24L * 60 * 60 * 1000
    private val now = 100 * day

    @Test
    fun `only a straight or better is a quality win`() {
        assertTrue(ReviewPolicy.isQualityWin(HandType.STRAIGHT))
        assertTrue(ReviewPolicy.isQualityWin(HandType.ROYAL_FLUSH))
        assertFalse(ReviewPolicy.isQualityWin(HandType.THREE_OF_A_KIND))
        assertFalse(ReviewPolicy.isQualityWin(HandType.NOTHING))
    }

    @Test
    fun `three quality wins or level three earn the first ask`() {
        assertFalse(ReviewPolicy.earnedAsk(ReviewState(wins = 2), level = 2, now = now))
        assertTrue(ReviewPolicy.earnedAsk(ReviewState(wins = 3), level = 1, now = now))
        assertTrue(ReviewPolicy.earnedAsk(ReviewState(wins = 0), level = 3, now = now))
    }

    @Test
    fun `the first ask is the native sheet and later asks are the card after a week`() {
        assertEquals(ReviewAsk.NATIVE_SHEET, ReviewPolicy.decide(ReviewState(), now))

        val asked = ReviewState(shown = true, shownAt = now)
        assertEquals(ReviewAsk.NONE, ReviewPolicy.decide(asked, now + 6 * day))
        assertEquals(ReviewAsk.STAR_CARD, ReviewPolicy.decide(asked, now + 7 * day))
    }

    @Test
    fun `the card stops after three showings, after rating, and honours its own cooldown`() {
        val old = ReviewState(shown = true, shownAt = 0)
        assertEquals(ReviewAsk.STAR_CARD, ReviewPolicy.decide(old, now))
        assertEquals(ReviewAsk.NONE, ReviewPolicy.decide(old.copy(cardCount = 3), now))
        assertEquals(ReviewAsk.NONE, ReviewPolicy.decide(old.copy(rated = true), now))
        assertEquals(ReviewAsk.NONE, ReviewPolicy.decide(old.copy(cardCount = 1, lastCardAt = now - day), now))
    }
}
