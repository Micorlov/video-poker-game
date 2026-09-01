# Video Poker — Features, Screens & Games

Complete reference for the **Video Poker** social-casino app (`com.micorlov.videopoker`, v3.0).
Free chips only — no real money. Ships as a PWA (GitHub Pages) plus Capacitor iOS/Android builds.

---

## Table of Contents

1. [Application Map](#1-application-map)
2. [Games & Variants](#2-games--variants)
3. [Game Modes](#3-game-modes)
4. [Screens](#4-screens)
5. [Onboarding Flow](#5-onboarding-flow)
6. [Modals, Sheets & Overlays](#6-modals-sheets--overlays)
7. [Social Features](#7-social-features)
8. [Progression & Rewards](#8-progression--rewards)
9. [Leaderboards & Tournaments](#9-leaderboards--tournaments)
10. [Push Notifications](#10-push-notifications)
11. [Settings](#11-settings)
12. [Admin Panel](#12-admin-panel)
13. [Platform & Infrastructure](#13-platform--infrastructure)
14. [Known Gaps & Inconsistencies](#14-known-gaps--inconsistencies)

---

## 1. Application Map

Single-page app. Everything lives inside `<div class="app">` (max-width 460px, mobile-first).
Screens are `<section class="screen">` siblings; exactly one carries `.active`.
Navigation is `showScreen(name)` in `js/tabs.js` — no router, no history integration.

```
Onboarding Overlay (first run)
        │
        ▼
┌───────────────────────────────────────────────┐
│  App shell                                    │
│                                               │
│  ♠ Play   ▤ Stats   👥 Friends   ⚙ Settings   │  ← bottom nav
└───────────────────────────────────────────────┘
        │
        ├─ Modals:  Sign-in · Create Room · Room Detail
        ├─ Sheets:  Invite · Room Created · ALL IN
        └─ Overlays: Story Viewer · Toast · PWA Install Bar
```

Two separate codebases exist in the repo:

| | `video_poker.py` | Web/mobile app (`js/*.js`) |
|---|---|---|
| Form | Terminal CLI | PWA + Capacitor Android/iOS |
| Variants | Jacks or Better only | 4 variants × 3 hand-counts |
| Bankroll | 100, no rebuy | 500, unlimited free rebuy |
| Bet range | 1–5 | 5 / 10 / 20 / 50 / ALL IN |
| Paytable | 9/6 full-pay (25× quad) | 7/5 short-pay (20× quad) |
| Progression | None | Levels, streaks, champions, bracelets, rooms, stories |

They share no code. The rest of this document describes the **web/mobile app** unless stated otherwise.

---

## 2. Games & Variants

Four video-poker variants, selectable in **Settings → Game Variant**. Switching is only allowed
between hands. Locked variants toast `🔒 Unlocks at level N`.

`VARIANT_MIN_LEVEL = { jacks: 1, deuces: 3, bonus: 8, doubleBonus: 15 }`
Level = `1 + floor(lifetimeHands / 5)` — so Deuces at 10 hands, Bonus at 35, Double Bonus at 70.

### 2.1 Jacks or Better — unlocked at level 1

| Hand | Payout (× bet) |
|---|---|
| Royal Flush | 250 |
| Straight Flush | 50 |
| Four of a Kind | 20 |
| Full House | 7 |
| Flush | 5 |
| Straight | 4 |
| Three of a Kind | 3 |
| Two Pair | 2 |
| Jacks or Better | 1 |

### 2.2 Deuces Wild — unlocked at level 3

All 2s are wild. Minimum paying hand is Three of a Kind — no Two Pair or Jacks-or-Better row.

| Hand | Payout |
|---|---|
| Royal Flush (natural) | 250 |
| Four Deuces | 200 |
| Wild Royal Flush | 25 |
| Five of a Kind | 15 |
| Straight Flush | 9 |
| Four of a Kind | 5 |
| Full House | 3 |
| Flush | 2 |
| Straight | 2 |
| Three of a Kind | 1 |

### 2.3 Bonus Poker — unlocked at level 8

| Hand | Payout |
|---|---|
| Royal Flush | 250 |
| Four Aces | 80 |
| Straight Flush | 50 |
| Four 2s–4s | 40 |
| Four 5s–Ks | 25 |
| Full House | 8 |
| Flush | 5 |
| Straight | 4 |
| Three of a Kind | 3 |
| Two Pair | 2 |
| Jacks or Better | 1 |

### 2.4 Double Bonus — unlocked at level 15

| Hand | Payout |
|---|---|
| Royal Flush | 250 |
| Four Aces | 160 |
| Four 2s–4s | 80 |
| Straight Flush | 50 |
| Four 5s–Ks | 50 |
| Full House | 10 |
| Flush | 7 |
| Straight | 5 |
| Three of a Kind | 3 |
| Two Pair | 1 |
| Jacks or Better | 1 |

### 2.5 Terminal game — `video_poker.py`

Standalone CLI, Jacks or Better only, true 9/6 paytable
(`Royal 250 · SF 50 · Quads 25 · FH 9 · Flush 6 · Straight 4 · Trips 3 · Two Pair 2 · JoB 1`).
Balance starts at 100, bet 1–5, no rebuy, no persistence. Hold input is space-separated `1..5`,
`0` discards all, `h` shows help, `q` quits. Winning cards render as `★ card ★`, held as `[card]`.

### 2.6 Hand evaluation

- `evaluateForVariant()` routes Deuces to a wild-card evaluator; Bonus/Double Bonus re-label
  Four of a Kind by quad rank (`A` → Four Aces, `2–4` → Four 2s–4s, else Four 5s–Ks).
- Aces high (14) with a wheel special case (`A,2,3,4,5` → treated as a 1-5 straight).
- `HAND_RANK` (0–9) is used for "best hand" comparisons, story selection, and celebration tiers.
- Winning card indices are returned for highlighting; Full House and Two Pair split their
  highlights across primary and secondary groups.

---

## 3. Game Modes

### 3.1 Single hand (default)

Deal 5 → hold any subset → draw → evaluate → pay. Bet is chosen **after** seeing the deal
(a deliberate design decision surfaced in onboarding step 3: "Bet After You Decide").

### 3.2 Multi-hand — Triple Play / Five Play

Settings → **Hands per Deal**: `1 Hand` / `3× Hands` / `5× Hands`.
Unlocks at level 10 (`MULTI_HAND_MIN_LEVEL`), otherwise toasts `🔒 Multi-hand unlocks at level 10`.

- Total bet = `bet × handCount`, deducted up front.
- Same dealt cards and same holds across all hands; each extra hand draws from its own
  independently shuffled deck (52 minus the 5 dealt cards).
- Each hand pays separately; all wins are summed. "Best hand" = highest `HAND_RANK` across all.
- If the balance can't cover the multi-bet, the hand count is silently reduced rather than
  forcing a rebuy.

### 3.3 ALL IN — daily-limited mega bet

- Button `ALL IN` on the bet row with a remaining-uses badge.
- Default limit **1 per day** (`ALLIN_DAILY_LIMIT_DEFAULT`), remotely overridable via the
  `allInDailyLimit` feature flag. Resets on local date change.
- Bets the entire balance on the next hand (divided across hands in multi-hand mode).
- Confirmation is a **slide-to-confirm** drag control (85% threshold), not a tap.
- Depleted → `⛔ No ALL INs left — back tomorrow!`. Confirmed → `🔥 ALL IN — good luck!`.
- Opening it at zero balance triggers a rebuy instead.

### 3.4 Strategy Hints (assist mode)

Toggle via the 💡 button on the Play screen. Suggested holds glow blue (`.hint-suggest`).
Toast on enable: `💡 Hints on — suggested holds glow blue`.

- **Jacks/Bonus/Double Bonus ladder:** pat RF/SF → quads → 4-to-royal → full house →
  flush/straight → trips → 4-to-straight-flush → two pair → high pair → 3-to-royal →
  4-to-flush → low pair → open-ended 4-straight → 2 suited high cards → high cards → discard all.
- **Deuces ladder:** pat hands → quads/trips + deuces → 3+ deuces alone → deuces + suited
  royals → any pair + deuces → deuces alone → 4-flush → open-ended 4-straight → discard all.

### 3.5 Poker Rooms (private group play)

Not a shared table — a room is a **code-joinable net-profit leaderboard** among friends.
No chat, no reactions, no reset cadence. See [§7.3](#73-poker-rooms).

### 3.6 Engagement tuning (hidden)

`boostHand()` runs on every deal, before the player sees the cards. It can swap in a card to
make a pair, or (25% of non-critical triggers) manufacture a 4-to-a-flush draw.

```
chance = 0.18 + 0.06 × min(lossStreak, 5)
       + 0.35 if balance ≤ bet × 4   (critical)
       + 0.15 if balance ≤ bet × 10  (low)
capped at 0.85
```

Additionally, a **loss escalator** bumps every non-zero payout by +1 after each losing hand,
resetting to base on any win. This is intentional design, not a bug.

---

## 4. Screens

### 4.1 Bottom Navigation

| id | Icon | Label |
|---|---|---|
| `nav-play` | ♠ | Play |
| `nav-stats` | ▤ | Stats |
| `nav-friends` | 👥 | Friends |
| `nav-settings` | ⚙ | Settings |

### 4.2 Play — `#screen-play` (default)

The main game screen, in DOM order:

| Element | Purpose |
|---|---|
| Brand row | App title "Video Poker" |
| **Tournament pill** | `⏱ #1 · 26:55`, tap to expand a `🏆 Tournament #2` panel — *currently static text* |
| **Stories row** | Instagram-style rings of you + friends' best hands, with 💍 bracelet badges |
| **Balance panel** | Current balance and total bet |
| **Bet row** | 5 / 10 / 20 / 50 chips + `ALL IN` with remaining-uses badge |
| **Multi-hand area** | Extra hands rendered when 3×/5× is active |
| **Main hand** | The five cards — tap, click, keys `1`–`5`, or Enter/Space to hold |
| **Action row** | `🎴 Deal` / `🔄 Draw` primary button + 💡 hints toggle |
| **Streak bar** | 🔥 win streak counter with the active payout-bonus tag |
| **Friends Leaderboard** *(web)* | Your rank + 4 neighbours, with online dots, country flags, 🔗 link-friend chips |
| **Hourly Champions** *(web)* | Top 5 of the current UTC hour + reset countdown |
| **Unified Leaderboards** *(native)* | Friends / Hourly / Daily tabs replacing the two web panels |
| **Play With Friends** | Up to 2 room previews + "Create a Poker Room with Friends" |
| **Result banner** | Hand outcome, e.g. `🎉 Full House! +70 credits! 🎉` |
| **Explanation** | One-line description of the resulting hand |

**Keyboard:** `1`–`5` toggle holds during the hold phase; during betting they map to
5 / 10 / 20 / 50; `d` deals or draws.

### 4.3 Stats — `#screen-stats`

Title "Statistics". Segmented control **Today** / **All-Time**.

- Hero panel: **Net** (green/red/neutral)
- Four tiles: **Won**, **Lost**, **Hands Played**, **Best Streak**

"Today" reads session counters; "All-Time" reads the persisted `vp_alltime_stats` record.

### 4.4 Friends — `#screen-friends`

Header "Friends" + `+ Invite` pill.

**Signed out:** a single "Sign in to add friends ›" prompt.

**Signed in:**
- **Your Code** — your 6-character referral code
- **Invite Friends** — `📋 Copy Invite Link` and `💬 WhatsApp`
- **Add a Friend** — 6-char code input + Add
- Segmented tabs: **Leaderboard** / **Poker Rooms**
  - *Leaderboard* — friends ranked by net profit, with rank, avatar, online dot, country flag,
    🔗 link-friend chip, 🔥 streak, and signed net. Empty: "Add friends by their code to compare scores."
  - *Poker Rooms* — room cards (name, Open/In Progress, member count, stake, Join/Enter) plus a
    dashed "+ Create a Poker Room with Friends" that expands an inline form
    (name, stake chips 5/10/20/50, Create & Invite / Cancel)

### 4.5 Settings — `#screen-settings`

See [§11](#11-settings).

---

## 5. Onboarding Flow

Full-screen overlay shown on first run (`vp_onboarding_seen`), and again after sign-out on
native. Six steps, swipeable, with back arrow, dot indicator, and next arrow.

| # | Step | Content |
|---|---|---|
| 1 | **Royal Video Poker** | Eyebrow "Social Casino", fanned K♠/A♠/Q♠, "Five cards. One decision. Play with free chips — no real money, all the thrill." Pills: `5-Card Draw`, `Free Chips Daily`, `No Real Money`. **Language picker** lives here. |
| 2 | **Know Your Hands** | Royal Flush 250x · Straight Flush 50x · Four of a Kind 25x · Full House 9x · Jacks or Better 1x, plus "nine winning hands in total" |
| 3 | **Bet After You Decide** | Mock game board with HELD badges, bet chips and ALL IN. Note: "One free All-In per day — invite a friend to unlock another." |
| 4 | **Compete & Climb** | Mock leaderboard with Friends/Hourly/Daily tabs and five ranked rows |
| 5 | **Never Miss a Win** | 🔔 Push permission ask — **native only, skipped on web**. Enables all four notification categories at once. |
| 6 | **Save Your Progress** | Google sign-in. "Continue as Guest" is **native-only** — on web, sign-in is mandatory. |

**Language selection** — 16 languages: English, Spanish, Portuguese (BR), German, French,
Italian, Polish, Russian, Turkish, Indonesian, Hindi, Japanese, Korean, Simplified Chinese,
Hebrew and Arabic. The device language is detected on first launch (`navigator.languages`,
folded onto the nearest shipped language — including Android's legacy `iw` for Hebrew —
falling back to English); a globe chip on the onboarding welcome step and a row in Settings
both open the picker. Persisted to `vp_lang`.

Hebrew and Arabic set `dir="rtl"` on `<html>` and mirror the whole layout via
`styles/rtl.css`. Playing cards stay left-to-right in every language: rank sits top-left and
suit bottom-right on a real card regardless of locale, and the dealt order is what the hold
indices and the flip animation both assume. The onboarding swipe, the story tap zones and the
All-In slider all reverse with the reading direction.

---

## 6. Modals, Sheets & Overlays

### Modals

| Modal | Title | Contents |
|---|---|---|
| `#signin-modal` | Sign in to play with friends | Continue with Google · Continue with Facebook (flag-gated) |
| `#room-modal` | Create a Poker Room | Room name, stake select (5/10/20/50), Create Room; plus "Got a code from a friend?" → 6-char join |
| `#room-detail-modal` | *(room name)* | Live member list ordered by net profit, with the share code |

### Bottom Sheets

| Sheet | Title | Contents |
|---|---|---|
| `#invite-sheet` | Invite Friends | Invite link + Copy + native Share |
| `#room-created-sheet` | Room Created 🎉 | Join link + Copy, WhatsApp and Telegram share chips |
| `#allin-sheet` | 🔥 Go All In | Amount, explanation, slide-to-confirm control |

### Dynamic Overlays

| Overlay | Behavior |
|---|---|
| **Story Viewer** | Full-screen, progress bars, 5s auto-advance, tap zones, Esc/←/→ keys. Shows hand name, cards, `+N credits · Nx`, and bracelet strip. Empty: "No winning hands yet / Win a hand to create your story." |
| **Toast** | Singleton, 2.2s. ~30 call sites (`♻ +500 credits`, `Friend added!`, `Invite link copied!`, `Statistics reset`, …) |
| **PWA Install Bar** | "Install Video Poker for quick access" — appears after 3 distinct visit days, dismissal persisted |
| **Win celebrations** | Escalating by hand rank: gold shimmer → card bounce → confetti burst → triple confetti + screen flash → fireworks + shake + gold rain |

---

## 7. Social Features

### 7.1 Friends

Mutual friendship edges. Two ways to connect:

- **By code** — every player has a 6-character referral code (ambiguity-free alphabet).
- **By invite link** (`?ref=CODE`) — a **fully-connected group join**: the joiner becomes mutual
  friends with *every* existing member of that referral group, not just the link owner.
  Toast: `Connected with N friends via this link!`

Friends are ranked live by net profit via per-friend Firestore listeners. Link-made friends carry
a 🔗 chip.

### 7.2 Invites & Sharing

| Surface | Channel |
|---|---|
| Friends screen | Copy Invite Link · WhatsApp |
| Invite sheet | Copy · native OS share sheet |
| Room Created sheet | Copy · WhatsApp · Telegram |

Deep links: `?ref=CODE` (add friend) and `?join=ROOMCODE` (join room). Both survive a
sign-in detour — the pending code is replayed after auth.

### 7.3 Poker Rooms

- Created with a name + stake, capacity 6, and a shareable 6-char code.
- Members are ranked by `netProfit` (balance − 500), updated after every draw.
- Status: **Open** (1 member) → **In Progress** (2+). Buttons read `Join Table` / `Enter Table`.
- The stake value is displayed but **does not affect betting**; capacity is displayed but
  **not enforced**.

### 7.4 Stories

One story per person: **their single best hand ever won** (highest payout). Rendered as an
Instagram-style ring row on the Play screen, self first. A 💍 badge marks a bracelet holder.
Tapping opens the full-screen viewer.

### 7.5 Presence

Heartbeat every 60s; a player is "online" if seen within 2 minutes (green dot).
Country detected via IP lookup with a browser-locale fallback, rendered as a flag chip.
Native apps re-stamp presence on app resume.

---

## 8. Progression & Rewards

### 8.1 Levels

XP is **hands played**, not winnings: `level = 1 + floor(lifetimeHands / 5)`.
The only thing levels do is unlock content:

| Unlock | Level | ≈ hands |
|---|---|---|
| Deuces Wild | 3 | 10 |
| Bonus Poker | 8 | 35 |
| Multi-hand (3×/5×) | 10 | 45 |
| Double Bonus | 15 | 70 |

### 8.2 Win Streaks

Consecutive wins add a payout bonus:

| Streak | Bonus |
|---|---|
| 3+ | +10% |
| 5+ | +20% |
| 7+ | +30% |
| 10+ | +50% |

The streak bar activates at 2 wins and animates on each increment. Best streak is persisted and
published to friends and rooms.

### 8.3 Bracelets 💍

Awarded server-side for the **biggest single win** in a UTC hour (Hourly Bracelet) and a UTC day
(Daily Bracelet). Reward is prestige: a 💍 badge on the winner's story avatar and a bracelet strip
in the story viewer. No credits are granted.

### 8.4 Rebuy

When the balance can't cover the minimum bet, the game grants **+500 credits** with a
`♻ +500 credits` toast. Unlimited and free; rebuys are counted for the daily leaderboard.

### 8.5 Personal Best

The highest-payout hand ever won is stored locally and mirrored to the player's profile, powering
both the Stories row and the "best hand" push notification.

---

## 9. Leaderboards & Tournaments

| Board | Scope | Metric | Reset |
|---|---|---|---|
| **Friends · Today** | Your friend circle | Daily net profit | Local midnight |
| **⏱ Hourly Champions** | All players | Points = `max(1, floor(win / 10))`, accumulated | Top of each UTC hour |
| **📅 Daily Champions** | All players | Net profit (`win − bet`), accumulated | UTC day |
| **Room leaderboard** | Room members | Lifetime net profit | Never |
| **Hourly / Daily Bracelet** | All players | Single biggest win | Hour / day |

**Platform split:** web shows two separate panels (Friends Leaderboard + Hourly Champions);
native shows one unified panel with Friends / Hourly / Daily tabs, collapsed to top 5 with a
`Show Top 20 ▾` expander.

Rows show rank, avatar initial, display name, country flag, and score, with your own row
highlighted. Empty state: "No scores yet — be the first!"

**Tournament pill** on the Play screen (`⏱ #1 · 26:55`, `🏆 Tournament #2`) is currently
**static placeholder text** — there is no tournament engine behind it.

---

## 10. Push Notifications

Four user-facing categories, each independently toggleable in Settings. A poller runs every
5 minutes via GitHub Actions; the daily reminder runs once at 15:00 UTC.

| Category | Notification | Trigger |
|---|---|---|
| `social` | **New friend** — "X added you as a friend" | A new friendship edge |
| `social` | **New friend** — "X joined your friends circle via the invite link!" | Someone joins via your invite link |
| `social` | **Room activity** — "X joined *room*" | A new member joins your room (owner only) |
| `leaderboard` | **Leaderboard update** — "X just passed you in the room leaderboard" | A room member overtakes you |
| `leaderboard` | **Friends leaderboard** — "X just passed you on the friends leaderboard" | A friend overtakes you |
| `leaderboard` | **Friends leaderboard** — "X is now #1 among your friends" | Leadership of your circle changes |
| `leaderboard` | **Friends leaderboard** — "You're now #1 among your friends!" | You take the lead |
| `leaderboard` | **Hourly leaderboard** — "You've dropped out of this hour's top 5" | You fall out of the hourly top 5 |
| `bestHand` | **New personal best** — "X just landed a Royal Flush!" | A friend sets a new best hand |
| `dailyReminder` | **Your ALL IN reset is ready** — "Come back and claim it before it resets again!" | Didn't play today (once per day) |
| *(admin)* | Operator-supplied broadcast | Manual workflow dispatch, optionally platform-filtered |

Settings labels: **Friend activity** · **Leaderboard updates** · **Daily bonus reminder** ·
**Friends' best hands**.

Delivery respects per-category opt-outs, prunes dead device tokens automatically, and logs every
send (sent / skipped / failed) for the admin delivery log.

---

## 11. Settings

| Section | Options |
|---|---|
| **Gameplay** | Sound Effects toggle · Haptic Feedback toggle |
| **Theme** | 🟢 Green (default) · 🔵 Blue · 🔴 Crimson |
| **Default Bet** | 5 · 10 · 20 · 50 |
| **Game Variant** | Jacks or Better · Deuces Wild 🔒 · Bonus Poker 🔒 · Double Bonus 🔒 |
| **Hands per Deal** | 1 Hand · 3× Hands 🔒 · 5× Hands 🔒 |
| **Support** | Collapsible Payout Table for the active variant |
| **Account** | Sign in with Google, or display name + Sign Out |
| **Notifications** *(when supported)* | Four category toggles + "Enable Notifications ›" |
| **Danger** | Reset Statistics |
| Footer | `Video Poker · v3.0` |

**Audio** is fully synthesized via Web Audio — no sound files. Eight cues: deal, flip, click,
loss, coin, win, bigWin, levelUp. The balance counter arpeggiates a coin sound while animating.

---

## 12. Admin Panel

Separate page (`admin.html`), gated to a single admin email via Google sign-in.

| Tab | Capabilities |
|---|---|
| **Overview** | Total users · Active today · Current-hour players · Rebuys; live current-hour table (15s refresh); recent logins |
| **Users** | Full user list with name/email search |
| **Competitions** | Browse hourly/daily results, delete or reset individual scores; CRUD for limited-time **Events** (name, emoji, type, multiplier, hand, start/end) |
| **Features** | Remote flags — `facebookSignIn`, `champions`, `stories`, `friendsRooms`, and the ALL IN daily limit |
| **Push** | FCM key (local-only), poll status, send test notification to a chosen user, and a 200-row delivery log with search + category + status filters |

Feature flags let the operator hide the Facebook sign-in button, the champions panels, the stories
strip, or the entire friends/rooms system without a release.

---

## 13. Platform & Infrastructure

### Distribution

| Target | Details |
|---|---|
| **Web / PWA** | GitHub Pages, auto-deployed on push to `main`. Installable, offline-capable. |
| **Android** | Capacitor, release keystore, deep-link intent filter, `POST_NOTIFICATIONS` permission |
| **iOS** | Capacitor, Sign in with Apple entitlement, remote-notification background mode, `videopoker://` URL scheme |

### Build

`npm run build` inlines 6 stylesheets and 18 JS modules (in strict dependency order) into a single
`video_poker.html`, then stages `www/` for the Capacitor native shells.

### Service Worker

- Network-first for navigations, cache-first for assets
- Firebase/FCM endpoints bypass the cache entirely
- Handles background FCM messages (notification payload first, data payload as fallback)
- Notification click focuses an existing window or opens a new one

### Auth

Google and Facebook. Inside native WebViews, popup/redirect auth is replaced by the native
Firebase Authentication plugin, whose credential is handed back to the JS SDK so Firestore rules
see the same session.

### Data (Firestore)

`users` · `users/*/friends` · `users/*/fcmTokens` · `referralGroups` · `rooms` · `rooms/*/members` ·
`hourly/*/entries` · `dailyMaxWin/*/entries` · `daily_scores` · `bracelets` · `config/features` ·
`events` · `pushLogs` · `system/pushCursor`

Security rules are documented in `FIRESTORE_RULES_FRIENDS_ROOMS.md` and
`FIRESTORE_RULES_PHASE7-10.md`.

### Local Storage Keys

`vp_game_state` · `vp_default_bet` · `vp_game_variant` · `vp_multi_hands` · `vp_allin_usage` ·
`vp_lifetime_hands` · `vp_alltime_stats` · `vp_daily_progress` · `vp_best_hand` · `vp_hints` ·
`vp_theme` · `vp_sound_enabled` · `vp_lang` · `vp_onboarding_seen` ·
`vp_push_permission_asked` · `vp_visits` · `vp_install_dismissed`

### Automation (GitHub Actions)

| Workflow | Schedule |
|---|---|
| `push-poll.yml` | Every 5 minutes — friends, rooms, hourly, best hand, friend ranks, bracelet awards |
| `daily-reminder.yml` | 15:00 UTC daily |
| `broadcast-test.yml` | Manual — all-users broadcast with optional platform filter |
| `deploy.yml` | On push to `main` — GitHub Pages |

---

## 14. Known Gaps & Inconsistencies

Documented from source review — these are observations, not a change request.

1. **Tournament pill is static.** The `⏱ #1 · 26:55` / `🏆 Tournament #2` text is hardcoded; no
   tournament engine exists, though onboarding copy promises tournaments.
2. **No daily bonus grant.** The "Daily bonus reminder" notification and onboarding bullet exist,
   but no code awards a daily bonus. The closest mechanics are the free unlimited rebuy and the
   daily ALL IN charge.
3. **Daily periods disagree.** `daily_scores` uses the *local* date; bracelets and hourly boards
   use *UTC*. The two "daily" windows don't align.
4. **Shared Firestore document.** Bracelet progress (`maxWin`) and champion points (`points`)
   both write to `hourly/{hourKey}/entries/{uid}`.
5. **Best-hand ranking is category-based.** `Four Deuces` (200×) ranks below `Royal Flush` and
   equal to `Wild Royal Flush` (25×), so "best hand" can pick a lower-paying hand.
6. **Paytable divergence.** The CLI game is 9/6 with a 25× quad; the app's Jacks or Better is 7/5
   with a 20× quad — materially different games under the same name.
7. **Room capacity unenforced.** Capacity 6 is displayed but never checked when joining.
8. **Room stake is cosmetic.** Stored and shown, but it has no effect on betting.
9. **Bracelet awards send no push.** The award job writes the record but never notifies the winner.
10. **Onboarding dot count.** Six dots render even on web, where the push step is skipped — one
    dot is unreachable.
11. **Dead code.** `vpOnDrawCheckPerfect()` is invoked but defined nowhere; the push test queue
    processor is exported but never called and nothing writes to its collection.
12. **Admin flag drift.** The admin panel's defaults omit `bracelets` and default the ALL IN limit
    to 5, while the client defaults to 1.
13. **iOS push environment** is set to `development`, which would need flipping for App Store
    release.
14. **Manifest has SVG icons only** — no PNG icons, which limits install fidelity on Android/iOS.

---

*Generated 2026-07-25 from source review of `index.html`, `js/*.js`, `styles/*.css`,
`scripts/**/*.js`, `admin.html`, `sw.js`, `manifest.json`, `capacitor.config.json`, and
`video_poker.py`.*
