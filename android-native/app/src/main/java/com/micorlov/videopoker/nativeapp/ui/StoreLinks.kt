package com.micorlov.videopoker.nativeapp.ui

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.net.Uri

/** Opens this app's Play listing and the developer's page (openRateGame / openMoreGames in js/deeplink.js). */
object StoreLinks {
    private const val DEVELOPER_PAGE = "https://play.google.com/store/apps/developer?id=Orlov+Games"

    fun listingUri(packageName: String): Uri = Uri.parse("https://play.google.com/store/apps/details?id=$packageName")

    fun openListing(context: Context) = open(context, Uri.parse("market://details?id=${context.packageName}"), listingUri(context.packageName))

    fun openDeveloperPage(context: Context) = open(context, Uri.parse(DEVELOPER_PAGE), null)

    /** Tries the Play app first, then the web page; with neither available the tap does nothing, rather than crash. */
    private fun open(context: Context, primary: Uri, fallback: Uri?) {
        for (uri in listOfNotNull(primary, fallback)) {
            try {
                context.startActivity(Intent(Intent.ACTION_VIEW, uri).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
                return
            } catch (_: ActivityNotFoundException) {
                // try the next one
            }
        }
    }
}
