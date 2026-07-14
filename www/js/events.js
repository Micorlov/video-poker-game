// ===================== VIP tiers + limited-time events + anti-churn (Phase 9.3 / 9.4 / 9.5) =====================

    Object.assign(ENGAGE_I18N.en, {
        vipLabel: 'VIP', vipBonusNote: '+{n}% on every win',
        eventEndsIn: 'ends in {t}',
        streakRiskNotify: '🔥 Your daily streak is about to break — claim today\'s bonus!',
        streakRiskToast: '⏰ Claim your daily bonus before midnight or the streak resets!'
    });

    // --- VIP tiers (Phase 9.3): passive payout bonus + status ring ---
    var VIP_TIERS = [
        { id: 'bronze',   name: 'Bronze',   min: 1,  bonus: 0,    color: '#cd7f32' },
        { id: 'silver',   name: 'Silver',   min: 10, bonus: 0.05, color: '#c0c0c0' },
        { id: 'gold',     name: 'Gold',     min: 20, bonus: 0.10, color: '#ffd700' },
        { id: 'platinum', name: 'Platinum', min: 35, bonus: 0.15, color: '#a0e8e8' },
        { id: 'diamond',  name: 'Diamond',  min: 50, bonus: 0.20, color: '#b9f2ff' }
    ];

    window.vpVipTier = function(level) {
        var tier = VIP_TIERS[0];
        VIP_TIERS.forEach(function(t) { if ((level || 1) >= t.min) tier = t; });
        return tier;
    };

    window.vpVipClass = function(level) {
        return 'vip-' + vpVipTier(level).id;
    };

    // Applied in draw() to every win
    window.vpVipMultiplier = function() {
        if (!window.egUser) return 1;
        return 1 + vpVipTier(egLevel).bonus;
    };

    window.egRenderVipBadge = function() {
        var bar = document.getElementById('user-bar');
        if (!bar || !window.egUser) return;
        var tier = vpVipTier(egLevel);
        var badge = document.getElementById('ub-vip');
        if (!badge) {
            badge = document.createElement('span');
            badge.id = 'ub-vip';
            badge.className = 'vip-badge';
            badge.onclick = function() { egOpenProfile(); };
            var lvlEl = document.getElementById('ub-level');
            if (lvlEl && lvlEl.parentNode === bar) bar.insertBefore(badge, lvlEl.nextSibling);
            else bar.appendChild(badge);
        }
        badge.textContent = tier.name;
        badge.style.borderColor = tier.color;
        badge.style.color = tier.color;
        badge.title = et('vipBonusNote').replace('{n}', Math.round(tier.bonus * 100));
    };

    // --- limited-time events (Phase 9.4) ---
    // events docs: { name, emoji, type: 'xp'|'payout'|'streak', multiplier,
    //               handType (payout-only, optional), startsAt, endsAt }
    var activeEvent = null;
    var eventTimers = [];

    window.initEvents = function() {
        loadActiveEvent();
        eventTimers.push(setInterval(loadActiveEvent, 5 * 60 * 1000));
        eventTimers.push(setInterval(renderEventBanner, 1000));
    };

    window.teardownEvents = function() {
        eventTimers.forEach(clearInterval);
        eventTimers = [];
        activeEvent = null;
        renderEventBanner();
    };

    function loadActiveEvent() {
        db.collection('events')
            .where('endsAt', '>', firebase.firestore.Timestamp.now())
            .orderBy('endsAt', 'asc').limit(5)
            .get().then(function(snap) {
                var now = Date.now();
                activeEvent = null;
                snap.forEach(function(doc) {
                    var d = doc.data();
                    var starts = d.startsAt && d.startsAt.toDate ? d.startsAt.toDate().getTime() : 0;
                    if (!activeEvent && starts <= now) activeEvent = d;
                });
                renderEventBanner();
            }).catch(function(err) { console.error('events load:', err); });
    }

    window.vpEventXpMult = function() {
        return activeEvent && activeEvent.type === 'xp' ? (activeEvent.multiplier || 1) : 1;
    };

    window.vpEventWinMultiplier = function(handType) {
        if (!activeEvent || activeEvent.type !== 'payout') return 1;
        if (activeEvent.handType && activeEvent.handType !== handType) return 1;
        return activeEvent.multiplier || 1;
    };

    window.vpEventStreakMult = function() {
        return activeEvent && activeEvent.type === 'streak' ? (activeEvent.multiplier || 1) : 1;
    };

    function formatCountdown(ms) {
        var s = Math.max(0, Math.floor(ms / 1000));
        var h = Math.floor(s / 3600);
        var m = Math.floor((s % 3600) / 60);
        if (h >= 1) return h + 'h ' + String(m).padStart(2, '0') + 'm';
        return m + 'm ' + String(s % 60).padStart(2, '0') + 's';
    }

    function renderEventBanner() {
        var el = document.getElementById('event-banner');
        if (!el) return;
        if (!activeEvent || !window.egUser) {
            el.classList.add('eg-hidden');
            return;
        }
        var ends = activeEvent.endsAt && activeEvent.endsAt.toDate ? activeEvent.endsAt.toDate().getTime() : 0;
        if (ends <= Date.now()) {
            activeEvent = null;
            el.classList.add('eg-hidden');
            return;
        }
        el.textContent = (activeEvent.emoji || '🎉') + ' ' + (activeEvent.name || 'Special Event') +
            ' — ' + et('eventEndsIn').replace('{t}', formatCountdown(ends - Date.now()));
        el.classList.remove('eg-hidden');
    }

    // --- anti-churn (Phase 9.5): streak-risk nudge while the tab is open ---
    // (Real closed-app push needs the FCM VAPID key + a scheduled sender — see js/pwa.js)
    var streakNudgeTimer = null;

    window.initAntiChurn = function(user) {
        if (streakNudgeTimer) clearTimeout(streakNudgeTimer);
        var evening = new Date();
        evening.setHours(20, 0, 0, 0);
        var delay = evening.getTime() - Date.now();
        if (delay <= 0) return; // already evening — daily modal flow handles it
        streakNudgeTimer = setTimeout(function() {
            db.collection('daily_rewards').doc(user.uid).get().then(function(doc) {
                if (!doc.exists) return;
                var d = doc.data();
                if (d.lastClaimDate === getDayKey() || (d.streak || 0) < 2) return;
                egToast(et('streakRiskToast'));
                if (typeof Notification !== 'undefined' && Notification.permission === 'granted' &&
                    navigator.serviceWorker && navigator.serviceWorker.ready) {
                    navigator.serviceWorker.ready.then(function(reg) {
                        reg.showNotification('Video Poker', {
                            body: et('streakRiskNotify'),
                            icon: 'icon.svg',
                            tag: 'streak-risk'
                        });
                    }).catch(function() {});
                }
            }).catch(function() {});
        }, delay);
    };

    window.teardownAntiChurn = function() {
        if (streakNudgeTimer) { clearTimeout(streakNudgeTimer); streakNudgeTimer = null; }
    };
