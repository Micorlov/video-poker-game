package com.micorlov.videopoker.nativeapp.data

/** A [KeyValueStore] backed by a map, for JVM tests that cannot touch SharedPreferences. */
class InMemoryStore : KeyValueStore {
    private val values = mutableMapOf<String, Any>()

    override fun getLong(key: String): Long? = values[key] as? Long
    override fun getInt(key: String): Int? = values[key] as? Int
    override fun getBoolean(key: String): Boolean? = values[key] as? Boolean
    override fun getString(key: String): String? = values[key] as? String

    override fun write(block: KeyValueStore.Writer.() -> Unit) {
        object : KeyValueStore.Writer {
            override fun putLong(key: String, value: Long) { values[key] = value }
            override fun putInt(key: String, value: Int) { values[key] = value }
            override fun putBoolean(key: String, value: Boolean) { values[key] = value }
            override fun putString(key: String, value: String) { values[key] = value }
        }.block()
    }
}
