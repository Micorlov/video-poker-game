# Google Play ASO Measurement

This is the weekly operating sheet for `com.micorlov.videopoker`. Use US English as the control market and compare the other supported locales against it.

## Weekly dashboard

| Week ending | Locale | Keyword | Position | Impressions | Visitors | Installs | Conversion | D1 | D7 | Ratings | Avg rating | Review themes |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| YYYY-MM-DD | en-US | video poker | — | — | — | — | — | — | — | — | — | — |

## Keyword set

- video poker
- jacks or better
- deuces wild
- bonus poker
- double bonus poker
- multi hand video poker
- free video poker
- poker game offline
- casino card game

## Locale set

`en-US`, `en-GB`, `en-CA`, `en-AU`, `de-DE`, `fr-FR`, `es-ES`, `pt-BR`, `es-MX`, `hi-IN`, `ja-JP`, `ko-KR`, `he-IL`, `ar`, `tr-TR`, `id-ID`, `it-IT`, `pl-PL`, `ru-RU`, `zh-CN`.

The listing currently contains 16 Play locales; the additional regional entries above are measurement targets only where a matching listing locale exists.

## Event definitions

The app emits privacy-safe Firebase Analytics events when Analytics is enabled:

- `app_open`, `session_start`
- `onboarding_step` with the step name
- `hand_started` with variant, hand count, and bet
- `hand_completed` with variant, hand count, result, and win state
- `daily_bonus_claimed`
- `leaderboard_viewed`
- `review_prompt_earned`
- `store_link_opened`

No account ids, names, invite codes, or card-level data are sent.

## Review cadence

- Weekly: keyword positions, listing conversion, installs, ratings, and review themes.
- Every experiment: record start date, end date, control, variant, primary metric, winner, and follow-up action.
- Monthly: compare organic installs and D1/D7 retention against the previous month.

## Play Console handoff

1. Enable Google Analytics for the Firebase project if it is not already enabled.
2. Export Play Console acquisition and retention reports weekly.
3. Run one store listing experiment at a time using `aso-experiments.json`.
4. Keep experiments live for 14 days unless traffic is too low to interpret.
