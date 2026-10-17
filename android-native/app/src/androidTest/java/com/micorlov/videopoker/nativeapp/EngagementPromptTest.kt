package com.micorlov.videopoker.nativeapp

import android.content.Context
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.semantics.getOrNull
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertTextContains
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onAllNodesWithTag
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.test.core.app.ApplicationProvider
import com.micorlov.videopoker.nativeapp.data.GameRepository
import com.micorlov.videopoker.nativeapp.data.SharedPreferencesStore
import com.micorlov.videopoker.nativeapp.domain.EngagementPromptState
import com.micorlov.videopoker.nativeapp.domain.SavedGame
import com.micorlov.videopoker.nativeapp.ui.GameViewModel
import com.micorlov.videopoker.nativeapp.ui.StoreLinks
import com.micorlov.videopoker.nativeapp.ui.VideoPokerApp
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import kotlin.random.Random

/** The ten-turn notification ask and the twenty-reward Play Store ask, on the real table. */
class EngagementPromptTest {

    @get:Rule
    val compose = createComposeRule()

    private lateinit var repository: GameRepository

    @Before
    fun freshSaveFile() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        val prefs = context.getSharedPreferences("engagement_${System.nanoTime()}", Context.MODE_PRIVATE)
        repository = GameRepository(SharedPreferencesStore(prefs))
    }

    @Test
    fun theTenthTurnAsksForNotificationPermission() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        repository.saveGame(SavedGame(lifetimeHands = 9))
        compose.setContent { VideoPokerApp(GameViewModel(repository, Random(11))) }
        waitUntilCardsAreFaceUp()

        compose.onNodeWithTag("main-button").performClick()
        compose.waitUntil(timeoutMillis = 8_000) {
            compose.onAllNodesWithTag("notify-prompt").fetchSemanticsNodes().isNotEmpty()
        }

        compose.onNodeWithTag("notify-prompt").assertIsDisplayed()
        compose.onNodeWithText(context.getString(R.string.prompt_notify_title)).assertIsDisplayed()
        compose.onNodeWithTag("notify-allow").assertIsDisplayed()

        compose.onNodeWithTag("notify-dismiss").performClick()
        compose.waitUntil(timeoutMillis = 5_000) {
            compose.onAllNodesWithTag("notify-prompt").fetchSemanticsNodes().isEmpty()
        }
    }

    @Test
    fun theTwentiethRewardedTurnAsksForFiveStarsAndLinksToThePlayStore() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        val storeUrl = StoreLinks.listingUri(context.packageName).toString()
        repository.saveEngagementPrompts(EngagementPromptState(rewardedTurns = 19, notificationAsked = true))
        repository.saveGame(SavedGame())
        compose.setContent { VideoPokerApp(GameViewModel(repository, Random(11))) }

        val keep = context.getString(R.string.coach_hold)
        compose.waitUntil(timeoutMillis = 5_000) { coachText().contains(keep) }
        listOf(1, 3).forEach { compose.onNodeWithTag("card-$it").performClick() }
        compose.onNodeWithTag("main-button").performClick()

        compose.waitUntil(timeoutMillis = 12_000) {
            compose.onAllNodesWithTag("rating-prompt").fetchSemanticsNodes().isNotEmpty()
        }
        compose.onNodeWithText(context.getString(R.string.prompt_rate_title)).assertIsDisplayed()
        compose.onNodeWithTag("rating-stars").assertTextContains("★★★★★")
        compose.onNodeWithTag("rating-store-link").assertTextContains(storeUrl)
        compose.onNodeWithTag("rating-rate").assertIsDisplayed()
    }

    private fun waitUntilCardsAreFaceUp() {
        val faceDown = ApplicationProvider.getApplicationContext<Context>().getString(R.string.card_face_down)
        compose.waitUntil(timeoutMillis = 5_000) {
            compose.onAllNodesWithTag("card-0").fetchSemanticsNodes().any { node ->
                val description = node.config.getOrNull(SemanticsProperties.ContentDescription).orEmpty().joinToString()
                description.isNotEmpty() && !description.contains(faceDown)
            }
        }
    }

    private fun coachText(): String =
        compose.onAllNodesWithTag("coach-label").fetchSemanticsNodes().joinToString { node ->
            node.config.joinToString { (_, value) -> value.toString() }
        }
}
