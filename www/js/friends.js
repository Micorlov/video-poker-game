// Friends list — add by referral code, ranked by net profit.
// Everything here is a no-op until the player signs in (window.egUser set).

let friendsList = [];
let friendsListUnsubscribe = null;
let friendScoreUnsubscribers = [];

function cleanupFriendsListeners() {
    if (friendsListUnsubscribe) { friendsListUnsubscribe(); friendsListUnsubscribe = null; }
    friendScoreUnsubscribers.forEach(function(fn) { fn(); });
    friendScoreUnsubscribers = [];
    friendsList = [];
}

function loadFriends() {
    const user = window.egUser;
    if (!user) { cleanupFriendsListeners(); renderFriendsScreen(); renderPlayFriendsWidgets(); return; }

    // Keep the friends-list subscription alive; clean old one first
    if (friendsListUnsubscribe) friendsListUnsubscribe();

    friendsListUnsubscribe = db.collection('users').doc(user.uid).collection('friends')
        .onSnapshot(function(snap) {
            const uids = [];
            snap.forEach(function(d) { uids.push(d.id); });
            if (!uids.length) {
                friendScoreUnsubscribers.forEach(function(fn) { fn(); });
                friendScoreUnsubscribers = [];
                friendsList = [];
                renderFriendsScreen();
                renderPlayFriendsWidgets();
                return;
            }
            setupFriendScoreListeners(uids);
        }, function() { /* silently ignore Firestore errors */ });
}

function setupFriendScoreListeners(uids) {
    // Tear down old per-friend listeners
    friendScoreUnsubscribers.forEach(function(fn) { fn(); });
    friendScoreUnsubscribers = [];
    const scoreMap = {};

    uids.forEach(function(uid) {
        const unsub = db.collection('users').doc(uid)
            .onSnapshot(function(doc) {
                if (!doc.exists) {
                    delete scoreMap[uid];
                } else {
                    const data = doc.data();
                    data.uid = uid;
                    scoreMap[uid] = data;
                }
                friendsList = Object.values(scoreMap)
                    .sort(function(a, b) { return (b.netProfit || 0) - (a.netProfit || 0); });
                renderFriendsScreen();
                renderPlayFriendsWidgets();
            }, function() { /* ignore */ });
        friendScoreUnsubscribers.push(unsub);
    });
}

function addFriendByCode() {
    const user = window.egUser;
    if (!user) { openSignInModal(); return; }
    const input = document.getElementById('friend-code-input');
    const code = (input.value || '').trim().toUpperCase();
    if (!code) return;

    firebaseSafe(function() {
        return db.collection('users').where('referralCode', '==', code).limit(1).get().then(function(snap) {
            if (snap.empty) { showToast('No player found with that code.'); return; }
            const friendDoc = snap.docs[0];
            if (friendDoc.id === user.uid) { showToast('That is your own code!'); return; }
            const friendRef = db.collection('users').doc(user.uid).collection('friends').doc(friendDoc.id);
            return friendRef.get().then(function(existing) {
                if (existing.exists) { showToast('Already in your friends list.'); return; }
                return Promise.all([
                    friendRef.set({ addedAt: firebase.firestore.FieldValue.serverTimestamp() }),
                    db.collection('users').doc(friendDoc.id).collection('friends').doc(user.uid)
                        .set({ addedAt: firebase.firestore.FieldValue.serverTimestamp() })
                ]).then(function() {
                    input.value = '';
                    showToast('Friend added!');
                    loadFriends();
                });
            });
        });
    }, function() { showToast('Could not add friend — try again.'); });
}

function ownNetProfit() {
    return balance - 500;
}

