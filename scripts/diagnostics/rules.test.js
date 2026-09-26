'use strict';

// Security-rule coverage for the two collections unauthenticated clients may
// write: `installs` (js/installs.js) and `errors` (js/errors.js). Both accept
// writes from anyone, so the rules are the only thing keeping the data in
// shape. Sent exactly as js/telemetry.js sends them — a REST commit with no
// auth token — against a real emulator, same as scripts/duels/rules.test.js.
//
// The suite skips itself unless a Firestore emulator is already serving
// firestore.rules on FIRESTORE_EMULATOR_HOST (default localhost:8181). To run
// it, start one as described at the top of scripts/duels/rules.test.js.
const test = require('node:test');
const assert = require('node:assert');

const PID = process.env.DUELS_TEST_PROJECT || 'video-poker-6d665';
const HOST = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8181';
const DOCS = `projects/${PID}/databases/(default)/documents`;
const COMMIT = `http://${HOST}/v1/${DOCS}:commit`;

const S = (v) => ({ stringValue: v });
const I = (v) => ({ integerValue: String(v) });
const B = (v) => ({ booleanValue: v });

async function commit(write) {
    const res = await fetch(COMMIT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ writes: [write] })
    });
    return res.status >= 200 && res.status < 300;
}

function create(collection, docId, fields) {
    return commit({
        update: { name: `${DOCS}/${collection}/${docId}`, fields },
        updateTransforms: [{ fieldPath: 'at', setToServerValue: 'REQUEST_TIME' }],
        currentDocument: { exists: false }
    });
}

// What vpRestUpdate() sends for a later launch.
function launch(docId, fields, { serverTime = true } = {}) {
    return commit({
        update: { name: `${DOCS}/installs/${docId}`, fields },
        updateMask: { fieldPaths: Object.keys(fields) },
        updateTransforms: serverTime ? [{ fieldPath: 'lastOpenAt', setToServerValue: 'REQUEST_TIME' }] : [],
        currentDocument: { exists: true }
    });
}

let seq = Math.floor(Math.random() * 1e9);
function installId() {
    seq += 1;
    return ('T' + seq.toString(36) + 'x'.repeat(20)).slice(0, 20);
}

function installStage(id, stage, over) {
    return Object.assign({
        stage: S(stage), installId: S(id), existing: B(false), opens: I(1),
        version: S('2.9'), platform: S('android'), android: I(16), chrome: I(151),
        lang: S('en-GB'), country: S('IL'), source: S('organic'), bootMs: I(0)
    }, over || {});
}

function errorReport(over) {
    return Object.assign({
        kind: S('firebase'), message: S('Missing or insufficient permissions.'),
        code: S('permission-denied'), stack: S(''), quota: B(false), count: I(1),
        screen: S('play'), version: S('2.9'), platform: S('android'), country: S('IL'),
        uid: S(''), installId: S('abcdefghijABCDEFGHIJ'), online: B(true), ageSec: I(0)
    }, over || {});
}

async function emulatorReachable() {
    try {
        const res = await fetch(`http://${HOST}/`, { signal: AbortSignal.timeout(1500) });
        return res.status < 500;
    } catch (e) { return false; }
}

test('install funnel and error report rules', async (t) => {
    if (!await emulatorReachable()) {
        t.skip(`no Firestore emulator on ${HOST} — see the comment at the top of this file`);
        return;
    }

    async function opened(over) {
        const id = installId();
        assert.ok(await create('installs', id + '_open', installStage(id, 'open', over)));
        return id + '_open';
    }

    await t.test('a later launch may raise the open doc\'s count', async () => {
        const doc = await opened();
        assert.ok(await launch(doc, { opens: I(2) }));
        assert.ok(await launch(doc, { opens: I(5) }), 'launches that could not be sent are folded in');
    });

    await t.test('the count can never stand still or go backwards', async () => {
        const doc = await opened();
        assert.ok(await launch(doc, { opens: I(3) }));
        assert.ok(!await launch(doc, { opens: I(3) }), 'a stale resend is refused');
        assert.ok(!await launch(doc, { opens: I(2) }));
    });

    await t.test('lastOpenAt must be the server\'s clock', async () => {
        const doc = await opened();
        assert.ok(!await launch(doc, { opens: I(2), lastOpenAt: { timestampValue: '2030-01-01T00:00:00Z' } },
            { serverTime: false }));
    });

    await t.test('an unknown country or source may be filled in once', async () => {
        const doc = await opened({ country: S(''), source: S('') });
        assert.ok(await launch(doc, { opens: I(2), country: S('IL'), source: S('referral') }));
        assert.ok(!await launch(doc, { opens: I(3), country: S('US') }), 'once known it is fixed');
        assert.ok(!await launch(doc, { opens: I(3), source: S('tiktok') }));
    });

    await t.test('a known country cannot be overwritten', async () => {
        const doc = await opened({ country: S('GB') });
        assert.ok(!await launch(doc, { opens: I(2), country: S('IL') }));
    });

    await t.test('nothing else on the doc can move', async () => {
        const doc = await opened();
        assert.ok(!await launch(doc, { opens: I(2), version: S('9.9') }));
        assert.ok(!await launch(doc, { opens: I(2), existing: B(true) }));
        assert.ok(!await launch(doc, { opens: I(2), extra: S('x') }));
    });

    await t.test('the boot doc stays create-only', async () => {
        const id = installId();
        assert.ok(await create('installs', id + '_boot', installStage(id, 'boot')));
        assert.ok(!await launch(id + '_boot', { opens: I(2) }));
    });

    await t.test('a launch update cannot create an open doc that does not exist', async () => {
        assert.ok(!await launch(installId() + '_open', { opens: I(2) }));
    });

    await t.test('an error report may name the operation that failed', async () => {
        assert.ok(await create('errors', installId(), errorReport({ op: S('set daily_scores/*') })));
    });

    await t.test('an error report from a build without op is still accepted', async () => {
        assert.ok(await create('errors', installId(), errorReport()));
    });

    await t.test('op is capped like every other field', async () => {
        assert.ok(!await create('errors', installId(), errorReport({ op: S('x'.repeat(81)) })));
        assert.ok(!await create('errors', installId(), errorReport({ op: I(1) })));
    });
});
