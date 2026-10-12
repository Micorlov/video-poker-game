package com.micorlov.videopoker.nativeapp.domain

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class ReviewPolicyTest {

    private val day = 24L * 60 * 60 * 1000
    private val now = 100 * day
    private val today = "2026-10-13"

    private fun earnedAsk(state: ReviewState, level: Int = 1, winStreak: Int = 0, today: String = this.today) =
        ReviewPolicy.earnedAsk(state, level, winStreak, today, now)

    @Test
    fun `only a straight or better is a quality win`() {
        assertTrue(ReviewPolicy.isQualityWin(HandType.STRAIGHT))
        assertTrue(ReviewPolicy.isQualityWin(HandType.ROYAL_FLUSH))
        assertFalse(ReviewPolicy.isQualityWin(HandType.THREE_OF_A_KIND))
        assertFalse(ReviewPolicy.isQualityWin(HandType.NOTHING))
    }

    @Test
    fun `three wins in a row earn the first ask`() {
        assertFalse(earnedAsk(ReviewState(), winStreak = 2))
        assertTrue(earnedAsk(ReviewState(), winStreak = 3))
        assertTrue(earnedAsk(ReviewState(), winStreak = 9))
    }

    @Test
    fun `a win on the install's first day earns the ask`() {
        assertTrue(earnedAsk(ReviewState(firstDay = today), winStreak = 1))
        assertFalse(earnedAsk(ReviewState(firstDay = "2026-10-12"), winStreak = 1))
    }

    @Test
    fun `an unknown first day never earns the ask, even without a day key`() {
        assertFalse(earnedAsk(ReviewState(firstDay = ""), winStreak = 1))
        assertFalse(earnedAsk(ReviewState(firstDay = ""), winStreak = 1, today = ""))
    }

    @Test
    fun `level three earns the ask without a streak or a first-day win`() {
        assertTrue(earnedAsk(ReviewState(), level = 3, winStreak = 1))
        assertFalse(earnedAsk(ReviewState(), level = 2, winStreak = 1))
    }

    @Test
    fun `a lifetime of quality wins no longer earns the ask on its own`() {
        assertFalse(earnedAsk(ReviewState(wins = 9), winStreak = 1))
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

    @Test
    fun `an earned streak still waits out the card cooldown once the sheet has been shown`() {
        val asked = ReviewState(shown = true, shownAt = now)
        assertFalse(ReviewPolicy.earnedAsk(asked, level = 1, winStreak = 3, today = today, now = now + day))
        assertTrue(ReviewPolicy.earnedAsk(asked, level = 1, winStreak = 3, today = today, now = now + 7 * day))
    }
}
