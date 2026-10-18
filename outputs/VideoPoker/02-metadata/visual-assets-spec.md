# Visual Assets Spec: Video Poker: Jacks or Better (Google Play)

Prepared 2026-10-14. Based on the research files, `android-native/store-assets/captions.json`, and the actual images in the repo (I opened the icons, the feature graphic, the contact sheet of all 16 locales, en-US phone shots 1, 3 and 5, tablet10 shot 1 and `android-native/screenshots/04-stats.png`). I did not open every file, and I cannot see what is live in Play Console. Nothing was edited or uploaded.

## 0. Problems found in the current assets (read first)

| # | Finding | Evidence | Why it matters | Action |
|---|---|---|---|---|
| 1 | **Two different app icons exist, and the new one is risky.** `play-store-assets/icon_512.png` is a clean card-fan mark (A, A, K on dark green with gold sparkles, no text). `android-native/store-assets/icon_512.png`, and the launcher icon `ic_launcher_art.png` that commit 5be033d (3.0) swapped in, is a glamour illustration of a woman in a red top, winking, holding a "VIDEO POKER" card, with a neon "VIDEO POKER" sign behind her. | Both files opened and compared (`cmp` reports they differ). | (a) The store icon and the installed launcher icon should match; a mismatch confuses users and weakens trust. (b) Suggestive imagery and in-icon text are the kind of content Play's metadata and inappropriate-content rules scrutinise, and the art is unreadable at 48 px. (c) It signals real-money slots, not a no-ads trainer. I am not certain how Play would rule; the risk is moderate, but the downside is a listing flag on the one asset every impression shows. | **P0.** Check Play Console, Store presence, Main store listing, App icon, to see which is live. Make the card-mark (or its successor, section 1) the one icon in both the listing and the next build's launcher art. |
| 2 | **Every play-screen screenshot shows a "Tournament 2 26:55" pill.** It is static text: `TournamentPill.kt` states "no tournament engine exists behind it". Seen in phone shots 1 and 5 (the contact sheet shows the same header on the other play shots). | Images and code. | The listing implies tournaments that do not exist, which is the same class of problem as the "live leaderboards" short descriptions. | **P0 / P1.** Best fix is product-side: remove or relabel the pill, then re-shoot with the existing capture scripts. Interim: retouch the pill out of the framed images. |
| 3 | **Feature graphic text says "FREE" in the kicker** and carries no mention of offline or hints. | Image opened. | Promotion-eligibility has already been flagged on this listing for price/promotion wording in the short description. I have not verified that graphics are held to the same rule, so treat removal as a precaution. Offline is the strongest searched modifier and is absent. | Replace the kicker (section 2). |
| 4 | **Slide 1 kicker in the localized sets says "free" in every language** ("Video póker gratis", "Gratis Video Poker", "無料ビデオポーカー", and so on). | `captions.json`. | Same precaution as 3, and it spends the best-read line on a word that does not differentiate. | Replace with the offline kickers in section 3. |
| 5 | **Tablet screenshots are stale and web-era.** `tablet7/` and `tablet10/` exist for en-US only, generated 2026-09-09 from the old UI: they show "Tournament 2", "ALL IN 5 left" (native 3.0 allows 1 per day, `ALL_IN_DAILY_LIMIT = 1`), the old header layout, and tablet10 shot 1 has a large empty block below the phone frame. | Image and `Rules.kt`. | Misrepresents the app on large screens. | Re-shoot from the native build (section 4). |
| 6 | `aso-experiments.json` icon candidates `video-poker-app-icon-v2.png` and `video-poker-app-icon-reference.png` do not exist anywhere in the repo (searched). | `find`. | The icon experiment cannot be run as written. | See `03-testing/ab-test-setup.md`. |

## 1. App icon

| Item | Spec |
|---|---|
| Store icon | 512 x 512 px, 32-bit PNG, at most 1,024 KB. Play applies its own rounded mask; supply a full-bleed square, no pre-rounded corners, no drop shadow. |
| Master | Keep a 1024 x 1024 PNG (`play-store-assets/icon_1024.png` exists) and export 512 from it. |
| Launcher (adaptive) | 108 dp canvas; keep the whole motif inside the central 66 dp safe zone (about 61% of the width) so no mask clips it. Provide a monochrome layer for Android 13+ themed icons. |
| Content | One focal object, no text, no people, no price, ranking or promotion words (no "FREE", "NO ADS", "#1" ribbons). The GROWTH-PLAN idea of a "NO ADS ribbon" icon should be dropped for that reason (precaution, same as above). |
| Legibility test | Must read as "playing cards, poker" at 48 x 48 px and in greyscale. Check it next to the top 10 results for "video poker" and next to the two apps that share our exact title. |
| Palette | Dark green felt with gold, matching the screenshots, so icon, graphic and screenshots look like one product. |

