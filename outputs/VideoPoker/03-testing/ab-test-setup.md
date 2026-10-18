# A/B Test Setup: Video Poker: Jacks or Better (Google Play Store Listing Experiments)

Prepared 2026-10-14 (day 0 of native 3.0). Nothing has been created in Play Console. This document corrects `play-store-assets/aso-experiments.json` and explains what is and is not worth testing at the current traffic.

## 1. Reality check: the app is underpowered for A/B testing

Known facts: the listing shows "100+" installs (a lower bound; the Play band hides the real number), no ratings, and went from "10+" on 2026-09-09 to "100+" on 2026-10-14. That is roughly 90 to a few hundred installs in five weeks, so **about 2 to 6 installs per day at best**. Store listing visitors per day are not known; I assume 10 to 25 as a planning range. **Replace that guess with the real number** from Play Console, Statistics, Store listing acquisition (visitors and conversion rate, last 28 days).

Sample size per arm for a two-arm test (two-sided, 80% power; computed with the standard two-proportion formula, z = 1.645 for 90% or 1.96 for 95%, power 0.84 for 80%):

| Baseline conversion | Relative lift to detect | Visitors per arm (90% confidence) | Visitors per arm (95% confidence) |
|---|---|---|---|
| 10% | +10% | 11,618 | 14,749 |
| 10% | +20% | 3,024 | 3,839 |
| 10% | +50% | 538 | 683 |
| 10% | +100% | 155 | 197 |
| 20% | +10% | 5,126 | 6,507 |
| 20% | +20% | 1,324 | 1,680 |
| 20% | +30% | 606 | 769 |
| 20% | +50% | 229 | 291 |
| 20% | +100% | 62 | 79 |
| 30% | +20% | 757 | 961 |
| 30% | +50% | 126 | 160 |

Days needed at a 50/50 split, baseline 20% (90% confidence):

| Visitors per day | +20% lift | +30% lift | +50% lift | +100% lift |
|---|---|---|---|---|
| 10 | 265 days | 122 days | 46 days | 13 days |
| 25 | 106 days | 49 days | 19 days | 5 days |
| 100 | 27 days | 13 days | 5 days | 2 days |

Smallest relative lift detectable in a 14-day test (baseline 20%, 90% confidence, 80% power): **about +95% at 10 visitors per day, +60% at 25, +30% at 100.**

Honest conclusion:

- **At 10 to 25 visitors per day, a 14-day experiment can only detect a roughly 60 to 95% relative improvement.** The icon, the screenshots and the short description will not produce that. A typical real effect is 5 to 20%. A "winner" at this sample size is mostly noise, and "no significant difference" says nothing.
- "Minimum 7 days or 1,000 impressions" in GROWTH-PLAN is not a statistical rule. 1,000 impressions is a count of impressions, not of visitors, and nothing says it is per arm.
- The ASO-MEASUREMENT.md line "keep experiments live for 14 days unless traffic is too low to interpret" is the right instinct; traffic is that low today.
- Experiments also measure **conversion only**. They do not test ranking: keyword changes in text only affect search position once they are published to the whole listing.
- Play Console reports results with a confidence interval (90% is the default I know of; check the UI). Do not stop an experiment the first time the interval looks good ("peeking" inflates false positives).

**Recommendation:** do not run a store listing experiment until you have at least 25 listing visitors per day, and then only test changes expected to move conversion by 30% or more (big swings: a different icon concept, a different first-screenshot message). Until then use the sequential before/after protocol in section 6, which is honest about its limits (it cannot separate your change from seasonality or ranking shifts).

## 2. What Play experiments can and cannot test

| Element | Testable | Notes |
|---|---|---|
| App icon, feature graphic, screenshots, promo video | Yes (default graphics experiment) | Only one default-language graphics experiment at a time. I believe up to 3 variants plus the control; confirm in the UI. |
| Short description, full description | Yes, as a localized experiment (language-specific) | Up to 5 localized experiments at a time, I believe; confirm in the UI. Text experiments measure conversion, not ranking. |
| App title | **No** | Titles cannot be experiment variables. Title decisions need before/after rank logging (see `02-metadata/google-metadata.md`). |
| Developer name, category, price | No | n/a |

Console menu names move around. At the time of writing look for Grow users, then Store listing experiments (older layouts: Store presence, Store listing experiments). Confirm the exact variant and concurrent-experiment limits when you create the first one.

