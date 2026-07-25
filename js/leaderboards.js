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

const LEADERBOARD_TAB_TITLES = {
    friends: 'Friends · Today',
    hourly: '⏱ Hourly Champions',
    daily: '📅 Daily Champions'
};

let leaderboardTab = 'friends';
let leaderboardExpanded = false;
let hourlyBoardList = [];
let dailyBoardList = [];
let hourlyBoardUnsubscribe = null;
let dailyBoardUnsubscribe = null;
let lbTimerInterval = null;

function getDayKey(offset) {
    const d = new Date();
    d.setDate(d.getDate() + (offset || 0));
    return d.getFullYear() + '-' +
        String(d.getMonth() + 1).padStart(2, '0') + '-' +
        String(d.getDate()).padStart(2, '0');
}

let dailyProgress = { date: '', baseline: 500, bestHandRank: 0, bestHand: 'Nothing' };

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
        displayName: user.displayName || 'Player',
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
            displayName: user.displayName || 'Player',
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
    if (!lbTimerInterval) lbTimerInterval = setInterval(renderLeaderboardTimer, 30000);
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
        displayName: 'You', self: true, lastSeen: Date.now(),
        country: (typeof getCountry === 'function' ? getCountry() : '--'),
        dailyNetProfit: ownDailyNetProfit(), dailyDateKey: todayKey
    };
    return friendsList.concat([self])
        .map(function(f) { return Object.assign({}, f, { netProfit: effectiveDailyNetProfit(f, todayKey) }); })
        .sort(function(a, b) { return (b.netProfit || 0) - (a.netProfit || 0); });
}

// --- Tab switching + expand ---
function setLeaderboardTab(tab) {
    leaderboardTab = tab;
    leaderboardExpanded = false;
    ['friends', 'hourly', 'daily'].forEach(function(t) {
        const btn = document.getElementById('lb-tab-' + t);
        if (btn) btn.classList.toggle('selected', t === tab);
    });
    renderLeaderboardPanel();
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
            '<span class="nearby-name">' + (f.displayName || 'Player') +
                (f.country ? '<span class="country-flag">' + countryToFlag(f.country) + '</span>' : '') +
            '</span>' +
            '<span class="nearby-net ' + ((f.netProfit || 0) > 0 ? 'positive' : (f.netProfit || 0) < 0 ? 'negative' : 'zero') + '">' +
                ((f.netProfit || 0) >= 0 ? '+' : '') + (f.netProfit || 0).toLocaleString() +
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
        row.innerHTML = '<span style="font-size:12px;color:var(--text-muted)">No scores yet — be the first!</span>';
        bodyEl.appendChild(row);
        return;
    }
    slice.forEach(function(entry, i) {
        const row = document.createElement('div');
        const isMe = user && entry.uid === user.uid;
        row.className = 'nearby-row' + (isMe ? ' me' : '');
        const val = entry[valueField] || 0;
        const cls = !allowNegative ? 'positive' : (val > 0 ? 'positive' : val < 0 ? 'negative' : 'zero');
        const text = allowNegative ? ((val >= 0 ? '+' : '') + val.toLocaleString()) : (val.toLocaleString() + valueSuffix);
        row.innerHTML =
            '<span class="nearby-rank">' + (i + 1) + '</span>' +
            '<span class="nearby-avatar-wrap">' +
                '<span class="nearby-avatar champ">' + (entry.displayName || 'P').charAt(0).toUpperCase() + '</span>' +
            '</span>' +
            '<span class="nearby-name">' + (entry.displayName || 'Player') +
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
        subEl.textContent = 'Resets in ' + (59 - now.getUTCMinutes()) + 'm';
    } else if (leaderboardTab === 'daily') {
        const now = new Date();
        const msLeft = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) - now;
        const hrs = Math.floor(msLeft / 3600000);
        const mins = Math.floor((msLeft % 3600000) / 60000);
        subEl.textContent = 'Resets in ' + hrs + 'h ' + mins + 'm';
    }
}

function renderLeaderboardPanel() {
    const bodyEl = document.getElementById('lb-body');
    const titleEl = document.getElementById('lb-title');
    const subEl = document.getElementById('lb-sub');
    const promptEl = document.getElementById('lb-signin-prompt');
    const expandLink = document.getElementById('lb-expand-link');
    if (!bodyEl) return;

    if (titleEl) titleEl.textContent = LEADERBOARD_TAB_TITLES[leaderboardTab];

    const user = window.egUser;
    if (!user) {
        if (promptEl) promptEl.classList.remove('hidden');
        bodyEl.innerHTML = '';
        if (expandLink) expandLink.classList.add('hidden');
        if (subEl) subEl.textContent = '#— · —';
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
                subEl.textContent = '#— · —';
            } else if (leader.self) {
                subEl.textContent = '#' + ownRank + ' · You\'re #1!';
            } else {
                const gap = (leader.netProfit || 0) - ownDailyNetProfit();
                subEl.textContent = '#' + ownRank + ' · ' + (leader.displayName || 'Leader') + ' leads by ' + gap;
            }
        }
        renderFriendsDailyBody(bodyEl, limit);
    } else if (leaderboardTab === 'hourly') {
        totalCount = hourlyBoardList.length;
        renderLeaderboardTimer();
        renderGlobalBody(bodyEl, hourlyBoardList, limit, 'points', ' pts', false);
    } else {
        totalCount = dailyBoardList.length;
        renderLeaderboardTimer();
        renderGlobalBody(bodyEl, dailyBoardList, limit, 'score', '', true);
    }

    if (expandLink) {
        expandLink.classList.toggle('hidden', totalCount <= 5);
        expandLink.textContent = leaderboardExpanded ? 'Show Top 5 ▴' : 'Show Top 20 ▾';
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
            lines.push((i + 1) + '. ' + (f.self ? 'You' : (f.displayName || 'Player')) +
                '  ' + (val >= 0 ? '+' : '') + val.toLocaleString());
        });
    } else if (leaderboardTab === 'hourly') {
        hourlyBoardList.slice(0, limit).forEach(function(e, i) {
            lines.push((i + 1) + '. ' + (e.displayName || 'Player') + '  ' + (e.points || 0).toLocaleString() + ' pts');
        });
    } else {
        dailyBoardList.slice(0, limit).forEach(function(e, i) {
            var val = e.score || 0;
            lines.push((i + 1) + '. ' + (e.displayName || 'Player') + '  ' + (val >= 0 ? '+' : '') + val.toLocaleString());
        });
    }

    var text = '🃏 ' + title + '\n' + lines.join('\n');

    if (navigator.share) {
        navigator.share({ title: title, text: text }).catch(function() {});
    } else {
        navigator.clipboard && navigator.clipboard.writeText(text);
    }
}
