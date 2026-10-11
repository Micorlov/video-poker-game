package com.micorlov.videopoker.nativeapp.data

import com.micorlov.videopoker.nativeapp.domain.AppLanguage
import com.micorlov.videopoker.nativeapp.domain.BestHand
import com.micorlov.videopoker.nativeapp.domain.Card
import com.micorlov.videopoker.nativeapp.domain.DeepLink
import com.micorlov.videopoker.nativeapp.domain.HandEvaluator
import com.micorlov.videopoker.nativeapp.domain.HandType
import com.micorlov.videopoker.nativeapp.domain.PlayStats
import com.micorlov.videopoker.nativeapp.domain.RemoteFlags
import com.micorlov.videopoker.nativeapp.domain.ReviewState
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
            bestHand = loadBestHand(),
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
            game.bestHand?.let {
                putString(BEST_TYPE, it.type.key)
                putInt(BEST_MULT, it.multiple)
                putInt(BEST_PAYOUT, it.payout)
                putString(BEST_CARDS, it.cards.joinToString(" "))
            }
        }
    }

    fun loadReview(): ReviewState = ReviewState(
        wins = nonNegativeInt(REVIEW_WINS),
        shown = store.getBoolean(REVIEW_SHOWN) ?: false,
        shownAt = nonNegativeLong(REVIEW_SHOWN_AT),
        cardCount = nonNegativeInt(REVIEW_CARDS),
        lastCardAt = nonNegativeLong(REVIEW_LAST_CARD_AT),
        rated = store.getBoolean(REVIEW_RATED) ?: false,
    )

    fun saveReview(state: ReviewState) = store.write {
        putInt(REVIEW_WINS, state.wins)
        putBoolean(REVIEW_SHOWN, state.shown)
        putLong(REVIEW_SHOWN_AT, state.shownAt)
        putInt(REVIEW_CARDS, state.cardCount)
        putLong(REVIEW_LAST_CARD_AT, state.lastCardAt)
        putBoolean(REVIEW_RATED, state.rated)
    }

    fun loadLastPlayedDay(): String = store.getString(LAST_PLAYED_DAY).orEmpty()

    fun saveLastPlayedDay(day: String) = store.write { putString(LAST_PLAYED_DAY, day) }

    fun loadLastReminderDay(): String = store.getString(LAST_REMINDER_DAY).orEmpty()

    fun saveLastReminderDay(day: String) = store.write { putString(LAST_REMINDER_DAY, day) }

    /**
     * Codes that arrived by link or install referrer, parked until the feature that consumes them
     * (friends, rooms, gifts) can run. A friend often plays a while before signing in, and the
     * install referrer is only ever read once, so these survive restarts.
     */
    fun loadPendingLink(): DeepLink? = when (store.getString(PENDING_KIND)) {
        "invite" -> store.getString(PENDING_VALUE)?.takeIf { it.isNotBlank() }?.let(DeepLink::Invite)
        "room" -> store.getString(PENDING_VALUE)?.takeIf { it.isNotBlank() }?.let(DeepLink::Room)
        "gift" -> store.getString(PENDING_VALUE)?.takeIf { it.isNotBlank() }?.let(DeepLink::Gift)
        else -> null
    }

    fun savePendingLink(link: DeepLink) = store.write {
        when (link) {
            is DeepLink.Invite -> { putString(PENDING_KIND, "invite"); putString(PENDING_VALUE, link.code) }
            is DeepLink.Room -> { putString(PENDING_KIND, "room"); putString(PENDING_VALUE, link.code) }
            is DeepLink.Gift -> { putString(PENDING_KIND, "gift"); putString(PENDING_VALUE, link.id) }
        }
    }

    fun clearPendingLink() = store.write { putString(PENDING_KIND, ""); putString(PENDING_VALUE, "") }

    /** Whether the one-time Play install referrer has been read already. */
    fun isReferrerRead(): Boolean = store.getBoolean(REFERRER_READ) ?: false

    fun markReferrerRead() = store.write { putBoolean(REFERRER_READ, true) }

    /** The last flags fetched, kept so the app behaves the same offline. */
    fun loadFlags(): RemoteFlags = RemoteFlags(
        facebookSignIn = store.getBoolean(FLAG_FACEBOOK) ?: true,
        champions = store.getBoolean(FLAG_CHAMPIONS) ?: true,
        stories = store.getBoolean(FLAG_STORIES) ?: true,
        bracelets = store.getBoolean(FLAG_BRACELETS) ?: true,
        friendsRooms = store.getBoolean(FLAG_FRIENDS_ROOMS) ?: true,
        allInDailyLimit = store.getInt(FLAG_ALL_IN_LIMIT)?.takeIf { it > 0 } ?: Rules.ALL_IN_DAILY_LIMIT,
    )

    fun saveFlags(flags: RemoteFlags) = store.write {
        putBoolean(FLAG_FACEBOOK, flags.facebookSignIn)
        putBoolean(FLAG_CHAMPIONS, flags.champions)
        putBoolean(FLAG_STORIES, flags.stories)
        putBoolean(FLAG_BRACELETS, flags.bracelets)
        putBoolean(FLAG_FRIENDS_ROOMS, flags.friendsRooms)
        putInt(FLAG_ALL_IN_LIMIT, flags.allInDailyLimit)
    }

    fun isOnboardingSeen(): Boolean = store.getBoolean(ONBOARDING_SEEN) ?: false

    fun markOnboardingSeen() = store.write { putBoolean(ONBOARDING_SEEN, true) }

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
            voiceEnabled = store.getBoolean(VOICE) ?: defaults.voiceEnabled,
            language = AppLanguage.fromTag(store.getString(LANGUAGE)),
            notifySocial = store.getBoolean(NOTIFY_SOCIAL) ?: defaults.notifySocial,
            notifyLeaderboard = store.getBoolean(NOTIFY_LEADERBOARD) ?: defaults.notifyLeaderboard,
            dailyReminderEnabled = store.getBoolean(NOTIFY_DAILY) ?: defaults.dailyReminderEnabled,
            notifyBestHand = store.getBoolean(NOTIFY_BEST_HAND) ?: defaults.notifyBestHand,
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
            putBoolean(VOICE, settings.voiceEnabled)
            putString(LANGUAGE, settings.language?.tag.orEmpty())
            putBoolean(NOTIFY_SOCIAL, settings.notifySocial)
            putBoolean(NOTIFY_LEADERBOARD, settings.notifyLeaderboard)
            putBoolean(NOTIFY_DAILY, settings.dailyReminderEnabled)
            putBoolean(NOTIFY_BEST_HAND, settings.notifyBestHand)
        }
    }

    /** Stored data is untrusted: a half-written or hand-edited best hand is dropped, not trusted. */
    private fun loadBestHand(): BestHand? {
        val type = HandType.entries.firstOrNull { it.key == store.getString(BEST_TYPE) } ?: return null
        val payout = store.getInt(BEST_PAYOUT)?.takeIf { it > 0 } ?: return null
        val cards = store.getString(BEST_CARDS)?.split(" ")?.mapNotNull(Card::parse).orEmpty()
        if (cards.size != HandEvaluator.HAND_SIZE) return null
        return BestHand(type, store.getInt(BEST_MULT)?.coerceAtLeast(0) ?: 0, payout, cards)
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
        const val LANGUAGE = "settings.language"
        const val VOICE = "settings.voice"
        const val HINTS = "settings.hints"
        const val ALL_IN_DAY = "allin.day"
        const val ALL_IN_COUNT = "allin.count"
        const val BEST_TYPE = "best.type"
        const val BEST_MULT = "best.mult"
        const val BEST_PAYOUT = "best.payout"
        const val BEST_CARDS = "best.cards"
        const val REVIEW_WINS = "review.wins"
        const val REVIEW_SHOWN = "review.shown"
        const val REVIEW_SHOWN_AT = "review.shownAt"
        const val REVIEW_CARDS = "review.cardCount"
        const val REVIEW_LAST_CARD_AT = "review.lastCardAt"
        const val REVIEW_RATED = "review.rated"
        const val ONBOARDING_SEEN = "onboarding.seen"
        const val LAST_PLAYED_DAY = "daily.lastPlayedDay"
        const val LAST_REMINDER_DAY = "daily.lastReminderDay"
        const val NOTIFY_SOCIAL = "settings.notify.social"
        const val NOTIFY_LEADERBOARD = "settings.notify.leaderboard"
        const val NOTIFY_DAILY = "settings.notify.dailyReminder"
        const val NOTIFY_BEST_HAND = "settings.notify.bestHand"
        const val PENDING_KIND = "link.pendingKind"
        const val PENDING_VALUE = "link.pendingValue"
        const val REFERRER_READ = "link.referrerRead"
        const val FLAG_FACEBOOK = "flags.facebookSignIn"
        const val FLAG_CHAMPIONS = "flags.champions"
        const val FLAG_STORIES = "flags.stories"
        const val FLAG_BRACELETS = "flags.bracelets"
        const val FLAG_FRIENDS_ROOMS = "flags.friendsRooms"
        const val FLAG_ALL_IN_LIMIT = "flags.allInDailyLimit"
        const val SOUND = "settings.sound"
        const val HAPTICS = "settings.haptics"
        const val THEME = "settings.theme"
        const val DEFAULT_BET = "settings.defaultBet"
    }
}
