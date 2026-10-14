package com.micorlov.videopoker.nativeapp

import android.content.Context
import com.google.firebase.FirebaseApp
import com.micorlov.videopoker.nativeapp.data.AnalyticsEvents
import com.micorlov.videopoker.nativeapp.data.DailyProfitStore
import com.micorlov.videopoker.nativeapp.data.DailyProfitTracker
import com.micorlov.videopoker.nativeapp.data.EventLogger
import com.micorlov.videopoker.nativeapp.data.FirebaseEventLogger
import com.micorlov.videopoker.nativeapp.data.GameRepository
import com.micorlov.videopoker.nativeapp.data.SharedPreferencesStore
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
import java.io.File

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
     * The earlier Capacitor build kept its data in the WebView's directory, which a native
     * install never creates. Native 3.0 did not migrate that data, so this is the only trace
     * that the player was here before.
     */
    val upgradedFromLegacy: Boolean = File(appContext.dataDir, LEGACY_WEBVIEW_DIR).exists()

    init {
        events.log(AnalyticsEvents.APP_OPEN, mapOf("app_version" to versionName()))
    }

    private fun versionName(): String =
        runCatching { appContext.packageManager.getPackageInfo(appContext.packageName, 0).versionName }.getOrNull() ?: "unknown"

    private companion object {
        const val LEGACY_WEBVIEW_DIR = "app_webview"
    }
}
