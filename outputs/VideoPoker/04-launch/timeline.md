# Relaunch Timeline: Video Poker 3.0 (com.micorlov.videopoker)

**Today:** Wednesday 2026-10-14 (from `date -u`). 3.0.0 (vc 15) was submitted to production today.
**Horizon:** 2026-10-14 → Tuesday 2026-12-15 (62 days, 9 weeks), plus a short look ahead to New Year.
**Owner:** Michael (solo). Every task below is his unless it says "dev session" (a Claude Code coding session in this repo) or "02-metadata / 03-testing" (copy and experiment specs being written in parallel).

**Rank checks are on Wednesdays.** That keeps them the same weekday as the 2026-10-14 baseline and puts them on 10-21 and 10-28 as research recommended. Use the same method every time: web search, `gl=us&hl=en`, positions of unique `details?id=`.

**Metadata change rule.** Change one en-US thing at a time. Leave at least 7 days (one rank check) between en-US changes, so each rank movement has one cause. Localized-only fixes don't touch en-US measurement and can ship at any time.

---

## Week 0: Wed 2026-10-14 → Sun 2026-10-18 (release and damage control)

### Wed 10-14 (day 0)
- [x] 3.0.0 (vc 15) submitted to production (Console promote).
- [ ] Add the baseline row to the rank log in `PLAY_STORE_LISTING_DRAFT.md`: JoB 3 · video poker 17 · deuces wild — · trainer 30 · ratings 0 · method.
- [ ] Turn on Play Console email notifications for reviews and for policy/rejection messages.

### Thu 10-15
- [ ] Check review status. Once live, note the "Available on Google Play" time in the rank log.
- [ ] Android vitals → Crashes & ANRs: read every cluster (daily until 10-28).
- [ ] Update the Data safety form (Analytics + Device IDs) and confirm the Advertising ID declaration says Analytics, **before 3.0.1 is submitted**.

### Fri 10-16
- [ ] Dev session: 3.0.1 hotfix scope:
  1. Don't stamp `firstDay` for upgraders (legacy `app_webview` dir).
  2. Fix the onboarding "back up your chips" copy.
  3. Add a delete-account link in Settings.
  4. Release-notes line "progress from before 3.0 starts fresh".
- [ ] Update `privacy-policy.html` (Analytics, advertising ID, remove Facebook/rooms/cross-device sync, app name) and deploy it.
- [ ] Remove the en-US 7" and 10" tablet screenshots (stale web UI with "Live leaderboards") in Console → Store listing, or queue a native reshoot.

### Sat-Sun 10-17 / 10-18
- [ ] Reply to any review within 24 hours (templates in `05-optimization/review-responses.md`, §3 for lost progress).
- [ ] Rewrite `play-store-assets/01-friends-seed.md` (no "5 stars", no keyword coaching) before you send it to anyone.

## Week 1: Mon 2026-10-19 → Sun 2026-10-25 (3.0.1 + localized accuracy fix)

### Mon 10-19
- [ ] **Localized short-description fix goes live.** 13 locales lose "live leaderboards" and gain a local "offline" term (copy from `02-metadata`). Validate, then commit (see submission-guide §2). en-US is untouched, so the 10-21 en-US rank check stays clean.
- [ ] Build 3.0.1 (vc 16, or vc 17 if the hotfix gets a new code) → internal track → read the pre-launch report.

### Tue 10-20
- [ ] Promote 3.0.1 to production **at 20%** (Console). Managed publishing on.

### Wed 10-21: rank re-measure #1
- [ ] Rank check: 13 en-US queries + local queries (list in `ongoing-tasks.md`). Log the row.
- [ ] First weekly dashboard row in `play-store-assets/ASO-MEASUREMENT.md` (week ending 10-18 and 10-25 from Console).
- [ ] Note the active-user count against the pre-3.0 week (Statistics → Monthly active users / Daily active users). This measures how many upgraders churned.

### Thu 10-22
- [ ] If vitals are clean, raise 3.0.1 to 50%. Check GA4 Realtime / DebugView for `first_open`, `hand_completed`.

### Sat 10-24
- [ ] 3.0.1 to 100% if there are no new crash clusters.

## Week 2: Mon 2026-10-26 → Sun 2026-11-01 (second reading, Search terms)

