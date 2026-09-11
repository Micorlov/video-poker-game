// Pure hand-evaluation engine: card model, paytables, and the Jacks-or-Better
// / Deuces-Wild evaluators. No DOM, no localStorage, no game state — moved out
// of js/game.js (which still owns everything state-related: gameVariant,
// currentPayouts, unlock levels) so js/duel-deck.js and the Node-side tests
// and poller can use the exact same evaluator the solo game uses, without
// pulling in the whole game module.
//
// Loaded as a bare <script> early in the browser bundle (build.js), so every
// declaration below is also just a top-level const/function in the
// concatenated script, exactly as it was inside game.js — nothing about how
// the app consumes these names changes. The module.exports tail at the
// bottom is for Node only (require()'d by scripts/duels/deck.test.js,
// scripts/push/duels.js, and scripts/game/betLock.test.js).

const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

const PAYTABLES = {
    jacks: {
        'Royal Flush': 250,
        'Straight Flush': 50,
        'Four of a Kind': 20,
        'Full House': 7,
        'Flush': 5,
        'Straight': 4,
        'Three of a Kind': 3,
        'Two Pair': 2,
        'Jacks or Better': 1,
        'Nothing': 0
    },
    deuces: {
        'Royal Flush': 250,
        'Four Deuces': 200,
        'Wild Royal Flush': 25,
        'Five of a Kind': 15,
        'Straight Flush': 9,
        'Four of a Kind': 5,
        'Full House': 3,
        'Flush': 2,
        'Straight': 2,
        'Three of a Kind': 1,
        'Nothing': 0
    },
    bonus: {
        'Royal Flush': 250,
        'Straight Flush': 50,
        'Four Aces': 80,
        'Four 2s-4s': 40,
        'Four 5s-Ks': 25,
        'Full House': 8,
        'Flush': 5,
        'Straight': 4,
        'Three of a Kind': 3,
        'Two Pair': 2,
        'Jacks or Better': 1,
        'Nothing': 0
    },
    doubleBonus: {
        'Royal Flush': 250,
        'Straight Flush': 50,
        'Four Aces': 160,
        'Four 2s-4s': 80,
        'Four 5s-Ks': 50,
        'Full House': 10,
        'Flush': 7,
        'Straight': 5,
        'Three of a Kind': 3,
        'Two Pair': 1,
        'Jacks or Better': 1,
        'Nothing': 0
    }
};

const HAND_ORDERS = {
    jacks: ['Royal Flush', 'Straight Flush', 'Four of a Kind', 'Full House', 'Flush', 'Straight', 'Three of a Kind', 'Two Pair', 'Jacks or Better', 'Nothing'],
    deuces: ['Royal Flush', 'Four Deuces', 'Wild Royal Flush', 'Five of a Kind', 'Straight Flush', 'Four of a Kind', 'Full House', 'Flush', 'Straight', 'Three of a Kind', 'Nothing'],
    bonus: ['Royal Flush', 'Straight Flush', 'Four Aces', 'Four 2s-4s', 'Four 5s-Ks', 'Full House', 'Flush', 'Straight', 'Three of a Kind', 'Two Pair', 'Jacks or Better', 'Nothing'],
    doubleBonus: ['Royal Flush', 'Straight Flush', 'Four Aces', 'Four 2s-4s', 'Four 5s-Ks', 'Full House', 'Flush', 'Straight', 'Three of a Kind', 'Two Pair', 'Jacks or Better', 'Nothing']
};

const HAND_RANK = {
    'Nothing': 0, 'Jacks or Better': 1, 'Two Pair': 2, 'Three of a Kind': 3,
    'Straight': 4, 'Flush': 5, 'Full House': 6, 'Four of a Kind': 7,
    'Straight Flush': 8, 'Royal Flush': 9,
    'Five of a Kind': 7, 'Wild Royal Flush': 8, 'Four Deuces': 8,
    'Four 5s-Ks': 7, 'Four 2s-4s': 7, 'Four Aces': 7
};

function createDeck() {
    const d = [];
    for (let suit of SUITS) {
        for (let rank of RANKS) {
            d.push({ rank, suit });
        }
    }
    return d;
}

