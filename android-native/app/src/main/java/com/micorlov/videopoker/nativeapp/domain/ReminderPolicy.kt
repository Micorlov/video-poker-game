package com.micorlov.videopoker.nativeapp.domain

/** When the local "come back and play" reminder may fire (the dailyReminder category in scripts/push). */
object ReminderPolicy {
    /** Local hour the reminder is due, a mid-evening nudge. */
    const val REMINDER_HOUR = 18

    /**
     * Once per local day, only for a player who has not played yet today, and only if they opted in.
     * Days are yyyy-MM-dd keys; an empty key means "never".
     */
    fun shouldNotify(enabled: Boolean, today: String, lastPlayedDay: String, lastReminderDay: String): Boolean =
        enabled && today.isNotEmpty() && lastPlayedDay != today && lastReminderDay != today
}
