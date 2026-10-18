# Action Plan: The 10 Most Important Steps (Video Poker, Google Play)

Date: 2026-10-14 · Package: `com.micorlov.videopoker` · 3.0.0 (versionCode 15) was submitted to production today.
Full detail for each step is in `00-MASTER-ACTION-PLAN.md` and the folders `01-research` to `05-optimization`. The publish-ready patches (`listings-patch*.json`) are in `02-metadata/`.

## Schedule at a glance

| Date | What happens |
|---|---|
| Oct 14–18 | Steps 1–5: compliance and accuracy fixes, prepare 3.0.1 |
| Oct 19 | Step 6: translated short descriptions go live |
| Oct 20–24 | Step 7: staged rollout of 3.0.1 |
| Oct 21, Oct 28, Nov 4 | Step 8: rank checks (and the title review on Nov 4) |
| By Dec 15 | Steps 9–10: measured changes and collecting ratings |

## Phase A: Compliance and accuracy fixes (this week)

### 1. Privacy policy and Data safety form, before 3.0.1 is submitted
- [ ] Add Google Analytics and the advertising ID to `privacy-policy.html`.
- [ ] Remove Facebook sign-in, rooms and cross-device sync from it (none exist in 3.0).
- [ ] Update Data safety in Play Console: Analytics and Device IDs; make sure the advertising ID declaration says Analytics.
- Why first: this is the highest risk of a rejection or takedown.

### 2. Account deletion inside the app
- [ ] Add a delete-account link in Settings (Play requires it once users can sign in with Google).
- [ ] Add the deletion URL to the Data safety form.

### 3. Fix the rating prompt for returning players
- [ ] In 3.0.1, don't stamp `firstDay` for users upgrading from the old app (legacy WebView directory).
- [ ] Add to the release notes: "progress from before 3.0 starts fresh".
- The problem: old saves aren't migrated, so returning players look new, and their first win opens the rating sheet right after they lost their progress.

### 4. Remove claims the app no longer backs up
- [ ] Onboarding text "Sign in to back up your chips".
- [ ] The `ob_also_live` string ("Also live: … tournaments") and the static tournament pill.
- [ ] 3.0 release notes that say live leaderboards and rooms are "paused / coming back".
- [ ] Confirm in Play Console which launcher icon is live (the 3.0 icon differs from `play-store-assets/icon_512.png`).

### 5. Stale tablet screenshots
- [ ] Remove the en-US 7" and 10" sets in Play Console (old web UI, shows "Live leaderboards"), or reshoot them from the native app per `02-metadata/visual-assets-spec.md`.

## Phase B: Fix the listing and ship

### 6. Translated short descriptions, Oct 19
- [ ] Get a native speaker to review Hebrew and Arabic (required) and seven other locales (recommended).
- [ ] Apply `02-metadata/listings-patch.json` (15 locales, 47–79 characters, no "live", no promo words).
- [ ] Run validate first, then commit (`04-launch/submission-guide.md`).
- This doesn't touch en-US, so the Oct 21 rank check stays clean.

### 7. Staged rollout of 3.0.1
- [ ] Oct 19: build, internal track, read the pre-launch report.
- [ ] Oct 20: 20% in production.
- [ ] Oct 22: 50% if Android vitals is clean; check `first_open` and `hand_completed` in GA4.
- [ ] Oct 24: 100% if there are no new crash clusters.

## Phase C: Measure and improve

### 8. Rank checks every Wednesday
- [ ] Same method every time: US search, `gl=us&hl=en`, the 13 en-US queries plus local ones (list in `05-optimization/ongoing-tasks.md`).
- [ ] First checks: Oct 21 and Oct 28 (on Oct 28 also read Search terms in Play Console).
- [ ] Add a row to the rank log in `PLAY_STORE_LISTING_DRAFT.md` and the weekly dashboard in `play-store-assets/ASO-MEASUREMENT.md`.
- Baseline: "jacks or better" #3 · "video poker" #17 · "deuces wild" outside top 30 · "video poker trainer" #30.

### 9. One change at a time, at least a week apart
- [ ] Keep the title "Video Poker: Jacks or Better". Review it again on Nov 4 (Play can't A/B-test titles).
- [ ] New en-US full description (3,209 characters, opens with "Offline video poker trainer") via `listings-patch-full-offline.json`, only after the Oct 28 reading is clean.
- [ ] Skip Play A/B experiments: at 10–25 visitors a day they can only detect a +60–95% lift.
- [ ] Clean `play-store-assets/aso-experiments.json`: delete `variant-led` and `social-led` (claim "live leaderboards") and `free-play-led` (wording Play flagged before).

### 10. Ratings from users, the biggest gap
- [ ] Rewrite `play-store-assets/01-friends-seed.md` before sending it: no "5 stars" request, no keyword coaching.
- [ ] Rely on the in-app rating prompt (3-win streak or first-day win), after the step 3 fix.
- [ ] Reply to every review within 24 hours using `05-optimization/review-responses.md` (replies are capped at 350 characters).
- Target by Dec 15: at least 10 ratings averaging 4.3 or higher.

## Targets for Dec 15, 2026

| Metric | Target | Today |
|---|---|---|
| Ratings | at least 10, average 4.3+ | 0 |
| "jacks or better" | top 3 | #3 |
| "video poker" | top 15 | #17 |
| "video poker trainer" | top 15 | #30 |

## Before you run any publish script
- The publishing service account gets a 403 on listing edits, and the key file most scripts read is missing on this Mac.
- `scripts/play-native-release.js` re-uploads all store text and screenshots on every release, so edits made only in the Console get reverted.
- Three older scripts would push 2.x screenshots and release notes. Don't run them.
- `outputs/` is not gitignored; keep `01-research/raw-data/` (24 MB) out of commits.

## Notes
- Rankings and figures were measured on 2026-10-14. Google publishes no search volumes, so demand levels are estimates.
- The non-English copy was written without native-speaker review.
