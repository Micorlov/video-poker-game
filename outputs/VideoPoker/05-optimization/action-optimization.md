# Action List: Ongoing Optimization, Video Poker: Jacks or Better

Details: `ongoing-tasks.md` (cadence and KPIs) and `review-responses.md` (reply templates). Owner: Michael.

## Set up once (by 2026-10-21)
- [ ] Turn on Play Console notifications for new reviews, vitals alerts and policy messages.
- [ ] Extend the Rank log header in `PLAY_STORE_LISTING_DRAFT.md` (add trainer, offline, change-since-last-row, method), and add the 2026-10-14 row.
- [ ] Create `outputs/VideoPoker/05-optimization/ranks/` for the dated 13-query and local readings.
- [ ] Save the rank one-liner from `ongoing-tasks.md` as a local script, or keep it in a note.
- [ ] Fix the Play API key path so `verify-play-listing.js` runs (submission-guide §1). Until then, don't run `fetch-play-stats.js` locally.
- [ ] Ask a dev session to add a "live leaderboard / rooms / cloud" banned-claims check to `scripts/validate-aso.js`.
- [ ] Copy the `review-responses.md` templates somewhere you can paste from on the phone (Play Console app).

## Daily
- [ ] Reply to every new review within 24 hours. Tag its theme.
- [ ] Read new crash/ANR clusters (daily until 2026-10-28, weekly after).
- [ ] During a staged rollout: apply the 48-hour ramp rule.

## Every Wednesday
- [ ] Rank check: 13 en-US queries plus the local set. Log the row with its "change since last row".
- [ ] Fill one `play-store-assets/ASO-MEASUREMENT.md` row (visitors, acquisitions, conversion vs peer median, DAU, uninstalls, ratings).
- [ ] Review-theme tally. Any theme with 3 or more in 7 days goes into the next release.
- [ ] Experiment status (impressions, confidence). Never stop one before day 14.
- [ ] Decide whether this week's single en-US change is allowed (7-day rule).

## Dated optimization moves (from `04-launch/timeline.md`)
- [ ] 2026-10-21 · Rank re-measure #1 (the 3.0 binary effect).
- [ ] 2026-10-28 · Rank re-measure #2 and the first Search terms export. Replace the estimated demand tiers.
- [ ] 2026-10-29 · en-US full-description keyword pass (trainer, strategy, offline, double up, complete paytable).
- [ ] 2026-11-02 · Monthly review #1: ASO health score (baseline 41.2), competitor re-fetch, listing integrity.
- [ ] 2026-11-05 → 11-26 · Experiment #1 (one element, from `03-testing`).
- [ ] 2026-11-09 · Localized long-tail additions and the pt-BR title decision.
- [ ] 2026-11-15 · 30-day KPI checkpoint (≥ 5 ratings, average ≥ 4.3, JoB ≤ 3, video poker ≤ 17, trainer ≤ 20).
- [ ] 2026-11-18 · Title-test decision (default: postpone to 2027-01-06).
- [ ] 2026-11-23 · Add the promo video.
- [ ] 2026-11-27 → 11-30 · Black Friday community push (UTM `bf2026`). No sale, no metadata change.
- [ ] 2026-12-03 → 12-24 · Experiment #2.
- [ ] 2026-12-07 · Monthly review #2.
- [ ] 2026-12-15 · 60-day KPI review (≥ 10 ratings, video poker ≤ 15, trainer ≤ 15, conversion ≥ peer median). Write the Q1 plan.
- [ ] 2026-12-24 → 2027-01-01 · Freeze: no listing or binary changes, monitoring and replies only.

## Review hygiene (policy guardrails)
- [ ] Never offer chips or anything else for a rating or a changed rating.
- [ ] Never ask for a specific star value. Fix `01-friends-seed.md` before you reuse it.
- [ ] Never claim the cards are "random", "fair" or "certified" (because of the engagement-tuning boost).
- [ ] Never promise dates for unbuilt features. Edit the reply when a fix ships.
- [ ] No "free", "no ads", "100%", "#1" in any title or short description, in any locale.

## Monthly
- [ ] Search terms export, which feeds `keyword-list.md`.
- [ ] `validate-aso.js` + `verify-play-listing.js` + the accuracy grep.
- [ ] Data safety vs `build.gradle.kts` dependencies.
- [ ] Competitor watchlist (15 packages).
- [ ] `aso_scorer.py` score logged; trend vs last month.
- [ ] Experiment decision and the next one queued.

## Quarterly (first week of Jan / Apr / Jul / Oct)
- [ ] Full keyword refresh (en-US + 7 priority locales + the 8 unmeasured ones).
- [ ] Localization ROI and the es-419 decision.
- [ ] Title review ("deuces wild").
- [ ] Product-for-ASO list (9/6, DDB, 10-hand, live leaderboards back).
- [ ] Policy re-read (Ratings & Reviews, Metadata, Simulated gambling, Data safety, Account deletion).
