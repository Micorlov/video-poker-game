// Near-identical port of functions/src/lib/sendPush.js (now deleted along
// with the rest of the Cloud Functions backend) — same token-cleanup-on-
// invalid-token logic, just requiring the shared scripts/lib/firebaseAdmin.js
// instead of a bare `require('firebase-admin')` + Cloud-Functions-managed init.
const { getFirestore, getMessaging } = require('./firebaseAdmin');

async function sendPushToUser(uid, category, notification) {
  const db = getFirestore();
  const userSnap = await db.doc(`users/${uid}`).get();
  const prefs = userSnap.get('notificationPrefs') || {};
  if (prefs[category] === false) return;

  const tokensSnap = await db.collection(`users/${uid}/fcmTokens`).get();
  if (tokensSnap.empty) return;

  const tokens = tokensSnap.docs.map((doc) => doc.id);
  const response = await getMessaging().sendEachForMulticast({
    tokens,
    notification,
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