### Wed 10-28: rank re-measure #2 + Search terms
- [ ] Rank check and log the row. If JoB and video poker are within ±3 of 10-21, the 3.0 binary effect has settled. That unlocks the en-US description change.
- [ ] Export Grow → Store performance → **Search terms** (first 14 days of 3.0). Replace the estimated demand tiers in `01-research/keyword-list.md` with impressions per query.
- [ ] Ratings check: first real ratings are expected from new installs. Reply to all of them.

### Thu 10-29: en-US metadata window #1
- [ ] **Ship the en-US full-description keyword pass** (`02-metadata`): "video poker trainer", "jacks or better strategy", "video poker offline", "deuces wild video poker offline", "multi hand video poker", "video poker with double up", and "complete paytable". Title and short description stay unchanged.
- [ ] Post the refreshed r/videopoker draft (native 3.0, exact hints, 7/5 disclosure). UTM `utm_source=reddit_vp&utm_campaign=v3`.

### Sat 10-31 (Halloween)
- [ ] No listing action; seasonal hooks don't fit this app. Reply to reviews.

## Week 3: Mon 2026-11-02 → Sun 2026-11-08 (monthly review, migration)

### Mon 11-02: monthly review #1
- [ ] Monthly ASO health review (`ongoing-tasks.md` monthly block): ratings, ranks, conversion vs peers, review themes, competitor watchlist re-fetch.
- [ ] Decide on the save migration (3.0.2) scope. Target: submitted by **Wed 11-04**.

### Wed 11-04: rank check (first reading after the description change)
- [ ] Log ranks. Expected effect: "video poker trainer" improves from #30. Head terms are unchanged.
- [ ] 3.0.2 (migration) to internal → pre-launch report → staged rollout 20%.

