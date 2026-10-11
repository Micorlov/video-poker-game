package com.micorlov.videopoker.nativeapp.domain

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class DeepLinkTest {

    @Test
    fun `an invite code is trimmed and upper-cased`() {
        assertEquals(DeepLink.Invite("AB12CD"), DeepLink.fromUri("videopoker://invite?ref=ab12cd"))
        assertEquals(DeepLink.Invite("AB12CD"), DeepLink.fromUri("https://micorlov.github.io/video-poker-game/invite.html?ref=%20ab12cd%20"))
    }

    @Test
    fun `a room code is read from join`() {
        assertEquals(DeepLink.Room("ROOM42"), DeepLink.fromUri("videopoker://invite?join=room42"))
    }

    @Test
    fun `a gift id keeps its case`() {
        assertEquals(DeepLink.Gift("aBc123xYz"), DeepLink.fromUri("videopoker://invite?gift=aBc123xYz"))
    }

    @Test
    fun `the install referrer is a bare query string`() {
        assertEquals(DeepLink.Invite("AB12CD"), DeepLink.fromReferrer("utm_source=x&ref=ab12cd"))
        assertEquals(DeepLink.Invite("AB12CD"), DeepLink.fromReferrer("?ref=ab12cd"))
        assertEquals(DeepLink.Room("ZZ99"), DeepLink.fromReferrer("join=zz99"))
    }

    @Test
    fun `an invite wins over a room and a room over a gift`() {
        assertEquals(DeepLink.Invite("A"), DeepLink.fromReferrer("join=b&ref=a&gift=c"))
        assertEquals(DeepLink.Room("B"), DeepLink.fromReferrer("gift=c&join=b"))
    }

    @Test
    fun `junk and empty input are no link at all`() {
        assertNull(DeepLink.fromUri(null))
        assertNull(DeepLink.fromUri("videopoker://open"))
        assertNull(DeepLink.fromUri("not a uri at all %%%"))
        assertNull(DeepLink.fromReferrer("utm_source=google"))
        assertNull(DeepLink.fromReferrer("ref="))
        assertNull(DeepLink.fromReferrer(""))
    }
}
