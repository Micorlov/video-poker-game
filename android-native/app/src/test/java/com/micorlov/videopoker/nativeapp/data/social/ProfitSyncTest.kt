package com.micorlov.videopoker.nativeapp.data.social

import com.micorlov.videopoker.nativeapp.domain.DailyProfit
import com.micorlov.videopoker.nativeapp.domain.social.AuthUser
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class ProfitSyncTest {

    private val remote = FakeSocialRemote()
    private val user = MutableStateFlow<AuthUser?>(null)
    private val profit = MutableStateFlow(DailyProfit.NONE)
    private val me = AuthUser("me", "Me", null, 1)

    private fun TestScope.sync() = ProfitSync(remote, user, profit, backgroundScope).also { it.start() }

    @Test
    fun `nothing is sent while signed out`() = runTest {
        sync()
        profit.value = DailyProfit("2026-10-13", 40)
        advanceTimeBy(ProfitSync.QUIET_MS * 2)
        assertTrue(remote.pushes.isEmpty())
    }

    @Test
    fun `a burst of hands is sent once after a quiet spell`() = runTest {
        user.value = me
        sync()
        listOf(10L, 25L, -5L).forEach {
            profit.value = DailyProfit("2026-10-13", it)
            advanceTimeBy(1_000)
        }
        assertTrue(remote.pushes.isEmpty())
        advanceTimeBy(ProfitSync.QUIET_MS + 1)
        assertEquals(listOf("me" to DailyProfit("2026-10-13", -5)), remote.pushes)
    }

    @Test
    fun `flush sends at once and an unchanged value is not resent`() = runTest {
        user.value = me
        val sync = sync()
        profit.value = DailyProfit("2026-10-13", 70)
        sync.flush()
        runCurrent()
        assertEquals(1, remote.pushes.size)

        advanceTimeBy(ProfitSync.QUIET_MS + 1)
        assertEquals(1, remote.pushes.size)
    }

    @Test
    fun `a failed send is retried on the next change`() = runTest {
        user.value = me
        val sync = sync()
        remote.offline = true
        profit.value = DailyProfit("2026-10-13", 70)
        sync.flush()
        runCurrent()
        remote.offline = false
        sync.flush()
        runCurrent()
        assertEquals(1, remote.pushes.size)
    }
}
