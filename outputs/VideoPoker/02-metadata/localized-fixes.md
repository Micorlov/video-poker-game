# Localized fixes: 15 non-English locales

Prepared 2026-10-14 from `play-store-assets/listings.json` (live copy) and the research files. Nothing here has been applied to the repo or uploaded.

## Findings

1. **13 of 15 short descriptions claim "live" leaderboards or rankings** (es-ES, pt-BR, de-DE, fr-FR, it-IT, pl-PL, ru-RU, tr-TR, hi-IN, ja-JP, ko-KR, zh-CN, ar). Native 3.0 has only a daily friends leaderboard with a UTC reset. id and iw-IL say "leaderboards" without "live" and are also replaced, because all 15 lack any offline term.
2. **0 of 15 mention offline or no internet** in the short or full text, although autocomplete shows that demand in ES, MX, BR, DE, RU, TR, ID and JA (keyword-list section 8).
3. **No full description contains a false claim.** I scanned every locale's `fullDescription` (and title) for live/rooms/Facebook/cloud/landscape/9-6/full-pay/jackpot/tournament terms in each language. Every hit was a false positive: "livello" (it, levels), "poziom" (pl, level), "melawan" (id, "against"), and "חי" inside a Hebrew word. All 15 full descriptions already describe the 3.0 friends leaderboard ("daily", "friends", "starts fresh every day"), Google sign-in and the 1,000-chip invite correctly. **So the only false lines are the 13 short descriptions.**
4. **Other stale text (not in scope of the patch):** `whatsNew` in listings.json is the 2.6 text, and `android-native/store-assets/release-notes.json` ends every locale with a sentence saying live leaderboards and poker rooms "are paused / return soon". That is a promise about features the app does not have; consider cutting it at the next release.
5. **In-app string, for the product owner:** `values/strings.xml` key `ob_also_live` ("Also live: hourly and daily tournaments against every player in the app.") is rendered by `Onboarding.kt:347` and the play screen shows a static "Tournament 2 26:55" pill (`TournamentPill.kt`, whose own comment says no tournament engine exists). Both contradict the store listing and show up in the phone screenshots. See `visual-assets-spec.md`.

## Corrected short descriptions (all verified <= 80 by script)

