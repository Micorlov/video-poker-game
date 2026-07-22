// Invites & Sharing — two bottom sheets (invite friends, room created),
// clipboard copy, OS share sheet, WhatsApp/Telegram intents, deep-link handling.

// --- Generic sheet helpers ---
function openSheet(sheetId) {
    document.getElementById(sheetId).classList.remove('hidden');
}

function closeSheet(sheetId) {
    document.getElementById(sheetId).classList.add('hidden');
}

// --- Invite Friends bottom sheet ---
function openInviteSheet() {
    const user = window.egUser;
    if (!user) { openSignInModal(); return; }
    const link = getInviteLink();
    if (!link) { showToast('Could not generate invite link.'); return; }
    document.getElementById('invite-sheet-link').textContent = link;
    document.getElementById('invite-sheet-link').setAttribute('data-link', link);
    // Reset copy button state
    const copyBtn = document.getElementById('invite-sheet-copy');
    copyBtn.textContent = 'Copy';
    copyBtn.classList.remove('copied');
    openSheet('invite-sheet');
}

function copyInviteSheetLink() {
    const linkEl = document.getElementById('invite-sheet-link');
    const link = linkEl.getAttribute('data-link') || linkEl.textContent;
    const copyBtn = document.getElementById('invite-sheet-copy');

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(link).then(function() {
            copyBtn.textContent = 'Copied!';
            copyBtn.classList.add('copied');
            setTimeout(function() {
                copyBtn.textContent = 'Copy';
                copyBtn.classList.remove('copied');
            }, 2000);
        }).catch(function() { fallbackCopySheet(link, copyBtn); });
    } else {
        fallbackCopySheet(link, copyBtn);
    }
}

function fallbackCopySheet(text, btn) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try {
        document.execCommand('copy');
        btn.textContent = 'Copied!';
        btn.classList.add('copied');
        setTimeout(function() { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 2000);
    } catch (e) {
        showToast('Could not copy — tap and hold the link.');
    }
    document.body.removeChild(ta);
}

function shareInviteLink() {
    const linkEl = document.getElementById('invite-sheet-link');
    const link = linkEl.getAttribute('data-link') || linkEl.textContent;
    const user = window.egUser;
    const name = user ? (user.displayName || 'A friend') : 'A friend';
    const text = name + ' wants to play Video Poker with you! Join here: ' + link;

    // Try native share first
    if (navigator.share) {
        navigator.share({ title: 'Video Poker', text: text, url: link }).catch(function() {});
    } else if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Share) {
        window.Capacitor.Plugins.Share.share({ title: 'Video Poker', text: text, url: link }).catch(function() {});
    } else {
        // Fallback: copy to clipboard
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(link).then(function() {
                showToast('Link copied — share it with friends!');
            });
        }
    }
}

// --- Room Created bottom sheet ---
function openRoomCreatedSheet(roomName, roomCode) {
    const base = getShareBaseUrl();
    const link = base + '?join=' + encodeURIComponent(roomCode);
    document.getElementById('room-created-name').textContent = roomName;
    document.getElementById('room-created-link').textContent = link;
    document.getElementById('room-created-link').setAttribute('data-link', link);
    document.getElementById('room-created-link').setAttribute('data-code', roomCode);
    // Reset copy button
    const copyBtn = document.getElementById('room-created-copy');
    copyBtn.textContent = 'Copy';
    copyBtn.classList.remove('copied');
    openSheet('room-created-sheet');
}

function copyRoomLink() {
    const linkEl = document.getElementById('room-created-link');
    const link = linkEl.getAttribute('data-link') || linkEl.textContent;
    const copyBtn = document.getElementById('room-created-copy');
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(link).then(function() {
            copyBtn.textContent = 'Copied!';
            copyBtn.classList.add('copied');
            setTimeout(function() { copyBtn.textContent = 'Copy'; copyBtn.classList.remove('copied'); }, 2000);
        }).catch(function() { fallbackCopySheet(link, copyBtn); });
    } else {
        fallbackCopySheet(link, copyBtn);
    }
}

function shareRoomViaWhatsApp() {
    const linkEl = document.getElementById('room-created-link');
    const link = linkEl.getAttribute('data-link') || linkEl.textContent;
    const name = document.getElementById('room-created-name').textContent;
    const text = encodeURIComponent('Join my poker room "' + name + '" in Video Poker!\n' + link);
    window.open('https://wa.me/?text=' + text, '_blank');
}

function shareRoomViaTelegram() {
    const linkEl = document.getElementById('room-created-link');
    const link = linkEl.getAttribute('data-link') || linkEl.textContent;
    const name = document.getElementById('room-created-name').textContent;
    const text = encodeURIComponent('Join my poker room "' + name + '" in Video Poker!\n' + link);
    window.open('https://t.me/share/url?url=' + encodeURIComponent(link) + '&text=' + text, '_blank');
}

// --- Deep-link handling (?join=ROOMCODE) ---
function handleJoinDeepLink() {
    try {
        var params = new URLSearchParams(window.location.search);
        var joinCode = params.get('join');
        if (!joinCode) return;
        joinCode = joinCode.trim().toUpperCase();
        if (!joinCode) return;

        // Clean URL
        if (window.history && window.history.replaceState) {
            var url = new URL(window.location);
            url.searchParams.delete('join');
            window.history.replaceState({}, '', url);
        }

        // Store for after sign-in
        window._pendingJoinCode = joinCode;

        if (window.egUser) {
            joinRoomByDeepLink(joinCode);
        } else {
            openSignInModal();
            showToast('Sign in to join the poker room!');
        }
    } catch (e) {}
}

function joinRoomByDeepLink(code) {
    var user = window.egUser;
    if (!user) return;
    var input = document.getElementById('room-code-input');
    if (input) input.value = code;
    joinRoomByCode(); // reuses existing join logic after setting the input
}

// Hook into auth state change to handle pending join
// (Add to the existing firebase.js onAuthStateChanged handler)
var _origAuthHandler = null; // will be set by build order
