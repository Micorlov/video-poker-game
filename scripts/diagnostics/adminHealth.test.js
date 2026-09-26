'use strict';

// Tests for the Health tab's pure logic in admin.html: grouping error reports,
// pairing install open/boot docs, and escaping. The page itself needs a Google
// sign-in to open, so the functions are extracted and driven directly.
//
// Escaping matters more than usual here: both collections accept writes from
// unauthenticated clients, so every value on this tab is attacker-controlled.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ADMIN = fs.readFileSync(path.join(__dirname, '..', '..', 'admin.html'), 'utf8');

function extract(pattern) {
    const m = ADMIN.match(pattern);
    if (!m) throw new Error('could not find ' + pattern);
    return m[0];
}

const SRC = [
    extract(/var HEALTH_ERROR_DAYS[\s\S]*?var HEALTH_BOOT_GRACE_MS = [^;]+;/),
    extract(/function escapeHtml\(value\)[\s\S]*?\n    }\n/),
    extract(/function tsMillis\(ts\)[\s\S]*?\n    }/),
    extract(/function median\(values\)[\s\S]*?\n    }/),
    extract(/function groupErrors\(reports\)[\s\S]*?\n    }/),
    extract(/function collectInstalls\(docs\)[\s\S]*?\n    }/),
    extract(/function hasComeBack\(row\)[\s\S]*?\n    }/),
    extract(/function isNeverBooted\(row\)[\s\S]*?\n    }/)
].join('\n');

const NOW = 1_900_000_000_000;

function load() {
    const context = vm.createContext({
        Date: new Proxy(Date, { get: (t, p) => (p === 'now' ? () => NOW : t[p]) }),
        Math, Object, String, JSON, Array
    });
    vm.runInContext(SRC, context);
    return context;
}

const ts = (millis) => ({ toMillis: () => millis });

function report(over) {
    return Object.assign({
        kind: 'error', message: 'boom', code: '', version: '2.9', screen: 'play',
        installId: 'dev1', count: 1, quota: false, stack: '', at: ts(NOW)
    }, over);
}

// --- escaping ----------------------------------------------------------------

test('every HTML metacharacter in a client-supplied message is escaped', () => {
    const env = load();
    const escaped = env.escapeHtml('<img src=x onerror="alert(1)">&\'');
    assert.strictEqual(escaped, '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;&amp;&#39;');
    assert.ok(!escaped.includes('<'));
});

test('escaping handles a missing value without printing "null"', () => {
    const env = load();
    assert.strictEqual(env.escapeHtml(null), '');
    assert.strictEqual(env.escapeHtml(undefined), '');
    assert.strictEqual(env.escapeHtml(0), '0');
});

// --- grouping errors ---------------------------------------------------------

test('the same message on the same version is one row', () => {
    const env = load();
    const groups = env.groupErrors([report(), report(), report()]);
    assert.strictEqual(groups.length, 1);
    assert.strictEqual(groups[0].hits, 3);
});

test('the same message on two versions stays two rows', () => {
    const env = load();
    const groups = env.groupErrors([report({ version: '2.8' }), report({ version: '2.9' })]);
    assert.strictEqual(groups.length, 2);
});

// A report's `count` is how many times it repeated before being sent, so hits
// must sum counts rather than count documents.
test('hits sum the per-report repeat counts', () => {
    const env = load();
    const groups = env.groupErrors([report({ count: 5 }), report({ count: 3 })]);
    assert.strictEqual(groups[0].hits, 8);
});

test('rows are ordered by hits, worst first', () => {
    const env = load();
    const groups = env.groupErrors([
        report({ message: 'rare' }),
        report({ message: 'common', count: 40 }),
        report({ message: 'middling', count: 5 })
    ]);
    assert.deepStrictEqual(groups.map((g) => g.message), ['common', 'middling', 'rare']);
});

test('one device reporting repeatedly is not counted as many devices', () => {
    const env = load();
    const groups = env.groupErrors([
        report({ installId: 'dev1' }), report({ installId: 'dev1' }), report({ installId: 'dev2' })
    ]);
    assert.strictEqual(Object.keys(groups[0].devices).length, 2);
});

