package com.micorlov.videopoker.nativeapp.data.social

import com.micorlov.videopoker.nativeapp.data.GameRepository
import com.micorlov.videopoker.nativeapp.domain.DeepLink
import com.micorlov.videopoker.nativeapp.domain.social.AuthUser
import com.micorlov.videopoker.nativeapp.domain.social.JoinResult
import com.micorlov.videopoker.nativeapp.domain.social.ReferralRow
import com.micorlov.videopoker.nativeapp.domain.social.RewardPolicy
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/** Chips the friends feature added to the player's pending credits, for the game to pick up and announce. */
sealed interface CreditNotice {
    data class Welcome(val amount: Long) : CreditNotice
    data class InvitesRewarded(val count: Int, val amount: Long) : CreditNotice
}

/**
 * Joining friends through invite codes and settling the invite rewards. Chips never go to the
 * balance directly: they are parked as pending credits (which survive a crash) and the game
 * adds them to the stack, so the two never overwrite each other's balance.
 */
class FriendsRepository(
    private val remote: SocialRemote,
    private val game: GameRepository,
    private val clock: () -> Long = System::currentTimeMillis,
) {
    private val _credits = MutableSharedFlow<CreditNotice>(extraBufferCapacity = CREDIT_BUFFER)
    val credits: SharedFlow<CreditNotice> = _credits.asSharedFlow()

    /** One join or claim pass at a time: a link arriving mid sign-in must not join twice. */
    private val joinLock = Mutex()
    private val claimLock = Mutex()

    /** True while a link's code is waiting for the player to sign in. */
    fun hasPendingInvite(): Boolean = game.loadPendingLink() is DeepLink.Invite

    /** Joins the code a link parked, if any. A network failure keeps it for the next try; any answer spends it. */
    suspend fun consumePendingInvite(user: AuthUser): JoinResult? = joinLock.withLock {
        val invite = game.loadPendingLink() as? DeepLink.Invite ?: return null
        val result = joinOrNetworkError(user, invite.code)
        if (result != JoinResult.NetworkError) game.clearPendingLink()
        result
    }

    /**
     * Becomes friends with [code]'s owner and everyone who joined through it before (the web's
     * referral circle), then files the invite reward when this account is brand new.
     */
    suspend fun join(user: AuthUser, code: String): JoinResult = joinLock.withLock { joinOrNetworkError(user, code) }

    private suspend fun joinOrNetworkError(user: AuthUser, code: String): JoinResult = try {
        joinOrThrow(user, code)
    } catch (e: RemoteUnavailable) {
        JoinResult.NetworkError
    }

    /**
     * Safe to repeat: friendships already made are skipped, and the reward row is filed at most
     * once. A failure to file it surfaces as a network error, so a parked link stays parked and
     * the reward is retried while the account is still new enough to earn it.
     */
    private suspend fun joinOrThrow(user: AuthUser, code: String): JoinResult {
        val ownerUid = remote.findUidByCode(code) ?: return JoinResult.NoSuchCode
        if (ownerUid == user.uid) return JoinResult.OwnCode
        val members = remote.groupMembers(code, ownerUid)
        val newFriends = members.filter { it != user.uid && !remote.isFriend(user.uid, it) }
        newFriends.forEach { remote.connect(user.uid, it, code) }
        // The circle is an extra: the friendships above already stand if it cannot be joined.
        if (user.uid !in members) {
            try {
                remote.joinGroup(code, user.uid)
            } catch (e: RemoteUnavailable) {
                // The next joiner simply will not see this player in the circle.
            }
        }
        val welcomed = fileReward(user, ownerUid, code)
        return when {
            newFriends.isNotEmpty() -> JoinResult.Connected(newFriends.size, welcomed)
            welcomed -> JoinResult.Connected(1, welcomeCredited = true)
            else -> JoinResult.AlreadyConnected
        }
    }

    private suspend fun fileReward(user: AuthUser, inviterUid: String, code: String): Boolean {
        if (!RewardPolicy.inviteeEligible(user, inviterUid, clock())) return false
        if (!remote.createReferral(user, inviterUid, code)) return false
        game.addPendingCredit(RewardPolicy.INVITEE_REWARD)
        _credits.tryEmit(CreditNotice.Welcome(RewardPolicy.INVITEE_REWARD))
        return true
    }

    /**
     * Settles what the inviter's ledger owes, up to the cap. Each claim is noted locally before it
     * is sent, so a claim that only reaches the server after the app was killed is still credited
     * when the row comes back claimed. Returns the chips credited by this pass.
     */
    suspend fun claimRewards(rows: List<ReferralRow>): Long = claimLock.withLock {
        val intents = game.loadClaimIntents()
        val landed = rows.filter { it.claimed && it.id in intents }.map { it.id to intents.getValue(it.id) }
        val sent = RewardPolicy.claims(rows, intents).mapNotNull { claim ->
            game.saveClaimIntent(claim.rowId, claim.credit)
            val accepted = try {
                remote.claimReferral(claim.rowId)
            } catch (e: RemoteUnavailable) {
                false
            }
            (claim.rowId to claim.credit).takeIf { accepted }
        }
        val paid = (landed + sent).filter { (id, credit) -> credit > 0 && game.creditClaim(id, credit) }
        val total = paid.sumOf { it.second }
        if (total > 0) _credits.tryEmit(CreditNotice.InvitesRewarded(paid.size, total))
        total
    }

    private companion object {
        const val CREDIT_BUFFER = 8
    }
}
