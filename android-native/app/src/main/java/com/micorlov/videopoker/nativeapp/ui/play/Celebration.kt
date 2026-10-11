package com.micorlov.videopoker.nativeapp.ui.play

import android.provider.Settings
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.runtime.withFrameNanos
import com.micorlov.videopoker.nativeapp.ui.theme.VpColors
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin
import kotlin.random.Random

/** How loud a win is, from the hand's strength (the web app's triggerWinCelebration() tiers). */
enum class CelebrationTier {
    /** Two pair or less: just the payout. */
    SHIMMER,

    /** Trips and straights: the winning cards hop. */
    BOUNCE,

    /** Flush and full house: one confetti burst. */
    CONFETTI,

    /** Quads: three bursts and a flash. */
    BIG_CONFETTI,

    /** Straight flush and up: fireworks, gold rain, a flash and a shake. */
    FIREWORKS,
    ;

    val flashes: Boolean get() = this == BIG_CONFETTI || this == FIREWORKS

    companion object {
        fun forStrength(strength: Int): CelebrationTier = when {
            strength >= 8 -> FIREWORKS
            strength == 7 -> BIG_CONFETTI
            strength >= 5 -> CONFETTI
            strength >= 3 -> BOUNCE
            else -> SHIMMER
        }
    }
}

/** One celebration to play; a new [id] restarts the effects. */
data class Celebration(val id: Int, val tier: CelebrationTier)

private val CONFETTI_COLORS = listOf(
    Color(0xFFFFD700), Color(0xFF4ADE80), Color(0xFFFF6B6B), Color(0xFF8A2BE2), Color.White, Color(0xFFFFAA00),
)
private val FIREWORK_COLORS = listOf(
    Color(0xFFFFD700), Color(0xFFFFAA00), Color(0xFFFF5500), Color(0xFFFF00AA), Color(0xFF00FFAA), Color(0xFF00AAFF),
)

private const val BURST_MS = 1000L
private const val FLASH_MS = 500L

/** A speck: [rain] falls from the top at [originX]; otherwise it flies out of ([originX], [originY]) by ([dx], [dy]) dp. */
private data class Piece(
    val startMs: Long,
    val lifeMs: Long,
    val originX: Float,
    val originY: Float,
    val dx: Float,
    val dy: Float,
    val color: Color,
    val sizeDp: Float,
    val rain: Boolean,
)

private fun burst(
    random: Random,
    startMs: Long,
    originX: Float,
    originY: Float,
    count: Int,
    minSpeed: Float,
    maxSpeed: Float,
    colors: List<Color>,
): List<Piece> = List(count) {
    val angle = random.nextFloat() * 2f * PI.toFloat()
    val speed = minSpeed + random.nextFloat() * (maxSpeed - minSpeed)
    Piece(startMs, BURST_MS, originX, originY, cos(angle) * speed, sin(angle) * speed, colors.random(random), 7f, rain = false)
}

private fun piecesFor(tier: CelebrationTier, random: Random): List<Piece> = when (tier) {
    CelebrationTier.SHIMMER, CelebrationTier.BOUNCE -> emptyList()
    CelebrationTier.CONFETTI -> burst(random, 0, 0.5f, 0.5f, 30, 50f, 200f, CONFETTI_COLORS)
    CelebrationTier.BIG_CONFETTI -> listOf(0L, 200L, 400L).flatMap { burst(random, it, 0.5f, 0.5f, 30, 50f, 200f, CONFETTI_COLORS) }
    CelebrationTier.FIREWORKS -> {
        val fireworks = (0 until 5).flatMap { f ->
            burst(random, f * 400L, 0.2f + random.nextFloat() * 0.6f, 0.2f + random.nextFloat() * 0.4f, 24, 30f, 150f, FIREWORK_COLORS)
        }
        val rain = List(50) {
            Piece(
                startMs = (random.nextFloat() * 1500).toLong(),
                lifeMs = 1500L + (random.nextFloat() * 2000).toLong(),
                originX = random.nextFloat(),
                originY = 0f,
                dx = 0f,
                dy = 0f,
                color = VpColors.Gold,
                sizeDp = 8f,
                rain = true,
            )
        }
        fireworks + rain
    }
}

/** Confetti, fireworks, gold rain and the white flash, drawn over the whole screen; it never takes touches. */
@Composable
fun CelebrationOverlay(celebration: Celebration?, modifier: Modifier = Modifier) {
    val context = LocalContext.current
    // The overlay runs its own frame loop, which the system's animation scale does not slow or
    // stop, so honour "Remove animations" explicitly (it also covers flashing for photosensitive players).
    val animationsAllowed = remember(celebration?.id) {
        Settings.Global.getFloat(context.contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f) > 0f
    }
    if (celebration == null || celebration.tier < CelebrationTier.CONFETTI || !animationsAllowed) return

    val pieces = remember(celebration.id) { piecesFor(celebration.tier, Random(celebration.id)) }
    val totalMs = remember(pieces) { pieces.maxOfOrNull { it.startMs + it.lifeMs } ?: 0L }
    var elapsed by remember(celebration.id) { mutableLongStateOf(0L) }

    LaunchedEffect(celebration.id) {
        val start = withFrameNanos { it }
        while (elapsed <= totalMs) {
            elapsed = (withFrameNanos { it } - start) / 1_000_000
        }
    }

    Canvas(modifier.fillMaxSize()) {
        val now = elapsed
        if (celebration.tier.flashes && now < FLASH_MS) {
            drawRect(Color.White.copy(alpha = 0.5f * (1f - now.toFloat() / FLASH_MS)), size = Size(size.width, size.height))
        }
        for (piece in pieces) {
            val local = now - piece.startMs
            if (local < 0 || local > piece.lifeMs) continue
            val progress = local.toFloat() / piece.lifeMs
            val radius = piece.sizeDp.dp.toPx() / 2f
            if (piece.rain) {
                drawCircle(piece.color, radius, Offset(size.width * piece.originX, -20f + (size.height + 40f) * progress))
            } else {
                val eased = 1f - (1f - progress) * (1f - progress)
                val center = Offset(
                    size.width * piece.originX + piece.dx.dp.toPx() * eased,
                    size.height * piece.originY + piece.dy.dp.toPx() * eased,
                )
                drawCircle(piece.color.copy(alpha = 1f - progress), radius, center)
            }
        }
    }
}
