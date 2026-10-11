package com.micorlov.videopoker.nativeapp

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.micorlov.videopoker.nativeapp.data.GameRepository
import com.micorlov.videopoker.nativeapp.data.SharedPreferencesStore
import com.micorlov.videopoker.nativeapp.domain.DeepLink
import com.micorlov.videopoker.nativeapp.link.LinkIntake
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class LinkIntakeTest {

    private val context = ApplicationProvider.getApplicationContext<Context>()
    private val repository = GameRepository(
        SharedPreferencesStore(context.getSharedPreferences("links_${System.nanoTime()}", Context.MODE_PRIVATE)),
    )

    private fun view(uri: String) = Intent(Intent.ACTION_VIEW, Uri.parse(uri))

    @Test
    fun aTappedInviteLinkIsParkedUntilSomethingCanUseIt() {
        val intake = LinkIntake(repository)
        assertEquals(DeepLink.Invite("AB12CD"), intake.onIntent(view("videopoker://invite?ref=ab12cd")))
        assertEquals(DeepLink.Invite("AB12CD"), repository.loadPendingLink())
    }

    @Test
    fun aRoomLinkReplacesTheParkedInviteAndClearingEmptiesIt() {
        val intake = LinkIntake(repository)
        intake.onIntent(view("videopoker://invite?ref=ab12cd"))
        intake.onIntent(view("videopoker://invite?join=room42"))
        assertEquals(DeepLink.Room("ROOM42"), repository.loadPendingLink())

        repository.clearPendingLink()
        assertNull(repository.loadPendingLink())
    }

    @Test
    fun anOrdinaryLaunchParksNothing() {
        assertNull(LinkIntake(repository).onIntent(Intent(Intent.ACTION_MAIN)))
        assertNull(repository.loadPendingLink())
    }
}
