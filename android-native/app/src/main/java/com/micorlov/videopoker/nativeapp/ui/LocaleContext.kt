package com.micorlov.videopoker.nativeapp.ui

import android.content.Context
import android.content.res.Configuration
import android.os.LocaleList
import com.micorlov.videopoker.nativeapp.data.GameRepository
import com.micorlov.videopoker.nativeapp.data.SharedPreferencesStore
import com.micorlov.videopoker.nativeapp.domain.AppLanguage
import java.util.Locale

/**
 * Applies the player's chosen language to an activity's resources. With no choice the device
 * language applies, and Android falls back to English for languages we do not ship. Right-to-left
 * layout follows automatically from the Hebrew and Arabic locales.
 */
object LocaleContext {

    fun wrap(base: Context): Context {
        val chosen = GameRepository(SharedPreferencesStore(base)).loadSettings().language ?: return base
        val locale = Locale.forLanguageTag(chosen.tag)
        Locale.setDefault(locale)
        val configuration = Configuration(base.resources.configuration)
        configuration.setLocales(LocaleList(locale))
        return base.createConfigurationContext(configuration)
    }

    /** The language the UI is actually in: the choice, else the device's, else English. */
    fun current(context: Context): AppLanguage =
        AppLanguage.resolve(context.resources.configuration.locales[0].toLanguageTag()) ?: AppLanguage.ENGLISH
}
