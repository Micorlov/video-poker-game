package com.micorlov.videopoker.nativeapp.audio

import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

/**
 * Plays [SoundCue]s through short-lived static [AudioTrack]s. Building a track is a binder
 * call plus a shared-memory allocation, so it all happens on one background thread, never
 * on the UI thread during a card flip. The PCM for each cue is rendered once, lazily; a
 * track is created per play and released shortly after the cue ends, so rapid-fire effects
 * (card flips, coin ticks) can overlap.
 */
class SoundPlayer {
    private val worker = Executors.newSingleThreadScheduledExecutor { runnable ->
        Thread(runnable, "video-poker-sound").apply { isDaemon = true }
    }

    // Only touched on [worker].
    private val pcm = HashMap<SoundCue, ShortArray>()

    @Volatile
    var enabled: Boolean = true

    fun play(cue: SoundCue) {
        if (!enabled) return
        worker.execute { playNow(cue) }
    }

    private fun playNow(cue: SoundCue) {
        val samples = pcm.getOrPut(cue) { SoundSynth.render(cue) }
        val track = runCatching { buildTrack(samples) }.getOrNull() ?: return

        val started = runCatching {
            track.write(samples, 0, samples.size)
            track.play()
        }.isSuccess
        if (!started) {
            track.release()
            return
        }
        worker.schedule({ track.release() }, (cue.seconds * 1000).toLong() + RELEASE_GRACE_MS, TimeUnit.MILLISECONDS)
    }

    private fun buildTrack(samples: ShortArray): AudioTrack = AudioTrack.Builder()
        .setAudioAttributes(
            AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_GAME)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build(),
        )
        .setAudioFormat(
            AudioFormat.Builder()
                .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                .setSampleRate(SoundSynth.SAMPLE_RATE)
                .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                .build(),
        )
        .setTransferMode(AudioTrack.MODE_STATIC)
        .setBufferSizeInBytes(samples.size * Short.SIZE_BYTES)
        .build()

    private companion object {
        const val RELEASE_GRACE_MS = 150L
    }
}
