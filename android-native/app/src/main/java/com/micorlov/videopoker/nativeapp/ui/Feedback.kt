package com.micorlov.videopoker.nativeapp.ui

import android.os.Build
import android.view.HapticFeedbackConstants
import android.view.View
import com.micorlov.videopoker.nativeapp.audio.SoundCue
import com.micorlov.videopoker.nativeapp.audio.SoundPlayer

/** Vibration cues, mapped from the web app's LIGHT / MEDIUM / HEAVY haptics. Respects the Settings toggle. */
class Haptics(private val view: View) {
    var enabled: Boolean = true

    fun light() = perform(HapticFeedbackConstants.CLOCK_TICK)

    fun medium() = perform(HapticFeedbackConstants.CONTEXT_CLICK)

    fun heavy() = perform(
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) HapticFeedbackConstants.CONFIRM else HapticFeedbackConstants.LONG_PRESS,
    )

    private fun perform(constant: Int) {
        if (enabled) view.performHapticFeedback(constant)
    }
}

/** Everything the player can hear or feel, gated by the Settings toggles. */
class Feedback(val sound: SoundPlayer, val haptics: Haptics) {
    fun play(cue: SoundCue) = sound.play(cue)
}
