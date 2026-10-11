package com.micorlov.videopoker.nativeapp.domain

import kotlin.test.Test
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class ReminderPolicyTest {

    @Test
    fun `reminds a player who has not played today, once`() {
        assertTrue(ReminderPolicy.shouldNotify(true, "2026-10-12", lastPlayedDay = "2026-10-11", lastReminderDay = "2026-10-11"))
        assertTrue(ReminderPolicy.shouldNotify(true, "2026-10-12", lastPlayedDay = "", lastReminderDay = ""))
        assertFalse(ReminderPolicy.shouldNotify(true, "2026-10-12", lastPlayedDay = "2026-10-11", lastReminderDay = "2026-10-12"))
    }

    @Test
    fun `stays quiet for a player who already played today or opted out`() {
        assertFalse(ReminderPolicy.shouldNotify(true, "2026-10-12", lastPlayedDay = "2026-10-12", lastReminderDay = ""))
        assertFalse(ReminderPolicy.shouldNotify(false, "2026-10-12", lastPlayedDay = "", lastReminderDay = ""))
        assertFalse(ReminderPolicy.shouldNotify(true, "", lastPlayedDay = "", lastReminderDay = ""))
    }
}
