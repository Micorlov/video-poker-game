// Lazy, optional Firebase auth — powers Friends/Rooms only. The core game
// never depends on this; it's fine if the player is never signed in.

const firebaseConfig = {
    apiKey: "AIzaSyB6m0Yis89jxvm06OFBqxs8P_vADjRXk0U",
    authDomain: "video-poker-6d665.firebaseapp.com",
    projectId: "video-poker-6d665",
    storageBucket: "video-poker-6d665.firebasestorage.app",
    messagingSenderId: "53702406091",
    appId: "1:53702406091:web:1ef4969a8cc77ebd6a504e"
};
let auth = null;
let db = null;
try {
    if (typeof firebase === 'undefined') throw new Error('Firebase SDK failed to load (offline or blocked CDN)');
    firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();
    try {
        db.enablePersistence({ synchronizeTabs: true }).catch(function() { /* multi-tab or unsupported */ });
    } catch (e) { /* older browser — online-only */ }
} catch (e) {
    // Core game must never depend on Firebase — run fully offline/local-only.
    console.warn('Firebase unavailable, continuing in offline mode:', e);
}

// --- Remote feature flags (admin-controlled via config/features doc) ---
const DEFAULT_FEATURES = {
    facebookSignIn: true,
    champions: true,
    stories: true,
    bracelets: true,
    friendsRooms: true,
    allInDailyLimit: 1
};
window.egFeatures = Object.assign({}, DEFAULT_FEATURES);

function applyFeatureFlags() {
    const f = window.egFeatures;
    document.querySelectorAll('.facebook-btn').forEach(function(el) { el.classList.toggle('hidden', !f.facebookSignIn); });
    const stories = document.getElementById('stories-row');
    if (stories) stories.classList.toggle('hidden', !f.stories);
    // Legacy web panels (nearby-panel/champions-panel) vs the native-only unified
    // leaderboard panel are toggled together, since both platform + flags decide visibility.
    if (window.applyLeaderboardPlatformUI) applyLeaderboardPlatformUI();
    const pwfPanel = document.getElementById('pwf-panel');
    if (pwfPanel) pwfPanel.classList.toggle('hidden', !f.friendsRooms);
    const navFriends = document.getElementById('nav-friends');
    if (navFriends) navFriends.classList.toggle('hidden', !f.friendsRooms);
    if (window.updateAllInUI) updateAllInUI();
}

function loadFeatureConfig() {
    applyFeatureFlags();
    if (!db) return;
    firebaseSafe(function() {
        return db.collection('config').doc('features').get().then(function(doc) {
            if (doc.exists) {
                window.egFeatures = Object.assign({}, DEFAULT_FEATURES, doc.data());
            }
            applyFeatureFlags();
        });
    });
}
loadFeatureConfig();

const SHARE_BASE_URL = 'https://micorlov.github.io/video-poker-game/video_poker.html';

function getShareBaseUrl() {
    const origin = window.location.origin || '';
    if (origin === 'https://localhost' || origin.startsWith('capacitor://')) {
        return SHARE_BASE_URL;
    }
    return origin + window.location.pathname;
}

const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars

function generateRoomCode() {
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
    }
    return code;
}

function firebaseSafe(operation, fallback) {
    try {
        const result = operation();
        if (result && typeof result.catch === 'function') {
            return result.catch(function(err) {
                if (typeof fallback === 'function') fallback(err);
                return null;
            });
        }
        return result;
    } catch (err) {
        if (typeof fallback === 'function') fallback(err);
        return null;
    }
}

function isNativeApp() {
    return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
}

