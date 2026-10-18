# Research Action Checklist: Video Poker: Jacks or Better (com.micorlov.videopoker)

Created 2026-10-14 (day 0 of native 3.0.0). Inputs: `keyword-list.md`, `competitor-gaps.md`, `raw-data/`.
Priorities: **P0** = accuracy/policy risk or a measured quick win, do this week · **P1** = next 2 weeks · **P2** = this quarter.
Nothing has been uploaded or edited in the repo by this research pass. `play-store-assets/listings.json` stays the single source of truth for any copy change, pushed with `node scripts/play-listing-upload.js commit` after `node scripts/validate-aso.js`.

## P0: Accuracy and measured quick wins

- [ ] **P0. Remove "live leaderboards" from 13 localized short descriptions** (es-ES, pt-BR, de-DE, fr-FR, it-IT, pl-PL, ru-RU, tr-TR, hi-IN, ja-JP, ko-KR, zh-CN, ar). The native app has only a daily friends leaderboard. Replace the clause with the local "offline / no internet" term from keyword-list section 8 (e.g. ES "sin internet", DE "offline", RU "без интернета", TR "internetsiz", ID "offline", JA "オフライン"). Check id and iw-IL ("leaderboards", no "live") too. Constraint: no price/promo words (free / no ads / 100% equivalents) in any short description.
- [ ] **P0. Add an offline paragraph to all 15 localized full descriptions.** Measured: 0/15 contain any offline term, while autocomplete shows offline / no-internet demand in ES, MX, BR, DE, RU, TR, ID and JA.
- [ ] **P0. Decide the pt-BR title.** "Vídeo Pôquer: Jacks or Better" → "Video Poker: Jacks or Better". Evidence: "vídeo pôquer" has 0 autocomplete suggestions and we are not in its results, while we are #11 for "video poker" in BR.
- [ ] **P0. Reword the en-US "A full paytable for every variant"** to "The complete paytable…", so we don't match "full pay" searches (the table is 7/5).
- [ ] **P0. Log today's baseline** in the `PLAY_STORE_LISTING_DRAFT.md` rank log: 2026-10-14, jacks or better **3**, video poker **17**, deuces wild **— (not in top 30)**, ratings **0**. Note the method (web search, `gl=us`) so future rows compare like-for-like.
- [ ] **P0. Verify Turkey availability** in Play Console → Production → Countries/regions. We are #2 for "jacks or better" in TR but absent from the "video poker" results.
- [ ] **P0. Confirm the 3.0 in-app review trigger** (`android-native/.../ui/InAppReview.kt`) still fires after 3 Straight-or-better wins, as 2.4 did. Ratings are the largest measured gap: 0 vs an average of 16,980.

## P1: Keyword implementation inputs (hand to aso-optimizer)

- [ ] **P1.** en-US full description: add a "VIDEO POKER TRAINER" heading and the phrases "video poker trainer", "jacks or better strategy", "video poker offline", "deuces wild video poker offline", "multi hand video poker", "video poker with double up". Stay under 4,000 characters (1,255 free) and keep "video poker" density at 1.5-2.5%.
- [ ] **P1.** Add the short-description variant "Offline video poker trainer: Jacks or Better, Deuces Wild, exact hints" (70) to `aso-experiments.json`. **Delete or rewrite the existing variants "variant-led" and "social-led" (they claim "live leaderboards") and "free-play-led" (it contains "free chips, no ads", which the policy flags).**
- [ ] **P1.** Localized full descriptions: add the top-5 local terms per locale from keyword-list section 8 (ES doblar / maquinita, DE "ohne echtes Geld" / Trainer, RU "видео покер" two-word form and both офлайн/оффлайн spellings, JA Latin "video poker").
- [ ] **P1.** Screenshot caption test: change slide 5's kicker from "Exact strategy hints" to "Video poker trainer". Make slide 1 lead with "No ads. No purchases." (graphics allow it).
- [ ] **P1.** Record the 30-second gameplay promo video (outstanding in GROWTH-PLAN).

