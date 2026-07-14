// ===================== Onboarding, themes & accessibility (Phase 10) =====================

    Object.assign(ENGAGE_I18N.en, {
        tutSkip: 'Skip tutorial',
        tutDeal: '👋 Welcome! Press DEAL to get your first five cards.',
        tutHold: 'These are your cards. Tap the ones you want to KEEP — they\'ll show a HELD badge.',
        tutDraw: 'Now press DRAW to replace the cards you didn\'t hold.',
        tutWin: '🎉 You won — your balance went up! Come back daily for bonuses. Good luck!',
        tutLose: 'No win this time — that\'s poker! Your balance is at the top. Good luck!',
        themesTitle: 'Table Themes',
        themeLockedLv: 'Lv {n}',
        a11yTitle: '♿ Accessibility',
        a11yContrast: 'High contrast mode',
        a11yMotion: 'Reduce motion',
        a11yColorblind: 'Color-blind friendly suits',
        offlineBadge: '📡 Offline Mode — progress syncs when you reconnect',
        backOnline: '✅ Back online — syncing your progress'
    });

    // --- table themes (Phase 10.3) — cosmetic rewards for leveling ---
    var TABLE_THEMES = [
        { id: 'classic',  name: 'Classic Casino', level: 1 },
        { id: 'midnight', name: 'Midnight Blue',  level: 10 },
        { id: 'goldluxe', name: 'Royal Gold',     level: 20 },
        { id: 'neon',     name: 'Neon Vegas',     level: 35 }
    ];
    var vpTheme = 'classic';
    try { vpTheme = localStorage.getItem('vp_theme') || 'classic'; } catch (e) {}

    function applyTheme(id) {
        if (!TABLE_THEMES.some(function(t) { return t.id === id; })) id = 'classic';
        vpTheme = id;
        TABLE_THEMES.forEach(function(t) {
            document.body.classList.toggle('theme-' + t.id, t.id === id && id !== 'classic');
        });
    }
    applyTheme(vpTheme);

    window.vpSelectTheme = function(id) {
        var theme = TABLE_THEMES.find(function(t) { return t.id === id; });
        if (!theme || (window.egUser && theme.level > egLevel)) return;
        applyTheme(id);
        try { localStorage.setItem('vp_theme', id); } catch (e) {}
        if (window.egUser) {
            db.collection('users').doc(egUser.uid).set({ tableTheme: id }, { merge: true })
                .catch(function(err) { console.error('theme save:', err); });
        }
        egApplyThemeUnlocks();
    };

    // Renders the theme picker in the profile panel (called on level change too)
    window.egApplyThemeUnlocks = function() {
        var wrap = document.getElementById('pf-themes');
        if (!wrap) return;
        var titleEl = document.getElementById('pf-themes-title');
        if (titleEl) titleEl.textContent = et('themesTitle');
        wrap.innerHTML = '';
        TABLE_THEMES.forEach(function(t) {
            var locked = window.egUser ? t.level > egLevel : t.level > 1;
            var chip = document.createElement('div');
            chip.className = 'style-chip theme-chip-' + t.id +
                (t.id === vpTheme ? ' selected' : '') + (locked ? ' locked' : '');
            chip.textContent = t.name + (locked ? ' 🔒 ' + et('themeLockedLv').replace('{n}', t.level) : '');
            if (!locked) chip.onclick = function() { vpSelectTheme(t.id); };
            wrap.appendChild(chip);
        });
    };

    // --- accessibility settings (Phase 10.4) ---
    var a11ySettings = { contrast: false, motion: false, colorblind: false };
    try { a11ySettings = Object.assign(a11ySettings, JSON.parse(localStorage.getItem('vp_a11y') || '{}')); } catch (e) {}

    function applyA11y() {
        document.body.classList.toggle('hc-mode', a11ySettings.contrast);
        document.body.classList.toggle('rm-mode', a11ySettings.motion);
        document.body.classList.toggle('cb-deck', a11ySettings.colorblind);
    }
    applyA11y();

    window.openA11yModal = function() {
        var modal = document.getElementById('a11y-modal');
        document.getElementById('a11y-title').textContent = et('a11yTitle');
        [['contrast', 'a11yContrast'], ['motion', 'a11yMotion'], ['colorblind', 'a11yColorblind']]
            .forEach(function(pair) {
                document.getElementById('a11y-' + pair[0] + '-label').textContent = et(pair[1]);
                document.getElementById('a11y-' + pair[0]).checked = a11ySettings[pair[0]];
            });
        modal.classList.remove('eg-hidden');
    };

    window.closeA11yModal = function() {
        document.getElementById('a11y-modal').classList.add('eg-hidden');
    };

    window.a11yChanged = function() {
        a11ySettings = {
            contrast: document.getElementById('a11y-contrast').checked,
            motion: document.getElementById('a11y-motion').checked,
            colorblind: document.getElementById('a11y-colorblind').checked
        };
        try { localStorage.setItem('vp_a11y', JSON.stringify(a11ySettings)); } catch (e) {}
        applyA11y();
    };

    // --- offline badge (Phase 10.5) ---
    function renderOfflineBadge() {
        var el = document.getElementById('offline-badge');
        if (!el) {
            el = document.createElement('div');
            el.id = 'offline-badge';
            el.className = 'offline-badge eg-hidden';
            document.body.appendChild(el);
        }
        if (navigator.onLine === false) {
            el.textContent = et('offlineBadge');
            el.classList.remove('eg-hidden');
        } else {
            el.classList.add('eg-hidden');
        }
    }
    window.addEventListener('offline', renderOfflineBadge);
    window.addEventListener('online', function() {
        renderOfflineBadge();
        egToast(et('backOnline'));
    });
    renderOfflineBadge();

    // --- new player tutorial (Phase 10.1) ---
    var tutState = null; // null = inactive, else current step name

    function tutDone(persist) {
        tutState = null;
        removeTutTip();
        try { localStorage.setItem('vp_tutorial_done', '1'); } catch (e) {}
        if (persist && window.egUser) {
            db.collection('users').doc(egUser.uid).set({ tutorialDone: true }, { merge: true })
                .catch(function() {});
        }
    }

    function removeTutTip() {
        var tip = document.getElementById('tut-tip');
        if (tip) tip.remove();
        document.querySelectorAll('.tut-highlight').forEach(function(el) {
            el.classList.remove('tut-highlight');
        });
    }

    function showTutTip(targetId, text) {
        removeTutTip();
        var target = document.getElementById(targetId);
        if (!target) return;
        target.classList.add('tut-highlight');
        var tip = document.createElement('div');
        tip.id = 'tut-tip';
        tip.className = 'tut-tip';
        tip.innerHTML = '<div class="tut-text">' + text + '</div>' +
            '<button class="tut-skip" onclick="vpSkipTutorial()">' + et('tutSkip') + '</button>';
        document.body.appendChild(tip);
        var rect = target.getBoundingClientRect();
        var top = rect.bottom + window.scrollY + 12;
        var left = Math.max(10, Math.min(window.innerWidth - 290,
            rect.left + window.scrollX + rect.width / 2 - 140));
        tip.style.top = top + 'px';
        tip.style.left = left + 'px';
        target.scrollIntoView({ block: 'center', behavior: a11ySettings.motion ? 'auto' : 'smooth' });
    }

    window.vpSkipTutorial = function() { tutDone(true); };

    window.initTutorial = function(user, userData) {
        var doneLocal = false;
        try { doneLocal = localStorage.getItem('vp_tutorial_done') === '1'; } catch (e) {}
        if (doneLocal || (userData && userData.tutorialDone) || (userData && (userData.totalHands || 0) > 0)) return;
        tutState = 'deal';
        showTutTip('deal-btn', et('tutDeal'));
    };

    window.teardownTutorial = function() {
        tutState = null;
        removeTutTip();
    };

    // Hooks called from game.js
    window.vpTutorialOnDeal = function() {
        if (tutState !== 'deal') return;
        tutState = 'hold';
        setTimeout(function() {
            if (tutState !== 'hold') return;
            showTutTip('hand', et('tutHold'));
            setTimeout(function() {
                if (tutState === 'hold') {
                    tutState = 'draw';
                    showTutTip('hold-btn', et('tutDraw'));
                }
            }, 6000);
        }, 1800);
    };

    window.vpTutorialOnDraw = function(win) {
        if (!tutState) return;
        showTutTip('balance', win > 0 ? et('tutWin') : et('tutLose'));
        var finalMsgMs = 6000;
        setTimeout(function() { tutDone(true); }, finalMsgMs);
    };
