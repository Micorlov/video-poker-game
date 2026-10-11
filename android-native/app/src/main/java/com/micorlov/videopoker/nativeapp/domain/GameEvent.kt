package com.micorlov.videopoker.nativeapp.domain

/** Something the player should be told about, produced alongside a new [GameState]. */
sealed interface GameEvent {
    /** The stack ran dry and was topped back up to [amount]. */
    data class Rebuy(val amount: Long) : GameEvent

    /** A variant was tapped before the player reached [level]. */
    data class VariantLocked(val level: Int) : GameEvent

    /** Triple / Five Play was tapped before the player reached [level]. */
    data class MultiHandLocked(val level: Int) : GameEvent

    /** A table setting was tapped while a hand is in progress; it can only change between hands. */
    data object FinishHandFirst : GameEvent
}

data class Transition(val state: GameState, val events: List<GameEvent> = emptyList())
