// Room-invite pushes: js/rooms.js writes one roomInvites doc per invited
// friend; each new doc since the cursor becomes one "you're invited" push to
// its recipient. The in-app onSnapshot banner is the real-time path — this
// push is the re-engagement path for players who don't have the app open.
const { getFirestore } = require('../lib/firebaseAdmin');
const { sendPushToUser } = require('../lib/sendPush');

async function checkRoomInvites(since, settings) {
  const db = getFirestore();
  const snap = await db.collection('roomInvites').where('createdAt', '>', since).get();
  if (snap.empty) return;

  await Promise.all(snap.docs.map(async (doc) => {
    // Skip invites already answered in-app before this poll ran — the live
    // banner beat the push, so a notification would just be stale noise.
    if (doc.get('status') !== 'pending') return;
    const toUid = doc.get('toUid');
    if (!toUid) return;

    const fromName = doc.get('fromName') || 'A friend';
    const roomName = doc.get('roomName') || 'a poker room';
    await sendPushToUser(toUid, 'social', {
      title: 'Poker room invite',
      body: `${fromName} invited you to ${roomName}`,
    }, { settings });
  }));
}

module.exports = { checkRoomInvites };
