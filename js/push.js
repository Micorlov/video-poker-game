// Native push notifications (Android + iOS only — web has no push in this pass).
// Uses the Capacitor PushNotifications plugin the same way js/firebase.js calls
// other Capacitor plugins (window.Capacitor.Plugins.<Plugin>).
//
// Depends on: firebaseSafe()/db from js/firebase.js (must load after firebase.js),
// window.egUser set by auth.onAuthStateChanged in js/firebase.js.
//
// Firestore schema written here: users/{uid}/fcmTokens/{token} = { token, platform, updatedAt }
// and users/{uid}.notificationPrefs.<category> (merge-set), categories:
// social, leaderboard, dailyReminder, bestHand.

function registerForPushNotifications() {
    if (!window.Capacitor || !window.Capacitor.isNativePlatform || !window.Capacitor.isNativePlatform()) {
        return; // Web builds: no native push in this pass.
    }
    const PushNotifications = window.Capacitor.Plugins && window.Capacitor.Plugins.PushNotifications;
    if (!PushNotifications) return;

    PushNotifications.requestPermissions().then(function(result) {
        if (result && result.receive === 'granted') {
            PushNotifications.register();
        }
    }).catch(function(err) {
        console.warn('Push permission request failed:', err);
    });
}

function saveFcmToken(token) {
    if (!window.egUser || typeof db === 'undefined') return;
    const platform = window.Capacitor.getPlatform ? window.Capacitor.getPlatform() : 'unknown';
    firebaseSafe(function() {
        return db.collection('users').doc(window.egUser.uid)
            .collection('fcmTokens').doc(token)
            .set({
                token: token,
                platform: platform,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
    });
}

function setNotificationPref(category, enabled) {
    if (!window.egUser || typeof db === 'undefined') return;
    const prefs = {};
    prefs[category] = !!enabled;
    firebaseSafe(function() {
        return db.collection('users').doc(window.egUser.uid)
            .set({ notificationPrefs: prefs }, { merge: true });
    });
}
window.setNotificationPref = setNotificationPref;

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
