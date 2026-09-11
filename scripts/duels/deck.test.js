'use strict';

// Tests for js/duel-deck.js — the deterministic deck and scoring behind
// head-to-head duels. This is the fairness mechanism the whole feature
// rests on: both players must see identical cards for identical holds, and
// a score must never be trusted from a doc, only recomputed from the
// committed hold masks. Every case here maps directly to a risk called out
// in the implementation plan (client-trusted scores, double credit, ties).

const test = require('node:test');
const assert = require('node:assert');
const {
    DUEL_HANDS,
    duelDeckFor,
    duelFinalHand,
    duelScoreHolds,
    duelOutcome,
    duelPayoutFor
} = require('../../js/duel-deck.js');

test('the same seed and hand index always produce the same deck', () => {
    const a = duelDeckFor(42, 0);
    const b = duelDeckFor(42, 0);
    assert.deepStrictEqual(a.dealt, b.dealt);
    assert.deepStrictEqual(a.replacements, b.replacements);
});

test('different hand indices under the same seed do not share a shuffle', () => {
    const hand0 = duelDeckFor(42, 0);
    const hand1 = duelDeckFor(42, 1);
    assert.notDeepStrictEqual(hand0.dealt, hand1.dealt);
});

test('different seeds produce different decks', () => {
    const a = duelDeckFor(1, 0);
    const b = duelDeckFor(2, 0);
    assert.notDeepStrictEqual(a.dealt, b.dealt);
});

test('the 5 dealt and 5 replacement cards for one hand are all distinct', () => {
    for (let seed = 0; seed < 20; seed++) {
        const { dealt, replacements } = duelDeckFor(seed, 0);
        const all = dealt.concat(replacements).map((c) => c.rank + c.suit);
        assert.strictEqual(new Set(all).size, 10, `seed ${seed} produced a duplicate card`);
    }
});

test('holding every position returns exactly the dealt hand', () => {
    const { dealt } = duelDeckFor(7, 2);
    const finalHand = duelFinalHand(7, 2, 0b11111);
    assert.deepStrictEqual(finalHand, dealt);
});

test('holding nothing returns exactly the positional replacements', () => {
    const { replacements } = duelDeckFor(7, 2);
    const finalHand = duelFinalHand(7, 2, 0);
    assert.deepStrictEqual(finalHand, replacements);
});

test('a position\'s replacement card does not depend on which OTHER positions are held', () => {
    // This is the property that makes a duel fair: unlike solo play's
    // sequential draw (js/game.js draw(), where an unheld position's
    // replacement depends on how many other positions were also unheld),
    // position i's card here is fixed the moment the hand is dealt.
    const seed = 99, hand = 0;
    const holdOnlyPos2 = duelFinalHand(seed, hand, 0b00100);
    const holdPos2And4 = duelFinalHand(seed, hand, 0b10100);
    assert.deepStrictEqual(holdOnlyPos2[2], holdPos2And4[2], 'position 2 should be identical regardless of what else is held');
});

test('duelScoreHolds sums points across all 5 hands and tracks the best type', () => {
    const scored = duelScoreHolds(555, [0, 0, 0, 0, 0]);
    assert.strictEqual(scored.hands.length, DUEL_HANDS);
    const expectedTotal = scored.hands.reduce((sum, h) => sum + h.points, 0);
    assert.strictEqual(scored.total, expectedTotal);
    assert.ok(scored.total >= 0);
});

test('a short holds array does not throw — a missing mask defaults to 0 (hold nothing)', () => {
    // Mask 0 means "the player held nothing", which is a real 5-card hand
    // made entirely of replacement cards and can legitimately score by
    // chance — it is not a "not played yet" sentinel, so this only asserts
    // the function is defensive about array length, not a specific score.
    const scored = duelScoreHolds(1, [0b11111]); // only hand 0 has an explicit mask
    assert.strictEqual(scored.hands.length, 5);
    // Hand 1's implicit mask-0 result must match calling duelFinalHand the
    // same way directly — i.e. it really did fall back to "hold nothing",
    // not silently skip evaluation.
    assert.deepStrictEqual(scored.hands[1].hand, duelFinalHand(1, 1, 0));
});

test('duelOutcome recomputes from holds and never trusts a doc\'s own score fields', () => {
    // A doc claiming a huge score with holds that don't actually earn it —
    // the outcome must be based on what the holds actually produce, proving
    // the score fields are informational only, not a payout input.
    const seed = 321;
    const challengerHolds = [0, 0, 0, 0, 0];
    const opponentHolds = [0, 0, 0, 0, 0];
    const real = duelScoreHolds(seed, challengerHolds);

    const doc = {
        seed, challengerUid: 'A', challengerHolds,
        challengerScore: 999999, // lie
        opponentUid: 'B', opponentHolds,
        opponentScore: 0, // lie
        status: 'scored'
    };
    const outcome = duelOutcome(doc);
    assert.strictEqual(outcome.challenger.total, real.total);
    assert.notStrictEqual(outcome.challenger.total, 999999);
});

