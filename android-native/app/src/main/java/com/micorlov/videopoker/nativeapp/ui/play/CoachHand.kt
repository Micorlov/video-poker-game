package com.micorlov.videopoker.nativeapp.ui.play

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.geometry.RoundRect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathFillType
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.hideFromAccessibility
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.micorlov.videopoker.nativeapp.ui.theme.VpColors
import kotlin.math.roundToInt

/**
 * Spotlight plus a floating hand. Touches outside [hole] are swallowed, so the only thing
 * the player can press is the control the tutorial is pointing at. The hand itself does
 * not take touches: the tap falls through onto that control.
 */
@Composable
fun CoachOverlay(hole: Rect, label: String, pointsUp: Boolean, modifier: Modifier = Modifier) {
    val density = LocalDensity.current
    val pad = with(density) { 8.dp.toPx() }
    val target = hole.inflate(pad)
    // Glide between controls, then rest, so the hand travels without an endless animation.
    val left by animateFloatAsState(target.left, tween(320), label = "coachLeft")
    val top by animateFloatAsState(target.top, tween(320), label = "coachTop")
    val right by animateFloatAsState(target.right, tween(320), label = "coachRight")
    val bottom by animateFloatAsState(target.bottom, tween(320), label = "coachBottom")
    val spot = Rect(left, top, right, bottom)
    val corner = with(density) { 18.dp.toPx() }

    BoxWithConstraints(modifier.fillMaxSize().testTag("coach")) {
        val widthPx = with(density) { maxWidth.toPx() }
        val heightPx = with(density) { maxHeight.toPx() }
        Spotlight(spot, corner)
        ScrimBlocker(0f, 0f, widthPx, spot.top)
        ScrimBlocker(0f, spot.bottom, widthPx, heightPx - spot.bottom)
        ScrimBlocker(0f, spot.top, spot.left, spot.height)
        ScrimBlocker(spot.right, spot.top, widthPx - spot.right, spot.height)
        FloatingHand(spot, label, pointsUp)
    }
}

@Composable
private fun Spotlight(spot: Rect, corner: Float) {
    Canvas(Modifier.fillMaxSize()) {
        val frame = Path().apply {
            addRect(Rect(Offset.Zero, size))
            addRoundRect(RoundRect(spot, CornerRadius(corner)))
            fillType = PathFillType.EvenOdd
        }
        drawPath(frame, Color.Black.copy(alpha = 0.62f))
        drawRoundRect(
            color = VpColors.Gold,
            topLeft = spot.topLeft,
            size = spot.size,
            cornerRadius = CornerRadius(corner),
            style = Stroke(width = 3.dp.toPx()),
        )
    }
}

/** A touch catcher with no semantics, so it cannot be tapped or focused. */
@Composable
private fun ScrimBlocker(left: Float, top: Float, width: Float, height: Float) {
    if (width < 1f || height < 1f) return
    val density = LocalDensity.current
    Box(
        Modifier
            .offset { IntOffset(left.roundToInt(), top.roundToInt()) }
            .size(with(density) { width.toDp() }, with(density) { height.toDp() })
            .clearAndSetSemantics { hideFromAccessibility() }
            .pointerInput(Unit) {
                awaitEachGesture {
                    val down = awaitFirstDown(requireUnconsumed = false)
                    down.consume()
                    var pressed = true
                    while (pressed) {
                        val event = awaitPointerEvent()
                        event.changes.forEach { it.consume() }
                        pressed = event.changes.any { it.pressed }
                    }
                }
            },
    )
}

@Composable
private fun FloatingHand(spot: Rect, label: String, pointsUp: Boolean) {
    var stack by remember { mutableStateOf(IntSize.Zero) }
    Column(
        modifier = Modifier
            .onSizeChanged { stack = it }
            .offset {
                val x = spot.center.x - stack.width / 2f
                val y = if (pointsUp) spot.bottom - stack.height * 0.42f else spot.top - stack.height
                IntOffset(x.roundToInt(), y.roundToInt())
            }
            .widthIn(max = 200.dp)
            .semantics(mergeDescendants = true) {}
            .testTag("coach-label"),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        if (!pointsUp) Caption(label)
        Text(
            text = if (pointsUp) "👆" else "👇",
            fontSize = 42.sp,
            modifier = Modifier.padding(bottom = 2.dp),
        )
        if (pointsUp) Caption(label)
    }
}

@Composable
private fun Caption(text: String) {
    Text(
        text = text,
        modifier = Modifier
            .shadow(8.dp, RoundedCornerShape(16.dp))
            .background(VpColors.Gold, RoundedCornerShape(16.dp))
            .padding(horizontal = 12.dp, vertical = 8.dp),
        color = VpColors.GoldInk,
        fontSize = 14.sp,
        fontWeight = FontWeight.Bold,
        textAlign = TextAlign.Center,
    )
}
