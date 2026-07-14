// ===================== Social proof ticker + Hall of Fame (Phase 8.4 / 8.5) =====================

    Object.assign(ENGAGE_I18N.en, {
        tickerOnline: '{n} players online',
        tickerHands: '{n} hands played today',
        tickerRoyals: '{n} royal flushes today',
        hofTitle: '🏛️ Hall of Fame',
        hofEmpty: 'Champions will be immortalized here.',
        hofDaily: 'Daily Champion', hofWeekly: 'Weekly Tournament'
    });

    var TICKER_REFRESH_MS = 60 * 1000;
    var PRESENCE_HEARTBEAT_MS = 4 * 60 * 1000;
    var STATS_FLUSH_EVERY = 10; // hands buffered per aggregate write

    var communityTimers = [];
    var pendingHands = 0;
    var pendingRoyals = 0;

    window.initCommunity = function(user) {
        refreshTicker();
        renderHallOfFame();
        ensureHallOfFame();
        communityTimers.push(setInterval(refreshTicker, TICKER_REFRESH_MS));
        communityTimers.push(setInterval(function() {
            db.collection('users').doc(user.uid).set({
                lastActiveDate: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true }).catch(function() {});
        }, PRESENCE_HEARTBEAT_MS));
        document.addEventListener('visibilitychange', flushGlobalStats);
    };

    window.teardownCommunity = function() {
        communityTimers.forEach(clearInterval);
        communityTimers = [];
        flushGlobalStats();
        var el = document.getElementById('social-ticker');
        if (el) el.classList.add('eg-hidden');
    };

    // --- aggregate counters (batched, not per-hand) ---
    window.vpSocialOnHand = function(bestType) {
        pendingHands++;
        if (bestType === 'Royal Flush' || bestType === 'Wild Royal Flush') pendingRoyals++;
        if (pendingHands >= STATS_FLUSH_EVERY) flushGlobalStats();
    };

    function flushGlobalStats() {
        if (pendingHands === 0 && pendingRoyals === 0) return;
        var hands = pendingHands, royals = pendingRoyals;
        pendingHands = 0; pendingRoyals = 0;
        db.collection('global_stats').doc(getDayKey()).set({
            dayKey: getDayKey(),
            hands: firebase.firestore.FieldValue.increment(hands),
            royals: firebase.firestore.FieldValue.increment(royals),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true }).catch(function() {
            pendingHands += hands; pendingRoyals += royals; // retry next flush
        });
    }

    function refreshTicker() {
        var el = document.getElementById('social-ticker');
        if (!el || !auth.currentUser) return;
        var parts = { online: null, hands: 0, royals: 0 };
        var render = function() {
            var bits = [];
            if (parts.online !== null && parts.online > 0) {
                bits.push('🟢 ' + et('tickerOnline').replace('{n}', parts.online));
            }
            bits.push('🃏 ' + et('tickerHands').replace('{n}', parts.hands));
            if (parts.royals > 0) {
                bits.push('👑 ' + et('tickerRoyals').replace('{n}', parts.royals));
            }
            el.textContent = bits.join(' · ');
            el.classList.remove('eg-hidden');
        };
        db.collection('global_stats').doc(getDayKey()).get().then(function(doc) {
            if (doc.exists) {
                parts.hands = doc.data().hands || 0;
                parts.royals = doc.data().royals || 0;
            }
            render();
        }).catch(function() {});
        try {
            var cutoff = new Date(Date.now() - 5 * 60 * 1000);
            var q = db.collection('users').where('lastActiveDate', '>', cutoff);
            if (typeof q.count === 'function') {
                q.count().get().then(function(snap) {
                    parts.online = snap.data().count;
                    render();
                }).catch(function() {});
            }
        } catch (e) { /* count() unsupported — ticker shows hands only */ }
    }

    // --- Hall of Fame ---
    // First client to load after a period rolls over writes the champion record.
    // Doc ids are deterministic (daily_<day> / week_<week>) so writes are idempotent.
    function ensureHallOfFame() {
        var yesterday = getDayKey(new Date(Date.now() - 86400e3));
        writeChampionIfMissing('daily_' + yesterday, function() {
            return db.collection('daily_scores')
                .where('dayKey', '==', yesterday)
                .orderBy('score', 'desc').limit(1).get();
        }, 'daily');

        var prevWeek = getWeekKey(new Date(Date.now() - 7 * 86400e3));
        writeChampionIfMissing('week_' + prevWeek, function() {
            return db.collection('weekly_tournaments')
                .where('tKey', '==', prevWeek)
                .orderBy('score', 'desc').limit(1).get();
        }, 'weekly');
    }

    function writeChampionIfMissing(docId, queryFn, period) {
        var ref = db.collection('hall_of_fame').doc(docId);
        ref.get().then(function(doc) {
            if (doc.exists) return;
            return queryFn().then(function(snap) {
                if (snap.empty) return;
                var d = snap.docs[0].data();
                if ((d.score || 0) <= 0) return; // no champion for a losing period
                return ref.set({
                    period: period,
                    periodKey: docId,
                    uid: d.uid,
                    displayName: d.displayName || '',
                    photoURL: d.photoURL || '',
                    avatar: d.avatar || '',
                    score: d.score || 0,
                    level: d.level || 1,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                }).then(renderHallOfFame);
            });
        }).catch(function(err) { console.error('hall of fame write:', err); });
    }

    function renderHallOfFame() {
        var listEl = document.getElementById('hof-list');
        var panel = document.getElementById('hof-panel');
        if (!listEl || !panel) return;
        document.getElementById('hof-title').textContent = et('hofTitle');
        db.collection('hall_of_fame').orderBy('createdAt', 'desc').limit(8).get().then(function(snap) {
            listEl.innerHTML = '';
            if (snap.empty) {
                listEl.innerHTML = '<div class="hof-empty">' + et('hofEmpty') + '</div>';
                return;
            }
            snap.forEach(function(doc) {
                var d = doc.data();
                var dateLabel = (d.periodKey || '').replace('daily_', '').replace('week_', '');
                var row = document.createElement('div');
                row.className = 'hof-row';
                row.innerHTML =
                    '<span class="hof-medal">' + (d.period === 'weekly' ? '🏆' : '🥇') + '</span>' +
                    '<span class="friend-avatar">' + (window.lbAvatarHtml ? lbAvatarHtml(d) : '') + '</span>' +
                    '<span class="hof-name">' + escapeHtml(d.displayName || '?') + '</span>' +
                    '<span class="hof-meta">' + escapeHtml(dateLabel) +
                        ' · ' + et(d.period === 'weekly' ? 'hofWeekly' : 'hofDaily') + '</span>' +
                    '<span class="hof-score">+' + (d.score || 0) + '</span>';
                listEl.appendChild(row);
            });
        }).catch(function(err) { console.error('hall of fame load:', err); });
    }
