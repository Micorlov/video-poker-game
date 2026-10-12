package com.micorlov.videopoker.nativeapp.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.LocalContentColor
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawWithCache
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathOperation
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.micorlov.videopoker.nativeapp.domain.Card
import com.micorlov.videopoker.nativeapp.domain.Suit
import com.micorlov.videopoker.nativeapp.ui.theme.VpColors

/**
 * A suit drawn as a vector, not as the ♠♥♦♣ characters: Samsung's system font draws those as
 * colour emoji, which made every card look like a sticker. Decorative: callers describe the card.
 */
@Composable
fun SuitIcon(suit: Suit, size: Dp, modifier: Modifier = Modifier, color: Color = LocalContentColor.current) {
    Spacer(
        modifier
            .size(size)
            .clearAndSetSemantics { }
            .drawWithCache {
                val path = suitPath(suit, this.size)
                onDrawBehind { drawPath(path, color) }
            },
    )
}

/** A small face-up card (rank + suit) for inline use: sample hands, best hand. */
@Composable
fun MiniCard(card: Card, modifier: Modifier = Modifier, fontSize: TextUnit = 13.sp) {
    val ink = if (card.suit.isRed) VpColors.CardRed else VpColors.CardBlack
    val suitSize = with(LocalDensity.current) { fontSize.toDp() * 0.8f }
    Row(
        modifier
            .clip(RoundedCornerShape(6.dp))
            .background(VpColors.CardFaceTop)
            .padding(horizontal = 5.dp, vertical = 3.dp),
        horizontalArrangement = Arrangement.spacedBy(1.dp, Alignment.CenterHorizontally),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(card.rank.label, color = ink, fontSize = fontSize, fontWeight = FontWeight.Bold, maxLines = 1, softWrap = false)
        SuitIcon(card.suit, suitSize, color = ink)
    }
}

/** Reads "A♠" style card text, failing loudly on a typo in the sample hands. */
fun cardOf(text: String): Card = requireNotNull(Card.parse(text)) { "Not a card: $text" }

/** The suit for a one-character glyph such as "♠", or null when it is some other glyph. */
fun suitForGlyph(glyph: String): Suit? = Suit.entries.firstOrNull { glyph == it.symbol.toString() }

/** Suit outlines on a unit square, scaled into the largest centred square that fits [size]. */
private fun suitPath(suit: Suit, size: Size): Path {
    val side = minOf(size.width, size.height)
    val left = (size.width - side) / 2f
    val top = (size.height - side) / 2f
    fun x(u: Float) = left + u * side
    fun y(v: Float) = top + v * side
    fun circle(cx: Float, cy: Float, r: Float) = Rect(Offset(x(cx), y(cy)), r * side)

    if (suit == Suit.CLUBS) {
        // Three lobes and a stem overlap; union them so opposite windings cannot punch holes.
        val lobes = Path().apply {
            addOval(circle(0.5f, 0.27f, 0.23f))
            addOval(circle(0.25f, 0.6f, 0.23f))
            addOval(circle(0.75f, 0.6f, 0.23f))
            addOval(circle(0.5f, 0.55f, 0.14f))
        }
        val stem = Path().apply {
            moveTo(x(0.46f), y(0.6f))
            quadraticTo(x(0.45f), y(0.88f), x(0.3f), y(1f))
            lineTo(x(0.7f), y(1f))
            quadraticTo(x(0.55f), y(0.88f), x(0.54f), y(0.6f))
            close()
        }
        return Path.combine(PathOperation.Union, lobes, stem)
    }

    return Path().apply {
        when (suit) {
            Suit.HEARTS -> {
                moveTo(x(0.5f), y(0.94f))
                cubicTo(x(0.2f), y(0.72f), x(0f), y(0.55f), x(0f), y(0.32f))
                cubicTo(x(0f), y(0.14f), x(0.13f), y(0.04f), x(0.28f), y(0.04f))
                cubicTo(x(0.38f), y(0.04f), x(0.46f), y(0.1f), x(0.5f), y(0.19f))
                cubicTo(x(0.54f), y(0.1f), x(0.62f), y(0.04f), x(0.72f), y(0.04f))
                cubicTo(x(0.87f), y(0.04f), x(1f), y(0.14f), x(1f), y(0.32f))
                cubicTo(x(1f), y(0.55f), x(0.8f), y(0.72f), x(0.5f), y(0.94f))
                close()
            }
            Suit.DIAMONDS -> {
                moveTo(x(0.5f), y(0f))
                quadraticTo(x(0.66f), y(0.28f), x(0.9f), y(0.5f))
                quadraticTo(x(0.66f), y(0.72f), x(0.5f), y(1f))
                quadraticTo(x(0.34f), y(0.72f), x(0.1f), y(0.5f))
                quadraticTo(x(0.34f), y(0.28f), x(0.5f), y(0f))
                close()
            }
            Suit.SPADES -> {
                moveTo(x(0.5f), y(0f))
                cubicTo(x(0.8f), y(0.25f), x(1f), y(0.4f), x(1f), y(0.6f))
                cubicTo(x(1f), y(0.76f), x(0.88f), y(0.86f), x(0.73f), y(0.86f))
                cubicTo(x(0.63f), y(0.86f), x(0.56f), y(0.81f), x(0.53f), y(0.74f))
                quadraticTo(x(0.56f), y(0.9f), x(0.7f), y(1f))
                lineTo(x(0.3f), y(1f))
                quadraticTo(x(0.44f), y(0.9f), x(0.47f), y(0.74f))
                cubicTo(x(0.44f), y(0.81f), x(0.37f), y(0.86f), x(0.27f), y(0.86f))
                cubicTo(x(0.12f), y(0.86f), x(0f), y(0.76f), x(0f), y(0.6f))
                cubicTo(x(0f), y(0.4f), x(0.2f), y(0.25f), x(0.5f), y(0f))
                close()
            }
            Suit.CLUBS -> Unit
        }
    }
}
