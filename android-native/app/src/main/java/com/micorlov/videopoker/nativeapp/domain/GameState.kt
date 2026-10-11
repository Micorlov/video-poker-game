package com.micorlov.videopoker.nativeapp.domain

enum class Phase {
    /** Between hands: bet, variant and hand count can change; the next action is Deal. */
    BET,

    /** Cards are dealt: pick holds; the next action is Draw. */
    HOLD,
}

/** Totals shown on the Stats screen. [won] is gross winnings; [lost] is the stake of hands that paid nothing. */
data class PlayStats(
    val won: Long = 0,
    val lost: Long = 0,
    val handsPlayed: Int = 0,
    val bestStreak: Int = 0,
) {
    val net: Long get() = won - lost
}

/** Everything that survives closing the app. A hand in progress deliberately does not. */
data class SavedGame(
    val balance: Long = Rules.STARTING_BALANCE,
    val today: PlayStats = PlayStats(),
    val allTime: PlayStats = PlayStats(),
    val lossStreak: Int = 0,
    val winStreak: Int = 0,
    val bestBalance: Long = 0,
    val lifetimeHands: Int = 0,
    val variant: Variant = Variant.JACKS,
    val handCount: Int = 1,
)

/** One of the extra hands in Triple / Five Play. */
data class ExtraHand(val cards: List<Card>, val result: HandResult, val win: Int) {
    val type: HandType get() = result.type
}

/**
 * What the last draw produced. [baseWin] is every hand's payout before the win-streak
 * bonus; [totalWin] includes it. [multiplier] is the paytable multiple the main hand
 * was paid at, loss escalator included.
 */
data class DrawOutcome(
    val result: HandResult,
    val bestType: HandType,
    val extraHands: List<ExtraHand>,
    val baseWin: Int,
    val streakBonus: Int,
    val totalWin: Int,
    val totalBet: Int,
    val multiplier: Int,
) {
    val isWin: Boolean get() = totalWin > 0
}

/** The whole table. Immutable: every action returns a new copy. */
data class GameState(
    val phase: Phase,
    val variant: Variant,
    val handCount: Int,
    val bet: Int,
    val balance: Long,
    val hand: List<Card>,
    val dealtHand: List<Card>,
    val deck: List<Card>,
    val held: List<Boolean>,
    /** Loss escalator: every paying hand is worth this much more after each losing hand. */
    val payoutBonus: Int,
    val lossStreak: Int,
    val winStreak: Int,
    val bestBalance: Long,
    val lifetimeHands: Int,
    val today: PlayStats,
    val allTime: PlayStats,
    val outcome: DrawOutcome?,
    /** Bumped on every deal and draw so the UI knows when to animate. */
    val round: Int,
) {
    val level: Int get() = Rules.level(lifetimeHands)
    val totalBet: Int get() = bet * handCount

    /** The multiple of the bet [type] pays right now. */
    fun payoutFor(type: HandType): Int =
        if (type == HandType.NOTHING) 0 else variant.basePayout(type) + payoutBonus

    /**
     * The snapshot to persist. A hand in progress is not saved, as in the web app: the
     * stake already taken for it goes back into the saved balance, so quitting mid-hand
     * never costs chips.
     */
    fun toSaved(): SavedGame = SavedGame(
        balance = if (phase == Phase.HOLD) balance + totalBet else balance,
        today = today,
        allTime = allTime,
        lossStreak = lossStreak,
        winStreak = winStreak,
        bestBalance = bestBalance,
        lifetimeHands = lifetimeHands,
        variant = variant,
        handCount = handCount,
    )
}
