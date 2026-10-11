package com.micorlov.videopoker.nativeapp

import androidx.test.ext.junit.runners.AndroidJUnit4
import com.micorlov.videopoker.nativeapp.link.RemoteFlagsFetcher
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

/** Talks to the real public `config/features` document: needs the phone online. */
@RunWith(AndroidJUnit4::class)
class RemoteFlagsFetchTest {

    @Test
    fun theLiveFlagsDocumentIsReadable() {
        val flags = runBlocking { RemoteFlagsFetcher.fetch() }
        assertNotNull("config/features should be readable without signing in (and the phone online)", flags)
        assertTrue(flags!!.allInDailyLimit >= 1)
    }
}
