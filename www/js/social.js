// ===================== Friends list + gift credits (Phase 8.1 / 8.3) =====================

    Object.assign(ENGAGE_I18N.en, {
        friendsTitle: '👥 Friends',
        friendsEmpty: 'Add friends by their referral code — find yours in your profile.',
        friendAddPh: 'Friend code…', friendAddBtn: 'Add',
        friendAdded: '✅ {name} added as a friend!',
        friendNotFound: 'No player found with that code.',
        friendSelf: 'That is your own code!',
        friendDup: 'Already in your friends list.',
        giftTitle: '🎁 Send a Gift', giftSub: 'Send credits to {name}',
        giftSent: '🎁 You sent {n} credits to {name}!',
        giftLimit: 'Daily gift limit reached ({n} credits per day).',
        giftReceived: '🎁 {name} sent you {n} credits!',
        challengeBtn: '⚔️', giftBtn: '🎁',
        online: 'online', offlineLastSeen: 'last seen {t}'
    });

    var GIFT_AMOUNTS = [25, 50, 100];
    var GIFT_DAILY_CAP = 200;
    var ONLINE_WINDOW_MS = 5 * 60 * 1000;

    var socialFriends = [];          // [{uid, displayName, ...userDocData}]
    var socialGiftState = { dayKey: '', sent: 0 };
    var socialGiftTarget = null;

    window.initSocial = function(user) {
        loadFriends(user);
        claimPendingGifts(user);
        db.collection('users').doc(user.uid).get().then(function(doc) {
            var d = doc.exists ? doc.data() : {};
            socialGiftState = {
                dayKey: d.giftDayKey === getDayKey() ? d.giftDayKey : getDayKey(),
                sent: d.giftDayKey === getDayKey() ? (d.giftSent || 0) : 0
            };
        }).catch(function(err) { console.error('gift state load:', err); });
    };

    window.teardownSocial = function() {
        socialFriends = [];
        socialGiftTarget = null;
        renderFriends();
    };

    function loadFriends(user) {
        db.collection('users').doc(user.uid).collection('friends').get().then(function(snap) {
            var uids = [];
            snap.forEach(function(d) { uids.push(d.id); });
            if (!uids.length) { socialFriends = []; renderFriends(); return; }
            // Fetch each friend's live user doc for level / presence / avatar
            return Promise.all(uids.map(function(uid) {
                return db.collection('users').doc(uid).get().catch(function() { return null; });
            })).then(function(docs) {
                socialFriends = docs
                    .filter(function(d) { return d && d.exists; })
                    .map(function(d) { var data = d.data(); data.uid = d.id; return data; });
                renderFriends();
            });
        }).catch(function(err) { console.error('friends load:', err); });
    }

    function friendIsOnline(f) {
        var last = f.lastActiveDate && typeof f.lastActiveDate.toDate === 'function'
            ? f.lastActiveDate.toDate().getTime() : 0;
        return Date.now() - last < ONLINE_WINDOW_MS;
    }

    function renderFriends() {
        var listEl = document.getElementById('friends-list');
        var emptyEl = document.getElementById('friends-empty');
        if (!listEl) return;
        listEl.innerHTML = '';
        var hasFriends = socialFriends.length > 0;
        if (emptyEl) {
            emptyEl.style.display = hasFriends ? 'none' : '';
            emptyEl.textContent = et('friendsEmpty');
        }
        socialFriends
            .slice()
            .sort(function(a, b) { return friendIsOnline(b) - friendIsOnline(a); })
            .forEach(function(f) {
                var row = document.createElement('div');
                row.className = 'friend-row';
                var vipClass = window.vpVipClass ? vpVipClass(f.level || 1) : '';
                row.innerHTML =
                    '<span class="friend-status ' + (friendIsOnline(f) ? 'on' : 'off') + '"></span>' +
                    '<span class="friend-avatar ' + vipClass + '">' + (window.lbAvatarHtml ? lbAvatarHtml(f) : '') + '</span>' +
                    '<span class="friend-name" data-uid="' + escapeHtml(f.uid) + '">' + escapeHtml(f.displayName || '?') + '</span>' +
                    '<span class="lvl-badge">' + (f.level || 1) + '</span>' +
                    '<span class="friend-actions">' +
                        '<button class="friend-btn" title="Send gift" data-act="gift" data-uid="' + escapeHtml(f.uid) + '">🎁</button>' +
                        '<button class="friend-btn" title="Challenge to a duel" data-act="duel" data-uid="' + escapeHtml(f.uid) + '">⚔️</button>' +
                    '</span>';
                listEl.appendChild(row);
            });
        listEl.onclick = function(e) {
            var btn = e.target.closest('.friend-btn');
            if (btn) {
                var f = socialFriends.find(function(x) { return x.uid === btn.dataset.uid; });
                if (!f) return;
                if (btn.dataset.act === 'gift') openGiftModal(f);
                if (btn.dataset.act === 'duel' && window.duelChallenge) duelChallenge(f);
                return;
            }
            var name = e.target.closest('.friend-name');
            if (name && window.egOpenProfile) egOpenProfile(name.dataset.uid);
        };
    }

    window.addFriendByCode = function() {
        var user = auth.currentUser;
        var input = document.getElementById('friend-code-input');
        if (!user || !input) return;
        var code = input.value.trim().toUpperCase();
        if (!code) return;
        db.collection('users').where('referralCode', '==', code).limit(1).get().then(function(snap) {
            if (snap.empty) { egToast('❌ ' + et('friendNotFound')); return; }
            var doc = snap.docs[0];
            if (doc.id === user.uid) { egToast('🙃 ' + et('friendSelf')); return; }
            if (socialFriends.some(function(f) { return f.uid === doc.id; })) {
                egToast('ℹ️ ' + et('friendDup'));
                return;
            }
            var d = doc.data();
            return db.collection('users').doc(user.uid).collection('friends').doc(doc.id).set({
                uid: doc.id,
                displayName: d.displayName || '',
                addedAt: firebase.firestore.FieldValue.serverTimestamp()
            }).then(function() {
                input.value = '';
                egToast(et('friendAdded').replace('{name}', d.displayName || '?'));
                loadFriends(user);
            });
        }).catch(function(err) { console.error('add friend:', err); });
    };

    window.refreshFriends = function() {
        var user = auth.currentUser;
        if (user) loadFriends(user);
    };

    // --- gifts ---
    function openGiftModal(friend) {
        socialGiftTarget = friend;
        document.getElementById('gift-title').textContent = et('giftTitle');
        document.getElementById('gift-sub').textContent =
            et('giftSub').replace('{name}', friend.displayName || '?');
        var wrap = document.getElementById('gift-amounts');
        wrap.innerHTML = '';
        GIFT_AMOUNTS.forEach(function(n) {
            var btn = document.createElement('button');
            btn.className = 'eg-claim-btn gift-amount-btn';
            btn.textContent = '🎁 ' + n;
            btn.onclick = function() { sendGift(n); };
            wrap.appendChild(btn);
        });
        document.getElementById('eg-gift-modal').classList.remove('eg-hidden');
    }

    window.closeGiftModal = function() {
        document.getElementById('eg-gift-modal').classList.add('eg-hidden');
        socialGiftTarget = null;
    };

    function sendGift(amount) {
        var user = auth.currentUser;
        var friend = socialGiftTarget;
        if (!user || !friend) return;
        if (socialGiftState.dayKey !== getDayKey()) {
            socialGiftState = { dayKey: getDayKey(), sent: 0 };
        }
        if (socialGiftState.sent + amount > GIFT_DAILY_CAP) {
            egToast('⛔ ' + et('giftLimit').replace('{n}', GIFT_DAILY_CAP));
            return;
        }
        socialGiftState.sent += amount;
        db.collection('gifts').add({
            fromUid: user.uid,
            fromName: user.displayName || '',
            toUid: friend.uid,
            amount: amount,
            dayKey: getDayKey(),
            claimed: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(function() {
            return db.collection('users').doc(user.uid).set({
                giftDayKey: socialGiftState.dayKey,
                giftSent: socialGiftState.sent
            }, { merge: true });
        }).then(function() {
            egToast(et('giftSent').replace('{n}', amount).replace('{name}', friend.displayName || '?'));
            closeGiftModal();
        }).catch(function(err) { console.error('send gift:', err); });
    }

    function claimPendingGifts(user) {
        db.collection('gifts')
            .where('toUid', '==', user.uid)
            .where('claimed', '==', false)
            .get().then(function(snap) {
                snap.forEach(function(doc) {
                    var g = doc.data();
                    doc.ref.update({ claimed: true }).then(function() {
                        egAddCredits(g.amount);
                        egConfetti();
                        egToast(et('giftReceived')
                            .replace('{name}', g.fromName || '?')
                            .replace('{n}', g.amount));
                        saveGameState();
                    }).catch(function(err) { console.error('gift claim:', err); });
                });
            }).catch(function(err) { console.error('gifts query:', err); });
    }
