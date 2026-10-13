package com.micorlov.videopoker.nativeapp.ui.friends

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import com.micorlov.videopoker.nativeapp.R
import com.micorlov.videopoker.nativeapp.domain.social.ReferralCode
import com.micorlov.videopoker.nativeapp.domain.social.RewardPolicy
import com.micorlov.videopoker.nativeapp.ui.components.ActionButton
import com.micorlov.videopoker.nativeapp.ui.components.ChipButton
import com.micorlov.videopoker.nativeapp.ui.components.Eyebrow
import com.micorlov.videopoker.nativeapp.ui.components.VpPanel
import com.micorlov.videopoker.nativeapp.ui.text.formatNumber
import com.micorlov.videopoker.nativeapp.ui.theme.LocalPalette
import com.micorlov.videopoker.nativeapp.ui.theme.VpColors

/** Always at the top of the Friends tab, signed in or not: how inviting works and the button that does it. */
@Composable
fun InviteCard(code: String?, onInvite: () -> Unit, modifier: Modifier = Modifier) {
    VpPanel(modifier.fillMaxWidth().testTag("invite-card"), raised = true) {
        Text(
            text = stringResource(R.string.friends_invite_title),
            color = VpColors.Text,
            fontSize = 19.sp,
            fontWeight = FontWeight.Bold,
        )
        Column(Modifier.padding(vertical = 12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Step(1, stringResource(R.string.friends_how_1))
            Step(2, stringResource(R.string.friends_how_2))
            Step(3, stringResource(R.string.friends_how_3, formatNumber(RewardPolicy.INVITEE_REWARD)))
        }
        ActionButton(
            text = stringResource(R.string.friends_invite_button),
            icon = "✉",
            onClick = onInvite,
            modifier = Modifier.fillMaxWidth().testTag("invite-button"),
        )
        if (code != null) {
            Row(Modifier.padding(top = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                Eyebrow(stringResource(R.string.friends_your_code), Modifier.weight(1f))
                Text(
                    text = code,
                    modifier = Modifier.testTag("my-code"),
                    color = VpColors.Gold,
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    fontFamily = FontFamily.Monospace,
                    letterSpacing = 0.15.em,
                )
            }
        }
    }
}

@Composable
private fun Step(number: Int, text: String) {
    val palette = LocalPalette.current
    Row(verticalAlignment = Alignment.CenterVertically) {
        Box(
            Modifier.size(24.dp).background(palette.action.copy(alpha = 0.22f), CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            Text(number.toString(), color = palette.action, fontSize = 13.sp, fontWeight = FontWeight.Bold)
        }
        Text(text, modifier = Modifier.padding(start = 10.dp), color = VpColors.TextMuted, fontSize = 14.sp)
    }
}

/** For a friend who already has the game: type their code instead of tapping a link. */
@Composable
fun AddByCodePanel(onAdd: (String) -> Unit, modifier: Modifier = Modifier) {
    var text by rememberSaveable { mutableStateOf("") }
    val submit = {
        onAdd(text)
        if (ReferralCode.normalize(text) != null) text = ""
    }
    VpPanel(modifier.fillMaxWidth()) {
        Eyebrow(stringResource(R.string.friends_add_title), Modifier.padding(bottom = 10.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(
                Modifier
                    .weight(1f)
                    .border(1.dp, VpColors.Border, RoundedCornerShape(14.dp))
                    .background(VpColors.Surface, RoundedCornerShape(14.dp))
                    .padding(horizontal = 14.dp, vertical = 13.dp),
            ) {
                if (text.isEmpty()) Text(stringResource(R.string.friends_code_placeholder), color = VpColors.TextFaint, fontSize = 16.sp)
                BasicTextField(
                    value = text,
                    onValueChange = { text = it.uppercase().take(ReferralCode.LENGTH) },
                    modifier = Modifier.fillMaxWidth().testTag("friend-code-input"),
                    singleLine = true,
                    textStyle = TextStyle(color = VpColors.Text, fontSize = 16.sp, fontFamily = FontFamily.Monospace),
                    cursorBrush = SolidColor(VpColors.Text),
                    keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Characters, imeAction = ImeAction.Done),
                    keyboardActions = KeyboardActions(onDone = { submit() }),
                )
            }
            ChipButton(
                label = stringResource(R.string.friends_add),
                selected = true,
                onClick = submit,
                modifier = Modifier.testTag("friend-code-add"),
            )
        }
    }
}
