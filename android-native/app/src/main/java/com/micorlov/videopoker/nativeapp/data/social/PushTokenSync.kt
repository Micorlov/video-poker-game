package com.micorlov.videopoker.nativeapp.data.social

import com.micorlov.videopoker.nativeapp.domain.social.AuthUser
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.launch

/**
 * Files this device's FCM token under the signed-in player (users/{uid}/fcmTokens/{token}, the
 * shape the web app wrote and the admin push sender reads). A token that arrives before sign-in
 * is held and written the moment a user exists. [refresh] runs on every app start once
 * notifications are allowed, and [onNewToken] on rotation; an unchanged pair is not resent.
 */
class PushTokenSync(
    private val remote: SocialRemote,
    private val user: StateFlow<AuthUser?>,
    private val fetchToken: suspend () -> String?,
    private val scope: CoroutineScope,
) {
    private val token = MutableStateFlow<String?>(null)
    private var lastSent: Pair<String, String>? = null

    fun start() {
        scope.launch {
            combine(user.filterNotNull(), token.filterNotNull()) { u, t -> u.uid to t }
                .collect { (uid, t) -> send(uid, t) }
        }
    }

    /** Notifications are allowed (or need no permission): ask FCM for the current token. */
    fun refresh() {
        scope.launch { runCatching { fetchToken() }.getOrNull()?.let { token.value = it } }
    }

    fun onNewToken(value: String) { token.value = value }

    private suspend fun send(uid: String, value: String) {
        if (lastSent == uid to value) return
        runCatching { remote.saveFcmToken(uid, value) }.onSuccess { lastSent = uid to value }
    }
}
