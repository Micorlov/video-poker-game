package com.micorlov.videopoker.nativeapp.notify

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.micorlov.videopoker.nativeapp.MainActivity
import com.micorlov.videopoker.nativeapp.R
import com.micorlov.videopoker.nativeapp.data.GameRepository
import com.micorlov.videopoker.nativeapp.data.SharedPreferencesStore
import com.micorlov.videopoker.nativeapp.domain.ReminderPolicy
import java.time.Duration
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import java.util.concurrent.TimeUnit

private const val CHANNEL_ID = "daily_reminder"
private const val NOTIFICATION_ID = 1001
private const val WORK_NAME = "daily_reminder"

/** Schedules, or cancels, the once-a-day reminder to match the player's setting. */
object DailyReminderScheduler {

    fun sync(context: Context, enabled: Boolean) {
        val work = WorkManager.getInstance(context)
        if (!enabled) {
            work.cancelUniqueWork(WORK_NAME)
            return
        }
        val request = PeriodicWorkRequestBuilder<DailyReminderWorker>(1, TimeUnit.DAYS)
            .setInitialDelay(delayUntilReminderHour(LocalDateTime.now()), TimeUnit.MILLISECONDS)
            .build()
        work.enqueueUniquePeriodicWork(WORK_NAME, ExistingPeriodicWorkPolicy.UPDATE, request)
    }

    /** Milliseconds from [now] to the next reminder hour (today's if still ahead, else tomorrow's). */
    fun delayUntilReminderHour(now: LocalDateTime): Long {
        var due = now.toLocalDate().atTime(LocalTime.of(ReminderPolicy.REMINDER_HOUR, 0))
        if (!due.isAfter(now)) due = due.plusDays(1)
        return Duration.between(now, due).toMillis()
    }
}

class DailyReminderWorker(private val context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        val repository = GameRepository(SharedPreferencesStore(context))
        val today = LocalDate.now().toString()
        val due = ReminderPolicy.shouldNotify(
            enabled = repository.loadSettings().dailyReminderEnabled,
            today = today,
            lastPlayedDay = repository.loadLastPlayedDay(),
            lastReminderDay = repository.loadLastReminderDay(),
        )
        if (due && canPost(context)) {
            post(context)
            repository.saveLastReminderDay(today)
        }
        return Result.success()
    }

    private fun canPost(context: Context): Boolean =
        Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED

    private fun post(context: Context) {
        val manager = context.getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(
            NotificationChannel(CHANNEL_ID, context.getString(R.string.settings_daily_bonus_reminder), NotificationManager.IMPORTANCE_DEFAULT),
        )
        val open = PendingIntent.getActivity(
            context, 0, Intent(context, MainActivity::class.java), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(context.getString(R.string.notif_daily_title))
            .setContentText(context.getString(R.string.notif_daily_body))
            .setContentIntent(open)
            .setAutoCancel(true)
            .build()
        manager.notify(NOTIFICATION_ID, notification)
    }
}
