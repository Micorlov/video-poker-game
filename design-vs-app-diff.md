# Design (.dc.html) vs Running Android App — Comprehensive Diff

## 1. Paytables (CRITICAL — user-facing correctness)

| Hand | Design (.dc.html) | App (Jacks or Better) | App (Deuces Wild) | App (Bonus) | App (Double Bonus) |
|------|-------------------|----------------------|-------------------|-------------|-------------------|
| Royal Flush | 255 | 250 | 250 | 250 | 250 |
| Straight Flush | 55 | 50 | — | 50 | 50 |
| Four of a Kind | 25 | 20 | — | — | — |
| Full House | 12 | 7 | 3 | 8 | 10 |
| Flush | 10 | 5 | 2 | 5 | 7 |
| Straight | 9 | 4 | 2 | 4 | 5 |
| Three of a Kind | 8 | 3 | 1 | 3 | 3 |
| Two Pair | 7 | 2 | — | 2 | 1 |
| Jacks or Better | 6 | 1 | — | 1 | 1 |

**Design values are ~2-6x higher than the real app.** The design has ONE shared table; the app has four variant-specific tables.

**App-only hands (missing from design):** Four Deuces (200), Wild Royal Flush (25), Five of a Kind (15), Four Aces (80/160), Four 2s-4s (40/80), Four 5s-Ks (25/50)

## 2. Card Rendering

| Aspect | Design | App |
|--------|--------|-----|
| Approach | Text: `cface` with rank label + suit character | Pip grid (3×5) for 2-10, royalty center (gradient) for J/Q/K, large suit for A |
| Index corners | None | Top-left rank+suit, bottom-right rank+suit (rotated) |
| Royalty | Plain text J/Q/K | J=blue gradient+⚔️, Q=purple+👑, K=red+🛡️ |
| Flip animation | None | 250ms staggered flip per card |
| Card back | Diagonal dashed lines + 🂠 glyph | Panel-solid with diagonal light stripes |
| Held indicator | Gold outline (2.5px offset) + "HELD" tag | Gold outline (2px) + "HELD" badge + translateY(-6px) |
| Win indicator | None | Green glow outline + "WIN BADGE" with hand-specific text |
| Unheld dimming | None | 0.55 opacity on unheld cards |

## 3. Game Engine Gaps

| Feature | Design | App |
|---------|--------|-----|
| Variant evaluation | Single `evaluate()` (no variant routing) | `evaluateForVariant()` → routes to `evaluateDeucesHand()` or checks quad types for Bonus/DoubleBonus |
| Deuces Wild logic | Missing | Complete: substitutes 2s for any card, detects 4 Deuces, Five of a Kind, Wild Royal Flush |
| Wheel straight (A-2-3-4-5) | Missing | Detected and recalculated |
| Multi-hand (3×/5×) | Missing | Complete: side draws, per-hand evaluation, aggregate win, best-type tracking |
| Engagement tuning | Missing | `boostHand()`, `getBoostChance()` with mercy/pity scaling |
| Payout escalation on loss | Missing | All non-Nothing payouts increment by 1 after each loss |
| Streak bonuses | Missing | 10%/20%/30%/50% at 3/5/7/10 win streak |
| Game state persistence | Missing | localStorage save/restore for balance, bet, streaks |
| Level progression | Missing | VP_LIFETIME_HANDS, per-level unlocks (variant 3=Deuces, 8=Bonus, 15=DoubleBonus) |
| Keyboard shortcuts | Missing | 1-5=hold, D=deal/draw |

## 4. Feature Gaps (Missing from Design)

| Feature | Design | App |
|---------|--------|-----|
| Streak bar | Missing | Full bar: display, bump animation, bonus percentage tag |
| Win animations | Missing | Confetti burst, gold rain, flash overlay, shimmer text, screen shake |
| Sound effects | Toggle only | 8 synthesized sounds: deal, flip, click, loss, coin, win, bigWin, levelUp |
| Haptic feedback | Toggle only | LIGHT/MEDIUM/HEAVY impacts via Capacitor Haptics or navigator.vibrate |
| Sign-in / Google Auth | None (hardcoded friends) | Firebase Auth with Google popup/redirect + native Capacitor bridge |
| Friend codes | Missing | 6-char codes, copy invite link, WhatsApp share |
| Firestore rooms | Hardcoded mock data | Real-time Firestore rooms with join/leave |
| Toast messages | Missing | `showToast()` for unlock notifications, rebuy, errors |
| PWA manifest | Missing | manifest.json |
| All-time stats | Hardcoded mock data | localStorage-based accumulator |
| Hint system (strategy) | Hardcoded tip text | Full optimal-hold calculation: royal draw, flush draw, straight draw, 4-to-royal, etc. |
| Tournament expand | Toggle chevron only | Has expandable detail with tournament timer |
| "Create Room" | Inline on friends screen | Modal overlay |

