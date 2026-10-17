package com.micorlov.videopoker.nativeapp.ui.play

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.animateScrollBy
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.toggleable
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.LayoutCoordinates
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.layout.positionInWindow
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.micorlov.videopoker.nativeapp.R
import com.micorlov.videopoker.nativeapp.audio.SoundCue
import com.micorlov.videopoker.nativeapp.domain.CoachTarget
import com.micorlov.videopoker.nativeapp.domain.FirstHands
import com.micorlov.videopoker.nativeapp.domain.GameState
import com.micorlov.videopoker.nativeapp.domain.HandType
import com.micorlov.videopoker.nativeapp.domain.Phase
import com.micorlov.videopoker.nativeapp.ui.Feedback
import com.micorlov.videopoker.nativeapp.ui.UiState
import com.micorlov.videopoker.nativeapp.ui.components.ActionButton
import com.micorlov.videopoker.nativeapp.ui.text.cardDescription
import com.micorlov.videopoker.nativeapp.ui.text.labelRes
import com.micorlov.videopoker.nativeapp.ui.theme.VpColors

@Immutable
data class PlayActions(
    val onMainAction: () -> Unit,
    val onToggleHold: (Int) -> Unit,
    val onSelectBet: (Int) -> Unit,
    val onRevealed: (Int) -> Unit,
    val onToggleSound: () -> Unit,
    val onToggleHints: () -> Unit,
    val onAllIn: () -> Unit,
    val onAllInTipSeen: () -> Unit,
    val onHintsTipSeen: () -> Unit,
    val onAllInConfirmed: () -> Unit,
    val onAllInDismissed: () -> Unit,
    val onDoubleUp: () -> Unit,
    val onPickDoubleUp: (Int) -> Unit,
    val onDoubleUpRevealed: (Int) -> Unit,
    /** Speaks the current tutorial step. No-op once the opening hands are over. */
    val onSpeak: (String) -> Unit,
    /** Opens the Friends tab; null hides the invite badge (friends switched off). */
    val onOpenFriends: (() -> Unit)? = null,
)

private val SHAKE_STEPS = listOf(10f, -10f, 8f, -8f, 4f, 0f)

