# Competitor Intelligence: Video Poker: Jacks or Better (com.micorlov.videopoker)

Data fetched: 2026-10-14 (US, `hl=en&gl=us`). Every figure in the tables is **measured** from the Google Play detail page (`https://play.google.com/store/apps/details?id=<pkg>&hl=en&gl=us`): title and short description from the page's ld+json, rating and rating count from `aggregateRating`, installs band from the "Downloads" badge, "Updated on" date, and the "Contains ads" / "In-app purchases" labels from the header. Raw data: `raw-data/play-competitors-2026-10-14.json` (59 apps), `raw-data/play-search-top10-us-2026-10-14.json`.
Not measured: screenshot content (images were not inspected). "Notable features" come from each app's own description text.

## 1. Our app today (measured)

| Field | Value |
|---|---|
| Title / short | Video Poker: Jacks or Better / "Offline video poker: Jacks or Better, Deuces Wild, multi-hand. No wifi needed" |
| Installs band | **100+** (up from the "10+" noted on 2026-09-09) |
| Rating | **none shown (0 ratings)** |
| Category | Casino · Teen |
| Updated | Oct 14, 2026 (3.0.0 native) |
| Ads / IAP labels | **neither** |
| US positions | #3 "jacks or better", #17 "video poker", #22 "multi hand video poker", not in top 30 for "deuces wild" / "offline video poker" |

## 2. Top US competitors (who actually ranks)

Chosen by how often each app appeared in the top 10 across 9 core queries (video poker, jacks or better, deuces wild, offline video poker, triple play poker, multi hand video poker, video poker trainer, jacks or better offline, deuces wild offline).

| # | App (package) | Short description (measured) | Installs | Rating (count) | Cat. | Updated | Ads / IAP | Where it ranks (US) | Notable features (from its description) |
|---|---|---|---|---|---|---|---|---|---|
| 1 | **Video Poker Classic ®** (com.tapinator.videopokerclassic) | "The #1 Video Poker Game on Google Play! 39 Authentic, Real Video Poker Games." | 1M+ | 4.60 (38,365) | Casino | Oct 7, 2026 | Yes / Yes | #1 video poker, #2 offline video poker, #5 video poker trainer | 39 games, "Skills Trainer for every game", progressive jackpot, offline support, multi-hand |
| 2 | **Video Poker ™ - Classic Games** (com.actiongaming.originalvideopoker), VideoPoker.com | "#1 Original Video Poker Game by videopoker.com- Single & Multi Hand Video Poker" | 500K+ | 4.79 (14,610) | Casino | Sep 23, 2026 | Yes / Yes | #2 video poker, **#1 offline video poker**, #2 jacks or better, #3 trainer | Official IGT/Action Gaming titles (Triple/Five Play, Ultimate X), online or offline |
| 3 | **Ultimate X Poker™ Video Poker** (com.videopoker.ultimate.x.poker.free) | "Authentic Ultimate X Video Poker. Official Casino Poker with Big Multipliers!" | 100K+ | 4.89 (12,101) | Card | Sep 4, 2026 | Yes / Yes | #3 video poker, **#1 multi hand video poker** | Licensed Ultimate X multipliers |
| 4 | **Video Poker by Pokerist** (com.kamagames.videopoker) | "Classic and multi-hand Video Poker on your phone! More than 40 variations!" | 1M+ | 4.43 (79,602) | Card | Sep 21, 2026 | Yes / Yes | #4 video poker; #1-2 in ES/DE/RU/JA/ID local queries | 40+ variations, free chips, friends; KamaGames network |
| 5 | **Video Poker** (com.november31.video_poker) | "Video Poker - No in-app purchases. Rebuy any time." | 1M+ | 4.17 (13,905) | Casino | May 29, 2026 | **Yes / No** | #7 video poker | 15 games, double up, unlimited rebuy. **Closest "no-IAP" positioning, but it has ads** |
| 6 | **Video Poker Multi Pro Casino** (com.jackpotmobile.vpmh) | "- 22 Video Poker Multi Hand Games. Most Anywhere! - Three, Five, & Ten Hand!" | 100K+ | 4.70 (5,619) | Card | Apr 20, 2026 | Yes / Yes | #3 offline video poker, #3 multi hand, #7 triple play poker | 22 games, 3/5/10 hands, offline support |
| 7 | **Multi-Play Video Poker™** (com.rubyseven.multistrikepoker) | "Play 50+ variations of Video Poker like Jacks or Better, Deuces Wild and more!" | 100K+ | 4.62 (4,077) | Casino | Jun 1, 2026 | Yes / Yes | #2 multi hand, #4 triple play poker | 50+ variations, leaderboards |
| 8 | **Jacks or Better - Offline** (com.spacesheep.jacksorbetter) | "Unlimited Resets, Play Offline and No Popup Ad Interruptions!" | 5K+ | 4.27 (18) | Card | Oct 8, 2025 | Yes / No | **#1 jacks or better, #1 jacks or better offline** | Single game, offline in the title; sister app "Deuces Wild - Offline" (5K+, 4.28/73) is #1 for "deuces wild offline" |
| 9 | **Deuces Wild Classic - Casino V** (com.tapinator.vpc.dw) | "The #1 Deuces Wild Video Poker Game on Mobile!" | 50K+ | 4.63 (1,250) | Casino | Apr 10, 2026 | Yes / Yes | **#1 deuces wild**, #2 deuces wild offline | Single-variant spin-off of #1 |
| 10 | **Video Poker - Jacks or Better** (com.rcs.video_poker_trainer_job), RCS Network | "Jacks or better video poker game with a strategy analysis engine built-in" | 50K+ | 4.32 (259) | Card | Oct 10, 2026 | Yes / No | **#1 video poker trainer**, #5 jacks or better (DW sibling #6 deuces wild) | Hint button, mistake popup, error stats, selectable paytables. **Closest functional rival to our hints** |

