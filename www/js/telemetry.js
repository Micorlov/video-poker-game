// Shared transport for the early diagnostics scripts (js/errors.js,
// js/installs.js).
//
// build.js inlines these files into their own <script> ahead of the main
// bundle, so they must keep working when that bundle fails to parse on an old
// WebView or throws during boot. Hence ES5 only (var/function, no arrows), and
// hence Firestore's REST API instead of the SDK: the SDK may never have loaded,
// and signed-out guests have no auth token. The `errors` and `installs` rules
// accept unauthenticated creates in one exact shape, plus one narrow update of
// an install's launch count (firestore.rules).

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

// Sends one write and says what became of it. Resolves to:
//   'ok'       — stored
//   'quota'    — HTTP 429, the project's daily quota is spent; retry later
//   'retry'    — offline or a server error; retry later
//   'rejected' — the rules refused it or its precondition failed; retrying the
//                same write cannot help
// Never rejects.
function vpRestCommit(write) {
    if (typeof fetch !== 'function') return Promise.resolve('retry');
    try {
        return fetch(VP_REST_COMMIT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ writes: [write] })
        }).then(function(res) {
            // Every response carries the server's clock; a wrong device clock
            // otherwise mis-dates the player's daily score.
            try { vpNoteServerDate(res.headers && res.headers.get('date')); } catch (e) {}
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

function vpRestDocName(collection, docId) {
    return VP_REST_DOCS + '/' + collection + '/' + docId;
}

// Creates collection/docId with a server `at` timestamp. 'rejected' also
// covers a document that already exists.
function vpRestCreate(collection, docId, data) {
    return vpRestCommit({
        update: { name: vpRestDocName(collection, docId), fields: vpRestFields(data) },
        updateTransforms: [{ fieldPath: 'at', setToServerValue: 'REQUEST_TIME' }],
        currentDocument: { exists: false }
    });
}

// Changes only the fields in `data` on an existing document and stamps
// `timeField` with the server's clock. 'rejected' also covers a document that
// does not exist.
function vpRestUpdate(collection, docId, data, timeField) {
    return vpRestCommit({
        update: { name: vpRestDocName(collection, docId), fields: vpRestFields(data) },
        updateMask: { fieldPaths: Object.keys(data) },
        updateTransforms: [{ fieldPath: timeField, setToServerValue: 'REQUEST_TIME' }],
        currentDocument: { exists: true }
    });
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

// --- Device clock skew ------------------------------------------------------
//
// daily_scores documents exist dated four days in the future, because
// getDayKey() (js/leaderboards.js) builds its key from the device's own local
// date and some devices' clocks are simply wrong. A player with a fast clock
// writes to a day nobody is reading, so their score silently never appears.
//
// A timezone can only ever move the date by one day, so anything beyond that is
// skew, not travel. The correction comes from the Date header on a real
// response — no extra request, no API — and only the offset from UTC is kept,
// so the player's own timezone still decides which local day it is.
var vpClockSkewMs = 0;
var VP_MAX_TRUSTED_SKEW_MS = 60 * 1000;

// Called with the `date` header of any response this file already makes.
function vpNoteServerDate(headerValue) {
    if (!headerValue) return;
    var serverMs = Date.parse(headerValue);
    if (!serverMs) return;
    var skew = serverMs - Date.now();
    // Sub-minute differences are latency and rounding, not a broken clock.
    vpClockSkewMs = Math.abs(skew) > VP_MAX_TRUSTED_SKEW_MS ? skew : 0;
}

// Now, as the server would date it. Everything that keys data by date uses this
// rather than Date.now() so one bad device clock cannot file a score under a day
// that no leaderboard query covers.
function vpServerNow() {
    return new Date(Date.now() + vpClockSkewMs);
}

function vpClockSkewSeconds() {
    return Math.round(vpClockSkewMs / 1000);
}

// One probe per launch, so the correction is known even for an install that has
// nothing else to report — which is most of them, and exactly the population
// whose clocks are wrong.
//
// A commit carrying no writes: it returns 200 with the server's Date header,
// writes nothing, and reads no document, so it costs no quota. It has to be this
// endpoint rather than a plain request to the host — the WebView runs on the
// https://localhost origin, and only the API paths send
// Access-Control-Allow-Origin, so anything else is refused by CORS before the
// headers can be read. A failure just leaves the device clock in charge, as
// before.
function vpProbeServerClock() {
    if (typeof fetch !== 'function') return Promise.resolve();
    try {
        return fetch(VP_REST_COMMIT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: '{"writes":[]}'
        }).then(function(res) {
            try { vpNoteServerDate(res.headers && res.headers.get('date')); } catch (e) {}
        }, function() { /* offline: the device clock stands */ });
    } catch (e) {
        return Promise.resolve();
    }
}

vpProbeServerClock();

// --- Country ------------------------------------------------------------------
//
// Resolved from the IP address, once per launch, for every consumer: the
// install funnel here and presence, leaderboards and champions in the main
// bundle (js/presence.js asks this rather than looking it up again). It lives
// in the early script so the first install stage can carry it even when the
// main bundle never boots.
//
// There is deliberately no fallback to the device language. It used to answer
// while the lookup was in flight: an en-GB phone in Israel reported GB from the
// open stage and IL from the boot stage two seconds later, and every country
// breakdown quietly mixed IP locations with language settings. Unknown is ''.
var VP_COUNTRY_LOOKUPS = [
    { url: 'https://ipapi.co/country_code/' },
    { url: 'https://api.country.is/', field: 'country' },
    { url: 'https://ipwho.is/?fields=country_code', field: 'country_code' }
];
var vpIpCountry = '';
var vpCountryLookup = null;

function vpFetchCountryFrom(lookup) {
    return fetch(lookup.url, { cache: 'no-cache' }).then(function(res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return lookup.field ? res.json() : res.text();
    }).then(function(data) {
        var code = String((lookup.field ? data && data[lookup.field] : data) || '').trim().toUpperCase();
        if (!/^[A-Z]{2}$/.test(code)) throw new Error('no country in the response');
        return code;
    });
}

// Resolves to the two-letter country, or '' once every provider has failed.
// Never rejects; one lookup per launch however many callers ask.
function vpResolveCountry() {
    if (vpCountryLookup) return vpCountryLookup;
    if (typeof fetch !== 'function') {
        vpCountryLookup = Promise.resolve('');
        return vpCountryLookup;
    }
    var attempt = Promise.reject(new Error('not tried yet'));
    VP_COUNTRY_LOOKUPS.forEach(function(lookup) {
        attempt = attempt.then(null, function() { return vpFetchCountryFrom(lookup); });
    });
    vpCountryLookup = attempt.then(function(code) {
        vpIpCountry = code;
        return code;
    }, function() {
        return '';
    });
    return vpCountryLookup;
}

// The IP country if the lookup has answered, otherwise ''.
function vpCountry() {
    return vpIpCountry;
}

vpResolveCountry();
