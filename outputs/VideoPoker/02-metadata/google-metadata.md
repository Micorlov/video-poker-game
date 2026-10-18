# Google Play Metadata: Video Poker: Jacks or Better (en-US)

**App:** com.micorlov.videopoker (native Kotlin 3.0.0, versionCode 15)
**Platform:** Google Play only
**Prepared:** 2026-10-14 (day 0 of 3.0). Nothing here has been uploaded or applied to the repo.
**Character limits used:** title 30, short description 80, full description 4,000. All counts below were produced by script (`String.length`), not by eye.

## Summary

| Field | Recommendation | Length | Status |
|---|---|---|---|
| Title | `Video Poker: Jacks or Better` | 28/30 | **Keep unchanged for now** (decision section below) |
| Short description | `Offline video poker: Jacks or Better, Deuces Wild, multi-hand. No wifi needed` | 77/80 | **Keep unchanged** (already compliant); two challengers staged for a test |
| Full description | New text below | 3209/4,000 | **Replace now** (adds trainer / offline phrases, fixes "full paytable") |

## Title (28/30 characters)

```
Video Poker: Jacks or Better
```

## Short description (77/80 characters)

```
Offline video poker: Jacks or Better, Deuces Wild, multi-hand. No wifi needed
```

No price or promotion words (free, no ads, 100%, bonus-offer wording). "No wifi needed" and "multi-hand" are factual. This is the text that has been live since 2026-09-23; it is already the safest policy-wise, so the full-description rewrite is the only copy change recommended today (one change at a time).

## Full description (3209/4,000 characters)

```
Offline video poker trainer and casino game in one. Play Jacks or Better, Deuces Wild, Bonus Poker and Double Bonus in single hand, Triple Play or Five Play, with exact strategy hints. No wifi needed, no ads, no purchases, no real money.

PLAY VIDEO POKER OFFLINE
No internet? Deal anyway. Every game, paytable and daily chip bonus works with no wifi and no mobile data, and your chips and stats are saved on your phone after every hand. Only sign-in, invites and the friends leaderboard need a connection.

VIDEO POKER TRAINER: EXACT STRATEGY HINTS
Learn Jacks or Better strategy while you play. Turn on hints and the game works out the best hold for every deal from the exact odds. After the draw it tells you whether you played it right and what a mistake cost, and the Stats screen tracks your strategy accuracy. Think of it as video poker strategy practice built into a full casino-style game.

FOUR CLASSIC VIDEO POKER GAMES
• Jacks or Better – the classic game, ready from your first hand
• Deuces Wild – every 2 is wild; play Deuces Wild video poker offline and chase Four Deuces and the Wild Royal Flush
• Bonus Poker – bigger payouts for Four Aces and low quads
• Double Bonus Poker – premium four-of-a-kind pays for high-variance play
New variants unlock as you level up, so there is always a next goal.

MULTI HAND VIDEO POKER
Play one hand, Triple Play (3 hands) or Five Play (5 hands) from a single deal. Hold once, draw across every hand, the way multi-hand machines in Las Vegas work. Triple Play video poker and Five Play unlock as you level up.

THE COMPLETE PAYTABLE, ALWAYS ON SCREEN
Every game shows its complete paytable while you play, so you always know what each hand pays. Jacks or Better uses the 7/5 table: a Full House pays 7 and a Flush pays 5.

VIDEO POKER WITH DOUBLE UP
Feeling lucky after a win? Double up against the dealer's card, up to five times in a row, or collect and keep your chips.

FREE CHIPS EVERY DAY
Daily chip bonus, the daily ALL IN mega-bet, win streaks with payout bonuses up to +50%, and levels that unlock new variants and multi-hand modes. Free to play, no purchases, no ads, and a free rebuy when you run out means you never go bust.

PLAY WITH FRIENDS
Sign in with Google, invite friends with a link and see who has won the most chips today on your friends leaderboard. It starts fresh every day, so every day is a new race. Invite a friend and you both earn 1,000 bonus chips.

BIG, CLEAR CARDS
Large cards and buttons designed for phones and tablets, with one-hand portrait play.

16 LANGUAGES, FULL RIGHT-TO-LEFT SUPPORT
English, Spanish, Portuguese, German, French, Italian, Polish, Russian, Turkish, Indonesian, Hindi, Japanese, Korean, Chinese, Hebrew and Arabic. The game matches your device language automatically.

Whether you call it video poker, draw poker, 5 card draw or a poker machine, this is the classic you know from the casino floor, free to play and with no ads. Draw poker offline, wherever you are.

This game is intended for an adult audience and does not offer real money gambling or any opportunities to win real money or prizes. Practice or success at social casino gaming does not imply future success at real money gambling.
```

