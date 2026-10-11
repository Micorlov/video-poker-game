package com.micorlov.videopoker.nativeapp.ui.play

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.micorlov.videopoker.nativeapp.R
import com.micorlov.videopoker.nativeapp.domain.GameState
import com.micorlov.videopoker.nativeapp.domain.HandEvaluator
import com.micorlov.videopoker.nativeapp.domain.Phase
import com.micorlov.videopoker.nativeapp.ui.text.cardDescription
import com.micorlov.videopoker.nativeapp.ui.text.text
import com.micorlov.videopoker.nativeapp.ui.text.winBadgeFor
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

private const val FLIP_STAGGER_MS = 250L
private const val FLIP_MS = 600
private const val BOUNCE_STAGGER_MS = 100L
private const val BOUNCE_HEIGHT_DP = 12f
private const val HAND_SIZE = HandEvaluator.HAND_SIZE

/**
 * The five cards. Every new round flips cards face-down-to-up one after another (all five
 * on a deal, only the replaced ones on a draw); when the last one lands it reports back
 * through [onRevealed], and only then do win highlights and badges appear.
 *
 * [alreadyRevealed] is true when this round's cards were already face up before this row
 * was composed (the player came back from another tab) — then there is nothing to flip.
 */
@Composable
fun HandRow(
    game: GameState,
    alreadyRevealed: Boolean,
    celebration: Celebration?,
    hints: List<Boolean>,
    onToggleHold: (Int) -> Unit,
    onFlip: () -> Unit,
    onRevealed: (Int) -> Unit,
    modifier: Modifier = Modifier,
) {
    val round = game.round
    val flipping = remember(round) { cardsToFlip(game, alreadyRevealed) }
    // Built during composition, so a new round's cards are already face-down on their first frame.
    val rotations = remember(round) { List(HAND_SIZE) { Animatable(if (it in flipping) 180f else 0f) } }
    val faceUp = remember(round) { mutableStateListOf<Boolean>().apply { repeat(HAND_SIZE) { add(it !in flipping) } } }
    val lifts = remember { List(HAND_SIZE) { Animatable(0f) } }
    val currentOnFlip by rememberUpdatedState(onFlip)
    val currentOnRevealed by rememberUpdatedState(onRevealed)

    LaunchedEffect(round) {
        coroutineScope {
            flipping.sorted().forEachIndexed { order, index ->
                launch {
                    delay(order * FLIP_STAGGER_MS)
                    currentOnFlip()
                    rotations[index].animateTo(0f, tween(FLIP_MS, easing = FastOutSlowInEasing))
                    faceUp[index] = true
                }
            }
        }
        currentOnRevealed(round)
    }

    val outcome = game.outcome
    val result = outcome?.result
    val highlighted = remember(result) { result?.let { (it.winIndices + it.secondPairIndices + it.thirdMatchIndices).toSet() }.orEmpty() }

    LaunchedEffect(celebration?.id) {
        if (celebration?.tier != CelebrationTier.BOUNCE) return@LaunchedEffect
        coroutineScope {
            highlighted.sorted().forEachIndexed { order, index ->
                launch {
                    delay(order * BOUNCE_STAGGER_MS)
                    lifts[index].animateTo(BOUNCE_HEIGHT_DP, tween(140))
                    lifts[index].animateTo(0f, spring(dampingRatio = Spring.DampingRatioMediumBouncy))
                }
            }
        }
    }

    val heldLabel = stringResource(R.string.play_held)
    val showingResult = outcome != null
    val anyHeld = game.held.any { it }
    // Held cards never flip, but their win badge still waits for the whole hand: a pair badge
    // on a held card while the others are face-down would give the result away.
    val allFaceUp = faceUp.all { it }

    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(top = 20.dp),
        horizontalArrangement = Arrangement.spacedBy(9.dp),
    ) {
        game.hand.forEachIndexed { index, card ->
            val won = showingResult && allFaceUp && index in highlighted
            val isHeld = !showingResult && game.held[index]
            val badge = when {
                isHeld -> heldLabel
                won && result != null -> winBadgeFor(game.hand, result.type, index)?.text()
                else -> null
            }
            PlayingCard(
                card = card,
                rotation = rotations[index],
                visual = CardVisual(
                    held = isHeld,
                    dimmed = !showingResult && anyHeld && !game.held[index],
                    highlighted = won,
                    hinted = hints.getOrElse(index) { false } && !isHeld,
                    badge = badge,
                ),
                lift = lifts[index],
                description = cardDescription(card, held = isHeld),
                holdable = game.phase == Phase.HOLD,
                onClick = { onToggleHold(index) },
                modifier = Modifier
                    .weight(1f)
                    .testTag("card-$index"),
            )
        }
    }
}

/** A deal turns every card over; a draw only the ones that were replaced. */
private fun cardsToFlip(game: GameState, alreadyRevealed: Boolean): Set<Int> = when {
    alreadyRevealed -> emptySet()
    game.outcome == null -> (0 until HAND_SIZE).toSet()
    else -> (0 until HAND_SIZE).filter { !game.held[it] }.toSet()
}
