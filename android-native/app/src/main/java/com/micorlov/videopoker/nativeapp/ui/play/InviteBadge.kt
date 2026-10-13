package com.micorlov.videopoker.nativeapp.ui.play

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.micorlov.videopoker.nativeapp.R
import com.micorlov.videopoker.nativeapp.domain.social.RewardPolicy
import com.micorlov.videopoker.nativeapp.ui.text.formatNumber
import com.micorlov.videopoker.nativeapp.ui.theme.VpColors

/** A small always-visible pill on the table that leads to the Friends tab. */
@Composable
fun InviteBadge(onClick: () -> Unit, modifier: Modifier = Modifier) {
    val shape = RoundedCornerShape(14.dp)
    Text(
        text = "✉ " + stringResource(R.string.play_invite_badge, formatNumber(RewardPolicy.INVITEE_REWARD)),
        modifier = modifier
            .clip(shape)
            .background(VpColors.Gold.copy(alpha = 0.16f))
            .border(1.dp, VpColors.Gold.copy(alpha = 0.55f), shape)
            .clickable(role = Role.Button, onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 6.dp)
            .testTag("invite-badge"),
        color = VpColors.Gold,
        fontSize = 13.sp,
        fontWeight = FontWeight.SemiBold,
        maxLines = 1,
    )
}
