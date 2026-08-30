// Simple private poker rooms — a room is just a shared, code-joinable
// net-profit leaderboard. No chat, no reactions, no reset cadence.
// Phase 2: adds capacity, status derivation, inline creation, share sheet.

let myRooms = [];
let activeRoomId = null;
let roomDetailUnsubscribe = null;
let inlineStake = 10;

// Room invites (roomInvites collection): picker state on the sender side,
// live incoming-invite list on the recipient side.
let roomInvitePickerRoomId = null;
let roomInviteSelection = {};
let roomInviteAlreadySent = {};
let incomingRoomInvites = [];
let roomInvitesUnsubscribe = null;

function getRoomStatus(room) {
    // A room is "playing" if it has more than 1 member; otherwise "open"
    const count = (room.memberUids || []).length;
    return count > 1 ? 'playing' : 'open';
}

function pushNetProfit() {
    const user = window.egUser;
    if (!user) return;
    const netProfit = balance - netProfitBaseline();
    const dailyNetProfit = window.ownDailyNetProfit ? ownDailyNetProfit() : 0;
    const dailyDateKey = window.getDayKey ? getDayKey() : null;
    firebaseSafe(function() {
        const writes = [
            db.collection('users').doc(user.uid).set({
                displayName: user.displayName || '',
                netProfit: netProfit,
                dailyNetProfit: dailyNetProfit,
                dailyDateKey: dailyDateKey,
                bestStreak: bestStreak,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true })
        ];
        myRooms.forEach(function(room) {
            writes.push(db.collection('rooms').doc(room.id).collection('members').doc(user.uid).set({
                displayName: user.displayName || '',
                netProfit: netProfit,
                bestStreak: bestStreak,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true }));
        });
        return Promise.all(writes);
    });
}

function loadMyRooms() {
    const user = window.egUser;
    if (!user) { myRooms = []; renderRoomsList(); return Promise.resolve(); }
    // Returns a Promise so callers can act once myRooms actually reflects the
    // change (e.g. joinRoomByCode opening the detail view for a just-joined room).
    return firebaseSafe(function() {
        return db.collection('rooms').where('memberUids', 'array-contains', user.uid).get().then(function(snap) {
            myRooms = [];
            snap.forEach(function(d) { myRooms.push(Object.assign({ id: d.id }, d.data())); });
            renderRoomsList();
            pushNetProfit();
        });
    }) || Promise.resolve();
}

// Sign-out teardown. This did not exist, so myRooms and the room-detail
// listener leaked across account switches.
function cleanupRooms() {
    if (roomDetailUnsubscribe) { roomDetailUnsubscribe(); roomDetailUnsubscribe = null; }
    myRooms = [];
    activeRoomId = null;
    const modal = document.getElementById('room-detail-modal');
    if (modal) modal.classList.add('hidden');
    cleanupRoomInvites();
    renderRoomsList();
}

// Room names are arbitrary user input, so every renderer below builds DOM with
// createElement + textContent and binds handlers as properties. Interpolating
// them into innerHTML (and room.id into an inline onclick) was an injection hole.
function roomEl(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
}

function roomMetaLine(room) {
    const memberCount = (room.memberUids || []).length;
    const capacity = room.capacity || 6;
    return memberCount + '/' + capacity + ' friends · Buy-in ' + (room.stake || 10);
}

function renderRoomsList() {
    const listEl = document.getElementById('play-rooms-list');
    if (!listEl) return;
    listEl.innerHTML = '';
    const previews = myRooms.slice(0, 2); // Play screen: max 2 preview
    previews.forEach(function(room) {
        const status = getRoomStatus(room);
        const row = roomEl('div', 'mini-room');

        const textCol = roomEl('div');
        textCol.appendChild(roomEl('div', 'mr-name', room.name || 'Room'));
        textCol.appendChild(roomEl('div', 'mr-meta', roomMetaLine(room)));

        const badge = roomEl('span', 'mr-status ' + status, status === 'open' ? 'Open' : 'In Progress');
        const btn = roomEl('button', 'mr-join', status === 'open' ? 'Join Table' : 'Enter Table');
        btn.onclick = function() { openRoomDetail(room.id); };

        row.appendChild(textCol);
        row.appendChild(badge);
        row.appendChild(btn);
        listEl.appendChild(row);
    });
    // Also render the friends-tab rooms list
    renderFriendsRoomsList();
}

