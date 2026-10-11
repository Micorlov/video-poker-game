package com.micorlov.videopoker.nativeapp.ui.text

import androidx.annotation.StringRes
import androidx.compose.runtime.Composable
import androidx.compose.ui.res.stringArrayResource
import androidx.compose.ui.res.stringResource
import com.micorlov.videopoker.nativeapp.R
import com.micorlov.videopoker.nativeapp.domain.Card
import com.micorlov.videopoker.nativeapp.domain.HandType
import com.micorlov.videopoker.nativeapp.domain.Variant
import java.text.NumberFormat

/** What the voice says: the label, except that the quad ranges are spelled out as a phrase. */
@StringRes
fun HandType.spokenRes(): Int = when (this) {
    HandType.FOUR_2S_4S -> R.string.voice_four_2s_4s
    HandType.FOUR_5S_KS -> R.string.voice_four_5s_ks
    else -> labelRes()
}

@StringRes
fun HandType.labelRes(): Int = when (this) {
    HandType.ROYAL_FLUSH -> R.string.hand_royal_flush
    HandType.STRAIGHT_FLUSH -> R.string.hand_straight_flush
    HandType.FOUR_OF_A_KIND -> R.string.hand_four_of_a_kind
    HandType.FOUR_ACES -> R.string.hand_four_aces
    HandType.FOUR_2S_4S -> R.string.hand_four_2s_4s
    HandType.FOUR_5S_KS -> R.string.hand_four_5s_ks
    HandType.FOUR_DEUCES -> R.string.hand_four_deuces
    HandType.WILD_ROYAL_FLUSH -> R.string.hand_wild_royal_flush
    HandType.FIVE_OF_A_KIND -> R.string.hand_five_of_a_kind
    HandType.FULL_HOUSE -> R.string.hand_full_house
    HandType.FLUSH -> R.string.hand_flush
    HandType.STRAIGHT -> R.string.hand_straight
    HandType.THREE_OF_A_KIND -> R.string.hand_three_of_a_kind
    HandType.TWO_PAIR -> R.string.hand_two_pair
    HandType.JACKS_OR_BETTER -> R.string.hand_jacks_or_better
    HandType.NOTHING -> R.string.hand_nothing
}

@StringRes
fun HandType.explanationRes(): Int = when (this) {
    HandType.ROYAL_FLUSH -> R.string.exp_royal_flush
    HandType.STRAIGHT_FLUSH -> R.string.exp_straight_flush
    HandType.FOUR_OF_A_KIND -> R.string.exp_four_of_a_kind
    HandType.FOUR_ACES -> R.string.exp_four_aces
    HandType.FOUR_2S_4S -> R.string.exp_four_2s_4s
    HandType.FOUR_5S_KS -> R.string.exp_four_5s_ks
    HandType.FOUR_DEUCES -> R.string.exp_four_deuces
    HandType.WILD_ROYAL_FLUSH -> R.string.exp_wild_royal_flush
    HandType.FIVE_OF_A_KIND -> R.string.exp_five_of_a_kind
    HandType.FULL_HOUSE -> R.string.exp_full_house
    HandType.FLUSH -> R.string.exp_flush
    HandType.STRAIGHT -> R.string.exp_straight
    HandType.THREE_OF_A_KIND -> R.string.exp_three_of_a_kind
    HandType.TWO_PAIR -> R.string.exp_two_pair
    HandType.JACKS_OR_BETTER -> R.string.exp_jacks_or_better
    HandType.NOTHING -> R.string.exp_nothing
}

