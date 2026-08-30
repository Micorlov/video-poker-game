// Unit tests for the admin-center campaign runner. Run with `npm test`.
//
// Only firebaseAdmin and the delivery log are stubbed — scripts/lib/audience.js
// and scripts/lib/multicast.js run for real against an in-memory Firestore, so
// these tests cover audience resolution and the batched fan-out too.
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');

const adminPath = require.resolve('./../lib/firebaseAdmin');
const pushLogPath = require.resolve('./../lib/pushLog');

let currentDb = null;
let sentMessages = [];
let pushLogs = [];

function stub(modulePath, exports) {
  require.cache[modulePath] = {
    id: modulePath,
    filename: modulePath,
    path: path.dirname(modulePath),
    loaded: true,
    exports,
  };
}

const Timestamp = {
  fromDate: (d) => ({ toMillis: () => d.getTime(), toDate: () => d, _millis: d.getTime() }),
};

stub(adminPath, {
  getFirestore: () => currentDb,
  getMessaging: () => ({
    sendEachForMulticast: async (message) => {
      sentMessages.push(message);
      // Any token beginning with "bad-" fails, which is how the delivery-log
      // and stats assertions below distinguish sent from failed.
      const responses = message.tokens.map((t) => ({ success: !t.startsWith('bad-') }));
      return {
        responses,
        successCount: responses.filter((r) => r.success).length,
        failureCount: responses.filter((r) => !r.success).length,
      };
    },
  }),
  Timestamp,
});
stub(pushLogPath, { logPush: async (entry) => { pushLogs.push(entry); }, PUSH_LOGS_COLLECTION: 'pushLogs' });

const { processCampaigns } = require('./campaigns');

const millisOf = (value) =>
  (value && typeof value.toMillis === 'function') ? value.toMillis() : (typeof value === 'number' ? value : null);

function getPath(obj, dotted) {
  return dotted.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
}

function setPath(obj, dotted, value) {
  const keys = dotted.split('.');
  const last = keys.pop();
  const target = keys.reduce((acc, key) => {
    if (!acc[key]) acc[key] = {};
    return acc[key];
  }, obj);
  target[last] = value;
}

// world: { campaigns: {id: fields}, users: {uid: {…, friends: [], tokens: {token: platform}}} }
function fakeDb(world) {
  const userSnap = (uid) => ({
    id: uid,
    exists: !!world.users[uid],
    get: (field) => (world.users[uid] ? world.users[uid][field] : undefined),
  });

  const allTokenDocs = () =>
    Object.entries(world.users).flatMap(([uid, user]) =>
      Object.entries(user.tokens || {}).map(([token, platform]) => ({
        id: token,
        get: (field) => (field === 'platform' ? platform : undefined),
        ref: { parent: { parent: { id: uid } } },
      }))
    );

  const campaignDoc = (id) => ({
    id,
    data: () => ({ ...world.campaigns[id] }),
    ref: {
      update: async (patch) => {
        Object.entries(patch).forEach(([key, value]) => setPath(world.campaigns[id], key, value));
      },
    },
  });

  return {
    collection(collectionPath) {
      if (collectionPath === 'pushCampaigns') {
        const filters = [];
        const builder = {
          where: (field, op, value) => { filters.push({ field, op, value }); return builder; },
          get: async () => {
            const ids = Object.keys(world.campaigns).filter((id) => filters.every(({ field, op, value }) => {
              const actual = getPath(world.campaigns[id], field);
              if (op === '==') return actual === value;
              if (op === '<=') return millisOf(actual) !== null && millisOf(actual) <= millisOf(value);
              throw new Error(`fakeDb: unsupported op ${op}`);
            }));
            return { empty: ids.length === 0, docs: ids.map(campaignDoc) };
          },
        };
        return builder;
      }

      const tokensMatch = /^users\/(.+)\/fcmTokens$/.exec(collectionPath);
      if (tokensMatch) {
        const uid = tokensMatch[1];
        const tokens = (world.users[uid] || {}).tokens || {};
        return {
          get: async () => ({
            empty: Object.keys(tokens).length === 0,
            docs: Object.entries(tokens).map(([token, platform]) => ({
              id: token,
              get: (field) => (field === 'platform' ? platform : undefined),
            })),
          }),
        };
      }

      if (collectionPath === 'users') {
        const build = (predicate) => ({
          get: async () => {
            const docs = Object.keys(world.users).filter(predicate).map(userSnap);
            return { empty: docs.length === 0, docs };
          },
        });
        return {
          where: (field, op, value) => build((uid) => {
            const actual = world.users[uid][field];
            if (op === '>=') return actual !== undefined && actual >= value;
            if (op === '<') return actual !== undefined && actual < value;
            throw new Error(`fakeDb: unsupported op ${op}`);
          }),
          get: build(() => true).get,
        };
      }

      throw new Error(`fakeDb: unexpected collection ${collectionPath}`);
    },

    collectionGroup(name) {
      if (name === 'fcmTokens') {
        return {
          get: async () => ({ docs: allTokenDocs() }),
          where: (field, _op, value) => ({
            get: async () => ({ docs: allTokenDocs().filter((doc) => doc.get(field) === value) }),
          }),
        };
      }
      if (name === 'friends') {
        const docs = Object.entries(world.users).flatMap(([uid, user]) =>
          (user.friends || []).map((friendUid) => ({ id: friendUid, ref: { parent: { parent: { id: uid } } } }))
        );
        return { get: async () => ({ docs }) };
      }
      throw new Error(`fakeDb: unexpected collection group ${name}`);
    },

    doc(docPath) {
      const match = /^users\/([^/]+)$/.exec(docPath);
      if (!match) throw new Error(`fakeDb: unexpected doc ${docPath}`);
      return { get: async () => userSnap(match[1]) };
    },
  };
}

