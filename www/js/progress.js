// Local progression — replaces the old Firebase-backed XP/level system.
// Level is derived from lifetime hands played (persisted separately from
// the session/"Today" stats), and drives the same variant/multi-hand
// unlock thresholds the game always used.
const LEVEL_HANDS_PER_LEVEL = 5;

function getLifetimeHands() {
    try { return parseInt(localStorage.getItem('vp_lifetime_hands'), 10) || 0; } catch (e) { return 0; }
}

function addLifetimeHand() {
    const n = getLifetimeHands() + 1;
    try { localStorage.setItem('vp_lifetime_hands', String(n)); } catch (e) {}
    return n;
}

function getLocalLevel() {
    return 1 + Math.floor(getLifetimeHands() / LEVEL_HANDS_PER_LEVEL);
}

// --- All-time stats accumulator (the "Today" counters in game.js are session-only) ---
function loadAllTimeStats() {
    try {
        const raw = localStorage.getItem('vp_alltime_stats');
        if (raw) return JSON.parse(raw);
    } catch (e) {}
    return { won: 0, lost: 0, handsPlayed: 0, bestStreak: 0 };
}

function saveAllTimeStats(stats) {
    try { localStorage.setItem('vp_alltime_stats', JSON.stringify(stats)); } catch (e) {}
}

function recordAllTimeHand(win, totalBet, streak) {
    const stats = loadAllTimeStats();
    stats.handsPlayed++;
    if (win > 0) stats.won += win; else stats.lost += totalBet;
    if (streak > stats.bestStreak) stats.bestStreak = streak;
    saveAllTimeStats(stats);
    return stats;
}

function resetAllTimeStats() {
    saveAllTimeStats({ won: 0, lost: 0, handsPlayed: 0, bestStreak: 0 });
}
