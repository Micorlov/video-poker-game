package com.micorlov.videopoker.nativeapp.data.social

import com.micorlov.videopoker.nativeapp.domain.DailyProfit
import com.micorlov.videopoker.nativeapp.domain.social.AuthUser
import com.micorlov.videopoker.nativeapp.domain.social.FriendScore
import com.micorlov.videopoker.nativeapp.domain.social.ReferralRow
import kotlinx.coroutines.flow.Flow

/** Thrown for a failure to reach the server, as opposed to a definite answer. */
class RemoteUnavailable(cause: Throwable? = null) : Exception(cause)

/**
 * The cloud side of friends and invites (Firestore in the app, a fake in tests). Every
 * suspending call throws [RemoteUnavailable] when the server cannot be reached.
 */
interface SocialRemote {
    /** Creates or refreshes the player's profile and returns their invite code (an existing web code is kept). */
    suspend fun ensureProfile(user: AuthUser): String

    suspend fun findUidByCode(code: String): String?

    /** Everyone already connected through [code], its owner first. */
    suspend fun groupMembers(code: String, ownerUid: String): List<String>

    suspend fun isFriend(uid: String, friendUid: String): Boolean

    /** Writes both sides of the friendship. */
    suspend fun connect(uid: String, friendUid: String, code: String)

    /** Adds [uid] to [code]'s circle, if the circle exists. */
    suspend fun joinGroup(code: String, uid: String)

    /** Files the invite reward row; false when this player already has one. */
    suspend fun createReferral(user: AuthUser, inviterUid: String, code: String): Boolean

    /** Stamps a row claimed; false when another device got there first. */
    suspend fun claimReferral(rowId: String): Boolean

    suspend fun pushDailyProfit(uid: String, profit: DailyProfit)

    /**
     * Erases everything the security rules let this player remove: their profile, both sides of
     * every friendship and their device tokens. Safe to repeat. The invite-reward ledger and the
     * invite circle are append-only, so those entries stay.
     */
    suspend fun deleteUserData(uid: String)

    fun friendUids(uid: String): Flow<Set<String>>

    fun scores(uids: Set<String>): Flow<List<FriendScore>>

    fun referralsAsInviter(uid: String): Flow<List<ReferralRow>>
}