Candidates for a future icon test (both text-free, both cards):

- **Control:** the current card-fan mark (`play-store-assets/icon_512.png`).
- **Variant:** a royal-flush fan (10, J, Q, K, A of one suit), larger cards filling about 70% of the canvas, gold edge light. It ties to the "Chase the Royal" caption and is distinguishable from the two same-title apps. Icon is the highest-leverage element, but see the traffic reality check in `03-testing/ab-test-setup.md`: at current traffic only a very large difference can be detected.

## 2. Feature graphic

| Item | Spec |
|---|---|
| Size and format | 1024 x 500 px, PNG or JPEG, no alpha (current file is 1024 x 500 RGB, correct). |
| Safe zone | Keep the three text lines left of centre and inside a 60 px margin. If a promo video is added later, Play overlays a play button in the middle and crops edges. |
| Legibility | Headline at least 70 px tall; sub-line at least 28 px (the graphic is shown around 360 px wide on phones). |
| Hierarchy | Maximum 3 text elements. |

Recommended copy (all claims verified in code or listing text):

| Element | Current | Recommended |
|---|---|---|
| Kicker | FREE · NO REAL MONEY | **OFFLINE · NO REAL MONEY** |
| Headline | Video Poker, no ads. | Video Poker, no ads. (keep: 38 of 46 competing video poker apps carry the "Contains ads" label, we carry none) |
| Sub-line | Jacks or Better · Deuces Wild · Bonus Poker · 16 languages | **Jacks or Better · Deuces Wild · Exact hints** |
| Art | Five-card royal flush fan | Keep. Optionally show a hint chip ("Best hold 0.48x") from shot 5 to carry the trainer message visually. |

Test variant (for a later experiment): kicker "VIDEO POKER TRAINER", headline "See the best hold.", sub-line "Offline · No ads · 16 languages". Filename suggestion: `play-store-assets/feature_graphic_trainer.png`. The existing experiment definition uses the live file as its own variant, so it tests nothing.

## 3. Phone screenshots

Existing: 6 per locale, 1080 x 1920 (`android-native/store-assets/phone/<locale>/1-6.png`, framed from native captures). Play allows 2 to 8; the first 2 to 3 decide most clicks, because users rarely scroll the strip.

What to lead with, from the research: **offline** (top searched modifier, under-claimed, none of 15 localized listings mentions it), **no ads** (the only real differentiator against the casino leaders: 38 of 46 video poker apps carry ads, 31 carry purchases, and we carry neither), **exact hints** (the differentiator against casino apps, though not against the new trainer apps), **variants** (Deuces Wild is a high-demand term).

| Slot | Current caption (kicker / line 1 / line 2) | Recommended en-US | Why | Source image |
|---|---|---|---|---|
| 1 | Free video poker / No ads. No real money. / Just five cards. | **Offline video poker** / No ads. No wifi needed. / Just five cards. | Offline and no ads in the first 3 seconds; drops "free". "No real money" moves to the feature graphic and the full description. | existing 1.png layout |
| 2 | Deuces Wild / Every 2 is wild. / Chase Four Deuces. | **Video poker trainer** / See the best hold. / On every hand. | Hints are the differentiator; "trainer" is autocomplete #4 under "video poker" (kicker test, effect on conversion unverified). Shows "Best hold 0.48x · yours 0.30x" (existing 5.png). | existing 5.png |
| 3 | Triple Play & Five Play / Hold once. / Draw five hands. | Deuces Wild / Every 2 is wild. / Chase Four Deuces. | Variant head term earlier; keeps the strong visual. | existing 2.png |
| 4 | Nine winning hands / Hit a Straight. / Chase the Royal. | Triple Play & Five Play / Hold once. / Draw five hands. | Multi-hand is where we are #22 on a high-competition term. Existing 3.png also shows the Double up button. | existing 3.png |
| 5 | Exact strategy hints / See the best hold. / On every hand. | **Track your accuracy** / See what mistakes cost. / Strategy accuracy, every day. | Shows the Stats screen (92% strategy accuracy, "Lost to mistakes") which has no tournament pill. Needs a framed capture of `android-native/screenshots/04-stats.png`-style Stats screen. | new frame |
| 6 | 16 languages / Plays in your / own language. | 16 languages / Plays in your / own language. | Keep. Good for non-English markets. | existing 6.png |
| 7 (optional) | none | Friends leaderboard / Race your friends. / Fresh every day. | Real feature, UTC daily reset; shows the invite flow. Do not say "live" or "global". | new frame |
| 8 (optional) | none | Daily chips / ALL IN & win streaks. / Up to +50% bonus. | Retention hooks; "bonus" is fine inside screenshots. | new frame |

