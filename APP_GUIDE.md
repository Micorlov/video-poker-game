# Video Poker — The Complete Player's Guide

## What This App Is

Video Poker (also introduced in the app as "Royal Video Poker") is a free social casino game for phone, tablet, and web browser. Players use virtual chips only — there is no real money involved anywhere in the app, no purchases, no withdrawals, no gambling with actual cash. It's built purely for entertainment: the thrill of playing casino-style poker, competing with friends, and climbing leaderboards, without any financial risk.

The game is based on a classic casino format called five-card draw video poker, in the style of the machines found on casino floors. The player is dealt a hand of five cards, decides which cards to keep, draws new cards to replace the rest, and is paid out based on the strength of the final poker hand. What makes this app different from a plain solitary card game is everything wrapped around that core loop: multiple game variations, a leveling system, daily play limits, friends and private rooms, live leaderboards, win streaks, and a steady stream of push notifications that pull players back in.

The app is available as an installable web app (a Progressive Web App, playable directly in a browser and installable to a phone's home screen), as well as native apps for Android and iOS.

---

## Getting Started: The First-Time Experience

The very first time someone opens the app, they're walked through a short, swipeable introduction — six screens, with dots at the bottom showing progress and arrows to move forward or back:

1. **Welcome screen — "Royal Video Poker."** A fan of playing cards, a tagline about playing with free chips ("no real money, all the thrill"), and three quick pills summarizing the game: 5-Card Draw, Free Chips Daily, No Real Money. This is also where new players pick their language — the app supports twelve languages, including English, Spanish, Portuguese, French, German, Italian, Russian, Japanese, Korean, Chinese, Arabic, and Hindi.
2. **"Know Your Hands."** A quick primer on the poker hands that pay out, from a Royal Flush at the top down to a simple pair of Jacks-or-better at the bottom, plus a note that there are nine winning hands in total.
3. **"Bet After You Decide."** This explains a distinctive rule of this app: instead of betting first and then seeing your cards, the player places the bet *after* seeing the hand they were dealt. It also introduces the "ALL IN" button — a once-a-day option to bet the player's entire balance on a single hand, with a hint that inviting a friend can unlock an extra one.
4. **"Compete & Climb."** A preview of the leaderboard system — tabs for Friends, Hourly, and Daily rankings, showing how players stack up against each other.
5. **"Never Miss a Win."** On the native mobile apps only, this screen asks for permission to send push notifications, covering everything from friend activity to leaderboard changes.
6. **"Save Your Progress."** A prompt to sign in with a Google account so progress is saved and synced. On the mobile apps, players can also choose to just "Continue as Guest" and play locally without an account. On the web version, signing in is required in order to unlock the social features.

Once this intro is finished, the app remembers that and won't show it again (though it reappears after signing out on the native apps).

---

## The Core Gameplay Loop

However a player gets there, the heart of the app is the **Play screen**, and the loop works like this:

1. **See your hand.** Five cards are dealt face up automatically.
2. **Choose your bet.** Only *after* seeing the cards does the player pick how much to wager — 5, 10, 20, or 50 chips, tapped from a row of bet chips. There's also the special "ALL IN" option, described below.
3. **Hold cards.** The player taps (or clicks, or on a keyboard presses keys 1 through 5) any cards they want to keep. Held cards are visually marked so it's clear what's being kept versus what will be replaced.
4. **Draw.** Pressing the "Draw" button discards every card that wasn't held and deals fresh replacements from the deck.
5. **See the result.** The final five-card hand is evaluated. If it matches one of the paying hand types, the player wins credits equal to their bet multiplied by that hand's payout — and a banner announces the win (for example, "Full House! +70 credits!"), along with a plain-language explanation of which hand was made.

If the balance ever drops below what's needed to place a minimum bet, the game automatically tops the player back up with 500 free credits — a "rebuy" — accompanied by a small toast message. This is unlimited and free, so a player can never truly get stuck; it's simply there to keep the game going.

### The Winning Hands (Jacks or Better)

The base game, Jacks or Better, pays out for nine different hand types, from rarest to most common:

| Hand | What it means | Payout (multiplied by your bet) |
|---|---|---|
| Royal Flush | Ace, King, Queen, Jack, Ten, all the same suit | 250x |
| Straight Flush | Five cards in a row, all the same suit | 50x |
| Four of a Kind | Four cards of the same rank | 20x |
| Full House | Three of a kind plus a pair | 7x |
| Flush | Five cards of the same suit, not in sequence | 5x |
| Straight | Five cards in sequence, mixed suits | 4x |
| Three of a Kind | Three cards of the same rank | 3x |
| Two Pair | Two separate pairs | 2x |
| Jacks or Better | A single pair of Jacks, Queens, Kings, or Aces (lower pairs don't pay) | 1x |

Any hand weaker than a pair of Jacks doesn't pay out at all — that's where the name "Jacks or Better" comes from.

### Strategy Hints

For players who want help deciding what to hold, there's a lightbulb toggle on the Play screen labeled Strategy Hints. When switched on, the game highlights in blue the cards it recommends holding, based on standard video-poker strategy — for example, always keeping a made straight or flush, prioritizing a four-card royal flush draw over a made low pair, and so on. It's an assist feature that teaches good decision-making rather than an autoplay function; the player still makes the final call on every hand.

---

## The Four Game Variants

Beyond the base Jacks or Better game, the app includes three additional poker variants, each with its own paytable and its own personality. New variants unlock as a player levels up (leveling is explained further down), and locked variants show a small lock icon with a note like "Unlocks at level 8."

- **Jacks or Better** — available from the very start. The classic version described above.
- **Deuces Wild** — unlocks at level 3. Every 2 in the deck becomes a wild card, standing in for any card needed. Because wilds make strong hands much easier to form, the minimum paying hand jumps up to Three of a Kind — there's no payout row for a low pair or even Two Pair. The biggest prizes are Four Deuces (200x) and a Wild Royal Flush (25x), on top of a natural Royal Flush at 250x.
- **Bonus Poker** — unlocks at level 8. Plays like Jacks or Better, but rewards Four of a Kind hands much more generously depending on the rank: Four Aces pays a huge 80x, while other four-of-a-kinds pay 25x or 40x depending on the card rank.
- **Double Bonus** — unlocks at level 15. An even more heavily bonus-weighted variant, where Four Aces pays 160x and other quads pay 50x to 80x, at the cost of a smaller payout for Two Pair.

Players switch between variants from the Settings screen, and can only make the change between hands (not mid-hand).

---

## Betting Options

### Standard Bets

The default way to play is a single hand at a time, with a bet of 5, 10, 20, or 50 chips selected after seeing the dealt cards. Players can set their preferred default bet amount in Settings so it's pre-selected each time they open the app.

### Multi-Hand Play — Triple Play and Five Play

Once a player reaches level 10, a new option unlocks in Settings: playing three or five hands at once from the same starting deal. This is a well-known video poker format sometimes called Triple Play or Five Play. Here's how it works: the player is dealt one hand and decides which cards to hold, exactly as normal — but that same hold decision is then applied across multiple independent hands simultaneously, each one drawing its replacement cards from its own separately shuffled deck. Every hand pays out on its own, and all the winnings are added together. It multiplies both the excitement and the risk, since the total bet is the chosen bet amount multiplied by the number of hands being played.

### ALL IN

The boldest option on the bet row is the "ALL IN" button. Tapping it opens a confirmation sheet explaining that this will wager the player's entire current balance on the very next hand (split across hands if multi-hand play is active). Confirming isn't a simple tap — it's a deliberate slide-to-confirm gesture, dragged most of the way across the screen, so it can't be triggered by accident.

ALL IN is limited to once per day by default, refreshing at the start of a new day. A small badge on the button shows how many uses are left. Once it's used up for the day, tapping it shows a message to come back tomorrow. As hinted during onboarding, inviting friends can sometimes unlock extra uses.

---

## Progression: Levels, Streaks, and Records

### Levels

Every hand played counts toward a player's level, regardless of whether it wins or loses — the game rewards playing, not just winning. Leveling up is what unlocks the additional game variants and the multi-hand modes described above. The pacing works out to roughly: Deuces Wild around 10 hands played, Bonus Poker around 35 hands, Multi-Hand around 45 hands, and Double Bonus around 70 hands.

### Win Streaks

Winning hands back-to-back builds a visible win streak, shown as a flame icon and counter on the Play screen. As the streak grows, it starts boosting future payouts:

| Streak length | Payout bonus |
|---|---|
| 3 or more wins in a row | +10% |
| 5 or more | +20% |
| 7 or more | +30% |
| 10 or more | +50% |

A single loss resets the streak. The best streak a player has ever reached is saved and shown off to friends and in room rankings.

### Personal Best Hand & Stories

The single highest-paying hand a player has ever won is remembered permanently. It becomes that player's "story" — a feature modeled on the familiar Instagram-style circular story rings, shown along the top of the Play screen for the player and their friends. Tapping a story ring opens a full-screen replay of that best-ever hand: the cards, the hand name, how many credits it earned, and the payout multiplier. If a player hasn't won anything yet, their ring simply invites them to "win a hand to create your story."

### Bracelets

Every hour and every day, whoever landed the single biggest win during that window earns a "bracelet" — a small badge of prestige (no extra credits attached) that appears on their story ring and in the story viewer as a mark of having been the top winner during that period.

---

## Screens Tour

The app is organized around four main tabs at the bottom of the screen: **Play**, **Stats**, **Friends**, and **Settings**.

### Play Screen

This is the home screen and default view, containing, from top to bottom:
- The app's title bar and a tournament indicator (a countdown-style pill players can tap to see more).
- The stories row of friends' best hands.
- The current balance and bet total.
- The bet-selection row (5 / 10 / 20 / 50 / ALL IN).
- The five-card hand itself, tappable to hold/unhold cards.
- The main action button — "Deal" to start a hand, "Draw" to complete it — plus the strategy-hints toggle.
- The win-streak bar.
- A friends leaderboard panel and an hourly champions panel (on mobile apps these two combine into one panel with switchable tabs for Friends, Hourly, and Daily).
- A "Play With Friends" section previewing the player's poker rooms, with an option to create a new one.
- The result banner and hand explanation after each draw.

Keyboard shortcuts are also supported for anyone playing in a browser: number keys 1 through 5 toggle holds (or select a bet amount before the deal), and the "d" key deals or draws.

### Stats Screen

A simple statistics dashboard with a toggle between **Today** and **All-Time** views. It shows:
- Net winnings or losses (color-coded green for profit, red for loss).
- Total credits won.
- Total credits lost.
- Total hands played.
- Best win streak reached.

### Friends Screen

This is the social hub. Signed-out players just see a prompt to sign in. Once signed in, the screen offers:
- **Your Code** — a personal 6-character code other players can use to add you as a friend.
- **Invite Friends** — a shareable invite link that can be copied or sent directly via WhatsApp.
- **Add a Friend** — a field to type in someone else's 6-character code.
- Two tabs: a **Leaderboard** ranking all of the player's friends by net profit (with online-status dots and country flags), and **Poker Rooms**, listing the private rooms the player belongs to or can join, plus a button to create a new room by choosing a name and a stake amount.

Friend connections work two ways: entering someone's code directly, or following an invite link, which cleverly connects the new player as a mutual friend with everyone who is already in that inviter's friend circle — not just the one person who sent the link. This makes friend groups grow quickly and naturally.

### Settings Screen

Where players customize their experience:
- **Gameplay** — toggles for sound effects and haptic (vibration) feedback.
- **Theme** — a choice of three color themes: Green (the default), Blue, or Crimson.
- **Default Bet** — the bet amount pre-selected at the start of each session.
- **Game Variant** — switch between Jacks or Better, Deuces Wild, Bonus Poker, and Double Bonus (locked variants show the level needed to unlock them).
- **Hands per Deal** — choose 1 Hand, 3x Hands, or 5x Hands (locked until level 10).
- **Support** — an expandable payout table showing exactly what each hand pays in the currently selected variant.
- **Account** — sign in with Google, or, once signed in, see your display name and a sign-out option.
- **Notifications** — four independent toggles for the different notification categories (details below).
- **Danger Zone** — a "Reset Statistics" option to wipe stats and start fresh.

All of the game's sound effects — the card deal, the flip, clicks, wins, losses, and level-ups — are generated live rather than played from audio files, and the balance counter even plays a little rising arpeggio of coin sounds as it counts up after a win.

---

## Social Features in Depth

### Friends & Presence

Friendships are mutual — once connected, both players see each other on their leaderboard, with a green "online" dot if that friend has been active within the last couple of minutes, and a small flag showing their country.

### Poker Rooms

A "Poker Room" isn't a shared table where everyone plays the same cards — instead, think of it as a private competitive leaderboard among a small group of friends. A room has a name, a chosen stake level, room for up to six members, and a shareable join code. Members are ranked inside the room by their net profit since joining. A room shows as "Open" while it only has one member, and "In Progress" once a second player joins.

### Sharing & Invites

Invite links and room-join links can be shared through a copy-to-clipboard button, the device's native share sheet, or direct WhatsApp and Telegram buttons — making it easy to pull friends into the game from wherever the conversation is already happening.

---

## Leaderboards and Champions

The app layers several different competitive rankings on top of each other:

- **Friends Leaderboard** — ranks the player against their own friend circle by net profit, resetting daily.
- **Hourly Champions** — an all-players leaderboard scored on winnings, resetting at the top of every hour.
- **Daily Champions** — an all-players leaderboard scored on net profit, resetting at the start of every day.
- **Room Leaderboard** — ranks the members within a specific poker room by lifetime net profit, and never resets.
- **Bracelets** — separate from the point-based leaderboards, these recognize whoever landed the single biggest win in the current hour or day.

Leaderboard rows show each player's rank, avatar, display name, country flag, and score, with the current player's own row highlighted for easy reference. On mobile, all of these boards live together under switchable tabs; on the web version, the Friends board and the Hourly Champions board appear as two separate panels on the Play screen.

---

## Push Notifications

For players who've enabled notifications (mobile only), the app can send several kinds of alerts, each independently switchable off in Settings:

- **Friend activity** — someone added you as a friend, someone joined your circle through your invite link, or someone joined a room you own.
- **Leaderboard updates** — a friend or room member has just passed you in the rankings, you've taken over the #1 spot among your friends, or you've dropped out of the current hour's top five.
- **Friends' best hands** — one of your friends just landed an exceptional hand, like a Royal Flush.
- **Daily bonus reminder** — a nudge to come back if a day has passed without playing, timed around the daily ALL IN reset.

---

## Look, Feel, and Celebrations

The app leans into casino atmosphere with a dark, forest-green-and-gold visual theme by default (with blue and crimson alternatives available), animated card flips, and a tiered celebration system: bigger wins trigger progressively bigger visual payoffs, escalating from a simple gold shimmer on a modest win, up through card bounces, confetti bursts, screen flashes, and — for the very best hands, like a Royal Flush — a full fireworks display with screen shake and a shower of gold.

---

## Platforms

Video Poker is built to run in three places from a single shared codebase:

- **Web** — playable directly at its web address in any browser, installable to a phone or desktop as a Progressive Web App, and works offline once installed.
- **Android** — a native app available for install, wired up to Android's notification system.
- **iOS** — a native app for iPhone, including support for Sign in with Apple and background push notifications.

Progress, friends, rooms, and leaderboard standing are all synced through the player's signed-in account, so switching between devices keeps everything in sync.

---

*This guide describes Video Poker as a player experiences it: how to play, what every screen does, and every feature layered on top of the core card game.*
