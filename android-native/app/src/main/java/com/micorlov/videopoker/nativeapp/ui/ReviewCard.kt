package com.micorlov.videopoker.nativeapp.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.ExperimentalComposeUiApi
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.testTagsAsResourceId
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.micorlov.videopoker.nativeapp.R
import com.micorlov.videopoker.nativeapp.ui.components.ActionButton
import com.micorlov.videopoker.nativeapp.ui.components.VpPanel
import com.micorlov.videopoker.nativeapp.ui.theme.VpColors

/**
 * The "Enjoying Video Poker?" card. Per Play policy its copy never names a star count, and
 * nothing here questions the player before the native sheet.
 */
@OptIn(ExperimentalComposeUiApi::class)
@Composable
fun ReviewCard(onRate: () -> Unit, onDismiss: () -> Unit) {
    Dialog(onDismissRequest = onDismiss) {
        VpPanel(Modifier.fillMaxWidth().semantics { testTagsAsResourceId = true }.testTag("review-card"), raised = true) {
            Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
                Text("★★★★★", modifier = Modifier.clearAndSetSemantics { }, color = VpColors.Gold, fontSize = 28.sp)
                Text(
                    text = stringResource(R.string.review_title),
                    modifier = Modifier.padding(top = 8.dp),
                    color = VpColors.Text,
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    textAlign = TextAlign.Center,
                )
                Text(
                    text = stringResource(R.string.review_body),
                    modifier = Modifier.padding(top = 6.dp, bottom = 16.dp),
                    color = VpColors.TextMuted,
                    fontSize = 14.sp,
                    textAlign = TextAlign.Center,
                )
                ActionButton(
                    text = stringResource(R.string.review_rate),
                    icon = "★",
                    onClick = onRate,
                    modifier = Modifier.fillMaxWidth().testTag("review-rate"),
                )
                Text(
                    text = stringResource(R.string.sheet_not_now),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 8.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .clickable(role = Role.Button, onClick = onDismiss)
                        .padding(12.dp)
                        .testTag("review-dismiss"),
                    color = VpColors.TextMuted,
                    fontSize = 14.sp,
                    textAlign = TextAlign.Center,
                )
            }
        }
    }
}
