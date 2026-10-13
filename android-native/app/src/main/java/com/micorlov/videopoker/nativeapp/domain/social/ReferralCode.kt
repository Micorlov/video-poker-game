package com.micorlov.videopoker.nativeapp.domain.social

import kotlin.random.Random

/** A player's personal invite code, in the web app's format (generateRoomCode() in js/firebase.js). */
object ReferralCode {
    /** No 0/O or 1/I, so a code read aloud or typed by hand is unambiguous. */
    const val ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    const val LENGTH = 6

    fun generate(random: Random = Random.Default): String =
        buildString { repeat(LENGTH) { append(ALPHABET[random.nextInt(ALPHABET.length)]) } }

    /** Trims and upper-cases typed input; null unless it is a well-formed code. */
    fun normalize(input: String): String? =
        input.trim().uppercase().takeIf { code -> code.length == LENGTH && code.all { it in ALPHABET } }
}
