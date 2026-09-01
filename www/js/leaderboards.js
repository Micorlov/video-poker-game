// Unified Play-tab leaderboard panel — Android/iOS apps only (isNativeApp(), js/firebase.js).
// The web build keeps the original Friends Leaderboard + Hourly Champions panels untouched.
// Hourly reads the existing hourly/{hourKey}/entries collection (written by js/champions.js).
// Daily reads/writes daily_scores/{dayKey}_{uid} — the schema admin.html already expects.
// Friends-daily is computed client-side from each friend's dailyNetProfit/dailyDateKey
// (written by pushNetProfit() in js/rooms.js), the same way js/friends.js ranks all-time.

function applyLeaderboardPlatformUI() {
    const native = isNativeApp();
    const f = window.egFeatures || {};
    const legacyFriends = document.getElementById('nearby-panel');
    const legacyChampions = document.getElementById('champions-panel');
    const unified = document.getElementById('leaderboard-panel');
    if (legacyFriends) legacyFriends.classList.toggle('hidden', native || !f.friendsRooms);
    if (legacyChampions) legacyChampions.classList.toggle('hidden', native || !f.champions);
    if (unified) unified.classList.toggle('hidden', !native || !(f.friendsRooms || f.champions));
    if (!unified || unified.classList.contains('hidden')) return;
    const lbTabFriends = document.getElementById('lb-tab-friends');
    const lbTabHourly = document.getElementById('lb-tab-hourly');
    const lbTabDaily = document.getElementById('lb-tab-daily');
    if (lbTabFriends) lbTabFriends.classList.toggle('hidden', !f.friendsRooms);
    if (lbTabHourly) lbTabHourly.classList.toggle('hidden', !f.champions);
    if (lbTabDaily) lbTabDaily.classList.toggle('hidden', !f.champions);
    const lbTabsRow = document.querySelector('.lb-tabs');
    if (lbTabsRow) {
        const visible = [lbTabFriends, lbTabHourly, lbTabDaily].filter(function(b) { return b && !b.classList.contains('hidden'); });
        lbTabsRow.classList.toggle('hidden', visible.length <= 1);
        if (visible.length === 1 && window.setLeaderboardTab) setLeaderboardTab(visible[0].id.replace('lb-tab-', ''));
    }
}

// Keys, not copy: the panel re-renders on every tab switch and on every
// language change, so holding literal English here would overwrite whatever
// translateDom() had just put in the element.
const LEADERBOARD_TAB_TITLE_KEYS = {
    friends: 'lb.friendsToday',
    hourly: 'lb.hourlyChampions',
    daily: 'lb.dailyChampions'
};

let leaderboardTab = 'friends';
let leaderboardTabUserSet = false;
let leaderboardExpanded = false;
let hourlyBoardList = [];
let dailyBoardList = [];
let hourlyBoardUnsubscribe = null;
let dailyBoardUnsubscribe = null;
let lbTimerInterval = null;
let lbLastHourKey = '';
let lbLastDayKey = '';

function getDayKey(offset) {
    const d = new Date();
    d.setDate(d.getDate() + (offset || 0));
    return d.getFullYear() + '-' +
        String(d.getMonth() + 1).padStart(2, '0') + '-' +
        String(d.getDate()).padStart(2, '0');
}

let dailyProgress = { date: '', baseline: STARTING_BALANCE, bestHandRank: 0, bestHand: 'Nothing' };

function ensureDailyBaseline() {
    const today = getDayKey();
    if (dailyProgress.date === today) return;
    try {
        const raw = JSON.parse(localStorage.getItem('vp_daily_progress'));
        if (raw && raw.date === today) {
            dailyProgress = raw;
            return;
        }
    } catch (e) { /* corrupt or unavailable — fall through to a fresh baseline */ }
    dailyProgress = { date: today, baseline: balance, bestHandRank: 0, bestHand: 'Nothing' };
    saveDailyProgress();
}

