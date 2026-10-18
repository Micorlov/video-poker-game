# Ongoing ASO Tasks: Video Poker: Jacks or Better (com.micorlov.videopoker)

**Last updated:** 2026-10-14 · **Status:** active from 3.0.0 onward · **Owner:** Michael (solo)
**Time budget:** about 15 min/day, about 60 min each Wednesday, about 2.5 h on the first Monday of the month, half a day per quarter.

---

## Daily (10-15 minutes, mornings)

- [ ] **Reviews:** Play Console → Ratings and reviews → Reviews. Reply to everything new within 24 hours using `review-responses.md`. Tag each one with a theme (lost progress / bug / feature / gambling / praise) in the weekly tally.
- [ ] **Vitals (daily until 2026-10-28, then weekly):** Android vitals → Crashes and ANRs → read new clusters. At this size, one cluster is enough to act on.
- [ ] **During a staged rollout only:** check the ramp criteria (no new cluster for 48 hours → raise the percentage; see `04-launch/submission-guide.md` §3).
- [ ] **Policy inbox:** look for Play Console messages and policy emails (rejections, Data safety warnings, promotion-eligibility flags).

Turn on the Play Console app notifications for new reviews, so this is a 2-minute check most days.

## Weekly: every Wednesday (about 60 minutes)

Wednesday matches the 2026-10-14 baseline weekday, so readings stay comparable.

### 1. Rank check (20 minutes)
Use the same method as the research: unauthenticated web search, US English, and the order of unique `details?id=` links. Accurate to about ±3 of the in-app Play order. This one-liner was tested on 2026-10-14 and returned 3 and 17:
```bash
for q in "jacks or better" "video poker" "deuces wild" "video poker trainer" "offline video poker" \
         "video poker offline" "video poker strategy" "multi hand video poker" "triple play poker" \
         "jacks or better offline" "jacks or better strategy" "video poker no ads" "free video poker"; do
  pos=$(curl -s -A "Mozilla/5.0" "https://play.google.com/store/search?q=$(printf %s "$q" | sed 's/ /%20/g')&c=apps&hl=en&gl=us" \
        | grep -o 'details?id=[A-Za-z0-9_.]*' | awk '!seen[$0]++' | grep -n 'id=com.micorlov.videopoker$' | cut -d: -f1)
  echo "$q: ${pos:-—}"
done
```
- For local markets, change `hl`/`gl` and the query: ES `videopóker` (hl=es, gl=es), BR `video poker` (pt-BR, br), DE `videopoker` (de, de), RU `видеопокер` (ru, ru), TR `video poker` (tr, tr), ID `video poker offline` (id, id), JP `ビデオポーカー` (ja, jp). URL-encode non-ASCII terms.
- "—" means the app wasn't among the results returned (about 30 on the web page).

### 2. Log the row (5 minutes)
Add a row to the **Rank log** in `PLAY_STORE_LISTING_DRAFT.md`. The current columns are Date | jacks or better | video poker | deuces wild | Ratings. Extend the header once to:

| Date | jacks or better | video poker | deuces wild | video poker trainer | offline video poker | Ratings (avg) | Change since last row | Method |
|---|---|---|---|---|---|---|---|---|
| 2026-09-09 (before) | 5 | 29 | — | — | — | 0 | — | unrecorded |
| 2026-10-14 | 3 | 17 | — | 30 | — | 0 | 3.0.0 submitted | web, gl=us hl=en |

The "Change since last row" column is what makes the log useful. It records which listing or binary change each reading follows. Keep the full 13-query and local readings in a dated file, e.g. `outputs/VideoPoker/05-optimization/ranks/2026-10-21.txt`.

### 3. Play Console numbers (15 minutes)
Fill one row of `play-store-assets/ASO-MEASUREMENT.md` (week ending the previous Sunday) from:
- Statistics → **Store listing visitors**, **Store listing acquisitions**, the **conversion rate**, and the **peer median** Play shows next to it.
- Statistics → **Daily active users** and **Uninstalls**. In October and November, compare them with the last pre-3.0 week to see upgrader churn.
- Ratings → count and average (it updates with a lag).
- Firebase / GA4 (from 3.0.1): `first_open`, D1/D7 retention, `hand_completed` per user, `review_card_rate` / `review_card_dismissed`.

