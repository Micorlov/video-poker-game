package com.micorlov.videopoker.nativeapp.domain.social

/** The signed-in player. [createdAtMs] is when the account was first created, for the referral freshness check. */
data class AuthUser(
    val uid: String,
    val name: String,
    val photoUrl: String?,
    val createdAtMs: Long,
)

/** What a friend's profile says about today. [dayKey] is the UTC day the [netProfit] belongs to. */
data class FriendScore(
    val uid: String,
    val name: String,
    val netProfit: Long?,
    val dayKey: String?,
)

/** One referral ledger row this player is the inviter on. */
data class ReferralRow(val id: String, val referredName: String, val claimed: Boolean)

/** How joining a friend's code ended. */
sealed interface JoinResult {
    /** Now friends with [count] players (the code's owner and everyone who joined through it before). */
    data class Connected(val count: Int, val welcomeCredited: Boolean) : JoinResult
    data object OwnCode : JoinResult
    data object NoSuchCode : JoinResult
    data object AlreadyConnected : JoinResult

    /** Could not reach the server: a parked invite stays parked for the next try. */
    data object NetworkError : JoinResult
}
