package com.micorlov.videopoker.nativeapp.domain

import java.time.Instant
import java.util.TimeZone
import kotlin.test.AfterTest
import kotlin.test.Test
import kotlin.test.assertEquals

class UtcDayTest {

    private val originalZone: TimeZone = TimeZone.getDefault()

    @AfterTest
    fun restoreZone() = TimeZone.setDefault(originalZone)

    private fun ms(iso: String) = Instant.parse(iso).toEpochMilli()

    @Test
    fun `the last second of a UTC day still belongs to it`() {
        assertEquals("2026-10-13", UtcDay.key(ms("2026-10-13T23:59:59Z")))
    }

    @Test
    fun `UTC midnight starts the next day`() {
        assertEquals("2026-10-14", UtcDay.key(ms("2026-10-14T00:00:00Z")))
    }

    @Test
    fun `the device time zone never moves the day`() {
        val instant = ms("2026-10-13T23:30:00Z")
        for (zone in listOf("Pacific/Kiritimati", "Etc/GMT+12", "Asia/Jerusalem")) {
            TimeZone.setDefault(TimeZone.getTimeZone(zone))
            assertEquals("2026-10-13", UtcDay.key(instant), zone)
        }
    }

    @Test
    fun `the next midnight is the start of the following UTC day`() {
        assertEquals(ms("2026-10-14T00:00:00Z"), UtcDay.nextMidnightMs(ms("2026-10-13T08:15:00Z")))
        assertEquals(ms("2026-10-15T00:00:00Z"), UtcDay.nextMidnightMs(ms("2026-10-14T00:00:00Z")))
    }

    @Test
    fun `the countdown rounds minutes up`() {
        assertEquals(ResetCountdown(15, 45), UtcDay.untilReset(ms("2026-10-13T08:15:00Z")))
        assertEquals(ResetCountdown(0, 1), UtcDay.untilReset(ms("2026-10-13T23:59:59Z")))
        assertEquals(ResetCountdown(24, 0), UtcDay.untilReset(ms("2026-10-13T00:00:00Z")))
    }
}
