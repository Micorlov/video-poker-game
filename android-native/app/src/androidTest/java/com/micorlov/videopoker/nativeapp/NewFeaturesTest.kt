package com.micorlov.videopoker.nativeapp

import android.content.Context
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertTextContains
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.compose.ui.test.performTouchInput
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.test.swipe
import androidx.test.core.app.ApplicationProvider
import com.micorlov.videopoker.nativeapp.data.GameRepository
import com.micorlov.videopoker.nativeapp.data.SharedPreferencesStore
import com.micorlov.videopoker.nativeapp.domain.SavedGame
import com.micorlov.videopoker.nativeapp.ui.GameViewModel
import com.micorlov.videopoker.nativeapp.ui.VideoPokerApp
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import kotlin.random.Random

/** Daily bonus, strategy hints and ALL IN, driven through the real screens. */
class NewFeaturesTest {

    @get:Rule
    val compose = createComposeRule()

    private lateinit var repository: GameRepository

    @Before
    fun freshSaveFile() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        val prefs = context.getSharedPreferences("newfeatures_${System.nanoTime()}", Context.MODE_PRIVATE)
        repository = GameRepository(SharedPreferencesStore(prefs))
    }

    private fun launch(saved: SavedGame = SavedGame(), today: String? = null) {
        repository.saveGame(saved)
        val viewModel = GameViewModel(repository, Random(11), todayKey = today?.let { day -> { day } })
        compose.setContent { VideoPokerApp(viewModel) }
        compose.waitForIdle()
    }

    @Test
    fun theFirstLaunchOfADayPaysTheDailyBonus() {
        launch(today = "2026-10-12")

        compose.onNodeWithTag("toast").assertTextContains("Daily bonus: +200", substring = true)
        compose.onNodeWithTag("balance").assertTextContains("1,190")
    }

    @Test
    fun turningHintsOnShowsAToast() {
        launch()

        compose.onNodeWithTag("hints-toggle").performClick()
        compose.onNodeWithTag("toast").assertTextContains("Hints on", substring = true)
    }

    @Test
    fun allInNeedsASlideAndCanBeUsedOncePerDay() {
        launch(SavedGame(balance = 500), today = "2026-10-12")

        compose.onNodeWithTag("bet-allin").performScrollTo().performClick()
        compose.onNodeWithTag("allin-sheet").assertIsDisplayed()
        compose.onNodeWithTag("allin-sub").assertTextContains("credits", substring = true)

        // Grab the thumb at the left end and drag it all the way across the track.
        compose.onNodeWithTag("allin-slider").performTouchInput {
            swipe(start = Offset(40f, centerY), end = Offset(width - 5f, centerY))
        }
        compose.waitForIdle()

        compose.onNodeWithTag("toast").assertTextContains("ALL IN", substring = true)
        compose.onNodeWithTag("bet-allin").performScrollTo().assertTextContains("0 left", substring = true)
    }

    @Test
    fun notNowClosesTheAllInSheetWithoutSpendingIt() {
        launch(SavedGame(balance = 500), today = "2026-10-12")

        compose.onNodeWithTag("bet-allin").performScrollTo().performClick()
        compose.onNodeWithTag("allin-dismiss").performClick()
        compose.waitForIdle()

        compose.onNodeWithTag("bet-allin").performScrollTo().assertTextContains("1 left", substring = true)
    }

    @Test
    fun theTournamentPillExpandsAndCollapses() {
        launch()

        compose.onNodeWithTag("tournament-expand").assertDoesNotExist()
        compose.onNodeWithTag("tournament-pill").performClick()
        compose.onNodeWithTag("tournament-expand").assertIsDisplayed()
        compose.onNodeWithTag("tournament-pill").performClick()
        compose.onNodeWithTag("tournament-expand").assertDoesNotExist()
    }

    @Test
    fun statsShowsAnEmptyBestHandUntilSomethingIsWon() {
        launch()

        compose.onNodeWithTag("tab-stats").performClick()
        compose.onNodeWithText("No winning hands yet").performScrollTo().assertIsDisplayed()
    }

    @Test
    fun settingsOffersVoiceRateAndMoreGames() {
        launch()

        compose.onNodeWithTag("tab-settings").performClick()
        compose.onNodeWithTag("toggle-voice").performScrollTo().assertIsDisplayed()
        compose.onNodeWithTag("rate-game").performScrollTo().assertIsDisplayed()
        compose.onNodeWithTag("more-games").performScrollTo().assertIsDisplayed()
    }
}
