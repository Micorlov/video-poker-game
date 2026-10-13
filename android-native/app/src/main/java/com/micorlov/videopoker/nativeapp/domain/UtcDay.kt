package com.micorlov.videopoker.nativeapp.domain

import java.time.Instant
import java.time.ZoneOffset

/** Time left until the next UTC midnight, for the "resets in" countdown. */
data class ResetCountdown(val hours: Int, val minutes: Int)

/**
 * The friends' daily ranking runs on one global day that ends at UTC midnight, so every
 * player's "today" flips at the same moment wherever their phone is set.
 */
object UtcDay {
    private const val MS_PER_MINUTE = 60_000L
    private const val MINUTES_PER_HOUR = 60

    /** `yyyy-MM-dd` of [epochMs] in UTC. */
    fun key(epochMs: Long): String = Instant.ofEpochMilli(epochMs).atOffset(ZoneOffset.UTC).toLocalDate().toString()

    /** The epoch ms of the UTC midnight that ends the day containing [epochMs]. */
    fun nextMidnightMs(epochMs: Long): Long =
        Instant.ofEpochMilli(epochMs).atOffset(ZoneOffset.UTC).toLocalDate().plusDays(1)
            .atStartOfDay(ZoneOffset.UTC).toInstant().toEpochMilli()

    /** Minutes are rounded up, so the countdown never reads "0h 0m" while the day is still running. */
    fun untilReset(epochMs: Long): ResetCountdown {
        val left = nextMidnightMs(epochMs) - epochMs
        val minutes = ((left + MS_PER_MINUTE - 1) / MS_PER_MINUTE).toInt()
        return ResetCountdown(minutes / MINUTES_PER_HOUR, minutes % MINUTES_PER_HOUR)
    }
}
