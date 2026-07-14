// ===================== Phase 5: Weekly Tournament + Season Pass =====================

    var TOURNAMENT_MIN_LEVEL = 5;
    var TOURNAMENT_PRIZES = [1000, 500, 250];
    var TOURNAMENT_DAY = 6; // Saturday

    var SEASON_TIERS = [
        { xp: 500,   credits: 50 },
        { xp: 1000,  credits: 75 },
        { xp: 1500,  credits: 100 },
        { xp: 2500,  credits: 150 },
        { xp: 3500,  credits: 200 },
        { xp: 5000,  credits: 250 },
        { xp: 6500,  credits: 300 },
        { xp: 8000,  credits: 400 },
        { xp: 9000,  credits: 450 },
        { xp: 10000, credits: 500 } // + season badge
    ];

    var egSeason = null;   // {monthKey, xp, claimedTiers: {tierIdx: true}}
    var egTournamentCheckedPrizes = false;

    ACHIEVEMENTS.push({ id: 'season10', icon: '🎖️' });

    Object.assign(ENGAGE_I18N.en, {
        tourneyBanner: '🏆 Weekly Tournament LIVE — all payouts ×2! Top 3 win bonus credits!',
        tourneyLocked: '🏆 Weekly Tournament today — reach Level {n} to enter!',
        tourneyTitle: '🏆 Weekly Tournament', tourneyEndsIn: 'Ends in',
        tourneyPrizeToast: '🏆 Tournament prize: +{n} credits! You finished #{r}!',
        tourneyScoreNote: 'Score = credits won today · Top 3: 1000 / 500 / 250',
        seasonTitle: '🎫 Season Pass', seasonEnds: 'Season ends in {n} days',
        seasonTierToast: '🎫 Season tier {t} reached! +{n} credits',
        seasonMax: 'All tiers complete — legend!',
        seasonNext: '{cur}/{next} XP to tier {t}',
        ach_season10: 'Season Legend',
        notifyPromptText: '🔔 Get your daily bonus reminders?', notifyYes: 'Enable', notifyNo: 'Not now',
        installPromptText: '📲 Add Video Poker to your home screen!', installYes: 'Install'
    });
    Object.assign(ENGAGE_I18N.es, {
        tourneyBanner: '🏆 Torneo Semanal EN VIVO — ¡pagos ×2! ¡Top 3 ganan créditos extra!',
        tourneyLocked: '🏆 Torneo Semanal hoy — ¡alcanza el Nivel {n} para entrar!',
        tourneyTitle: '🏆 Torneo Semanal', tourneyEndsIn: 'Termina en',
        tourneyPrizeToast: '🏆 Premio del torneo: +{n} créditos! ¡Quedaste #{r}!',
        tourneyScoreNote: 'Puntos = créditos ganados hoy · Top 3: 1000 / 500 / 250',
        seasonTitle: '🎫 Pase de Temporada', seasonEnds: 'La temporada termina en {n} días',
        seasonTierToast: '🎫 ¡Nivel {t} de temporada! +{n} créditos',
        seasonMax: '¡Todos los niveles completos — leyenda!',
        seasonNext: '{cur}/{next} XP para el nivel {t}',
        ach_season10: 'Leyenda de Temporada',
        notifyPromptText: '🔔 ¿Recibir recordatorios del bono diario?', notifyYes: 'Activar', notifyNo: 'Ahora no',
        installPromptText: '📲 ¡Añade Video Póker a tu pantalla de inicio!', installYes: 'Instalar'
    });
    Object.assign(ENGAGE_I18N.fr, {
        tourneyBanner: '🏆 Tournoi Hebdo EN DIRECT — gains ×2 ! Top 3 gagnent des crédits bonus !',
        tourneyLocked: '🏆 Tournoi Hebdo aujourd\'hui — atteins le Niveau {n} pour participer !',
        tourneyTitle: '🏆 Tournoi Hebdo', tourneyEndsIn: 'Fin dans',
        tourneyPrizeToast: '🏆 Prix du tournoi : +{n} crédits ! Tu finis #{r} !',
        tourneyScoreNote: 'Score = crédits gagnés aujourd\'hui · Top 3 : 1000 / 500 / 250',
        seasonTitle: '🎫 Passe de Saison', seasonEnds: 'La saison se termine dans {n} jours',
        seasonTierToast: '🎫 Palier {t} atteint ! +{n} crédits',
        seasonMax: 'Tous les paliers complétés — légende !',
        seasonNext: '{cur}/{next} XP pour le palier {t}',
        ach_season10: 'Légende de la Saison',
        notifyPromptText: '🔔 Recevoir les rappels du bonus quotidien ?', notifyYes: 'Activer', notifyNo: 'Plus tard',
        installPromptText: '📲 Ajoute Video Poker à ton écran d\'accueil !', installYes: 'Installer'
    });
    Object.assign(ENGAGE_I18N.de, {
        tourneyBanner: '🏆 Wochenturnier LIVE — alle Gewinne ×2! Top 3 gewinnen Bonus-Credits!',
        tourneyLocked: '🏆 Wochenturnier heute — erreiche Level {n}, um teilzunehmen!',
        tourneyTitle: '🏆 Wochenturnier', tourneyEndsIn: 'Endet in',
        tourneyPrizeToast: '🏆 Turnierpreis: +{n} Credits! Du wurdest #{r}!',
        tourneyScoreNote: 'Punkte = heute gewonnene Credits · Top 3: 1000 / 500 / 250',
        seasonTitle: '🎫 Season Pass', seasonEnds: 'Saison endet in {n} Tagen',
        seasonTierToast: '🎫 Saison-Stufe {t} erreicht! +{n} Credits',
        seasonMax: 'Alle Stufen geschafft — Legende!',
        seasonNext: '{cur}/{next} XP bis Stufe {t}',
        ach_season10: 'Saison-Legende',
        notifyPromptText: '🔔 Tägliche Bonus-Erinnerungen erhalten?', notifyYes: 'Aktivieren', notifyNo: 'Nicht jetzt',
        installPromptText: '📲 Füge Video Poker deinem Startbildschirm hinzu!', installYes: 'Installieren'
    });
    Object.assign(ENGAGE_I18N.he, {
        tourneyBanner: '🏆 טורניר שבועי חי — כל הזכיות ×2! שלושת הראשונים זוכים בקרדיטים!',
        tourneyLocked: '🏆 טורניר שבועי היום — הגע לרמה {n} כדי להשתתף!',
        tourneyTitle: '🏆 טורניר שבועי', tourneyEndsIn: 'מסתיים בעוד',
        tourneyPrizeToast: '🏆 פרס טורניר: +{n} קרדיטים! סיימת במקום {r}!',
        tourneyScoreNote: 'ניקוד = קרדיטים שנצברו היום · טופ 3: 1000 / 500 / 250',
        seasonTitle: '🎫 כרטיס עונה', seasonEnds: 'העונה מסתיימת בעוד {n} ימים',
        seasonTierToast: '🎫 הגעת לשלב {t} בעונה! +{n} קרדיטים',
        seasonMax: 'כל השלבים הושלמו — אגדה!',
        seasonNext: '{cur}/{next} XP לשלב {t}',
        ach_season10: 'אגדת העונה',
        notifyPromptText: '🔔 לקבל תזכורות לבונוס היומי?', notifyYes: 'הפעל', notifyNo: 'לא עכשיו',
        installPromptText: '📲 הוסף את וידאו פוקר למסך הבית!', installYes: 'התקן'
    });
    Object.assign(ENGAGE_I18N.ar, {
        tourneyBanner: '🏆 البطولة الأسبوعية مباشرة — كل الأرباح ×2! أفضل 3 يفوزون برصيد إضافي!',
        tourneyLocked: '🏆 البطولة الأسبوعية اليوم — صِل إلى المستوى {n} للمشاركة!',
        tourneyTitle: '🏆 البطولة الأسبوعية', tourneyEndsIn: 'تنتهي خلال',
        tourneyPrizeToast: '🏆 جائزة البطولة: +{n} رصيد! أنهيت في المركز {r}!',
        tourneyScoreNote: 'النقاط = الرصيد المكتسب اليوم · أفضل 3: 1000 / 500 / 250',
        seasonTitle: '🎫 بطاقة الموسم', seasonEnds: 'ينتهي الموسم خلال {n} أيام',
        seasonTierToast: '🎫 وصلت إلى المرحلة {t}! +{n} رصيد',
        seasonMax: 'اكتملت كل المراحل — أسطورة!',
        seasonNext: '{cur}/{next} XP للمرحلة {t}',
        ach_season10: 'أسطورة الموسم',
        notifyPromptText: '🔔 تلقّي تذكيرات المكافأة اليومية؟', notifyYes: 'تفعيل', notifyNo: 'ليس الآن',
        installPromptText: '📲 أضف فيديو بوكر إلى شاشتك الرئيسية!', installYes: 'تثبيت'
    });

    // --- weekly tournament ---
    function isTournamentDay(date) {
        return (date || new Date()).getDay() === TOURNAMENT_DAY;
    }

    function tournamentKey(date) {
        return getDayKey(date); // active only on Saturdays, so the day key is unique per tournament
    }

    function lastTournamentDate() {
        // Most recent Saturday strictly before today
        var d = new Date();
        var back = (d.getDay() - TOURNAMENT_DAY + 7) % 7;
        if (back === 0) back = 7;
        d.setDate(d.getDate() - back);
        return d;
    }

    function egTournamentEligible() {
        return egLevel >= TOURNAMENT_MIN_LEVEL;
    }

    // Called from draw(): ×2 payouts while the tournament is live and the player entered
    window.vpTournamentMultiplier = function() {
        return (egUser && isTournamentDay() && egTournamentEligible()) ? 2 : 1;
    };

    window.initTournament = function(user) {
        egTournamentCheckPrizes(user);
        egRenderTournamentBanner();
        egRefreshTournamentLb();
    };

    window.teardownTournament = function() {
        egTournamentCheckedPrizes = false;
        var banner = document.getElementById('tournament-banner');
        if (banner) banner.classList.add('eg-hidden');
        var panel = document.getElementById('leaderboard-tournament');
        if (panel) panel.classList.add('eg-hidden');
    };

    window.egRenderTournamentBanner = function() {
        var banner = document.getElementById('tournament-banner');
        if (!banner) return;
        if (!egUser || !isTournamentDay()) {
            banner.classList.add('eg-hidden');
            return;
        }
        banner.classList.remove('eg-hidden');
        banner.classList.toggle('locked', !egTournamentEligible());
        banner.textContent = egTournamentEligible()
            ? et('tourneyBanner')
            : et('tourneyLocked').replace('{n}', TOURNAMENT_MIN_LEVEL);
        var panel = document.getElementById('leaderboard-tournament');
        if (panel) panel.classList.remove('eg-hidden');
    };

    window.egProcessTournament = function(ev) {
        if (!egUser || !isTournamentDay() || !egTournamentEligible()) return;
        var tKey = tournamentKey();
        db.collection('weekly_tournaments').doc(tKey + '_' + egUser.uid).set({
            tKey: tKey,
            uid: egUser.uid,
            displayName: egUser.displayName || '',
            photoURL: egUser.photoURL || '',
            score: firebase.firestore.FieldValue.increment(ev.win || 0),
            hands: firebase.firestore.FieldValue.increment(1),
            level: egLevel,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true }).then(function() {
            egRefreshTournamentLb();
        }).catch(function(err) { console.error('tournament score:', err); });
    };

    function egRefreshTournamentLb() {
        if (!egUser || !isTournamentDay()) return;
        var tKey = tournamentKey();
        db.collection('weekly_tournaments')
            .where('tKey', '==', tKey)
            .limit(50)
            .get()
            .then(function(snap) {
                var rows = [];
                snap.forEach(function(d) { rows.push(d.data()); });
                rows.sort(function(a, b) { return (b.score || 0) - (a.score || 0); });
                var tbody = document.getElementById('lb-tournament-body');
                if (!tbody) return;
                tbody.innerHTML = '';
                if (!rows.length) {
                    tbody.innerHTML = '<tr><td colspan="4" class="lb-empty">' + rt('playToJoin') + '</td></tr>';
                    return;
                }
                rows.slice(0, 20).forEach(function(d, idx) {
                    var rank = idx + 1;
                    var isYou = d.uid === egUser.uid;
                    var medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank;
                    var photo = d.photoURL ? '<img src="' + d.photoURL + '">' : '';
                    var lvlBadge = d.level ? '<span class="lvl-badge">' + d.level + '</span>' : '';
                    var badge = isYou ? '<span class="lb-badge lb-badge-you">YOU</span>' : '';
                    var row = document.createElement('tr');
                    if (isYou) row.className = 'lb-you';
                    row.innerHTML =
                        '<td class="lb-rank' + (rank <= 3 ? ' lb-rank-' + rank : '') + '">' + medal + '</td>' +
                        '<td><span class="lb-name" onclick="egOpenProfile(\'' + d.uid + '\')">' + photo + escapeHtml(firstName(d.displayName)) + '</span>' + lvlBadge + badge + '</td>' +
                        '<td class="lb-positive lb-score">+' + (d.score || 0) + '</td>' +
                        '<td>' + (d.hands || 0) + '</td>';
                    tbody.appendChild(row);
                });
            })
            .catch(function(err) { console.error('tournament lb:', err); });
    }

    function egTournamentCheckPrizes(user) {
        if (egTournamentCheckedPrizes) return;
        egTournamentCheckedPrizes = true;
        var prevKey = tournamentKey(lastTournamentDate());
        var claimRef = db.collection('tournament_claims').doc(prevKey + '_' + user.uid);
        claimRef.get().then(function(claimDoc) {
            if (claimDoc.exists) return;
            return db.collection('weekly_tournaments')
                .where('tKey', '==', prevKey)
                .limit(50)
                .get()
                .then(function(snap) {
                    var rows = [];
                    snap.forEach(function(d) { rows.push(d.data()); });
                    rows.sort(function(a, b) { return (b.score || 0) - (a.score || 0); });
                    var myRank = -1;
                    rows.slice(0, 3).forEach(function(d, idx) {
                        if (d.uid === user.uid) myRank = idx;
                    });
                    if (myRank === -1) return;
                    var prize = TOURNAMENT_PRIZES[myRank];
                    return claimRef.set({
                        tKey: prevKey,
                        uid: user.uid,
                        rank: myRank + 1,
                        prize: prize,
                        claimedAt: firebase.firestore.FieldValue.serverTimestamp()
                    }).then(function() {
                        egAddCredits(prize);
                        egConfetti();
                        egToast(et('tourneyPrizeToast').replace('{n}', prize).replace('{r}', myRank + 1));
                    });
                });
        }).catch(function(err) { console.error('tournament prizes:', err); });
    }

    window.updateTournamentCountdown = function() {
        if (!isTournamentDay()) return;
        var el = document.getElementById('lb-tournament-countdown');
        if (!el) return;
        var now = new Date();
        var end = new Date(now);
        end.setHours(24, 0, 0, 0);
        var s = Math.max(0, Math.floor((end - now) / 1000));
        el.textContent = String(Math.floor(s / 3600)).padStart(2, '0') + ':' +
            String(Math.floor((s % 3600) / 60)).padStart(2, '0') + ':' +
            String(s % 60).padStart(2, '0');
    };

    setInterval(egRefreshTournamentLb, 60000);

    // --- season pass (monthly, XP-based tiers) ---
    function getMonthKey(date) {
        var now = date || new Date();
        return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    }

    function seasonDaysLeft() {
        var now = new Date();
        var end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        return Math.max(1, Math.ceil((end - now) / 86400e3));
    }

    window.initSeason = function(user) {
        var monthKey = getMonthKey();
        db.collection('season_progress').doc(monthKey + '_' + user.uid).get().then(function(doc) {
            var data = doc.exists ? doc.data() : {};
            egSeason = {
                monthKey: monthKey,
                xp: data.xp || 0,
                claimedTiers: data.claimedTiers || {}
            };
        }).catch(function(err) { console.error('initSeason:', err); });
    };

    window.teardownSeason = function() {
        egSeason = null;
    };

    window.egProcessSeason = function(xpGain) {
        if (!egUser || !egSeason) return;
        if (egSeason.monthKey !== getMonthKey()) {
            // Month rollover mid-session — start fresh
            egSeason = { monthKey: getMonthKey(), xp: 0, claimedTiers: {} };
        }
        egSeason.xp += xpGain;
        var newlyClaimed = false;
        SEASON_TIERS.forEach(function(tier, idx) {
            if (egSeason.xp >= tier.xp && !egSeason.claimedTiers[idx]) {
                egSeason.claimedTiers[idx] = true;
                newlyClaimed = true;
                egAddCredits(tier.credits);
                egConfetti();
                egToast(et('seasonTierToast').replace('{t}', idx + 1).replace('{n}', tier.credits));
                if (idx === SEASON_TIERS.length - 1) egUnlock('season10');
            }
        });
        db.collection('season_progress').doc(egSeason.monthKey + '_' + egUser.uid).set({
            monthKey: egSeason.monthKey,
            uid: egUser.uid,
            xp: egSeason.xp,
            claimedTiers: egSeason.claimedTiers,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true }).catch(function(err) { console.error('season save:', err); });
        if (newlyClaimed && egProfileOpenUid === egUser.uid) egRenderSeason();
    };

    window.egRenderSeason = function() {
        var section = document.getElementById('pf-season-section');
        if (!section) return;
        if (!egSeason) { section.style.display = 'none'; return; }
        section.style.display = '';
        document.getElementById('pf-season-title').textContent = et('seasonTitle');
        document.getElementById('pf-season-ends').textContent =
            et('seasonEnds').replace('{n}', seasonDaysLeft());

        var xp = egSeason.xp;
        var nextIdx = SEASON_TIERS.findIndex(function(t) { return xp < t.xp; });
        var fillEl = document.getElementById('pf-season-fill');
        var textEl = document.getElementById('pf-season-text');
        if (nextIdx === -1) {
            fillEl.style.width = '100%';
            textEl.textContent = et('seasonMax');
        } else {
            var prevXp = nextIdx === 0 ? 0 : SEASON_TIERS[nextIdx - 1].xp;
            var need = SEASON_TIERS[nextIdx].xp - prevXp;
            var cur = xp - prevXp;
            fillEl.style.width = Math.min(100, Math.round((cur / need) * 100)) + '%';
            textEl.textContent = et('seasonNext')
                .replace('{cur}', xp).replace('{next}', SEASON_TIERS[nextIdx].xp).replace('{t}', nextIdx + 1);
        }

        var dots = document.getElementById('pf-season-tiers');
        dots.innerHTML = '';
        SEASON_TIERS.forEach(function(tier, idx) {
            var dot = document.createElement('div');
            dot.className = 'season-tier' + (egSeason.claimedTiers[idx] ? ' claimed' : xp >= tier.xp ? '' : ' locked');
            dot.title = tier.xp + ' XP → +' + tier.credits;
            dot.innerHTML = '<span class="st-num">' + (idx + 1) + '</span><span class="st-credits">+' + tier.credits + '</span>';
            dots.appendChild(dot);
        });
    };
