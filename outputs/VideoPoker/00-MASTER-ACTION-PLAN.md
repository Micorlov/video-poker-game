# Master Action Plan: Video Poker: Jacks or Better (Google Play)

Date: 2026-10-14 · Package: `com.micorlov.videopoker` · Scope: Google Play only (no live App Store listing found).
Context: the listing is live, with ~100+ installs and 0 ratings. Native 3.0.0 (versionCode 15) was submitted to production today.
Detail for every item is in the numbered folders. Tick boxes here; the per-phase `action-*.md` files hold the full lists.

## Phase 0: Fix claims the app no longer backs up (do first, this week)

These are accuracy and policy risks, not growth work.

- [ ] **Data safety form + privacy policy** — 3.0.1 adds Google Analytics and the advertising ID. `privacy-policy.html` mentions neither, and still lists Facebook sign-in, rooms and progress sync. Update both *before* 3.0.1 is submitted. (`04-launch/relaunch-checklist.md`)
- [ ] **Delete-account path** — Play requires one once users can sign in with Google. Add a link in Settings in 3.0.1.
- [ ] **Rating prompt hits upgraders** — saves from the old web app aren't migrated, so returning players look like new installs. Their first win opens the rating sheet right after they lost progress. Fix in 3.0.1 (don't stamp `firstDay` for upgraders from the legacy WebView dir).
- [ ] **Onboarding copy** — "Sign in to back up your chips" is false in 3.0; `ob_also_live` says "Also live: … tournaments"; a static "Tournament" pill appears in screenshots. Remove or fix.
- [ ] **Stale tablet screenshots** — the en-US 7" and 10" sets are web-era and show "Live leaderboards". Remove in Console or reshoot natively.
- [ ] **3.0 release notes** — they say live leaderboards and rooms are "paused / coming back". Reword so they promise nothing.
- [ ] **Confirm which launcher icon is live** — the 3.0 launcher icon differs from `play-store-assets/icon_512.png`. Check Console.
- [ ] **Rewrite `play-store-assets/01-friends-seed.md`** before sending it: it asks for 5 stars and coaches keywords, which breaks Play's review rules.

## Phase 1: Research follow-ups (`01-research/`)

Key findings: ranks #3 "jacks or better", #17 "video poker", not in top 30 for "deuces wild" or "video poker trainer". Of 46 video poker apps checked, 38 show ads and 31 sell IAP; no ads / no purchases is the real differentiator.

- [ ] Re-measure ranks **Wed 10-21** and **Wed 10-28** with the same method (US, `gl=us&hl=en`); log rows in `PLAY_STORE_LISTING_DRAFT.md`.
- [ ] Check Play Console → Search terms on 10-28.
- [ ] Verify the unverified localized keyword ideas (ES, PT-BR, DE, RU, TR, ID, JA) against autocomplete.
- [ ] Review the "video poker trainer" niche; ~5 small trainer apps launched Aug–Oct.

## Phase 2: Metadata (`02-metadata/`)

- [ ] **Localized short descriptions (do Mon 10-19):** 13 of 15 non-English short descriptions still claim "live leaderboards" and none mention offline. Apply `02-metadata/listings-patch.json` (all 15 rewritten, 47–79 chars). Native review required for iw-IL and ar, recommended for 7 others. Validate, then commit per `04-launch/submission-guide.md`.
- [ ] **en-US full description:** new 3,209/4,000-char version in `02-metadata/google-metadata.md` (leads with "Offline video poker trainer"). Apply with `listings-patch-full-offline.json` *one en-US change at a time, ≥7 days apart*.
- [ ] Decide whether to keep the new line that states Jacks or Better is the 7/5 table (honest, but optional).
- [ ] **Title:** keep "Video Poker: Jacks or Better" (28/30). Revisit on **2026-11-04**. "Deuces Wild" cannot fit without dropping a keyword that currently ranks, and Play can't A/B-test titles.
- [ ] Optional pt-BR title patch ("Video Poker" instead of "Vídeo Pôquer").
- [ ] Reshoot tablet screenshots; follow `02-metadata/visual-assets-spec.md` (lead with offline, no ads, exact hints, variants).

## Phase 3: Testing (`03-testing/`)

- [ ] At ~10–25 visitors/day a 14-day Play experiment can only detect a +60–95% lift, so use **sequential before/after changes with weekly rank logging** instead.
- [ ] Fix `play-store-assets/aso-experiments.json`: delete `variant-led`, `social-led` (claim "live leaderboards") and `free-play-led` ("free … no ads" is flagged wording). The feature-graphic experiment compares the live file with itself, and the icon candidate files don't exist.

## Phase 4: Release & launch (`04-launch/`)

- [ ] Follow `timeline.md` (dated 10-14 → 12-15) and `relaunch-checklist.md` (49 items, 9 done).
- [ ] 3.0.1: internal track → 20% (10-20) → 50% (10-22) → 100% (10-24) if Android vitals stay clean.
- [ ] Publishing scripts, before you run anything: the publishing service account gets a 403 on listing edits; the key file most scripts read is missing on this Mac; `play-native-release.js` re-uploads all text and screenshots on every release, so Console-only edits get reverted; three older scripts would push 2.x screenshots and release notes — don't run them.

## Phase 5: Ongoing (`05-optimization/`)

- [ ] Weekly (Wednesdays): rank check, Console dashboard row in `ASO-MEASUREMENT.md`, reply to reviews within 24 h (`review-responses.md`; Play caps replies at 350 chars).
- [ ] Monthly: re-evaluate title, keywords, screenshots.

## Targets for 2026-12-15

| Metric | Target |
|---|---|
| Ratings | ≥10, average ≥4.3 |
| "jacks or better" | top 3 (now #3) |
| "video poker" | top 15 (now #17) |
| "video poker trainer" | top 15 (now #30) |
| Health score | 41.2/100 at start (conversion unknown, entered as 0) |

## Caveats

- Rankings and competitor figures were measured on 2026-10-14 (day 0 of 3.0). Google publishes no search volumes, so demand levels are estimates.
- Non-English copy was written without native review. Don't publish iw-IL or ar before someone fluent reads them.
- Nothing was uploaded to Play Console and no repo file outside `outputs/` was changed.
- `outputs/` is untracked and not gitignored; keep `01-research/raw-data/` (24 MB) out of commits.
