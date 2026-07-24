// Ports functions/src/rooms.js's onRoomMemberJoined + onRoomMemberOvertaken
// triggers (Cloud Functions onDocumentUpdated/onDocumentWritten) to a
// polling model. A poller gets no "before" snapshot for free, so the
// previous state is cached directly on the docs themselves
// (_prevMemberUids on the room doc, _prevNetProfit on each member doc),
// written back after every diff — the same cache-on-the-doc pattern
// functions/src/leaderboard.js already used for its topFive field.
const { getFirestore } = require('../lib/firebaseAdmin');
const { sendPushToUser } = require('../lib/sendPush');

async function checkNewRoomJoins(db, since) {
  const snap = await db.collection('rooms').where('updatedAt', '>', since).get();
  if (snap.empty) return;

  await Promise.all(snap.docs.map(async (doc) => {
    const room = doc.data();
    const afterMembers = room.memberUids || [];
    const beforeMembers = room._prevMemberUids || [];
    const newMembers = afterMembers.filter((uid) => !beforeMembers.includes(uid));

    if (newMembers.length > 0) {
      const ownerUid = room.ownerUid;
      const roomName = room.name || 'your room';

      await Promise.all(newMembers.map(async (joinerUid) => {
        if (joinerUid === ownerUid) return;
        const joinerSnap = await db.doc(`users/${joinerUid}`).get();
        const joinerName = joinerSnap.get('displayName') || 'Someone';
        await sendPushToUser(ownerUid, 'social', {
          title: 'Room activity',
          body: `${joinerName} joined ${roomName}`,
        });
      }));
    }

    await doc.ref.set({ _prevMemberUids: afterMembers }, { merge: true });
  }));
}

async function checkRoomMemberOvertakes(db, since) {
  const snap = await db.collectionGroup('members').where('updatedAt', '>', since).get();
  if (snap.empty) return;

  await Promise.all(snap.docs.map(async (doc) => {
    // Doc path is rooms/{roomId}/members/{uid}; collection-group results
    // don't otherwise carry the parent roomId.
    const roomId = doc.ref.parent.parent.id;
    const uid = doc.id;
    const after = doc.data();

    const beforeProfit = typeof after._prevNetProfit === 'number' ? after._prevNetProfit : -Infinity;
    const afterProfit = after.netProfit || 0;

    if (afterProfit > beforeProfit) {
      const moverName = after.displayName || 'A player';
      const membersSnap = await db.collection(`rooms/${roomId}/members`).get();
      const overtaken = membersSnap.docs.filter((memberDoc) => {
        if (memberDoc.id === uid) return false;
        const memberProfit = memberDoc.get('netProfit') || 0;
        return memberProfit > beforeProfit && memberProfit <= afterProfit;
      });

      await Promise.all(overtaken.map((memberDoc) =>
        sendPushToUser(memberDoc.id, 'leaderboard', {
          title: 'Leaderboard update',
          body: `${moverName} just passed you in the room leaderboard`,
        })
      ));
    }

    await doc.ref.set({ _prevNetProfit: afterProfit }, { merge: true });
  }));
}

async function checkRoomActivity(since) {
  const db = getFirestore();
  await Promise.all([
    checkNewRoomJoins(db, since),
    checkRoomMemberOvertakes(db, since),
  ]);
}

module.exports = { checkRoomActivity };
