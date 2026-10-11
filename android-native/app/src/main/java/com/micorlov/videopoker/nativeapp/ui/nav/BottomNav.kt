package com.micorlov.videopoker.nativeapp.ui.nav

import androidx.annotation.StringRes
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
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
import com.micorlov.videopoker.nativeapp.ui.theme.LocalPalette
import com.micorlov.videopoker.nativeapp.ui.theme.VpColors

/** The three screens. The web app's Friends tab arrives with the social features. */
enum class Tab(@param:StringRes val label: Int, val glyph: String, val tag: String) {
    PLAY(R.string.nav_play, "♠", "tab-play"),
    STATS(R.string.nav_stats, "▤", "tab-stats"),
    SETTINGS(R.string.nav_settings, "⚙︎", "tab-settings"),
}

/** The floating rail at the bottom: a shadowed bar on the cloth, the active tab in the action colour. */
@Composable
fun BottomNav(selected: Tab, onSelect: (Tab) -> Unit, modifier: Modifier = Modifier) {
    val palette = LocalPalette.current
    val shape = RoundedCornerShape(28.dp)

    Row(
        modifier = modifier
            .fillMaxWidth()
            .clip(shape)
            .background(palette.navGlass)
            .border(1.dp, VpColors.BorderStrong, shape)
            .padding(6.dp),
        horizontalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Tab.entries.forEach { tab ->
            val active = tab == selected
            Column(
                modifier = Modifier
                    .weight(1f)
                    .clip(RoundedCornerShape(22.dp))
                    .background(if (active) palette.action.copy(alpha = 0.16f) else Color.Transparent)
                    .selectable(selected = active, role = Role.Tab, onClick = { onSelect(tab) })
                    .padding(vertical = 8.dp)
                    .testTag(tab.tag),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                val color = if (active) palette.action else VpColors.TextMuted
                // Decorative: the label below already names the tab, so a screen reader must not say "spade suit".
                Text(tab.glyph, modifier = Modifier.clearAndSetSemantics { }, color = color, fontSize = 20.sp)
                Text(
                    text = stringResource(tab.label),
                    color = color,
                    fontSize = 11.sp,
                    fontWeight = if (active) FontWeight.Bold else FontWeight.Medium,
                )
            }
        }
    }
}
