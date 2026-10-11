package com.micorlov.videopoker.nativeapp

import android.content.Context
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.performClick
import androidx.test.core.app.ApplicationProvider
import com.micorlov.videopoker.nativeapp.data.GameRepository
import com.micorlov.videopoker.nativeapp.data.SharedPreferencesStore
import com.micorlov.videopoker.nativeapp.ui.GameViewModel
import com.micorlov.videopoker.nativeapp.ui.VideoPokerApp
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import kotlin.random.Random

/** The six first-run screens, walked end to end. */
class OnboardingTest {

    @get:Rule
    val compose = createComposeRule()

    private lateinit var repository: GameRepository

    @Before
    fun freshSaveFile() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        repository = GameRepository(SharedPreferencesStore(context.getSharedPreferences("onboarding_${System.nanoTime()}", Context.MODE_PRIVATE)))
    }

    private fun launch() {
        val viewModel = GameViewModel(repository, Random(11), onboardingEnabled = true)
        compose.setContent { VideoPokerApp(viewModel) }
        compose.waitForIdle()
    }

    @Test
    fun aFirstLaunchWalksThroughSixStepsThenShowsTheTableOnce() {
        launch()
        compose.onNodeWithTag("onboarding").assertIsDisplayed()
        compose.onNodeWithTag("onboarding-title").assertIsDisplayed()

        // welcome -> hands -> gameplay -> leaderboard -> push
        repeat(4) { compose.onNodeWithTag("onboarding-next").performClick() }
        compose.onNodeWithTag("onboarding-not-now").assertIsDisplayed()
        compose.onNodeWithTag("onboarding-not-now").performClick()

        compose.onNodeWithTag("onboarding-back").assertIsDisplayed()
        compose.onNodeWithTag("onboarding-guest").performClick()
        compose.waitForIdle()

        compose.onNodeWithTag("onboarding").assertDoesNotExistOrFail()
        compose.onNodeWithTag("main-button").assertIsDisplayed()
        assertTrue(repository.isOnboardingSeen())
    }

    @Test
    fun onboardingDoesNotReturnOnceSeen() {
        repository.markOnboardingSeen()
        launch()
        compose.onNodeWithTag("onboarding").assertDoesNotExistOrFail()
        compose.onNodeWithTag("main-button").assertIsDisplayed()
    }

    private fun androidx.compose.ui.test.SemanticsNodeInteraction.assertDoesNotExistOrFail() =
        assertDoesNotExist()
}