| Locale | Current (length) | Corrected (length) | Confidence |
|---|---|---|---|
| es-ES | `Deuces Wild, Bonus Poker, Double Bonus, modo multimano y clasificaciones live` (77) | `Videopóker sin conexión: Jacks or Better, Deuces Wild, multimano. Sin internet` (**78**) | high |
| pt-BR | `Deuces Wild, Bonus Poker, Double Bonus, modo multimãos e rankings ao vivo` (73) | `Video poker offline: Jacks or Better, Deuces Wild, multimãos. Sem internet` (**74**) | high |
| de-DE | `Deuces Wild, Bonus Poker, Double Bonus, Multi-Hand-Modus und Live-Ranglisten` (76) | `Video Poker offline: Jacks or Better, Deuces Wild, Multi-Hand. Ohne Internet` (**76**) | high |
| fr-FR | `Deuces Wild, Bonus Poker, Double Bonus, mode multi-mains et classements live` (76) | `Vidéo poker hors ligne : Jacks or Better, Deuces Wild, multi-mains. Sans wifi` (**77**) | high |
| it-IT | `Deuces Wild, Bonus Poker, Double Bonus, modalità multi-mano e classifiche live` (78) | `Video poker offline: Jacks or Better, Deuces Wild, multimano. Senza internet` (**76**) | high |
| pl-PL | `Deuces Wild, Bonus Poker, Double Bonus, tryb wielu rąk i rankingi na żywo` (73) | `Video poker offline: Jacks or Better, Deuces Wild, wiele rąk. Bez internetu` (**75**) | medium |
| ru-RU | `Deuces Wild, Bonus Poker, Double Bonus, мультирука и живые таблицы лидеров` (74) | `Видеопокер без интернета: Jacks or Better, Deuces Wild, мультирука. Офлайн` (**74**) | medium |
| tr-TR | `Deuces Wild, Bonus Poker, Double Bonus, çoklu el modu ve canlı sıralamalar` (74) | `İnternetsiz video poker: Jacks or Better, Deuces Wild, çoklu el. Çevrimdışı` (**75**) | medium |
| id | `Deuces Wild, Bonus Poker, Double Bonus, mode multi-tangan, papan peringkat` (74) | `Video poker offline: Jacks or Better, Deuces Wild, multi-tangan. Tanpa internet` (**79**) | high |
| hi-IN | `Deuces Wild, Bonus Poker, Double Bonus, मल्टी-हैंड मोड और लाइव लीडरबोर्ड` (72) | `ऑफ़लाइन वीडियो पोकर: Jacks or Better, Deuces Wild, मल्टी-हैंड। बिना इंटरनेट` (**75**) | medium |
| ja-JP | `Deuces Wild、Bonus Poker、Double Bonus、マルチハンド、ライブランキング` (52) | `オフラインで遊べるビデオポーカー：Jacks or Better、Deuces Wild、マルチハンド、通信不要` (**56**) | medium |
| ko-KR | `Deuces Wild, Bonus Poker, Double Bonus, 멀티핸드, 실시간 순위표` (53) | `오프라인 비디오 포커: Jacks or Better, Deuces Wild, 멀티핸드. 인터넷 없이 플레이` (**59**) | medium |
| zh-CN | `Deuces Wild、Bonus Poker、Double Bonus、多手模式和实时排行榜` (47) | `离线单机视频扑克：Jacks or Better、Deuces Wild、多手牌模式，无需联网` (**47**) | medium |
| iw-IL | `Deuces Wild, Bonus Poker, Double Bonus, מצב ריבוי ידיים וטבלאות דירוג` (69) | `וידאו פוקר אופליין: Jacks or Better, Deuces Wild, ריבוי ידיים. ללא אינטרנט` (**74**) | low |
| ar | `Deuces Wild وBonus Poker وDouble Bonus ووضع تعدد الأيدي وترتيب مباشر` (68) | `فيديو بوكر بدون إنترنت: Jacks or Better وDeuces Wild وأيدٍ متعددة. أوفلاين` (**74**) | low |

Rules applied to every locale: no price or promotion words (free, gratis, bonus, 100%, no ads equivalents), no "live", the local "offline / no internet" phrase near the front, "Jacks or Better" and "Deuces Wild" kept in Latin script, no claim that is not in the app.

Machine checks (script):

| Locale | Short length | <= 80 | Promo words | "Live" words | Title length (unchanged) |
|---|---|---|---|---|---|
| es-ES | 78 | ok | none | none | 28 |
| pt-BR | 74 | ok | none | none | 29 |
| de-DE | 76 | ok | none | none | 27 |
| fr-FR | 77 | ok | none | none | 28 |
| it-IT | 76 | ok | none | none | 28 |
| pl-PL | 75 | ok | none | none | 28 |
| ru-RU | 74 | ok | none | none | 27 |
| tr-TR | 75 | ok | none | none | 28 |
| id | 79 | ok | none | none | 28 |
| hi-IN | 75 | ok | none | none | 28 |
| ja-JP | 56 | ok | none | none | 24 |
| ko-KR | 59 | ok | none | none | 23 |
| zh-CN | 47 | ok | none | none | 21 |
| iw-IL | 74 | ok | none | none | 27 |
| ar | 74 | ok | none | none | 27 |

Patch applied to a scratch copy of the repo: `node scripts/validate-aso.js` passed (16 listings), including the real-money disclosure check, which reads the full text.

## Per-locale detail and review status

