package com.micorlov.videopoker.nativeapp.ui.play

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
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
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.micorlov.videopoker.nativeapp.R
import com.micorlov.videopoker.nativeapp.audio.SoundCue
import com.micorlov.videopoker.nativeapp.domain.HandType
import com.micorlov.videopoker.nativeapp.domain.Phase
import com.micorlov.videopoker.nativeapp.ui.Feedback
import com.micorlov.videopoker.nativeapp.ui.UiState
import com.micorlov.videopoker.nativeapp.ui.components.ActionButton
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
    val onAllInConfirmed: () -> Unit,
    val onAllInDismissed: () -> Unit,
    val onDoubleUp: () -> Unit,
    val onPickDoubleUp: (Int) -> Unit,
    val onDoubleUpRevealed: (Int) -> Unit,
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

    ui.allInOffer?.let { AllInSheet(it, actions.onAllInConfirmed, actions.onAllInDismissed) }

    Column(
        modifier = modifier
            .fillMaxSize()
            .graphicsLayer { translationX = shake.value * density }
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 16.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Header(ui, onToggleSound = actions.onToggleSound, onToggleHints = actions.onToggleHints)
        TournamentPill()
        BalancePanel(displayedBalance, game)
        BetRow(game, ui.allInRemaining, actions.onSelectBet, actions.onAllIn)

        val onFlip = {
            feedback.play(SoundCue.DEAL)
            feedback.haptics.light()
        }
        val doubleUp = game.doubleUp
        val tapToDeal = {
            feedback.haptics.medium()
            actions.onMainAction()
        }
        // Between hands, once the result is up, a tap on the cards deals the next hand.
        val settledAndShown = if (doubleUp != null) ui.doubleUpRevealed else game.phase == Phase.BET && ui.revealed
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
                onTapToDeal = tapToDeal.takeIf { settledAndShown },
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
                onTapToDeal = tapToDeal.takeIf { settledAndShown },
                onFlip = onFlip,
                onRevealed = actions.onRevealed,
            )
        }

        val drawing = game.phase == Phase.HOLD
        val picking = game.phase == Phase.DOUBLE_UP
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
            modifier = Modifier
                .fillMaxWidth()
                .testTag("main-button"),
        )

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
}

@Composable
private fun Header(ui: UiState, onToggleSound: () -> Unit, onToggleHints: () -> Unit) {
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
