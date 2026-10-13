package com.micorlov.videopoker.nativeapp.data.social

import com.micorlov.videopoker.nativeapp.domain.DailyProfit
import com.micorlov.videopoker.nativeapp.domain.social.AuthUser
import com.micorlov.videopoker.nativeapp.domain.social.FriendScore
import com.micorlov.videopoker.nativeapp.domain.social.ReferralCode
import com.micorlov.videopoker.nativeapp.domain.social.ReferralRow
import kotlin.random.Random
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.map

object TestHost : SignInHost

class FakeAuthGateway(
    override val available: Boolean = true,
    var next: Result<AuthUser>? = null,
) : AuthGateway {
    private val _user = MutableStateFlow<AuthUser?>(null)
    override val user: StateFlow<AuthUser?> = _user.asStateFlow()

    override suspend fun signIn(host: SignInHost): Result<AuthUser> {
        val result = next ?: Result.failure(IllegalStateException("cancelled"))
        result.onSuccess { _user.value = it }
        return result
    }

    override fun signOut() { _user.value = null }

    fun setUser(user: AuthUser?) { _user.value = user }
}

/** An in-memory Firestore stand-in with the same shapes the app writes. */
class FakeSocialRemote : SocialRemote {
    var offline = false
    val codes = mutableMapOf<String, String>()                   // uid -> referral code
    val names = mutableMapOf<String, String>()
    val groups = mutableMapOf<String, List<String>>()            // code -> members
    private val edges = MutableStateFlow<Set<Pair<String, String>>>(emptySet())
    private val profits = MutableStateFlow<Map<String, DailyProfit>>(emptyMap())
    private val referrals = MutableStateFlow<Map<String, Referral>>(emptyMap())
    val pushes = mutableListOf<Pair<String, DailyProfit>>()

    data class Referral(val inviterUid: String, val name: String, val claimed: Boolean)

    private fun online() { if (offline) throw RemoteUnavailable() }

    fun referral(uid: String) = referrals.value[uid]
    fun addReferral(referredUid: String, inviterUid: String, claimed: Boolean = false) {
        referrals.value = referrals.value + (referredUid to Referral(inviterUid, referredUid, claimed))
    }
    fun setProfit(uid: String, profit: DailyProfit) { profits.value = profits.value + (uid to profit) }
    fun areFriends(a: String, b: String) = (a to b) in edges.value && (b to a) in edges.value

    override suspend fun ensureProfile(user: AuthUser): String {
        online()
        names[user.uid] = user.name
        return codes.getOrPut(user.uid) { ReferralCode.generate(Random(codes.size)) }
    }

    override suspend fun findUidByCode(code: String): String? { online(); return codes.entries.firstOrNull { it.value == code }?.key }

    override suspend fun groupMembers(code: String, ownerUid: String): List<String> { online(); return groups[code] ?: listOf(ownerUid) }

    override suspend fun isFriend(uid: String, friendUid: String): Boolean { online(); return (uid to friendUid) in edges.value }

    override suspend fun connect(uid: String, friendUid: String, code: String) {
        online()
        edges.value = edges.value + (uid to friendUid) + (friendUid to uid)
    }

    override suspend fun joinGroup(code: String, uid: String) {
        online()
        groups[code]?.let { if (uid !in it) groups[code] = it + uid }
    }

    /** Fails the next reward filing, as a dropped connection would. */
    var failNextReferral = false

    override suspend fun createReferral(user: AuthUser, inviterUid: String, code: String): Boolean {
        online()
        if (failNextReferral) { failNextReferral = false; throw RemoteUnavailable() }
        if (user.uid in referrals.value) return false
        referrals.value = referrals.value + (user.uid to Referral(inviterUid, user.name, false))
        return true
    }

    override suspend fun claimReferral(rowId: String): Boolean {
        online()
        val row = referrals.value[rowId] ?: return false
        if (row.claimed) return false
        referrals.value = referrals.value + (rowId to row.copy(claimed = true))
        return true
    }

    override suspend fun pushDailyProfit(uid: String, profit: DailyProfit) {
        online()
        pushes += uid to profit
        setProfit(uid, profit)
    }

    override fun friendUids(uid: String): Flow<Set<String>> =
        edges.map { all -> all.filter { it.first == uid }.map { it.second }.toSet() }

    override fun scores(uids: Set<String>): Flow<List<FriendScore>> = profits.map { all ->
        uids.map { FriendScore(it, names[it] ?: it, all[it]?.net, all[it]?.dayKey) }
    }

    override fun referralsAsInviter(uid: String): Flow<List<ReferralRow>> = referrals.map { all ->
        all.filter { it.value.inviterUid == uid }.map { ReferralRow(it.key, it.value.name, it.value.claimed) }
    }
}
