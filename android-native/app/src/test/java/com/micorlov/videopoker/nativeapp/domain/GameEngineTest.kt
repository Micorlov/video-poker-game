package com.micorlov.videopoker.nativeapp.domain

import kotlin.random.Random
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

class GameEngineTest {

    private val random = Random(7)

    /** A table in the betting phase (after a completed hand), with the given money and progress. */
    private fun betting(
        balance: Long = 1000,
        bet: Int = 10,
        handCount: Int = 1,
        lifetimeHands: Int = 0,
        variant: Variant = Variant.JACKS,
    ): GameState {
        val saved = SavedGame(balance = balance, lifetimeHands = lifetimeHands, variant = variant, handCount = handCount)
        val dealt = GameEngine.newGame(saved, defaultBet = bet, random = Random(1)).state
        // newGame() deals, which may have shrunk the bet or hand count; start from exactly what was asked for.
        return dealt.copy(phase = Phase.BET, balance = balance, bet = bet, handCount = handCount, outcome = null)
    }

    /**
     * A table mid-hand with a known hand and a known deck. Draws take from the END of
     * [deckText], so the last card listed is the first one dealt in.
     */
    private fun holding(
        handText: String,
        deckText: String,
        held: List<Boolean>,
        bet: Int = 10,
        balance: Long = 990,
        handCount: Int = 1,
        lifetimeHands: Int = 0,
        variant: Variant = Variant.JACKS,
        payoutBonus: Int = 0,
        winStreak: Int = 0,
        lossStreak: Int = 0,
    ): GameState {
        val cards = hand(handText)
        return betting(balance = balance, bet = bet, handCount = handCount, lifetimeHands = lifetimeHands, variant = variant)
            .copy(
                phase = Phase.HOLD,
                hand = cards,
                dealtHand = cards,
                deck = hand(deckText),
                held = held,
                payoutBonus = payoutBonus,
                winStreak = winStreak,
                lossStreak = lossStreak,
            )
    }

    private val holdFirstTwo = listOf(true, true, false, false, false)
    private val holdNone = List(5) { false }

    // ---- starting a game ------------------------------------------------------------

    @Test
    fun `a new game deals a hand and charges the bet`() {
        val state = GameEngine.newGame(SavedGame(balance = 500), defaultBet = 10, random = random).state

        assertEquals(Phase.HOLD, state.phase)
        assertEquals(490L, state.balance)
        assertEquals(10, state.bet)
        assertEquals(5, state.hand.size)
        assertEquals(47, state.deck.size)
        assertEquals(state.hand, state.dealtHand)
        assertEquals(holdNone, state.held)
        assertEquals(52, (state.hand + state.deck).toSet().size)
    }

    @Test
    fun `a new game restores saved progress`() {
        val saved = SavedGame(
            balance = 750,
            today = PlayStats(won = 40, lost = 25, handsPlayed = 6, bestStreak = 2),
            allTime = PlayStats(won = 900, lost = 400, handsPlayed = 80, bestStreak = 5),
            lossStreak = 2,
            winStreak = 1,
            bestBalance = 1500,
            lifetimeHands = 12,
            variant = Variant.DEUCES,
            handCount = 1,
        )
        val state = GameEngine.newGame(saved, defaultBet = 5, random = random).state

        assertEquals(Variant.DEUCES, state.variant)
        assertEquals(saved.today, state.today)
        assertEquals(saved.allTime, state.allTime)
        assertEquals(12, state.lifetimeHands)
        assertEquals(2, state.lossStreak)
        assertEquals(1500L, state.bestBalance)
        assertEquals(0, state.payoutBonus, "the loss escalator never survives a restart")
    }

    @Test
    fun `dealing is a no-op while a hand is in progress`() {
        val mid = holding("A♠ A♥ 4♦ 7♣ 9♠", "5♣ 8♦ 3♠", holdFirstTwo)
        assertEquals(mid, GameEngine.deal(mid, random).state)
    }

    // ---- dealing --------------------------------------------------------------------

    @Test
    fun `dealing charges the bet once per hand in play`() {
        val state = betting(balance = 1000, bet = 10, handCount = 3, lifetimeHands = 45)
        val dealt = GameEngine.deal(state, random).state
        assertEquals(970L, dealt.balance)
        assertEquals(30, dealt.totalBet)
    }

