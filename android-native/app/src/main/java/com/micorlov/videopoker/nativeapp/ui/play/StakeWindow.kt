package com.micorlov.videopoker.nativeapp.ui.play

import com.micorlov.videopoker.nativeapp.domain.Phase

/**
 * Which money control is open. The stake chips and ALL IN are never both the thing
 * the layout is asking you to use: chips change the next hand's bet, ALL IN raises
 * the hand already on the table.
 */
enum class StakeWindow {
    /** Between hands, with the table settled: the bet chips accept a new stake. */
    CHANGE_BET,

    /** Cards are face up and holds are being chosen: ALL IN can raise this hand. */
    ALL_IN,

    /** A deal, draw, or fold is still moving, or a double-up is in progress. */
    LOCKED,
}

/**
 * Maps the table onto [StakeWindow].
 *
 * A draw settles the phase to [Phase.BET] immediately, before the cards have finished
 * moving, so [animating] keeps the chips locked until the player can see the outcome.
 * A win leaves the cards up and opens the chips. A loss opens them only once the cards
 * have folded away ([cardsCleared]).
 */
fun stakeWindow(
    phase: Phase,
    outcomeWin: Boolean?,
    cardsFaceUp: Boolean,
    cardsCleared: Boolean,
    animating: Boolean,
): StakeWindow {
    if (animating || phase == Phase.DOUBLE_UP) return StakeWindow.LOCKED
    return when (phase) {
        Phase.HOLD -> if (cardsFaceUp) StakeWindow.ALL_IN else StakeWindow.LOCKED
        Phase.BET ->
            if (cardsCleared || (outcomeWin == true && cardsFaceUp)) StakeWindow.CHANGE_BET
            else StakeWindow.LOCKED
        Phase.DOUBLE_UP -> StakeWindow.LOCKED
    }
}
