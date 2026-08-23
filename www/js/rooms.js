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

        card.appendChild(head);
        card.appendChild(roomEl('div', 'roommeta', roomMetaLine(room)));
        card.appendChild(join);
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
                netProfit: balance - netProfitBaseline(),
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
