'use strict';

// Tests for the device-clock correction in js/telemetry.js and the day/hour keys
// that depend on it.
//
// daily_scores documents exist dated 2026-09-30 while the real date was
// 2026-09-26: getDayKey() built its key from the device's own clock, so a player
// with a fast clock filed scores under a day no leaderboard query reads.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..', '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

const SKEW_SRC = read('js/telemetry.js').match(
    /var vpClockSkewMs = 0;[\s\S]*?function vpClockSkewSeconds\(\)[\s\S]*?\n}/)[0];
const DAY_KEY_SRC = read('js/leaderboards.js').match(/function getDayKey\(offset\)[\s\S]*?\n}/)[0];
const HOUR_KEY_SRC = read('js/champions.js').match(/function getHourKey\(\)[\s\S]*?\n}/)[0];

// The device believes it is 2026-09-30 10:00 local; the truth is 2026-09-26.
const DEVICE_NOW = new Date('2026-09-30T10:00:00Z').getTime();
const TRUE_NOW = new Date('2026-09-26T10:00:00Z').getTime();

function makeEnv({ deviceNow = DEVICE_NOW } = {}) {
    const context = vm.createContext({
        window: {},
        Date, Math, String, Object, Promise, console,
        fetch: undefined
    });
    // Date.now is the device clock; real Date construction still works.
    context.Date = new Proxy(Date, {
        get: (target, prop) => (prop === 'now' ? () => deviceNow : target[prop])
    });
    vm.runInContext(`${SKEW_SRC}\n${DAY_KEY_SRC}\n${HOUR_KEY_SRC}`, context);
    context.window.vpServerNow = context.vpServerNow;
    return context;
}

test('a device clock that is right is left alone', () => {
    const env = makeEnv();
    env.vpNoteServerDate(new Date(DEVICE_NOW + 200).toUTCString());
    assert.strictEqual(env.vpClockSkewSeconds(), 0);
});

test('latency and rounding are not treated as a broken clock', () => {
    const env = makeEnv();
    // Half a minute out: within the tolerance, so no correction is applied.
    env.vpNoteServerDate(new Date(DEVICE_NOW - 30 * 1000).toUTCString());
    assert.strictEqual(env.vpClockSkewSeconds(), 0);
});

test('a clock days fast is corrected back to server time', () => {
    const env = makeEnv();
    env.vpNoteServerDate(new Date(TRUE_NOW).toUTCString());
    // toUTCString() has second precision, so compare on the day.
    assert.strictEqual(env.vpServerNow().toISOString().slice(0, 10), '2026-09-26');
    assert.ok(env.vpClockSkewSeconds() < 0, 'a fast device needs a negative correction');
});

test('a clock running slow is corrected forward', () => {
    const env = makeEnv({ deviceNow: new Date('2026-09-20T10:00:00Z').getTime() });
    env.vpNoteServerDate(new Date(TRUE_NOW).toUTCString());
    assert.strictEqual(env.vpServerNow().toISOString().slice(0, 10), '2026-09-26');
    assert.ok(env.vpClockSkewSeconds() > 0);
});

// The bug this exists to stop.
test('the day key follows the server, so a fast device stops filing future scores', () => {
    const env = makeEnv();
    assert.strictEqual(env.getDayKey(), '2026-09-30', 'uncorrected, the device wins');
    env.vpNoteServerDate(new Date(TRUE_NOW).toUTCString());
    assert.strictEqual(env.getDayKey(), '2026-09-26');
});

test('the day key still offsets by whole days', () => {
    const env = makeEnv();
    env.vpNoteServerDate(new Date(TRUE_NOW).toUTCString());
    assert.strictEqual(env.getDayKey(-1), '2026-09-25');
    assert.strictEqual(env.getDayKey(1), '2026-09-27');
});

test('the hourly key follows the server too', () => {
    const env = makeEnv();
    assert.strictEqual(env.getHourKey(), '2026093010');
    env.vpNoteServerDate(new Date(TRUE_NOW).toUTCString());
    assert.strictEqual(env.getHourKey(), '2026092610');
});

test('an unparseable or missing date header changes nothing', () => {
    const env = makeEnv();
    env.vpNoteServerDate(new Date(TRUE_NOW).toUTCString());
    const corrected = env.vpClockSkewSeconds();
    env.vpNoteServerDate(null);
    env.vpNoteServerDate('not a date');
    env.vpNoteServerDate('');
    assert.strictEqual(env.vpClockSkewSeconds(), corrected);
});

// Without the fallback, a bundle where telemetry failed to load would throw on
// every hand instead of merely being uncorrected.
test('the keys still work when the correction never loaded', () => {
    const env = makeEnv();
    env.window.vpServerNow = undefined;
    assert.strictEqual(env.getDayKey(), '2026-09-30');
    assert.strictEqual(env.getHourKey(), '2026093010');
});
