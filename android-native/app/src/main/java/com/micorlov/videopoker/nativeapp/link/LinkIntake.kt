package com.micorlov.videopoker.nativeapp.link

import android.content.Context
import android.content.Intent
import com.android.installreferrer.api.InstallReferrerClient
import com.android.installreferrer.api.InstallReferrerStateListener
import com.micorlov.videopoker.nativeapp.data.GameRepository
import com.micorlov.videopoker.nativeapp.domain.DeepLink

/** Receives codes from a tapped link or the Play install referrer and parks them for later use. */
class LinkIntake(private val repository: GameRepository) {

    /** A `videopoker://` or invite-page link that opened the app. Returns what was parked, if anything. */
    fun onIntent(intent: Intent?): DeepLink? {
        val link = DeepLink.fromUri(intent?.dataString) ?: return null
        repository.savePendingLink(link)
        return link
    }

    /** Reads the Play install referrer once per install; later launches do nothing. [onParked] hears of a code it found. */
    fun readInstallReferrer(context: Context, onParked: (DeepLink) -> Unit = {}) {
        if (repository.isReferrerRead()) return
        val client = InstallReferrerClient.newBuilder(context.applicationContext).build()
        client.startConnection(object : InstallReferrerStateListener {
            override fun onInstallReferrerSetupFinished(responseCode: Int) {
                try {
                    if (responseCode == InstallReferrerClient.InstallReferrerResponse.OK) {
                        DeepLink.fromReferrer(client.installReferrer.installReferrer)?.let {
                            repository.savePendingLink(it)
                            onParked(it)
                        }
                        repository.markReferrerRead()
                    } else if (responseCode == InstallReferrerClient.InstallReferrerResponse.FEATURE_NOT_SUPPORTED) {
                        repository.markReferrerRead()
                    }
                } finally {
                    client.endConnection()
                }
            }

            override fun onInstallReferrerServiceDisconnected() = Unit
        })
    }
}
