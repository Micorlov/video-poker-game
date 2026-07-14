function egToast(text) {
        var el = document.getElementById('eg-toast');
        if (!el) {
            el = document.createElement('div');
            el.id = 'eg-toast';
            el.className = 'eg-toast';
            document.body.appendChild(el);
        }
        el.textContent = text;
        el.classList.remove('show');
        void el.offsetWidth;
        el.classList.add('show');
        setTimeout(function() { el.classList.remove('show'); }, 2500);
    }

    function egConfetti() {
        var colors = ['#ffd700', '#4ade80', '#ff6b6b', '#8a2be2', '#ffffff', '#ffaa00'];
        for (var i = 0; i < 28; i++) {
            var p = document.createElement('div');
            p.className = 'confetti-piece';
            p.style.left = (Math.random() * 100) + 'vw';
            p.style.background = colors[Math.floor(Math.random() * colors.length)];
            p.style.animationDuration = (1.2 + Math.random() * 1.3) + 's';
            p.style.animationDelay = (Math.random() * 0.4) + 's';
            document.body.appendChild(p);
            setTimeout(function(el) { return function() { el.remove(); }; }(p), 3200);
        }
    }

    function egAddCredits(amount) {
        var oldBalance = balance;
        balance += amount;
        playSound('coin');
        animateBalance(oldBalance, balance, 800);
    }

    // --- user profile (best streak + comeback + progression) ---
    function egLoadUserProfile(user) {
        db.collection('users').doc(user.uid).get().then(function(doc) {
            var data = doc.exists ? doc.data() : {};
            bestStreak = data.bestStreak || 0;
            document.getElementById('stat-best-streak-value').textContent = '🔥 ' + bestStreak;

            egXp = data.xp || 0;
            egLevel = Math.max(data.level || 1, egLevelFromXp(egXp));
            egStats = {
                totalHands: data.totalHands || 0,
                totalWins: data.totalWins || 0,
                bestHand: data.bestHand || null,
                bestHandRank: data.bestHandRank || 0,
                challengesCompleted: data.challengesCompleted || 0,
                firstSeen: data.firstSeen || null,
                biggestWin: data.biggestWin || 0,
                handCounts: data.handCounts || {}
            };
            if (window.egSetAvatarState) egSetAvatarState(data);
            egApplyCardStyle(data.cardStyle || 'classic');
            if (data.tableTheme && window.vpSelectTheme) vpSelectTheme(data.tableTheme);
            egRenderXpBar();
            if (window.initTutorial) initTutorial(user, data);

            if (data.bonusCredits && data.bonusCredits > 0) {
                var bonus = data.bonusCredits;
                egAddCredits(bonus);
                egConfetti();
                egToast('🎁 Referral bonus! You received ' + bonus + ' credits.');
                saveGameState();
                db.collection('users').doc(user.uid).update({
                    bonusCredits: 0
                });
            }

            var refCount = data.referralCount || 0;
            if (refCount >= 3) {
                egUnlock('invite3');
            }

            db.collection('users').doc(user.uid).collection('achievements').get().then(function(snap) {
                snap.forEach(function(d) { egAchievements[d.id] = true; });
                egUpdateAchCount();
            }).catch(function(err) { console.error('achievements load:', err); });

            var last = data.lastActiveDate && typeof data.lastActiveDate.toDate === 'function'
                ? data.lastActiveDate.toDate().getTime() : null;
            if (last) {
                var gap = Date.now() - last;
                if (gap > EG_COMEBACK_EPIC_MS) egComebackAmount = EG_COMEBACK_EPIC_CREDITS;
                else if (gap > EG_COMEBACK_LONG_MS) egComebackAmount = EG_COMEBACK_LONG_CREDITS;
                else if (gap > EG_COMEBACK_SHORT_MS) egComebackAmount = EG_COMEBACK_SHORT_CREDITS;
            }
            // Refresh presence — also guarantees one claim per absence period
            return db.collection('users').doc(user.uid).set({
                lastActiveDate: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        }).then(function() {
            if (egComebackAmount > 0) {
                document.getElementById('eg-comeback-amount').textContent = '+' + egComebackAmount;
                document.getElementById('eg-comeback-claim').textContent =
                    et('comebackBtn').replace('{n}', egComebackAmount);
                egQueueModal('eg-comeback-modal');
            }
        }).catch(function(err) { console.error('egLoadUserProfile:', err); });
    }

    function egClaimComeback() {
        if (!egUser || egComebackAmount <= 0) return;
        var amount = egComebackAmount;
        egComebackAmount = 0;
        egAddCredits(amount);
        egConfetti();
        egToast(et('rewardToast').replace('{n}', amount));
        db.collection('users').doc(egUser.uid).set({
            comebackClaimed: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true }).catch(function(err) { console.error('comeback claim:', err); });
        egCloseModal('eg-comeback-modal');
    }

    // --- daily login reward ---