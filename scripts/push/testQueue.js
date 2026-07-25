// Processes test push notifications queued by the admin panel.
// Runs at the start of every poll pass, before the cursor-based checks.
// Writes status='sent'/'error' back to the Firestore doc so the admin UI
// can show delivery confirmation without waiting for another refresh.
const { getFirestore, getMessaging } = require('../lib/firebaseAdmin');
const { logPush } = require('../lib/pushLog');

async function processTestQueue() {
  const db = getFirestore();
  const snap = await db.collection('pushTestQueue').where('status', '==', 'pending').get();
  if (snap.empty) return;

  await Promise.all(
    snap.docs.map(async (doc) => {
      const { uid, title, body } = doc.data();
      const userSnap = await db.doc(`users/${uid}`).get();
      const base = {
        uid,
        displayName: userSnap.get('displayName') || null,
        category: 'test',
        title,
        body,
        source: 'testQueue',
      };
      try {
        const tokensSnap = await db.collection(`users/${uid}/fcmTokens`).get();
        if (tokensSnap.empty) {
          await doc.ref.update({ status: 'error', error: 'No registered device tokens for this user' });
          await logPush({ ...base, status: 'skipped', error: 'No registered device tokens' });
          return;
        }
        const tokens = tokensSnap.docs.map((d) => d.id);
        const response = await getMessaging().sendEachForMulticast({ tokens, notification: { title, body } });
        await doc.ref.update({ status: 'sent', sentAt: new Date() });
        await logPush({
          ...base,
          status: response.successCount > 0 ? 'sent' : 'failed',
          tokenCount: tokens.length,
          successCount: response.successCount,
          failureCount: response.failureCount,
          platforms: tokensSnap.docs.map((d) => d.get('platform') || 'unknown'),
        });
      } catch (err) {
        await doc.ref.update({ status: 'error', error: err.message });
        await logPush({ ...base, status: 'failed', error: err.message });
      }
    })
  );
}

module.exports = { processTestQueue };