### 4. Review themes and experiment (10 minutes)
- Tally the week's review themes. If **3 or more mention the same issue in 7 days**, it goes into the next release.
- If an experiment is running: write down its impressions, the current preferred arm, and the confidence. Don't stop it before day 14.

### 5. Plan next week (5 minutes)
- Is an en-US metadata change due? Only if the last en-US change has at least one rank reading after it (7-day rule).

## Bi-weekly (every other Wednesday, +30 minutes)

- [ ] Screenshots vs the app: does every frame still match the current build (new settings, themes, leaderboard state)? This matters after every 3.0.x release.
- [ ] Release-notes freshness: the next build's `release-notes.json` should be drafted before the build starts.
- [ ] Community: one post or comment per week at most, rotating Reddit and Facebook drafts, each link UTM-tagged. Check acquisition per `utm_source` in Play Console → Acquisition reports.

## Monthly: first Monday (about 2.5 hours). Dates: 2026-11-02, 2026-12-07, 2027-01-04

- [ ] **Search terms export:** Grow → Store performance → Search terms. Record impressions, visitors and acquisitions per query in `01-research/keyword-list.md`. This is the only first-party demand data.
- [ ] **Listing integrity:** `node scripts/validate-aso.js`, then `node scripts/verify-play-listing.js` (needs the key, see submission-guide §1). Expect 16 × `ok`, phone = 6, and tablet sets native or empty.
- [ ] **Accuracy grep:** listing claims vs app features (no live leaderboards, rooms, cloud backup, Facebook, 9/6, or variants the app lacks).
- [ ] **Data safety vs SDKs:** compare `android-native/app/build.gradle.kts` dependencies with the Data safety form. Any new SDK means a form update before the release.
- [ ] **Competitor watchlist re-fetch** (15 apps listed in `01-research/action-research.md` P1): rating count, update date, short-description changes, new trainer entrants.
- [ ] **ASO health score.** Feed this month's numbers to `~/.claude/skills/app-store-optimization/aso_scorer.py`:
  ```bash
  python3 -I ~/.claude/skills/app-store-optimization/aso_scorer.py < <scratch>/aso_input.json
  ```
  Input keys: `metadata` {title_keyword_count, title_length, description_length, description_quality, keyword_density}, `ratings` {average_rating, total_ratings, recent_ratings_30d}, `keyword_performance` {top_10, top_50, top_100, improving_keywords}, `conversion` {impression_to_install, downloads_last_30_days, downloads_trend}.
  - **Baseline 2026-10-14: 41.2/100** (metadata 83.9, ratings 15.0, keywords 51.1, conversion 15.0). Conversion was entered as 0 because it isn't known yet, so the real figure is a little higher.
  - The scorer's keyword-density benchmark (2-5%) is higher than research guidance (1.5-2.5% for "video poker"). **Follow the research and don't stuff text to raise the score.**
- [ ] **Experiment decision:** apply the winner, or log "inconclusive" with impressions. Pick the next item in `aso-experiments.json` / `03-testing`.
- [ ] **Monthly note** in `PLAY_STORE_LISTING_DRAFT.md`: what changed, what moved, and the next month's one en-US change.

## Quarterly: first week of January, April, July, October (half a day)

- [ ] Full keyword refresh: autocomplete and ranks for en-US plus 7 priority locales, plus the 8 locales not yet measured.
- [ ] Localization ROI: Search terms and acquisitions per country. Decide on an es-419 listing and any locale that needs a rewrite.
- [ ] Title review: the "deuces wild" sequential test (planned for 2027-01-06), only with 2+ stable readings beforehand.
- [ ] Product-for-ASO review: 9/6 table, Double Double Bonus, 10-hand, and the return of live leaderboards. Each unlocks measured search demand once it really exists.
- [ ] Re-read Play's policy pages (Ratings & Reviews, Metadata, Simulated gambling, Data safety, Account deletion) for changes.

## Seasonal and event triggers

