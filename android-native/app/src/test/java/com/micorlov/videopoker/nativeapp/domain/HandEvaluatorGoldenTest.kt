package com.micorlov.videopoker.nativeapp.domain

import org.json.JSONArray
import org.json.JSONObject
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/**
 * Pins the Kotlin evaluator to the evaluator the web app ships (js/hand-eval.js).
 *
 * The fixture is produced by `node android-native/tools/gen-golden.js`, which runs the
 * JS evaluator over every one of the 2,598,960 five-card hands for each variant.
 */
class HandEvaluatorGoldenTest {

    private val golden: JSONObject by lazy {
        val stream = checkNotNull(javaClass.classLoader?.getResourceAsStream("hand_eval_golden.json")) {
            "hand_eval_golden.json missing — run: node android-native/tools/gen-golden.js"
        }
        JSONObject(stream.bufferedReader(Charsets.UTF_8).use { it.readText() })
    }

    private val variantKeys = mapOf(
        Variant.JACKS to "jacks",
        Variant.DEUCES to "deuces",
        Variant.BONUS to "bonus",
        Variant.DOUBLE_BONUS to "doubleBonus",
    )

    private fun JSONArray.toIntList(): List<Int> = List(length()) { getInt(it) }

    @Test
    fun `sampled hands match the web evaluator exactly`() {
        var checked = 0
        var expectedCount = 0
        for ((variant, key) in variantKeys) {
            val samples = golden.getJSONObject("samples").getJSONArray(key)
            expectedCount += samples.length()
            for (i in 0 until samples.length()) {
                val sample = samples.getJSONObject(i)
                val cards = hand(sample.getString("h"))
                val actual = HandEvaluator.evaluate(cards, variant)
                val context = "$key: ${sample.getString("h")}"

                assertEquals(sample.getString("t"), actual.type.key, "type for $context")
                assertEquals(sample.getJSONArray("w").toIntList(), actual.winIndices, "winIndices for $context")
                assertEquals(sample.getJSONArray("s").toIntList(), actual.secondPairIndices, "secondPair for $context")
                assertEquals(sample.getJSONArray("m").toIntList(), actual.thirdMatchIndices, "thirdMatch for $context")
                checked++
            }
        }
        assertEquals(expectedCount, checked, "every fixture sample must be checked")
        assertTrue(checked > 2000, "fixture looks empty or truncated: $checked samples")
    }

    @Test
    fun `every five card hand lands on the same hand type as the web evaluator`() {
        val deck = standardDeck()
        for ((variant, key) in variantKeys) {
            val expected = golden.getJSONObject("distribution").getJSONObject(key)
            val actual = mutableMapOf<String, Int>()
            var total = 0

            for (a in 0 until 48) for (b in a + 1 until 49) for (c in b + 1 until 50)
                for (d in c + 1 until 51) for (e in d + 1 until 52) {
                    val type = HandEvaluator.evaluate(listOf(deck[a], deck[b], deck[c], deck[d], deck[e]), variant).type
                    actual.merge(type.key, 1, Int::plus)
                    total++
                }

            assertEquals(2_598_960, total, "hands enumerated for $key")
            val expectedMap = expected.keys().asSequence().associateWith { expected.getInt(it) }
            assertEquals(expectedMap, actual, "hand distribution for $key")
        }
    }

    @Test
    fun `jacks or better distribution matches textbook combinatorics`() {
        // Independent of the JS port: these are the standard counts for 5-card hands.
        val deck = standardDeck()
        val actual = mutableMapOf<HandType, Int>()
        for (a in 0 until 48) for (b in a + 1 until 49) for (c in b + 1 until 50)
            for (d in c + 1 until 51) for (e in d + 1 until 52) {
                val type = HandEvaluator.evaluate(listOf(deck[a], deck[b], deck[c], deck[d], deck[e]), Variant.JACKS).type
                actual.merge(type, 1, Int::plus)
            }

        assertEquals(4, actual[HandType.ROYAL_FLUSH])
        assertEquals(36, actual[HandType.STRAIGHT_FLUSH])
        assertEquals(624, actual[HandType.FOUR_OF_A_KIND])
        assertEquals(3_744, actual[HandType.FULL_HOUSE])
        assertEquals(5_108, actual[HandType.FLUSH])
        assertEquals(10_200, actual[HandType.STRAIGHT])
        assertEquals(54_912, actual[HandType.THREE_OF_A_KIND])
        assertEquals(123_552, actual[HandType.TWO_PAIR])
        assertEquals(337_920, actual[HandType.JACKS_OR_BETTER])
    }
}
