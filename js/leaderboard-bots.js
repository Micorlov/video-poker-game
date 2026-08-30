// Simulated rivals for the Hourly/Daily leaderboards — client-side only.
// Firestore rules only allow each client to write its own uid, so these entries
// are generated locally, persisted in localStorage per period, and merged into
// the real snapshot lists at render time. Each player sees a personalized board:
// bots trail just below the player's score, and every few minutes one rival
// bumps itself just above the player so there is always a #1 spot to chase.

const BOT_UID_PREFIX = 'bot_';
const BOT_COUNT_MIN = 4;
const BOT_COUNT_MAX = 6;
const BOT_CYCLE_MS_MIN = 180000;      // 3 min between rival overtakes
const BOT_CYCLE_MS_MAX = 300000;      // 5 min
const BOT_OVERTAKE_RETRY_MS = 45000;  // re-check soon while the player is still chasing
const BOT_OVERTAKE_MARGIN_MIN = 2;    // rival lands just above the player
const BOT_OVERTAKE_MARGIN_MAX = 12;
const BOT_TRAIL_FRACTION_MIN = 0.45;  // trailing bots sit at 45–95% of the player's score
const BOT_TRAIL_FRACTION_MAX = 0.95;
const BOT_DRIFT_CHANCE = 0.5;         // per tick, chance a trailing bot creeps upward
const BOT_SEED_HOURLY_MIN = 2;        // fresh-period seed scores (pts)
const BOT_SEED_HOURLY_MAX = 18;
const BOT_SEED_DAILY_MIN = -30;       // daily is net profit — may start negative
const BOT_SEED_DAILY_MAX = 150;
const BOT_STORAGE_PREFIX = 'vp_bots_'; // + boardType ('hourly' | 'daily')

const BOT_POOL = [
    { name: 'Omar M.',     country: 'EG' },
    { name: 'Youssef A.',  country: 'EG' },
    { name: 'Amira S.',    country: 'EG' },
    { name: 'Abdullah R.', country: 'SA' },
    { name: 'Fatima H.',   country: 'SA' },
    { name: 'Ahmed K.',    country: 'AE' },
    { name: 'Mariam B.',   country: 'AE' },
    { name: 'Rania T.',    country: 'JO' },
    { name: 'Layla N.',    country: 'LB' },
    { name: 'Dana F.',     country: 'LB' },
    { name: 'Mehmet Y.',   country: 'TR' },
    { name: 'Zeynep D.',   country: 'TR' },
    { name: 'Tariq J.',    country: 'QA' },
    { name: 'Noor A.',     country: 'KW' },
    { name: 'Karim E.',    country: 'MA' },
    { name: 'Yael B.',     country: 'IL' },
    { name: 'Avi S.',      country: 'IL' },
    { name: 'Salim W.',    country: 'OM' }
];

function botHashSeed(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
}

