// Ports functions/src/friends.js's onFriendAdded trigger (Cloud Functions
// onDocumentCreated) to a polling model. js/friends.js now stamps addedAt on
// both sides of a friend-add, so instead of an automatic "before/after"
// event we run a collection-group query for docs newer than the cursor.
const { getFirestore } = require('../lib/firebaseAdmin');
const { sendPushToUser } = require('../lib/sendPush');

async function checkNewFriends(since) {
  const db = getFirestore();
  const snap = await db.collectionGroup('friends').where('addedAt', '>', since).get();
  if (snap.empty) return;

  await Promise.all(snap.docs.map(async (doc) => {
    // Doc path is users/{uid}/friends/{friendUid}.
    const uid = doc.ref.parent.parent.id;
    const friendUid = doc.id;

    const adderSnap = await db.doc(`users/${friendUid}`).get();
    const adderName = adderSnap.get('displayName') || 'Someone';

    await sendPushToUser(uid, 'social', {
      title: 'New friend',
      body: `${adderName} added you as a friend`,
    });
  }));
}

module.exports = { checkNewFriends };
