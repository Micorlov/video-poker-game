package com.micorlov.videopoker.nativeapp.domain

import com.micorlov.videopoker.nativeapp.domain.HandType.FIVE_OF_A_KIND
import com.micorlov.videopoker.nativeapp.domain.HandType.FLUSH
import com.micorlov.videopoker.nativeapp.domain.HandType.FOUR_2S_4S
import com.micorlov.videopoker.nativeapp.domain.HandType.FOUR_5S_KS
import com.micorlov.videopoker.nativeapp.domain.HandType.FOUR_ACES
import com.micorlov.videopoker.nativeapp.domain.HandType.FOUR_DEUCES
import com.micorlov.videopoker.nativeapp.domain.HandType.FOUR_OF_A_KIND
import com.micorlov.videopoker.nativeapp.domain.HandType.FULL_HOUSE
import com.micorlov.videopoker.nativeapp.domain.HandType.JACKS_OR_BETTER
import com.micorlov.videopoker.nativeapp.domain.HandType.NOTHING
import com.micorlov.videopoker.nativeapp.domain.HandType.ROYAL_FLUSH
import com.micorlov.videopoker.nativeapp.domain.HandType.STRAIGHT
import com.micorlov.videopoker.nativeapp.domain.HandType.STRAIGHT_FLUSH
import com.micorlov.videopoker.nativeapp.domain.HandType.THREE_OF_A_KIND
import com.micorlov.videopoker.nativeapp.domain.HandType.TWO_PAIR
import com.micorlov.videopoker.nativeapp.domain.HandType.WILD_ROYAL_FLUSH

/**
 * The four games. [paytable] maps a hand to its multiple of the bet, listed best hand
 * first (the order the pay table is displayed in). [minLevel] is the player level at
 * which the variant unlocks.
 */
enum class Variant(
    val storageKey: String,
    val minLevel: Int,
    val paytable: Map<HandType, Int>,
) {
    JACKS(
        storageKey = "jacks",
        minLevel = 1,
        paytable = linkedMapOf(
            ROYAL_FLUSH to 250,
            STRAIGHT_FLUSH to 50,
            FOUR_OF_A_KIND to 20,
            FULL_HOUSE to 7,
            FLUSH to 5,
            STRAIGHT to 4,
            THREE_OF_A_KIND to 3,
            TWO_PAIR to 2,
            JACKS_OR_BETTER to 1,
            NOTHING to 0,
        ),
    ),
    DEUCES(
        storageKey = "deuces",
        minLevel = 3,
        paytable = linkedMapOf(
            ROYAL_FLUSH to 250,
            FOUR_DEUCES to 200,
            WILD_ROYAL_FLUSH to 25,
            FIVE_OF_A_KIND to 15,
            STRAIGHT_FLUSH to 9,
            FOUR_OF_A_KIND to 5,
            FULL_HOUSE to 3,
            FLUSH to 2,
            STRAIGHT to 2,
            THREE_OF_A_KIND to 1,
            NOTHING to 0,
        ),
    ),
    BONUS(
        storageKey = "bonus",
        minLevel = 8,
        paytable = linkedMapOf(
            ROYAL_FLUSH to 250,
            STRAIGHT_FLUSH to 50,
            FOUR_ACES to 80,
            FOUR_2S_4S to 40,
            FOUR_5S_KS to 25,
            FULL_HOUSE to 8,
            FLUSH to 5,
            STRAIGHT to 4,
            THREE_OF_A_KIND to 3,
            TWO_PAIR to 2,
            JACKS_OR_BETTER to 1,
            NOTHING to 0,
        ),
    ),
    DOUBLE_BONUS(
        storageKey = "doubleBonus",
        minLevel = 15,
        paytable = linkedMapOf(
            ROYAL_FLUSH to 250,
            STRAIGHT_FLUSH to 50,
            FOUR_ACES to 160,
            FOUR_2S_4S to 80,
            FOUR_5S_KS to 50,
            FULL_HOUSE to 10,
            FLUSH to 7,
            STRAIGHT to 5,
            THREE_OF_A_KIND to 3,
            TWO_PAIR to 1,
            JACKS_OR_BETTER to 1,
            NOTHING to 0,
        ),
    ),
    ;

    /** Hands in display order, best first. */
    val handOrder: List<HandType> get() = paytable.keys.toList()

    fun basePayout(type: HandType): Int = paytable[type] ?: 0

    companion object {
        fun fromStorageKey(key: String?): Variant? = entries.firstOrNull { it.storageKey == key }
    }
}