## 3. Audit of `aso-experiments.json` (what to correct)

| Entry | Problem | Correction |
|---|---|---|
| `control` | Correct and compliant (77 chars, no promo words). | Keep. |
| `feature-graphic-01` | `variantAsset` is `play-store-assets/feature_graphic.png`, **the file that is already live**; `android-native/store-assets/feature_graphic.png` is byte-identical. The experiment compares the graphic with itself. The live graphic also says "FREE" and has no offline message. | Create a real variant (`feature_graphic_trainer.png`, spec in `visual-assets-spec.md`). Better: fix the live graphic directly (kicker "OFFLINE · NO REAL MONEY"); that is a correction, not a test. |
| `screenshot-sequence-01` | `controlAssets` are `phone_1/2/3.png` from `play-store-assets/phone/`, the 2026-09-09 **web-era** shots; the native 3.0 set is in `android-native/store-assets/phone/en-US/`. The variant (`phone_2, phone_3, phone_1`) just pushes the "No ads" hero to slot 3. The hypothesis ("core hand, variants, multi-hand first") does not match what the reorder does. | Control = the live native order. Variant = offline-led slot 1 plus hints in slot 2 (order in `visual-assets-spec.md`). Fix the "Tournament" pill before either arm is shot, or both arms carry the same false cue. |
| `short-description-01` variant `offline-led` | Compliant. | Keep as control. |
| `short-description-01` variant `offline-triple-play` | Compliant. Triple Play is a mid-demand term owned by licensed apps. | Keep, but lower priority than the two new challengers. |
| `short-description-01` variant `variant-led` | "...multi-hand play and **live leaderboards**" is **false** for 3.0. Also names "Bonus Poker, Double Bonus". | **Delete.** Replacement if a variant-led test is wanted: `Offline video poker with Deuces Wild, Triple Play and Five Play modes` (69). |
| `short-description-01` variant `social-led` | "...with friends, multi-hand modes and **live leaderboards**" is **false** (daily friends leaderboard only). | **Delete.** Replacement: `Jacks or Better with a daily friends leaderboard. Offline, multi-hand play` (74). |
| `short-description-01` variant `free-play-led` | "Classic video poker with **free** chips, **no ads**, multi-hand play and friends" contains exactly the wording Play flagged on 2026-09-09 (price/promotion keywords), which made the app ineligible for promotion. | **Delete.** Do not put "free" or "no ads" in any short description variant. |
| `short-description-01` (structure) | Five variants in one experiment is far beyond what the traffic supports (section 1). | At most control plus one challenger. |
| `icon-01` | The candidate files `video-poker-app-icon-v2.png` and `video-poker-app-icon-reference.png` **do not exist** in the repo. The hypothesis calls the current mark a "card-and-crown"; the current icon has no crown. Two icons also exist for the control (see `visual-assets-spec.md`). | Decide the control first (the card-mark, not the glamour art), then create one concept variant. |
| `description-opening-01` | Declares an experiment with no variants and no text. The full description's effect on conversion is small (few visitors expand it) and the real purpose of the rewrite is indexing, which an experiment cannot measure. | **Do not test.** Publish the new full description in `google-metadata.md` as a straight update and log the date. |
| `ASO-MEASUREMENT.md` | Says "Run one store listing experiment at a time ... 14 days" (fine). Its keyword set lacks "video poker offline", "video poker trainer", "jacks or better strategy" and "offline video poker". | Add them to the weekly rank list (the research file has the 13-query set). |
| `scripts/validate-aso.js` | Only checks length. It happily passes the three false/flagged variants above. | Suggestion for the owner: add a banned-term check (live, free, no ads, 100%, rooms, tournament, Facebook, cloud) to the experiments and listings loops. I did not edit it. |

Proposed corrected definition (for the owner to paste into `aso-experiments.json`; lengths verified by script, no flagged words):

