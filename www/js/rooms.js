// Simple private poker rooms — a room is just a shared, code-joinable
// net-profit leaderboard. No chat, no reactions, no reset cadence.
// Phase 2: adds capacity, status derivation, inline creation, share sheet.

let myRooms = [];
let activeRoomId = null;
let roomDetailUnsubscribe = null;
let inlineStake = 10;

function getRoomStatus(room) {
    // A room is "playing" if it has more than 1 member; otherwise "open"
    const count = (room.memberUids || []).length;
    return count > 1 ? 'playing' : 'open';
}

function pushNetProfit() {
    const user = window.egUser;
    if (!user) return;
    const netProfit = balance - 500;
    firebaseSafe(function() {
        const writes = [
            db.collection('users').doc(user.uid).set({
                displayName: user.displayName || '',
                netProfit: netProfit,
                bestStreak: bestStreak,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true })
        ];
        myRooms.forEach(function(room) {
            writes.push(db.collection('rooms').doc(room.id).collection('members').doc(user.uid).set({
                displayName: user.displayName || '',
                netProfit: netProfit,
                bestStreak: bestStreak
            }, { merge: true }));
        });
        return Promise.all(writes);
    });
}

function loadMyRooms() {
    const user = window.egUser;
    if (!user) { myRooms = []; renderRoomsList(); return; }
    firebaseSafe(function() {
        return db.collection('rooms').where('memberUids', 'array-contains', user.uid).get().then(function(snap) {
            myRooms = [];
            snap.forEach(function(d) { myRooms.push(Object.assign({ id: d.id }, d.data())); });
            renderRoomsList();
            pushNetProfit();
        });
    });
}

function renderRoomsList() {
    const listEl = document.getElementById('play-rooms-list');
    if (!listEl) return;
    listEl.innerHTML = '';
    const previews = myRooms.slice(0, 2); // Play screen: max 2 preview
    previews.forEach(function(room) {
        const row = document.createElement('div');
        row.className = 'mini-room';
        const status = getRoomStatus(room);
        const memberCount = (room.memberUids || []).length;
        const capacity = room.capacity || 6;

        row.innerHTML =
            '<div>' +
                '<div class="mr-name">' + (room.name || 'Room') + '</div>' +
                '<div class="mr-meta">' + memberCount + '/' + capacity + ' friends · Stake ' + (room.stake || 10) + '</div>' +
            '</div>' +
            '<span class="mr-status ' + status + '">' + (status === 'open' ? 'Open' : 'In Progress') + '</span>' +
            '<button class="mr-join" onclick="openRoomDetail(\'' + room.id + '\')">' + (status === 'open' ? 'Join Table' : 'Enter Table') + '</button>';

        listEl.appendChild(row);
    });
    // Also render the friends-tab rooms list
    renderFriendsRoomsList();
}

function renderFriendsRoomsList() {
    const listEl = document.getElementById('friends-rooms-list');
    const emptyEl = document.getElementById('friends-rooms-empty');
    const btn = document.getElementById('friends-create-room-btn');
    if (!listEl) return;
    listEl.innerHTML = '';
    if (emptyEl) emptyEl.classList.toggle('hidden', myRooms.length > 0);
    myRooms.forEach(function(room) {
        const card = document.createElement('div');
        card.className = 'room-card';
        const status = getRoomStatus(room);
        const memberCount = (room.memberUids || []).length;
        const capacity = room.capacity || 6;

        card.innerHTML =
            '<div class="room-head">' +
                '<span class="roomname">' + (room.name || 'Room') + '</span>' +
                '<span class="roomstatus ' + status + '">' + (status === 'open' ? 'Open' : 'In Progress') + '</span>' +
            '</div>' +
            '<div class="roommeta">' + memberCount + '/' + capacity + ' friends · Stake ' + (room.stake || 10) + '</div>' +
            '<div class="roomjoin" onclick="openRoomDetail(\'' + room.id + '\')">' + (status === 'open' ? 'Join Table' : 'Enter Table') + '</div>';

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
        loadMyRooms();
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
                netProfit: balance - 500,
                bestStreak: bestStreak
            }).then(function() {
                if (callback) callback(code);
                // Open share sheet
                if (window.openRoomCreatedSheet) openRoomCreatedSheet(name, code);
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
        loadMyRooms();
    });
}

function joinRoomByCode() {
    const user = window.egUser;
    if (!user) { openSignInModal(); return; }
    const input = document.getElementById('room-code-input');
    const code = (input.value || '').trim().toUpperCase();
    if (!code) return;

    firebaseSafe(function() {
        return db.collection('rooms').where('code', '==', code).limit(1).get().then(function(snap) {
            if (snap.empty) { showToast('No room found with that code.'); return; }
            const roomDoc = snap.docs[0];
            return db.collection('rooms').doc(roomDoc.id).update({
                memberUids: firebase.firestore.FieldValue.arrayUnion(user.uid)
            }).then(function() {
                return db.collection('rooms').doc(roomDoc.id).collection('members').doc(user.uid).set({
                    displayName: user.displayName || '',
                    netProfit: balance - 500
                });
            }).then(function() {
                input.value = '';
                closeRoomModal();
                showToast('Joined ' + (roomDoc.data().name || 'the room') + '!');
                loadMyRooms();
            });
        });
    }, function() { showToast('Could not join room — try again.'); });
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
