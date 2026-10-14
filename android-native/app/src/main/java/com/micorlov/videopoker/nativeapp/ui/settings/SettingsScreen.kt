package com.micorlov.videopoker.nativeapp.ui.settings

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.micorlov.videopoker.nativeapp.R
import android.app.Activity
import com.micorlov.videopoker.nativeapp.data.AppTheme
import com.micorlov.videopoker.nativeapp.data.GameSpeed
import com.micorlov.videopoker.nativeapp.domain.AppLanguage
import com.micorlov.videopoker.nativeapp.ui.LocaleContext
import com.micorlov.videopoker.nativeapp.domain.Rules
import com.micorlov.videopoker.nativeapp.domain.Variant
import com.micorlov.videopoker.nativeapp.ui.PolicyLinks
import com.micorlov.videopoker.nativeapp.ui.StoreLinks
import com.micorlov.videopoker.nativeapp.ui.UiState
import com.micorlov.videopoker.nativeapp.ui.components.ChipButton
import com.micorlov.videopoker.nativeapp.ui.components.Eyebrow
import com.micorlov.videopoker.nativeapp.ui.components.VpPanel
import com.micorlov.videopoker.nativeapp.ui.play.PaytableList
import com.micorlov.videopoker.nativeapp.ui.text.labelRes
import com.micorlov.videopoker.nativeapp.ui.theme.LocalPalette
import com.micorlov.videopoker.nativeapp.ui.theme.VpColors

class SettingsActions(
    val onToggleSound: () -> Unit,
    val onToggleHaptics: () -> Unit,
    val onToggleFeedback: () -> Unit,
    val onToggleDoubleUp: () -> Unit,
    val onSelectSpeed: (GameSpeed) -> Unit,
    val onToggleVoice: () -> Unit,
    val onEnableNotifications: () -> Unit,
    val onToggleNotifySocial: () -> Unit,
    val onToggleNotifyLeaderboard: () -> Unit,
    val onToggleDailyReminder: () -> Unit,
    val onToggleNotifyBestHand: () -> Unit,
    val onSelectLanguage: (AppLanguage) -> Unit,
    val onSelectTheme: (AppTheme) -> Unit,
    val onSelectDefaultBet: (Int) -> Unit,
    val onSelectVariant: (Variant) -> Unit,
    val onSelectHandCount: (Int) -> Unit,
    val onResetStatistics: () -> Unit,
    /** Opens the Friends tab; null hides the row (friends switched off). */
    val onInviteFriends: (() -> Unit)? = null,
)

/**
 * The Account section. [signedIn] decides what the row does: delete the account here, or send a
 * player who is not signed in on this device to the web page where deletion can be requested.
 */
class AccountSettings(
    val signedIn: Boolean,
    val deleting: Boolean,
    val onDelete: () -> Unit,
)

