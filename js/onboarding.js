// First-launch onboarding: welcome → hands → gameplay → leaderboard → push → signin.
// Shown once per device via vp_onboarding_seen; js/tabs.js calls initOnboarding()
// instead of showScreen('play') directly on cold start.
//
// Depends on: signInWithGoogle() (js/firebase.js),
// registerForPushNotifications()/setNotificationPref() (js/push.js).

const ONBOARDING_STEPS = ['welcome', 'hands', 'gameplay', 'leaderboard', 'push', 'signin'];
let onboardingIndex = 0;

function onboardingSeen() {
    try { return localStorage.getItem('vp_onboarding_seen') === '1'; } catch (e) { return true; }
}

function markOnboardingSeen() {
    try { localStorage.setItem('vp_onboarding_seen', '1'); } catch (e) {}
}

function markPushPermissionAsked() {
    try { localStorage.setItem('vp_push_permission_asked', '1'); } catch (e) {}
}

function onboardingIsNative() {
    return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
}

function initOnboarding() {
    if (onboardingSeen()) {
        showScreen('play');
        return;
    }
    const overlay = document.getElementById('onboarding-overlay');
    if (!overlay) {
        showScreen('play');
        return;
    }
    // Web must sign in with Google to finish onboarding — no guest skip.
    // Native keeps the guest option.
    if (!onboardingIsNative()) {
        const guestLink = document.querySelector('.ob-guest-link');
        if (guestLink) guestLink.classList.add('hidden');
    }
    showOnboardingStep(0);
    overlay.classList.remove('hidden');
    attachOnboardingSwipe(overlay);
}

// ── Swipe navigation ──
const ONBOARDING_SWIPE_THRESHOLD = 50;
let onboardingSwipeStartX = 0;
let onboardingSwipeStartY = 0;
let onboardingSwipeTracking = false;
let onboardingSwipeAttached = false;

function attachOnboardingSwipe(overlay) {
    if (onboardingSwipeAttached) return;
    onboardingSwipeAttached = true;
    overlay.addEventListener('touchstart', onboardingTouchStart, { passive: true });
    overlay.addEventListener('touchend', onboardingTouchEnd, { passive: true });
}

function onboardingTouchStart(e) {
    if (!e.touches || e.touches.length !== 1) return;
    onboardingSwipeStartX = e.touches[0].clientX;
    onboardingSwipeStartY = e.touches[0].clientY;
    onboardingSwipeTracking = true;
}

function onboardingTouchEnd(e) {
    if (!onboardingSwipeTracking) return;
    onboardingSwipeTracking = false;
    const touch = e.changedTouches && e.changedTouches[0];
    if (!touch) return;
    const dx = touch.clientX - onboardingSwipeStartX;
    const dy = touch.clientY - onboardingSwipeStartY;
    if (Math.abs(dx) < ONBOARDING_SWIPE_THRESHOLD || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0) {
        if (onboardingIndex < ONBOARDING_STEPS.length - 1) advanceOnboarding();
    } else if (onboardingIndex > 0) {
        goBackOnboarding();
    }
}

function renderOnboardingDots() {
    const dots = document.getElementById('onboarding-dots');
    if (!dots) return;
    dots.innerHTML = '';
    // The push step never shows on web, so its dot must not render there —
    // otherwise the bar shows six dots and skips one on the way through.
    const visibleSteps = ONBOARDING_STEPS.filter(function(step) {
        return step !== 'push' || onboardingIsNative();
    });
    const activeStep = ONBOARDING_STEPS[onboardingIndex];
    visibleSteps.forEach(function(step) {
        const dot = document.createElement('span');
        dot.className = 'onboarding-dot' + (step === activeStep ? ' active' : '');
        dots.appendChild(dot);
    });
}

// The first screen names the reward rather than the direction — it is the
// only place the chip grant is promised, so it earns the full-width label.
const ONBOARDING_NEXT_LABEL_KEYS = {
    welcome: 'ob.startWithChips'
};

