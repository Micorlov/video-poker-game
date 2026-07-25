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
    // circle member's side AND a mirror doc on the joiner's own side, so the
    // whole group becomes mutually connected. Everyone who was already in the
    // circle gets told about the new member; the joiner's own mirror docs are
    // skipped, otherwise they'd be told about every member as if each had just
    // joined. joinerUid (stamped by js/friends.js) is what distinguishes the
    // two directions.
    if (viaCode) {
      const joinerUid = doc.get('joinerUid');

      if (joinerUid) {
        if (joinerUid === uid) return; // the joiner's own mirror of the edge
      } else {
        // Legacy edges written before joinerUid existed carry no direction, so
        // fall back to the old behaviour: notify the link owner only.
        const ownerSnap = await db.collection('users').where('referralCode', '==', viaCode).limit(1).get();
        const ownerUid = ownerSnap.empty ? null : ownerSnap.docs[0].id;
        if (uid !== ownerUid) return;
      }

      const joinerSnap = await db.doc(`users/${friendUid}`).get();
      const joinerName = joinerSnap.get('displayName') || 'Someone';
      await sendPushToUser(uid, 'social', {
        title: 'New friend',
        body: `${joinerName} joined your friends circle via the invite link!`,
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