```json
{
  "appId": "com.micorlov.videopoker",
  "control": {
    "title": "Video Poker: Jacks or Better",
    "shortDescription": "Offline video poker: Jacks or Better, Deuces Wild, multi-hand. No wifi needed"
  },
  "experiments": [
    {
      "id": "short-description-02",
      "order": 1,
      "element": "short_description",
      "locale": "en-US",
      "hypothesis": "A trainer-led line (exact hints) attracts more qualified searchers than the offline-led control.",
      "variants": [
        { "name": "offline-led (control since 2026-09-23)", "text": "Offline video poker: Jacks or Better, Deuces Wild, multi-hand. No wifi needed" },
        { "name": "trainer-led", "text": "Offline video poker trainer: Jacks or Better, Deuces Wild, exact hints" }
      ],
      "backupVariants": [
        { "name": "hints-led", "text": "Video poker offline with exact strategy hints: Jacks or Better, Deuces Wild" },
        { "name": "offline-triple-play", "text": "Offline video poker: Jacks or Better, Deuces Wild, Triple Play. No wifi needed" },
        { "name": "social-led-corrected", "text": "Jacks or Better with a daily friends leaderboard. Offline, multi-hand play" },
        { "name": "variant-led-corrected", "text": "Offline video poker with Deuces Wild, Triple Play and Five Play modes" }
      ],
      "primaryMetric": "store_listing_conversion",
      "secondaryMetrics": ["search_impressions", "installs"],
      "minimumVisitorsPerDay": 25,
      "minimumDetectableRelativeLift": 0.5,
      "note": "Run only when traffic supports it; otherwise run as a sequential change (ab-test-setup.md section 6)."
    },
    {
      "id": "screenshot-order-02",
      "order": 2,
      "element": "phone_screenshots",
      "hypothesis": "Offline and no-ads in slot 1 and exact hints in slot 2 beat the current order.",
      "controlAssets": ["android-native/store-assets/phone/en-US/1.png", "2.png", "3.png"],
      "variantAssets": ["new offline-led 1.png", "android-native/store-assets/phone/en-US/5.png (trainer kicker)", "2.png"],
      "precondition": "Remove the static Tournament pill from the frames in both arms first.",
      "primaryMetric": "store_listing_conversion"
    },
    {
      "id": "icon-02",
      "order": 3,
      "element": "app_icon",
      "hypothesis": "A royal-flush fan reads more clearly than the card-fan at 48 px.",
      "controlAsset": "play-store-assets/icon_512.png",
      "candidateAssets": ["to be created: icon_512_royal_flush.png"],
      "primaryMetric": "store_listing_conversion",
      "note": "Do not include text, ribbons or people."
    }
  ]
}
```

The feature graphic and full description entries are removed on purpose (section 3 above).

## 4. Step-by-step: creating a Play Console experiment (when traffic allows)

Preconditions: at least 25 visitors per day for 7 days (from Statistics), no other experiment of the same type running, and every asset passes the pre-upload checklist in `visual-assets-spec.md`.

1. Open https://play.google.com/console, select Video Poker: Jacks or Better.
2. Left menu: **Grow users, Store listing experiments** (older layout: Store presence, Store listing experiments). Click **Create experiment**.
3. Choose the experiment type.
   - Graphics (icon, feature graphic, screenshots, video): **Default graphics experiment**.
   - Short or full description: **Localized experiment**, language English (United States) - en-US.
4. Name it with the id from section 3, for example `short-description-02 trainer-led`. Pick the **single** attribute under test. Do not change anything else on the listing while it runs.
5. Add the variant:
   - Short description: paste the variant text (70 or 75 characters, from the JSON above). Console shows the live count; it must be 80 or fewer.
   - Graphics: upload the asset at the exact size (icon 512 x 512, feature 1024 x 500, phone 1080 x 1920).
6. Set the **audience** (share of visitors who see the variants). With one variant use 50% so both arms fill at the same speed. A lower share makes the test even slower.
7. Set the **success metric**. Use first-time installers (conversion). Keep "retained installers (day 1)" as a secondary read; at this volume it will be pure noise.
8. Review and **Start experiment**. Write down the start date, visitors per day for the previous 14 days, and the pre-registered stop rule (step 9).
9. **Stop rule, fixed before you start:** run until each arm has the visitors computed in section 1 for the lift you care about (for example 229 per arm for +50% on a 20% baseline), and at least 14 days, whichever is later. Do not stop early because one arm looks ahead.
10. After the stop date, read the results: first-time installers and the confidence interval. Apply the variant only if the interval clearly excludes zero **and** the lift is plausible (above about 10%). Otherwise record "inconclusive", keep the control, and note the visitors per arm.
11. Record the outcome in `ASO-MEASUREMENT.md`: start and end date, control, variant, visitors per arm, installs per arm, interval, decision, follow-up.
12. Do not start the next experiment for at least 3 days; let the applied winner settle.

