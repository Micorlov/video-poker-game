// Guest → Google sign-in re-prompt. Onboarding asks exactly once; a guest who
// tapped "Continue as Guest" was previously never asked again. This module
// re-asks at high-leverage moments (a big win, the start of a later session)
// with the player's real at-risk balance as the pitch — and hard caps how
// often it can ever appear, so it nudges instead of nagging.
//
// Guardrails: lifetime cap, multi-session cooldown, once per session, never
// during onboarding, never before auth has settled, never on coin depletion.

const SIGNIN_PROMPT_KEY = 'vp_signin_prompt';
const SIGNIN_PROMPT_LIFETIME_CAP = 5;
const SIGNIN_PROMPT_SESSION_COOLDOWN = 3;
const SIGNIN_PROMPT_MIN_SESSION = 2;

let signinPromptState = loadSigninPromptState();
let signinPromptShownThisSession = false;
let signinPromptSessionCounted = false;
let signinPromptTrigger = '';

function loadSigninPromptState() {
    try {
        const raw = JSON.parse(localStorage.getItem(SIGNIN_PROMPT_KEY));
        if (raw && typeof raw === 'object') {
            return {
                sessions: raw.sessions || 0,
                lastPromptSession: raw.lastPromptSession || 0,
                promptCount: raw.promptCount || 0
            };
        }
    } catch (e) { /* localStorage unavailable or corrupt */ }
    return { sessions: 0, lastPromptSession: 0, promptCount: 0 };
}

function saveSigninPromptState() {
    try { localStorage.setItem(SIGNIN_PROMPT_KEY, JSON.stringify(signinPromptState)); } catch (e) {}
}

// One tick per cold start, from tabs.js DOMContentLoaded.
function countSigninPromptSession() {
    if (signinPromptSessionCounted) return;
    signinPromptSessionCounted = true;
    signinPromptState.sessions++;
    saveSigninPromptState();
}

function signinPromptCooldownOver() {
    if (!signinPromptState.lastPromptSession) return true;
    return (signinPromptState.sessions - signinPromptState.lastPromptSession) >= SIGNIN_PROMPT_SESSION_COOLDOWN;
}

function maybeShowSigninPrompt(trigger) {
    if (window.egUser) return;
    // Before onAuthStateChanged fires, a signed-in returning user still reads
    // as "no user" — prompting here would ambush them (see handleJoinDeepLink).
    if (!window._authResolved) return;
    const onboarding = document.getElementById('onboarding-overlay');
    if (onboarding && !onboarding.classList.contains('hidden')) return;
    if (signinPromptShownThisSession) return;
    if (signinPromptState.promptCount >= SIGNIN_PROMPT_LIFETIME_CAP) return;
    if (!signinPromptCooldownOver()) return;
    if (trigger === 'session_start' && signinPromptState.sessions < SIGNIN_PROMPT_MIN_SESSION) return;

    const modal = document.getElementById('signin-prompt-modal');
    const body = document.getElementById('signin-prompt-body');
    if (!modal || !body) return;

    const coins = (typeof balance === 'number' ? balance : 0).toLocaleString();
    body.textContent = trigger === 'big_win'
        ? 'Nice hit! You now have ' + coins + ' coins — saved on this device only. ' +
          'Lose the phone, lose the chips. Back them up free with Google.'
        : 'You have ' + coins + ' coins on this device only. ' +
          'Sign in once and they follow you anywhere.';

    signinPromptTrigger = trigger;
    signinPromptShownThisSession = true;
    signinPromptState.promptCount++;
    signinPromptState.lastPromptSession = signinPromptState.sessions;
    saveSigninPromptState();

    modal.classList.remove('hidden');
    if (window.logVpEvent) logVpEvent('signin_prompt_shown', { trigger: trigger });
}

function acceptSigninPrompt() {
    if (window.logVpEvent) logVpEvent('signin_prompt_accepted', { trigger: signinPromptTrigger });
    signInWithGoogle();
}

function dismissSigninPrompt() {
    if (window.logVpEvent) logVpEvent('signin_prompt_dismissed', { trigger: signinPromptTrigger });
    closeSigninPromptModal();
}

// Also called from onAuthStateChanged on successful sign-in.
function closeSigninPromptModal() {
    const modal = document.getElementById('signin-prompt-modal');
    if (modal) modal.classList.add('hidden');
}

window.countSigninPromptSession = countSigninPromptSession;
window.maybeShowSigninPrompt = maybeShowSigninPrompt;
window.acceptSigninPrompt = acceptSigninPrompt;
window.dismissSigninPrompt = dismissSigninPrompt;
window.closeSigninPromptModal = closeSigninPromptModal;
