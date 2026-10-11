package com.micorlov.videopoker.nativeapp.ui.play

import androidx.compose.animation.animateContentSize
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LongState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.TileMode
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.micorlov.videopoker.nativeapp.R
import com.micorlov.videopoker.nativeapp.domain.Card
import com.micorlov.videopoker.nativeapp.domain.DrawOutcome
import com.micorlov.videopoker.nativeapp.domain.GameState
import com.micorlov.videopoker.nativeapp.domain.Phase
import com.micorlov.videopoker.nativeapp.domain.Rules
import com.micorlov.videopoker.nativeapp.ui.components.ChipButton
import com.micorlov.videopoker.nativeapp.ui.components.Eyebrow
import com.micorlov.videopoker.nativeapp.ui.components.VpPanel
import com.micorlov.videopoker.nativeapp.ui.text.explanationRes
import com.micorlov.videopoker.nativeapp.ui.text.formatNumber
import com.micorlov.videopoker.nativeapp.ui.text.labelRes
import com.micorlov.videopoker.nativeapp.ui.theme.VpColors
import kotlin.math.roundToInt

/** Money is compared column to column: digits must not reflow as they change. */
val TabularFigures = TextStyle(fontFeatureSettings = "tnum")

@Composable
fun BalancePanel(displayedBalance: LongState, game: GameState, modifier: Modifier = Modifier) {
    VpPanel(modifier.fillMaxWidth(), raised = true) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.Bottom) {
            Column {
                Eyebrow(stringResource(R.string.play_balance))
                Text(
                    text = formatNumber(displayedBalance.longValue),
                    modifier = Modifier.testTag("balance"),
                    style = TabularFigures,
                    color = VpColors.Text,
                    fontSize = 34.sp,
                    fontWeight = FontWeight.Bold,
                )
            }
            Column(horizontalAlignment = Alignment.End) {
                Eyebrow(stringResource(R.string.play_total_bet))
                Text(
                    text = formatNumber(game.totalBet),
                    modifier = Modifier.testTag("total-bet"),
                    style = TabularFigures,
                    color = VpColors.Gold,
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Bold,
                )
            }
        }
    }
}

/** The stake is locked for the length of a hand: chips only respond between hands. */
@Composable
fun BetRow(game: GameState, onSelectBet: (Int) -> Unit, modifier: Modifier = Modifier) {
    Row(modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Rules.BET_OPTIONS.forEach { amount ->
            ChipButton(
                label = amount.toString(),
                selected = game.bet == amount,
                enabled = game.phase == Phase.BET,
                onClick = { onSelectBet(amount) },
                modifier = Modifier
                    .weight(1f)
                    .testTag("bet-$amount"),
            )
        }
    }
}

/** What the last hand paid, shown once its cards are face up. Before that, a hint for the next move. */
@Composable
fun ResultPanel(game: GameState, revealed: Boolean, modifier: Modifier = Modifier) {
    val outcome = game.outcome
    // A polite live region: TalkBack reads out the result when it appears, with no need to hunt for it.
    VpPanel(
        modifier
            .fillMaxWidth()
            .animateContentSize()
            .semantics { liveRegion = LiveRegionMode.Polite }
            .testTag("result-panel"),
    ) {
        when {
            outcome == null || !revealed -> HintText(
                if (game.phase == Phase.HOLD) R.string.play_hint_hold else R.string.play_hint_bet,
            )
            outcome.isWin -> WinResult(game, outcome)
            else -> LossResult(game)
        }
    }
}

@Composable
private fun HintText(textRes: Int) {
    Text(
        text = stringResource(textRes),
        modifier = Modifier.fillMaxWidth(),
        color = VpColors.TextMuted,
        fontSize = 14.sp,
        textAlign = TextAlign.Center,
    )
}

/** Two pair or less: the web app's "gold shimmer" tier, a cream highlight sweeping across the payout. */
private const val SHIMMER_MAX_STRENGTH = 2
private const val SHIMMER_PERIOD_MS = 1500
private const val SHIMMER_SPAN_PX = 400f
private val ShimmerCream = Color(0xFFFFF5CC)

@Composable
private fun shimmerGold(): TextStyle {
    val offset by rememberInfiniteTransition(label = "shimmer").animateFloat(
        initialValue = 0f,
        targetValue = SHIMMER_SPAN_PX,
        animationSpec = infiniteRepeatable(tween(SHIMMER_PERIOD_MS, easing = LinearEasing)),
        label = "shimmer-offset",
    )
    val brush = Brush.linearGradient(
        colors = listOf(VpColors.Gold, ShimmerCream, VpColors.Gold),
        start = Offset(offset - SHIMMER_SPAN_PX, 0f),
        end = Offset(offset, 0f),
        tileMode = TileMode.Repeated,
    )
    return TextStyle(brush = brush)
}

