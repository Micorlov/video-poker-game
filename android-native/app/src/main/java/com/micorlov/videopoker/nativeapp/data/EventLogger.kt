package com.micorlov.videopoker.nativeapp.data

/**
 * Where product-analytics events go. Kept free of Android types so the view models that log
 * stay JVM-testable; [FirebaseEventLogger] is the real sink.
 */
fun interface EventLogger {
    fun log(name: String, params: Map<String, Any>)

    companion object {
        val NONE = EventLogger { _, _ -> }
    }
}

/**
 * The web app's event vocabulary (js/analytics.js), kept identical so the GA4 property's
 * week-over-week reports carry straight on from the web build to the native one. Events never
 * carry account ids, names, invite codes or card-level data.
 */
object AnalyticsEvents {
    const val APP_OPEN = "app_open"
    const val ONBOARDING_STEP = "onboarding_step"
    const val HAND_STARTED = "hand_started"
    const val HAND_COMPLETED = "hand_completed"
    const val DAILY_BONUS_CLAIMED = "daily_bonus_claimed"
    const val REVIEW_PROMPT_EARNED = "review_prompt_earned"
    const val REVIEW_CARD_SHOWN = "review_card_shown"
    const val REVIEW_CARD_RATE = "review_card_rate"
    const val REVIEW_CARD_DISMISSED = "review_card_dismissed"
    const val INVITE_SHARED = "invite_shared"
}
