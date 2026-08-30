'use strict';

// Regression tests for the mid-hand bet-switch payout exploit.
//
// deal() charges `bet * multiHandCount` up front, but draw() computes the
// payout from whatever `bet` holds at draw time. If the bet can still be
// changed while gameState === 'hold', a player deals cheap, raises the stake,
// and gets paid at the higher one. The bet must be locked once a hand is dealt.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const GAME_JS = path.join(__dirname, '..', '..', 'js', 'game.js');

// game.js is a browser-global script that touches the DOM freely. These stubs
// absorb the DOM calls so the real betting logic can run under node:test.
function makeElement() {
    return {
        style: {},
        dataset: {},
        classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
        textContent: '',
        innerHTML: '',
        children: [],
        offsetWidth: 100,
        offsetHeight: 100,
        appendChild() {},
        insertBefore() {},
        removeChild() {},
        remove() {},
        setAttribute() {},
        getAttribute: () => null,
        addEventListener() {},
        removeEventListener() {},
        querySelector: () => makeElement(),
        querySelectorAll: () => [],
        cloneNode: () => makeElement(),
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }),
        focus() {},
        click() {}
    };
}

function makeSandbox() {
    const store = new Map();
    const localStorage = {
        getItem: (k) => (store.has(k) ? store.get(k) : null),
        setItem: (k, v) => store.set(k, String(v)),
        removeItem: (k) => store.delete(k),
        clear: () => store.clear()
    };

    const document = {
        getElementById: () => makeElement(),
        querySelector: () => makeElement(),
        querySelectorAll: () => [],
        createElement: () => makeElement(),
        addEventListener() {},
        removeEventListener() {},
        body: makeElement(),
        documentElement: makeElement()
    };

    const sandbox = {
        document,
        localStorage,
        console,
        Math,
        JSON,
        Date,
        setTimeout: () => 0,
        clearTimeout: () => {},
        setInterval: () => 0,
        clearInterval: () => {},
        requestAnimationFrame: () => 0,
        navigator: { vibrate: () => {} },

        // Helpers game.js expects from its sibling scripts (audio.js, ui.js,
        // progress.js, push.js, ...). Betting logic doesn't depend on their
        // effects, so no-ops are enough to let deal()/draw() run.
        addLifetimeHand: () => {},
        checkAndUpdateBestHand: () => {},
        closeSheet: () => {},
        openSheet: () => {},
        firebaseSafe: () => {},
        getLocalLevel: () => 1,
        playSound: () => {},
        recordAllTimeHand: () => {},
        renderPlayFriendsWidgets: () => {},
        renderStatsScreen: () => {},
        showToast: () => {},
        triggerHaptic: () => {},
        triggerWinCelebration: () => {}
    };
    sandbox.window = sandbox;
    sandbox.globalThis = sandbox;
    return sandbox;
}

// Top-level `let` bindings in a classic script aren't global-object properties,
// so expose them through an explicit probe appended to the source.
const PROBE = `
;globalThis.__probe = function () {
    return { bet: bet, gameState: gameState, balance: balance,
             multiHandCount: multiHandCount, allInUsesToday: allInUsesToday };
};
globalThis.__call = function (name, arg) { return eval(name)(arg); };
globalThis.__setGameState = function (v) { gameState = v; };
`;

function loadGame() {
    const sandbox = makeSandbox();
    const context = vm.createContext(sandbox);
    const source = fs.readFileSync(GAME_JS, 'utf8') + PROBE;
    vm.runInContext(source, context, { filename: 'game.js' });
    return sandbox;
}

test('bet cannot be raised after the hand is dealt', () => {
    // Arrange
    const game = loadGame();
    game.__call('setBet', 5);
    assert.strictEqual(game.__probe().bet, 5, 'precondition: bet starts at 5');

    // Act
    game.__call('deal');
    assert.strictEqual(game.__probe().gameState, 'hold', 'precondition: hand is dealt');
    game.__call('setBet', 50);

    // Assert
    assert.strictEqual(game.__probe().bet, 5,
        'bet must stay at the amount actually charged at deal time');
});

test('bet can still be changed before dealing', () => {
    // Arrange
    const game = loadGame();

    // Act
    game.__call('setBet', 20);

    // Assert
    assert.strictEqual(game.__probe().gameState, 'bet');
    assert.strictEqual(game.__probe().bet, 20, 'betting is unrestricted before the deal');
});

test('bet is unlocked again once the hand resolves', () => {
    // Arrange
    const game = loadGame();
    game.__call('setBet', 5);
    game.__call('deal');

    // Act
    game.__call('draw');
    game.__call('setBet', 50);

    // Assert
    assert.strictEqual(game.__probe().gameState, 'bet');
    assert.strictEqual(game.__probe().bet, 50, 'next hand may use a new stake');
});

test('All In mid-hand raises the stake by exactly the remaining balance', () => {
    // Arrange
    const game = loadGame();
    game.__call('setBet', 5);
    game.__call('deal');
    const balanceMidHand = game.__probe().balance;
    const usesBefore = game.__probe().allInUsesToday;

    // Act
    game.__call('openAllInSheet');
    game.__call('confirmAllIn');

    // Assert
    const after = game.__probe();
    assert.strictEqual(after.balance, 0, 'the mid-hand raise spends the remaining balance immediately');
    assert.strictEqual(after.bet, 5 + balanceMidHand,
        'the stake grows by exactly the balance that was just charged, not an arbitrary amount');
    assert.strictEqual(after.allInUsesToday, usesBefore + 1,
        'a successful mid-hand All In consumes the daily allowance');
});

test('All In mid-hand cannot pay out more than was actually charged', () => {
    // This is the shape of the pre-07a1b7a exploit — deal cheap, raise the
    // stake, then draw — but the raise now charges its own delta immediately
    // instead of mutating `bet` for free before payout is computed.
    const game = loadGame();
    game.__call('setBet', 5);
    game.__call('deal');
    const balanceMidHand = game.__probe().balance;

    // Act
    game.__call('openAllInSheet');
    game.__call('confirmAllIn');
    const raiseCharged = balanceMidHand - game.__probe().balance;

    // Assert: the stake draw() will pay out on equals exactly what was charged
    assert.strictEqual(game.__probe().bet, 5 + raiseCharged);
});

test('All In is blocked outside bet/hold state', () => {
    // Arrange: simulate a stale sheet calling confirmAllIn from a gameState
    // that is neither 'bet' nor 'hold'.
    const game = loadGame();
    game.__call('setBet', 5);
    const before = game.__probe();
    game.__call('__setGameState', 'some-other-state');

    // Act
    game.__call('confirmAllIn');

    // Assert
    assert.strictEqual(game.__probe().bet, before.bet, 'confirmAllIn must no-op outside bet/hold');
});
