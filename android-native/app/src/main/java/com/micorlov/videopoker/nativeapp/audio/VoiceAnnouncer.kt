package com.micorlov.videopoker.nativeapp.audio

import android.content.Context
import android.speech.tts.TextToSpeech
import java.util.Locale

/**
 * Speaks the hand name after a win, and the opening tutorial. Text-to-speech starts on
 * first use; the latest phrase asked before it is ready is spoken once the engine starts.
 */
class VoiceAnnouncer(context: Context) {
    var enabled: Boolean = true

    private var ready = false
    private var pending: String? = null
    private var pendingLocale: Locale = Locale.getDefault()
    private val engine: TextToSpeech = TextToSpeech(context.applicationContext) { status ->
        ready = status == TextToSpeech.SUCCESS
        val phrase = pending
        pending = null
        if (ready && enabled && phrase != null) speakNow(phrase, pendingLocale)
    }

    fun speak(phrase: String, locale: Locale = Locale.getDefault()) {
        if (!enabled || phrase.isBlank()) return
        if (!ready) {
            pending = phrase
            pendingLocale = locale
            return
        }
        pending = null
        speakNow(phrase, locale)
    }

    private fun speakNow(phrase: String, locale: Locale) {
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
