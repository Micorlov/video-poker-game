package com.micorlov.videopoker.nativeapp.ui.onboarding

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.activity.compose.BackHandler
import com.micorlov.videopoker.nativeapp.R
import com.micorlov.videopoker.nativeapp.domain.AppLanguage
import com.micorlov.videopoker.nativeapp.domain.Rules
import com.micorlov.videopoker.nativeapp.ui.components.ActionButton
import com.micorlov.videopoker.nativeapp.ui.text.formatNumber
import com.micorlov.videopoker.nativeapp.ui.theme.LocalPalette
import com.micorlov.videopoker.nativeapp.ui.theme.VpColors

/** The six first-run screens of js/onboarding.js, in order. */
enum class OnboardingStep { WELCOME, HANDS, GAMEPLAY, LEADERBOARD, PUSH, SIGN_IN }

/**
 * First-run walkthrough: welcome, hands, betting after the deal, leaderboards, notifications and
 * "save your progress". Shown once; [onFinished] marks it seen. [onEnableNotifications] asks for the
 * notification permission; [onChooseLanguage] opens the language picker from the globe chip.
 */
@Composable
fun OnboardingFlow(
    language: AppLanguage,
    onChooseLanguage: () -> Unit,
    onEnableNotifications: () -> Unit,
    onFinished: () -> Unit,
    modifier: Modifier = Modifier,
) {
    var index by rememberSaveable { mutableIntStateOf(0) }
    val steps = OnboardingStep.entries
    val step = steps[index]
    val last = index == steps.lastIndex
    val rtl = LocalLayoutDirection.current == LayoutDirection.Rtl
    BackHandler(enabled = index > 0) { index-- }

    Column(
        modifier
            .fillMaxSize()
            .statusBarsPadding()
            .navigationBarsPadding()
            .testTag("onboarding"),
    ) {
        Row(Modifier.fillMaxWidth().padding(12.dp), horizontalArrangement = Arrangement.End) {
            Row(
                Modifier
                    .clip(RoundedCornerShape(50))
                    .background(VpColors.Surface)
                    .clickable(role = Role.Button, onClick = onChooseLanguage)
                    .padding(horizontal = 14.dp, vertical = 8.dp)
                    .testTag("onboarding-language"),
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                Text("🌐", modifier = Modifier.clearAndSetSemantics { }, fontSize = 14.sp)
                Text(language.nativeName, color = VpColors.Text, fontSize = 14.sp)
            }
        }

        Column(Modifier.weight(1f).fillMaxWidth().verticalScroll(rememberScrollState()).padding(horizontal = 20.dp)) {
            when (step) {
                OnboardingStep.WELCOME -> WelcomeStep()
                OnboardingStep.HANDS -> HandsStep()
                OnboardingStep.GAMEPLAY -> GameplayStep()
                OnboardingStep.LEADERBOARD -> LeaderboardStep()
                OnboardingStep.PUSH -> PushStep(onEnable = { onEnableNotifications(); index++ }, onNotNow = { index++ })
                OnboardingStep.SIGN_IN -> SignInStep(onGuest = onFinished)
            }
        }

        Row(Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            NavArrow(if (rtl) "→" else "←", stringResource(R.string.ob_back), visible = index > 0, tag = "onboarding-back") { index-- }
            Row(Modifier.weight(1f), horizontalArrangement = Arrangement.Center) {
                steps.forEach { s ->
                    Box(
                        Modifier
                            .padding(horizontal = 4.dp)
                            .size(if (s == step) 10.dp else 8.dp)
                            .clip(CircleShape)
                            .background(if (s == step) VpColors.Gold else VpColors.Border),
                    )
                }
            }
            if (!last) {
                val label = if (index == 0) stringResource(R.string.ob_start_with_chips, formatNumber(Rules.STARTING_BALANCE)) else stringResource(R.string.ob_next)
                ActionButton(text = label, icon = if (rtl) "←" else "→", onClick = { index++ }, modifier = Modifier.testTag("onboarding-next"))
            } else {
                Spacer(Modifier.size(48.dp))
            }
        }
    }
}

