package com.micorlov.videopoker.nativeapp.data

/**
 * The guest install the admin panel already lists. The web build writes
 * `installs/{id}_open` from js/installs.js; a native launch, including guest
 * mode, has to write the same document or the panel never hears about it.
 *
 * The id and the launch count live on the device. `opens` is an absolute
 * count, not an increment, matching the web: a launch that could not be sent
 * is folded into the next one.
 */
data class InstallState(
    val id: String,
    val opens: Int,
    val openSent: Boolean,
)

/** The fields firestore.rules accepts on an install document, already clamped. */
data class InstallDevice(
    val version: String,
    val platform: String,
    val androidSdk: Int,
    val chrome: Int,
    val lang: String,
    val country: String,
    val source: String,
) {
    fun clamped(): InstallDevice = InstallDevice(
        version = version.take(VERSION_MAX),
        platform = platform.take(PLATFORM_MAX).ifEmpty { "android" },
        androidSdk = androidSdk.coerceIn(0, ANDROID_MAX),
        chrome = chrome.coerceIn(0, CHROME_MAX),
        lang = lang.take(LANG_MAX),
        country = country.take(COUNTRY_MAX),
        source = source.take(SOURCE_MAX),
    )

    private companion object {
        const val VERSION_MAX = 20
        const val PLATFORM_MAX = 10
        const val ANDROID_MAX = 1000
        const val CHROME_MAX = 10000
        const val LANG_MAX = 16
        const val COUNTRY_MAX = 8
        const val SOURCE_MAX = 40
    }
}

object InstallIdentity {
    const val ID_LENGTH = 20
    private const val ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"

    fun randomId(nextInt: (Int) -> Int = { java.util.concurrent.ThreadLocalRandom.current().nextInt(it) }): String =
        buildString(ID_LENGTH) { repeat(ID_LENGTH) { append(ALPHABET[nextInt(ALPHABET.length)]) } }

    fun isValid(id: String): Boolean = id.length == ID_LENGTH && id.all { it in ALPHABET }
}

/**
 * Remembers this install and moves its launch count forward once per call.
 * A stored id that is not 20 letters or digits is discarded: the rules would
 * refuse the document, and the panel would still show nobody.
 */
class InstallTracker(private val store: KeyValueStore) {

    fun beginLaunch(newId: () -> String = { InstallIdentity.randomId() }): InstallState {
        val storedId = store.getString(KEY_ID)?.takeIf { InstallIdentity.isValid(it) }
        val id = storedId ?: newId()
        val opens = ((store.getInt(KEY_OPENS) ?: 0) + 1).coerceAtMost(MAX_OPENS)
        val openSent = storedId != null && store.getBoolean(KEY_SENT) == true && opens > 1
        store.write {
            putString(KEY_ID, id)
            putInt(KEY_OPENS, opens)
            putBoolean(KEY_SENT, openSent)
        }
        return InstallState(id, opens, openSent)
    }

    fun markOpenSent() {
        store.write { putBoolean(KEY_SENT, true) }
    }

    fun id(): String? = store.getString(KEY_ID)?.takeIf { InstallIdentity.isValid(it) }

    fun isOpenSent(): Boolean = id() != null && store.getBoolean(KEY_SENT) == true

    private companion object {
        const val KEY_ID = "install_id"
        const val KEY_OPENS = "install_opens"
        const val KEY_SENT = "install_open_sent"
        const val MAX_OPENS = 100_000
    }
}

/**
 * Foreground time waiting to be written to `installs/{id}_open.playMs`.
 * The web build drops a session shorter than 10 seconds and files the rest
 * on the day's score. A guest has no score document, so this keeps the same
 * 10-second floor and an absolute total the rules will only let grow.
 */
class PlayTimeLedger(private val store: KeyValueStore) {

    /** Returns the total to send, or null when this span is too short to count. */
    fun accrue(elapsedMs: Long): Long? {
        if (elapsedMs < MIN_SESSION_MS) return null
        val pending = ((store.getLong(PENDING) ?: 0L) + elapsedMs).coerceAtMost(CAP)
        store.write { putLong(PENDING, pending) }
        return pendingTotal()
    }

    fun pendingTotal(): Long? {
        val pending = store.getLong(PENDING) ?: 0L
        if (pending <= 0L) return null
        val reported = store.getLong(REPORTED) ?: 0L
        return reported + pending.coerceAtMost(MAX_WRITE_MS)
    }

    fun acknowledge(sentTotal: Long) {
        val reported = store.getLong(REPORTED) ?: 0L
        val pending = store.getLong(PENDING) ?: 0L
        val accepted = (sentTotal - reported).coerceIn(0L, pending)
        store.write {
            putLong(REPORTED, reported + accepted)
            putLong(PENDING, pending - accepted)
        }
    }

    private companion object {
        const val MIN_SESSION_MS = 10_000L
        const val MAX_WRITE_MS = 12L * 60 * 60 * 1000
        const val CAP = 10L * 365 * 24 * 60 * 60 * 1000
        const val PENDING = "install_play_pending"
        const val REPORTED = "install_play_reported"
    }
}