function updateOnboardingNav() {
    const backBtn = document.getElementById('onboarding-back');
    const nextBtn = document.getElementById('onboarding-next');
    if (!backBtn || !nextBtn) return;

    // Back: hidden on first screen
    backBtn.classList.toggle('ob-hidden', onboardingIndex === 0);

    // Next: hidden on last screen (sign-in CTAs take over)
    nextBtn.classList.toggle('ob-hidden', onboardingIndex === ONBOARDING_STEPS.length - 1);

    const labelKey = ONBOARDING_NEXT_LABEL_KEYS[ONBOARDING_STEPS[onboardingIndex]];
    nextBtn.textContent = labelKey
        ? t(labelKey, { chips: formatNumber(STARTING_BALANCE) })
        : t('ob.next');
}

function showOnboardingStep(index) {
    ONBOARDING_STEPS.forEach(function(step, i) {
        const el = document.getElementById('onboarding-step-' + step);
        if (el) el.classList.toggle('active', i === index);
    });
    onboardingIndex = index;
    document.body.classList.toggle('ob-step-welcome', ONBOARDING_STEPS[index] === 'welcome');
    if (window.logVpEvent) logVpEvent('onboarding_step', { step: ONBOARDING_STEPS[index] });
    if (ONBOARDING_STEPS[index] === 'push') markPushPermissionAsked();
    renderOnboardingDots();
    updateOnboardingNav();
}

function advanceOnboarding() {
    var next = onboardingIndex + 1;
    // Skip push step on web — native platforms only
    if (ONBOARDING_STEPS[next] === 'push' && !onboardingIsNative()) {
        next++;
    }
    if (next >= ONBOARDING_STEPS.length) {
        finishOnboarding();
        return;
    }
    showOnboardingStep(next);
}

function goBackOnboarding() {
    var prev = onboardingIndex - 1;
    // Skip push step on web when going back
    if (ONBOARDING_STEPS[prev] === 'push' && !onboardingIsNative()) {
        prev--;
    }
    if (prev < 0) return;
    showOnboardingStep(prev);
}

function finishOnboarding() {
    markOnboardingSeen();
    document.body.classList.remove('ob-step-welcome');
    const overlay = document.getElementById('onboarding-overlay');
    if (overlay) overlay.classList.add('hidden');
    showScreen('play');
}

function onboardingSignIn(provider) {
    const fn = provider === 'google' ? window.signInWithGoogle : null;
    if (typeof fn === 'function') fn();
}

// Called from js/firebase.js when sign-in succeeds during onboarding
function onboardingSignInSucceeded() {
    if (ONBOARDING_STEPS[onboardingIndex] !== 'signin') return;
    const overlay = document.getElementById('onboarding-overlay');
    if (!overlay || overlay.classList.contains('hidden')) return;
    finishOnboarding();
}

function onboardingEnableNotifications() {
    if (window.registerForPushNotifications) registerForPushNotifications();
    // No egUser guard: sign-in is the *next* step, so there is never a user
    // here. setNotificationPref() buffers until there is one and js/firebase.js
    // flushes on sign-in — gating on egUser silently threw the opt-in away.
    if (window.setNotificationPref) {
        ['social', 'leaderboard', 'dailyReminder', 'bestHand'].forEach(function(cat) {
            setNotificationPref(cat, true);
        });
    }
    advanceOnboarding();
}

// Called from js/firebase.js when user signs out so they restart the full onboarding.
function showOnboardingForReauth() {
    const overlay = document.getElementById('onboarding-overlay');
    if (!overlay) return;
    try { localStorage.removeItem('vp_onboarding_seen'); } catch (e) {}
    showOnboardingStep(0);
    overlay.classList.remove('hidden');
}

if (window.vpOnLanguageChange) vpOnLanguageChange(updateOnboardingNav);

window.initOnboarding = initOnboarding;
window.advanceOnboarding = advanceOnboarding;
window.goBackOnboarding = goBackOnboarding;
window.onboardingSignIn = onboardingSignIn;
window.onboardingSignInSucceeded = onboardingSignInSucceeded;
window.onboardingEnableNotifications = onboardingEnableNotifications;
window.showOnboardingForReauth = showOnboardingForReauth;
