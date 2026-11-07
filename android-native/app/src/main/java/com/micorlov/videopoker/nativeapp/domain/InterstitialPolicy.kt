package com.micorlov.videopoker.nativeapp.domain

/** New players get a clear run; after that, at most one ad per [HANDS_BETWEEN] hands and per [MIN_GAP_MS]. */
object InterstitialPolicy {
    const val MIN_LIFETIME_HANDS = 20
    const val HANDS_BETWEEN = 5
    const val MIN_GAP_MS = 120_000L

    fun due(lifetimeHands: Int, handsAtLastAd: Int, msSinceLastAd: Long): Boolean =
        lifetimeHands >= MIN_LIFETIME_HANDS &&
            lifetimeHands - handsAtLastAd >= HANDS_BETWEEN &&
            msSinceLastAd >= MIN_GAP_MS
}
