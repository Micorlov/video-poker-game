package com.micorlov.videopoker.nativeapp.ui.friends

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.micorlov.videopoker.nativeapp.R
import com.micorlov.videopoker.nativeapp.domain.social.RankRow
import com.micorlov.videopoker.nativeapp.ui.play.TabularFigures
import com.micorlov.videopoker.nativeapp.ui.text.formatSigned
import com.micorlov.videopoker.nativeapp.ui.theme.LocalPalette
import com.micorlov.videopoker.nativeapp.ui.theme.VpColors

/** One line of today's table: rank, initial, name and net profit. The player's own line is lit in the action colour. */
@Composable
fun FriendRow(row: RankRow, modifier: Modifier = Modifier) {
    val palette = LocalPalette.current
    val shape = RoundedCornerShape(14.dp)
    val highlight = if (row.isMe) {
        Modifier.background(palette.action.copy(alpha = 0.18f), shape).border(1.dp, palette.action.copy(alpha = 0.6f), shape)
    } else {
        Modifier
    }
    Row(
        modifier = modifier
            .fillMaxWidth()
            .then(highlight)
            .semantics { selected = row.isMe }
            .padding(horizontal = 10.dp, vertical = 9.dp)
            .testTag(if (row.isMe) "friend-row-me" else "friend-row"),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = row.rank.toString(),
            modifier = Modifier.width(28.dp),
            color = if (row.rank <= PODIUM) VpColors.Gold else VpColors.TextMuted,
            fontSize = 15.sp,
            fontWeight = FontWeight.Bold,
        )
        Box(
            Modifier.size(32.dp).background(VpColors.SurfaceRaised, CircleShape).border(1.dp, VpColors.Border, CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            Text(row.name.firstOrNull()?.uppercase() ?: "?", color = VpColors.Text, fontSize = 15.sp, fontWeight = FontWeight.Bold)
        }
        Column(Modifier.weight(1f).padding(horizontal = 10.dp)) {
            Text(
                text = if (row.isMe) stringResource(R.string.friends_you) else row.name,
                color = VpColors.Text,
                fontSize = 16.sp,
                fontWeight = if (row.isMe) FontWeight.Bold else FontWeight.Medium,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            if (!row.playedToday) {
                Text(stringResource(R.string.friends_not_played), color = VpColors.TextFaint, fontSize = 12.sp)
            }
        }
        Text(
            text = formatSigned(row.profit),
            modifier = Modifier.testTag("friend-profit"),
            color = when {
                row.profit > 0 -> VpColors.Positive
                row.profit < 0 -> VpColors.Negative
                else -> VpColors.TextMuted
            },
            fontSize = 16.sp,
            fontWeight = FontWeight.Bold,
            style = TabularFigures,
        )
    }
}

private const val PODIUM = 3