Confidence key. **high** = standard vocabulary; **medium** = natural to the author, worth a native glance; **low** = needs native review. No text here has been reviewed by a native speaker. Native review is required for: **iw-IL, ar** (low). Recommended for: **pl-PL, ru-RU, tr-TR, hi-IN, ja-JP, ko-KR, zh-CN** (medium).

### es-ES  (confidence: high)

- Current (77): `Deuces Wild, Bonus Poker, Double Bonus, modo multimano y clasificaciones live`
  - English gloss: Deuces Wild, Bonus Poker, Double Bonus, multi-hand mode and live leaderboards
- Corrected (78/80): `Videopóker sin conexión: Jacks or Better, Deuces Wild, multimano. Sin internet`
  - English gloss: Video poker without connection: Jacks or Better, Deuces Wild, multi-hand. Without internet
- Keyword added: sin conexión + sin internet (AC in ES and MX)
- Removed: the "live" or unspecified leaderboard clause (native 3.0 has only a daily friends leaderboard) and the "Bonus Poker, Double Bonus" pair (still named in the full description and in the 3.0 release notes).
- Review: No native review needed beyond a skim. Standard vocabulary.
- Optional full-description insert (heading, then paragraph): `VIDEOPÓKER SIN INTERNET`. Full description length after insert: 3351/4000 (was 3030).

### pt-BR  (confidence: high)

- Current (73): `Deuces Wild, Bonus Poker, Double Bonus, modo multimãos e rankings ao vivo`
  - English gloss: Deuces Wild, Bonus Poker, Double Bonus, multi-hand mode and live rankings
- Corrected (74/80): `Video poker offline: Jacks or Better, Deuces Wild, multimãos. Sem internet`
  - English gloss: Video poker offline: Jacks or Better, Deuces Wild, multi-hand. Without internet
- Keyword added: offline + sem internet; "video poker" in English spelling (AC; "vídeo pôquer" has none)
- Removed: the "live" or unspecified leaderboard clause (native 3.0 has only a daily friends leaderboard) and the "Bonus Poker, Double Bonus" pair (still named in the full description and in the 3.0 release notes).
- Review: No native review needed beyond a skim. Standard vocabulary.
- Optional full-description insert (heading, then paragraph): `VÍDEO PÔQUER SEM INTERNET`. Full description length after insert: 3229/4000 (was 2928).

### de-DE  (confidence: high)

- Current (76): `Deuces Wild, Bonus Poker, Double Bonus, Multi-Hand-Modus und Live-Ranglisten`
  - English gloss: Deuces Wild, Bonus Poker, Double Bonus, multi-hand mode and live leaderboards
- Corrected (76/80): `Video Poker offline: Jacks or Better, Deuces Wild, Multi-Hand. Ohne Internet`
  - English gloss: Video Poker offline: Jacks or Better, Deuces Wild, multi-hand. Without internet
- Keyword added: Video Poker offline + ohne Internet
- Removed: the "live" or unspecified leaderboard clause (native 3.0 has only a daily friends leaderboard) and the "Bonus Poker, Double Bonus" pair (still named in the full description and in the 3.0 release notes).
- Review: No native review needed beyond a skim. Standard vocabulary.
- Optional full-description insert (heading, then paragraph): `VIDEO POKER OFFLINE`. Full description length after insert: 3365/4000 (was 3042).

### fr-FR  (confidence: high)

- Current (76): `Deuces Wild, Bonus Poker, Double Bonus, mode multi-mains et classements live`
  - English gloss: Deuces Wild, Bonus Poker, Double Bonus, multi-hand mode and live rankings
- Corrected (77/80): `Vidéo poker hors ligne : Jacks or Better, Deuces Wild, multi-mains. Sans wifi`
  - English gloss: Video poker offline (hors ligne): Jacks or Better, Deuces Wild, multi-hand. Without wifi
