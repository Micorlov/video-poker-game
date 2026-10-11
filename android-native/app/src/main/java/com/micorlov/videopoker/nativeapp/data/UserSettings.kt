package com.micorlov.videopoker.nativeapp.data

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

data class UserSettings(
    val soundEnabled: Boolean = true,
    val hapticsEnabled: Boolean = true,
    val theme: AppTheme = AppTheme.GREEN,
    val defaultBet: Int = Rules.DEFAULT_BET,
    /** Strategy hints: suggested holds glow blue during the hold phase. */
    val hintsEnabled: Boolean = false,
    /** Spoken hand names after a win; on by default, as in the web app. */
    val voiceEnabled: Boolean = true,
)
