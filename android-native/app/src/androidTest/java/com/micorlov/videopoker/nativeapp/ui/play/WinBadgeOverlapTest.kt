package com.micorlov.videopoker.nativeapp.ui.play

import android.content.Context
import android.content.res.Configuration
import android.os.LocaleList
import android.util.Log
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.test.getBoundsInRoot
import androidx.compose.ui.test.hasTestTag
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.test.core.app.ApplicationProvider
import com.micorlov.videopoker.nativeapp.domain.AppLanguage
import com.micorlov.videopoker.nativeapp.domain.Card
import com.micorlov.videopoker.nativeapp.domain.DrawOutcome
import com.micorlov.videopoker.nativeapp.domain.GameState
import com.micorlov.videopoker.nativeapp.domain.HandResult
import com.micorlov.videopoker.nativeapp.domain.HandType
import com.micorlov.videopoker.nativeapp.domain.Phase
import com.micorlov.videopoker.nativeapp.domain.PlayStats
import com.micorlov.videopoker.nativeapp.domain.Rank
import com.micorlov.videopoker.nativeapp.domain.Suit
import com.micorlov.videopoker.nativeapp.domain.Variant
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import java.util.Locale

/**
 * A Three of a Kind paints the same gold label on three neighbouring cards. The labels have to
 * stay inside their own cards at a phone's content width and on a narrower row.
 */
class WinBadgeOverlapTest {

    @get:Rule
    val compose = createComposeRule()

    @Test
    fun threeOfAKindLabelsStayInsideTheirCards() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        // 328dp is a 360dp phone after the play screen's 16dp side padding. 240dp is narrower.
        val cases = listOf(AppLanguage.ENGLISH, AppLanguage.HEBREW).flatMap { language ->
            listOf(328.dp, 240.dp).map { language to it }
        }
        compose.setContent {
            Column {
                cases.forEach { (language, rowWidth) ->
                    CompositionLocalProvider(
                        LocalContext provides context.withLanguage(language),
                        LocalLayoutDirection provides if (language.isRtl) LayoutDirection.Rtl else LayoutDirection.Ltr,
                    ) {
                        HandRow(
                            game = threeOfAKind(),
                            alreadyRevealed = true,
                            celebration = null,
                            hints = List(5) { false },
                            pace = 1f,
                            onToggleHold = {},
                            onTapToDeal = null,
                            onFlip = {},
                            onRevealed = {},
                            onStakeWindow = {},
                            modifier = Modifier.width(rowWidth),
                        )
                    }
                }
            }
        }
        compose.waitForIdle()

        val badgeNodes = compose.onAllNodes(hasTestTag("win-badge"), useUnmergedTree = true)
        val cardNodes = compose.onAllNodes(hasTestTag("card-0"), useUnmergedTree = true)
        assertEquals(cases.size * 3, badgeNodes.fetchSemanticsNodes().size)
        assertEquals(cases.size, cardNodes.fetchSemanticsNodes().size)

        cases.forEachIndexed { row, (language, rowWidth) ->
            val badgeBounds = (0 until 3).map { badgeNodes[row * 3 + it].getBoundsInRoot() }
            val cardBounds = (0 until 5).map {
                compose.onAllNodes(hasTestTag("card-$it"), useUnmergedTree = true)[row].getBoundsInRoot()
            }
            val sorted = badgeBounds.sortedBy { it.left.value }
            val report = buildString {
                append("$language row=$rowWidth")
                sorted.forEachIndexed { index, bounds ->
                    append(" badge$index=[${bounds.left.value}, ${bounds.right.value}] w=${(bounds.right - bounds.left).value}")
                }
            }
            Log.i(TAG, report)

            for (index in 0 until sorted.size - 1) {
                assertTrue(
                    "$report overlap ${sorted[index].right} > ${sorted[index + 1].left}",
                    sorted[index].right <= sorted[index + 1].left,
                )
            }
            for (badge in badgeBounds) {
                val mid = (badge.left + badge.right) / 2
                val card = cardBounds.minBy { kotlin.math.abs(((it.left + it.right) / 2).value - mid.value) }
                assertTrue(
                    "$report badge $badge escapes card $card",
                    badge.left >= card.left && badge.right <= card.right,
                )
            }
        }
    }

    private fun threeOfAKind(): GameState {
        val cards = listOf(
            Card(Rank.KING, Suit.SPADES),
            Card(Rank.KING, Suit.HEARTS),
            Card(Rank.KING, Suit.DIAMONDS),
            Card(Rank.FOUR, Suit.CLUBS),
            Card(Rank.NINE, Suit.SPADES),
        )
        return GameState(
            phase = Phase.BET,
            variant = Variant.JACKS,
            handCount = 1,
            bet = 5,
            balance = 1000,
            hand = cards,
            dealtHand = cards,
            deck = emptyList(),
            held = List(5) { false },
            payoutBonus = 0,
            lossStreak = 0,
            winStreak = 0,
            bestBalance = 1000,
            lifetimeHands = 10,
            today = PlayStats(),
            allTime = PlayStats(),
            outcome = DrawOutcome(
                result = HandResult(HandType.THREE_OF_A_KIND, winIndices = listOf(0, 1, 2)),
                bestType = HandType.THREE_OF_A_KIND,
                extraHands = emptyList(),
                baseWin = 15,
                streakBonus = 0,
                totalWin = 15,
                totalBet = 5,
                multiplier = 3,
            ),
            round = 1,
        )
    }

    private fun Context.withLanguage(language: AppLanguage): Context {
        val locale = Locale.forLanguageTag(language.tag)
        val configuration = Configuration(resources.configuration)
        configuration.setLocales(LocaleList(locale))
        configuration.setLayoutDirection(locale)
        return createConfigurationContext(configuration)
    }

    private companion object {
        const val TAG = "WinBadgeOverlap"
    }
}
