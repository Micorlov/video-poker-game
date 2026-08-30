// Sends one notification to every registered device across all users,
// optionally filtered to a single platform (ios / android / web).
// One-off/manual tool, run via workflow_dispatch on broadcast-test.yml — not
// part of the regular 5-minute poll pass.
//
// Audience resolution and the batched fan-out now live in scripts/lib so the
// admin center's campaign runner shares them; this file is just the CLI shell.
const { getFirestore } = require('../lib/firebaseAdmin');
const { resolveAudience, tokenEntries, displayNamesFor } = require('../lib/audience');
const { sendToEntries, totalsOf } = require('../lib/multicast');
const { logPush } = require('../lib/pushLog');

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

// A platform filter that matches nothing is nearly always a typo or a wrong
// assumption about what is registered, so say what actually exists.
async function reportEmptyAudience(db, platform) {
  console.log(`No registered device tokens found${platform ? ` for platform "${platform}"` : ''}.`);
  if (!platform) return;
  const allSnap = await db.collectionGroup('fcmTokens').get();
  const counts = tokenEntries(allSnap).reduce((acc, entry) => {
    acc[entry.platform] = (acc[entry.platform] || 0) + 1;
    return acc;
  }, {});
  console.log('Actual platform breakdown of all registered tokens:', JSON.stringify(counts));
}

async function broadcastAll(title, body, platform) {
  const db = getFirestore();
  const entries = await resolveAudience(db, platform ? { type: 'platform', platform } : { type: 'all' });

  if (entries.length === 0) {
    await reportEmptyAudience(db, platform);
    return;
  }

  const perUser = await sendToEntries(entries, { title, body });
  await logBroadcast(db, perUser, title, body);

  const totals = totalsOf(perUser);
  console.log(
    `Broadcast complete: ${totals.sent} sent, ${totals.failed} failed, ${entries.length} total tokens across ${totals.users} users.`
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
