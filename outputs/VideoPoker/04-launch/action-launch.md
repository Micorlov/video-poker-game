# Action List: Relaunch (3.0.x), Video Poker: Jacks or Better

Ordered by date. Details are in `relaunch-checklist.md` (what), `timeline.md` (when) and `submission-guide.md` (how).
Owner: Michael unless it says "dev session".

## This week: 2026-10-14 → 10-18
- [ ] 10-14 · Add the baseline row to the rank log in `PLAY_STORE_LISTING_DRAFT.md` (JoB 3, video poker 17, deuces wild —, trainer 30, ratings 0, method).
- [ ] 10-15 · Confirm the 3.0.0 review and go-live time. Note whether it went out at 100%.
- [ ] 10-15 · Android vitals: read every crash/ANR cluster (repeat daily to 10-28).
- [ ] 10-15 · Turn on Managed publishing and review email notifications.
- [ ] 10-15 · Data safety: add Analytics (App interactions, Device or other IDs) and check the account-deletion URL. Confirm the Advertising ID declaration says "Analytics".
- [ ] 10-16 · Dev session, 3.0.1 hotfix scope: (1) skip `firstDay` stamping for upgraders with legacy `app_webview` data; (2) fix the onboarding "back up your chips" copy; (3) add a delete-account link in Settings; (4) add the progress-reset line to `release-notes.json`.
- [ ] 10-16 · Update and deploy `privacy-policy.html` (Analytics, advertising ID; remove Facebook, rooms and sync; fix the app name).
- [ ] 10-16 · Remove the stale en-US 7"/10" tablet screenshots ("Live leaderboards").
- [ ] 10-17 · Rewrite `play-store-assets/01-friends-seed.md`: an honest rating in their own words, no "5 stars", no keyword coaching.
- [ ] Daily · Reply to every review within 24 hours (`05-optimization/review-responses.md`).

## Week 1: 10-19 → 10-25
- [ ] 10-19 · Publish the 13 localized short-description fixes ("live" → offline term): validate-aso → listing `validate` → git commit → `commit` → verify.
- [ ] 10-19 · Fix the credentials: grant play-publisher "Manage store presence", and symlink the key to `~/.config/mcp/google-play-service-account.json` (or use the Console UI fallback).
- [ ] 10-19 · 3.0.1 → internal (`PLAY_TRACK=internal node scripts/play-native-release.js validate`, then `commit`) → read the pre-launch report.
- [ ] 10-20 · Promote 3.0.1 to production at **20%**.
- [ ] 10-21 · **Rank re-measure #1.** Log it, and fill the first `ASO-MEASUREMENT.md` row.
- [ ] 10-21 · Record DAU/MAU against the pre-3.0 week (upgrader churn).
- [ ] 10-22 · 3.0.1 → 50%. Confirm GA4 events arrive (DebugView / Realtime).
- [ ] 10-24 · 3.0.1 → 100%.
- [ ] 10-24 · Test the invite referrer end to end on the real phone (fresh install with `referrer=ref%3D<CODE>`).
- [ ] Week 1 · Check country availability for Turkey.

## Week 2: 10-26 → 11-01
- [ ] 10-28 · **Rank re-measure #2.** Export Search terms (14 days). Update the demand tiers in the research.
- [ ] 10-29 · Publish the en-US full-description keyword pass (trainer, strategy, offline, double up, "complete paytable").
- [ ] 10-29 · Refresh `02-reddit-posts.md` / `03-facebook-groups.md` for 3.0, then post r/videopoker with a UTM tag.

## Weeks 3-5: 11-02 → 11-22
- [ ] 11-02 · Monthly review #1 (`ongoing-tasks.md`).
- [ ] 11-04 · 3.0.2 save migration → internal → 20% staged.
- [ ] 11-05 · Start experiment #1 (per `03-testing`), running to 11-26.
- [ ] 11-09 · Publish localized long-tail descriptions and the pt-BR title (if approved).
- [ ] 11-15 · 30-day KPI checkpoint.
- [ ] 11-18 · Title-test decision (default: postpone to 2027-01-06). Record the promo video.

## Weeks 6-9: 11-23 → 12-15
- [ ] 11-23 · Add the promo video URL (en-US).
- [ ] 11-26 · Read experiment #1. Apply the winner only at ≥ 90% confidence.
- [ ] 11-27 → 11-30 · Black Friday community posts (`utm_campaign=bf2026`). Check eligibility for Promotional content.
- [ ] 12-03 · Start experiment #2 (runs to 12-24).
- [ ] 12-07 · Monthly review #2 and competitor re-fetch.
- [ ] 12-15 · 60-day KPI review. Write the Q1 plan.

## Done when
- [ ] 0 open P0 items in `relaunch-checklist.md`.
- [ ] `verify-play-listing.js` reports all 16 locales `ok`, phone screenshots = 6, and tablet sets either native or removed.
- [ ] 3.0.1 or later at 100% with no open crash cluster, and the Data safety form matches the SDKs.
- [ ] At least 5 ratings, all replied to.
