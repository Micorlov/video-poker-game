// Deterministic duel deck — the fairness mechanism behind js/duel.js. Given
// a duel's seed and a hand index (0-4), the five dealt cards and the five
// "positional" replacement cards are entirely determined; a player's only
// input is which of the five positions to hold. Both the challenger and the
// opponent see identical cards for identical choices, so a duel measures
// skill, not luck — like duplicate bridge, everyone plays the same board.
//
// Deliberately NOT the same replacement mechanic as solo play (js/game.js
// draw(), which pops cards off a shrinking deck in position order, so an
// unheld position's replacement depends on how many OTHER positions were
// also unheld). Here each of the 5 positions has one fixed hidden
// replacement card from the moment the hand is dealt, independent of the
// hold pattern chosen — the only way two players holding different subsets
// can be meaningfully compared on the same random draw.
//
// Loaded as a bare <script> in the browser bundle, after js/prng.js and
// js/hand-eval.js (build.js) — every function below reads those two
// modules' exports through one `duelEngine` object rather than declaring
// same-named locals, because PAYTABLES/HAND_RANK are `const` in that
// shared script scope and a colliding var/let redeclaration of a const
// name is a SyntaxError even on a branch that never runs. In Node
// (scripts/duels/deck.test.js, scripts/push/duels.js) the same object is
// built from two require() calls instead.

var duelEngine = (typeof require === 'function' && typeof module !== 'undefined' && module.exports)
    ? Object.assign({}, require('./prng.js'), require('./hand-eval.js'))
    : {
        mulberry32: mulberry32, fnv1aHash: fnv1aHash, createDeck: createDeck,
        evaluateWithVariant: evaluateWithVariant, PAYTABLES: PAYTABLES, HAND_RANK: HAND_RANK
    };

const DUEL_HANDS = 5;
const DUEL_POINTS_PER_UNIT = 10;

// One independent seeded shuffle per hand index — hand k of a duel never
// shares randomness with any other hand of that duel or any other duel.
function duelHandRng(seed, handIndex) {
    return duelEngine.mulberry32(duelEngine.fnv1aHash(seed + ':' + handIndex));
}

function duelDeckFor(seed, handIndex) {
    const deck = duelEngine.createDeck();
    const rand = duelHandRng(seed, handIndex);
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        const tmp = deck[i]; deck[i] = deck[j]; deck[j] = tmp;
    }
    return { dealt: deck.slice(0, 5), replacements: deck.slice(5, 10) };
}

// mask: 0-31, bit i (1 << i) set means position i was held.
function duelFinalHand(seed, handIndex, mask) {
    const cards = duelDeckFor(seed, handIndex);
    const hand = [];
    for (let i = 0; i < 5; i++) {
        hand.push((mask & (1 << i)) ? cards.dealt[i] : cards.replacements[i]);
    }
    return hand;
}

// holds: array of 5 masks, one per hand (0 for a hand not yet played, which
// scores as "Nothing" — so a partial array never throws, it just scores the
// unplayed hands as zero). Duels are always Jacks or Better, regardless of
// the player's own solo-game variant setting.
function duelScoreHolds(seed, holds) {
    let total = 0;
    let best = 'Nothing';
    const hands = [];
    for (let k = 0; k < DUEL_HANDS; k++) {
        const mask = (holds && holds[k]) || 0;
        const finalHand = duelFinalHand(seed, k, mask);
        const result = duelEngine.evaluateWithVariant(finalHand, 'jacks');
        const points = (duelEngine.PAYTABLES.jacks[result.type] || 0) * DUEL_POINTS_PER_UNIT;
        total += points;
        if ((duelEngine.HAND_RANK[result.type] || 0) > (duelEngine.HAND_RANK[best] || 0)) best = result.type;
        hands.push({ type: result.type, points: points, hand: finalHand });
    }
    return { total: total, best: best, hands: hands };
}

// Recomputes both sides' scores straight from the committed hold masks —
// never trusts a doc's own challengerScore/opponentScore field, which is
// informational only (a tampered client can already set its own local
// balance to anything; the fields exist for cheap UI display, not as the
// source of truth for payouts). Winner is decided by total score, then by
// best single hand rank as a tiebreak, then a true tie (winnerUid null).
function duelOutcome(doc) {
    const challenger = duelScoreHolds(doc.seed, doc.challengerHolds);
    if (!doc.opponentHolds) return { challenger: challenger, opponent: null, winnerUid: null };
    const opponent = duelScoreHolds(doc.seed, doc.opponentHolds);

    let winnerUid = null;
    if (challenger.total > opponent.total) {
        winnerUid = doc.challengerUid;
    } else if (opponent.total > challenger.total) {
        winnerUid = doc.opponentUid;
    } else {
        const cRank = duelEngine.HAND_RANK[challenger.best] || 0;
        const oRank = duelEngine.HAND_RANK[opponent.best] || 0;
        if (cRank > oRank) winnerUid = doc.challengerUid;
        else if (oRank > cRank) winnerUid = doc.opponentUid;
        // else: a true tie — winnerUid stays null.
    }
    return { challenger: challenger, opponent: opponent, winnerUid: winnerUid };
}

// Coins owed to `uid` once a duel has settled. A win takes both fees, a tie
// refunds each side's own fee, a loss pays nothing, and an expired duel
// (nobody took the challenge) refunds only the challenger — the opponent
// never staked anything by not showing up.
function duelPayoutFor(doc, uid) {
    if (doc.status === 'expired') {
        return uid === doc.challengerUid ? (doc.fee || 0) : 0;
    }
    if (doc.status !== 'scored') return 0;
    const outcome = duelOutcome(doc);
    if (!outcome.opponent) return 0;
    if (outcome.winnerUid === null) return doc.fee || 0;
    if (outcome.winnerUid === uid) return (doc.fee || 0) * 2;
    return 0;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        DUEL_HANDS: DUEL_HANDS,
        DUEL_POINTS_PER_UNIT: DUEL_POINTS_PER_UNIT,
        duelHandRng: duelHandRng,
        duelDeckFor: duelDeckFor,
        duelFinalHand: duelFinalHand,
        duelScoreHolds: duelScoreHolds,
        duelOutcome: duelOutcome,
        duelPayoutFor: duelPayoutFor
    };
}
