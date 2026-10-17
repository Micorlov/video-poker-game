package com.micorlov.videopoker.nativeapp.ui.play

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.ExperimentalComposeUiApi
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.CustomAccessibilityAction
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.customActions
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.testTagsAsResourceId
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.micorlov.videopoker.nativeapp.R
import com.micorlov.videopoker.nativeapp.domain.AllInOffer
import com.micorlov.videopoker.nativeapp.ui.components.ChipButton
import com.micorlov.videopoker.nativeapp.ui.components.Eyebrow
import com.micorlov.videopoker.nativeapp.ui.text.formatNumber
import com.micorlov.videopoker.nativeapp.ui.theme.LocalPalette
import com.micorlov.videopoker.nativeapp.ui.theme.VpColors
import kotlin.math.roundToInt

/** How far the thumb must travel before the slide counts (CONFIRM_THRESHOLD in js/game.js). */
private const val CONFIRM_THRESHOLD = 0.85f

/** The ALL IN chip with its uses-left badge. Stays tappable when depleted so it can explain itself. */
@Composable
fun AllInButton(selected: Boolean, remaining: Int, onClick: () -> Unit, modifier: Modifier = Modifier) {
    ChipButton(
        label = "🔥 " + stringResource(R.string.play_all_in) + " · " + stringResource(R.string.play_all_in_left, remaining),
        selected = selected,
        onClick = onClick,
        locked = false,
        enabled = true,
        modifier = modifier.fillMaxWidth().testTag("bet-allin"),
    )
}

/**
 * The confirmation: what is at stake, what it could win, and a slide that has to be dragged to commit.
 * Modals sit on an opaque felt panel (panel-solid fading into the table edge), the same surface the
 * previous all-in sheet used, so the table does not show through the window.
 */
@OptIn(ExperimentalComposeUiApi::class)
@Composable
fun AllInSheet(offer: AllInOffer, onConfirm: () -> Unit, onDismiss: () -> Unit) {
    val palette = LocalPalette.current
    val shape = RoundedCornerShape(topStart = 32.dp, topEnd = 32.dp)
    // Full-bleed so the sheet can sit on the bottom edge, the way the previous all-in sheet did.
    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false),
    ) {
        Box(Modifier.fillMaxSize()) {
            Box(
                Modifier
                    .matchParentSize()
                    .clickable(
                        interactionSource = remember { MutableInteractionSource() },
                        indication = null,
                        onClick = onDismiss,
                    )
                    .clearAndSetSemantics { },
            )
            Column(
                Modifier
                    .align(Alignment.BottomCenter)
                    .fillMaxWidth()
                    .widthIn(max = 460.dp)
                    .clip(shape)
                    .background(Brush.verticalGradient(listOf(palette.panelSolid, palette.bgEdge)))
                    .drawWithContent {
                        drawContent()
                        val stroke = 1.dp.toPx()
                        drawLine(
                            color = palette.action.copy(alpha = 0.28f),
                            start = Offset(0f, stroke / 2f),
                            end = Offset(size.width, stroke / 2f),
                            strokeWidth = stroke,
                        )
                    }
                    .padding(start = 18.dp, end = 18.dp, top = 20.dp, bottom = 28.dp)
                    .semantics { testTagsAsResourceId = true }
                    .testTag("allin-sheet"),
            ) {
                Eyebrow(stringResource(R.string.sheet_all_in_eyebrow))
                Text(
                    text = stringResource(R.string.sheet_go_all_in),
                    color = VpColors.Text,
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Bold,
                )
                Text(
                    text = stringResource(
                        R.string.sheet_all_in_sub,
                        formatNumber(offer.stake),
                        stringResource(if (offer.midHand) R.string.play_this_hand else R.string.play_next_hand),
                    ),
                    modifier = Modifier.padding(top = 6.dp).testTag("allin-sub"),
                    color = VpColors.TextMuted,
                    fontSize = 14.sp,
                )
                Eyebrow(stringResource(R.string.sheet_potential), Modifier.padding(top = 14.dp))
                Text(
                    text = formatNumber(offer.potential),
                    modifier = Modifier.testTag("allin-potential"),
                    color = VpColors.Gold,
                    fontSize = 28.sp,
                    fontWeight = FontWeight.Bold,
                )
                SlideToConfirm(stringResource(R.string.sheet_slide_to_confirm), onConfirm, Modifier.padding(top = 16.dp))
                Text(
                    text = stringResource(R.string.sheet_not_now),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 12.dp)
                        .clickable(role = Role.Button, onClick = onDismiss)
                        .padding(8.dp)
                        .testTag("allin-dismiss"),
                    color = VpColors.TextMuted,
                    fontSize = 14.sp,
                    textAlign = TextAlign.Center,
                )
            }
        }
    }
}

/** A track with a thumb: dragging it past 85% of the way fires [onConfirmed]; letting go earlier snaps it back. */
@Composable
fun SlideToConfirm(label: String, onConfirmed: () -> Unit, modifier: Modifier = Modifier) {
    val palette = LocalPalette.current
    val density = LocalDensity.current
    // The thumb starts at the reading-direction start edge, so a right-to-left layout drags leftwards.
    val direction = if (LocalLayoutDirection.current == LayoutDirection.Rtl) -1 else 1
    val thumbSize = 50.dp
    val inset = 3.dp
    BoxWithConstraints(
        modifier
            .fillMaxWidth()
            .height(thumbSize + inset * 2)
            .clip(RoundedCornerShape(28.dp))
            .background(VpColors.Surface)
            .border(1.dp, VpColors.Border, RoundedCornerShape(28.dp))
            // Dragging is not possible with TalkBack or a switch: the same action is offered as a custom one.
            .semantics { customActions = listOf(CustomAccessibilityAction(label) { onConfirmed(); true }) }
            .testTag("allin-slider"),
        contentAlignment = Alignment.CenterStart,
    ) {
        val travelPx = with(density) { (maxWidth - thumbSize - inset * 2).toPx() }
        var offsetPx by remember { mutableFloatStateOf(0f) }

        Text(
            text = label,
            modifier = Modifier.fillMaxWidth().clearAndSetSemantics { },
            color = VpColors.TextMuted,
            fontSize = 15.sp,
            fontWeight = FontWeight.SemiBold,
            textAlign = TextAlign.Center,
        )
        Column(
            Modifier
                .offset { IntOffset(direction * (offsetPx + with(density) { inset.toPx() }).roundToInt(), 0) }
                .size(thumbSize)
                .clip(CircleShape)
                .background(Brush.verticalGradient(listOf(palette.action, palette.actionDeep)))
                .pointerInput(travelPx) {
                    detectHorizontalDragGestures(
                        onDragEnd = {
                            if (travelPx > 0 && offsetPx / travelPx >= CONFIRM_THRESHOLD) {
                                offsetPx = travelPx
                                onConfirmed()
                            } else {
                                offsetPx = 0f
                            }
                        },
                        onDragCancel = { offsetPx = 0f },
                    ) { change, drag ->
                        change.consume()
                        offsetPx = (offsetPx + drag * direction).coerceIn(0f, travelPx)
                    }
                }
                .testTag("allin-thumb"),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text("»", color = palette.actionInk, fontSize = 24.sp, fontWeight = FontWeight.Bold)
        }
    }
}
