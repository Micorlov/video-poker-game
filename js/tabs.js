// Bottom-nav screen switching + Stats/Settings screen rendering.

function showScreen(name) {
    ['play', 'stats', 'friends', 'settings'].forEach(function(s) {
        const el = document.getElementById('screen-' + s);
        if (el) el.classList.toggle('active', s === name);
        const nav = document.getElementById('nav-' + s);
        if (nav) nav.classList.toggle('active', s === name);
    });
    if (name === 'stats') renderStatsScreen();
    if (name === 'friends') renderFriendsScreen();
}

let friendsTab = 'leaderboard';
function setFriendsTab(tab) {
    friendsTab = tab;
    document.getElementById('friends-tab-leaderboard').classList.toggle('selected', tab === 'leaderboard');
    document.getElementById('friends-tab-rooms').classList.toggle('selected', tab === 'rooms');
    document.getElementById('friends-leaderboard-view').classList.toggle('hidden', tab !== 'leaderboard');
    document.getElementById('friends-rooms-view').classList.toggle('hidden', tab !== 'rooms');
    if (tab === 'rooms' && window.renderFriendsRoomsList) renderFriendsRoomsList();
}

let statsTab = 'today';
function setStatsTab(tab) {
    statsTab = tab;
    document.getElementById('stats-tab-today').classList.toggle('selected', tab === 'today');
    document.getElementById('stats-tab-alltime').classList.toggle('selected', tab === 'alltime');
    renderStatsScreen();
}

function renderStatsScreen() {
    let won, lost, hands, streak;
    if (statsTab === 'today') {
        won = totalWon; lost = totalLost; hands = handsPlayed; streak = bestStreak;
    } else {
        const s = loadAllTimeStats();
        won = s.won; lost = s.lost; hands = s.handsPlayed; streak = s.bestStreak;
    }
    const net = won - lost;
    const netEl = document.getElementById('stats-net-value');
    netEl.textContent = (net > 0 ? '+' : '') + net;
    netEl.className = 'stats-net-value ' + (net > 0 ? 'positive' : net < 0 ? 'negative' : 'zero');
    document.getElementById('stats-won-value').textContent = '+' + won;
    document.getElementById('stats-lost-value').textContent = '-' + lost;
    document.getElementById('stats-hands-value').textContent = hands;
    document.getElementById('stats-streak-value').textContent = streak;
}

function initSettingsScreen() {
    const soundToggle = document.getElementById('settings-sound-toggle');
    soundToggle.checked = soundEnabled;
    soundToggle.onchange = function() { toggleSound(); };

    const hapticsToggle = document.getElementById('settings-haptics-toggle');
    hapticsToggle.checked = hapticsEnabled;
    hapticsToggle.onchange = function() { toggleHaptics(); };

    [5, 10, 20, 50].forEach(function(v) {
        const btn = document.getElementById('settings-defaultbet-' + v);
        if (btn) btn.onclick = function() { setDefaultBet(v); };
    });
    updateDefaultBetUI();

    document.getElementById('settings-reset-stats').onclick = resetStatistics;
}

function toggleTournamentPill() {
    const expand = document.getElementById('tournament-expand');
    const chev = document.getElementById('tour-chev');
    const open = expand.classList.toggle('hidden') === false;
    chev.textContent = open ? '▴' : '▾';
}

function openSignInModal() {
    document.getElementById('signin-modal').classList.remove('hidden');
}

function closeSignInModal() {
    document.getElementById('signin-modal').classList.add('hidden');
}

function updateAccountUI() {
    const user = window.egUser;
    const signedOut = document.getElementById('account-signed-out');
    const signedIn = document.getElementById('account-signed-in');
    if (!signedOut || !signedIn) return;
    signedOut.classList.toggle('hidden', !!user);
    signedIn.classList.toggle('hidden', !user);
    if (user) document.getElementById('account-display-name').textContent = user.displayName || 'Signed in';
}

function setDefaultBet(v) {
    try { localStorage.setItem('vp_default_bet', String(v)); } catch (e) {}
    updateDefaultBetUI();
    if (gameState === 'bet') setBet(v);
}

function updateDefaultBetUI() {
    const current = getDefaultBet();
    [5, 10, 20, 50].forEach(function(v) {
        const btn = document.getElementById('settings-defaultbet-' + v);
        if (btn) btn.classList.toggle('selected', v === current);
    });
}

function resetStatistics() {
    totalWon = 0;
    totalLost = 0;
    handsPlayed = 0;
    bestStreak = 0;
    winStreak = 0;
    lossStreak = 0;
    resetAllTimeStats();
    saveGameState();
    updateStreakUI(false);
    renderStatsScreen();
    showToast('Statistics reset');
}

document.addEventListener('DOMContentLoaded', function() {
    initSound();
    initGame();
    initSettingsScreen();
    updateHintButtonUI();
    updateAccountUI();
    renderFriendsScreen();
    renderPlayFriendsWidgets();
    showScreen('play');
    initPwa();
    // Handle deep-link invite (?ref=CODE)
    if (window.handleIncomingInvite) handleIncomingInvite();
});
