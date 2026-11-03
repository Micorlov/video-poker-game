package com.micorlov.videopoker.nativeapp.notify

import com.google.firebase.messaging.FirebaseMessagingService
import com.micorlov.videopoker.nativeapp.VideoPokerApplication

/** FCM rotated this device's token: file the new one. Messages themselves are shown by the system. */
class PushTokenService : FirebaseMessagingService() {
    override fun onNewToken(token: String) {
        val container = (application as VideoPokerApplication).container
        if (container.notificationsAllowed()) container.pushTokens.onNewToken(token)
    }
}
