package com.micorlov.videopoker.nativeapp.ui.play

import android.provider.Settings
import androidx.compose.animation.animateContentSize
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.AnimationVector1D
import androidx.compose.animation.core.FastOutLinearInEasing
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.LayoutCoordinates
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.micorlov.videopoker.nativeapp.R
import com.micorlov.videopoker.nativeapp.domain.Card
import com.micorlov.videopoker.nativeapp.domain.FirstHands
import com.micorlov.videopoker.nativeapp.domain.GameState
import com.micorlov.videopoker.nativeapp.domain.HandEvaluator
import com.micorlov.videopoker.nativeapp.domain.Phase
import com.micorlov.videopoker.nativeapp.ui.text.cardDescription
import com.micorlov.videopoker.nativeapp.ui.text.text
import com.micorlov.videopoker.nativeapp.ui.text.winBadgeFor
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/** Travel into the hand. Short stagger and a soft landing — a dealer pitching toward the player. */
private const val APPROACH_STIFFNESS = 380f
private const val APPROACH_DAMPING = 0.72f
private const val DEAL_STAGGER_MS = 72L

/**
 * The deals that follow "Now tap Deal" (and the deal that opens the tutorial).
 * Farther, slower, and one card at a time, so the pitch is obvious.
 */
private const val OPENING_DEAL_STIFFNESS = 120f
private const val OPENING_DEAL_DAMPING = 0.86f
private const val OPENING_DEAL_STAGGER_MS = 180L
private const val OPENING_DEAL_FLIP_MS = 480
private const val OPENING_DEAL_TRAVEL = 2.6f

/** The turn, once the card has mostly arrived. */
private const val FLIP_MS = 340

/** Unheld cards leave before their replacements come in. */
private const val DISCARD_MS = 240
private const val DISCARD_STAGGER_MS = 40L

/** A losing hand stays readable for a beat, then folds back and collapses. */
private const val LOSS_READ_MS = 520L

/** A loss folds back toward the dealer once it has been readable. */
private const val FOLD_MS = 380
private const val FOLD_STAGGER_MS = 42L

private const val BOUNCE_STAGGER_MS = 100L
private const val BOUNCE_HEIGHT_DP = 12f
private const val HAND_SIZE = HandEvaluator.HAND_SIZE

/** Cards left on the felt after a round. Only a win stays; a loss has already folded away. */
private class RestingHand(val cards: List<Card>, val keepsCards: Boolean)

/**
 * The five cards.
 *
 * A deal pitches them in from up the felt (small, far) and turns them face up, one after
 * another. A draw folds the cards you let go, then pitches the replacements in the same way.
 * A win stays on the table. A loss is readable for a moment, then the hand folds back toward
 * the dealer and leaves the felt, so an empty table means there is nothing to collect.
 *
 * [onStakeWindow] reports which money control that presentation leaves open. [alreadyRevealed]
 * is true when this round's cards were already face up before this row was composed (the player
 * came back from another tab). [pace] scales the motion (the game speed setting). [onTapToDeal]
 * stays unset: a tap on a card never deals. Only the Deal button does.
 */
