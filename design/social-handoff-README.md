# Handoff: Video Poker — Social Features (Friends, Stories, Rooms, Champions)

> Imported 2026-07-16 from the Claude Design project
> https://claude.ai/design/p/4ed813ef-d10f-4abf-a583-bf76c0fc1f00
> (`design_handoff_social_features/README.md`). Prototype: `social-prototype.dc.html` in this folder.

## Overview
This package covers the social layer added to the Video Poker app's Play screen and Friends screen: a live friends leaderboard, a global hourly champions board, Instagram-style "best hand" stories, a Friends screen with a leaderboard/rooms toggle, an invite-friends modal, and a create-room-and-share flow (WhatsApp/Telegram/copy link).

## About the Design Files
The files in this bundle (`VideoPokerApp.dc.html`, `ios-frame.jsx`) are **design references built in HTML/JS** — interactive prototypes showing intended look, layout, and behavior. They are not production code to copy directly. The task is to **recreate this design in the target codebase's existing environment** (iOS/Android native, React Native, or web — whichever this app already uses) using its established component patterns, navigation, and networking layer. If no environment exists yet, choose the framework best suited to a mobile poker app.

## Fidelity
**High-fidelity.** Colors, spacing, typography, and copy in the HTML should be treated as final reference values. Recreate pixel-close using the codebase's existing design system/tokens where one exists; otherwise port the values listed below.

## Screens / Views

### 1. Play screen (top of screen, above the card table)
- **Stories row** (`.storiesrow`): horizontal-scroll row of circular avatars, 56×56px, gradient ring (`.storyring`, IG-style gradient `linear-gradient(135deg,#d4af37,#b8952e)` in the gold-casino theme) around a `.storyavatar` inner circle. Name label below, 10px, truncated with ellipsis.
  - Data: one "story" per person who has a qualifying hand — the current user's personal-best-payout hand (created client-side the first time they win a hand), plus a fixed set of friends' notable hands.
  - Tap → opens the **Story Viewer** (full-screen overlay within the app frame): top progress bar segments (one per story, filled up to current index), header with small avatar + name + close (✕), left/right invisible tap zones (35% width each) for prev/next, and a centered body showing the hand name (large, gold), the 5 cards (face up, reusing the same card-rendering component as the table), and the payout line "+{payout} credits · {mult}×".
- **Friends Leaderboard panel**: header "Friends Leaderboard" + current user's rank and gap-to-leader text, right-aligned. Body: up to 5 rows — the user's own position plus the friends ranked immediately above them (never below) — each row shows rank number, avatar with a small online/offline status dot (green = online), name, a country code chip (e.g. "IL", "US"), and their net credits (green if positive, red if negative). The user's own row gets a highlighted background.
- **Hourly Champions panel**: same row layout as above but global (all app users, not just friends), header "⏱ Hourly Champions" with a live countdown/reset label ("Resets in 42m") on the right, avatars use the gradient "champ" style. Ranked by points, resets hourly server-side.
- **Play With Friends panel**: preview of up to 2 active/open rooms (name, member count "x/y friends", stake, status pill Open/In Progress, and a Join/Enter Table button) plus a "+ Create a Poker Room with Friends" dashed-border button. "See All ›" link goes to the Friends screen, Rooms tab.

### 2. Friends screen (bottom nav → Friends)
- Header row: "Friends" title + a gold pill button "+ Invite" (top right) that opens the **Invite Friends modal**.
- Segmented control: **Leaderboard** / **Poker Rooms** tabs.
- **Leaderboard tab**: full ranked list of all friends (not capped at 5), same row style as the Play-screen panel (rank, avatar, online dot, name, streak with 🔥 emoji, net credits).
- **Poker Rooms tab**: full list of rooms (same card style as the Play screen preview, one per room) + a "+ Create Room with Friends" dashed button that expands an inline "New Room" form: room-name text input, stake selector (4 chip options, e.g. 5/10/20/50), and Create & Invite / Cancel buttons.

### 3. Invite Friends modal (bottom sheet, opened from the Friends screen "+ Invite" button)
- Bottom sheet sliding up over a dark scrim, rounded top corners (20px).
- Header: "Invite Friends" + ✕ close.
- Shareable invite link row: read-only link text (truncated) + "Copy" button (button label flips to "Copied!" on tap).
- Full-width "Share Invite Link" gradient button (intended to trigger the OS share sheet in production).
- "Suggested Contacts" section: list of contacts each with avatar, name, and a per-row Invite/Sent toggle button (state persists per contact for the session).

