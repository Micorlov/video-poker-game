package com.micorlov.videopoker.nativeapp.domain

enum class Phase {
    /** Between hands: bet, variant and hand count can change; the next action is Deal. */
    BET,

    /** Cards are dealt: pick holds; the next action is Draw. */
    HOLD,

    /** A win is riding on a double-up: the dealer's card is up and the player picks one of four. */
    DOUBLE_UP,
}

/**
 * Totals shown on the Stats screen. [won] is gross winnings; [lost] is the stake of hands that
 * paid nothing (and of double-ups that lost). [reviewed] counts hands whose holds were checked
 * against the best play, [bestPlays] how many of those matched it, and [mistakeCost] the chips
 * the rest gave up on average.
 */
data class PlayStats(
    val won: Long = 0,
    val lost: Long = 0,
    val handsPlayed: Int = 0,
    val bestStreak: Int = 0,
    val reviewed: Int = 0,
    val bestPlays: Int = 0,
    val mistakeCost: Double = 0.0,
) {
    val net: Long get() = won - lost

    /** Share of reviewed hands played perfectly, 0..1; null until a hand has been reviewed. */
    val accuracy: Double? get() = if (reviewed == 0) null else bestPlays.toDouble() / reviewed
}

/** The highest-paying hand ever won (js/stories.js "personal best"): [multiple] is the payout over the bet. */
data class BestHand(val type: HandType, val multiple: Int, val payout: Int, val cards: List<Card>)

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
    val bestHand: BestHand? = null,
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

enum class DoubleUpResult { WIN, PUSH, LOSE }

/**
 * One double-up: [stake] rides on the player's card beating the [dealer]'s. [number] counts the
 * doubles in this run (1 for the first). [picked] and [result] are set once a card is chosen.
 */
data class DoubleUp(
    val stake: Long,
    val dealer: Card,
    val choices: List<Card>,
    val number: Int,
    val picked: Int? = null,
    val result: DoubleUpResult? = null,
) {
    /** What the result put back on the stack: double the stake on a win, the stake on a push. */
    val returned: Long get() = when (result) {
        DoubleUpResult.WIN -> stake * 2
        DoubleUpResult.PUSH -> stake
        DoubleUpResult.LOSE, null -> 0
    }
}

/** What an ALL IN would stake: [perHand] on each hand, [stake] in all, and the Full House payout it would chase. */
data class AllInOffer(val perHand: Int, val stake: Long, val potential: Long, val midHand: Boolean)

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
    /** The bet in effect before ALL IN raised it; restored when the hand is done. Null when no ALL IN is active. */
    val allInRevertBet: Int? = null,
    val bestHand: BestHand? = null,
    /** The double-up in progress or just settled; cleared by the next deal. */
    val doubleUp: DoubleUp? = null,
    /**
     * The four bet chips on screen. Set from the stack when the table is created, then
     * moved only between hands. Copying the state keeps the row still during a hand.
     */
    val stakeOptions: List<Int> = StakeLadder.ideal(balance),
) {
    val level: Int get() = Rules.level(lifetimeHands)
    val totalBet: Int get() = bet * handCount
    val isAllIn: Boolean get() = allInRevertBet != null

    /**
     * What a double-up would put at risk right now, or null when none is on offer: the last
     * hand's win, then double that after each won double-up (the same stake again after a push).
     */
    val doubleUpStake: Long?
        get() {
            if (phase != Phase.BET) return null
            val current = doubleUp ?: return outcome?.totalWin?.takeIf { it > 0 }?.toLong()
            if (current.number >= Rules.MAX_DOUBLE_UPS) return null
            return when (current.result) {
                DoubleUpResult.WIN -> current.stake * 2
                DoubleUpResult.PUSH -> current.stake
                DoubleUpResult.LOSE, null -> null
            }
        }

    /** The multiple of the bet [type] pays right now. */
    fun payoutFor(type: HandType): Int =
        if (type == HandType.NOTHING) 0 else variant.basePayout(type) + payoutBonus

    /**
     * The snapshot to persist. A hand in progress is not saved, as in the web app: the
     * stake already taken for it goes back into the saved balance, so quitting mid-hand
     * never costs chips. Quitting mid double-up collects: the stake goes back too.
     */
    fun toSaved(): SavedGame = SavedGame(
        balance = when (phase) {
            Phase.HOLD -> balance + totalBet
            Phase.DOUBLE_UP -> balance + (doubleUp?.stake ?: 0)
            Phase.BET -> balance
        },
        today = today,
        allTime = allTime,
        lossStreak = lossStreak,
        winStreak = winStreak,
        bestBalance = bestBalance,
        lifetimeHands = lifetimeHands,
        variant = variant,
        handCount = handCount,
        bestHand = bestHand,
    )
}