function saveDailyProgress() {
    try { localStorage.setItem('vp_daily_progress', JSON.stringify(dailyProgress)); } catch (e) { /* localStorage unavailable */ }
}

function ownDailyNetProfit() {
    ensureDailyBaseline();
    return balance - dailyProgress.baseline;
}

// --- Global Daily writes (daily_scores/{dayKey}_{uid}) ---
function pushDailyScore(handType, win, totalBet) {
    const user = window.egUser;
    if (!user) return;
    ensureDailyBaseline();
    const dayKey = getDayKey();
    const fields = {
        uid: user.uid,
        displayName: user.displayName || t('common.player'),
        photoURL: user.photoURL || null,
        country: (typeof getCountry === 'function' ? getCountry() : null),
        dayKey: dayKey,
        score: firebase.firestore.FieldValue.increment(win - totalBet),
        hands: firebase.firestore.FieldValue.increment(1),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    const rank = HAND_RANK[handType] || 0;
    if (win > 0 && rank > dailyProgress.bestHandRank) {
        dailyProgress.bestHandRank = rank;
        dailyProgress.bestHand = handType;
        saveDailyProgress();
        fields.bestHand = handType;
    }
    firebaseSafe(function() {
        return db.collection('daily_scores').doc(dayKey + '_' + user.uid).set(fields, { merge: true });
    });
}

function pushDailyRebuy() {
    const user = window.egUser;
    if (!user) return;
    const dayKey = getDayKey();
    firebaseSafe(function() {
        return db.collection('daily_scores').doc(dayKey + '_' + user.uid).set({
            uid: user.uid,
            displayName: user.displayName || t('common.player'),
            photoURL: user.photoURL || null,
            dayKey: dayKey,
            rebuys: firebase.firestore.FieldValue.increment(1),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    });
}

// --- Read-side subscriptions (top 20 fetched once; sliced to 5 for the collapsed view) ---
function subscribeHourlyBoard() {
    const user = window.egUser;
    if (!user) { hourlyBoardList = []; renderLeaderboardPanel(); return; }
    if (hourlyBoardUnsubscribe) hourlyBoardUnsubscribe();
    const hourKey = getHourKey();
    lbLastHourKey = hourKey;
    hourlyBoardUnsubscribe = db.collection('hourly').doc(hourKey).collection('entries')
        .orderBy('points', 'desc')
        .limit(20)
        .onSnapshot(function(snap) {
            hourlyBoardList = [];
            snap.forEach(function(d) { hourlyBoardList.push(Object.assign({ uid: d.id }, d.data())); });
            renderLeaderboardPanel();
        }, function() { /* silently ignore */ });
    startLeaderboardTimer();
}

function subscribeDailyBoard() {
    const user = window.egUser;
    if (!user) { dailyBoardList = []; renderLeaderboardPanel(); return; }
    if (dailyBoardUnsubscribe) dailyBoardUnsubscribe();
    const dayKey = getDayKey();
    lbLastDayKey = dayKey;
    dailyBoardUnsubscribe = db.collection('daily_scores')
        .where('dayKey', '==', dayKey)
        .orderBy('score', 'desc')
        .limit(20)
        .onSnapshot(function(snap) {
            dailyBoardList = [];
            snap.forEach(function(d) { dailyBoardList.push(d.data()); });
            renderLeaderboardPanel();
        }, function() { /* silently ignore — e.g. missing composite index */ });
    startLeaderboardTimer();
}

function patchOwnCountry() {
    const user = window.egUser;
    if (!user || typeof getCountry !== 'function') return;
    resolveCountryFromIP().then(function() {
        var country = getCountry();
        if (!country || country.length !== 2) return;
        var dayKey = getDayKey();
        firebaseSafe(function() {
            return db.collection('daily_scores').doc(dayKey + '_' + user.uid)
                .set({ country: country }, { merge: true });
        });
        var hourKey = typeof getHourKey === 'function' ? getHourKey() : null;
        if (hourKey) {
            firebaseSafe(function() {
                return db.collection('hourly').doc(hourKey).collection('entries').doc(user.uid)
                    .set({ country: country }, { merge: true });
            });
        }
    });
}

function startLeaderboardTimer() {
    if (!lbTimerInterval) lbTimerInterval = setInterval(leaderboardTick, 30000);
}

// 30s tick: re-subscribe when the hour/day rolls over mid-session (the bot state
// keys off the current period, so stale real entries would look inconsistent),
// then re-render so bot drift and rival overtakes surface without a Firestore event.
function leaderboardTick() {
    const user = window.egUser;
    if (user) {
        if (typeof getHourKey === 'function' && getHourKey() !== lbLastHourKey) subscribeHourlyBoard();
        if (getDayKey() !== lbLastDayKey) subscribeDailyBoard();
    }
    renderLeaderboardPanel();
}

// --- Bot-merged views (see js/leaderboard-bots.js) ---
function mergedHourlyList() {
    const user = window.egUser;
    const own = user ? hourlyBoardList.find(function(e) { return e.uid === user.uid; }) : null;
    const playerScore = own ? (own.points || 0) : 0;
    return mergeBotEntries(hourlyBoardList,
        getBotEntries('hourly', getHourKey(), playerScore, playerScore > 0, 'points'), 'points');
}

function mergedDailyList() {
    const user = window.egUser;
    const own = user ? dailyBoardList.find(function(e) { return e.uid === user.uid; }) : null;
    const playerScore = own ? (own.score || 0) : ownDailyNetProfit();
    return mergeBotEntries(dailyBoardList,
        getBotEntries('daily', getDayKey(), playerScore, !!own, 'score'), 'score');
}

function cleanupLeaderboards() {
    if (hourlyBoardUnsubscribe) { hourlyBoardUnsubscribe(); hourlyBoardUnsubscribe = null; }
    if (dailyBoardUnsubscribe) { dailyBoardUnsubscribe(); dailyBoardUnsubscribe = null; }
    if (lbTimerInterval) { clearInterval(lbTimerInterval); lbTimerInterval = null; }
    hourlyBoardList = [];
    dailyBoardList = [];
}

// --- Friends-daily ranking (client-side, mirrors renderNearbyPanel's all-time ranking) ---
function effectiveDailyNetProfit(entry, todayKey) {
    return (entry.dailyDateKey === todayKey) ? (entry.dailyNetProfit || 0) : 0;
}

function rankedFriendsDaily() {
    const todayKey = getDayKey();
    const self = {
        displayName: t('common.you'), self: true, lastSeen: Date.now(),
        country: (typeof getCountry === 'function' ? getCountry() : '--'),
        dailyNetProfit: ownDailyNetProfit(), dailyDateKey: todayKey
    };
    return friendsList.concat([self])
        .map(function(f) { return Object.assign({}, f, { netProfit: effectiveDailyNetProfit(f, todayKey) }); })
        .sort(function(a, b) { return (b.netProfit || 0) - (a.netProfit || 0); });
}

// --- Tab switching + expand ---
function setLeaderboardTab(tab, isUserAction) {
    leaderboardTab = tab;
    if (isUserAction) leaderboardTabUserSet = true;
    leaderboardExpanded = false;
    ['friends', 'hourly', 'daily'].forEach(function(t) {
        const btn = document.getElementById('lb-tab-' + t);
        if (btn) btn.classList.toggle('selected', t === tab);
    });
    renderLeaderboardPanel();
}

// Guests land on Daily (visible without needing Friends data); signed-in
// players keep the existing Friends default. Re-applied once auth settles
// so a returning signed-in user isn't stuck on the guest default from the
// brief window before onAuthStateChanged fires. Never overrides a tab the
// player already picked by hand.
function applyDefaultLeaderboardTab() {
    if (leaderboardTabUserSet) return;
    setLeaderboardTab(window.egUser ? 'friends' : 'daily');
}

function toggleLeaderboardExpand() {
    leaderboardExpanded = !leaderboardExpanded;
    renderLeaderboardPanel();
}

// --- Rendering ---
function renderFriendsDailyBody(bodyEl, limit) {
    const ranked = rankedFriendsDaily().slice(0, limit);
    ranked.forEach(function(f, i) {
        const row = document.createElement('div');
        row.className = 'nearby-row' + (f.self ? ' me' : '');
        row.innerHTML =
            '<span class="nearby-rank">' + (i + 1) + '</span>' +
            '<span class="nearby-avatar-wrap">' +
                '<span class="nearby-avatar">' + (f.displayName || 'P').charAt(0).toUpperCase() + '</span>' +
                '<span class="online-dot' + ((typeof isOnline === 'function' && isOnline(f.lastSeen)) ? '' : ' offline') + '"></span>' +
            '</span>' +
            '<span class="nearby-name">' + (f.displayName || t('common.player')) +
                (f.country ? '<span class="country-flag">' + countryToFlag(f.country) + '</span>' : '') +
            '</span>' +
            '<span class="nearby-net ' + ((f.netProfit || 0) > 0 ? 'positive' : (f.netProfit || 0) < 0 ? 'negative' : 'zero') + '">' +
                formatSigned(f.netProfit || 0) +
            '</span>';
        bodyEl.appendChild(row);
    });
}

function renderGlobalBody(bodyEl, list, limit, valueField, valueSuffix, allowNegative) {
    const user = window.egUser;
    const slice = list.slice(0, limit);
    if (!slice.length) {
        const row = document.createElement('div');
        row.className = 'nearby-row';
        row.innerHTML = '<span style="font-size:12px;color:var(--text-muted)">' + t('common.noScoresYet') + '</span>';
        bodyEl.appendChild(row);
        return;
    }
    slice.forEach(function(entry, i) {
        const row = document.createElement('div');
        const isMe = user && entry.uid === user.uid;
        row.className = 'nearby-row' + (isMe ? ' me' : '');
        const val = entry[valueField] || 0;
        const cls = !allowNegative ? 'positive' : (val > 0 ? 'positive' : val < 0 ? 'negative' : 'zero');
        const text = allowNegative ? formatSigned(val) : (formatNumber(val) + valueSuffix);
        row.innerHTML =
            '<span class="nearby-rank">' + (i + 1) + '</span>' +
            '<span class="nearby-avatar-wrap">' +
                '<span class="nearby-avatar champ">' + (entry.displayName || 'P').charAt(0).toUpperCase() + '</span>' +
            '</span>' +
            '<span class="nearby-name">' + (entry.displayName || t('common.player')) +
                (entry.country ? '<span class="country-flag">' + countryToFlag(entry.country) + '</span>' : '') +
            '</span>' +
            '<span class="nearby-net ' + cls + '">' + text + '</span>';
        bodyEl.appendChild(row);
    });
}

function renderLeaderboardTimer() {
    const subEl = document.getElementById('lb-sub');
    if (!subEl) return;
    if (leaderboardTab === 'hourly') {
        const now = new Date();
        subEl.textContent = t('common.resetsInM', { m: 59 - now.getUTCMinutes() });
    } else if (leaderboardTab === 'daily') {
        const now = new Date();
        const msLeft = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) - now;
        const hrs = Math.floor(msLeft / 3600000);
        const mins = Math.floor((msLeft % 3600000) / 60000);
        subEl.textContent = t('common.resetsInHM', { h: hrs, m: mins });
    }
}

function renderLeaderboardPanel() {
    const bodyEl = document.getElementById('lb-body');
    const titleEl = document.getElementById('lb-title');
    const subEl = document.getElementById('lb-sub');
    const promptEl = document.getElementById('lb-signin-prompt');
    const expandLink = document.getElementById('lb-expand-link');
    if (!bodyEl) return;

    if (titleEl) titleEl.textContent = t(LEADERBOARD_TAB_TITLE_KEYS[leaderboardTab]);

    const user = window.egUser;
    if (!user) {
        if (promptEl) promptEl.classList.remove('hidden');
        bodyEl.innerHTML = '';
        if (expandLink) expandLink.classList.add('hidden');
        if (subEl) subEl.textContent = t('lb.rankPlaceholder');
        return;
    }
    if (promptEl) promptEl.classList.add('hidden');

    const limit = leaderboardExpanded ? 20 : 5;
    bodyEl.innerHTML = '';
    let totalCount = 0;

    if (leaderboardTab === 'friends') {
        const ranked = rankedFriendsDaily();
        totalCount = ranked.length;
        const ownRank = ranked.findIndex(function(p) { return p.self; }) + 1;
        const leader = ranked[0];
        if (subEl) {
            if (!leader) {
                subEl.textContent = t('lb.rankPlaceholder');
            } else if (leader.self) {
                subEl.textContent = t('common.rankYouAreFirst', { rank: ownRank });
            } else {
                const gap = (leader.netProfit || 0) - ownDailyNetProfit();
                subEl.textContent = t('common.rankLeadsBy', { rank: ownRank, name: leader.displayName || t('common.leader'), gap: formatNumber(gap) });
            }
        }
        renderFriendsDailyBody(bodyEl, limit);
    } else if (leaderboardTab === 'hourly') {
        const mergedHourly = mergedHourlyList();
        totalCount = mergedHourly.length;
        renderLeaderboardTimer();
        renderGlobalBody(bodyEl, mergedHourly, limit, 'points', ' pts', false);
    } else {
        const mergedDaily = mergedDailyList();
        totalCount = mergedDaily.length;
        renderLeaderboardTimer();
        renderGlobalBody(bodyEl, mergedDaily, limit, 'score', '', true);
    }

    if (expandLink) {
        expandLink.classList.toggle('hidden', totalCount <= 5);
        expandLink.textContent = leaderboardExpanded ? t('lb.showTop5') : t('lb.showTop20');
    }
}

// --- Share leaderboard ---
function shareLeaderboard() {
    const SHARE_TITLES = {
        friends: 'Friends · Today',
        hourly: 'Hourly Champions',
        daily: 'Daily Champions'
    };
    var title = SHARE_TITLES[leaderboardTab] || 'Leaderboard';
    var limit = leaderboardExpanded ? 20 : 5;
    var lines = [];

    if (leaderboardTab === 'friends') {
        rankedFriendsDaily().slice(0, limit).forEach(function(f, i) {
            var val = f.netProfit || 0;
            lines.push((i + 1) + '. ' + (f.self ? t('common.you') : (f.displayName || t('common.player'))) +
                '  ' + formatSigned(val));
        });
    } else if (leaderboardTab === 'hourly') {
        mergedHourlyList().slice(0, limit).forEach(function(e, i) {
            lines.push((i + 1) + '. ' + (e.displayName || t('common.player')) + '  ' + t('common.points', { n: formatNumber(e.points || 0) }));
        });
    } else {
        mergedDailyList().slice(0, limit).forEach(function(e, i) {
            var val = e.score || 0;
            lines.push((i + 1) + '. ' + (e.displayName || t('common.player')) + '  ' + formatSigned(val));
        });
    }

    var text = '🃏 ' + title + '\n' + lines.join('\n');
    // The standings double as an invite: attach the player's link so a brag
    // carries the referral code with it.
    var link = (window.getInviteLink && getInviteLink()) || '';

    if (window.logVpEvent) logVpEvent('share_channel_clicked', { channel: 'native', kind: 'leaderboard' });
    shareViaNative(title, text, link).then(function(handled) {
        if (!handled && navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(link ? text + '\n' + link : text);
            if (window.showToast) showToast(t('toast.standingsCopied'));
        }
    });
}

if (window.vpOnLanguageChange) {
    vpOnLanguageChange(function() {
        renderLeaderboardPanel();
        renderLeaderboardTimer();
    });
}
