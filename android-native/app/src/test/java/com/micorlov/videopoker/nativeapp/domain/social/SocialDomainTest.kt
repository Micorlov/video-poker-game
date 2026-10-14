package com.micorlov.videopoker.nativeapp.domain.social

import com.micorlov.videopoker.nativeapp.domain.DeepLink
import java.net.URI
import kotlin.random.Random
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

class ReferralCodeTest {
    @Test
    fun `generated codes use the unambiguous alphabet`() {
        repeat(200) {
            val code = ReferralCode.generate(Random(it))
            assertEquals(ReferralCode.LENGTH, code.length)
            assertEquals(code, ReferralCode.normalize(code))
        }
    }

    @Test
    fun `typed codes are trimmed and upper-cased, bad ones rejected`() {
        assertEquals("AB23CD", ReferralCode.normalize("  ab23cd "))
        assertNull(ReferralCode.normalize("AB23C"))
        assertNull(ReferralCode.normalize("AB23C0"), "zero is not in the alphabet")
        assertNull(ReferralCode.normalize("AB 3CD"))
    }
}

class InviteLinkTest {
    @Test
    fun `the link opens the Play listing and carries the code in the install referrer`() {
        val link = InviteLink.forCode("AB23CD")
        assertEquals(
            "https://play.google.com/store/apps/details?id=com.micorlov.videopoker&referrer=ref%3DAB23CD",
            link,
        )
        val referrer = URI(link).query.substringAfter("referrer=")
        assertEquals(DeepLink.Invite("AB23CD"), DeepLink.fromReferrer(referrer))
    }
}

class FriendsRankingTest {
    private val today = "2026-10-13"

    @Test
    fun `players are ranked by today's profit with the player included`() {
        val rows = FriendsRanking.rank(
            me = FriendScore("me", "Me", 50, today),
            friends = listOf(FriendScore("a", "Ann", 200, today), FriendScore("b", "Bob", -30, today)),
            today = today,
        )
        assertEquals(listOf("a", "me", "b"), rows.map { it.uid })
        assertEquals(listOf(1, 2, 3), rows.map { it.rank })
        assertTrue(rows[1].isMe)
    }

    @Test
    fun `yesterday's score reads as not played and zero`() {
        val rows = FriendsRanking.rank(
            me = FriendScore("me", "Me", null, today),
            friends = listOf(FriendScore("a", "Ann", 900, "2026-10-12"), FriendScore("b", "Bob", null, null)),
            today = today,
        )
        assertTrue(rows.none { it.playedToday })
        assertTrue(rows.all { it.profit == 0L })
    }

    @Test
    fun `at equal profit a player who played comes first, then names in order`() {
        val rows = FriendsRanking.rank(
            me = FriendScore("me", "zed", null, today),
            friends = listOf(FriendScore("b", "bob", null, null), FriendScore("a", "Ann", 0, today)),
            today = today,
        )
        assertEquals(listOf("a", "b", "me"), rows.map { it.uid })
    }

    @Test
    fun `the player is never listed twice`() {
        val rows = FriendsRanking.rank(FriendScore("me", "Me", 5, today), listOf(FriendScore("me", "Me", 1, today)), today)
        assertEquals(1, rows.size)
        assertEquals(5L, rows.single().profit)
    }
}

class RewardPolicyTest {
    private val now = 1_000_000_000L
    private fun user(ageMs: Long) = AuthUser("me", "Me", null, createdAtMs = now - ageMs)
    private fun rows(claimed: Int, open: Int) =
        List(claimed) { ReferralRow("c$it", "x", true) } + List(open) { ReferralRow("o${it.toString().padStart(2, '0')}", "x", false) }

    @Test
    fun `only a brand new account that did not invite itself gets the welcome`() {
        assertTrue(RewardPolicy.inviteeEligible(user(ageMs = 60_000), "friend", now))
        assertFalse(RewardPolicy.inviteeEligible(user(ageMs = RewardPolicy.SIGNUP_WINDOW_MS), "friend", now))
        assertFalse(RewardPolicy.inviteeEligible(user(ageMs = 60_000), "me", now))
        assertFalse(RewardPolicy.inviteeEligible(AuthUser("me", "Me", null, 0), "friend", now))
    }

    @Test
    fun `every open row pays while under the cap`() {
        val claims = RewardPolicy.claims(rows(claimed = 0, open = 3))
        assertEquals(3, claims.size)
        assertTrue(claims.all { it.credit == RewardPolicy.INVITER_REWARD })
    }

    @Test
    fun `the tenth reward pays and the eleventh is settled for nothing`() {
        val claims = RewardPolicy.claims(rows(claimed = 9, open = 2))
        assertEquals(listOf(RewardPolicy.INVITER_REWARD, 0L), claims.map { it.credit })
        assertEquals(9, RewardPolicy.earned(rows(claimed = 9, open = 2)))
    }

    @Test
    fun `a retried claim keeps the amount it was given and counts towards the cap`() {
        val rows = rows(claimed = 8, open = 3)
        val intents = mapOf("o02" to RewardPolicy.INVITER_REWARD, "o01" to RewardPolicy.INVITER_REWARD)
        val claims = RewardPolicy.claims(rows, intents)
        assertEquals(listOf("o01", "o02", "o00"), claims.map { it.rowId })
        assertEquals(listOf(RewardPolicy.INVITER_REWARD, RewardPolicy.INVITER_REWARD, 0L), claims.map { it.credit })
    }

    @Test
    fun `nothing pays once ten have been claimed`() {
        assertTrue(RewardPolicy.claims(rows(claimed = 10, open = 4)).all { it.credit == 0L })
        assertEquals(10, RewardPolicy.earned(rows(claimed = 12, open = 0)))
    }
}
