// Sends one notification to every registered device across all users,
// optionally filtered to a single platform (ios / android / web).
// One-off/manual tool, run via workflow_dispatch on push-poll.yml — not
// part of the regular 5-minute poll pass.
const { getFirestore, getMessaging } = require('../lib/firebaseAdmin');
const { logPush } = require('../lib/pushLog');

const FCM_BATCH_SIZE = 500;

function chunk(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// Flattens the collection-group snapshot into one entry per token, carrying
// the owning uid (fcmTokens docs live at users/{uid}/fcmTokens/{token}) so
// FCM results can be attributed back to individual users for the admin
// delivery log.
function tokenEntries(tokensSnap) {
  return tokensSnap.docs.map((doc) => ({
    token: doc.id,
    uid: doc.ref.parent.parent.id,
    platform: doc.get('platform') || 'unknown',
  }));
}

async function displayNamesFor(db, uids) {
  const snaps = await Promise.all(uids.map((uid) => db.doc(`users/${uid}`).get()));
  return snaps.reduce((names, snap) => ({ ...names, [snap.id]: snap.get('displayName') || null }), {});
}

async function logBroadcast(db, perUser, title, body) {
  const names = await displayNamesFor(db, [...perUser.keys()]);
  await Promise.all(
    [...perUser.entries()].map(([uid, stat]) =>
      logPush({
        uid,
        displayName: names[uid],
        category: 'broadcast',
        title,
        body,
        source: 'broadcast',
        status: stat.successCount > 0 ? 'sent' : 'failed',
        ...stat,
      })
    )
  );
}

async function broadcastAll(title, body, platform) {
  const db = getFirestore();
  let query = db.collectionGroup('fcmTokens');
  if (platform) {
    query = query.where('platform', '==', platform);
  }
  const tokensSnap = await query.get();
  const entries = tokenEntries(tokensSnap);

  if (entries.length === 0) {
    console.log(`No registered device tokens found${platform ? ` for platform "${platform}"` : ''}.`);
    return;
  }

  // uid -> { tokenCount, successCount, failureCount, platforms }
  const perUser = new Map();
  const recordResult = (entry, isSuccess) => {
    const stat = perUser.get(entry.uid) || { tokenCount: 0, successCount: 0, failureCount: 0, platforms: [] };
    perUser.set(entry.uid, {
      tokenCount: stat.tokenCount + 1,
      successCount: stat.successCount + (isSuccess ? 1 : 0),
      failureCount: stat.failureCount + (isSuccess ? 0 : 1),
      platforms: stat.platforms.includes(entry.platform) ? stat.platforms : [...stat.platforms, entry.platform],
    });
  };

  for (const batch of chunk(entries, FCM_BATCH_SIZE)) {
    const response = await getMessaging().sendEachForMulticast({
      tokens: batch.map((entry) => entry.token),
      notification: { title, body },
    });
    response.responses.forEach((result, index) => recordResult(batch[index], result.success));
  }

  await logBroadcast(db, perUser, title, body);

  const stats = [...perUser.values()];
  const successCount = stats.reduce((sum, stat) => sum + stat.successCount, 0);
  const failureCount = stats.reduce((sum, stat) => sum + stat.failureCount, 0);
  console.log(
    `Broadcast complete: ${successCount} sent, ${failureCount} failed, ${entries.length} total tokens across ${perUser.size} users.`
  );
}

const title = process.env.BROADCAST_TITLE;
const body = process.env.BROADCAST_BODY;
const platform = process.env.BROADCAST_PLATFORM || '';

if (!title || !body) {
  console.error('BROADCAST_TITLE and BROADCAST_BODY env vars are required.');
  process.exit(1);
}

broadcastAll(title, body, platform)
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Broadcast failed:', err);
    process.exit(1);
  });
