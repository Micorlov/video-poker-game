package com.micorlov.videopoker.nativeapp.ui

import android.Manifest
import android.app.Activity
import android.os.Build
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import com.micorlov.videopoker.nativeapp.notify.DailyReminderScheduler
import com.micorlov.videopoker.nativeapp.ui.onboarding.OnboardingFlow
import com.micorlov.videopoker.nativeapp.ui.settings.LanguageDialog
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.testTagsAsResourceId
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.micorlov.videopoker.nativeapp.audio.SoundCue
import com.micorlov.videopoker.nativeapp.audio.SoundPlayer
import com.micorlov.videopoker.nativeapp.audio.VoiceAnnouncer
import com.micorlov.videopoker.nativeapp.domain.DoubleUpResult
import com.micorlov.videopoker.nativeapp.domain.FirstHands
import com.micorlov.videopoker.nativeapp.domain.HandType
import com.micorlov.videopoker.nativeapp.domain.ReviewPolicy
import kotlinx.coroutines.launch
import com.micorlov.videopoker.nativeapp.ui.text.spokenRes
import com.micorlov.videopoker.nativeapp.data.social.ActivityHost
import com.micorlov.videopoker.nativeapp.ui.friends.FriendsAuth
import com.micorlov.videopoker.nativeapp.ui.friends.FriendsEffects
import com.micorlov.videopoker.nativeapp.ui.friends.FriendsTab
import com.micorlov.videopoker.nativeapp.ui.friends.FriendsViewModel
import com.micorlov.videopoker.nativeapp.ui.friends.PendingInviteRedirect
import com.micorlov.videopoker.nativeapp.ui.friends.findActivity
import com.micorlov.videopoker.nativeapp.ui.settings.AccountSettings
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
fun VideoPokerApp(
    viewModel: GameViewModel,
    friends: FriendsViewModel? = null,
    /** Bumped when an invite link arrives while the app is open, to bring up the Friends tab. */
    openFriendsSignal: Int = 0,
) {
    val ui by viewModel.state.collectAsStateWithLifecycle()

    VideoPokerTheme(ui.settings.theme) {
        val palette = LocalPalette.current
        val view = LocalView.current
        val feedback = remember(view) { Feedback(SoundPlayer(), Haptics(view)) }
        val context = LocalContext.current
        val voice = remember(context) { VoiceAnnouncer(context) }
        DisposableEffect(voice) { onDispose { voice.release() } }
        SideEffect {
            voice.enabled = ui.settings.voiceEnabled
            feedback.sound.enabled = ui.settings.soundEnabled
            feedback.haptics.enabled = ui.settings.hapticsEnabled
        }

        var tab by rememberSaveable { mutableStateOf(Tab.PLAY) }
        var choosingLanguage by rememberSaveable { mutableStateOf(false) }
        LaunchedEffect(ui.settings.dailyReminderEnabled) { DailyReminderScheduler.sync(context, ui.settings.dailyReminderEnabled) }
        var promptPermissionPending by rememberSaveable { mutableStateOf(false) }
        val notificationPermission = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            if (!promptPermissionPending) return@rememberLauncherForActivityResult
            promptPermissionPending = false
            viewModel.onNotificationPermissionResult(granted)
        }
        val requestNotifications = {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) notificationPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
        val allowNotificationPrompt = {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                promptPermissionPending = true
                viewModel.onNotificationPromptAwaitingSystem()
                notificationPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
            } else {
                viewModel.onNotificationPermissionResult(true)
            }
        }
        var celebration by remember { mutableStateOf<Celebration?>(null) }

        // Back from any other tab goes to the table; only back from the table leaves the app.
        BackHandler(enabled = tab != Tab.PLAY) { tab = Tab.PLAY }

        val friendsOn = friends != null && friends.available && ui.flags.friendsRooms
        val visibleTabs = if (friendsOn) Tab.entries else Tab.entries - Tab.FRIENDS
        if (!friendsOn && tab == Tab.FRIENDS) tab = Tab.PLAY
        val openFriends: (() -> Unit)? = if (friendsOn) ({ tab = Tab.FRIENDS }) else null
        if (friends != null) FriendsEffects(friends, viewModel)
        LaunchedEffect(openFriendsSignal) { if (openFriendsSignal > 0 && friendsOn) tab = Tab.FRIENDS }
        PendingInviteRedirect(friends, ui.showOnboarding, friendsOn) { tab = Tab.FRIENDS }

        LaunchedEffect(viewModel) {
            var nextCelebrationId = 0
            for (effect in viewModel.effects) {
                when (effect) {
                    UiEffect.ReviewEarned -> launch {
                        delay(ReviewPolicy.PROMPT_DELAY_MS)
                        viewModel.onReviewTimer(blocked = false)
                    }
                    UiEffect.RequestNativeReview -> InAppReview.request(context)
                    is UiEffect.DoubleUpRevealed -> when (effect.result) {
                        DoubleUpResult.WIN -> {
                            feedback.play(SoundCue.WIN)
                            feedback.haptics.heavy()
                        }
                        DoubleUpResult.PUSH -> feedback.haptics.light()
                        DoubleUpResult.LOSE -> feedback.play(SoundCue.LOSS)
                    }
                    is UiEffect.HandRevealed -> {
                        val outcome = effect.outcome
                        if (!outcome.isWin) {
                            feedback.play(SoundCue.LOSS)
                            continue
                        }
                        val strength = outcome.bestType.strength
                        feedback.play(if (strength >= BIG_WIN_STRENGTH) SoundCue.BIG_WIN else SoundCue.WIN)
                        feedback.haptics.heavy()
                        val table = viewModel.state.value.game
                        if (!FirstHands.announcesWin(table.lifetimeHands, table.variant)) {
                            voice.speak(context.getString(outcome.bestType.spokenRes()))
                        }
                        celebration = Celebration(++nextCelebrationId, CelebrationTier.forStrength(strength))
                    }
                }
            }
        }

        if (ui.reviewCardVisible) {
            ReviewCard(
                onRate = {
                    viewModel.onReviewRated()
                    StoreLinks.openListing(context)
                },
                onDismiss = viewModel::onReviewDismissed,
            )
        }
        if (ui.notificationPromptVisible) {
            NotificationPrompt(
                onAllow = allowNotificationPrompt,
                onDismiss = viewModel::onNotificationPromptDismissed,
            )
        }
        if (ui.ratingPromptVisible) {
            RatingPrompt(
                storeUrl = StoreLinks.listingUri(context.packageName).toString(),
                onRate = {
                    viewModel.onRatingPromptAccepted()
                    StoreLinks.openListing(context)
                },
                onDismiss = viewModel::onRatingPromptDismissed,
            )
        }

        LaunchedEffect(celebration?.id) {
            val id = celebration?.id ?: return@LaunchedEffect
            delay(CELEBRATION_LIFETIME_MS)
            if (celebration?.id == id) celebration = null
        }

        val signInHost = remember(context) { ActivityHost(context.findActivity()) }
        val playActions = remember(viewModel, friends, friendsOn, signInHost) {
            PlayActions(
                onMainAction = viewModel::onMainAction,
                onToggleHold = viewModel::onToggleHold,
                onSelectBet = viewModel::onSelectBet,
                onBetLocked = viewModel::onBetLocked,
                onRevealed = viewModel::onRevealed,
                onToggleSound = viewModel::onToggleSound,
                onToggleHints = viewModel::onToggleHints,
                onAllIn = viewModel::onAllInRequested,
                onAllInTipSeen = viewModel::onAllInTipSeen,
                onHintsTipSeen = viewModel::onHintsTipSeen,
                onOpeningWinAnnounced = viewModel::onOpeningWinAnnounced,
                onSpeak = { voice.speak(it) },
                onAllInConfirmed = viewModel::onAllInConfirmed,
                onAllInDismissed = viewModel::onAllInDismissed,
                onAllInSignIn = { friends?.onSignIn(signInHost) },
                onAllInSignInDismissed = viewModel::onAllInSignInDismissed,
                onDoubleUp = viewModel::onDoubleUp,
                onPickDoubleUp = viewModel::onPickDoubleUp,
                onDoubleUpRevealed = viewModel::onDoubleUpRevealed,
                onOpenFriends = openFriends,
            )
        }
        val friendsState = friends?.state?.collectAsStateWithLifecycle()?.value
        LaunchedEffect(friendsState?.auth) {
            viewModel.onGoogleSignedIn(friendsState?.auth == FriendsAuth.SIGNED_IN)
        }
        val accountSettings = if (friends != null && friends.available) {
            val activity = LocalContext.current.findActivity()
            AccountSettings(
                signedIn = friendsState?.auth == FriendsAuth.SIGNED_IN,
                deleting = friendsState?.deleting == true,
                onDelete = { friends.onDeleteAccount(ActivityHost(activity)) },
            )
        } else {
            null
        }
        val settingsActions = remember(viewModel, friendsOn) {
            SettingsActions(
                onToggleSound = viewModel::onToggleSound,
                onToggleHaptics = viewModel::onToggleHaptics,
                onToggleFeedback = viewModel::onToggleFeedback,
                onToggleDoubleUp = viewModel::onToggleDoubleUp,
                onSelectSpeed = viewModel::onSelectSpeed,
                onSelectLanguage = viewModel::onSelectLanguage,
                onEnableNotifications = {
                    viewModel.onEnableNotifications()
                    requestNotifications()
                },
                onToggleNotifySocial = viewModel::onToggleNotifySocial,
                onToggleNotifyLeaderboard = viewModel::onToggleNotifyLeaderboard,
                onToggleDailyReminder = {
                    viewModel.onToggleDailyReminder()
                    if (!viewModel.state.value.settings.dailyReminderEnabled) requestNotifications()
                },
                onToggleNotifyBestHand = viewModel::onToggleNotifyBestHand,
                onToggleVoice = {
                    viewModel.onToggleVoice()
                    // Switching on gives a sample, as the web app does.
                    if (!voice.enabled) {
                        voice.enabled = true
                        voice.speak(context.getString(HandType.FULL_HOUSE.spokenRes()))
                    }
                },
                onSelectTheme = viewModel::onSelectTheme,
                onSelectDefaultBet = viewModel::onSelectDefaultBet,
                onSelectVariant = viewModel::onSelectVariant,
                onSelectHandCount = viewModel::onSelectHandCount,
                onResetStatistics = viewModel::onResetStatistics,
                onInviteFriends = openFriends,
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
                            Tab.PLAY -> PlayScreen(
                                ui,
                                celebration,
                                feedback,
                                playActions,
                                allInSigningIn = friendsState?.auth == FriendsAuth.SIGNING_IN,
                            )
                            Tab.FRIENDS -> friends?.let { FriendsTab(it) }
                            Tab.STATS -> StatsScreen(ui.game)
                            Tab.SETTINGS -> SettingsScreen(ui, settingsActions, account = accountSettings)
                        }
                    }
                }
                Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                    BottomNav(
                        selected = tab,
                        onSelect = { tab = it },
                        visible = visibleTabs,
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

            if (ui.showOnboarding) {
                OnboardingFlow(
                    language = LocaleContext.current(context),
                    onChooseLanguage = { choosingLanguage = true },
                    onEnableNotifications = {
                        viewModel.onEnableNotifications()
                        requestNotifications()
                    },
                    onFinished = viewModel::onOnboardingFinished,
                    modifier = Modifier.feltBackground(palette),
                )
            }
        }

        if (choosingLanguage) {
            LanguageDialog(
                current = LocaleContext.current(context),
                onPick = { language ->
                    choosingLanguage = false
                    viewModel.onSelectLanguage(language)
                    (context as? Activity)?.recreate()
                },
                onDismiss = { choosingLanguage = false },
            )
        }
    }
}