## 5. CSS / Visual Differences

| Aspect | Design | App |
|--------|--------|-----|
| Themes | 3 themes (green/blue/crimson) | 1 theme (green only) |
| CSS vars | `--felt-900/800/700/600`, `--gold-500/600/100` | Same plus `--gold-dim`, `--green`, `--green-dim`, `--red-dim`, `--text`, `--text-muted`, `--text-faint`, `--bg-top`, `--bg-bottom`, `--panel`, `--panel-solid`, `--border`, `--border-strong`, `--radius-lg/md/sm`, `--nav-height` |
| App width | 100% of viewport | max-width 460px, centered |
| Fonts | Manrope, sans-serif | Manrope, Segoe UI, Noto Sans Hebrew, Arabic, apple-system |
| Bottom nav padding | 8px 8px 26px | env(safe-area-inset-bottom) aware |
| Card radius | 12px | 10px |
| Card background | #fbfaf6 | #f4f1e8 (cream) |
| Bet button active | Green background (--win) | Gold background (--gold) |
| Bet button inactive | --felt-800 bg, --felt-600 border | rgba(255,255,255,0.08) disabled |

## 6. Structure / Screen Differences

| Aspect | Design | App |
|--------|--------|-----|
| Screen switching | All 4 screens in one scrollarea, sc-if toggles | Separate `<section>` elements, class "active" toggle |
| Variant picker | Horizontal scrollable cards above balance | Grid in Settings screen |
| Multi-hand picker | Segmented control on play screen (`segrow`) | 3-column grid in Settings screen |
| Sign-in flow | Not implemented | Modal with Google button + error display |
| vs Friends card | `rankstrip` on play screen | Panel with rank# and detail, hidden until signed in |
| Account section | Not present | In Settings: signed-in display with sign-out button |
| Version | v2.0 | v3.0 |

## 7. Animation Differences

| Animation | Design | App |
|-----------|--------|-----|
| Card deal | None | 250ms staggered flip per card |
| Win celebration | None | `confetti-burst-fly` (8px colored pieces, 1s), `gold-rain-fall` (6×12px pieces, top-to-bottom), `shimmer-gold` text (1.5s infinite), `flash-overlay` with `flash-fade` |
| Loss feedback | None | `screen-shake` keyframes (100ms × 5 iterations) |
| Card held state | None | `card-bounce` transition (0.5s ease) |
| Streak bump | None | `streak-bump` (0.35s ease) |
| prefers-reduced-motion | Not handled | Media query disables all animations |

## 8. Data Flow / Architecture

| Aspect | Design | App |
|--------|--------|-----|
| Framework | DCLogic reactive (state → renderVals) | Vanilla JS with direct DOM manipulation |
| Data binding | `{{mustache}}` + sc-if/sc-for templates | innerHTML / textContent assignment |
| State management | `this.state` + `setState()` | Global variables + localStorage |
| Component model | Single Component class extends DCLogic | Multiple module files (game.js, ui.js, firebase.js, etc.) bundled by build.js |
| Build | support.js + .dc.html → standalone | build.js concatenates index.html + CSS + JS → www/video_poker.html |

## 9. Priority Action List

| Priority | Item | Impact |
|----------|------|--------|
| P0 | Fix paytables: per-variant, correct values | Users get wrong payout expectations |
| P0 | Add Deuces Wild / Bonus / DoubleBonus evaluate logic | Missing variants don't score correctly |
| P1 | Add pip-grid card rendering with flip animation | Visual mismatch on the primary game element |
| P1 | Add multi-hand (3×/5×) support | Missing game mode |
| P1 | Add streak bar + streak bonus logic | Missing core engagement mechanic |
| P1 | Add boost/engagement tuning | Missing intentional game design |
| P2 | Add win animations (confetti, gold rain, flash, shimmer) | Missing celebration feedback |
| P2 | Add sound effects + haptic triggers | Missing sensory feedback |
| P2 | Add sign-in modal, Firebase auth, friend codes | Missing social features |
| P2 | Add toast notifications | Missing UX affordance for unlocks/rebuy |
| P2 | Add card flip animation on deal/draw | Missing visual polish |
| P3 | Add result explanations per hand type | Missing educational content |
| P3 | Add screen shake on loss, streak bump | Missing loss feedback |
| P3 | Add payout escalation on loss | Missing intentional mechanic |
| P3 | Add game state persistence (localStorage) | Missing session continuity |
