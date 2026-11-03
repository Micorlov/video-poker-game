package com.micorlov.videopoker.nativeapp.data.social

import com.micorlov.videopoker.nativeapp.domain.social.AuthUser
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class PushTokenSyncTest {

    private val remote = FakeSocialRemote()
    private val user = MutableStateFlow<AuthUser?>(null)
    private val me = AuthUser("me", "Me", null, 1)
    private var fcmToken: String? = "tok-1"

    private fun TestScope.sync() = PushTokenSync(remote, user, { fcmToken }, backgroundScope).also { it.start() }

    @Test
    fun `a token obtained before sign-in is held and filed once a user exists`() = runTest {
        val sync = sync()
        sync.refresh()
        runCurrent()
        assertTrue(remote.savedTokens.isEmpty())
        user.value = me
        runCurrent()
        assertEquals(listOf("me" to "tok-1"), remote.savedTokens)
    }

    @Test
    fun `an unchanged token is not resent, a rotated one is`() = runTest {
        user.value = me
        val sync = sync()
        sync.refresh()
        sync.refresh()
        runCurrent()
        sync.onNewToken("tok-2")
        runCurrent()
        assertEquals(listOf("me" to "tok-1", "me" to "tok-2"), remote.savedTokens)
    }

    @Test
    fun `a failed write is retried when the player signs in again`() = runTest {
        user.value = me
        val sync = sync()
        remote.offline = true
        sync.refresh()
        runCurrent()
        remote.offline = false
        user.value = null
        runCurrent()
        user.value = me
        runCurrent()
        assertEquals(listOf("me" to "tok-1"), remote.savedTokens)
    }
}