@StringRes
fun HandType.tickerRes(): Int = when (this) {
    HandType.ROYAL_FLUSH -> R.string.ticker_royal_flush
    HandType.STRAIGHT_FLUSH -> R.string.ticker_straight_flush
    HandType.FOUR_OF_A_KIND -> R.string.ticker_four_of_a_kind
    HandType.FOUR_ACES -> R.string.ticker_four_aces
    HandType.FOUR_2S_4S -> R.string.ticker_four_2s_4s
    HandType.FOUR_5S_KS -> R.string.ticker_four_5s_ks
    HandType.FOUR_DEUCES -> R.string.ticker_four_deuces
    HandType.WILD_ROYAL_FLUSH -> R.string.ticker_wild_royal_flush
    HandType.FIVE_OF_A_KIND -> R.string.ticker_five_of_a_kind
    HandType.FULL_HOUSE -> R.string.ticker_full_house
    HandType.FLUSH -> R.string.ticker_flush
    HandType.STRAIGHT -> R.string.ticker_straight
    HandType.THREE_OF_A_KIND -> R.string.ticker_three_of_a_kind
    HandType.TWO_PAIR -> R.string.ticker_two_pair
    HandType.JACKS_OR_BETTER -> R.string.ticker_jacks_or_better
    HandType.NOTHING -> R.string.ticker_nothing
}

@StringRes
fun Variant.labelRes(): Int = when (this) {
    Variant.JACKS -> R.string.variant_jacks
    Variant.DEUCES -> R.string.variant_deuces
    Variant.BONUS -> R.string.variant_bonus
    Variant.DOUBLE_BONUS -> R.string.variant_double_bonus
}

/** Chip counts follow the phone's locale, as the web app's follow the app language. */
fun formatNumber(value: Long): String = NumberFormat.getIntegerInstance().format(value)

fun formatNumber(value: Int): String = formatNumber(value.toLong())

/** '+1,200' / '-340' / '0', for net results. */
fun formatSigned(value: Long): String = when {
    value > 0 -> "+" + formatNumber(value)
    else -> formatNumber(value)
}

/** The badge a highlighted card wears: "Pair J", "3 of a Kind", "Flush"... [rankSuffix] follows the label. */
data class WinBadge(@param:StringRes val label: Int, val rankSuffix: String? = null)

/** Port of getWinBadgeText() from js/game.js. Hands with no badge (the deuces specials) return null. */
fun winBadgeFor(hand: List<Card>, type: HandType, index: Int): WinBadge? {
    val card = hand[index]
    val sameRank = hand.count { it.rank == card.rank }
    return when (type) {
        HandType.JACKS_OR_BETTER, HandType.TWO_PAIR -> WinBadge(R.string.win_pair, card.rank.label)
        HandType.THREE_OF_A_KIND -> WinBadge(R.string.win_three_of_a_kind)
        HandType.FULL_HOUSE -> when (sameRank) {
            3 -> WinBadge(R.string.win_three_of_a_kind)
            2 -> WinBadge(R.string.win_pair, card.rank.label)
            else -> null
        }
        HandType.FOUR_OF_A_KIND, HandType.FOUR_ACES, HandType.FOUR_2S_4S, HandType.FOUR_5S_KS ->
            WinBadge(R.string.win_four_of_a_kind)
        HandType.STRAIGHT -> WinBadge(R.string.win_straight)
        HandType.FLUSH -> WinBadge(R.string.win_flush)
        HandType.STRAIGHT_FLUSH -> WinBadge(R.string.win_straight_flush)
        HandType.ROYAL_FLUSH -> WinBadge(R.string.win_royal_flush)
        else -> null
    }
}

@Composable
fun WinBadge.text(): String = stringResource(label) + (rankSuffix?.let { " $it" } ?: "")

/** "Ace of Spades", with ", held" appended when the card is held; for screen readers. */
@Composable
fun cardDescription(card: Card, held: Boolean): String {
    val rank = stringArrayResource(R.array.rank_names)[card.rank.ordinal]
    val suit = stringArrayResource(R.array.suit_names)[card.suit.ordinal]
    val base = stringResource(R.string.card_description, rank, suit)
    return if (held) base + stringResource(R.string.card_held_suffix) else base
}
