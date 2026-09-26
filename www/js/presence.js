// Presence — heartbeat + country detection.
// Country resolved from IP via ipapi.co; falls back to navigator.language.
//
// The heartbeat used to write lastSeen every 60s regardless of whether the app
// was even on screen: 60 writes/hour/user, the single largest source of
// Firestore writes in the app, and it kept running while backgrounded. At
// 5 minutes and skipped while hidden it is 12/hour at most, and 0 while the
// app is in the background.
//
// isOnline() treats a player as online for 2 minutes after lastSeen, so the
// interval alone would make everyone look offline between beats. A write on
// becoming visible plus the grace period below keeps "online" honest without
// paying for a 60s beat.
const PRESENCE_INTERVAL_MS = 5 * 60 * 1000;
// Covers PRESENCE_INTERVAL_MS plus a slow write, so a player who is genuinely
// present is never shown as offline between two beats.
const PRESENCE_ONLINE_GRACE_MS = PRESENCE_INTERVAL_MS + 2 * 60 * 1000;

let presenceInterval = null;
let presenceVisibilityBound = false;
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

function _fetchCountryFrom(url, jsonField) {
    return fetch(url, { cache: 'no-cache' })
        .then(function(r) { return r.ok ? (jsonField ? r.json() : r.text()) : Promise.reject(); })
        .then(function(data) {
            var code = ((jsonField ? data[jsonField] : data) || '').trim().toUpperCase();
            if (/^[A-Z]{2}$/.test(code)) return code;
            return Promise.reject();
        });
}

function resolveCountryFromIP() {
    if (countryResolved) return Promise.resolve(userCountry);
    return _fetchCountryFrom('https://ipapi.co/country_code/')
        .catch(function() { return _fetchCountryFrom('https://api.country.is/', 'country'); })
        .catch(function() { return _fetchCountryFrom('https://ipwho.is/?fields=country_code', 'country_code'); })
        .then(function(code) { userCountry = code; })
        .catch(function() {})
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

    if (presenceInterval) clearInterval(presenceInterval);
    presenceInterval = setInterval(beatPresence, PRESENCE_INTERVAL_MS);
    if (!presenceVisibilityBound) {
        // A returning player should show as online immediately rather than
        // waiting up to 5 minutes for the next beat.
        document.addEventListener('visibilitychange', function() {
            if (document.visibilityState === 'visible' && presenceInterval) beatPresence();
        });
        presenceVisibilityBound = true;
    }
}

function beatPresence() {
    const user = window.egUser;
    if (!user) { stopPresence(); return; }
    // A backgrounded WebView is not presence: nobody is looking at the app, and
    // on Android the write would often be queued until it resumes anyway.
    if (document.visibilityState === 'hidden') return;
    firebaseSafe(function() {
        return db.collection('users').doc(user.uid).set({
            lastSeen: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    });
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
        return (Date.now() - ms) < PRESENCE_ONLINE_GRACE_MS;
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
