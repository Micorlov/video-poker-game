// Lazy, optional Firebase auth — powers Friends/Rooms only. The core game
// never depends on this; it's fine if the player is never signed in.

const firebaseConfig = {
    apiKey: "AIzaSyB6m0Yis89jxvm06OFBqxs8P_vADjRXk0U",
    authDomain: "video-poker-6d665.firebaseapp.com",
    projectId: "video-poker-6d665",
    storageBucket: "video-poker-6d665.firebasestorage.app",
    messagingSenderId: "53702406091",
    appId: "1:53702406091:web:1ef4969a8cc77ebd6a504e"
    // measurementId: "G-XXXXXXXXXX"
    //
    // The whole GA4 event vocabulary in js/analytics.js is dead code until this
    // field exists: without it firebase.analytics() throws and logVpEvent() is a
    // silent no-op. It appears only once Google Analytics is enabled on the
    // Firebase project, which is a console action (Project settings →
    // Integrations → Google Analytics) — the Firebase CLI token has no Analytics
    // Admin scope, so it cannot be scripted. After enabling it, copy
    // measurementId from Project settings → Your apps → Web app config to here
    // and nothing else needs to change.
    //
    // Independent of this, js/installs.js answers the 96-acquisitions-vs-33-
    // first-opens question on its own and counts signed-out guests, which GA4
    // keyed to a Firebase app would still miss on native.
};
let auth = null;
let db = null;
try {
    if (typeof firebase === 'undefined') throw new Error('Firebase SDK failed to load (offline or blocked CDN)');
    firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();
    try { tagFirestoreFailures(); } catch (e) { /* diagnostics only */ }
    try {
        db.enablePersistence({ synchronizeTabs: true }).catch(function() { /* vp-silent: expected with a second tab open or an old browser; the app just runs online-only */ });
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

// --- Which operation failed ---------------------------------------------------
//
// A FirebaseError says "Missing or insufficient permissions." and nothing else:
// not the collection, not whether it was a read or a write. The first real
// denial the error reports caught took reading the deployed rules line by line
// to pin down. So every Firestore entry point tags its own rejections with the
// operation and collection ("set daily_scores/*"), and js/errors.js reports the
// tag as `op`. Covers every call, inside firebaseSafe() or not.
//
// Document ids become '*': they are uids and dates, and would split one bug
// into a separate report per player per day.
function vpCollectionPattern(path) {
    return String(path || '').split('/').map(function(segment, i) {
        return i % 2 ? '*' : segment;
    }).join('/');
}

// A CollectionReference knows its path; a filtered query only knows it inside
// the SDK's delegate, which is read defensively since it is not public API.
function vpQueryPattern(query) {
    try {
        if (query.path) return vpCollectionPattern(query.path);
        var inner = query._delegate && query._delegate._query;
        if (inner && inner.collectionGroup) return inner.collectionGroup + ' (group)';
        if (inner && inner.path) return vpCollectionPattern(inner.path.canonicalString());
    } catch (e) { /* SDK internals changed: fall through */ }
    return '?';
}

// Wraps proto[method] so a rejection carries err.__vpOp. The resolved value
// and the error itself pass through untouched.
function vpTagFailures(proto, method, describe) {
    var original = proto && proto[method];
    if (typeof original !== 'function') return;
    proto[method] = function() {
        var target = this;
        var result = original.apply(this, arguments);
        if (!result || typeof result.catch !== 'function') return result;
        return result.catch(function(err) {
            if (err && typeof err === 'object' && !err.__vpOp) {
                try { err.__vpOp = describe(target); } catch (e) { /* frozen error object */ }
            }
            throw err;
        });
    };
}

function tagFirestoreFailures() {
    var sdk = firebase.firestore;
    ['get', 'set', 'update', 'delete'].forEach(function(method) {
        vpTagFailures(sdk.DocumentReference && sdk.DocumentReference.prototype, method, function(ref) {
            return method + ' ' + vpCollectionPattern(ref.path);
        });
    });
    vpTagFailures(sdk.CollectionReference && sdk.CollectionReference.prototype, 'add', function(ref) {
        return 'add ' + vpCollectionPattern(ref.path);
    });
    // CollectionReference inherits get() from Query, so this covers both.
    vpTagFailures(sdk.Query && sdk.Query.prototype, 'get', function(query) {
        return 'query ' + vpQueryPattern(query);
    });
    vpTagFailures(sdk.WriteBatch && sdk.WriteBatch.prototype, 'commit', function() { return 'batch commit'; });
    vpTagFailures(sdk.Firestore && sdk.Firestore.prototype, 'runTransaction', function() { return 'transaction'; });
}

// With no fallback, a failure is reported (js/errors.js) instead of being
// dropped: almost no caller passes one, so this used to make every Firestore
// failure — rules drift, quota, a missing SDK — invisible by design.
//
// A FirebaseError's own stack is just "FirebaseError: Missing or insufficient
// permissions." with no frames, which names neither the collection nor the
// caller — useless for finding which of ~36 call sites failed. The call site is
// captured here instead and travels with the report.
function handleFirebaseFailure(err, fallback, callSite) {
    if (typeof fallback === 'function') { fallback(err); return; }
    if (!window.vpReportError) return;
    if (callSite && err && !err.__vpCallSite) {
        try { err.__vpCallSite = callSite; } catch (e) { /* frozen error object */ }
    }
    vpReportError(err, 'firebase');
}

function firebaseSafe(operation, fallback) {
    // One Error per Firestore operation, which is negligible next to the
    // network round trip it is about to make.
    let callSite = '';
    try { callSite = new Error('vp-call-site').stack || ''; } catch (e) {}
    try {
        const result = operation();
        if (result && typeof result.catch === 'function') {
            // Quota exhaustion never rejects an SDK write — it just stays
            // pending — so pending time is watched separately.
            if (window.vpWatchPending) vpWatchPending(result);
            return result.catch(function(err) {
                handleFirebaseFailure(err, fallback, callSite);
                return null;
            });
        }
        return result;
    } catch (err) {
        handleFirebaseFailure(err, fallback, callSite);
        return null;
    }
}

// onSnapshot never goes through firebaseSafe(): it hands failures to its own
// error callback instead of rejecting, so until this helper every listener in
// the app passed an empty one and the whole real-time read path reported
// nothing. Every listener passes this as its second argument, so a dropped
// composite index, a tightened rule or an exhausted read quota surfaces as a
// report instead of rendering an empty panel forever.
//
// `context` names the panel or feature (dailyBoard, roomInvites, ...) and is
// carried as the report's `op`, since ten listeners would otherwise produce
// ten identical "Missing or insufficient permissions." reports.
function onSnapshotError(context) {
    // Captured when the listener is created, not when it fails: that is the
    // only moment the originating code is still on the stack. A FirebaseError
    // delivered to the callback has no useful frames of its own, exactly as it
    // has none when rejecting a write.
    let callSite = '';
    try { callSite = new Error('vp-call-site').stack || ''; } catch (e) {}
    const op = 'listen ' + String(context || '?');
    return function(err) {
        if (err && typeof err === 'object') {
            try {
                if (!err.__vpCallSite) err.__vpCallSite = callSite;
                if (!err.__vpOp) err.__vpOp = op;
            } catch (e) { /* frozen error object */ }
        }
        if (window.vpReportError) vpReportError(err, 'listener');
    };
}

function isNativeApp() {
    return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
}

// Sign-in can be triggered from the #signin-modal or from the onboarding
// overlay's sign-in step (js/onboarding.js) — surface errors in whichever one
// is actually visible, since only #signin-modal existed before onboarding.js
// was added and a failure there would otherwise be silent during onboarding.
function clearSignInErrors() {
    ['signin-error', 'onboarding-signin-error', 'signin-prompt-error'].forEach(function(id) {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
}

function showSignInError(message) {
    ['signin-error', 'onboarding-signin-error', 'signin-prompt-error'].forEach(function(id) {
        const el = document.getElementById(id);
        if (el) { el.textContent = message; el.classList.remove('hidden'); }
    });
    // Web onboarding hides the guest link so sign-in is the only exit — but a
    // failed popup must not strand the visitor on the overlay. Once a real
    // error has been shown, surface the guest path as an escape hatch.
    const overlay = document.getElementById('onboarding-overlay');
    if (overlay && !overlay.classList.contains('hidden')) {
        const guestLink = document.querySelector('.ob-guest-link');
        if (guestLink && guestLink.classList.contains('hidden')) {
            guestLink.textContent = t('firebase.havingTrouble');
            guestLink.classList.remove('hidden');
        }
    }
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

// Every live listener reads under a rule that needs request.auth, so one
// still attached when the token is revoked is handed "permission-denied" —
// which, now that listeners report, would file a burst of listener reports
// for the most routine action there is. Detach them before signing out;
// onAuthStateChanged(null) repeats the same cleanup harmlessly.
function unsubscribeUserListeners() {
    ['cleanupFriendsListeners', 'cleanupRooms', 'cleanupReferrals', 'cleanupLeaderboards',
        'cleanupChampions', 'cleanupBracelets'].forEach(function(name) {
        if (typeof window[name] !== 'function') return;
        try { window[name](); } catch (e) { if (window.vpReportError) vpReportError(e, 'error'); }
    });
}

function signOutUser() {
    // Debounced score and profit deltas need their owner: once auth clears,
    // window.egUser is null and the pending delta could no longer be attributed.
    if (window.flushPendingWrites) flushPendingWrites();
    unsubscribeUserListeners();
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

function detectPlatform() {
    if (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) {
        return /android/i.test(navigator.userAgent) ? 'android' : 'ios';
    }
    return 'web';
}

// A failed user-doc write used to be swallowed by firebaseSafe() and never
// retried, so a sign-in that hit a flaky network left an account with no
// Firestore doc at all — invisible to the admin panel, and only ever repaired
// if that player came back. Diagnosed at 6 of 80 accounts. Retry instead.
function setWithRetry(ref, payload, attempt) {
    attempt = attempt || 0;
    return ref.set(payload, { merge: true }).catch(function(err) {
        if (attempt >= 3) {
            console.warn('user doc write failed after retries:', err && err.code);
            throw err;
        }
        return new Promise(function(resolve) { setTimeout(resolve, 500 * Math.pow(2, attempt)); })
            .then(function() { return setWithRetry(ref, payload, attempt + 1); });
    });
}

function logUserToFirestore(user) {
    return setWithRetry(db.collection('users').doc(user.uid), {
        uid: user.uid,
        displayName: user.displayName || '',
        photoURL: user.photoURL || '',
        email: user.email || '',
        lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
        sessionCount: firebase.firestore.FieldValue.increment(1),
        platform: detectPlatform(),
        // Rewritten on every login, so the admin panel always shows which build
        // a player is actually running — and therefore which fields their
        // client is capable of reporting.
        appVersion: window.VP_APP_VERSION || 'unknown'
    }).then(function() {
        return db.collection('users').doc(user.uid).get();
    }).then(function(doc) {
        const data = doc.exists ? doc.data() : {};
        // Fresh device + existing cloud backup → restore the chip stack
        // before any UI renders a stale default balance (js/cloudsave.js).
        if (window.maybeRestoreCloudState) maybeRestoreCloudState(data);
        // After the restore on purpose — it replaces the balance wholesale and
        // would wipe a gift credited before it (js/coin-gift.js).
        if (window.claimPendingGift) claimPendingGift();
        const updates = {};

        // Firebase Auth knows exactly when the account was created, so a user
        // doc written before firstSeen existed (every build shipped up to 2.5)
        // can be backfilled with its real sign-up date instead of "now" — which
        // would otherwise dump every returning player into the admin's
        // new-users cohort the first time they open a build that tracks it.
        const createdIso = (user.metadata && user.metadata.creationTime) || null;
        const createdMs = createdIso ? new Date(createdIso).getTime() : 0;
        // Unknown creation time → treat as new; only a known, old account is
        // excluded from attribution below, so nothing silently loses a source.
        const isNewAccount = !createdMs || (Date.now() - createdMs) < 24 * 60 * 60 * 1000;

        // firstSeen is written once on first login and never overwritten.
        if (!data.firstSeen) {
            updates.firstSeen = createdMs
                ? firebase.firestore.Timestamp.fromDate(new Date(createdMs))
                : firebase.firestore.FieldValue.serverTimestamp();

            // Attribution: resolve acquisition source from first-touch UTM stored in
            // localStorage. Written exactly once alongside firstSeen so it is
            // immutable for the lifetime of the user record.
            // Note: Android attribution comes from Play Install Referrer → Firebase
            // Analytics / Play Console; acquisitionSource will be 'organic' for
            // Android installs where the UTM never reaches the WebView.
            var storedUtm = (typeof getStoredUtmContext === 'function') ? getStoredUtmContext() : null;
            if (!isNewAccount) storedUtm = null;
            var acquisitionSource = 'organic';
            if (storedUtm && storedUtm.utm_source) {
                acquisitionSource = storedUtm.utm_source;
            } else {
                try {
                    if (localStorage.getItem('vp_referral_invited')) acquisitionSource = 'referral';
                } catch (e) {}
            }
            // A backfilled veteran has no acquisition story to tell — leaving the
            // field unset keeps them out of the acquisition breakdown instead of
            // inventing an "organic" install for them.
            if (isNewAccount) updates.acquisitionSource = acquisitionSource;
            if (storedUtm) {
                if (storedUtm.utm_medium)   updates.firstUtmMedium   = storedUtm.utm_medium;
                if (storedUtm.utm_campaign) updates.firstUtmCampaign = storedUtm.utm_campaign;
                if (storedUtm.utm_content)  updates.firstUtmContent  = storedUtm.utm_content;
            }

            // Fire TikTok CompleteRegistration conversion event for new sign-ups
            if (isNewAccount && typeof ttqTrack === 'function') ttqTrack('CompleteRegistration', { content_type: 'app' });
        }
        if (!data.referralCode) updates.referralCode = generateRoomCode();
        if (Object.keys(updates).length > 0) {
            return db.collection('users').doc(user.uid).update(updates).then(function() {
                window.egUserDoc = Object.assign({}, data, updates);
                if (window.renderFriendsScreen) renderFriendsScreen();
            });
        }
        window.egUserDoc = data;
        if (window.renderFriendsScreen) renderFriendsScreen();
    });
}

var _vpSessionStart = Date.now();
var _vpSessionHour  = new Date().getHours();

function _vpFlushSession() {
    if (!db || !auth || !auth.currentUser) return;
    var dur = Date.now() - _vpSessionStart;
    if (dur < 10000) return;
    var uid = auth.currentUser.uid;
    var update = {
        totalPlayTimeMs: firebase.firestore.FieldValue.increment(dur),
        lastSessionMs:   dur,
        lastSessionHour: _vpSessionHour
    };
    update['playHourMap.h' + _vpSessionHour] = firebase.firestore.FieldValue.increment(1);
    firebaseSafe(function() { return db.collection('users').doc(uid).update(update); });
}

function _vpResetSession() {
    _vpSessionStart = Date.now();
    _vpSessionHour  = new Date().getHours();
}

document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'hidden') { _vpFlushSession(); }
    else { _vpResetSession(); }
});
window.addEventListener('pagehide', _vpFlushSession);
document.addEventListener('pause',  _vpFlushSession);
document.addEventListener('resume', _vpResetSession);

let _wasSignedIn = false;

if (auth) {
    auth.onAuthStateChanged(function(user) {
        // Signals that Firebase has settled the session. Before this fires,
        // window.egUser is null even for a signed-in returning user — so a
        // deep link arriving at DOMContentLoaded must NOT treat "no user" as
        // "signed out" and pop the sign-in modal. See handleJoinDeepLink().
        window._authResolved = true;
        window.egUser = user || null;
        if (window.isNativeApp && isNativeApp() && window.applyDefaultLeaderboardTab) applyDefaultLeaderboardTab();
        if (window.closeSignInModal) closeSignInModal();
        if (user && window.closeSigninPromptModal) closeSigninPromptModal();
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
            // Outside the friendsRooms flag on purpose: unclaimed referral coins
            // are owed to the player, so they must still reconcile if the flag is
            // switched off after the invites went out.
            if (window.subscribeReferralRewards) subscribeReferralRewards();
            if (window.egFeatures.friendsRooms) {
                if (window.loadFriends) loadFriends();
                if (window.loadMyRooms) loadMyRooms();
                // Live listener for incoming poker-room invites (js/rooms.js)
                if (window.initRoomInviteListener) initRoomInviteListener();
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
            if (window.cleanupReferrals) cleanupReferrals();
            if (window.stopPresence) stopPresence();
            // A room link that landed before auth settled: now that we know the
            // visitor is genuinely signed out, ask them to sign in. The code
            // stays parked in _pendingJoinCode and is replayed above on success.
            if (window._pendingJoinCode) {
                if (window.openSignInModal) openSignInModal();
                if (window.showToast) showToast(t('toast.signInDailyGame'));
            } else if (window._pendingGiftPrompt) {
                // Same for a gift link; it stays parked in localStorage.
                window._pendingGiftPrompt = false;
                if (window.openSignInModal) openSignInModal();
                if (window.showToast) showToast(t('toast.giftSignIn'));
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
