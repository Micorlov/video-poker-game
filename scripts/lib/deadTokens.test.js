// Unit tests for dead-token classification, error-code tallying and the purge.
// Run with `npm test`. No emulator or credential — the Firestore handle is a
// hand-rolled fake that records deletes.
const test = require('node:test');
const assert = require('node:assert');

const { isDeadTokenError, errorCodeCounts, purgeDeadTokens } = require('./deadTokens');

test('tokens FCM reports as gone for good are dead', () => {
  ['messaging/registration-token-not-registered',
   'messaging/invalid-registration-token',
   'messaging/mismatched-credential'].forEach((code) => {
    assert.strictEqual(isDeadTokenError({ code }), true, code);
  });
});

test('transient failures are not dead tokens', () => {
  ['messaging/internal-error',
   'messaging/server-unavailable',
   'messaging/quota-exceeded',
   'messaging/third-party-auth-error'].forEach((code) => {
    assert.strictEqual(isDeadTokenError({ code }), false, code);
  });
  assert.strictEqual(isDeadTokenError(null), false);
  assert.strictEqual(isDeadTokenError(undefined), false);
});

// invalid-argument covers both a bad payload and a bad token. Treating the
// payload case as a dead token would wipe every token on one bad campaign.
test('invalid-argument counts only when it names the registration token', () => {
  assert.strictEqual(isDeadTokenError({
    code: 'messaging/invalid-argument',
    message: 'The registration token is not a valid FCM registration token'
  }), true);
  assert.strictEqual(isDeadTokenError({
    code: 'messaging/invalid-argument',
    message: 'Invalid JSON payload received. Unknown name "titel".'
  }), false);
});

test('error codes are tallied per code, successes ignored', () => {
  const counts = errorCodeCounts([
    { success: true },
    { success: false, error: { code: 'messaging/registration-token-not-registered' } },
    { success: false, error: { code: 'messaging/registration-token-not-registered' } },
    { success: false, error: { code: 'messaging/internal-error' } },
    { success: false }
  ]);
  assert.deepStrictEqual(counts, {
    'messaging/registration-token-not-registered': 2,
    'messaging/internal-error': 1,
    unknown: 1
  });
});

function fakeDb(failPaths = []) {
  const deleted = [];
  return {
    deleted,
    doc: (path) => ({
      delete: async () => {
        if (failPaths.includes(path)) throw new Error('permission denied');
        deleted.push(path);
      }
    })
  };
}

test('purging deletes exactly the named token docs', async () => {
  const db = fakeDb();
  const count = await purgeDeadTokens(db, [
    { uid: 'alice', token: 'tok-1' },
    { uid: 'bob', token: 'tok-2' }
  ]);
  assert.strictEqual(count, 2);
  assert.deepStrictEqual(db.deleted.sort(), [
    'users/alice/fcmTokens/tok-1',
    'users/bob/fcmTokens/tok-2'
  ]);
});

// A purge runs after delivery already happened, so one failed delete must not
// reject and turn a sent notification into a failed campaign.
test('a delete that fails does not break the purge', async () => {
  const db = fakeDb(['users/alice/fcmTokens/tok-1']);
  await assert.doesNotReject(purgeDeadTokens(db, [
    { uid: 'alice', token: 'tok-1' },
    { uid: 'bob', token: 'tok-2' }
  ]));
  assert.deepStrictEqual(db.deleted, ['users/bob/fcmTokens/tok-2']);
});

test('purging nothing touches nothing', async () => {
  const db = fakeDb();
  assert.strictEqual(await purgeDeadTokens(db, []), 0);
  assert.deepStrictEqual(db.deleted, []);
});
