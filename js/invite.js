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
    if (!link) { showToast(t('toast.couldNotGenerateLink')); return; }
    document.getElementById('invite-sheet-link').textContent = link;
    document.getElementById('invite-sheet-link').setAttribute('data-link', link);
    // Reset copy button state
    const copyBtn = document.getElementById('invite-sheet-copy');
    copyBtn.textContent = t('common.copy');
    copyBtn.classList.remove('copied');
    if (window.renderInviteRewardLine) renderInviteRewardLine();
    if (window.logVpEvent) logVpEvent('invite_sheet_opened');
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
    copyBtn.textContent = t('common.copied');
    copyBtn.classList.add('copied');
    setTimeout(function() {
        copyBtn.textContent = t('common.copy');
        copyBtn.classList.remove('copied');
    }, 2000);
}

function copyInviteSheetLink() {
    const linkEl = document.getElementById('invite-sheet-link');
    const link = linkEl.getAttribute('data-link') || linkEl.textContent;
    const copyBtn = document.getElementById('invite-sheet-copy');
    if (window.logVpEvent) logVpEvent('share_channel_clicked', { channel: 'copy' });
    copyTextToClipboard(link, function() { copyBtnFeedback(copyBtn); });
}

// Tap-to-copy on the Friends screen's "Your code" chip.
function copyOwnCode() {
    const code = (window.egUserDoc && window.egUserDoc.referralCode) || '';
    if (!code) { showToast(t('toast.signInFriendCode')); return; }
    const chip = document.getElementById('own-code-chip');
    const hint = document.getElementById('own-code-hint');
    copyTextToClipboard(code, function() {
        if (chip) chip.classList.add('copied');
        if (hint) hint.textContent = t('friends.copiedCheck');
        setTimeout(function() {
            if (chip) chip.classList.remove('copied');
            if (hint) hint.textContent = t('friends.tapToCopy');
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
    if (!link) { showToast(t('toast.couldNotGenerateLink')); return; }
    shareViaNative(t('share.appNameFull'), friendInviteMessage(), link).then(function(handled) {
        if (!handled) openInviteSheet();
    });
}

// From the All-In unlock sheet: the depleted All-In is the moment the player
// wants something an invite can buy.
function allInUnlockInvite() {
    if (window.logVpEvent) logVpEvent('allin_unlock_prompt_clicked');
    closeSheet('allin-unlock-sheet');
    openInviteSheet();
}

// The invite sheet's "More…" chip — everything beyond WhatsApp/Telegram goes
// through the OS share sheet.
function shareInviteMore() {
    if (window.logVpEvent) logVpEvent('share_channel_clicked', { channel: 'native' });
    shareViaNative(t('share.appNameFull'), friendInviteMessage(), sheetLink('invite-sheet-link'))
        .then(function(handled) {
            if (!handled) showToast(t('toast.useCopyShare'));
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
        showToast(t('toast.couldNotCopy'));
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
    if (window.logVpEvent) logVpEvent('share_channel_clicked', { channel: channel });
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

// Reciprocity framing: the invite is a gift the friend claims, not a favour
// asked of them — the invitee's welcome coins (js/referral.js) make it true.
function friendInviteMessage() {
    const user = window.egUser;
    const name = (user && user.displayName) || 'A friend';
    const code = (window.egUserDoc && window.egUserDoc.referralCode) || '';
    // Two links do two jobs: the share link (Play Store) installs, while the
    // deep link below opens the app directly for a friend who already has it —
    // carrying the code through intent://, which the store link cannot.
    const openLink = window.buildInviteOpenLink ? buildInviteOpenLink(code) : '';
    return name + ' sent you 1,000 coins on Royal Video Poker 🃏 Sign in with Google to claim them.' +
        (code ? '\nFriend code: ' + code : '') +
        (openLink ? '\nAlready have the app? Tap to open: ' + openLink : '');
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
// Held here rather than read back out of the DOM: the sentence that used to
// carry the name is now rendered whole from the dictionary, so there is no
// element left to read it from.
let roomInviteName = '';

function setRoomInviteSheetLink(roomName, roomCode) {
    const link = buildRoomLink(roomCode);
    roomInviteName = roomName;
    const subEl = document.getElementById('room-invite-sub');
    if (subEl) subEl.textContent = t('sheet.roomInviteSub', { name: roomName });
    const linkEl = document.getElementById('room-invite-link');
    linkEl.textContent = link;
    linkEl.setAttribute('data-link', link);
    linkEl.setAttribute('data-code', roomCode);
    const copyBtn = document.getElementById('room-invite-copy');
    copyBtn.textContent = t('common.copy');
    copyBtn.classList.remove('copied');
}

function copyRoomLink() {
    const linkEl = document.getElementById('room-invite-link');
    const link = linkEl.getAttribute('data-link') || linkEl.textContent;
    const copyBtn = document.getElementById('room-invite-copy');
    copyTextToClipboard(link, function() { copyBtnFeedback(copyBtn); });
}

function roomInviteMessage() {
    const name = roomInviteName;
    const code = document.getElementById('room-invite-link').getAttribute('data-code') || '';
    return t('share.roomInviteMsg', { name: name }) +
        (code ? '\n' + t('share.roomCodeLine', { code: code }) : '');
}

function shareRoomInviteNative() {
    shareViaNative(t('share.appNameFull'), roomInviteMessage(), sheetLink('room-invite-link'))
        .then(function(handled) {
            if (!handled) showToast(t('toast.useCopyShare'));
        });
}

function shareRoomViaWhatsApp() {
    openShareChannel('whatsapp', roomInviteMessage(), sheetLink('room-invite-link'));
}

function shareRoomViaTelegram() {
    openShareChannel('telegram', roomInviteMessage(), sheetLink('room-invite-link'));
}

// --- Big-win brag sheet (signed-in users) ---
// A rare hand is the one moment a share is a brag, not an ask — and the link
// carries the referral code, so the brag IS an invite. Shown at most once a
// day, only after Four of a Kind or better (the caller in js/game.js gates
// the hand rank), and always dismissible.
const BIGWIN_SHARE_KEY = 'vp_bigwin_share';
let bigwinShareHand = '';
let bigwinShareWin = 0;

function maybeOfferBigWinShare(handType, win) {
    if (!window.egUser) return;
    const today = new Date().toDateString();
    try { if (localStorage.getItem(BIGWIN_SHARE_KEY) === today) return; } catch (e) {}
    if (!getInviteLink()) return;
    const sheet = document.getElementById('bigwin-share-sheet');
    if (!sheet) return;
    try { localStorage.setItem(BIGWIN_SHARE_KEY, today); } catch (e) {}
    bigwinShareHand = handType;
    bigwinShareWin = win;
    const title = document.getElementById('bigwin-share-title');
    if (title) title.textContent = t('sheet.bigWinTitleWin', { hand: vpHandLabel(handType), coins: formatNumber(win) });
    const sub = document.getElementById('bigwin-share-sub');
    if (sub) sub.textContent = t('sheet.bigWinSub', { reward: formatNumber(REFERRAL_REWARD_COINS) });
    openSheet('bigwin-share-sheet');
    if (window.logVpEvent) logVpEvent('bigwin_share_shown');
}

function bigWinShareMessage() {
    return t('share.bigWinMsg', {
        hand: vpHandLabel(bigwinShareHand),
        win: formatNumber(bigwinShareWin)
    });
}

function shareBigWinVia(channel) {
    const link = getInviteLink();
    if (!link) { closeSheet('bigwin-share-sheet'); return; }
    if (window.logVpEvent) logVpEvent('bigwin_share_clicked', { channel: channel });
    if (channel === 'native') {
        shareViaNative(t('share.appNameFull'), bigWinShareMessage(), link);
    } else {
        openShareChannel(channel, bigWinShareMessage(), link);
    }
    closeSheet('bigwin-share-sheet');
}

window.maybeOfferBigWinShare = maybeOfferBigWinShare;

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
            showToast(t('toast.signInDailyGame'));
        }
        // Otherwise: auth is still resolving. Do nothing — firing the sign-in
        // modal here would ambush every already-signed-in user who clicks a
        // link, since egUser is null until onAuthStateChanged fires.
    } catch (e) {}
}