### What changed against the live full description

1. **First 250 characters rewritten** to lead with "Offline video poker trainer", then the four variants, Triple/Five Play, "exact strategy hints", "no wifi needed, no ads, no purchases, no real money". "Trainer" had 0 mentions before.
2. **New section "VIDEO POKER TRAINER: EXACT STRATEGY HINTS"** (moved up from the bottom). It adds "video poker trainer", "Jacks or Better strategy". Wording says the hints come "from the exact odds" and does not promise optimal play on any paytable other than the ones in the game.
3. **"A full paytable for every variant" replaced** by "THE COMPLETE PAYTABLE, ALWAYS ON SCREEN", so the text no longer matches "full pay" searches. It also states plainly that Jacks or Better is the 7/5 table (verified in `Variant.kt`: Full House 7, Flush 5). That line is deliberate: strategy-minded players who search "trainer" will otherwise find out after installing, and ratings are our largest gap. **Product-owner call:** delete that sentence if you prefer not to state it. Do not replace it with any 9/6 or "full pay" wording.
4. **New section "VIDEO POKER WITH DOUBLE UP"** (three Play autocomplete hits for double up queries; verified: up to 5 in a row, `MAX_DOUBLE_UPS = 5`).
5. **Offline paragraph now says what does need a connection** (sign-in, invites, friends leaderboard). This keeps the offline claim defensible.
6. **Multi-hand honesty:** Triple Play and Five Play unlock with level (level 10 in `Rules.kt`), and the text says so.
7. **Kept as-is (verified against the native code):** daily ALL IN, win streaks up to +50% (`Rules.streakBonus`: 10+ wins = 0.5), invite reward 1,000 chips each (`RewardPolicy`), daily friends leaderboard with UTC reset, 16 languages with RTL, portrait play, and the adult/no-real-money compliance paragraph (verbatim, last paragraph).
8. **Removed / never present:** live or global leaderboards, rooms, Facebook sign-in, cloud backup, 9/6, full pay, landscape.

## Verification (script output)

Searchable text = title + short + full, 587 words.

| Check | Result |
|---|---|
| Title <= 30 | 28 OK |
| Short <= 80 | 77 OK |
| Full <= 4,000 | 3209 OK |
| Promo/price words in short description | none |
| Compliance paragraph present (verbatim) | yes |
| `node scripts/validate-aso.js` on a scratch copy with this text applied | passed (16 listings) |

Forbidden or false claims scan (case-insensitive substring over title + short + full):

| Term | Result |
|---|---|
| `9/6` | absent |
| `full pay` | absent |
| `full-pay` | absent |
| `live` | absent |
| `rooms` | absent |
| `facebook` | absent |
| `cloud` | absent |
| `landscape` | absent |
| `tournament` | absent |
| `global leaderboard` | absent |
| `jackpot` | absent |
| `backed up` | absent |

Keyword presence. "In first 250" refers to the first 250 characters of the full description. Density = occurrences divided by total words, the same method as the research file (live text: "video poker" 1.59%).

| Keyword | Count | In first 250 | Density |
|---|---|---|---|
| video poker | 12 | yes | 2.04% |
| jacks or better | 6 | yes | 1.02% |
| deuces wild | 4 | yes | 0.68% |
| offline | 5 | yes | 0.85% |
| trainer | 2 | yes | 0.34% |
| strategy | 5 | yes | 0.85% |
| hints | 3 | yes | 0.51% |
| double up | 2 | no | 0.34% |
| triple play | 3 | yes | 0.51% |
| five play | 3 | yes | 0.51% |
| bonus poker | 3 | yes | 0.51% |
| double bonus | 2 | yes | 0.34% |
| no ads | 3 | yes | 0.51% |
| casino | 4 | yes | 0.68% |