// "Missing or insufficient permissions." on two collections is two bugs.
test('the same message from two failed operations stays two rows', () => {
    const env = load();
    const groups = env.groupErrors([
        report({ op: 'set daily_scores/*' }), report({ op: 'set users/*' }), report({ op: 'set users/*' })
    ]);
    assert.deepStrictEqual(groups.map((g) => [g.op, g.hits]), [['set users/*', 2], ['set daily_scores/*', 1]]);
});

test('reports from builds without op still group together', () => {
    const env = load();
    const groups = env.groupErrors([report(), report()]);
    assert.strictEqual(groups.length, 1);
    assert.strictEqual(groups[0].op, '');
});

test('a group is flagged for quota if any of its reports was', () => {
    const env = load();
    const groups = env.groupErrors([report(), report({ quota: true })]);
    assert.strictEqual(groups[0].quota, true);
});

test('a group records the latest time it was seen', () => {
    const env = load();
    const groups = env.groupErrors([
        report({ at: ts(NOW - 5000) }), report({ at: ts(NOW) }), report({ at: ts(NOW - 90000) })
    ]);
    assert.strictEqual(groups[0].lastAt, NOW);
});

test('no reports means no rows rather than an error', () => {
    const env = load();
    assert.deepStrictEqual(env.groupErrors([]), []);
});

// --- install funnel ----------------------------------------------------------

const openDoc = (id, over) => Object.assign({ stage: 'open', installId: id, existing: false, at: ts(NOW - 3600000), version: '2.9', platform: 'android', opens: 1 }, over);
const bootDoc = (id, over) => Object.assign({ stage: 'boot', installId: id, existing: false, at: ts(NOW - 3599000), version: '2.9', platform: 'android', opens: 1, bootMs: 800 }, over);

test('an install open and boot pair into one row', () => {
    const env = load();
    const rows = env.collectInstalls([openDoc('a'), bootDoc('a')]);
    assert.strictEqual(rows.length, 1);
    assert.ok(rows[0].open && rows[0].boot);
});

// The question the tab exists to answer.
test('an install that opened and never booted is identified', () => {
    const env = load();
    const rows = env.collectInstalls([openDoc('dead'), openDoc('alive'), bootDoc('alive')]);
    const dead = rows.filter(env.isNeverBooted);
    assert.deepStrictEqual(dead.map((r) => r.id), ['dead']);
});

// Otherwise every install currently starting up would be counted as a failure.
test('an install that opened seconds ago is not yet counted as failed', () => {
    const env = load();
    const rows = env.collectInstalls([openDoc('booting', { at: ts(NOW - 5000) })]);
    assert.strictEqual(env.isNeverBooted(rows[0]), false);
});

// Upgrades from builds before install tracking report once and would otherwise
// inflate the new-install count.
test('upgrades from older builds are left out of the funnel', () => {
    const env = load();
    const rows = env.collectInstalls([
        openDoc('upgrade', { existing: true }), bootDoc('upgrade', { existing: true }),
        openDoc('fresh'), bootDoc('fresh')
    ]);
    assert.deepStrictEqual(rows.map((r) => r.id), ['fresh']);
});

test('an install seen only at boot is not reported as never booted', () => {
    const env = load();
    const rows = env.collectInstalls([bootDoc('bootonly')]);
    assert.strictEqual(env.isNeverBooted(rows[0]), false);
});

test('median boot time ignores ordering and picks the middle', () => {
    const env = load();
    assert.strictEqual(env.median([900, 100, 500]), 500);
    assert.strictEqual(env.median([]), 0);
});

test('a missing timestamp reads as zero rather than throwing', () => {
    const env = load();
    assert.strictEqual(env.tsMillis(null), 0);
    assert.strictEqual(env.tsMillis({}), 0);
    assert.strictEqual(env.tsMillis(ts(1234)), 1234);
});

// --- launches ----------------------------------------------------------------

test('an install has come back once its open doc counts a second launch', () => {
    const env = load();
    assert.strictEqual(env.hasComeBack({ open: openDoc('a', { opens: 2 }), boot: null }), true);
    assert.strictEqual(env.hasComeBack({ open: openDoc('a'), boot: bootDoc('a') }), false);
    assert.strictEqual(env.hasComeBack({ open: null, boot: bootDoc('a', { opens: 3 }) }), false,
        'the boot doc counts launches until boot, not launches since');
});