- Keyword added: hors ligne (+ sans wifi)
- Removed: the "live" or unspecified leaderboard clause (native 3.0 has only a daily friends leaderboard) and the "Bonus Poker, Double Bonus" pair (still named in the full description and in the 3.0 release notes).
- Review: No native review needed beyond a skim. Standard vocabulary.
- Optional full-description insert (heading, then paragraph): `VIDÉO POKER HORS LIGNE`. Full description length after insert: 3562/4000 (was 3198).

### it-IT  (confidence: high)

- Current (78): `Deuces Wild, Bonus Poker, Double Bonus, modalità multi-mano e classifiche live`
  - English gloss: Deuces Wild, Bonus Poker, Double Bonus, multi-hand mode and live rankings
- Corrected (76/80): `Video poker offline: Jacks or Better, Deuces Wild, multimano. Senza internet`
  - English gloss: Video poker offline: Jacks or Better, Deuces Wild, multi-hand. Without internet
- Keyword added: offline + senza internet
- Removed: the "live" or unspecified leaderboard clause (native 3.0 has only a daily friends leaderboard) and the "Bonus Poker, Double Bonus" pair (still named in the full description and in the 3.0 release notes).
- Review: No native review needed beyond a skim. Standard vocabulary.
- Optional full-description insert (heading, then paragraph): `VIDEO POKER SENZA INTERNET`. Full description length after insert: 3387/4000 (was 3045).

### pl-PL  (confidence: medium)

- Current (73): `Deuces Wild, Bonus Poker, Double Bonus, tryb wielu rąk i rankingi na żywo`
  - English gloss: Deuces Wild, Bonus Poker, Double Bonus, multi-hand mode and live rankings
- Corrected (75/80): `Video poker offline: Jacks or Better, Deuces Wild, wiele rąk. Bez internetu`
  - English gloss: Video poker offline: Jacks or Better, Deuces Wild, multiple hands. Without internet
- Keyword added: offline + bez internetu; "video poker" also covers the Latin spelling next to the title's "Wideo"
- Removed: the "live" or unspecified leaderboard clause (native 3.0 has only a daily friends leaderboard) and the "Bonus Poker, Double Bonus" pair (still named in the full description and in the 3.0 release notes).
- Review: Native glance recommended before release: correct and natural to the author, but the word choice is not verified by a native speaker. Polish demand for "video poker" vs "wideo poker" is unmeasured (research left PL unverified).
- Optional full-description insert (heading, then paragraph): `VIDEO POKER OFFLINE, BEZ INTERNETU`. Full description length after insert: 3333/4000 (was 3020).

### ru-RU  (confidence: medium)

- Current (74): `Deuces Wild, Bonus Poker, Double Bonus, мультирука и живые таблицы лидеров`
  - English gloss: Deuces Wild, Bonus Poker, Double Bonus, multi-hand and live leaderboards
- Corrected (74/80): `Видеопокер без интернета: Jacks or Better, Deuces Wild, мультирука. Офлайн`
  - English gloss: Video poker without internet: Jacks or Better, Deuces Wild, multi-hand. Offline
- Keyword added: без интернета + офлайн ("покер без интернета" has 5 AC variants)
- Removed: the "live" or unspecified leaderboard clause (native 3.0 has only a daily friends leaderboard) and the "Bonus Poker, Double Bonus" pair (still named in the full description and in the 3.0 release notes).
- Review: Native glance recommended before release: correct and natural to the author, but the word choice is not verified by a native speaker. Check that "Офлайн" as a closing fragment reads naturally; alternative: "Видеопокер офлайн: ... мультирука. Без интернета". Play availability and payments in Russia are restricted (research caveat).
- Optional full-description insert (heading, then paragraph): `ВИДЕОПОКЕР БЕЗ ИНТЕРНЕТА, ОФЛАЙН`. Full description length after insert: 3343/4000 (was 2984).

### tr-TR  (confidence: medium)

- Current (74): `Deuces Wild, Bonus Poker, Double Bonus, çoklu el modu ve canlı sıralamalar`
  - English gloss: Deuces Wild, Bonus Poker, Double Bonus, multi-hand mode and live rankings
