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
        vpAnalytics.logEvent(name, params || {});
    } catch (e) {
        vpAnalyticsFailed = true;
    }
}

window.logVpEvent = logVpEvent;
