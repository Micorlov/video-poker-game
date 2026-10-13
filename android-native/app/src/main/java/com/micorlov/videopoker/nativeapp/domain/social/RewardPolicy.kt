package com.micorlov.videopoker.nativeapp.domain.social

/** A ledger row to stamp as claimed, and the chips it is worth to the inviter (zero once the cap is reached). */
data class Claim(val rowId: String, val credit: Long)

/**
 * The two-sided invite reward. A brand-new account that joins through a link gets
 * [INVITEE_REWARD]; its inviter gets [INVITER_REWARD] for each of their first [INVITER_CAP]
 * joins. "Brand new" is the web app's test: created within [SIGNUP_WINDOW_MS], so an old
 * account cannot farm chips by tapping a friend's link.
 */
object RewardPolicy {
    const val INVITEE_REWARD = 1_000L
    const val INVITER_REWARD = 1_000L
    const val INVITER_CAP = 10
    const val SIGNUP_WINDOW_MS = 10 * 60 * 1000L

    fun inviteeEligible(me: AuthUser, inviterUid: String, nowMs: Long): Boolean =
        inviterUid != me.uid && me.createdAtMs > 0 && nowMs - me.createdAtMs in 0 until SIGNUP_WINDOW_MS

    /**
     * Unclaimed rows to settle, in a stable order. A row this device already decided on keeps the
     * amount in [intents], so a claim retried after a restart is never re-priced. Rows past the
     * cap are still claimed, for nothing, so they are settled for good rather than paying out later.
     */
    fun claims(rows: List<ReferralRow>, intents: Map<String, Long> = emptyMap()): List<Claim> {
        val open = rows.filterNot { it.claimed }
        val (decided, fresh) = open.partition { it.id in intents }
        var paid = rows.count { it.claimed } + decided.count { (intents[it.id] ?: 0L) > 0 }
        val retried = decided.sortedBy { it.id }.map { Claim(it.id, intents.getValue(it.id)) }
        val added = fresh.sortedBy { it.id }.map { row ->
            val credit = if (paid < INVITER_CAP) INVITER_REWARD else 0L
            if (credit > 0) paid++
            Claim(row.id, credit)
        }
        return retried + added
    }

    /** How many of the capped rewards this inviter has earned. */
    fun earned(rows: List<ReferralRow>): Int = rows.count { it.claimed }.coerceAtMost(INVITER_CAP)
}
