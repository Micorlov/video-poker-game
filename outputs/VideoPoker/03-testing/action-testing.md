# Testing Action Checklist: Video Poker: Jacks or Better (Google Play)

Prepared 2026-10-14 (day 0 of 3.0). Companion to `ab-test-setup.md`. Nothing here has been started.

## P0: before any test (this week)

- [ ] **Pull real traffic numbers** from Play Console, Statistics, Store listing acquisition (last 28 days): store listing visitors per day, installers, conversion rate, and the split between search and explore. Replace the 10 to 25 visitors per day assumption in `ab-test-setup.md`.
- [ ] **Decide what counts as a test.** At under 25 visitors per day, no store listing experiment is runnable (see the power table); use the sequential protocol for every change.
- [ ] **Fix the experiment config** in `play-store-assets/aso-experiments.json`: delete `variant-led`, `social-led` ("live leaderboards" is false) and `free-play-led` ("free chips, no ads" is the flagged wording); fix the feature-graphic entry that compares the live file with itself; remove the dangling icon candidates; drop the empty `description-opening-01`. Corrected definition is in `ab-test-setup.md` section 3.
- [ ] **Create the rank log** (table in `ab-test-setup.md` section 6) and record the 2026-10-14 row.
- [ ] **Freeze the listing between changes.** Write the planned change calendar (block 0 to 3 in section 6) so nothing else touches the listing during a measurement window.

## P1: measurement routine

- [ ] **Rank readings** every Monday and Thursday for the 13 queries in `action-research.md` (web search, `gl=us`), saved with the date, plus the local queries listed there. Treat moves of 3 places or fewer as noise.
- [ ] **Weekly Play Console export** (visitors, installers, conversion, ratings, installs by country). Add the numbers to the log.
- [ ] **Search terms export** on about 2026-10-28 (14 days after 3.0).
- [ ] **Re-measure on 2026-10-21, 10-28 and 11-04** to see whether the 3.0 binary changed ranks before attributing anything to the metadata.
- [ ] **Record confounders** in every log row: releases, community posts, friends-seed days, rating arrivals, competitor updates.
- [ ] **Exclude seeded installs** from conversion comparisons where possible (friends and family convert differently and are enough to swing a small sample).
- [ ] **Count ratings and review text weekly**; copy recurring user wording into captions.

## P1: tests in order (only when the precondition holds)

| # | Test | Precondition | Type | Detectable lift needed |
|---|---|---|---|---|
| 1 | Short description: `trainer-led` vs the live text | At least 25 visitors per day for 7 days; both texts compliant | Localized experiment en-US, else sequential block 2 | 50% or more |
| 2 | Screenshot order and captions (offline lead, hints in slot 2) | Tournament pill removed from the frames; new frames verified against the code | Default graphics experiment, else sequential block 1 | 50% or more |
| 3 | Icon concept (royal-flush fan vs the card-fan control) | Control icon decided (clean mark); traffic condition above | Default graphics experiment | 30% or more only with at least 100 visitors per day |
| 4 | Title Alternate A | 2026-11-04 gate passes | Sequential only (titles cannot be tested) | rank-based |

- [ ] Each test: write the stop rule (visitors per arm, minimum 14 days) before starting; do not stop early on a good-looking interval.
- [ ] Each test: record start, end, control, variant, visitors per arm, installs per arm, interval, decision, follow-up in `ASO-MEASUREMENT.md`.

## P2

- [ ] **Five-second tests** with 10 to 20 new people on the icon plus first two screenshots (also catches the tournament-pill cue).
- [ ] **Re-run the power table** when traffic changes: at 100 visitors per day a 14-day test can detect about +30%.
- [ ] **Localized experiments** for the biggest non-English markets once any locale has 25 visitors per day on its own (unlikely soon; sequential logging is the fallback).
- [ ] **Add a banned-term check to `scripts/validate-aso.js`** so a flagged variant cannot be committed again.
- [ ] **Compare the sequential results against any experiment you do manage to run** to learn how reliable the before/after method is for this app.

## Stop and escalate conditions

- [ ] "video poker" or "jacks or better" drops more than 5 places for two consecutive readings after a change: revert the change.
- [ ] Play Console shows a metadata policy warning on the listing: stop all changes, resolve the warning first.
- [ ] Conversion falls to under half of the 14-day baseline for two weeks after a change: revert.