| Trigger | Action |
|---|---|
| New 3.0.x release | Release notes in 16 locales; screenshot check; Data safety check; staged rollout |
| Save migration ships | Edit every "lost progress" reply with template 2c. Mention it in the release notes. |
| Black Friday (2026-11-27) / holidays | Community posts with "nothing to sell you" positioning. No metadata changes 12-24 → 01-01. Use Promotional content only if Play shows the feature as eligible. |
| New Android version | Test on the real phone, check vitals for the new API level, and confirm `targetSdk` meets Play's yearly requirement. |
| Competitor launches with "trainer" / "no ads" | Re-check our rank on "video poker trainer" that week. Adjust the full description, not the short description. |
| Play promotion-eligibility flag | Remove the flagged word from the short description or title in every locale the same day. |

## Using `scripts/fetch-play-stats.js` (limited)

- **What it does:** it reads the production track's latest release name and the **most recent reviews** from the Play API, and writes `docs/stats.json` (`version`, `installs`, `rating`, `updatedAt`) for the GitHub Actions deploy-share workflow (CI passes `PLAY_SERVICE_ACCOUNT_JSON`).
- **Don't use it for KPIs.**
  - The reviews API returns only recent reviews with text, not all ratings.
  - Its `installs` value is guessed from the review count (≥ 10 reviews → "100+"), not real installs.
  - The fallback values are stale (`version: '2.4'`, `installs: '10+'`).
- **Don't run it locally right now.** The local key `~/.config/mcp/google-play-service-account.json` is missing, so it would overwrite `docs/stats.json` with the fallback values. If you run it anyway, discard the change: `git checkout docs/stats.json`.
- Fine for: a quick check of which version name is live on production, once the key path is fixed.

## KPIs and targets (realistic for a 100+ install, 0-rating app)

| KPI | Baseline 2026-10-14 | Target 2026-11-15 | Target 2026-12-15 | Source |
|---|---|---|---|---|
| Ratings shown | 0 | ≥ 5 | ≥ 10 (stretch 15) | Console → Ratings |
| Average rating | — | ≥ 4.3 | ≥ 4.3 | Console |
| Reviews replied < 24 h | n/a | 100% | 100% | Console |
| "lost progress" reviews | 0 | ≤ 3 | 0 new after the migration ships | weekly tally |
| US rank "jacks or better" | 3 | ≤ 3 | ≤ 3 (stretch #1-2) | Wednesday check |
| US rank "video poker" | 17 | ≤ 17 | ≤ 15 | Wednesday check |
| US rank "video poker trainer" | 30 | ≤ 20 | ≤ 15 | Wednesday check |
| US rank "offline video poker" | — | ≤ 30 | ≤ 25 | Wednesday check |
| US rank "deuces wild" | — | — (no title lever yet) | — (title test in Q1) | Wednesday check |
| Store listing conversion | unknown (baseline 10-21) | ≥ Console peer median | ≥ peer median and ≥ 25% (GROWTH-PLAN) | Console Statistics |
| Weekly store-listing acquisitions | baseline 10-21 | ≥ baseline | ≥ baseline +30% (holiday season helps) | Console Statistics |
| Installs band | 100+ | 100+ | 100+ (500+ realistic by 2027-03-31) | public listing |
| User-perceived crash rate | n/a | < 1.09% | < 1.09% | Android vitals |
| User-perceived ANR rate | n/a | < 0.47% | < 0.47% | Android vitals |
| Open crash clusters | n/a | 0 | 0 | Android vitals |
| D1 / D7 retention (new users) | n/a (no Analytics in 3.0.0) | measure | D1 ≥ 25%, D7 ≥ 8% (estimate for casual card games) | GA4 / Console |
| Listing claims the app lacks | 13 locales ("live") + tablet frames | 0 | 0 | monthly grep + verify script |
| ASO health score | 41.2 | ≥ 48 | ≥ 55 | aso_scorer.py |

Small numbers move a lot. At about 5-20 store visitors a day, one week's conversion can swing ±10 points. Judge trends over 2-3 weekly rows, not single readings.

## Automate vs keep manual

| Automate (or script) | Keep manual |
|---|---|
| The rank one-liner above, dated output files | Review replies (voice, honesty, 350-char fit) |
| `validate-aso.js` before every listing commit; add a "live leaderboard" check to it | Metadata wording and policy self-check |
| `verify-play-listing.js` after every publish | Experiment design and winner calls |
| Vitals email alerts (Console notification settings) | Data safety answers |

**Remember:** one en-US change per week, one experiment at a time, and a logged rank reading between changes. At this size, discipline in attribution matters more than the volume of changes.
