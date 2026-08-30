// Unit tests for the all-time "you lost your place" trigger. Run with `npm test`.
//
// The point of interest is the throttle: this is the most expensive check in
// the poller, and it is only affordable because it refuses to run more than
// once an hour regardless of how often the poll pass calls it.
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

stub(adminPath, {
  getFirestore: () => currentDb,
  Timestamp: { fromDate: (d) => ({ toMillis: () => d.getTime(), toDate: () => d }) },
});
stub(sendPushPath, {
  sendPushToUser: async (uid, category, notification, options) => {
    sentPushes.push({ uid, category, body: notification.body, options });
  },
});

const { checkGlobalRank } = require('./globalRank');

// state.cache is the system/pushRankCache document; state.ranked is the users
// collection already in netProfit-descending order.
function fakeDb(state) {
  return {
    doc(docPath) {
      assert.strictEqual(docPath, 'system/pushRankCache');
      return {
        get: async () => ({
          exists: state.cache !== null,
          get: (field) => (state.cache ? state.cache[field] : undefined),
        }),
        set: async (patch) => {
          state.cache = { ...(state.cache || {}), ...patch };
        },
      };
    },
    collection(collectionPath) {
      assert.strictEqual(collectionPath, 'users');
      return {
        orderBy: () => ({
          limit: (n) => ({
            get: async () => ({ docs: state.ranked.slice(0, n).map((uid) => ({ id: uid })) }),
          }),
        }),
      };
    },
  };
}

async function run(state, settings) {
  currentDb = fakeDb(state);
  sentPushes = [];
  await checkGlobalRank(settings);
  return sentPushes;
}

const withTopN = (n, overrides) => ({
  triggers: { globalRank: { enabled: true, cooldownHours: 24, topN: n, minRunIntervalMinutes: 60, ...overrides } },
});

test('seeds silently on the first run instead of notifying the whole board', async () => {
  // Arrange — no cache doc has ever been written.
  const state = { cache: null, ranked: ['alice', 'bob', 'carol'] };

  // Act
  const pushes = await run(state, withTopN(3));

  // Assert — a cold cache must not read as "everyone was just knocked off".
  assert.deepStrictEqual(pushes, []);
  assert.deepStrictEqual(state.cache.globalRank.top, ['alice', 'bob', 'carol']);
});

test('notifies only the players who fell out of the top N', async () => {
  // Arrange — dave displaces carol; alice and bob are unmoved.
  const state = {
    cache: { globalRank: { top: ['alice', 'bob', 'carol'], lastRunAt: 0 } },
    ranked: ['alice', 'bob', 'dave'],
  };

  // Act
  const pushes = await run(state, withTopN(3));

  // Assert
  assert.strictEqual(pushes.length, 1);
  assert.strictEqual(pushes[0].uid, 'carol');
  assert.match(pushes[0].body, /lost your place in the all-time top 3/);
});

test('passes the trigger and cooldown down so sendPush can enforce them', async () => {
  // Arrange
  const state = {
    cache: { globalRank: { top: ['carol'], lastRunAt: 0 } },
    ranked: ['alice'],
  };

  // Act
  const pushes = await run(state, withTopN(1, { cooldownHours: 48 }));

  // Assert — the policy decision itself lives in sendPush.js, not here.
  assert.strictEqual(pushes[0].options.trigger, 'globalRank');
  assert.strictEqual(pushes[0].options.cooldownHours, 48);
});

test('refuses to run again inside the throttle window', async () => {
  // Arrange — last run was 10 minutes ago, throttle is 60.
  const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
  const state = {
    cache: { globalRank: { top: ['carol'], lastRunAt: tenMinutesAgo } },
    ranked: ['alice'],
  };

  // Act
  const pushes = await run(state, withTopN(1));

  // Assert — carol dropped out, but the check never even queried for it. This
  // is what keeps the poller inside the Firestore free quota.
  assert.deepStrictEqual(pushes, []);
  assert.deepStrictEqual(state.cache.globalRank.top, ['carol']);
});

test('runs again once the throttle window has elapsed', async () => {
  // Arrange — last run was 90 minutes ago, throttle is 60.
  const ninetyMinutesAgo = Date.now() - 90 * 60 * 1000;
  const state = {
    cache: { globalRank: { top: ['carol'], lastRunAt: ninetyMinutesAgo } },
    ranked: ['alice'],
  };

  // Act
  const pushes = await run(state, withTopN(1));

  // Assert
  assert.strictEqual(pushes.length, 1);
  assert.strictEqual(pushes[0].uid, 'carol');
});

test('does nothing at all when the trigger is switched off in the admin center', async () => {
  // Arrange
  const state = { cache: { globalRank: { top: ['carol'], lastRunAt: 0 } }, ranked: ['alice'] };

  // Act
  const pushes = await run(state, { triggers: { globalRank: { enabled: false } } });

  // Assert — no pushes, and the cache is left untouched.
  assert.deepStrictEqual(pushes, []);
  assert.deepStrictEqual(state.cache.globalRank.top, ['carol']);
});
