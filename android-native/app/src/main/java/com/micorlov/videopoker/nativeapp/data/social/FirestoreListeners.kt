package com.micorlov.videopoker.nativeapp.data.social

import com.google.firebase.firestore.DocumentSnapshot
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import com.micorlov.videopoker.nativeapp.domain.social.FriendScore
import com.micorlov.videopoker.nativeapp.domain.social.ReferralRow
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.flowOf

/** Live Firestore reads. A listener error closes the flow; callers fall back to what they last showed. */
internal class FirestoreListeners(private val db: FirebaseFirestore) {

    private val users = db.collection("users")

    fun friendUids(uid: String): Flow<Set<String>> = listen { emit ->
        users.document(uid).collection("friends").addSnapshotListener { snap, error ->
            emit(snap?.documents?.map { it.id }?.toSet(), error)
        }
    }

    /** One listener per friend's profile, so each score updates the moment that friend plays. */
    fun scores(uids: Set<String>): Flow<List<FriendScore>> {
        if (uids.isEmpty()) return flowOf(emptyList())
        val perFriend = uids.sorted().map { uid ->
            listen<FriendScore> { emit ->
                users.document(uid).addSnapshotListener { snap, error -> emit(snap?.let { score(uid, it) }, error) }
            }
        }
        return combine(perFriend) { it.toList() }
    }

    fun referralsAsInviter(uid: String): Flow<List<ReferralRow>> = listen { emit ->
        db.collection("referrals").whereEqualTo("inviterUid", uid).addSnapshotListener { snap, error ->
            emit(
                snap?.documents?.map { ReferralRow(it.id, it.getString("referredName").orEmpty(), it.get("claimedAt") != null) },
                error,
            )
        }
    }

    private fun score(uid: String, doc: DocumentSnapshot) = FriendScore(
        uid = uid,
        name = doc.getString("displayName")?.takeIf { it.isNotBlank() } ?: DEFAULT_NAME,
        netProfit = (doc.get("dailyNetProfitUtc") as? Number)?.toLong(),
        dayKey = doc.getString("dailyUtcDayKey"),
    )

    private fun <T> listen(register: ((T?, Exception?) -> Unit) -> ListenerRegistration): Flow<T> = callbackFlow {
        val registration = register { value, error ->
            when {
                error != null -> close(RemoteUnavailable(error))
                value != null -> trySend(value)
            }
        }
        awaitClose { registration.remove() }
    }

    private companion object {
        const val DEFAULT_NAME = "Player"
    }
}
