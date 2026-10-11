#!/usr/bin/env node
// Generates the golden fixtures that pin the Kotlin hand evaluator to the
// shipped web evaluator (js/hand-eval.js).
//
//   node android-native/tools/gen-golden.js
//
// It walks all 2,598,960 five-card hands for every variant and writes:
//   * "distribution": how many hands land on each hand type — the Kotlin test
//     re-enumerates every hand and must produce identical counts.
//   * "samples": a seeded, type-balanced set of hands with the full result
//     (type + win / second-pair / third-match indices) for exact comparison.
//
// Cards are strings like "A♠" / "10♥" — the same rank + suit symbols the web
// app uses internally.

const fs = require('fs');
const path = require('path');
const { SUITS, RANKS, evaluateWithVariant } = require('../../js/hand-eval.js');

const VARIANTS = ['jacks', 'deuces', 'bonus', 'doubleBonus'];
const SAMPLES_PER_TYPE = 25;
const RANDOM_SAMPLES = 400;
const OUT = path.join(__dirname, '..', 'app', 'src', 'test', 'resources', 'hand_eval_golden.json');

const DECK = [];
for (const suit of SUITS) for (const rank of RANKS) DECK.push({ rank, suit });
const label = (c) => c.rank + c.suit;

// mulberry32 — tiny seeded PRNG so the fixture is reproducible byte for byte.
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

function record(hand, res) {
    return {
        h: hand.map(label).join(' '),
        t: res.type,
        w: res.winIndices,
        s: res.secondPairIndices,
        m: res.thirdMatchIndices
    };
}

const output = { distribution: {}, samples: {} };

VARIANTS.forEach((variant, vi) => {
    const rand = seeded(1000 + vi);
    const counts = {};
    const seen = {};       // type -> number of candidates seen (for reservoir sampling)
    const reservoir = {};  // type -> sampled records

    const hand = new Array(5);
    for (let a = 0; a < 48; a++) {
        hand[0] = DECK[a];
        for (let b = a + 1; b < 49; b++) {
            hand[1] = DECK[b];
            for (let c = b + 1; c < 50; c++) {
                hand[2] = DECK[c];
                for (let d = c + 1; d < 51; d++) {
                    hand[3] = DECK[d];
                    for (let e = d + 1; e < 52; e++) {
                        hand[4] = DECK[e];
                        const res = evaluateWithVariant(hand, variant);
                        const type = res.type;
                        counts[type] = (counts[type] || 0) + 1;
                        const n = (seen[type] = (seen[type] || 0) + 1);
                        const bucket = (reservoir[type] = reservoir[type] || []);
                        if (bucket.length < SAMPLES_PER_TYPE) {
                            bucket.push(record(hand, res));
                        } else {
                            const j = Math.floor(rand() * n);
                            if (j < SAMPLES_PER_TYPE) bucket[j] = record(hand, res);
                        }
                    }
                }
            }
        }
    }

    // A few uniformly random hands too, so the sample isn't only rare-hand biased.
    const random = [];
    for (let i = 0; i < RANDOM_SAMPLES; i++) {
        const pool = DECK.slice();
        const h = [];
        for (let k = 0; k < 5; k++) h.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
        random.push(record(h, evaluateWithVariant(h, variant)));
    }

    output.distribution[variant] = counts;
    output.samples[variant] = [].concat(...Object.values(reservoir), random);
    const total = Object.values(counts).reduce((x, y) => x + y, 0);
    console.log(variant, total, JSON.stringify(counts));
});

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(output) + '\n');
console.log('wrote', OUT, fs.statSync(OUT).size, 'bytes');
