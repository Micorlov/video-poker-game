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
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.micorlov.videopoker.nativeapp.R
import com.micorlov.videopoker.nativeapp.ui.components.ActionButton
import com.micorlov.videopoker.nativeapp.ui.components.VpPanel
import com.micorlov.videopoker.nativeapp.ui.theme.VpColors

/** Ask for push-notification permission. Shown once, after ten completed hands. */
@OptIn(ExperimentalComposeUiApi::class)
@Composable
fun NotificationPrompt(onAllow: () -> Unit, onDismiss: () -> Unit) {
    Dialog(onDismissRequest = onDismiss) {
        VpPanel(
            Modifier.fillMaxWidth().semantics { testTagsAsResourceId = true }.testTag("notify-prompt"),
            raised = true,
        ) {
            Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
                Text("🔔", modifier = Modifier.clearAndSetSemantics { }, fontSize = 28.sp)
                Text(
                    text = stringResource(R.string.prompt_notify_title),
                    modifier = Modifier.padding(top = 8.dp),
                    color = VpColors.Text,
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    textAlign = TextAlign.Center,
                )
                Text(
                    text = stringResource(R.string.prompt_notify_body),
                    modifier = Modifier.padding(top = 6.dp, bottom = 16.dp),
                    color = VpColors.TextMuted,
                    fontSize = 14.sp,
                    textAlign = TextAlign.Center,
                )
                ActionButton(
                    text = stringResource(R.string.prompt_notify_allow),
                    icon = "🔔",
                    onClick = onAllow,
                    modifier = Modifier.fillMaxWidth().testTag("notify-allow"),
                )
                DismissLabel(onDismiss, "notify-dismiss")
            }
        }
    }
}

/**
 * Ask for a five-star Play Store rating. [storeUrl] is the listing link, shown in the dialog
 * and opened by both the link and the rate button.
 */
@OptIn(ExperimentalComposeUiApi::class)
@Composable
fun RatingPrompt(storeUrl: String, onRate: () -> Unit, onDismiss: () -> Unit) {
    Dialog(onDismissRequest = onDismiss) {
        VpPanel(
            Modifier.fillMaxWidth().semantics { testTagsAsResourceId = true }.testTag("rating-prompt"),
            raised = true,
        ) {
            Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    "★★★★★",
                    modifier = Modifier.testTag("rating-stars"),
                    color = VpColors.Gold,
                    fontSize = 28.sp,
                )
                Text(
                    text = stringResource(R.string.prompt_rate_title),
                    modifier = Modifier.padding(top = 8.dp),
                    color = VpColors.Text,
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    textAlign = TextAlign.Center,
                )
                Text(
                    text = stringResource(R.string.prompt_rate_body),
                    modifier = Modifier.padding(top = 6.dp),
                    color = VpColors.TextMuted,
                    fontSize = 14.sp,
                    textAlign = TextAlign.Center,
                )
                Text(
                    text = storeUrl,
                    modifier = Modifier
                        .padding(top = 10.dp, bottom = 16.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .clickable(role = Role.Button, onClick = onRate)
                        .padding(horizontal = 4.dp, vertical = 4.dp)
                        .testTag("rating-store-link"),
                    color = VpColors.Gold,
                    fontSize = 13.sp,
                    textAlign = TextAlign.Center,
                    textDecoration = TextDecoration.Underline,
                )
                ActionButton(
                    text = stringResource(R.string.prompt_rate_action),
                    icon = "★",
                    onClick = onRate,
                    modifier = Modifier.fillMaxWidth().testTag("rating-rate"),
                )
                DismissLabel(onDismiss, "rating-dismiss")
            }
        }
    }
}

@Composable
private fun DismissLabel(onDismiss: () -> Unit, tag: String) {
    Text(
        text = stringResource(R.string.sheet_not_now),
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 8.dp)
            .clip(RoundedCornerShape(12.dp))
            .clickable(role = Role.Button, onClick = onDismiss)
            .padding(12.dp)
            .testTag(tag),
        color = VpColors.TextMuted,
        fontSize = 14.sp,
        textAlign = TextAlign.Center,
    )
}
