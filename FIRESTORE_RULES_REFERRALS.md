# Firestore security rules — referral rewards

New for the invite-link rewards (`js/referral.js`). Merge into the existing
ruleset alongside `FIRESTORE_RULES_FRIENDS_ROOMS.md`.

```
// Referral ledger — one row per referred player, id = that player's uid.
//
// Keying the document by the REFERRED uid (rather than counting on the
// inviter's profile) is what makes the payout idempotent: a second invite
// link, a reinstall, or a replayed Play install referrer all resolve to the
// same document id, and the create below rejects it as already present.
match /referrals/{referredUid} {
  // Only the two people involved can see the row.
  allow read: if request.auth != null
              && (request.auth.uid == referredUid
                  || request.auth.uid == resource.data.inviterUid);

  // Only the referred player files their own row, and only for someone else.
  // rewardCoins is pinned here so a tampered client can't mint a larger payout,
  // and claimedAt must start null so the inviter's claim below is the only way
  // it can ever be set.
  allow create: if request.auth != null
                && request.auth.uid == referredUid
                && request.resource.data.referredUid == referredUid
                && request.resource.data.inviterUid != referredUid
                && request.resource.data.rewardCoins == 2000
                // Two-sided reward (v2.1): the invitee's welcome coins are
                // pinned like rewardCoins. Optional during the rollout so
                // pre-2.1 clients (which don't send the field) keep working;
                // tighten to a required equality once the fleet has updated.
                && (!('inviteeCoins' in request.resource.data)
                    || request.resource.data.inviteeCoins == 1000)
                && request.resource.data.claimedAt == null;

  // The inviter claims the reward exactly once. The resource.data.claimedAt ==
  // null clause is the whole anti-double-credit mechanism: js/referral.js
  // credits coins only after this write is accepted, so a second device
  // replaying the same reward is rejected here and credits nothing.
  allow update: if request.auth != null
                && request.auth.uid == resource.data.inviterUid
                && resource.data.claimedAt == null
                && request.resource.data.diff(resource.data).affectedKeys()
                     .hasOnly(['claimedAt']);

  allow delete: if false;
}
```

## Why the reward is client-credited

Coin balances in this app live in `localStorage` (`vp_game_state`) — the server
never held them, and the leaderboards only carry a derived net-profit figure.
The referral reward follows the same trust model, so the rules above bound what
a tampered client can do to *other* players' data (mint rows for someone else,
inflate `rewardCoins`, or claim twice) rather than pretending the local balance
is authoritative.

Bonus coins are excluded from the leaderboard figure by
`netProfitBaseline()` in `js/referral.js`, which raises the net-profit baseline
by every coin awarded. Without that, inviting friends would look identical to
winning hands on the friends and rooms boards.

## No composite index needed

`js/referral.js` subscribes with a single equality filter
(`where('inviterUid', '==', uid)`) and splits claimed from unclaimed rows in
memory, so the automatic single-field index covers it.

## Testing these rules

`scripts/referrals/rules.test.js` exercises every clause above — including the
double-claim guard, which is the only thing preventing a reward from being paid
twice. It skips itself when no emulator is listening, so `npm test` stays green
without one.

To actually run it, serve the block above from a Firestore emulator, then run
the suite against it:

```bash
mkdir -p /tmp/vp-rules && cd /tmp/vp-rules && python3 -c "import re,pathlib;d=pathlib.Path('$OLDPWD/FIRESTORE_RULES_REFERRALS.md').read_text();b=re.search(r'\`\`\`\n(.*?)\n\`\`\`',d,re.S).group(1);pathlib.Path('firestore.rules').write_text(\"rules_version = '2';\nservice cloud.firestore {\n  match /databases/{database}/documents {\n\"+b+\"\n  }\n}\n\")" && printf '{"emulators":{"firestore":{"port":8181},"ui":{"enabled":false}},"firestore":{"rules":"firestore.rules"}}' > firebase.json && npx firebase emulators:start --only firestore --project video-poker-6d665
```

The rules file is generated from this document, so the test always covers the
text that gets pasted into the console rather than a drifted copy. The emulator
needs JDK 21 on `PATH` (`export PATH="/opt/homebrew/opt/openjdk@21/bin:$PATH"`).