Queue, in order, when traffic allows: (1) short description `trainer-led` vs control; (2) screenshot order (after the tournament pill is fixed); (3) icon concept. The order follows expected effect per unit of effort and the policy risk of the current assets, not the older `order` fields.

## 5. Things not to do

- Do not test two elements at once (for example a new icon plus new screenshots).
- Do not run an experiment over a release, a promotion, an ASO text change, or a community post. Each of those moves traffic mix and conversion by itself.
- Do not include "free", "no ads", "100%", "best", "#1" or "live leaderboards" in any short description variant.
- Do not count installs from friends and family seeding in an experiment. They convert differently from cold search traffic and are few enough to swing a small test. Seed them outside the test window or exclude that week.
- Do not read the "winner" label as proof. At this volume, rerun or prefer the sequential protocol.

## 6. Alternative: sequential before/after with rank logging

This is what to use at current traffic, and for the title, which Play experiments cannot test.

Protocol:

1. **Baseline (14 days)** with nothing changing: record, every Monday and Thursday, the ranks for the 13 queries in `action-research.md` (web method, `gl=us`) and, from Play Console Statistics (Grow users, Store performance), weekly store listing visitors, installs and conversion for the acquisition channel "Play Store (organic)" or "Search".
2. **One change** on a Monday. Write down the exact text/asset, date, and hour submitted. Remember Play review delay (hours to days): count the change from the day it goes live, not the day it was submitted.
3. **After window (14 days)** with nothing else changing.
4. **Compare** weekly conversion (visitors to installers) and the ranks before and after. A change counts as an effect only if (a) ranks move by more than 3 places (the web measurement noise), or (b) conversion moves by more than twice the binomial standard error, which at 10 to 25 visitors a day is huge: with 150 visitors at 20% conversion each period, the standard error of the difference is about 4.6 percentage points, so a swing of less than roughly 9 points proves nothing.
5. **Log confounders** in the same row: a release, a Reddit post, ratings arriving, a competitor update, a holiday.
6. Reverse the change if "video poker" or "jacks or better" falls more than 5 places for two consecutive readings, or conversion falls by more than half of baseline for 2 weeks.

Suggested log (add to `ASO-MEASUREMENT.md` or `PLAY_STORE_LISTING_DRAFT.md`):

| Date | Change live | jacks or better | video poker | video poker offline | video poker trainer | deuces wild | Visitors (wk) | Installs (wk) | Conversion | Ratings | Confounders |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 2026-10-14 | 3.0.0 shipped | 3 | 17 | not top 30 | 30 | not top 30 | (fill) | (fill) | (fill) | 0 | day 0 of binary |

Sequence of changes (one per two-week block):

| Block | Change | Measures |
|---|---|---|
| 0 (10-14 to 10-28) | New full description (and the short-description patches for the 15 locales, which touch different markets) | Ranks for the trainer / offline phrases; conversion |
| 1 (10-28 to 11-11) | Feature graphic and screenshot caption fixes (offline lead, remove the tournament pill and "free") | Conversion |
| 2 (11-11 to 11-25) | Short description `trainer-led` | "video poker trainer" and "video poker offline" ranks |
| 3 (after the 11-04 gate; run 4 weeks) | Title Alternate A, only if the gate in `google-metadata.md` passes | "deuces wild" rank vs "video poker" rank loss |

Block 0 overlaps the 3.0 re-evaluation, as noted in `google-metadata.md`; treat early readings as indicative only.

## 7. Other cheap evidence while traffic is low

- **Search terms export** (Grow users, Store performance, Search terms) after 14 days of 3.0: the only first-party proxy for demand and for which queries produce installs.
- **Five-second tests** on 10 to 20 people who have never seen the app: show the icon and first two screenshots for 5 seconds, ask what the app is and what is special. This catches a misleading cue (the tournament pill) faster than a live test. It does not replace a live test, and a small panel is a sample of friendly or non-gamers.
- **Review mining**: once ratings arrive, copy the words real users use into the captions.
- **Ratings first**: 0 ratings versus a 4.54 average among the top 10 is the largest measured gap. No creative test will outperform getting the first 10 honest ratings (see `action-research.md`, P0 review prompt).
