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

const VARIANT_LABELS = {
    jacks: 'Jacks or Better',
    deuces: 'Deuces Wild',
    bonus: 'Bonus Poker',
    doubleBonus: 'Double Bonus'
};

const HAND_ORDERS = {
    jacks: ['Royal Flush', 'Straight Flush', 'Four of a Kind', 'Full House', 'Flush', 'Straight', 'Three of a Kind', 'Two Pair', 'Jacks or Better', 'Nothing'],
    deuces: ['Royal Flush', 'Four Deuces', 'Wild Royal Flush', 'Five of a Kind', 'Straight Flush', 'Four of a Kind', 'Full House', 'Flush', 'Straight', 'Three of a Kind', 'Nothing'],
    bonus: ['Royal Flush', 'Straight Flush', 'Four Aces', 'Four 2s-4s', 'Four 5s-Ks', 'Full House', 'Flush', 'Straight', 'Three of a Kind', 'Two Pair', 'Jacks or Better', 'Nothing'],
    doubleBonus: ['Royal Flush', 'Straight Flush', 'Four Aces', 'Four 2s-4s', 'Four 5s-Ks', 'Full House', 'Flush', 'Straight', 'Three of a Kind', 'Two Pair', 'Jacks or Better', 'Nothing']
};

const EXPLANATIONS = {
    'Royal Flush': 'A, K, Q, J, 10 — all the same suit. The best hand in the game.',
    'Straight Flush': 'Five cards in a row, all the same suit.',
    'Four of a Kind': 'Four cards of the same rank.',
    'Four Aces': 'Four Aces — the biggest quad bonus.',
    'Four 2s-4s': 'Four of a kind, rank 2 through 4.',
    'Four 5s-Ks': 'Four of a kind, rank 5 through King.',
    'Four Deuces': 'Four wild deuces — an automatic top-tier win.',
    'Wild Royal Flush': 'A Royal Flush made using at least one wild deuce.',
    'Five of a Kind': 'Five cards of the same rank, using wild deuces.',
    'Full House': 'Three of a kind plus a pair.',
    'Flush': 'Five cards of the same suit, not in sequence.',
    'Straight': 'Five cards in sequence, mixed suits.',
    'Three of a Kind': 'Three cards of the same rank.',
    'Two Pair': 'Two separate pairs.',
    'Jacks or Better': 'A pair of Jacks, Queens, Kings, or Aces.',
    'Nothing': 'No paying hand — better luck next deal.'
};

const WIN_LABELS = {
    pair: 'Pair',
    threeOfKind: '3 of a Kind',
    fourOfKind: '4 of a Kind',
    straight: 'Straight',
    flush: 'Flush',
    straightFlush: 'Str. Flush',
    royalFlush: 'Royal Flush'
};

const HAND_RANK = {
    'Nothing': 0, 'Jacks or Better': 1, 'Two Pair': 2, 'Three of a Kind': 3,
    'Straight': 4, 'Flush': 5, 'Full House': 6, 'Four of a Kind': 7,
    'Straight Flush': 8, 'Royal Flush': 9,
    'Five of a Kind': 7, 'Wild Royal Flush': 8, 'Four Deuces': 8,
    'Four 5s-Ks': 7, 'Four 2s-4s': 7, 'Four Aces': 7
};

// Variants unlock as the player's local level rises — gives leveling a purpose
const VARIANT_MIN_LEVEL = { jacks: 1, deuces: 3, bonus: 8, doubleBonus: 15 };
const MULTI_HAND_MIN_LEVEL = 10;

let gameVariant = 'jacks';
try {
    const savedVariant = localStorage.getItem('vp_game_variant');
    if (savedVariant && PAYTABLES[savedVariant]) gameVariant = savedVariant;
} catch (e) {}

function basePayouts() {
    return PAYTABLES[gameVariant];
}
let currentPayouts = { ...basePayouts() };

function variantUnlocked(v) {
    return getLocalLevel() >= (VARIANT_MIN_LEVEL[v] || 1);
}

function multiHandUnlocked() {
    return getLocalLevel() >= MULTI_HAND_MIN_LEVEL;
}

function setGameVariant(v) {
    if (!PAYTABLES[v] || gameState !== 'bet' || v === gameVariant) return;
    if (!variantUnlocked(v)) {
        showToast('🔒 Unlocks at level ' + VARIANT_MIN_LEVEL[v]);
        return;
    }
    gameVariant = v;
    try { localStorage.setItem('vp_game_variant', v); } catch (e) {}
    currentPayouts = { ...basePayouts() };
    updateVariantUI();
    renderPayouts();
    if (window.vpRenderHints) vpRenderHints();
}

