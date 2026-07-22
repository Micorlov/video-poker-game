# Video Poker — Redesign Plan & Status

Working log of the 2026-07-15 redesign sessions (Claude Code). Reflects what shipped, how the
pipeline works, and what's still open.

## What the app is now

A Capacitor-wrapped video poker game (iOS/Android/web) with a dark felt-green/gold "casino-noir"
design taken from the Claude Design mockup export (`Video Poker App.dc.html` — colors, Manrope
font, and layout are copied from that file, not approximated from screenshots).

Four tabs: **Play / Stats / Friends / Settings**.

- **Play** — balance + total-bet panel with bet chips (5/10/20/50), 5-card hand with flip
  animation, Deal/Draw/hint buttons, win-streak bar, tournament pill (static placeholder),
  "VS FRIENDS" rank card + "Play With Friends" room list (live Firestore data when signed in),
  result card, collapsible payout table.
- **Stats** — Today / All-Time toggle; Net, Won, Lost, Hands Played, Best Streak.
- **Friends** — your referral code, add-friend-by-code, Leaderboard / Poker Rooms sub-tabs.
  Leaderboard ranks you + friends by net profit (`balance − 500`) with 🔥 best-streak.
- **Settings** — sound, haptics, default bet, game variant (Jacks or Better / Deuces Wild /
  Bonus Poker / Double Bonus, level-gated), hands per deal (1×/3×/5×, level 10), payout table,
  account (Google sign-in / sign-out), reset statistics.

### Architecture decisions made along the way

1. **Full replace, then partial re-add.** First pass stripped the old app (login gate, rooms,
   chat, tournaments, competitions, gamble/spin/mystery-box, duels, season pass, achievements,
   i18n, admin panel) down to a local-only 3-tab game. Second pass re-added a *much smaller*
   Firebase layer when the design mockup grew Friends/Rooms UI.
2. **Sign-in is optional/lazy** — app opens straight to Play and works fully offline; Google
   sign-in is only prompted from Friends/room actions. No full-screen login gate.
3. **Boost/mercy engagement logic kept** (`js/game.js`) — intentional, documented in project
   memory; do not "fix" it.
4. **Local progression** — level derives from lifetime hands played (`js/progress.js`,
   localStorage), drives the same variant/multi-hand unlock thresholds the old Firebase XP
   system used (jacks 1 / deuces 3 / bonus 8 / doubleBonus 15 / multi-hand 10).
5. **Friends score = net profit = `balance − 500`**, pushed to Firestore after every draw
   (`pushNetProfit()` in `js/rooms.js`), denormalized into room member docs.

## Source layout & build pipeline

**Never hand-edit `www/video_poker.html` or `video_poker.html` — they're generated.**

- Source of truth: `index.html` + `js/*.js` + `styles/*.css`
- `node build.js` (or `npm run build`) inlines CSS/JS into `video_poker.html` and copies
  everything into `www/` (Capacitor webDir)
- JS concat order (build.js): audio → ui → progress → firebase → friends → rooms → game →
  hints → tabs → pwa
- CSS: tokens → layout → cards → animations

### iOS deploy (physical iPhone 15 Pro Max)

```sh
node build.js
npx cap sync ios
cd ios/App
xcodebuild -project App.xcodeproj -scheme App -configuration Debug \
  -destination 'id=001F6FE4-6A74-5A55-B2AC-F370BD8A3351' \
  -allowProvisioningUpdates -clonedSourcePackagesDirPath /tmp/spm-clean build
APP=~/Library/Developer/Xcode/DerivedData/App-*/Build/Products/Debug-iphoneos/App.app
xcrun devicectl device install app --device 001F6FE4-6A74-5A55-B2AC-F370BD8A3351 "$APP"
xcrun devicectl device process launch --device 001F6FE4-6A74-5A55-B2AC-F370BD8A3351 com.micorlov.videopoker
```

Notes:
- Signing is automatic (team `MC9464K5FU`); no manual provisioning needed.
- `-clonedSourcePackagesDirPath /tmp/spm-clean` works around recurring SPM artifact-cache
  corruption in the default DerivedData location (grpc/facebook zips "file not found").
- Launch fails with "Locked" if the phone screen is locked — install still succeeds; open by hand.
- The device must show `connected` in `xcrun devicectl list devices`.

## Firebase (project `video-poker-6d665`)

- `js/firebase.js` — init, `firebaseSafe()` wrapper, sign-in/sign-out, auth-state listener,
  user doc + referral code creation.
- **Native Google Sign-In**: Firebase JS `signInWithPopup/Redirect` does NOT work inside the
  Capacitor WebView (`auth/operation-not-supported-in-this-environment`). Fixed with
  `@capacitor-firebase/authentication`: native sign-in → ID token → `auth.signInWithCredential`,
  so the JS SDK session (and Firestore rules) work as before. Requires in
  `capacitor.config.json`: `plugins.FirebaseAuthentication.providers: ["google.com"]`
  (the "provider is not enabled" error means the installed app was built without this config —
  re-run `npx cap sync ios` + rebuild).
- Firestore schema (minimal): `users/{uid}` (displayName, photoURL, referralCode, netProfit,
  bestStreak), `users/{uid}/friends/{friendUid}` (existence = friendship, mutual),
  `rooms/{roomId}` (name, stake, code, ownerUid, memberUids[]),
  `rooms/{roomId}/members/{uid}` (denormalized displayName/netProfit/bestStreak).

## Open items / TODO

1. **⚠️ Firestore security rules not deployed.** The rules in
   `FIRESTORE_RULES_FRIENDS_ROOMS.md` must be pasted into Firebase Console → Firestore → Rules
   by the owner. Until then, adding friends / creating rooms will fail with permission errors
   even after successful sign-in.
2. **Install pending on device**: the build containing the `FirebaseAuthentication.providers`
   fix succeeded but the iPhone disconnected before install. Reconnect the phone and run the
   install/launch commands above.
3. **End-to-end sign-in test on device** (real Google account) — can't be automated from the Mac.
4. Real tournament data for the header pill (currently a static `⏱ #1 · 26:55` placeholder from
   the design; wire to something or remove).
5. Room "Join Table" vs "Enter Table" states — currently every room in your list shows
   "Enter Table"; the design distinguishes open (join) vs in-progress rooms.
6. Consider removing the unused `@capacitor-community/apple-sign-in` dependency, or wiring
   Apple Sign-In as a second provider (App Store requires it if Google sign-in ships).
7. Old exploration docs (`FIRESTORE_RULES_PHASE7-10.md`, phase memory files) are superseded —
   the current app has none of those features.

## Design reference

The authoritative design export lives in the Downloads zip
(`עיצוב מקצועי ומובנה.zip` → `Video Poker App.dc.html`). Key tokens (also in
`styles/tokens.css`): felt `#061711/#0c2419/#123222/#1a4029`, gold `#e8b93f`,
win-green `#4caf7d`, lose-red `#e6533f`, font Manrope 500–900. If the user shares an updated
design link/zip again, prefer the `.dc.html` source over screenshots.
