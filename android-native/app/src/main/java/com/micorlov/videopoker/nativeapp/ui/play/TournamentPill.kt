package com.micorlov.videopoker.nativeapp.ui.play

import androidx.compose.animation.animateContentSize
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
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
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.micorlov.videopoker.nativeapp.R
import com.micorlov.videopoker.nativeapp.ui.theme.VpColors

/** The tournament times the web app shows. Like the web pill they are fixed text: no tournament engine exists behind it. */
private const val PILL_TIME = "26:55"
private const val EXPAND_TIME = "09:26:55"

/** The "Tournament 2 · 26:55 ▾" pill, which expands to a second line on tap (toggleTournamentPill() in js/tabs.js). */
@Composable
fun TournamentPill(modifier: Modifier = Modifier) {
    var open by rememberSaveable { mutableStateOf(false) }
    Column(modifier.fillMaxWidth().animateContentSize(), verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Row(
            Modifier
                .clip(RoundedCornerShape(50))
                .background(VpColors.Surface)
                .clickable(role = Role.Button) { open = !open }
                .padding(horizontal = 14.dp, vertical = 8.dp)
                .testTag("tournament-pill"),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(stringResource(R.string.play_tournament_pill), color = VpColors.Text, fontSize = 13.sp)
            Text(PILL_TIME, color = VpColors.Gold, fontSize = 13.sp)
            Text(if (open) "▴" else "▾", modifier = Modifier.clearAndSetSemantics { }, color = VpColors.TextMuted, fontSize = 13.sp)
        }
        if (open) {
            Row(
                Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(14.dp))
                    .background(VpColors.Surface)
                    .padding(horizontal = 14.dp, vertical = 10.dp)
                    .testTag("tournament-expand"),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Text(stringResource(R.string.play_tournament_expand), color = VpColors.Text, fontSize = 14.sp)
                Text(EXPAND_TIME, color = VpColors.Gold, fontSize = 14.sp)
            }
        }
    }
}
