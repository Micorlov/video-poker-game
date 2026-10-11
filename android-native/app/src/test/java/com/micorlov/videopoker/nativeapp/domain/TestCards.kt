package com.micorlov.videopoker.nativeapp.domain

/** Parses "10♥" / "A♠" — the same text the web app and the golden fixtures use. */
fun card(text: String): Card {
    val rankLabel = text.dropLast(1)
    val suitSymbol = text.last()
    val rank = Rank.entries.first { it.label == rankLabel }
    val suit = Suit.entries.first { it.symbol == suitSymbol }
    return Card(rank, suit)
}

/** Parses a space-separated hand: "A♠ K♥ 10♦ 2♣ 3♠". */
fun hand(text: String): List<Card> = text.trim().split(" ").filter { it.isNotEmpty() }.map(::card)
