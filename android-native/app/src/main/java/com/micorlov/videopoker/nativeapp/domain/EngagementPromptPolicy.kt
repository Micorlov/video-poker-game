package com.micorlov.videopoker.nativeapp.domain

/** Which engagement dialog is due, if any. */
enum class EngagementPrompt { NONE, NOTIFICATIONS, RATING }

/**
 * Remembers the two one-time asks: push notifications after [EngagementPromptPolicy.NOTIFICATION_AFTER_TURNS]
 * completed hands, and a Play Store rating after [EngagementPromptPolicy.RATING_AFTER_REWARDED_TURNS]
 * hands that paid the player.
 */
data class EngagementPromptState(
    val rewardedTurns: Int = 0,
    val notificationAsked: Boolean = false,
    val ratingAsked: Boolean = false,
)

/**
 * After ten completed hands, ask for notification permission. After twenty hands that paid
 * credits, ask for a five-star Play Store rating. Each ask is shown once. Notifications
 * already switched on count as the first ask having been answered.
 */
object EngagementPromptPolicy {
    const val NOTIFICATION_AFTER_TURNS = 10
    const val RATING_AFTER_REWARDED_TURNS = 20

    fun decide(turnsPlayed: Int, state: EngagementPromptState, notificationsEnabled: Boolean): EngagementPrompt {
        if (notificationDue(turnsPlayed, state) && !notificationsEnabled) return EngagementPrompt.NOTIFICATIONS
        if (state.rewardedTurns >= RATING_AFTER_REWARDED_TURNS && !state.ratingAsked) return EngagementPrompt.RATING
        return EngagementPrompt.NONE
    }

    /** The player already opted in, so the ten-turn ask should be recorded without a dialog. */
    fun notificationAlreadySatisfied(turnsPlayed: Int, state: EngagementPromptState, notificationsEnabled: Boolean): Boolean =
        notificationDue(turnsPlayed, state) && notificationsEnabled

    private fun notificationDue(turnsPlayed: Int, state: EngagementPromptState): Boolean =
        turnsPlayed >= NOTIFICATION_AFTER_TURNS && !state.notificationAsked
}
