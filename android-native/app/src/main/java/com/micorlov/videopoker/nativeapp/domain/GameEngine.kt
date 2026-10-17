package com.micorlov.videopoker.nativeapp.domain

import kotlin.math.roundToInt
import kotlin.random.Random

/**
 * The rules of a session as pure functions over [GameState]. Money flow mirrors deal()
 * and draw() in js/game.js: the stake leaves the stack at deal time, winnings are paid at
 * draw time, and a few play-money mercies (free rebuy, shrinking an unaffordable bet)
 * keep a player from getting stuck.
 */
object GameEngine {

    /** Restores saved progress and deals the opening hand, as the web app does on launch. */
    fun newGame(saved: SavedGame, defaultBet: Int, random: Random): Transition {
        val table = GameState(
            phase = Phase.BET,
            variant = saved.variant,
            // A bad saved count would make a hand cost nothing (0) or break the multi-hand maths.
            handCount = saved.handCount.takeIf { it in Rules.HAND_COUNT_OPTIONS } ?: 1,
            bet = defaultBet,
            balance = saved.balance,
            hand = emptyList(),
            dealtHand = emptyList(),
            deck = emptyList(),
            held = NO_HOLDS,
            payoutBonus = 0,
            lossStreak = saved.lossStreak,
            winStreak = saved.winStreak,
            bestBalance = saved.bestBalance,
            bestHand = saved.bestHand,
            lifetimeHands = saved.lifetimeHands,
            today = saved.today,
            allTime = saved.allTime,
            outcome = null,
            round = 0,
        )
        return deal(table, random)
    }

    fun deal(state: GameState, random: Random): Transition {
        if (state.phase != Phase.BET) return Transition(state)

        val events = mutableListOf<GameEvent>()
        var table = affordableBet(state, events)
        table = affordableHandCount(table)

        val balanceAfterStake = table.balance - table.totalBet
        val scripted = FirstHands.scriptedHand(table.lifetimeHands, table.variant)
        val boosted = if (scripted != null) {
            FirstHands.deal(scripted, random)
        } else {
            val shuffled = standardDeck().shuffled(random)
            val dealt = Deal(hand = shuffled.take(HAND_SIZE), deck = shuffled.drop(HAND_SIZE))
            Boost.apply(dealt, balanceAfterStake, table.bet, table.lossStreak, random)
        }

        return Transition(
            table.copy(
                phase = Phase.HOLD,
                balance = balanceAfterStake,
                hand = boosted.hand,
                dealtHand = boosted.hand,
                deck = boosted.deck,
                held = NO_HOLDS,
                outcome = null,
                doubleUp = null,
                round = table.round + 1,
            ),
            events,
        )
    }

    fun toggleHold(state: GameState, index: Int): GameState {
        if (state.phase != Phase.HOLD || index !in state.held.indices) return state
        return state.copy(held = state.held.mapIndexed { i, held -> if (i == index) !held else held })
    }

    fun draw(state: GameState, random: Random): Transition {
        if (state.phase != Phase.HOLD) return Transition(state)

        val deck = state.deck.toMutableList()
        val finalHand = state.hand.mapIndexed { i, card -> if (state.held[i]) card else deck.removeAt(deck.lastIndex) }
        val result = HandEvaluator.evaluate(finalHand, state.variant)
        val mainWin = state.bet * state.payoutFor(result.type)

        val extras = (1 until state.handCount).map { playExtraHand(state, random) }
        val baseWin = mainWin + extras.sumOf { it.win }
        val bestType = extras.map { it.type }.fold(result.type) { best, type ->
            if (type.strength > best.strength) type else best
        }

        val winStreak = if (baseWin > 0) state.winStreak + 1 else 0
        val streakBonus = if (baseWin > 0) (baseWin * Rules.streakBonus(winStreak)).roundToInt() else 0
        val totalWin = baseWin + streakBonus
        val totalBet = state.totalBet

        val outcome = DrawOutcome(
            result = result,
            bestType = bestType,
            extraHands = extras,
            baseWin = baseWin,
            streakBonus = streakBonus,
            totalWin = totalWin,
            totalBet = totalBet,
            multiplier = state.payoutFor(result.type),
        )
        return Transition(settle(state, finalHand, deck, outcome, winStreak))
    }

    fun selectBet(state: GameState, amount: Int): GameState {
        if (state.phase != Phase.BET || amount <= 0) return state
        return state.copy(bet = amount, allInRevertBet = null)
    }