@Composable
fun HandRow(
    game: GameState,
    alreadyRevealed: Boolean,
    celebration: Celebration?,
    hints: List<Boolean>,
    pace: Float,
    onToggleHold: (Int) -> Unit,
    onTapToDeal: (() -> Unit)?,
    onFlip: () -> Unit,
    onRevealed: (Int) -> Unit,
    onStakeWindow: (StakeWindow) -> Unit,
    onCardPlaced: (Int, LayoutCoordinates) -> Unit = { _, _ -> },
    modifier: Modifier = Modifier,
) {
    val round = game.round
    val context = LocalContext.current
    val motionScale = remember {
        Settings.Global.getFloat(context.contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f)
    }
    val instant = motionScale == 0f
    val previous = remember { mutableStateOf<RestingHand?>(null) }
    val resting = previous.value?.takeIf { it.cards.size == HAND_SIZE }

    var departed by remember(round) {
        mutableStateOf(alreadyRevealed || game.outcome != null || resting?.keepsCards != true)
    }
    var discardsGone by remember(round) { mutableStateOf(game.outcome == null || alreadyRevealed) }
    var cleared by remember(round) { mutableStateOf(alreadyRevealed && game.outcome?.isWin == false) }
    var facesSettled by remember(round) { mutableStateOf(alreadyRevealed && game.outcome?.isWin != false) }

    val kept = resting?.takeIf { it.keepsCards }
    val leavingWin = kept != null && !departed && game.outcome == null && !alreadyRevealed
    val seatedStart = alreadyRevealed || game.outcome != null || leavingWin
    val rotations = remember(round) { List(HAND_SIZE) { Animatable(if (seatedStart) 0f else 180f) } }
    val approaches = remember(round) { List(HAND_SIZE) { Animatable(if (seatedStart) 1f else 0f) } }
    val folds = remember(round) { List(HAND_SIZE) { Animatable(0f) } }
    val faceUp = remember(round) {
        mutableStateListOf<Boolean>().apply { repeat(HAND_SIZE) { add(seatedStart) } }
    }
    val ready = remember(round) {
        mutableStateListOf<Boolean>().apply {
            repeat(HAND_SIZE) { index ->
                add(game.outcome != null && game.held.getOrElse(index) { false } && !leavingWin && !cleared)
            }
        }
    }
    val lifts = remember { List(HAND_SIZE) { Animatable(0f) } }
    val currentOnFlip by rememberUpdatedState(onFlip)
    val currentOnRevealed by rememberUpdatedState(onRevealed)
    val currentOnWindow by rememberUpdatedState(onStakeWindow)

    LaunchedEffect(round) {
        val dealt = game
        fun report(animating: Boolean, faceUpNow: Boolean, clearedNow: Boolean) {
            currentOnWindow(
                stakeWindow(
                    phase = dealt.phase,
                    outcomeWin = dealt.outcome?.isWin,
                    cardsFaceUp = faceUpNow,
                    cardsCleared = clearedNow,
                    animating = animating,
                ),
            )
        }

        if (alreadyRevealed) {
            val win = dealt.outcome?.isWin == true
            val gone = dealt.outcome != null && !win
            cleared = gone
            facesSettled = !gone
            report(animating = false, faceUpNow = !gone, clearedNow = gone)
            previous.value = RestingHand(if (gone) emptyList() else dealt.hand, keepsCards = win)
            currentOnRevealed(round)
            return@LaunchedEffect
        }

        lifts.forEach { it.snapTo(0f) }
        report(animating = true, faceUpNow = false, clearedNow = false)

        if (leavingWin) {
            fold(folds, (0 until HAND_SIZE).toSet(), pace, instant)
            departed = true
            resetIncoming(approaches, folds, rotations, faceUp, ready)
        }

        val replaced = (0 until HAND_SIZE).filter { !dealt.held.getOrElse(it) { true } }.toSet()
        if (dealt.outcome != null) {
            fold(folds, replaced, pace, instant, DISCARD_MS, DISCARD_STAGGER_MS)
            replaced.forEach { index ->
                folds[index].snapTo(0f)
                approaches[index].snapTo(0f)
                rotations[index].snapTo(180f)
                faceUp[index] = false
                ready[index] = false
            }
            discardsGone = true
            arrive(replaced, approaches, rotations, faceUp, ready, pace, instant, currentOnFlip)
        } else {
            val openingDeal = FirstHands.applies(dealt.lifetimeHands, dealt.variant)
            arrive(
                (0 until HAND_SIZE).toSet(),
                approaches,
                rotations,
                faceUp,
                ready,
                pace,
                instant,
                currentOnFlip,
                staggerMs = if (openingDeal) OPENING_DEAL_STAGGER_MS else DEAL_STAGGER_MS,
                stiffness = if (openingDeal) OPENING_DEAL_STIFFNESS else APPROACH_STIFFNESS,
                damping = if (openingDeal) OPENING_DEAL_DAMPING else APPROACH_DAMPING,
                flipMs = if (openingDeal) OPENING_DEAL_FLIP_MS else FLIP_MS,
            )
        }

        facesSettled = true
        currentOnRevealed(round)

        val won = dealt.outcome?.isWin == true
        if (dealt.outcome != null && !won) {
            report(animating = true, faceUpNow = true, clearedNow = false)
            if (!instant) delay((LOSS_READ_MS * pace).toLong())
            repeat(HAND_SIZE) { ready[it] = false }
            fold(folds, (0 until HAND_SIZE).toSet(), pace, instant)
            cleared = true
            facesSettled = false
            report(animating = false, faceUpNow = false, clearedNow = true)
            previous.value = RestingHand(emptyList(), keepsCards = false)
        } else if (won) {
            report(animating = false, faceUpNow = true, clearedNow = false)
            previous.value = RestingHand(dealt.hand, keepsCards = true)
        } else {
            report(animating = false, faceUpNow = true, clearedNow = false)
            previous.value = RestingHand(dealt.hand, keepsCards = false)
        }
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
    val holdAction = stringResource(R.string.card_hold_action)
    val dealAction = stringResource(R.string.play_deal)
    val holdable = game.phase == Phase.HOLD
    val showingResult = outcome != null && facesSettled
    val anyHeld = game.held.any { it }
    val dealTravel = if (outcome == null && FirstHands.applies(game.lifetimeHands, game.variant)) {
        OPENING_DEAL_TRAVEL
    } else {
        1f
    }

    val shown = when {
        cleared -> emptyList()
        leavingWin -> kept?.cards ?: game.hand
        !discardsGone && outcome != null -> List(HAND_SIZE) { index ->
            if (!game.held.getOrElse(index) { false }) game.dealtHand.getOrElse(index) { game.hand[index] }
            else game.hand[index]
        }
        else -> game.hand
    }

    if (shown.size != HAND_SIZE) {
        Spacer(modifier.height(8.dp).testTag("hand-cleared"))
        return
    }

    Row(
        modifier = modifier
            .fillMaxWidth()
            .animateContentSize()
            .padding(top = 20.dp),
        horizontalArrangement = Arrangement.spacedBy(9.dp),
    ) {
        shown.forEachIndexed { index, card ->
            val won = showingResult && index in highlighted
            val isHeld = !showingResult && game.held.getOrElse(index) { false }
            val badge = when {
                isHeld -> heldLabel
                won && result != null -> winBadgeFor(shown, result.type, index)?.text()
                else -> null
            }
            PlayingCard(
                card = card,
                rotation = rotations[index],
                visual = CardVisual(
                    held = isHeld,
                    dimmed = !showingResult && anyHeld && !game.held.getOrElse(index) { false },
                    highlighted = won,
                    hinted = hints.getOrElse(index) { false } && !isHeld,
                    badge = badge,
                ),
                lift = lifts[index],
                description = cardDescription(card, held = isHeld),
                // A card can only be held once it has landed face up.
                clickLabel = when {
                    holdable && ready[index] -> holdAction
                    onTapToDeal != null && ready[index] -> dealAction
                    else -> null
                },
                onClick = { if (holdable) onToggleHold(index) else onTapToDeal?.invoke() },
                approach = approaches[index],
                fold = folds[index],
                gather = index - 2f,
                dealTravel = dealTravel,
                modifier = Modifier
                    .weight(1f)
                    .onGloballyPositioned { onCardPlaced(index, it) }
                    .testTag("card-$index"),
            )
        }
    }
}

private suspend fun arrive(
    indices: Set<Int>,
    approaches: List<Animatable<Float, AnimationVector1D>>,
    rotations: List<Animatable<Float, AnimationVector1D>>,
    faceUp: MutableList<Boolean>,
    ready: MutableList<Boolean>,
    pace: Float,
    instant: Boolean,
    onFlip: () -> Unit,
    staggerMs: Long = DEAL_STAGGER_MS,
    stiffness: Float = APPROACH_STIFFNESS,
    damping: Float = APPROACH_DAMPING,
    flipMs: Int = FLIP_MS,
) {
    if (instant) {
        indices.forEach { index ->
            approaches[index].snapTo(1f)
            rotations[index].snapTo(0f)
            faceUp[index] = true
            ready[index] = true
            onFlip()
        }
        return
    }
    val seat = spring<Float>(dampingRatio = damping, stiffness = stiffness)
    val turn = tween<Float>((flipMs * pace).toInt().coerceAtLeast(1), easing = FastOutSlowInEasing)
    coroutineScope {
        indices.sorted().forEachIndexed { order, index ->
            launch {
                delay(order * (staggerMs * pace).toLong())
                approaches[index].animateTo(1f, seat)
                onFlip()
                rotations[index].animateTo(0f, turn)
                faceUp[index] = true
                ready[index] = true
            }
        }
    }
}

private suspend fun fold(
    folds: List<Animatable<Float, AnimationVector1D>>,
    indices: Set<Int>,
    pace: Float,
    instant: Boolean,
    durationMs: Int = FOLD_MS,
    staggerMs: Long = FOLD_STAGGER_MS,
) {
    if (indices.isEmpty()) return
    if (instant) {
        indices.forEach { folds[it].snapTo(1f) }
        return
    }
    val spec = tween<Float>((durationMs * pace).toInt().coerceAtLeast(1), easing = FastOutLinearInEasing)
    coroutineScope {
        indices.sorted().forEachIndexed { order, index ->
            launch {
                delay(order * (staggerMs * pace).toLong())
                folds[index].animateTo(1f, spec)
            }
        }
    }
}

private suspend fun resetIncoming(
    approaches: List<Animatable<Float, AnimationVector1D>>,
    folds: List<Animatable<Float, AnimationVector1D>>,
    rotations: List<Animatable<Float, AnimationVector1D>>,
    faceUp: MutableList<Boolean>,
    ready: MutableList<Boolean>,
) {
    repeat(HAND_SIZE) { index ->
        folds[index].snapTo(0f)
        approaches[index].snapTo(0f)
        rotations[index].snapTo(180f)
        faceUp[index] = false
        ready[index] = false
    }
}