    @Test
    fun `an empty balance triggers a free rebuy`() {
        val transition = GameEngine.deal(betting(balance = 0, bet = 10), random)
        assertTrue(GameEvent.Rebuy(1000) in transition.events)
        assertEquals(990L, transition.state.balance)
    }

    @Test
    fun `a balance below the bet lowers the bet to what is affordable`() {
        val transition = GameEngine.deal(betting(balance = 23, bet = 50), random)
        assertEquals(20, transition.state.bet)
        assertEquals(3L, transition.state.balance)
        assertTrue(transition.events.none { it is GameEvent.Rebuy })
    }

    @Test
    fun `a balance below the smallest bet rebuys`() {
        val transition = GameEngine.deal(betting(balance = 3, bet = 10), random)
        assertTrue(GameEvent.Rebuy(1000) in transition.events)
        assertEquals(5, transition.state.bet)
        assertEquals(995L, transition.state.balance)
    }

    @Test
    fun `multi-hand drops to three hands when five are unaffordable`() {
        val dealt = GameEngine.deal(betting(balance = 160, bet = 50, handCount = 5, lifetimeHands = 45), random).state
        assertEquals(3, dealt.handCount)
        assertEquals(10L, dealt.balance)
    }

    @Test
    fun `multi-hand drops to one hand when three are unaffordable`() {
        val dealt = GameEngine.deal(betting(balance = 100, bet = 50, handCount = 5, lifetimeHands = 45), random).state
        assertEquals(1, dealt.handCount)
        assertEquals(50L, dealt.balance)
    }

    @Test
    fun `every deal bumps the round counter so the UI can animate`() {
        val first = GameEngine.newGame(SavedGame(), defaultBet = 10, random = random).state
        val second = GameEngine.draw(first, random).state
        val third = GameEngine.deal(second, random).state
        assertEquals(1, first.round)
        assertEquals(2, second.round)
        assertEquals(3, third.round)
    }

    // ---- the hidden boost, as wired into the deal ------------------------------------

    private fun biggestSuit(cards: List<Card>) = cards.groupingBy { it.suit }.eachCount().values.max()

    private fun hasPair(cards: List<Card>) = cards.groupingBy { it.rank }.eachCount().values.any { it >= 2 }

    @Test
    fun `the boost judges the stack after the stake, so exactly four bets left is critical`() {
        // 50 - 10 = 40 = four bets: critical, so a triggered boost reaches for a pair.
        val critical = GameEngine.deal(betting(balance = 50, bet = 10), ConstantRandom(0)).state
        assertTrue(hasPair(critical.hand), "critical stack must be helped with a pair: ${critical.hand}")

        // 60 - 10 = 50: only low, so the same roll takes the flush-draw tease instead.
        val low = GameEngine.deal(betting(balance = 60, bet = 10), ConstantRandom(0)).state
        assertTrue(biggestSuit(low.hand) >= 4, "a low (not critical) stack gets the flush tease: ${low.hand}")
    }

    @Test
    fun `the boost sizes a stack against the bet of one hand, not the whole multi-hand stake`() {
        // 3 hands x 10: stake 30, leaving 70 = seven single bets (low, not critical). Judging it
        // against the 30 total instead would call 70 "critical" (<= 4 x 30) and force a pair.
        val state = betting(balance = 100, bet = 10, handCount = 3, lifetimeHands = 45)
        val dealt = GameEngine.deal(state, ConstantRandom(0)).state
        assertTrue(biggestSuit(dealt.hand) >= 4, "per-hand bet decides the tier: ${dealt.hand}")
    }

    @Test
    fun `a roll above the chance leaves the deal untouched`() {
        val dealt = GameEngine.deal(betting(balance = 50, bet = 10), ConstantRandom(-1)).state
        // ConstantRandom(-1) also drives the shuffle, so compare against the same shuffle unboosted.
        val expected = standardDeck().shuffled(ConstantRandom(-1)).take(5)
        assertEquals(expected, dealt.hand)
    }

    // ---- holding --------------------------------------------------------------------