### 4. Room-created invite modal (bottom sheet, opened after tapping "Create & Invite" on the New Room form)
- Header: "Room Created 🎉" + ✕ close.
- Subtext: `Invite friends to "{room name}"`.
- Room-specific link row (read-only text + Copy button, same pattern as above).
- Two share chips, full color brand buttons: **WhatsApp** (`#25D366`) and **Telegram** (`#229ED9`) — in the prototype these open `wa.me`/`t.me` share-intent URLs pre-filled with the room name and link; in production, use the platform share SDKs / OS share sheet with the same pre-filled text.
- "Done" ghost button to dismiss.

## Interactions & Behavior
- Tapping a story avatar opens the story viewer at that index; tapping the left/right 35%-width zones inside the viewer moves to the previous/next story; the ✕ or tapping the dark scrim closes it.
- The Friends Leaderboard panel and Hourly Champions panel are read-only previews on Play; tapping the Friends Leaderboard header navigates to the Friends screen.
- Creating a room appends it to the rooms list (status "open", 1/N members) and immediately opens the room-invite share modal — this should call the backend to create the room and generate a real shareable join link/deep-link in production.
- Contact invite buttons are optimistic-UI only in the prototype (local state flip to "Sent"); production should call the actual invite/send endpoint and reflect real delivery state.
- No loading/error states are represented in the prototype — production should add them for: room creation, invite sending, and leaderboard/champions data fetches.

## State Management
Needed state (per user session):
- Current user: balance, bet, hand, phase (idle/dealt), personal best hand (name, mult, payout, cards) — updates whenever a win's payout exceeds the previous best.
- Friends list: id, name, net credits, streak, online status, country code.
- Global champions: server-driven, ranked by points, hourly-resetting window.
- Rooms: id, name, member count/capacity, stake, status (open/in progress).
- UI-only state: which modal is open (invite / room-invite / story viewer), active story index, Friends screen tab (leaderboard/rooms), new-room form fields, invited-contact ids, copy-button labels.

Data needing live/backend wiring in production (mocked client-side in the prototype):
- Friends' online status and country — needs presence + profile data.
- Hourly Champions list and countdown — needs a server-computed hourly leaderboard job.
- Room creation and its shareable join link — needs a real room/invite backend and deep-link scheme.
- Contact suggestions and invite sending — needs contacts/social-graph integration and a notification/SMS/share dispatch.

## Design Tokens (casino theme, as implemented)
- Felt backgrounds: `--felt-900:#0a2b1d`, `--felt-800:#123825`, `--felt-700:#1a452e`, `--felt-600:#2a5a3d`
- Gold accent: `--gold-500:#d4af37`, `--gold-600:#b8952e`, `--gold-100:#f5e6b8`
- Win/lose: `--win:#4caf7d`, `--lose:#e6533f`
- Text: `--ig-text:#f3ede0` (primary), `--ig-sub:#b9c4b6` (secondary)
- Gradient (stories ring, champions avatars, primary CTA): `linear-gradient(135deg,#d4af37,#b8952e)`
- Corner radius: 10–12px for cards/rows/buttons, 14px for larger panels, 20px for modal sheets, 50% for avatars/dots.
- Type: 'Manrope' for headings/brand, system sans-serif (-apple-system, Helvetica Neue) for body/UI text. Sizes: 22px hand-name in story viewer, 20px/17px page/panel titles, 13–15px row text, 10–11px labels/chips.
- Spacing: 14–16px panel padding, 8–10px gaps between rows/chips.

## Assets
No external image assets — avatars are letter-initials on solid/gradient circles, suits rendered as Unicode glyphs (♠♥♦♣), card backs as a CSS repeating-gradient pattern. Country is shown as a 2-letter code chip, not a flag icon (swap for real flag icons/assets in production if desired).

## Files
- `VideoPokerApp.dc.html` — the full interactive prototype (all screens, styles, and logic in one file).
- `ios-frame.jsx` — the iPhone device-bezel wrapper used only for prototype presentation; not part of the app itself.

## NOTE for this repo (added on import)
- The token values above differ slightly from the app's shipped tokens in `styles/tokens.css`
  (felt `#061711/#0c2419/#123222/#1a4029`, gold `#e8b93f`). Per the Fidelity section, **keep the
  app's existing tokens** and map the prototype's `--felt-*`/`--gold-*`/`--ig-*` variables onto them.
- `pokerfriends.app` links are design placeholders — substitute the app's real invite/join mechanism
  (referral code + GitHub Pages URL / deep link).