function renderFriendsRoomsList() {
    const listEl = document.getElementById('friends-rooms-list');
    const emptyEl = document.getElementById('friends-rooms-empty');
    if (!listEl) return;
    listEl.innerHTML = '';
    if (emptyEl) emptyEl.classList.toggle('hidden', myRooms.length > 0);
    myRooms.forEach(function(room) {
        const status = getRoomStatus(room);
        const card = roomEl('div', 'room-card');

        const head = roomEl('div', 'room-head');
        head.appendChild(roomEl('span', 'roomname', room.name || 'Room'));
        head.appendChild(roomEl('span', 'roomstatus ' + status, status === 'open' ? 'Open' : 'In Progress'));

        const join = roomEl('div', 'roomjoin', status === 'open' ? 'Join Table' : 'Enter Table');
        join.onclick = function() { openRoomDetail(room.id); };

        const invite = roomEl('button', 'room-invite-btn', '+ Invite friends');
        invite.onclick = function() { openRoomInvitePicker(room.id); };

        card.appendChild(head);
        card.appendChild(roomEl('div', 'roommeta', roomMetaLine(room)));
        card.appendChild(join);
        card.appendChild(invite);
        listEl.appendChild(card);
    });
}

function createRoom() {
    const user = window.egUser;
    if (!user) { openSignInModal(); return; }
    const nameInput = document.getElementById('room-name-input');
    const stakeInput = document.getElementById('room-stake-input');
    const name = (nameInput.value || '').trim();
    const stake = parseInt(stakeInput.value, 10) || 10;
    if (!name) { showToast('Give your room a name.'); return; }

    _doCreateRoom(name, stake, function(code) {
        nameInput.value = '';
        closeRoomModal();
        showToast('Room created — code: ' + code);
    });
}

