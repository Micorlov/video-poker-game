# ASO Audit: Final Report (Video Poker: Jacks or Better)

Date: 2026-10-14 · Google Play only · Start with `00-MASTER-ACTION-PLAN.md`.

## Where the listing stands
- Ranks (US, day 0 of native 3.0): #3 "jacks or better", #17 "video poker", not in the top 30 for "deuces wild" or "video poker trainer".
- Weak points: 0 ratings (top-10 competitors average 4.54 from ~17,000 ratings) and only 100+ installs.
- Strength: of 46 video poker apps checked, 38 show ads and 31 sell in-app purchases. This app has neither.

## What the audit found
1. **Listing claims are out of date.** 13 translated short descriptions still say "live leaderboards" and none mention offline, although people search the local words for offline in all 7 priority markets. Tablet screenshots and 3.0 release notes also promise features the native app lacks.
2. **Compliance gaps before 3.0.1:** privacy policy and Data safety form don't cover Google Analytics or the advertising ID, and there is no in-app account deletion.
3. **Rating prompt risk:** upgraders from the old web app (progress not migrated) look like new users and may be prompted right after losing their progress.
4. **Keep the title for now.** It produces both measured rankings. Revisit 2026-11-04.
5. **A/B tests are underpowered** at this traffic; use sequential changes with weekly rank logs.
6. **`01-friends-seed.md` breaks Play's review rules** and must be rewritten before use.

## Deliverables
| Folder | Contents |
|---|---|
| `01-research/` | keyword-list, competitor-gaps, action-research (+ raw-data, 24 MB) |
| `02-metadata/` | google-metadata, localized-fixes, listings-patch.json, listings-patch-full-offline.json, visual-assets-spec, action-metadata |
| `03-testing/` | ab-test-setup, action-testing |
| `04-launch/` | relaunch-checklist, timeline (10-14 → 12-15), submission-guide, action-launch |
| `05-optimization/` | review-responses, ongoing-tasks, action-optimization |

## Limits of this audit
- No search-volume data exists for Google Play; figures labelled "estimate" are estimates.
- Non-English copy needs native review (required for iw-IL and ar).
- No App Store audit: no live iOS listing was found.
- Nothing was published or committed.