    @Test
    fun `toggling a hold flips only that card`() {
        val mid = holding("A♠ A♥ 4♦ 7♣ 9♠", "5♣ 8♦ 3♠", holdNone)
        assertEquals(listOf(false, true, false, false, false), GameEngine.toggleHold(mid, 1).held)
        assertEquals(holdNone, GameEngine.toggleHold(GameEngine.toggleHold(mid, 1), 1).held)
    }

    @Test
    fun `holds are ignored outside the hold phase and out of range`() {
        val mid = holding("A♠ A♥ 4♦ 7♣ 9♠", "5♣ 8♦ 3♠", holdNone)
        assertEquals(mid, GameEngine.toggleHold(mid, 5))
        assertEquals(mid, GameEngine.toggleHold(mid, -1))
        val betting = mid.copy(phase = Phase.BET)
        assertEquals(betting, GameEngine.toggleHold(betting, 0))
    }

    // ---- drawing and paying ---------------------------------------------------------

    @Test
    fun `drawing replaces only the cards that are not held`() {
        val mid = holding("A♠ A♥ 4♦ 7♣ 9♠", "5♣ 8♦ 3♠", holdFirstTwo)
        val drawn = GameEngine.draw(mid, random).state
        assertEquals(hand("A♠ A♥ 3♠ 8♦ 5♣"), drawn.hand)
        assertEquals(Phase.BET, drawn.phase)
    }

    @Test
    fun `a winning hand pays the bet times the paytable`() {
        val mid = holding("A♠ A♥ 4♦ 7♣ 9♠", "5♣ 8♦ 3♠", holdFirstTwo, bet = 10, balance = 990)
        val drawn = GameEngine.draw(mid, random).state

        assertEquals(HandType.JACKS_OR_BETTER, drawn.outcome?.result?.type)
        assertEquals(10, drawn.outcome?.totalWin)
        assertEquals(1000L, drawn.balance)
    }

    @Test
    fun `a losing hand pays nothing and leaves the stake spent`() {
        val mid = holding("2♠ 4♥ 6♦ 8♣ 10♠", "K♦ 9♥ 8♠ 5♦ 3♣", holdNone, bet = 10, balance = 990)
        val drawn = GameEngine.draw(mid, random).state

        assertEquals(HandType.NOTHING, drawn.outcome?.result?.type)
        assertEquals(0, drawn.outcome?.totalWin)
        assertEquals(990L, drawn.balance)
    }

    @Test
    fun `the loss escalator raises every payout by one per lost hand`() {
        val mid = holding("A♠ A♥ 4♦ 7♣ 9♠", "5♣ 8♦ 3♠", holdFirstTwo, bet = 10, balance = 990, payoutBonus = 2)
        val drawn = GameEngine.draw(mid, random).state

        assertEquals(30, drawn.outcome?.totalWin, "Jacks or Better pays 1x + 2 escalated")
        assertEquals(3, drawn.outcome?.multiplier)
        assertEquals(0, drawn.payoutBonus, "a win resets the escalator")
        assertEquals(0, drawn.lossStreak)
    }

    @Test
    fun `a loss escalates payouts and extends the loss streak`() {
        val mid = holding("2♠ 4♥ 6♦ 8♣ 10♠", "K♦ 9♥ 8♠ 5♦ 3♣", holdNone, winStreak = 4, lossStreak = 1, payoutBonus = 1)
        val drawn = GameEngine.draw(mid, random).state

        assertEquals(2, drawn.payoutBonus)
        assertEquals(2, drawn.lossStreak)
        assertEquals(0, drawn.winStreak)
    }

    @Test
    fun `the escalator does not make nothing pay`() {
        val mid = holding("2♠ 4♥ 6♦ 8♣ 10♠", "K♦ 9♥ 8♠ 5♦ 3♣", holdNone, payoutBonus = 6)
        assertEquals(0, GameEngine.draw(mid, random).state.outcome?.totalWin)
    }

    @Test
    fun `a third straight win adds a ten percent bonus`() {
        val mid = holding("A♠ A♥ 4♦ 7♣ 9♠", "5♣ 8♦ 3♠", holdFirstTwo, bet = 10, balance = 990, winStreak = 2)
        val drawn = GameEngine.draw(mid, random).state

        assertEquals(3, drawn.winStreak)
        assertEquals(10, drawn.outcome?.baseWin)
        assertEquals(1, drawn.outcome?.streakBonus)
        assertEquals(11, drawn.outcome?.totalWin)
        assertEquals(1001L, drawn.balance)
    }

