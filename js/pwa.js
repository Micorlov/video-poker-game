// PWA: service worker registration + install prompt.

const INSTALL_PROMPT_AFTER_VISITS = 3;

let pwaDeferredInstall = null;

function pwaCanUseSw() {
    return 'serviceWorker' in navigator &&
        (location.protocol === 'https:' || location.hostname === 'localhost');
}

function pwaRegisterSw() {
    if (!pwaCanUseSw()) return;
    navigator.serviceWorker.register('sw.js').catch(function() { /* offline / unsupported */ });
}

function pwaTrackVisit() {
    try {
        const today = new Date().toISOString().slice(0, 10);
        const raw = localStorage.getItem('vp_visits');
        const v = raw ? JSON.parse(raw) : { count: 0, last: '' };
        if (v.last !== today) {
            v.count++;
            v.last = today;
            localStorage.setItem('vp_visits', JSON.stringify(v));
        }
        return v.count;
    } catch (e) { return 0; }
}

function pwaShowBar(id, text, yesLabel, onYes) {
    if (document.getElementById(id)) return;
    const bar = document.createElement('div');
    bar.id = id;
    bar.className = 'pwa-bar';
    const yes = document.createElement('button');
    yes.className = 'pwa-bar-yes';
    yes.textContent = yesLabel;
    yes.onclick = function() { bar.remove(); onYes(); };
    const no = document.createElement('button');
    no.className = 'pwa-bar-no';
    no.textContent = '✕';
    no.onclick = function() { bar.remove(); };
    const span = document.createElement('span');
    span.textContent = text;
    bar.appendChild(span);
    bar.appendChild(yes);
    bar.appendChild(no);
    document.body.appendChild(bar);
}

window.addEventListener('beforeinstallprompt', function(e) {
    e.preventDefault();
    pwaDeferredInstall = e;
    maybeShowInstallBar();
});

function maybeShowInstallBar() {
    if (!pwaDeferredInstall) return;
    let dismissed = false;
    try { dismissed = localStorage.getItem('vp_install_dismissed') === '1'; } catch (e) {}
    if (dismissed) return;
    let visits = 0;
    try { visits = (JSON.parse(localStorage.getItem('vp_visits')) || {}).count || 0; } catch (e) {}
    if (visits < INSTALL_PROMPT_AFTER_VISITS) return;
    pwaShowBar('pwa-install-bar', t('pwa.installBar'), t('pwa.install'), function() {
        pwaDeferredInstall.prompt();
        pwaDeferredInstall = null;
    });
    try { localStorage.setItem('vp_install_dismissed', '1'); } catch (e) {}
}

function initPwa() {
    pwaTrackVisit();
    maybeShowInstallBar();
}

pwaRegisterSw();
