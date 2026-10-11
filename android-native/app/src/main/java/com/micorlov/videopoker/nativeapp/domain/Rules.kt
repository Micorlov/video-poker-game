package com.micorlov.videopoker.nativeapp.domain

/** Game constants and small pure rules, taken from js/game.js, js/progress.js and js/referral.js. */
object Rules {
    /** Chips a new player starts with, and what a free rebuy resets the stack to. */
    const val STARTING_BALANCE = 1000L

    /** Free chips granted on the first launch of each local calendar day (js/daily-bonus.js). */
    const val DAILY_BONUS = 200L

    /** ALL INs allowed per local day (ALLIN_DAILY_LIMIT_DEFAULT in js/game.js). */
    const val ALL_IN_DAILY_LIMIT = 1

    /** Keeps an ALL IN payout inside an Int: 1,000,000 x 250 x 5 hands, streak bonus included, still fits. */
    const val ALL_IN_MAX_BET = 1_000_000

    const val MIN_BET = 5
    const val DEFAULT_BET = 10
    val BET_OPTIONS = listOf(5, 10, 20, 50)
    val HAND_COUNT_OPTIONS = listOf(1, 3, 5)

    /** Level is lifetime hands played, nothing else: it only gates variants and multi-hand. */
    const val HANDS_PER_LEVEL = 5
    const val MULTI_HAND_MIN_LEVEL = 10

    fun level(lifetimeHands: Int): Int = 1 + lifetimeHands / HANDS_PER_LEVEL

    /** Hands still to play before the next level; a full [HANDS_PER_LEVEL] right after levelling up. */
    fun handsToNextLevel(lifetimeHands: Int): Int = HANDS_PER_LEVEL - lifetimeHands % HANDS_PER_LEVEL

    /** Something a level unlocks. */
    sealed interface Unlock {
        val level: Int

        data class VariantUnlock(val variant: Variant) : Unlock {
            override val level: Int get() = variant.minLevel
        }

        data object MultiHand : Unlock {
            override val level: Int get() = MULTI_HAND_MIN_LEVEL
        }
    }

    /** The nearest thing still locked at [level], or null when everything is open. */
    fun nextUnlock(level: Int): Unlock? {
        val unlocks = Variant.entries.filter { it != Variant.JACKS }.map { Unlock.VariantUnlock(it) } + Unlock.MultiHand
        return unlocks.filter { it.level > level }.minByOrNull { it.level }
    }

    /** Extra payout fraction for a run of consecutive winning hands. */
    fun streakBonus(winStreak: Int): Double = when {
        winStreak >= 10 -> 0.5
        winStreak >= 7 -> 0.3
        winStreak >= 5 -> 0.2
        winStreak >= 3 -> 0.1
        else -> 0.0
    }
}
