'use strict';

// Tests for the debounced Firestore writes added to cut write volume:
// pushDailyScore/flushDailyScore (js/leaderboards.js), pushNetProfit and its
// scheduler (js/rooms.js), and the presence heartbeat (js/presence.js).
//
// At ~1,000 writes per active user per day the project was consuming 45% of the
// Spark daily quota on 9 actives, and a quota denial is invisible client-side.
// The arithmetic that matters: batching FieldValue.increment deltas must land on
// exactly the same total as writing every hand separately.
//
// The three modules are loaded into a vm sandbox with a fake clock, a fake
// Firestore that records writes, and a stub firebaseSafe.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..', '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

// Only the pieces under test, so the sandbox needs no DOM-heavy dependencies.
const DAILY_SRC = read('js/leaderboards.js').match(
    /const DAILY_SCORE_DEBOUNCE_MS[\s\S]*?\n}\n(?=\nfunction pushDailyRebuy)/)[0];
const NET_PROFIT_SRC = read('js/rooms.js').match(
    /const NET_PROFIT_DEBOUNCE_MS[\s\S]*?\nfunction pushNetProfit\(\)[\s\S]*?\n}\n(?=\nfunction loadMyRooms)/)[0];
const PRESENCE_SRC = read('js/presence.js').match(
    /const PRESENCE_INTERVAL_MS[\s\S]*?\nconst PRESENCE_ONLINE_GRACE_MS = [^;]+;/)[0];
const IS_ONLINE_SRC = read('js/presence.js').match(/function isOnline\(lastSeen\)[\s\S]*?\n}/)[0];
const BEAT_SRC = read('js/presence.js').match(/function beatPresence\(\)[\s\S]*?\n}/)[0];

const STARTING_BALANCE = 1000;

function makeEnv({ rooms = [], signedIn = true } = {}) {
    const clock = { now: 1_900_000_000_000 };
    let timers = [];
    const writes = [];

    // Mirrors the fields the real SDK produces closely enough to assert on.
    const FieldValue = {
        increment: (n) => ({ __increment: n }),
        serverTimestamp: () => ({ __serverTimestamp: true })
    };

    const db = {
        collection: (name) => ({
            doc: (id) => ({
                set: (fields) => { writes.push({ collection: name, id, fields }); return Promise.resolve(); },
                collection: (sub) => ({
                    doc: (subId) => ({
                        set: (fields) => {
                            writes.push({ collection: `${name}/${id}/${sub}`, id: subId, fields });
                            return Promise.resolve();
                        }
                    })
                })
            })
        })
    };

    const sandbox = {
        db,
        firebase: { firestore: { FieldValue } },
        firebaseSafe: (op) => op(),
        window: {},
        document: { visibilityState: 'visible', addEventListener: () => {} },
        navigator: { language: 'en-US' },
        setTimeout: (fn, ms) => { const t = { fn, due: clock.now + ms }; timers.push(t); return t; },
        clearTimeout: (t) => { timers = timers.filter((x) => x !== t); },
        setInterval: () => null,
        clearInterval: () => {},
        Date: { now: () => clock.now },
        Math, JSON, String, Object, Array, Promise,
        console,
        t: (key) => key,
        STARTING_BALANCE,
        HAND_RANK: { Nothing: 0, 'Jacks or Better': 1, 'Two Pair': 2, Flush: 5, 'Royal Flush': 9 },
        // Collaborators the extracted functions call into.
        getDayKey: () => '2026-09-26',
        getCountry: () => 'US',
        ensureDailyBaseline: () => {},
        saveDailyProgress: () => {},
        dailyProgress: { date: '2026-09-26', baseline: STARTING_BALANCE, bestHandRank: 0, bestHand: 'Nothing' },
        ownDailyScore: null,
        balance: STARTING_BALANCE,
        bestStreak: 0,
        myRooms: rooms,
        netProfitBaseline: () => STARTING_BALANCE,
        ownDailyNetProfit: () => 0
    };
    const context = vm.createContext(sandbox);
    context.window.egUser = signedIn ? { uid: 'u1', displayName: 'Tester', photoURL: null } : null;

    vm.runInContext(`${PRESENCE_SRC}\n${IS_ONLINE_SRC}\n${BEAT_SRC}\n${DAILY_SRC}\n${NET_PROFIT_SRC}`, context);

    return {
        context, writes, clock,
        // Top-level `const` in a vm script is not reachable as a property of the
        // context object, so constants are read by evaluating their names.
        evaluate: (expr) => vm.runInContext(expr, context),
        async advance(ms) {
            clock.now += ms;
            const due = timers.filter((t) => t.due <= clock.now);
            timers = timers.filter((t) => t.due > clock.now);
            due.forEach((t) => t.fn());
            await new Promise((r) => setImmediate(r));
        },
        pending: () => timers.length,
        dailyWrites: () => writes.filter((w) => w.collection === 'daily_scores'),
        userWrites: () => writes.filter((w) => w.collection === 'users'),
        memberWrites: () => writes.filter((w) => w.collection.includes('/members'))
    };
}

