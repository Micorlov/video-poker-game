'use strict';

// Tests for the rating ask in js/review.js.
//
// First ask: Google Play's own in-app review sheet. Later asks: our "Enjoying
// Video Poker?" star card, which links to the Play listing — capped, cooled
// down, Android-only, and never stacked on top of another prompt. None of this
// is visible from a code read of game.js, and a regression either nags players
// or silently stops asking, so the gating is pinned down here.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..', '..');
const REVIEW_JS = path.join(ROOT, 'js', 'review.js');
const ANALYTICS_JS = path.join(ROOT, 'js', 'analytics.js');

// The event vocabulary is taken from the shipped analytics.js so a renamed or
// missing key fails here instead of logging `undefined` in production.
const ASO_EVENTS_DECL = fs.readFileSync(ANALYTICS_JS, 'utf8')
    .match(/const VP_ASO_EVENTS = Object\.freeze\(\{[\s\S]*?\}\);/)[0];

const DAY_MS = 24 * 60 * 60 * 1000;
const PROMPT_DELAY_MS = 3200;

function makeClassList(initial) {
    const set = new Set(initial);
    return {
        add: (c) => set.add(c),
        remove: (c) => set.delete(c),
        contains: (c) => set.has(c)
    };
}

// platform: 'android' | 'ios' | 'web'. `level` feeds getLocalLevel(). `lifetimeHands` feeds
// getLifetimeHands(), which decides whether the install is fresh enough to stamp a first day;
// it defaults to a played install so only the first-day tests opt into the stamp.
function makeEnv({ platform = 'android', level = 1, lifetimeHands = 4, today = 'Tue Oct 13 2026', storedReview } = {}) {
    const store = new Map();
    if (storedReview !== undefined) store.set('vp_review', storedReview);

    const clock = { now: 1_900_000_000_000 };
    const timers = [];
    const events = [];
    const calls = { nativeReview: 0, openRateGame: 0 };

    const reviewModal = { classList: makeClassList(['hidden']) };
    // Selectors review.js treats as "another prompt is on screen".
    const otherPrompt = { open: false };

    const sandbox = {
        console,
        JSON,
        Math,
        Object,
        Number,
        Promise,
        Date: { now: () => clock.now },
        setTimeout: (fn, ms) => { timers.push({ fn, ms }); return timers.length; },
        localStorage: {
            getItem: (k) => (store.has(k) ? store.get(k) : null),
            setItem: (k, v) => store.set(k, String(v)),
            removeItem: (k) => store.delete(k)
        },
        document: {
            getElementById: (id) => (id === 'review-prompt-modal' ? reviewModal : null),
            querySelector: () => (otherPrompt.open ? {} : null)
        },
        Capacitor: platform === 'web' ? undefined : {
            getPlatform: () => platform,
            isNativePlatform: () => true,
            Plugins: {
                InAppReview: { requestReview: () => { calls.nativeReview++; return Promise.resolve(); } }
            }
        },
        isNativeApp: () => platform !== 'web',
        getLocalLevel: () => level,
        getLifetimeHands: () => lifetimeHands,
        vpTodayKey: () => today,
        logVpEvent: (name, params) => events.push({ name, params }),
        openRateGame: () => { calls.openRateGame++; }
    };
    sandbox.window = sandbox;
    vm.createContext(sandbox);
    vm.runInContext(ASO_EVENTS_DECL, sandbox, { filename: 'analytics.js' });
    vm.runInContext(fs.readFileSync(REVIEW_JS, 'utf8'), sandbox, { filename: 'review.js' });

    return {
        sandbox, clock, timers, events, calls, reviewModal, otherPrompt, today,
        state: () => JSON.parse(store.get('vp_review') || 'null'),
        // One paying hand, then let any scheduled prompt fire. The default streak is long
        // enough to earn the ask; pass a shorter one to test a win that should not.
        win({ streak = 3, quality = true } = {}) {
            sandbox.vpOnWin(streak, quality);
            const due = timers.splice(0);
            due.forEach((t) => {
                assert.strictEqual(t.ms, PROMPT_DELAY_MS);
                t.fn();
            });
        },
        cardVisible: () => !reviewModal.classList.contains('hidden'),
        eventNames: () => events.map((e) => e.name)
    };
}

