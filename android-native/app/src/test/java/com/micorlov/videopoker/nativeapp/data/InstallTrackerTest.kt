package com.micorlov.videopoker.nativeapp.data

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.runBlocking
import org.json.JSONObject
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

class InstallTrackerTest {
    private val device = InstallDevice(
        version = "3.0.2-extra-long-build",
        platform = "",
        androidSdk = 36,
        chrome = 0,
        lang = "he-IL",
        country = "",
        source = "",
    )

    @Test
    fun `the first launch creates a 20 character id and has not been sent`() {
        val state = InstallTracker(InMemoryStore()).beginLaunch { "a".repeat(20) }
        assertEquals("a".repeat(20), state.id)
        assertEquals(1, state.opens)
        assertFalse(state.openSent)
    }

    @Test
    fun `a later launch keeps the id and counts one more open`() {
        val store = InMemoryStore()
        val tracker = InstallTracker(store)
        tracker.beginLaunch { "a".repeat(20) }
        tracker.markOpenSent()
        val again = tracker.beginLaunch { "b".repeat(20) }
        assertEquals("a".repeat(20), again.id)
        assertEquals(2, again.opens)
        assertTrue(again.openSent)
    }

    @Test
    fun `a stored id the rules would refuse is replaced`() {
        val store = InMemoryStore()
        store.write { putString("install_id", "too-short") }
        val state = InstallTracker(store).beginLaunch { "c".repeat(20) }
        assertEquals("c".repeat(20), state.id)
        assertFalse(state.openSent)
    }

    @Test
    fun `the create body is the open document the panel reads`() {
        val state = InstallState("abcDEF0123456789wxyz", 1, false)
        val body = JSONObject(InstallReport.createBody(state, existing = false, device = device))
        val write = body.getJSONArray("writes").getJSONObject(0)
        assertEquals(false, write.getJSONObject("currentDocument").getBoolean("exists"))
        assertEquals("at", write.getJSONArray("updateTransforms").getJSONObject(0).getString("fieldPath"))
        val fields = write.getJSONObject("update").getJSONObject("fields")
        assertEquals("open", fields.getJSONObject("stage").getString("stringValue"))
        assertEquals(state.id, fields.getJSONObject("installId").getString("stringValue"))
        assertEquals(false, fields.getJSONObject("existing").getBoolean("booleanValue"))
        assertEquals("1", fields.getJSONObject("opens").getString("integerValue"))
        assertEquals("3.0.2-extra-long-bui", fields.getJSONObject("version").getString("stringValue"))
        assertEquals("android", fields.getJSONObject("platform").getString("stringValue"))
        assertEquals("0", fields.getJSONObject("bootMs").getString("integerValue"))
        assertEquals(
            "projects/video-poker-6d665/databases/(default)/documents/installs/${state.id}_open",
            write.getJSONObject("update").getString("name"),
        )
        assertFalse(fields.has("at"))
        assertFalse(fields.has("lastOpenAt"))
    }

    @Test
    fun `a later launch only moves the open count`() {
        val state = InstallState("abcDEF0123456789wxyz", 4, true)
        val write = JSONObject(InstallReport.updateBody(state)).getJSONArray("writes").getJSONObject(0)
        assertEquals(true, write.getJSONObject("currentDocument").getBoolean("exists"))
        assertEquals("lastOpenAt", write.getJSONArray("updateTransforms").getJSONObject(0).getString("fieldPath"))
        assertEquals("opens", write.getJSONObject("updateMask").getJSONArray("fieldPaths").getString(0))
        assertEquals("4", write.getJSONObject("update").getJSONObject("fields").getJSONObject("opens").getString("integerValue"))
    }

    @Test
    fun `a create the server already has falls back to an update and is remembered`() = runBlocking {
        val store = InMemoryStore()
        val bodies = mutableListOf<String>()
        val results = ArrayDeque(listOf(InstallWriteResult.REJECTED, InstallWriteResult.OK))
        val reporter = FirestoreInstallReporter(InstallTracker(store), PlayTimeLedger(store), immediateScope()) { body ->
            bodies += body
            results.removeFirst()
        }
        reporter.report(existing = true, device = device)
        assertEquals(2, bodies.size)
        assertTrue(bodies[0].contains(""""exists":false"""))
        assertTrue(bodies[1].contains(""""exists":true"""))
        assertEquals(true, store.getBoolean("install_open_sent"))
    }

    @Test
    fun `a failed send is tried again on the next launch`() = runBlocking {
        val store = InMemoryStore()
        val reporter = FirestoreInstallReporter(InstallTracker(store), PlayTimeLedger(store), immediateScope()) { InstallWriteResult.RETRY }
        reporter.report(existing = false, device = device)
        assertEquals(false, store.getBoolean("install_open_sent"))
        val state = InstallTracker(store).beginLaunch { "d".repeat(20) }
        assertFalse(state.openSent)
        assertEquals(2, state.opens)
    }

