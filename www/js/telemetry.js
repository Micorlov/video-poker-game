// Shared transport for the early diagnostics scripts (js/errors.js,
// js/installs.js).
//
// build.js inlines these files into their own <script> ahead of the main
// bundle, so they must keep working when that bundle fails to parse on an old
// WebView or throws during boot. Hence ES5 only (var/function, no arrows), and
// hence Firestore's REST API instead of the SDK: the SDK may never have loaded,
// and signed-out guests have no auth token. The `errors` and `installs` rules
// accept unauthenticated creates in one exact shape (firestore.rules).

var VP_REST_PROJECT = 'video-poker-6d665';
// The public web key, same as firebaseConfig in js/firebase.js. Duplicated on
// purpose: this script must work when firebase.js never ran.
var VP_REST_API_KEY = 'AIzaSyB6m0Yis89jxvm06OFBqxs8P_vADjRXk0U';
var VP_REST_DOCS = 'projects/' + VP_REST_PROJECT + '/databases/(default)/documents';
var VP_REST_COMMIT_URL = 'https://firestore.googleapis.com/v1/' + VP_REST_DOCS + ':commit?key=' + VP_REST_API_KEY;
var VP_INSTALL_KEY = 'vp_install';
var VP_INSTALL_ID_LENGTH = 20;
var VP_ID_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

function vpRandomId() {
    var id = '';
    for (var i = 0; i < VP_INSTALL_ID_LENGTH; i++) {
        id += VP_ID_CHARS.charAt(Math.floor(Math.random() * VP_ID_CHARS.length));
    }
    return id;
}

// Encodes a flat object as Firestore REST fields. Numbers are sent as
// integers — every numeric field in these reports is a count or a duration.
function vpRestFields(obj) {
    var fields = {};
    Object.keys(obj).forEach(function(key) {
        var v = obj[key];
        if (typeof v === 'boolean') fields[key] = { booleanValue: v };
        else if (typeof v === 'number') fields[key] = { integerValue: String(Math.round(v)) };
        else fields[key] = { stringValue: String(v == null ? '' : v) };
    });
    return fields;
}

// Creates collection/docId with a server `at` timestamp. Resolves to:
//   'ok'       — stored
//   'quota'    — HTTP 429, the project's daily quota is spent; retry later
//   'retry'    — offline or a server error; retry later
//   'rejected' — rules refused it or it already exists; retrying cannot help
// Never rejects.
function vpRestCreate(collection, docId, data) {
    if (typeof fetch !== 'function') return Promise.resolve('retry');
    var body = {
        writes: [{
            update: { name: VP_REST_DOCS + '/' + collection + '/' + docId, fields: vpRestFields(data) },
            updateTransforms: [{ fieldPath: 'at', setToServerValue: 'REQUEST_TIME' }],
            currentDocument: { exists: false }
        }]
    };
    try {
        return fetch(VP_REST_COMMIT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        }).then(function(res) {
            if (res.ok) return 'ok';
            if (res.status === 429) return 'quota';
            if (res.status >= 500) return 'retry';
            return 'rejected';
        }, function() {
            return 'retry';
        });
    } catch (e) {
        return Promise.resolve('retry');
    }
}

// Per-install state: a random id (no account needed) plus whether this
// install already had a saved game when these scripts first ran — i.e. an
// upgrade from a build that predates install tracking, not a new install.
function vpReadInstall() {
    try {
        var raw = localStorage.getItem(VP_INSTALL_KEY);
        var parsed = raw ? JSON.parse(raw) : null;
        if (parsed && typeof parsed.id === 'string' && parsed.id.length === VP_INSTALL_ID_LENGTH) return parsed;
    } catch (e) { /* corrupt or blocked storage: start fresh */ }
    return null;
}

function vpWriteInstall(state) {
    try { localStorage.setItem(VP_INSTALL_KEY, JSON.stringify(state)); } catch (e) { /* storage blocked */ }
    return state;
}

function vpHadSavedGame() {
    try { return !!localStorage.getItem('vp_game_state'); } catch (e) { return false; }
}

function vpInstallState() {
    return vpReadInstall() || vpWriteInstall({
        id: vpRandomId(),
        existing: vpHadSavedGame(),
        openSent: false,
        bootSent: false
    });
}

function vpUpdateInstall(patch) {
    var next = {};
    var current = vpInstallState();
    Object.keys(current).forEach(function(k) { next[k] = current[k]; });
    Object.keys(patch).forEach(function(k) { next[k] = patch[k]; });
    return vpWriteInstall(next);
}

function vpInstallId() {
    return vpInstallState().id;
}

function vpPlatform() {
    try {
        var cap = window.Capacitor;
        if (cap && cap.isNativePlatform && cap.isNativePlatform()) {
            return /android/i.test(navigator.userAgent) ? 'android' : 'ios';
        }
    } catch (e) { /* no bridge */ }
    return 'web';
}

// VP_BUILD_VERSION is written by build.js ahead of these files, so the version
// is known even when the main bundle (and its VP_APP_VERSION) never ran.
function vpBuildVersion() {
    return typeof VP_BUILD_VERSION === 'string' ? VP_BUILD_VERSION : 'unknown';
}

function vpUaVersion(pattern) {
    var m = (navigator.userAgent || '').match(pattern);
    return m ? parseInt(m[1], 10) : 0;
}

// Old Android System WebViews that cannot parse the bundle are a prime suspect
// for installs that open once and never come back, so both versions travel
// with every report. Numbers only — never the full user-agent string.
function vpDeviceInfo() {
    return {
        version: vpBuildVersion(),
        platform: vpPlatform(),
        android: vpUaVersion(/Android (\d+)/),
        chrome: vpUaVersion(/Chrome\/(\d+)/),
        lang: String(navigator.language || '').slice(0, 16)
    };
}

// getCountry() lives in the main bundle (js/presence.js) and may not have run;
// fall back to the region part of the browser language.
function vpCountry() {
    try {
        if (typeof getCountry === 'function') {
            var c = getCountry();
            if (c) return String(c).slice(0, 8);
        }
    } catch (e) { /* main bundle not initialised */ }
    var m = String(navigator.language || '').match(/-([A-Za-z]{2})$/);
    return m ? m[1].toUpperCase() : '';
}
