package com.micorlov.videopoker.nativeapp.ui.friends

import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.micorlov.videopoker.nativeapp.data.social.ActivityHost
import com.micorlov.videopoker.nativeapp.ui.GameViewModel

/** The Friends tab bound to its view model; the Activity is what shows Google's account picker. */
@Composable
fun FriendsTab(friends: FriendsViewModel) {
    val state by friends.state.collectAsStateWithLifecycle()
    val context = LocalContext.current
    val actions = remember(friends, context) {
        val host = ActivityHost(context.findActivity())
        FriendsActions(
            onInvite = { friends.onInvite(host) },
            onSignIn = { friends.onSignIn(host) },
            onAddByCode = friends::onAddByCode,
        )
    }
    FriendsScreen(state, actions)
}

/** Shares invites and passes the Friends messages to the shared toast, whichever tab is showing. */
@Composable
fun FriendsEffects(friends: FriendsViewModel, game: GameViewModel) {
    val context = LocalContext.current
    LaunchedEffect(friends) {
        for (effect in friends.effects) {
            when (effect) {
                is FriendsEffect.Share -> ShareInvite.open(context, effect.code)
                is FriendsEffect.Toast -> game.onExternalToast(effect.message)
            }
        }
    }
}

/**
 * A player who arrived through a friend's link and is not signed in is taken to the Friends tab
 * once, after the first-run walkthrough, where "Sign in to connect with your friend" waits.
 */
@Composable
fun PendingInviteRedirect(friends: FriendsViewModel?, onboarding: Boolean, enabled: Boolean, open: () -> Unit) {
    if (friends == null || !enabled) return
    val state by friends.state.collectAsStateWithLifecycle()
    var redirected by rememberSaveable { mutableStateOf(false) }
    val waiting = state.pendingInvite && state.auth == FriendsAuth.SIGNED_OUT
    LaunchedEffect(onboarding, waiting) {
        if (!onboarding && waiting && !redirected) {
            redirected = true
            open()
        }
    }
}

private tailrec fun Context.findActivity(): Activity = when (this) {
    is Activity -> this
    is ContextWrapper -> baseContext.findActivity()
    else -> error("Friends needs an Activity context")
}