function updateVariantUI() {
    Object.keys(PAYTABLES).forEach(function(v) {
        const btn = document.getElementById('variant-' + v);
        if (!btn) return;
        btn.classList.toggle('selected', gameVariant === v);
        const locked = !variantUnlocked(v);
        btn.classList.toggle('locked', locked);
        const lockEl = btn.querySelector('.variant-lock');
        if (lockEl) {
            lockEl.textContent = locked ? 'Unlock · ' + VARIANT_MIN_LEVEL[v] : '';
            lockEl.style.display = locked ? '' : 'none';
        }
    });
}

// --- Engagement tuning (play-money game) ---
const BOOST_BASE = 0.18;          // baseline chance to improve a dead deal
const BOOST_PER_LOSS = 0.06;      // extra boost per consecutive loss (mercy)
const BOOST_LOSS_CAP = 5;         // loss streak past which mercy stops growing
const LOW_BALANCE_HANDS = 10;     // "getting low" = fewer than this many max bets left
const CRITICAL_BALANCE_HANDS = 4; // "almost broke" = strong comeback help
const BOOST_LOW = 0.15;           // extra help when getting low
const BOOST_CRITICAL = 0.35;      // extra help when almost broke
const BOOST_MAX = 0.85;           // never a guaranteed rig

function getBoostChance() {
    let chance = BOOST_BASE;
    chance += Math.min(lossStreak, BOOST_LOSS_CAP) * BOOST_PER_LOSS;
    if (balance <= bet * CRITICAL_BALANCE_HANDS) {
        chance += BOOST_CRITICAL;   // comeback: keep the session alive
    } else if (balance <= bet * LOW_BALANCE_HANDS) {
        chance += BOOST_LOW;
    }
    return Math.min(chance, BOOST_MAX);
}

let deck = [];
let hand = [];
let held = [false, false, false, false, false];
let balance = 500;
let bet = 10;
let gameState = 'bet';
let lastHandType = null;
let totalWon = 0;
let totalLost = 0;
let handsPlayed = 0;
let lossStreak = 0;
let winStreak = 0;
let bestStreak = 0;
let lastWinAmount = 0;

// --- State persistence (localStorage) ---
function getDefaultBet() {
    try {
        const stored = parseInt(localStorage.getItem('vp_default_bet'), 10);
        if ([5, 10, 20, 50].includes(stored)) return stored;
    } catch (e) {}
    return 10;
}

function saveGameState() {
    try {
        const state = {
            balance: balance,
            bet: bet,
            totalWon: totalWon,
            totalLost: totalLost,
            handsPlayed: handsPlayed,
            lossStreak: lossStreak,
            winStreak: winStreak,
            bestStreak: bestStreak,
            savedAt: Date.now()
        };
        localStorage.setItem('vp_game_state', JSON.stringify(state));
    } catch (e) { /* localStorage unavailable, silently fail */ }
}

function restoreGameState() {
    try {
        const raw = localStorage.getItem('vp_game_state');
        if (!raw) return false;
        const state = JSON.parse(raw);
        balance = typeof state.balance === 'number' ? state.balance : 500;
        totalWon = state.totalWon || 0;
        totalLost = state.totalLost || 0;
        handsPlayed = state.handsPlayed || 0;
        lossStreak = state.lossStreak || 0;
        winStreak = state.winStreak || 0;
        bestStreak = state.bestStreak || 0;
        document.getElementById('balance').textContent = balance;
        return true;
    } catch (e) { return false; }
}

function doRebuy() {
    balance = 500;
    document.getElementById('balance').textContent = balance;
    saveGameState();
    showToast('♻ +500 credits');
}

function renderPayouts() {
    const payoutsEl = document.getElementById('payouts');
    payoutsEl.innerHTML = '';
    const handOrder = HAND_ORDERS[gameVariant];
    handOrder.forEach(handType => {
        const row = document.createElement('div');
        row.className = 'payout-row';
        row.innerHTML = `<div class="payout-hand">${handType}</div><div class="payout-value">${currentPayouts[handType]}</div>`;
        payoutsEl.appendChild(row);
    });
}

