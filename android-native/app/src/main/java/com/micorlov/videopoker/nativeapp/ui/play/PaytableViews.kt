package com.micorlov.videopoker.nativeapp.ui.play

import androidx.compose.animation.animateContentSize
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.micorlov.videopoker.nativeapp.R
import com.micorlov.videopoker.nativeapp.domain.GameState
import com.micorlov.videopoker.nativeapp.domain.HandType
import com.micorlov.videopoker.nativeapp.ui.components.Eyebrow
import com.micorlov.videopoker.nativeapp.ui.components.VpPanel
import com.micorlov.videopoker.nativeapp.ui.text.labelRes
import com.micorlov.videopoker.nativeapp.ui.text.tickerRes
import com.micorlov.videopoker.nativeapp.ui.theme.VpColors

private const val TICKER_HANDS = 4

/** The pay table for the current game: a four-hand ticker that expands into the full list on tap. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun PaytableCard(game: GameState, highlight: HandType?, modifier: Modifier = Modifier) {
    var expanded by rememberSaveable { mutableStateOf(false) }

    VpPanel(
        modifier
            .fillMaxWidth()
            .animateContentSize()
            .clip(RoundedCornerShape(20.dp))
            .clickable(role = Role.Button) { expanded = !expanded }
            .testTag("paytable"),
    ) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Eyebrow(stringResource(R.string.play_paytable))
                Text(
                    text = stringResource(game.variant.labelRes()),
                    color = VpColors.Text,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.SemiBold,
                )
            }
            Text(
                text = if (expanded) "▴" else "▾",
                modifier = Modifier.clearAndSetSemantics { },
                color = VpColors.TextMuted,
                fontSize = 16.sp,
            )
        }
        if (expanded) {
            PaytableList(game, highlight, Modifier.padding(top = 10.dp))
        } else {
            FlowRow(
                Modifier.padding(top = 10.dp),
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                game.variant.handOrder
                    .filter { game.payoutFor(it) > 0 }
                    .take(TICKER_HANDS)
                    .forEach { TickerChip(it, game) }
            }
        }
    }
}

@Composable
private fun TickerChip(type: HandType, game: GameState) {
    Text(
        text = stringResource(type.tickerRes()) + " " + game.payoutFor(type) + "×",
        modifier = Modifier
            .clip(RoundedCornerShape(10.dp))
            .background(VpColors.SurfaceRaised)
            .padding(horizontal = 9.dp, vertical = 5.dp),
        color = if (game.payoutBonus > 0) VpColors.Gold else VpColors.TextMuted,
        fontSize = 12.sp,
        fontWeight = FontWeight.SemiBold,
    )
}

/**
 * Every paying hand with its multiple of the bet. After a losing streak the multiples
 * climb (the loss escalator) and turn gold; [highlight] marks the hand just scored.
 */
@Composable
fun PaytableList(game: GameState, highlight: HandType?, modifier: Modifier = Modifier) {
    Column(modifier.fillMaxWidth()) {
        game.variant.handOrder.filter { it != HandType.NOTHING }.forEach { type ->
            val scored = type == highlight
            Row(
                Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(8.dp))
                    .background(if (scored) Color(0x2EFFC93C) else Color.Transparent)
                    .padding(horizontal = 8.dp, vertical = 6.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = stringResource(type.labelRes()),
                    modifier = Modifier.weight(1f),
                    color = if (scored) VpColors.Gold else VpColors.Text,
                    fontSize = 14.sp,
                    fontWeight = if (scored) FontWeight.Bold else FontWeight.Normal,
                )
                Text(
                    text = game.payoutFor(type).toString(),
                    style = TabularFigures,
                    color = if (game.payoutBonus > 0 || scored) VpColors.Gold else VpColors.TextMuted,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                )
            }
        }
    }
}
