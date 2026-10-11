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
import com.micorlov.videopoker.nativeapp.data.AppTheme
import com.micorlov.videopoker.nativeapp.domain.Rules
import com.micorlov.videopoker.nativeapp.domain.Variant
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
    val onSelectTheme: (AppTheme) -> Unit,
    val onSelectDefaultBet: (Int) -> Unit,
    val onSelectVariant: (Variant) -> Unit,
    val onSelectHandCount: (Int) -> Unit,
    val onResetStatistics: () -> Unit,
)

@Composable
fun SettingsScreen(ui: UiState, actions: SettingsActions, modifier: Modifier = Modifier) {
    val settings = ui.settings
    val game = ui.game
    var confirmingReset by rememberSaveable { mutableStateOf(false) }
    var showPaytable by rememberSaveable { mutableStateOf(false) }

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

        Section(R.string.settings_gameplay) {
            SettingToggle(stringResource(R.string.settings_sound), settings.soundEnabled, actions.onToggleSound, "toggle-sound")
            SettingToggle(stringResource(R.string.settings_haptics), settings.hapticsEnabled, actions.onToggleHaptics, "toggle-haptics")
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
