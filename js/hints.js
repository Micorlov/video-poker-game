// Strategy hints — highlights near-optimal holds via a simplified priority strategy.
// Loads after game.js — only defines functions.

let vpHintsOn = false;
try { vpHintsOn = localStorage.getItem('vp_hints') === '1'; } catch (e) {}

function hintCardVal(c) {
    if (c.rank === 'A') return 14;
    if (c.rank === 'K') return 13;
    if (c.rank === 'Q') return 12;
    if (c.rank === 'J') return 11;
    return parseInt(c.rank, 10);
}

function hintRoyalDraw(h, needed) {
    for (let s = 0; s < SUITS.length; s++) {
        const idxs = [];
        for (let i = 0; i < 5; i++) {
            if (h[i].suit === SUITS[s] && hintCardVal(h[i]) >= 10) idxs.push(i);
        }
        if (idxs.length >= needed) return idxs;
    }
    return null;
}

function hintFlushDraw(h, needed) {
    for (let s = 0; s < SUITS.length; s++) {
        const idxs = [];
        for (let i = 0; i < 5; i++) {
            if (h[i].suit === SUITS[s]) idxs.push(i);
        }
        if (idxs.length >= needed) return idxs;
    }
    return null;
}

function hintStraightDraw(h, openEnded, requireSuited) {
    let best = null;
    for (let a = 0; a < 5; a++) for (let b = a + 1; b < 5; b++)
        for (let c = b + 1; c < 5; c++) for (let d = c + 1; d < 5; d++) {
            const idxs = [a, b, c, d];
            if (requireSuited) {
                const suit = h[a].suit;
                if (!idxs.every(function(i) { return h[i].suit === suit; })) continue;
            }
            const vals = idxs.map(function(i) { return hintCardVal(h[i]); }).sort(function(x, y) { return x - y; });
            const lowAce = vals.map(function(v) { return v === 14 ? 1 : v; }).sort(function(x, y) { return x - y; });
            const check = function(vs) {
                if (new Set(vs).size !== 4) return false;
                const span = vs[3] - vs[0];
                return openEnded ? span === 3 : span <= 4;
            };
            if (check(vals) || check(lowAce)) best = idxs;
        }
    return best;
}

function hintPairIndices(h, minVal, maxVal) {
    const byRank = {};
    for (let i = 0; i < 5; i++) {
        (byRank[h[i].rank] = byRank[h[i].rank] || []).push(i);
    }
    const ranks = Object.keys(byRank).filter(function(r) { return byRank[r].length === 2; });
    for (let k = 0; k < ranks.length; k++) {
        const v = hintCardVal({ rank: ranks[k] });
        if (v >= minVal && v <= maxVal) return byRank[ranks[k]];
    }
    return null;
}

function holdsFromIndices(idxs) {
    const holds = [false, false, false, false, false];
    (idxs || []).forEach(function(i) { holds[i] = true; });
    return holds;
}

function hintJacksHolds(h) {
    const res = evaluateHand(h);
    const all = [0, 1, 2, 3, 4];
    if (res.type === 'Royal Flush' || res.type === 'Straight Flush') return holdsFromIndices(all);
    if (res.type === 'Four of a Kind') return holdsFromIndices(res.winIndices);
    const royal4 = hintRoyalDraw(h, 4);
    if (royal4) return holdsFromIndices(royal4.slice(0, 4));
    if (res.type === 'Full House') return holdsFromIndices(all);
    if (res.type === 'Flush' || res.type === 'Straight') return holdsFromIndices(all);
    if (res.type === 'Three of a Kind') return holdsFromIndices(res.winIndices);
    const sf4 = hintStraightDraw(h, false, true);
    if (sf4) return holdsFromIndices(sf4);
    if (res.type === 'Two Pair') return holdsFromIndices(res.winIndices.concat(res.secondPairIndices));
    const highPair = hintPairIndices(h, 11, 14);
    if (highPair) return holdsFromIndices(highPair);
    const royal3 = hintRoyalDraw(h, 3);
    if (royal3) return holdsFromIndices(royal3.slice(0, 3));
    const flush4 = hintFlushDraw(h, 4);
    if (flush4) return holdsFromIndices(flush4);
    const lowPair = hintPairIndices(h, 2, 10);
    if (lowPair) return holdsFromIndices(lowPair);
    const straight4 = hintStraightDraw(h, true, false);
    if (straight4) return holdsFromIndices(straight4);
    for (let s = 0; s < SUITS.length; s++) {
        const suitedHigh = [];
        for (let i = 0; i < 5; i++) {
            if (h[i].suit === SUITS[s] && hintCardVal(h[i]) >= 11) suitedHigh.push(i);
        }
        if (suitedHigh.length >= 2) return holdsFromIndices(suitedHigh.slice(0, 2));
    }
    const highs = [];
    for (let j = 0; j < 5; j++) {
        if (hintCardVal(h[j]) >= 11) highs.push(j);
    }
    highs.sort(function(a, b) { return hintCardVal(h[a]) - hintCardVal(h[b]); });
    if (highs.length > 0) return holdsFromIndices(highs.slice(0, 2));
    return holdsFromIndices([]);
}

