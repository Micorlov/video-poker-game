# Video Poker Reel - Video Plan

## Overview
- **Topic**: Video Poker (Jacks or Better) - Interactive Game Demo
- **Hook**: Show an exciting win - a Royal Flush or Four of a Kind!
- **Aha moment**: The game mechanics - hold/draw, bet selection, win explanations
- **Target audience**: Social media (Reels/TikTok) - vertical format, fast-paced
- **Length**: ~30-60 seconds (vertical 9:16 aspect ratio)
- **Resolution**: 1080x1920 (vertical)

## Color Palette (Casino Theme)
- Background: #0D1B12 (Dark casino green)
- Primary: #FFD700 (Gold - highlights, wins)
- Secondary: #FF6B35 (Orange - buttons, actions)
- Accent: #4ADE80 (Green - wins, balance)
- Card Red: #E63946 (Hearts/Diamonds)
- Card Black: #1A1A1A (Spades/Clubs)
- Text Light: #F5F5F5
- Table Felt: #0C2317

## Arc: Discovery Arc with Gameplay Demo
1. Hook - Big win moment (Royal Flush reveal)
2. Intro - Game title & bet selection
3. Gameplay - Deal, Hold, Draw sequence
4. Win reveal - Animation with explanation
5. Payout table showcase
6. Call to action / Play now

## Scene Breakdown

### Scene 1: Hook - The Big Win (~3s)
**Purpose**: Hook viewer immediately with exciting win
**Layout**: FULL_CENTER
**Visual elements**:
- 5 cards flipping to reveal Royal Flush (10-J-Q-K-A all same suit)
- Gold glow effect on winning cards
- "ROYAL FLUSH!" text with gold animation
- "+250 CREDITS!" counter animation
- Casino background with subtle particle effects

**Animation sequence**:
1. Cards deal face down (quick)
2. Cards flip one by one with slight delay
3. Gold glow expands on reveal
4. Text appears with scale animation
5. Credit counter counts up
6. Hold for impact

### Scene 2: Title & Bet Selection (~4s)
**Purpose**: Show game title and bet selection
**Layout**: TOP_BOTTOM split
**Visual elements**:
- "VIDEO POKER" title with gold gradient
- "Jacks or Better" subtitle
- 5 bet buttons (1-5 credits) with selection highlight
- Balance display: "100 CREDITS"

**Animation sequence**:
1. Title fade in with gold shimmer
2. Bet buttons appear with stagger
3. Bet 5 highlights with pulse
4. Balance counter visible

### Scene 3: Deal & Initial Hand (~5s)
**Purpose**: Show dealing animation and initial hand evaluation
**Layout**: FULL_CENTER (cards), bottom UI
**Visual elements**:
- 5 cards dealing from deck (slide animation)
- Cards flip to reveal: e.g., Pair of Jacks + 3 unrelated
- "HOLD?" prompt on pair cards
- Gold highlight on recommended holds

**Animation sequence**:
1. Deal button press
2. Cards slide from deck position
3. Cards flip reveal (staggered)
4. Auto-highlight Jacks (optimal hold)
5. Hold buttons glow

### Scene 4: Hold & Draw (~4s)
**Purpose**: Show hold/draw mechanic
**Layout**: FULL_CENTER
**Visual elements**:
- Held cards stay with gold border
- Discarded cards fade/slide away
- New cards slide in from deck
- New cards flip to reveal

**Animation sequence**:
1. Player clicks hold on pair
2. Gold border locks on held cards
3. Draw button press
4. Unheld cards slide out
5. New cards slide in and flip
6. Brief pause for anticipation

### Scene 5: Win Reveal with Explanation (~8s)
**Purpose**: Show final hand, win type, and explanation
**Layout**: FULL_CENTER with explanation overlay
**Visual elements**:
- Final hand displayed
- Winning cards pulse with green glow
- Hand type: "TWO PAIR!" (or whatever wins)
- Explanation: "Two Pair - Two different pairs!"
- Payout: "2x BET = 10 CREDITS"
- Balance updates: 100 → 110

**Animation sequence**:
1. Winning cards pulse green
2. Hand type text appears with scale
3. Explanation fades in below
4. Payout calculation animates
5. Balance counter rolls up
6. Confetti/particles for win

### Scene 6: Payout Table Quick Show (~5s)
**Purpose**: Show all possible wins
**Layout**: GRID (2 columns)
**Visual elements**:
- Scrolling/animating payout table
- Each row: Hand name | Payout
- Highlight Jacks or Better = 1 credit (any pair pays!)
- "~20% Win Rate" badge

**Animation sequence**:
1. Table slides up
2. Rows highlight sequentially
3. "Any Pair Pays!" callout on Jacks or Better row
4. Win rate badge appears

### Scene 7: Call to Action (~3s)
**Purpose**: Drive engagement
**Layout**: FULL_CENTER
**Visual elements**:
- "PLAY NOW" button pulse
- "Jacks or Better - Any Pair Wins!"
- QR code or "Play at video_poker_game"
- Background subtle casino atmosphere

## Audio Cues (for reference)
- Card flip: soft "thwip" sound
- Card deal: slide "whoosh"
- Hold lock: metallic "click"
- Win: ascending chime + cash register "cha-ching"
- Royal Flush: epic fanfare
- Background: subtle casino ambient

## Technical Notes
- Vertical 9:16 aspect ratio (1080x1920)
- 30 FPS for smooth social media playback
- Fast pacing - total ~32 seconds
- Each scene independently renderable
- Use Manim's vertical config
- Add subtitles/captions for accessibility