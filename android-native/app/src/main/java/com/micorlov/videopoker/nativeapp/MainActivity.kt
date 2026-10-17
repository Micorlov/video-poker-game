package com.micorlov.videopoker.nativeapp

import android.content.Context
import android.content.Intent
import android.graphics.Color
import java.time.LocalDate
import android.os.Bundle
import android.os.SystemClock
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.runtime.mutableIntStateOf
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.lifecycleScope
import com.micorlov.videopoker.nativeapp.data.social.CreditNotice
import com.micorlov.videopoker.nativeapp.domain.DeepLink
import com.micorlov.videopoker.nativeapp.link.LinkIntake
import com.micorlov.videopoker.nativeapp.link.RemoteFlagsFetcher
import com.micorlov.videopoker.nativeapp.ui.AnalysisMode
import com.micorlov.videopoker.nativeapp.ui.GameViewModel
import com.micorlov.videopoker.nativeapp.ui.LocaleContext
import com.micorlov.videopoker.nativeapp.ui.ToastMessage
import com.micorlov.videopoker.nativeapp.ui.VideoPokerApp
import com.micorlov.videopoker.nativeapp.ui.friends.FriendsViewModel
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {

    private val container: AppContainer get() = (application as VideoPokerApplication).container

    /** Bumped when an invite link arrives while the app is open, so the Friends tab comes up. */
    private val openFriendsSignal = mutableIntStateOf(0)

    /** Elapsed-realtime when the activity last came to the foreground. 0 while stopped. */
    private var foregroundSince = 0L

    private val viewModel: GameViewModel by viewModels {
        factory {
            GameViewModel(
                container.gameRepository,
                todayKey = { LocalDate.now().toString() },
                reviewEnabled = true,
                onboardingEnabled = false,
                flagFetcher = RemoteFlagsFetcher::fetch,
                analysisMode = AnalysisMode.BACKGROUND,
                onNetResult = container.dailyProfit::record,
                events = container.events,
                upgradedFromLegacy = container.upgradedFromLegacy,
            )
        }
    }

    private val friendsViewModel: FriendsViewModel by viewModels {
        factory {
            FriendsViewModel(
                container.auth, container.remote, container.friends, container.dailyProfit.state,
                events = container.events, accountDeletion = container.accountDeletion,
            )
        }
    }

    override fun attachBaseContext(newBase: Context) = super.attachBaseContext(LocaleContext.wrap(newBase))

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val intake = LinkIntake(container.gameRepository)
        intake.onIntent(intent)
        intake.readInstallReferrer(this) { link -> runOnUiThread { onLinkParked(link) } }
        lifecycleScope.launch { container.friends.credits.collect { viewModel.applyPendingCredits(it.toToast()) } }
        // The table is always dark felt, so the system bars always carry light icons.
        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.dark(Color.TRANSPARENT),
            navigationBarStyle = SystemBarStyle.dark(Color.TRANSPARENT),
        )
        setContent { VideoPokerApp(viewModel, friendsViewModel, openFriendsSignal.intValue) }
    }

    /** A link tapped while the app is already open. */
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        LinkIntake(container.gameRepository).onIntent(intent)?.let(::onLinkParked)
    }

    /** Rewards that arrived while no screen was listening reach the stack when the app comes back. */
    override fun onStart() {
        super.onStart()
        if (foregroundSince == 0L) foregroundSince = SystemClock.elapsedRealtime()
        viewModel.applyPendingCredits()
    }

    /** Friends see a hand's result within seconds of the player leaving, not only after the quiet spell. */
    override fun onStop() {
        super.onStop()
        container.profitSync.flush()
        val started = foregroundSince
        foregroundSince = 0L
        if (started != 0L) container.reportPlayTime(SystemClock.elapsedRealtime() - started)
    }

    private fun onLinkParked(link: DeepLink) {
        if (link !is DeepLink.Invite) return
        friendsViewModel.onLinkArrived()
        openFriendsSignal.intValue++
    }

    private fun CreditNotice.toToast(): ToastMessage = when (this) {
        is CreditNotice.Welcome -> ToastMessage.ReferralWelcome(amount)
        is CreditNotice.InvitesRewarded -> ToastMessage.InvitesRewarded(count, amount)
    }

    private inline fun <reified VM : ViewModel> factory(crossinline create: () -> VM) = object : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T = create() as T
    }
}
