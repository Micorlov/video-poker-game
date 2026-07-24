# Firestore security rules needed for Friends / Rooms

These are new for the Phase 2 redesign (optional Google sign-in, friends list,
simple net-profit rooms). Add to Firebase Console → Firestore → Rules
(merge into the existing ruleset — this replaces the old Phase 7-10 rules,
which covered features that were removed).

```
// Users — each player manages only their own profile document.
// referralCode must be readable by anyone signed in, so friend-add-by-code lookups work.
match /users/{uid} {
  allow read: if request.auth != null;
  allow write: if request.auth != null && request.auth.uid == uid;

  // Friends — mutual relationship. A player manages their own list, and may
  // also add themselves into someone else's list — that's what a mutual
  // add-by-code/link does: the joiner writes both users/{me}/friends/{them}
  // and users/{them}/friends/{me} from a single client in one batch.
  match /friends/{friendUid} {
    allow read: if request.auth != null;
    allow write: if request.auth != null
                 && (request.auth.uid == uid || request.auth.uid == friendUid);
  }
}

// Rooms — read is open to any signed-in user (needed so join-by-code can look up
// a room the player isn't a member of yet; contents are just name/stake/leaderboard,
// not sensitive). Writes are restricted: only the creator can create, and joining
// may only append the joiner's own uid to memberUids.
match /rooms/{roomId} {
  allow read: if request.auth != null;
  allow create: if request.auth != null
                && request.resource.data.ownerUid == request.auth.uid
                && request.resource.data.memberUids == [request.auth.uid];
  allow update: if request.auth != null
                && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['memberUids'])
                && request.resource.data.memberUids == resource.data.memberUids.concat([request.auth.uid]);

  // Members subcollection — each player writes only their own leaderboard entry.
  match /members/{uid} {
    allow read: if request.auth != null;
    allow write: if request.auth != null && request.auth.uid == uid;
  }
}

// Referral link groups (July 2026) — everyone who has ever joined via a given
// referral code, so a fresh joiner can be mutually friended with the whole
// group, not just the code's original owner. Doc id is the referral code
// itself. Read is open to any signed-in user (needed to resolve an incoming
// ?ref=CODE link). Only the code's owner may create the group; joining may
// only append the joiner's own uid to memberUids (same append-only pattern
// as rooms above).
match /referralGroups/{code} {
  allow read: if request.auth != null;
  allow create: if request.auth != null
                && request.resource.data.ownerUid == request.auth.uid
                && request.resource.data.memberUids == [request.auth.uid];
  allow update: if request.auth != null
                && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['memberUids'])
                && request.resource.data.memberUids == resource.data.memberUids.concat([request.auth.uid]);
}
```

## Feature flags (admin panel) — July 2026

```
// config/features — remote feature toggles read by every client on load
// (including signed-out players, so read must stay public). Only the admin
// account may write, matching admin.html's client-side gate.
match /config/{docId} {
  allow read: if true;
  allow write: if request.auth != null
               && request.auth.token.email == 'micorlov@gmail.com';
}
```

## Push notifications — July 2026

```
// users/{uid}/fcmTokens — one doc per registered device token, owner-only.
// notificationPrefs and lastPlayedDate are just fields on the existing
// users/{uid} doc, already covered by the rule above (owner write).
// lastDailyReminderSent is written only by the Cloud Functions Admin SDK,
// which bypasses these rules entirely, so it needs no client-facing rule.
match /users/{uid} {
  match /fcmTokens/{token} {
    allow read, write: if request.auth != null && request.auth.uid == uid;
  }
}
```

## Bracelets — July 2026

```
// hourly/{hourKey}/entries/{uid} — existing collection (js/champions.js owns the
// points field); bracelets adds maxWin/maxWinHandType to the same doc. Read is
// open to any signed-in user (leaderboard display), write is owner-only.
match /hourly/{hourKey} {
  allow read: if request.auth != null;
  match /entries/{uid} {
    allow read: if request.auth != null;
    allow write: if request.auth != null && request.auth.uid == uid;
  }
}

// dailyMaxWin/{dayKey}/entries/{uid} — new collection, same shape/rule as hourly
// above. Deliberately distinct from the existing daily_scores collection
// (js/leaderboards.js), which is local-time-keyed and tracks a different,
// cumulative score metric.
match /dailyMaxWin/{dayKey} {
  allow read: if request.auth != null;
  match /entries/{uid} {
    allow read: if request.auth != null;
    allow write: if request.auth != null && request.auth.uid == uid;
  }
}

// bracelets/{docId} — permanent award records, one per awarded hour/day
// (docId = "hourly_" + hourKey or "daily_" + dayKey). Written only by the
// Admin SDK (scripts/bracelets/award.js, run by the GitHub Actions poller —
// see the push-polling section below), which bypasses these rules entirely —
// clients only ever read.
match /bracelets/{docId} {
  allow read: if request.auth != null;
  allow write: if false;
}
```

## Collection-group indexes for push polling — July 2026

The push-notification poller (`scripts/push/`, run by GitHub Actions instead of
Cloud Functions — see no `functions/` directory in this repo) queries two
subcollections across all their parent documents at once, which requires an
explicit **collection-group** index — same-collection single-field indexes
are automatic, but collection-group scope is not. Create both of these in
Firebase Console → Firestore Database → Indexes → **Collection Group** tab.
No Blaze plan needed — collection-group indexes are free on the Spark plan.

1. Collection group: `friends` — Field: `addedAt` — Order: Ascending
   (powers `scripts/push/friends.js`'s
   `collectionGroup('friends').where('addedAt', '>', since)`)
2. Collection group: `members` — Field: `updatedAt` — Order: Ascending
   (powers `scripts/push/rooms.js`'s
   `collectionGroup('members').where('updatedAt', '>', since)`)

## Other requirements

- **Composite index**: `rooms` queried with `where('memberUids', 'array-contains', uid)` is a
  single-field array-contains query — no composite index needed. The join-by-code query
  (`where('code', '==', code).limit(1)`) is also single-field — no index needed either.
- micorlov@gmail.com is the sole admin account (full read/write across `events`,
  `config`, and score-management actions in admin.html) — use the email-based
  check above (`request.auth.token.email`) rather than a UID placeholder, since
  Firebase Auth tokens carry email directly and it's easier to keep in sync.
