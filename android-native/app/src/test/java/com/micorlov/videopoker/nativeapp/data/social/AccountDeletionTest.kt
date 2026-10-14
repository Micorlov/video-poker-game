package com.micorlov.videopoker.nativeapp.data.social

import com.micorlov.videopoker.nativeapp.domain.social.AuthUser
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class AccountDeletionTest {
    private val auth = FakeAuthGateway().apply { setUser(AuthUser("me", "Me", null, createdAtMs = 0)) }
    private val remote = FakeSocialRemote()
    private val calls = mutableListOf<String>()

    private fun deletion() = AccountDeletion(auth, remote, hold = { calls += "hold" }, release = { calls += "release" })

    @Test
    fun `erases the cloud data and then the sign-in`() = runTest {
        remote.connect("me", "pal", "CODE")

        val result = deletion().delete(TestHost)

        assertTrue(result.isSuccess)
        assertEquals(listOf("me"), remote.erased)
        assertFalse(remote.areFriends("me", "pal"))
        assertTrue(auth.deleted)
        assertEquals(listOf("hold", "release"), calls)
    }

    @Test
    fun `an unreachable server leaves the account in place and syncing resumes`() = runTest {
        remote.offline = true

        val result = deletion().delete(TestHost)

        assertTrue(result.isFailure)
        assertFalse(auth.deleted)
        assertEquals("me", auth.user.value?.uid)
        assertEquals(listOf("hold", "release"), calls)
    }

    @Test
    fun `a refused sign-in deletion is reported and the player stays signed in`() = runTest {
        auth.deleteResult = Result.failure(IllegalStateException("recent login required"))

        val result = deletion().delete(TestHost)

        assertTrue(result.isFailure)
        assertEquals("me", auth.user.value?.uid)
    }

    @Test
    fun `nothing happens when nobody is signed in`() = runTest {
        auth.setUser(null)

        val result = deletion().delete(TestHost)

        assertTrue(result.isFailure)
        assertTrue(remote.erased.isEmpty())
        assertTrue(calls.isEmpty())
    }
}
