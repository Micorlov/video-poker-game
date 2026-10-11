package com.micorlov.videopoker.nativeapp.data

import com.micorlov.videopoker.nativeapp.domain.PlayStats
import com.micorlov.videopoker.nativeapp.domain.Rules
import com.micorlov.videopoker.nativeapp.domain.BestHand
import com.micorlov.videopoker.nativeapp.domain.Card
import com.micorlov.videopoker.nativeapp.domain.HandType
import com.micorlov.videopoker.nativeapp.domain.SavedGame
import com.micorlov.videopoker.nativeapp.domain.Variant
import kotlin.test.Test
import kotlin.test.assertEquals

class GameRepositoryTest {

    private val store = InMemoryStore()
    private val repository = GameRepository(store)

    @Test
    fun `an empty store gives a fresh game`() {
        assertEquals(SavedGame(), repository.loadGame())
        assertEquals(UserSettings(), repository.loadSettings())
    }

    @Test
    fun `a saved game round-trips`() {
        val saved = SavedGame(
            balance = 1234,
            today = PlayStats(won = 400, lost = 250, handsPlayed = 33, bestStreak = 4),
            allTime = PlayStats(won = 9_000_000_000, lost = 7_500_000_000, handsPlayed = 2_000, bestStreak = 11),
            lossStreak = 3,
            winStreak = 2,
            bestBalance = 5000,
            lifetimeHands = 72,
            variant = Variant.DOUBLE_BONUS,
            handCount = 5,
        )
        repository.saveGame(saved)
        assertEquals(saved, GameRepository(store).loadGame())
    }

    @Test
    fun `settings round-trip`() {
        val settings = UserSettings(soundEnabled = false, hapticsEnabled = false, theme = AppTheme.CRIMSON, defaultBet = 50)
        repository.saveSettings(settings)
        assertEquals(settings, GameRepository(store).loadSettings())
    }

    @Test
    fun `nonsense stored values fall back to safe ones`() {
        store.write {
            putLong("game.balance", -50)
            putInt("game.lifetimeHands", -3)
            putInt("game.lossStreak", -1)
            putLong("game.today.won", -9)
            putString("game.variant", "poker-of-doom")
            putInt("game.handCount", 4)
            putInt("settings.defaultBet", 7)
            putString("settings.theme", "neon")
        }

        val game = repository.loadGame()
        assertEquals(Rules.STARTING_BALANCE, game.balance)
        assertEquals(0, game.lifetimeHands)
        assertEquals(0, game.lossStreak)
        assertEquals(0L, game.today.won)
        assertEquals(Variant.JACKS, game.variant)
        assertEquals(1, game.handCount)

        val settings = repository.loadSettings()
        assertEquals(Rules.DEFAULT_BET, settings.defaultBet)
        assertEquals(AppTheme.GREEN, settings.theme)
    }

    @Test
    fun `a broke player is saved as broke not refilled`() {
        // Zero is a real balance: the next deal grants the free rebuy, with its toast.
        repository.saveGame(SavedGame(balance = 0))
        assertEquals(0L, repository.loadGame().balance)
    }

    @Test
    fun `the personal best survives a save and load and a corrupt one is dropped`() {
        val best = BestHand(HandType.FLUSH, 6, 60, listOf("A♠", "K♠", "7♠", "4♠", "2♠").map { Card.parse(it)!! })
        repository.saveGame(SavedGame(bestHand = best))
        assertEquals(best, repository.loadGame().bestHand)

        store.write { putString("best.cards", "A♠ K♠") }
        assertEquals(null, repository.loadGame().bestHand)
    }
}
