# Keyword Research: Video Poker: Jacks or Better (com.micorlov.videopoker)

Research date: 2026-10-14, the day v3.0.0 (native Kotlin, versionCode 15) shipped to the existing listing.
Platform: Google Play (Casino). iOS has no live listing: `itunes.apple.com/lookup?bundleId=com.micorlov.videopoker` returns 0 results.

## 0. Read this first: data quality

| Signal | Status | Source |
|---|---|---|
| Our search position | **Measured** (web, unauthenticated) | `play.google.com/store/search?q=<kw>&c=apps&hl=en&gl=us`, order of unique `details?id=` links in the HTML. Raw files: `raw-data/play-search/*.ids.txt` |
| Competitor title, short description, rating, rating count, installs band, update date, ads/IAP flags | **Measured** | `play.google.com/store/apps/details?id=<pkg>&hl=en&gl=us` (ld+json and page header). Raw files: `raw-data/play-competitors-2026-10-14.json` |
| Demand ("people search this") | **Measured existence and order only, not volume** | Play search autocomplete (batchexecute RPC `IJ4APc`, the same endpoint the Play web search box uses). Raw file: `raw-data/suggest/play-autocomplete-2026-10-14.json` |
| Search volume numbers | **Not available. None are given in this document.** | Google does not publish Play keyword volume, and no paid tool was used. Demand tiers (High / Med / Low) below are **estimates** from autocomplete position plus the install bands of the apps that rank. |
| Relevance score (0-1) | **Judgment**, based on features verified in code | APP FACTS in the brief; `android-native/` grep (review prompt, rebuy, portrait-only) |

