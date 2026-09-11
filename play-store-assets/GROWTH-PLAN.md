# Growth plan — Video Poker: Jacks or Better

Owner: Michael. Started 2026-09-09. Budget: $0 (organic only). Market: global English first.

## Shipped 2026-09-09

- Store text rewritten and pushed live in all 16 locales (`play-store-assets/listings.json` →
  `node scripts/play-listing-upload.js commit`).
- 6 new phone screenshots per locale + en-US tablet sets + a new 1024x500 feature graphic
  (`node scripts/store-screenshots/run.js`, `node scripts/store-screenshots/feature.js`,
  `node scripts/store-screenshots/upload.js commit`).
- App 2.4 (versionCode 9) live at 100%: real daily chips bonus, Play in-app review prompt after
  three Straight-or-better wins, Rate / More games rows in Settings.
- Landing page metadata (description, canonical, Open Graph, Twitter card) in the `index.html`
  build template, deployed by the Pages workflow.
- Cross-promotion row in Blackjack 21 Settings pointing at this listing.

## Michael's tasks (nobody else can do these)

1. **Seed 10+ ratings.** Send `01-friends-seed.md` to friends and family. Spread installs over
   several days. Never offer anything in exchange for a rating.
2. **Post to communities, 1-2 per week.** Drafts in `02-reddit-posts.md` and
   `03-facebook-groups.md`. Read each community's self-promotion rules first.
3. **Reply to every review within 24 hours.** Templates in `04-review-replies.md`.
4. **Play Store Experiment #1 — icon.** Play Console → Store listing experiments. Current icon vs
   one with a "NO ADS" ribbon. Minimum 7 days or 1,000 impressions. One element at a time.

## Still to do

- 30-second promo video for the listing (record real gameplay, add to the store listing).
- Push the repo so GitHub Pages picks up the new landing-page metadata.
- Second experiment once ratings exist: short description variants.

## KPIs — 30 days

| Metric | 2026-09-09 | Target |
|---|---|---|
| Ratings shown on listing | none | 10+, average 4.5+ |
| US rank "jacks or better" | 5 | top 3 |
| US rank "video poker" | 29 | top 15 |
| US rank "deuces wild" | not indexed | top 20 |
| Store listing conversion | unknown | 25%+ |

Log weekly positions in the rank table in `PLAY_STORE_LISTING_DRAFT.md`.
