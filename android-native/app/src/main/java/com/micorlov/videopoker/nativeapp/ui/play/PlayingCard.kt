package com.micorlov.videopoker.nativeapp.ui.play

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.AnimationVector1D
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.wrapContentWidth
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import androidx.compose.ui.zIndex
import com.micorlov.videopoker.nativeapp.R
import com.micorlov.videopoker.nativeapp.domain.Card
import com.micorlov.videopoker.nativeapp.ui.theme.LocalPalette
import com.micorlov.videopoker.nativeapp.ui.theme.VpColors

/** Width : height of a card, from the web app's `.card { aspect-ratio: 0.68 }`. */
const val CARD_ASPECT = 0.68f

/** How a card is dressed: held (orange ring), dimmed (an unheld card beside held ones), or winning (gold ring). */
data class CardVisual(
    val held: Boolean = false,
    val dimmed: Boolean = false,
    val highlighted: Boolean = false,
    /** Strategy hint: the suggested hold glows blue. */
    val hinted: Boolean = false,
    val badge: String? = null,
)

/**
 * One card. [rotation] is the flip: 0 shows the face, 180 the back; past 90 degrees the
 * back is drawn, counter-rotated so it is not mirrored. [lift] raises the card in dp for
 * the win bounce.
 *
 * The animations are passed as [Animatable]s, not floats, and read only inside draw-phase
 * lambdas: a flip then redraws the card at 60 fps without recomposing it. Composition only
 * re-runs when the card crosses 90 degrees and swaps face for back.
 */
@Composable
fun PlayingCard(
    card: Card,
    rotation: Animatable<Float, AnimationVector1D>,
    visual: CardVisual,
    lift: Animatable<Float, AnimationVector1D>,
    description: String,
    holdable: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val faceDown = stringResource(R.string.card_face_down)
    val holdAction = stringResource(R.string.card_hold_action)
    val faceUp by remember(rotation) { derivedStateOf { rotation.value <= 90f } }

    Box(
        modifier = modifier
            .aspectRatio(CARD_ASPECT)
            .graphicsLayer { translationY = -lift.value * density }
            .semantics(mergeDescendants = true) {
                contentDescription = if (faceUp) description else faceDown
                role = Role.Button
            }
            .clickable(
                enabled = holdable,
                onClickLabel = holdAction,
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
                onClick = onClick,
            ),
    ) {
        Box(
            Modifier
                .fillMaxSize()
                .graphicsLayer {
                    rotationY = rotation.value
                    cameraDistance = 12f * density
                },
        ) {
            if (faceUp) {
                CardFace(card, visual)
            } else {
                CardBack(Modifier.graphicsLayer { rotationY = 180f })
            }
        }
        if (faceUp) {
            visual.badge?.let {
                CardBadge(
                    text = it,
                    gold = visual.highlighted,
                    modifier = Modifier
                        .align(Alignment.TopCenter)
                        .offset(y = (-9).dp)
                        .zIndex(2f),
                )
            }
        }
    }
}

@Composable
private fun CardFace(card: Card, visual: CardVisual) {
    val palette = LocalPalette.current
    val shape = RoundedCornerShape(14.dp)
    val ink = if (card.suit.isRed) VpColors.CardRed else VpColors.CardBlack
    val ring = when {
        visual.highlighted -> VpColors.Gold
        visual.held -> palette.action
        visual.hinted -> VpColors.Hint
        else -> null
    }

    BoxWithConstraints(
        Modifier
            .fillMaxSize()
            .shadow(8.dp, shape, ambientColor = Color.Black, spotColor = if (visual.held) palette.action else Color.Black)
            .clip(shape)
            .background(Brush.verticalGradient(listOf(VpColors.CardFaceTop, VpColors.CardFaceBottom)))
            .then(if (ring != null) Modifier.border(3.dp, ring, shape) else Modifier),
    ) {
        // Sized from the card's own width (toSp of a dp length), not the system font scale:
        // the glyphs must stay inside the card whatever text size the player has chosen.
        val rankSize = with(LocalDensity.current) { (maxWidth * 0.42f).toSp() }
        val suitSize = with(LocalDensity.current) { (maxWidth * 0.4f).toSp() }

        // Rank top-left, suit bottom-right: the diagonal still reads at thumbnail size.
        Text(
            text = card.rank.label,
            modifier = Modifier
                .align(Alignment.TopStart)
                .padding(start = 7.dp, top = 6.dp),
            color = ink,
            fontSize = rankSize,
            fontWeight = FontWeight.Bold,
            letterSpacing = (-0.04).em,
        )
        Text(
            text = card.suit.symbol.toString(),
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(end = 8.dp, bottom = 9.dp),
            color = ink,
            fontSize = suitSize,
        )
        Box(
            Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .height(3.dp)
                .background(VpColors.CardBevelBottom),
        )
        // Dim by shading, not by making the ivory translucent, or the felt shows through and tints it green.
        if (visual.dimmed) Box(Modifier.fillMaxSize().background(Color(0x42000000)))
    }
}

@Composable
private fun CardBack(modifier: Modifier = Modifier) {
    val shape = RoundedCornerShape(14.dp)
    Box(
        modifier
            .fillMaxSize()
            .shadow(8.dp, shape)
            .clip(shape)
            .background(Brush.verticalGradient(listOf(VpColors.CardBackTop, VpColors.CardBackBottom)))
            .border(1.dp, VpColors.CardBackBorder, shape),
    ) {
        // The drawn inner rule where a printed deck's filigree would sit.
        Box(
            Modifier
                .fillMaxSize()
                .padding(5.dp)
                .border(1.dp, VpColors.CardBackBorder, RoundedCornerShape(7.dp)),
        )
    }
}

/** The HELD / win pill that sits on a card's top edge. Held is a choice (action orange); a win is money (gold). */
@Composable
private fun CardBadge(text: String, gold: Boolean, modifier: Modifier = Modifier) {
    val palette = LocalPalette.current
    val colors = if (gold) listOf(VpColors.Gold, VpColors.GoldDeep) else listOf(palette.action, palette.actionDeep)
    Box(
        modifier
            .wrapContentWidth(unbounded = true)
            .clip(RoundedCornerShape(6.dp))
            .background(Brush.verticalGradient(colors))
            .padding(horizontal = 7.dp, vertical = 2.dp),
    ) {
        Text(
            text = text.uppercase(),
            color = if (gold) VpColors.GoldInk else palette.actionInk,
            fontSize = 9.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 0.1.em,
            maxLines = 1,
            softWrap = false,
        )
    }
}
