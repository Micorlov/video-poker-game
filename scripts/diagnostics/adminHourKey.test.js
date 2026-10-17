'use strict';

// The admin live board and the game must name the same hour document.
// js/champions.js files points at hourly/{YYYYMMDDHH}/entries (UTC).
// admin.html used to ask for a local key like 2026-10-17T17, so the
// player table read an empty path.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..', '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

const ADMIN_HOUR = read('admin.html').match(/function getHourKey\(offset\)[\s\S]*?\n    }/)[0];
const ADMIN_LABEL = read('admin.html').match(/function formatHourLabel\(hk\)[\s\S]*?\n    }/)[0];
const ADMIN_DAILY = read('admin.html').match(/function isDailyScoreKey\(key\)[\s\S]*?\n    }/)[0];
const GAME_HOUR = read('js/champions.js').match(/function getHourKey\(\)[\s\S]*?\n}/)[0];

function load(nowMs) {
    const RealDate = Date;
    const FrozenDate = new Proxy(RealDate, {
        construct(target, args) {
            return args.length ? new target(...args) : new target(nowMs);
        },
        get(target, prop) {
            if (prop === 'now') return () => nowMs;
            const value = target[prop];
            return typeof value === 'function' ? value.bind(target) : value;
        }
    });
    const context = vm.createContext({
        window: {},
        Date: FrozenDate,
        Math, String, Object
    });
    vm.runInContext(
        ADMIN_HOUR.replace('function getHourKey', 'function adminHourKey') + '\n' +
        ADMIN_LABEL + '\n' +
        ADMIN_DAILY + '\n' +
        GAME_HOUR.replace('function getHourKey', 'function gameHourKey'),
        context
    );
    const serverNow = () => new FrozenDate(nowMs);
    context.vpServerNow = serverNow;
    context.window.vpServerNow = serverNow;
    return context;
}

test('the admin hour key matches the key the game writes', () => {
    const env = load(Date.parse('2026-10-17T14:28:00Z'));
    assert.strictEqual(env.gameHourKey(), '2026101714');
    assert.strictEqual(env.adminHourKey(0), env.gameHourKey());
});

test('stepping back an hour stays on the UTC clock, including across midnight', () => {
    const env = load(Date.parse('2026-10-17T00:10:00Z'));
    assert.strictEqual(env.adminHourKey(0), '2026101700');
    assert.strictEqual(env.adminHourKey(-1), '2026101623');
});

test('the hour label reads the compact UTC key', () => {
    const env = load(Date.parse('2026-10-17T14:28:00Z'));
    assert.strictEqual(env.formatHourLabel('2026101714'), '2026-10-17  14:00 – 15:00 UTC');
    assert.strictEqual(env.formatHourLabel('2026101723'), '2026-10-17  23:00 – 00:00 UTC');
});

test('a compact hour key is not treated as a daily score', () => {
    const env = load(Date.parse('2026-10-17T14:28:00Z'));
    assert.strictEqual(env.isDailyScoreKey('2026101714'), false);
    assert.strictEqual(env.isDailyScoreKey('2026-10-17'), true);
});

const ROSTER_SRC = [
    read('admin.html').match(/function getLocalDayStr\(d\)[\s\S]*?\n    }/)[0],
    read('admin.html').match(/function stampDay\(ms\)[\s\S]*?\n    }/)[0],
    read('admin.html').match(/function mergeDailyRoster\(scores, users, opens, dayKey\)[\s\S]*?\n        return rows;\n    }/)[0]
].join('\n');

function rosterEnv() {
    const context = vm.createContext({ Date, Math, String, Object });
    vm.runInContext(ROSTER_SRC, context);
    return context;
}

test('the daily board includes guests and signed-in players who have no score', () => {
    const env = rosterEnv();
    const noon = Date.UTC(2026, 9, 17, 12);
    const day = env.stampDay(noon);
    const rows = env.mergeDailyRoster(
        [],
        [{ uid: 'u1', displayName: 'Ada', installId: 'inst-ada', loginMs: noon, lastMs: noon }],
        [
            { installId: 'inst-ada', firstMs: noon, lastMs: noon },
            { installId: 'guest99', firstMs: noon, lastMs: noon, playMs: 125000 }
        ],
        day
    );
    assert.deepStrictEqual(rows.map((r) => r.displayName).sort(), ['Ada', 'Guest guest9'].sort());
    assert.strictEqual(rows.find((r) => r.displayName === 'Guest guest9').playMs, 125000);
});

test('a scored player stays ahead of someone who only opened the app', () => {
    const env = rosterEnv();
    const noon = Date.UTC(2026, 9, 17, 12);
    const day = env.stampDay(noon);
    const rows = env.mergeDailyRoster(
        [{ uid: 'scored', displayName: 'Bea', score: 40 }],
        [{ uid: 'opened', displayName: 'Ada', loginMs: noon, lastMs: noon }],
        [],
        day
    );
    assert.deepStrictEqual(rows.map((r) => r.displayName), ['Bea', 'Ada']);
    assert.strictEqual(rows[1].score, null);
});

test('a player from another day is left off this day', () => {
    const env = rosterEnv();
    const noon = Date.UTC(2026, 9, 17, 12);
    const yesterday = noon - 24 * 60 * 60 * 1000;
    const day = env.stampDay(noon);
    const rows = env.mergeDailyRoster(
        [],
        [{ uid: 'old', displayName: 'Old', loginMs: yesterday, lastMs: yesterday }],
        [{ installId: 'old-guest', firstMs: yesterday, lastMs: yesterday }],
        day
    );
    assert.deepStrictEqual(rows, []);
});
