package com.micorlov.videopoker.nativeapp.domain

import org.json.JSONObject
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class StrategyHintsTest {

    private fun holds(text: String, variant: Variant = Variant.JACKS) =
        StrategyHints.holds(hand(text), variant).joinToString("") { if (it) "1" else "0" }

    @Test
    fun `keeps a made flush and a high pair`() {
        assertEquals("11111", holds("2♠ 5♠ 9♠ J♠ K♠"))
        assertEquals("11000", holds("J♠ J♥ 3♦ 6♣ 9♠"))
    }

    @Test
    fun `chases four to a royal over a made pair`() {
        assertEquals("11110", holds("10♠ J♠ Q♠ K♠ K♥"))
    }

    @Test
    fun `discards everything when nothing is worth keeping`() {
        assertEquals("00000", holds("2♠ 5♥ 8♦ 9♣ 3♠"))
    }

    @Test
    fun `deuces are always kept in the deuces game`() {
        // Two deuces and a kicker already make three of a kind, so the lowest natural rides along.
        assertEquals("10011", holds("2♠ 5♥ 8♦ 2♣ 3♠", Variant.DEUCES))
    }

    @Test
    fun `matches the web app's hints on thousands of random hands`() {
        val golden = JSONObject(
            checkNotNull(javaClass.classLoader?.getResourceAsStream("hints_golden.json")) {
                "hints_golden.json missing — run: node android-native/tools/gen-hints-golden.js"
            }.bufferedReader(Charsets.UTF_8).use { it.readText() },
        )
        var checked = 0
        mapOf("jacks" to Variant.JACKS, "deuces" to Variant.DEUCES).forEach { (key, variant) ->
            val samples = golden.getJSONArray(key)
            for (i in 0 until samples.length()) {
                val sample = samples.getJSONObject(i)
                assertEquals(sample.getString("k"), holds(sample.getString("h"), variant), "$key: ${sample.getString("h")}")
                checked++
            }
        }
        assertTrue(checked >= 12000, "fixture looks truncated: $checked")
    }
}