function setBet(amount) {
    bet = amount;
    updateTotalBetDisplay();
    document.querySelectorAll('.bet-row .bet-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    const btn = document.getElementById('bet-' + amount);
    if (btn) btn.classList.add('selected');
}

function updateTotalBetDisplay() {
    const el = document.getElementById('bet-display');
    if (el) el.textContent = bet * multiHandCount;
}

function createDeck() {
    const d = [];
    for (let suit of SUITS) {
        for (let rank of RANKS) {
            d.push({ rank, suit });
        }
    }
    return d;
}

function shuffle(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
}

function boostHand() {
    if (Math.random() >= getBoostChance()) return;

    const rankCounts = {};
    hand.forEach(c => rankCounts[c.rank] = (rankCounts[c.rank] || 0) + 1);
    const counts = Object.values(rankCounts).sort((a, b) => b - a);

    if (counts[0] >= 2) return;

    const targetRank = hand[Math.floor(Math.random() * 5)].rank;
    const usedSuits = hand.filter(c => c.rank === targetRank).map(c => c.suit);
    const availableSuits = SUITS.filter(s => !usedSuits.includes(s));
    if (availableSuits.length === 0) return;
    const newSuit = availableSuits[Math.floor(Math.random() * availableSuits.length)];
    const newCard = { rank: targetRank, suit: newSuit };

    const otherIndices = hand.map((c, i) => c.rank !== targetRank ? i : -1).filter(i => i !== -1);
    if (otherIndices.length === 0) return;
    const replaceIdx = otherIndices[Math.floor(Math.random() * otherIndices.length)];

    const oldCard = hand[replaceIdx];
    deck.push(oldCard);
    hand[replaceIdx] = newCard;
    const deckIdx = deck.findIndex(c => c.rank === newCard.rank && c.suit === newCard.suit);
    if (deckIdx !== -1) deck.splice(deckIdx, 1);
}

// --- Multi-hand mode (Triple/Five Play) — unlocks at level 10 ---
let multiHandCount = 1;
let dealtHand = [];
try {
    const savedMulti = parseInt(localStorage.getItem('vp_multi_hands'), 10);
    if ([1, 3, 5].includes(savedMulti)) multiHandCount = savedMulti;
} catch (e) {}

function setMultiHand(n) {
    if (![1, 3, 5].includes(n) || gameState !== 'bet') return;
    if (n > 1 && !multiHandUnlocked()) {
        showToast('🔒 Multi-hand unlocks at level ' + MULTI_HAND_MIN_LEVEL);
        return;
    }
    multiHandCount = n;
    try { localStorage.setItem('vp_multi_hands', String(n)); } catch (e) {}
    updateMultiHandUI();
    updateTotalBetDisplay();
}

function updateMultiHandUI() {
    [1, 3, 5].forEach(function(n) {
        const btn = document.getElementById('multi-' + n);
        if (!btn) return;
        btn.classList.toggle('selected', multiHandCount === n);
        btn.classList.toggle('locked', n > 1 && !multiHandUnlocked());
    });
}

function renderMultiHands(extraResults) {
    const wrap = document.getElementById('multi-hands');
    if (!wrap) return;
    wrap.innerHTML = '';
    if (!extraResults || !extraResults.length) return;
    extraResults.forEach(function(r) {
        const row = document.createElement('div');
        row.className = 'multi-hand-row' + (r.win > 0 ? ' won' : '');
        const cards = r.hand.map(function(c) {
            const red = c.suit === '♥' || c.suit === '♦';
            return '<span class="mini-card' + (red ? ' red' : '') + '">' + c.rank + c.suit + '</span>';
        }).join('');
        const label = r.win > 0
            ? '<span class="mh-win">' + r.type + ' +' + r.win + '</span>'
            : '<span class="mh-lose">—</span>';
        row.innerHTML = cards + label;
        wrap.appendChild(row);
    });
}

function deal() {
    if (balance < bet) {
        if (balance === 0) {
            doRebuy();
        } else {
            bet = Math.max(5, Math.floor(balance / 5) * 5);
            if (bet > balance) bet = 5;
            setBet(bet);
            if (balance < bet) {
                doRebuy();
            }
        }
    }
    // Drop to an affordable hand count rather than force a rebuy loop
    if (multiHandCount > 1 && balance < bet * multiHandCount) {
        setMultiHand(bet * 3 <= balance ? 3 : 1);
    }
    const totalBet = bet * multiHandCount;

    // Clean up celebration classes & overlays
    document.body.classList.remove('screen-shake');
    document.querySelectorAll('.flash-overlay, .confetti-burst-piece, .gold-rain-piece').forEach(el => el.remove());

    balance -= totalBet;
    document.getElementById('balance').textContent = balance;

    deck = createDeck();
    shuffle(deck);
    hand = deck.splice(0, 5);
    boostHand();
    dealtHand = hand.slice();
    held = [false, false, false, false, false];
    gameState = 'hold';

    renderHand();
    renderMultiHands([]);
    document.getElementById('deal-btn').disabled = true;
    document.getElementById('hold-btn').disabled = false;
    lastHandType = null;
    const resultEl = document.getElementById('result');
    resultEl.className = 'result-panel';
    resultEl.textContent = 'Place your bet and deal to play';
    document.getElementById('explanation').innerHTML = '';
    if (window.vpRenderHints) vpRenderHints();
    triggerHaptic('MEDIUM');
}

function getStreakBonus(streak) {
    if (streak >= 10) return 0.5;
    if (streak >= 7) return 0.3;
    if (streak >= 5) return 0.2;
    if (streak >= 3) return 0.1;
    return 0;
}

function draw() {
    // Perfect-play tracking must see the pre-draw hand + holds
    if (window.vpOnDrawCheckPerfect) vpOnDrawCheckPerfect();

    // Replace unheld cards
    for (let i = 0; i < 5; i++) {
        if (!held[i]) {
            hand[i] = deck.pop();
        }
    }
    const result = evaluateForVariant(hand);
    const handType = result.type;
    lastHandType = handType;
    const winIndices = result.winIndices || [];
    const thirdMatchIndices = result.thirdMatchIndices || [];
    const secondPairIndices = result.secondPairIndices || [];
    let win = bet * currentPayouts[handType];
    let bestType = handType;

    // Extra hands (Triple/Five Play): same deal, independent draws
    const extraResults = [];
    if (multiHandCount > 1 && dealtHand.length === 5) {
        for (let k = 1; k < multiHandCount; k++) {
            const sideDeck = createDeck().filter(c =>
                !dealtHand.some(d => d.rank === c.rank && d.suit === c.suit));
            shuffle(sideDeck);
            const sideHand = dealtHand.map((c, i) => held[i] ? c : sideDeck.pop());
            const sideRes = evaluateForVariant(sideHand);
            const sideWin = bet * currentPayouts[sideRes.type];
            win += sideWin;
            if ((HAND_RANK[sideRes.type] || 0) > (HAND_RANK[bestType] || 0)) bestType = sideRes.type;
            extraResults.push({ hand: sideHand, type: sideRes.type, win: sideWin });
        }
    }
    const totalBet = bet * multiHandCount;

    if (win > 0) {
        winStreak++;
        const streakBonus = getStreakBonus(winStreak);
        if (streakBonus > 0) win += Math.round(win * streakBonus);
    } else {
        winStreak = 0;
    }
    updateStreakUI(win > 0);
    lastWinAmount = win;
    balance += win;
    handsPlayed++;
    addLifetimeHand();
    recordAllTimeHand(win, totalBet, winStreak > bestStreak ? winStreak : bestStreak);

    if (win > 0) {
        totalWon += win;
        lossStreak = 0;
        currentPayouts = { ...basePayouts() };
    } else {
        totalLost += totalBet;
        lossStreak++;
        for (let key in currentPayouts) {
            if (key !== 'Nothing') currentPayouts[key]++;
        }
    }
    renderMultiHands(extraResults);
    updateStats();
    renderPayouts();
    updateVariantUI();
    updateMultiHandUI();

    if (win === 0) {
        document.getElementById('balance').textContent = balance;
        playSound('loss');
    } else {
        triggerWinCelebration(bestType, win);
        triggerHaptic('HEAVY');
    }
    saveGameState();
    if (window.pushNetProfit) pushNetProfit();
    if (window.renderPlayFriendsWidgets) renderPlayFriendsWidgets();

    const resultEl = document.getElementById('result');

    if (win > 0) {
        resultEl.className = 'result-panel';
        resultEl.innerHTML = `<span class="win">🎉 ${handType}! +${win} credits! 🎉</span>`;
        document.getElementById('explanation').textContent = EXPLANATIONS[handType] || '';
    } else {
        resultEl.className = 'result-panel';
        resultEl.innerHTML = `<span>Nothing — ${hand.map(c => c.rank + c.suit).join(' ')}</span>`;
        document.getElementById('explanation').textContent = EXPLANATIONS[handType] || '';
    }

    renderHand(winIndices, thirdMatchIndices, secondPairIndices, true);

    gameState = 'bet';
    document.getElementById('deal-btn').disabled = false;
    document.getElementById('hold-btn').disabled = true;
}

function toggleHold(i) {
    if (gameState !== 'hold') return;
    held[i] = !held[i];
    renderHand([], [], [], false, false);
    playSound('click');
    triggerHaptic('LIGHT');
}

function getWinBadgeText(cardIndex, handType) {
    const card = hand[cardIndex];
    const ranks = hand.map(c => c.rank);
    const rankCounts = {};
    ranks.forEach(r => rankCounts[r] = (rankCounts[r] || 0) + 1);

    const rankLabel = card.rank;

    if (handType === 'Jacks or Better' || handType === 'Two Pair') {
        return WIN_LABELS.pair + ' ' + rankLabel;
    }
    if (handType === 'Three of a Kind') {
        return WIN_LABELS.threeOfKind;
    }
    if (handType === 'Full House') {
        const count = rankCounts[card.rank] || 0;
        if (count === 3) return WIN_LABELS.threeOfKind;
        if (count === 2) return WIN_LABELS.pair + ' ' + rankLabel;
    }
    if (handType === 'Four of a Kind' || handType === 'Four Aces' ||
        handType === 'Four 2s-4s' || handType === 'Four 5s-Ks') {
        return WIN_LABELS.fourOfKind;
    }
    if (handType === 'Straight') return WIN_LABELS.straight;
    if (handType === 'Flush') return WIN_LABELS.flush;
    if (handType === 'Straight Flush') return WIN_LABELS.straightFlush;
    if (handType === 'Royal Flush') return WIN_LABELS.royalFlush;
    return '';
}

function renderHand(winningIndices = [], thirdMatchIndices = [], secondPairIndices = [], isDraw = false, animateFlip = true) {
    const handEl = document.getElementById('hand');
    handEl.innerHTML = '';
    const anyHeld = held.some(h => h);

    const PIP_MAPS = {
        '2': [1, 13],
        '3': [1, 7, 13],
        '4': [0, 2, 12, 14],
        '5': [0, 2, 7, 12, 14],
        '6': [0, 2, 6, 8, 12, 14],
        '7': [0, 2, 6, 8, 12, 14, 4],
        '8': [0, 2, 6, 8, 12, 14, 4, 10],
        '9': [0, 2, 3, 5, 9, 11, 12, 14, 7],
        '10': [0, 2, 3, 5, 9, 11, 12, 14, 4, 10]
    };

    hand.forEach((card, i) => {
        const cardEl = document.createElement('div');
        const isResult = winningIndices.length > 0 || thirdMatchIndices.length > 0 || secondPairIndices.length > 0;

        const shouldStartFlipped = animateFlip && (isDraw ? !held[i] : true);

        const isHeld = !isResult && held[i];
        const isUnheld = !isResult && anyHeld && !held[i];
        let classes = `card ${shouldStartFlipped ? 'flipped' : ''} ${isHeld ? 'held' : ''} ${isUnheld ? 'unheld' : ''} ${card.suit === '♥' || card.suit === '♦' ? 'red' : ''}`;

        if (winningIndices.includes(i)) classes += ' winning';
        if (secondPairIndices.includes(i)) classes += ' second-pair';
        if (thirdMatchIndices.includes(i)) classes += ' third-match';

        cardEl.className = classes.trim();
        cardEl.onclick = () => toggleHold(i);
        const SUIT_NAMES = { '♠': 'Spades', '♥': 'Hearts', '♦': 'Diamonds', '♣': 'Clubs' };
        const RANK_NAMES = { 'A': 'Ace', 'J': 'Jack', 'Q': 'Queen', 'K': 'King' };
        cardEl.setAttribute('role', 'button');
        cardEl.setAttribute('tabindex', '0');
        cardEl.setAttribute('aria-pressed', held[i] ? 'true' : 'false');
        cardEl.setAttribute('aria-label',
            (RANK_NAMES[card.rank] || card.rank) + ' of ' + SUIT_NAMES[card.suit] + (held[i] ? ', held' : ''));
        cardEl.onkeydown = (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleHold(i); }
        };
        cardEl.dataset.suit = card.suit;

        const winBadgeText = isResult ? getWinBadgeText(i, lastHandType) : '';

        let centerContent = '';
        if (card.rank === 'A') {
            centerContent = `<div class="card-suit-large">${card.suit}</div>`;
        } else if (['J', 'Q', 'K'].includes(card.rank)) {
            centerContent = `<div class="card-royalty-center rank-${card.rank}">${card.rank === 'J' ? '⚔️' : card.rank === 'Q' ? '👑' : '🛡️'}</div>`;
        } else {
            const pips = PIP_MAPS[card.rank] || [];
            let gridHtml = '<div class="pip-grid">';
            for (let cell = 0; cell < 15; cell++) {
                const isActive = pips.includes(cell);
                gridHtml += `<div class="pip ${isActive ? 'active' : ''}">${card.suit}</div>`;
            }
            gridHtml += '</div>';
            centerContent = gridHtml;
        }

        cardEl.innerHTML = `
            <div class="held-badge">HELD</div>
            <div class="win-badge">${winBadgeText}</div>
            <div class="card-inner">
                <div class="card-front">
                    <div class="card-index top-left">
                        <div class="card-index-rank">${card.rank}</div>
                        <div class="card-index-suit">${card.suit}</div>
                    </div>
                    ${centerContent}
                    <div class="card-index bottom-right">
                        <div class="card-index-rank">${card.rank}</div>
                        <div class="card-index-suit">${card.suit}</div>
                    </div>
                </div>
                <div class="card-back"></div>
            </div>
        `;
        handEl.appendChild(cardEl);
    });

    const placeholder = document.getElementById('hand-placeholder-text');
    if (placeholder) placeholder.classList.toggle('hidden', hand.length > 0);

    if (animateFlip) {
        let flipDelayIndex = 0;
        hand.forEach((card, i) => {
            const cardEl = handEl.children[i];
            if (cardEl && cardEl.classList.contains('flipped')) {
                setTimeout(() => {
                    const inner = cardEl.querySelector('.card-inner');
                    if (inner) {
                        inner.classList.add('animating');
                        cardEl.classList.remove('flipped');
                        playSound('deal');
                        setTimeout(() => {
                            inner.classList.remove('animating');
                        }, 600);
                    }
                }, flipDelayIndex * 250);
                flipDelayIndex++;
            }
        });
    }

    if (window.vpApplyHintClasses && gameState === 'hold') vpApplyHintClasses();
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

function evaluateForVariant(h) {
    if (gameVariant === 'deuces') return evaluateDeucesHand(h);
    const result = evaluateHand(h);
    if (result.type === 'Four of a Kind' && (gameVariant === 'bonus' || gameVariant === 'doubleBonus')) {
        const rankCounts = {};
        h.forEach(c => rankCounts[c.rank] = (rankCounts[c.rank] || 0) + 1);
        const quadRank = Object.keys(rankCounts).find(r => rankCounts[r] === 4);
        if (quadRank === 'A') result.type = 'Four Aces';
        else if (['2', '3', '4'].includes(quadRank)) result.type = 'Four 2s-4s';
        else result.type = 'Four 5s-Ks';
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

function updateStats() {
    if (window.renderStatsScreen) renderStatsScreen();
}

function updateStreakUI(justWon) {
    const bar = document.getElementById('streak-bar');
    const count = document.getElementById('streak-count');
    const tag = document.getElementById('streak-bonus-tag');
    count.textContent = winStreak;
    bar.classList.toggle('active', winStreak >= 2);
    const bonus = getStreakBonus(winStreak);
    if (bonus > 0) {
        tag.textContent = '+' + Math.round(bonus * 100) + '% payout bonus';
        tag.classList.remove('hidden');
    } else {
        tag.classList.add('hidden');
    }
    if (justWon && winStreak >= 2) {
        bar.classList.remove('bump');
        void bar.offsetWidth;
        bar.classList.add('bump');
    }
    if (winStreak > bestStreak) {
        bestStreak = winStreak;
    }
}

// --- Initialize ---
function initGame() {
    bet = getDefaultBet();
    restoreGameState();
    setBet(bet);
    updateVariantUI();
    updateMultiHandUI();
    renderPayouts();
    document.getElementById('hold-btn').disabled = true;
}

document.addEventListener('keydown', function(e) {
    if (e.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
    if (gameState === 'hold' && ['1', '2', '3', '4', '5'].includes(e.key)) {
        toggleHold(parseInt(e.key, 10) - 1);
        return;
    }
    const keyMap = { '1': 5, '2': 10, '3': 20, '4': 50 };
    if (keyMap[e.key] && gameState === 'bet') setBet(keyMap[e.key]);
    if (e.key === 'd' || e.key === 'D') {
        if (gameState === 'bet' && !document.getElementById('deal-btn').disabled) deal();
        else if (gameState === 'hold') draw();
    }
});
