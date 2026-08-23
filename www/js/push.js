// Push notifications — native (Android/iOS via Capacitor) + web (Firebase Messaging + VAPID).
// Depends on: firebaseSafe()/db from js/firebase.js, window.egUser from auth.onAuthStateChanged.
// Firestore schema: users/{uid}/fcmTokens/{token} = { token, platform, updatedAt }
// and users/{uid}.notificationPrefs.<category>, categories: social, leaderboard, dailyReminder, bestHand.

function registerForPushNotifications() {
    if (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) {
        // Native path (Android / iOS via Capacitor)
        const PushNotifications = window.Capacitor.Plugins && window.Capacitor.Plugins.PushNotifications;
        if (!PushNotifications) return;
        PushNotifications.requestPermissions().then(function(result) {
            if (result && result.receive === 'granted') PushNotifications.register();
        }).catch(function(err) { console.warn('Push permission request failed:', err); });
        return;
    }
    // Web path — Firebase Messaging + VAPID. sw.js (registered by js/pwa.js) already
    // imports firebase-messaging-compat and handles onBackgroundMessage.
    if (typeof firebase === 'undefined' || !firebase.messaging) return;
    Notification.requestPermission().then(function(permission) {
        if (permission !== 'granted') return;
        return navigator.serviceWorker.ready.then(function(swReg) {
            return firebase.messaging().getToken({
                vapidKey: 'BFWkeDVJWLUt7RD9WDghTKnckjE5EwrRgZEVxyXMz4ujyfpnaAO6m_BbsbLc6AGzDZ88vl9rrgtXfrYPU4FeqeI',
                serviceWorkerRegistration: swReg
            });
        }).then(function(token) {
            if (token) saveFcmToken(token, 'web');
        });
    }).catch(function(err) { console.warn('Web push registration failed:', err); });
}

// Native always supports push; on web it depends on the browser (Safari only
// exposes it to installed PWAs, and firebase.messaging bails out entirely in
// unsupported ones). js/tabs.js uses this to decide whether the Settings
// notification panel is worth showing at all.
function isPushSupported() {
    if (window.isNativeApp && isNativeApp()) return true;
    return !!(window.Notification && navigator.serviceWorker &&
        typeof firebase !== 'undefined' && firebase.messaging &&
        firebase.messaging.isSupported && firebase.messaging.isSupported());
}
window.isPushSupported = isPushSupported;

// FCM hands over the token as soon as the OS answers, which is routinely
// before Firebase auth has resolved. Onboarding makes that the normal case:
// the push step runs a whole screen ahead of sign-in, so at the moment the
// token arrives there is no uid to file it under. Dropping it there lost it
// permanently — nothing re-registers afterwards, because showing the push
// screen already set vp_push_permission_asked. Hold it instead, and write it
// the moment a user exists.
let pendingFcmToken = null;
let pendingFcmPlatform = null;
let pendingNotificationPrefs = null;

function currentPushPlatform(platform) {
    return platform || (window.Capacitor && window.Capacitor.getPlatform ? window.Capacitor.getPlatform() : 'web');
}

function saveFcmToken(token, platform) {
    if (!token) return;
    var p = currentPushPlatform(platform);
    if (!window.egUser || typeof db === 'undefined') {
        pendingFcmToken = token;
        pendingFcmPlatform = p;
        return;
    }
    firebaseSafe(function() {
        return db.collection('users').doc(window.egUser.uid)
            .collection('fcmTokens').doc(token)
            .set({
                token: token,
                platform: p,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
    });
}

function setNotificationPref(category, enabled) {
    if (!window.egUser || typeof db === 'undefined') {
        pendingNotificationPrefs = pendingNotificationPrefs || {};
        pendingNotificationPrefs[category] = !!enabled;
        return;
    }
    const prefs = {};
    prefs[category] = !!enabled;
    firebaseSafe(function() {
        return db.collection('users').doc(window.egUser.uid)
            .set({ notificationPrefs: prefs }, { merge: true });
    });
}
window.setNotificationPref = setNotificationPref;

// Called from js/firebase.js once onAuthStateChanged reports a signed-in user.
function flushPendingPushRegistration() {
    if (!window.egUser || typeof db === 'undefined') return;

    if (pendingFcmToken) {
        var token = pendingFcmToken;
        var platform = pendingFcmPlatform;
        pendingFcmToken = null;
        pendingFcmPlatform = null;
        saveFcmToken(token, platform);
    }

    if (pendingNotificationPrefs) {
        var prefs = pendingNotificationPrefs;
        pendingNotificationPrefs = null;
        Object.keys(prefs).forEach(function(category) {
            setNotificationPref(category, prefs[category]);
        });
    }
}
window.flushPendingPushRegistration = flushPendingPushRegistration;

// FCM tokens rotate, and a rotated token is only handed over in response to a
// fresh register() call. Without this a user who granted permission once would
// keep a stale token in Firestore forever and silently stop receiving pushes.
function refreshPushRegistration() {
    if (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) {
        const PushNotifications = window.Capacitor.Plugins && window.Capacitor.Plugins.PushNotifications;
        if (!PushNotifications || !PushNotifications.checkPermissions) return;
        PushNotifications.checkPermissions().then(function(status) {
            if (status && status.receive === 'granted') PushNotifications.register();
        }).catch(function(err) { console.warn('Push permission check failed:', err); });
        return;
    }
    // Web re-issues the token through getToken() on every registration call,
    // and only prompts when permission has not been decided yet.
    if (window.Notification && Notification.permission === 'granted') {
        registerForPushNotifications();
    }
}
window.refreshPushRegistration = refreshPushRegistration;

function initPushListeners() {
    if (!window.Capacitor || !window.Capacitor.isNativePlatform || !window.Capacitor.isNativePlatform()) {
        return;
    }
    const PushNotifications = window.Capacitor.Plugins && window.Capacitor.Plugins.PushNotifications;
    if (!PushNotifications) return;

    PushNotifications.addListener('registration', function(token) {
        if (token && token.value) saveFcmToken(token.value);
    });

    PushNotifications.addListener('registrationError', function(err) {
        console.warn('Push registration error:', err);
    });

    // Minimal/generic deep-link: all current push categories (social, leaderboard,
    // bestHand) surface inside the Friends/Leaderboard screen, so just land there.
    PushNotifications.addListener('pushNotificationActionPerformed', function() {
        if (window.showScreen) showScreen('friends');
    });
}
initPushListeners();
