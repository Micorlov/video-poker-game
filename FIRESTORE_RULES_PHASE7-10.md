# Firestore security rules needed for Phases 7–10

The Phase 7–10 features added these collections. Before deploying to production,
add matching rules in Firebase Console → Firestore → Rules (merge into the existing ruleset).

```
// Friends (Phase 8.1) — each user manages only their own list
match /users/{uid}/friends/{friendUid} {
  allow read, write: if request.auth != null && request.auth.uid == uid;
}

// Gifts (Phase 8.3)
match /gifts/{giftId} {
  allow create: if request.auth != null
                && request.resource.data.fromUid == request.auth.uid
                && request.resource.data.amount in [25, 50, 100];
  allow read:   if request.auth != null
                && (resource.data.toUid == request.auth.uid
                    || resource.data.fromUid == request.auth.uid);
  // recipient may only flip claimed -> true
  allow update: if request.auth != null
                && resource.data.toUid == request.auth.uid
                && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['claimed']);
}

// Duels (Phase 8.2)
match /duels/{duelId} {
  allow create: if request.auth != null
                && request.resource.data.challengerUid == request.auth.uid;
  allow read, update: if request.auth != null
                && (resource.data.challengerUid == request.auth.uid
                    || resource.data.opponentUid == request.auth.uid);
}

// Limited-time events (Phase 9.4) — read-only for players, writes from admin.html only
match /events/{eventId} {
  allow read: if request.auth != null;
  allow write: if request.auth != null
               && request.auth.uid == '<ADMIN_UID>'; // replace with your admin UID
}

// Global aggregate counters for the social-proof ticker (Phase 8.4)
match /global_stats/{dayKey} {
  allow read, write: if request.auth != null;
}

// Hall of Fame (Phase 8.5) — deterministic doc ids, first client writes, never edited
match /hall_of_fame/{recordId} {
  allow read: if request.auth != null;
  allow create: if request.auth != null;
  allow update, delete: if false;
}
```

## Phase 2 (Social Layer) additions — July 2026

```
// Users: new fields — owner can write, friends can read
// Merge into the existing users/{uid} rule:
//   allow read: if request.auth != null;
//   allow write: if request.auth != null && request.auth.uid == uid;
// bestHand, country, lastSeen are set by the owner's client.

// Hourly Champions (serverless — clients write points)
match /hourly/{hourKey} {
  allow read: if request.auth != null;
  match /entries/{uid} {
    allow read: if request.auth != null;
    allow create, update: if request.auth != null
      && request.auth.uid == uid
      && request.resource.data.points >= 0;
    allow delete: if false;
  }
}

// Rooms: member writes for bestStreak field (Phase 2 addition)
// Merge into existing rooms/{roomId}/members/{memberUid} rules:
//   allow write: if request.auth != null
//     && request.auth.uid == memberUid
//     && request.resource.data.keys().hasOnly(['displayName', 'netProfit', 'bestStreak']);
```

## Play tab Leaderboard redesign — July 2026

```
// Users: two new daily-reset fields — same owner-writes rule as netProfit/bestStreak above.
//   dailyNetProfit (number), dailyDateKey (string, e.g. "2026-07-24") — no rule change needed,
//   they're covered by the existing users/{uid} write rule.

// Global Daily leaderboard — flat collection, doc id "{dayKey}_{uid}", matches the schema
// admin.html already reads/resets/deletes from (Overview + Competition tabs, Daily sub-tab).
match /daily_scores/{docId} {
  allow read: if request.auth != null;
  allow create, update: if request.auth != null
    && request.resource.data.uid == request.auth.uid;
  // admin.html's Reset/Delete buttons run as the admin's own signed-in session
  allow update, delete: if request.auth != null
    && request.auth.token.email == 'micorlov@gmail.com';
}
```

## Other requirements

- **Composite indexes** — `gifts (toUid ==, claimed ==)` and
  `duels (opponentUid ==, status ==)` / `duels (challengerUid ==, status ==)`
  are equality-only queries, so no composite index is needed.
  `events (endsAt >, orderBy endsAt)` is single-field — also fine.
  `hall_of_fame (orderBy createdAt desc)` is single-field — fine.
- **Online-players count** (ticker) uses an aggregate `count()` on
  `users where lastActiveDate > now-5m`. The existing `users` read rule must
  allow list queries for signed-in users (it already does if the leaderboards work).
- **`daily_scores (dayKey ==, orderBy score desc)`** needs a composite index —
  Firestore will reject the query until one exists. Firebase surfaces a direct
  "create index" link in the console the first time this query runs; alternatively
  create it manually under Firestore → Indexes: collection `daily_scores`,
  fields `dayKey` (Ascending) + `score` (Descending).
- **Push for anti-churn (Phase 9.5)** — the in-app nudges work now; real
  closed-app push still needs the FCM VAPID key in `js/pwa.js` plus a scheduled
  sender (e.g. Cloud Function cron) that reads `users.lastActiveDate` and
  `daily_rewards.lastClaimDate` and sends to `users.fcmToken`.
