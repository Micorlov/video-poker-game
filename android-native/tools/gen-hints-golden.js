#!/usr/bin/env node
// Generates the golden fixture that pins StrategyHints.kt to the web hints (js/hints.js).
//
//   node android-native/tools/gen-hints-golden.js
//
// js/hints.js is a browser script (globals + window), so it is run inside a vm sandbox
// that supplies the evaluator and a stub localStorage.

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const handEval = require('../../js/hand-eval.js');

const SAMPLES = 6000;
const OUT = path.join(__dirname, '..', 'app', 'src', 'test', 'resources', 'hints_golden.json');

function seeded(seed) {
    let a = seed >>> 0;
    return function () {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const sandbox = {
    window: {},
    localStorage: { getItem: () => null, setItem: () => {} },
    SUITS: handEval.SUITS,
    evaluateHand: handEval.evaluateHand,
    evaluateDeucesHand: handEval.evaluateDeucesHand,
    gameVariant: 'jacks',
    parseInt,
};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', '..', 'js', 'hints.js'), 'utf8'), sandbox);

const DECK = [];
for (const suit of handEval.SUITS) for (const rank of handEval.RANKS) DECK.push({ rank, suit });

const out = { jacks: [], deuces: [] };
for (const [vi, variant] of ['jacks', 'deuces'].entries()) {
    const rand = seeded(77 + vi);
    sandbox.gameVariant = variant;
    for (let n = 0; n < SAMPLES; n++) {
        const pool = DECK.slice();
        const hand = [];
        for (let i = 0; i < 5; i++) hand.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
        const holds = sandbox.window.vpComputeHolds(hand);
        out[variant].push({ h: hand.map((c) => c.rank + c.suit).join(' '), k: holds.map((x) => (x ? 1 : 0)).join('') });
    }
}
fs.writeFileSync(OUT, JSON.stringify(out));
console.log('wrote', OUT);
