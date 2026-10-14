package com.micorlov.videopoker.nativeapp.data

import android.content.Context
import android.os.Bundle
import android.util.Log
import com.google.firebase.analytics.FirebaseAnalytics

/**
 * Sends events to the app's GA4 data stream through the Firebase Analytics SDK. The stream is
 * the one the Capacitor app reported to (same applicationId and Firebase app), so the native
 * build continues its history.
 */
class FirebaseEventLogger(context: Context) : EventLogger {
    private val analytics = FirebaseAnalytics.getInstance(context)

    override fun log(name: String, params: Map<String, Any>) {
        try {
            analytics.logEvent(name, params.toBundle())
        } catch (e: RuntimeException) {
            // Analytics must never cost the player a hand; GA's own event counts show any gap.
            Log.w(TAG, "could not log $name", e)
        }
    }

    private fun Map<String, Any>.toBundle(): Bundle = Bundle().also { bundle ->
        forEach { (key, value) ->
            when (value) {
                is String -> bundle.putString(key, value)
                is Int -> bundle.putLong(key, value.toLong())
                is Long -> bundle.putLong(key, value)
                is Double -> bundle.putDouble(key, value)
                // GA4 has no boolean parameter type; the web build's booleans arrive as strings too.
                is Boolean -> bundle.putString(key, value.toString())
                else -> bundle.putString(key, value.toString())
            }
        }
    }

    private companion object {
        const val TAG = "VpAnalytics"
    }
}
