package com.micorlov.videopoker.nativeapp.audio

import kotlin.math.PI
import kotlin.math.exp
import kotlin.math.floor
import kotlin.math.min
import kotlin.math.sin

enum class SoundCue(val seconds: Double) {
    DEAL(0.15),
    CLICK(0.05),
    LOSS(0.5),
    COIN(0.3),
    WIN(0.4),
    BIG_WIN(1.0),
}

/**
 * Renders the game's sound effects as 16-bit mono PCM. Like the web app (js/audio.js)
 * there are no audio files: every cue is a few lines of math, ported here formula for
 * formula. [VOLUME] is the web app's MUSIC_VOLUME, so effects sit as quietly under
 * everything else on the phone as they do in the browser.
 */
object SoundSynth {
    const val SAMPLE_RATE = 22_050
    const val VOLUME = 0.25

    fun render(cue: SoundCue, sampleRate: Int = SAMPLE_RATE): ShortArray {
        val count = (cue.seconds * sampleRate).toInt()
        return ShortArray(count) { i ->
            val value = sample(cue, i.toDouble() / sampleRate) * VOLUME
            (value * Short.MAX_VALUE).toInt().coerceIn(Short.MIN_VALUE.toInt(), Short.MAX_VALUE.toInt()).toShort()
        }
    }

    private fun sample(cue: SoundCue, t: Double): Double = when (cue) {
        SoundCue.DEAL -> sine(600 * exp(-30 * t) + 100, t) * exp(-25 * t) * 0.5
        SoundCue.CLICK -> sine(2000 * exp(-100 * t), t) * exp(-80 * t) * 0.4
        SoundCue.LOSS -> sine(120 * exp(-4 * t), t) * exp(-3 * t) * 0.5
        SoundCue.COIN -> (sine(1800.0, t) + sine(2400.0, t)) * 0.5 * exp(-12 * t) * 0.4
        SoundCue.WIN -> win(t)
        SoundCue.BIG_WIN -> bigWin(t)
    }

    private fun sine(frequency: Double, t: Double) = sin(2 * PI * frequency * t)

    /** Four rising notes, 100 ms apart. */
    private fun win(t: Double): Double {
        val note = min(WIN_NOTES.size - 1, floor(t / 0.1).toInt())
        val amplitude = exp(-6 * (t % 0.1)) * exp(-1.5 * t)
        return sine(WIN_NOTES[note], t) * amplitude * 0.4
    }

    /** Four rising triads, 250 ms apart. */
    private fun bigWin(t: Double): Double {
        val chord = BIG_WIN_CHORDS[min(BIG_WIN_CHORDS.size - 1, floor(t / 0.25).toInt())]
        val amplitude = exp(-3 * (t % 0.25)) * exp(-0.5 * t)
        val mixed = chord.sumOf { sine(it, t) } / chord.size
        return mixed * amplitude * 0.4
    }

    private val WIN_NOTES = doubleArrayOf(523.25, 659.25, 783.99, 1046.50)

    private val BIG_WIN_CHORDS = listOf(
        doubleArrayOf(523.25, 659.25, 783.99),
        doubleArrayOf(587.33, 739.99, 880.00),
        doubleArrayOf(659.25, 830.61, 987.77),
        doubleArrayOf(783.99, 987.77, 1174.66),
    )
}
