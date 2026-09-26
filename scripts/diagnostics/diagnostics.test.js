'use strict';

// Tests for the early diagnostics scripts: js/telemetry.js (REST transport,
// install id), js/errors.js (error capture + outbox) and js/installs.js
// (open/boot funnel), plus firebaseSafe()'s new default of reporting.
//
// They run in a vm sandbox with a fake clock, fake fetch and an in-memory
// localStorage, loaded in the same order build.js inlines them.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..', '..');
const EARLY_FILES = ['js/telemetry.js', 'js/errors.js', 'js/installs.js'];
const EARLY_SRC = EARLY_FILES.map((f) => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n');

const FIREBASE_SRC = fs.readFileSync(path.join(ROOT, 'js', 'firebase.js'), 'utf8');
const FIREBASE_SAFE_SRC = FIREBASE_SRC
    .match(/function handleFirebaseFailure[\s\S]*?\n}\n\nfunction firebaseSafe[\s\S]*?\n}\n/)[0];

const settle = () => new Promise((resolve) => setImmediate(resolve));

async function drain(times = 6) {
    for (let i = 0; i < times; i++) await settle();
}

function makeEnv({ storage = {}, fetchStatus = 200, platform = 'android', storageThrows = false } = {}) {
    const store = new Map(Object.entries(storage));
    const clock = { now: 1_900_000_000_000 };
    let timers = [];
    const listeners = { window: {}, document: {} };
    const requests = [];
    const status = { value: fetchStatus };

    const localStorage = {
        getItem: (k) => { if (storageThrows) throw new Error('blocked'); return store.has(k) ? store.get(k) : null; },
        setItem: (k, v) => { if (storageThrows) throw new Error('blocked'); store.set(k, String(v)); },
        removeItem: (k) => store.delete(k)
    };

    const on = (bucket) => (type, fn) => { (listeners[bucket][type] = listeners[bucket][type] || []).push(fn); };

    const document = {
        visibilityState: 'visible',
        getElementById: () => null,
        querySelector: () => ({ id: 'screen-play' }),
        addEventListener: on('document')
    };

    const window = {
        addEventListener: on('window'),
        Capacitor: platform === 'web' ? undefined : { isNativePlatform: () => true }
    };

    const fetch = (url, opts) => {
        requests.push({ url, body: JSON.parse(opts.body) });
        if (status.value === 'offline') return Promise.reject(new TypeError('Failed to fetch'));
        return Promise.resolve({ ok: status.value >= 200 && status.value < 300, status: status.value });
    };

    const context = vm.createContext({
        window, document, localStorage, fetch,
        navigator: { userAgent: 'Mozilla/5.0 (Linux; Android 13) Chrome/120.0 Mobile', language: 'en-GB', onLine: true },
        setTimeout: (fn, ms) => { const t = { fn, due: clock.now + ms }; timers.push(t); return t; },
        clearTimeout: (t) => { timers = timers.filter((x) => x !== t); },
        Date: { now: () => clock.now },
        Math, JSON, String, Object, Array, Promise, parseInt, TypeError, Error,
        VP_BUILD_VERSION: '2.9'
    });
    context.window.egUser = null;
    vm.runInContext(EARLY_SRC, context);

    return {
        context, store, requests, status, document, listeners,
        async advance(ms) {
            clock.now += ms;
            const due = timers.filter((t) => t.due <= clock.now);
            timers = timers.filter((t) => t.due > clock.now);
            due.forEach((t) => t.fn());
            await drain();
        },
        fire(bucket, type, ev) { (listeners[bucket][type] || []).forEach((fn) => fn(ev)); },
        outbox() { return JSON.parse(store.get('vp_error_outbox') || '[]'); },
        install() { return JSON.parse(store.get('vp_install') || 'null'); },
        // The server-clock probe posts a commit carrying no writes, so document
        // writes are the requests that actually name a document.
        docWrites(collection) {
            return requests.filter((r) => (r.body.writes || []).length
                && r.body.writes[0].update.name.includes('/' + collection + '/'));
        },
        errorWrites() { return this.docWrites('errors'); },
        installWrites() { return this.docWrites('installs'); }
    };
}

function fieldsOf(request) {
    const f = request.body.writes[0].update.fields;
    const out = {};
    Object.keys(f).forEach((k) => {
        const v = f[k];
        out[k] = 'booleanValue' in v ? v.booleanValue : 'integerValue' in v ? Number(v.integerValue) : v.stringValue;
    });
    return out;
}

// --- errors.js ---------------------------------------------------------------

