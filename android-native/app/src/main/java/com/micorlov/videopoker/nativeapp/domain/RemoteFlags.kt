package com.micorlov.videopoker.nativeapp.domain

import org.json.JSONObject

/**
 * Admin-controlled switches from the `config/features` Firestore document (DEFAULT_FEATURES in js/firebase.js).
 * Anything missing or malformed falls back to the default, so a bad document can never lock a feature off.
 */
data class RemoteFlags(
    val facebookSignIn: Boolean = true,
    val champions: Boolean = true,
    val stories: Boolean = true,
    val bracelets: Boolean = true,
    val friendsRooms: Boolean = true,
    val allInDailyLimit: Int = Rules.ALL_IN_DAILY_LIMIT,
) {
    companion object {
        /** Reads Firestore's REST encoding: `{"fields": {"stories": {"booleanValue": false}, ...}}`. */
        fun fromFirestoreJson(json: String): RemoteFlags? {
            val fields = runCatching { JSONObject(json).optJSONObject("fields") }.getOrNull() ?: return null
            val defaults = RemoteFlags()
            fun flag(name: String, fallback: Boolean) =
                fields.optJSONObject(name)?.takeIf { it.has("booleanValue") }?.optBoolean("booleanValue", fallback) ?: fallback
            val limit = fields.optJSONObject("allInDailyLimit")?.let {
                it.optString("integerValue").toIntOrNull() ?: it.optDouble("doubleValue", Double.NaN).takeIf { d -> !d.isNaN() }?.toInt()
            }?.takeIf { it > 0 }
            return RemoteFlags(
                facebookSignIn = flag("facebookSignIn", defaults.facebookSignIn),
                champions = flag("champions", defaults.champions),
                stories = flag("stories", defaults.stories),
                bracelets = flag("bracelets", defaults.bracelets),
                friendsRooms = flag("friendsRooms", defaults.friendsRooms),
                allInDailyLimit = limit ?: defaults.allInDailyLimit,
            )
        }
    }
}