- Corrected (75/80): `İnternetsiz video poker: Jacks or Better, Deuces Wild, çoklu el. Çevrimdışı`
  - English gloss: Video poker without internet: Jacks or Better, Deuces Wild, multi-hand. Offline (çevrimdışı)
- Keyword added: internetsiz + çevrimdışı
- Removed: the "live" or unspecified leaderboard clause (native 3.0 has only a daily friends leaderboard) and the "Bonus Poker, Double Bonus" pair (still named in the full description and in the 3.0 release notes).
- Review: Native glance recommended before release: correct and natural to the author, but the word choice is not verified by a native speaker. Research could not find us in TR results for "video poker"; verify country availability first (P0 in action-research).
- Optional full-description insert (heading, then paragraph): `İNTERNETSİZ VIDEO POKER`. Full description length after insert: 3119/4000 (was 2806).

### id  (confidence: high)

- Current (74): `Deuces Wild, Bonus Poker, Double Bonus, mode multi-tangan, papan peringkat`
  - English gloss: Deuces Wild, Bonus Poker, Double Bonus, multi-hand mode, leaderboards
- Corrected (79/80): `Video poker offline: Jacks or Better, Deuces Wild, multi-tangan. Tanpa internet`
  - English gloss: Video poker offline: Jacks or Better, Deuces Wild, multi-hand. Without internet
- Keyword added: offline + tanpa internet
- Removed: the "live" or unspecified leaderboard clause (native 3.0 has only a daily friends leaderboard) and the "Bonus Poker, Double Bonus" pair (still named in the full description and in the 3.0 release notes).
- Review: No native review needed beyond a skim. Standard vocabulary.
- Optional full-description insert (heading, then paragraph): `VIDEO POKER OFFLINE`. Full description length after insert: 3276/4000 (was 2983).

### hi-IN  (confidence: medium)

- Current (72): `Deuces Wild, Bonus Poker, Double Bonus, मल्टी-हैंड मोड और लाइव लीडरबोर्ड`
  - English gloss: Deuces Wild, Bonus Poker, Double Bonus, multi-hand mode and live leaderboard
- Corrected (75/80): `ऑफ़लाइन वीडियो पोकर: Jacks or Better, Deuces Wild, मल्टी-हैंड। बिना इंटरनेट`
  - English gloss: Offline video poker: Jacks or Better, Deuces Wild, multi-hand. Without internet
- Keyword added: ऑफ़लाइन + बिना इंटरनेट
- Removed: the "live" or unspecified leaderboard clause (native 3.0 has only a daily friends leaderboard) and the "Bonus Poker, Double Bonus" pair (still named in the full description and in the 3.0 release notes).
- Review: Native glance recommended before release: correct and natural to the author, but the word choice is not verified by a native speaker. "बिना इंटरनेट" is the plain phrasing; some listings write "ऑफलाइन" without the nukta. Either is fine.
- Optional full-description insert (heading, then paragraph): `ऑफ़लाइन वीडियो पोकर`. Full description length after insert: 2996/4000 (was 2724).

### ja-JP  (confidence: medium)

- Current (52): `Deuces Wild、Bonus Poker、Double Bonus、マルチハンド、ライブランキング`
  - English gloss: Deuces Wild, Bonus Poker, Double Bonus, multi-hand, live ranking
- Corrected (56/80): `オフラインで遊べるビデオポーカー：Jacks or Better、Deuces Wild、マルチハンド、通信不要`
  - English gloss: Video poker you can play offline: Jacks or Better, Deuces Wild, multi-hand, no connection needed