    /**
     * What an ALL IN would stake right now, or null when it cannot be offered (mid-draw states
     * aside, an empty stack gets a free rebuy instead). Unlike [selectBet], ALL IN is allowed
     * mid-hand: it stakes whatever remains on top of the bet already charged at deal time.
     */
    fun allInOffer(state: GameState): AllInOffer? {
        if (state.balance <= 0 || state.phase == Phase.DOUBLE_UP) return null
        val perHand = (state.balance / state.handCount).coerceIn(1L, Rules.ALL_IN_MAX_BET.toLong()).toInt()
        val betPerHand = (if (state.phase == Phase.HOLD) state.bet else 0) + perHand
        return AllInOffer(
            perHand = perHand,
            stake = perHand.toLong() * state.handCount,
            potential = betPerHand.toLong() * state.payoutFor(HandType.FULL_HOUSE) * state.handCount,
            midHand = state.phase == Phase.HOLD,
        )
    }

    /** Stakes [offer]. Mid-hand the extra is charged now, so draw() pays on the raised bet. */
    fun allIn(state: GameState, offer: AllInOffer): GameState {
        val revert = state.allInRevertBet ?: state.bet
        return if (offer.midHand) {
            state.copy(
                balance = state.balance - offer.stake,
                bet = state.bet + offer.perHand,
                allInRevertBet = revert,
            )
        } else {
            state.copy(bet = offer.perHand, allInRevertBet = revert)
        }
    }

    /** The free refill an empty stack gets, whenever it is noticed. */
    fun rebuy(state: GameState): Transition =
        Transition(state.copy(balance = Rules.STARTING_BALANCE), listOf(GameEvent.Rebuy(Rules.STARTING_BALANCE)))

    fun selectVariant(state: GameState, variant: Variant): Transition {
        if (variant == state.variant) return Transition(state)
        if (state.phase != Phase.BET) return Transition(state, listOf(GameEvent.FinishHandFirst))
        if (state.level < variant.minLevel) {
            return Transition(state, listOf(GameEvent.VariantLocked(variant.minLevel)))
        }
        return Transition(state.copy(variant = variant, payoutBonus = 0))
    }

    fun selectHandCount(state: GameState, count: Int): Transition {
        if (count !in Rules.HAND_COUNT_OPTIONS || count == state.handCount) return Transition(state)
        if (state.phase != Phase.BET) return Transition(state, listOf(GameEvent.FinishHandFirst))
        if (count > 1 && state.level < Rules.MULTI_HAND_MIN_LEVEL) {
            return Transition(state, listOf(GameEvent.MultiHandLocked(Rules.MULTI_HAND_MIN_LEVEL)))
        }
        return Transition(state.copy(handCount = count))
    }

    /**
     * Puts [GameState.doubleUpStake] at risk: it leaves the stack, the dealer's card is turned
     * up and four more are dealt face down from a fresh deck. A plain shuffle: the hidden
     * boost never touches a double-up.
     */
    fun startDoubleUp(state: GameState, random: Random): GameState {
        val stake = state.doubleUpStake ?: return state
        val cards = standardDeck().shuffled(random)
        return state.copy(
            phase = Phase.DOUBLE_UP,
            balance = state.balance - stake,
            doubleUp = DoubleUp(
                stake = stake,
                dealer = cards.first(),
                choices = cards.subList(1, 1 + DOUBLE_UP_CHOICES),
                number = (state.doubleUp?.number ?: 0) + 1,
            ),
        )
    }

    /** The player's card against the dealer's, aces high: higher doubles the stake, a tie returns it. */
    fun pickDoubleUp(state: GameState, index: Int): GameState {
        val doubleUp = state.doubleUp
        if (state.phase != Phase.DOUBLE_UP || doubleUp == null || index !in doubleUp.choices.indices) return state

        val mine = doubleUp.choices[index].rank.value
        val dealer = doubleUp.dealer.rank.value
        val result = when {
            mine > dealer -> DoubleUpResult.WIN
            mine == dealer -> DoubleUpResult.PUSH
            else -> DoubleUpResult.LOSE
        }
        val settled = doubleUp.copy(picked = index, result = result)
        val balance = state.balance + settled.returned
        return state.copy(
            phase = Phase.BET,
            balance = balance,
            doubleUp = settled,
            bestBalance = maxOf(state.bestBalance, balance),
            today = state.today.afterDoubleUp(settled),
            allTime = state.allTime.afterDoubleUp(settled),
        )
    }

    /**
     * Counts one reviewed hand on the Stats screen: [best] when the holds matched the best play,
     * otherwise [cost] is the chips that choice gave up on average.
     */
    fun recordDecision(state: GameState, best: Boolean, cost: Double): GameState = state.copy(
        today = state.today.afterDecision(best, cost),
        allTime = state.allTime.afterDecision(best, cost),
    )

    /** Clears the Stats screen counters; the stack, level and balance high stay. */
    fun resetStatistics(state: GameState): GameState = state.copy(
        today = PlayStats(),
        allTime = PlayStats(),
        winStreak = 0,
        lossStreak = 0,
    )

    // ---- deal helpers ---------------------------------------------------------------

