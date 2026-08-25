// Resolves an admin-center audience spec into the concrete list of device
// tokens to send to. Shared by scripts/push/campaigns.js and the standalone
// broadcast tool (scripts/push/broadcastAll.js), which used to own the
// chunk()/tokenEntries() helpers now living here.
//
// Token reads go through the fcmTokens collection group rather than a
// per-user subcollection query: one query returns every registered device in
// the app, which is both cheaper and simpler than K queries once an audience
// spans more than a couple of users.
const FCM_BATCH_SIZE = 500;

const SEGMENTS = ['activeLast7d', 'inactive3d', 'hasFriends', 'neverPlayed'];

function chunk(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// Flattens a collection-group snapshot into one entry per token, carrying the
// owning uid (fcmTokens docs live at users/{uid}/fcmTokens/{token}) so FCM
// results can be attributed back to individual users for the delivery log.
function tokenEntries(tokensSnap) {
  return tokensSnap.docs.map((doc) => ({
    token: doc.id,
    uid: doc.ref.parent.parent.id,
    platform: doc.get('platform') || 'unknown',
  }));
}

// Same YYYY-MM-DD shape as dailyReminder.js's todayString(), which is the
// format js/game.js writes into users/{uid}.lastPlayedDate.
function dayKeyDaysAgo(days) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

async function uidsForSegment(db, segment) {
  if (segment === 'activeLast7d') {
    const snap = await db.collection('users').where('lastPlayedDate', '>=', dayKeyDaysAgo(7)).get();
    return new Set(snap.docs.map((doc) => doc.id));
  }
  if (segment === 'inactive3d') {
    const snap = await db.collection('users').where('lastPlayedDate', '<', dayKeyDaysAgo(3)).get();
    return new Set(snap.docs.map((doc) => doc.id));
  }
  if (segment === 'hasFriends') {
    // One collection-group query beats reading every user's friends
    // subcollection: any friend edge at all means its parent user qualifies.
    const snap = await db.collectionGroup('friends').get();
    return new Set(snap.docs.map((doc) => doc.ref.parent.parent.id));
  }
  if (segment === 'neverPlayed') {
    // Firestore cannot query for an absent field, so this is the one segment
    // that has to read the whole users collection and filter in memory.
    const snap = await db.collection('users').get();
    return new Set(snap.docs.filter((doc) => !doc.get('lastPlayedDate')).map((doc) => doc.id));
  }
  throw new Error(`Unknown audience segment: ${segment}`);
}

// audience: { type: 'all'|'platform'|'user'|'segment', platform?, uid?, segment? }
async function resolveAudience(db, audience) {
  const spec = audience || { type: 'all' };

  if (spec.type === 'user') {
    if (!spec.uid) throw new Error('Audience type "user" requires a uid');
    const snap = await db.collection(`users/${spec.uid}/fcmTokens`).get();
    return snap.docs.map((doc) => ({
      token: doc.id,
      uid: spec.uid,
      platform: doc.get('platform') || 'unknown',
    }));
  }

  if (spec.type === 'platform') {
    if (!spec.platform) throw new Error('Audience type "platform" requires a platform');
    const snap = await db.collectionGroup('fcmTokens').where('platform', '==', spec.platform).get();
    return tokenEntries(snap);
  }

  if (spec.type === 'segment') {
    const uids = await uidsForSegment(db, spec.segment);
    if (uids.size === 0) return [];
    const snap = await db.collectionGroup('fcmTokens').get();
    return tokenEntries(snap).filter((entry) => uids.has(entry.uid));
  }

  const snap = await db.collectionGroup('fcmTokens').get();
  return tokenEntries(snap);
}

// Drops entries whose owner has muted `category` in their notification
// settings. One user-doc read per distinct uid, memoised so a player with
// three devices is still only read once.
async function filterByPrefs(db, entries, category) {
  const uids = [...new Set(entries.map((entry) => entry.uid))];
  const snaps = await Promise.all(uids.map((uid) => db.doc(`users/${uid}`).get()));
  const muted = new Set(
    snaps.filter((snap) => ((snap.get('notificationPrefs') || {})[category] === false)).map((snap) => snap.id)
  );
  return entries.filter((entry) => !muted.has(entry.uid));
}

// uid -> display name, for attributing delivery-log rows.
async function displayNamesFor(db, uids) {
  const snaps = await Promise.all(uids.map((uid) => db.doc(`users/${uid}`).get()));
  return snaps.reduce((names, snap) => ({ ...names, [snap.id]: snap.get('displayName') || null }), {});
}

module.exports = {
  resolveAudience,
  filterByPrefs,
  displayNamesFor,
  tokenEntries,
  chunk,
  dayKeyDaysAgo,
  SEGMENTS,
  FCM_BATCH_SIZE,
};
