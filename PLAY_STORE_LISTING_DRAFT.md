# Play Console Listing — LIVE state

> **2026-09-09 — ASO pass shipped.** Everything in section 1 is **live on Google Play** in all
> 16 locales, pushed with `node scripts/play-listing-upload.js commit` from
> `play-store-assets/listings.json` (the single source of truth for store text — edit that file,
> not this one, then re-run the script). Screenshots (6 per locale), the en-US tablet sets and the
> new 1024x500 feature graphic went up with `node scripts/store-screenshots/upload.js commit`.
> App release 2.4 (versionCode 9) is live on the production track at 100%.
>
> **Why the rewrite:** the app had 10+ downloads and zero ratings. It already ranked #5 in the US
> for "jacks or better" and #29 for "video poker", so discovery was not the bottleneck —
> conversion was. The old short description repeated the title instead of spending its 80
> characters on Deuces Wild / Bonus Poker / multi-hand, the four variants were never named in the
> full description, and the feature graphic claimed "14 languages" when the app has 16.
>
> **Search positions at the time of the rewrite (US, 2026-09-09):** "jacks or better" #5 ·
> "video poker" #29 · "deuces wild" not indexed. Re-check weekly and log below.

## Rank log

| Date | jacks or better | video poker | deuces wild | Ratings |
|---|---|---|---|---|
| 2026-09-09 (before) | 5 | 29 | — | 0 |

---

## 1. Store Listing

**App name (store title, 28/30 chars):** Video Poker: Jacks or Better

**Short description** (max 80 chars):
```
No ads, no real money: Deuces Wild, Bonus Poker, multi-hand & live leaderboards
```
(79 chars)

**Full description** (max 4000 chars):
```
Video Poker: Jacks or Better is a free video poker game with no ads and no real money. Draw five cards, hold the winners, and chase the Royal Flush in Jacks or Better, Deuces Wild, Bonus Poker and Double Bonus — solo, in multi-hand Triple Play and Five Play, or against friends on live leaderboards.

FREE VIDEO POKER, NO ADS
Every hand is played with free virtual chips. No real money, no purchases, no ads to sit through — just classic 5-card draw poker, the way the casino poker machine plays it.

FOUR CLASSIC VIDEO POKER VARIANTS
• Jacks or Better – the classic video poker game, ready from your first hand
• Deuces Wild – every 2 is wild; chase Four Deuces and Wild Royals
• Bonus Poker – bigger payouts for Four Aces and low quads
• Double Bonus – the high-variance favourite with premium four-of-a-kind pays
New variants unlock as you level up, so there is always a next goal.

MULTI-HAND VIDEO POKER
Play one hand, or go big with Triple Play and Five Play: hold once, then draw three or five hands at the same time.

DAILY FREE CHIPS, STREAKS & LEVELS
Come back every day for your free chip bonus and the daily ALL IN mega-bet. Build win streaks for payout bonuses up to +50%, level up to unlock new poker variants and multi-hand modes, and never go bust — free chip top-ups keep you at the table.

COMPETE ON LIVE LEADERBOARDS
This is not solo video poker. Every winning hand moves you up the hourly and daily leaderboards against every player in the game. Watch your rank live and defend it.

PLAY VIDEO POKER WITH FRIENDS
Sign in with Google or Facebook, add friends, and see who is the best video poker player in your crew. Create or join a poker room to play at the same table and climb the friends leaderboard together. Invite a friend and you both earn bonus chips.

16 LANGUAGES, FULL RIGHT-TO-LEFT SUPPORT
English, Spanish, Portuguese, German, French, Italian, Polish, Russian, Turkish, Indonesian, Hindi, Japanese, Korean, Chinese, Hebrew and Arabic. The game matches your device language automatically.

YOUR PROGRESS, SAFE IN THE CLOUD
Sign in once and your chips, levels and stats are backed up automatically. Switch phones and pick up right where you left off.

Download Video Poker: Jacks or Better today and play the casino card game the way it should be — free, fast, and with no ads.

Looking for a video poker app, a free poker machine, Jacks or Better, Deuces Wild or a multi-hand video poker game to play with friends? This is it.

Royal Video Poker is a social casino game intended for entertainment purposes only. It does not offer real money gambling or an opportunity to win real money or prizes. Practice or success in this game does not imply future success at real money gambling.
```

**Category:** Casino (or Card, depending on how you want it classified)

**Contact details:** (your support email — needs to be a real monitored address)
```
micorlov@gmail.com
```

