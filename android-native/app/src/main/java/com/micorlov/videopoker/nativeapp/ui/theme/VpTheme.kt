package com.micorlov.videopoker.nativeapp.ui.theme

import androidx.compose.material3.LocalTextStyle
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ProvideTextStyle
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.em
import com.micorlov.videopoker.nativeapp.data.AppTheme

/**
 * One table cloth. Values come from the web app's design tokens (styles/tokens.css):
 * a lamp-lit felt ground, with a single warm [action] colour for every call to action.
 */
@Immutable
data class VpPalette(
    val bgBase: Color,
    val bgMid: Color,
    val bgGlow: Color,
    val bgEdge: Color,
    val action: Color,
    val actionDeep: Color,
    val actionInk: Color,
    val actionEdge: Color,
    val navGlass: Color,
    val panelSolid: Color,
)

/** Colours shared by every theme: money and celebration are gold, never a call to action. */
object VpColors {
    val Hint = Color(0xFF4DA3FF)
    val Gold = Color(0xFFFFC93C)
    val GoldDeep = Color(0xFFD99E1B)
    val GoldInk = Color(0xFF3A2A02)
    val Red = Color(0xFFFF5A5F)
    val Positive = Color(0xFF8BE3A5)
    val Negative = Color(0xFFFF9A9E)

    val Surface = Color(0x2E000000)
    val SurfaceRaised = Color(0x42000000)
    val Border = Color(0x29FFFFFF)
    val BorderStrong = Color(0x42FFFFFF)
    val Track = Color(0x52000000)

    val Text = Color.White
    val TextMuted = Color(0xC7FFFFFF)
    val TextFaint = Color(0x94FFFFFF)

    val CardBlack = Color(0xFF22242E)
    val CardRed = Color(0xFFC0273A)
    val CardFaceTop = Color(0xFFFFFFFF)
    val CardFaceBottom = Color(0xFFEDE8DA)
    val CardBevelBottom = Color(0x8C675E48)
    val CardBackTop = Color(0xFFB03A4A)
    val CardBackBottom = Color(0xFF7E2433)
    val CardBackBorder = Color(0x73FFE9EC)
}

private val GreenPalette = VpPalette(
    bgBase = Color(0xFF1E6B3C),
    bgMid = Color(0xFF2A8A4E),
    bgGlow = Color(0xFF3DA45F),
    bgEdge = Color(0xFF14522C),
    action = Color(0xFFF5872E),
    actionDeep = Color(0xFFD96B12),
    actionInk = Color.White,
    actionEdge = Color(0x8C5A2B05),
    navGlass = Color(0xE00B3A20),
    panelSolid = Color(0xFF175A32),
)

private val BluePalette = VpPalette(
    bgBase = Color(0xFF1B4F7A),
    bgMid = Color(0xFF246A9E),
    bgGlow = Color(0xFF3288BF),
    bgEdge = Color(0xFF123A5C),
    action = Color(0xFFFFB13C),
    actionDeep = Color(0xFFE08A12),
    actionInk = Color.White,
    actionEdge = Color(0x8C5C3806),
    navGlass = Color(0xE00C2D46),
    panelSolid = Color(0xFF164468),
)

private val CrimsonPalette = VpPalette(
    bgBase = Color(0xFF6B1E2E),
    bgMid = Color(0xFF8A2A3D),
    bgGlow = Color(0xFFA43D51),
    bgEdge = Color(0xFF521421),
    action = Color(0xFFFFC93C),
    actionDeep = Color(0xFFD99E1B),
    actionInk = Color(0xFF3A2A02),
    actionEdge = Color(0x8C5A4206),
    navGlass = Color(0xE03A101A),
    panelSolid = Color(0xFF5C1A28),
)

fun paletteFor(theme: AppTheme): VpPalette = when (theme) {
    AppTheme.GREEN -> GreenPalette
    AppTheme.BLUE -> BluePalette
    AppTheme.CRIMSON -> CrimsonPalette
}

val LocalPalette = staticCompositionLocalOf { GreenPalette }

/** The table is always dark felt, whatever the phone's own light/dark setting is. */
@Composable
fun VideoPokerTheme(theme: AppTheme, content: @Composable () -> Unit) {
    val palette = paletteFor(theme)
    val colorScheme = darkColorScheme(
        primary = palette.action,
        onPrimary = palette.actionInk,
        background = palette.bgBase,
        onBackground = VpColors.Text,
        surface = palette.panelSolid,
        onSurface = VpColors.Text,
        error = VpColors.Red,
    )
    CompositionLocalProvider(LocalPalette provides palette) {
        MaterialTheme(colorScheme = colorScheme) {
            // Material's body style carries a 24sp line height that would survive every smaller
            // fontSize we set; a proportional one keeps wrapped text snug at any size.
            ProvideTextStyle(LocalTextStyle.current.copy(lineHeight = 1.25.em), content)
        }
    }
}

/** The lamp-lit felt: a glow hung 38% down the screen, darkening to the edges. */
fun Modifier.feltBackground(palette: VpPalette): Modifier = drawBehind {
    val brush = Brush.radialGradient(
        0f to palette.bgGlow,
        0.52f to palette.bgMid,
        0.82f to palette.bgBase,
        1f to palette.bgEdge,
        center = Offset(size.width * 0.5f, size.height * 0.38f),
        radius = maxOf(size.width, size.height) * 0.9f,
    )
    drawRect(brush)
}