Benchmarks from `competitor_analyzer.py` on apps 1-10: average rating **4.54**, average rating count **16,980**, average description 2,157 chars (ours 2,823). The module rates us "Weak Position: Bottom quartile". That verdict is driven almost entirely by the 0-rating input, not by the metadata.

### Emerging niche: exact-strategy trainers (new in Aug-Oct 2026)
| App | Short description | Installs | Ads / IAP | Updated |
|---|---|---|---|---|
| SmartHold Video Poker Trainer (com.smarthold.app) | "Learn the perfect video poker hold with instant exact-strategy feedback. No ads." | 50+ | No / Yes | Oct 9, 2026 |
| Video Poker Trainer (software.counter.videopoker) | "Exact optimal video poker strategy. Every hand graded to the coin, 11 games." | 1+ | No / No | Oct 10, 2026 |
| Video Poker Strategy Trainer (com.videopokerlab.trainer) | "Video poker calculator: Jacks or Better & Deuces Wild strategy, exact hold odds" | 50+ | No / Yes | Sep 21, 2026 |
| Video Poker: Jacks or Better (com.innovizea.cardsharkpoker) | "Video poker trainer — optimal holds on Jacks or Better, Deuces Wild + 6." | 10+ | Yes / Yes | Aug 29, 2026 |
| Video Poker Trainer game (com.khralz.videopoker) | "Practice video poker strategy: Jacks or Better, Deuces Wild & more!" | 100+ | Yes / No | May 29, 2026 |

Takeaway: "exact strategy hints" is a real differentiator against the big casino apps (1-7 above). It is **not** unique against trainers, which offer 8-11 games and selectable paytables; we offer 4 variants and only a 7/5 JoB table. Several of these trainers are as new and as small as we are. SmartHold uses "No ads" in its short description; that does not make it safe for us (see policy history).