const past = () => Timestamp.fromDate(new Date(Date.now() - 60 * 1000));

function baseWorld(campaignOverrides) {
  return {
    campaigns: {
      c1: {
        title: 'Tournament tonight',
        body: 'Doors open at 20:00',
        category: 'announcement',
        audience: { type: 'all' },
        schedule: { mode: 'now', nextRunAt: past() },
        respectPrefs: true,
        status: 'scheduled',
        ...campaignOverrides,
      },
    },
    users: {
      alice: { displayName: 'Alice', lastPlayedDate: '2099-01-01', friends: ['bob'], tokens: { 'tok-a': 'android' } },
      bob: { displayName: 'Bob', lastPlayedDate: '2020-01-01', friends: [], tokens: { 'tok-b': 'ios', 'tok-b2': 'web' } },
      carol: { displayName: 'Carol', lastPlayedDate: '2020-01-01', friends: [], tokens: {} },
    },
  };
}

async function run(world, settings) {
  currentDb = fakeDb(world);
  sentMessages = [];
  pushLogs = [];
  await processCampaigns(settings || {});
  return world.campaigns.c1;
}

const tokensSent = () => sentMessages.flatMap((m) => m.tokens).sort();

test('sends to every registered device and records per-user delivery', async () => {
  // Arrange
  const world = baseWorld();

  // Act
  const campaign = await run(world);

  // Assert — three tokens across two users; carol has no device so no log row.
  assert.deepStrictEqual(tokensSent(), ['tok-a', 'tok-b', 'tok-b2']);
  assert.deepStrictEqual(pushLogs.map((l) => l.uid).sort(), ['alice', 'bob']);
  assert.strictEqual(campaign.status, 'sent');
  assert.strictEqual(campaign.stats.sent, 3);
  assert.strictEqual(campaign.stats.failed, 0);
});

test('a platform audience reaches only that platform', async () => {
  // Arrange
  const world = baseWorld({ audience: { type: 'platform', platform: 'ios' } });

  // Act
  await run(world);

  // Assert
  assert.deepStrictEqual(tokensSent(), ['tok-b']);
});

test('a single-user audience reaches only that user devices', async () => {
  // Arrange — this is the case that replaces the old pushTestQueue path.
  const world = baseWorld({ audience: { type: 'user', uid: 'bob' } });

  // Act
  await run(world);

  // Assert
  assert.deepStrictEqual(tokensSent(), ['tok-b', 'tok-b2']);
});

test('a segment audience resolves through the users collection', async () => {
  // Arrange — bob and carol are stale; only bob has a device.
  const world = baseWorld({ audience: { type: 'segment', segment: 'inactive3d' } });

  // Act
  await run(world);

  // Assert
  assert.deepStrictEqual(tokensSent(), ['tok-b', 'tok-b2']);
});

test('the hasFriends segment resolves through the friends collection group', async () => {
  // Arrange — only alice has a friend edge.
  const world = baseWorld({ audience: { type: 'segment', segment: 'hasFriends' } });

  // Act
  await run(world);

  // Assert
  assert.deepStrictEqual(tokensSent(), ['tok-a']);
});