    @Test
    fun `streak bonus rounds halves up like the web app`() {
        // bet 5 on a 1x win = 5; 10% of 5 is 0.5, which Math.round takes to 1.
        val mid = holding("A♠ A♥ 4♦ 7♣ 9♠", "5♣ 8♦ 3♠", holdFirstTwo, bet = 5, balance = 995, winStreak = 2)
        val drawn = GameEngine.draw(mid, random).state
        assertEquals(6, drawn.outcome?.totalWin)
    }

    @Test
    fun `best streak follows the win streak`() {
        val mid = holding("A♠ A♥ 4♦ 7♣ 9♠", "5♣ 8♦ 3♠", holdFirstTwo, winStreak = 4)
        val drawn = GameEngine.draw(mid, random).state
        assertEquals(5, drawn.today.bestStreak)
        assertEquals(5, drawn.allTime.bestStreak)
    }

    @Test
    fun `statistics track gross wins and the stake of lost hands`() {
        val won = GameEngine.draw(holding("A♠ A♥ 4♦ 7♣ 9♠", "5♣ 8♦ 3♠", holdFirstTwo), random).state
        assertEquals(10L, won.today.won)
        assertEquals(0L, won.today.lost)
        assertEquals(1, won.today.handsPlayed)
        assertEquals(1, won.lifetimeHands)

        val lost = GameEngine.draw(holding("2♠ 4♥ 6♦ 8♣ 10♠", "K♦ 9♥ 8♠ 5♦ 3♣", holdNone), random).state
        assertEquals(0L, lost.today.won)
        assertEquals(10L, lost.today.lost)
        assertEquals(10L, lost.allTime.lost)
    }

    @Test
    fun `a new balance high is remembered on a win`() {
        val mid = holding("A♠ A♥ 4♦ 7♣ 9♠", "5♣ 8♦ 3♠", holdFirstTwo, balance = 990)
        assertEquals(1000L, GameEngine.draw(mid, random).state.bestBalance)
    }

    @Test
    fun `drawing outside the hold phase does nothing`() {
        val state = betting()
        assertEquals(state, GameEngine.draw(state, random).state)
    }

    @Test
    fun `a bonus poker quad pays its split rank`() {
        val mid = holding("A♠ A♥ A♦ A♣ 9♠", "K♦", listOf(true, true, true, true, false), variant = Variant.BONUS, lifetimeHands = 35)
        val drawn = GameEngine.draw(mid, random).state
        assertEquals(HandType.FOUR_ACES, drawn.outcome?.result?.type)
        assertEquals(800, drawn.outcome?.totalWin, "Four Aces pays 80x on a 10 bet")
    }

    // ---- multi-hand -----------------------------------------------------------------

    @Test
    fun `multi-hand plays extra hands from the same holds`() {
        val mid = holding(
            "A♠ A♥ 4♦ 7♣ 9♠", "5♣ 8♦ 3♠", holdFirstTwo,
            bet = 10, balance = 970, handCount = 3, lifetimeHands = 45,
        )
        val outcome = assertNotNull(GameEngine.draw(mid, random).state.outcome)

        assertEquals(2, outcome.extraHands.size)
        assertEquals(30, outcome.totalBet)
        val unheldDealt = hand("4♦ 7♣ 9♠").toSet()
        outcome.extraHands.forEach { extra ->
            assertEquals(hand("A♠ A♥"), extra.cards.take(2), "held cards stay in every hand")
            assertEquals(5, extra.cards.toSet().size)
            assertTrue(extra.cards.drop(2).none { it in unheldDealt }, "an extra hand never redraws a discard")
            assertTrue(extra.win >= 10, "a held pair of aces always pays at least Jacks or Better")
        }
        assertEquals(outcome.baseWin, 10 + outcome.extraHands.sumOf { it.win }, "main hand (Jacks or Better = 10) plus extras")
    }

