package com.micorlov.videopoker.nativeapp.ui.nav

import androidx.annotation.StringRes
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.micorlov.videopoker.nativeapp.R
import com.micorlov.videopoker.nativeapp.domain.Suit
import com.micorlov.videopoker.nativeapp.ui.components.SuitIcon
import com.micorlov.videopoker.nativeapp.ui.theme.LocalPalette
import com.micorlov.videopoker.nativeapp.ui.theme.VpColors

/** The three screens. The web app's Friends tab arrives with the social features. */
enum class Tab(@param:StringRes val label: Int, val tag: String) {
    PLAY(R.string.nav_play, "tab-play"),
    STATS(R.string.nav_stats, "tab-stats"),
    SETTINGS(R.string.nav_settings, "tab-settings"),
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
                TabIcon(tab, color, Modifier.padding(bottom = 3.dp))
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

/** Drawn, not typed: the old ♠ ▤ ⚙ glyphs came out as one emoji and two mismatched symbols. */
@Composable
private fun TabIcon(tab: Tab, color: Color, modifier: Modifier = Modifier) {
    when (tab) {
        Tab.PLAY -> SuitIcon(Suit.SPADES, 22.dp, modifier, color)
        Tab.STATS -> Spacer(modifier.size(22.dp).drawBehind { drawBars(color) })
        Tab.SETTINGS -> Spacer(modifier.size(22.dp).drawBehind { drawGear(color) })
    }
}

/** Three rising bars on a shared baseline. */
private fun DrawScope.drawBars(color: Color) {
    val unit = size.minDimension
    val barWidth = unit * 0.22f
    val gap = (unit - barWidth * 3) / 2
    listOf(0.5f, 0.95f, 0.72f).forEachIndexed { i, height ->
        val barHeight = unit * height
        drawRoundRect(
            color = color,
            topLeft = Offset(i * (barWidth + gap), unit - barHeight),
            size = Size(barWidth, barHeight),
            cornerRadius = CornerRadius(barWidth * 0.3f),
        )
    }
}

/** A ring with eight teeth. */
private fun DrawScope.drawGear(color: Color) {
    val unit = size.minDimension
    val toothWidth = unit * 0.2f
    val toothLength = unit * 0.24f
    repeat(GEAR_TEETH) { i ->
        rotate(i * 360f / GEAR_TEETH) {
            drawRoundRect(
                color = color,
                topLeft = Offset(center.x - toothWidth / 2, center.y - unit / 2),
                size = Size(toothWidth, toothLength),
                cornerRadius = CornerRadius(toothWidth * 0.25f),
            )
        }
    }
    drawCircle(color, radius = unit * 0.29f, style = Stroke(width = unit * 0.17f))
}

private const val GEAR_TEETH = 8
