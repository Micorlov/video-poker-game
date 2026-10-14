package com.micorlov.videopoker.nativeapp.data.social

import com.micorlov.videopoker.nativeapp.domain.DailyProfit
import com.micorlov.videopoker.nativeapp.domain.social.AuthUser
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.debounce
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.launch

/**
 * Publishes today's UTC net profit to the player's profile so friends see it. Hands come
 * seconds apart, so writes wait for a quiet spell; [flush] sends at once when the app goes to
 * the background. Nothing is sent while signed out, and an unchanged value is not resent.
 */
class ProfitSync(
    private val remote: SocialRemote,
    private val user: StateFlow<AuthUser?>,
    private val profit: StateFlow<DailyProfit>,
    private val scope: CoroutineScope,
) {
    private var lastSent: Pair<String, DailyProfit>? = null

    /** While true nothing is sent: an account being deleted must not have its profile written back. */
    @Volatile private var held = false

    @OptIn(FlowPreview::class)
    fun start() {
        scope.launch {
            combine(user.filterNotNull(), profit) { u, p -> u.uid to p }
                .debounce(QUIET_MS)
                .collect { (uid, p) -> send(uid, p) }
        }
    }

    fun hold() { held = true }

    fun release() { held = false }

    fun flush() {
        val uid = user.value?.uid ?: return
        val current = profit.value
        scope.launch { send(uid, current) }
    }

    private suspend fun send(uid: String, value: DailyProfit) {
        if (held || value.dayKey.isEmpty() || lastSent == uid to value) return
        runCatching { remote.pushDailyProfit(uid, value) }.onSuccess { lastSent = uid to value }
    }

    companion object {
        const val QUIET_MS = 8_000L
    }
}
