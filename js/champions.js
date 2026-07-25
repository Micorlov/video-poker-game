// Hourly Champions — global top-5 by points, serverless (Firestore only).
// Each client writes its own points doc into hourly/{YYYYMMDDHH}/entries/{uid}
// on every winning draw. The Play screen subscribes to the top-5 for display.

function countryToFlag(code) {
    if (!code || !/^[A-Z]{2}$/i.test(code)) return '';
    return code.toUpperCase().replace(/[A-Z]/g, function(c) {
        return String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65);
    });
}

let championsUnsubscribe = null;
let championsList = [];
let champTimerInterval = null;

function getHourKey() {
    const d = new Date();
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const hh = String(d.getUTCHours()).padStart(2, '0');
    return yyyy + mm + dd + hh;
}

function pushChampionPoints(handType, win) {
    const user = window.egUser;
    if (!user || win <= 0) return;
    const points = Math.max(1, Math.floor(win / 10));
    const hourKey = getHourKey();
    firebaseSafe(function() {
        return db.collection('hourly').doc(hourKey).collection('entries').doc(user.uid).set({
            displayName: user.displayName || 'Player',
            country: getCountry(),
            points: firebase.firestore.FieldValue.increment(points),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    });
}

function subscribeChampions() {
    const user = window.egUser;
    if (!user) {
        championsList = [];
        renderChampionsPanel();
        return;
    }

    if (championsUnsubscribe) championsUnsubscribe();
    const hourKey = getHourKey();

    championsUnsubscribe = db.collection('hourly').doc(hourKey).collection('entries')
        .orderBy('points', 'desc')
        .limit(5)
        .onSnapshot(function(snap) {
            championsList = [];
            snap.forEach(function(d) {
                championsList.push(Object.assign({ uid: d.id }, d.data()));
            });
            renderChampionsPanel();
        }, function() { /* silently ignore */ });

    // Start countdown timer
    if (!champTimerInterval) {
        champTimerInterval = setInterval(renderChampionsTimer, 30000);
    }
}

function renderChampionsTimer() {
    const el = document.getElementById('champ-countdown');
    if (!el) return;
    const now = new Date();
    const minsLeft = 59 - now.getUTCMinutes();
    el.textContent = 'Resets in ' + minsLeft + 'm';
}

function renderChampionsPanel() {
    const bodyEl = document.getElementById('champions-body');
    const timerEl = document.getElementById('champ-countdown');
    const promptEl = document.getElementById('champions-signin-prompt');
    if (!bodyEl) return;

    if (timerEl) renderChampionsTimer();

    const user = window.egUser;
    if (!user) {
        if (promptEl) promptEl.classList.remove('hidden');
        bodyEl.innerHTML = '';
        return;
    }
    if (promptEl) promptEl.classList.add('hidden');

    bodyEl.innerHTML = '';
    if (!championsList.length) {
        const row = document.createElement('div');
        row.className = 'nearby-row';
        row.innerHTML = '<span style="font-size:12px;color:var(--text-muted)">No champions yet this hour — be the first!</span>';
        bodyEl.appendChild(row);
        return;
    }

    championsList.forEach(function(ch, i) {
        const row = document.createElement('div');
        row.className = 'nearby-row';
        const isMe = user && ch.uid === user.uid;
        if (isMe) row.className += ' me';

        row.innerHTML =
            '<span class="nearby-rank">' + (i + 1) + '</span>' +
            '<span class="nearby-avatar-wrap">' +
                '<span class="nearby-avatar champ">' + (ch.displayName || 'P').charAt(0).toUpperCase() + '</span>' +
                '<span class="online-dot"></span>' +
            '</span>' +
            '<span class="nearby-name">' + (ch.displayName || 'Player') +
                (ch.country ? '<span class="country-flag">' + countryToFlag(ch.country) + '</span>' : '') +
            '</span>' +
            '<span class="nearby-net positive">' + (ch.points || 0) + ' pts</span>';

        bodyEl.appendChild(row);
    });
}

function cleanupChampions() {
    if (championsUnsubscribe) { championsUnsubscribe(); championsUnsubscribe = null; }
    if (champTimerInterval) { clearInterval(champTimerInterval); champTimerInterval = null; }
    championsList = [];
}