function evaluateHand(hand) {
    const ranks = hand.map(c => c.rank);
    const suits = hand.map(c => c.suit);

    const rankCounts = {};
    ranks.forEach(r => rankCounts[r] = (rankCounts[r] || 0) + 1);
    const counts = Object.values(rankCounts).sort((a, b) => b - a);

    const flush = new Set(suits).size === 1;

    let values = ranks.map(r => {
        if (r === 'A') return 14;
        if (r === 'J') return 11;
        if (r === 'Q') return 12;
        if (r === 'K') return 13;
        return parseInt(r);
    }).sort((a, b) => a - b);

    let straight = false;
    const uniqueValues = [...new Set(values)];
    if (uniqueValues.length === 5) {
        if (uniqueValues[4] - uniqueValues[0] === 4) {
            straight = true;
        } else if (uniqueValues.join(',') === '2,3,4,5,14') {
            straight = true;
            values = [1, 2, 3, 4, 5];
        }
    }

    const findIndices = (targetRanks) => {
        return hand.map((card, i) => targetRanks.includes(card.rank) ? i : -1).filter(i => i !== -1);
    };

    const findIndicesByCount = (targetCount) => {
        const targetRanks = Object.keys(rankCounts).filter(r => rankCounts[r] === targetCount);
        return findIndices(targetRanks);
    };

    const allIndices = [0, 1, 2, 3, 4];
    let result = { type: 'Nothing', winIndices: [], thirdMatchIndices: [], secondPairIndices: [] };

    if (straight && flush) {
        if (values.join(',') === '10,11,12,13,14') {
            result.type = 'Royal Flush';
        } else {
            result.type = 'Straight Flush';
        }
        result.winIndices = allIndices;
    } else if (counts[0] === 4) {
        result.type = 'Four of a Kind';
        result.winIndices = findIndicesByCount(4);
    } else if (counts[0] === 3 && counts[1] === 2) {
        result.type = 'Full House';
        const threeRank = Object.keys(rankCounts).find(r => rankCounts[r] === 3);
        const twoRank = Object.keys(rankCounts).find(r => rankCounts[r] === 2);
        result.winIndices = findIndices([threeRank]);
        result.secondPairIndices = findIndices([twoRank]);
    } else if (flush) {
        result.type = 'Flush';
        result.winIndices = allIndices;
    } else if (straight) {
        result.type = 'Straight';
        result.winIndices = allIndices;
    } else if (counts[0] === 3) {
        result.type = 'Three of a Kind';
        result.winIndices = findIndicesByCount(3);
        const threeRank = Object.keys(rankCounts).find(r => rankCounts[r] === 3);
        const threeIndices = findIndices([threeRank]);
        if (threeRank === 'J' && threeIndices.length > 0) {
            result.thirdMatchIndices.push(threeIndices[0]);
        }
    } else if (counts[0] === 2 && counts[1] === 2) {
        const pairRanks = Object.keys(rankCounts).filter(r => rankCounts[r] === 2);
        result.type = 'Two Pair';
        result.winIndices = findIndices([pairRanks[0]]);
        result.secondPairIndices = findIndices([pairRanks[1]]);
    } else if (counts[0] === 2) {
        const pairRank = Object.keys(rankCounts).find(r => rankCounts[r] === 2);
        if (['J', 'Q', 'K', 'A'].includes(pairRank)) {
            result.type = 'Jacks or Better';
            result.winIndices = findIndices([pairRank]);
        }
    }
    return result;
}

// Deuces Wild: 2s substitute for any card. Minimum paying hand is Three of a Kind.
function evaluateDeucesHand(hand) {
    const allIndices = [0, 1, 2, 3, 4];
    const result = { type: 'Nothing', winIndices: [], thirdMatchIndices: [], secondPairIndices: [] };
    const others = hand.filter(c => c.rank !== '2');
    const n = 5 - others.length;

    if (n === 4) {
        result.type = 'Four Deuces';
        result.winIndices = allIndices;
        return result;
    }

    const rankCounts = {};
    others.forEach(c => rankCounts[c.rank] = (rankCounts[c.rank] || 0) + 1);
    const counts = Object.values(rankCounts).sort((a, b) => b - a);
    const maxCount = counts[0] || 0;
    const flush = new Set(others.map(c => c.suit)).size <= 1;
    const vals = others.map(c =>
        c.rank === 'A' ? 14 : c.rank === 'J' ? 11 : c.rank === 'Q' ? 12 : c.rank === 'K' ? 13 : parseInt(c.rank));
    const distinct = new Set(vals).size === others.length;

    const fitsWindow = arr => arr.length === 0 || (Math.max(...arr) - Math.min(...arr) <= 4);
    const straight = distinct && (fitsWindow(vals) || (vals.includes(14) && fitsWindow(vals.map(v => v === 14 ? 1 : v))));
    const allRoyalVals = distinct && vals.every(v => v >= 10);

    if (n === 0 && flush && straight && Math.min(...vals) === 10) {
        result.type = 'Royal Flush';
    } else if (n > 0 && flush && allRoyalVals) {
        result.type = 'Wild Royal Flush';
    } else if (maxCount + n >= 5) {
        result.type = 'Five of a Kind';
    } else if (flush && straight) {
        result.type = 'Straight Flush';
    } else if (maxCount + n >= 4) {
        result.type = 'Four of a Kind';
    } else if ((maxCount === 3 && counts[1] === 2) || (n === 1 && maxCount === 2 && counts[1] === 2)) {
        result.type = 'Full House';
    } else if (flush) {
        result.type = 'Flush';
    } else if (straight) {
        result.type = 'Straight';
    } else if (maxCount + n >= 3) {
        result.type = 'Three of a Kind';
    }

    if (result.type !== 'Nothing') result.winIndices = allIndices;
    return result;
}

// js/game.js keeps its own evaluateForVariant(h) wrapper that reads the
// module's own gameVariant global — this version takes the variant
// explicitly so callers with no notion of "the current game variant" (duels,
// which are always Jacks or Better regardless of the player's own setting;
// Node tests; the push poller) can use it directly.
function evaluateWithVariant(h, variant) {
    if (variant === 'deuces') return evaluateDeucesHand(h);
    const result = evaluateHand(h);
    if (result.type === 'Four of a Kind' && (variant === 'bonus' || variant === 'doubleBonus')) {
        const rankCounts = {};
        h.forEach(c => rankCounts[c.rank] = (rankCounts[c.rank] || 0) + 1);
        const quadRank = Object.keys(rankCounts).find(r => rankCounts[r] === 4);
        if (quadRank === 'A') result.type = 'Four Aces';
        else if (['2', '3', '4'].includes(quadRank)) result.type = 'Four 2s-4s';
        else result.type = 'Four 5s-Ks';
    }
    return result;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SUITS, RANKS, PAYTABLES, HAND_ORDERS, HAND_RANK,
        createDeck, evaluateHand, evaluateDeucesHand, evaluateWithVariant
    };
}
