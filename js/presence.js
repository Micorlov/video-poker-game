// Presence — heartbeat + country detection.
// Every 60s while signed in, write lastSeen timestamp to Firestore.
// Country resolved from IP via ipapi.co; falls back to navigator.language.

let presenceInterval = null;
let userCountry = '';
let countryResolved = false;

function _countryFromLanguage() {
    try {
        const lang = navigator.language || 'en-US';
        const parts = lang.split('-');
        return (parts.length > 1 ? parts[1] : lang).toUpperCase();
    } catch (e) {
        return 'US';
    }
}

function getCountry() {
    return userCountry || _countryFromLanguage();
}

function resolveCountryFromIP() {
    if (countryResolved) return Promise.resolve(userCountry);
    return fetch('https://ipapi.co/country_code/', { cache: 'force-cache' })
        .then(function(r) { return r.ok ? r.text() : null; })
        .then(function(code) {
            if (code) {
                code = code.trim().toUpperCase();
                if (/^[A-Z]{2}$/.test(code)) userCountry = code;
            }
        })
        .catch(function() { /* fall through to language fallback */ })
        .finally(function() {
            if (!userCountry) userCountry = _countryFromLanguage();
            countryResolved = true;
        });
}

// Kick off IP lookup immediately so it's ready before first game hand.
resolveCountryFromIP();

function startPresence() {
    const user = window.egUser;
    if (!user) return;

    resolveCountryFromIP().then(function() {
        firebaseSafe(function() {
            return db.collection('users').doc(user.uid).set({
                country: getCountry(),
                lastSeen: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        });
    });

    // Heartbeat every 60s
    if (presenceInterval) clearInterval(presenceInterval);
    presenceInterval = setInterval(function() {
        const user = window.egUser;
        if (!user) { stopPresence(); return; }
        firebaseSafe(function() {
            return db.collection('users').doc(user.uid).set({
                lastSeen: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        });
    }, 60000);
}

function stopPresence() {
    if (presenceInterval) {
        clearInterval(presenceInterval);
        presenceInterval = null;
    }
}

function isOnline(lastSeen) {
    if (!lastSeen) return false;
    if (lastSeen.toDate) lastSeen = lastSeen.toDate();
    if (typeof lastSeen === 'number' || lastSeen instanceof Date) {
        const ms = typeof lastSeen === 'number' ? lastSeen : lastSeen.getTime();
        return (Date.now() - ms) < 120000; // 2 minutes
    }
    return false;
}

// Resume presence on app foreground (Capacitor)
document.addEventListener('resume', function() {
    const user = window.egUser;
    if (!user) return;
    firebaseSafe(function() {
        return db.collection('users').doc(user.uid).set({
            lastSeen: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    });
});

// Pause presence on app background
document.addEventListener('pause', function() {
    // let the last heartbeat age out naturally
});
