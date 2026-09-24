// Rating ask — Google Play's in-app review sheet first, then our star card.
//
// A player earns the ask with three quality wins (a Straight or better, see
// draw() in js/game.js) or level 3. The first ask is the native Play sheet
// (@capacitor-community/in-app-review). Play rate-limits that sheet and often
// shows nothing, so later asks use the "Enjoying Video Poker?" star card, whose
// Rate button opens the Play listing (openRateGame in js/deeplink.js).
//
// Play policy: nothing here may ask "would you rate us 5 stars" or otherwise
// question the player before or while the native sheet is up — the card is a
// separate, later ask and its copy never names a star count.
//
// Guardrails: native app only, the card on Android only (it links to Google
// Play), one ask per session, a 7-day cooldown, a lifetime cap of 3 cards,
// never again once the player taps Rate, and never on top of another prompt.

const REVIEW_KEY = 'vp_review';
const REVIEW_QUALITY_WINS_NEEDED = 3;
const REVIEW_LEVEL_THRESHOLD = 3;
// Later than the 2600 ms sign-in / big-win share prompts in draw(), so those
// claim the screen first and the overlay check below sees them.
const REVIEW_PROMPT_DELAY_MS = 3200;
const REVIEW_CARD_LIFETIME_CAP = 3;
const REVIEW_CARD_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
const REVIEW_BLOCKING_OVERLAYS =
    '.modal-backdrop:not(.hidden), .sheet-backdrop:not(.hidden), #onboarding-overlay:not(.hidden)';

let reviewAskedThisSession = false;
let reviewPromptPending = false;

function loadReviewState() {
    try {
        const raw = JSON.parse(localStorage.getItem(REVIEW_KEY));
        if (raw && typeof raw === 'object') {
            const shown = !!raw.shown;
            return {
                wins: Number(raw.wins) || 0,
                shown: shown,
                // Players upgrading from 2.7 had the native ask with no
                // timestamp; start their cooldown now rather than carding them
                // on the very next win.
                shownAt: Number(raw.shownAt) || (shown ? Date.now() : 0),
                cardCount: Number(raw.cardCount) || 0,
                lastCardAt: Number(raw.lastCardAt) || 0,
                rated: !!raw.rated
            };
        }
    } catch (e) { /* corrupt or unavailable — start fresh */ }
    return { wins: 0, shown: false, shownAt: 0, cardCount: 0, lastCardAt: 0, rated: false };
}

function saveReviewState(state) {
    try {
        localStorage.setItem(REVIEW_KEY, JSON.stringify(state));
    } catch (e) { /* localStorage unavailable, silently fail */ }
}

function isAndroidApp() {
    const cap = window.Capacitor;
    return !!(cap && typeof cap.getPlatform === 'function' && cap.getPlatform() === 'android');
}

function reviewCardDue(state, now) {
    if (state.rated || state.cardCount >= REVIEW_CARD_LIFETIME_CAP) return false;
    return now - Math.max(state.shownAt, state.lastCardAt) >= REVIEW_CARD_COOLDOWN_MS;
}

function requestInAppReview() {
    const plugin = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.InAppReview;
    if (!plugin || typeof plugin.requestReview !== 'function') return;
    try {
        Promise.resolve(plugin.requestReview()).catch(function() { /* Play declined to show the sheet */ });
    } catch (e) { /* a synchronous plugin failure must never reach the game loop */ }
}

function askNativeReview(state, now) {
    reviewAskedThisSession = true;
    saveReviewState({ ...state, shown: true, shownAt: now });
    if (window.logVpEvent) logVpEvent(VP_ASO_EVENTS.reviewPromptEarned, {
        quality_wins: state.wins,
        level: window.getLocalLevel ? getLocalLevel() : 1
    });
    requestInAppReview();
}

function showReviewCard(state, now) {
    const modal = document.getElementById('review-prompt-modal');
    if (!modal) return;
    reviewAskedThisSession = true;
    const next = { ...state, cardCount: state.cardCount + 1, lastCardAt: now };
    saveReviewState(next);
    modal.classList.remove('hidden');
    if (window.logVpEvent) logVpEvent(VP_ASO_EVENTS.reviewCardShown, { card_count: next.cardCount });
}

// Decided when the timer fires, not when the win lands: by then the sign-in
// prompt or share sheet may have opened, and the player may have left the app.
function maybeShowReviewPrompt() {
    reviewPromptPending = false;
    if (reviewAskedThisSession) return;
    if (!(window.isNativeApp && isNativeApp())) return;
    if (document.querySelector(REVIEW_BLOCKING_OVERLAYS)) return;

    const state = loadReviewState();
    const now = Date.now();
    if (!state.shown) {
        askNativeReview(state, now);
    } else if (isAndroidApp() && reviewCardDue(state, now)) {
        showReviewCard(state, now);
    }
}

// Called from draw() in js/game.js on every Straight-or-better win.
function vpOnQualityWin() {
    const prev = loadReviewState();
    const state = { ...prev, wins: prev.wins + 1 };
    saveReviewState(state);

    if (reviewAskedThisSession || reviewPromptPending) return;
    if (!(window.isNativeApp && isNativeApp())) return;
    const level = window.getLocalLevel ? getLocalLevel() : 1;
    if (state.wins < REVIEW_QUALITY_WINS_NEEDED && level < REVIEW_LEVEL_THRESHOLD) return;
    const wantsAsk = !state.shown || (isAndroidApp() && reviewCardDue(state, Date.now()));
    if (!wantsAsk) return;

    reviewPromptPending = true;
    setTimeout(maybeShowReviewPrompt, REVIEW_PROMPT_DELAY_MS);
}

function closeReviewPrompt() {
    const modal = document.getElementById('review-prompt-modal');
    if (modal) modal.classList.add('hidden');
}

function acceptReviewPrompt() {
    saveReviewState({ ...loadReviewState(), rated: true });
    if (window.logVpEvent) logVpEvent(VP_ASO_EVENTS.reviewCardRate, {});
    closeReviewPrompt();
    if (window.openRateGame) openRateGame();
}

function dismissReviewPrompt() {
    if (window.logVpEvent) logVpEvent(VP_ASO_EVENTS.reviewCardDismissed, {});
    closeReviewPrompt();
}

window.vpOnQualityWin = vpOnQualityWin;
window.acceptReviewPrompt = acceptReviewPrompt;
window.dismissReviewPrompt = dismissReviewPrompt;
