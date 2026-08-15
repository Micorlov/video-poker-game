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

test('All In mid-hand neither changes the bet nor burns a daily use', () => {
    // Arrange
    const game = loadGame();
    game.__call('setBet', 5);
    game.__call('deal');
    const usesBefore = game.__probe().allInUsesToday;

    // Act
    game.__call('openAllInSheet');
    game.__call('confirmAllIn');

    // Assert
    assert.strictEqual(game.__probe().bet, 5, 'All In must not raise the stake mid-hand');
    assert.strictEqual(game.__probe().allInUsesToday, usesBefore,
        'a blocked All In must not consume the daily allowance');
});
