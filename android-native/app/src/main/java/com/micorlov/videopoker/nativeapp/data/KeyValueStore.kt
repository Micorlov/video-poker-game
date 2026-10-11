package com.micorlov.videopoker.nativeapp.data

/**
 * The little persistence surface the game needs. Reads return null for a missing key or
 * a value of the wrong type, so callers decide the fallback; [write] applies a batch of
 * puts together.
 */
interface KeyValueStore {
    fun getLong(key: String): Long?
    fun getInt(key: String): Int?
    fun getBoolean(key: String): Boolean?
    fun getString(key: String): String?

    fun write(block: Writer.() -> Unit)

    interface Writer {
        fun putLong(key: String, value: Long)
        fun putInt(key: String, value: Int)
        fun putBoolean(key: String, value: Boolean)
        fun putString(key: String, value: String)
    }
}
