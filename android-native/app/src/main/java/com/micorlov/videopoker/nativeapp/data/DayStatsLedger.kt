package com.micorlov.videopoker.nativeapp.data

/**
 * Today's hands and net score, kept on the device until the admin board can store them.
 *
 * Hands count finished deals. Score is chips won minus chips staked, double-ups included,
 * the same net [com.micorlov.videopoker.nativeapp.domain.DailyProfit] already tracks.
 * Both are absolute totals: a retry of the same snapshot cannot add them twice.
 *
 * A player who already has a profit for [day] when this ledger first runs keeps that
 * score, and hands stay unknown — nothing on the device recorded how many deals produced
 * it. The next local day starts at zero with the count known. A day with nothing played
 * is not uploaded, so the board keeps showing a dash rather than a made-up zero.
 */
data class DayStatSnapshot(
    val day: String,
    val score: Long,
    /** Null when today's deals were not counted, so the board must not show a number. */
    val hands: Int?,
)

/** One absolute write of [DayStatSnapshot], already clamped to what the rules accept. */
data class DayStatWrite(
    val day: String,
    val score: Long,
    val hands: Int?,
)

class DayStatsLedger(private val store: KeyValueStore) {

    /** First run only. [playedToday] seeds [score] and leaves the hand count unknown. */
    fun seed(day: String, playedToday: Boolean, score: Long) {
        if (!DAY_KEY.matches(day) || stored() != null) return
        if (playedToday) save(DayStatSnapshot(day, score.coerceIn(-MAX_SCORE, MAX_SCORE), null))
        else save(DayStatSnapshot(day, 0L, 0))
    }

    fun record(day: String, scoreDelta: Long, hand: Boolean) {
        if (!DAY_KEY.matches(day)) return
        val current = stored()
        val base = when {
            current == null -> DayStatSnapshot(day, 0L, 0)
            current.day != day -> DayStatSnapshot(day, 0L, 0)
            else -> current
        }
        val hands = when {
            !hand -> base.hands
            base.hands == null -> null
            else -> (base.hands + 1).coerceAtMost(MAX_HANDS)
        }
        save(base.copy(day = day, score = (base.score + scoreDelta).coerceIn(-MAX_SCORE, MAX_SCORE), hands = hands))
    }

    /**
     * The next write, or null when there is nothing new to say.
     * A same-day hand count already on the server moves by at most [MAX_HAND_STEP];
     * the rest stays pending for the following write.
     */
    fun outbound(): DayStatWrite? {
        val current = stored() ?: return null
        if (current.hands != null && current.hands == 0 && current.score == 0L) return null
        val sent = sent()
        if (sent != null && sent.day == current.day && sent.score == current.score && sent.hands == current.hands) {
            return null
        }
        val sameDay = sent != null && sent.day == current.day
        val score = if (sent == null || !sameDay) current.score
        else current.score.coerceIn(sent.score - MAX_SCORE, sent.score + MAX_SCORE)
        val hands = current.hands?.let { raw ->
            val capped = raw.coerceIn(0, MAX_HANDS)
            if (sent == null || !sameDay || sent.hands == null) capped
            else capped.coerceAtMost(sent.hands + MAX_HAND_STEP)
        }
        val write = DayStatWrite(current.day, score, hands)
        if (sent != null && sent.day == write.day && sent.score == write.score && sent.hands == write.hands) return null
        return write
    }

    fun acknowledge(write: DayStatWrite) {
        store.write {
            putString(SENT_DAY, write.day)
            putLong(SENT_SCORE, write.score)
            putInt(SENT_HANDS, write.hands ?: OMITTED)
        }
    }

    private fun save(snapshot: DayStatSnapshot) {
        store.write {
            putString(DAY, snapshot.day)
            putLong(SCORE, snapshot.score)
            putInt(HANDS, snapshot.hands ?: OMITTED)
        }
    }

    private fun stored(): DayStatSnapshot? {
        val day = store.getString(DAY)?.takeIf { DAY_KEY.matches(it) } ?: return null
        return DayStatSnapshot(day, store.getLong(SCORE) ?: 0L, handsOf(store.getInt(HANDS)))
    }

    private fun sent(): DayStatWrite? {
        val day = store.getString(SENT_DAY)?.takeIf { DAY_KEY.matches(it) } ?: return null
        val score = store.getLong(SENT_SCORE) ?: return null
        return DayStatWrite(day, score, handsOf(store.getInt(SENT_HANDS)))
    }

    private fun handsOf(raw: Int?): Int? = if (raw == null || raw == OMITTED) null else raw

    companion object {
        const val MAX_HANDS = 100_000
        const val MAX_HAND_STEP = 5_000
        const val MAX_SCORE = 1_000_000_000_000L
        private const val OMITTED = -1
        private const val DAY = "daystats.day"
        private const val SCORE = "daystats.score"
        private const val HANDS = "daystats.hands"
        private const val SENT_DAY = "daystats.sentDay"
        private const val SENT_SCORE = "daystats.sentScore"
        private const val SENT_HANDS = "daystats.sentHands"
        private val DAY_KEY = Regex("""\d{4}-\d{2}-\d{2}""")
    }
}
