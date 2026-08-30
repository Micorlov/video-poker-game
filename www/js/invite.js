// Invites & Sharing — invite-friends sheet, the link half of the room-invite
// sheet, clipboard copy, native OS share sheet, WhatsApp/Telegram intents,
// deep-link handling. The room-invite friend picker itself is in js/rooms.js.

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

// Shared clipboard write with the textarea fallback; the per-surface feedback
// (button label swap, chip highlight) is the caller's job via onCopied.
function copyTextToClipboard(text, onCopied) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(onCopied)
            .catch(function() { fallbackCopySheet(text, onCopied); });
    } else {
        fallbackCopySheet(text, onCopied);
    }
}

function copyBtnFeedback(copyBtn) {
    copyBtn.textContent = 'Copied!';
    copyBtn.classList.add('copied');
    setTimeout(function() {
        copyBtn.textContent = 'Copy';
        copyBtn.classList.remove('copied');
    }, 2000);
}

function copyInviteSheetLink() {
    const linkEl = document.getElementById('invite-sheet-link');
    const link = linkEl.getAttribute('data-link') || linkEl.textContent;
    const copyBtn = document.getElementById('invite-sheet-copy');
    copyTextToClipboard(link, function() { copyBtnFeedback(copyBtn); });
}

// Tap-to-copy on the Friends screen's "Your code" chip.
function copyOwnCode() {
    const code = (window.egUserDoc && window.egUserDoc.referralCode) || '';
    if (!code) { showToast('Sign in to get your friend code.'); return; }
    const chip = document.getElementById('own-code-chip');
    const hint = document.getElementById('own-code-hint');
    copyTextToClipboard(code, function() {
        if (chip) chip.classList.add('copied');
        if (hint) hint.textContent = 'Copied ✓';
        setTimeout(function() {
            if (chip) chip.classList.remove('copied');
            if (hint) hint.textContent = 'Tap to copy';
        }, 2000);
    });
}

// --- Native OS share sheet, with the custom bottom sheet as fallback ---
// Order: Capacitor Share plugin (native app) → navigator.share (mobile web)
// → the existing invite sheet (desktop / unsupported). A user-cancelled share
// is not an error and must not trigger the fallback sheet.
function shareViaNative(title, message, link) {
    const CapShare = window.Capacitor && window.Capacitor.isNativePlatform &&
        window.Capacitor.isNativePlatform() &&
        window.Capacitor.Plugins && window.Capacitor.Plugins.Share;
    if (CapShare) {
        return CapShare.share({ title: title, text: message, url: link, dialogTitle: title })
            .then(function() { return true; })
            .catch(function() { return true; /* user cancelled */ });
    }
    if (navigator.share) {
        return navigator.share({ text: message + '\n' + link })
            .then(function() { return true; })
            .catch(function(err) { return !!(err && err.name === 'AbortError'); });
    }
    return Promise.resolve(false);
}

function shareInviteNative() {
    const user = window.egUser;
    if (!user) { openSignInModal(); return; }
    const link = getInviteLink();
    if (!link) { showToast('Could not generate invite link.'); return; }
    shareViaNative('Royal Video Poker', friendInviteMessage(), link).then(function(handled) {
        if (!handled) openInviteSheet();
    });
}

function fallbackCopySheet(text, onCopied) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try {
        document.execCommand('copy');
        if (onCopied) onCopied();
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

// --- Room invite sheet: share-link half ---
// The friend-picker half lives in js/rooms.js (openRoomInvitePicker); these
// helpers fill in the link row and share chips of #room-invite-sheet.
function setRoomInviteSheetLink(roomName, roomCode) {
    const link = buildRoomLink(roomCode);
    document.getElementById('room-invite-name').textContent = roomName;
    const linkEl = document.getElementById('room-invite-link');
    linkEl.textContent = link;
    linkEl.setAttribute('data-link', link);
    linkEl.setAttribute('data-code', roomCode);
    const copyBtn = document.getElementById('room-invite-copy');
    copyBtn.textContent = 'Copy';
    copyBtn.classList.remove('copied');
}

function copyRoomLink() {
    const linkEl = document.getElementById('room-invite-link');
    const link = linkEl.getAttribute('data-link') || linkEl.textContent;
    const copyBtn = document.getElementById('room-invite-copy');
    copyTextToClipboard(link, function() { copyBtnFeedback(copyBtn); });
}

function roomInviteMessage() {
    const name = document.getElementById('room-invite-name').textContent;
    const code = document.getElementById('room-invite-link').getAttribute('data-code') || '';
    return 'Join my poker room "' + name + '" on Royal Video Poker.' +
        (code ? '\nRoom code: ' + code : '');
}

function shareRoomInviteNative() {
    shareViaNative('Royal Video Poker', roomInviteMessage(), sheetLink('room-invite-link'))
        .then(function(handled) {
            if (!handled) showToast('Use Copy, WhatsApp or Telegram to share.');
        });
}

function shareRoomViaWhatsApp() {
    openShareChannel('whatsapp', roomInviteMessage(), sheetLink('room-invite-link'));
}

function shareRoomViaTelegram() {
    openShareChannel('telegram', roomInviteMessage(), sheetLink('room-invite-link'));
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
