// Near-identical port of functions/src/lib/sendPush.js (now deleted along
// with the rest of the Cloud Functions backend) — same token-cleanup-on-
// invalid-token logic, just requiring the shared scripts/lib/firebaseAdmin.js
// instead of a bare `require('firebase-admin')` + Cloud-Functions-managed init.
const { getFirestore, getMessaging } = require('./firebaseAdmin');
const { logPush } = require('./pushLog');

async function sendPushToUser(uid, category, notification) {
  const db = getFirestore();
  const userSnap = await db.doc(`users/${uid}`).get();
  const displayName = userSnap.get('displayName') || null;
  const prefs = userSnap.get('notificationPrefs') || {};

  // Skipped sends are logged too — the admin panel needs to explain why a
  // user is missing from a delivery, not just omit them silently.
  const base = {
    uid,
    displayName,
    category,
    title: notification.title,
    body: notification.body,
    source: 'poll',
  };

  if (prefs[category] === false) {
    await logPush({ ...base, status: 'skipped', error: 'Category muted in notificationPrefs' });
    return;
  }

  const tokensSnap = await db.collection(`users/${uid}/fcmTokens`).get();
  if (tokensSnap.empty) {
    await logPush({ ...base, status: 'skipped', error: 'No registered device tokens' });
    return;
  }

  const tokens = tokensSnap.docs.map((doc) => doc.id);
  const platforms = tokensSnap.docs.map((doc) => doc.get('platform') || 'unknown');
  const response = await getMessaging().sendEachForMulticast({
    tokens,
    notification,
  });

  await logPush({
    ...base,
    status: response.successCount > 0 ? 'sent' : 'failed',
    tokenCount: tokens.length,
    successCount: response.successCount,
    failureCount: response.failureCount,
    platforms,
  });

  const staleTokens = [];
  response.responses.forEach((result, index) => {
    if (!result.success && result.error.code === 'messaging/registration-token-not-registered') {
      staleTokens.push(tokens[index]);
    }
  });

  await Promise.all(
    staleTokens.map((token) => db.doc(`users/${uid}/fcmTokens/${token}`).delete())
  );
}

module.exports = { sendPushToUser };