// --- daily score batching ----------------------------------------------------

test('a burst of hands becomes one write instead of one per hand', async () => {
    // Arrange
    const env = makeEnv();

    // Act — ten hands inside the debounce window.
    for (let i = 0; i < 10; i++) env.context.pushDailyScore('Nothing', 0, 5);
    assert.strictEqual(env.dailyWrites().length, 0, 'nothing written while still batching');
    await env.advance(10000);

    // Assert
    assert.strictEqual(env.dailyWrites().length, 1);
});

// The whole reason batching is safe: increments add up.
test('the batched increment equals the sum of the per-hand deltas', async () => {
    // Arrange — a losing hand, a small win, a big win.
    const env = makeEnv();
    const hands = [
        { type: 'Nothing', win: 0, bet: 5 },
        { type: 'Jacks or Better', win: 5, bet: 5 },
        { type: 'Flush', win: 30, bet: 5 }
    ];
    const expected = hands.reduce((sum, h) => sum + h.win - h.bet, 0);

    // Act
    hands.forEach((h) => env.context.pushDailyScore(h.type, h.win, h.bet));
    await env.advance(10000);

    // Assert
    const [write] = env.dailyWrites();
    assert.strictEqual(write.fields.score.__increment, expected);
    assert.strictEqual(write.fields.score.__increment, 20);
    assert.strictEqual(write.fields.hands.__increment, 3);
});

test('the best hand of the batch is the one reported', async () => {
    // Arrange
    const env = makeEnv();

    // Act
    env.context.pushDailyScore('Jacks or Better', 5, 5);
    env.context.pushDailyScore('Flush', 30, 5);
    env.context.pushDailyScore('Two Pair', 10, 5);
    await env.advance(10000);

    // Assert — Flush outranks both neighbours, and a later lesser win must not
    // overwrite it.
    assert.strictEqual(env.dailyWrites()[0].fields.bestHand, 'Flush');
});

test('a batch with no new best hand omits the field rather than clearing it', async () => {
    // Arrange
    const env = makeEnv();
    env.context.dailyProgress.bestHandRank = 9; // a Royal already recorded today

    // Act
    env.context.pushDailyScore('Jacks or Better', 5, 5);
    await env.advance(10000);

    // Assert
    assert.ok(!('bestHand' in env.dailyWrites()[0].fields));
});

test('the write carries the identity fields the leaderboard and rules need', async () => {
    // Arrange
    const env = makeEnv();

    // Act
    env.context.pushDailyScore('Nothing', 0, 5);
    await env.advance(10000);

    // Assert — firestore.rules requires uid to match the writer.
    const [write] = env.dailyWrites();
    assert.strictEqual(write.id, '2026-09-26_u1');
    assert.strictEqual(write.fields.uid, 'u1');
    assert.strictEqual(write.fields.dayKey, '2026-09-26');
    assert.strictEqual(write.fields.country, 'US');
    assert.deepStrictEqual(write.fields.updatedAt, { __serverTimestamp: true });
});

// The UI reads ownDailyScore, and pushNetProfit reads it later in the same hand,
// so it cannot wait for the debounce.
test('the local score mirror updates on every hand, not on the flush', () => {
    // Arrange
    const env = makeEnv();
    env.context.ownDailyScore = { dayKey: '2026-09-26', score: 100 };

    // Act
    env.context.pushDailyScore('Flush', 30, 5);

    // Assert
    assert.strictEqual(env.context.ownDailyScore.score, 125);
    assert.strictEqual(env.dailyWrites().length, 0);
});

test('midnight mid-session sends the old day before batching the new one', async () => {
    // Arrange
    const env = makeEnv();
    env.context.pushDailyScore('Nothing', 0, 5);
    env.context.pushDailyScore('Nothing', 0, 5);

    // Act — the day rolls over, then another hand is played.
    env.context.getDayKey = () => '2026-09-27';
    env.context.pushDailyScore('Flush', 30, 5);
    await env.advance(10000);

    // Assert — two writes, each against its own day, neither delta lost.
    const writes = env.dailyWrites();
    assert.strictEqual(writes.length, 2);
    assert.strictEqual(writes[0].id, '2026-09-26_u1');
    assert.strictEqual(writes[0].fields.score.__increment, -10);
    assert.strictEqual(writes[1].id, '2026-09-27_u1');
    assert.strictEqual(writes[1].fields.score.__increment, 25);
});

