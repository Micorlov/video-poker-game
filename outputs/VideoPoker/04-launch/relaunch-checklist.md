# Relaunch Checklist: Video Poker 3.0 (native) on com.micorlov.videopoker

**Written:** 2026-10-14 (day 0). 3.0.0 (versionCode 15) was submitted to production today.
**Platform:** Google Play only. Personal account "Orlov Games". Solo developer.
**Situation:** the listing is live with 100+ installs and 0 ratings. This is a relaunch: a native Kotlin binary replaces the Capacitor app on the same package. It is not a first launch.
**Status:** 9 of 49 items are verified done from the repo. The other 40 need a Play Console check, a copy edit or a decision.

Legend: `[x]` = verified in the repo today. `[ ]` = open. **P0** = do before 3.0.1 ships, or this week. **P1** = before 2026-10-28. **P2** = before 2026-11-30.
Evidence paths are relative to `/Users/micorlov/Documents/GitHub/VideoPoker/`.

---

## Phase 1: Release and rollout control

- [ ] **P0. Confirm the 3.0.0 review outcome** in Play Console → Publishing overview. Updates on an established listing usually clear in hours to 3 days; personal accounts can take up to 7. Note the "Available on Google Play" timestamp in the rank log. It is the real day 0 for ranking.
- [ ] **P0. Write down the rollout state of 3.0.0.** `scripts/play-native-release.js` sets `status: 'completed'`, which means 100% with no staged rollout. If 3.0.0 was promoted at 100%, you can't move it back to a staged percentage. If a crash wave appears, the fix is a new versionCode. Play Console also lets you halt a fully rolled-out release; check that the button is there before you need it.
- [ ] **P1. Ship 3.0.1 (versionCode 16, Analytics) as a staged rollout: 20% → 50% → 100%** over about 5 days. With ~100 users the percentages won't give you statistics. The value is the **Halt** button. The script only does `completed`, so either choose the percentage in the Console when you promote from internal, or add `status: 'inProgress', userFraction: 0.2` to the script in a separate change.
- [ ] **P1. Turn on Managed publishing** (Publishing overview) for the 3.0.x period. A listing change and a binary then go live together, when you click Publish. Approval no longer means auto-publish.
- [ ] **P1. Read the pre-launch report** for the 3.0.1 internal-track build (Release → Testing → Pre-launch report). Look for crashes, accessibility, and the Robo screenshots on small and large screens. It is free device coverage you don't otherwise have.
- [x] versionCode 16 / versionName 3.0.1 is set in `android-native/app/build.gradle.kts` (not submitted yet).

## Phase 2: Stability (Android vitals)

- [ ] **P0. Check Android vitals → Crashes and ANRs daily until 2026-10-28.** At this install count the **rate** charts will say "not enough data". Open the **cluster list** and read every stack trace. One crash is a real signal at this size.
- [ ] **P0. Compare against Play's bad-behaviour thresholds** once rates appear: user-perceived crash rate < 1.09%, user-perceived ANR rate < 0.47%. Going over either can reduce visibility.
- [ ] **P1. Watch the startup paths a Capacitor-to-native upgrade could break:** first launch after the update, `LinkIntake.readInstallReferrer`, Google sign-in on the Friends tab, the notification permission prompt on Android 13+, and the RTL locales (iw-IL, ar).
- [ ] **P2. Decide about crash reporting.** The app has no Crashlytics, so vitals is the only crash source. Adding Crashlytics changes the Data safety form ("Crash logs"). Update the form in the same release.

## Phase 3: Upgrader experience (the biggest review risk)

- [ ] **P0. Accept and document that 2.x saves are NOT migrated.** Upgraders lose chips, levels and **unlocked variants**: Triple/Five Play unlock at level 10, and other variants unlock by level. Expect "lost my progress" reviews from the existing ~100 installs. Templates: `05-optimization/review-responses.md` §3.
- [ ] **P0. Stop the rating prompt from targeting upgraders on their first day.** `GameViewModel.stampFirstDay()` stamps `firstDay` when `lifetimeHands == 0`. An upgrader has no native save, so they look like a fresh install, and a win on update day triggers the Play review sheet (`ReviewPolicy.isFirstDayWin`). That is the moment they've just lost their progress. Fix this in 3.0.1: don't stamp `firstDay` if legacy WebView data exists, e.g. `File(context.dataDir, "app_webview")`. This is a code change, so it goes to the dev session, not this audit.
- [ ] **P0. Fix the onboarding copy "Sign in to back up your chips"** (`strings.xml` `ob_sign_in_sync`). Native 3.0 has no cloud save, so the claim is false and invites "my backup didn't work" reviews. Say what sign-in does today: friends and today's leaderboard.
- [ ] **P1. Schedule the save-migration session** that was already proposed. It can read the old WebView localStorage, or restore from Firestore for players who signed in on 2.x. Target 3.0.2 by 2026-11-04. Each week without it adds reviews about lost progress.
- [ ] **P1. Add an honest line to the release notes** of the next version (3.0.1 or 3.0.2), e.g. "Progress from versions before 3.0 starts fresh; restoring it is coming." Keep each locale ≤ 500 chars. en-US is at 391/500 today.
- [ ] **P2. Optional goodwill grant for upgraders** detected by legacy data: a one-time chip grant with a "Welcome to 3.0" toast. It must never be tied to rating or reviewing.