test('respects a user who has muted the campaign category', async () => {
  // Arrange — bob opted out of announcements in the app settings.
  const world = baseWorld();
  world.users.bob.notificationPrefs = { announcement: false };

  // Act
  const campaign = await run(world);

  // Assert — an admin broadcast must not override an opt-out.
  assert.deepStrictEqual(tokensSent(), ['tok-a']);
  assert.strictEqual(campaign.stats.skipped, 2);
});

test('ignores mute preferences when the campaign opts out of respecting them', async () => {
  // Arrange
  const world = baseWorld({ respectPrefs: false });
  world.users.bob.notificationPrefs = { announcement: false };

  // Act
  await run(world);

  // Assert
  assert.deepStrictEqual(tokensSent(), ['tok-a', 'tok-b', 'tok-b2']);
});

test('carries a deep link through as a stringified data payload', async () => {
  // Arrange
  const world = baseWorld({ deepLink: 'leaderboard' });

  // Act
  await run(world);

  // Assert — FCM rejects non-string data values.
  assert.deepStrictEqual(sentMessages[0].data, { deepLink: 'leaderboard' });
});

test('omits the data payload entirely when there is no deep link', async () => {
  // Arrange — FCM rejects a message carrying an empty data map.
  const world = baseWorld();

  // Act
  await run(world);

  // Assert
  assert.strictEqual('data' in sentMessages[0], false);
});

test('a recurring campaign books its next run instead of completing', async () => {
  // Arrange — every 6 hours.
  const world = baseWorld({ schedule: { mode: 'recurring', intervalHours: 6, nextRunAt: past() } });

  // Act
  const campaign = await run(world);

  // Assert — still scheduled, and the next run is roughly 6 hours out.
  assert.strictEqual(campaign.status, 'scheduled');
  const hoursOut = (campaign.schedule.nextRunAt.toMillis() - Date.now()) / (60 * 60 * 1000);
  assert.ok(hoursOut > 5.9 && hoursOut < 6.1, `expected ~6h, got ${hoursOut}`);
});

test('a one-off campaign is terminal so the next poll does not resend it', async () => {
  // Arrange
  const world = baseWorld();

  // Act
  const campaign = await run(world);

  // Assert
  assert.strictEqual(campaign.status, 'sent');

  // Act again — a second poll pass over the same data.
  sentMessages = [];
  currentDb = fakeDb(world);
  await processCampaigns({});

  // Assert — nothing re-sent.
  assert.deepStrictEqual(sentMessages, []);
});

test('a paused campaign is never picked up', async () => {
  // Arrange
  const world = baseWorld({ status: 'paused' });

  // Act
  await run(world);

  // Assert
  assert.deepStrictEqual(sentMessages, []);
});

test('quiet hours hold a campaign rather than dropping it', async () => {
  // Arrange — a window covering every hour of the day, so the test does not
  // depend on when it happens to run.
  const world = baseWorld();
  const settings = { quietHours: { enabled: true, startHour: 0, endHour: 23, mode: 'hold' } };

  // Act
  const campaign = await run(world, settings);

  // Assert — nothing sent, still scheduled, rebooked for the window opening.
  assert.deepStrictEqual(sentMessages, []);
  assert.strictEqual(campaign.status, 'scheduled');
  assert.ok(campaign.schedule.nextRunAt.toMillis() > Date.now());
});

test('an audience with no eligible devices completes without sending', async () => {
  // Arrange — carol is the only target and has no registered device.
  const world = baseWorld({ audience: { type: 'user', uid: 'carol' } });

  // Act
  const campaign = await run(world);

  // Assert
  assert.deepStrictEqual(sentMessages, []);
  assert.strictEqual(campaign.status, 'sent');
  assert.strictEqual(campaign.stats.audienceSize, 0);
});

test('counts partial delivery failures without failing the campaign', async () => {
  // Arrange — alice device token is rejected by FCM.
  const world = baseWorld();
  world.users.alice.tokens = { 'bad-tok-a': 'android' };

  // Act
  const campaign = await run(world);

  // Assert
  assert.strictEqual(campaign.stats.sent, 2);
  assert.strictEqual(campaign.stats.failed, 1);
  assert.strictEqual(pushLogs.find((l) => l.uid === 'alice').status, 'failed');
  assert.strictEqual(pushLogs.find((l) => l.uid === 'bob').status, 'sent');
});

test('a campaign that throws is marked failed rather than retried forever', async () => {
  // Arrange — an audience type the resolver does not know.
  const world = baseWorld({ audience: { type: 'segment', segment: 'nonsense' } });

  // Act
  const campaign = await run(world);

  // Assert — terminal status, and the reason is kept for the admin UI.
  assert.strictEqual(campaign.status, 'failed');
  assert.match(campaign.error, /Unknown audience segment/);
});
