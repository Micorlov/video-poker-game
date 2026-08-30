// Smart invite links (Android / Play Store).
//
// One https link does all three jobs the invite flow needs:
//   app installed  → invite.html hands the OS an intent:// URL, Android opens
//                    the app, and js/tabs.js replays ?ref= / ?join= inside it.
//   not installed  → the same intent carries browser_fallback_url, so Chrome
//                    lands on the Play Store listing instead of a dead scheme.
//   after install  → the Play referrer string carries the code through the
//                    install, and MainActivity feeds it back in on first launch
//                    (see __onInstallReferrer below), so the friendship still
//                    connects even though the original click is long gone.
//
// Everything that is not Android (desktop, iOS, in-app browsers we can't
// detect) falls through to the web build — never to a store page it can't use.

const ANDROID_PACKAGE = 'com.micorlov.videopoker';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=' + ANDROID_PACKAGE;

// Absolute fallbacks, used only when window.location can't produce a shareable
// base — i.e. inside the native WebView, where the origin is https://localhost.
const SMART_LINK_URL = 'https://micorlov.github.io/video-poker-game/invite.html';

function _isUnshareableOrigin(origin) {
    return !origin
        || origin === 'null'
        || origin === 'https://localhost'
        || origin.indexOf('capacitor://') === 0
        || origin.indexOf('file://') === 0;
}

// Sibling of the current page rather than a hardcoded host, so a fork, a
// staging deploy, or a local checkout shares links that point back at itself.
function getSmartLinkBase() {
    const origin = window.location.origin || '';
    if (_isUnshareableOrigin(origin)) return SMART_LINK_URL;
    return origin + window.location.pathname.replace(/[^/]*$/, '') + 'invite.html';
}

function buildInviteLink(code) {
    if (!code) return '';
    return getSmartLinkBase() + '?ref=' + encodeURIComponent(code);
}

function buildRoomLink(code) {
    if (!code) return '';
    return getSmartLinkBase() + '?join=' + encodeURIComponent(code);
}

function getPlayStoreLink() {
    return PLAY_STORE_URL;
}

// --- Deferred deep link: Play Store install referrer -----------------------
//
// The friend who taps an invite without the app installed goes to Play, and the
// browser context that held their invite code dies there. Play carries the
// referrer string into the fresh install, MainActivity reads it once via the
// Install Referrer API, and calls this. Both entry points below are idempotent:
// the code is parked, then consumed by the auth listener once sign-in settles.

function _parseReferrerPayload(raw) {
    if (!raw) return null;
    try {
        // Play hands back a query-string-shaped blob, e.g. "utm_source=x&ref=AB12CD".
        const params = new URLSearchParams(String(raw).replace(/^\?/, ''));
        const ref = params.get('ref');
        const join = params.get('join');
        if (ref) return { kind: 'ref', code: ref.trim().toUpperCase() };
        if (join) return { kind: 'join', code: join.trim().toUpperCase() };
    } catch (e) { /* malformed referrer — treat as no referrer at all */ }
    return null;
}

// A friend who installs from Play often plays a while before signing in, and
// the install referrer is only ever read once — so an in-memory park would lose
// the code on the first app restart, and with it the friendship and the
// inviter's reward. Persist until it has definitively been used.
const PENDING_INVITE_KEY = 'vp_pending_invite';

function persistPendingInvite(code) {
    try { localStorage.setItem(PENDING_INVITE_KEY, 'ref=' + code); } catch (e) { /* localStorage unavailable */ }
}

function clearPendingInvite() {
    try { localStorage.removeItem(PENDING_INVITE_KEY); } catch (e) { /* localStorage unavailable */ }
}

function restorePendingInvite() {
    try {
        const raw = localStorage.getItem(PENDING_INVITE_KEY);
        if (raw) applyInstallReferrer(raw);
    } catch (e) { /* nothing stored — the normal case */ }
}

function applyInstallReferrer(raw) {
    const parsed = _parseReferrerPayload(raw);
    if (!parsed || !parsed.code) return;
    if (parsed.kind === 'ref') {
        persistPendingInvite(parsed.code);
        // Park it the same way a live deep link would, so the auth listener in
        // js/firebase.js replays it through the one existing code path.
        if (!window._pendingInviteCode) window._pendingInviteCode = parsed.code;
        if (window.egUser && window.addFriendByInviteCode) {
            window._pendingInviteCode = null;
            addFriendByInviteCode(parsed.code);
        }
    } else {
        if (!window._pendingJoinCode) window._pendingJoinCode = parsed.code;
        if (window.egUser && window.joinRoomByCode) {
            window._pendingJoinCode = null;
            joinRoomByCode(parsed.code);
        }
    }
}

// Push path — MainActivity calls this once the async Play API answers. Defined
// on window immediately (not inside DOMContentLoaded) because that callback can
// fire before the page finishes loading.
window.__onInstallReferrer = function(raw) {
    try { applyInstallReferrer(raw); } catch (e) { /* never break startup */ }
};

// Pull path — covers the race where the Play API answered before this script
// parsed. MainActivity always parks the raw string on window before looking for
// the handler above, so one of the two paths always wins.
function readCachedInstallReferrer() {
    try {
        if (window.__installReferrerRaw) applyInstallReferrer(window.__installReferrerRaw);
    } catch (e) { /* nothing parked — the normal case on web */ }
}
