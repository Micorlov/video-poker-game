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
    if (window.renderInviteRewardLine) renderInviteRewardLine();
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

// One handoff for every share chip. The wa.me / t.me web endpoints are used on
// native too: they redirect straight into the installed app, and unlike the
// whatsapp:// and tg:// schemes they show the friend a real page instead of
// failing silently when the messenger is missing.
//
// Telegram takes the link and the message as separate parameters, so the
// message passed in here must never already contain the link — otherwise the
// share preview repeats it.
function openShareChannel(channel, message, link) {
    let url;
    if (channel === 'telegram') {
        url = 'https://t.me/share/url?url=' + encodeURIComponent(link) +
              '&text=' + encodeURIComponent(message);
    } else {
        url = 'https://wa.me/?text=' + encodeURIComponent(message + '\n' + link);
    }
    window.open(url, '_blank');
}

function sheetLink(id) {
    const el = document.getElementById(id);
    return el ? (el.getAttribute('data-link') || el.textContent) : '';
}

function friendInviteMessage() {
    const user = window.egUser;
    const name = (user && user.displayName) || 'A friend';
    const code = (window.egUserDoc && window.egUserDoc.referralCode) || '';
    return name + ' is playing Royal Video Poker and wants you at the table.' +
        (code ? '\nFriend code: ' + code : '');
}

function shareFriendInviteViaWhatsApp() {
    openShareChannel('whatsapp', friendInviteMessage(), sheetLink('invite-sheet-link'));
}

function shareFriendInviteViaTelegram() {
    openShareChannel('telegram', friendInviteMessage(), sheetLink('invite-sheet-link'));
}

// --- Room Created bottom sheet ---
function openRoomCreatedSheet(roomName, roomCode) {
    const link = buildRoomLink(roomCode);
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

function roomInviteMessage() {
    const name = document.getElementById('room-created-name').textContent;
    const code = document.getElementById('room-created-link').getAttribute('data-code') || '';
    return 'Join my poker room "' + name + '" on Royal Video Poker.' +
        (code ? '\nRoom code: ' + code : '');
}

function shareRoomViaWhatsApp() {
    openShareChannel('whatsapp', roomInviteMessage(), sheetLink('room-created-link'));
}

function shareRoomViaTelegram() {
    openShareChannel('telegram', roomInviteMessage(), sheetLink('room-created-link'));
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

        // Park the code. Consumed either directly below, or — if auth hasn't
        // settled yet — by the onAuthStateChanged handler in js/firebase.js.
        window._pendingJoinCode = joinCode;

        if (window.egUser) {
            window._pendingJoinCode = null;
            joinRoomByCode(joinCode);
        } else if (window._authResolved) {
            // Auth has settled and there is genuinely no user.
            openSignInModal();
            showToast('Sign in to join the daily game!');
        }
        // Otherwise: auth is still resolving. Do nothing — firing the sign-in
        // modal here would ambush every already-signed-in user who clicks a
        // link, since egUser is null until onAuthStateChanged fires.
    } catch (e) {}
}