    @Test
    fun `the streak bonus applies to the sum of every hand and the balance gets all of it`() {
        val mid = holding(
            "A♠ A♥ 4♦ 7♣ 9♠", "5♣ 8♦ 3♠", holdFirstTwo,
            bet = 10, balance = 970, handCount = 3, lifetimeHands = 45, winStreak = 2,
        )
        val drawn = GameEngine.draw(mid, random).state
        val outcome = assertNotNull(drawn.outcome)

        assertEquals(3, drawn.winStreak)
        assertEquals((outcome.baseWin * 0.1).let { Math.round(it).toInt() }, outcome.streakBonus)
        assertEquals(outcome.baseWin + outcome.streakBonus, outcome.totalWin)
        assertEquals(970L + outcome.totalWin, drawn.balance)
        assertEquals(outcome.totalWin.toLong(), drawn.today.won)
        assertEquals(0L, drawn.today.lost)
        assertTrue(outcome.bestType.strength >= HandType.JACKS_OR_BETTER.strength)
    }

    // ---- settings that change the table ---------------------------------------------

    @Test
    fun `bets can only change between hands`() {
        assertEquals(50, GameEngine.selectBet(betting(), 50).bet)
        val mid = holding("A♠ A♥ 4♦ 7♣ 9♠", "5♣ 8♦ 3♠", holdFirstTwo)
        assertEquals(10, GameEngine.selectBet(mid, 50).bet)
    }

    @Test
    fun `a locked variant is refused with its unlock level`() {
        val transition = GameEngine.selectVariant(betting(lifetimeHands = 0), Variant.DEUCES)
        assertEquals(Variant.JACKS, transition.state.variant)
        assertTrue(GameEvent.VariantLocked(3) in transition.events)
    }

    @Test
    fun `an unlocked variant switches and resets the escalator`() {
        val state = betting(lifetimeHands = 10).copy(payoutBonus = 4)
        val transition = GameEngine.selectVariant(state, Variant.DEUCES)
        assertEquals(Variant.DEUCES, transition.state.variant)
        assertEquals(0, transition.state.payoutBonus)
        assertTrue(transition.events.isEmpty())
    }

    @Test
    fun `variants cannot change mid hand and the player is told why`() {
        val mid = holding("A♠ A♥ 4♦ 7♣ 9♠", "5♣ 8♦ 3♠", holdFirstTwo, lifetimeHands = 10)
        val transition = GameEngine.selectVariant(mid, Variant.DEUCES)
        assertEquals(Variant.JACKS, transition.state.variant)
        assertEquals(listOf(GameEvent.FinishHandFirst), transition.events)
    }

    @Test
    fun `hand count cannot change mid hand and the player is told why`() {
        val mid = holding("A♠ A♥ 4♦ 7♣ 9♠", "5♣ 8♦ 3♠", holdFirstTwo, lifetimeHands = 45)
        val transition = GameEngine.selectHandCount(mid, 3)
        assertEquals(1, transition.state.handCount)
        assertEquals(listOf(GameEvent.FinishHandFirst), transition.events)
    }

    @Test
    fun `choosing what is already chosen is silent`() {
        val state = betting(lifetimeHands = 45)
        assertTrue(GameEngine.selectVariant(state, Variant.JACKS).events.isEmpty())
        assertTrue(GameEngine.selectHandCount(state, 1).events.isEmpty())
    }

    @Test
    fun `multi-hand is locked below level ten`() {
        val transition = GameEngine.selectHandCount(betting(lifetimeHands = 20), 3)
        assertEquals(1, transition.state.handCount)
        assertTrue(GameEvent.MultiHandLocked(10) in transition.events)
    }

    @Test
    fun `multi-hand unlocks at level ten`() {
        val transition = GameEngine.selectHandCount(betting(lifetimeHands = 45), 5)
        assertEquals(5, transition.state.handCount)
        assertTrue(transition.events.isEmpty())
    }

    @Test
    fun `only one three or five hands can be chosen`() {
        assertEquals(1, GameEngine.selectHandCount(betting(lifetimeHands = 45), 4).state.handCount)
    }

    // ---- resetting ------------------------------------------------------------------