function renderFriendsScreen() {
    const listEl = document.getElementById('friends-list');
    const emptyEl = document.getElementById('friends-empty');
    const codeEl = document.getElementById('own-referral-code');
    const signedOutEl = document.getElementById('friends-signed-out');
    const signedInWrap = document.getElementById('friends-signed-in-wrap');
    if (!listEl) return;

    const user = window.egUser;
    if (signedOutEl) signedOutEl.classList.toggle('hidden', !!user);
    if (signedInWrap) signedInWrap.classList.toggle('hidden', !user);
    if (codeEl) codeEl.textContent = user ? (window.egUserDoc && window.egUserDoc.referralCode) || '—' : '—';
    if (!user) return;
    if (typeof friendsTab !== 'undefined' && friendsTab === 'rooms') renderFriendsRoomsList();

    listEl.innerHTML = '';
    const ranked = friendsList.concat([{ displayName: 'You', netProfit: ownNetProfit(), bestStreak: bestStreak, self: true }])
        .sort(function(a, b) { return (b.netProfit || 0) - (a.netProfit || 0); });
    if (emptyEl) emptyEl.classList.toggle('hidden', friendsList.length > 0);
    ranked.forEach(function(f, i) {
        const row = document.createElement('div');
        row.className = 'friend-row' + (f.self ? ' me' : '');

        const rankEl = document.createElement('span');
        rankEl.className = 'friend-rank';
        rankEl.textContent = String(i + 1);

        const avatarEl = document.createElement('span');
        avatarEl.className = 'friend-avatar';
        avatarEl.textContent = (f.displayName || 'P').charAt(0).toUpperCase();

        const nameEl = document.createElement('span');
        nameEl.className = 'friend-name';
        nameEl.textContent = f.displayName || 'Player';
        if (f.self) {
            const youTag = document.createElement('span');
            youTag.className = 'friend-you-tag';
            youTag.textContent = 'You';
            nameEl.appendChild(youTag);
        }

        const streakEl = document.createElement('span');
        streakEl.className = 'friend-streak';
        streakEl.textContent = '🔥' + (f.bestStreak || 0);

        const scoreEl = document.createElement('span');
        scoreEl.className = 'friend-score';
        const np = f.netProfit || 0;
        scoreEl.textContent = (np >= 0 ? '+' : '') + np;
        scoreEl.classList.add(np > 0 ? 'positive' : np < 0 ? 'negative' : 'zero');

        row.appendChild(rankEl);
        row.appendChild(avatarEl);
        row.appendChild(nameEl);
        row.appendChild(streakEl);
        row.appendChild(scoreEl);
        listEl.appendChild(row);
    });
}

function renderFriendsRoomsList() {
    const listEl = document.getElementById('friends-rooms-list');
    const emptyEl = document.getElementById('friends-rooms-empty');
    if (!listEl) return;
    listEl.innerHTML = '';
    if (emptyEl) emptyEl.classList.toggle('hidden', myRooms.length > 0);
    myRooms.forEach(function(room) {
        const card = document.createElement('div');
        card.className = 'room-card';

        const head = document.createElement('div');
        head.className = 'room-card-head';
        const nameEl = document.createElement('span');
        nameEl.className = 'room-row-name';
        nameEl.textContent = room.name || 'Room';
        head.appendChild(nameEl);

        const meta = document.createElement('div');
        meta.className = 'room-row-sub';
        meta.textContent = (room.memberUids || []).length + ' friends · Stake ' + room.stake;

        const btn = document.createElement('button');
        btn.className = 'btn-primary room-row-btn';
        btn.textContent = 'Enter Table';
        btn.onclick = function() { openRoomDetail(room.id); };

        card.appendChild(head);
        card.appendChild(meta);
        card.appendChild(btn);
        listEl.appendChild(card);
    });
}

function getInviteLink() {
    const user = window.egUser;
    if (!user) return '';
    const code = (window.egUserDoc && window.egUserDoc.referralCode) || '';
    if (!code) return '';
    // Use the Firebase hosting URL as the canonical base
    const base = window.location.origin + window.location.pathname;
    return base + '?ref=' + encodeURIComponent(code);
}

function copyInviteLink() {
    const user = window.egUser;
    if (!user) { openSignInModal(); return; }
    const link = getInviteLink();
    if (!link) { showToast('Could not generate invite link.'); return; }

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(link).then(function() {
            showToast('Invite link copied!');
        }).catch(function() {
            // Fallback
            fallbackCopy(link);
        });
    } else {
        fallbackCopy(link);
    }
}

