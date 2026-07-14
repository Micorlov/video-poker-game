function egLoadDailyReward(user) {
        db.collection('daily_rewards').doc(user.uid).get().then(function(doc) {
            var data = doc.exists ? doc.data() : null;
            var today = getDayKey();
            var yesterday = getDayKey(new Date(Date.now() - 86400e3));
            var longest = data ? (data.longestStreak || 0) : 0;
            var claimed = data ? (data.totalClaimed || 0) : 0;

            if (data && data.lastClaimDate === today) return; // already claimed today

            var day, streak;
            if (data && data.lastClaimDate === yesterday) {
                day = ((data.currentDay || 0) % 7) + 1;
                streak = (data.streak || data.currentDay || 0) + 1;
            } else {
                day = 1;
                streak = 1;
            }
            egRewardState = { day: day, streak: streak, longestStreak: longest, totalClaimed: claimed };
            egRenderRewardCalendar();
            egQueueModal('eg-reward-modal');
        }).catch(function(err) { console.error('egLoadDailyReward:', err); });
    }

    function egRenderRewardCalendar() {
        if (!egRewardState) return;
        var cal = document.getElementById('eg-reward-calendar');
        cal.innerHTML = '';
        for (var i = 0; i < 7; i++) {
            var day = i + 1;
            var cell = document.createElement('div');
            var state = day < egRewardState.day ? 'claimed' : day === egRewardState.day ? 'today' : 'locked';
            cell.className = 'reward-day ' + state;
            cell.innerHTML = et('dayLabel') + ' ' + day +
                '<span class="rd-amount">' + (day < egRewardState.day ? '✓' : EG_REWARDS[i]) + '</span>';
            cal.appendChild(cell);
        }
        document.getElementById('eg-reward-claim').textContent =
            et('claimBtn').replace('{n}', EG_REWARDS[egRewardState.day - 1]);
        var longestEl = document.getElementById('eg-reward-longest');
        longestEl.textContent = egRewardState.longestStreak > 0
            ? et('longestStreak').replace('{n}', egRewardState.longestStreak) : '';
    }

    function egClaimDailyReward() {
        if (!egUser || !egRewardState) return;
        var s = egRewardState;
        egRewardState = null;
        var amount = EG_REWARDS[s.day - 1];
        egAddCredits(amount);
        egConfetti();
        egToast(et('rewardToast').replace('{n}', amount));
        db.collection('daily_rewards').doc(egUser.uid).set({
            uid: egUser.uid,
            currentDay: s.day,
            lastClaimDate: getDayKey(),
            streak: s.streak,
            longestStreak: Math.max(s.longestStreak, s.streak),
            totalClaimed: s.totalClaimed + amount,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(function(err) { console.error('daily reward claim:', err); });
        if (s.streak >= 7) egUnlock('login7');
        egCloseModal('eg-reward-modal');
    }

    // --- daily challenges ---
    function egPickChallenges(dateKey) {
        var h = 0;
        for (var i = 0; i < dateKey.length; i++) h = (h * 31 + dateKey.charCodeAt(i)) >>> 0;
        var pool = CHALLENGE_POOL.slice();
        var picked = [];
        for (var k = 0; k < 3; k++) {
            h = (h * 1103515245 + 12345) >>> 0;
            picked.push(pool.splice(h % pool.length, 1)[0]);
        }
        return picked;
    }

    function egLoadChallenges(user) {
        var dateKey = getDayKey();
        var ref = db.collection('daily_challenges').doc(dateKey + '_' + user.uid);
        ref.get().then(function(doc) {
            if (doc.exists) {
                egChallenges = { dateKey: dateKey, list: doc.data().challenges || [] };
            } else {
                var list = egPickChallenges(dateKey).map(function(t) {
                    return { id: t.id, target: t.target, progress: 0, completed: false, reward: t.reward };
                });
                egChallenges = { dateKey: dateKey, list: list };
                ref.set({
                    dateKey: dateKey,
                    uid: user.uid,
                    challenges: list,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                }).catch(function(err) { console.error('challenges create:', err); });
            }
            egRenderChallenges();
        }).catch(function(err) { console.error('egLoadChallenges:', err); });
    }

    function egChallengeTemplate(id) {
        return CHALLENGE_POOL.find(function(t) { return t.id === id; }) || null;
    }

    function egChallengeDesc(ch) {
        var t = egChallengeTemplate(ch.id);
        if (!t) return ch.id;
        var handName = t.hand ? (TRANSLATIONS[currentLang].payouts[t.hand] || t.hand) : '';
        switch (t.type) {
            case 'play':        return et('chPlay').replace('{n}', t.target);
            case 'win':         return et('chWin').replace('{n}', t.target);
            case 'streak':      return et('chStreak').replace('{n}', t.target);
            case 'hand':        return et('chHand').replace('{hand}', handName).replace('{n}', t.target);
            case 'heldPairWin': return et('chHeldPair').replace('{n}', t.target);
            case 'maxBet':      return et('chMaxBet').replace('{n}', t.target);
            case 'winCredits':  return et('chWinCredits').replace('{n}', t.target);
            case 'bigWin':      return et('chBigWin').replace('{n}', 20);
            default:            return ch.id;
        }
    }

    function egRenderChallenges() {
        var panel = document.getElementById('challenges-panel');
        var listEl = document.getElementById('challenges-list');
        if (!egChallenges || !egUser) { panel.style.display = 'none'; return; }
        panel.style.display = '';
        listEl.style.display = egChallengesCollapsed ? 'none' : '';
        document.getElementById('challenges-caret').textContent = egChallengesCollapsed ? '▸' : '▾';
        listEl.innerHTML = '';
        egChallenges.list.forEach(function(ch) {
            var pct = Math.min(100, Math.round((ch.progress / ch.target) * 100));
            var row = document.createElement('div');
            row.className = 'challenge-row' + (ch.completed ? ' done' : '');
            row.innerHTML =
                '<div class="challenge-desc">' +
                    '<span>' + (ch.completed ? '✅ ' : '') + egChallengeDesc(ch) +
                    ' <span style="opacity:0.6">(' + Math.min(ch.progress, ch.target) + '/' + ch.target + ')</span></span>' +
                    '<span class="challenge-reward">+' + ch.reward + '</span>' +
                '</div>' +
                '<div class="challenge-bar"><div class="challenge-fill" style="width:' + pct + '%"></div></div>';
            listEl.appendChild(row);
        });
    }

    function egToggleChallenges() {
        egChallengesCollapsed = !egChallengesCollapsed;
        egRenderChallenges();
    }

    window.egOnHandPlayed = function(ev) {
        if (!egUser) return;
        egProcessXpAndAchievements(ev);
        egProcessChallenges(ev);
        if (window.egProcessTournament) egProcessTournament(ev);
        if (window.pwaOnHandPlayed) pwaOnHandPlayed();
    };

    function egProcessChallenges(ev) {
        if (!egChallenges) return;
        if (egChallenges.dateKey !== getDayKey()) {
            // Midnight rollover — fetch today's fresh set
            egLoadChallenges(egUser);
            return;
        }
        var changed = false;
        egChallenges.list.forEach(function(ch) {
            if (ch.completed) return;
            var t = egChallengeTemplate(ch.id);
            if (!t) return;
            var before = ch.progress;
            switch (t.type) {
                case 'play':        ch.progress++; break;
                case 'win':         if (ev.win > 0) ch.progress++; break;
                case 'streak':      ch.progress = Math.max(ch.progress, ev.streak); break;
                case 'hand':        if (ev.handType === t.hand) ch.progress++; break;
                case 'heldPairWin': if (ev.heldPair && ev.win > 0) ch.progress++; break;
                case 'maxBet':      if (ev.bet >= 50) ch.progress++; break;
                case 'winCredits':  ch.progress += ev.win; break;
                case 'bigWin':      if (ev.win >= 20) ch.progress++; break;
            }
            if (ch.progress !== before) changed = true;
            if (ch.progress >= ch.target) {
                ch.progress = ch.target;
                ch.completed = true;
                changed = true;
                egAddCredits(ch.reward);
                egConfetti();
                egToast(et('challengeToast').replace('{n}', ch.reward));
                if (egStats) {
                    egStats.challengesCompleted++;
                    db.collection('users').doc(egUser.uid).set({
                        challengesCompleted: firebase.firestore.FieldValue.increment(1)
                    }, { merge: true }).catch(function(err) { console.error('challenge count:', err); });
                    if (egStats.challengesCompleted >= 10) egUnlock('challenge10');
                    if (egStats.challengesCompleted >= 50) egUnlock('challenge50');
                }
            }
        });
        if (changed) {
            egRenderChallenges();
            db.collection('daily_challenges').doc(egChallenges.dateKey + '_' + egUser.uid).set({
                dateKey: egChallenges.dateKey,
                uid: egUser.uid,
                challenges: egChallenges.list,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true }).catch(function(err) { console.error('challenges save:', err); });
        }
    }

    // --- i18n for engagement UI ---
    window.applyEngageLang = function() {
        var set = function(id, text) {
            var el = document.getElementById(id);
            if (el) el.textContent = text;
        };
        set('eg-reward-title', et('rewardTitle'));
        set('eg-reward-sub', et('rewardSub'));
        set('eg-reward-hint', et('rewardHint'));
        set('eg-comeback-title', et('comebackTitle'));
        set('eg-comeback-msg', et('comebackMsg'));
        set('streak-label', et('streakLabel'));
        set('stat-best-streak-label', et('bestStreakStat'));
        set('challenges-title', et('challengesTitle'));
        if (egComebackAmount > 0) {
            set('eg-comeback-claim', et('comebackBtn').replace('{n}', egComebackAmount));
        }
        if (egRewardState) egRenderRewardCalendar();
        if (egChallenges) egRenderChallenges();
        set('eg-levelup-title', et('levelUpTitle'));
        set('eg-levelup-ok', et('okBtn'));
        set('pf-stats-title', et('profileStats'));
        set('pf-ach-title', et('profileAchievements'));
        set('pf-styles-title', et('profileStyles'));
        set('lb-tournament-title', et('tourneyTitle'));
        set('lb-tournament-resets-label', et('tourneyEndsIn'));
        set('lb-tournament-note', et('tourneyScoreNote'));
        if (window.egRenderTournamentBanner) egRenderTournamentBanner();
        if (window.egRenderSeason && egSeason) egRenderSeason();
        if (window.applyExtrasLang) applyExtrasLang();
    };

    // ===================== Progression: Phase 2 =====================
    // XP & levels, achievements, player profile, card style unlocks

    var egXp = 0;
    var egLevel = 1;
    var egStats = null;
    var egAchievements = {};
    var egHourKey = '';
    var egHourHands = 0;
    var egCardStyle = 'classic';

    var MAX_LEVEL = 50;
    var XP_WIN_BONUS = {
        'Jacks or Better': 5, 'Two Pair': 10, 'Three of a Kind': 15,
        'Straight': 25, 'Flush': 30, 'Full House': 50,
        'Four of a Kind': 100, 'Straight Flush': 250, 'Royal Flush': 500,
        // Deuces Wild extras
        'Five of a Kind': 150, 'Wild Royal Flush': 300, 'Four Deuces': 250,
        // Bonus Poker quad subtypes
        'Four 5s-Ks': 100, 'Four 2s-4s': 120, 'Four Aces': 150
    };

    var CARD_STYLES = [
        { id: 'classic',  level: 0,  name: 'Classic' },
        { id: 'emerald',  level: 5,  name: 'Emerald' },
        { id: 'gold',     level: 10, name: 'Gold' },
        { id: 'sapphire', level: 15, name: 'Sapphire' },
        { id: 'ruby',     level: 20, name: 'Ruby' },
        { id: 'onyx',     level: 30, name: 'Onyx' },
        { id: 'amethyst', level: 40, name: 'Amethyst' },
        { id: 'royal',    level: 50, name: 'Royal' }
    ];