package com.micorlov.videopoker.nativeapp.data.social

import com.micorlov.videopoker.nativeapp.domain.DailyProfit
import com.micorlov.videopoker.nativeapp.domain.social.AuthUser
import com.micorlov.videopoker.nativeapp.domain.social.FriendScore
import com.micorlov.videopoker.nativeapp.domain.social.ReferralRow
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.emptyFlow

/** Stands in when the build has no Firebase configuration: never signed in, every call unreachable. */
object UnavailableAuth : AuthGateway {
    override val available = false
    override val user: StateFlow<AuthUser?> = MutableStateFlow(null)
    override suspend fun signIn(host: SignInHost): Result<AuthUser> = Result.failure(RemoteUnavailable())
    override fun signOut() = Unit
    override suspend fun deleteAccount(host: SignInHost): Result<Unit> = Result.failure(RemoteUnavailable())
}

object UnavailableRemote : SocialRemote {
    private fun down(): Nothing = throw RemoteUnavailable()
    override suspend fun ensureProfile(user: AuthUser): String = down()
    override suspend fun findUidByCode(code: String): String? = down()
    override suspend fun groupMembers(code: String, ownerUid: String): List<String> = down()
    override suspend fun isFriend(uid: String, friendUid: String): Boolean = down()
    override suspend fun connect(uid: String, friendUid: String, code: String) = down()
    override suspend fun joinGroup(code: String, uid: String) = down()
    override suspend fun createReferral(user: AuthUser, inviterUid: String, code: String): Boolean = down()
    override suspend fun claimReferral(rowId: String): Boolean = down()
    override suspend fun pushDailyProfit(uid: String, profit: DailyProfit) = down()
    override suspend fun linkInstall(uid: String, installId: String) = down()
    override suspend fun deleteUserData(uid: String) = down()
    override fun friendUids(uid: String): Flow<Set<String>> = emptyFlow()
    override fun scores(uids: Set<String>): Flow<List<FriendScore>> = emptyFlow()
    override fun referralsAsInviter(uid: String): Flow<List<ReferralRow>> = emptyFlow()
}
