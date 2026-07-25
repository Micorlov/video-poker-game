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
            const viaLinkMap = {};
            snap.forEach(function(d) {
                uids.push(d.id);
                if (d.data().viaCode) viaLinkMap[d.id] = true;
            });
            if (!uids.length) {
                friendScoreUnsubscribers.forEach(function(fn) { fn(); });
                friendScoreUnsubscribers = [];
                friendsList = [];
                renderFriendsScreen();
                renderPlayFriendsWidgets();
                return;
            }
            setupFriendScoreListeners(uids, viaLinkMap);
        }, function() { /* silently ignore Firestore errors */ });
}

function setupFriendScoreListeners(uids, viaLinkMap) {
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
                    data.viaLink = !!(viaLinkMap && viaLinkMap[uid]);
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

// Pure: takes the code directly and returns a Promise<boolean success>, so it
// can be shared by any input field — the Friends screen's own field and the
// Invite Friends sheet's field below both delegate to this.
function addFriendByCode(code) {
    const user = window.egUser;
    if (!user) { openSignInModal(); return Promise.resolve(false); }
    code = (code || '').trim().toUpperCase();
    if (!code) return Promise.resolve(false);

    return firebaseSafe(function() {
        return db.collection('users').where('referralCode', '==', code).limit(1).get().then(function(snap) {
            if (snap.empty) { showToast('No player found with that code.'); return false; }
            const friendDoc = snap.docs[0];
            if (friendDoc.id === user.uid) { showToast('That is your own code!'); return false; }
            const friendRef = db.collection('users').doc(user.uid).collection('friends').doc(friendDoc.id);
            return friendRef.get().then(function(existing) {
                if (existing.exists) { showToast('Already in your friends list.'); return false; }
                return Promise.all([
                    friendRef.set({ addedAt: firebase.firestore.FieldValue.serverTimestamp() }),
                    db.collection('users').doc(friendDoc.id).collection('friends').doc(user.uid)
                        .set({ addedAt: firebase.firestore.FieldValue.serverTimestamp() })
                ]).then(function() {
                    showToast('Friend added!');
                    loadFriends();
                    return true;
                });
            });
        });
    }, function() { showToast('Could not add friend — try again.'); }) || Promise.resolve(false);
}

// DOM entry point for the Friends screen's own "Friend code…" field.
function submitFriendCodeInput() {
    const input = document.getElementById('friend-code-input');
    if (!input) return;
    const code = (input.value || '').trim().toUpperCase();
    if (!code) return;
    addFriendByCode(code).then(function(ok) { if (ok) input.value = ''; });
}

// DOM entry point for the Invite Friends sheet's "Got a code from a friend?" field.
function submitInviteSheetFriendCode() {
    const input = document.getElementById('invite-sheet-code-input');
    if (!input) return;
    const code = (input.value || '').trim().toUpperCase();
    if (!code) return;
    addFriendByCode(code).then(function(ok) { if (ok) input.value = ''; });
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
    const ranked = friendsList.concat([{ displayName: 'You', netProfit: ownNetProfit(), bestStreak: bestStreak, self: true, lastSeen: Date.now(), country: (typeof getCountry === 'function' ? getCountry() : '--') }])
        .sort(function(a, b) { return (b.netProfit || 0) - (a.netProfit || 0); });
    if (emptyEl) emptyEl.classList.toggle('hidden', friendsList.length > 0);
    ranked.forEach(function(f, i) {
        const row = document.createElement('div');
        row.className = 'friend-leaderboard-row' + (f.self ? ' me' : '');

        const rankEl = document.createElement('span');
        rankEl.className = 'friend-lb-rank';
        rankEl.textContent = String(i + 1);

        const avatarWrap = document.createElement('span');
        avatarWrap.className = 'friend-lb-avatar-wrap';
        const avatarEl = document.createElement('span');
        avatarEl.className = 'friend-lb-avatar';
        avatarEl.textContent = (f.displayName || 'P').charAt(0).toUpperCase();
        const dot = document.createElement('span');
        dot.className = 'online-dot' + ((typeof isOnline === 'function' && isOnline(f.lastSeen)) ? '' : ' offline');
        avatarWrap.appendChild(avatarEl);
        avatarWrap.appendChild(dot);

        const nameEl = document.createElement('span');
        nameEl.className = 'friend-lb-name';
        nameEl.textContent = f.displayName || 'Player';
        if (f.country) {
            const chip = document.createElement('span');
            chip.className = 'country-flag';
            chip.textContent = countryToFlag(f.country);
            nameEl.appendChild(chip);
        }
        if (f.viaLink) {
            const linkChip = document.createElement('span');
            linkChip.className = 'link-chip';
            linkChip.textContent = '🔗';
            linkChip.title = 'Connected via invite link';
            nameEl.appendChild(linkChip);
        }
        if (f.self) {
            const youTag = document.createElement('span');
            youTag.className = 'friend-you-tag';
            youTag.textContent = 'You';
            nameEl.appendChild(youTag);
        }

        const streakEl = document.createElement('span');
        streakEl.className = 'friend-lb-streak';
        streakEl.textContent = '🔥' + (f.bestStreak || 0);

        const scoreEl = document.createElement('span');
        scoreEl.className = 'friend-lb-net';
        const np = f.netProfit || 0;
        scoreEl.textContent = (np >= 0 ? '+' : '') + np;
        scoreEl.classList.add(np > 0 ? 'positive' : np < 0 ? 'negative' : 'zero');

        row.appendChild(rankEl);
        row.appendChild(avatarWrap);
        row.appendChild(nameEl);
        row.appendChild(streakEl);
        row.appendChild(scoreEl);
        listEl.appendChild(row);
    });
}

// renderFriendsRoomsList moved to js/rooms.js (Phase 2)

function getInviteLink() {
    const user = window.egUser;
    if (!user) return '';
    const code = (window.egUserDoc && window.egUserDoc.referralCode) || '';
    if (!code) return '';
    // Use the Firebase hosting URL as the canonical base
    const base = getShareBaseUrl();
    return base + '?ref=' + encodeURIComponent(code);
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
            var ownerUid = snap.docs[0].id;
            if (ownerUid === user.uid) { showToast('That\'s your own invite link!'); return; }

            // Every joiner via the same link is added to that link's group, so
            // the group becomes one fully-connected friend circle — not just
            // spokes back to the link owner.
            var groupRef = db.collection('referralGroups').doc(code);
            return groupRef.get().then(function(groupDoc) {
                var members = groupDoc.exists ? (groupDoc.data().members || [ownerUid]) : [ownerUid];
                if (members.indexOf(user.uid) !== -1) { showToast('Already connected via this link.'); return; }

                var newFriendUids = members.filter(function(uid) { return uid !== user.uid; });
                return Promise.all(newFriendUids.map(function(friendUid) {
                    return db.collection('users').doc(user.uid).collection('friends').doc(friendUid).get()
                        .then(function(existing) {
                            if (existing.exists) return null;
                            // joinerUid marks which side of the edge is the NEW
                            // circle member, so scripts/push/friends.js can notify
                            // every existing member about the joiner without also
                            // notifying the joiner about each of them.
                            var edge = {
                                addedAt: firebase.firestore.FieldValue.serverTimestamp(),
                                viaCode: code,
                                joinerUid: user.uid
                            };
                            return Promise.all([
                                db.collection('users').doc(user.uid).collection('friends').doc(friendUid).set(edge),
                                db.collection('users').doc(friendUid).collection('friends').doc(user.uid).set(edge)
                            ]);
                        });
                })).then(function() {
                    return groupRef.set({ members: members.concat([user.uid]) }, { merge: true });
                }).then(function() {
                    showToast(newFriendUids.length > 1
                        ? 'Connected with ' + newFriendUids.length + ' friends via this link!'
                        : 'Friend added!');
                    loadFriends();
                });
            });
        });
    }, function() { showToast('Could not add friend — try again.'); });
}