@Composable
fun SettingsScreen(ui: UiState, actions: SettingsActions, modifier: Modifier = Modifier, account: AccountSettings? = null) {
    val settings = ui.settings
    val game = ui.game
    var confirmingReset by rememberSaveable { mutableStateOf(false) }
    var confirmingDelete by rememberSaveable { mutableStateOf(false) }
    var showPaytable by rememberSaveable { mutableStateOf(false) }
    var choosingLanguage by rememberSaveable { mutableStateOf(false) }
    val activity = LocalContext.current as? Activity

    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 16.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text(
            text = stringResource(R.string.settings_title),
            color = VpColors.Text,
            fontSize = 24.sp,
            fontWeight = FontWeight.Bold,
        )

        actions.onInviteFriends?.let { invite ->
            Section(R.string.nav_friends) {
                LinkRow("✉ " + stringResource(R.string.settings_invite_friends), "invite-friends-row", invite)
            }
        }

        Section(R.string.settings_gameplay) {
            SettingToggle(stringResource(R.string.settings_sound), settings.soundEnabled, actions.onToggleSound, "toggle-sound")
            SettingToggle(stringResource(R.string.settings_haptics), settings.hapticsEnabled, actions.onToggleHaptics, "toggle-haptics")
            SettingToggle(stringResource(R.string.settings_voice), settings.voiceEnabled, actions.onToggleVoice, "toggle-voice")
            SettingToggle(stringResource(R.string.settings_feedback), settings.feedbackEnabled, actions.onToggleFeedback, "toggle-feedback")
            SettingToggle(stringResource(R.string.settings_double_up), settings.doubleUpEnabled, actions.onToggleDoubleUp, "toggle-double-up")
        }

        Section(R.string.settings_speed) {
            ChipRow {
                GameSpeed.entries.forEach { speed ->
                    ChipButton(
                        label = stringResource(speed.labelRes()),
                        selected = settings.gameSpeed == speed,
                        onClick = { actions.onSelectSpeed(speed) },
                        modifier = Modifier.weight(1f).testTag("speed-${speed.storageKey}"),
                    )
                }
            }
        }

        Section(R.string.settings_language) {
            LinkRow(LocaleContext.current(LocalContext.current).nativeName, "language-row") { choosingLanguage = true }
        }

        Section(R.string.settings_theme) {
            ChipRow {
                AppTheme.entries.forEach { theme ->
                    ChipButton(
                        label = stringResource(theme.labelRes()),
                        selected = settings.theme == theme,
                        onClick = { actions.onSelectTheme(theme) },
                        modifier = Modifier.weight(1f).testTag("theme-${theme.storageKey}"),
                    )
                }
            }
        }

        Section(R.string.settings_default_bet) {
            ChipRow {
                Rules.BET_OPTIONS.forEach { amount ->
                    ChipButton(
                        label = amount.toString(),
                        selected = settings.defaultBet == amount,
                        onClick = { actions.onSelectDefaultBet(amount) },
                        modifier = Modifier.weight(1f).testTag("default-bet-$amount"),
                    )
                }
            }
        }

        Section(R.string.settings_variant) {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Variant.entries.forEach { variant ->
                    val locked = game.level < variant.minLevel
                    val lockNote = if (locked) " · " + stringResource(R.string.settings_locked_at, variant.minLevel) else ""
                    ChipButton(
                        label = stringResource(variant.labelRes()) + lockNote,
                        selected = game.variant == variant,
                        onClick = { actions.onSelectVariant(variant) },
                        locked = locked,
                        modifier = Modifier.fillMaxWidth().testTag("variant-${variant.storageKey}"),
                    )
                }
            }
        }

        Section(R.string.settings_hands) {
            ChipRow {
                Rules.HAND_COUNT_OPTIONS.forEach { count ->
                    ChipButton(
                        label = stringResource(handCountLabel(count)),
                        selected = game.handCount == count,
                        onClick = { actions.onSelectHandCount(count) },
                        locked = count > 1 && game.level < Rules.MULTI_HAND_MIN_LEVEL,
                        modifier = Modifier.weight(1f).testTag("hands-$count"),
                    )
                }
            }
        }

        VpPanel(Modifier.fillMaxWidth()) {
            Row(
                Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .clickable(role = Role.Button) { showPaytable = !showPaytable }
                    .testTag("settings-paytable-toggle"),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Eyebrow(stringResource(R.string.settings_paytable), Modifier.weight(1f))
                Text(
                    text = if (showPaytable) "▴" else "▾",
                    modifier = Modifier.clearAndSetSemantics { },
                    color = VpColors.TextMuted,
                    fontSize = 16.sp,
                )
            }
            if (showPaytable) PaytableList(game, highlight = null, modifier = Modifier.padding(top = 8.dp))
        }

        val context = LocalContext.current
        Section(R.string.settings_notifications) {
            SettingToggle(stringResource(R.string.settings_friend_activity), settings.notifySocial, actions.onToggleNotifySocial, "toggle-notify-social")
            SettingToggle(stringResource(R.string.settings_leaderboard_updates), settings.notifyLeaderboard, actions.onToggleNotifyLeaderboard, "toggle-notify-leaderboard")
            SettingToggle(stringResource(R.string.settings_daily_bonus_reminder), settings.dailyReminderEnabled, actions.onToggleDailyReminder, "toggle-notify-daily")
            SettingToggle(stringResource(R.string.settings_friends_best_hands), settings.notifyBestHand, actions.onToggleNotifyBestHand, "toggle-notify-besthand")
            LinkRow(stringResource(R.string.settings_enable_notifications), "enable-notifications", actions.onEnableNotifications)
        }

        Section(R.string.settings_about) {
            LinkRow(stringResource(R.string.settings_rate_game), "rate-game") { StoreLinks.openListing(context) }
            LinkRow(stringResource(R.string.settings_more_games), "more-games") { StoreLinks.openDeveloperPage(context) }
            LinkRow(stringResource(R.string.settings_privacy_policy), "privacy-policy") { PolicyLinks.open(context, PolicyLinks.PRIVACY_POLICY) }
        }

        account?.let {
            Section(R.string.settings_account) {
                LinkRow(stringResource(R.string.settings_delete_account), "delete-account") {
                    if (it.signedIn) confirmingDelete = true else PolicyLinks.open(context, PolicyLinks.DELETE_ACCOUNT)
                }
            }
        }

        Text(
            text = stringResource(R.string.settings_reset),
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(16.dp))
                .clickable { confirmingReset = true }
                .padding(vertical = 14.dp)
                .testTag("reset-stats"),
            color = VpColors.Negative,
            fontSize = 15.sp,
            fontWeight = FontWeight.SemiBold,
            textAlign = TextAlign.Center,
        )

        Text(
            text = stringResource(R.string.settings_footer, rememberVersionName()),
            modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
            color = VpColors.TextFaint,
            fontSize = 12.sp,
            textAlign = TextAlign.Center,
        )
    }

    if (choosingLanguage) {
        LanguageDialog(
            current = LocaleContext.current(LocalContext.current),
            onPick = { language ->
                choosingLanguage = false
                actions.onSelectLanguage(language)
                // The activity restarts so every string, number format and layout direction is rebuilt.
                activity?.recreate()
            },
            onDismiss = { choosingLanguage = false },
        )
    }

    if (confirmingDelete && account != null) {
        AlertDialog(
            onDismissRequest = { confirmingDelete = false },
            title = { Text(stringResource(R.string.settings_delete_title)) },
            text = { Text(stringResource(R.string.settings_delete_body)) },
            confirmButton = {
                TextButton(
                    onClick = {
                        confirmingDelete = false
                        account.onDelete()
                    },
                    enabled = !account.deleting,
                    modifier = Modifier.testTag("delete-account-confirm"),
                ) { Text(stringResource(R.string.settings_delete_confirm), color = VpColors.Red) }
            },
            dismissButton = {
                TextButton(onClick = { confirmingDelete = false }) { Text(stringResource(R.string.settings_cancel)) }
            },
        )
    }

    if (confirmingReset) {
        AlertDialog(
            onDismissRequest = { confirmingReset = false },
            title = { Text(stringResource(R.string.settings_reset_title)) },
            text = { Text(stringResource(R.string.settings_reset_body)) },
            confirmButton = {
                TextButton(
                    onClick = {
                        confirmingReset = false
                        actions.onResetStatistics()
                    },
                    modifier = Modifier.testTag("reset-confirm"),
                ) { Text(stringResource(R.string.settings_reset_confirm), color = VpColors.Red) }
            },
            dismissButton = {
                TextButton(onClick = { confirmingReset = false }) { Text(stringResource(R.string.settings_cancel)) }
            },
        )
    }
}