    @Test
    fun `resetting statistics keeps the balance and level`() {
        val state = betting(balance = 1234, lifetimeHands = 30).copy(
            today = PlayStats(won = 5, lost = 6, handsPlayed = 7, bestStreak = 3),
            allTime = PlayStats(won = 50, lost = 60, handsPlayed = 70, bestStreak = 9),
            winStreak = 2,
            lossStreak = 1,
            bestBalance = 5000,
        )
        val reset = GameEngine.resetStatistics(state)

        assertEquals(PlayStats(), reset.today)
        assertEquals(PlayStats(), reset.allTime)
        assertEquals(0, reset.winStreak)
        assertEquals(0, reset.lossStreak)
        assertEquals(1234L, reset.balance)
        assertEquals(30, reset.lifetimeHands)
        assertEquals(5000L, reset.bestBalance)
    }

    @Test
    fun `saving mid hand returns the stake so quitting never costs chips`() {
        val mid = holding("A♠ A♥ 4♦ 7♣ 9♠", "5♣ 8♦ 3♠", holdFirstTwo, bet = 10, balance = 990, handCount = 3, lifetimeHands = 45)
        val charged = mid.copy(balance = 970)

        assertEquals(1000L, charged.toSaved().balance)
        assertEquals(1000L, betting(balance = 1000).toSaved().balance, "between hands nothing is pending")
    }

    @Test
    fun `everything saved comes back through a new game`() {
        val before = betting(balance = 2500, bet = 20, handCount = 3, lifetimeHands = 61, variant = Variant.BONUS).copy(
            today = PlayStats(won = 90, lost = 40, handsPlayed = 7, bestStreak = 3),
            allTime = PlayStats(won = 900, lost = 400, handsPlayed = 70, bestStreak = 6),
            lossStreak = 2,
            winStreak = 1,
            bestBalance = 4000,
            payoutBonus = 5,
        )

        val after = GameEngine.newGame(before.toSaved(), defaultBet = 20, random = Random(3)).state

        assertEquals(before.variant, after.variant)
        assertEquals(before.handCount, after.handCount)
        assertEquals(before.lifetimeHands, after.lifetimeHands)
        assertEquals(before.today, after.today)
        assertEquals(before.allTime, after.allTime)
        assertEquals(before.lossStreak, after.lossStreak)
        assertEquals(before.winStreak, after.winStreak)
        assertEquals(before.bestBalance, after.bestBalance)
        assertEquals(0, after.payoutBonus, "the loss escalator is session-only")
        assertEquals(2500L - 60, after.balance, "the opening deal takes 3 hands x 20")
    }

    @Test
    fun `a nonsense saved hand count cannot make a hand free`() {
        listOf(0, 2, 4, -3, 99).forEach { bad ->
            val state = GameEngine.newGame(SavedGame(handCount = bad), defaultBet = 10, random = random).state
            assertEquals(1, state.handCount, "saved handCount=$bad")
            assertEquals(990L, state.balance)
        }
    }

    // ---- ALL IN ---------------------------------------------------------------------

    @Test
    fun `all in before the deal stakes the whole stack on the next hand`() {
        val state = betting(balance = 640, bet = 10)
        val offer = checkNotNull(GameEngine.allInOffer(state))
        assertEquals(640L, offer.stake)
        assertEquals(640L * 7, offer.potential) // Full House pays 7 in the 7/5 Jacks or Better table

        val staked = GameEngine.allIn(state, offer)
        assertEquals(640, staked.bet)
        assertTrue(staked.isAllIn)
        assertEquals(0L, GameEngine.deal(staked, random).state.balance)
    }

    @Test
    fun `all in is split across the hands of a multi-hand deal`() {
        val state = betting(balance = 1000, bet = 10, handCount = 5, lifetimeHands = 45)
        val offer = checkNotNull(GameEngine.allInOffer(state))
        assertEquals(200, offer.perHand)
        assertEquals(1000L, offer.stake)
    }

