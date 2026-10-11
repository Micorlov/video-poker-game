package com.micorlov.videopoker.nativeapp.domain

enum class Suit(val symbol: Char, val isRed: Boolean) {
    SPADES('♠', false),
    HEARTS('♥', true),
    DIAMONDS('♦', true),
    CLUBS('♣', false),
}

/** [value] is the poker value with the ace high (14); a wheel straight is handled by the evaluators. */
enum class Rank(val label: String, val value: Int) {
    ACE("A", 14),
    TWO("2", 2),
    THREE("3", 3),
    FOUR("4", 4),
    FIVE("5", 5),
    SIX("6", 6),
    SEVEN("7", 7),
    EIGHT("8", 8),
    NINE("9", 9),
    TEN("10", 10),
    JACK("J", 11),
    QUEEN("Q", 12),
    KING("K", 13),
}

data class Card(val rank: Rank, val suit: Suit) {
    override fun toString(): String = "${rank.label}${suit.symbol}"
}

/** Same order as the web app's createDeck(): suits outer, ranks inner. */
fun standardDeck(): List<Card> = Suit.entries.flatMap { suit -> Rank.entries.map { rank -> Card(rank, suit) } }
