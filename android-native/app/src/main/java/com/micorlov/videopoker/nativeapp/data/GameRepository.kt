package com.micorlov.videopoker.nativeapp.data

import com.micorlov.videopoker.nativeapp.domain.PlayStats
import com.micorlov.videopoker.nativeapp.domain.Rules
import com.micorlov.videopoker.nativeapp.domain.SavedGame
import com.micorlov.videopoker.nativeapp.domain.Variant

/**
 * Loads and saves progress and settings. Everything read back is validated, because
 * stored data is an external input: a bad value falls back to a safe default instead of
 * crashing the app or handing the player a negative stack.
 */
class GameRepository(private val store: KeyValueStore) {

    fun loadGame(): SavedGame {
        val defaults = SavedGame()
        return SavedGame(
            balance = store.getLong(BALANCE)?.takeIf { it >= 0 } ?: defaults.balance,
            today = loadStats(TODAY),
            allTime = loadStats(ALL_TIME),
            lossStreak = nonNegativeInt(LOSS_STREAK),
            winStreak = nonNegativeInt(WIN_STREAK),
            bestBalance = nonNegativeLong(BEST_BALANCE),
            lifetimeHands = nonNegativeInt(LIFETIME_HANDS),
            variant = Variant.fromStorageKey(store.getString(VARIANT)) ?: defaults.variant,
            handCount = store.getInt(HAND_COUNT)?.takeIf { it in Rules.HAND_COUNT_OPTIONS } ?: defaults.handCount,
        )
    }

    fun saveGame(game: SavedGame) {
        store.write {
            putLong(BALANCE, game.balance)
            saveStats(TODAY, game.today)
            saveStats(ALL_TIME, game.allTime)
            putInt(LOSS_STREAK, game.lossStreak)
            putInt(WIN_STREAK, game.winStreak)
            putLong(BEST_BALANCE, game.bestBalance)
            putInt(LIFETIME_HANDS, game.lifetimeHands)
            putString(VARIANT, game.variant.storageKey)
            putInt(HAND_COUNT, game.handCount)
        }
    }

    /** The local day (yyyy-MM-dd) the daily bonus was last paid, or empty if never. */
    fun loadDailyBonusDay(): String = store.getString(DAILY_BONUS_DAY).orEmpty()

    fun saveDailyBonusDay(day: String) = store.write { putString(DAILY_BONUS_DAY, day) }

    /** ALL INs used on [day]; a stored count from another day does not count. */
    fun loadAllInUsed(day: String): Int =
        if (store.getString(ALL_IN_DAY) == day) nonNegativeInt(ALL_IN_COUNT) else 0

    fun saveAllInUsed(day: String, count: Int) = store.write {
        putString(ALL_IN_DAY, day)
        putInt(ALL_IN_COUNT, count)
    }

    fun loadSettings(): UserSettings {
        val defaults = UserSettings()
        return UserSettings(
            soundEnabled = store.getBoolean(SOUND) ?: defaults.soundEnabled,
            hapticsEnabled = store.getBoolean(HAPTICS) ?: defaults.hapticsEnabled,
            theme = AppTheme.fromStorageKey(store.getString(THEME)) ?: defaults.theme,
            hintsEnabled = store.getBoolean(HINTS) ?: defaults.hintsEnabled,
            defaultBet = store.getInt(DEFAULT_BET)?.takeIf { it in Rules.BET_OPTIONS } ?: defaults.defaultBet,
        )
    }

    fun saveSettings(settings: UserSettings) {
        store.write {
            putBoolean(SOUND, settings.soundEnabled)
            putBoolean(HAPTICS, settings.hapticsEnabled)
            putString(THEME, settings.theme.storageKey)
            putInt(DEFAULT_BET, settings.defaultBet)
            putBoolean(HINTS, settings.hintsEnabled)
        }
    }

    private fun loadStats(prefix: String) = PlayStats(
        won = nonNegativeLong("$prefix.won"),
        lost = nonNegativeLong("$prefix.lost"),
        handsPlayed = nonNegativeInt("$prefix.handsPlayed"),
        bestStreak = nonNegativeInt("$prefix.bestStreak"),
    )

    private fun KeyValueStore.Writer.saveStats(prefix: String, stats: PlayStats) {
        putLong("$prefix.won", stats.won)
        putLong("$prefix.lost", stats.lost)
        putInt("$prefix.handsPlayed", stats.handsPlayed)
        putInt("$prefix.bestStreak", stats.bestStreak)
    }

    private fun nonNegativeInt(key: String): Int = store.getInt(key)?.takeIf { it >= 0 } ?: 0
    private fun nonNegativeLong(key: String): Long = store.getLong(key)?.takeIf { it >= 0 } ?: 0L

    private companion object {
        const val BALANCE = "game.balance"
        const val TODAY = "game.today"
        const val ALL_TIME = "game.allTime"
        const val LOSS_STREAK = "game.lossStreak"
        const val WIN_STREAK = "game.winStreak"
        const val BEST_BALANCE = "game.bestBalance"
        const val LIFETIME_HANDS = "game.lifetimeHands"
        const val VARIANT = "game.variant"
        const val HAND_COUNT = "game.handCount"
        const val DAILY_BONUS_DAY = "daily.bonusDay"
        const val HINTS = "settings.hints"
        const val ALL_IN_DAY = "allin.day"
        const val ALL_IN_COUNT = "allin.count"
        const val SOUND = "settings.sound"
        const val HAPTICS = "settings.haptics"
        const val THEME = "settings.theme"
        const val DEFAULT_BET = "settings.defaultBet"
    }
}
