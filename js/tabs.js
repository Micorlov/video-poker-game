// Bottom-nav screen switching + Stats/Settings screen rendering.

function showScreen(name) {
    ['play', 'stats', 'friends', 'settings'].forEach(function(s) {
        const el = document.getElementById('screen-' + s);
        if (el) el.classList.toggle('active', s === name);
        const nav = document.getElementById('nav-' + s);
        if (nav) nav.classList.toggle('active', s === name);
    });
    if (name === 'stats') renderStatsScreen();
    if (name === 'friends') {
        renderFriendsScreen();
        // Room list is a one-shot .get(); refresh member counts on every visit
        // so accepted invites show up without a reload.
        if (window.egUser && window.loadMyRooms) loadMyRooms();
    }
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

// --- Theme switching ---
let currentTheme = 'green';
try {
    const saved = localStorage.getItem('vp_theme');
    if (saved && ['green', 'blue', 'crimson'].includes(saved)) currentTheme = saved;
} catch (e) {}

function setTheme(theme) {
    if (!['green', 'blue', 'crimson'].includes(theme) || theme === currentTheme) return;
    currentTheme = theme;
    try { localStorage.setItem('vp_theme', theme); } catch (e) {}
    document.body.classList.remove('theme-blue', 'theme-crimson');
    if (theme !== 'green') document.body.classList.add('theme-' + theme);
    ['green', 'blue', 'crimson'].forEach(function(t) {
        const btn = document.getElementById('theme-' + t);
        if (btn) btn.classList.toggle('selected', t === theme);
    });
    triggerHaptic('LIGHT');
}

function applyTheme() {
    document.body.classList.remove('theme-blue', 'theme-crimson');
    if (currentTheme !== 'green') document.body.classList.add('theme-' + currentTheme);
    ['green', 'blue', 'crimson'].forEach(function(t) {
        const btn = document.getElementById('theme-' + t);
        if (btn) btn.classList.toggle('selected', t === currentTheme);
    });
}

function initSettingsScreen() {
    const soundToggle = document.getElementById('settings-sound-toggle');
    soundToggle.checked = soundEnabled;
    soundToggle.onchange = function() { toggleSound(); };

    const hapticsToggle = document.getElementById('settings-haptics-toggle');
    hapticsToggle.checked = hapticsEnabled;
    hapticsToggle.onchange = function() { toggleHaptics(); };

    const voiceToggle = document.getElementById('settings-voice-toggle');
    voiceToggle.checked = voiceEnabled;
    voiceToggle.onchange = function() { toggleVoice(); };

    [5, 10, 20, 50].forEach(function(v) {
        const btn = document.getElementById('settings-defaultbet-' + v);
        if (btn) btn.onclick = function() { setDefaultBet(v); };
    });
    updateDefaultBetUI();

    document.getElementById('settings-reset-stats').onclick = resetStatistics;

    initNotificationSettings();
}

// 'announcement' covers campaigns composed in push-admin.html — an admin
// broadcast must be as mutable as any automatic notification.
const NOTIFICATION_PREF_CATEGORIES = ['social', 'leaderboard', 'dailyReminder', 'bestHand', 'announcement'];

function initNotificationSettings() {
    const panel = document.getElementById('settings-notifications-panel');
    if (!panel) return;
    // Web push works too (Firebase Messaging + VAPID, see js/push.js), so the
    // panel is gated on push support rather than on being a native app —
    // otherwise browser players could never enable or mute notifications.
    const supported = window.isPushSupported
        ? isPushSupported()
        : !!(window.isNativeApp && isNativeApp());
    panel.classList.toggle('hidden', !supported);
    if (!supported) return;

    const enableBtn = document.getElementById('settings-notifications-enable');
    if (enableBtn) {
        enableBtn.onclick = function() {
            if (window.registerForPushNotifications) registerForPushNotifications();
        };
    }

    const prefs = (window.egUserDoc && window.egUserDoc.notificationPrefs) || {};
    NOTIFICATION_PREF_CATEGORIES.forEach(function(category) {
        const toggle = document.getElementById('settings-notif-' + category);
        if (!toggle) return;
        toggle.checked = prefs[category] !== false;
        toggle.onchange = function() {
            if (window.setNotificationPref) setNotificationPref(category, toggle.checked);
        };
    });
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

// Handle videopoker://open?ref=CODE / ?join=CODE while running inside the
// native (Capacitor) app — merges the scheme URL's query params into the
// page URL, then reuses the same handlers the web version already uses.
function applyNativeDeepLinkUrl(rawUrl) {
    try {
        var incoming = new URL(rawUrl);
        var target = new URL(window.location.href);
        incoming.searchParams.forEach(function(value, key) {
            target.searchParams.set(key, value);
        });
        window.history.replaceState({}, '', target);
        if (window.handleIncomingInvite) handleIncomingInvite();
        if (window.handleJoinDeepLink) handleJoinDeepLink();
    } catch (e) {}
}

function initNativeDeepLinkHandling() {
    var CapApp = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
    if (!CapApp) return;
    // Cold start: app was launched directly via the custom scheme.
    CapApp.getLaunchUrl().then(function(result) {
        if (result && result.url) applyNativeDeepLinkUrl(result.url);
    }).catch(function() {});
    // Warm start: app was already running when the scheme URL was opened.
    CapApp.addListener('appUrlOpen', function(data) {
        applyNativeDeepLinkUrl(data.url);
    });
    // First launch after a Play Store install: the invite click happened in a
    // browser that no longer exists, so the code arrives via the install
    // referrer instead. MainActivity also pushes it through
    // window.__onInstallReferrer; this covers the case where it answered before
    // this script parsed.
    if (window.readCachedInstallReferrer) readCachedInstallReferrer();
}

document.addEventListener('DOMContentLoaded', function() {
    applyTheme();
    initSound();
    initVoice();
    initGame();
    initSettingsScreen();
    updateHintButtonUI();
    updateAccountUI();
    renderFriendsScreen();
    renderPlayFriendsWidgets();
    if (window.applyLeaderboardPlatformUI) applyLeaderboardPlatformUI();
    if (window.isNativeApp && isNativeApp() && window.applyDefaultLeaderboardTab) applyDefaultLeaderboardTab();
    if (window.initOnboarding) initOnboarding(); else showScreen('play');
    initPwa();
    // Handle deep links: ?ref=CODE (add friend) and ?join=ROOMCODE (daily game).
    // The room one was previously wired only into applyNativeDeepLinkUrl(), so
    // every shared room link was silently ignored on web/PWA.
    if (window.handleIncomingInvite) handleIncomingInvite();
    if (window.handleJoinDeepLink) handleJoinDeepLink();
    initNativeDeepLinkHandling();
    // An invite stored by an earlier launch that never got as far as sign-in.
    if (window.restorePendingInvite) restorePendingInvite();
    // Guest sign-in re-prompt: count this session, then (from session 2 on,
    // capped and cooled down in js/signin-prompt.js) ask shortly after launch.
    // The delay also gives onAuthStateChanged time to settle _authResolved.
    if (window.countSigninPromptSession) countSigninPromptSession();
    setTimeout(function() {
        if (window.maybeShowSigninPrompt) maybeShowSigninPrompt('session_start');
    }, 3000);
});
