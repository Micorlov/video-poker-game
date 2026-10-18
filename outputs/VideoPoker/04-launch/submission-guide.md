# Submission Guide: pushing listing and release changes for com.micorlov.videopoker

**Written:** 2026-10-14. It covers the native 3.x era (`android-native/`). Paths are relative to `/Users/micorlov/Documents/GitHub/VideoPoker/`.
Nothing in this guide was run against Play during this audit. Only `node scripts/validate-aso.js` (local, offline) was run, and it passed.

---

## 0. Sources of truth (read before editing anything)

| What | File | Pushed by |
|---|---|---|
| Title, short and full description, 16 locales | `play-store-assets/listings.json` | `play-listing-upload.js`, **and** `play-native-release.js` on every binary release |
| Phone screenshots, 6 per locale | `android-native/store-assets/phone/<locale>/1-6.png` | `play-native-release.js` |
| Release notes ("What's new"), 16 locales, ≤ 500 chars | `android-native/store-assets/release-notes.json` | `play-native-release.js` |
| Feature graphic, store icon, tablet screenshots, promo video | not scripted for 3.x | Play Console UI |
| Experiment queue | `play-store-assets/aso-experiments.json` | Play Console UI (Store listing experiments) |

**Rule 1.** `play-native-release.js` re-sends every locale's text and **deletes and replaces** every locale's phone screenshots from the repo on every binary release. If you edit text in the Console and don't copy it into `listings.json`, the next release silently reverts it.

**Rule 2.** Store listings are app-wide, not per track. A run of `play-native-release.js` with `PLAY_TRACK=internal` still commits the listing text and screenshots publicly.

### Legacy scripts: do not run these for 3.x
| Script | Why it's unsafe now |
|---|---|
| `scripts/store-screenshots/upload.js` | Replaces phone screenshots in all locales, the en-US tablet sets and the feature graphic with the **2.x web-build** frames from `scripts/store-screenshots/out/framed/` ("Live leaderboards", Hourly tab). |
| `scripts/play-release-notes.js` | Pushes `whatsNew` from `listings.json`, which still holds 2.x notes ("Sync fix… your chips and stats stay where you left them"). Native 3.x has no cloud sync. |
| `scripts/play-release-upload.js` | Uploads the Capacitor build. Superseded. |

If you want to keep them, delete the 2.x `whatsNew` from `listings.json` or put a guard at the top of each legacy script (a dev-session change, not part of this audit).

## 1. Credentials (current state, from memory notes)

| Script | Key file it reads | Present on this Mac? |
|---|---|---|
| `play-native-release.js` | `$PLAY_SERVICE_ACCOUNT` or `~/Downloads/play-service-account.json` | Yes (play-publisher@gen-lang-client-0324046629) |
| `play-listing-upload.js`, `verify-play-listing.js`, `play-release-notes.js`, `store-screenshots/upload.js`, `fetch-play-stats.js` (local) | `~/.config/mcp/google-play-service-account.json` | **No.** That file didn't survive the move. |

- As of 2026-10-14, **play-publisher can upload bundles and release to internal testing, but gets 403 on store-listing edits and on production releases.** Two consequences:
  - `play-native-release.js` with `PLAY_TRACK=internal` fails at the listings step, because it writes listings in the same edit, and the script then discards the whole edit.
  - `play-listing-upload.js` needs the missing key, and with the play-publisher key it would get 403.
- **Fix (your decision, in Play Console → Users and permissions → play-publisher → App permissions for Video Poker):** grant "Manage store presence" (store listing). Optionally grant "Release to production"; leave it off if you prefer to keep production promotion as a manual click. Then put the key where the scripts look, using one of:
  - `mkdir -p ~/.config/mcp && ln -s ~/Downloads/play-service-account.json ~/.config/mcp/google-play-service-account.json`
  - or change the scripts to honour `$PLAY_SERVICE_ACCOUNT` (dev session).
- Until then, use the **Console UI paths** in §4 and §5. Claude Code's auto mode can't click "Promote release → Production"; you have to click it.

## 2. Listing text change (copy only, no binary)

Use for: the localized short-description fix (10-19), the en-US full-description pass (10-29), localized long-tail (11-09), and the pt-BR title.

1. **Edit** `play-store-assets/listings.json`, and only the locales and fields you mean to change. Take copy from `outputs/VideoPoker/02-metadata/`.
2. **Policy self-check** (validate-aso.js does not do these):
   - [ ] No "free", "no ads", "100%", "#1", "best", "sale", or a price word in any **title or short description**, in any language. These tripped the promotion-eligibility flag on 2026-09-09.
   - [ ] No "live leaderboards", rooms, Facebook, cloud backup or sync, 9/6 or "full pay", or variants the app lacks.
   - [ ] Real-money disclaimer still present (the validator checks this).
   - [ ] "video poker" density in en-US stays at 1.5-2.5%.
   - Quick grep: `grep -n -iE "live|en vivo|ao vivo|canl|живые|ライブ|실시간|实时|مباشر|cloud|facebook|9/6|full pay" play-store-assets/listings.json`
3. **Local gate:** `node scripts/validate-aso.js`. Must print "ASO validation passed: 16 listings…".
4. **Remote dry run:** `node scripts/play-listing-upload.js validate`. It checks lengths locally, opens an edit, PUTs all 16 locales, calls `edits:validate`, then deletes the edit. Nothing is published. Expect "VALIDATED ok — edit discarded".
5. **Commit to git first** (so the repo matches what will go live). Stage the explicit path only, because other sessions edit this checkout:
   `git add play-store-assets/listings.json && git commit -m "chore: <what changed in the listing>"`
