package com.micorlov.videopoker.nativeapp

import android.content.Context
import androidx.compose.ui.test.assertDoesNotExist
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertIsEnabled
import androidx.compose.ui.test.assertTextContains
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onAllNodesWithTag
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.test.core.app.ApplicationProvider
import com.micorlov.videopoker.nativeapp.R
import com.micorlov.videopoker.nativeapp.data.GameRepository
import com.micorlov.videopoker.nativeapp.data.SharedPreferencesStore
import com.micorlov.videopoker.nativeapp.domain.SavedGame
import com.micorlov.videopoker.nativeapp.ui.GameViewModel
import com.micorlov.videopoker.nativeapp.ui.VideoPokerApp
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import kotlin.random.Random

/**
 * Drives the real screens end to end. Each test gets an empty private preferences file and a
 * seeded Random, so the deal is deterministic and no test sees another's saved chips.
 */
class VideoPokerAppTest {

    @get:Rule
    val compose = createComposeRule()

    private lateinit var repository: GameRepository

    @Before
    fun freshSaveFile() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        val prefs = context.getSharedPreferences("test_${System.nanoTime()}", Context.MODE_PRIVATE)
        repository = GameRepository(SharedPreferencesStore(prefs))
    }

    private fun launch(saved: SavedGame = SavedGame(), seed: Int = 11) {
        repository.saveGame(saved)
        val viewModel = GameViewModel(repository, Random(seed))
        compose.setContent { VideoPokerApp(viewModel) }
    }

    @Test
    fun theOpeningTutorialPointsAtTheWinningCardsThenDraw() {
        launch()
        compose.waitUntil(timeoutMillis = 5_000) {
            compose.onAllNodesWithTag("coach-label").fetchSemanticsNodes().isNotEmpty()
        }

        val context = ApplicationProvider.getApplicationContext<Context>()
        compose.onNodeWithTag("coach-label").assertTextContains(context.getString(R.string.coach_hints))
        compose.onNodeWithTag("hints-toggle").performClick()
        compose.onNodeWithTag("coach-label").assertTextContains(context.getString(R.string.coach_all_in))
        compose.onNodeWithTag("bet-allin").performClick()
        compose.onNodeWithTag("allin-sheet").assertDoesNotExist()
        compose.onNodeWithTag("coach-label").assertTextContains(context.getString(R.string.coach_hold))
        compose.onNodeWithTag("card-1").performClick()
        compose.onNodeWithTag("card-3").performClick()
        compose.onNodeWithTag("coach-label").assertTextContains(context.getString(R.string.play_draw), substring = true, ignoreCase = true)

        val deal = context.getString(R.string.play_deal)
        compose.onNodeWithTag("main-button").performClick()
        compose.waitUntil(timeoutMillis = 5_000) {
            compose.onAllNodesWithTag("coach-label").fetchSemanticsNodes().any { node ->
                node.config.any { (_, value) -> value.toString().contains(deal, ignoreCase = true) }
            }
        }
        compose.onNodeWithTag("coach-label").assertTextContains(deal, substring = true, ignoreCase = true)
    }

    @Test
    fun launchDealsAHandAndChargesTheStake() {
        launch()

        (0..4).forEach { compose.onNodeWithTag("card-$it").assertIsDisplayed() }
        compose.onNodeWithTag("balance").assertTextContains("990")
        compose.onNodeWithTag("total-bet").assertTextContains("10")
        compose.onNodeWithTag("main-button").assertTextContains("Draw", ignoreCase = true)
    }

    @Test
    fun tappingACardHoldsItAndTappingAgainReleasesIt() {
        launch()
        compose.waitForIdle()

        compose.onNodeWithTag("card-1").performClick()
        compose.onNodeWithText("HELD").assertIsDisplayed()

        compose.onNodeWithTag("card-1").performClick()
        compose.onNodeWithText("HELD").assertDoesNotExist()
    }

    @Test
    fun drawingFinishesTheHandAndShowsTheNextAction() {
        launch()
        compose.waitForIdle()

        compose.onNodeWithTag("main-button").performClick()
        compose.waitForIdle()

        compose.onNodeWithTag("main-button").assertTextContains("Deal", ignoreCase = true)
        compose.onNodeWithTag("result-panel").assertIsDisplayed()
        // Betting reopens between hands.
        compose.onNodeWithTag("bet-20").assertIsEnabled()
    }

    @Test
    fun betChipsAreLockedWhileAHandIsInProgress() {
        launch()
        compose.waitForIdle()

        compose.onNodeWithTag("bet-50").performClick()
        compose.onNodeWithTag("total-bet").assertTextContains("10")
    }

    @Test
    fun aBrokePlayerGetsAFreeRebuyWithAToast() {
        launch(SavedGame(balance = 0))

        compose.onNodeWithTag("balance").assertTextContains("990")
        compose.onNodeWithTag("toast").assertTextContains("credits", substring = true)
    }

    @Test
    fun settingsShowsLockedVariantsAndExplainsWhyTheyCannotBePicked() {
        launch()
        compose.waitForIdle()

        compose.onNodeWithTag("tab-settings").performClick()
        compose.onNodeWithTag("variant-deuces").assertTextContains("level 3", substring = true)

        compose.onNodeWithTag("variant-deuces").performScrollTo().performClick()
        compose.waitUntil(timeoutMillis = 3_000) { compose.onAllNodesWithTag("toast").fetchSemanticsNodes().isNotEmpty() }
        compose.onNodeWithTag("toast").assertTextContains("Finish the current hand first")
    }

    @Test
    fun statsShowsTheProgressTowardTheNextUnlock() {
        launch()
        compose.waitForIdle()

        compose.onNodeWithTag("tab-stats").performClick()
        compose.onNodeWithTag("progress-panel").assertIsDisplayed()
        compose.onNode(hasText("Deuces Wild unlocks at level 3")).assertIsDisplayed()
    }

    @Test
    fun theSelectedThemeIsSaved() {
        launch()
        compose.waitForIdle()

        compose.onNodeWithTag("tab-settings").performClick()
        compose.onNodeWithTag("theme-blue").performClick()
        compose.waitForIdle()

        assertEquals("blue", repository.loadSettings().theme.storageKey)
    }
}
