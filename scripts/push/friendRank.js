// Push notifications for rank changes on the Friends tab leaderboard, which
// js/friends.js builds by ranking a player's friends plus themselves by
// all-time netProfit. Two distinct events live here because they share the
// same input — the set of users whose netProfit changed since the last poll:
//
//   1. Overtakes  — "Alice just passed you on the friends leaderboard"
//   2. New leader — "Alice is now #1 among your friends"
//
// Mirrors checkRoomMemberOvertakes in rooms.js: a poller gets no free "before"
// snapshot, so previous state is cached on the user doc itself
// (_prevFriendNetProfit, _prevFriendLeaderUid). Reuses the `updatedAt` field
// that pushNetProfit() (js/rooms.js) already stamps on users/{uid} on every
// netProfit change, so only users who actually changed are examined.
const { getFirestore } = require('../lib/firebaseAdmin');
const { sendPushToUser } = require('../lib/sendPush');

const CATEGORY = 'leaderboard';
const TITLE = 'Friends leaderboard';

function profitOf(doc) {
  const value = doc.get('netProfit');
  return typeof value === 'number' ? value : 0;
}

// Notifies everyone a mover jumped over. Returns the set of uids that were
// notified, so the new-leader pass can avoid double-pushing the same person
// about the same move.
async function notifyOvertakenFriends(db, movers) {
  const notified = new Set();

  await Promise.all(movers.docs.map(async (doc) => {
    const afterProfit = profitOf(doc);
    const cached = doc.get('_prevFriendNetProfit');

    // No cached value means this user has never been through a poll pass. Seed
    // it and notify nobody — treating "unknown" as -Infinity would tell every
    // friend below them that they had just been passed.
    if (typeof cached === 'number' && afterProfit > cached) {
      const friendsSnap = await db.collection(`users/${doc.id}/friends`).get();

      if (!friendsSnap.empty) {
        const moverName = doc.get('displayName') || 'A friend';
        const friendDocs = await Promise.all(
          friendsSnap.docs.map((f) => db.doc(`users/${f.id}`).get())
        );
        const overtaken = friendDocs.filter((friendDoc) => {
          if (!friendDoc.exists) return false;
          const friendProfit = profitOf(friendDoc);
          return friendProfit > cached && friendProfit <= afterProfit;
        });

        await Promise.all(overtaken.map((friendDoc) => {
          notified.add(friendDoc.id);
          return sendPushToUser(friendDoc.id, CATEGORY, {
            title: TITLE,
            body: `${moverName} just passed you on the friends leaderboard`,
          });
        }));
      }
    }

    await doc.ref.set({ _prevFriendNetProfit: afterProfit }, { merge: true });
  }));

  return notified;
}

// Ranks a friend circle the way js/friends.js renders it: netProfit descending.
// Ties break on uid so an unchanged circle always resolves to the same leader —
// otherwise two players sitting on equal profit would flap the top spot back
// and forth and notify the whole circle on every poll.
function leaderOf(docs) {
  const ranked = docs.filter((doc) => doc.exists).sort((a, b) => {
    const diff = profitOf(b) - profitOf(a);
    if (diff !== 0) return diff;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
  return ranked[0] || null;
}

// Notifies a whole circle when its #1 changes hands. Friendships are mutual, so
// a mover can only reshuffle the top of their own circle and the circles of
// their direct friends — no need to re-rank every user in the database.
async function notifyNewCircleLeaders(db, movers, alreadyNotified) {
  const affected = new Set();

  await Promise.all(movers.docs.map(async (doc) => {
    affected.add(doc.id);
    const friendsSnap = await db.collection(`users/${doc.id}/friends`).get();
    friendsSnap.docs.forEach((friend) => affected.add(friend.id));
  }));

  // Circles overlap heavily, so the same user doc gets asked for many times —
  // memoize the read promise rather than re-fetching per circle.
  const userReads = new Map();
  const readUser = (uid) => {
    if (!userReads.has(uid)) userReads.set(uid, db.doc(`users/${uid}`).get());
    return userReads.get(uid);
  };

  await Promise.all([...affected].map(async (uid) => {
    const [selfDoc, friendsSnap] = await Promise.all([
      readUser(uid),
      db.collection(`users/${uid}/friends`).get(),
    ]);
    if (!selfDoc.exists || friendsSnap.empty) return;

    const circle = await Promise.all([
      selfDoc,
      ...friendsSnap.docs.map((friend) => readUser(friend.id)),
    ]);
    const leader = leaderOf(circle);
    if (!leader) return;

    const previousLeaderUid = selfDoc.get('_prevFriendLeaderUid') || null;

    // As above: an absent cache means this circle has never been ranked, so
    // seed it silently instead of announcing a leader who may be months old.
    if (previousLeaderUid && previousLeaderUid !== leader.id && !alreadyNotified.has(uid)) {
      await sendPushToUser(uid, CATEGORY, {
        title: TITLE,
        body: leader.id === uid
          ? "You're now #1 among your friends!"
          : `${leader.get('displayName') || 'A friend'} is now #1 among your friends`,
      });
    }

    await selfDoc.ref.set({ _prevFriendLeaderUid: leader.id }, { merge: true });
  }));
}

async function checkFriendRanks(since) {
  const db = getFirestore();
  const movers = await db.collection('users').where('updatedAt', '>', since).get();
  if (movers.empty) return;

  // Sequential on purpose: a player who was both passed AND lost the top spot
  // to the same move should hear about it once, and the overtake message is
  // the more specific of the two.
  const notified = await notifyOvertakenFriends(db, movers);
  await notifyNewCircleLeaders(db, movers, notified);
}

module.exports = { checkFriendRanks };
