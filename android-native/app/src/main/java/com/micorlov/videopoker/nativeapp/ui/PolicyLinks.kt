package com.micorlov.videopoker.nativeapp.ui

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.net.Uri

/** The hosted pages Google Play's listing points to, opened in the browser. */
object PolicyLinks {
    private const val SITE = "https://micorlov.github.io/video-poker-game"
    const val PRIVACY_POLICY = "$SITE/privacy-policy.html"

    /** Where a player who is not signed in on this device can still ask for their account to be deleted. */
    const val DELETE_ACCOUNT = "$SITE/delete-account.html"

    fun open(context: Context, url: String) {
        try {
            context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        } catch (_: ActivityNotFoundException) {
            // No browser installed: the tap does nothing, rather than crash.
        }
    }
}