function renderPlayFriendsWidgets() {
    const user = window.egUser;

    // Render stories row (always)
    if (window.renderStoriesRow) renderStoriesRow();

    // Render nearby leaderboard panel
    renderNearbyPanel(user);

    // Champions panel is handled by champions.js subscription

    if (window.renderRoomsList) renderRoomsList();
}

function renderNearbyPanel(user) {
    const bodyEl = document.getElementById('nearby-body');
    const headerEl = document.getElementById('nearby-panel-header');
    const promptEl = document.getElementById('nearby-signin-prompt');
    if (!bodyEl) return;

    if (!user) {
        if (promptEl) promptEl.classList.remove('hidden');
        bodyEl.innerHTML = '';
        if (headerEl) headerEl.textContent = '#— · —';
        return;
    }
    if (promptEl) promptEl.classList.add('hidden');

    if (!friendsList.length) {
        bodyEl.innerHTML = '';
        if (headerEl) headerEl.textContent = '#— · —';
        return;
    }

    const own = ownNetProfit();
    const ranked = friendsList.concat([{ displayName: 'You', netProfit: own, self: true, lastSeen: Date.now(), country: (typeof getCountry === 'function' ? getCountry() : '--') }])
        .sort(function(a, b) { return (b.netProfit || 0) - (a.netProfit || 0); });
    const ownRank = ranked.findIndex(function(p) { return p.self; }) + 1;
    const leader = ranked[0];

    // Header: "#myRank · leader leads by X"
    if (leader.self) {
        headerEl.textContent = '#' + ownRank + ' · You\'re #1!';
    } else {
        const gap = (leader.netProfit || 0) - own;
        headerEl.textContent = '#' + ownRank + ' · ' + (leader.displayName || 'Leader') + ' leads by ' + gap;
    }

    // Body: show user's row + up to 4 surrounding friends (5 rows total)
    bodyEl.innerHTML = '';
    const ownIdx = ranked.findIndex(function(p) { return p.self; });
    const startIdx = Math.max(0, ownIdx - 4);
    const visible = ranked.slice(startIdx, Math.min(ranked.length, startIdx + 5));

    visible.forEach(function(f, vi) {
        const globalRank = startIdx + vi + 1;
        const row = document.createElement('div');
        row.className = 'nearby-row' + (f.self ? ' me' : '');

        row.innerHTML =
            '<span class="nearby-rank">' + globalRank + '</span>' +
            '<span class="nearby-avatar-wrap">' +
                '<span class="nearby-avatar">' + (f.displayName || 'P').charAt(0).toUpperCase() + '</span>' +
                '<span class="online-dot' + ((typeof isOnline === 'function' && isOnline(f.lastSeen)) ? '' : ' offline') + '"></span>' +
            '</span>' +
            '<span class="nearby-name">' + (f.displayName || 'Player') +
                (f.country ? '<span class="country-flag">' + countryToFlag(f.country) + '</span>' : '') +
                (f.viaLink ? '<span class="link-chip" title="Connected via invite link">🔗</span>' : '') +
            '</span>' +
            '<span class="nearby-net ' + ((f.netProfit || 0) > 0 ? 'positive' : (f.netProfit || 0) < 0 ? 'negative' : 'zero') + '">' +
                ((f.netProfit || 0) >= 0 ? '+' : '') + (f.netProfit || 0) +
            '</span>';

        bodyEl.appendChild(row);
    });
}
