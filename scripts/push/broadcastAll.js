// Sends one notification to every registered device across all users.
// One-off/manual tool, run via workflow_dispatch on push-poll.yml — not
// part of the regular 5-minute poll pass.
const { getFirestore, getMessaging } = require('../lib/firebaseAdmin');

const FCM_BATCH_SIZE = 500;

function chunk(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

async function broadcastAll(title, body) {
  const db = getFirestore();
  const tokensSnap = await db.collectionGroup('fcmTokens').get();
  const tokens = tokensSnap.docs.map((doc) => doc.id);

  if (tokens.length === 0) {
    console.log('No registered device tokens found.');
    return;
  }

  let successCount = 0;
  let failureCount = 0;

  for (const batch of chunk(tokens, FCM_BATCH_SIZE)) {
    const response = await getMessaging().sendEachForMulticast({
      tokens: batch,
      notification: { title, body },
    });
    successCount += response.successCount;
    failureCount += response.failureCount;
  }

  console.log(`Broadcast complete: ${successCount} sent, ${failureCount} failed, ${tokens.length} total tokens.`);
}

const title = process.env.BROADCAST_TITLE;
const body = process.env.BROADCAST_BODY;

if (!title || !body) {
  console.error('BROADCAST_TITLE and BROADCAST_BODY env vars are required.');
  process.exit(1);
}

broadcastAll(title, body)
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Broadcast failed:', err);
    process.exit(1);
  });
