// Funnel analytics — Firebase Analytics (GA4) via the compat SDK. Chosen over
// Firestore counters because it also works for signed-out guests (the exact
// population the sign-in funnel needs to measure) and needs no security rules.
//
// Requires Google Analytics to be enabled on the Firebase project, which adds
// a measurementId to firebaseConfig (js/firebase.js). Until that manual console
// step is done, firebase.analytics() throws and every call here is a silent
// no-op — the game must never depend on analytics being available.

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

function logVpEvent(name, params) {
    try {
        if (vpAnalyticsFailed) return;
        if (!vpAnalytics) {
            if (typeof firebase === 'undefined' || !firebase.analytics) {
                vpAnalyticsFailed = true;
                return;
            }
            vpAnalytics = firebase.analytics();
        }
        vpAnalytics.logEvent(name, Object.assign({}, vpMarketingContext(), params || {}));
    } catch (e) {
        vpAnalyticsFailed = true;
    }
}

function initVpAnalytics() {
    if (window.__vpAnalyticsSessionStarted) return;
    window.__vpAnalyticsSessionStarted = true;
    logVpEvent(VP_ASO_EVENTS.appOpen, { app_version: '2.5' });
    logVpEvent(VP_ASO_EVENTS.sessionStart, {
        platform: window.Capacitor && window.Capacitor.isNativePlatform ? 'native' : 'web'
    });
}

window.VP_ASO_EVENTS = VP_ASO_EVENTS;
window.initVpAnalytics = initVpAnalytics;
window.logVpEvent = logVpEvent;
