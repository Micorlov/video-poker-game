package com.micorlov.videopoker.nativeapp.domain

/** What the review ask remembers between launches (`vp_review` in js/review.js). Times are epoch millis. */
data class ReviewState(
    val wins: Int = 0,
    val shown: Boolean = false,
    val shownAt: Long = 0,
    val cardCount: Int = 0,
    val lastCardAt: Long = 0,
    val rated: Boolean = false,
)

enum class ReviewAsk { NONE, NATIVE_SHEET, STAR_CARD }

/**
 * When to ask for a rating. The first ask is Google Play's in-app review sheet; Play
 * rate-limits it and often shows nothing, so later asks are an "Enjoying Video Poker?" card.
 * Guardrails: one ask per session, a 7-day cooldown, at most 3 cards, never again once
 * the player taps Rate now.
 */
object ReviewPolicy {
    const val QUALITY_WINS_NEEDED = 3
    const val LEVEL_THRESHOLD = 3
    const val CARD_LIFETIME_CAP = 3
    const val CARD_COOLDOWN_MS = 7L * 24 * 60 * 60 * 1000

    /** Delay between the winning draw and the ask, so other prompts get the screen first. */
    const val PROMPT_DELAY_MS = 3200L

    /** A Straight or better counts as a quality win. */
    fun isQualityWin(type: HandType): Boolean = type.strength >= HandType.STRAIGHT.strength

    fun cardDue(state: ReviewState, now: Long): Boolean {
        if (state.rated || state.cardCount >= CARD_LIFETIME_CAP) return false
        return now - maxOf(state.shownAt, state.lastCardAt) >= CARD_COOLDOWN_MS
    }

    /** Whether a quality win should start the ask timer. */
    fun earnedAsk(state: ReviewState, level: Int, now: Long): Boolean {
        if (state.wins < QUALITY_WINS_NEEDED && level < LEVEL_THRESHOLD) return false
        return !state.shown || cardDue(state, now)
    }

    /** Decided when the timer fires, not when the win lands. */
    fun decide(state: ReviewState, now: Long): ReviewAsk = when {
        !state.shown -> ReviewAsk.NATIVE_SHEET
        cardDue(state, now) -> ReviewAsk.STAR_CARD
        else -> ReviewAsk.NONE
    }
}
