// Unit tests for the friends-leaderboard push logic. Run with `npm test`.
//
// friendRank.js talks to Firestore and FCM through two tiny modules, so both are
// replaced in the require cache with fakes before it is loaded — no emulator, no
// network, no service-account key. The fake Firestore implements only the four
// access shapes friendRank.js actually uses.
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');

const adminPath = require.resolve('./../lib/firebaseAdmin');
const sendPushPath = require.resolve('./../lib/sendPush');

let currentDb = null;
let sentPushes = [];

function stub(modulePath, exports) {
  require.cache[modulePath] = {
    id: modulePath,
    filename: modulePath,
    path: path.dirname(modulePath),
    loaded: true,
    exports,
  };
}

stub(adminPath, { getFirestore: () => currentDb });
stub(sendPushPath, {
  sendPushToUser: async (uid, category, notification) => {
    sentPushes.push({ uid, category, body: notification.body });
  },
});

const { checkFriendRanks } = require('./friendRank');

// users: { uid: { friends: [uid...], ...docFields } }
function fakeDb(users) {
  const snapOf = (uid) => {
    const user = users[uid];
    return {
      id: uid,
      exists: !!user,
      get: (field) => (user ? user[field] : undefined),
      ref: {
        set: (patch) => {
          Object.assign(user, patch);
          return Promise.resolve();
        },
      },
    };
  };

  return {
    collection(collectionPath) {
      const friendsMatch = /^users\/(.+)\/friends$/.exec(collectionPath);
      if (friendsMatch) {
        const ids = users[friendsMatch[1]] ? users[friendsMatch[1]].friends || [] : [];
        return { get: async () => ({ empty: ids.length === 0, docs: ids.map((id) => ({ id })) }) };
      }
      if (collectionPath === 'users') {
        return {
          where: (field, _op, value) => ({
            get: async () => {
              const docs = Object.keys(users)
                .filter((uid) => (users[uid][field] || 0) > value)
                .map(snapOf);
              return { empty: docs.length === 0, docs };
            },
          }),
        };
      }
      throw new Error(`fakeDb: unexpected collection ${collectionPath}`);
    },
    doc(docPath) {
      const match = /^users\/([^/]+)$/.exec(docPath);
      if (!match) throw new Error(`fakeDb: unexpected doc ${docPath}`);
      return { get: async () => snapOf(match[1]) };
    },
  };
}

async function run(users) {
  currentDb = fakeDb(users);
  sentPushes = [];
  await checkFriendRanks(0); // `since` is only ever compared with `>`
  return sentPushes;
}

const bodiesFor = (pushes, uid) => pushes.filter((p) => p.uid === uid).map((p) => p.body);

test('seeds silently on first run instead of notifying', async () => {
  // Arrange — nobody has _prevFriendNetProfit or _prevFriendLeaderUid yet.
  const users = {
    alice: { displayName: 'Alice', netProfit: 500, updatedAt: 1, friends: ['bob'] },
    bob: { displayName: 'Bob', netProfit: 100, updatedAt: 0, friends: ['alice'] },
  };

  // Act
  const pushes = await run(users);

  // Assert — a cold cache must not be read as "everyone was just overtaken".
  assert.deepStrictEqual(pushes, []);
  assert.strictEqual(users.alice._prevFriendNetProfit, 500);
  assert.strictEqual(users.alice._prevFriendLeaderUid, 'alice');
  assert.strictEqual(users.bob._prevFriendLeaderUid, 'alice');
});

test('notifies the friend who was passed', async () => {
  // Arrange — Alice climbs from 50 to 300, crossing Bob on 100.
  const users = {
    alice: {
      displayName: 'Alice', netProfit: 300, updatedAt: 1, friends: ['bob'],
      _prevFriendNetProfit: 50, _prevFriendLeaderUid: 'bob',
    },
    bob: {
      displayName: 'Bob', netProfit: 100, updatedAt: 0, friends: ['alice'],
      _prevFriendNetProfit: 100, _prevFriendLeaderUid: 'bob',
    },
  };

  // Act
  const pushes = await run(users);

  // Assert — Bob hears he was passed, and is not also told about the new #1.
  assert.deepStrictEqual(bodiesFor(pushes, 'bob'), [
    'Alice just passed you on the friends leaderboard',
  ]);
});

test('tells the rest of the circle when the top spot changes hands', async () => {
  // Arrange — Alice takes #1 from Bob. Carol is a bystander in the same circle.
  const users = {
    alice: {
      displayName: 'Alice', netProfit: 900, updatedAt: 1, friends: ['bob', 'carol'],
      _prevFriendNetProfit: 900, _prevFriendLeaderUid: 'bob',
    },
    bob: {
      displayName: 'Bob', netProfit: 800, updatedAt: 0, friends: ['alice', 'carol'],
      _prevFriendNetProfit: 800, _prevFriendLeaderUid: 'bob',
    },
    carol: {
      displayName: 'Carol', netProfit: 10, updatedAt: 0, friends: ['alice', 'bob'],
      _prevFriendNetProfit: 10, _prevFriendLeaderUid: 'bob',
    },
  };

  // Act
  const pushes = await run(users);

  // Assert
  assert.deepStrictEqual(bodiesFor(pushes, 'carol'), ['Alice is now #1 among your friends']);
  assert.deepStrictEqual(bodiesFor(pushes, 'alice'), ["You're now #1 among your friends!"]);
});

test('does not re-announce a leader who is still on top', async () => {
  // Arrange — Alice gains profit but was already #1.
  const users = {
    alice: {
      displayName: 'Alice', netProfit: 900, updatedAt: 1, friends: ['bob'],
      _prevFriendNetProfit: 900, _prevFriendLeaderUid: 'alice',
    },
    bob: {
      displayName: 'Bob', netProfit: 10, updatedAt: 0, friends: ['alice'],
      _prevFriendNetProfit: 10, _prevFriendLeaderUid: 'alice',
    },
  };

  // Act
  const pushes = await run(users);

  // Assert
  assert.deepStrictEqual(pushes, []);
});

test('breaks ties deterministically so an idle circle never flaps', async () => {
  // Arrange — equal profit; leader must resolve by uid, not by iteration order.
  const users = {
    zoe: {
      displayName: 'Zoe', netProfit: 200, updatedAt: 1, friends: ['adam'],
      _prevFriendNetProfit: 200, _prevFriendLeaderUid: 'adam',
    },
    adam: {
      displayName: 'Adam', netProfit: 200, updatedAt: 0, friends: ['zoe'],
      _prevFriendNetProfit: 200, _prevFriendLeaderUid: 'adam',
    },
  };

  // Act
  const pushes = await run(users);

  // Assert — 'adam' < 'zoe', so adam stays leader and nobody is notified.
  assert.deepStrictEqual(pushes, []);
  assert.strictEqual(users.zoe._prevFriendLeaderUid, 'adam');
});

test('ignores users with no friends', async () => {
  // Arrange
  const users = {
    solo: { displayName: 'Solo', netProfit: 999, updatedAt: 1, friends: [], _prevFriendNetProfit: 0 },
  };

  // Act
  const pushes = await run(users);

  // Assert
  assert.deepStrictEqual(pushes, []);
  assert.strictEqual(users.solo._prevFriendLeaderUid, undefined);
});
