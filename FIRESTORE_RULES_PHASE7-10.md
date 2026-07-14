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

## Other requirements

- **Composite indexes** — `gifts (toUid ==, claimed ==)` and
  `duels (opponentUid ==, status ==)` / `duels (challengerUid ==, status ==)`
  are equality-only queries, so no composite index is needed.
  `events (endsAt >, orderBy endsAt)` is single-field — also fine.
  `hall_of_fame (orderBy createdAt desc)` is single-field — fine.
- **Online-players count** (ticker) uses an aggregate `count()` on
  `users where lastActiveDate > now-5m`. The existing `users` read rule must
  allow list queries for signed-in users (it already does if the leaderboards work).
- **Push for anti-churn (Phase 9.5)** — the in-app nudges work now; real
  closed-app push still needs the FCM VAPID key in `js/pwa.js` plus a scheduled
  sender (e.g. Cloud Function cron) that reads `users.lastActiveDate` and
  `daily_rewards.lastClaimDate` and sends to `users.fcmToken`.
