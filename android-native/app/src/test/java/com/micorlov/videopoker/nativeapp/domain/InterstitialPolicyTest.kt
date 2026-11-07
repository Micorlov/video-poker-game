package com.micorlov.videopoker.nativeapp.domain

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class InterstitialPolicyTest {
    private val gap = InterstitialPolicy.MIN_GAP_MS

    @Test
    fun `a new player sees no ads`() = assertFalse(InterstitialPolicy.due(19, 0, gap))

    @Test
    fun `an ad is due once enough hands and time have passed`() = assertTrue(InterstitialPolicy.due(25, 20, gap))

    @Test
    fun `too few hands since the last ad`() = assertFalse(InterstitialPolicy.due(24, 20, gap))

    @Test
    fun `too little time since the last ad`() = assertFalse(InterstitialPolicy.due(25, 20, gap - 1))
}