function _doCreateRoom(name, stake, callback) {
    const user = window.egUser;
    if (!user) return;
    firebaseSafe(function() {
        const code = generateRoomCode();
        return db.collection('rooms').add({
            name: name,
            stake: stake,
            code: code,
            capacity: 6,
            ownerUid: user.uid,
            memberUids: [user.uid],
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(function(ref) {
            return db.collection('rooms').doc(ref.id).collection('members').doc(user.uid).set({
                displayName: user.displayName || '',
                netProfit: balance - netProfitBaseline(),
                bestStreak: bestStreak
            }).then(function() {
                if (callback) callback(code);
                // Refresh myRooms first so the picker can find the new room,
                // then go straight into inviting friends.
                return loadMyRooms().then(function() {
                    if (window.openRoomInvitePicker) openRoomInvitePicker(ref.id);
                });
            });
        });
    }, function() { showToast('Could not create room — try again.'); });
}

// --- Inline room creation (Friends tab) ---
function toggleInlineRoomForm() {
    const form = document.getElementById('inline-room-form');
    if (!form) return;
    form.classList.toggle('hidden');
    if (!form.classList.contains('hidden')) {
        document.getElementById('inline-room-name').focus();
    }
}

function selectInlineStake(v) {
    inlineStake = v;
    const btns = document.querySelectorAll('#inline-room-stakes .room-form-stake');
    btns.forEach(function(b) {
        b.classList.toggle('selected', parseInt(b.textContent) === v);
    });
}

function createRoomInline() {
    const user = window.egUser;
    if (!user) { openSignInModal(); return; }
    const nameInput = document.getElementById('inline-room-name');
    const name = (nameInput.value || '').trim();
    if (!name) { showToast('Give your room a name.'); return; }

    _doCreateRoom(name, inlineStake, function(code) {
        nameInput.value = '';
        toggleInlineRoomForm();
        showToast('Room created — code: ' + code);
    });
}

// Pure join: takes the code as an argument and returns a Promise. Previously
// this read #room-code-input directly, which forced the deep-link path to stuff
// the code into a hidden DOM node before calling it — and silently lost the
// code whenever that input wasn't in the DOM.
function joinRoomByCode(code) {
    const user = window.egUser;
    if (!user) { openSignInModal(); return Promise.resolve(false); }
    code = (code || '').trim().toUpperCase();
    if (!code) return Promise.resolve(false);

    return firebaseSafe(function() {
        return db.collection('rooms').where('code', '==', code).limit(1).get().then(function(snap) {
            if (snap.empty) {
                showToast('That invite link is no longer valid.');
                return false;
            }
            const roomDoc = snap.docs[0];
            const roomName = roomDoc.data().name || 'the room';
            const alreadyMember = (roomDoc.data().memberUids || []).indexOf(user.uid) !== -1;

            // Re-clicking your own link must not re-append: the security rule
            // requires memberUids == existing.concat([uid]), so a duplicate
            // append is rejected outright.
            const roster = alreadyMember ? Promise.resolve() :
                db.collection('rooms').doc(roomDoc.id).update({
                    memberUids: firebase.firestore.FieldValue.arrayUnion(user.uid),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }).then(function() {
                    return db.collection('rooms').doc(roomDoc.id).collection('members').doc(user.uid).set({
                        displayName: user.displayName || '',
                        netProfit: balance - netProfitBaseline(),
                        bestStreak: bestStreak,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });
                });

            return roster.then(function() {
                closeRoomModal();
                if (!alreadyMember) showToast('Joined ' + roomName + '!');
                return loadMyRooms().then(function() {
                    openRoomDetail(roomDoc.id);
                    return true;
                });
            });
        });
    // firebaseSafe returns null if the operation throws synchronously, so
    // normalise to a Promise — callers chain .then() on this.
    }, function() { showToast('Could not join room — try again.'); }) || Promise.resolve(false);
}

// DOM entry point for the "Got a code from a friend?" field.
function submitRoomCodeInput() {
    const input = document.getElementById('room-code-input');
    if (!input) return;
    const code = (input.value || '').trim().toUpperCase();
    if (!code) return;
    joinRoomByCode(code).then(function(ok) { if (ok) input.value = ''; });
}

function openRoomDetail(roomId) {
    activeRoomId = roomId;
    const room = myRooms.find(function(r) { return r.id === roomId; });
    if (!room) return;
    document.getElementById('room-detail-name').textContent = room.name || 'Room';
    document.getElementById('room-detail-code').textContent = room.code || '';
    const bodyEl = document.getElementById('room-detail-members');
    bodyEl.innerHTML = '';

    // Clean up previous live listener
    if (roomDetailUnsubscribe) roomDetailUnsubscribe();

    roomDetailUnsubscribe = db.collection('rooms').doc(roomId).collection('members')
        .orderBy('netProfit', 'desc')
        .onSnapshot(function(snap) {
            bodyEl.innerHTML = '';
            snap.forEach(function(d) {
                const m = d.data();
                const row = document.createElement('div');
                row.className = 'friend-row';
                const nameEl = document.createElement('span');
                nameEl.className = 'friend-name';
                nameEl.textContent = m.displayName || 'Player';
                const scoreEl = document.createElement('span');
                scoreEl.className = 'friend-score';
                const np = m.netProfit || 0;
                scoreEl.textContent = (np >= 0 ? '+' : '') + np;
                scoreEl.classList.add(np > 0 ? 'positive' : np < 0 ? 'negative' : 'zero');
                row.appendChild(nameEl);
                row.appendChild(scoreEl);
                bodyEl.appendChild(row);
            });
        }, function() { /* silently ignore */ });

    document.getElementById('room-detail-modal').classList.remove('hidden');
}

function closeRoomDetail() {
    document.getElementById('room-detail-modal').classList.add('hidden');
    activeRoomId = null;
    if (roomDetailUnsubscribe) {
        roomDetailUnsubscribe();
        roomDetailUnsubscribe = null;
    }
}

function openRoomModal() {
    const user = window.egUser;
    if (!user) { openSignInModal(); return; }
    document.getElementById('room-modal').classList.remove('hidden');
}

function closeRoomModal() {
    document.getElementById('room-modal').classList.add('hidden');
}

// --- Room invites: sender side (friend picker) ---
// Opens the #room-invite-sheet for a room the player is a member of. Friends
// already in the room are excluded; friends with an unanswered invite from
// this player show as "Invited" and can't be re-selected.
function openRoomInvitePicker(roomId) {
    const user = window.egUser;
    if (!user) { openSignInModal(); return; }
    const room = myRooms.find(function(r) { return r.id === roomId; });
    if (!room) return;

    roomInvitePickerRoomId = roomId;
    roomInviteSelection = {};
    roomInviteAlreadySent = {};
    if (window.setRoomInviteSheetLink) setRoomInviteSheetLink(room.name || 'Room', room.code || '');
    renderRoomInvitePickerRows(room);
    openSheet('room-invite-sheet');

    // Mark friends this player already has a pending invite out to.
    firebaseSafe(function() {
        return db.collection('roomInvites')
            .where('fromUid', '==', user.uid)
            .where('roomId', '==', roomId)
            .where('status', '==', 'pending')
            .get().then(function(snap) {
                snap.forEach(function(d) { roomInviteAlreadySent[d.data().toUid] = true; });
                renderRoomInvitePickerRows(room);
            });
    });
}

function renderRoomInvitePickerRows(room) {
    const listEl = document.getElementById('room-invite-friends');
    const sendBtn = document.getElementById('room-invite-send');
    if (!listEl) return;
    listEl.innerHTML = '';

    // friendsList is js/friends.js's top-level `let` — a shared global lexical
    // binding in the concatenated bundle (NOT window.friendsList).
    const memberUids = room.memberUids || [];
    const candidates = friendsList.filter(function(f) {
        return memberUids.indexOf(f.uid) === -1;
    });

    if (!candidates.length) {
        listEl.appendChild(roomEl('div', 'rip-empty',
            friendsList.length
                ? 'All your friends are already at this table.'
                : 'No friends yet — share the link below to invite someone.'));
        if (sendBtn) sendBtn.classList.add('hidden');
        return;
    }

    candidates.forEach(function(f) {
        const invited = !!roomInviteAlreadySent[f.uid];
        const row = roomEl('div', 'rip-row' + (roomInviteSelection[f.uid] ? ' selected' : '') + (invited ? ' invited' : ''));

        const avatar = roomEl('span', 'rip-avatar', (f.displayName || '?').charAt(0).toUpperCase());
        const name = roomEl('span', 'rip-name', f.displayName || 'Player');
        const check = roomEl('span', 'rip-check', invited ? 'Invited' : (roomInviteSelection[f.uid] ? '✓' : ''));

        if (!invited) {
            row.onclick = function() {
                if (roomInviteSelection[f.uid]) delete roomInviteSelection[f.uid];
                else roomInviteSelection[f.uid] = f.displayName || 'Player';
                renderRoomInvitePickerRows(room);
            };
        }

        row.appendChild(avatar);
        row.appendChild(name);
        row.appendChild(check);
        listEl.appendChild(row);
    });

    const count = Object.keys(roomInviteSelection).length;
    if (sendBtn) {
        sendBtn.classList.toggle('hidden', count === 0);
        sendBtn.textContent = 'Send Invite' + (count === 1 ? '' : 's') + (count ? ' (' + count + ')' : '');
    }
}

function sendRoomInvites() {
    const user = window.egUser;
    const roomId = roomInvitePickerRoomId;
    if (!user || !roomId) return;
    const room = myRooms.find(function(r) { return r.id === roomId; });
    const uids = Object.keys(roomInviteSelection);
    if (!room || !uids.length) return;

    firebaseSafe(function() {
        return Promise.all(uids.map(function(toUid) {
            return db.collection('roomInvites').add({
                roomId: roomId,
                roomCode: room.code || '',
                roomName: room.name || 'Room',
                stake: room.stake || 10,
                fromUid: user.uid,
                fromName: user.displayName || 'A friend',
                toUid: toUid,
                status: 'pending',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        })).then(function() {
            showToast(uids.length === 1 ? 'Invite sent!' : uids.length + ' invites sent!');
            closeSheet('room-invite-sheet');
            roomInviteSelection = {};
        });
    }, function() { showToast('Could not send invites — try again.'); });
}

// --- Room invites: recipient side (live banners + badges) ---
function initRoomInviteListener() {
    const user = window.egUser;
    if (!user) return;
    if (roomInvitesUnsubscribe) roomInvitesUnsubscribe();
    roomInvitesUnsubscribe = db.collection('roomInvites')
        .where('toUid', '==', user.uid)
        .where('status', '==', 'pending')
        .onSnapshot(function(snap) {
            incomingRoomInvites = [];
            snap.forEach(function(d) {
                incomingRoomInvites.push(Object.assign({ id: d.id }, d.data()));
            });
            renderRoomInviteBanners();
            updateRoomInviteBadges();
        }, function() { /* silently ignore */ });
}

function cleanupRoomInvites() {
    if (roomInvitesUnsubscribe) { roomInvitesUnsubscribe(); roomInvitesUnsubscribe = null; }
    incomingRoomInvites = [];
    roomInviteSelection = {};
    roomInvitePickerRoomId = null;
    const sheet = document.getElementById('room-invite-sheet');
    if (sheet) sheet.classList.add('hidden');
    renderRoomInviteBanners();
    updateRoomInviteBadges();
}

function renderRoomInviteBanners() {
    const el = document.getElementById('friends-room-invites');
    if (!el) return;
    el.innerHTML = '';
    incomingRoomInvites.forEach(function(inv) {
        const banner = roomEl('div', 'room-invite-banner');

        const text = roomEl('div', 'rib-text');
        text.appendChild(roomEl('span', 'rib-from', inv.fromName || 'A friend'));
        text.appendChild(document.createTextNode(' invited you to '));
        text.appendChild(roomEl('span', 'rib-room', inv.roomName || 'a room'));
        text.appendChild(roomEl('div', 'rib-meta', 'Buy-in ' + (inv.stake || 10)));

        const actions = roomEl('div', 'rib-actions');
        const accept = roomEl('button', 'rib-accept', 'Join');
        accept.onclick = function() { acceptRoomInvite(inv.id); };
        const decline = roomEl('button', 'rib-decline', 'Decline');
        decline.onclick = function() { declineRoomInvite(inv.id); };
        actions.appendChild(accept);
        actions.appendChild(decline);

        banner.appendChild(text);
        banner.appendChild(actions);
        el.appendChild(banner);
    });
}

function updateRoomInviteBadges() {
    const count = incomingRoomInvites.length;
    ['rooms-tab-badge', 'nav-friends-badge'].forEach(function(id) {
        const badge = document.getElementById(id);
        if (!badge) return;
        badge.textContent = String(count);
        badge.classList.toggle('hidden', count === 0);
    });
}

function acceptRoomInvite(inviteId) {
    const inv = incomingRoomInvites.find(function(i) { return i.id === inviteId; });
    if (!inv) return;
    joinRoomByCode(inv.roomCode).then(function(ok) {
        // If the room is gone, joinRoomByCode already toasted — mark the invite
        // declined either way so the banner doesn't linger.
        firebaseSafe(function() {
            return db.collection('roomInvites').doc(inviteId).update({
                status: ok ? 'accepted' : 'declined',
                respondedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        });
    });
}

function declineRoomInvite(inviteId) {
    firebaseSafe(function() {
        return db.collection('roomInvites').doc(inviteId).update({
            status: 'declined',
            respondedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    });
}