test('an uncaught error is queued with build version, platform and install id', () => {
    const env = makeEnv();
    env.fire('window', 'error', { error: { message: 'boom', stack: 'Error: boom\n at x (https://localhost/video_poker.html:10:5)' } });
    const [entry] = env.outbox();
    assert.strictEqual(entry.fields.kind, 'error');
    assert.strictEqual(entry.fields.message, 'boom');
    assert.strictEqual(entry.fields.version, '2.9');
    assert.strictEqual(entry.fields.platform, 'android');
    assert.strictEqual(entry.fields.installId, env.install().id);
    assert.strictEqual(entry.fields.screen, 'play');
    assert.match(entry.fields.stack, /video_poker\.html:10:5/);
    assert.doesNotMatch(entry.fields.stack, /https:\/\/localhost/);
});

test('a repeated error is one report whose count grows', () => {
    const env = makeEnv();
    for (let i = 0; i < 3; i++) env.fire('window', 'error', { error: { message: 'loop' } });
    const outbox = env.outbox();
    assert.strictEqual(outbox.length, 1);
    assert.strictEqual(outbox[0].fields.count, 3);
});

test('no more than 15 distinct reports are queued in one session', () => {
    const env = makeEnv();
    for (let i = 0; i < 40; i++) env.fire('window', 'error', { error: { message: 'distinct ' + i } });
    assert.strictEqual(env.outbox().length, 15);
});

test('unhandled rejections are reported, including non-Error reasons', () => {
    const env = makeEnv();
    env.fire('window', 'unhandledrejection', { reason: 'plain string' });
    assert.strictEqual(env.outbox()[0].fields.kind, 'rejection');
    assert.strictEqual(env.outbox()[0].fields.message, 'plain string');
});

test('a flush sends each report as a create with a server timestamp, then clears it', async () => {
    const env = makeEnv();
    env.fire('window', 'error', { error: { message: 'boom' } });
    await env.advance(4000);
    const [req] = env.errorWrites();
    assert.ok(req, 'expected a REST write');
    assert.deepStrictEqual(req.body.writes[0].updateTransforms, [{ fieldPath: 'at', setToServerValue: 'REQUEST_TIME' }]);
    assert.deepStrictEqual(req.body.writes[0].currentDocument, { exists: false });
    assert.strictEqual(fieldsOf(req).ageSec, 4);
    assert.strictEqual(env.outbox().length, 0);
});

test('HTTP 429 keeps the report and queues an explicit quota report for later', async () => {
    const env = makeEnv({ fetchStatus: 429 });
    env.fire('window', 'error', { error: { message: 'boom' } });
    await env.advance(4000);
    const outbox = env.outbox();
    assert.strictEqual(outbox.length, 2);
    const quota = outbox.find((e) => e.fields.kind === 'quota');
    assert.ok(quota, 'expected a quota report');
    assert.strictEqual(quota.fields.quota, true);
    assert.strictEqual(quota.fields.code, 'resource-exhausted');
});

test('reports held for quota are delivered in a later session, with their age', async () => {
    const first = makeEnv({ fetchStatus: 429 });
    first.fire('window', 'error', { error: { message: 'boom' } });
    await first.advance(4000);

    const later = makeEnv({ storage: Object.fromEntries(first.store) });
    await later.advance(8000);
    // Both sandboxes start from the same fake clock: the error was queued at
    // 0s and the quota report at 4s, and the later session sends at 8s.
    const sent = later.errorWrites().map(fieldsOf);
    const ageByKind = Object.fromEntries(sent.map((f) => [f.kind, f.ageSec]));
    assert.deepStrictEqual(ageByKind, { error: 8, quota: 4 });
    assert.strictEqual(later.outbox().length, 0);
});

test('a report the rules refuse is dropped, not retried forever', async () => {
    const env = makeEnv({ fetchStatus: 403 });
    env.fire('window', 'error', { error: { message: 'boom' } });
    await env.advance(4000);
    assert.strictEqual(env.outbox().length, 0);
});

test('offline keeps the report for the next flush', async () => {
    const env = makeEnv({ fetchStatus: 'offline' });
    env.fire('window', 'error', { error: { message: 'boom' } });
    await env.advance(4000);
    assert.strictEqual(env.outbox().length, 1);
    env.status.value = 200;
    env.fire('window', 'online', {});
    await env.advance(4000);
    assert.strictEqual(env.outbox().length, 0);
});

test('resource-exhausted errors are tagged as quota', () => {
    const env = makeEnv();
    env.context.vpReportError({ code: 'resource-exhausted', message: 'Quota exceeded.' }, 'firebase');
    assert.strictEqual(env.outbox()[0].fields.quota, true);
    env.context.vpReportError({ code: 'permission-denied', message: 'Missing or insufficient permissions.' }, 'firebase');
    assert.strictEqual(env.outbox()[1].fields.quota, false);
});

test('a Firestore request pending for 60s while visible is reported as a stall', async () => {
    const env = makeEnv();
    env.context.vpWatchPending(new Promise(() => {}));
    await env.advance(60000);
    assert.strictEqual(env.outbox()[0].fields.kind, 'stall');
});

