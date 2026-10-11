package com.micorlov.videopoker.nativeapp.audio

import android.content.Context
import android.speech.tts.TextToSpeech
import java.util.Locale

/**
 * Speaks the hand name after a win (speakHandName() in js/audio.js). Text-to-speech starts
 * on first use, and anything asked before it is ready is dropped: a late announcement of an
 * old hand would be worse than none.
 */
class VoiceAnnouncer(context: Context) {
    var enabled: Boolean = true

    private var ready = false
    private val engine: TextToSpeech = TextToSpeech(context.applicationContext) { status ->
        ready = status == TextToSpeech.SUCCESS
    }

    fun speak(phrase: String, locale: Locale = Locale.getDefault()) {
        if (!enabled || !ready || phrase.isBlank()) return
        engine.language = locale
        engine.speak(phrase, TextToSpeech.QUEUE_FLUSH, null, UTTERANCE_ID)
    }

    fun stop() {
        if (ready) engine.stop()
    }

    fun release() {
        engine.stop()
        engine.shutdown()
    }

    private companion object {
        const val UTTERANCE_ID = "hand-name"
    }
}