Caveats:
- Web search order is close to, but not identical to, the in-app Play Store result order. Results also vary by device, account and history. Treat a position as accurate to ±3.
- The 2026-09-09 baseline (#5 "jacks or better", #29 "video poker") used an unrecorded method, so today's #3 and #17 are probably an improvement but are not a like-for-like comparison.
- Day 0 of 3.0: Play needs some time to re-evaluate a new binary. Re-measure on 10-21 and 10-28 before you attribute any change to the metadata.

## 1. Current en-US coverage (live listing = `play-store-assets/listings.json`, verified live on the web)

| Field | Text | Length |
|---|---|---|
| Title | Video Poker: Jacks or Better | 28/30 |
| Short | Offline video poker: Jacks or Better, Deuces Wild, multi-hand. No wifi needed | 77/80 |
| Full | 2,745 chars | 2,745/4,000 (**1,255 chars unused**) |

Keyword density in the full en-US text, computed with `keyword_analyzer.calculate_keyword_density` over title + short + full:
video poker 1.59% · jacks or better 0.99% · multi-hand 0.99% · offline 0.80% · casino 0.80% · deuces wild 0.60% · bonus poker 0.60% · strategy 0.60% · hints 0.60% · double bonus 0.40% · triple play 0.40% · five play 0.40% · double up 0.40% · no ads 0.40% · draw poker 0.20% · poker machine 0.20% · **trainer 0.00%**

## 2. Measured US positions today (2026-10-14)

| Query | Our position | Top-10 titles that contain the exact phrase | Installs of results #1-3 |
|---|---|---|---|
| jacks or better | **#3** | 9/10 | 5K+, 500K+, 100+ (ours) |
| jacks or better offline | **#3** | 0/10 | 5K+, 1K+, 100+ |
| jacks or better strategy | **#3** | 0/10 | 5K+, 50K+, 100+ |
| free video poker | #12 | 0/10 | 500K+, 100K+, 50K+ |
| video poker | #17 | 10/10 | 1M+, 500K+, 100K+ |
| video poker strategy | #20 | 1/10 | 1M+, 10K+, 50+ |
| multi hand video poker | #22 | 0/10 | 100K+ ×3 |
| video poker no ads | #23 | (9/10 contain "video poker") | 500K+, 1M+, 50K+ |
| vegas video poker | #26 | 0/10 | ?, 500K+, 100K+ |
| video poker with friends | #27 | 0/10 | ?, 1M+, 100K+ |
| video poker trainer | #30 | 3/10 | 50K+, 100+, 500K+ |
| deuces wild | **not in top 30** | 8/10 | 50K+, 10K+, 5K+ |
| deuces wild offline | not in top 30 | — | 5K+, 50K+, 5K+ |
| offline video poker | not in top 30 | 0/10 | 500K+, 1M+, 100K+ |
| bonus poker / double bonus poker | not in top 30 | 0/10 | up to 1M+ |
| triple play poker / five play poker | not in top 20/10 | 1/10 | 50K+ to 50M+ (Texas Hold'em apps) |
| poker machine / draw poker / 5 card draw | not in top 30 | 0/10 | 500K+ to 1M+ |

Reading: we rank wherever the query matches the **title** ("jacks or better"). We are invisible for "deuces wild", where 8 of the top 10 titles contain the phrase, even though the short description has carried "Deuces Wild" since 2026-09-23. On Play the title carries most of the ranking weight, and the short description plus full description are not enough to rank on these competitive head terms.

## 3. Primary keywords (en-US)

Legend: Demand = estimated tier from autocomplete (AC#n = position n in Play autocomplete for the prefix shown). Competition = measured proxy (exact phrase in top-10 titles, plus install bands of the leaders).

| # | Keyword | Demand (est.) and evidence | Competition (measured proxy) | Our rank | Relevance | Covered now | Placement / action |
|---|---|---|---|---|---|---|---|
| 1 | **video poker** | High. AC#1 for "video poker" | Very high: 10/10 titles; 1M+ leaders | #17 | 1.00 | Title, short, full (1.59%) | Keep at the start of the title. Do not dilute it. |
| 2 | **jacks or better** | High. AC#1-2 for "jacks or" | Medium: 9/10 titles, but leaders are mostly 5K+ apps | #3 | 1.00 | Title, short, full | Keep in the title. This is our best ranking asset. |
| 3 | **video poker offline** / offline video poker | High. AC#1 for "video poker o"; also "video poker offline free" (#2) and "deuces wild video poker offline" (#5) | High: 500K+/1M+ leaders; 12/24 competitors say "offline" | not in top 30 | 1.00 | Short (first word), full (0.80%) | Already in the short description. Gap: the word order "video poker offline" never appears in the text. Add that exact phrase once to the full description. |
| 4 | **deuces wild** (+ "deuces wild video poker") | High. AC#1-2 for "deuces wild" | High on the title lever: 8/10 titles | **not in top 30** | 0.95 | Short, full (0.60%) | Title is the only real lever, and it is 28/30 already. See title options in section 7. |
| 5 | **video poker trainer** | Med-High. AC#4 under bare "video poker"; AC#1 for "video poker t"; "jacks or better video poker trainer" is AC#3 for "jacks or" | Medium: a niche of 5+ trainer apps, mostly 1-100 installs (launched Aug-Oct 2026), plus one 50K+ (RCS) | #30 | 0.90 | **"trainer" appears 0 times** | Add "trainer" to the full description (heading plus body). Candidate for a short-description experiment. |
| 6 | **video poker strategy** | Med. AC#1-2 for "video poker s" ("…strategy", "…strategy app") | Low-Med: 1/10 titles | #20 | 0.90 | Full ("strategy hints") | Raise to 2-3 mentions. Pair it with "jacks or better strategy", where we are #3. |
| 7 | **multi hand video poker** | Med. AC#1 for "video poker m" ("video poker multi hands"); "multi hand video poker free" | High: 100K+ ×3 leaders | #22 | 0.95 | Short ("multi-hand"), full | Keep. Add the spaced form "multi hand video poker" once. Play tokenises "multi-hand" and "multi hand" differently; this is **unverified**, but cheap to hedge. |
| 8 | **triple play video poker** | Med. "triple play video poker games free" is AC#1 for "triple play"; "video poker triple play" AC#5 for "video poker t" | Med: November31 Triple Play Poker 50K+ | not in top 20 | 0.90 | Full (0.40%) | Full description, 2-3 mentions. The experiment variant "offline-triple-play" already exists. |
| 9 | **video poker double up** / jacks or better double up | Med. AC#3 for "video poker d"; AC#5 for "jacks or better"; "video poker with double up" AC#3 for "video poker w" | Low: no title uses it | n/m | 0.85 | Full ("Double up" ×2) | Underused, given 3 separate autocomplete hits. Add "video poker with double up" phrasing to the full description. |
| 10 | **video poker no ads** | Med. AC#1 for "video poker n"; "poker offline no ads" also an AC | Low on the truth of the claim: 23/24 competitors carry the "Contains ads" label | #23 | 1.00 | Full ("no ads" ×2) | **Full description and graphics only.** Never in the short description (2026-09-09 Play promotion flag). Repeat it in a sentence near the top of the full description. |

## 4. Secondary keywords (full description / screenshots)

| Keyword | Evidence | Relevance | Note |
|---|---|---|---|
| free video poker / video poker free / video poker games free | AC#2-3 for "video poker"; we are #12 for "free video poker" | 0.90 | **Full description only.** No "free" in title or short description. |
| bonus poker | AC#1 for "bonus poker" | 0.90 | Not in top 30. Full description: name it in a bullet and in body text. |
| double bonus poker | AC#1 for "double bonus" | 0.90 | Same as bonus poker. Spell out "Double Bonus Poker" (the current bullet does). |
| poker offline / offline poker games | AC lists for both | 0.70 | Dominated by Texas Hold'em apps (Poker Offline, 5M+). Low odds of ranking; keep it as supporting text. |
| draw poker / draw poker offline | AC "draw poker offline", "draw poker game free offline" | 0.70 | Already in the closing line. Add "draw poker offline" once. |
| poker machine | AC#1 "poker machine" (AU "poker machines free games australia") | 0.70 | Results are mostly slots (Quick Hit, Heart of Vegas). Mention it once; don't chase it. |
| video poker casino / vegas video poker | AC#5 "video poker casino"; we are #26 for "vegas video poker" | 0.80 | Already present ("Las Vegas", "casino"). |
| video poker classic | AC in RU/TR/JA lists ("video poker classic") | 0.80 | "classic" appears 4× in the full description. |
| video poker with friends | We are #27 | 0.60 | Friends leaderboard is real, but the term is dominated by multiplayer apps. Low priority. |
| video poker multi | AC#2 "video poker m" | 0.90 | Covered by "multi-hand". |

## 5. Long-tail keywords (low competition, high relevance)

| Long-tail | Evidence | Our rank | Action |
|---|---|---|---|
| jacks or better offline | Measured rank | #3 | Keep. Already a natural phrase in the title plus the short description. |
| jacks or better strategy | Measured rank | #3 | Add the exact phrase once ("exact Jacks or Better strategy"). |
| jacks or better trainer / jacks or better video poker trainer | AC (US, DE) | n/m | Add the phrase once. |
| deuces wild video poker offline | AC#5 "video poker o", AC#2 "deuces wild v" | not in top 30 | Add the exact phrase once in the full description. |
| video poker offline no ads | AC "poker offline no ads", "video poker no ads" | n/m | Full description sentence. |
| video poker with double up | AC#3 "video poker w" | n/m | Full description. |
| multi hand video poker free | AC#1 "multi hand" | #22 (head) | Full description only (contains "free"). |
| triple play video poker games free | AC#1 "triple play" | n/m | Full description only. |
| video poker strategy app | AC#2 "video poker s" | #20 (head) | Full description. |
| video poker tutorial / training | AC#2-3 "video poker t" | n/m | Low effort: one sentence ("learn as you play"). Relevance 0.75: we have hints, not a tutorial. |

## 6. Do NOT target (false or policy-risky for this app)

| Term | Why |
|---|---|
| 9/6, full pay, full-pay | Paytable is 7/5. Competitor S7SOFTWARE advertises "Classic 9/6". Do not match it. Also reword "A full paytable for every variant" to "The complete paytable…", because "full pay" matches as a substring for searchers. |
| double double bonus, triple double bonus, joker poker, ultimate x, hundred play, ten play | Not in the app (4 variants, max 5 hands). These are high-AC terms, but claiming them = misleading metadata. |
| live leaderboards, rooms, tournaments, online multiplayer, Facebook, cloud backup | Native 3.0 has none of these. **13 localized short descriptions still say "live" leaderboards. Fix this (see section 8).** |
| win real money, kumar (TR), penghasil uang (ID) | Real-money intent. Wrong audience and policy risk. |
| "free", "no ads", "100%", "#1" in the **short description** or title | Play promotion-eligibility flag history (2026-09-09). Competitors do this ("#1 Video Poker Game…"), but that does not make it safe for us. |
| texas holdem, slots | Irrelevant traffic, and installs will churn. |

## 7. Implementation guide (en-US; inputs for aso-optimizer, nothing changed yet)

- **Title (30):** keep "Video Poker: Jacks or Better" (28) for now. It holds #3 / #17. "Deuces Wild" can only rank via the title, and nothing fits in 2 spare characters. Options for a later sequential test (Play store-listing experiments cannot test the title):
  - A: `Video Poker: Jacks, Deuces Wild` (31, **over the limit**, so no)
  - B: `Jacks or Better & Deuces Wild` (29). Drops the "Video Poker" head term, where we are #17. High risk.
  - C: `Video Poker - Deuces & Jacks` (28). Loses the exact "jacks or better" phrase (#3). High risk.
  - Recommendation: **no title change** until "video poker" and "jacks or better" ranks are stable post-3.0 (2+ weekly readings). Then decide between B and the status quo using 2 weeks of logged ranks.
- **Short (80):** the current text is solid and policy-safe. For the experiment queue, test a "trainer" variant against the control, e.g. `Offline video poker trainer: Jacks or Better, Deuces Wild, exact hints` (70, no price/promo words). Measure "video poker trainer" and "video poker offline" rank.
- **Full description (4,000; 1,255 chars free):** add, without stuffing (keep "video poker" at 1.5-2.5%):
  1. A "VIDEO POKER TRAINER: EXACT STRATEGY HINTS" heading. Include the phrases "video poker trainer", "jacks or better strategy", "video poker strategy".
  2. Exact phrases once each: "video poker offline", "deuces wild video poker offline", "multi hand video poker", "video poker with double up", "draw poker offline".
  3. A sentence near the top: "No ads, no purchases, no real money." It already exists. Keep it within the first 250 characters.
  4. Replace "A full paytable" with "The complete paytable".
- **Screenshots / feature graphic:** caption 5 is already "Exact strategy hints". Consider "Video poker trainer" as its kicker (unverified effect on conversion; the A/B tool can measure it).
- **iOS (if ever launched):** the App Store gives a 30-character subtitle and a 100-character keyword field. The iTunes API top 10 for "deuces wild" is dominated by old (2017-2019) apps, so a Deuces Wild subtitle would face lower competition there than on Play (estimate). Suggested split: title "Video Poker: Jacks or Better", subtitle "Offline Deuces Wild Trainer", keywords `bonus,double,triple,play,multi,hand,strategy,hints,casino,draw,machine,classic,vegas,card,game,wifi` (99/100). Words already in the title or subtitle (video, poker, jacks, better, offline, deuces, wild, trainer) are left out because Apple indexes them already. **Unverified. iOS is out of scope.**

## 8. Localized keyword opportunities (top 5 per priority market)

Status codes: **AC** = term appears in Play autocomplete for that hl/gl (measured existence, not volume). **R#n** = our measured web search position in that country. **UNV** = unverified idea (no AC hit, or not measured).

Cross-locale findings (measured):
- **0 of the 15 non-English listings contain any word for "offline / no internet".** Yet autocomplete shows offline / no-internet demand in ES, MX, BR, DE, RU, TR, ID and JA. This is the single biggest localized gap.
- **13 of the 15 localized short descriptions say "live" leaderboards** (es, pt-BR, de, fr, it, pl, ru, tr, hi, ja, ko, zh, ar). The native app only has a daily friends leaderboard. id and iw-IL say "leaderboards" without "live". The en-US short description was fixed on 2026-09-23; the other 15 locales were not. Replacing the leaderboard clause with a localized "offline / no internet" clause fixes accuracy **and** adds the missing keyword.
- On the web, Mexico (es-419) receives the es-ES listing and Portugal (pt-PT) receives pt-BR (measured by fetching our page with `hl=es-419&gl=mx` / `hl=pt-PT&gl=pt`). There is no es-419 listing.

### ES (es-ES, also served to LatAm on the web)
| # | Keyword | Evidence | In listing now | Placement |
|---|---|---|---|---|
| 1 | videopóker / video póker | AC; **R#1 "videopóker"**, R#13 "video poker" (ES); R#12 (MX) | Title + full (8+3) | Keep |
| 2 | póker sin internet / sin conexión | AC (ES and MX: "poker sin internet", "poker sin conexión", "…sin internet en español") | **0** | Short (replace "clasificaciones live") + full |
| 3 | video póker para doblar / doblar | AC#2 for "video poker" in both ES and MX ("video poker gratis para doblar") | "doble o nada" ×1, "doblar" 0 | Full ("doblar la apuesta hasta 5 veces") |
| 4 | póker sin anuncios / sin dinero real | AC (ES, MX) | Full ×4 / ×2 | Full only (promo-word rule for short) |
| 5 | maquinita de póker (LatAm) | AC (MX: "maquinita poker", "video poker maquinita", "maquinita de poker sin internet") | 0 | Full description, plus a future es-419 listing |
Also: "jacks or better" R#1 ES.

### PT-BR
| # | Keyword | Evidence | In listing now | Placement |
|---|---|---|---|---|
| 1 | **video poker** (English spelling) | AC; R#11 BR. **"vídeo pôquer": 0 autocomplete suggestions, and we are not in the results for it** | Title says "Vídeo Pôquer" (14× "pôquer" vs 4× "poker") | **Title: consider "Video Poker: Jacks or Better"** (strong measured signal) |
| 2 | poker sem internet | AC | 0 | Short + full |
| 3 | poker offline (em português) | AC ("poker offline em portugues") | 0 | Short + full |
| 4 | máquina de poker | AC | "máquina" ×2 | Full |
| 5 | poker grátis / video poker grátis | AC ("video poker gratis" #2) | "grátis" ×6 | Full only |
Also: "jacks or better" R#2 BR.

### DE
| # | Keyword | Evidence | In listing now | Placement |
|---|---|---|---|---|
| 1 | Videopoker / Video Poker | AC (both map to "video poker"); R#12 "videopoker", R#15 "video poker" | Title "Videopoker"; "video poker" ×1 | Keep the title; add 2 more "Video Poker" (two-word) mentions in the full description |
| 2 | Video Poker offline / Poker offline | AC#3 for "video poker"; "poker offline deutsch" | **0** | Short (replace "Live-Ranglisten") + full |
| 3 | Poker ohne Werbung | AC | "ohne Werbung" ×3 | Full only |
| 4 | Poker ohne echtes Geld / ohne Geld | AC | "Echtgeld" ×4 | Full: add the exact "ohne echtes Geld" |
| 5 | Jacks or Better Trainer / Poker Trainer offline | AC ("jacks or better trainer" #2, "poker offline trainer") | "Trainer" 0 | Full |
Also: "jacks or better" **R#1 DE**; "video poker calculator" AC (UNV relevance: we show hints, not a calculator).

### RU
| # | Keyword | Evidence | In listing now | Placement |
|---|---|---|---|---|
| 1 | видеопокер | AC; R#10 | Title + full ×11 | Keep |
| 2 | видео покер (two words) | AC ("видео покер без интернета", "…игровой автомат"); **not in results for it** | 0 | Full ×2 |
| 3 | покер без интернета | AC (5 variants) | 0 | Short (replace "живые таблицы лидеров") + full |
| 4 | покер офлайн / оффлайн (both spellings in AC) | AC | 0 | Full: use both spellings once |
| 5 | покер автомат | AC ("покер автоматы без интернета") | "автомат" ×3 | Full: exact phrase |
Caveat: Play availability and payments in Russia are restricted. Russian-speaking demand also comes from KZ/BY/CIS (UNV).

### TR
| # | Keyword | Evidence | In listing now | Placement |
|---|---|---|---|---|
| 1 | video poker | AC; **not in the TR results (20 results seen)**, though R#2 for "jacks or better" | Title + full ×12 | Verify TR country availability first (action-research P0) |
| 2 | poker internetsiz / internetsiz poker oyunu türkçe | AC | 0 | Short + full |
| 3 | poker oyunu | AC | UNV count | Full |
| 4 | video poker trainer / strateji | AC ("video poker trainer" #5) | "strateji" ×2 | Full |
| 5 | çevrimdışı poker | AC (itself only, so low demand, est.) | 0 | Full |
Avoid "kumar" (gambling; AC shows real-money intent).

### ID
| # | Keyword | Evidence | In listing now | Placement |
|---|---|---|---|---|
| 1 | video poker | AC; R#9 | Title + full ×12 | Keep |
| 2 | video poker offline | AC#2 for "video poker"; R#17 | **0** | Short (replace "papan peringkat") + full |
| 3 | game poker offline | AC | 0 | Full |
| 4 | video poker gratis | AC#4 | "gratis" ×8 | Full only |
| 5 | poker klasik | AC (low, est.) | "klasik" ×3 | Full |
Avoid "video poker jackpot" (AC, but there is no progressive jackpot in the app) and "penghasil uang" (real-money intent).

### JA
| # | Keyword | Evidence | In listing now | Placement |
|---|---|---|---|---|
| 1 | ビデオポーカー | R#17 JP (**0 AC suggestions**, so demand is unclear) | Title + full ×10 | Keep |
| 2 | video poker (Latin script) | AC (incl. "video poker strategy", "trainer", "classic"); R#13 JP | ×1 | Full ×2-3 |
| 3 | ポーカー オフライン | AC#5 for "ポーカー" | **0** | Short (replace "ライブランキング") + full |
| 4 | ポーカー 無料 / ポーカーゲーム 無料 | AC | "無料" ×8 | Full only |
| 5 | ポーカーゲーム | AC | UNV | Full |

### Other locales (UNV, not measured this pass)
FR "vidéo poker hors ligne", IT "video poker offline / senza internet", PL "poker offline / bez internetu", KO "비디오 포커 오프라인", ZH "单机 视频扑克 / 离线", HI "वीडियो पोकर ऑफलाइन", IW "וידאו פוקר אופליין", AR "فيديو بوكر بدون إنترنت". All 8 listings have 0 offline terms (measured). The keyword ideas themselves are unverified.
