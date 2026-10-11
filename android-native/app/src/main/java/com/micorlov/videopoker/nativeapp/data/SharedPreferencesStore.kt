package com.micorlov.videopoker.nativeapp.data

import android.content.Context
import android.content.SharedPreferences

class SharedPreferencesStore(private val preferences: SharedPreferences) : KeyValueStore {

    constructor(context: Context) : this(context.getSharedPreferences(FILE_NAME, Context.MODE_PRIVATE))

    // SharedPreferences throws ClassCastException when a key holds another type; a
    // corrupted or older value should read as "missing", not crash the app on launch.
    private inline fun <T> read(key: String, get: SharedPreferences.() -> T): T? =
        if (!preferences.contains(key)) null else runCatching { preferences.get() }.getOrNull()

    override fun getLong(key: String): Long? = read(key) { getLong(key, 0L) }
    override fun getInt(key: String): Int? = read(key) { getInt(key, 0) }
    override fun getBoolean(key: String): Boolean? = read(key) { getBoolean(key, false) }
    override fun getString(key: String): String? = read(key) { getString(key, null) }

    override fun write(block: KeyValueStore.Writer.() -> Unit) {
        val editor = preferences.edit()
        object : KeyValueStore.Writer {
            override fun putLong(key: String, value: Long) { editor.putLong(key, value) }
            override fun putInt(key: String, value: Int) { editor.putInt(key, value) }
            override fun putBoolean(key: String, value: Boolean) { editor.putBoolean(key, value) }
            override fun putString(key: String, value: String) { editor.putString(key, value) }
        }.block()
        editor.apply()
    }

    private companion object {
        const val FILE_NAME = "video_poker_native"
    }
}
