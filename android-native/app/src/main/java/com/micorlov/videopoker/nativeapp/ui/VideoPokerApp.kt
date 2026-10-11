package com.micorlov.videopoker.nativeapp.ui

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.ExperimentalComposeUiApi
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.testTagsAsResourceId
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.micorlov.videopoker.nativeapp.audio.SoundCue
import com.micorlov.videopoker.nativeapp.audio.SoundPlayer
import com.micorlov.videopoker.nativeapp.ui.nav.BottomNav
import com.micorlov.videopoker.nativeapp.ui.nav.Tab
import com.micorlov.videopoker.nativeapp.ui.play.Celebration
import com.micorlov.videopoker.nativeapp.ui.play.CelebrationOverlay
import com.micorlov.videopoker.nativeapp.ui.play.CelebrationTier
import com.micorlov.videopoker.nativeapp.ui.play.PlayActions
import com.micorlov.videopoker.nativeapp.ui.play.PlayScreen
import com.micorlov.videopoker.nativeapp.ui.settings.SettingsActions
import com.micorlov.videopoker.nativeapp.ui.settings.SettingsScreen
import com.micorlov.videopoker.nativeapp.ui.stats.StatsScreen
import com.micorlov.videopoker.nativeapp.ui.theme.LocalPalette
import com.micorlov.videopoker.nativeapp.ui.theme.VideoPokerTheme
import com.micorlov.videopoker.nativeapp.ui.theme.feltBackground
import kotlinx.coroutines.delay

/**
 * How long a celebration stays "current"; after that, returning to the Play tab must not replay it.
 * Longer than the longest effect (the fireworks' gold rain ends at 5 s) so nothing is cut off.
 */
private const val CELEBRATION_LIFETIME_MS = 6_000L
private const val BIG_WIN_STRENGTH = 7
private val MAX_CONTENT_WIDTH = 460.dp

@OptIn(ExperimentalComposeUiApi::class)
@Composable
fun VideoPokerApp(viewModel: GameViewModel) {
    val ui by viewModel.state.collectAsStateWithLifecycle()

    VideoPokerTheme(ui.settings.theme) {
        val palette = LocalPalette.current
        val view = LocalView.current
        val feedback = remember(view) { Feedback(SoundPlayer(), Haptics(view)) }
        SideEffect {
            feedback.sound.enabled = ui.settings.soundEnabled
            feedback.haptics.enabled = ui.settings.hapticsEnabled
        }

        var tab by rememberSaveable { mutableStateOf(Tab.PLAY) }
        var celebration by remember { mutableStateOf<Celebration?>(null) }

        // Back from Stats or Settings goes to the table; only back from the table leaves the app.
        BackHandler(enabled = tab != Tab.PLAY) { tab = Tab.PLAY }

        LaunchedEffect(viewModel) {
            var nextCelebrationId = 0
            for (effect in viewModel.effects) {
                when (effect) {
                    is UiEffect.HandRevealed -> {
                        val outcome = effect.outcome
                        if (!outcome.isWin) {
                            feedback.play(SoundCue.LOSS)
                            continue
                        }
                        val strength = outcome.bestType.strength
                        feedback.play(if (strength >= BIG_WIN_STRENGTH) SoundCue.BIG_WIN else SoundCue.WIN)
                        feedback.haptics.heavy()
                        celebration = Celebration(++nextCelebrationId, CelebrationTier.forStrength(strength))
                    }
                }
            }
        }

        LaunchedEffect(celebration?.id) {
            val id = celebration?.id ?: return@LaunchedEffect
            delay(CELEBRATION_LIFETIME_MS)
            if (celebration?.id == id) celebration = null
        }

        val playActions = remember(viewModel) {
            PlayActions(
                onMainAction = viewModel::onMainAction,
                onToggleHold = viewModel::onToggleHold,
                onSelectBet = viewModel::onSelectBet,
                onRevealed = viewModel::onRevealed,
                onToggleSound = viewModel::onToggleSound,
            )
        }
        val settingsActions = remember(viewModel) {
            SettingsActions(
                onToggleSound = viewModel::onToggleSound,
                onToggleHaptics = viewModel::onToggleHaptics,
                onSelectTheme = viewModel::onSelectTheme,
                onSelectDefaultBet = viewModel::onSelectDefaultBet,
                onSelectVariant = viewModel::onSelectVariant,
                onSelectHandCount = viewModel::onSelectHandCount,
                onResetStatistics = viewModel::onResetStatistics,
            )
        }

        Box(
            Modifier
                .fillMaxSize()
                .feltBackground(palette)
                .semantics { testTagsAsResourceId = true },
        ) {
            Column(Modifier.fillMaxSize().statusBarsPadding()) {
                Box(Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.TopCenter) {
                    Box(Modifier.widthIn(max = MAX_CONTENT_WIDTH).fillMaxSize()) {
                        when (tab) {
                            Tab.PLAY -> PlayScreen(ui, celebration, feedback, playActions)
                            Tab.STATS -> StatsScreen(ui.game)
                            Tab.SETTINGS -> SettingsScreen(ui, settingsActions)
                        }
                    }
                }
                Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                    BottomNav(
                        selected = tab,
                        onSelect = { tab = it },
                        modifier = Modifier
                            .widthIn(max = MAX_CONTENT_WIDTH)
                            .padding(horizontal = 16.dp, vertical = 8.dp)
                            .navigationBarsPadding(),
                    )
                }
            }

            ToastHost(
                toast = ui.toast,
                onDismiss = viewModel::onDismissToast,
                modifier = Modifier.align(Alignment.TopCenter).statusBarsPadding().padding(top = 8.dp),
            )
            CelebrationOverlay(celebration)
        }
    }
}