- Keyword added: オフラインで遊べる + 通信不要
- Removed: the "live" or unspecified leaderboard clause (native 3.0 has only a daily friends leaderboard) and the "Bonus Poker, Double Bonus" pair (still named in the full description and in the 3.0 release notes).
- Review: Native glance recommended before release: correct and natural to the author, but the word choice is not verified by a native speaker. Fullwidth colon and "、" follow the style of the existing ja-JP short description.
- Optional full-description insert (heading, then paragraph): `オフラインで遊べるビデオポーカー`. Full description length after insert: 1639/4000 (was 1498).

### ko-KR  (confidence: medium)

- Current (53): `Deuces Wild, Bonus Poker, Double Bonus, 멀티핸드, 실시간 순위표`
  - English gloss: Deuces Wild, Bonus Poker, Double Bonus, multi-hand, real-time leaderboard
- Corrected (59/80): `오프라인 비디오 포커: Jacks or Better, Deuces Wild, 멀티핸드. 인터넷 없이 플레이`
  - English gloss: Offline video poker: Jacks or Better, Deuces Wild, multi-hand. Play without internet
- Keyword added: 오프라인 + 인터넷 없이
- Removed: the "live" or unspecified leaderboard clause (native 3.0 has only a daily friends leaderboard) and the "Bonus Poker, Double Bonus" pair (still named in the full description and in the 3.0 release notes).
- Review: Native glance recommended before release: correct and natural to the author, but the word choice is not verified by a native speaker. Spacing in "비디오 포커" follows the existing title.
- Optional full-description insert (heading, then paragraph): `인터넷 없이 즐기는 오프라인 비디오 포커`. Full description length after insert: 1782/4000 (was 1634).

### zh-CN  (confidence: medium)

- Current (47): `Deuces Wild、Bonus Poker、Double Bonus、多手模式和实时排行榜`
  - English gloss: Deuces Wild, Bonus Poker, Double Bonus, multi-hand mode and real-time leaderboard
- Corrected (47/80): `离线单机视频扑克：Jacks or Better、Deuces Wild、多手牌模式，无需联网`
  - English gloss: Offline standalone video poker: Jacks or Better, Deuces Wild, multi-hand mode, no network needed
- Keyword added: 离线 + 单机 + 无需联网
- Removed: the "live" or unspecified leaderboard clause (native 3.0 has only a daily friends leaderboard) and the "Bonus Poker, Double Bonus" pair (still named in the full description and in the 3.0 release notes).
- Review: Native glance recommended before release: correct and natural to the author, but the word choice is not verified by a native speaker. "单机" (standalone) is the common App Store/Play term for offline play; confirm it does not read as "single-player only" in this context.
- Optional full-description insert (heading, then paragraph): `离线单机视频扑克，无需联网`. Full description length after insert: 1234/4000 (was 1136).

### iw-IL  (confidence: low)

- Current (69): `Deuces Wild, Bonus Poker, Double Bonus, מצב ריבוי ידיים וטבלאות דירוג`
  - English gloss: Deuces Wild, Bonus Poker, Double Bonus, multi-hand mode and leaderboards
- Corrected (74/80): `וידאו פוקר אופליין: Jacks or Better, Deuces Wild, ריבוי ידיים. ללא אינטרנט`
  - English gloss: Video poker offline: Jacks or Better, Deuces Wild, multi-hand. Without internet
- Keyword added: אופליין + ללא אינטרנט
- Removed: the "live" or unspecified leaderboard clause (native 3.0 has only a daily friends leaderboard) and the "Bonus Poker, Double Bonus" pair (still named in the full description and in the 3.0 release notes).
- Review: **Native review required before release.** The author is not confident about idiom or the mixed Latin/RTL layout. Hebrew and Latin text are mixed; check the Play Console preview for bidi ordering of "Jacks or Better". "אופליין" is the colloquial loanword; "ללא אינטרנט" is the plain phrase.
- Optional full-description insert (heading, then paragraph): `וידאו פוקר אופליין, בלי אינטרנט`. Full description length after insert: 2689/4000 (was 2436).

### ar  (confidence: low)

