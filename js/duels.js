// ===================== Head-to-head duels (Phase 8.2) =====================
// Best-of-10 vs a friend: both players get the SAME shuffled decks (seeded),
// highest net profit after 10 hands wins +100 credits.

    Object.assign(ENGAGE_I18N.en, {
        duelSentToast: '⚔️ Challenge sent to {name} — waiting for them to accept…',
        duelInviteTitle: '⚔️ Duel Challenge!',
        duelInviteMsg: '{name} challenges you to a best-of-10 duel. Same cards, best player wins 100 credits!',
        duelAccept: 'Accept Duel', duelDecline: 'Decline',
        duelBanner: '⚔️ Duel vs {name} · You: {me} · Them: {them} · Hand {h}/10',
        duelWaiting: '⚔️ Duel vs {name} · You finished ({me}) — waiting for them…',
        duelWon: '🏆 You won the duel vs {name}! +100 credits',
        duelLost: '😤 You lost the duel vs {name}. Rematch?',
        duelTie: '🤝 The duel vs {name} ended in a tie!',
        duelQuit: 'Forfeit'
    });

    var DUEL_HANDS = 10;
    var DUEL_REWARD = 100;
    var duelActive = null;      // { id, data }
    var duelUnsub = null;
    var duelInviteUnsub = null;
    var duelPendingInvite = null;

    function mulberry32(seed) {
        var a = seed >>> 0;
        return function() {
            a |= 0; a = a + 0x6D2B79F5 | 0;
            var t = Math.imul(a ^ a >>> 15, 1 | a);
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }

    function seededShuffle(arr, seed) {
        var rand = mulberry32(seed);
        for (var i = arr.length - 1; i > 0; i--) {
            var j = Math.floor(rand() * (i + 1));
            var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
        }
    }

    window.initDuels = function(user) {
        // Invites addressed to me
        duelInviteUnsub = db.collection('duels')
            .where('opponentUid', '==', user.uid)
            .where('status', '==', 'open')
            .onSnapshot(function(snap) {
                if (!snap.empty && !duelActive) showDuelInvite(snap.docs[0]);
            }, function(err) { console.error('duel invites:', err); });
        // Resume an active duel (as either side)
        ['challengerUid', 'opponentUid'].forEach(function(field) {
            db.collection('duels')
                .where(field, '==', user.uid)
                .where('status', '==', 'active')
                .get().then(function(snap) {
                    if (!snap.empty && !duelActive) attachDuel(snap.docs[0].id);
                }).catch(function(err) { console.error('duel resume:', err); });
        });
    };

    window.teardownDuels = function() {
        if (duelUnsub) { duelUnsub(); duelUnsub = null; }
        if (duelInviteUnsub) { duelInviteUnsub(); duelInviteUnsub = null; }
        duelActive = null;
        duelPendingInvite = null;
        renderDuelBanner();
    };

    // --- challenge flow ---
    window.duelChallenge = function(friend) {
        var user = auth.currentUser;
        if (!user || duelActive) return;
        var p = {};
        p[user.uid] = { name: user.displayName || '', net: 0, hands: 0, done: false };
        db.collection('duels').add({
            challengerUid: user.uid,
            challengerName: user.displayName || '',
            opponentUid: friend.uid,
            opponentName: friend.displayName || '',
            variant: gameVariant,
            seed: Math.floor(Math.random() * 2147483647),
            status: 'open',
            p: p,
            winnerUid: '',
            rewardClaimed: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(function(ref) {
            egToast(et('duelSentToast').replace('{name}', friend.displayName || '?'));
            attachDuel(ref.id);
        }).catch(function(err) { console.error('duel create:', err); });
    };

    function showDuelInvite(doc) {
        duelPendingInvite = doc;
        var d = doc.data();
        document.getElementById('duel-invite-title').textContent = et('duelInviteTitle');
        document.getElementById('duel-invite-msg').textContent =
            et('duelInviteMsg').replace('{name}', d.challengerName || '?');
        document.getElementById('duel-accept-btn').textContent = et('duelAccept');
        document.getElementById('duel-decline-btn').textContent = et('duelDecline');
        document.getElementById('duel-invite-modal').classList.remove('eg-hidden');
    }

    window.duelAcceptInvite = function() {
        var user = auth.currentUser;
        var doc = duelPendingInvite;
        document.getElementById('duel-invite-modal').classList.add('eg-hidden');
        if (!user || !doc) return;
        duelPendingInvite = null;
        var update = { status: 'active' };
        update['p.' + user.uid] = { name: user.displayName || '', net: 0, hands: 0, done: false };
        doc.ref.update(update).then(function() {
            attachDuel(doc.id);
        }).catch(function(err) { console.error('duel accept:', err); });
    };

    window.duelDeclineInvite = function() {
        var doc = duelPendingInvite;
        duelPendingInvite = null;
        document.getElementById('duel-invite-modal').classList.add('eg-hidden');
        if (doc) doc.ref.update({ status: 'declined' }).catch(function(err) { console.error('duel decline:', err); });
    };

    // --- live duel state ---
    function attachDuel(id) {
        if (duelUnsub) duelUnsub();
        duelUnsub = db.collection('duels').doc(id).onSnapshot(function(doc) {
            if (!doc.exists) { duelActive = null; renderDuelBanner(); return; }
            var d = doc.data();
            if (d.status === 'declined' || d.status === 'done') {
                if (d.status === 'done') handleDuelEnd(doc);
                duelActive = null;
                if (duelUnsub) { duelUnsub(); duelUnsub = null; }
                renderDuelBanner();
                return;
            }
            duelActive = { id: doc.id, data: d };
            if (d.status === 'active') {
                // Duel constraints: single hand, challenger's variant, seeded decks
                if (multiHandCount !== 1) setMultiHand(1);
                if (d.variant && gameVariant !== d.variant && PAYTABLES[d.variant]) {
                    gameVariant = d.variant;
                    currentPayouts = Object.assign({}, basePayouts());
                    updateVariantUI();
                    renderPayouts(TRANSLATIONS[currentLang]);
                }
                checkDuelCompletion(doc);
            }
            renderDuelBanner();
        }, function(err) { console.error('duel listen:', err); });
    }

    function myDuelEntry() {
        var user = auth.currentUser;
        if (!user || !duelActive) return null;
        return (duelActive.data.p || {})[user.uid] || null;
    }

    function theirDuelEntry() {
        var user = auth.currentUser;
        if (!user || !duelActive) return null;
        var p = duelActive.data.p || {};
        var otherUid = Object.keys(p).find(function(uid) { return uid !== user.uid; });
        return otherUid ? p[otherUid] : null;
    }

    // Called by deal(): seeds the deck for the current duel hand. Returns true if seeded.
    window.vpDuelShuffle = function(deck) {
        var me = myDuelEntry();
        if (!duelActive || duelActive.data.status !== 'active' || !me || me.done) return false;
        seededShuffle(deck, duelActive.data.seed + me.hands * 7919);
        return true;
    };

    // Called by draw() after each hand
    window.vpDuelOnHand = function(win, totalBet) {
        var user = auth.currentUser;
        var me = myDuelEntry();
        if (!duelActive || duelActive.data.status !== 'active' || !me || me.done) return;
        me.net += win - totalBet;
        me.hands++;
        if (me.hands >= DUEL_HANDS) me.done = true;
        var update = {};
        update['p.' + user.uid] = me;
        db.collection('duels').doc(duelActive.id).update(update)
            .catch(function(err) { console.error('duel hand save:', err); });
        renderDuelBanner();
    };

    function checkDuelCompletion(doc) {
        var user = auth.currentUser;
        var d = doc.data();
        var entries = Object.keys(d.p || {}).map(function(uid) {
            return { uid: uid, e: d.p[uid] };
        });
        if (entries.length < 2 || !entries.every(function(x) { return x.e.done; })) return;
        // Single writer: only the challenger settles the duel
        if (user.uid !== d.challengerUid || d.winnerUid !== '') {
            if (d.winnerUid !== '') return; // already settled, status flips to done next write
            return;
        }
        entries.sort(function(a, b) { return b.e.net - a.e.net; });
        var winnerUid = entries[0].e.net === entries[1].e.net ? 'tie' : entries[0].uid;
        doc.ref.update({ winnerUid: winnerUid, status: 'done' })
            .catch(function(err) { console.error('duel settle:', err); });
    }

    function handleDuelEnd(doc) {
        var user = auth.currentUser;
        var d = doc.data();
        if (!user || !d.winnerUid) return;
        var otherName = user.uid === d.challengerUid ? (d.opponentName || '?') : (d.challengerName || '?');
        if (d.winnerUid === 'tie') {
            egToast(et('duelTie').replace('{name}', otherName));
        } else if (d.winnerUid === user.uid) {
            if (!d.rewardClaimed) {
                doc.ref.update({ rewardClaimed: true }).then(function() {
                    egAddCredits(DUEL_REWARD);
                    egConfetti();
                    saveGameState();
                }).catch(function(err) { console.error('duel reward:', err); });
            }
            egToast(et('duelWon').replace('{name}', otherName));
        } else {
            egToast(et('duelLost').replace('{name}', otherName));
        }
    }

    window.duelForfeit = function() {
        var user = auth.currentUser;
        var me = myDuelEntry();
        if (!duelActive || !me) return;
        me.done = true;
        me.hands = DUEL_HANDS;
        var update = {};
        update['p.' + user.uid] = me;
        db.collection('duels').doc(duelActive.id).update(update)
            .catch(function(err) { console.error('duel forfeit:', err); });
    };

    function renderDuelBanner() {
        var el = document.getElementById('duel-banner');
        if (!el) return;
        var me = myDuelEntry();
        var them = theirDuelEntry();
        if (!duelActive || duelActive.data.status !== 'active' || !me) {
            el.classList.add('eg-hidden');
            el.innerHTML = '';
            return;
        }
        var user = auth.currentUser;
        var d = duelActive.data;
        var otherName = user.uid === d.challengerUid ? (d.opponentName || '?') : (d.challengerName || '?');
        var key = me.done ? 'duelWaiting' : 'duelBanner';
        el.innerHTML = escapeHtml(
            et(key).replace('{name}', otherName)
                   .replace('{me}', (me.net >= 0 ? '+' : '') + me.net)
                   .replace('{them}', them ? (them.net >= 0 ? '+' : '') + them.net : '—')
                   .replace('{h}', Math.min(me.hands + 1, DUEL_HANDS))) +
            ' <button class="room-mini-btn" onclick="duelForfeit()">' + et('duelQuit') + '</button>';
        el.classList.remove('eg-hidden');
    }
