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
    const viaCode = doc.get('viaCode');

    // Joins made via an invite link create a friend doc on every existing
    // circle member's side, not just the link owner's — only the owner
    // should be notified, so look up who that is and skip everyone else.
    if (viaCode) {
      const ownerSnap = await db.collection('users').where('referralCode', '==', viaCode).limit(1).get();
      const ownerUid = ownerSnap.empty ? null : ownerSnap.docs[0].id;
      if (uid !== ownerUid) return;

      const joinerSnap = await db.doc(`users/${friendUid}`).get();
      const joinerName = joinerSnap.get('displayName') || 'Someone';
      await sendPushToUser(uid, 'social', {
        title: 'New friend',
        body: `${joinerName} joined using your invite link!`,
      });
      return;
    }

    const adderSnap = await db.doc(`users/${friendUid}`).get();
    const adderName = adderSnap.get('displayName') || 'Someone';

    await sendPushToUser(uid, 'social', {
      title: 'New friend',
      body: `${adderName} added you as a friend`,
    });
  }));
}

module.exports = { checkNewFriends };