## Phase 4: Listing consistency with native features

- [x] en-US title, short description and full description describe native 3.0 (friends leaderboard, exact hints, double up; no rooms, cloud or Facebook). Source: `play-store-assets/listings.json`.
- [x] 6 native phone screenshots per locale × 16 in `android-native/store-assets/phone/<locale>/`, uploaded by `play-native-release.js`.
- [x] Feature graphic ("Video Poker, no ads." / JoB, DW, Bonus Poker, 16 languages) is accurate for 3.0. Same file in both asset folders.
- [x] `node scripts/validate-aso.js` passes (16 listings, 5 experiments, 16 caption locales), run 2026-10-14. **It does not catch "live leaderboards".** Add that check, because it would have caught the next item.
- [ ] **P0. Rewrite 13 localized short descriptions that still say "live" leaderboards** (es-ES, pt-BR, de-DE, fr-FR, it-IT, pl-PL, ru-RU, tr-TR, hi-IN, ja-JP, ko-KR, zh-CN, ar). Also check id and iw-IL. Swap in the local "offline / no internet" term (research §8). Owner of the copy: `02-metadata`.
- [ ] **P0. Replace or remove the en-US 7" and 10" tablet screenshots.** `play-store-assets/tablet7/` and `tablet10/` are 2026-09-09 web-build captures. Slide 5 says "Live leaderboards. Beat your crew." over Hourly/Daily global boards that 3.0 doesn't have. `play-native-release.js` doesn't touch tablet sets, so they are still live unless removed by hand. Remove them in the Console, or reshoot from native on a tablet emulator.
- [ ] **P0. Check the localized full descriptions** for rooms, hourly/global leaderboards, Facebook and cloud-backup claims (research found 0/15 mention offline; the claims were rewritten in 5be033d). Run `node scripts/verify-play-listing.js` (needs credentials, see submission-guide §1). It should show `ok` in all 16 rows.
- [ ] **P1. Reword "A full paytable for every variant"** to "The complete paytable…" (the table is 7/5, so avoid matching "full pay" searches).
- [ ] **P1. Check the 512 store icon.** `play-store-assets/icon_512.png` and `android-native/store-assets/icon_512.png` differ, and the native launcher now uses the "blonde" Play art. Confirm the store icon matches the new launcher icon, so upgraders recognise the app on their home screen.
- [ ] **P2. Record the 30-second gameplay promo video** from native 3.0, as a YouTube URL in the listing (outstanding since the GROWTH-PLAN).

## Phase 5: Release notes (16 languages)

- [x] `android-native/store-assets/release-notes.json` has 16 locales, all ≤ 500 chars (longest: id at 469). `play-native-release.js` refuses to run if a locale is missing.
- [x] The 3.0 notes say live leaderboards and rooms are "paused while we rebuild them". That's honest. Don't promise a date in replies.
- [ ] **P1. Write 3.0.1 notes before you promote it.** The script re-sends whatever is in `release-notes.json`. If it is unchanged, 3.0.1 repeats the 3.0 text, which is acceptable but misses the progress-reset line from Phase 3.

## Phase 6: Ratings and reviews

- [x] In-app review exists: Play sheet first, then up to 3 "Enjoying Video Poker?" cards with a 7-day cooldown. It is earned by a 3-win streak, a first-day win, or level 3 (`domain/ReviewPolicy`). One ask per session.
- [ ] **P1. Change the card title to a statement**, e.g. "Rate Video Poker on Google Play". Play's in-app review guidelines say not to ask an opinion question ("Do you like the app?") before the rating button. The card doesn't gate on the answer, so this is low risk, but cheap to fix.
- [ ] **P0. Edit `play-store-assets/01-friends-seed.md` before you send it again.** It asks friends to "Rate 5 stars" and to put "video poker" / "no ads" into their review text. Asking for a specific star value and scripting keywords is review manipulation under Play's Ratings & Reviews policy. Reviews from close contacts may also be filtered. Ask for "an honest rating, in your own words", and drop the keyword line.
- [ ] **P0. Reply to every review within 24 hours** (`05-optimization/review-responses.md`). Play replies are capped at 350 characters, and every template there fits.