test('an explicit flush sends the pending delta at once', () => {
    // Arrange
    const env = makeEnv();
    env.context.pushDailyScore('Nothing', 0, 5);

    // Act — what backgrounding the app triggers.
    env.context.flushDailyScore();

    // Assert
    assert.strictEqual(env.dailyWrites().length, 1);
    assert.strictEqual(env.pending(), 0, 'the timer is cancelled, not left to fire again');
});

test('flushing twice does not write twice', () => {
    // Arrange
    const env = makeEnv();
    env.context.pushDailyScore('Nothing', 0, 5);

    // Act — visibilitychange and pagehide can both fire for one exit.
    env.context.flushDailyScore();
    env.context.flushDailyScore();

    // Assert
    assert.strictEqual(env.dailyWrites().length, 1);
});

test('flushing with nothing pending writes nothing', () => {
    const env = makeEnv();
    env.context.flushDailyScore();
    assert.strictEqual(env.dailyWrites().length, 0);
});

// --- net profit batching -----------------------------------------------------

test('hands in one burst schedule a single profit write', async () => {
    // Arrange
    const env = makeEnv();

    // Act
    for (let i = 0; i < 8; i++) env.context.schedulePushNetProfit();
    await env.advance(10000);

    // Assert
    assert.strictEqual(env.userWrites().length, 1);
});

// A room multiplied the per-hand cost: one user doc plus one member doc each.
test('a room member write is batched along with the user write', async () => {
    // Arrange
    const env = makeEnv({ rooms: [{ id: 'r1' }, { id: 'r2' }] });

    // Act — five hands with two joined rooms: 15 writes before batching.
    for (let i = 0; i < 5; i++) env.context.schedulePushNetProfit();
    await env.advance(10000);

    // Assert — one flush: one user doc + one doc per room.
    assert.strictEqual(env.userWrites().length, 1);
    assert.strictEqual(env.memberWrites().length, 2);
});

test('an immediate write cancels a pending one instead of duplicating it', async () => {
    // Arrange
    const env = makeEnv();
    env.context.schedulePushNetProfit();

    // Act — a referral payout or sign-in needs the value to land now.
    env.context.pushNetProfit();
    await env.advance(10000);

    // Assert
    assert.strictEqual(env.userWrites().length, 1);
});

test('nothing is scheduled for a signed-out player', async () => {
    const env = makeEnv({ signedIn: false });
    env.context.schedulePushNetProfit();
    await env.advance(10000);
    assert.strictEqual(env.userWrites().length, 0);
});

// --- presence ----------------------------------------------------------------

test('the heartbeat is five minutes, not one', () => {
    const env = makeEnv();
    assert.strictEqual(env.evaluate('PRESENCE_INTERVAL_MS'), 5 * 60 * 1000);
});

test('a backgrounded app writes no heartbeat', () => {
    // Arrange
    const env = makeEnv();
    env.context.document.visibilityState = 'hidden';

    // Act
    env.context.beatPresence();

    // Assert
    assert.strictEqual(env.userWrites().length, 0);
});

test('a visible app writes its heartbeat', () => {
    const env = makeEnv();
    env.context.beatPresence();
    const [write] = env.userWrites();
    // Only lastSeen: the beat must not rewrite country or any other field.
    assert.deepStrictEqual(Object.keys(write.fields), ['lastSeen']);
    assert.strictEqual(write.fields.lastSeen.__serverTimestamp, true);
});

// The online dot must not blink off between two five-minute beats.
test('the online window is longer than the gap between heartbeats', () => {
    const env = makeEnv();
    const isOnline = env.context.isOnline;
    const PRESENCE_INTERVAL_MS = env.evaluate('PRESENCE_INTERVAL_MS');
    const PRESENCE_ONLINE_GRACE_MS = env.evaluate('PRESENCE_ONLINE_GRACE_MS');
    assert.ok(PRESENCE_ONLINE_GRACE_MS > PRESENCE_INTERVAL_MS);
    // A player mid-interval still counts as online.
    assert.strictEqual(isOnline(env.clock.now - (PRESENCE_INTERVAL_MS + 30000)), true);
    // Someone gone for an hour does not.
    assert.strictEqual(isOnline(env.clock.now - 60 * 60 * 1000), false);
    assert.strictEqual(isOnline(null), false);
});