// A later app launch: same storage and clock, fresh session flags.
function relaunch(env, overrides = {}) {
    const next = makeEnv({ today: env.today, storedReview: JSON.stringify(env.state()), ...overrides });
    next.clock.now = env.clock.now;
    return next;
}

test('no ask before the player has earned it', () => {
    const env = makeEnv();
    env.win({ streak: 1 });
    env.win({ streak: 2 });
    assert.strictEqual(env.calls.nativeReview, 0);
    assert.strictEqual(env.cardVisible(), false);
    assert.strictEqual(env.state().wins, 2);
});

test('first earned ask is the native Play sheet, not the card', async () => {
    const env = makeEnv();
    env.win({ streak: 1 });
    env.win({ streak: 2 });
    env.win({ streak: 3 });
    await Promise.resolve();
    assert.strictEqual(env.calls.nativeReview, 1);
    assert.strictEqual(env.cardVisible(), false);
    assert.strictEqual(env.state().shown, true);
    assert.strictEqual(env.state().shownAt, env.clock.now);
    assert.ok(env.eventNames().includes('review_prompt_earned'));
});

test('a single win on the install day earns the ask', async () => {
    const env = makeEnv({ lifetimeHands: 0 });
    assert.strictEqual(env.state().firstDay, env.today, 'a fresh install is stamped at boot');

    env.win({ streak: 1 });
    await Promise.resolve();
    assert.strictEqual(env.calls.nativeReview, 1);
});

test('the first-day ask does not carry over to the next day', () => {
    let env = makeEnv({ lifetimeHands: 0 });
    env = relaunch(env, { lifetimeHands: 6, today: 'Wed Oct 14 2026' });

    env.win({ streak: 1 });
    assert.strictEqual(env.calls.nativeReview, 0);
    assert.strictEqual(env.state().shown, false);
});

test('an install with hands behind it is never stamped as first day', () => {
    const env = makeEnv({ lifetimeHands: 12 });
    assert.ok(!(env.state() || {}).firstDay, 'an upgrading player must not look brand new');

    env.win({ streak: 1 });
    assert.strictEqual(env.calls.nativeReview, 0);
});

test('reaching level 3 earns the ask without a streak', () => {
    const env = makeEnv({ level: 3 });
    env.win({ streak: 1 });
    assert.strictEqual(env.calls.nativeReview, 1);
});

test('star card waits 7 days after the native ask, then shows', () => {
    let env = makeEnv({ storedReview: JSON.stringify({ wins: 3, shown: true, shownAt: 1_900_000_000_000 }) });
    env.clock.now += 6 * DAY_MS;
    env.win();
    assert.strictEqual(env.cardVisible(), false, 'too soon after the native sheet');

    env = relaunch(env);
    env.clock.now += 1 * DAY_MS;
    env.win();
    assert.strictEqual(env.cardVisible(), true);
    assert.strictEqual(env.state().cardCount, 1);
    assert.strictEqual(env.state().lastCardAt, env.clock.now);
    assert.strictEqual(env.calls.nativeReview, 0, 'the native sheet is only ever the first ask');
    assert.ok(env.eventNames().includes('review_card_shown'));
});

test('at most one ask per session', () => {
    const env = makeEnv({ storedReview: JSON.stringify({ wins: 3, shown: true, shownAt: 1 }) });
    env.win();
    assert.strictEqual(env.cardVisible(), true);
    env.sandbox.dismissReviewPrompt();
    env.clock.now += 30 * DAY_MS;
    env.win();
    assert.strictEqual(env.cardVisible(), false);
    assert.strictEqual(env.state().cardCount, 1);
});