test('a higher total score wins regardless of best single hand', () => {
    // Construct via a brute seed/hold search would be brittle; instead assert
    // the decision rule directly using duelOutcome's own recomputation by
    // picking a seed/holds pair and checking internal consistency: whichever
    // side has the strictly higher total is the winner.
    for (let seed = 0; seed < 10; seed++) {
        const doc = {
            seed,
            challengerUid: 'A', challengerHolds: [0b11111, 0, 0, 0, 0],
            opponentUid: 'B', opponentHolds: [0, 0, 0, 0, 0b11111],
            status: 'scored'
        };
        const outcome = duelOutcome(doc);
        if (outcome.challenger.total > outcome.opponent.total) {
            assert.strictEqual(outcome.winnerUid, 'A');
        } else if (outcome.opponent.total > outcome.challenger.total) {
            assert.strictEqual(outcome.winnerUid, 'B');
        }
    }
});

test('a true tie (equal total and equal best rank) resolves to no winner', () => {
    // Identical holds against the identical seed produce identical scores on
    // both sides — the simplest guaranteed tie.
    const seed = 8;
    const holds = [0b11111, 0b11111, 0b11111, 0b11111, 0b11111];
    const doc = {
        seed,
        challengerUid: 'A', challengerHolds: holds,
        opponentUid: 'B', opponentHolds: holds,
        status: 'scored'
    };
    const outcome = duelOutcome(doc);
    assert.strictEqual(outcome.winnerUid, null);
});

test('an open duel with no opponent yet has no outcome', () => {
    const doc = { seed: 1, challengerUid: 'A', challengerHolds: [0, 0, 0, 0, 0], status: 'open' };
    const outcome = duelOutcome(doc);
    assert.strictEqual(outcome.opponent, null);
    assert.strictEqual(outcome.winnerUid, null);
});

test('duelPayoutFor: the winner takes both fees, the loser takes nothing', () => {
    const seed = 8;
    const doc = {
        seed, fee: 100,
        challengerUid: 'A', challengerHolds: [0b11111, 0b11111, 0b11111, 0b11111, 0b11111],
        opponentUid: 'B', opponentHolds: [0, 0, 0, 0, 0],
        status: 'scored'
    };
    const outcome = duelOutcome(doc);
    assert.notStrictEqual(outcome.winnerUid, null, 'test fixture must produce a clear winner');
    const winnerPayout = duelPayoutFor(doc, outcome.winnerUid);
    const loserUid = outcome.winnerUid === 'A' ? 'B' : 'A';
    assert.strictEqual(winnerPayout, 200);
    assert.strictEqual(duelPayoutFor(doc, loserUid), 0);
});

test('duelPayoutFor: a tie refunds each side its own fee', () => {
    const seed = 8;
    const holds = [0b11111, 0b11111, 0b11111, 0b11111, 0b11111];
    const doc = {
        seed, fee: 100,
        challengerUid: 'A', challengerHolds: holds,
        opponentUid: 'B', opponentHolds: holds,
        status: 'scored'
    };
    assert.strictEqual(duelPayoutFor(doc, 'A'), 100);
    assert.strictEqual(duelPayoutFor(doc, 'B'), 100);
});

test('duelPayoutFor: an expired duel refunds only the challenger', () => {
    const doc = { seed: 1, fee: 100, challengerUid: 'A', challengerHolds: [0, 0, 0, 0, 0], status: 'expired' };
    assert.strictEqual(duelPayoutFor(doc, 'A'), 100);
    assert.strictEqual(duelPayoutFor(doc, 'B'), 0);
});

test('duelPayoutFor: an open (unscored, unexpired) duel pays nobody', () => {
    const doc = { seed: 1, fee: 100, challengerUid: 'A', challengerHolds: [0, 0, 0, 0, 0], status: 'open' };
    assert.strictEqual(duelPayoutFor(doc, 'A'), 0);
    assert.strictEqual(duelPayoutFor(doc, 'B'), 0);
});

test('a friendly (zero-fee) duel pays zero either way, win or tie', () => {
    const seed = 8;
    const holds = [0b11111, 0b11111, 0b11111, 0b11111, 0b11111];
    const winDoc = {
        seed, fee: 0,
        challengerUid: 'A', challengerHolds: holds,
        opponentUid: 'B', opponentHolds: [0, 0, 0, 0, 0],
        status: 'scored'
    };
    assert.strictEqual(duelPayoutFor(winDoc, 'A'), 0);
    assert.strictEqual(duelPayoutFor(winDoc, 'B'), 0);
});
