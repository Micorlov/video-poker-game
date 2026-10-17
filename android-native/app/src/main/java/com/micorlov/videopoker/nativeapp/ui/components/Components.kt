package com.micorlov.videopoker.nativeapp.ui.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.text.BasicText
import androidx.compose.foundation.text.TextAutoSize
import androidx.compose.ui.text.TextStyle
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import com.micorlov.videopoker.nativeapp.ui.theme.LocalPalette
import com.micorlov.videopoker.nativeapp.ui.theme.VpColors

/** A felt-glass surface: a translucent black wash over the cloth, so it reads as shadow, not frost. */
@Composable
fun VpPanel(
    modifier: Modifier = Modifier,
    raised: Boolean = false,
    content: @Composable ColumnScope.() -> Unit,
) {
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(20.dp))
            .background(if (raised) VpColors.SurfaceRaised else VpColors.Surface)
            .border(BorderStroke(1.dp, VpColors.Border), RoundedCornerShape(20.dp))
            .padding(horizontal = 16.dp, vertical = 14.dp),
        content = content,
    )
}

/** Small all-caps label above a value. */
@Composable
fun Eyebrow(text: String, modifier: Modifier = Modifier) {
    Text(
        text = text.uppercase(),
        modifier = modifier,
        color = VpColors.TextFaint,
        fontSize = 11.sp,
        fontWeight = FontWeight.SemiBold,
        letterSpacing = 0.1.em,
    )
}

/** The one warm call to action: a pressable slab with a dark lip underneath. */
@Composable
fun ActionButton(
    text: String,
    icon: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    color: Color = Color.Unspecified,
    colorDeep: Color = Color.Unspecified,
) {
    val palette = LocalPalette.current
    val fill = if (color == Color.Unspecified) palette.action else color
    val deep = if (colorDeep == Color.Unspecified) palette.actionDeep else colorDeep
    val ink = if (color == Color.Unspecified) palette.actionInk else Color.White
    val interaction = remember { MutableInteractionSource() }
    val pressed by interaction.collectIsPressedAsState()
    val scale by animateFloatAsState(if (pressed) 0.97f else 1f, label = "actionPress")
    val shape = RoundedCornerShape(20.dp)

    Box(
        modifier = modifier
            .graphicsLayer {
                scaleX = scale
                scaleY = scale
                alpha = if (enabled) 1f else DISABLED_ALPHA
            }
            .shadow(10.dp, shape, ambientColor = fill, spotColor = fill)
            .clip(shape)
            .background(if (color == Color.Unspecified) palette.actionEdge else deep.copy(alpha = 0.55f))
            .clickable(enabled = enabled, interactionSource = interaction, indication = null, role = Role.Button, onClick = onClick),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 4.dp)
                .clip(shape)
                .background(Brush.verticalGradient(listOf(fill, deep)))
                .padding(horizontal = 16.dp, vertical = 15.dp),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            val suit = suitForGlyph(icon)
            if (suit != null) {
                SuitIcon(suit, 20.dp, color = ink)
            } else {
                Text(icon, modifier = Modifier.clearAndSetSemantics { }, color = ink, fontSize = 20.sp)
            }
            // One line that shrinks to fit: long labels ("Start with 1,000 chips", German, large text)
            // used to wrap and push the icon out of the slab.
            BasicText(
                text = text.uppercase(),
                modifier = Modifier.padding(start = 10.dp, end = 4.dp),
                style = TextStyle(
                    color = ink,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 0.1.em,
                ),
                maxLines = 1,
                softWrap = false,
                autoSize = TextAutoSize.StepBased(minFontSize = 11.sp, maxFontSize = 18.sp),
            )
        }
    }
}

private const val DISABLED_ALPHA = 0.5f

/** A selectable pill: bet amounts, hand counts, themes. A locked chip stays tappable so it can explain itself. */
@Composable
fun ChipButton(
    label: String,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    locked: Boolean = false,
) {
    val palette = LocalPalette.current
    val shape = RoundedCornerShape(14.dp)
    // Dim what you cannot pick, but keep the current choice at full strength so it stays readable.
    val dimmed = locked || (!enabled && !selected)
    val background = if (selected) {
        Modifier.background(Brush.verticalGradient(listOf(palette.action, palette.actionDeep)))
    } else {
        Modifier.background(VpColors.Surface).border(1.dp, VpColors.Border, shape)
    }

    Box(
        modifier = modifier
            .heightIn(min = 46.dp)
            .alpha(if (dimmed) 0.55f else 1f)
            .clip(shape)
            .then(background)
            .semantics { this.selected = selected }
            .clickable(enabled = enabled, role = Role.RadioButton, onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = if (locked) "🔒 $label" else label,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 8.dp),
            color = if (selected) palette.actionInk else VpColors.Text,
            fontSize = 15.sp,
            fontWeight = FontWeight.SemiBold,
        )
    }
}
