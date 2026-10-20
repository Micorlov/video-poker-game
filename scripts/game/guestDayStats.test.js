'use strict';

// Guests cannot write daily_scores (the rules require a signed-in uid). Their
// hands and score go on the install document as absolute totals for the local
// day. These two functions are the whole of that arithmetic.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const src = fs.readFileSync(path.join(__dirname, '..', '..', 'js', 'leaderboards.js'), 'utf8');
const chunk = src.match(/const GUEST_STATS_MAX_HANDS[\s\S]*?\nfunction guestDayStatsWrite\(stats\)[\s\S]*?\n}/)[0];

function load() {
    const context = vm.createContext({});
    vm.runInContext(chunk, context);
    return {
        after(stats, day, win, bet) {
            return vm.runInContext(
                `guestDayStatsAfterHand(${JSON.stringify(stats)}, ${JSON.stringify(day)}, ${win}, ${bet})`,
                context
            );
        },
        write(stats) {
            return vm.runInContext(`guestDayStatsWrite(${JSON.stringify(stats)})`, context);
        }
    };
}

test('a guest hand counts one deal and the chips it moved', () => {
    const env = load();
    const first = env.after(null, '2026-10-20', 0, 5);
    assert.deepStrictEqual(
        { day: first.day, hands: first.hands, score: first.score },
        { day: '2026-10-20', hands: 1, score: -5 }
    );
    const second = env.after(first, '2026-10-20', 25, 5);
    assert.strictEqual(second.hands, 2);
    assert.strictEqual(second.score, 15);
});

test('a new day starts again instead of adding to yesterday', () => {
    const env = load();
    const yesterday = env.after(null, '2026-10-19', 40, 5);
    yesterday.sentDay = '2026-10-19';
    yesterday.sentHands = 1;
    yesterday.sentScore = 35;
    const today = env.after(yesterday, '2026-10-20', 10, 5);
    assert.strictEqual(today.hands, 1);
    assert.strictEqual(today.score, 5);
    assert.strictEqual(today.sentHands, null);
});

test('the write is the absolute total, and a repeat is skipped', () => {
    const env = load();
    const stats = env.after(null, '2026-10-20', 10, 5);
    const write = env.write(stats);
    assert.strictEqual(write.statDay, '2026-10-20');
    assert.strictEqual(write.hands, 1);
    assert.strictEqual(write.score, 5);
    stats.sentDay = '2026-10-20';
    stats.sentHands = 1;
    stats.sentScore = 5;
    assert.strictEqual(env.write(stats), null);
});

test('a same-day hand count is sent in steps the rules allow', () => {
    const env = load();
    const stats = {
        day: '2026-10-20', hands: 8000, score: 10,
        sentDay: '2026-10-20', sentHands: 1000, sentScore: 10
    };
    assert.strictEqual(env.write(stats).hands, 6000);
});
