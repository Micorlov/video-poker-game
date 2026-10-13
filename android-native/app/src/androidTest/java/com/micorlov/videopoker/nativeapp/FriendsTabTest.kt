package com.micorlov.videopoker.nativeapp

import android.content.Context
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.micorlov.videopoker.nativeapp.data.GameRepository
import com.micorlov.videopoker.nativeapp.data.SharedPreferencesStore
import com.micorlov.videopoker.nativeapp.data.social.AuthGateway
import com.micorlov.videopoker.nativeapp.data.social.FriendsRepository
import com.micorlov.videopoker.nativeapp.data.social.SignInHost
import com.micorlov.videopoker.nativeapp.data.social.UnavailableRemote
import com.micorlov.videopoker.nativeapp.domain.DailyProfit
import com.micorlov.videopoker.nativeapp.domain.social.AuthUser
import com.micorlov.videopoker.nativeapp.ui.GameViewModel
import com.micorlov.videopoker.nativeapp.ui.VideoPokerApp
import com.micorlov.videopoker.nativeapp.ui.friends.FriendsViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import kotlin.random.Random

/** The Friends tab and its two shortcuts, signed out (no Firebase needed). */
@RunWith(AndroidJUnit4::class)
class FriendsTabTest {

    @get:Rule
    val compose = createComposeRule()

    private object SignedOut : AuthGateway {
        override val available = true
        override val user: StateFlow<AuthUser?> = MutableStateFlow(null)
        override suspend fun signIn(host: SignInHost): Result<AuthUser> = Result.failure(IllegalStateException())
        override fun signOut() = Unit
    }

    private fun launch() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        val repository = GameRepository(
            SharedPreferencesStore(context.getSharedPreferences("friends_${System.nanoTime()}", Context.MODE_PRIVATE)),
        )
        val game = GameViewModel(repository, Random(7))
        val friends = FriendsViewModel(
            SignedOut, UnavailableRemote, FriendsRepository(UnavailableRemote, repository), MutableStateFlow(DailyProfit.NONE),
        )
        compose.setContent { VideoPokerApp(game, friends) }
    }

    @Test
    fun theFriendsTabAlwaysShowsHowToInvite() {
        launch()
        compose.onNodeWithTag("tab-friends").performClick()
        compose.onNodeWithTag("invite-card").assertIsDisplayed()
        compose.onNodeWithTag("invite-button").assertIsDisplayed()
        compose.onNodeWithTag("friends-sign-in").performScrollTo().assertIsDisplayed()
    }

    @Test
    fun theBadgeOnTheTableOpensFriends() {
        launch()
        compose.onNodeWithTag("invite-badge").performClick()
        compose.onNodeWithTag("friends-screen").assertIsDisplayed()
    }

    @Test
    fun theSettingsRowOpensFriends() {
        launch()
        compose.onNodeWithTag("tab-settings").performClick()
        compose.onNodeWithTag("invite-friends-row").performClick()
        compose.onNodeWithTag("friends-screen").assertIsDisplayed()
    }
}
