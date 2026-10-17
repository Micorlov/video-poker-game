package com.micorlov.videopoker.nativeapp.ui.play

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.micorlov.videopoker.nativeapp.R
import com.micorlov.videopoker.nativeapp.domain.DoubleUp
import com.micorlov.videopoker.nativeapp.domain.DoubleUpResult
import com.micorlov.videopoker.nativeapp.ui.text.cardDescription
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

private const val FLIP_MS = 450f
private const val REST_MS = 250f
private const val CARDS = 5

/**
 * The double-up table: the dealer's card face up on the left (it never turns, so coming back
 * to the tab mid double-up shows it as it was), four face down beside it. The
 * player's pick turns over first, then the rest; when the last lands it reports back through
 * [onRevealed], and only then is the result shown ([revealed] turns true).
 *
 * A double-up already [revealed] when this row is first composed (the player came back from
 * another tab) starts face up: nothing turns over again. [onTapToDeal] stays unset, so a tap
 * on a settled card does not deal; only the Deal button does.
 */
@Composable
fun DoubleUpRow(
    doubleUp: DoubleUp,
    revealed: Boolean,
    pace: Float,
    onPick: (Int) -> Unit,
    onTapToDeal: (() -> Unit)?,
    onFlip: () -> Unit,
    onRevealed: (Int) -> Unit,
    modifier: Modifier = Modifier,
) {
    val number = doubleUp.number
    val dealer = remember { Animatable(0f) }
    val choices = remember(number) { List(doubleUp.choices.size) { Animatable(if (revealed) 0f else 180f) } }
    val lifts = remember { List(CARDS) { Animatable(0f) } }
    val currentOnFlip by rememberUpdatedState(onFlip)
    val currentOnRevealed by rememberUpdatedState(onRevealed)

    val picked = doubleUp.picked
    LaunchedEffect(number, picked) {
        if (picked == null) return@LaunchedEffect
        val flip = tween<Float>((FLIP_MS * pace).toInt(), easing = FastOutSlowInEasing)
        if (choices[picked].value != 0f) {
            currentOnFlip()
            choices[picked].animateTo(0f, flip)
            delay((REST_MS * pace).toLong())
        }
        coroutineScope {
            choices.forEachIndexed { index, rotation -> if (index != picked) launch { rotation.animateTo(0f, flip) } }
        }
        currentOnRevealed(number)
    }

    val dealerLabel = stringResource(R.string.play_double_up_dealer)
    val yoursLabel = stringResource(R.string.play_double_up_yours)
    val pickAction = stringResource(R.string.card_pick_action)
    val dealAction = stringResource(R.string.play_deal)
    val dealLabel = if (onTapToDeal != null) dealAction else null

    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(top = 20.dp)
            .testTag("double-up-row"),
        horizontalArrangement = Arrangement.spacedBy(9.dp),
    ) {
        PlayingCard(
            card = doubleUp.dealer,
            rotation = dealer,
            visual = CardVisual(held = true, badge = dealerLabel),
            lift = lifts[0],
            description = dealerLabel + ": " + cardDescription(doubleUp.dealer, held = false),
            clickLabel = dealLabel,
            onClick = { onTapToDeal?.invoke() },
            modifier = Modifier
                .weight(1f)
                .testTag("double-up-dealer"),
        )
        doubleUp.choices.forEachIndexed { index, card ->
            val mine = index == picked
            PlayingCard(
                card = card,
                rotation = choices[index],
                visual = CardVisual(
                    dimmed = revealed && !mine,
                    highlighted = revealed && mine && doubleUp.result == DoubleUpResult.WIN,
                    badge = if (mine) yoursLabel else null,
                ),
                lift = lifts[index + 1],
                description = cardDescription(card, held = false),
                clickLabel = if (picked == null) pickAction else dealLabel,
                onClick = { if (picked == null) onPick(index) else onTapToDeal?.invoke() },
                modifier = Modifier
                    .weight(1f)
                    .testTag("double-up-card-$index"),
            )
        }
    }
}