/** The table: balance, bet, the five cards, Deal / Draw, and what the last hand paid. */
@Composable
fun PlayScreen(
    ui: UiState,
    celebration: Celebration?,
    feedback: Feedback,
    actions: PlayActions,
    modifier: Modifier = Modifier,
) {
    val game = ui.game
    val pace = ui.settings.gameSpeed.pace
    val hints = ui.holdAnalysis?.takeIf { ui.settings.hintsEnabled }?.bestHolds().orEmpty()
    val balanceRevealed = if (game.doubleUp != null) ui.doubleUpRevealed else ui.revealed
    val displayedBalance = rememberDisplayedBalance(game, balanceRevealed, pace) { feedback.play(SoundCue.COIN) }

    val shake = remember { Animatable(0f) }
    LaunchedEffect(celebration?.id) {
        if (celebration?.tier == CelebrationTier.FIREWORKS) SHAKE_STEPS.forEach { shake.animateTo(it, tween(60)) }
    }

    val placement = remember { TablePlacement() }
    val scroll = rememberScrollState()
    val coach = FirstHands.coach(
        lifetimeHands = game.lifetimeHands,
        variant = game.variant,
        phase = game.phase,
        hand = game.hand,
        held = game.held,
        cardsFaceUp = ui.revealed,
        hintsExplained = ui.hintsTipSeen,
        allInExplained = ui.allInTipSeen,
    )
    val spoken = coachSpoken(coach, game)
    LaunchedEffect(coach) { spoken?.let(actions.onSpeak) }
    val hole = placement.cardsTick.let { coachHole(placement, coach) }
    val onHintsPlaced = remember { placement::placeHints }
    val onAllInPlaced = remember { placement::placeAllIn }
    val onToggleHints = remember(coach, actions) {
        {
            if (coach is CoachTarget.Hints) actions.onHintsTipSeen()
            actions.onToggleHints()
        }
    }
    val onAllIn = remember(coach, actions) {
        {
            if (coach is CoachTarget.AllIn) actions.onAllInTipSeen() else actions.onAllIn()
        }
    }
    val localDensity = LocalDensity.current
    LaunchedEffect(coach, hole) {
        val rect = hole ?: return@LaunchedEffect
        val viewHeight = placement.root?.takeIf { it.isAttached }?.size?.height?.toFloat() ?: return@LaunchedEffect
        val pointingAtCard = coach is CoachTarget.Hold || coach is CoachTarget.Release ||
            coach is CoachTarget.Hints || coach is CoachTarget.AllIn
        val handRoom = with(localDensity) { 140.dp.toPx() }
        val edge = with(localDensity) { 8.dp.toPx() }
        val marginTop = if (pointingAtCard) edge else handRoom
        val marginBottom = if (pointingAtCard) handRoom else edge
        val delta = when {
            rect.bottom + marginBottom - viewHeight > 8f -> rect.bottom + marginBottom - viewHeight
            marginTop - rect.top > 8f -> rect.top - marginTop
            else -> 0f
        }
        if (delta != 0f) scroll.animateScrollBy(delta)
    }

    ui.allInOffer?.let { AllInSheet(it, actions.onAllInConfirmed, actions.onAllInDismissed) }

    Box(
        modifier = modifier
            .fillMaxSize()
            .onGloballyPositioned { placement.root = it },
    ) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .graphicsLayer { translationX = shake.value * density }
            .verticalScroll(scroll)
            .padding(horizontal = 16.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Header(
            ui,
            onToggleSound = actions.onToggleSound,
            onToggleHints = onToggleHints,
            onHintsPlaced = onHintsPlaced,
        )
        actions.onOpenFriends?.let { InviteBadge(it, Modifier.align(Alignment.End)) }
        BalancePanel(displayedBalance, game)
        BetRow(
            game,
            ui.allInRemaining,
            actions.onSelectBet,
            onAllIn = onAllIn,
            onAllInPlaced = onAllInPlaced,
        )

        val onFlip = {
            feedback.play(SoundCue.DEAL)
            feedback.haptics.light()
        }
        val doubleUp = game.doubleUp
        // Only the Deal button starts the next hand. A tap on the cards must not,
        // including once the result is up and Deal is the way forward.
        if (doubleUp != null) {
            DoubleUpRow(
                doubleUp = doubleUp,
                revealed = ui.doubleUpRevealed,
                pace = pace,
                onPick = { index ->
                    feedback.play(SoundCue.CLICK)
                    feedback.haptics.light()
                    actions.onPickDoubleUp(index)
                },
                onTapToDeal = null,
                onFlip = onFlip,
                onRevealed = actions.onDoubleUpRevealed,
            )
        } else {
            HandRow(
                game = game,
                alreadyRevealed = ui.revealed,
                celebration = celebration,
                hints = hints,
                pace = pace,
                onToggleHold = { index ->
                    feedback.play(SoundCue.CLICK)
                    feedback.haptics.light()
                    actions.onToggleHold(index)
                },
                onTapToDeal = null,
                onFlip = onFlip,
                onRevealed = actions.onRevealed,
                onCardPlaced = placement::placeCard,
            )
        }

        val drawing = game.phase == Phase.HOLD
        val picking = game.phase == Phase.DOUBLE_UP
        Column(
            Modifier.fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            ActionButton(
                text = stringResource(
                    when {
                        picking -> R.string.play_pick_card
                        drawing -> R.string.play_draw
                        else -> R.string.play_deal
                    },
                ),
                icon = if (drawing) "↻" else "♠",
                onClick = {
                    if (!drawing) feedback.haptics.medium()
                    actions.onMainAction()
                },
                enabled = !picking,
                color = when {
                    picking -> Color.Unspecified
                    drawing -> VpColors.Draw
                    else -> VpColors.Deal
                },
                colorDeep = when {
                    picking -> Color.Unspecified
                    drawing -> VpColors.DrawDeep
                    else -> VpColors.DealDeep
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .onGloballyPositioned { placement.button = it }
                    .testTag("main-button"),
            )
            if (!picking) {
                Text(
                    text = stringResource(if (drawing) R.string.play_draw_help else R.string.play_deal_help),
                    modifier = Modifier.testTag("main-button-help"),
                    color = VpColors.TextMuted,
                    fontSize = 12.sp,
                    textAlign = TextAlign.Center,
                )
            }
        }

        ResultPanel(ui, actions.onDoubleUp)

        // Below the button, never above it: the extra hands appear a moment after the draw and
        // must not push Deal out from under the player's thumb.
        if (ui.revealed && doubleUp == null) {
            game.outcome?.takeIf { it.extraHands.isNotEmpty() }?.let { ExtraHandsPanel(it) }
        }

        StreakBar(game)
        PaytableCard(
            game = game,
            highlight = if (ui.revealed && doubleUp == null) game.outcome?.bestType?.takeIf { it != HandType.NOTHING } else null,
        )
    }

    val spot = hole
    if (coach != null && spot != null && spot.width > 1f && spot.height > 1f) {
        val action = stringResource(if (game.phase == Phase.HOLD) R.string.play_draw else R.string.play_deal)
        val label = when (coach) {
            is CoachTarget.Hold -> stringResource(R.string.coach_hold)
            is CoachTarget.Release -> stringResource(R.string.coach_release)
            CoachTarget.Hints -> stringResource(R.string.coach_hints)
            CoachTarget.AllIn -> stringResource(R.string.coach_all_in)
            CoachTarget.Draw, CoachTarget.Deal -> stringResource(R.string.coach_press, action)
        }
        CoachOverlay(
            hole = spot,
            label = label,
            pointsUp = coach is CoachTarget.Hold || coach is CoachTarget.Release ||
                coach is CoachTarget.Hints || coach is CoachTarget.AllIn,
        )
    }
    }
}