Rules for captions: verify each against the code before shipping; no "live", "rooms", "tournament", "9/6", "full pay", "cloud"; 24 pt or larger text with high contrast (current framing is far above that); keep each line at 26 characters or fewer, as in the current set.

Notes on the order: the current order (no ads, Deuces Wild, Triple Play...) already matches the research reasonably well. The strongest changes are (a) "offline" in slot 1, (b) moving hints from slot 5 to 2, and (c) replacing the generic "Nine winning hands". The `screenshot-sequence-01` experiment as written tests none of this; see the corrected definition in `03-testing/ab-test-setup.md`.

### Localized kicker for slide 1 (replaces "free ..." in all 15 non-English sets)

Reuse the same offline term as the corrected short description, so the screenshot and the search snippet agree. Line 1 ("No ads. No wifi needed.") and line 2 need translation, to be done after the en-US result is known.

| Locale | Kicker |
|---|---|
| es | Videopóker sin conexión |
| pt-BR | Video poker offline |
| de | Video Poker offline |
| fr | Vidéo poker hors ligne |
| it | Video poker offline |
| pl | Video poker offline |
| ru | Видеопокер без интернета |
| tr | İnternetsiz video poker |
| id | Video poker offline |
| hi | ऑफ़लाइन वीडियो पोकर |
| ja | オフラインで遊べるビデオポーカー |
| ko | 오프라인 비디오 포커 |
| zh-CN | 离线视频扑克 |
| he | וידאו פוקר אופליין |
| ar | فيديو بوكر بدون إنترنت |

These strings carry the same native-review caveats as `localized-fixes.md` (he and ar need review).

## 4. Tablet screenshots

| Item | Spec |
|---|---|
| 7-inch | 4 to 8 images, 16:9 or 9:16, each side 320 to 3,840 px, long side at most 2x the short side. Existing 1200 x 2133 meets this. |
| 10-inch | Same rules. Existing 1440 x 2560 meets this. Google suggests 1600 x 2560 or larger for new sets. |
| Language | en-US only is acceptable for now (that is what exists). |
| Source | Capture from the native 3.0 build on a 10-inch and a 7-inch AVD or device. Never composite a layout the app does not have. |

Check first: the app is portrait-only (`android:screenOrientation="portrait"`). On large screens recent Android versions may ignore or letterbox orientation locks depending on target SDK; I believe Android 16 ignores them for apps targeting API 36 on displays of 600 dp and wider, but I have not tested this app. Run the 3.0 build on a tablet AVD before shooting, and shoot what users will actually see. If it is letterboxed, show it honestly and keep the caption strip.

Priority: P2. Tablet shots do not affect phone search results; fix the stale ones because they currently show features that are not in 3.0, but do not spend time ahead of the phone set.

## 5. Promo video (optional, outstanding in GROWTH-PLAN)

- 30 seconds, real gameplay recorded from the native build, vertical is fine; hosted on YouTube (public or unlisted, not age-restricted, monetisation and ads off).
- Beats: 0-3 s "Video poker. Offline. No ads." with airplane mode visible in the status bar (proves the claim); 3-12 s one hand with the hint overlay; 12-20 s Triple Play draw; 20-26 s Stats accuracy; 26-30 s icon and title.
- No audio dependence; captions burned in.
- Leave it out of any experiment until the static assets are fixed. It changes the layout of the listing (video thumbnail takes the first graphic slot).

## 6. Pre-upload asset checklist

| Check | Current state (measured with `file`) |
|---|---|
| Feature graphic 1024 x 500, no alpha | `play-store-assets/feature_graphic.png`: 1024 x 500, RGB. OK (copy in android-native is byte-identical). |
| Store icon 512 x 512 | `play-store-assets/icon_512.png`: 512 x 512 RGB OK. `android-native/store-assets/icon_512.png`: same size, different art (finding 1). |
| Phone 1080 x 1920 | `android-native/store-assets/phone/en-US/1.png`: 1080 x 1920 OK. |
| Tablet 7 | `tablet7_1.png`: 1200 x 2133 OK in size, stale content. |
| Tablet 10 | `tablet10_1.png`: 1440 x 2560 OK in size, stale content. |
| No "free", "live", "tournament", "rooms" in any caption or graphic text | Fails today (findings 2 to 4). |