### Thu 11-05: experiment window #1 opens (store listing experiment)
- [ ] Start the **first Play store listing experiment** as specified in `03-testing` (one element only, en-US, 50/50). The research and history favour the **phone screenshot first frame**. Run until **Thu 11-26** (21 days; with ~100 installs, 14 days won't be enough). Experiments don't change the indexed text, so rank checks stay valid.
- [ ] Record the start date, variant, impressions so far, and the hypothesis in the experiment log.

## Week 4: Mon 2026-11-09 → Sun 2026-11-15 (localized long-tail)

### Mon 11-09: localized metadata window
- [ ] Ship localized full-description additions (ES "doblar / maquinita / sin internet", DE "ohne echtes Geld / Trainer", RU "видео покер / офлайн / оффлайн", JA Latin "video poker", ID "video poker offline"), plus the **pt-BR title** "Video Poker: Jacks or Better" if `02-metadata` approves it.
- [ ] 3.0.2 to 100% if vitals are clean.

### Wed 11-11: rank check
- [ ] en-US + local ranks (ES, BR, DE, RU, ID, JP). Log the BR "video poker" position before and after the pt-BR title change.

### Sun 11-15: 30-day KPI checkpoint
- [ ] Ratings ≥ 5, average ≥ 4.3 · 100% of reviews answered < 24 h · JoB ≤ #3 · video poker ≤ #17 · 0 open crash clusters.

## Week 5: Mon 2026-11-16 → Sun 2026-11-22 (title decision)

### Wed 11-18: rank check + title decision
- [ ] With 3+ readings after 3.0, decide the **"deuces wild" title test** (research P2). Default: **postpone to 2027-01-06**. Black Friday to New Year seasonality would confound a before/after read, and we'd risk the #17 "video poker" position during peak traffic. Go now only if the Search terms data shows "deuces wild" impressions far above "video poker".
- [ ] Record the 30-second gameplay promo video (native 3.0), and add the YouTube URL to the en-US listing on **Mon 11-23**. Don't add it during the experiment if the experiment is on screenshots, because the video changes the first frame.

## Week 6: Mon 2026-11-23 → Sun 2026-11-29 (US Thanksgiving / Black Friday)

### Thu 11-26 (Thanksgiving): experiment #1 ends
- [ ] Read the experiment result. Apply the winner only if Play reports it as better with ≥ 90% confidence. Otherwise keep the control and log "inconclusive" with the impression count.

### Fri 11-27 (Black Friday) → Mon 11-30 (Cyber Monday)
- [ ] There is no sale to run (no IAP). The seasonal lever is **attention**: post the refreshed Facebook-group draft and r/AndroidGaming (on its allowed promo day) with "no ads, no purchases: nothing to sell you this Black Friday". UTM `utm_campaign=bf2026`.
- [ ] Check eligibility for **Promotional content** (Play Console → Grow → Promotional content). If eligible, submit a "Holiday hands" event card for 12-18 → 01-02 by 12-04 (Google asks for about 14 days of lead time; confirm in the Console).

## Week 7: Mon 2026-11-30 → Sun 2026-12-06 (holiday prep)

### Wed 12-02: rank check
### Thu 12-03: experiment window #2 opens
- [ ] Second experiment from the `03-testing` queue (e.g. short-description "trainer" variant vs control). Runs **12-03 → 12-24**. It will overlap holiday traffic, which helps the sample size. Both arms see the same seasonality, so the comparison stays fair.
- [ ] Optional dev session: a December in-game event (e.g. daily ALL IN doubled 12-24 → 01-01). It would give the release notes and the Promotional content card something real to say. Only if it's cheap.

## Week 8: Mon 2026-12-07 → Sun 2026-12-13 (monthly review #2)

### Mon 12-07: monthly review #2
- [ ] Health review, competitor re-fetch (December is when Tapinator and Pokerist push updates), and a Search terms export (November).
- [ ] If an in-game event ships: release notes "Holiday bonus 12-24 → 01-01" in 16 locales, staged rollout by 12-10.

### Wed 12-09: rank check

## Week 9: Mon 2026-12-14 → Tue 2026-12-15 (60-day checkpoint)

### Tue 12-15: 60-day review
- [ ] KPI table vs targets (`ongoing-tasks.md` §KPIs): ratings ≥ 10, average ≥ 4.3; JoB top 3; video poker ≤ #15; video poker trainer ≤ #15; conversion ≥ the Console peer median.
- [ ] Write the Q1 plan: the title test (2027-01-06), es-419 listing, and the product items research flagged (9/6 table, 10-hand).

## Look-ahead (outside the horizon)
- **Thu 12-24 → Fri 01-01:** peak casual-game installs. Don't change metadata or the binary. Monitoring and review replies only.
- **Wed 2027-01-06:** title test start, if still the plan. Rank check, then the sequential before/after over 2 weeks, with revert triggers: video poker drops below #25, or JoB drops below #6.

---

## Milestones

| Date | Milestone | Status |
|---|---|---|
| Wed 10-14 | 3.0.0 submitted to production; baseline logged | Submitted |
| Thu 10-15 | Data safety + Ad ID declaration updated for Analytics | Pending |
| Fri 10-16 | Privacy policy updated; tablet screenshots removed | Pending |
| Mon 10-19 | 13 localized short descriptions fixed | Pending |
| Tue 10-20 | 3.0.1 (Analytics, upgrader review-prompt fix) staged 20% | Pending |
| Wed 10-21 | Rank re-measure #1 | Pending |
| Wed 10-28 | Rank re-measure #2 + Search terms export | Pending |
| Thu 10-29 | en-US full description keyword pass | Pending |
| Wed 11-04 | 3.0.2 (save migration) submitted | Pending |
| Thu 11-05 → 11-26 | Experiment #1 (screenshots, per 03-testing) | Pending |
| Mon 11-09 | Localized long-tail + pt-BR title | Pending |
| Wed 11-18 | Title-test decision (default: postpone to 2027-01-06) | Pending |
| Fri 11-27 | Black Friday community push | Pending |
| Thu 12-03 → 12-24 | Experiment #2 | Pending |
| Tue 12-15 | 60-day KPI review | Pending |

## Contingencies

| If | Then |
|---|---|
| 3.0.0 is rejected (policy) | Read the email, fix it in a 3.0.1 build, and re-submit. Run every 3.0.1 item early. The old 2.x stays live meanwhile. |
| A crash cluster appears in vitals on a 3.0.x rollout | Halt the rollout (staged), or halt the fully rolled-out release if Console offers it. Fix, then ship vc+1. Push every date after it back by the fix time. |
| A flood of "lost progress" 1-stars (≥ 3 in a week) | Move the migration (3.0.2) ahead of everything else, reply to each review with template §3, and put the migration promise in the release notes only once it's built. |
| JoB falls below #5 or video poker below #25 after a metadata change | Revert that change through `listings.json` + commit within 48 hours, and log the cause. |
| An experiment stays inconclusive at day 21 | Stop it and keep the control. Don't extend past 28 days, because it blocks the next test. |
| Play Console access via API stays blocked (403) | Make every listing edit in the Console UI, then mirror it into `play-store-assets/listings.json` the same day (submission-guide §4). |

**Confidence:** about 80% that dates through 10-29 hold (the main risk is review time and the hotfix scope). Dates after 11-04 depend on the migration session.
