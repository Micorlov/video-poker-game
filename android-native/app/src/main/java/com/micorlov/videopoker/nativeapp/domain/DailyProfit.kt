package com.micorlov.videopoker.nativeapp.domain

/** Chips won minus chips staked on the UTC day [dayKey]. Gifts (bonus, rebuy, referral credits) are not play and never count. */
data class DailyProfit(val dayKey: String, val net: Long) {
    /** The net for [today], or null when this record belongs to an earlier day. */
    fun valueOn(today: String): Long? = net.takeIf { dayKey == today }

    companion object {
        val NONE = DailyProfit(dayKey = "", net = 0)
    }
}

object DailyProfitPolicy {
    /** Adds [delta] to [current], starting again from zero when [today] is a new UTC day. */
    fun record(current: DailyProfit, today: String, delta: Long): DailyProfit {
        val base = current.valueOn(today) ?: 0L
        return DailyProfit(today, base + delta)
    }

    /** A drawn hand's result: every payout (streak bonus included) minus everything staked on it, ALL IN raises included. */
    fun handDelta(outcome: DrawOutcome): Long = outcome.totalWin.toLong() - outcome.totalBet

    /** A settled double-up wins or loses its stake; a push or an unsettled pick changes nothing. */
    fun doubleUpDelta(doubleUp: DoubleUp): Long = when (doubleUp.result) {
        DoubleUpResult.WIN -> doubleUp.stake
        DoubleUpResult.LOSE -> -doubleUp.stake
        DoubleUpResult.PUSH, null -> 0
    }
}