test('card cooldown restarts from the last card, and the lifetime cap is 3', () => {
    let env = makeEnv({ storedReview: JSON.stringify({ wins: 3, shown: true, shownAt: 1 }) });
    for (let shown = 1; shown <= 3; shown++) {
        env.win();
        assert.strictEqual(env.cardVisible(), true, 'card ' + shown);
        env.sandbox.dismissReviewPrompt();

        env = relaunch(env);
        env.clock.now += 6 * DAY_MS;
        env.win();
        assert.strictEqual(env.cardVisible(), false, 'cooldown after card ' + shown);

        env = relaunch(env);
        env.clock.now += 1 * DAY_MS;
    }
    env.win();
    assert.strictEqual(env.cardVisible(), false, 'no fourth card');
    assert.strictEqual(env.state().cardCount, 3);
});

test('Rate now opens the Play listing and the card never returns', () => {
    let env = makeEnv({ storedReview: JSON.stringify({ wins: 3, shown: true, shownAt: 1 }) });
    env.win();
    env.sandbox.acceptReviewPrompt();
    assert.strictEqual(env.calls.openRateGame, 1);
    assert.strictEqual(env.cardVisible(), false);
    assert.strictEqual(env.state().rated, true);
    assert.ok(env.eventNames().includes('review_card_rate'));

    env = relaunch(env);
    env.clock.now += 60 * DAY_MS;
    env.win();
    assert.strictEqual(env.cardVisible(), false);
});

test('Not now closes the card and logs the dismissal', () => {
    const env = makeEnv({ storedReview: JSON.stringify({ wins: 3, shown: true, shownAt: 1 }) });
    env.win();
    env.sandbox.dismissReviewPrompt();
    assert.strictEqual(env.cardVisible(), false);
    assert.strictEqual(env.state().rated, false);
    assert.ok(env.eventNames().includes('review_card_dismissed'));
});

test('another open prompt skips the ask without spending it', () => {
    const env = makeEnv({ storedReview: JSON.stringify({ wins: 3, shown: true, shownAt: 1 }) });
    env.otherPrompt.open = true;
    env.win();
    assert.strictEqual(env.cardVisible(), false);
    assert.strictEqual(env.state().cardCount, 0);

    env.otherPrompt.open = false;
    env.win();
    assert.strictEqual(env.cardVisible(), true, 'the next win in the same session may still ask');
});

test('another open prompt also defers the first native ask', () => {
    const env = makeEnv({ storedReview: JSON.stringify({ wins: 2 }) });
    env.otherPrompt.open = true;
    env.win();
    assert.strictEqual(env.calls.nativeReview, 0);
    assert.strictEqual(env.state().shown, false);
});

test('iOS gets the native sheet but never the Google Play card', () => {
    const env = makeEnv({ platform: 'ios', storedReview: JSON.stringify({ wins: 3, shown: true, shownAt: 1 }) });
    env.win();
    assert.strictEqual(env.cardVisible(), false);
});

test('the web build never asks', () => {
    const env = makeEnv({ platform: 'web', storedReview: JSON.stringify({ wins: 3, shown: true, shownAt: 1 }) });
    env.win();
    assert.strictEqual(env.cardVisible(), false);
    assert.strictEqual(env.calls.nativeReview, 0);
    assert.strictEqual(env.state().wins, 4, 'wins still count on the web');
});

test('a player upgrading from 2.7 (native ask done, no timestamp) waits 7 days for the card', () => {
    let env = makeEnv({ storedReview: JSON.stringify({ wins: 9, shown: true }) });
    env.win();
    assert.strictEqual(env.cardVisible(), false);

    env = relaunch(env);
    env.clock.now += 7 * DAY_MS;
    env.win();
    assert.strictEqual(env.cardVisible(), true);
});

test('corrupt stored state starts fresh instead of throwing', () => {
    const env = makeEnv({ storedReview: '{not json' });
    assert.doesNotThrow(() => env.win());
    assert.strictEqual(env.state().wins, 1);
});
