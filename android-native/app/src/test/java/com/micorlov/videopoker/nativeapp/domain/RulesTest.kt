package com.micorlov.videopoker.nativeapp.domain

import kotlin.test.Test
import kotlin.test.assertEquals

class RulesTest {

    @Test
    fun `level rises by one every five lifetime hands`() {
        assertEquals(1, Rules.level(0))
        assertEquals(1, Rules.level(4))
        assertEquals(2, Rules.level(5))
        assertEquals(3, Rules.level(10))
        assertEquals(15, Rules.level(70))
    }

    @Test
    fun `variants unlock at the documented levels`() {
        assertEquals(1, Variant.JACKS.minLevel)
        assertEquals(3, Variant.DEUCES.minLevel)
        assertEquals(8, Variant.BONUS.minLevel)
        assertEquals(15, Variant.DOUBLE_BONUS.minLevel)
        assertEquals(10, Rules.MULTI_HAND_MIN_LEVEL)
    }

    @Test
    fun `streak bonus steps up at three five seven and ten wins`() {
        assertEquals(0.0, Rules.streakBonus(0))
        assertEquals(0.0, Rules.streakBonus(2))
        assertEquals(0.1, Rules.streakBonus(3))
        assertEquals(0.1, Rules.streakBonus(4))
        assertEquals(0.2, Rules.streakBonus(5))
        assertEquals(0.2, Rules.streakBonus(6))
        assertEquals(0.3, Rules.streakBonus(7))
        assertEquals(0.3, Rules.streakBonus(9))
        assertEquals(0.5, Rules.streakBonus(10))
        assertEquals(0.5, Rules.streakBonus(25))
    }

    @Test
    fun `the next unlock walks through variants and multi-hand in level order`() {
        assertEquals(Rules.Unlock.VariantUnlock(Variant.DEUCES), Rules.nextUnlock(1))
        assertEquals(Rules.Unlock.VariantUnlock(Variant.DEUCES), Rules.nextUnlock(2))
        assertEquals(Rules.Unlock.VariantUnlock(Variant.BONUS), Rules.nextUnlock(3))
        assertEquals(Rules.Unlock.MultiHand, Rules.nextUnlock(8))
        assertEquals(Rules.Unlock.VariantUnlock(Variant.DOUBLE_BONUS), Rules.nextUnlock(10))
        assertEquals(null, Rules.nextUnlock(15))
    }

    @Test
    fun `unlocks know the level they arrive at`() {
        assertEquals(3, Rules.Unlock.VariantUnlock(Variant.DEUCES).level)
        assertEquals(10, Rules.Unlock.MultiHand.level)
    }

    @Test
    fun `hands left to the next level`() {
        assertEquals(5, Rules.handsToNextLevel(0))
        assertEquals(1, Rules.handsToNextLevel(4))
        assertEquals(5, Rules.handsToNextLevel(5))
        assertEquals(2, Rules.handsToNextLevel(13))
    }

    @Test
    fun `starting balance matches the web app`() {
        assertEquals(1000L, Rules.STARTING_BALANCE)
        assertEquals(listOf(5, 10, 20, 50), Rules.BET_OPTIONS)
        assertEquals(listOf(1, 3, 5), Rules.HAND_COUNT_OPTIONS)
    }
}
