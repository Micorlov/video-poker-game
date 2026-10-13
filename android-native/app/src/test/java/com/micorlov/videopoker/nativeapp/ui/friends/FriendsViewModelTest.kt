package com.micorlov.videopoker.nativeapp.ui.friends

import com.micorlov.videopoker.nativeapp.data.GameRepository
import com.micorlov.videopoker.nativeapp.data.InMemoryStore
import com.micorlov.videopoker.nativeapp.data.social.FakeAuthGateway
import com.micorlov.videopoker.nativeapp.data.social.FakeSocialRemote
import com.micorlov.videopoker.nativeapp.data.social.FriendsRepository
import com.micorlov.videopoker.nativeapp.data.social.TestHost
import com.micorlov.videopoker.nativeapp.domain.DailyProfit
import com.micorlov.videopoker.nativeapp.domain.DeepLink
import com.micorlov.videopoker.nativeapp.domain.ResetCountdown
import com.micorlov.videopoker.nativeapp.domain.social.AuthUser
import com.micorlov.videopoker.nativeapp.ui.ToastMessage
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import java.time.Instant
import kotlin.test.AfterTest
import kotlin.test.BeforeTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertIs
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

@OptIn(ExperimentalCoroutinesApi::class)
class FriendsViewModelTest {

    private val dispatcher = UnconfinedTestDispatcher()
    private val now = Instant.parse("2026-10-13T20:30:00Z").toEpochMilli()
    private val today = "2026-10-13"
    private val auth = FakeAuthGateway()
    private val remote = FakeSocialRemote()
    private val game = GameRepository(InMemoryStore())
    private val profit = MutableStateFlow(DailyProfit.NONE)
    private val me = AuthUser("me", "Me", null, createdAtMs = now - 60_000)

    @BeforeTest
    fun setUp() = Dispatchers.setMain(dispatcher)

    @AfterTest
    fun tearDown() = Dispatchers.resetMain()

    private fun test(block: suspend TestScope.() -> Unit) = runTest(dispatcher) { block() }

    private fun viewModel() = FriendsViewModel(auth, remote, FriendsRepository(remote, game) { now }, profit, { now }, flowOf(now))

    private fun FriendsViewModel.drain(): List<FriendsEffect> = generateSequence { effects.tryReceive().getOrNull() }.toList()

    @Test
    fun `without Firebase the tab says friends are unavailable`() = test {
        val vm = FriendsViewModel(FakeAuthGateway(available = false), remote, FriendsRepository(remote, game), profit, { now }, flowOf(now))
        assertEquals(FriendsAuth.UNAVAILABLE, vm.state.value.auth)
        vm.onInvite(TestHost)
        assertEquals(ToastMessage.FriendsUnavailable, assertIs<FriendsEffect.Toast>(vm.drain().single()).message)
    }

    @Test
    fun `signed out shows the countdown and no table`() = test {
        val vm = viewModel()
        assertEquals(FriendsAuth.SIGNED_OUT, vm.state.value.auth)
        assertEquals(ResetCountdown(3, 30), vm.state.value.resetIn)
        assertTrue(vm.state.value.rows.isEmpty())
    }

    @Test
    fun `inviting while signed out signs in first and then shares the code`() = test {
        auth.next = Result.success(me)
        val vm = viewModel()

        vm.onInvite(TestHost)

        val code = assertNotNull(vm.state.value.code)
        assertEquals(FriendsAuth.SIGNED_IN, vm.state.value.auth)
        assertEquals(listOf<FriendsEffect>(FriendsEffect.Share(code)), vm.drain())
    }

    @Test
    fun `a cancelled sign in goes back to signed out with a message`() = test {
        val vm = viewModel()
        vm.onInvite(TestHost)
        assertEquals(FriendsAuth.SIGNED_OUT, vm.state.value.auth)
        assertEquals(ToastMessage.SignInFailed, assertIs<FriendsEffect.Toast>(vm.drain().single()).message)
    }

    @Test
    fun `the table ranks friends by today's profit with my live row`() = test {
        remote.codes["ann"] = "ANN222"
        remote.names["ann"] = "Ann"
        remote.setProfit("ann", DailyProfit(today, 300))
        auth.setUser(me)
        val vm = viewModel()
        vm.onAddByCode("ann222")

        profit.value = DailyProfit(today, 500)

        val rows = vm.state.value.rows
        assertEquals(listOf("me", "ann"), rows.map { it.uid })
        assertTrue(rows.first().isMe)
        assertEquals(500L, rows.first().profit)

        remote.setProfit("ann", DailyProfit(today, 900))
        assertEquals("ann", vm.state.value.rows.first().uid)
    }

    @Test
    fun `a parked invite is joined after sign in`() = test {
        remote.codes["ann"] = "ANN222"
        game.savePendingLink(DeepLink.Invite("ANN222"))
        auth.next = Result.success(me)
        val vm = viewModel()
        assertTrue(vm.state.value.pendingInvite)

        vm.onSignIn(TestHost)

        assertFalse(vm.state.value.pendingInvite)
        assertTrue(remote.areFriends("me", "ann"))
        val toasts = vm.drain().filterIsInstance<FriendsEffect.Toast>().map { it.message }
        assertEquals(listOf<ToastMessage>(ToastMessage.FriendsAdded(1)), toasts)
        assertEquals(1_000L, game.loadPendingCredits(), "a brand-new account is welcomed")
    }

    @Test
    fun `a malformed code is rejected before any lookup`() = test {
        auth.setUser(me)
        val vm = viewModel()
        vm.drain()
        vm.onAddByCode("bad")
        assertEquals(ToastMessage.InvalidCode, assertIs<FriendsEffect.Toast>(vm.drain().single()).message)
    }

    @Test
    fun `rewards for friends who joined are claimed and counted`() = test {
        auth.setUser(me)
        val vm = viewModel()
        remote.addReferral("f1", inviterUid = "me")
        remote.addReferral("f2", inviterUid = "me")

        assertEquals(2, vm.state.value.rewardsEarned)
        assertEquals(2_000L, game.loadPendingCredits())
    }
}
