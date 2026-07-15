// Simple private poker rooms — a room is just a shared, code-joinable
// net-profit leaderboard. No chat, no reactions, no reset cadence.

let myRooms = [];
let activeRoomId = null;
let roomDetailUnsubscribe = null;

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
    myRooms.slice(0, 3).forEach(function(room) {
        const row = document.createElement('div');
        row.className = 'room-row';

        const info = document.createElement('div');
        const nameEl = document.createElement('div');
        nameEl.className = 'room-row-name';
        nameEl.textContent = room.name || 'Room';
        const subEl = document.createElement('div');
        subEl.className = 'room-row-sub';
        subEl.textContent = (room.memberUids || []).length + ' friends · Stake ' + room.stake;
        info.appendChild(nameEl);
        info.appendChild(subEl);

        const btn = document.createElement('button');
        btn.className = 'btn-primary room-row-btn';
        btn.textContent = 'Enter Table';
        btn.onclick = function() { openRoomDetail(room.id); };

        row.appendChild(info);
        row.appendChild(btn);
        listEl.appendChild(row);
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

    firebaseSafe(function() {
        const code = generateRoomCode();
        return db.collection('rooms').add({
            name: name,
            stake: stake,
            code: code,
            ownerUid: user.uid,
            memberUids: [user.uid],
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(function(ref) {
            return db.collection('rooms').doc(ref.id).collection('members').doc(user.uid).set({
                displayName: user.displayName || '',
                netProfit: balance - 500
            }).then(function() {
                nameInput.value = '';
                closeRoomModal();
                showToast('Room created — code: ' + code);
                loadMyRooms();
            });
        });
    }, function() { showToast('Could not create room — try again.'); });
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