    @Test
    fun `a session shorter than ten seconds is not play time`() {
        assertEquals(null, PlayTimeLedger(InMemoryStore()).accrue(9_999))
    }

    @Test
    fun `play time is an absolute total and a failed send stays pending`() {
        val ledger = PlayTimeLedger(InMemoryStore())
        assertEquals(15_000L, ledger.accrue(15_000))
        assertEquals(40_000L, ledger.accrue(25_000))
        ledger.acknowledge(40_000L)
        assertEquals(null, ledger.pendingTotal())
        assertEquals(50_000L, ledger.accrue(10_000))
    }

    @Test
    fun `the play body only sets playMs`() {
        val write = JSONObject(InstallReport.playBody("abcDEF0123456789wxyz", 45000)).getJSONArray("writes").getJSONObject(0)
        assertEquals("playMs", write.getJSONObject("updateMask").getJSONArray("fieldPaths").getString(0))
        assertEquals("45000", write.getJSONObject("update").getJSONObject("fields").getJSONObject("playMs").getString("integerValue"))
        assertEquals(true, write.getJSONObject("currentDocument").getBoolean("exists"))
    }

    @Test
    fun `leaving the app sends the played time once the install exists`() = runBlocking {
        val store = InMemoryStore()
        val tracker = InstallTracker(store)
        val ledger = PlayTimeLedger(store)
        val bodies = mutableListOf<String>()
        val reporter = FirestoreInstallReporter(tracker, ledger, immediateScope()) { body ->
            bodies += body
            InstallWriteResult.OK
        }
        reporter.report(existing = false, device = device)
        reporter.reportPlayTime(20_000)
        assertTrue(bodies.any { it.contains(""""playMs":{"integerValue":"20000"}""") })
        assertEquals(null, ledger.pendingTotal())
    }

    @Test
    fun `an existing profit is sent without a hand count once the install exists`() = runBlocking {
        val store = InMemoryStore()
        val stats = DayStatsLedger(store)
        stats.seed("2026-10-20", playedToday = true, score = 40)
        val bodies = mutableListOf<String>()
        val reporter = FirestoreInstallReporter(
            InstallTracker(store),
            PlayTimeLedger(store),
            immediateScope(),
            dayStats = stats,
            post = { body ->
                bodies += body
                InstallWriteResult.OK
            },
        )
        reporter.report(existing = false, device = device)
        val statsBody = bodies.first { it.contains("statDay") }
        val write = JSONObject(statsBody).getJSONArray("writes").getJSONObject(0)
        val fields = write.getJSONObject("update").getJSONObject("fields")
        assertEquals("2026-10-20", fields.getJSONObject("statDay").getString("stringValue"))
        assertEquals("40", fields.getJSONObject("score").getString("integerValue"))
        assertFalse(fields.has("hands"))
        assertNull(stats.outbound())
    }

    @Test
    fun `leaving the table sends the day's totals without waiting`() = runBlocking {
        val store = InMemoryStore()
        val stats = DayStatsLedger(store)
        stats.seed("2026-10-20", playedToday = false, score = 0)
        stats.record("2026-10-20", scoreDelta = -12, hand = true)
        val bodies = mutableListOf<String>()
        val reporter = FirestoreInstallReporter(
            InstallTracker(store),
            PlayTimeLedger(store),
            immediateScope(),
            dayStats = stats,
            post = { body ->
                bodies += body
                InstallWriteResult.OK
            },
        )
        reporter.report(existing = false, device = device)
        bodies.clear()
        stats.record("2026-10-20", scoreDelta = 7, hand = true)
        reporter.reportDayStats(immediate = true)
        val write = JSONObject(bodies.single { it.contains("statDay") }).getJSONArray("writes").getJSONObject(0)
        val fields = write.getJSONObject("update").getJSONObject("fields")
        assertEquals("2026-10-20", fields.getJSONObject("statDay").getString("stringValue"))
        assertEquals("-5", fields.getJSONObject("score").getString("integerValue"))
        assertEquals("2", fields.getJSONObject("hands").getString("integerValue"))
        assertNull(stats.outbound())
    }

    @Test
    fun `a rejected stats write stays pending`() = runBlocking {
        val store = InMemoryStore()
        val stats = DayStatsLedger(store)
        stats.seed("2026-10-20", playedToday = false, score = 0)
        stats.record("2026-10-20", scoreDelta = 8, hand = true)
        val reporter = FirestoreInstallReporter(
            InstallTracker(store),
            PlayTimeLedger(store),
            immediateScope(),
            dayStats = stats,
            post = { body -> if (body.contains("statDay")) InstallWriteResult.REJECTED else InstallWriteResult.OK },
        )
        reporter.report(existing = false, device = device)
        assertEquals(DayStatWrite("2026-10-20", 8, 1), stats.outbound())
    }

    private fun immediateScope() = CoroutineScope(SupervisorJob() + Dispatchers.Unconfined)
}