@Composable
private fun WinResult(game: GameState, outcome: DrawOutcome) {
    val type = outcome.result.type
    Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
        Text(
            text = stringResource(type.labelRes()),
            color = VpColors.Text,
            fontSize = 20.sp,
            fontWeight = FontWeight.Bold,
        )
        Row(verticalAlignment = Alignment.Bottom) {
            Text(
                text = "+" + formatNumber(outcome.totalWin),
                modifier = Modifier.testTag("win-amount"),
                style = if (type.strength <= SHIMMER_MAX_STRENGTH) TabularFigures.merge(shimmerGold()) else TabularFigures,
                color = VpColors.Gold,
                fontSize = 34.sp,
                fontWeight = FontWeight.Bold,
            )
            if (outcome.multiplier > 0) {
                Text(
                    text = "  ${outcome.multiplier}×",
                    modifier = Modifier.padding(bottom = 6.dp),
                    color = VpColors.TextMuted,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.SemiBold,
                )
            }
        }
        if (outcome.streakBonus > 0) {
            Text(
                text = stringResource(R.string.play_streak_bonus_included, formatNumber(outcome.streakBonus)),
                color = VpColors.Gold,
                fontSize = 12.sp,
            )
        }
        Text(
            text = stringResource(type.explanationRes()),
            modifier = Modifier.padding(top = 4.dp),
            color = VpColors.TextMuted,
            fontSize = 13.sp,
            textAlign = TextAlign.Center,
        )
    }
}

@Composable
private fun LossResult(game: GameState) {
    Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
        Text(
            text = stringResource(R.string.play_nothing, game.hand.joinToString(" ")),
            color = VpColors.Text,
            fontSize = 16.sp,
            fontWeight = FontWeight.SemiBold,
            textAlign = TextAlign.Center,
        )
        Text(
            text = stringResource(R.string.exp_nothing),
            modifier = Modifier.padding(top = 4.dp),
            color = VpColors.TextMuted,
            fontSize = 13.sp,
            textAlign = TextAlign.Center,
        )
    }
}

/** Triple / Five Play: every extra hand with its own result. */
@Composable
fun ExtraHandsPanel(outcome: DrawOutcome, modifier: Modifier = Modifier) {
    VpPanel(modifier.fillMaxWidth().testTag("extra-hands")) {
        Eyebrow(stringResource(R.string.play_extra_hands))
        Column(Modifier.padding(top = 8.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            outcome.extraHands.forEach { extra ->
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    extra.cards.forEach { MiniCard(it) }
                    Spacer(Modifier.weight(1f))
                    if (extra.win > 0) {
                        Text(
                            text = stringResource(extra.type.labelRes()) + " +" + formatNumber(extra.win),
                            color = VpColors.Gold,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold,
                        )
                    } else {
                        Text("—", color = VpColors.TextFaint, fontSize = 14.sp)
                    }
                }
            }
        }
    }
}

@Composable
private fun MiniCard(card: Card) {
    Box(
        Modifier
            .clip(RoundedCornerShape(6.dp))
            .background(VpColors.CardFaceBottom)
            .padding(horizontal = 4.dp, vertical = 2.dp),
    ) {
        Text(
            text = card.toString(),
            color = if (card.suit.isRed) VpColors.CardRed else VpColors.CardBlack,
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold,
        )
    }
}

/** The win streak, with the payout bonus it has earned. Lights up from the second win in a row. */
@Composable
fun StreakBar(game: GameState, modifier: Modifier = Modifier) {
    val bonusPercent = (Rules.streakBonus(game.winStreak) * 100).roundToInt()
    Row(
        modifier = modifier
            .fillMaxWidth()
            .alpha(if (game.winStreak >= 2) 1f else 0.6f)
            .testTag("streak-bar"),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text("🔥", fontSize = 16.sp)
        Text(stringResource(R.string.play_win_streak), color = VpColors.TextMuted, fontSize = 14.sp)
        Text(game.winStreak.toString(), color = VpColors.Gold, fontSize = 16.sp, fontWeight = FontWeight.Bold)
        Spacer(Modifier.weight(1f))
        if (bonusPercent > 0) {
            Text(
                text = stringResource(R.string.play_payout_bonus, bonusPercent),
                modifier = Modifier
                    .clip(RoundedCornerShape(8.dp))
                    .background(VpColors.Gold)
                    .padding(horizontal = 8.dp, vertical = 3.dp),
                color = VpColors.GoldInk,
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
            )
        }
    }
}
