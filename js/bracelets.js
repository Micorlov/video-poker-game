// Bracelets — global hourly/daily "biggest single win" awards.
// Each client tracks its own max win per UTC hour/day (hourly/{hourKey}/entries,
// dailyMaxWin/{dayKey}/entries). A scheduled Cloud Function (functions/src/bracelets.js)
// awards the bracelet once a period ends, writing to the bracelets collection.
// This module only reads bracelets for Stories — it never awards them itself.

function braceletHourKeyOf(d) {
    return d.getUTCFullYear() + String(d.getUTCMonth() + 1).padStart(2, '0') +
        String(d.getUTCDate()).padStart(2, '0') + String(d.getUTCHours()).padStart(2, '0');
}

function braceletDayKeyOf(d) {
    return d.getUTCFullYear() + String(d.getUTCMonth() + 1).padStart(2, '0') +
        String(d.getUTCDate()).padStart(2, '0');
}

// Called by game.js after every winning draw — updates this player's max
// single win for the current UTC hour and day (read-compare-write, since
// Firestore increment() can't express "keep the larger value").
function pushBraceletProgress(handType, win) {
    const user = window.egUser;
    if (!user || win <= 0 || !db) return;

    const hourKey = braceletHourKeyOf(new Date());
    const dayKey = braceletDayKeyOf(new Date());
    const hourRef = db.collection('hourly').doc(hourKey).collection('entries').doc(user.uid);
    const dayRef = db.collection('dailyMaxWin').doc(dayKey).collection('entries').doc(user.uid);

    firebaseSafe(function() {
        return db.runTransaction(function(tx) {
            return Promise.all([tx.get(hourRef), tx.get(dayRef)]).then(function(snaps) {
                const hourMax = (snaps[0].exists && snaps[0].data().maxWin) || 0;
                const dayMax = (snaps[1].exists && snaps[1].data().maxWin) || 0;
                const meta = {
                    displayName: user.displayName || t('common.player'),
                    country: getCountry(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                };
                if (win > hourMax) {
                    tx.set(hourRef, Object.assign({}, meta, { maxWin: win, maxWinHandType: handType }), { merge: true });
                }
                if (win > dayMax) {
                    tx.set(dayRef, Object.assign({}, meta, { maxWin: win, maxWinHandType: handType }), { merge: true });
                }
            });
        });
    });
}

// --- Recent bracelets feed (for Stories) ---
let braceletsRecent = [];
let braceletsUnsubscribe = null;

function subscribeBracelets() {
    const user = window.egUser;
    if (!user || !db) { braceletsRecent = []; return; }
    if (braceletsUnsubscribe) braceletsUnsubscribe();
    braceletsUnsubscribe = db.collection('bracelets')
        .orderBy('awardedAt', 'desc')
        .limit(200)
        .onSnapshot(function(snap) {
            braceletsRecent = [];
            snap.forEach(function(d) { braceletsRecent.push(d.data()); });
            if (window.renderPlayFriendsWidgets) renderPlayFriendsWidgets();
        }, function() { /* silently ignore */ });
}

function latestBraceletForUid(uid) {
    for (let i = 0; i < braceletsRecent.length; i++) {
        if (braceletsRecent[i].uid === uid) return braceletsRecent[i];
    }
    return null;
}

function cleanupBracelets() {
    if (braceletsUnsubscribe) { braceletsUnsubscribe(); braceletsUnsubscribe = null; }
    braceletsRecent = [];
}
