package com.micorlov.videopoker.nativeapp.domain.social

import java.net.URLEncoder

/**
 * The link an invite message carries: the app's Play listing with the inviter's code in the
 * install referrer, which LinkIntake reads once on the friend's first launch. A custom-scheme
 * link is not used: messaging apps do not make it tappable, and the Capacitor app claims the
 * same scheme.
 */
object InviteLink {
    const val PACKAGE = "com.micorlov.videopoker.nativeapp"
    private const val STORE = "https://play.google.com/store/apps/details"

    fun forCode(code: String, packageName: String = PACKAGE): String =
        "$STORE?id=$packageName&referrer=${URLEncoder.encode("ref=$code", "UTF-8")}"
}