/** What the tutorial says out loud. Null once the opening hands are over. */
@Composable
private fun coachSpoken(coach: CoachTarget?, game: GameState): String? {
    coach ?: return null
    return when (coach) {
        is CoachTarget.Hold -> voiceCard(R.string.coach_hold_voice, game, coach.index)
        is CoachTarget.Release -> voiceCard(R.string.coach_release_voice, game, coach.index)
        CoachTarget.Hints -> stringResource(R.string.coach_hints)
        CoachTarget.AllIn -> stringResource(R.string.coach_all_in)
        CoachTarget.Draw -> stringResource(R.string.coach_press, stringResource(R.string.play_draw))
        CoachTarget.Deal -> stringResource(R.string.coach_press, stringResource(R.string.play_deal))
    }
}

@Composable
private fun voiceCard(phrase: Int, game: GameState, index: Int): String {
    val card = game.hand.getOrNull(index) ?: return stringResource(phrase, "")
    return stringResource(phrase, cardDescription(card, held = false))
}

/** Where the cards and the deal button sit, in the table's own coordinates. */
private class TablePlacement {
    var root by mutableStateOf<LayoutCoordinates?>(null)
    var button by mutableStateOf<LayoutCoordinates?>(null)
    var hints by mutableStateOf<LayoutCoordinates?>(null)
    var allIn by mutableStateOf<LayoutCoordinates?>(null)
    var cardsTick by mutableIntStateOf(0)
    val cards = arrayOfNulls<LayoutCoordinates>(5)

    fun placeCard(index: Int, coords: LayoutCoordinates) {
        if (index !in cards.indices) return
        cards[index] = coords
        cardsTick++
    }

    fun placeHints(coords: LayoutCoordinates) {
        if (hints.sameSpot(coords)) return
        hints = coords
    }

    fun placeAllIn(coords: LayoutCoordinates) {
        if (allIn.sameSpot(coords)) return
        allIn = coords
    }
}

private fun LayoutCoordinates?.sameSpot(next: LayoutCoordinates): Boolean {
    val current = this ?: return false
    if (!current.isAttached || !next.isAttached) return false
    return current.size == next.size && current.positionInWindow() == next.positionInWindow()
}

private fun coachHole(placement: TablePlacement, coach: CoachTarget?): Rect? {
    if (coach == null) return null
    val root = placement.root ?: return null
    val target = when (coach) {
        is CoachTarget.Hold -> placement.cards.getOrNull(coach.index)
        is CoachTarget.Release -> placement.cards.getOrNull(coach.index)
        CoachTarget.Hints -> placement.hints
        CoachTarget.AllIn -> placement.allIn
        CoachTarget.Draw, CoachTarget.Deal -> placement.button
    } ?: return null
    if (!root.isAttached || !target.isAttached) return null
    val topLeft = root.localPositionOf(target, Offset.Zero)
    return Rect(topLeft, Size(target.size.width.toFloat(), target.size.height.toFloat()))
}

@Composable
private fun Header(
    ui: UiState,
    onToggleSound: () -> Unit,
    onToggleHints: () -> Unit,
    onHintsPlaced: (LayoutCoordinates) -> Unit,
) {
    val soundOn = ui.settings.soundEnabled
    val hintsOn = ui.settings.hintsEnabled
    val hintsLabel = stringResource(if (hintsOn) R.string.play_hints_on else R.string.play_hints_off)
    val soundLabel = stringResource(if (soundOn) R.string.play_sound_on else R.string.play_sound_off)

    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
        Column {
            Text(
                text = stringResource(R.string.play_title),
                color = VpColors.Text,
                fontSize = 24.sp,
                fontWeight = FontWeight.Bold,
            )
            Text(
                text = stringResource(ui.game.variant.labelRes()) + " · " + stringResource(R.string.play_level, ui.game.level),
                modifier = Modifier.testTag("level"),
                color = VpColors.TextMuted,
                fontSize = 13.sp,
            )
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Box(
            Modifier
                .size(48.dp)
                .clip(CircleShape)
                .background(if (hintsOn) VpColors.Hint.copy(alpha = 0.45f) else VpColors.Surface)
                .semantics { contentDescription = hintsLabel }
                .toggleable(value = hintsOn, role = Role.Switch, onValueChange = { onToggleHints() })
                .onGloballyPositioned(onHintsPlaced)
                .testTag("hints-toggle"),
            contentAlignment = Alignment.Center,
        ) {
            Text("💡", fontSize = 20.sp, modifier = Modifier.clearAndSetSemantics { })
        }
        Box(
            Modifier
                .size(48.dp)
                .clip(CircleShape)
                .background(VpColors.Surface)
                .semantics { contentDescription = soundLabel }
                .toggleable(value = soundOn, role = Role.Switch, onValueChange = { onToggleSound() })
                .testTag("sound-toggle"),
            contentAlignment = Alignment.Center,
        ) {
            Text(if (soundOn) "🔊" else "🔇", fontSize = 20.sp, modifier = Modifier.clearAndSetSemantics { })
        }
        }
    }
}
