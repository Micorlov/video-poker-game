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
        showToast(t('toast.unlockLevel', { level: VARIANT_MIN_LEVEL[v] }));
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
            lockEl.textContent = locked ? t('play.unlockAt', { level: VARIANT_MIN_LEVEL[v] }) : '';
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
const BOOST_FLUSH_SHARE = 0.25;   // of triggered boosts (non-critical), aim for a 4-to-flush tease instead of a pair
const FLUSH_BOOST_TARGET = 4;     // "4 cards to a flush" is the classic nail-biter shape

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
let balance = STARTING_BALANCE;
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
let bestBalance = 0;

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
            bestBalance: bestBalance,
            savedAt: Date.now()
        };
        localStorage.setItem('vp_game_state', JSON.stringify(state));
    } catch (e) { /* localStorage unavailable, silently fail */ }
    if (window.schedulePushCloudState) schedulePushCloudState();
}

function restoreGameState() {
    try {
        const raw = localStorage.getItem('vp_game_state');
        if (!raw) return false;
        const state = JSON.parse(raw);
        balance = typeof state.balance === 'number' ? state.balance : STARTING_BALANCE;
        totalWon = state.totalWon || 0;
        totalLost = state.totalLost || 0;
        handsPlayed = state.handsPlayed || 0;
        lossStreak = state.lossStreak || 0;
        winStreak = state.winStreak || 0;
        bestStreak = state.bestStreak || 0;
        bestBalance = state.bestBalance || 0;
        document.getElementById('balance').textContent = formatNumber(balance);
        return true;
    } catch (e) { return false; }
}

function doRebuy() {
    balance = STARTING_BALANCE;
    document.getElementById('balance').textContent = formatNumber(balance);
    // The stack is back to the starting amount, so past referral coins are gone
    // too — drop them from the net-profit baseline or the board reads negative.
    if (window.resetReferralBaseline) resetReferralBaseline();
    saveGameState();
    showToast(t('toast.rebuy', { amount: formatNumber(STARTING_BALANCE) }));
    if (window.pushDailyRebuy) pushDailyRebuy();
}

const TICKER_HAND_COUNT = 4;

function renderPaytableTicker() {
    const el = document.getElementById('paytable-ticker');
    if (!el) return;
    el.innerHTML = '';
    HAND_ORDERS[gameVariant]
        .filter(handType => currentPayouts[handType] > 0)
        .slice(0, TICKER_HAND_COUNT)
        .forEach(handType => {
            const item = document.createElement('span');
            item.className = 'paytable-ticker-item';
            item.textContent = vpHandTicker(handType) + ' ' + currentPayouts[handType] + '×';
            el.appendChild(item);
        });
}

function renderVariantLabel() {
    const el = document.getElementById('variant-display');
    if (el) el.textContent = t('variant.' + gameVariant);
}

function renderPayouts() {
    const payoutsEl = document.getElementById('payouts');
    payoutsEl.innerHTML = '';
    const handOrder = HAND_ORDERS[gameVariant];
    handOrder.forEach(handType => {
        const row = document.createElement('div');
        row.className = 'payout-row';
        row.innerHTML = `<div class="payout-hand">${vpHandLabel(handType)}</div><div class="payout-value">${currentPayouts[handType]}</div>`;
        payoutsEl.appendChild(row);
    });
    renderPaytableTicker();
    renderVariantLabel();
}

