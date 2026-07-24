// Processes test push notifications queued by the admin panel.
// Runs at the start of every poll pass, before the cursor-based checks.
// Writes status='sent'/'error' back to the Firestore doc so the admin UI
// can show delivery confirmation without waiting for another refresh.
const { getFirestore, getMessaging } = require('../lib/firebaseAdmin');

async function processTestQueue() {
  const db = getFirestore();
  const snap = await db.collection('pushTestQueue').where('status', '==', 'pending').get();
  if (snap.empty) return;

  await Promise.all(
    snap.docs.map(async (doc) => {
      const { uid, title, body } = doc.data();
      try {
        const tokensSnap = await db.collection(`users/${uid}/fcmTokens`).get();
        if (tokensSnap.empty) {
          await doc.ref.update({ status: 'error', error: 'No registered device tokens for this user' });
          return;
        }
        const tokens = tokensSnap.docs.map((d) => d.id);
        await getMessaging().sendEachForMulticast({ tokens, notification: { title, body } });
        await doc.ref.update({ status: 'sent', sentAt: new Date() });
      } catch (err) {
        await doc.ref.update({ status: 'error', error: err.message });
      }
    })
  );
}

module.exports = { processTestQueue };
