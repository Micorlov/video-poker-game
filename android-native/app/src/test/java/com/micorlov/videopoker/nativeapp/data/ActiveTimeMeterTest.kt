package com.micorlov.videopoker.nativeapp.data

import org.junit.Assert.assertEquals
import org.junit.Test

class ActiveTimeMeterTest {
    private val min = 60_000L

    @Test fun continuousPlayCountsInFull() {
        val m = ActiveTimeMeter()
        m.start(0)
        for (t in 1..30) m.interaction(t * 20_000L) // a tap every 20 s for 10 min
        assertEquals(10 * min, m.stop(10 * min))
    }

    @Test fun appLeftOpenOvernightCountsOnlyTheIdleGap() {
        val m = ActiveTimeMeter()
        m.start(0)
        m.interaction(5 * min)            // first tap 5 min in: credited as 2 min
        val fourteenHours = 14 * 60 * min
        assertEquals(2 * min + 2 * min, m.stop(fourteenHours))
    }

    @Test fun spanIsCapped() {
        val m = ActiveTimeMeter(idleGapMs = Long.MAX_VALUE)
        m.start(0)
        assertEquals(ActiveTimeMeter.MAX_SPAN_MS, m.stop(10 * 60 * min))
    }

    @Test fun stopWithoutStartIsZero() {
        assertEquals(0L, ActiveTimeMeter().stop(1_000))
    }
}