function botMulberry32(seed) {
    let a = seed >>> 0;
    return function() {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function botRandBetween(rand, min, max) {
    return min + rand() * (max - min);
}

function botRandInt(rand, min, max) {
    return Math.floor(botRandBetween(rand, min, max + 1));
}

function botUidFor(profile) {
    return BOT_UID_PREFIX +
        profile.name.toLowerCase().replace(/[^a-z]+/g, '') + '_' +
        profile.country.toLowerCase();
}

// Deterministic per-player, per-period roster with seeded personalities.
function createBotState(boardType, periodKey) {
    const uid = window.egUser ? window.egUser.uid : '';
    const rand = botMulberry32(botHashSeed(periodKey + '|' + boardType + '|' + uid));
    const pool = BOT_POOL.slice();
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        const tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
    }
    const count = botRandInt(rand, BOT_COUNT_MIN, BOT_COUNT_MAX);
    const seedMin = boardType === 'daily' ? BOT_SEED_DAILY_MIN : BOT_SEED_HOURLY_MIN;
    const seedMax = boardType === 'daily' ? BOT_SEED_DAILY_MAX : BOT_SEED_HOURLY_MAX;
    const bots = pool.slice(0, count).map(function(profile) {
        return {
            uid: botUidFor(profile),
            displayName: profile.name,
            country: profile.country,
            score: botRandInt(rand, seedMin, seedMax),
            trailFraction: botRandBetween(rand, BOT_TRAIL_FRACTION_MIN, BOT_TRAIL_FRACTION_MAX)
        };
    });
    return {
        periodKey: periodKey,
        bots: bots,
        rivalIndex: 0,
        nextOvertakeAt: Date.now() + botRandBetween(rand, BOT_CYCLE_MS_MIN, BOT_CYCLE_MS_MAX)
    };
}

function loadBotState(boardType, periodKey) {
    try {
        const raw = JSON.parse(localStorage.getItem(BOT_STORAGE_PREFIX + boardType));
        if (raw && raw.periodKey === periodKey && Array.isArray(raw.bots) && raw.bots.length) {
            return raw;
        }
    } catch (e) { /* corrupt or unavailable — regenerate below */ }
    return createBotState(boardType, periodKey);
}

function saveBotState(boardType, state) {
    try { localStorage.setItem(BOT_STORAGE_PREFIX + boardType, JSON.stringify(state)); } catch (e) { /* localStorage unavailable */ }
}

function botMaxScore(bots) {
    return bots.reduce(function(max, b) { return Math.max(max, b.score); }, -Infinity);
}

// Advance the simulation one tick and return entries shaped like real Firestore ones.
// Scores only ever ratchet upward, so ranks never visibly drop mid-period.
function getBotEntries(boardType, periodKey, playerScore, playerActive, valueField) {
    const state = loadBotState(boardType, periodKey);
    const now = Date.now();

    if (!playerActive) {
        saveBotState(boardType, state);
        return botEntriesFrom(state.bots, valueField);
    }

    // Trailing bots creep toward a fixed fraction of the player's score,
    // capped just below it so only the designated rival ever overtakes.
    const updatedBots = state.bots.map(function(bot, i) {
        if (i === state.rivalIndex || Math.random() >= BOT_DRIFT_CHANCE) return bot;
        const target = Math.min(Math.floor(playerScore * bot.trailFraction), playerScore - 1);
        return Object.assign({}, bot, { score: Math.max(bot.score, target) });
    });

    let rivalIndex = state.rivalIndex;
    let nextOvertakeAt = state.nextOvertakeAt;
    if (now >= state.nextOvertakeAt) {
        if (playerScore > botMaxScore(updatedBots)) {
            rivalIndex = (state.rivalIndex + 1) % updatedBots.length;
            const rival = updatedBots[rivalIndex];
            const margin = BOT_OVERTAKE_MARGIN_MIN +
                Math.floor(Math.random() * (BOT_OVERTAKE_MARGIN_MAX - BOT_OVERTAKE_MARGIN_MIN + 1));
            updatedBots[rivalIndex] = Object.assign({}, rival, {
                score: Math.max(rival.score, playerScore + margin)
            });
            nextOvertakeAt = now + BOT_CYCLE_MS_MIN +
                Math.random() * (BOT_CYCLE_MS_MAX - BOT_CYCLE_MS_MIN);
        } else {
            nextOvertakeAt = now + BOT_OVERTAKE_RETRY_MS;
        }
    }

    saveBotState(boardType, {
        periodKey: state.periodKey,
        bots: updatedBots,
        rivalIndex: rivalIndex,
        nextOvertakeAt: nextOvertakeAt
    });
    return botEntriesFrom(updatedBots, valueField);
}

function botEntriesFrom(bots, valueField) {
    return bots.map(function(bot) {
        const entry = { uid: bot.uid, displayName: bot.displayName, country: bot.country };
        entry[valueField] = bot.score;
        return entry;
    });
}

// Merge without mutating the Firestore snapshot arrays.
function mergeBotEntries(realList, botEntries, valueField) {
    return realList.slice().concat(botEntries).sort(function(a, b) {
        return (b[valueField] || 0) - (a[valueField] || 0);
    });
}