    /** If the stack can't cover the bet, shrink the bet to fit, or refill the stack when even the smallest bet won't fit. */
    private fun affordableBet(state: GameState, events: MutableList<GameEvent>): GameState {
        if (state.balance >= state.bet) return state
        if (state.balance == 0L) return rebuy(state, events)

        val fitted = maxOf(Rules.MIN_BET, (state.balance / Rules.MIN_BET).toInt() * Rules.MIN_BET)
        val bet = if (fitted > state.balance) Rules.MIN_BET else fitted
        val shrunk = state.copy(bet = bet)
        return if (shrunk.balance < shrunk.bet) rebuy(shrunk, events) else shrunk
    }

    private fun rebuy(state: GameState, events: MutableList<GameEvent>): GameState {
        events += GameEvent.Rebuy(Rules.STARTING_BALANCE)
        return state.copy(balance = Rules.STARTING_BALANCE)
    }

    /** Multi-hand quietly drops to what the stack can cover instead of forcing a rebuy. */
    private fun affordableHandCount(state: GameState): GameState {
        if (state.handCount == 1 || state.balance >= state.totalBet) return state
        val affordable = if (state.bet * TRIPLE_PLAY <= state.balance) TRIPLE_PLAY else 1
        return state.copy(handCount = affordable)
    }

    // ---- draw helpers ---------------------------------------------------------------

    /** Triple / Five Play: the same holds, drawn again from a fresh shuffle of the cards not yet dealt. */
    private fun playExtraHand(state: GameState, random: Random): ExtraHand {
        val sideDeck = standardDeck().filter { it !in state.dealtHand }.shuffled(random).toMutableList()
        val cards = state.dealtHand.mapIndexed { i, card -> if (state.held[i]) card else sideDeck.removeAt(sideDeck.lastIndex) }
        val result = HandEvaluator.evaluate(cards, state.variant)
        return ExtraHand(cards, result, win = state.bet * state.payoutFor(result.type))
    }

    /** Pays out, updates every counter, and closes the hand. */
    private fun settle(
        state: GameState,
        finalHand: List<Card>,
        deck: List<Card>,
        outcome: DrawOutcome,
        winStreak: Int,
    ): GameState {
        val won = outcome.isWin
        val balance = state.balance + outcome.totalWin
        val today = state.today.afterHand(outcome, winStreak)
        val allTime = state.allTime.afterHand(outcome, maxOf(winStreak, today.bestStreak))

        return state.copy(
            phase = Phase.BET,
            balance = balance,
            bet = state.allInRevertBet ?: state.bet,
            allInRevertBet = null,
            hand = finalHand,
            deck = deck,
            payoutBonus = if (won) 0 else state.payoutBonus + 1,
            lossStreak = if (won) 0 else state.lossStreak + 1,
            winStreak = winStreak,
            bestBalance = if (won && balance > state.bestBalance) balance else state.bestBalance,
            lifetimeHands = state.lifetimeHands + 1,
            today = today,
            allTime = allTime,
            outcome = outcome,
            bestHand = newBestHand(state, finalHand, outcome),
            round = state.round + 1,
        )
    }

    /** A win that out-pays the stored best replaces it, as checkAndUpdateBestHand() does. */
    private fun newBestHand(state: GameState, finalHand: List<Card>, outcome: DrawOutcome): BestHand? {
        val current = state.bestHand
        if (!outcome.isWin || (current != null && current.payout >= outcome.totalWin)) return current
        return BestHand(
            type = outcome.bestType,
            multiple = (outcome.totalWin.toDouble() / state.bet).roundToInt(),
            payout = outcome.totalWin,
            cards = finalHand,
        )
    }

    private fun PlayStats.afterHand(outcome: DrawOutcome, streak: Int) = copy(
        won = won + outcome.totalWin,
        lost = lost + if (outcome.isWin) 0 else outcome.totalBet,
        handsPlayed = handsPlayed + 1,
        bestStreak = maxOf(bestStreak, streak),
    )

    private fun PlayStats.afterDoubleUp(doubleUp: DoubleUp) = when (doubleUp.result) {
        DoubleUpResult.WIN -> copy(won = won + doubleUp.stake)
        DoubleUpResult.LOSE -> copy(lost = lost + doubleUp.stake)
        DoubleUpResult.PUSH, null -> this
    }

    private fun PlayStats.afterDecision(best: Boolean, cost: Double) = copy(
        reviewed = reviewed + 1,
        bestPlays = bestPlays + if (best) 1 else 0,
        mistakeCost = mistakeCost + if (best) 0.0 else cost.coerceAtLeast(0.0),
    )

    private val NO_HOLDS = List(HAND_SIZE) { false }
    private const val HAND_SIZE = HandEvaluator.HAND_SIZE
    private const val TRIPLE_PLAY = 3
    private const val DOUBLE_UP_CHOICES = 4
}
