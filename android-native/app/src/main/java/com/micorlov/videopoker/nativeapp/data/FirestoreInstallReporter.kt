package com.micorlov.videopoker.nativeapp.data

import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.net.HttpURLConnection
import java.net.URL

/**
 * Sends this launch to `installs/{id}_open`. Guest mode never signs in, so
 * this uses the same public REST commit as js/telemetry.js: the rules allow
 * that one create, and one later update of the launch count, without an
 * account. A failure is logged and retried on the next launch.
 */
class FirestoreInstallReporter(
    private val tracker: InstallTracker,
    private val playTime: PlayTimeLedger,
    private val scope: CoroutineScope = CoroutineScope(SupervisorJob() + Dispatchers.IO),
    private val dayStats: DayStatsLedger? = null,
    private val post: (String) -> InstallWriteResult = ::postCommit,
) {
    private var statsJob: Job? = null
    fun report(existing: Boolean, device: InstallDevice) {
        val state = tracker.beginLaunch()
        scope.launch {
            runCatching { send(state, existing, device) }
                .onFailure { Log.w(TAG, "install report failed", it) }
        }
    }

    /**
     * Sends today's hands and score once the install document exists.
     * Hands come seconds apart, so a quiet spell collapses a burst into one write;
     * [immediate] is the background flush, which must not wait.
     */
    fun reportDayStats(immediate: Boolean = false) {
        if (dayStats == null) return
        statsJob?.cancel()
        statsJob = null
        if (immediate) {
            // Snapshot before returning. The caller may roll the ledger to a new
            // day immediately afterwards, and this post must not run on the main
            // thread (onStop flushes when the player leaves).
            val pending = pendingDayStats() ?: return
            scope.launch { deliverDayStats(pending) }
            return
        }
        statsJob = scope.launch {
            delay(STATS_QUIET_MS)
            flushDayStats()
        }
    }

    /** Foreground time since the screen was shown. Guest and signed-in launches both count. */
    fun reportPlayTime(elapsedMs: Long) {
        scope.launch {
            runCatching {
                playTime.accrue(elapsedMs)
                flushPlay()
            }.onFailure { Log.w(TAG, "play time report failed", it) }
        }
    }

    private fun send(state: InstallState, existing: Boolean, device: InstallDevice) {
        val first = if (state.openSent) post(InstallReport.updateBody(state)) else post(InstallReport.createBody(state, existing, device))
        val result = if (first == InstallWriteResult.REJECTED && !state.openSent) post(InstallReport.updateBody(state)) else first
        if (result == InstallWriteResult.OK) {
            tracker.markOpenSent()
            flushPlay()
            flushDayStats()
        }
        Log.i(TAG, "install ${state.id.take(6)} opens=${state.opens} sent=${state.openSent} result=$result")
    }

    private fun flushPlay() {
        if (!tracker.isOpenSent()) return
        val id = tracker.id() ?: return
        val total = playTime.pendingTotal() ?: return
        val result = post(InstallReport.playBody(id, total))
        if (result == InstallWriteResult.OK) playTime.acknowledge(total)
        Log.i(TAG, "play ${id.take(6)} playMs=$total result=$result")
    }

    private data class PendingDayStats(val id: String, val write: DayStatWrite)

    private fun pendingDayStats(): PendingDayStats? {
        if (dayStats == null || !tracker.isOpenSent()) return null
        val id = tracker.id() ?: return null
        val write = dayStats.outbound() ?: return null
        return PendingDayStats(id, write)
    }

    private fun flushDayStats() {
        val pending = pendingDayStats() ?: return
        deliverDayStats(pending)
    }

    private fun deliverDayStats(pending: PendingDayStats, hops: Int = 0) {
        val write = pending.write
        val result = post(InstallReport.dayStatsBody(pending.id, write.day, write.score, write.hands))
        if (result == InstallWriteResult.OK) {
            dayStats?.acknowledge(write)
            // A same-day count moves at most MAX_HAND_STEP per write. Keep going
            // while the device is still ahead, so one quiet spell finishes the day.
            val more = if (hops >= MAX_STATS_HOPS) null else dayStats?.outbound()
            if (more != null) deliverDayStats(PendingDayStats(pending.id, more), hops + 1)
        }
        Log.i(TAG, "stats ${pending.id.take(6)} day=${write.day} hands=${write.hands ?: "?"} score=${write.score} result=$result")
    }

    private companion object {
        const val TAG = "VpInstall"
        const val STATS_QUIET_MS = 10_000L
        const val MAX_STATS_HOPS = 25
        const val COMMIT_URL =
            "https://firestore.googleapis.com/v1/projects/video-poker-6d665/databases/(default)/documents:commit?key=AIzaSyB6m0Yis89jxvm06OFBqxs8P_vADjRXk0U"
        const val TIMEOUT_MS = 8_000

        fun postCommit(body: String): InstallWriteResult = runCatching {
            val connection = URL(COMMIT_URL).openConnection() as HttpURLConnection
            try {
                connection.requestMethod = "POST"
                connection.connectTimeout = TIMEOUT_MS
                connection.readTimeout = TIMEOUT_MS
                connection.doOutput = true
                connection.setRequestProperty("Content-Type", "application/json")
                connection.outputStream.use { it.write(body.toByteArray(Charsets.UTF_8)) }
                when (val code = connection.responseCode) {
                    HttpURLConnection.HTTP_OK -> InstallWriteResult.OK
                    429 -> InstallWriteResult.RETRY
                    in 500..599 -> InstallWriteResult.RETRY
                    else -> {
                        Log.w(TAG, "install commit HTTP $code")
                        InstallWriteResult.REJECTED
                    }
                }
            } finally {
                connection.disconnect()
            }
        }.getOrElse {
            Log.w(TAG, "install commit not sent", it)
            InstallWriteResult.RETRY
        }
    }
}
