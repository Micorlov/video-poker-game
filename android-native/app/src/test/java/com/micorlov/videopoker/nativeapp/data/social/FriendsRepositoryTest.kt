package com.micorlov.videopoker.nativeapp.data.social

import com.micorlov.videopoker.nativeapp.data.GameRepository
import com.micorlov.videopoker.nativeapp.data.InMemoryStore
import com.micorlov.videopoker.nativeapp.domain.DeepLink
import com.micorlov.videopoker.nativeapp.domain.social.AuthUser
import com.micorlov.videopoker.nativeapp.domain.social.JoinResult
import com.micorlov.videopoker.nativeapp.domain.social.ReferralRow
import com.micorlov.videopoker.nativeapp.domain.social.RewardPolicy
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

class FriendsRepositoryTest {

    private val now = 5_000_000_000L
    private val remote = FakeSocialRemote()
    private val game = GameRepository(InMemoryStore())
    private val repo = FriendsRepository(remote, game) { now }

    private val newcomer = AuthUser("new", "Newcomer", null, createdAtMs = now - 60_000)
    private val veteran = AuthUser("old", "Veteran", null, createdAtMs = now - 30L * 24 * 3600 * 1000)

    init {
        remote.codes["owner"] = "OWNER2"
    }

    @Test
    fun `joining through a link makes both players friends and welcomes a new account`() = runTest {
        val result = repo.join(newcomer, "OWNER2")

        assertEquals(JoinResult.Connected(count = 1, welcomeCredited = true), result)
        assertTrue(remote.areFriends("new", "owner"))
        assertEquals("owner", remote.referral("new")?.inviterUid)
        assertEquals(RewardPolicy.INVITEE_REWARD, game.loadPendingCredits())
    }

    @Test
    fun `everyone who joined through the same link becomes friends`() = runTest {
        remote.groups["OWNER2"] = listOf("owner", "first")

        val result = repo.join(newcomer, "OWNER2")

        assertEquals(2, (result as JoinResult.Connected).count)
        assertTrue(remote.areFriends("new", "first"))
        assertEquals(listOf("owner", "first", "new"), remote.groups["OWNER2"])
    }

    @Test
    fun `an old account makes friends but earns no welcome`() = runTest {
        assertEquals(JoinResult.Connected(1, welcomeCredited = false), repo.join(veteran, "OWNER2"))
        assertNull(remote.referral("old"))
        assertEquals(0L, game.loadPendingCredits())
    }

    @Test
    fun `own, unknown and repeated codes are answered without changes`() = runTest {
        remote.codes["new"] = "MINE22"
        assertEquals(JoinResult.OwnCode, repo.join(newcomer, "MINE22"))
        assertEquals(JoinResult.NoSuchCode, repo.join(newcomer, "NOPE22"))
        repo.join(newcomer, "OWNER2")
        assertEquals(JoinResult.AlreadyConnected, repo.join(newcomer, "OWNER2"))
        assertEquals(RewardPolicy.INVITEE_REWARD, game.loadPendingCredits(), "welcomed once")
    }

    @Test
    fun `a parked invite is spent by any answer and kept when offline`() = runTest {
        game.savePendingLink(DeepLink.Invite("OWNER2"))
        remote.offline = true
        assertEquals(JoinResult.NetworkError, repo.consumePendingInvite(newcomer))
        assertTrue(repo.hasPendingInvite())

        remote.offline = false
        assertTrue(repo.consumePendingInvite(newcomer) is JoinResult.Connected)
        assertFalse(repo.hasPendingInvite())
        assertNull(repo.consumePendingInvite(newcomer))
    }

    @Test
    fun `room and gift links are left for their own features`() = runTest {
        game.savePendingLink(DeepLink.Room("ROOM22"))
        assertNull(repo.consumePendingInvite(newcomer))
        assertEquals(DeepLink.Room("ROOM22"), game.loadPendingLink())
    }

    @Test
    fun `claiming credits the inviter up to the cap and announces it`() = runTest {
        repeat(9) { remote.addReferral("done$it", "owner", claimed = true) }
        remote.addReferral("x1", "owner")
        remote.addReferral("x2", "owner")
        val notices = mutableListOf<CreditNotice>()
        val rows = (0 until 9).map { ReferralRow("done$it", "", true) } + ReferralRow("x1", "", false) + ReferralRow("x2", "", false)

        backgroundScope.launch { repo.credits.collect { notices += it } }
        testScheduler.runCurrent()
        val paid = repo.claimRewards(rows)
        testScheduler.runCurrent()

        assertEquals(RewardPolicy.INVITER_REWARD, paid)
        assertEquals(RewardPolicy.INVITER_REWARD, game.loadPendingCredits())
        assertEquals(listOf<CreditNotice>(CreditNotice.InvitesRewarded(1, RewardPolicy.INVITER_REWARD)), notices)
        assertTrue(remote.referral("x2")!!.claimed, "settled past the cap")
    }

    @Test
    fun `a row another device already claimed pays nothing here`() = runTest {
        remote.addReferral("x1", "owner", claimed = true)
        assertEquals(0L, repo.claimRewards(listOf(ReferralRow("x1", "", claimed = false))))
        assertEquals(0L, game.loadPendingCredits())
    }

    @Test
    fun `a failed reward filing keeps the link parked and the retry welcomes once`() = runTest {
        game.savePendingLink(DeepLink.Invite("OWNER2"))
        remote.failNextReferral = true

        assertEquals(JoinResult.NetworkError, repo.consumePendingInvite(newcomer))
        assertTrue(remote.areFriends("new", "owner"), "the friendship already stands")
        assertTrue(repo.hasPendingInvite())

        assertEquals(JoinResult.Connected(1, welcomeCredited = true), repo.consumePendingInvite(newcomer))
        assertEquals(RewardPolicy.INVITEE_REWARD, game.loadPendingCredits())
        assertFalse(repo.hasPendingInvite())
    }

    @Test
    fun `a claim that reached the server while offline is credited when the row comes back claimed`() = runTest {
        remote.addReferral("x1", "owner")
        remote.offline = true
        assertEquals(0L, repo.claimRewards(listOf(ReferralRow("x1", "", claimed = false))))
        assertEquals(mapOf("x1" to RewardPolicy.INVITER_REWARD), game.loadClaimIntents())

        // The SDK's queued write lands later; the next snapshot shows the row claimed.
        remote.offline = false
        assertEquals(RewardPolicy.INVITER_REWARD, repo.claimRewards(listOf(ReferralRow("x1", "", claimed = true))))
        assertEquals(0L, repo.claimRewards(listOf(ReferralRow("x1", "", claimed = true))), "credited once")
        assertEquals(RewardPolicy.INVITER_REWARD, game.loadPendingCredits())
    }
}