### Title collisions (measured)
Two other live apps use our **exact title** "Video Poker: Jacks or Better": com.innovizea.cardsharkpoker (10+, #7 for "jacks or better") and com.S7SOFTWARE.VideoPokerJACKORBETTER (1K+, 3.7★/21, **advertises "Classic 9/6"**, #8). A fourth is "Video Poker – Jacks or Better" (poker.casino.cards, 50+). Our icon and short description must do the disambiguation, because the title cannot.

## 3. Keyword and feature gaps: what competitors don't offer that we really do

Coverage counted over title + short + full description of the 24 video-poker competitors in the first fetch (measured; context checked to drop false substring hits).

| Our verified feature | Competitors that state it | Opportunity |
|---|---|---|
| **No ads AND no in-app purchases** | Of 46 video-poker apps fetched, **38 carry "Contains ads" and 31 carry "In-app purchases"**. Only 3 have neither, and none of them is above 10K installs: Quikthinking "Video Poker Jacks Or Better" (1K+, 3.71★/8), Play Perfect Lite (10K+, 3.57★/39), Video Poker Trainer (1+). | **Biggest real differentiator.** Every top-10 casino competitor has both labels. The Play UI shows the labels on the listing, so put "No ads. No purchases." prominently in the first screenshot, the feature graphic, and the first line of the full description (it is already there). Never put it in the short description. |
| **Exact-EV hints + mistake feedback + strategy accuracy stat** | Of the 24, only Play Perfect Lite (3.57★, 10K+) describes optimal-hold advice; 0 casino-style apps describe exact-EV hints. 7/24 mention a generic "Skills Trainer" (Tapinator ×3, VideoPoker.com family, Funnut, Happen Labs, ddbirdwork). The RCS trainer and the 5 new trainer apps do this explicitly. | Use the searched word **"trainer"** (0 uses in our listing today, while "video poker trainer" is AC#4 under "video poker"). Position: "a full casino video poker game **and** an exact-strategy trainer, without ads". |
| **16 languages incl. RTL** | **0/24** mention languages. Most top apps appear to ship English-only listings (UNV for their in-app languages). | Good conversion copy for non-English markets. The real ASO value is local keyword ranking, which we already show (#1 "videopóker" ES, #1 "jacks or better" DE/ES, #9 "video poker" ID). |
| **Offline / no wifi** | 12/24 mention offline (mostly a bullet like "Offline support"). Only 2 put it in the title (Space Sheep). | **Table stakes, not a differentiator**, but under-claimed in titles. We lead the short description with it (good). **None of our 15 localized listings mention it.** |
| **Double up (up to 5×)** | 4/24 mention double up | 3 en-US autocomplete hits ("video poker double up", "jacks or better double up", "video poker with double up"), plus ES "para doblar" is AC#2. Underused. |
| **Triple Play / Five Play naming** | 6/24 say "Triple Play", 3/24 "Five Play" | Mid-demand terms; the IGT-licensed apps own them. Keep them in the description. |
| **Win-streak bonus, daily ALL IN** | 0/24 use these names | Retention hooks, not search terms. Better as screenshot captions. |
| **No real money, adult disclaimer** | 19/24 contain a disclaimer | Parity |

## 4. Where we are weak (honest list)

| Weakness | Evidence (measured) | Impact | What would close it |
|---|---|---|---|
| **No ratings / no social proof** | 0 ratings vs a 4.54 average and 16,980 average count for the top 10; the smallest direct rival (Space Sheep JoB) has 18 | Conversion (no star shown in results), and likely ranking quality signals | The native in-app review prompt exists (`android-native/.../ui/InAppReview.kt`); confirm when it fires in 3.0. Run the friends seed (`play-store-assets/01-friends-seed.md`). Reply to every review. |
| **Tiny install base** | 100+ vs 5K+ to 1M+ | Weak engagement signals for ranking | Organic only. Focus on the queries where we already rank (#3), on local markets, and on conversion. |
| **Invisible on "deuces wild"** | Not in top 30, 8/10 top titles contain the phrase | Loses a high-demand head term | Title-only lever (see keyword-list section 7). Short and full description mentions have not been enough since 09-23. |
| **Thin game catalogue** | 4 variants vs 15-50+ (Tapinator 39, Pokerist 40+, Ruby Seven 50+); max 5 hands vs 10/25/100 | Variant-specific queries (bonus poker, double bonus, double double, joker) go to others | Product decision, not ASO. Do not claim variants we lack. |
| **Single 7/5 JoB paytable** | Competitor S7SOFTWARE sells "9/6"; trainers offer paytable selection | Strategy-savvy players may prefer 9/6 or selectable tables; it also blocks "full pay" keywords | Product decision. Never claim 9/6 or full pay. |
| **Localized listings out of date** | 13/15 short descriptions say "live" leaderboards (the native app has only a daily friends leaderboard); 0/15 mention offline | Accuracy risk (misleading-claims policy), and missed local keywords | Rewrite 15 short descriptions (see action-research P0). |
| **pt-BR title spelling** | "vídeo pôquer" has 0 autocomplete suggestions and we are not in its results; "video poker" is AC and we are #11 in BR | Brazil is a top casino-card market | Consider "Video Poker: Jacks or Better" as the pt-BR title. |
| **Title collisions** | 2 other apps use the identical title | Users may tap the wrong app; reviews can get confused | Distinct icon. "Offline … No wifi needed" short description already differs. |
| **No promo video** | GROWTH-PLAN lists the video as "still to do" | Conversion | Record a 30-second real-gameplay video. |
| **Turkey visibility** | Not in TR results for "video poker" (20 results seen) while #2 for "jacks or better" | Possible availability or ranking issue | Verify country availability in Play Console. |

## 5. Best practices observed (worth copying)

1. **Head term first in the title.** 10/10 of the "video poker" top 10 have "video poker" in the title; 8/10 of the "deuces wild" top 10 have "deuces wild". We already lead with "Video Poker".
2. **Single-variant spin-off apps** (Tapinator DW, DDBP; Space Sheep JoB/DW; RCS JoB/DW) win variant head terms with the variant in the title. A second listing is a product/strategy decision. Noted for completeness; not recommended now.
3. **A number in the short description** ("39 games", "22 multi hand games", "50+ variations") is common among leaders. Ours could use a true number: "4 games, 1-5 hands, 16 languages".
4. **Recency.** All leaders updated within the last 3-5 months, and most within 4 weeks. Our Oct 14 update is a plus; keep monthly updates.
5. **"Offline" in the title wins the long tail.** None of the big leaders put "offline" in the title, but Space Sheep's two 5K+ apps do, and they rank #1 for both "jacks or better offline" and "deuces wild offline" with only 18 and 73 ratings.

## 6. Competitive positioning statement (draft for aso-optimizer)

"The video poker trainer that plays like the casino: Jacks or Better, Deuces Wild, Bonus and Double Bonus, single, Triple or Five Play, with exact strategy hints, fully offline, no ads, no purchases, in 16 languages."
Every element is verified against the code. "Trainer" + "no ads/no IAP" + "offline" + "16 languages" is a combination that **none** of the 46 video-poker apps fetched offers in full. That comparison is based on their listing text, and their in-app reality is unverified.