@Composable
private fun NavArrow(glyph: String, description: String, visible: Boolean, tag: String, onClick: () -> Unit) {
    if (!visible) return Spacer(Modifier.size(48.dp))
    Box(
        Modifier
            .size(48.dp)
            .clip(CircleShape)
            .background(VpColors.Surface)
            .semantics { contentDescription = description }
            .clickable(role = Role.Button, onClick = onClick)
            .testTag(tag),
        contentAlignment = Alignment.Center,
    ) { Text(glyph, color = VpColors.Text, fontSize = 20.sp, modifier = Modifier.clearAndSetSemantics { }) }
}

@Composable
private fun ScreenTitle(title: String, subtitle: String) {
    Text(title, color = VpColors.Text, fontSize = 26.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 8.dp))
    Text(subtitle, color = VpColors.TextMuted, fontSize = 15.sp, modifier = Modifier.padding(top = 6.dp, bottom = 16.dp))
}

@Composable
private fun Note(text: String) {
    Text(text, color = VpColors.TextMuted, fontSize = 13.sp, modifier = Modifier.padding(top = 16.dp), textAlign = TextAlign.Center)
}

@Composable
private fun WelcomeStep() {
    Column(Modifier.fillMaxWidth().padding(top = 24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf("K", "A", "Q").forEach { rank -> MiniCard("$rank♠", Modifier.size(width = 64.dp, height = 90.dp), fontSize = 22.sp) }
        }
        Text(
            stringResource(R.string.ob_eyebrow).uppercase(),
            color = VpColors.TextFaint, fontSize = 12.sp, fontWeight = FontWeight.SemiBold,
            modifier = Modifier.padding(top = 28.dp),
        )
        Text(
            stringResource(R.string.ob_welcome_title),
            color = VpColors.Text, fontSize = 32.sp, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center,
            modifier = Modifier.padding(top = 6.dp).testTag("onboarding-title"),
        )
        Text(
            stringResource(R.string.ob_welcome_subtitle),
            color = VpColors.TextMuted, fontSize = 16.sp, textAlign = TextAlign.Center,
            modifier = Modifier.padding(top = 10.dp, bottom = 20.dp),
        )
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Pill(stringResource(R.string.ob_pill_5card), VpColors.Gold)
            Pill(stringResource(R.string.ob_pill_free_chips), VpColors.Positive)
            Pill(stringResource(R.string.ob_pill_no_real_money), VpColors.TextMuted)
        }
    }
}

@Composable
private fun Pill(text: String, color: androidx.compose.ui.graphics.Color) {
    Text(
        text, color = color, fontSize = 12.sp, fontWeight = FontWeight.SemiBold,
        modifier = Modifier.clip(RoundedCornerShape(50)).border(1.dp, color, RoundedCornerShape(50)).padding(horizontal = 10.dp, vertical = 5.dp),
    )
}

