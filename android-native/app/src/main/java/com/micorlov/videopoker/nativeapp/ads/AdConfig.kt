package com.micorlov.videopoker.nativeapp.ads

/** The one place ad unit IDs live. Flip USE_TEST_ADS to false only for a store release. */
object AdConfig {
    const val USE_TEST_ADS = true

    // Google's official sample units: safe to load and click on any device.
    private const val TEST_BANNER = "ca-app-pub-3940256099942544/9214589741"
    private const val TEST_INTERSTITIAL = "ca-app-pub-3940256099942544/1033173712"

    // TODO(real-ids): create the banner unit in AdMob (app ~7170210204) and paste it here.
    private const val REAL_BANNER = "ca-app-pub-2693008307172998/REPLACE_WITH_BANNER_UNIT"
    private const val REAL_INTERSTITIAL = "ca-app-pub-2693008307172998/3230965193"

    val BANNER = if (USE_TEST_ADS) TEST_BANNER else REAL_BANNER
    val INTERSTITIAL = if (USE_TEST_ADS) TEST_INTERSTITIAL else REAL_INTERSTITIAL
}