@Composable
private fun Section(titleRes: Int, content: @Composable () -> Unit) {
    VpPanel(Modifier.fillMaxWidth()) {
        Eyebrow(stringResource(titleRes), Modifier.padding(bottom = 10.dp))
        content()
    }
}

@Composable
private fun ChipRow(content: @Composable RowScope.() -> Unit) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp), content = content)
}

@Composable
private fun LinkRow(label: String, tag: String, onClick: () -> Unit) {
    Row(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .clickable(role = Role.Button, onClick = onClick)
            .padding(vertical = 12.dp)
            .testTag(tag),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(label, modifier = Modifier.weight(1f), color = VpColors.Text, fontSize = 16.sp)
        Text("›", modifier = Modifier.clearAndSetSemantics { }, color = VpColors.TextMuted, fontSize = 20.sp)
    }
}

@Composable
private fun SettingToggle(label: String, checked: Boolean, onToggle: () -> Unit, tag: String) {
    val palette = LocalPalette.current
    Row(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .clickable(onClick = onToggle)
            .padding(vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(label, modifier = Modifier.weight(1f), color = VpColors.Text, fontSize = 16.sp)
        Switch(
            checked = checked,
            onCheckedChange = { onToggle() },
            modifier = Modifier.testTag(tag),
            colors = SwitchDefaults.colors(
                checkedThumbColor = palette.actionInk,
                checkedTrackColor = palette.action,
                uncheckedThumbColor = VpColors.TextMuted,
                uncheckedTrackColor = VpColors.Track,
            ),
        )
    }
}

private fun AppTheme.labelRes(): Int = when (this) {
    AppTheme.GREEN -> R.string.theme_green
    AppTheme.BLUE -> R.string.theme_blue
    AppTheme.CRIMSON -> R.string.theme_crimson
}

private fun GameSpeed.labelRes(): Int = when (this) {
    GameSpeed.NORMAL -> R.string.settings_speed_normal
    GameSpeed.FAST -> R.string.settings_speed_fast
    GameSpeed.TURBO -> R.string.settings_speed_turbo
}

private fun handCountLabel(count: Int): Int = when (count) {
    3 -> R.string.settings_hands_three
    5 -> R.string.settings_hands_five
    else -> R.string.settings_hands_one
}

@Composable
private fun rememberVersionName(): String {
    val context = LocalContext.current
    return remember(context) {
        runCatching { context.packageManager.getPackageInfo(context.packageName, 0).versionName }.getOrNull().orEmpty()
    }
}

/** Every shipped language, each in its own script, with the current one marked. */
@Composable
fun LanguageDialog(current: AppLanguage, onPick: (AppLanguage) -> Unit, onDismiss: () -> Unit) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(stringResource(R.string.settings_language)) },
        text = {
            Column(Modifier.verticalScroll(rememberScrollState()).testTag("language-list")) {
                AppLanguage.entries.forEach { language ->
                    Row(
                        Modifier
                            .fillMaxWidth()
                            .clickable(role = Role.RadioButton) { onPick(language) }
                            .padding(vertical = 12.dp)
                            .testTag("language-${language.tag}"),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(language.nativeName, modifier = Modifier.weight(1f), fontSize = 16.sp)
                        if (language == current) Text("✓", fontSize = 16.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        },
        confirmButton = {},
        dismissButton = { TextButton(onClick = onDismiss) { Text(stringResource(R.string.settings_cancel)) } },
    )
}
