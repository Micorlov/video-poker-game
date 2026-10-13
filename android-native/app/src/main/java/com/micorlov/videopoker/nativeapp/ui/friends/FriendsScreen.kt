package com.micorlov.videopoker.nativeapp.ui.friends

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.micorlov.videopoker.nativeapp.R
import com.micorlov.videopoker.nativeapp.ui.components.ActionButton
import com.micorlov.videopoker.nativeapp.ui.components.Eyebrow
import com.micorlov.videopoker.nativeapp.ui.components.VpPanel
import com.micorlov.videopoker.nativeapp.ui.theme.VpColors

class FriendsActions(
    val onInvite: () -> Unit,
    val onSignIn: () -> Unit,
    val onAddByCode: (String) -> Unit,
)

/**
 * The Friends tab. The invite card always comes first, so how and where to invite is never
 * more than one tap away; below it is either the sign-in prompt or today's table.
 */
@Composable
fun FriendsScreen(state: FriendsUiState, actions: FriendsActions, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 16.dp, vertical = 8.dp)
            .testTag("friends-screen"),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text(
            text = stringResource(R.string.nav_friends),
            color = VpColors.Text,
            fontSize = 24.sp,
            fontWeight = FontWeight.Bold,
        )
        InviteCard(state.code, actions.onInvite)
        when (state.auth) {
            FriendsAuth.UNAVAILABLE -> Note(stringResource(R.string.friends_unavailable), "friends-unavailable")
            FriendsAuth.SIGNED_OUT, FriendsAuth.SIGNING_IN -> SignInPanel(state, actions.onSignIn)
            FriendsAuth.SIGNED_IN -> {
                TodayTable(state)
                AddByCodePanel(actions.onAddByCode)
            }
        }
    }
}

@Composable
private fun SignInPanel(state: FriendsUiState, onSignIn: () -> Unit) {
    VpPanel(Modifier.fillMaxWidth().testTag("friends-sign-in-panel")) {
        val note = if (state.pendingInvite) R.string.friends_sign_in_to_join else R.string.friends_sign_in_note
        Text(
            text = stringResource(note),
            modifier = Modifier.padding(bottom = 12.dp),
            color = if (state.pendingInvite) VpColors.Gold else VpColors.TextMuted,
            fontSize = 15.sp,
            fontWeight = if (state.pendingInvite) FontWeight.Bold else FontWeight.Normal,
        )
        val signingIn = state.auth == FriendsAuth.SIGNING_IN
        ActionButton(
            text = stringResource(if (signingIn) R.string.friends_signing_in else R.string.friends_sign_in),
            icon = "G",
            onClick = onSignIn,
            enabled = !signingIn,
            modifier = Modifier.fillMaxWidth().testTag("friends-sign-in"),
        )
    }
}

@Composable
private fun TodayTable(state: FriendsUiState) {
    VpPanel(Modifier.fillMaxWidth().testTag("friends-table")) {
        Row(Modifier.padding(bottom = 8.dp), verticalAlignment = Alignment.CenterVertically) {
            Eyebrow(stringResource(R.string.friends_today_title), Modifier.weight(1f))
            Text(
                text = stringResource(R.string.friends_resets_in, state.resetIn.hours, state.resetIn.minutes),
                modifier = Modifier.testTag("friends-reset-in"),
                color = VpColors.TextFaint,
                fontSize = 12.sp,
            )
        }
        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
            state.rows.forEach { FriendRow(it) }
        }
        if (state.rows.size <= 1) {
            Text(
                text = stringResource(R.string.friends_empty),
                modifier = Modifier.padding(top = 8.dp).testTag("friends-empty"),
                color = VpColors.TextMuted,
                fontSize = 14.sp,
            )
        }
        Text(
            text = stringResource(R.string.friends_rewards_progress, state.rewardsEarned, state.rewardsCap),
            modifier = Modifier.padding(top = 10.dp).testTag("friends-rewards"),
            color = VpColors.TextFaint,
            fontSize = 12.sp,
        )
    }
}

@Composable
private fun Note(text: String, tag: String) {
    VpPanel(Modifier.fillMaxWidth().testTag(tag)) {
        Text(text, color = VpColors.TextMuted, fontSize = 15.sp)
    }
}
