// Small UI utilities: toast messages + haptic feedback (Settings toggle).

function showToast(text) {
    let el = document.getElementById('vp-toast');
    if (!el) {
        el = document.createElement('div');
        el.id = 'vp-toast';
        el.className = 'toast';
        document.body.appendChild(el);
    }
    el.textContent = text;
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
    setTimeout(function() { el.classList.remove('show'); }, 2200);
}

let hapticsEnabled = true;
try {
    const storedHaptics = localStorage.getItem('vp_haptics_enabled');
    if (storedHaptics !== null) hapticsEnabled = storedHaptics === 'true';
} catch (e) {}

function toggleHaptics() {
    hapticsEnabled = !hapticsEnabled;
    try { localStorage.setItem('vp_haptics_enabled', hapticsEnabled); } catch (e) {}
    triggerHaptic('LIGHT');
}

function triggerHaptic(style) {
    if (!hapticsEnabled) return;
    try {
        const plugins = window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()
            ? window.Capacitor.Plugins : null;
        if (plugins && plugins.Haptics) {
            plugins.Haptics.impact({ style: style || 'MEDIUM' });
        } else if (navigator.vibrate) {
            navigator.vibrate(style === 'HEAVY' ? 60 : style === 'LIGHT' ? 8 : 15);
        }
    } catch (e) {}
}
