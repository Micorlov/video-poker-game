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

const COUNTRY_LOOKUP = /ipapi\.co|api\.country\.is|ipwho\.is/;

// country: what the IP lookups answer — a code, null when every provider
// fails, or 'pending' when none of them ever answers.
// referrer: the raw Play install referrer MainActivity parks on window.
function makeEnv({
    storage = {}, fetchStatus = 200, platform = 'android', storageThrows = false,
    country = 'IL', referrer = null, search = ''
} = {}) {
    const store = new Map(Object.entries(storage));
    const clock = { now: 1_900_000_000_000 };
    let timers = [];
    const listeners = { window: {}, document: {} };
    const requests = [];
    const countryLookups = [];
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
    if (referrer) window.__installReferrerRaw = referrer;

    const answerCountry = () => {
        if (country === 'pending') return new Promise(() => {});
        if (!country) return Promise.reject(new TypeError('Failed to fetch'));
        return Promise.resolve({
            ok: true, status: 200,
            text: () => Promise.resolve(country + '\n'),
            json: () => Promise.resolve({ country, country_code: country })
        });
    };

    const fetch = (url, opts) => {
        if (COUNTRY_LOOKUP.test(url)) {
            countryLookups.push(url);
            return answerCountry();
        }
        requests.push({ url, body: JSON.parse(opts.body) });
        if (status.value === 'offline') return Promise.reject(new TypeError('Failed to fetch'));
        return Promise.resolve({ ok: status.value >= 200 && status.value < 300, status: status.value });
    };

    const context = vm.createContext({
        window, document, localStorage, fetch,
        location: { search },
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
        context, store, requests, countryLookups, status, document, listeners,
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
        installWrites() { return this.docWrites('installs'); },
        installCreates() { return this.installWrites().filter((r) => r.body.writes[0].currentDocument.exists === false); },
        installUpdates() { return this.installWrites().filter((r) => r.body.writes[0].currentDocument.exists === true); }
    };
}

// The next launch of the same install: a fresh page with the storage the last
// one left behind.
function relaunch(previous, options = {}) {
    return makeEnv(Object.assign({ storage: Object.fromEntries(previous.store) }, options));
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

test('a fresh install reports its open once the country is known, marked as new', async () => {
    const env = makeEnv();
    await drain();
    const [open] = env.installCreates();
    const f = fieldsOf(open);
    assert.match(open.body.writes[0].update.name, new RegExp('/installs/' + env.install().id + '_open$'));
    assert.strictEqual(f.stage, 'open');
    assert.strictEqual(f.existing, false);
    assert.strictEqual(f.opens, 1);
    assert.strictEqual(f.country, 'IL');
    assert.strictEqual(f.android, 13);
    assert.strictEqual(f.chrome, 120);
    assert.strictEqual(env.install().openSent, true);
});

test('an install that already had a saved game reports as existing', async () => {
    const env = makeEnv({ storage: { vp_game_state: '{"balance":1000}' } });
    await drain();
    assert.strictEqual(fieldsOf(env.installCreates()[0]).existing, true);
});

// en-GB on a phone in Israel was reported as GB by the open stage and IL by
// the boot stage two seconds later. A guess from the device language is worse
// than no answer: it silently skews every country breakdown.
test('the country is never guessed from the device language', async () => {
    const env = makeEnv({ country: null });
    await drain();
    assert.strictEqual(fieldsOf(env.installCreates()[0]).country, '');
});

test('the open stage waits for the country lookup, but not for ever', async () => {
    const env = makeEnv({ country: 'pending' });
    await drain();
    assert.strictEqual(env.installWrites().length, 0, 'held while the lookup is in flight');
    await env.advance(5000);
    const [open] = env.installCreates();
    assert.strictEqual(fieldsOf(open).country, '');
});

test('the country is looked up once per launch, however many stages need it', async () => {
    const env = makeEnv();
    await drain();
    env.context.vpMarkBooted();
    await env.advance(3000);
    assert.strictEqual(env.installCreates().length, 2);
    assert.strictEqual(env.countryLookups.length, 1);
});

test('an invite install is attributed from the install referrer at the open stage', async () => {
    const env = makeEnv({ referrer: 'ref=AB12CD' });
    await drain();
    assert.strictEqual(fieldsOf(env.installCreates()[0]).source, 'referral');
});

test('a Play organic install is attributed as organic', async () => {
    const env = makeEnv({ referrer: 'utm_source=google-play&utm_medium=organic' });
    await drain();
    assert.strictEqual(fieldsOf(env.installCreates()[0]).source, 'organic');
});

test('a campaign install keeps its campaign source', async () => {
    const env = makeEnv({ referrer: 'utm_source=tiktok&utm_medium=cpc' });
    await drain();
    assert.strictEqual(fieldsOf(env.installCreates()[0]).source, 'tiktok');
});

test('on the web a utm_source in the URL is the source, and no signal is organic', async () => {
    const tagged = makeEnv({ platform: 'web', search: '?utm_source=reddit&utm_medium=social' });
    const plain = makeEnv({ platform: 'web' });
    await drain();
    assert.strictEqual(fieldsOf(tagged.installCreates()[0]).source, 'reddit');
    assert.strictEqual(fieldsOf(plain.installCreates()[0]).source, 'organic');
});

// On Android, Play answers the install referrer asynchronously on the first
// launch only. Before it answers the source is unknown — not organic.
test('a native install with no referrer yet is left unattributed rather than called organic', async () => {
    const env = makeEnv();
    await drain();
    assert.strictEqual(fieldsOf(env.installCreates()[0]).source, '');
});

test('a source learned once is remembered for later launches', async () => {
    const first = makeEnv({ referrer: 'utm_source=google-play&utm_medium=organic' });
    await drain();
    first.context.vpMarkBooted();
    await first.advance(3000);
    // MainActivity asks Play only once, so a later launch has no referrer.
    const later = relaunch(first);
    await drain();
    assert.strictEqual(later.install().source, 'organic');
});

test('booting sends the boot stage once, with launches and boot time', async () => {
    const env = makeEnv({ storage: { vp_referral_invited: 'AB12CD' } });
    await drain();
    await env.advance(1200);
    env.context.vpMarkBooted();
    env.context.vpMarkBooted();
    await env.advance(3000);
    const boots = env.installCreates().filter((r) => fieldsOf(r).stage === 'boot');
    assert.strictEqual(boots.length, 1);
    const f = fieldsOf(boots[0]);
    assert.strictEqual(f.bootMs, 1200);
    assert.strictEqual(f.opens, 1);
    assert.strictEqual(f.source, 'referral');
    assert.strictEqual(f.country, 'IL');
    assert.strictEqual(env.install().bootSent, true);
});

test('a launch that died before boot shows up as extra opens on the eventual boot', async () => {
    const first = makeEnv();
    await drain();
    const second = relaunch(first);
    await drain();
    assert.strictEqual(second.installCreates().length, 0, 'the open stage is created only once per install');
    second.context.vpMarkBooted();
    await second.advance(3000);
    assert.strictEqual(fieldsOf(second.installCreates()[0]).opens, 2);
});

// `opens` used to be frozen at 1: the open doc was create-only, so no later
// launch could move it. Launch frequency is exactly what retention lacks.
test('every later launch moves the open stage\'s counter forward, stamped by the server', async () => {
    const first = makeEnv();
    await drain();
    first.context.vpMarkBooted();
    await first.advance(3000);

    const second = relaunch(first);
    await drain();
    const third = relaunch(second);
    await drain();

    const [update] = third.installUpdates();
    const write = update.body.writes[0];
    assert.match(write.update.name, new RegExp('/installs/' + first.install().id + '_open$'));
    assert.deepStrictEqual(write.updateMask.fieldPaths, ['opens']);
    assert.deepStrictEqual(write.updateTransforms, [{ fieldPath: 'lastOpenAt', setToServerValue: 'REQUEST_TIME' }]);
    assert.strictEqual(fieldsOf(update).opens, 3);
    assert.strictEqual(third.installCreates().length, 0);
});

// Absolute counts, not increments: a launch whose send failed is folded into
// the next one instead of being lost, and a resend can never double-count.
test('a launch that could not be sent is carried by the next one', async () => {
    const first = makeEnv();
    await drain();
    const offline = relaunch(first, { fetchStatus: 'offline' });
    await drain();
    const next = relaunch(offline);
    await drain();
    assert.strictEqual(fieldsOf(next.installUpdates()[0]).opens, 3);
});

test('a later launch fills in the country and source the open stage could not know', async () => {
    const first = makeEnv({ country: null });
    await drain();
    first.store.set('vp_referral_invited', 'AB12CD');
    const second = relaunch(first);
    await drain();
    const [update] = second.installUpdates();
    assert.deepStrictEqual(update.body.writes[0].updateMask.fieldPaths.slice().sort(), ['country', 'opens', 'source']);
    assert.strictEqual(fieldsOf(update).country, 'IL');
    assert.strictEqual(fieldsOf(update).source, 'referral');

    // Filled once: the launch after that sends only the count.
    const third = relaunch(second);
    await drain();
    assert.deepStrictEqual(third.installUpdates()[0].body.writes[0].updateMask.fieldPaths, ['opens']);
});

// Installs first tracked by the earlier build already sent a country that may
// be a language guess. The rules only let an empty country be filled, so
// trying to correct one would get the whole launch refused.
test('an install tracked by an earlier build only ever sends its count', async () => {
    const legacy = { id: 'FkVrnzB350K8hllAG8ST', existing: true, openSent: true, bootSent: true, opens: 1 };
    const env = makeEnv({ storage: { vp_install: JSON.stringify(legacy), vp_referral_invited: 'AB12CD' } });
    await drain();
    const [update] = env.installUpdates();
    assert.deepStrictEqual(update.body.writes[0].updateMask.fieldPaths, ['opens']);
    assert.strictEqual(fieldsOf(update).opens, 2);
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

// --- which operation failed --------------------------------------------------
//
// A permission-denied from Firestore names neither the collection nor the
// operation, so the one real bug found so far took reading the deployed rules
// line by line. Every Firestore entry point now tags its own failures.

const TAGGING_SRC = FIREBASE_SRC
    .match(/function vpCollectionPattern[\s\S]*?\nfunction tagFirestoreFailures\(\) \{[\s\S]*?\n}\n/)[0];

const DENIED = () => ({ code: 'permission-denied', message: 'Missing or insufficient permissions.' });

// Stand-ins for the compat SDK classes, each failing or succeeding on demand.
function fakeFirestoreSdk() {
    class Query {
        constructor(delegate) { this._delegate = delegate; }
        get() { return this.outcome === 'ok' ? Promise.resolve('snapshot') : Promise.reject(DENIED()); }
    }
    class CollectionReference extends Query {
        constructor(path) { super(null); this.path = path; }
        add() { return Promise.reject(DENIED()); }
    }
    class DocumentReference {
        constructor(path, outcome) { this.path = path; this.outcome = outcome; }
        get() { return Promise.reject(DENIED()); }
        set() { return this.outcome === 'ok' ? Promise.resolve(undefined) : Promise.reject(DENIED()); }
        update() { return Promise.reject(DENIED()); }
        delete() { return Promise.reject(DENIED()); }
    }
    class WriteBatch { commit() { return Promise.reject(DENIED()); } }
    class Firestore { runTransaction() { return Promise.reject(DENIED()); } }
    return { Query, CollectionReference, DocumentReference, WriteBatch, Firestore };
}

function loadTagging(env) {
    const sdk = fakeFirestoreSdk();
    env.context.firebase = { firestore: sdk };
    vm.runInContext(TAGGING_SRC, env.context);
    env.context.tagFirestoreFailures();
    return sdk;
}

const rejectionOf = (promise) => promise.then(() => assert.fail('expected a rejection'), (err) => err);

test('a failed write names its operation and collection, not the document ids', async () => {
    const env = makeEnv();
    const sdk = loadTagging(env);
    const err = await rejectionOf(new sdk.DocumentReference('daily_scores/2026-09-27_u1').set({}));
    assert.strictEqual(err.__vpOp, 'set daily_scores/*');
    assert.strictEqual(err.code, 'permission-denied', 'the error itself is passed through untouched');
});

test('nested paths keep every collection name', async () => {
    const env = makeEnv();
    const sdk = loadTagging(env);
    const err = await rejectionOf(new sdk.DocumentReference('hourly/2026092712/entries/u1').update({}));
    assert.strictEqual(err.__vpOp, 'update hourly/*/entries/*');
});

test('reads, adds, queries, batches and transactions are tagged too', async () => {
    const env = makeEnv();
    const sdk = loadTagging(env);
    const q = new sdk.Query({ _query: { collectionGroup: 'entries' } });
    const ops = await Promise.all([
        rejectionOf(new sdk.DocumentReference('users/u1').get()),
        rejectionOf(new sdk.DocumentReference('users/u1').delete()),
        rejectionOf(new sdk.CollectionReference('rooms').add({})),
        rejectionOf(new sdk.CollectionReference('rooms').get()),
        rejectionOf(q.get()),
        rejectionOf(new sdk.WriteBatch().commit()),
        rejectionOf(new sdk.Firestore().runTransaction(() => {}))
    ]);
    assert.deepStrictEqual(ops.map((e) => e.__vpOp), [
        'get users/*', 'delete users/*', 'add rooms', 'query rooms', 'query entries (group)',
        'batch commit', 'transaction'
    ]);
});

test('a successful operation resolves exactly as before', async () => {
    const env = makeEnv();
    const sdk = loadTagging(env);
    assert.strictEqual(await new sdk.DocumentReference('users/u1', 'ok').set({}), undefined);
});

test('the report carries the operation that failed', async () => {
    const env = makeEnv();
    loadFirebaseSafe(env);
    const sdk = loadTagging(env);
    await env.context.firebaseSafe(() => new sdk.DocumentReference('daily_scores/2026-09-27_u1').set({}));
    assert.strictEqual(env.outbox()[0].fields.op, 'set daily_scores/*');
    await env.advance(4000);
    assert.strictEqual(fieldsOf(env.errorWrites()[0]).op, 'set daily_scores/*');
});

test('an error that is not a Firestore operation reports an empty op', () => {
    const env = makeEnv();
    env.fire('window', 'error', { error: new TypeError('x is undefined') });
    assert.strictEqual(env.outbox()[0].fields.op, '');
});

test('the same denial on two collections is two reports, not one', async () => {
    const env = makeEnv();
    loadFirebaseSafe(env);
    const sdk = loadTagging(env);
    await env.context.firebaseSafe(() => new sdk.DocumentReference('daily_scores/d_u1').set({}));
    await env.context.firebaseSafe(() => new sdk.DocumentReference('users/u1').set({}));
    assert.deepStrictEqual(env.outbox().map((e) => e.fields.op), ['set daily_scores/*', 'set users/*']);
});