function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); showToast('Invite link copied!'); } catch (e) { showToast('Could not copy — tap and hold the link.'); }
    document.body.removeChild(ta);
}

function shareViaWhatsApp() {
    var user = window.egUser;
    if (!user) { openSignInModal(); return; }
    var link = getInviteLink();
    if (!link) { showToast('Could not generate invite link.'); return; }

    var name = (user.displayName || 'A friend');
    var text = encodeURIComponent(name + ' wants to play Video Poker with you! Join with this link:\n' + link);
    var waUrl = 'https://wa.me/?text=' + text;

    // Try to open WhatsApp; fall back gracefully
    try {
        window.open(waUrl, '_blank');
    } catch (e) {
        showToast('Could not open WhatsApp.');
    }
}

function handleIncomingInvite() {
    // Called on page load to handle ?ref=CODE deep links
    try {
        var params = new URLSearchParams(window.location.search);
        var refCode = params.get('ref');
        if (!refCode) return;
        refCode = refCode.trim().toUpperCase();
        if (!refCode) return;

        // Clean the URL so we don't re-trigger on refresh
        if (window.history && window.history.replaceState) {
            var url = new URL(window.location);
            url.searchParams.delete('ref');
            window.history.replaceState({}, '', url);
        }

        // Store for after sign-in
        window._pendingInviteCode = refCode;

        // If already signed in, add immediately
        if (window.egUser) {
            addFriendByInviteCode(refCode);
        } else {
            // Prompt sign-in; the auth state listener will pick up _pendingInviteCode
            openSignInModal();
            showToast('Sign in to connect with your friend!');
        }
    } catch (e) { /* ignore — URL parsing shouldn't break the app */ }
}

function addFriendByInviteCode(code) {
    var user = window.egUser;
    if (!user) return;
    firebaseSafe(function() {
        return db.collection('users').where('referralCode', '==', code).limit(1).get().then(function(snap) {
            if (snap.empty) { showToast('No player found with that invite link.'); return; }
            var friendDoc = snap.docs[0];
            if (friendDoc.id === user.uid) { showToast('That\'s your own invite link!'); return; }
            var friendRef = db.collection('users').doc(user.uid).collection('friends').doc(friendDoc.id);
            return friendRef.get().then(function(existing) {
                if (existing.exists) { showToast('Already in your friends list.'); return; }
                return Promise.all([
                    friendRef.set({ addedAt: firebase.firestore.FieldValue.serverTimestamp() }),
                    db.collection('users').doc(friendDoc.id).collection('friends').doc(user.uid)
                        .set({ addedAt: firebase.firestore.FieldValue.serverTimestamp() })
                ]).then(function() {
                    showToast('Friend added!');
                    loadFriends();
                });
            });
        });
    }, function() { showToast('Could not add friend — try again.'); });
}

function renderPlayFriendsWidgets() {
    const card = document.getElementById('vs-friends-card');
    const signInPrompt = document.getElementById('friends-signin-prompt');
    if (!card) return;
    const user = window.egUser;

    if (!user) {
        card.classList.add('hidden');
        if (signInPrompt) signInPrompt.classList.remove('hidden');
        return;
    }
    if (signInPrompt) signInPrompt.classList.add('hidden');

    if (!friendsList.length) {
        card.classList.add('hidden');
        return;
    }
    card.classList.remove('hidden');

    const own = ownNetProfit();
    const ranked = friendsList.concat([{ displayName: 'You', netProfit: own, self: true }])
        .sort(function(a, b) { return (b.netProfit || 0) - (a.netProfit || 0); });
    const ownRank = ranked.findIndex(function(p) { return p.self; }) + 1;
    const leader = ranked[0];

    document.getElementById('vs-friends-rank').textContent = '#' + ownRank;
    const detailEl = document.getElementById('vs-friends-detail');
    if (leader.self) {
        detailEl.textContent = 'You\'re leading the pack!';
    } else {
        const gap = (leader.netProfit || 0) - own;
        detailEl.textContent = (leader.displayName || 'A friend') + ' leads by ' + gap;
    }
}
