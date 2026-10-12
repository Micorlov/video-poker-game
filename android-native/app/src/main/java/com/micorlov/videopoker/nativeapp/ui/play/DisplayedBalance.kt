package com.micorlov.videopoker.nativeapp.ui.play

import androidx.compose.animation.core.Easing
import androidx.compose.animation.core.animate
import androidx.compose.animation.core.tween
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.LongState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import com.micorlov.videopoker.nativeapp.domain.GameState
import kotlin.math.roundToInt

private const val COUNT_UP_MS = 1000
private const val CREDITS_PER_TICK = 5
private const val MAX_TICKS = 10
private val EaseOutQuad = Easing { it * (2f - it) }

/**
 * The balance as the player sees it. A win does not land the instant the draw happens: the
 * old balance holds until the cards have flipped, then counts up to the new one, ticking
 * coins as it goes (js/audio.js animateBalance). A loss, or a new deal, shows at once. A
 * double-up's return lands the same way once its cards are face up; [pace] scales the count.
 *
 * Returns the state holder rather than its value, so only the composable that actually
 * displays the number re-reads it on each frame of the count-up.
 */
@Composable
fun rememberDisplayedBalance(game: GameState, revealed: Boolean, pace: Float, onCoinTick: () -> Unit): LongState {
    val win = landingCredit(game)
    val settled = game.balance
    val before = settled - win
    val shown = remember { mutableLongStateOf(if (revealed) settled else before) }
    val tick by rememberUpdatedState(onCoinTick)

    LaunchedEffect(game.round, revealed, settled) {
        when {
            win == 0L -> shown.longValue = settled
            !revealed -> shown.longValue = before
            shown.longValue == settled -> Unit // already counted up (the player came back to this tab)
            else -> {
                val ticks = (win / CREDITS_PER_TICK).toInt().coerceIn(1, MAX_TICKS)
                var ticked = 0
                animate(0f, 1f, animationSpec = tween((COUNT_UP_MS * pace).roundToInt(), easing = EaseOutQuad)) { fraction, _ ->
                    shown.longValue = before + (win * fraction).toLong()
                    val due = (fraction * ticks).toInt()
                    if (due > ticked) {
                        ticked = due
                        tick()
                    }
                }
                shown.longValue = settled
            }
        }
    }
    return shown
}

/** The chips that land with a count-up: a settled double-up's return, else the last hand's win. */
private fun landingCredit(game: GameState): Long {
    val doubleUp = game.doubleUp ?: return game.outcome?.takeIf { it.isWin }?.totalWin?.toLong() ?: 0L
    return doubleUp.returned
}
