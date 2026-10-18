# Review Reply Templates: Video Poker: Jacks or Better (3.x)

**Written:** 2026-10-14. These extend `play-store-assets/04-review-replies.md` and keep its voice: first person, one solo developer, short, no "The Team", no corporate sign-off.
**Hard limit:** Play caps a developer reply at **350 characters**. Every template below fits after you fill in the placeholders (the length is shown after each one).
**Goal:** reply to every review within 24 hours. Replies are public and indexed.

## Rules (from the 2.x file plus 3.0 lessons)

1. Reply in the reviewer's language. Templates for the expected "lost progress" wave are below in ES, PT, DE, RU and HE. For others, adapt the English one.
2. Use one specific detail from their review in the first sentence. Never paste the same reply twice in a row.
3. **Never** offer chips, bonuses or anything else for a rating, a changed rating or an edited review. Never ask for a specific star value. Don't ask them to change their rating at all. "Let me know if it's fixed" is enough, and Play notifies them of your reply.
4. **Never claim the cards are "100% random", "fair" or "certified RNG".** The game has a documented engagement-tuning boost on deals (`js/game.js` `boostHand`, ported to native). Talk about what's true instead: the paytable on screen, the exact hints, no real money.
5. Don't promise dates for features you haven't built (live leaderboards, rooms, the 9/6 table). Do say when a fix has **shipped**, with the version number.
6. Don't argue, blame the user, or reveal anything about other players.
7. Reply even to 5★ reviews. A visible reply to the first few ratings on a 0-rating listing is part of the social proof.

Placeholders: `{feature}`, `{version}`, `{variant}`. Remove anything in [brackets] that doesn't apply.

---

## 1. Positive

### 1a. 5★, general
```
Thank you! I build this game on my own, so this really helps. If you have not tried them yet, turn on strategy hints in Settings and try Triple Play and Five Play once they unlock. Any idea for the next update? I read every review.
```
(231 chars)

### 1b. 5★, mentions a specific feature
```
Thank you! Glad you like {feature}. That one took a lot of work to get exactly right. If there is anything you would change about it, tell me here and I will look at it for the next update.
```
(189 chars before placeholders)

### 1c. 5★, mentions no ads
```
Thank you! No ads and no purchases is the whole point. I wanted a video poker game I would play myself. Enjoy the daily chips, and tell me if anything could be better.
```
(167 chars)

### 1d. 4★
```
Thank you for the rating! What would make it a 5 for you? I am a solo developer, I read every review and small fixes usually ship within a week or two.
```
(151 chars)

### 1e. 3★, "good but…"
```
Thanks for the honest review. You are right about {issue}, and it is on my list. I am one developer, so tell me which one thing would matter most to you and I will look at it first.
```
(181 chars before placeholders)

---

## 2. Lost my progress after the update (expected from upgraders in October-November 2026)

Use these until the migration ships. Don't promise it will restore their progress until it's built and tested.

### 2a. EN: progress gone, before the migration ships
```
I am really sorry. Version 3.0 is a completely rebuilt app, and chips and levels from the old version did not carry over. That is my mistake, not yours. I am working on bringing old progress back and will reply here as soon as it ships.
```
(236 chars)

### 2b. EN: lost unlocked variants / multi-hand
```
Sorry about this. 3.0 is a rebuilt app and old levels did not carry over, so Triple Play and Five Play are locked again until level 10. I am working on restoring old progress and will reply here when it is out. Thank you for sticking with the game.
```
(248 chars)

### 2c. EN: after the migration ships (edit your earlier reply)
```
Update: version {version} can bring back chips and levels from the old app. Update from Google Play, open the game once, and it should pick them up. If it does not, email micorlov@gmail.com and I will help. Sorry again for the trouble.
```
(235 chars before placeholders)

### 2d. ES
```
Lo siento mucho. La versión 3.0 es una app reconstruida desde cero y las fichas y niveles de la versión anterior no se transfirieron. El error es mío. Estoy trabajando para recuperar el progreso anterior y responderé aquí cuando esté listo.
```
(240 chars)

### 2e. PT-BR
```
Sinto muito. A versão 3.0 é um app refeito do zero e as fichas e níveis da versão anterior não foram transferidos. O erro é meu. Estou trabalhando para recuperar o progresso antigo e respondo aqui assim que estiver pronto.
```
(222 chars)

### 2f. DE
```
Das tut mir sehr leid. Version 3.0 ist eine komplett neu gebaute App, und Chips und Level aus der alten Version wurden nicht übernommen. Das ist mein Fehler. Ich arbeite daran, den alten Fortschritt zurückzuholen, und melde mich hier, sobald es so weit ist.
```
(257 chars)

### 2g. RU
```
Мне очень жаль. Версия 3.0 полностью переписана, и фишки и уровни из старой версии не перенеслись. Это моя ошибка. Я работаю над тем, чтобы вернуть старый прогресс, и отвечу здесь, как только это будет готово.
```
(209 chars)

