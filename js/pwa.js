// ===================== Phase 5.3 / 6.2: PWA, install prompt, push notifications =====================

    // Paste the Web Push certificate key pair (VAPID public key) from
    // Firebase Console → Project Settings → Cloud Messaging to enable FCM push.
    var FCM_VAPID_KEY = '';

    var NOTIFY_PROMPT_AFTER_HANDS = 5;
    var INSTALL_PROMPT_AFTER_VISITS = 3;

    var pwaDeferredInstall = null;
    var pwaSessionHands = 0;

    function pwaCanUseSw() {
        return 'serviceWorker' in navigator &&
            (location.protocol === 'https:' || location.hostname === 'localhost');
    }

    function pwaRegisterSw() {
        if (!pwaCanUseSw()) return;
        navigator.serviceWorker.register('sw.js').catch(function(err) {
            console.error('SW registration failed:', err);
        });
    }

    function pwaTrackVisit() {
        try {
            var today = getDayKey();
            var raw = localStorage.getItem('vp_visits');
            var v = raw ? JSON.parse(raw) : { count: 0, last: '' };
            if (v.last !== today) {
                v.count++;
                v.last = today;
                localStorage.setItem('vp_visits', JSON.stringify(v));
            }
            return v.count;
        } catch (e) { return 0; }
    }

    // --- generic dismissible prompt bar ---
    function pwaShowBar(id, text, yesLabel, onYes, noLabel) {
        if (document.getElementById(id)) return;
        var bar = document.createElement('div');
        bar.id = id;
        bar.className = 'pwa-bar';
        var yes = document.createElement('button');
        yes.className = 'pwa-bar-yes';
        yes.textContent = yesLabel;
        yes.onclick = function() { bar.remove(); onYes(); };
        var no = document.createElement('button');
        no.className = 'pwa-bar-no';
        no.textContent = noLabel || '✕';
        no.onclick = function() { bar.remove(); };
        var span = document.createElement('span');
        span.textContent = text;
        bar.appendChild(span);
        bar.appendChild(yes);
        bar.appendChild(no);
        document.body.appendChild(bar);
    }

    // --- install prompt (after 3rd distinct visit day) ---
    window.addEventListener('beforeinstallprompt', function(e) {
        e.preventDefault();
        pwaDeferredInstall = e;
        maybeShowInstallBar();
    });

    function maybeShowInstallBar() {
        if (!pwaDeferredInstall) return;
        var dismissed = false;
        try { dismissed = localStorage.getItem('vp_install_dismissed') === '1'; } catch (e) {}
        if (dismissed) return;
        var visits = 0;
        try { visits = (JSON.parse(localStorage.getItem('vp_visits')) || {}).count || 0; } catch (e) {}
        if (visits < INSTALL_PROMPT_AFTER_VISITS) return;
        pwaShowBar('pwa-install-bar', et('installPromptText'), et('installYes'), function() {
            pwaDeferredInstall.prompt();
            pwaDeferredInstall = null;
        });
        try { localStorage.setItem('vp_install_dismissed', '1'); } catch (e) {}
    }

    // --- notification permission (after first real play session, not on first visit) ---
    function pwaMaybeAskNotifications() {
        if (typeof Notification === 'undefined' || Notification.permission !== 'default') return;
        var asked = false;
        try { asked = localStorage.getItem('vp_notify_asked') === '1'; } catch (e) {}
        if (asked) return;
        try { localStorage.setItem('vp_notify_asked', '1'); } catch (e) {}
        pwaShowBar('pwa-notify-bar', et('notifyPromptText'), et('notifyYes'), function() {
            Notification.requestPermission().then(function(perm) {
                if (perm === 'granted') pwaSetupFcm();
            });
        }, et('notifyNo'));
    }

    // --- FCM token registration (requires VAPID key) ---
    function pwaSetupFcm() {
        if (!FCM_VAPID_KEY || !pwaCanUseSw() || !auth.currentUser) return;
        var s = document.createElement('script');
        s.src = 'https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js';
        s.onload = function() {
            navigator.serviceWorker.ready.then(function(reg) {
                return firebase.messaging().getToken({
                    vapidKey: FCM_VAPID_KEY,
                    serviceWorkerRegistration: reg
                });
            }).then(function(token) {
                if (!token || !auth.currentUser) return;
                return db.collection('users').doc(auth.currentUser.uid).set({
                    fcmToken: token,
                    fcmUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            }).catch(function(err) { console.error('FCM setup:', err); });
        };
        document.head.appendChild(s);
    }

    // Hand-played hook (called from egOnHandPlayed)
    window.pwaOnHandPlayed = function() {
        pwaSessionHands++;
        if (pwaSessionHands === NOTIFY_PROMPT_AFTER_HANDS) pwaMaybeAskNotifications();
    };

    window.initPwa = function() {
        pwaTrackVisit();
        maybeShowInstallBar();
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            pwaSetupFcm();
        }
    };

    pwaRegisterSw();
