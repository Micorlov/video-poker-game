package com.micorlov.videopoker.nativeapp.data

/**
 * Play time that counts only while the player is actually playing.
 *
 * onStart..onStop alone is wrong: an app left open on a phone that never
 * sleeps (charging with "stay awake", a tablet stand, an emulator) stays
 * "started" for hours, and that whole span was being filed as play time. This
 * meter credits the time between two touches only up to [idleGapMs]; anything
 * longer is treated as the player having walked away. The span is also capped
 * at [maxSpanMs] so one launch can never file more than a plausible session.
 *
 * Times are SystemClock.elapsedRealtime() millis supplied by the caller, so the
 * meter is a plain class that unit tests can drive.
 */
class ActiveTimeMeter(
    private val idleGapMs: Long = IDLE_GAP_MS,
    private val maxSpanMs: Long = MAX_SPAN_MS,
) {
    private var running = false
    private var lastMark = 0L
    private var activeMs = 0L

    fun start(now: Long) {
        if (running) return
        running = true
        lastMark = now
        activeMs = 0L
    }

    /** A touch or key press: the player is still here. */
    fun interaction(now: Long) {
        if (!running) return
        credit(now)
    }

    /** Returns the active milliseconds of this span and stops the meter. 0 when not running. */
    fun stop(now: Long): Long {
        if (!running) return 0L
        credit(now)
        running = false
        return activeMs.coerceAtMost(maxSpanMs)
    }

    private fun credit(now: Long) {
        val gap = now - lastMark
        if (gap > 0) activeMs += gap.coerceAtMost(idleGapMs)
        lastMark = now
    }

    companion object {
        /** Longer than any think time on a hand; shorter than "left it on the table". */
        const val IDLE_GAP_MS = 2L * 60 * 1000
        const val MAX_SPAN_MS = 4L * 60 * 60 * 1000
    }
}
