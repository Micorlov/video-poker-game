# Play Console Listing — LIVE state

> **2026-09-09 — ASO pass shipped.** Everything in section 1 is **live on Google Play** in all
> 16 locales, pushed with `node scripts/play-listing-upload.js commit` from
> `play-store-assets/listings.json` (the single source of truth for store text — edit that file,
> not this one, then re-run the script). Screenshots (6 per locale), the en-US tablet sets and the
> new 1024x500 feature graphic went up with `node scripts/store-screenshots/upload.js commit`.
> App release 2.6 (versionCode 11) was submitted to the production track on 2026-09-23 via
> `node scripts/play-release-upload.js commit` (2.5 / versionCode 10 before it); rollout status "completed"
> means Google review then 100% rollout. Release notes live in that script, 16 languages.
>
> **Why the rewrite:** the app had 10+ downloads and zero ratings. It already ranked #5 in the US
> for "jacks or better" and #29 for "video poker", so discovery was not the bottleneck —
> conversion was. The old short description repeated the title instead of spending its 80
> characters on Deuces Wild / Bonus Poker / multi-hand, the four variants were never named in the
> full description, and the feature graphic claimed "14 languages" when the app has 16.
>
> **Search positions at the time of the rewrite (US, 2026-09-09):** "jacks or better" #5 ·
> "video poker" #29 · "deuces wild" not indexed. Re-check weekly and log below.

> **2026-09-23 — offline-led ASO copy LIVE on Google Play (from "ASO Plan: Video Poker & Blackjack 21").** en-US short and
> full description below rewritten to lead with "offline" and name every variant + multi-hand in the first 250
> characters. Claims from the plan that were dropped because the code disproves them: "9/6 Jacks or Better"
> (`js/hand-eval.js` pays 7/5), "full-pay tables for every variant", and "portrait or landscape" (the manifest is
> portrait-only). The plan's short descriptions began with "Free" / "no forced ads", which is the exact wording the
> 2026-09-09 promotion-eligibility flag below was about, so both were rewritten without price/promo words.
> Live en-US short description at the time was "Classic video poker: Jacks or Better, Deuces Wild, multi-hand play,
> leaderboards" (set outside this repo; the other 15 locales matched the file). A/B alternative for the short
> description: "Offline video poker: Jacks or Better, Deuces Wild, Triple Play. No wifi needed" (78).
> Pushed the same day with `node scripts/play-listing-upload.js commit` (all 16 locales in one edit; only en-US changed).
> Blackjack 21: Big Cards got its own offline-led en-US listing the same day (source: `~/blackjack21_v2/play-assets/listing-en-US.json`).

## Rank log

| Date | jacks or better | video poker | deuces wild | Ratings |
|---|---|---|---|---|
| 2026-09-09 (before) | 5 | 29 | — | 0 |

---

## 1. Store Listing

> **Play policy note (2026-09-09).** Play Console flags a short description that "uses keywords
> that indicate price or promotion" and makes the app ineligible for Google Play promotion. The
> old text ("No ads, 100% free!") tripped it, so the short description in every locale now names
> the variants and modes instead and carries no price or promotional wording. "No ads" is still
> allowed in the full description, the screenshots and the feature graphic, and stays there. The
> Console banner does not re-evaluate as you type; it reflects the published listing.


**App name (store title, 28/30 chars):** Video Poker: Jacks or Better

**Short description** (max 80 chars):
```
Offline video poker: Jacks or Better, Deuces Wild, multi-hand. No wifi needed
```
(77 chars)

**Full description** (max 4000 chars):
```
Offline video poker with four classic casino games and multi-hand play. Jacks or Better, Deuces Wild, Bonus Poker and Double Bonus, in single hand, Triple Play or Five Play. No wifi needed, no ads, no real money.

PLAY VIDEO POKER OFFLINE
No internet? Deal anyway. Every game, paytable and daily bonus works with no wifi and no mobile data, and your chips and stats are saved on your phone after every hand.

FOUR CLASSIC VIDEO POKER GAMES
• Jacks or Better – the classic video poker game, ready from your first hand
• Deuces Wild – every 2 is wild; chase Four Deuces and the Wild Royal Flush
• Bonus Poker – bigger payouts for Four Aces and low quads
• Double Bonus Poker – premium four-of-a-kind pays for high-variance play
New variants unlock as you level up, so there is always a next goal.

MULTI-HAND VIDEO POKER
Play one hand, Triple Play (3 hands) or Five Play (5 hands) from a single deal. Hold once, draw across every hand, the way the multi-hand machines in Las Vegas work.

REAL CASINO PAYTABLES
A full paytable for every variant, always on screen. Turn on strategy hints to learn which cards to hold and watch your win rate climb.

FREE CHIPS EVERY DAY
Daily chip bonus, the daily ALL IN mega-bet, win streaks with payout bonuses up to +50%, and levels that unlock new variants and multi-hand modes. Free to play, no purchases, no ads, and a free rebuy when you run out means you never go bust.

PLAY WITH FRIENDS
Live hourly and daily leaderboards against every player in the game, a friends leaderboard, and poker rooms where you play at the same table. Sign in with Google or Facebook, invite a friend, and you both earn bonus chips.

BIG, CLEAR CARDS
Large cards and buttons designed for phones and tablets, with one-hand portrait play.

16 LANGUAGES, FULL RIGHT-TO-LEFT SUPPORT
English, Spanish, Portuguese, German, French, Italian, Polish, Russian, Turkish, Indonesian, Hindi, Japanese, Korean, Chinese, Hebrew and Arabic. The game matches your device language automatically.

YOUR PROGRESS, SAFE IN THE CLOUD
Sign in once and your chips, levels and stats are backed up whenever you are online. Switch phones and pick up right where you left off.

Whether you call it video poker, draw poker, 5 card draw or a poker machine, this is the classic Jacks or Better game you know from the casino floor, free and offline.

This game is intended for an adult audience and does not offer real money gambling or any opportunities to win real money or prizes. Practice or success at social casino gaming does not imply future success at real money gambling.
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
