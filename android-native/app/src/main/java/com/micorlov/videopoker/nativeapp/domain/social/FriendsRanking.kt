package com.micorlov.videopoker.nativeapp.domain.social

/** One line of the friends' table. [profit] is zero for a player who has not played today. */
data class RankRow(
    val rank: Int,
    val uid: String,
    val name: String,
    val profit: Long,
    val playedToday: Boolean,
    val isMe: Boolean,
)

/**
 * Orders the player and their friends by today's net profit. A score only counts when it was
 * written on today's UTC day; anything older is yesterday's and reads as "not played yet".
 */
object FriendsRanking {

    fun rank(me: FriendScore, friends: List<FriendScore>, today: String): List<RankRow> {
        val entries = (listOf(me) + friends.filter { it.uid != me.uid }).distinctBy { it.uid }
        return entries
            .map { score ->
                val todays = score.netProfit?.takeIf { score.dayKey == today }
                Unranked(score.uid, score.name, todays ?: 0L, todays != null, score.uid == me.uid)
            }
            .sortedWith(
                compareByDescending<Unranked> { it.profit }
                    .thenByDescending { it.playedToday }
                    .thenBy(String.CASE_INSENSITIVE_ORDER) { it.name },
            )
            .mapIndexed { index, row -> RankRow(index + 1, row.uid, row.name, row.profit, row.playedToday, row.isMe) }
    }

    private data class Unranked(val uid: String, val name: String, val profit: Long, val playedToday: Boolean, val isMe: Boolean)
}
