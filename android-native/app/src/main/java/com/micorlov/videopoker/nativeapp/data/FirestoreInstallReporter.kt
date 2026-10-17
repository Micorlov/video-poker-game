package com.micorlov.videopoker.nativeapp.data

import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
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
    private val post: (String) -> InstallWriteResult = ::postCommit,
) {
    fun report(existing: Boolean, device: InstallDevice) {
        scope.launch {
            runCatching { send(existing, device) }
                .onFailure { Log.w(TAG, "install report failed", it) }
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

    private fun send(existing: Boolean, device: InstallDevice) {
        send(tracker.beginLaunch(), existing, device)
    }

    private companion object {
        const val TAG = "VpInstall"
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