Target phrases from research:

| Phrase | Count | In first 250 | Density |
|---|---|---|---|
| video poker offline | 2 | no | 0.34% |
| video poker trainer | 2 | yes | 0.34% |
| jacks or better strategy | 1 | no | 0.17% |
| video poker strategy | 1 | no | 0.17% |
| deuces wild video poker offline | 1 | no | 0.17% |
| multi hand video poker | 1 | no | 0.17% |
| video poker with double up | 1 | no | 0.17% |
| triple play video poker | 1 | no | 0.17% |
| draw poker offline | 1 | no | 0.17% |
| poker machine | 1 | no | 0.17% |

"video poker" sits at 2.04%, inside the 1.5 to 2.5% band the research set; the text was trimmed from 15 mentions to 12 to stay natural. "draw poker offline" and "poker machine" appear once each in the closing line. "free" appears in the full description only (4 times); it is not in the title or short description.

Not verifiable from here: whether Play treats "multi-hand" and "multi hand" as one token (research marks this unverified; both forms are present).

## Alternates

### Title alternates (each must be 30 characters or fewer)

| # | Text | Length | What it gains | What it costs |
|---|---|---|---|---|
| A | `Jacks or Better & Deuces Wild` | 29/30 | Puts "deuces wild" in the title, the only lever for a head term where 8 of the top 10 titles carry the phrase and we are outside the top 30. Keeps the exact phrase "jacks or better" (our #3). | **Drops "Video Poker" from the title**, the head term where we are #17 (10/10 top titles have it). The short and full description still carry it, but title weight is the main ranking lever on Play. Also makes the title less obviously a video poker app to someone scanning results. |
| B | `Video Poker Offline Trainer` | 27/30 | Matches "video poker offline" and "video poker trainer" (AC for both; the trainer niche is mostly 1-100 install apps, so competition is lower). Distinguishes us from the two apps with our identical current title. | **Drops "Jacks or Better"**, where we are #3 today, and from 9 of the top 10 titles. Frames the app as only a trainer, which may lower conversion for people who want a casino game. |

Both alternates are hypotheses. Neither can be tested with Play store listing experiments (titles are not testable), so any switch is a sequential before/after with rank logging.

### Short description alternates (all under 80, no promo words)

| # | Text | Length | What it gains | What it costs |
|---|---|---|---|---|
| A | `Offline video poker trainer: Jacks or Better, Deuces Wild, exact hints` | 70/80 | "Trainer" (0 uses elsewhere in the live title/short), the "video poker trainer" phrase (we are #30 there) and the strongest real differentiator, exact hints. | Loses "multi-hand" (we are #22 for "multi hand video poker" mostly from the full text) and "No wifi needed" (the 2nd offline signal). Reads more niche. |
| B | `Video poker offline with exact strategy hints: Jacks or Better, Deuces Wild` | 75/80 | Contains the exact phrase "video poker offline" (not in the text anywhere today) plus "strategy" and "hints" (4 and 3 mentions elsewhere). Does not use the word "trainer", so it suits a user who wants a game with help rather than a drill tool. | Same losses as A. Longer and a little denser. 75/80 leaves little room for a later tweak. |

The existing `offline-triple-play` variant in aso-experiments.json (78 chars) is also compliant, but "Triple Play" is a mid-demand term that the IGT-licensed apps own; it ranks behind A and B for expected value.

## Decision: change the title now, or after post-3.0 rankings stabilise?

**Decision: do not change the title now. Revisit on 2026-11-04 at the earliest.**

Reasoning:

1. **The title is where both measured rankings come from.** #3 "jacks or better" (9 of the top 10 results carry the exact phrase) and #17 "video poker" are title matches. The 30-character cap means "Deuces Wild" cannot be added without dropping one of those two phrases ("Video Poker: Jacks, Deuces Wild" is 31 characters).
2. **Asymmetric risk.** The downside is losing a top-3 position that brings the listing's best-converting traffic. The upside is entering a field where the "deuces wild" leaders have 5K to 50K+ installs and 1,000+ ratings against our 100+ installs and no ratings.
3. **The baseline is not stable yet.** The 2026-10-14 readings are day 0 of a new binary. The 09-09 baseline used an unrecorded method, and web ranks carry roughly +/-3 noise. A title change now would be confounded with the 3.0 re-evaluation and with today's full description change, and we could not attribute the result to either.
4. **Titles cannot be A/B tested on Play.** The only evidence available is before/after rank logs, so a clean pre-period is required. Changing the title also triggers metadata re-indexing, which is slow to reverse.
5. **Low upside inside the existing constraints.** Even a perfect Alt A does not help if the engagement signals (ratings, installs) that decide ranking at the top of "deuces wild" stay at 100 installs.

**Go / no-go gate for 2026-11-04 (my judgment thresholds, not Play rules):**

- Three consecutive weekly readings (10-21, 10-28, 11-04) with "jacks or better" and "video poker" each moving no more than 3 places.
- The Play Console Search terms export (14 days of 3.0 data) shows "deuces wild" family queries as a material share of our search impressions. I suggest at least 20%.
- Ratings are not yet the bottleneck for the same queries (if we have under 10 ratings, a title change will not lift us on a competitive head term anyway).

If all three hold, run Alt A for 3 to 4 weeks with weekly rank logging and revert if "video poker" falls more than 5 places or search-attributed installs fall. If the gate fails, leave the title alone and invest in ratings, the screenshots and the short description test.

**Exception (not en-US):** the pt-BR title is worth changing now because "vídeo pôquer" does not appear in the results at all, so there is no position to lose. See `localized-fixes.md`.

## Short description decision

Keep the live text. Stage Alternate A for the first test or the first sequential change after the 11-04 review. Rationale: only one element should change per measurement window, and the full description change is today's change.

## Implementation

### Option 1: Play Console (manual)

1. Open https://play.google.com/console, select Video Poker: Jacks or Better, then Grow users, Store presence, Main store listing, language English (United States) - en-US.
2. Paste the **Full description** from the block above. Leave title and short description untouched.
3. Console shows the live count. It must read 3209 / 4000.
4. Save, then Send for review (listing changes can take hours to a few days; no app update is needed).
5. Log the date and the old-to-new change in the rank log (`PLAY_STORE_LISTING_DRAFT.md`) and `ASO-MEASUREMENT.md`, because this change overlaps the 3.0 readings.

### Option 2: repo uploader (what the project already uses)

Do this yourself; this pass did not touch `listings.json` or Play Console.

1. Merge `outputs/VideoPoker/02-metadata/listings-patch-full-offline.json` into `play-store-assets/listings.json`. The patch is a per-locale shallow merge, so `en-US` takes only the new `fullDescription`:
```bash
node -e 'const fs=require("fs");const f="play-store-assets/listings.json";const l=JSON.parse(fs.readFileSync(f,"utf8"));const p=JSON.parse(fs.readFileSync("outputs/VideoPoker/02-metadata/listings-patch-full-offline.json","utf8"));for(const [k,v] of Object.entries(p))l[k]={...l[k],...v};fs.writeFileSync(f,JSON.stringify(l,null,2)+"\n")'
```
   For en-US only, apply just the `en-US` key from that file.
2. `node scripts/validate-aso.js`
3. `node scripts/play-listing-upload.js validate` (dry run), then `node scripts/play-listing-upload.js commit`.

Check `git diff play-store-assets/listings.json` before committing: the merge rewrites the file with 2-space indentation.

## Other notes for the owner

- `PLAY_STORE_LISTING_DRAFT.md` section 1 still shows the pre-3.0 description (live leaderboards, rooms, Facebook, cloud backup). `listings.json` is the source of truth, but the draft is misleading if anyone copies from it.
- `listings.json` `whatsNew` for en-US is the 2.6 text (server clock, sync fixes). The 3.0 notes are in `android-native/store-assets/release-notes.json`. Those notes end with "Live leaderboards and poker rooms are paused while we rebuild them" (and "coming soon" equivalents in other languages). That is a forward-looking promise about features the app does not have; consider removing that sentence at the next release.
- Data Safety: the 3.0 app reports to Google Analytics (commit 629d9ab) while the old draft says no analytics SDK. Confirm the Data Safety form matches (not an ASO item, but it is a policy item on the same listing).
