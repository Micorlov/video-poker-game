package com.micorlov.videopoker.nativeapp.domain

import kotlin.random.Random

/** The five dealt cards and the deck they came from. */
data class Deal(val hand: List<Card>, val deck: List<Card>)

/**
 * The web app's hidden "engagement tuning" (boostHand() in js/game.js, documented in
 * FEATURES.md §3.6). Before the player sees a deal it may swap one dead card into a
 * pair, or build a four-to-a-flush draw. The chance grows with a losing streak and a
 * shrinking stack, so a play-money session is less likely to run dry. Ported as-is.
 */
object Boost {
    private const val BASE = 0.18
    private const val PER_LOSS = 0.06
    private const val LOSS_CAP = 5
    private const val LOW_BALANCE_HANDS = 10
    private const val CRITICAL_BALANCE_HANDS = 4
    private const val LOW_BONUS = 0.15
    private const val CRITICAL_BONUS = 0.35
    private const val MAX_CHANCE = 0.85
    private const val FLUSH_SHARE = 0.25
    private const val FLUSH_TARGET = 4

    fun chance(lossStreak: Int, balance: Long, bet: Int): Double {
        var chance = BASE + minOf(lossStreak, LOSS_CAP) * PER_LOSS
        chance += when {
            balance <= bet.toLong() * CRITICAL_BALANCE_HANDS -> CRITICAL_BONUS
            balance <= bet.toLong() * LOW_BALANCE_HANDS -> LOW_BONUS
            else -> 0.0
        }
        return minOf(chance, MAX_CHANCE)
    }

    /** [balance] is the stack after this hand's stake was taken, as in the web app. */
    fun apply(deal: Deal, balance: Long, bet: Int, lossStreak: Int, random: Random): Deal {
        if (random.nextDouble() >= chance(lossStreak, balance, bet)) return deal

        // Critical-balance rescues stay on the reliable pair path; elsewhere a quarter of
        // boosts go for the bigger emotional payoff of a four-to-a-flush tease.
        val critical = balance <= bet.toLong() * CRITICAL_BALANCE_HANDS
        if (!critical && random.nextDouble() < FLUSH_SHARE) return toFlushDraw(deal, random)
        return toPair(deal, random)
    }

    /** Swaps one non-matching card for a second card of a rank already in the hand. */
    internal fun toPair(deal: Deal, random: Random): Deal {
        val hand = deal.hand
        if (hand.groupingBy { it.rank }.eachCount().values.max() >= 2) return deal

        val targetRank = hand[random.nextInt(hand.size)].rank
        val usedSuits = hand.filter { it.rank == targetRank }.map { it.suit }
        val availableSuits = Suit.entries.filter { it !in usedSuits }
        if (availableSuits.isEmpty()) return deal
        val newCard = Card(targetRank, availableSuits[random.nextInt(availableSuits.size)])

        val replaceable = hand.indices.filter { hand[it].rank != targetRank }
        if (replaceable.isEmpty()) return deal
        val replaceIndex = replaceable[random.nextInt(replaceable.size)]

        return swap(deal, replaceIndex, newCard, random)
    }

    /** Recolours the fewest cards needed to make four of one suit. */
    internal fun toFlushDraw(deal: Deal, random: Random): Deal {
        val suitCounts = deal.hand.groupingBy { it.suit }.eachCount()
        // Ties go to the suit seen first, matching the web app's reduce().
        val bestSuit = suitCounts.keys.reduce { a, b -> if (suitCounts.getValue(a) >= suitCounts.getValue(b)) a else b }
        val count = suitCounts.getValue(bestSuit)
        if (count >= FLUSH_TARGET) return deal

        val otherIndices = deal.hand.indices.filter { deal.hand[it].suit != bestSuit }.toMutableList()
        val usedRanks = deal.hand.filter { it.suit == bestSuit }.map { it.rank }.toMutableSet()
        var current = deal
        var needed = FLUSH_TARGET - count

        while (needed > 0 && otherIndices.isNotEmpty()) {
            val index = otherIndices.removeAt(random.nextInt(otherIndices.size))
            val availableRanks = Rank.entries.filter { it !in usedRanks }
            if (availableRanks.isEmpty()) break
            val newRank = availableRanks[random.nextInt(availableRanks.size)]
            usedRanks += newRank
            current = swap(current, index, Card(newRank, bestSuit), random)
            needed--
        }
        return current
    }

    /**
     * Puts [newCard] into the hand at [index]; the card it replaces goes back to a random place
     * in the deck. Draws take from the end, so parking it there made it the first card drawn:
     * a boosted four-to-a-flush could never complete (fixed in js/game.js returnToDeck() too).
     */
    private fun swap(deal: Deal, index: Int, newCard: Card, random: Random): Deal {
        val oldCard = deal.hand[index]
        val hand = deal.hand.toMutableList().also { it[index] = newCard }
        val deck = deal.deck.filter { it != newCard }.toMutableList()
        deck.add(random.nextInt(deck.size + 1), oldCard)
        return Deal(hand, deck)
    }
}
