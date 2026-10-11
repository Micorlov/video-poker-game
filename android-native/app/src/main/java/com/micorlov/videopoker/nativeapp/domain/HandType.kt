package com.micorlov.videopoker.nativeapp.domain

/**
 * Every hand a paytable can name. [key] is the English name the web app uses as its
 * internal identifier (and in stored data); [strength] is the web app's HAND_RANK,
 * used to pick the "best hand" across a multi-hand deal and to size celebrations.
 */
enum class HandType(val key: String, val strength: Int) {
    ROYAL_FLUSH("Royal Flush", 9),
    FOUR_DEUCES("Four Deuces", 8),
    WILD_ROYAL_FLUSH("Wild Royal Flush", 8),
    FIVE_OF_A_KIND("Five of a Kind", 7),
    STRAIGHT_FLUSH("Straight Flush", 8),
    FOUR_ACES("Four Aces", 7),
    FOUR_2S_4S("Four 2s-4s", 7),
    FOUR_5S_KS("Four 5s-Ks", 7),
    FOUR_OF_A_KIND("Four of a Kind", 7),
    FULL_HOUSE("Full House", 6),
    FLUSH("Flush", 5),
    STRAIGHT("Straight", 4),
    THREE_OF_A_KIND("Three of a Kind", 3),
    TWO_PAIR("Two Pair", 2),
    JACKS_OR_BETTER("Jacks or Better", 1),
    NOTHING("Nothing", 0),
    ;

    val isFourOfAKind: Boolean
        get() = this == FOUR_OF_A_KIND || this == FOUR_ACES || this == FOUR_2S_4S || this == FOUR_5S_KS

    companion object {
        fun fromKey(key: String): HandType = entries.first { it.key == key }
    }
}

/**
 * What an evaluation found. The index lists say which of the five cards to highlight:
 * [winIndices] is the primary group, [secondPairIndices] the second pair / the pair in a
 * full house, and [thirdMatchIndices] marks the lead jack of three jacks (a UI flourish
 * carried over from the web app).
 */
data class HandResult(
    val type: HandType,
    val winIndices: List<Int> = emptyList(),
    val secondPairIndices: List<Int> = emptyList(),
    val thirdMatchIndices: List<Int> = emptyList(),
)
