package com.micorlov.videopoker.nativeapp.data

import com.micorlov.videopoker.nativeapp.domain.AppLanguage
import com.micorlov.videopoker.nativeapp.domain.Rules

/** The three table-cloth themes from the web app's Settings → Theme. */
enum class AppTheme(val storageKey: String) {
    GREEN("green"),
    BLUE("blue"),
    CRIMSON("crimson"),
    ;

    companion object {
        fun fromStorageKey(key: String?): AppTheme? = entries.firstOrNull { it.storageKey == key }
    }
}

/** How fast cards flip and winnings count up. [pace] scales every animation duration. */
enum class GameSpeed(val storageKey: String, val pace: Float) {
    NORMAL("normal", 1f),
    FAST("fast", 0.5f),
    TURBO("turbo", 0.25f),
    ;

    companion object {
        fun fromStorageKey(key: String?): GameSpeed? = entries.firstOrNull { it.storageKey == key }
    }
}

data class UserSettings(
    val soundEnabled: Boolean = true,
    val hapticsEnabled: Boolean = true,
    val theme: AppTheme = AppTheme.GREEN,
    val defaultBet: Int = Rules.DEFAULT_BET,
    /** Strategy hints: the best hold glows blue during the hold phase. */
    val hintsEnabled: Boolean = false,
    /** After each draw, say whether the holds were the best play and what a mistake cost. */
    val feedbackEnabled: Boolean = true,
    /** Offer a double-up after every win. */
    val doubleUpEnabled: Boolean = true,
    val gameSpeed: GameSpeed = GameSpeed.NORMAL,
    /** Spoken hand names after a win; on by default, as in the web app. */
    val voiceEnabled: Boolean = true,
    /** The language the player picked; null follows the device. */
    val language: AppLanguage? = null,
    /** The four push categories of js/push.js. Only the daily reminder runs on the device today; the rest apply once an account is connected. */
    val notifySocial: Boolean = false,
    val notifyLeaderboard: Boolean = false,
    val dailyReminderEnabled: Boolean = false,
    val notifyBestHand: Boolean = false,
)
