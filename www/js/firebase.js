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

function signInWithGoogle() {
    const el = document.getElementById('signin-error');
    if (el) el.classList.add('hidden');

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
            if (el) { el.textContent = err.message || String(err); el.classList.remove('hidden'); }
        });
        return;
    }

    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    auth.signInWithPopup(provider).catch(function(popupErr) {
        if (popupErr.code === 'auth/popup-blocked' || popupErr.code === 'auth/popup-closed-by-user') {
            auth.signInWithRedirect(provider).catch(function(redirectErr) {
                if (el) { el.textContent = redirectErr.message; el.classList.remove('hidden'); }
            });
        } else if (el) {
            el.textContent = popupErr.message;
            el.classList.remove('hidden');
        }
    });
}

function signInWithFacebook() {
    const el = document.getElementById('signin-error');
    if (el) el.classList.add('hidden');

    if (isNativeApp()) {
        window.Capacitor.Plugins.FirebaseAuthentication.signInWithFacebook().then(function(result) {
            const accessToken = result && result.credential && result.credential.accessToken;
            if (!accessToken) throw new Error('No access token returned from Facebook sign-in.');
            const credential = firebase.auth.FacebookAuthProvider.credential(accessToken);
            return auth.signInWithCredential(credential);
        }).catch(function(err) {
            if (el) { el.textContent = err.message || String(err); el.classList.remove('hidden'); }
        });
        return;
    }

    const provider = new firebase.auth.FacebookAuthProvider();
    auth.signInWithPopup(provider).catch(function(popupErr) {
        if (popupErr.code === 'auth/popup-blocked' || popupErr.code === 'auth/popup-closed-by-user') {
            auth.signInWithRedirect(provider).catch(function(redirectErr) {
                if (el) { el.textContent = redirectErr.message; el.classList.remove('hidden'); }
            });
        } else if (el) {
            el.textContent = popupErr.message;
            el.classList.remove('hidden');
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

if (auth) {
    auth.onAuthStateChanged(function(user) {
        window.egUser = user || null;
        if (window.closeSignInModal) closeSignInModal();
        if (window.updateAccountUI) updateAccountUI();
        if (user) {
            firebaseSafe(function() { return logUserToFirestore(user); });
            firebaseSafe(function() { return pushNetProfit(); });
            if (window.loadFriends) loadFriends();
            if (window.loadMyRooms) loadMyRooms();
            // Phase 2: start presence heartbeat
            if (window.startPresence) startPresence();
            // Phase 2: subscribe champions
            if (window.subscribeChampions) subscribeChampions();
            // Handle pending invite from deep link
            if (window._pendingInviteCode && window.addFriendByInviteCode) {
                var code = window._pendingInviteCode;
                window._pendingInviteCode = null;
                addFriendByInviteCode(code);
            }
            // Phase 2: handle pending room join from deep link
            if (window._pendingJoinCode && window.joinRoomByDeepLink) {
                var joinCode = window._pendingJoinCode;
                window._pendingJoinCode = null;
                joinRoomByDeepLink(joinCode);
            }
        } else {
            if (window.cleanupFriendsListeners) cleanupFriendsListeners();
            if (window.stopPresence) stopPresence();
            if (window.cleanupChampions) cleanupChampions();
            if (window.renderFriendsScreen) renderFriendsScreen();
            if (window.renderPlayFriendsWidgets) renderPlayFriendsWidgets();
        }
    });
}
