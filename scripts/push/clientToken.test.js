// Regression guard for js/push.js token registration.
//
// The bug this locks down: onboarding shows the push step a whole screen
// before sign-in, so the FCM token always arrived while window.egUser was
// still null. saveFcmToken() returned early, and nothing ever re-registered
// (showing the push screen had already set vp_push_permission_asked), so the
// token was never written and no notification could be delivered to anyone.
// It failed silently — the send-side poller simply found no tokens.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const PUSH_SRC = fs.readFileSync(path.join(__dirname, '..', '..', 'js', 'push.js'), 'utf8');

// js/push.js is a browser script, not a module — run it in a context that
// supplies the globals it expects and records what it writes to Firestore.
function loadPush() {
    const writes = [];
    const win = {};
    const sandbox = {
        window: win,
        console: { warn() {}, log() {} },
        navigator: {},
        firebase: { firestore: { FieldValue: { serverTimestamp: () => '<ts>' } } },
        firebaseSafe: (fn) => fn(),
        db: {
            collection: () => ({
                doc: (uid) => ({
                    collection: () => ({
                        doc: (token) => ({
                            set: (data) => writes.push({ kind: 'token', uid, token, data })
                        })
                    }),
                    set: (data) => writes.push({ kind: 'prefs', uid, data })
                })
            })
        }
    };
    vm.createContext(sandbox);
    vm.runInContext(PUSH_SRC, sandbox);
    return { win, writes, ctx: sandbox };
}

function tokenWrites(writes) {
    return writes.filter((w) => w.kind === 'token');
}

function prefWrites(writes) {
    return writes.filter((w) => w.kind === 'prefs');
}

test('a token arriving before sign-in is kept, not dropped', () => {
    const { win, writes, ctx } = loadPush();

    win.egUser = null;
    ctx.saveFcmToken('TOKEN-ABC', 'ios');

    assert.equal(tokenWrites(writes).length, 0, 'must not write without a uid');

    win.egUser = { uid: 'user-123' };
    win.flushPendingPushRegistration();

    const written = tokenWrites(writes);
    assert.equal(written.length, 1);
    assert.equal(written[0].uid, 'user-123');
    assert.equal(written[0].token, 'TOKEN-ABC');
    assert.equal(written[0].data.platform, 'ios');
});

test('notification opt-ins chosen before sign-in survive to Firestore', () => {
    const { win, writes, ctx } = loadPush();

    win.egUser = null;
    ['social', 'leaderboard', 'dailyReminder', 'bestHand'].forEach((c) => ctx.setNotificationPref(c, true));

    assert.equal(prefWrites(writes).length, 0, 'must not write without a uid');

    win.egUser = { uid: 'user-123' };
    win.flushPendingPushRegistration();

    const written = prefWrites(writes);
    assert.equal(written.length, 4);
    assert.deepEqual(
        written.map((w) => Object.keys(w.data.notificationPrefs)[0]).sort(),
        ['bestHand', 'dailyReminder', 'leaderboard', 'social']
    );
    assert.ok(written.every((w) => Object.values(w.data.notificationPrefs)[0] === true));
});

test('flushing twice does not write the token twice', () => {
    const { win, writes, ctx } = loadPush();

    win.egUser = null;
    ctx.saveFcmToken('TOKEN-ABC', 'android');

    win.egUser = { uid: 'user-123' };
    win.flushPendingPushRegistration();
    win.flushPendingPushRegistration();

    assert.equal(tokenWrites(writes).length, 1);
});

test('a token arriving after sign-in still writes straight through', () => {
    const { win, writes, ctx } = loadPush();

    win.egUser = { uid: 'user-123' };
    ctx.saveFcmToken('TOKEN-XYZ', 'web');

    const written = tokenWrites(writes);
    assert.equal(written.length, 1);
    assert.equal(written[0].token, 'TOKEN-XYZ');
    assert.equal(written[0].data.platform, 'web');
});

test('flushing with no user pending is a no-op rather than a throw', () => {
    const { win, writes } = loadPush();

    win.egUser = null;
    assert.doesNotThrow(() => win.flushPendingPushRegistration());
    assert.equal(writes.length, 0);
});
