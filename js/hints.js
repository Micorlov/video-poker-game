// ===================== Strategy hints + Perfect Play badge (Phase 7.5) =====================
// Highlights near-optimal holds via a simplified priority strategy.
// Loads after game.js — only defines functions and merges i18n.

    Object.assign(ENGAGE_I18N.en, {
        hintTip: '💡 Hints on — suggested holds glow blue',
        ach_perfect20: 'Perfect Play — 20 optimal hands in a row'
    });

    var vpHintsOn = false;
    try { vpHintsOn = localStorage.getItem('vp_hints') === '1'; } catch (e) {}
    var vpPerfectStreak = 0;

    function hintCardVal(c) {
        if (c.rank === 'A') return 14;
        if (c.rank === 'K') return 13;
        if (c.rank === 'Q') return 12;
        if (c.rank === 'J') return 11;
        return parseInt(c.rank, 10);
    }

    // Indices of `needed`+ suited cards, all royal ranks (10+), or null
    function hintRoyalDraw(h, needed) {
        for (var s = 0; s < SUITS.length; s++) {
            var idxs = [];
            for (var i = 0; i < 5; i++) {
                if (h[i].suit === SUITS[s] && hintCardVal(h[i]) >= 10) idxs.push(i);
            }
            if (idxs.length >= needed) return idxs;
        }
        return null;
    }

    function hintFlushDraw(h, needed) {
        for (var s = 0; s < SUITS.length; s++) {
            var idxs = [];
            for (var i = 0; i < 5; i++) {
                if (h[i].suit === SUITS[s]) idxs.push(i);
            }
            if (idxs.length >= needed) return idxs;
        }
        return null;
    }

    // 4 distinct values fitting a 5-value window; openEnded restricts to span 3
    function hintStraightDraw(h, openEnded, requireSuited) {
        var best = null;
        for (var a = 0; a < 5; a++) for (var b = a + 1; b < 5; b++)
        for (var c = b + 1; c < 5; c++) for (var d = c + 1; d < 5; d++) {
            var idxs = [a, b, c, d];
            if (requireSuited) {
                var suit = h[a].suit;
                if (!idxs.every(function(i) { return h[i].suit === suit; })) continue;
            }
            var vals = idxs.map(function(i) { return hintCardVal(h[i]); }).sort(function(x, y) { return x - y; });
            var lowAce = vals.map(function(v) { return v === 14 ? 1 : v; }).sort(function(x, y) { return x - y; });
            var check = function(vs) {
                if (new Set(vs).size !== 4) return false;
                var span = vs[3] - vs[0];
                return openEnded ? span === 3 : span <= 4;
            };
            if (check(vals) || check(lowAce)) best = idxs;
        }
        return best;
    }

    function hintPairIndices(h, minVal, maxVal) {
        var byRank = {};
        for (var i = 0; i < 5; i++) {
            (byRank[h[i].rank] = byRank[h[i].rank] || []).push(i);
        }
        var ranks = Object.keys(byRank).filter(function(r) { return byRank[r].length === 2; });
        for (var k = 0; k < ranks.length; k++) {
            var v = hintCardVal({ rank: ranks[k] });
            if (v >= minVal && v <= maxVal) return byRank[ranks[k]];
        }
        return null;
    }

    function holdsFromIndices(idxs) {
        var holds = [false, false, false, false, false];
        (idxs || []).forEach(function(i) { holds[i] = true; });
        return holds;
    }

    function hintJacksHolds(h) {
        var res = evaluateHand(h);
        var all = [0, 1, 2, 3, 4];
        // Pat royals / straight flushes
        if (res.type === 'Royal Flush' || res.type === 'Straight Flush') return holdsFromIndices(all);
        if (res.type === 'Four of a Kind') return holdsFromIndices(res.winIndices);
        var royal4 = hintRoyalDraw(h, 4);
        if (royal4) return holdsFromIndices(royal4.slice(0, 4));
        if (res.type === 'Full House') return holdsFromIndices(all);
        if (res.type === 'Flush' || res.type === 'Straight') return holdsFromIndices(all);
        if (res.type === 'Three of a Kind') return holdsFromIndices(res.winIndices);
        var sf4 = hintStraightDraw(h, false, true);
        if (sf4) return holdsFromIndices(sf4);
        if (res.type === 'Two Pair') return holdsFromIndices(res.winIndices.concat(res.secondPairIndices));
        var highPair = hintPairIndices(h, 11, 14);
        if (highPair) return holdsFromIndices(highPair);
        var royal3 = hintRoyalDraw(h, 3);
        if (royal3) return holdsFromIndices(royal3.slice(0, 3));
        var flush4 = hintFlushDraw(h, 4);
        if (flush4) return holdsFromIndices(flush4);
        var lowPair = hintPairIndices(h, 2, 10);
        if (lowPair) return holdsFromIndices(lowPair);
        var straight4 = hintStraightDraw(h, true, false);
        if (straight4) return holdsFromIndices(straight4);
        // Suited high cards
        for (var s = 0; s < SUITS.length; s++) {
            var suitedHigh = [];
            for (var i = 0; i < 5; i++) {
                if (h[i].suit === SUITS[s] && hintCardVal(h[i]) >= 11) suitedHigh.push(i);
            }
            if (suitedHigh.length >= 2) return holdsFromIndices(suitedHigh.slice(0, 2));
        }
        // Unsuited high cards — keep at most the two lowest
        var highs = [];
        for (var j = 0; j < 5; j++) {
            if (hintCardVal(h[j]) >= 11) highs.push(j);
        }
        highs.sort(function(a, b) { return hintCardVal(h[a]) - hintCardVal(h[b]); });
        if (highs.length > 0) return holdsFromIndices(highs.slice(0, 2));
        return holdsFromIndices([]);
    }

    function hintDeucesHolds(h) {
        var deuces = [];
        var naturals = [];
        for (var i = 0; i < 5; i++) {
            if (h[i].rank === '2') deuces.push(i); else naturals.push(i);
        }
        var res = evaluateDeucesHand(h);
        var all = [0, 1, 2, 3, 4];
        var patAll = ['Royal Flush', 'Wild Royal Flush', 'Five of a Kind', 'Straight Flush',
                      'Full House', 'Flush', 'Straight', 'Four Deuces'];
        if (patAll.indexOf(res.type) !== -1) return holdsFromIndices(all);
        if (res.type === 'Four of a Kind' || res.type === 'Three of a Kind') {
            // Hold deuces + the most frequent natural rank
            var byRank = {};
            naturals.forEach(function(idx) {
                (byRank[h[idx].rank] = byRank[h[idx].rank] || []).push(idx);
            });
            var bestRank = null;
            Object.keys(byRank).forEach(function(r) {
                if (!bestRank || byRank[r].length > byRank[bestRank].length) bestRank = r;
            });
            return holdsFromIndices(deuces.concat(bestRank ? byRank[bestRank] : []));
        }
        if (deuces.length >= 3) return holdsFromIndices(deuces);
        // 4 to a (wild) royal: deuces + suited naturals 10+
        for (var s = 0; s < SUITS.length; s++) {
            var royals = naturals.filter(function(idx) {
                return h[idx].suit === SUITS[s] && hintCardVal(h[idx]) >= 10;
            });
            if (deuces.length + royals.length >= 4) {
                return holdsFromIndices(deuces.concat(royals));
            }
        }
        // Natural pair (one only — never two pair in deuces)
        var pair = hintPairIndices(h, 3, 14);
        if (pair) return holdsFromIndices(deuces.concat(pair));
        if (deuces.length > 0) return holdsFromIndices(deuces);
        var flush4 = hintFlushDraw(h, 4);
        if (flush4) return holdsFromIndices(flush4);
        var straight4 = hintStraightDraw(h, true, false);
        if (straight4) return holdsFromIndices(straight4);
        return holdsFromIndices([]);
    }

    window.vpComputeHolds = function(h) {
        return gameVariant === 'deuces' ? hintDeucesHolds(h) : hintJacksHolds(h);
    };

    window.vpApplyHintClasses = function() {
        var handEl = document.getElementById('hand');
        if (!handEl || !handEl.children.length) return;
        Array.prototype.forEach.call(handEl.children, function(el) {
            el.classList.remove('hint-suggest');
        });
        if (!vpHintsOn || gameState !== 'hold') return;
        var holds = vpComputeHolds(hand);
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
        if (vpHintsOn) egToast(et('hintTip'));
    };

    window.updateHintButtonUI = function() {
        var btn = document.getElementById('hint-btn');
        if (btn) btn.style.opacity = vpHintsOn ? '1' : '0.45';
    };

    updateHintButtonUI();

    // Perfect Play: 20 consecutive hands where the player's holds match the hint strategy
    window.vpOnDrawCheckPerfect = function() {
        if (!window.egUser) return;
        var optimal = vpComputeHolds(hand);
        var matches = held.every(function(v, i) { return v === optimal[i]; });
        vpPerfectStreak = matches ? vpPerfectStreak + 1 : 0;
        if (vpPerfectStreak >= 20 && typeof egUnlock === 'function') egUnlock('perfect20');
    };
