package com.micorlov.videopoker.nativeapp.ui.play

import com.micorlov.videopoker.nativeapp.domain.Phase
import org.junit.Assert.assertEquals
import org.junit.Test

class StakeWindowTest {
    @Test
    fun `cards in motion keep every money control locked`() {
        assertEquals(
            StakeWindow.LOCKED,
            stakeWindow(Phase.BET, outcomeWin = false, cardsFaceUp = true, cardsCleared = false, animating = true),
        )
        assertEquals(
            StakeWindow.LOCKED,
            stakeWindow(Phase.HOLD, outcomeWin = null, cardsFaceUp = false, cardsCleared = false, animating = true),
        )
    }

    @Test
    fun `a face-up hold opens all in and locks the bet`() {
        assertEquals(
            StakeWindow.ALL_IN,
            stakeWindow(Phase.HOLD, outcomeWin = null, cardsFaceUp = true, cardsCleared = false, animating = false),
        )
    }

    @Test
    fun `a win leaves the bet open while the cards stay`() {
        assertEquals(
            StakeWindow.CHANGE_BET,
            stakeWindow(Phase.BET, outcomeWin = true, cardsFaceUp = true, cardsCleared = false, animating = false),
        )
    }

    @Test
    fun `a loss opens the bet only after the cards have folded away`() {
        assertEquals(
            StakeWindow.LOCKED,
            stakeWindow(Phase.BET, outcomeWin = false, cardsFaceUp = true, cardsCleared = false, animating = false),
        )
        assertEquals(
            StakeWindow.CHANGE_BET,
            stakeWindow(Phase.BET, outcomeWin = false, cardsFaceUp = false, cardsCleared = true, animating = false),
        )
    }

    @Test
    fun `a double-up locks the bet`() {
        assertEquals(
            StakeWindow.LOCKED,
            stakeWindow(Phase.DOUBLE_UP, outcomeWin = true, cardsFaceUp = true, cardsCleared = false, animating = false),
        )
    }
}