**Graphics needed** (I can't generate final store-ready art, but can help produce simple placeholders if you want):
- App icon (512x512 PNG)
- Feature graphic (1024x500 PNG)
- At least 2 phone screenshots (recommend 4-6) — I can capture these from the running app on your phone/emulator if you want.

---

## 2. Privacy Policy (draft — needs to be hosted at a public URL, e.g. a GitHub Pages page)

```
Privacy Policy for Royal Video Poker

Last updated: [DATE]

Royal Video Poker ("we", "us") is a free social casino game. This policy explains what data we collect and how we use it.

Information We Collect
- Account information: if you sign in with Google, Facebook, or Apple, we receive your display name, profile photo, and a unique account identifier.
- Gameplay data: your chip balance, hand history, levels, streaks, and progression are stored to sync your progress across devices.
- Friends and social features: if you add friends, we store the connection between accounts to show leaderboards and shared rooms.
- Push notification token: if you enable notifications, we store a device token to send you gameplay-related alerts (e.g., a friend overtaking you on the leaderboard).

What We Don't Collect
- We do not process real-money payments or financial account information.
- We do not collect precise location data.
- We do not serve third-party advertising.

How We Use Data
Data is used solely to operate gameplay features: saving progress, showing leaderboards, enabling friends/rooms, and sending optional push notifications.

Data Sharing
We do not sell your data. Data is stored using Google Firebase (Authentication, Firestore, Cloud Messaging) as our backend infrastructure provider.

Data Deletion
You can request deletion of your account data by contacting micorlov@gmail.com.

No Real Money Gambling
This game is intended for entertainment purposes only. It does not offer real money gambling or the ability to win real money or prizes.

Children's Privacy
This app is not directed at children and is not intended for users under 13 (or applicable local age of digital consent).

Contact
micorlov@gmail.com
```

⚠️ You need to host this somewhere public (e.g. a page on your existing GitHub Pages site) and put that URL into Play Console's "Privacy policy" field — Google requires a live URL, not just text.

---

## 3. Data Safety form — draft answers

Based on what's actually in the code (`js/firebase.js`, Capacitor plugins in `package.json`, `AndroidManifest.xml`):

| Question | Answer |
|---|---|
| Does your app collect or share user data? | Yes |
| Data types collected | Personal info: Name, Email address, Profile photo (via Google/Facebook/Apple sign-in) · App activity: In-app actions (gameplay/progress) · App info and performance: Crash logs (if Firebase Crashlytics is enabled — confirm) |
| Is data encrypted in transit? | Yes (Firebase uses HTTPS/TLS) |
| Can users request data deletion? | Yes |
| Is data shared with third parties? | No (Firebase is your backend processor, not a third-party data recipient in Play's sense) |
| Is the app's target audience children? | No — see Target Audience section below |

⚠️ I did not find an ads SDK or analytics SDK in `package.json`/manifest — if you've added Firebase Analytics or any ad network since, that changes these answers. Double-check before submitting.

---

## 4. Content Rating Questionnaire — important flag

This app uses **simulated gambling mechanics** (betting virtual chips, video poker hands) with **no real money**. Google Play's content rating questionnaire has a specific "Simulated Gambling" category for exactly this. Answering it accurately matters because:
- It affects the age rating (usually pushes to Teen/16+ or higher depending on region, even with no real money).
- Some countries restrict or outright block simulated-gambling apps regardless of rating.

Suggested answers to the relevant questionnaire prompts:
- "Does the app contain simulated gambling?" → **Yes**
- "Can users wager or bet virtual currency/chips that were purchased with real money?" → answer based on whether chips can ever be bought with real money in your app (per FEATURES.md, currently free-chips-only, no purchases) → **No**, if that's still accurate.

I'm flagging this rather than answering it silently because it's a real compliance decision — please confirm the "no real-money purchases" fact is still true before I help fill this in.

---

## 5. Target Audience

Given the simulated gambling content, target audience should exclude children:
- Suggested minimum target age: **18+** (many jurisdictions require this for simulated gambling apps regardless of "no real money" framing)
- Do NOT select "designed for children" or include child-appeal elements.

---

## 6. Sign-in details

- Is login required to access the app? **No** — core gameplay is fully playable without signing in (native apps have a "Continue as Guest" option; only the web build requires Google sign-in to finish onboarding).
- Does the app have restricted access requiring credentials? **No.**
- If Play Console still requests reviewer credentials: sign in with any Google account via the in-app "Sign in with Google" button — no special test account is needed since there's no gated content.

## 7. Ads

Does your app contain ads? **No** — confirmed, no ad SDK (AdMob or otherwise) anywhere in the codebase.

## 8. Financial features

Does your app include purchases of digital goods or facilitate real-money transactions? **No** — confirmed, no billing/IAP SDK present. Chips are free and cannot be purchased with real money.

## 9. Government apps

Is this a government app? **No.**

## 10. Health

Does your app provide health-related services or content? **No.**

## Status

- ✅ Privacy policy hosted live at https://micorlov.github.io/video-poker-game/privacy-policy.html
- ✅ Confirmed via codebase: no ads SDK, no analytics/Crashlytics, no IAP/billing SDK, sign-in is Google + Facebook only (Apple Sign-In package is an unused dependency — removed the misleading Apple mention from the privacy policy).
- ⏳ Everything above still needs to be pasted into Play Console by you — Google sign-in for Play Console itself requires your credentials, which this session won't handle.
