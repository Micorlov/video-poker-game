// In-app review prompt (Play In-App Review via @capacitor-community/in-app-review).
//
// Asked once, only inside the native app, and only after the player has had a
// good run: three quality wins (a Straight or better, see draw() in js/game.js)
// or level 3. The win counter and the "already shown" flag persist in
// localStorage so the ask never repeats. Play rate-limits the sheet and may
// silently show nothing, so the call is fire-and-forget on purpose.

const REVIEW_QUALITY_WINS_NEEDED = 3;
const REVIEW_LEVEL_THRESHOLD = 3;
// Let the win highlight and toast finish before the review sheet slides up.
const REVIEW_PROMPT_DELAY_MS = 2600;

function loadReviewState() {
    try {
        const raw = JSON.parse(localStorage.getItem('vp_review'));
        if (raw && typeof raw === 'object') {
            return { wins: raw.wins || 0, shown: !!raw.shown };
        }
    } catch (e) { /* corrupt or unavailable — start fresh */ }
    return { wins: 0, shown: false };
}

function saveReviewState(state) {
    try {
        localStorage.setItem('vp_review', JSON.stringify(state));
    } catch (e) { /* localStorage unavailable, silently fail */ }
}

function requestInAppReview() {
    const plugin = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.InAppReview;
    if (!plugin || typeof plugin.requestReview !== 'function') return;
    try {
        Promise.resolve(plugin.requestReview()).catch(function() { /* Play declined to show the sheet */ });
    } catch (e) { /* a synchronous plugin failure must never reach the game loop */ }
}

// Called from draw() in js/game.js on every Straight-or-better win.
function vpOnQualityWin() {
    const prev = loadReviewState();
    const state = { wins: prev.wins + 1, shown: prev.shown };
    const level = window.getLocalLevel ? getLocalLevel() : 1;
    const earned = state.wins >= REVIEW_QUALITY_WINS_NEEDED || level >= REVIEW_LEVEL_THRESHOLD;
    if (earned && !state.shown && window.isNativeApp && isNativeApp()) {
        state.shown = true;
        saveReviewState(state);
        if (window.logVpEvent) logVpEvent(VP_ASO_EVENTS.reviewPromptEarned, {
            quality_wins: state.wins,
            level: level
        });
        setTimeout(requestInAppReview, REVIEW_PROMPT_DELAY_MS);
        return;
    }
    saveReviewState(state);
}

window.vpOnQualityWin = vpOnQualityWin;