// Sign-in can be triggered from the #signin-modal or from the onboarding
// overlay's sign-in step (js/onboarding.js) — surface errors in whichever one
// is actually visible, since only #signin-modal existed before onboarding.js
// was added and a failure there would otherwise be silent during onboarding.
function clearSignInErrors() {
    ['signin-error', 'onboarding-signin-error'].forEach(function(id) {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
}

function showSignInError(message) {
    ['signin-error', 'onboarding-signin-error'].forEach(function(id) {
        const el = document.getElementById(id);
        if (el) { el.textContent = message; el.classList.remove('hidden'); }
    });
}

function signInWithGoogle() {
    clearSignInErrors();

    if (isNativeApp()) {
        // Firebase's web popup/redirect auth doesn't work inside a native WebView
        // (no real popup window, no https origin) — use the native Google Sign-In
        // plugin instead, then hand its ID token to the Firebase JS SDK so
        // auth.currentUser / Firestore security rules see the same session.
        window.Capacitor.Plugins.FirebaseAuthentication.signInWithGoogle().then(function(result) {
            const idToken = result && result.credential && result.credential.idToken;
            if (!idToken) throw new Error('No ID token returned from Google sign-in.');
            const credential = firebase.auth.GoogleAuthProvider.credential(idToken);
            return auth.signInWithCredential(credential);
        }).catch(function(err) {
            showSignInError(err.message || String(err));
        });
        return;
    }

    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    auth.signInWithPopup(provider).catch(function(popupErr) {
        if (popupErr.code === 'auth/popup-blocked' || popupErr.code === 'auth/popup-closed-by-user') {
            auth.signInWithRedirect(provider).catch(function(redirectErr) {
                showSignInError(redirectErr.message);
            });
        } else {
            showSignInError(popupErr.message);
        }
    });
}

function signInWithFacebook() {
    clearSignInErrors();

    if (isNativeApp()) {
        window.Capacitor.Plugins.FirebaseAuthentication.signInWithFacebook().then(function(result) {
            const accessToken = result && result.credential && result.credential.accessToken;
            if (!accessToken) throw new Error('No access token returned from Facebook sign-in.');
            const credential = firebase.auth.FacebookAuthProvider.credential(accessToken);
            return auth.signInWithCredential(credential);
        }).catch(function(err) {
            showSignInError(err.message || String(err));
        });
        return;
    }

    const provider = new firebase.auth.FacebookAuthProvider();
    auth.signInWithPopup(provider).catch(function(popupErr) {
        if (popupErr.code === 'auth/popup-blocked' || popupErr.code === 'auth/popup-closed-by-user') {
            auth.signInWithRedirect(provider).catch(function(redirectErr) {
                showSignInError(redirectErr.message);
            });
        } else {
            showSignInError(popupErr.message);
        }
    });
}

function signOutUser() {
    if (isNativeApp()) {
        firebaseSafe(function() { return window.Capacitor.Plugins.FirebaseAuthentication.signOut(); });
    }
    if (auth) auth.signOut();
}

if (auth) {
    auth.getRedirectResult().catch(function(err) {
        if (err && err.code !== 'auth/no-current-user') {
            const el = document.getElementById('signin-error');
            if (el) { el.textContent = err.message; el.classList.remove('hidden'); }
        }
    });
}

function logUserToFirestore(user) {
    return db.collection('users').doc(user.uid).set({
        uid: user.uid,
        displayName: user.displayName || '',
        photoURL: user.photoURL || '',
        lastLogin: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true }).then(function() {
        return db.collection('users').doc(user.uid).get();
    }).then(function(doc) {
        const data = doc.exists ? doc.data() : {};
        if (!data.referralCode) {
            const code = generateRoomCode();
            return db.collection('users').doc(user.uid).update({ referralCode: code }).then(function() {
                window.egUserDoc = Object.assign({}, data, { referralCode: code });
                if (window.renderFriendsScreen) renderFriendsScreen();
            });
        }
        window.egUserDoc = data;
        if (window.renderFriendsScreen) renderFriendsScreen();
    });
}

let _wasSignedIn = false;

if (auth) {
    auth.onAuthStateChanged(function(user) {
        // Signals that Firebase has settled the session. Before this fires,
        // window.egUser is null even for a signed-in returning user — so a
        // deep link arriving at DOMContentLoaded must NOT treat "no user" as
        // "signed out" and pop the sign-in modal. See handleJoinDeepLink().
        window._authResolved = true;
        window.egUser = user || null;
        if (window.closeSignInModal) closeSignInModal();
        if (window.updateAccountUI) updateAccountUI();
        if (user) {
            _wasSignedIn = true;
            firebaseSafe(function() { return logUserToFirestore(user); });
            firebaseSafe(function() { return pushNetProfit(); });
            try { if (window.onboardingSignInSucceeded) onboardingSignInSucceeded(); } catch (e) { console.warn('onboardingSignInSucceeded failed:', e); }
            // A token that arrived before sign-in is buffered, not written —
            // during onboarding the push step runs a screen ahead of this, so
            // that is the normal case rather than the edge one. Flush first,
            // then re-register so a rotated token replaces a stale one.
            if (window.flushPendingPushRegistration) flushPendingPushRegistration();

            // Fallback only: onboarding's priming screen (js/onboarding.js) is the
            // primary path for this ask. If the user never saw that screen (e.g.
            // signed in later from Settings/Friends without going through
            // onboarding), still ask once here.
            var pushAlreadyAsked = false;
            try { pushAlreadyAsked = localStorage.getItem('vp_push_permission_asked') === '1'; } catch (e) {}
            if (!pushAlreadyAsked) {
                firebaseSafe(function() { return registerForPushNotifications(); });
            } else if (window.refreshPushRegistration) {
                firebaseSafe(function() { return refreshPushRegistration(); });
            }
            if (window.egFeatures.friendsRooms) {
                if (window.loadFriends) loadFriends();
                if (window.loadMyRooms) loadMyRooms();
                // Phase 2: start presence heartbeat
                if (window.startPresence) startPresence();
            }
            // Native apps get the unified Friends/Hourly/Daily panel; web keeps the
            // original Hourly Champions panel only (see applyLeaderboardPlatformUI).
            if (isNativeApp()) {
                if (window.egFeatures.champions && window.subscribeHourlyBoard) subscribeHourlyBoard();
                if (window.egFeatures.champions && window.subscribeDailyBoard) subscribeDailyBoard();
                if (window.patchOwnCountry) patchOwnCountry();
            } else {
                if (window.egFeatures.champions && window.subscribeChampions) subscribeChampions();
            }
            if (window.egFeatures.bracelets && window.subscribeBracelets) subscribeBracelets();
            // Handle pending invite from deep link
            if (window._pendingInviteCode && window.addFriendByInviteCode) {
                var code = window._pendingInviteCode;
                window._pendingInviteCode = null;
                addFriendByInviteCode(code);
            }
            // Phase 2: handle pending room join from deep link
            if (window._pendingJoinCode && window.joinRoomByCode) {
                var joinCode = window._pendingJoinCode;
                window._pendingJoinCode = null;
                joinRoomByCode(joinCode);
            }
        } else {
            if (window.cleanupFriendsListeners) cleanupFriendsListeners();
            if (window.cleanupRooms) cleanupRooms();
            if (window.stopPresence) stopPresence();
            // A room link that landed before auth settled: now that we know the
            // visitor is genuinely signed out, ask them to sign in. The code
            // stays parked in _pendingJoinCode and is replayed above on success.
            if (window._pendingJoinCode) {
                if (window.openSignInModal) openSignInModal();
                if (window.showToast) showToast('Sign in to join the daily game!');
            }
            if (isNativeApp()) {
                if (window.cleanupLeaderboards) cleanupLeaderboards();
                if (window.renderLeaderboardPanel) renderLeaderboardPanel();
            } else {
                if (window.cleanupChampions) cleanupChampions();
            }
            if (window.cleanupBracelets) cleanupBracelets();
            if (window.renderFriendsScreen) renderFriendsScreen();
            if (window.renderPlayFriendsWidgets) renderPlayFriendsWidgets();
            // On native: if this is a real sign-out (not just the initial
            // unauthenticated state on cold start), show the sign-in step of
            // onboarding so the user can log back in without restarting the app.
            if (_wasSignedIn && isNativeApp() && window.showOnboardingForReauth) {
                _wasSignedIn = false;
                showOnboardingForReauth();
            }
        }
    });
}
