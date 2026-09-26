// Funnel analytics — Firebase Analytics (GA4) via the compat SDK. Chosen over
// Firestore counters because it also works for signed-out guests (the exact
// population the sign-in funnel needs to measure) and needs no security rules.
//
// Requires Google Analytics to be enabled on the Firebase project, which adds
// a measurementId to firebaseConfig (js/firebase.js). Until that manual console
// step is done, firebase.analytics() throws and every call here is a silent
// no-op — the game must never depend on analytics being available.

// Single source of truth for the client build number. Must match versionName
// in android/app/build.gradle — build.js warns when the two drift apart, since
// a stale bundle shipped inside a newer APK is exactly how the admin dashboard
// ended up blind to the fields newer code writes.
const VP_APP_VERSION = '2.8';

let vpAnalytics = null;
let vpAnalyticsFailed = false;

// Keep the event vocabulary small and stable so Play Console/Firebase reports
// can be compared week over week. These events never include account ids,
// names, invite codes, or card-level gameplay data.
const VP_ASO_EVENTS = Object.freeze({
    appOpen: 'app_open',
    sessionStart: 'session_start',
    onboardingStep: 'onboarding_step',
    handStarted: 'hand_started',
    handCompleted: 'hand_completed',
    dailyBonusClaimed: 'daily_bonus_claimed',
    leaderboardViewed: 'leaderboard_viewed',
    reviewPromptEarned: 'review_prompt_earned',
    reviewCardShown: 'review_card_shown',
    reviewCardRate: 'review_card_rate',
    reviewCardDismissed: 'review_card_dismissed',
    storeLinkOpened: 'store_link_opened',
    inviteShared: 'invite_shared'
});

function vpMarketingContext() {
    try {
        const params = new URLSearchParams(window.location.search || '');
        const allowed = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'referrer'];
        const context = {};
        allowed.forEach(function(key) {
            const value = params.get(key);
            if (value && value.length <= 100) context[key] = value;
        });
        return context;
    } catch (e) {
        return {};
    }
}

// On Android/iOS the native Firebase Analytics SDK (@capacitor-firebase/
// analytics) is used in preference to the web SDK. It reports against the app's
// own GA4 data stream, which is what gives install attribution and Play Console
// integration, and it needs no measurementId — the web SDK path would otherwise
// file app events as web traffic.
function vpNativeAnalytics() {
    try {
        var cap = window.Capacitor;
        if (!cap || !cap.isNativePlatform || !cap.isNativePlatform()) return null;
        return (cap.Plugins && cap.Plugins.FirebaseAnalytics) || null;
    } catch (e) {
        return null;
    }
}

function logVpEvent(name, params) {
    try {
        var merged = Object.assign({}, vpMarketingContext(), params || {});
        var native = vpNativeAnalytics();
        if (native) {
            // Fire and forget: a rejected promise here must not become an
            // unhandled rejection and so an error report of its own.
            var sent = native.logEvent({ name: name, params: merged });
            if (sent && sent.catch) sent.catch(function() {});
            return;
        }
        if (vpAnalyticsFailed) return;
        if (!vpAnalytics) {
            if (typeof firebase === 'undefined' || !firebase.analytics) {
                vpAnalyticsFailed = true;
                return;
            }
            vpAnalytics = firebase.analytics();
        }
        vpAnalytics.logEvent(name, merged);
    } catch (e) {
        vpAnalyticsFailed = true;
    }
}

// Whether events are actually going anywhere: the native SDK if this is a
// native build, otherwise the web SDK, which needs a measurementId. Surfaced so
// the gap is visible rather than looking like silence.
function vpAnalyticsEnabled() {
    if (vpNativeAnalytics()) return true;
    return !!vpAnalytics && !vpAnalyticsFailed;
}

function initVpAnalytics() {
    if (window.__vpAnalyticsSessionStarted) return;
    window.__vpAnalyticsSessionStarted = true;
    logVpEvent(VP_ASO_EVENTS.appOpen, { app_version: VP_APP_VERSION });
    if (!vpAnalyticsEnabled()) {
        // Not an error report: this is a known configuration gap, and routing it
        // to js/errors.js would bury real errors under one per session.
        console.info('Firebase Analytics is not enabled (no measurementId) — funnel events are no-ops.');
    }
    logVpEvent(VP_ASO_EVENTS.sessionStart, {
        platform: window.Capacitor && window.Capacitor.isNativePlatform ? 'native' : 'web'
    });
}

// --- TikTok Pixel helpers ---

// Thin wrapper — fires ttq.track() if Pixel is loaded, silently no-ops otherwise.
function ttqTrack(event, params) {
    try {
        if (typeof ttq !== 'undefined') ttq.track(event, params || {});
    } catch (e) { /* pixel not loaded or blocked */ }
}

// --- First-touch UTM attribution ---
// Captures utm_* params once (on first visit with a source) and stores them in
// localStorage so they survive sign-in redirects and SPA navigation. Never
// overwrites an existing capture — first-touch wins.
function captureUtmContext() {
    try {
        if (localStorage.getItem('vp_first_utm')) return;
        var params = new URLSearchParams(window.location.search || '');
        var source = params.get('utm_source');
        if (!source) return;
        var ctx = {
            utm_source: source.toLowerCase().trim(),
            utm_medium: (params.get('utm_medium') || '').toLowerCase().trim(),
            utm_campaign: params.get('utm_campaign') || '',
            utm_content: params.get('utm_content') || '',
            capturedAt: Date.now()
        };
        localStorage.setItem('vp_first_utm', JSON.stringify(ctx));
    } catch (e) { /* localStorage unavailable */ }
}

function getStoredUtmContext() {
    try {
        var raw = localStorage.getItem('vp_first_utm');
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        return null;
    }
}

captureUtmContext();

window.vpAnalyticsEnabled = vpAnalyticsEnabled;
window.VP_APP_VERSION = VP_APP_VERSION;
window.VP_ASO_EVENTS = VP_ASO_EVENTS;
window.initVpAnalytics = initVpAnalytics;
window.logVpEvent = logVpEvent;
window.ttqTrack = ttqTrack;
window.getStoredUtmContext = getStoredUtmContext;
