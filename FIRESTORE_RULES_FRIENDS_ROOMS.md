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

  // Friends — mutual relationship, each side writes its own doc.
  match /friends/{friendUid} {
    allow read, write: if request.auth != null && request.auth.uid == uid;
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
```

## Other requirements

- **Composite index**: `rooms` queried with `where('memberUids', 'array-contains', uid)` is a
  single-field array-contains query — no composite index needed. The join-by-code query
  (`where('code', '==', code).limit(1)`) is also single-field — no index needed either.
