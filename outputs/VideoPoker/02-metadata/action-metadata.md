# Metadata Action Checklist: Video Poker: Jacks or Better (Google Play)

Prepared 2026-10-14 (day 0 of 3.0). Priorities: **P0** this week (accuracy or policy risk), **P1** next two weeks, **P2** this quarter. Nothing below has been done by this pass: no repo file outside `outputs/VideoPoker/` was edited and nothing was uploaded to Play Console.

Files: `google-metadata.md` (en-US text), `localized-fixes.md` (15 locales), `listings-patch.json` (short descriptions only), `listings-patch-full-offline.json` (new en-US full text plus an offline section in each locale), `visual-assets-spec.md`, `../03-testing/ab-test-setup.md`, `../03-testing/action-testing.md`.

## P0: accuracy and policy (this week)

- [ ] **Merge `listings-patch.json` into `play-store-assets/listings.json`** (command in `localized-fixes.md`), run `node scripts/validate-aso.js`, then `node scripts/play-listing-upload.js validate`, then `commit`. Removes the false "live leaderboards / rankings" claim from 13 short descriptions and adds the local offline keyword in all 15. Check `git diff` first (the merge reformats the JSON).
- [ ] **Get native review for iw-IL and ar** short descriptions (low confidence) and glance-review pl-PL, ru-RU, tr-TR, hi-IN, ja-JP, ko-KR, zh-CN (medium). If a review will take long, ship the high-confidence locales (es-ES, pt-BR, de-DE, fr-FR, it-IT, id) first and leave the rest on the old text only if you accept the false claim staying live for those markets. My recommendation is to ship all 15 and fix wording afterwards; the old text is wrong, the new text is merely unreviewed.
- [ ] **Decide which app icon is live and which one ships** (`visual-assets-spec.md` finding 1). The 3.0 launcher art is a glamour illustration with in-icon text; the store icon file in `play-store-assets/` is a clean card mark. Make them match; prefer the clean mark.
- [ ] **Remove or relabel the static "Tournament 2 26:55" pill and the onboarding line "Also live: hourly and daily tournaments..."** (`TournamentPill.kt`, string `ob_also_live`). Product change, not store text. Until fixed, the store listing and the screenshots imply a feature that does not exist.
- [ ] **Reword the en-US full description** to the new text in `google-metadata.md` (also removes "A full paytable..."), either in Play Console (Option 1) or via `listings-patch-full-offline.json` (`en-US` key only). Log the live date in the rank log, because it overlaps the 3.0 readings.
- [ ] **Decide the one product-owner line in the new full description:** "Jacks or Better uses the 7/5 table: a Full House pays 7 and a Flush pays 5." Keep it (my recommendation, for trust with strategy players) or delete it. Never replace it with 9/6 or "full pay" wording.
- [ ] **Confirm the Data Safety form matches 3.0.** Commit 629d9ab added Google Analytics reporting; `PLAY_STORE_LISTING_DRAFT.md` still says there is no analytics SDK. A mismatch is a policy problem on the same listing.
- [ ] **Verify Turkey availability** in Play Console, Production, Countries/regions (research P0: #2 for "jacks or better" in TR but absent for "video poker").
- [ ] **Log the baseline** in `PLAY_STORE_LISTING_DRAFT.md`: 2026-10-14, jacks or better 3, video poker 17, deuces wild not in top 30, ratings 0, method "web search, gl=us".

## P1: next two weeks

- [ ] **Fix the feature graphic text:** kicker "OFFLINE · NO REAL MONEY", sub-line "Jacks or Better · Deuces Wild · Exact hints" (spec in `visual-assets-spec.md`). Remove "FREE" as a precaution.
- [ ] **Re-shoot phone screenshots** (after the pill is removed) with the new order and slide-1 caption "Offline video poker / No ads. No wifi needed. / Just five cards." Replace the "free" kickers in all 15 localized sets with the offline kickers in `visual-assets-spec.md`, and translate the new line 1 and 2.
- [ ] **Add a Stats-screen slide** ("Track your accuracy") using the strategy-accuracy panel (92% accuracy, "Lost to mistakes").
- [ ] **Publish `listings-patch-full-offline.json` locale entries** after native review. Each adds an offline section and states that sign-in, invites and the friends leaderboard need a connection.
- [ ] **Add the four missing queries to the weekly rank list:** video poker offline, video poker trainer, jacks or better strategy, offline video poker (and update `ASO-MEASUREMENT.md` keyword set).
- [ ] **Export Search terms** (Grow users, Store performance, Search terms) once 3.0 has 14 days of data (about 2026-10-28) and replace the estimated demand tiers in `keyword-list.md`.
- [ ] **Re-measure ranks on 2026-10-21, 10-28 and 11-04** with the same method.
- [ ] **Cut the "live leaderboards and poker rooms ... paused / coming back" sentence** from the 3.0 release notes (`android-native/store-assets/release-notes.json`) at the next release.
- [ ] **Refresh the stale docs:** `PLAY_STORE_LISTING_DRAFT.md` section 1 (pre-3.0 description) and `listings.json` `whatsNew` (2.6 text).
- [ ] **Add a banned-term check to `scripts/validate-aso.js`** (live, free, no ads, 100%, rooms, tournament, Facebook, cloud, 9/6, full pay) for listings and experiment variants.

## P2: this quarter

- [ ] **Title decision gate on 2026-11-04:** apply the three criteria in `google-metadata.md`. Alt A `Jacks or Better & Deuces Wild` only if they all pass, as a four-week sequential test with rank logging.
- [ ] **pt-BR title** `Video Poker: Jacks or Better` (and update the two occurrences in the pt-BR full description). Snippet in `localized-fixes.md`. Can be done earlier if you want; it is low risk because "vídeo pôquer" has no ranking.
- [ ] **Short description test** `trainer-led` vs the live text, as a Play experiment only if traffic reaches 25 visitors per day; otherwise sequential (see `ab-test-setup.md`).
- [ ] **Re-shoot tablet 7" and 10" screenshots** from the native build (check portrait-lock behaviour on a tablet first).
- [ ] **30-second promo video** (beats in `visual-assets-spec.md`).
- [ ] **Icon concept test** (royal-flush fan, text-free) once the control icon is settled and traffic supports it.
- [ ] **es-419 listing** (Mexico currently receives es-ES): "maquinita de póker", "para doblar", "sin internet".
- [ ] **Localized full-description keyword pass** (research section 8: ES "doblar", DE "ohne echtes Geld", RU "видео покер" two-word form, JA Latin "video poker").
- [ ] **Measure the 8 unmeasured locales** (fr-FR, it-IT, pl-PL, ko-KR, zh-CN, hi-IN, iw-IL, ar).
- [ ] **Product questions that would unlock measured keywords (not ASO tasks):** a 9/6 option, Double Double Bonus, 10-hand mode. None may be claimed until shipped.

## Verification of this pass

- [x] Title 28/30, short 77/80, full 3,209/4,000 (en-US, script-counted)
- [x] 15 localized short descriptions 47 to 79 chars, all 80 or fewer, no promo words, no "live"
- [x] `node scripts/validate-aso.js` passed on a scratch copy with both patches applied (16 listings)
- [x] Compliance paragraph kept verbatim; no 9/6, full pay, live, rooms, Facebook, cloud, landscape claims in en-US text
- [x] Copy-paste ready: no placeholders in the title, short or full text
- [ ] Native review of non-English text (not done; see `localized-fixes.md`)
- [ ] Anything uploaded or applied (intentionally none)

Self-assessment: character compliance 5/5; keyword integration 4/5 ("video poker" 12 mentions in a 580-word text; "video poker strategy" appears once); readability 4/5; actionability 4/5 (non-English copy needs review; two product-owner decisions are flagged).
