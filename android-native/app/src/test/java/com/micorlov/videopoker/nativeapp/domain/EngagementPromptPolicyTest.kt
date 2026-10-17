package com.micorlov.videopoker.nativeapp.domain

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class EngagementPromptPolicyTest {

    @Test
    fun `notifications are asked on the tenth turn and not before`() {
        val fresh = EngagementPromptState()
        assertEquals(EngagementPrompt.NONE, EngagementPromptPolicy.decide(9, fresh, notificationsEnabled = false))
        assertEquals(
            EngagementPrompt.NOTIFICATIONS,
            EngagementPromptPolicy.decide(10, fresh, notificationsEnabled = false),
        )
        assertEquals(
            EngagementPrompt.NOTIFICATIONS,
            EngagementPromptPolicy.decide(40, fresh, notificationsEnabled = false),
        )
    }

    @Test
    fun `notifications already on satisfy the ask without a dialog`() {
        val fresh = EngagementPromptState()
        assertEquals(EngagementPrompt.NONE, EngagementPromptPolicy.decide(10, fresh, notificationsEnabled = true))
        assertTrue(EngagementPromptPolicy.notificationAlreadySatisfied(10, fresh, notificationsEnabled = true))
        assertFalse(EngagementPromptPolicy.notificationAlreadySatisfied(9, fresh, notificationsEnabled = true))
        assertFalse(EngagementPromptPolicy.notificationAlreadySatisfied(10, fresh, notificationsEnabled = false))
    }

    @Test
    fun `a rating is asked on the twentieth rewarded turn`() {
        val asked = EngagementPromptState(notificationAsked = true)
        assertEquals(EngagementPrompt.NONE, EngagementPromptPolicy.decide(30, asked.copy(rewardedTurns = 19), false))
        assertEquals(
            EngagementPrompt.RATING,
            EngagementPromptPolicy.decide(30, asked.copy(rewardedTurns = 20), false),
        )
        assertEquals(EngagementPrompt.NONE, EngagementPromptPolicy.decide(30, asked.copy(rewardedTurns = 20, ratingAsked = true), false))
    }

    @Test
    fun `the notification ask comes first when both are due`() {
        val both = EngagementPromptState(rewardedTurns = 20)
        assertEquals(EngagementPrompt.NOTIFICATIONS, EngagementPromptPolicy.decide(10, both, notificationsEnabled = false))
        assertEquals(
            EngagementPrompt.RATING,
            EngagementPromptPolicy.decide(10, both.copy(notificationAsked = true), notificationsEnabled = false),
        )
    }
}