test('a request that settles in time is not a stall', async () => {
    const env = makeEnv();
    env.context.vpWatchPending(Promise.resolve('ok'));
    await drain();
    await env.advance(60000);
    assert.strictEqual(env.outbox().length, 0);
});

test('time spent backgrounded is not counted as a stall', async () => {
    const env = makeEnv();
    env.context.vpWatchPending(new Promise(() => {}));
    await env.advance(1000);
    env.document.visibilityState = 'hidden';
    env.fire('document', 'visibilitychange', {});
    env.document.visibilityState = 'visible';
    await env.advance(60000);
    assert.strictEqual(env.outbox().filter((e) => e.fields.kind === 'stall').length, 0);
});

test('the reporter never throws, even with storage blocked', () => {
    const env = makeEnv({ storageThrows: true });
    assert.doesNotThrow(() => env.context.vpReportError(new Error('x'), 'manual'));
    assert.doesNotThrow(() => env.fire('window', 'error', { message: 'Script error.' }));
});

// --- installs.js -------------------------------------------------------------

test('a fresh install reports its open immediately, marked as new', async () => {
    const env = makeEnv();
    await drain();
    const [open] = env.installWrites();
    const f = fieldsOf(open);
    assert.match(open.body.writes[0].update.name, new RegExp('/installs/' + env.install().id + '_open$'));
    assert.strictEqual(f.stage, 'open');
    assert.strictEqual(f.existing, false);
    assert.strictEqual(f.android, 13);
    assert.strictEqual(f.chrome, 120);
    assert.strictEqual(env.install().openSent, true);
});

test('an install that already had a saved game reports as existing', async () => {
    const env = makeEnv({ storage: { vp_game_state: '{"balance":1000}' } });
    await drain();
    assert.strictEqual(fieldsOf(env.installWrites()[0]).existing, true);
});

test('booting sends the boot stage once, with launches and boot time', async () => {
    const env = makeEnv({ storage: { vp_referral_invited: 'AB12CD' } });
    await drain();
    await env.advance(1200);
    env.context.vpMarkBooted();
    env.context.vpMarkBooted();
    await env.advance(3000);
    const boots = env.installWrites().filter((r) => fieldsOf(r).stage === 'boot');
    assert.strictEqual(boots.length, 1);
    const f = fieldsOf(boots[0]);
    assert.strictEqual(f.bootMs, 1200);
    assert.strictEqual(f.opens, 1);
    assert.strictEqual(f.source, 'referral');
    assert.strictEqual(env.install().bootSent, true);
});

test('a launch that died before boot shows up as extra opens on the eventual boot', async () => {
    const first = makeEnv();
    await drain();
    const second = makeEnv({ storage: Object.fromEntries(first.store) });
    await drain();
    assert.strictEqual(second.installWrites().length, 0, 'open is sent only once per install');
    second.context.vpMarkBooted();
    await second.advance(3000);
    assert.strictEqual(fieldsOf(second.installWrites()[0]).opens, 2);
});

test('once booted, later launches send nothing', async () => {
    const first = makeEnv();
    first.context.vpMarkBooted();
    await first.advance(3000);
    const later = makeEnv({ storage: Object.fromEntries(first.store) });
    later.context.vpMarkBooted();
    await later.advance(3000);
    assert.strictEqual(later.installWrites().length, 0);
});

// --- firebaseSafe ------------------------------------------------------------

function loadFirebaseSafe(env) {
    vm.runInContext(FIREBASE_SAFE_SRC, env.context);
    env.context.window.vpReportError = env.context.vpReportError;
    env.context.window.vpWatchPending = env.context.vpWatchPending;
}

test('firebaseSafe reports a rejection when the caller passed no fallback', async () => {
    const env = makeEnv();
    loadFirebaseSafe(env);
    const result = await env.context.firebaseSafe(() => Promise.reject({ code: 'permission-denied', message: 'denied' }));
    assert.strictEqual(result, null);
    assert.strictEqual(env.outbox()[0].fields.kind, 'firebase');
    assert.strictEqual(env.outbox()[0].fields.code, 'permission-denied');
});

test('firebaseSafe leaves a failure to the caller\'s fallback when one is given', async () => {
    const env = makeEnv();
    loadFirebaseSafe(env);
    let handled = null;
    await env.context.firebaseSafe(() => Promise.reject({ code: 'x', message: 'y' }), (err) => { handled = err; });
    assert.strictEqual(handled.code, 'x');
    assert.strictEqual(env.outbox().length, 0);
});

test('firebaseSafe reports a synchronous throw, e.g. the SDK never loaded', () => {
    const env = makeEnv();
    loadFirebaseSafe(env);
    const result = env.context.firebaseSafe(() => { throw new TypeError("Cannot read properties of null (reading 'collection')"); });
    assert.strictEqual(result, null);
    assert.match(env.outbox()[0].fields.message, /reading 'collection'/);
});