function hintDeucesHolds(h) {
    const deuces = [];
    const naturals = [];
    for (let i = 0; i < 5; i++) {
        if (h[i].rank === '2') deuces.push(i); else naturals.push(i);
    }
    const res = evaluateDeucesHand(h);
    const all = [0, 1, 2, 3, 4];
    const patAll = ['Royal Flush', 'Wild Royal Flush', 'Five of a Kind', 'Straight Flush',
        'Full House', 'Flush', 'Straight', 'Four Deuces'];
    if (patAll.indexOf(res.type) !== -1) return holdsFromIndices(all);
    if (res.type === 'Four of a Kind' || res.type === 'Three of a Kind') {
        const byRank = {};
        naturals.forEach(function(idx) {
            (byRank[h[idx].rank] = byRank[h[idx].rank] || []).push(idx);
        });
        let bestRank = null;
        Object.keys(byRank).forEach(function(r) {
            if (!bestRank || byRank[r].length > byRank[bestRank].length) bestRank = r;
        });
        return holdsFromIndices(deuces.concat(bestRank ? byRank[bestRank] : []));
    }
    if (deuces.length >= 3) return holdsFromIndices(deuces);
    for (let s = 0; s < SUITS.length; s++) {
        const royals = naturals.filter(function(idx) {
            return h[idx].suit === SUITS[s] && hintCardVal(h[idx]) >= 10;
        });
        if (deuces.length + royals.length >= 4) {
            return holdsFromIndices(deuces.concat(royals));
        }
    }
    const pair = hintPairIndices(h, 3, 14);
    if (pair) return holdsFromIndices(deuces.concat(pair));
    if (deuces.length > 0) return holdsFromIndices(deuces);
    const flush4 = hintFlushDraw(h, 4);
    if (flush4) return holdsFromIndices(flush4);
    const straight4 = hintStraightDraw(h, true, false);
    if (straight4) return holdsFromIndices(straight4);
    return holdsFromIndices([]);
}

window.vpComputeHolds = function(h) {
    return gameVariant === 'deuces' ? hintDeucesHolds(h) : hintJacksHolds(h);
};

window.vpApplyHintClasses = function() {
    const handEl = document.getElementById('hand');
    if (!handEl || !handEl.children.length) return;
    Array.prototype.forEach.call(handEl.children, function(el) {
        el.classList.remove('hint-suggest');
    });
    if (!vpHintsOn || gameState !== 'hold') return;
    const holds = vpComputeHolds(hand);
    holds.forEach(function(hold, i) {
        if (hold && handEl.children[i]) handEl.children[i].classList.add('hint-suggest');
    });
};
window.vpRenderHints = window.vpApplyHintClasses;

window.toggleHints = function() {
    vpHintsOn = !vpHintsOn;
    try { localStorage.setItem('vp_hints', vpHintsOn ? '1' : '0'); } catch (e) {}
    updateHintButtonUI();
    vpApplyHintClasses();
    if (vpHintsOn) showToast(t('toast.hintsOn'));
};

window.updateHintButtonUI = function() {
    const btn = document.getElementById('hint-btn');
    if (btn) btn.classList.toggle('on', vpHintsOn);
};