## Phase 7: Analytics, attribution, deep links

- [ ] **P0. Note the analytics gap.** 3.0.0 has no Analytics SDK, so the GA4 stream (Firebase project video-poker-6d665) is silent from the 3.0.0 rollout until 3.0.1 reaches users. Use Play Console statistics for that window.
- [ ] **P1. After 3.0.1 is live:** open Firebase DebugView or GA4 Realtime and confirm `first_open`, `app_open`, `hand_started`, `hand_completed`, `review_card_*` and `invite_shared` arrive from a real device.
- [x] Install referrer is wired: `com.android.installreferrer:installreferrer:2.2`, `link/LinkIntake.kt` (reads `ref` / `join` / `gift` once per install).
- [ ] **P1. Test an invite end to end on a real device.** Use a Play URL with `&referrer=ref%3D<CODE>` from a fresh install, plus the `videopoker://invite?ref=CODE` scheme. Both peers should get the 1,000-chip credit.
- [ ] **P1. Tag every community link with UTM** (`&referrer=utm_source%3D...%26utm_campaign%3D...`) so Play Console → Acquisition reports → UTM tracking can attribute it. The drafts in `02-reddit-posts.md` / `03-facebook-groups.md` already do this.

## Phase 8: Policy and compliance (App content)

- [ ] **P0. Update the Data safety form BEFORE 3.0.1 goes live.** 3.0.1 adds Firebase Analytics and the `AD_ID` permission. Declare: App activity → App interactions (Analytics), Device or other IDs (Analytics), collected, not shared, encrypted in transit. Keep the 3.0.0 entries: Name, Email, User IDs (Google sign-in via Firebase Auth); App activity (friends leaderboard daily profit in Firestore).
- [ ] **P0. Confirm the Advertising ID declaration** says "Yes, used for Analytics". The 629d9ab commit message says it does. Verify in App content.
- [ ] **P0. Update `privacy-policy.html`** (last updated 2026-07-25). It doesn't mention Google Analytics / Firebase Analytics or the advertising ID. It still lists Facebook sign-in, "shared rooms" and "sync progress across devices", none of which 3.0 has. Also align the name ("Royal Video Poker" vs the listing's "Video Poker: Jacks or Better").
- [ ] **P1. Account deletion.** Google sign-in creates a Firebase account. Play requires an in-app path to request account deletion **and** a web URL in Data safety. 3.0 has neither a delete control nor a sign-out button in the UI. Put a "Delete account" link in Settings (an email intent is acceptable), and check the deletion URL field in Data safety.
- [ ] **P1. Re-confirm the content rating questionnaire:** simulated gambling = Yes, no real-money purchases. Target audience 18+. Ads = No. Nothing changed in 3.0, but confirm nothing was reset by the binary swap.
- [ ] **P1. Check country availability for Turkey** (research P0). We are #2 there for "jacks or better" but absent from the "video poker" results.

## Phase 9: Measurement baseline

- [ ] **P0. Add the 2026-10-14 row to the rank log** in `PLAY_STORE_LISTING_DRAFT.md`: JoB 3, video poker 17, deuces wild —, ratings 0. Add the columns "video poker trainer" (30) and "method" (web search, gl=us, hl=en).
- [ ] **P1. Fill the first real row of `play-store-assets/ASO-MEASUREMENT.md`** for the week ending 2026-10-18, from Play Console Statistics: store listing visitors, acquisitions, conversion, ratings.
- [ ] **P1. Export Search terms** (Grow → Store performance → Search terms) on 2026-10-28, once 14 days of 3.0 data exist.

## Phase 10: Off-store channels (stale copy)

- [ ] **P1. Refresh the community drafts before you post.** `02-reddit-posts.md` says "Hourly and daily leaderboards against everyone playing", "live leaderboards" and "PWA wrapped with Capacitor". `03-facebook-groups.md` says hourly/daily leaderboards. All of these are false for 3.0. The new hook is "native rebuild, exact strategy hints, no ads, no IAP".
- [ ] **P2. Check the landing page** (GitHub Pages) and the Blackjack 21 cross-promo row for 3.0-incompatible claims.

---

**Totals:** 49 items · 9 verified done · 40 open (17 × P0, 19 × P1, 4 × P2; some P0s are blocked on Console access).
**Biggest blockers:** the Data safety and privacy policy update before 3.0.1, the upgrader review-prompt timing, and the stale tablet screenshots and localized "live" short descriptions.
**Estimated effort:** P0 about 6-8 hours (Console + copy + one small code change in a dev session). P1 about 8-10 hours spread over two weeks.
