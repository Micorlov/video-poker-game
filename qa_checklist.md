# Video Poker QA Checklist

Run these test cases after any significant change. Use browser-agent or manual testing.

## Core Game Flow
- [ ] Page loads without JS errors (check console)
- [ ] Payout table renders correctly with all hand types
- [ ] Cards display face-down initially
- [ ] DEAL button starts a new hand (5 cards dealt)
- [ ] Clicking a card toggles HELD badge + visual indicator
- [ ] DRAW replaces unheld cards, keeps held cards
- [ ] Hand is evaluated correctly (result text appears)
- [ ] Balance updates: decreases on DEAL, increases on win

## Betting
- [ ] Default bet is 5
- [ ] Bet buttons (5, 10, 20, 50) work correctly
- [ ] Cannot bet more than current balance
- [ ] Low balance auto-adjusts bet (e.g., balance 40 → bets 40 "all in")
- [ ] Balance 0 triggers rebuy

## Rebuy System
- [ ] Rebuy adds 100 credits
- [ ] Rebuy notification appears
- [ ] Rebuy count increments correctly
- [ ] Score accounts for rebuys: `score = balance - 100 * (1 + rebuys)`

## Progressive Payouts (Boost)
- [ ] On loss ("Nothing"), payout values in table increase by 1
- [ ] Boosted values show green glow
- [ ] On win, payout table resets to base values
- [ ] Boost doesn't persist across page reloads

## Leaderboard
- [ ] Hourly leaderboard loads and displays
- [ ] Daily leaderboard loads and displays
- [ ] Both tabs show countdown timers
- [ ] Score updates immediately after a hand
- [ ] Player's rank bar shows current position in both hourly and daily
- [ ] Green campfire 🟢 appears next to online players

## Authentication
- [ ] Google sign-in button appears
- [ ] Sign-in popup/redirect works
- [ ] After sign-in, player name appears
- [ ] Sign-out works
- [ ] Score is linked to authenticated user

## State Persistence
- [ ] Reload page → balance and rebuys restored from Firebase
- [ ] Score not overwritten on reload
- [ ] Switching tabs doesn't lose state

## Localization
- [ ] Language selector works (EN, ES, FR, DE, HE, AR, RU)
- [ ] All UI text updates on language change
- [ ] RTL languages (HE, AR) display correctly
- [ ] Leaderboard tab labels update with language

## Private Rooms
- [ ] Create room button works
- [ ] Room code is generated
- [ ] Share link is copyable
- [ ] Joining via code works
- [ ] Joining via invite link works
- [ ] Room leaderboard shows only room members
- [ ] Room cadence (hourly/daily/weekly) works correctly

## Edge Cases
- [ ] Rapid clicking DEAL/DRAW doesn't cause issues
- [ ] Multiple tabs open simultaneously
- [ ] Network disconnect → graceful error (no crash)
- [ ] Very long player names display without breaking layout

## Visual / UX
- [ ] Card flip animations play smoothly
- [ ] Win animation triggers on winning hand
- [ ] No layout shifts during gameplay
- [ ] Mobile viewport renders acceptably