@Composable
private fun MiniCard(text: String, modifier: Modifier = Modifier, fontSize: androidx.compose.ui.unit.TextUnit = 13.sp) {
    val red = text.endsWith("♥") || text.endsWith("♦")
    Box(
        modifier.clip(RoundedCornerShape(6.dp)).background(VpColors.CardFaceTop).padding(horizontal = 4.dp, vertical = 3.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(text, color = if (red) VpColors.CardRed else VpColors.CardBlack, fontSize = fontSize, fontWeight = FontWeight.Bold)
    }
}

private data class SampleHand(val cards: List<String>, val nameRes: Int, val payout: String, val highlight: Boolean = false)

private val SAMPLE_HANDS = listOf(
    SampleHand(listOf("10♠", "J♠", "Q♠", "K♠", "A♠"), R.string.hand_royal_flush, "250x", highlight = true),
    SampleHand(listOf("5♥", "6♥", "7♥", "8♥", "9♥"), R.string.hand_straight_flush, "50x"),
    SampleHand(listOf("9♠", "9♦", "9♣", "9♥", "4♣"), R.string.hand_four_of_a_kind, "20x"),
    SampleHand(listOf("K♠", "K♥", "K♦", "3♣", "3♠"), R.string.hand_full_house, "7x"),
    SampleHand(listOf("J♠", "J♥", "4♦", "8♣", "2♠"), R.string.hand_jacks_or_better, "1x"),
)

@Composable
private fun HandsStep() {
    ScreenTitle(stringResource(R.string.ob_know_your_hands), stringResource(R.string.ob_bigger_hands))
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        SAMPLE_HANDS.forEach { hand ->
            Row(
                Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .background(if (hand.highlight) VpColors.SurfaceRaised else VpColors.Surface)
                    .padding(10.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Row(horizontalArrangement = Arrangement.spacedBy(3.dp)) { hand.cards.forEach { MiniCard(it) } }
                Column(Modifier.weight(1f).padding(start = 10.dp), horizontalAlignment = Alignment.End) {
                    Text(stringResource(hand.nameRes), color = VpColors.Text, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                    Text(hand.payout, color = VpColors.Gold, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
    Note(stringResource(R.string.ob_plus_note))
}

@Composable
private fun GameplayStep() {
    ScreenTitle(stringResource(R.string.ob_bet_after_decide), stringResource(R.string.ob_see_cards))
    Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(VpColors.Surface).padding(14.dp)) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Column {
                Text(stringResource(R.string.ob_balance), color = VpColors.TextFaint, fontSize = 11.sp)
                Text("3,770", color = VpColors.Text, fontSize = 20.sp, fontWeight = FontWeight.Bold)
            }
            Column(horizontalAlignment = Alignment.End) {
                Text(stringResource(R.string.ob_total_bet), color = VpColors.TextFaint, fontSize = 11.sp)
                Text("20", color = VpColors.Gold, fontSize = 20.sp, fontWeight = FontWeight.Bold)
            }
        }
        Row(Modifier.fillMaxWidth().padding(vertical = 14.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            listOf("A♠" to true, "K♠" to true, "7♦" to false, "2♣" to false, "9♥" to false).forEach { (card, held) ->
                Column(Modifier.weight(1f), horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(if (held) stringResource(R.string.play_held) else " ", color = LocalPalette.current.action, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                    MiniCard(card, Modifier.fillMaxWidth().height(64.dp), fontSize = 18.sp)
                }
            }
        }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            listOf("5", "10", "20", "50").forEach { bet ->
                Text(
                    bet, color = if (bet == "20") LocalPalette.current.actionInk else VpColors.Text, fontSize = 14.sp, textAlign = TextAlign.Center,
                    modifier = Modifier.weight(1f).clip(RoundedCornerShape(10.dp))
                        .background(if (bet == "20") LocalPalette.current.action else VpColors.Surface).padding(vertical = 8.dp),
                )
            }
        }
        Text(
            "🔥 " + stringResource(R.string.play_all_in) + " · " + stringResource(R.string.ob_all_in_left_one),
            color = VpColors.Text, fontSize = 13.sp, textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth().padding(top = 6.dp).clip(RoundedCornerShape(10.dp)).background(VpColors.Surface).padding(vertical = 8.dp),
        )
        Text(
            "↻ " + stringResource(R.string.ob_draw), color = LocalPalette.current.actionInk, fontSize = 15.sp, fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth().padding(top = 10.dp).clip(RoundedCornerShape(12.dp)).background(LocalPalette.current.action).padding(vertical = 12.dp),
        )
    }
    Note(stringResource(R.string.ob_one_free_all_in))
}

@Composable
private fun LeaderboardStep() {
    ScreenTitle(stringResource(R.string.ob_compete_climb), stringResource(R.string.ob_race_leaderboards))
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        listOf(R.string.ob_lb_friends, R.string.ob_lb_hourly, R.string.ob_lb_daily).forEachIndexed { i, res ->
            Text(
                stringResource(res), fontSize = 13.sp, textAlign = TextAlign.Center,
                color = if (i == 0) LocalPalette.current.actionInk else VpColors.Text,
                modifier = Modifier.weight(1f).clip(RoundedCornerShape(10.dp))
                    .background(if (i == 0) LocalPalette.current.action else VpColors.Surface).padding(vertical = 8.dp),
            )
        }
    }
    Row(Modifier.fillMaxWidth().padding(top = 14.dp, bottom = 6.dp), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(stringResource(R.string.ob_friends_today), color = VpColors.TextMuted, fontSize = 13.sp)
        Text(stringResource(R.string.ob_you_are_first), color = VpColors.Gold, fontSize = 13.sp, fontWeight = FontWeight.Bold)
    }
    val rows = listOf("you" to "+100", "Jake" to "+45", "Emily" to "+30", "Chris" to "+18", "Sarah" to "+9")
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        rows.forEachIndexed { i, (name, score) ->
            val label = if (name == "you") stringResource(R.string.ob_you) else name
            Row(
                Modifier.fillMaxWidth().clip(RoundedCornerShape(10.dp)).background(if (i == 0) VpColors.SurfaceRaised else VpColors.Surface).padding(10.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text("${i + 1}", color = VpColors.TextMuted, fontSize = 14.sp, modifier = Modifier.size(24.dp))
                Box(Modifier.size(28.dp).clip(CircleShape).background(if (i == 0) VpColors.Gold else VpColors.Border), contentAlignment = Alignment.Center) {
                    Text(label.take(1).uppercase(), color = VpColors.CardBlack, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                }
                Text(label, color = VpColors.Text, fontSize = 14.sp, modifier = Modifier.weight(1f).padding(start = 10.dp))
                Text(score, color = VpColors.Positive, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
            }
        }
    }
    Note(stringResource(R.string.ob_also_live))
}

@Composable
private fun Checklist(items: List<Int>) {
    Column(Modifier.padding(vertical = 16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        items.forEach { res ->
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("✓", color = VpColors.Positive, fontSize = 16.sp, fontWeight = FontWeight.Bold, modifier = Modifier.clearAndSetSemantics { })
                Text(stringResource(res), color = VpColors.Text, fontSize = 15.sp, modifier = Modifier.padding(start = 10.dp))
            }
        }
    }
}

@Composable
private fun PushStep(onEnable: () -> Unit, onNotNow: () -> Unit) {
    Column(Modifier.fillMaxWidth().padding(top = 24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Box(Modifier.size(84.dp).clip(CircleShape).background(VpColors.Surface), contentAlignment = Alignment.Center) { Text("🔔", fontSize = 40.sp) }
        Text(stringResource(R.string.ob_never_miss_win), color = VpColors.Text, fontSize = 26.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 16.dp))
        Text(stringResource(R.string.ob_get_notified), color = VpColors.TextMuted, fontSize = 15.sp, textAlign = TextAlign.Center, modifier = Modifier.padding(top = 8.dp))
        Checklist(listOf(R.string.ob_daily_bonus_reminders, R.string.ob_friend_challenge_alerts, R.string.ob_tournament_results))
        ActionButton(text = stringResource(R.string.ob_enable_notifications), icon = "🔔", onClick = onEnable, modifier = Modifier.fillMaxWidth().testTag("onboarding-enable-notifications"))
        Text(
            stringResource(R.string.ob_not_now), color = VpColors.TextMuted, fontSize = 15.sp, textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth().padding(top = 10.dp).clip(RoundedCornerShape(12.dp)).clickable(role = Role.Button, onClick = onNotNow).padding(12.dp).testTag("onboarding-not-now"),
        )
    }
}

@Composable
private fun SignInStep(onGuest: () -> Unit) {
    Column(Modifier.fillMaxWidth().padding(top = 24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Text(stringResource(R.string.ob_save_progress), color = VpColors.Text, fontSize = 26.sp, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center)
        Text(stringResource(R.string.ob_sign_in_sync), color = VpColors.TextMuted, fontSize = 15.sp, textAlign = TextAlign.Center, modifier = Modifier.padding(top = 8.dp))
        Checklist(listOf(R.string.ob_never_lose, R.string.ob_play_across, R.string.ob_find_friends))
        ActionButton(text = stringResource(R.string.ob_continue_guest), icon = "▶", onClick = onGuest, modifier = Modifier.fillMaxWidth().testTag("onboarding-guest"))
    }
}