    @Test
    fun `all in mid-hand charges the rest now and pays on the raised bet`() {
        val mid = holding("A♠ A♥ 4♦ 7♣ 9♠", "5♣ 8♦ 3♠", holdFirstTwo, bet = 10, balance = 990)
        val offer = checkNotNull(GameEngine.allInOffer(mid))
        assertTrue(offer.midHand)
        val staked = GameEngine.allIn(mid, offer)
        assertEquals(0L, staked.balance)
        assertEquals(1000, staked.bet)

        val settled = GameEngine.draw(staked, random).state
        // Whatever it paid, the bet falls back to what it was before ALL IN.
        assertEquals(10, settled.bet)
        assertFalse(settled.isAllIn)
    }

    @Test
    fun `picking a normal bet cancels a pending all in`() {
        val state = betting(balance = 640, bet = 10)
        val staked = GameEngine.allIn(state, checkNotNull(GameEngine.allInOffer(state)))
        val reselected = GameEngine.selectBet(staked, 20)
        assertEquals(20, reselected.bet)
        assertFalse(reselected.isAllIn)
    }

    @Test
    fun `an empty stack has no all in offer`() {
        assertEquals(null, GameEngine.allInOffer(betting(balance = 0)))
    }

    // ---- personal best ----------------------------------------------------------------

    @Test
    fun `a winning hand becomes the personal best and only a bigger win replaces it`() {
        val pair = holding("A♠ A♥ 4♦ 7♣ 9♠", "5♣ 8♦ 3♠", holdFirstTwo)
        val first = GameEngine.draw(pair, random).state
        val best = assertNotNull(first.bestHand)
        assertEquals(first.outcome!!.totalWin, best.payout)
        assertEquals(5, best.cards.size)

        // A later, smaller win leaves the record alone.
        val smaller = GameEngine.draw(pair.copy(bet = 5, bestHand = best), random).state
        assertEquals(best, smaller.bestHand)

        // A losing hand never touches it.
        val loser = holding("2♠ 5♥ 8♦ 9♣ 3♠", "K♦ 4♦ 6♥ 7♠ J♣", listOf(false, false, false, false, false))
        assertEquals(null, GameEngine.draw(loser, random).state.bestHand)
    }

    // ---- double up --------------------------------------------------------------------

    /** A pair of kings won 10 on a bet of 10; the table is back between hands. */
    private fun afterAWin(): GameState {
        val winner = holding("K♠ K♥ 8♦ 9♣ 3♠", "2♦ 4♦ 6♥", holdFirstTwo)
        return GameEngine.draw(winner, random).state
    }

    private fun doubling(dealer: String, choices: String, stake: Long = 10, balance: Long = 990, number: Int = 1) =
        afterAWin().copy(
            phase = Phase.DOUBLE_UP,
            balance = balance,
            doubleUp = DoubleUp(stake = stake, dealer = card(dealer), choices = hand(choices), number = number),
        )

    @Test
    fun `a win can be doubled up, a loss cannot`() {
        assertEquals(10L, afterAWin().doubleUpStake)

        val loser = holding("2♠ 5♥ 8♦ 9♣ 3♠", "K♦ 4♦ 6♥ 7♠ J♣", holdNone)
        assertEquals(null, GameEngine.draw(loser, random).state.doubleUpStake)
        assertEquals(null, holding("K♠ K♥ 8♦ 9♣ 3♠", "2♦", holdFirstTwo).doubleUpStake, "not mid-hand")
    }

    @Test
    fun `starting a double up stakes the win and deals the dealer and four cards`() {
        val before = afterAWin()

        val doubling = GameEngine.startDoubleUp(before, random)

        assertEquals(Phase.DOUBLE_UP, doubling.phase)
        assertEquals(before.balance - 10, doubling.balance)
        val doubleUp = assertNotNull(doubling.doubleUp)
        assertEquals(10L, doubleUp.stake)
        assertEquals(4, doubleUp.choices.size)
        assertEquals(5, (doubleUp.choices + doubleUp.dealer).toSet().size)
        assertEquals(1, doubleUp.number)
    }

    @Test
    fun `a higher card doubles the stake`() {
        val won = GameEngine.pickDoubleUp(doubling("9♠", "Q♦ 3♣ 9♥ 2♠"), 0)

        assertEquals(Phase.BET, won.phase)
        assertEquals(DoubleUpResult.WIN, won.doubleUp?.result)
        assertEquals(1010L, won.balance)
        assertEquals(20L, won.doubleUpStake, "the next double rides the whole return")
    }