- Current (68): `Deuces Wild وBonus Poker وDouble Bonus ووضع تعدد الأيدي وترتيب مباشر`
  - English gloss: Deuces Wild, Bonus Poker, Double Bonus, multi-hand mode and live ranking
- Corrected (74/80): `فيديو بوكر بدون إنترنت: Jacks or Better وDeuces Wild وأيدٍ متعددة. أوفلاين`
  - English gloss: Video poker without internet: Jacks or Better and Deuces Wild and multiple hands. Offline
- Keyword added: بدون إنترنت + أوفلاين
- Removed: the "live" or unspecified leaderboard clause (native 3.0 has only a daily friends leaderboard) and the "Bonus Poker, Double Bonus" pair (still named in the full description and in the 3.0 release notes).
- Review: **Native review required before release.** The author is not confident about idiom or the mixed Latin/RTL layout. Arabic and Latin text are mixed; check the preview for bidi ordering. The pattern "وDeuces Wild" (attached conjunction) is copied from the existing ar listing.
- Optional full-description insert (heading, then paragraph): `فيديو بوكر بدون إنترنت`. Full description length after insert: 2795/4000 (was 2541).

## Ready-to-paste patch

File: `outputs/VideoPoker/02-metadata/listings-patch.json`. It has the same top-level keys as `play-store-assets/listings.json` (locale code, then field name) but only the `shortDescription` field. `scripts/play-listing-upload.js` needs complete objects, so merge per locale (shallow) rather than replacing the file. The command below is for you to run; this pass did not run it against the repo:

```bash
node -e 'const fs=require("fs");const f="play-store-assets/listings.json";const l=JSON.parse(fs.readFileSync(f,"utf8"));const p=JSON.parse(fs.readFileSync("outputs/VideoPoker/02-metadata/listings-patch.json","utf8"));for(const [k,v] of Object.entries(p))l[k]={...l[k],...v};fs.writeFileSync(f,JSON.stringify(l,null,2)+"\n")'
node scripts/validate-aso.js
node scripts/play-listing-upload.js validate
```

Release in two steps if you want to keep the risk small:

1. `listings-patch.json` first. It only replaces the inaccurate short descriptions. Ship this one this week.
2. `listings-patch-full-offline.json` second, after native review. It contains the new en-US full description plus, for each of the 15 locales, the existing full description with one inserted offline section (heading and paragraph, directly after the first paragraph). It repeats the offline claim in the long text, which research flagged as missing everywhere. Each paragraph says that sign-in, invites and the friends leaderboard need a connection.

## Optional: pt-BR title

Research (keyword-list section 8, competitor-gaps section 4): "vídeo pôquer" has no autocomplete suggestions and we are not in its results, while we rank #11 for "video poker" in Brazil. Changing the title costs nothing in position because there is no position on the old spelling.

- Current: `Vídeo Pôquer: Jacks or Better` (29)
- Proposed: `Video Poker: Jacks or Better` (28/30)
- The old title string also appears 2 times in the pt-BR full description (first sentence, and the closing "Baixe ... hoje" line). With a title change, replace it there too (resulting length 2926/4000). Otherwise the text and title disagree.

```json
{
  "pt-BR": {
    "title": "Video Poker: Jacks or Better"
  }
}
```

This is a separate decision from the short-description fix, so it is not in `listings-patch.json`. Title changes are re-indexed slowly; log the date and re-measure BR ranks for "video poker" and "jacks or better" weekly.

## Not done here

- No es-419 (LatAm) listing, and the other keyword ideas from keyword-list section 8 (ES "doblar" and "maquinita", DE "ohne echtes Geld", RU two-word "видео покер" form, JA Latin "video poker"). They belong in the P1 full-description pass after the Search terms export is available.
- fr-FR, it-IT, pl-PL, ko-KR, zh-CN, hi-IN, iw-IL and ar local demand was not measured in the research pass; their offline terms are the obvious translations, not measured keywords.
