var ACHIEVEMENTS = [
        { id: 'firstHand',   icon: '🃏' },
        { id: 'hands100',    icon: '💯' },
        { id: 'hands500',    icon: '🎰' },
        { id: 'hands1000',   icon: '🏛️' },
        { id: 'firstWin',    icon: '🎉' },
        { id: 'royal',       icon: '👑' },
        { id: 'sflush',      icon: '🌈' },
        { id: 'quads',       icon: '🍀' },
        { id: 'streak5',     icon: '🔥' },
        { id: 'streak10',    icon: '☄️' },
        { id: 'login7',      icon: '📅' },
        { id: 'joinRoom',    icon: '🚪' },
        { id: 'createRoom',  icon: '🏗️' },
        { id: 'invite3',     icon: '🤝' },
        { id: 'rooms3',      icon: '🎭' },
        { id: 'challenge10', icon: '🎯' },
        { id: 'challenge50', icon: '🏅' },
        { id: 'credits500',  icon: '💰' },
        { id: 'credits1000', icon: '💎' },
        { id: 'ironhour',    icon: '🛡️' },
        { id: 'perfect20',   icon: '🧠' }
    ];

    // Cumulative XP required to reach level n (level n→n+1 costs n×100 XP)
    function egXpForLevel(n) {
        return 100 * (n - 1) * n / 2;
    }

    function egLevelFromXp(xp) {
        var n = 1;
        while (n < MAX_LEVEL && xp >= egXpForLevel(n + 1)) n++;
        return n;
    }

    function egProcessXpAndAchievements(ev) {
        var gain = 10 + Math.floor(ev.bet / 5) + (XP_WIN_BONUS[ev.handType] || 0);
        if (window.vpEventXpMult) gain = Math.round(gain * vpEventXpMult());
        egXp += gain;
        if (window.egProcessSeason) egProcessSeason(gain);
        var newLevel = egLevelFromXp(egXp);
        if (newLevel > egLevel) {
            egLevel = newLevel;
            egShowLevelUp(newLevel);
            logRoomEvent('levelUp', newLevel);
        }
        egRenderXpBar();

        if (!egStats) return;
        var isFirstHand = (egStats.totalHands === 0);
        if (isFirstHand) {
            checkAndProcessReferral();
        }
        egStats.totalHands++;
        if (ev.win > 0) egStats.totalWins++;
        if (egStats.totalHands % 50 === 0 && window.egMysteryBox) egMysteryBox(egStats.totalHands);
        var rank = HAND_RANK[ev.handType] || 0;
        var userUpdate = {
            xp: egXp,
            level: egLevel,
            totalHands: firebase.firestore.FieldValue.increment(1)
        };
        if (ev.win > 0) {
            userUpdate.totalWins = firebase.firestore.FieldValue.increment(1);
            userUpdate.handCounts = {};
            userUpdate.handCounts[ev.handType] = firebase.firestore.FieldValue.increment(1);
            egStats.handCounts[ev.handType] = (egStats.handCounts[ev.handType] || 0) + 1;
            if (ev.win > (egStats.biggestWin || 0)) {
                egStats.biggestWin = ev.win;
                userUpdate.biggestWin = ev.win;
            }
        }
        if (rank > egStats.bestHandRank) {
            egStats.bestHandRank = rank;
            egStats.bestHand = ev.handType;
            userUpdate.bestHand = ev.handType;
            userUpdate.bestHandRank = rank;
        }
        db.collection('users').doc(egUser.uid).set(userUpdate, { merge: true })
            .catch(function(err) { console.error('xp save:', err); });

        egUnlock('firstHand');
        if (egStats.totalHands >= 100) egUnlock('hands100');
        if (egStats.totalHands >= 500) egUnlock('hands500');
        if (egStats.totalHands >= 1000) egUnlock('hands1000');
        if (ev.win > 0) egUnlock('firstWin');
        if (ev.handType === 'Royal Flush') egUnlock('royal');
        if (ev.handType === 'Straight Flush') egUnlock('sflush');
        if (ev.handType === 'Four of a Kind') egUnlock('quads');
        if (ev.streak >= 5) egUnlock('streak5');
        if (ev.streak >= 10) egUnlock('streak10');
        if (balance >= 500) egUnlock('credits500');
        if (balance >= 1000) egUnlock('credits1000');

        var hk = getHourKey();
        if (egHourKey !== hk) { egHourKey = hk; egHourHands = 0; }
        egHourHands++;
        if (egHourHands >= 20 && hourlyRebuys === 0) egUnlock('ironhour');
    }

    function egUnlock(id) {
        if (!egUser || egAchievements[id]) return;
        egAchievements[id] = true;
        db.collection('users').doc(egUser.uid).collection('achievements').doc(id).set({
            unlockedAt: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(function(err) { console.error('achievement save:', err); });
        var ach = ACHIEVEMENTS.find(function(a) { return a.id === id; });
        egToast('🏆 ' + (ach ? ach.icon + ' ' : '') + et('ach_' + id));
        egConfetti();
        egUpdateAchCount();
        if (egProfileOpenUid === egUser.uid) egOpenProfile();
    }

    function egUpdateAchCount() {
        var el = document.getElementById('ub-ach-count');
        if (el) el.textContent = '🏆 ' + Object.keys(egAchievements).length;
    }

    window.egOnRoomEvent = function(type) {
        if (type === 'create') egUnlock('createRoom');
        if (type === 'join') egUnlock('joinRoom');
        if (myRooms.length >= 3) egUnlock('rooms3');
    };

    // --- XP bar (user bar) ---
    function egRenderXpBar() {
        if (window.egRenderTournamentBanner) egRenderTournamentBanner();
        if (window.updateVariantUI) updateVariantUI();
        if (window.updateMultiHandUI) updateMultiHandUI();
        if (window.egRenderVipBadge) egRenderVipBadge();
        if (window.egApplyThemeUnlocks) egApplyThemeUnlocks();
        var lvlEl = document.getElementById('ub-level');
        var fillEl = document.getElementById('ub-xp-fill');
        var textEl = document.getElementById('ub-xp-text');
        if (!lvlEl || !fillEl || !textEl) return;
        lvlEl.textContent = egLevel;
        if (egLevel >= MAX_LEVEL) {
            fillEl.style.width = '100%';
            textEl.textContent = 'MAX';
            return;
        }
        var cur = egXp - egXpForLevel(egLevel);
        var need = egXpForLevel(egLevel + 1) - egXpForLevel(egLevel);
        fillEl.style.width = Math.min(100, Math.round((cur / need) * 100)) + '%';
        textEl.textContent = cur + '/' + need + ' XP';
    }

    function egShowLevelUp(level) {
        document.getElementById('eg-levelup-number').textContent =
            et('levelLabel').replace('{n}', level);
        var style = CARD_STYLES.find(function(s) { return s.level === level; });
        document.getElementById('eg-levelup-note').textContent =
            style ? et('styleUnlocked').replace('{s}', style.name) : '';
        egConfetti();
        playSound('levelUp');
        egQueueModal('eg-levelup-modal');
    }

    // --- card styles ---
    function egApplyCardStyle(id) {
        egCardStyle = id;
        var handEl = document.getElementById('hand');
        if (!handEl) return;
        handEl.className = 'hand' + (id !== 'classic' ? ' cs-' + id : '');
    }

    function egSelectCardStyle(id) {
        var style = CARD_STYLES.find(function(s) { return s.id === id; });
        if (!style || style.level > egLevel) return;
        egApplyCardStyle(id);
        db.collection('users').doc(egUser.uid).set({ cardStyle: id }, { merge: true })
            .catch(function(err) { console.error('card style save:', err); });
        egRenderStylePicker();
    }

    function egRenderStylePicker() {
        var wrap = document.getElementById('pf-styles');
        wrap.innerHTML = '';
        CARD_STYLES.forEach(function(s) {
            var chip = document.createElement('div');
            var locked = s.level > egLevel;
            chip.className = 'style-chip' +
                (s.id === egCardStyle ? ' selected' : '') + (locked ? ' locked' : '');
            chip.textContent = s.name + (locked ? ' 🔒 ' + et('lockedLv').replace('{n}', s.level) : '');
            if (!locked) chip.onclick = function() { egSelectCardStyle(s.id); };
            wrap.appendChild(chip);
        });
    }

    // --- profile panel ---
    var egProfileOpenUid = null;

    window.egOpenProfile = function(uid) {
        if (!egUser) return;
        var isMe = !uid || uid === egUser.uid;
        var targetUid = isMe ? egUser.uid : uid;
        egProfileOpenUid = targetUid;
        document.getElementById('profile-backdrop').classList.remove('eg-hidden');
        var panel = document.getElementById('profile-panel');
        panel.classList.remove('eg-hidden');
        requestAnimationFrame(function() { panel.classList.add('open'); });
        document.getElementById('pf-styles-section').style.display = isMe ? '' : 'none';

        if (isMe) {
            egRenderProfile({
                displayName: egUser.displayName,
                photoURL: egUser.photoURL,
                xp: egXp, level: egLevel,
                totalHands: egStats ? egStats.totalHands : 0,
                totalWins: egStats ? egStats.totalWins : 0,
                bestHand: egStats ? egStats.bestHand : null,
                bestStreak: bestStreak,
                challengesCompleted: egStats ? egStats.challengesCompleted : 0,
                firstSeen: egStats ? egStats.firstSeen : null,
                biggestWin: egStats ? egStats.biggestWin : 0,
                handCounts: egStats ? egStats.handCounts : {}
            }, egAchievements, true);
            return;
        }
        // Other player: fetch their public profile
        Promise.all([
            db.collection('users').doc(targetUid).get(),
            db.collection('users').doc(targetUid).collection('achievements').get()
        ]).then(function(results) {
            if (egProfileOpenUid !== targetUid) return; // switched mid-flight
            var data = results[0].exists ? results[0].data() : {};
            var achSet = {};
            results[1].forEach(function(d) { achSet[d.id] = true; });
            egRenderProfile(data, achSet, false);
        }).catch(function(err) {
            console.error('profile load:', err);
            egCloseProfile();
        });
    };

    function egRenderProfile(data, achSet, isMe) {
        var photoEl = document.getElementById('pf-photo');
        photoEl.src = data.photoURL || '';
        photoEl.style.display = data.photoURL ? '' : 'none';
        document.getElementById('pf-name').textContent = firstName(data.displayName);
        document.getElementById('pf-level').textContent = data.level || 1;

        var since = data.firstSeen && typeof data.firstSeen.toDate === 'function'
            ? data.firstSeen.toDate().toLocaleDateString() : null;
        document.getElementById('pf-since').textContent =
            since ? et('memberSince').replace('{d}', since) : '';

        var xp = data.xp || 0;
        var level = data.level || 1;
        var fillEl = document.getElementById('pf-xp-fill');
        var textEl = document.getElementById('pf-xp-text');
        if (level >= MAX_LEVEL) {
            fillEl.style.width = '100%';
            textEl.textContent = 'MAX';
        } else {
            var cur = xp - egXpForLevel(level);
            var need = egXpForLevel(level + 1) - egXpForLevel(level);
            fillEl.style.width = Math.max(0, Math.min(100, Math.round((cur / need) * 100))) + '%';
            textEl.textContent = Math.max(0, cur) + '/' + need + ' XP';
        }

        var t = TRANSLATIONS[currentLang];
        var stats = [
            [et('stTotalHands'), data.totalHands || 0],
            [et('stTotalWins'), data.totalWins || 0],
            [et('stBestHand'), data.bestHand ? (t.payouts[data.bestHand] || data.bestHand) : '—'],
            [et('stBestStreak'), '🔥 ' + (data.bestStreak || 0)],
            [et('stChallenges'), data.challengesCompleted || 0]
        ];
        if (isMe) stats.push([et('stRooms'), myRooms.length]);
        var statsEl = document.getElementById('pf-stats');
        statsEl.innerHTML = '';
        stats.forEach(function(row) {
            var div = document.createElement('div');
            div.className = 'pf-stat-row';
            div.innerHTML = '<span>' + row[0] + '</span><b>' + row[1] + '</b>';
            statsEl.appendChild(div);
        });
        if (window.egRenderExtraStats) egRenderExtraStats(data);
        var avatarSection = document.getElementById('pf-avatar-section');
        if (avatarSection) {
            avatarSection.style.display = isMe ? '' : 'none';
            if (isMe && window.egRenderAvatarPicker) egRenderAvatarPicker();
        }

        var grid = document.getElementById('pf-ach-grid');
        grid.innerHTML = '';
        ACHIEVEMENTS.forEach(function(a) {
            var cell = document.createElement('div');
            cell.className = 'ach-cell' + (achSet[a.id] ? '' : ' locked');
            cell.innerHTML = '<span class="ach-icon">' + a.icon + '</span>' + et('ach_' + a.id);
            grid.appendChild(cell);
        });

        const refSectionWrap = document.getElementById('pf-ref-section-wrap');
        if (refSectionWrap) {
            refSectionWrap.style.display = isMe ? '' : 'none';
        }

        const seasonSection = document.getElementById('pf-season-section');
        if (seasonSection) {
            if (isMe && window.egRenderSeason) {
                egRenderSeason();
            } else {
                seasonSection.style.display = 'none';
            }
        }

        if (isMe) {
            egRenderStylePicker();
            
            const refCode = data.referralCode || '------';
            const refCodeEl = document.getElementById('pf-ref-code');
            if (refCodeEl) refCodeEl.textContent = refCode;
            
            const refLink = location.origin + location.pathname + '?ref=' + refCode;
            const refLinkInput = document.getElementById('pf-ref-link');
            if (refLinkInput) refLinkInput.value = refLink;
            
            const waText = rt('waRefText') || 'Join me in Video Poker! Use my referral code: {code}';
            const waShareUrl = 'https://wa.me/?text=' + encodeURIComponent(waText.replace('{code}', refCode) + '\n' + refLink);
            const waBtn = document.getElementById('pf-ref-whatsapp');
            if (waBtn) waBtn.href = waShareUrl;
            
            const refCount = data.referralCount || 0;
            const refCountEl = document.getElementById('pf-ref-count');
            if (refCountEl) {
                refCountEl.textContent = rt('referredFriends').replace('{n}', refCount);
            }
        }
    }

    window.egCloseProfile = function() {
        egProfileOpenUid = null;
        document.getElementById('profile-backdrop').classList.add('eg-hidden');
        var panel = document.getElementById('profile-panel');
        panel.classList.remove('open');
        panel.classList.add('eg-hidden');
    };

    // --- Phase 2 i18n ---
    Object.assign(ENGAGE_I18N.en, {
        levelUpTitle: '⬆️ Level Up!', levelLabel: 'Level {n}', okBtn: 'Awesome!',
        styleUnlocked: 'New card style unlocked: {s}',
        profileStats: 'Stats', profileAchievements: 'Achievements', profileStyles: 'Card Styles',
        memberSince: 'Member since {d}', lockedLv: 'Lv {n}',
        stTotalHands: 'Total Hands', stTotalWins: 'Total Wins', stBestHand: 'Best Hand',
        stBestStreak: 'Best Streak', stChallenges: 'Challenges Completed', stRooms: 'Rooms Joined',
        ach_firstHand: 'First Hand', ach_hands100: '100 Hands', ach_hands500: '500 Hands', ach_hands1000: '1000 Hands',
        ach_firstWin: 'First Win', ach_royal: 'Royal Flush Club', ach_sflush: 'Straight Flush Club', ach_quads: 'Four of a Kind Club',
        ach_streak5: 'Hot Streak 5', ach_streak10: 'Unstoppable 10', ach_login7: 'Perfect Week',
        ach_joinRoom: 'Room Guest', ach_createRoom: 'Room Host', ach_invite3: 'Recruiter', ach_rooms3: 'Socialite',
        ach_challenge10: 'Challenger 10', ach_challenge50: 'Challenge Master',
        ach_credits500: 'High Roller', ach_credits1000: 'Credit Tycoon', ach_ironhour: 'Iron Bankroll'
    });
    Object.assign(ENGAGE_I18N.es, {
        levelUpTitle: '⬆️ ¡Subiste de Nivel!', levelLabel: 'Nivel {n}', okBtn: '¡Genial!',
        styleUnlocked: 'Nuevo estilo de cartas: {s}',
        profileStats: 'Estadísticas', profileAchievements: 'Logros', profileStyles: 'Estilos de Cartas',
        memberSince: 'Miembro desde {d}', lockedLv: 'Nv {n}',
        stTotalHands: 'Manos Totales', stTotalWins: 'Victorias Totales', stBestHand: 'Mejor Mano',
        stBestStreak: 'Mejor Racha', stChallenges: 'Desafíos Completados', stRooms: 'Salas Unidas',
        ach_firstHand: 'Primera Mano', ach_hands100: '100 Manos', ach_hands500: '500 Manos', ach_hands1000: '1000 Manos',
        ach_firstWin: 'Primera Victoria', ach_royal: 'Club Escalera Real', ach_sflush: 'Club Escalera de Color', ach_quads: 'Club del Póker',
        ach_streak5: 'Racha de 5', ach_streak10: 'Imparable 10', ach_login7: 'Semana Perfecta',
        ach_joinRoom: 'Invitado', ach_createRoom: 'Anfitrión', ach_invite3: 'Reclutador', ach_rooms3: 'Sociable',
        ach_challenge10: 'Retador 10', ach_challenge50: 'Maestro de Desafíos',
        ach_credits500: 'Gran Apostador', ach_credits1000: 'Magnate', ach_ironhour: 'Banca de Hierro'
    });
    Object.assign(ENGAGE_I18N.fr, {
        levelUpTitle: '⬆️ Niveau Supérieur !', levelLabel: 'Niveau {n}', okBtn: 'Super !',
        styleUnlocked: 'Nouveau style de cartes : {s}',
        profileStats: 'Statistiques', profileAchievements: 'Succès', profileStyles: 'Styles de Cartes',
        memberSince: 'Membre depuis {d}', lockedLv: 'Nv {n}',
        stTotalHands: 'Mains Totales', stTotalWins: 'Victoires Totales', stBestHand: 'Meilleure Main',
        stBestStreak: 'Meilleure Série', stChallenges: 'Défis Accomplis', stRooms: 'Salons Rejoints',
        ach_firstHand: 'Première Main', ach_hands100: '100 Mains', ach_hands500: '500 Mains', ach_hands1000: '1000 Mains',
        ach_firstWin: 'Première Victoire', ach_royal: 'Club Quinte Royale', ach_sflush: 'Club Quinte Flush', ach_quads: 'Club du Carré',
        ach_streak5: 'Série de 5', ach_streak10: 'Inarrêtable 10', ach_login7: 'Semaine Parfaite',
        ach_joinRoom: 'Invité', ach_createRoom: 'Hôte', ach_invite3: 'Recruteur', ach_rooms3: 'Mondain',
        ach_challenge10: 'Défieur 10', ach_challenge50: 'Maître des Défis',
        ach_credits500: 'Gros Joueur', ach_credits1000: 'Magnat', ach_ironhour: 'Banque de Fer'
    });
    Object.assign(ENGAGE_I18N.de, {
        levelUpTitle: '⬆️ Level Aufstieg!', levelLabel: 'Level {n}', okBtn: 'Super!',
        styleUnlocked: 'Neuer Kartenstil freigeschaltet: {s}',
        profileStats: 'Statistiken', profileAchievements: 'Erfolge', profileStyles: 'Kartenstile',
        memberSince: 'Mitglied seit {d}', lockedLv: 'Lv {n}',
        stTotalHands: 'Hände Gesamt', stTotalWins: 'Siege Gesamt', stBestHand: 'Beste Hand',
        stBestStreak: 'Beste Serie', stChallenges: 'Geschaffte Herausforderungen', stRooms: 'Beigetretene Räume',
        ach_firstHand: 'Erste Hand', ach_hands100: '100 Hände', ach_hands500: '500 Hände', ach_hands1000: '1000 Hände',
        ach_firstWin: 'Erster Sieg', ach_royal: 'Royal-Flush-Club', ach_sflush: 'Straight-Flush-Club', ach_quads: 'Vierling-Club',
        ach_streak5: 'Serie von 5', ach_streak10: 'Unaufhaltsam 10', ach_login7: 'Perfekte Woche',
        ach_joinRoom: 'Gast', ach_createRoom: 'Gastgeber', ach_invite3: 'Anwerber', ach_rooms3: 'Gesellig',
        ach_challenge10: 'Herausforderer 10', ach_challenge50: 'Herausforderungs-Meister',
        ach_credits500: 'High Roller', ach_credits1000: 'Magnat', ach_ironhour: 'Eiserne Bank'
    });
    Object.assign(ENGAGE_I18N.he, {
        levelUpTitle: '⬆️ עלית רמה!', levelLabel: 'רמה {n}', okBtn: 'מעולה!',
        styleUnlocked: 'סגנון קלפים חדש נפתח: {s}',
        profileStats: 'סטטיסטיקות', profileAchievements: 'הישגים', profileStyles: 'סגנונות קלפים',
        memberSince: 'חבר מאז {d}', lockedLv: 'רמה {n}',
        stTotalHands: 'סה"כ ידיים', stTotalWins: 'סה"כ ניצחונות', stBestHand: 'היד הטובה ביותר',
        stBestStreak: 'הרצף הטוב ביותר', stChallenges: 'אתגרים שהושלמו', stRooms: 'חדרים',
        ach_firstHand: 'יד ראשונה', ach_hands100: '100 ידיים', ach_hands500: '500 ידיים', ach_hands1000: '1000 ידיים',
        ach_firstWin: 'ניצחון ראשון', ach_royal: 'מועדון רויאל פלאש', ach_sflush: 'מועדון סטרייט פלאש', ach_quads: 'מועדון הרביעייה',
        ach_streak5: 'רצף של 5', ach_streak10: 'בלתי ניתן לעצירה', ach_login7: 'שבוע מושלם',
        ach_joinRoom: 'אורח', ach_createRoom: 'מארח', ach_invite3: 'מגייס', ach_rooms3: 'חברותי',
        ach_challenge10: 'מאתגר 10', ach_challenge50: 'מאסטר האתגרים',
        ach_credits500: 'שחקן כבד', ach_credits1000: 'טייקון', ach_ironhour: 'בנק ברזל'
    });
    Object.assign(ENGAGE_I18N.ar, {
        levelUpTitle: '⬆️ ارتفع مستواك!', levelLabel: 'المستوى {n}', okBtn: 'رائع!',
        styleUnlocked: 'فُتح نمط بطاقات جديد: {s}',
        profileStats: 'إحصائيات', profileAchievements: 'إنجازات', profileStyles: 'أنماط البطاقات',
        memberSince: 'عضو منذ {d}', lockedLv: 'مستوى {n}',
        stTotalHands: 'إجمالي الأيدي', stTotalWins: 'إجمالي الانتصارات', stBestHand: 'أفضل يد',
        stBestStreak: 'أفضل سلسلة', stChallenges: 'تحديات مكتملة', stRooms: 'الغرف',
        ach_firstHand: 'اليد الأولى', ach_hands100: '100 يد', ach_hands500: '500 يد', ach_hands1000: '1000 يد',
        ach_firstWin: 'أول فوز', ach_royal: 'نادي رويال فلاش', ach_sflush: 'نادي ستريت فلاش', ach_quads: 'نادي الرباعية',
        ach_streak5: 'سلسلة 5', ach_streak10: 'لا يُوقف 10', ach_login7: 'أسبوع مثالي',
        ach_joinRoom: 'ضيف', ach_createRoom: 'مضيف', ach_invite3: 'مجنِّد', ach_rooms3: 'اجتماعي',
        ach_challenge10: 'متحدٍ 10', ach_challenge50: 'سيد التحديات',
        ach_credits500: 'مقامر كبير', ach_credits1000: 'قطب', ach_ironhour: 'بنك حديدي'
    });

    // Additional I18n strings for Phase 3
    Object.assign(ROOM_I18N.en, {
        refInviteTitle: "Invite Friends",
        refInviteSub: "Invite friends to play! You both get 200 bonus credits when they play their first hand.",
        referredFriends: "Referred: {n} friends",
        waRefText: "🃏 Play Video Poker with me! Use my referral link to get 200 bonus credits:",
        feedHitHand: "{name} just hit a {hand}!",
        feedStreak: "{name} is on a {n}-win streak!",
        feedLevelUp: "{name} just leveled up to {n}!"
    });
    Object.assign(ROOM_I18N.es, {
        refInviteTitle: "Invitar Amigos",
        refInviteSub: "¡Invita a tus amigos a jugar! Ambos obtendrán 200 créditos de bonificación cuando jueguen su primera mano.",
        referredFriends: "Referidos: {n} amigos",
        waRefText: "🃏 ¡Juega al Video Póker conmigo! Usa mi enlace de referencia para obtener 200 créditos de bonificación:",
        feedHitHand: "¡{name} acaba de conseguir {hand}!",
        feedStreak: "¡{name} lleva una racha de {n} victorias!",
        feedLevelUp: "¡{name} acaba de subir al nivel {n}!"
    });
    Object.assign(ROOM_I18N.fr, {
        refInviteTitle: "Inviter des Amis",
        refInviteSub: "Invitez des amis à jouer ! Vous recevrez tous les deux 200 crédits bonus lorsqu'ils joueront leur première main.",
        referredFriends: "Parrainé : {n} amis",
        waRefText: "🃏 Jouez au Video Poker avec moi ! Utilisez mon lien de parrainage pour obtenir 200 crédits bonus :",
        feedHitHand: "{name} vient d'obtenir {hand} !",
        feedStreak: "{name} a une série de {n} victoires !",
        feedLevelUp: "{name} vient de monter au niveau {n} !"
    });
    Object.assign(ROOM_I18N.de, {
        refInviteTitle: "Freunde einladen",
        refInviteSub: "Lade Freunde zum Spielen ein! Ihr beide erhaltet 200 Bonus-Credits, wenn sie ihre erste Hand spielen.",
        referredFriends: "Geworben: {n} Freunde",
        waRefText: "🃏 Spiele Video-Poker mit mir! Nutze meinen Empfehlungslink, um 200 Bonus-Credits zu erhalten:",
        feedHitHand: "{name} hat gerade {hand} erzielt!",
        feedStreak: "{name} hat eine Siegesserie von {n} Händen!",
        feedLevelUp: "{name} ist gerade auf Level {n} aufgestiegen!"
    });
    Object.assign(ROOM_I18N.he, {
        refInviteTitle: "הזמן חברים",
        refInviteSub: "הזמן חברים לשחק! שניכם תקבלו 200 קרדיטים בונוס כשהם ישחקו את היד הראשונה שלהם.",
        referredFriends: "חברים שהוזמנו: {n}",
        waRefText: "🃏 בוא לשחק איתי וידאו פוקר! השתמש בלינק ההזמנה שלי כדי לקבל 200 קרדיטים בונוס:",
        feedHitHand: "{name} הרגע השיג {hand}!",
        feedStreak: "{name} ברצף של {n} ניצחונות!",
        feedLevelUp: "{name} הרגע עלה לרמה {n}!"
    });
    Object.assign(ROOM_I18N.ar, {
        refInviteTitle: "دعوة الأصدقاء",
        refInviteSub: "ادعُ أصدقاءك للعب! ستحصلان كلاكما على 200 رصيد إضافي عند لعب اليد الأولى.",
        referredFriends: "الأصدقاء المدعوون: {n}",
        waRefText: "🃏 العب فيديو بوكر معي! استخدم رابط الدعوة الخاص بي للحصول على 200 رصيد إضافي:",
        feedHitHand: "{name} حصل للتو على {hand}!",
        feedStreak: "{name} في سلسلة انتصارات متتالية تبلغ {n}!",
        feedLevelUp: "{name} ارتفع للتو إلى المستوى {n}!"
    });

    var roomEventsUnsubscribe = null;
    var roomEventsSessionStartTime = 0;

    function listenToActiveRoomEvents(roomId) {
        if (roomEventsUnsubscribe) {
            roomEventsUnsubscribe();
            roomEventsUnsubscribe = null;
        }
        if (!roomId) return;
        
        roomEventsSessionStartTime = Date.now();
        
        roomEventsUnsubscribe = db.collection('room_events')
            .where('roomId', '==', roomId)
            .onSnapshot(function(snapshot) {
                snapshot.docChanges().forEach(function(change) {
                    if (change.type === 'added') {
                        var data = change.doc.data();
                        var timestamp = data.timestamp ? (data.timestamp.toDate ? data.timestamp.toDate().getTime() : data.timestamp) : Date.now();
                        
                        if (timestamp >= roomEventsSessionStartTime - 2000) {
                            handleIncomingRoomEvent(data);
                        }
                    }
                });
            }, function(err) {
                console.error('listenToActiveRoomEvents error:', err);
            });
    }