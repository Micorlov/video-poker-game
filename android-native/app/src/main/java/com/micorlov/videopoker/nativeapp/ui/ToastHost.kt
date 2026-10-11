package com.micorlov.videopoker.nativeapp.ui

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.micorlov.videopoker.nativeapp.R
import com.micorlov.videopoker.nativeapp.ui.text.formatNumber
import com.micorlov.videopoker.nativeapp.ui.theme.LocalPalette
import com.micorlov.videopoker.nativeapp.ui.theme.VpColors
import kotlinx.coroutines.delay

private const val TOAST_VISIBLE_MS = 2600L

/** A short message pill that dismisses itself. Keeps showing the last text while it fades out. */
@Composable
fun ToastHost(toast: Toast?, onDismiss: (Int) -> Unit, modifier: Modifier = Modifier) {
    val palette = LocalPalette.current
    var lastShown by remember { mutableStateOf(toast) }
    if (toast != null) lastShown = toast

    LaunchedEffect(toast?.id) {
        val id = toast?.id ?: return@LaunchedEffect
        delay(TOAST_VISIBLE_MS)
        onDismiss(id)
    }

    AnimatedVisibility(
        visible = toast != null,
        modifier = modifier,
        enter = fadeIn() + slideInVertically { -it / 2 },
        exit = fadeOut(),
    ) {
        lastShown?.let {
            Text(
                text = it.message.text(),
                modifier = Modifier
                    .padding(horizontal = 24.dp, vertical = 8.dp)
                    .background(palette.panelSolid, RoundedCornerShape(16.dp))
                    .border(1.dp, VpColors.BorderStrong, RoundedCornerShape(16.dp))
                    .padding(horizontal = 18.dp, vertical = 12.dp)
                    .semantics { liveRegion = LiveRegionMode.Polite }
                    .testTag("toast"),
                color = VpColors.Text,
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold,
                textAlign = TextAlign.Center,
            )
        }
    }
}

@Composable
private fun ToastMessage.text(): String = when (this) {
    is ToastMessage.Rebuy -> stringResource(R.string.toast_rebuy, formatNumber(amount))
    is ToastMessage.DailyBonus -> stringResource(R.string.toast_daily_bonus, formatNumber(amount))
    is ToastMessage.VariantLocked -> stringResource(R.string.toast_variant_locked, level)
    is ToastMessage.MultiHandLocked -> stringResource(R.string.toast_multi_locked, level)
    ToastMessage.FinishHandFirst -> stringResource(R.string.toast_finish_hand)
    ToastMessage.AllInGoodLuck -> stringResource(R.string.toast_all_in_good_luck)
    ToastMessage.NoAllInLeft -> stringResource(R.string.toast_no_all_in_left)
    ToastMessage.HintsOn -> stringResource(R.string.toast_hints_on)
    ToastMessage.StatsReset -> stringResource(R.string.toast_stats_reset)
}
