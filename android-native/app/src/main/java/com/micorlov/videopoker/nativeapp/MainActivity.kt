package com.micorlov.videopoker.nativeapp

import android.content.Context
import android.content.Intent
import android.graphics.Color
import java.time.LocalDate
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import com.micorlov.videopoker.nativeapp.data.GameRepository
import com.micorlov.videopoker.nativeapp.data.SharedPreferencesStore
import com.micorlov.videopoker.nativeapp.link.LinkIntake
import com.micorlov.videopoker.nativeapp.link.RemoteFlagsFetcher
import com.micorlov.videopoker.nativeapp.ui.GameViewModel
import com.micorlov.videopoker.nativeapp.ui.LocaleContext
import com.micorlov.videopoker.nativeapp.ui.VideoPokerApp

class MainActivity : ComponentActivity() {

    private val viewModel: GameViewModel by viewModels {
        object : ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : ViewModel> create(modelClass: Class<T>): T =
                GameViewModel(
                    GameRepository(SharedPreferencesStore(applicationContext)),
                    todayKey = { LocalDate.now().toString() },
                    reviewEnabled = true,
                    onboardingEnabled = true,
                    flagFetcher = RemoteFlagsFetcher::fetch,
                ) as T
        }
    }

    override fun attachBaseContext(newBase: Context) = super.attachBaseContext(LocaleContext.wrap(newBase))

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // The table is always dark felt, so the system bars always carry light icons.
        val intake = LinkIntake(GameRepository(SharedPreferencesStore(applicationContext)))
        intake.onIntent(intent)
        intake.readInstallReferrer(this)
        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.dark(Color.TRANSPARENT),
            navigationBarStyle = SystemBarStyle.dark(Color.TRANSPARENT),
        )
        setContent { VideoPokerApp(viewModel) }
    }

    /** A link tapped while the app is already open. */
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        LinkIntake(GameRepository(SharedPreferencesStore(applicationContext))).onIntent(intent)
    }
}
