package com.micorlov.videopoker.nativeapp.ui.stats

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.micorlov.videopoker.nativeapp.R
import com.micorlov.videopoker.nativeapp.domain.BestHand
import com.micorlov.videopoker.nativeapp.domain.GameState
import com.micorlov.videopoker.nativeapp.domain.PlayStats
import com.micorlov.videopoker.nativeapp.domain.Rules
import com.micorlov.videopoker.nativeapp.ui.components.ChipButton
import com.micorlov.videopoker.nativeapp.ui.components.Eyebrow
import com.micorlov.videopoker.nativeapp.ui.components.VpPanel
import com.micorlov.videopoker.nativeapp.ui.play.TabularFigures
import com.micorlov.videopoker.nativeapp.ui.text.formatNumber
import com.micorlov.videopoker.nativeapp.ui.text.formatSigned
import com.micorlov.videopoker.nativeapp.ui.text.labelRes
import com.micorlov.videopoker.nativeapp.ui.theme.LocalPalette
import com.micorlov.videopoker.nativeapp.ui.theme.VpColors

private enum class StatsTab { TODAY, ALL_TIME }

@Composable
fun StatsScreen(game: GameState, modifier: Modifier = Modifier) {
    var tab by rememberSaveable { mutableStateOf(StatsTab.TODAY) }
    val stats = if (tab == StatsTab.TODAY) game.today else game.allTime

    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 16.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text(
            text = stringResource(R.string.stats_title),
            color = VpColors.Text,
            fontSize = 24.sp,
            fontWeight = FontWeight.Bold,
        )

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            ChipButton(
                label = stringResource(R.string.stats_today),
                selected = tab == StatsTab.TODAY,
                onClick = { tab = StatsTab.TODAY },
                modifier = Modifier.weight(1f).testTag("stats-today"),
            )
            ChipButton(
                label = stringResource(R.string.stats_all_time),
                selected = tab == StatsTab.ALL_TIME,
                onClick = { tab = StatsTab.ALL_TIME },
                modifier = Modifier.weight(1f).testTag("stats-all-time"),
            )
        }

        NetPanel(stats)

        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            StatTile(stringResource(R.string.stats_won), formatSigned(stats.won), Modifier.weight(1f).testTag("stat-won"))
            StatTile(stringResource(R.string.stats_lost), formatSigned(-stats.lost), Modifier.weight(1f).testTag("stat-lost"))
        }
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            StatTile(stringResource(R.string.stats_hands), formatNumber(stats.handsPlayed), Modifier.weight(1f).testTag("stat-hands"))
            StatTile(stringResource(R.string.stats_best_streak), stats.bestStreak.toString(), Modifier.weight(1f).testTag("stat-streak"))
        }

        BestHandPanel(game.bestHand)
        ProgressPanel(game)
    }
}

@Composable
private fun BestHandPanel(best: BestHand?) {
    VpPanel(Modifier.fillMaxWidth().testTag("best-hand")) {
        Eyebrow(stringResource(R.string.stats_best_hand))
        if (best == null) {
            Text(stringResource(R.string.stats_no_winning_hands), color = VpColors.TextMuted, fontSize = 14.sp)
            return@VpPanel
        }
        Text(
            text = stringResource(best.type.labelRes()),
            color = VpColors.Text,
            fontSize = 18.sp,
            fontWeight = FontWeight.Bold,
        )
        Text(
            text = best.cards.joinToString("  "),
            modifier = Modifier.testTag("best-hand-cards"),
            color = VpColors.TextMuted,
            fontSize = 16.sp,
        )
        Text(
            text = stringResource(R.string.stats_best_hand_payout, formatNumber(best.payout.toLong()), best.multiple),
            modifier = Modifier.testTag("best-hand-payout"),
            color = VpColors.Gold,
            fontSize = 15.sp,
            fontWeight = FontWeight.SemiBold,
        )
    }
}

@Composable
private fun NetPanel(stats: PlayStats) {
    val net = stats.net
    val color = when {
        net > 0 -> VpColors.Positive
        net < 0 -> VpColors.Negative
        else -> VpColors.Text
    }
    VpPanel(Modifier.fillMaxWidth(), raised = true) {
        Eyebrow(stringResource(R.string.stats_net))
        Text(
            text = formatSigned(net),
            modifier = Modifier.testTag("stat-net"),
            style = TabularFigures,
            color = color,
            fontSize = 44.sp,
            fontWeight = FontWeight.Bold,
        )
    }
}

@Composable
private fun StatTile(label: String, value: String, modifier: Modifier = Modifier) {
    VpPanel(modifier) {
        Eyebrow(label)
        Text(
            text = value,
            modifier = Modifier.padding(top = 4.dp),
            style = TabularFigures,
            color = VpColors.Text,
            fontSize = 22.sp,
            fontWeight = FontWeight.Bold,
        )
    }
}

/** Level is hands played, and it is the only thing that unlocks variants: show how close the next unlock is. */
@Composable
private fun ProgressPanel(game: GameState) {
    val palette = LocalPalette.current
    val level = game.level
    val intoLevel = Rules.HANDS_PER_LEVEL - Rules.handsToNextLevel(game.lifetimeHands)
    val unlock = Rules.nextUnlock(level)

    VpPanel(Modifier.fillMaxWidth().testTag("progress-panel")) {
        Text(
            text = stringResource(R.string.stats_level, level),
            color = VpColors.Text,
            fontSize = 18.sp,
            fontWeight = FontWeight.Bold,
        )
        Box(
            Modifier
                .padding(top = 8.dp)
                .fillMaxWidth()
                .height(8.dp)
                .clip(RoundedCornerShape(4.dp))
                .background(VpColors.Track),
        ) {
            Box(
                Modifier
                    .fillMaxWidth(intoLevel.toFloat() / Rules.HANDS_PER_LEVEL)
                    .height(8.dp)
                    .background(palette.action),
            )
        }
        val handsLeft = Rules.handsToNextLevel(game.lifetimeHands)
        Text(
            text = pluralStringResource(R.plurals.stats_hands_to_next, handsLeft, handsLeft, level + 1),
            modifier = Modifier.padding(top = 6.dp),
            color = VpColors.TextMuted,
            fontSize = 13.sp,
        )
        Text(
            text = when (unlock) {
                null -> stringResource(R.string.stats_all_unlocked)
                is Rules.Unlock.VariantUnlock -> stringResource(R.string.stats_next_unlock, stringResource(unlock.variant.labelRes()), unlock.level)
                Rules.Unlock.MultiHand -> stringResource(R.string.stats_next_unlock, stringResource(R.string.stats_multi_hand), unlock.level)
            },
            modifier = Modifier.padding(top = 2.dp),
            color = if (unlock == null) VpColors.Positive else VpColors.Gold,
            fontSize = 13.sp,
        )
    }
}