6. **Publish:** `node scripts/play-listing-upload.js commit`. It sends all 16 locales in one edit and prints "COMMITTED — listings live". With Managed publishing on, the change then waits in Publishing overview until you click **Publish changes**.
7. **Verify:** `node scripts/verify-play-listing.js`. Run it from the repo root (it reads `play-store-assets/listings.json` by relative path). It is read-only: it opens an edit, compares title/short/full per locale, counts phone/7"/10"/feature images, lists the release-note locales of the production track, then deletes the edit. Expect `ok ok ok` in 16 rows, phone `6`, and "All 16 locales match".
8. **Log** the change date and the fields changed in the `PLAY_STORE_LISTING_DRAFT.md` history. The next Wednesday rank check is the first reading after the change.

Text edits on an established app usually go live in minutes to a few hours, sometimes after a policy review.

## 3. Binary release (3.0.1, 3.0.2, …)

1. **Bump** `versionCode` / `versionName` in `android-native/app/build.gradle.kts`.
2. **Release notes:** edit `android-native/store-assets/release-notes.json`, all 16 locales, each ≤ 500 chars. Include the "progress from before 3.0 starts fresh" line until the migration ships. Check the lengths:
   `node -e 'for(const[k,v] of Object.entries(require("./android-native/store-assets/release-notes.json")))console.log(k,v.length)'`
3. **Listing and screenshots must already be final** in `listings.json` and `android-native/store-assets/phone/`, because this script re-pushes both.
4. **Tests:** `cd android-native && ./gradlew testDebugUnitTest`.
5. **Build:** `source ~/keys/videopoker-upload.env && (cd android-native && ./gradlew bundleRelease)` → `android-native/app/build/outputs/bundle/release/app-release.aab`.
6. **Dry run:** `PLAY_TRACK=internal node scripts/play-native-release.js validate`. It checks locally (notes ≤ 500 per locale, a note for every listing locale, 6 PNGs per locale, AAB present), uploads the bundle into a throwaway edit, checks that the AAB's versionCode equals gradle's, sets the track, PUTs listings and screenshots, calls `edits:validate`, then deletes the edit. On any error the edit is deleted.
7. **Commit to git** (explicit paths), then **ship to internal:** `PLAY_TRACK=internal node scripts/play-native-release.js commit`.
8. **Pre-launch report:** wait for it (Release → Testing → Pre-launch report, usually within an hour or two) and read crashes and warnings.
9. **Promote to production in the Console** (manual click): Internal testing → the release → **Promote release → Production**.
   - On the "Prepare release" page set **Staged rollout %** to **20**. The script's `status: 'completed'` doesn't apply to a Console promotion, so you choose the percentage here.
   - Check that the release notes came through in 16 languages.
   - Start the rollout. It goes to review.
10. **Ramp up:** 20% → 50% after 48 h with no new vitals clusters → 100% after 48 more hours. Use the **Halt rollout** button if a crash cluster appears.
11. **Verify:** run `node scripts/verify-play-listing.js`. The production track should show the new versionCode and 16 release-note locales.

## 4. Console UI fallback for listing text (while the API returns 403)

1. Play Console → Video Poker: Jacks or Better → Grow → Store presence → **Main store listing**.
2. Edit en-US. Then use **Manage translations → Edit translations**, and step through each language with "Next language". Paste exactly from `listings.json`.
3. Save, then Publishing overview → **Publish changes** (if Managed publishing is on).
4. **Same day:** make sure `listings.json` already contains exactly what you pasted, and commit it. Otherwise the next binary release reverts it (Rule 1).

## 5. Manual Console tasks (no script exists)

| Task | Path | When |
|---|---|---|
| Remove or replace the en-US 7"/10" tablet screenshots (stale web UI) | Main store listing → en-US → Graphics → Tablet screenshots | 2026-10-16 |
| Upload screenshots one at a time, in order | Main store listing → language → Phone screenshots (the asset panel keeps the order only if you attach them one file at a time) | as needed |
| Feature graphic or icon swap | Main store listing → Graphics | only via an experiment winner |
| Promo video (YouTube URL) | Main store listing → en-US → Video | 2026-11-23 |
| Data safety (Analytics, Device IDs, account deletion URL) | Policy → App content → Data safety | **before 3.0.1 promotion** |
| Advertising ID declaration | Policy → App content → Advertising ID | before 3.0.1 |
| Privacy policy URL check | Policy → App content → Privacy policy | after `privacy-policy.html` deploys |
| Country availability (Turkey) | Release → Production → Countries / regions | Week 1 |
| Store listing experiment | Grow → Store listing experiments → Create (one element, en-US, 50/50) | 11-05, 12-03 |
| Search terms export | Grow → Store performance → Search terms | 10-28, then monthly |
| Review replies | Ratings and reviews → Reviews | daily |
| Managed publishing on/off | Publishing overview | 10-15 |

## 6. Pre-submit validation checklist (copy into each change)

- [ ] `node scripts/validate-aso.js` passes.
- [ ] The policy grep (§2 step 2) finds nothing new.
- [ ] Release notes: 16 locales, each ≤ 500 chars, nothing that the app lacks.
- [ ] `listings.json`, `release-notes.json` and the screenshots committed to git before publishing.
- [ ] Data safety matches the SDKs in `android-native/app/build.gradle.kts`: Firebase Auth, Firestore, Analytics, review-ktx, installreferrer.
- [ ] Only one en-US change in the current 7-day window (timeline rule).
- [ ] The `validate` run succeeded before `commit`.
- [ ] `verify-play-listing.js` (or a manual Console check) run after the publish.
