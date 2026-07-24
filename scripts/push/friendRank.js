// Notifies a user when a friend's net profit overtakes theirs on the
// Friends tab leaderboard (js/friends.js ranks friends + self by all-time
// netProfit). Mirrors checkRoomMemberOvertakes in rooms.js — a poller gets
// no free "before" snapshot, so the previous value is cached on the doc
// itself (_prevFriendNetProfit) — but scoped to users/{uid}/friends instead
// of a room's members subcollection. Reuses the `updatedAt` field that
// pushNetProfit() (js/rooms.js) already stamps on users/{uid} on every
// netProfit change, so this only touches users who actually changed.
const { getFirestore } = require('../lib/firebaseAdmin');
const { sendPushToUser } = require('../lib/sendPush');

async function checkFriendLeaderboardOvertakes(since) {
  const db = getFirestore();
  const snap = await db.collection('users').where('updatedAt', '>', since).get();
  if (snap.empty) return;

  await Promise.all(snap.docs.map(async (doc) => {
    const uid = doc.id;
    const after = doc.data();
    const afterProfit = typeof after.netProfit === 'number' ? after.netProfit : 0;
    const beforeProfit = typeof after._prevFriendNetProfit === 'number' ? after._prevFriendNetProfit : -Infinity;

    if (afterProfit > beforeProfit) {
      const friendsSnap = await db.collection(`users/${uid}/friends`).get();

      if (!friendsSnap.empty) {
        const moverName = after.displayName || 'A friend';
        const friendDocs = await Promise.all(
          friendsSnap.docs.map((f) => db.doc(`users/${f.id}`).get())
        );
        const overtaken = friendDocs.filter((friendDoc) => {
          if (!friendDoc.exists) return false;
          const friendProfit = typeof friendDoc.get('netProfit') === 'number' ? friendDoc.get('netProfit') : 0;
          return friendProfit > beforeProfit && friendProfit <= afterProfit;
        });

        await Promise.all(overtaken.map((friendDoc) =>
          sendPushToUser(friendDoc.id, 'leaderboard', {
            title: 'Friends leaderboard',
            body: `${moverName} just passed you on the friends leaderboard`,
          })
        ));
      }
    }

    await doc.ref.set({ _prevFriendNetProfit: afterProfit }, { merge: true });
  }));
}

module.exports = { checkFriendLeaderboardOvertakes };
