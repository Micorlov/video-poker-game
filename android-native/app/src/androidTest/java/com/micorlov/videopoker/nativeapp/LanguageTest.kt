package com.micorlov.videopoker.nativeapp

import android.content.Context
import android.view.View
import androidx.test.core.app.ActivityScenario
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.micorlov.videopoker.nativeapp.data.GameRepository
import com.micorlov.videopoker.nativeapp.data.SharedPreferencesStore
import com.micorlov.videopoker.nativeapp.domain.AppLanguage
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

/** Launches the real activity in other languages: strings and layout direction must follow the saved choice. */
@RunWith(AndroidJUnit4::class)
class LanguageTest {

    private val context = ApplicationProvider.getApplicationContext<Context>()
    private val repository = GameRepository(SharedPreferencesStore(context))
    private val before = repository.loadSettings()

    @After
    fun restoreTheSavedLanguage() {
        repository.saveSettings(repository.loadSettings().copy(language = before.language))
    }

    private fun launchIn(language: AppLanguage, check: (resources: android.content.res.Resources, direction: Int) -> Unit) {
        repository.saveSettings(repository.loadSettings().copy(language = language))
        ActivityScenario.launch(MainActivity::class.java).use { scenario ->
            scenario.onActivity { activity ->
                check(activity.resources, activity.window.decorView.layoutDirection)
            }
        }
    }

    @Test
    fun germanUsesGermanStringsAndStaysLeftToRight() = launchIn(AppLanguage.GERMAN) { resources, direction ->
        assertEquals("Spielen", resources.getString(R.string.nav_play))
        assertEquals(View.LAYOUT_DIRECTION_LTR, direction)
    }

    @Test
    fun arabicUsesArabicStringsAndMirrorsTheLayout() = launchIn(AppLanguage.ARABIC) { resources, direction ->
        assertTrue(resources.getString(R.string.nav_play).any { it in '؀'..'ۿ' })
        assertEquals(View.LAYOUT_DIRECTION_RTL, direction)
    }

    @Test
    fun hebrewMirrorsTheLayout() = launchIn(AppLanguage.HEBREW) { _, direction ->
        assertEquals(View.LAYOUT_DIRECTION_RTL, direction)
    }

    @Test
    fun everyShippedLanguageResolvesFromItsOwnTag() {
        AppLanguage.entries.forEach { assertEquals(it, AppLanguage.fromTag(it.tag)) }
        assertEquals(AppLanguage.HEBREW, AppLanguage.resolve("iw"))
        assertEquals(AppLanguage.INDONESIAN, AppLanguage.resolve("in"))
        assertEquals(AppLanguage.PORTUGUESE_BR, AppLanguage.resolve("pt-PT"))
        assertEquals(AppLanguage.CHINESE_SIMPLIFIED, AppLanguage.resolve("zh-Hans-CN"))
    }
}
