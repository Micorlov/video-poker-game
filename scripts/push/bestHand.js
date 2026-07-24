// Ports functions/src/bestHand.js's onBestHandUpdated trigger (Cloud
// Functions onDocumentUpdated) to a polling model. js/stories.js now stamps
// a top-level bestHandAt alongside the nested bestHand map (map fields can't
// be range-queried), so we query users changed since the cursor directly
// instead of relying on a before/after diff. Because checkAndUpdateBestHand()
// client-side only ever calls this write when the new hand beats the
// player's previous best, every doc returned here already represents a
// genuine new record — no additional before/after equality check needed.
//
// Note: the original Cloud Function interpolated the whole `bestHand` object
// into the push body (`${afterHand}`), which would have rendered as
// "[object Object]" — this port uses bestHand.handName instead so the
// notification text is actually meaningful.
const { getFirestore } = require('../lib/firebaseAdmin');
const { sendPushToUser } = require('../lib/sendPush');

async function checkBestHand(since) {
  const db = getFirestore();
  const snap = await db.collection('users').where('bestHandAt', '>', since).get();
  if (snap.empty) return;

  await Promise.all(snap.docs.map(async (doc) => {
    const uid = doc.id;
    const after = doc.data();
    const bestHand = after.bestHand;
    if (!bestHand || !bestHand.handName) return;

    const playerName = after.displayName || 'A friend';
    const friendsSnap = await db.collection(`users/${uid}/friends`).get();

    await Promise.all(friendsSnap.docs.map((friendDoc) =>
      sendPushToUser(friendDoc.id, 'bestHand', {
        title: 'New personal best',
        body: `${playerName} just landed a ${bestHand.handName}!`,
      })
    ));
  }));
}

module.exports = { checkBestHand };