function setBet(amount) {
    // The stake is charged at deal time but the payout is computed at draw
    // time, so it must stay locked for the duration of the hand.
    if (gameState !== 'bet') return;
    bet = amount;
    updateTotalBetDisplay();
    document.querySelectorAll('.bet-row .bet-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    const btn = document.getElementById('bet-' + amount);
    if (btn) btn.classList.add('selected');
}

// --- All In: limited daily uses ---
const ALLIN_DAILY_LIMIT_DEFAULT = 1;
// Onboarding promises "invite a friend to unlock another" — this delivers it:
// each referred friend adds one daily All-In, capped to protect the economy.
const ALLIN_REFERRAL_BONUS_CAP = 2;
let allInUsesToday = 0;

function getAllInDailyLimit() {
    const configured = window.egFeatures && window.egFeatures.allInDailyLimit;
    try {
        const base = (typeof configured === 'number' && configured > 0) ? configured : ALLIN_DAILY_LIMIT_DEFAULT;
        const invited = window.getReferralInvitedCount ? getReferralInvitedCount() : 0;
        return base + Math.min(invited, ALLIN_REFERRAL_BONUS_CAP);
    } catch (e) {
        // The very first applyFeatureFlags() (js/firebase.js) runs before this
        // script's top-level consts initialize — fall back to the config value.
        return (typeof configured === 'number' && configured > 0) ? configured : 1;
    }
}

function loadAllInUsage() {
    try {
        const raw = JSON.parse(localStorage.getItem('vp_allin_usage'));
        allInUsesToday = (raw && raw.date === new Date().toDateString()) ? (raw.count || 0) : 0;
    } catch (e) {
        allInUsesToday = 0;
    }
    syncLastPlayedDate();
}

function syncLastPlayedDate() {
    if (!window.egUser || typeof db === 'undefined') return;
    const today = new Date().toISOString().slice(0, 10);
    firebaseSafe(function() {
        return db.collection('users').doc(window.egUser.uid).set({ lastPlayedDate: today }, { merge: true });
    });
}

function saveAllInUsage() {
    try {
        localStorage.setItem('vp_allin_usage', JSON.stringify({ date: new Date().toDateString(), count: allInUsesToday }));
    } catch (e) { /* localStorage unavailable, silently fail */ }
}

function getAllInRemaining() {
    try {
        return Math.max(0, getAllInDailyLimit() - allInUsesToday);
    } catch (e) {
        // Called before this script's own state has initialized — try again later.
        return getAllInDailyLimit();
    }
}

function updateAllInUI() {
    const remaining = getAllInRemaining();
    const badge = document.getElementById('allin-badge');
    // The count and the word travel together: a CSS ::after suffix could not
    // be translated.
    if (badge) badge.textContent = t('play.allInLeft', { n: remaining });
    const btn = document.getElementById('bet-allin');
    if (btn) btn.classList.toggle('depleted', remaining === 0);
}

// --- All In confirmation sheet (slide-to-confirm) ---
let allInPendingAmount = 0;
let allInDragging = false;
// The bet in effect right before ALL IN was confirmed, so the bet buttons
// can revert to it once the ALL IN hand is done instead of staying stuck
// on ALL IN for the next hand.
let betBeforeAllIn = null;

function openAllInSheet() {
    // Unlike setBet(), All In is allowed mid-hand: it stakes whatever balance
    // remains on top of the bet already charged at deal time, so it can't
    // reproduce the deal-cheap/raise-later exploit that setBet() must block.
    if (gameState !== 'bet' && gameState !== 'hold') return;
    if (getAllInRemaining() <= 0) {
        // The scarcity moment is the invite hook (Ludo King model: invite
        // because you want something) — offer the unlock, not just a wall.
        openSheet('allin-unlock-sheet');
        return;
    }
    if (balance <= 0) {
        doRebuy();
        return;
    }
    const hands = multiHandCount || 1;
    allInPendingAmount = Math.max(1, Math.floor(balance / hands));
    const stake = allInPendingAmount * hands;
    const amountEl = document.getElementById('allin-sheet-amount');
    if (amountEl) amountEl.textContent = formatNumber(stake);
    const subEl = document.getElementById('allin-sheet-target');
    if (subEl) subEl.textContent = gameState === 'hold' ? t('play.thisHand') : t('play.theNextHand');

    // A mid-table hand makes the upside concrete without promising a royal.
    // Mid-hand, the payout is computed off the raised total stake, not just
    // the amount being added on top of the bet already on the table.
    const potentialEl = document.getElementById('allin-sheet-potential');
    if (potentialEl) {
        const multiplier = currentPayouts['Full House'] || 0;
        const newBetPerHand = (gameState === 'hold' ? bet : 0) + allInPendingAmount;
        potentialEl.textContent = formatNumber(newBetPerHand * multiplier * hands);
    }
    resetAllInSlider();
    openSheet('allin-sheet');
}

function closeAllInSheet() {
    closeSheet('allin-sheet');
    resetAllInSlider();
}

function resetAllInSlider() {
    const track = document.getElementById('allin-slider-track');
    const thumb = document.getElementById('allin-slider-thumb');
    const fill = document.getElementById('allin-slider-fill');
    if (thumb) thumb.style.left = '3px';
    if (fill) fill.style.width = '0px';
    if (track) track.classList.remove('confirmed');
}

function confirmAllIn() {
    // openAllInSheet() already restricts the gameState; guard the mutation
    // itself too so a stale open sheet can never run from an invalid state.
    if (gameState !== 'bet' && gameState !== 'hold') return;
    if (betBeforeAllIn === null) betBeforeAllIn = bet;
    if (gameState === 'hold') {
        // The initial stake was already charged in deal(); only the
        // additional amount is charged now, and it's charged immediately —
        // never left to be "raised" before draw() computes the payout.
        const hands = multiHandCount || 1;
        balance -= allInPendingAmount * hands;
        bet += allInPendingAmount;
        document.getElementById('balance').textContent = formatNumber(balance);
        updateTotalBetDisplay();
    } else {
        setBet(allInPendingAmount);
    }
    const btn = document.getElementById('bet-allin');
    if (btn) btn.classList.add('selected');
    allInUsesToday++;
    saveAllInUsage();
    updateAllInUI();
    closeSheet('allin-sheet');
    showToast(t('toast.allInGoodLuck'));
}

function initAllInSlider() {
    const track = document.getElementById('allin-slider-track');
    const thumb = document.getElementById('allin-slider-thumb');
    const fill = document.getElementById('allin-slider-fill');
    if (!track || !thumb || !fill) return;

    const CONFIRM_THRESHOLD = 0.85;
    let startX = 0;
    let thumbStartLeft = 3;
    let maxLeft = 0;

    function pointerX(e) {
        return e.touches ? e.touches[0].clientX : e.clientX;
    }

    function pointerMove(e) {
        if (!allInDragging) return;
        e.preventDefault();
        let left = thumbStartLeft + (pointerX(e) - startX);
        left = Math.max(3, Math.min(maxLeft, left));
        thumb.style.left = left + 'px';
        fill.style.width = (left + thumb.offsetWidth) + 'px';
    }

    function pointerUp() {
        if (!allInDragging) return;
        allInDragging = false;
        thumb.classList.remove('dragging');
        document.removeEventListener('mousemove', pointerMove);
        document.removeEventListener('mouseup', pointerUp);
        document.removeEventListener('touchmove', pointerMove);
        document.removeEventListener('touchend', pointerUp);

        const pct = maxLeft > 0 ? (thumb.offsetLeft - 3) / maxLeft : 0;
        if (pct >= CONFIRM_THRESHOLD) {
            thumb.style.left = maxLeft + 'px';
            fill.style.width = (maxLeft + thumb.offsetWidth) + 'px';
            track.classList.add('confirmed');
            confirmAllIn();
        } else {
            resetAllInSlider();
        }
    }

    function pointerDown(e) {
        allInDragging = true;
        thumb.classList.add('dragging');
        startX = pointerX(e);
        thumbStartLeft = thumb.offsetLeft;
        maxLeft = track.clientWidth - thumb.offsetWidth - 3;
        document.addEventListener('mousemove', pointerMove);
        document.addEventListener('mouseup', pointerUp);
        document.addEventListener('touchmove', pointerMove, { passive: false });
        document.addEventListener('touchend', pointerUp);
    }

    thumb.addEventListener('mousedown', pointerDown);
    thumb.addEventListener('touchstart', pointerDown, { passive: true });
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

    // Critical-balance rescues stay on the reliable pair path; everywhere else,
    // sometimes reach for the bigger emotional payoff of a 4-to-flush tease instead.
    const isCritical = balance <= bet * CRITICAL_BALANCE_HANDS;
    if (!isCritical && Math.random() < BOOST_FLUSH_SHARE) {
        boostToFlushDraw();
        return;
    }
    boostToPair();
}

function boostToPair() {
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

function boostToFlushDraw() {
    const suitCounts = {};
    hand.forEach(c => suitCounts[c.suit] = (suitCounts[c.suit] || 0) + 1);
    const bestSuit = Object.keys(suitCounts).reduce((a, b) => suitCounts[a] >= suitCounts[b] ? a : b);
    const count = suitCounts[bestSuit] || 0;
    if (count >= FLUSH_BOOST_TARGET || count === 5) return;

    const otherIndices = hand.map((c, i) => c.suit !== bestSuit ? i : -1).filter(i => i !== -1);
    const usedRanksInSuit = new Set(hand.filter(c => c.suit === bestSuit).map(c => c.rank));
    let needed = FLUSH_BOOST_TARGET - count;

    while (needed > 0 && otherIndices.length > 0) {
        const pickPos = Math.floor(Math.random() * otherIndices.length);
        const idx = otherIndices.splice(pickPos, 1)[0];
        const availableRanks = RANKS.filter(r => !usedRanksInSuit.has(r));
        if (availableRanks.length === 0) break;
        const newRank = availableRanks[Math.floor(Math.random() * availableRanks.length)];
        const newCard = { rank: newRank, suit: bestSuit };

        const oldCard = hand[idx];
        deck.push(oldCard);
        hand[idx] = newCard;
        usedRanksInSuit.add(newRank);
        const deckIdx = deck.findIndex(c => c.rank === newCard.rank && c.suit === newCard.suit);
        if (deckIdx !== -1) deck.splice(deckIdx, 1);
        needed--;
    }
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
        showToast(t('toast.multiHandUnlock', { level: MULTI_HAND_MIN_LEVEL }));
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

function updateMainButton() {
    const btn = document.getElementById('main-btn');
    const isDraw = gameState === 'hold';
    // Monochrome glyphs, not emoji — colour on this button belongs to the
    // green surface alone.
    btn.innerHTML = isDraw
        ? '<span class="main-btn-icon">↻</span>' + t('play.draw')
        : '<span class="main-btn-icon">♠</span>' + t('play.deal');
    btn.className = isDraw ? 'btn-secondary' : 'btn-primary';
}

function mainAction() {
    if (gameState === 'bet') deal();
    else if (gameState === 'hold') draw();
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
    document.getElementById('balance').textContent = formatNumber(balance);

    deck = createDeck();
    shuffle(deck);
    hand = deck.splice(0, 5);
    boostHand();
    dealtHand = hand.slice();
    held = [false, false, false, false, false];
    gameState = 'hold';

    renderHand();
    renderMultiHands([]);
    updateMainButton();
    lastHandType = null;
    const resultEl = document.getElementById('result');
    resultEl.className = 'result-panel';
    resultEl.textContent = t('play.handPlaceholder');
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
        // Phase 2: update personal best for stories
        if (window.checkAndUpdateBestHand) checkAndUpdateBestHand(bestType, win, hand);
        // Phase 2: push hourly champion points
        if (window.pushChampionPoints) pushChampionPoints(bestType, win);
        // Bracelets: track this player's max single win for the current hour/day
        if (window.pushBraceletProgress) pushBraceletProgress(bestType, win);
    } else {
        totalLost += totalBet;
        lossStreak++;
        for (let key in currentPayouts) {
            if (key !== 'Nothing') currentPayouts[key]++;
        }
    }
    if (window.pushDailyScore) pushDailyScore(bestType, win, totalBet);
    renderMultiHands(extraResults);
    updateStats();
    renderPayouts();
    updateVariantUI();
    updateMultiHandUI();

    if (win === 0) {
        document.getElementById('balance').textContent = formatNumber(balance);
        playSound('loss');
    } else {
        triggerWinCelebration(bestType, win);
        triggerHaptic('HEAVY');
    }
    // A rare hand or a fresh balance high is the emotional peak — the one
    // moment worth spending a prompt on. Guest → sign-in nudge; signed-in →
    // brag/share sheet (js/invite.js). Never both, never mid-celebration.
    if (win > 0) {
        const isRareHand = (HAND_RANK[bestType] || 0) >= 7;
        const isNewHigh = balance >= 2 * STARTING_BALANCE && balance > bestBalance;
        if (balance > bestBalance) bestBalance = balance;
        if (isRareHand || isNewHigh) {
            const peakHand = bestType;
            const peakWin = win;
            setTimeout(function() {
                if (!window.egUser) {
                    if (window.maybeShowSigninPrompt) maybeShowSigninPrompt('big_win');
                } else if (isRareHand && window.maybeOfferBigWinShare) {
                    maybeOfferBigWinShare(peakHand, peakWin);
                }
            }, 2600);
        }
    }
    saveGameState();
    if (window.pushNetProfit) pushNetProfit();
    if (window.renderPlayFriendsWidgets) renderPlayFriendsWidgets();

    const resultEl = document.getElementById('result');

    if (win > 0) {
        resultEl.className = 'result-panel result-panel-win';
        // Hand name, then the payout at display scale with its multiplier
        // alongside — the number is the news, the multiplier is the context.
        resultEl.innerHTML =
            `<span class="result-hand">${vpHandLabel(handType)}</span>` +
            `<span class="result-amount">` +
            `<span class="win">+${formatNumber(win)}</span>` +
            `<span class="result-mult">${currentPayouts[handType]}×</span>` +
            `</span>`;
        document.getElementById('explanation').textContent = vpHandExplanation(handType);
    } else {
        resultEl.className = 'result-panel';
        resultEl.innerHTML = `<span>${t('play.nothingResult', { cards: hand.map(c => c.rank + c.suit).join(' ') })}</span>`;
        document.getElementById('explanation').textContent = vpHandExplanation(handType);
    }

    renderHand(winIndices, thirdMatchIndices, secondPairIndices, true);

    gameState = 'bet';
    if (betBeforeAllIn !== null) {
        setBet(betBeforeAllIn);
        betBeforeAllIn = null;
    }
    updateMainButton();
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
        return t('win.pair') + ' ' + rankLabel;
    }
    if (handType === 'Three of a Kind') {
        return t('win.threeOfKind');
    }
    if (handType === 'Full House') {
        const count = rankCounts[card.rank] || 0;
        if (count === 3) return t('win.threeOfKind');
        if (count === 2) return t('win.pair') + ' ' + rankLabel;
    }
    if (handType === 'Four of a Kind' || handType === 'Four Aces' ||
        handType === 'Four 2s-4s' || handType === 'Four 5s-Ks') {
        return t('win.fourOfKind');
    }
    if (handType === 'Straight') return t('win.straight');
    if (handType === 'Flush') return t('win.flush');
    if (handType === 'Straight Flush') return t('win.straightFlush');
    if (handType === 'Royal Flush') return t('win.royalFlush');
    return '';
}

function renderHand(winningIndices = [], thirdMatchIndices = [], secondPairIndices = [], isDraw = false, animateFlip = true) {
    const handEl = document.getElementById('hand');
    handEl.innerHTML = '';
    const anyHeld = held.some(h => h);

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

        let winBadgeText = '';
        if (isResult) {
            const isPairHand = lastHandType === 'Two Pair' || lastHandType === 'Jacks or Better';
            if (isPairHand) {
                if (winningIndices.includes(i) || secondPairIndices.includes(i)) {
                    winBadgeText = getWinBadgeText(i, lastHandType);
                }
            } else {
                winBadgeText = getWinBadgeText(i, lastHandType);
            }
        }

        cardEl.innerHTML = `
            <div class="held-badge">HELD</div>
            <div class="win-badge">${winBadgeText}</div>
            <div class="card-inner">
                <div class="card-front">
                    <div class="card-face">
                        <div class="card-face-rank">${card.rank}</div>
                        <div class="card-face-suit">${card.suit}</div>
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
        tag.textContent = t('play.payoutBonus', { percent: Math.round(bonus * 100) });
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
    loadAllInUsage();
    updateAllInUI();
    initAllInSlider();
    renderPayouts();
    // Greet the player with an already-dealt hand, as if Deal was just pressed
    deal();
}

document.addEventListener('keydown', function(e) {
    if (e.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
    if (gameState === 'hold' && ['1', '2', '3', '4', '5'].includes(e.key)) {
        toggleHold(parseInt(e.key, 10) - 1);
        return;
    }
    const keyMap = { '1': 5, '2': 10, '3': 20, '4': 50 };
    if (keyMap[e.key] && gameState === 'bet') setBet(keyMap[e.key]);
    if (e.key === 'd' || e.key === 'D') mainAction();
});

// Repaint every label the game owns when the language changes. Cheaper and far
// safer than reloading: a reload mid-hand would discard the dealt cards.
if (window.vpOnLanguageChange) {
    vpOnLanguageChange(function() {
        renderVariantLabel();
        renderPaytableTicker();
        renderPayouts();
        updateVariantUI();
        updateMainButton();
        updateAllInUI();
        updateStreakUI(false);
        document.getElementById('balance').textContent = formatNumber(balance);
        // The result panel keeps the last hand's copy, so re-render it in the
        // new language rather than leaving a stale English sentence on screen.
        if (lastHandType) {
            document.getElementById('explanation').textContent = vpHandExplanation(lastHandType);
        }
    });
}