### 2h. HE
```
אני ממש מצטער. גרסה 3.0 נבנתה מחדש מהיסוד, והצ'יפים והרמות מהגרסה הקודמת לא עברו. הטעות שלי. אני עובד על החזרת ההתקדמות הישנה ואעדכן כאן ברגע שזה יהיה מוכן.
```
(156 chars)

---

## 3. "Where did the leaderboards / rooms go?" (upgraders)
```
Fair question. 3.0 is a rebuilt, faster app, and the live leaderboards and poker rooms are paused while I rebuild them. The friends leaderboard is already back on the Friends tab. Thanks for your patience.
```
(205 chars)

---

## 4. Negative (1-2★)

### 4a. No detail
```
Sorry it did not work for you. Can you tell me what happened, or email micorlov@gmail.com? I am a solo developer and I want to fix it.
```
(134 chars)

### 4b. Crash or bug reported, not fixed yet
```
Thank you for reporting this, and sorry. Can you email micorlov@gmail.com with your phone model and Android version? I am looking into it now and will reply here when the fix is out.
```
(182 chars)

### 4c. Bug fixed (edit the earlier reply)
```
Update: this is fixed in version {version}. Please update from Google Play and let me know if it still happens. Thank you for reporting it. It helped other players too.
```
(168 chars before placeholders)

### 4d. User error / hidden setting
```
Thanks for writing. You can turn on {feature} in Settings. I can see it is too hard to find, so I will make it easier in the next update. If anything else is unclear, email micorlov@gmail.com.
```
(192 chars before placeholders)

### 4e. "Too many rating pop-ups"
```
Sorry about that. The rating ask should appear at most once per session and a few times in total, then never again after you tap Rate. If you saw it more often, please email micorlov@gmail.com so I can fix it.
```
(209 chars)

---

## 5. Gambling-related

### 5a. Wants real money or cash-out
```
This is a social casino game only: free chips, no real money and no prizes, by design. Sorry it was not what you were looking for. If you just want to practise video poker strategy, the exact hints are a good way to learn.
```
(222 chars)

### 5b. "It's rigged" / "I always lose"
Don't claim randomness or fairness (rule 4).
```
Thanks for the feedback. The paytable on screen is exactly what each hand pays, and no real money is ever involved. Turn on strategy hints to see the best hold for each deal. You also get a free rebuy if your chips run out, so you can never go bust.
```
(249 chars)

### 5c. Concern about gambling or addiction
```
Thank you for raising this. The game uses free chips only, has no purchases and no real money, and is meant for adults. If you feel gambling is becoming a problem, please reach out to a local support service such as a national gambling helpline.
```
(245 chars)

### 5d. Paytable complaint (7/5 vs 9/6)
```
Fair point. The Jacks or Better table is 7/5, not 9/6 full pay. It is shown on screen so there are no surprises. A 9/6 option is on my list. Thank you for pushing for it.
```
(170 chars)

---

## 6. Feature requests

### 6a. Generic
```
Great idea, thank you! I am adding {feature} to my list. I am one developer, so I cannot promise a date, but requests like yours decide what I build next. Keep them coming.
```
(172 chars before placeholders)

### 6b. More variants (Double Double Bonus, Joker Poker, Ultimate X…)
```
Thanks! Right now there are four games: Jacks or Better, Deuces Wild, Bonus Poker and Double Bonus. {variant} is a popular request and it is on my list. I will reply here if it ships.
```
(183 chars before placeholders)

### 6c. Ten-hand / landscape / tablet layout
```
Good suggestion. Right now the game is portrait-only with up to five hands. I have noted {feature} for a future update, and I will reply here if it ships.
```
(154 chars before placeholders)

---

## 7. Other situations

| Situation | Action |
|---|---|
| Review mentions another app with the same title (com.innovizea / S7SOFTWARE "Video Poker: Jacks or Better") | Reply: "Thanks! Just to check: this review is on Video Poker by Orlov Games (no ads, no purchases). If you meant another app with the same name, no worries." Keep it under 200 chars. |
| Spam, abuse, or off-topic | Don't reply. Use "Report review" (flag) in the Console. |
| Review in a language without a template | Use Play's translation to read it. Write the reply in English, then translate it. Keep it short so the translation stays accurate. |
| The reviewer updates their rating after your reply | Thank them in one line. Don't mention the stars. |
| A friend or family member's review | Don't treat it differently. Reply like you would to anyone. Never coordinate the wording. |

## Escalation (solo-dev version)

| Severity | Examples | Reply within | Also do |
|---|---|---|---|
| Critical | Data loss beyond the known 3.0 reset, a crash on launch, a privacy concern, a policy/age concern | 4 hours | Check vitals. Halt the staged rollout if several users report it. |
| High | Lost progress (3.0), a specific bug, sign-in failure, the referral bonus not credited | 24 hours | Log it in the weekly review-theme tally. |
| Standard | Feature requests, praise, 3★ | 24-48 hours | Count requests per feature (monthly). |

**Pattern rule:** 3 or more reviews about the same issue in 7 days → it goes to the top of the next release, and the timeline gets updated.
