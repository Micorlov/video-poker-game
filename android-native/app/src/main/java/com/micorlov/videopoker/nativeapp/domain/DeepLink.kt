package com.micorlov.videopoker.nativeapp.domain

import java.net.URI
import java.net.URLDecoder

/**
 * A code arriving from outside the app: a friend's invite, a room to join, or a coin gift.
 * Parsed the way js/deeplink.js does: invite and room codes are trimmed and upper-cased,
 * gift ids are Firestore ids and keep their case.
 */
sealed interface DeepLink {
    data class Invite(val code: String) : DeepLink
    data class Room(val code: String) : DeepLink
    data class Gift(val id: String) : DeepLink

    companion object {
        /** The Play install referrer string, a query-shaped blob such as `utm_source=x&ref=AB12CD`. */
        fun fromReferrer(raw: String?): DeepLink? = fromQuery(raw?.removePrefix("?"))

        /** A `videopoker://invite?ref=CODE` or `https://…/invite.html?join=CODE` link. */
        fun fromUri(uri: String?): DeepLink? {
            if (uri.isNullOrBlank()) return null
            val query = runCatching { URI(uri.trim()).rawQuery }.getOrNull() ?: return null
            return fromQuery(query)
        }

        private fun fromQuery(query: String?): DeepLink? {
            if (query.isNullOrBlank()) return null
            val params = query.split('&').filter { it.isNotEmpty() }.associate { pair ->
                val key = pair.substringBefore('=')
                val value = pair.substringAfter('=', "")
                decode(key) to decode(value)
            }
            params["ref"]?.trim()?.takeIf { it.isNotEmpty() }?.let { return Invite(it.uppercase()) }
            params["join"]?.trim()?.takeIf { it.isNotEmpty() }?.let { return Room(it.uppercase()) }
            params["gift"]?.trim()?.takeIf { it.isNotEmpty() }?.let { return Gift(it) }
            return null
        }

        private fun decode(text: String): String = runCatching { URLDecoder.decode(text, "UTF-8") }.getOrDefault(text)
    }
}
