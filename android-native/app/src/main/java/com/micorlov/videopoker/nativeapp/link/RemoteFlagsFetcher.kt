package com.micorlov.videopoker.nativeapp.link

import com.micorlov.videopoker.nativeapp.domain.RemoteFlags
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.net.HttpURLConnection
import java.net.URL

/** Reads `config/features` from the project's public Firestore REST endpoint; the rules let anyone read `config`. */
object RemoteFlagsFetcher {
    private const val URL_TEMPLATE =
        "https://firestore.googleapis.com/v1/projects/video-poker-6d665/databases/(default)/documents/config/features?key=%s"

    // The Firebase web API key from js/firebase.js. It identifies the project and is public by design;
    // access is governed by the Firestore security rules, not by keeping it secret.
    private const val API_KEY = "AIzaSyB6m0Yis89jxvm06OFBqxs8P_vADjRXk0U"
    private const val TIMEOUT_MS = 8_000

    /** Null on any failure (offline, 404, bad JSON): the caller keeps what it already has. */
    suspend fun fetch(): RemoteFlags? = withContext(Dispatchers.IO) {
        runCatching {
            val connection = URL(URL_TEMPLATE.format(API_KEY)).openConnection() as HttpURLConnection
            try {
                connection.connectTimeout = TIMEOUT_MS
                connection.readTimeout = TIMEOUT_MS
                if (connection.responseCode != HttpURLConnection.HTTP_OK) return@runCatching null
                RemoteFlags.fromFirestoreJson(connection.inputStream.bufferedReader().use { it.readText() })
            } finally {
                connection.disconnect()
            }
        }.getOrNull()
    }
}
