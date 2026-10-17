package com.micorlov.videopoker.nativeapp.domain

/**
 * Four bet chips on a 1-2-5 series. At a 1,000-chip start the row is 5, 10, 20, 50
 * (half a percent through five percent of the stack). As the stack grows, the same
 * four-wide window slides up that series so the top chip stays near five percent.
 *
 * The window moves only when [advance] is called between hands. Sliding up follows
 * the five-percent line. Sliding down waits until the current top is more than
 * eight percent of the stack, so one win and one loss around a boundary cannot
 * reshuffle the labels. The selected stake is never changed here.
 */
object StakeLadder {
    /** 1, 2, 5, 10… starting at the minimum bet. The last step stays under the all-in cap. */
    val SERIES: List<Int> = listOf(
        5, 10, 20, 50,
        100, 200, 500,
        1_000, 2_000, 5_000,
        10_000, 20_000, 50_000,
        100_000, 200_000, 500_000,
    )

    private const val WINDOW = 4
    private const val PERCENT = 100
    private const val TARGET_PERCENT = 5
    private const val SLIDE_DOWN_PERCENT = 8

    /** Largest chip a regular button may show. All-in remains the way to stake [Rules.ALL_IN_MAX_BET]. */
    const val MAX_REGULAR_BET = 500_000

    /** The row a player should see for [balance] with no memory of the previous row. */
    fun ideal(balance: Long): List<Int> {
        val fivePercent = if (balance <= 0L) 0L else balance * TARGET_PERCENT / PERCENT
        val ceiling = fivePercent
            .coerceAtLeast(SERIES[WINDOW - 1].toLong())
            .coerceAtMost(MAX_REGULAR_BET.toLong())
        return window(SERIES.last { it.toLong() <= ceiling })
    }

    /**
     * The next row after a hand. A higher band is taken as soon as its top chip is
     * within five percent. A lower band waits until the chip on screen is past eight percent.
     */
    fun advance(current: List<Int>, balance: Long, bet: Int = 0): List<Int> {
        val currentTop = current.lastOrNull()?.takeIf { it in SERIES } ?: return covering(ideal(balance), balance, bet)
        val idealWindow = ideal(balance)
        val idealTop = idealWindow.last()
        val proposed = if (idealTop >= currentTop) {
            idealWindow
        } else {
            val stillComfortable = currentTop.toLong() * PERCENT <= balance * SLIDE_DOWN_PERCENT
            if (stillComfortable) window(currentTop) else idealWindow
        }
        // A chip the player is still using, and can still pay for, stays on the row.
        return covering(proposed, balance, bet)
    }

    /** Keeps [bet] on the row when it is a real chip the stack can still cover for one hand. */
    private fun covering(proposed: List<Int>, balance: Long, bet: Int): List<Int> {
        if (bet !in SERIES || bet <= proposed.last()) return proposed
        if (!affordable(bet, 1, balance)) return proposed
        return window(bet)
    }

    /** True when [amount] on each of [handCount] hands still fits in [balance]. */
    fun affordable(amount: Int, handCount: Int, balance: Long): Boolean =
        amount > 0 && handCount > 0 && amount.toLong() * handCount <= balance

    private fun window(top: Int): List<Int> {
        val end = SERIES.indexOf(top).coerceAtLeast(WINDOW - 1)
        return SERIES.subList(end - (WINDOW - 1), end + 1)
    }
}
