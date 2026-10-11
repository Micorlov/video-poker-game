package com.micorlov.videopoker.nativeapp.audio

import kotlin.math.abs
import kotlin.math.sqrt
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class SoundSynthTest {

    private val rate = SoundSynth.SAMPLE_RATE

    private val durations = mapOf(
        SoundCue.DEAL to 0.15,
        SoundCue.CLICK to 0.05,
        SoundCue.LOSS to 0.5,
        SoundCue.COIN to 0.3,
        SoundCue.WIN to 0.4,
        SoundCue.BIG_WIN to 1.0,
    )

    private fun rms(samples: ShortArray, from: Int, to: Int): Double {
        var sum = 0.0
        for (i in from until to) sum += samples[i].toDouble() * samples[i]
        return sqrt(sum / (to - from))
    }

    private fun zeroCrossings(samples: ShortArray, from: Int, to: Int): Int {
        var count = 0
        for (i in from + 1 until to) if ((samples[i - 1] < 0) != (samples[i] < 0)) count++
        return count
    }

    @Test
    fun `every cue is defined and has the web app's length`() {
        assertEquals(SoundCue.entries.toSet(), durations.keys)
        durations.forEach { (cue, seconds) ->
            assertEquals((seconds * rate).toInt(), SoundSynth.render(cue).size, "length of $cue")
        }
    }

    @Test
    fun `cues are audible but sit under the web app's music volume`() {
        val ceiling = (0.5 * SoundSynth.VOLUME * Short.MAX_VALUE).toInt() + 1
        SoundCue.entries.forEach { cue ->
            val peak = SoundSynth.render(cue).maxOf { abs(it.toInt()) }
            assertTrue(peak > 200, "$cue is too quiet: peak $peak")
            assertTrue(peak <= ceiling, "$cue is too loud: peak $peak > $ceiling")
        }
    }

    @Test
    fun `every cue fades out instead of ending on a click`() {
        SoundCue.entries.forEach { cue ->
            val samples = SoundSynth.render(cue)
            val tail = samples.size - samples.size / 20
            val loudest = rms(samples, 0, samples.size / 2)
            assertTrue(rms(samples, tail, samples.size) < loudest * 0.5, "$cue tail not quieter than its start")
        }
    }

    @Test
    fun `a winning chime climbs through four rising notes`() {
        val samples = SoundSynth.render(SoundCue.WIN)
        val window = rate / 10
        val crossings = (0 until 4).map { zeroCrossings(samples, it * window, (it + 1) * window) }
        assertTrue(crossings.zipWithNext().all { (a, b) -> b > a }, "pitch should rise note over note: $crossings")
    }

    @Test
    fun `a loss is a low falling thud`() {
        val samples = SoundSynth.render(SoundCue.LOSS)
        val early = zeroCrossings(samples, 0, rate / 10)
        val late = zeroCrossings(samples, rate * 3 / 10, rate * 4 / 10)
        assertTrue(early > late, "pitch should fall: $early then $late")
        assertTrue(early < rate / 10 / 4, "a thud, not a whistle")
    }

    @Test
    fun `rendering is deterministic`() {
        SoundCue.entries.forEach { cue ->
            assertTrue(SoundSynth.render(cue).contentEquals(SoundSynth.render(cue)), "$cue differs between renders")
        }
    }
}