    @Test
    fun `the same rank is a push and the stake comes back`() {
        val push = GameEngine.pickDoubleUp(doubling("9♠", "Q♦ 3♣ 9♥ 2♠"), 2)

        assertEquals(DoubleUpResult.PUSH, push.doubleUp?.result)
        assertEquals(1000L, push.balance)
        assertEquals(10L, push.doubleUpStake)
    }

    @Test
    fun `a lower card loses the stake and ends the run`() {
        val lost = GameEngine.pickDoubleUp(doubling("9♠", "Q♦ 3♣ 9♥ 2♠"), 3)

        assertEquals(DoubleUpResult.LOSE, lost.doubleUp?.result)
        assertEquals(990L, lost.balance)
        assertEquals(null, lost.doubleUpStake)
    }

    @Test
    fun `aces are high in a double up`() {
        assertEquals(DoubleUpResult.WIN, GameEngine.pickDoubleUp(doubling("K♠", "A♦ 3♣ 9♥ 2♠"), 0).doubleUp?.result)
        assertEquals(DoubleUpResult.LOSE, GameEngine.pickDoubleUp(doubling("A♠", "K♦ 3♣ 9♥ 2♠"), 0).doubleUp?.result)
    }

    @Test
    fun `double up results count in the statistics`() {
        val start = doubling("9♠", "Q♦ 3♣ 9♥ 2♠")

        val won = GameEngine.pickDoubleUp(start, 0)
        assertEquals(start.today.won + 10, won.today.won)
        assertEquals(start.allTime.won + 10, won.allTime.won)

        val lost = GameEngine.pickDoubleUp(start, 3)
        assertEquals(start.today.lost + 10, lost.today.lost)
        assertEquals(start.today.won, lost.today.won)
    }

    @Test
    fun `picks are ignored outside a double up and out of range`() {
        val start = doubling("9♠", "Q♦ 3♣ 9♥ 2♠")

        assertEquals(start, GameEngine.pickDoubleUp(start, 4))
        assertEquals(afterAWin(), GameEngine.pickDoubleUp(afterAWin(), 0))
    }

    @Test
    fun `the run stops after the last allowed double`() {
        val last = doubling("9♠", "Q♦ 3♣ 9♥ 2♠", number = Rules.MAX_DOUBLE_UPS)

        assertEquals(null, GameEngine.pickDoubleUp(last, 0).doubleUpStake)
    }

    @Test
    fun `dealing collects and clears the double up`() {
        val won = GameEngine.pickDoubleUp(doubling("9♠", "Q♦ 3♣ 9♥ 2♠"), 0)

        val next = GameEngine.deal(won, random).state

        assertEquals(null, next.doubleUp)
        assertEquals(won.balance - next.totalBet, next.balance)
    }

    @Test
    fun `nothing else happens on the table during a double up`() {
        val start = doubling("9♠", "Q♦ 3♣ 9♥ 2♠")

        assertEquals(start, GameEngine.deal(start, random).state)
        assertEquals(start, GameEngine.draw(start, random).state)
        assertEquals(start, GameEngine.selectBet(start, 50))
        assertEquals(null, GameEngine.allInOffer(start))
        assertEquals(listOf<GameEvent>(GameEvent.FinishHandFirst), GameEngine.selectVariant(start.copy(lifetimeHands = 100), Variant.DEUCES).events)
    }

    @Test
    fun `quitting mid double up keeps the stake`() {
        assertEquals(1000L, doubling("9♠", "Q♦ 3♣ 9♥ 2♠", stake = 10, balance = 990).toSaved().balance)
    }

    // ---- decision review ----------------------------------------------------------------

    @Test
    fun `reviewed decisions count best plays and the cost of the rest`() {
        val table = betting()

        val reviewed = GameEngine.recordDecision(GameEngine.recordDecision(table, best = true, cost = 0.0), best = false, cost = 2.5)

        assertEquals(2, reviewed.today.reviewed)
        assertEquals(1, reviewed.today.bestPlays)
        assertEquals(2.5, reviewed.today.mistakeCost)
        assertEquals(0.5, reviewed.allTime.accuracy)
        assertEquals(null, table.today.accuracy)
    }
}
