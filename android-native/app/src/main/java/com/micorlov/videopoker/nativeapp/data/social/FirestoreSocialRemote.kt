package com.micorlov.videopoker.nativeapp.data.social

import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.FirebaseFirestoreException
import com.google.firebase.firestore.SetOptions
import com.micorlov.videopoker.nativeapp.domain.DailyProfit
import com.micorlov.videopoker.nativeapp.domain.social.AuthUser
import com.micorlov.videopoker.nativeapp.domain.social.FriendScore
import com.micorlov.videopoker.nativeapp.domain.social.ReferralCode
import com.micorlov.videopoker.nativeapp.domain.social.ReferralRow
import com.micorlov.videopoker.nativeapp.domain.social.RewardPolicy
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.tasks.await

/**
 * Friends and invites on the web app's Firestore documents (firestore.rules). The native app
 * only adds fields of its own to `users/{uid}`: the UTC daily profit and its login stamps.
 * It never writes the web's local-day `dailyNetProfit` / `dailyDateKey`.
 */
class FirestoreSocialRemote(
    private val db: FirebaseFirestore = FirebaseFirestore.getInstance(),
    private val appVersion: String,
) : SocialRemote {

    private val users = db.collection("users")
    private val groups = db.collection("referralGroups")
    private val referrals = db.collection("referrals")
    private val listeners = FirestoreListeners(db)

    override suspend fun ensureProfile(user: AuthUser): String = remote {
        val ref = users.document(user.uid)
        val data = ref.get().await().data.orEmpty()
        val code = (data["referralCode"] as? String)?.takeIf { it.isNotBlank() } ?: uniqueCode()
        val updates = buildMap<String, Any> {
            put("uid", user.uid)
            put("lastLoginNative", FieldValue.serverTimestamp())
            put("appVersionNative", appVersion)
            put("referralCode", code)
            if ((data["displayName"] as? String).isNullOrBlank()) put("displayName", user.name)
            if (data["photoURL"] == null) put("photoURL", user.photoUrl.orEmpty())
            if (data["firstSeen"] == null) put("firstSeen", FieldValue.serverTimestamp())
        }
        ref.set(updates, SetOptions.merge()).await()
        // The owner opens the circle, as the rules only let a creator list themselves.
        val group = groups.document(code)
        if (!group.get().await().exists()) group.set(mapOf("members" to listOf(user.uid))).await()
        code
    }

    private suspend fun uniqueCode(): String {
        repeat(CODE_ATTEMPTS) {
            val code = ReferralCode.generate()
            if (findUidByCode(code) == null) return code
        }
        throw RemoteUnavailable(IllegalStateException("no free referral code"))
    }

    override suspend fun findUidByCode(code: String): String? = remote {
        users.whereEqualTo("referralCode", code).limit(1).get().await().documents.firstOrNull()?.id
    }

    override suspend fun groupMembers(code: String, ownerUid: String): List<String> = remote {
        @Suppress("UNCHECKED_CAST")
        val members = groups.document(code).get().await().get("members") as? List<String>
        members?.takeIf { it.isNotEmpty() } ?: listOf(ownerUid)
    }

    override suspend fun isFriend(uid: String, friendUid: String): Boolean = remote {
        users.document(uid).collection("friends").document(friendUid).get().await().exists()
    }

    override suspend fun connect(uid: String, friendUid: String, code: String) = remote {
        val edge = mapOf("addedAt" to FieldValue.serverTimestamp(), "viaCode" to code, "joinerUid" to uid)
        db.batch()
            .set(users.document(uid).collection("friends").document(friendUid), edge)
            .set(users.document(friendUid).collection("friends").document(uid), edge)
            .commit().await()
        Unit
    }

    /** arrayUnion appends server-side, so two players joining at once both land (the rules allow exactly one appended uid). */
    override suspend fun joinGroup(code: String, uid: String) = remote {
        groups.document(code).update("members", FieldValue.arrayUnion(uid)).await()
        Unit
    }

    override suspend fun createReferral(user: AuthUser, inviterUid: String, code: String): Boolean = remote {
        val row = referrals.document(user.uid)
        if (row.get().await().exists()) return@remote false
        row.set(
            mapOf(
                "referredUid" to user.uid,
                "referredName" to user.name,
                "inviterUid" to inviterUid,
                "code" to code,
                "provider" to "google.com",
                "rewardCoins" to RewardPolicy.INVITER_REWARD,
                "inviteeCoins" to RewardPolicy.INVITEE_REWARD,
                "claimedAt" to null,
                "createdAt" to FieldValue.serverTimestamp(),
                "source" to SOURCE,
            ),
        ).await()
        true
    }

    /** The rules refuse a second claim, so a refusal on a row that is now claimed means another device won. */
    override suspend fun claimReferral(rowId: String): Boolean = remote {
        val row = referrals.document(rowId)
        try {
            row.update("claimedAt", FieldValue.serverTimestamp()).await()
            true
        } catch (e: FirebaseFirestoreException) {
            if (e.code != FirebaseFirestoreException.Code.PERMISSION_DENIED) throw e
            if (row.get().await().get("claimedAt") != null) false else throw e
        }
    }

    override suspend fun pushDailyProfit(uid: String, profit: DailyProfit) = remote {
        val fields = mapOf(
            "dailyNetProfitUtc" to profit.net,
            "dailyUtcDayKey" to profit.dayKey,
            "dailyUtcUpdatedAt" to FieldValue.serverTimestamp(),
        )
        users.document(uid).set(fields, SetOptions.merge()).await()
        Unit
    }

    override suspend fun deleteUserData(uid: String) = remote {
        val own = users.document(uid)
        val friendIds = own.collection("friends").get().await().documents.map { it.id }
        // Each friendship is two documents: this player's and the friend's reciprocal edge.
        friendIds.chunked(FRIENDS_PER_BATCH).forEach { chunk ->
            val batch = db.batch()
            chunk.forEach { friendUid ->
                batch.delete(own.collection("friends").document(friendUid))
                batch.delete(users.document(friendUid).collection("friends").document(uid))
            }
            batch.commit().await()
        }
        val tokens = own.collection("fcmTokens").get().await().documents
        tokens.chunked(DELETES_PER_BATCH).forEach { chunk ->
            val batch = db.batch()
            chunk.forEach { batch.delete(it.reference) }
            batch.commit().await()
        }
        own.delete().await()
        Unit
    }

    override fun friendUids(uid: String): Flow<Set<String>> = listeners.friendUids(uid)

    override fun scores(uids: Set<String>): Flow<List<FriendScore>> = listeners.scores(uids)

    override fun referralsAsInviter(uid: String): Flow<List<ReferralRow>> = listeners.referralsAsInviter(uid)

    /** Any failure to complete a call is "server unreachable" to the callers: they retry later instead of crashing. */
    private suspend fun <T> remote(block: suspend () -> T): T = try {
        block()
    } catch (e: CancellationException) {
        throw e
    } catch (e: RemoteUnavailable) {
        throw e
    } catch (e: Exception) {
        throw RemoteUnavailable(e)
    }

    private companion object {
        const val CODE_ATTEMPTS = 5
        /** Firestore allows 500 writes per batch; a friendship takes two. */
        const val FRIENDS_PER_BATCH = 200
        const val DELETES_PER_BATCH = 400
        const val SOURCE = "android-native"
    }
}
