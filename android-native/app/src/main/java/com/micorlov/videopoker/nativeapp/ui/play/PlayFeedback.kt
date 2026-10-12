package com.micorlov.videopoker.nativeapp.ui.play

import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.micorlov.videopoker.nativeapp.R
import com.micorlov.videopoker.nativeapp.domain.DoubleUp
import com.micorlov.videopoker.nativeapp.domain.DoubleUpResult
import com.micorlov.videopoker.nativeapp.domain.HoldAnalysis
import com.micorlov.videopoker.nativeapp.ui.DecisionReview
import com.micorlov.videopoker.nativeapp.ui.text.formatDecimal
import com.micorlov.videopoker.nativeapp.ui.text.formatNumber
import com.micorlov.videopoker.nativeapp.ui.theme.VpColors

private const val EV_DIGITS = 2
private const val COST_DIGITS = 1
private const val WHOLE_CHIPS_FROM = 100.0

/** Hints on, holds being chosen: what the best hold and the current one are worth per credit bet. */
@Composable
fun EvLine(analysis: HoldAnalysis, held: List<Boolean>, modifier: Modifier = Modifier) {
    val yours = analysis.ev(held)
    Text(
        text = stringResource(R.string.play_ev_line, formatDecimal(analysis.bestEv, EV_DIGITS), formatDecimal(yours, EV_DIGITS)),
        modifier = modifier
            .fillMaxWidth()
            .testTag("ev-line"),
        color = if (analysis.isBest(held)) VpColors.Hint else VpColors.TextMuted,
        fontSize = 13.sp,
        fontWeight = FontWeight.SemiBold,
        textAlign = TextAlign.Center,
    )
}

/** After a draw: was that the best play, and if not, what it was and what the choice cost. */
@Composable
fun ReviewLine(review: DecisionReview, modifier: Modifier = Modifier) {
    Column(
        modifier
            .fillMaxWidth()
            .padding(top = 8.dp)
            .testTag("review-line"),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        if (review.best) {
            Text(stringResource(R.string.play_review_best), color = VpColors.Positive, fontSize = 14.sp, fontWeight = FontWeight.Bold)
            return@Column
        }
        val play = if (review.bestCards.isEmpty()) {
            stringResource(R.string.play_review_discard)
        } else {
            stringResource(R.string.play_review_hold, review.bestCards.joinToString(" "))
        }
        Text(play, color = VpColors.Hint, fontSize = 14.sp, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center)
        Text(
            text = stringResource(R.string.play_review_cost, formatCost(review.cost)),
            color = VpColors.TextMuted,
            fontSize = 12.sp,
            textAlign = TextAlign.Center,
        )
    }
}

/** Chips lost to mistakes: one decimal while small, whole chips once they add up. */
fun formatCost(cost: Double): String =
    if (cost >= WHOLE_CHIPS_FROM) formatNumber(Math.round(cost)) else formatDecimal(cost, COST_DIGITS)

/** The gold "Double up 40" pill under a win. Deal (the main button) collects instead. */
@Composable
fun DoubleUpButton(stake: Long, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val shape = RoundedCornerShape(14.dp)
    Column(modifier.fillMaxWidth().padding(top = 10.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Text(
            text = stringResource(R.string.play_double_up, formatNumber(stake)),
            modifier = Modifier
                .heightIn(min = 44.dp)
                .clip(shape)
                .border(2.dp, VpColors.Gold, shape)
                .clickable(role = Role.Button, onClick = onClick)
                .padding(horizontal = 20.dp, vertical = 11.dp)
                .testTag("double-up-button"),
            color = VpColors.Gold,
            fontSize = 15.sp,
            fontWeight = FontWeight.Bold,
        )
        Text(
            text = stringResource(R.string.play_collect_hint),
            modifier = Modifier.padding(top = 4.dp),
            color = VpColors.TextFaint,
            fontSize = 11.sp,
        )
    }
}

/** The result panel while a double-up is on the table. */
@Composable
fun DoubleUpStatus(doubleUp: DoubleUp, revealed: Boolean, nextStake: Long?, onDoubleUp: () -> Unit) {
    Column(Modifier.fillMaxWidth().testTag("double-up-status"), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(4.dp)) {
        val result = doubleUp.result
        if (result == null || !revealed) {
            Text(
                text = stringResource(R.string.play_double_up_rules, formatNumber(doubleUp.stake * 2)),
                color = VpColors.Text,
                fontSize = 15.sp,
                textAlign = TextAlign.Center,
            )
            return@Column
        }
        val (text, color) = when (result) {
            DoubleUpResult.WIN -> stringResource(R.string.play_double_up_win, formatNumber(doubleUp.returned)) to VpColors.Gold
            DoubleUpResult.PUSH -> stringResource(R.string.play_double_up_push, formatNumber(doubleUp.returned)) to VpColors.Text
            DoubleUpResult.LOSE -> stringResource(R.string.play_double_up_lose, formatNumber(doubleUp.stake)) to VpColors.Negative
        }
        Text(text, modifier = Modifier.testTag("double-up-result"), color = color, fontSize = 20.sp, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center)
        nextStake?.let { DoubleUpButton(it, onDoubleUp) }
    }
}
