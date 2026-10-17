---
name: opening-tutorial
description: >-
  Extend or fix the Video Poker opening tutorial: the floating hand, the first
  three scripted winning deals, the once-a-day ALL IN tip, the hints lamp, and
  spoken guidance. Use when the user mentions the tutorial, coach, floating
  hand, first hands, all-in lesson, hint lamp, or voice guidance in android-native.
---

# Opening tutorial

The tutorial is derived UI state. `FirstHands.coach` decides the next control from the live game. Tip-seen flags live on `UiState` and are not saved.

## Order

This is the product order. Do not rearrange it.

1. Hands where `lifetimeHands` is 0 and 1: the floating hand points at each paying card, then Draw. The win is announced as soon as the replacement cards are face up. There is no pause between the draw landing and the win. The coach says you won (the hand name) and points at the result, then points at Deal.
2. The third hand (`lifetimeHands == 2`), only after those cards are face up: point at ALL IN. Say it is once a day and only while this hand's cards are face up.
3. After that acknowledgement, still on the third hand: point at the hints lamp. Tapping it turns hints on.
4. Then the coach disappears. The third hand is not coached card by card.

`newGame` deals immediately, so hand 1 starts in `HOLD`. `lifetimeHands` increments when the hand is settled on Draw. Between hands (`BET`, cards face up) the coach says the win, then points at Deal, including the Deal that starts the third hand. Deuces Wild is never scripted. Double-up hides the coach.

## Do not stake the tutorial

A tap on ALL IN while the target is `CoachTarget.AllIn` calls `onAllInTipSeen` only. It must not call `onAllInRequested`. Confirming a real ALL IN would replace the scripted stake with the whole balance.

A tap on the lamp while the target is `CoachTarget.Hints` marks the tip seen and toggles hints.

Real ALL IN, outside that one tap, is allowed only in `HOLD` after `revealed` is true. Otherwise show `ToastMessage.AllInAfterCards`. Double-up still wins over that check and shows `FinishHandFirst`.

## Voice

`PlayScreen` speaks `coachSpoken` from `LaunchedEffect(coach)`, so moving from one card to the next speaks again even when the words are the same shape. Hold and release name the card (`coach_hold_voice` / `coach_release_voice`). Draw, Deal, ALL IN, and the lamp speak the same sentence as the bubble. The win line is `coach_won` with the hand name. It stays up for `FirstHands.WIN_ANNOUNCE_MS`, then the coach points at Deal. The plain hand-name speech is skipped for those two wins (`FirstHands.announcesWin`) so it does not replace that sentence. The third hand is not coached, so its win is spoken the usual way.

`VideoPokerApp` passes `voice.speak`. Speech follows the existing Voice Announcements switch. `VoiceAnnouncer` keeps the latest phrase if the engine is not ready yet and speaks it on start. Do not call `stop()` when the coach hides during a flip; that cuts off the win announcement.

## Overlay

`CoachOverlay` animates one rect (`spot`). The spotlight, the hole, and the floating hand all use `spot`. The hand has no pointer input. Scrim blockers consume the whole gesture, including moves, so a drag does not scroll the table.

`placeHints`, `placeAllIn`, and `placeResult` write their `LayoutCoordinates` only. They do not bump `cardsTick`. Skip the write when `sameSpot` matches, or layout loops. Lambdas passed into `Header` and `BetRow` that close over `coach` must be `remember`ed on `coach`, and the placement callbacks `remember`ed once.

Point up (finger under the hole) for a card, the lamp, and ALL IN. Point down for Draw and Deal.

## Copy

Add a string in `values/strings.xml`, every `values-*/strings.xml`, and `tools/i18n-extra/*.json`. Do not run `tools/gen-i18n.js`. It rewrites the locale XML and deletes hand-maintained strings.

The Draw/Deal bubble uses `coach_press` with the real button label (`play_draw` or `play_deal`), so the sentence matches the control.

## Tests

- `FirstHandsTest` owns the order. Defaults `hintsExplained` and `allInExplained` stay true so hold tests are unchanged.
- `VideoPokerAppTest.theOpeningTutorialPointsAtTheWinningCardsThenDraw` walks both coached hands (holds 1 and 3, then 1, 3, and 4), deals the third hand, taps `bet-allin` without an `allin-sheet`, then taps `hints-toggle` and expects the coach to leave.
- `performClick` bypasses the scrim. `assertTextContains` is exact unless `substring = true`. The coach label needs `semantics(mergeDescendants = true)`.
- Any test that taps ALL IN for real must use `lifetimeHands >= FirstHands.ROUNDS` and wait until the cards are face up. A fresh game is still the tutorial, and ALL IN before reveal only toasts.
- Seeds that must deal a normal shuffle (`WINNING_SEED`) start at `lifetimeHands = FirstHands.ROUNDS`. The first three deals are fixed and ignore the seed.

## Phone

`gradlew` is in `android-native/`. JDK is `JAVA_HOME=/Users/micorlov/.gradle/jdks/eclipse_adoptium-17-aarch64-os_x.2/jdk-17.0.20.1+1/Contents/Home`. `/usr/bin/java` is a stub.

If a real device is connected, install and run the tutorial test there only. Launch with `com.micorlov.videopoker/com.micorlov.videopoker.nativeapp.MainActivity`. Do not `pm clear` the player's save. After three completed hands the tutorial will not show on that save.
