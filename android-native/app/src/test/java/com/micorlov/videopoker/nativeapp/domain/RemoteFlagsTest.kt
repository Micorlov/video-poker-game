package com.micorlov.videopoker.nativeapp.domain

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class RemoteFlagsTest {

    @Test
    fun `reads booleans and the all in limit from Firestore's REST encoding`() {
        val flags = RemoteFlags.fromFirestoreJson(
            """{"fields":{"stories":{"booleanValue":false},"allInDailyLimit":{"integerValue":"3"},"champions":{"booleanValue":true}}}""",
        )
        assertEquals(false, flags?.stories)
        assertEquals(true, flags?.champions)
        assertEquals(3, flags?.allInDailyLimit)
        assertEquals(true, flags?.friendsRooms) // not mentioned: default
    }

    @Test
    fun `a bad limit or a wrong type falls back to the default`() {
        val flags = RemoteFlags.fromFirestoreJson(
            """{"fields":{"allInDailyLimit":{"integerValue":"-2"},"stories":{"stringValue":"no"}}}""",
        )
        assertEquals(Rules.ALL_IN_DAILY_LIMIT, flags?.allInDailyLimit)
        assertEquals(true, flags?.stories)
    }

    @Test
    fun `a double limit is accepted`() {
        assertEquals(2, RemoteFlags.fromFirestoreJson("""{"fields":{"allInDailyLimit":{"doubleValue":2.0}}}""")?.allInDailyLimit)
    }

    @Test
    fun `garbage is no flags at all`() {
        assertNull(RemoteFlags.fromFirestoreJson("not json"))
        assertNull(RemoteFlags.fromFirestoreJson("""{"error":{"code":404}}"""))
    }
}
