package com.micorlov.videopoker.nativeapp

import android.content.Context
import com.google.firebase.FirebaseApp
import com.micorlov.videopoker.nativeapp.data.AnalyticsEvents
import com.micorlov.videopoker.nativeapp.data.DailyProfitStore
import com.micorlov.videopoker.nativeapp.data.DailyProfitTracker
import com.micorlov.videopoker.nativeapp.data.DayStatsLedger
import com.micorlov.videopoker.nativeapp.data.EventLogger
import com.micorlov.videopoker.nativeapp.data.FirebaseEventLogger
import com.micorlov.videopoker.nativeapp.data.FirestoreInstallReporter
import com.micorlov.videopoker.nativeapp.data.GameRepository
import com.micorlov.videopoker.nativeapp.data.InstallDevice
import com.micorlov.videopoker.nativeapp.data.InstallTracker
import com.micorlov.videopoker.nativeapp.data.PlayTimeLedger
import com.micorlov.videopoker.nativeapp.data.SharedPreferencesStore
import com.micorlov.videopoker.nativeapp.domain.UtcDay
import com.micorlov.videopoker.nativeapp.data.social.AccountDeletion
import com.micorlov.videopoker.nativeapp.data.social.AuthGateway
import com.micorlov.videopoker.nativeapp.data.social.FirebaseAuthGateway
import com.micorlov.videopoker.nativeapp.data.social.FirestoreSocialRemote
import com.micorlov.videopoker.nativeapp.data.social.FriendsRepository
import com.micorlov.videopoker.nativeapp.data.social.ProfitSync
import com.micorlov.videopoker.nativeapp.data.social.SocialRemote
import com.micorlov.videopoker.nativeapp.data.social.UnavailableAuth
import com.micorlov.videopoker.nativeapp.data.social.UnavailableRemote
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import java.io.File
import java.time.LocalDate

/**
 * The app-wide objects, built once per process. Firebase is only used when the build carries
 * its configuration (google-services.json); otherwise the friends feature reports itself
 * unavailable and everything else works as before.
 */
class AppContainer(context: Context) {
    private val appContext = context.applicationContext
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private val store = SharedPreferencesStore(appContext)

    val gameRepository = GameRepository(store)
    val dailyProfit = DailyProfitTracker(DailyProfitStore(store))

    private val firebaseReady = FirebaseApp.getApps(appContext).isNotEmpty()
    val auth: AuthGateway = if (firebaseReady) FirebaseAuthGateway(appContext) else UnavailableAuth
    val remote: SocialRemote = if (firebaseReady) FirestoreSocialRemote(appVersion = versionName()) else UnavailableRemote
    val friends = FriendsRepository(remote, gameRepository)
    val profitSync = ProfitSync(remote, auth.user, dailyProfit.state, scope).also { if (firebaseReady) it.start() }
    val accountDeletion = AccountDeletion(auth, remote, hold = profitSync::hold, release = profitSync::release)

    /** GA4 through Firebase Analytics: the com.micorlov.videopoker stream the web build reported to. */
    val events: EventLogger = if (firebaseReady) FirebaseEventLogger(appContext) else EventLogger.NONE

    /**
     * Guest launches never get a user document. This writes the same
     * installs/{id}_open row the web build writes, which is what the admin
     * panel counts as a guest for the day. Called from the init block below.
     */
    private val installTracker = InstallTracker(store)
    private val dayStats = DayStatsLedger(store)
    private val installReporter = FirestoreInstallReporter(
        installTracker,
        PlayTimeLedger(store),
        dayStats = dayStats,
    )

    /**
     * The earlier Capacitor build kept its data in the WebView's directory, which a native
     * install never creates. Native 3.0 did not migrate that data, so this is the only trace
     * that the player was here before.
     */
    val upgradedFromLegacy: Boolean = File(appContext.dataDir, LEGACY_WEBVIEW_DIR).exists()

    init {
        seedDayStats()
        events.log(AnalyticsEvents.APP_OPEN, mapOf("app_version" to versionName()))
        installReporter.report(existing = upgradedFromLegacy, device = installDevice(versionName()))
        if (firebaseReady) {
            scope.launch {
                auth.user.collect { user ->
                    val id = installTracker.id()
                    if (user != null && id != null) {
                        runCatching { remote.linkInstall(user.uid, id) }
                    }
                }
            }
        }
    }

    fun reportPlayTime(elapsedMs: Long) = installReporter.reportPlayTime(elapsedMs)

    /** One settled deal or double-up. Uploaded with the install, which is what guests can write. */
    fun recordLeaderboard(day: String, scoreDelta: Long, hand: Boolean) {
        val pending = dayStats.outbound()
        if (pending != null && pending.day != day) installReporter.reportDayStats(immediate = true)
        dayStats.record(day, scoreDelta, hand)
        installReporter.reportDayStats()
    }

    /** The player left the table: don't wait out the quiet spell. */
    fun flushLeaderboard() = installReporter.reportDayStats(immediate = true)

    /**
     * Today's profit may already be on the device from before hands were counted.
     * Seed that score so the board can show it, and leave the hand count unknown.
     */
    private fun seedDayStats() {
        val local = LocalDate.now().toString()
        val utc = UtcDay.key(System.currentTimeMillis())
        val profit = dailyProfit.state.value
        val day = if (profit.dayKey == local || profit.dayKey == utc) profit.dayKey else local
        val playedToday = profit.dayKey.isNotEmpty() && profit.dayKey == day
        dayStats.seed(day, playedToday, if (playedToday) profit.net else 0L)
    }

    private fun installDevice(version: String) = InstallDevice(
        version = version,
        platform = "android",
        androidSdk = android.os.Build.VERSION.SDK_INT,
        chrome = 0,
        lang = java.util.Locale.getDefault().toLanguageTag(),
        country = "",
        source = "",
    )

    private fun versionName(): String =
        runCatching { appContext.packageManager.getPackageInfo(appContext.packageName, 0).versionName }.getOrNull() ?: "unknown"

    private companion object {
        const val LEGACY_WEBVIEW_DIR = "app_webview"
    }
}
