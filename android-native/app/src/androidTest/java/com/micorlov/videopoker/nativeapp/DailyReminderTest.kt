package com.micorlov.videopoker.nativeapp

import android.Manifest
import android.app.NotificationManager
import android.content.Context
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.rule.GrantPermissionRule
import androidx.work.ListenableWorker
import androidx.work.testing.TestListenableWorkerBuilder
import com.micorlov.videopoker.nativeapp.data.GameRepository
import com.micorlov.videopoker.nativeapp.data.SharedPreferencesStore
import com.micorlov.videopoker.nativeapp.notify.DailyReminderScheduler
import com.micorlov.videopoker.nativeapp.notify.DailyReminderWorker
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import java.time.LocalDate
import java.time.LocalDateTime

/** Runs the reminder worker for real: it must post exactly when a player who opted in has not played today. */
@RunWith(AndroidJUnit4::class)
class DailyReminderTest {

    @get:Rule
    val permission: GrantPermissionRule = GrantPermissionRule.grant(Manifest.permission.POST_NOTIFICATIONS)

    private val context = ApplicationProvider.getApplicationContext<Context>()
    private val repository = GameRepository(SharedPreferencesStore(context))
    private val manager = context.getSystemService(NotificationManager::class.java)
    private val savedSettings = repository.loadSettings()
    private val savedPlayed = repository.loadLastPlayedDay()
    private val savedReminder = repository.loadLastReminderDay()

    @Before
    fun clean() {
        manager.cancelAll()
        waitUntilEmpty()
    }

    @After
    fun restore() {
        repository.saveSettings(savedSettings)
        repository.saveLastPlayedDay(savedPlayed)
        repository.saveLastReminderDay(savedReminder)
        manager.cancelAll()
    }

    /** Posting is asynchronous too: poll until [expected] shows up, or return what is there. */
    private fun activeCountAfterSettling(expected: Int): Int {
        repeat(20) { if (manager.activeNotifications.size != expected) Thread.sleep(100) }
        return manager.activeNotifications.size
    }

    /** Cancelling is asynchronous: give the notification service a moment to drop it. */
    private fun waitUntilEmpty() {
        repeat(20) { if (manager.activeNotifications.isNotEmpty()) Thread.sleep(100) }
    }

    private fun run(): ListenableWorker.Result =
        runBlocking { TestListenableWorkerBuilder<DailyReminderWorker>(context).build().doWork() }

    @Test
    fun postsOnceForAPlayerWhoHasNotPlayedToday() {
        repository.saveSettings(savedSettings.copy(dailyReminderEnabled = true))
        repository.saveLastPlayedDay("2000-01-01")
        repository.saveLastReminderDay("")

        assertEquals(ListenableWorker.Result.success(), run())
        assertEquals(1, activeCountAfterSettling(expected = 1))
        assertEquals(LocalDate.now().toString(), repository.loadLastReminderDay())

        manager.cancelAll()
        waitUntilEmpty()
        run() // already reminded today
        Thread.sleep(SETTLE_MS)
        assertEquals(0, manager.activeNotifications.size)
    }

    @Test
    fun staysQuietAfterAHandToday() {
        repository.saveSettings(savedSettings.copy(dailyReminderEnabled = true))
        repository.saveLastPlayedDay(LocalDate.now().toString())
        repository.saveLastReminderDay("")

        run()
        Thread.sleep(SETTLE_MS)
        assertEquals(0, manager.activeNotifications.size)
    }

    @Test
    fun staysQuietWhenTheToggleIsOff() {
        repository.saveSettings(savedSettings.copy(dailyReminderEnabled = false))
        repository.saveLastPlayedDay("2000-01-01")

        run()
        Thread.sleep(SETTLE_MS)
        assertEquals(0, manager.activeNotifications.size)
    }

    @Test
    fun theNextReminderIsAlwaysWithinADay() {
        val morning = DailyReminderScheduler.delayUntilReminderHour(LocalDateTime.of(2026, 10, 12, 9, 0))
        val night = DailyReminderScheduler.delayUntilReminderHour(LocalDateTime.of(2026, 10, 12, 23, 0))
        assertEquals(9L * 60 * 60 * 1000, morning)
        assertEquals(19L * 60 * 60 * 1000, night)
        assertTrue(morning in 1..24L * 60 * 60 * 1000)
    }

    private companion object {
        const val SETTLE_MS = 300L
    }
}
