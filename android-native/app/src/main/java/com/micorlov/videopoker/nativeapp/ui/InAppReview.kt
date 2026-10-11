package com.micorlov.videopoker.nativeapp.ui

import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import com.google.android.play.core.review.ReviewManagerFactory

/** Google Play's in-app review sheet. Play rate-limits it and often shows nothing; that is normal. */
object InAppReview {
    fun request(context: Context) {
        val activity = context.findActivity() ?: return
        val manager = ReviewManagerFactory.create(activity)
        manager.requestReviewFlow().addOnSuccessListener { info ->
            manager.launchReviewFlow(activity, info)
        }
        // A failed request is ignored on purpose: the ask has already been spent and the card comes later.
    }

    private fun Context.findActivity(): Activity? {
        var current: Context? = this
        while (current is ContextWrapper) {
            if (current is Activity) return current
            current = current.baseContext
        }
        return null
    }
}
