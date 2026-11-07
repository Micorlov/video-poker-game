package com.micorlov.videopoker.nativeapp.ads

import android.app.Activity
import android.content.Context
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.google.android.gms.ads.AdError
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.FullScreenContentCallback
import com.google.android.gms.ads.LoadAdError
import com.google.android.gms.ads.MobileAds
import com.google.android.gms.ads.interstitial.InterstitialAd
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback
import com.google.android.ump.ConsentInformation
import com.google.android.ump.ConsentRequestParameters
import com.google.android.ump.UserMessagingPlatform
import com.micorlov.videopoker.nativeapp.domain.InterstitialPolicy
import kotlin.concurrent.thread

/**
 * The between-hands AdMob interstitial. Nothing is requested until Google's consent check allows
 * it, and a missing ad never holds up a deal. Called on the main thread.
 */
class Interstitials(private val context: Context) {
    /** True where the player must be able to reopen the consent form (EEA, UK), which adds a Settings row. */
    var privacyOptionsRequired by mutableStateOf(false)
        private set

    private val consent = UserMessagingPlatform.getConsentInformation(context)

    /** True once consent allows ad requests and the SDK is starting; the banner waits on this. */
    var adsAllowed by mutableStateOf(false)
        private set

    private var sdkStarted = false

    // shortcut: an ad left unshown for over an hour goes stale and may not pay; add an age check if reports show it.
    private var ad: InterstitialAd? = null
    private var loading = false
    private var showing = false
    private var handsAtLastAd: Int? = null
    private var lastAdAt = SystemClock.elapsedRealtime()

    fun start(activity: Activity) {
        consent.requestConsentInfoUpdate(
            activity,
            ConsentRequestParameters.Builder().build(),
            {
                UserMessagingPlatform.loadAndShowConsentFormIfRequired(activity) {
                    privacyOptionsRequired = consent.privacyOptionsRequirementStatus ==
                        ConsentInformation.PrivacyOptionsRequirementStatus.REQUIRED
                    startSdk()
                }
            },
            // A failed check still honours the answer the player gave on an earlier launch.
            { startSdk() },
        )
    }

    fun showPrivacyOptions(activity: Activity) = UserMessagingPlatform.showPrivacyOptionsForm(activity) {}

    /** Runs [deal] now, or after the ad closes when one is due. A tap that lands while the ad opens is dropped. */
    fun beforeDeal(activity: Activity, lifetimeHands: Int, deal: () -> Unit) {
        if (showing) return
        val handsAtLast = handsAtLastAd ?: lifetimeHands.also { handsAtLastAd = it }
        val now = SystemClock.elapsedRealtime()
        if (!InterstitialPolicy.due(lifetimeHands, handsAtLast, now - lastAdAt)) return deal()
        val ready = ad
        if (ready == null) {
            load()
            return deal()
        }
        ad = null
        showing = true
        handsAtLastAd = lifetimeHands
        lastAdAt = now
        ready.fullScreenContentCallback = object : FullScreenContentCallback() {
            override fun onAdDismissedFullScreenContent() = finish()
            override fun onAdFailedToShowFullScreenContent(error: AdError) = finish()
            private fun finish() {
                showing = false
                load()
                deal()
            }
        }
        ready.show(activity)
    }

    private fun startSdk() {
        if (sdkStarted || !consent.canRequestAds()) return
        sdkStarted = true
        adsAllowed = true
        val main = Handler(Looper.getMainLooper())
        thread { MobileAds.initialize(context) { main.post(::load) } }
    }

    private fun load() {
        if (!sdkStarted || loading || ad != null) return
        loading = true
        InterstitialAd.load(
            context,
            AdConfig.INTERSTITIAL,
            AdRequest.Builder().build(),
            object : InterstitialAdLoadCallback() {
                override fun onAdLoaded(loaded: InterstitialAd) {
                    ad = loaded
                    loading = false
                }

                override fun onAdFailedToLoad(error: LoadAdError) {
                    loading = false
                }
            },
        )
    }
}
