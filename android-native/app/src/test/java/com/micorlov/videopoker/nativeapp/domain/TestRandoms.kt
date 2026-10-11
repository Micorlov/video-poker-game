package com.micorlov.videopoker.nativeapp.domain

import kotlin.random.Random

/**
 * A Random whose every draw is the lowest possible value (`ConstantRandom(0)`: every roll
 * "succeeds", so the hidden boost always fires) or the highest (`ConstantRandom(-1)`: it never does).
 */
class ConstantRandom(private val bits: Int) : Random() {
    override fun nextBits(bitCount: Int): Int = if (bits == 0) 0 else (1 shl bitCount) - 1
}