## P1: Monitoring setup

- [ ] **P1.** Weekly rank re-check (Mondays) with the same method. Save `ids.txt` per query under `outputs/VideoPoker/01-research/raw-data/play-search/` with a dated folder. Queries: video poker, jacks or better, deuces wild, offline video poker, video poker offline, video poker trainer, video poker strategy, multi hand video poker, triple play poker, jacks or better offline, jacks or better strategy, video poker no ads, free video poker.
- [ ] **P1.** Local weekly ranks: ES videopóker / video poker; BR video poker / jacks or better; DE videopoker / video poker / jacks or better; RU видеопокер / видео покер; TR video poker; ID video poker / video poker offline; JP ビデオポーカー / video poker.
- [ ] **P1.** Watchlist (re-fetch monthly for rating count, update date and short-description changes): com.tapinator.videopokerclassic, com.actiongaming.originalvideopoker, com.videopoker.ultimate.x.poker.free, com.kamagames.videopoker, com.november31.video_poker, com.jackpotmobile.vpmh, com.rubyseven.multistrikepoker, com.spacesheep.jacksorbetter, com.tapinator.vpc.dw, com.rcs.video_poker_trainer_job, plus the trainer newcomers com.smarthold.app, software.counter.videopoker, com.videopokerlab.trainer, and the title collisions com.innovizea.cardsharkpoker and com.S7SOFTWARE.VideoPokerJACKORBETTER.
- [ ] **P1.** Export Play Console → Grow → Store performance → **Search terms** (impressions, installs per query) once 3.0 has 14 days of data. This is the only first-party search-volume proxy available. Replace the estimated demand tiers in keyword-list.md with it.
- [ ] **P1.** Play Console → Store listing experiments: confirm the current experiment is a single element (per `aso-experiments.json` order). Low traffic (100+ installs) means 14-day tests may be inconclusive, so record the impressions count with each result.

## P2: Deeper research (open questions)

- [ ] **P2.** Title test for "deuces wild" (only after 2+ stable weekly readings post-3.0): status quo vs "Jacks or Better & Deuces Wild" (29). Play experiments cannot test the title, so run it as a sequential before/after with rank logs. Risk: losing "video poker" #17.
- [ ] **P2.** es-419 listing: web Mexico currently receives es-ES. Draft a LatAm listing with "maquinita de póker", "para doblar", "sin internet".
- [ ] **P2.** Measure the 8 unmeasured locales (fr-FR, it-IT, pl-PL, ko-KR, zh-CN, hi-IN, iw-IL, ar) with the same autocomplete script and local search ranks.
- [ ] **P2.** Inspect competitor screenshots (first 3 frames of the top 5) for message order. Images were not reviewed in this pass.
- [ ] **P2.** Review-mining: pull the 1-2★ reviews of Tapinator, Pokerist and November31 (ads / bust / pay-to-play complaints) to find conversion copy that speaks to their unhappy users. Measured histogram: Pokerist has 3,327 one-star and 1,843 two-star ratings.
- [ ] **P2.** Product questions raised by research (not ASO tasks): a 9/6 table option, Double Double Bonus, 10-hand mode. Each would unlock measured high-autocomplete terms (bonus poker deluxe, double double bonus, ten play), but none can be claimed today.

## Validation criteria

- [x] At least 10 primary keywords with evidence and placement (keyword-list section 3: 10 primary, 10 secondary, 10 long-tail)
- [x] At least 3 competitors analyzed with measured data (10 core + 5 trainer newcomers + 2 title collisions)
- [x] Every keyword has a placement; every gap has an action
- [x] Localized top 5 for ES, PT-BR, DE, RU, TR, ID, JA, flagged by evidence type
- [x] Data sources and limitations documented; no fabricated volumes or installs
- [ ] Search-volume tiers replaced by Play Console Search terms data (blocked until about 2026-10-28)

**Next:** hand off to aso-optimizer for metadata generation (P0 copy fixes first).
