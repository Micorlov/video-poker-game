package com.micorlov.videopoker.nativeapp

import android.content.Context
import androidx.compose.ui.test.assert
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertTextContains
import androidx.compose.ui.test.hasAnyDescendant
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.test.core.app.ApplicationProvider
import androidx.test.espresso.Espresso
import com.micorlov.videopoker.nativeapp.data.GameRepository
import com.micorlov.videopoker.nativeapp.data.SharedPreferencesStore
import com.micorlov.videopoker.nativeapp.domain.SavedGame
import com.micorlov.videopoker.nativeapp.ui.GameViewModel
import com.micorlov.videopoker.nativeapp.ui.VideoPokerApp
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import kotlin.random.Random

/**
 * Feature-parity checks for what moved over from the web app (FEATURES.md): each test drives the
 * real UI the way a player would. What did NOT move is covered by the parity sweep in
 * e2e-artifacts/REPORT.md, not asserted here, so these tests don't break when a feature is added.
 */
class FeatureParityTest {

    @get:Rule
    val compose = createComposeRule()

    private lateinit var repository: GameRepository

    @Before
    fun freshSaveFile() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        val prefs = context.getSharedPreferences("parity_${System.nanoTime()}", Context.MODE_PRIVATE)
        repository = GameRepository(SharedPreferencesStore(prefs))
    }

    private fun launch(saved: SavedGame = SavedGame(), seed: Int = 21) {
        repository.saveGame(saved)
        val viewModel = GameViewModel(repository, Random(seed))
        compose.setContent { VideoPokerApp(viewModel) }
        compose.waitForIdle()
    }

    /** Draws the opening hand so the table is between hands and settings can change. */
    private fun finishOpeningHand() {
        compose.onNodeWithTag("main-button").performClick()
        compose.waitForIdle()
    }

    /** Settings is a scrolling list: a person scrolls to a lower row before tapping it, so the test does too. */
    private fun scrollTapSettingsRow(tag: String) {
        compose.onNodeWithTag(tag).performScrollTo().performClick()
        compose.waitForIdle()
    }

    private fun assertVisibleAfterScrolling(text: String) {
        compose.onNodeWithText(text).performScrollTo().assertIsDisplayed()
    }

    private fun openSettings() = compose.onNodeWithTag("tab-settings").performClick()
    private fun openPlay() = compose.onNodeWithTag("tab-play").performClick()
    private fun openStats() = compose.onNodeWithTag("tab-stats").performClick()

    // ---- the four games and their pay tables ----------------------------------------

    @Test
    fun allFourVariantsArePlayableAndEachShowsItsOwnPayTable() {
        launch(SavedGame(lifetimeHands = 100)) // level 21: everything unlocked
        finishOpeningHand()
        openSettings()
        scrollTapSettingsRow("settings-paytable-toggle")

        // A hand that exists only in that game, so the right table is provably on screen.
        val distinctive = listOf(
            "variant-jacks" to "Four of a Kind",
            "variant-deuces" to "Four Deuces",
            "variant-bonus" to "Four 2s-4s",
            "variant-doubleBonus" to "Four Aces",
        )
        distinctive.forEach { (tag, handName) ->
            scrollTapSettingsRow(tag)
            assertVisibleAfterScrolling(handName)
        }

        openPlay()
        compose.onNodeWithTag("level").assertTextContains("Double Bonus", substring = true)
    }

    @Test
    fun theDoubleBonusPayTableShowsItsDocumentedTopPayouts() {
        launch(SavedGame(lifetimeHands = 100))
        finishOpeningHand()
        openSettings()
        scrollTapSettingsRow("variant-doubleBonus")
        scrollTapSettingsRow("settings-paytable-toggle")

        // FEATURES.md 2.4. Only multiples that appear nowhere else on this screen (the bet chips
        // are 5/10/20/50) can be asserted unambiguously: Royal 250, Four Aces 160, Four 2s-4s 80.
        listOf("250", "160", "80").forEach { assertVisibleAfterScrolling(it) }
    }

    // ---- unlock levels ---------------------------------------------------------------

    @Test
    fun variantsAndMultiHandUnlockAtTheDocumentedLevels() {
        launch(SavedGame(lifetimeHands = 0))
        finishOpeningHand()
        openSettings()

        compose.onNodeWithTag("variant-deuces").performScrollTo().assertTextContains("level 3", substring = true)
        compose.onNodeWithTag("variant-bonus").assertTextContains("level 8", substring = true)
        compose.onNodeWithTag("variant-doubleBonus").assertTextContains("level 15", substring = true)

        scrollTapSettingsRow("hands-3")
        compose.onNodeWithTag("toast").assertTextContains("level 10", substring = true)
    }

    // ---- Triple / Five Play ----------------------------------------------------------

    @Test
    fun tripleAndFivePlayStakeEveryHandAndShowTheExtraHands() {
        launch(SavedGame(lifetimeHands = 45)) // level 10
        finishOpeningHand()
        openSettings()
        scrollTapSettingsRow("hands-3")
        openPlay()
        compose.onNodeWithTag("total-bet").assertTextContains("30")

        compose.onNodeWithTag("main-button").performClick() // deal 3 hands
        compose.onNodeWithTag("main-button").performClick() // draw
        compose.waitForIdle()
        compose.onNodeWithTag("extra-hands").assertIsDisplayed()

        openSettings()
        scrollTapSettingsRow("hands-5")
        openPlay()
        compose.onNodeWithTag("total-bet").assertTextContains("50")
    }

    // ---- stats -----------------------------------------------------------------------

    @Test
    fun statsCountPlayedHandsAndResetClearsThem() {
        launch()
        finishOpeningHand()

        openStats()
        compose.onNodeWithTag("stat-hands").assert(hasAnyDescendant(hasText("1")))
        compose.onNodeWithTag("stats-all-time").performClick()
        compose.onNodeWithTag("stat-hands").assert(hasAnyDescendant(hasText("1")))

        openSettings()
        scrollTapSettingsRow("reset-stats")
        compose.onNodeWithTag("reset-confirm").performClick()
        compose.waitForIdle()

        openStats()
        compose.onNodeWithTag("stat-hands").assert(hasAnyDescendant(hasText("0")))
        compose.onNodeWithTag("progress-panel").assertIsDisplayed() // level progress survives a reset
    }

    // ---- settings --------------------------------------------------------------------

    @Test
    fun theSoundToggleOnTheTableFlipsAndIsSaved() {
        launch()

        compose.onNodeWithContentDescription("Sound on").assertIsDisplayed()
        compose.onNodeWithTag("sound-toggle").performClick()
        compose.onNodeWithContentDescription("Sound off").assertIsDisplayed()
        assertFalse(repository.loadSettings().soundEnabled)
    }

    @Test
    fun theDefaultBetSetsTheStakeBetweenHands() {
        launch()
        finishOpeningHand()

        openSettings()
        compose.onNodeWithTag("default-bet-20").performClick()
        openPlay()

        compose.onNodeWithTag("total-bet").assertTextContains("20")
        assertEquals(20, repository.loadSettings().defaultBet)
    }

    @Test
    fun theBetChipsChooseTheStakeBetweenHands() {
        launch()
        finishOpeningHand()

        listOf(5, 20, 50, 10).forEach { amount ->
            compose.onNodeWithTag("bet-$amount").performClick()
            compose.onNodeWithTag("total-bet").assertTextContains(amount.toString())
        }
    }

    // ---- navigation ------------------------------------------------------------------

    @Test
    fun theBackButtonReturnsFromSettingsToTheTable() {
        launch()
        openSettings()
        compose.onNodeWithTag("toggle-sound").assertIsDisplayed()

        Espresso.pressBack()
        compose.waitForIdle()

        compose.onNodeWithTag("main-button").assertIsDisplayed()
    }
}
