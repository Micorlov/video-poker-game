// Daily coin gifts from push-admin.html's Daily campaign tab.
//
// scripts/push/campaigns.js opens one round per send at dailyGifts/{id}; a
// player reaches it by tapping that push (data.giftId) or opening the share
// link (invite.html?gift=<id> → videopoker://invite?gift=<id>). Coins are
// credited only after the claim doc lands — firestore.rules keys it
// <uid>_<roundKey>, so a second tap, device or reinstall is rejected there
// rather than paying twice.

const PENDING_GIFT_KEY = 'vp_pending_gift';
// A parked gift id outlives the app restart that sign-in often needs, but not
// forever: past this the round it pointed at is long expired anyway.
const PENDING_GIFT_MAX_AGE_MS = 48 * 60 * 60 * 1000;
const GIFT_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

let giftClaimInFlight = false;

function persistPendingGift(id) {
    try {
        localStorage.setItem(PENDING_GIFT_KEY, JSON.stringify({ id: id, at: Date.now() }));
    } catch (e) { /* localStorage unavailable */ }
}

function clearPendingGift() {
    try { localStorage.removeItem(PENDING_GIFT_KEY); } catch (e) { /* localStorage unavailable */ }
}

function loadPendingGiftId() {
    try {
        const raw = JSON.parse(localStorage.getItem(PENDING_GIFT_KEY));
        if (!raw || !GIFT_ID_PATTERN.test(raw.id)) return null;
        if (Date.now() - raw.at > PENDING_GIFT_MAX_AGE_MS) {
            clearPendingGift();
            return null;
        }
        return raw.id;
    } catch (e) {
        return null;
    }
}

function takeGiftIdFromUrl() {
    try {
        const url = new URL(window.location.href);
        const id = url.searchParams.get('gift');
        if (!id) return null;
        // Stripped so a reload or a later deep link doesn't replay it.
        url.searchParams.delete('gift');
        window.history.replaceState({}, '', url);
        return GIFT_ID_PATTERN.test(id) ? id : null;
    } catch (e) {
        return null;
    }
}

// Entry point for every surface: push tap (id passed in), deep link and web
// (?gift= in the page URL), and boot (neither — replays a parked gift).
function handleIncomingGift(explicitId) {
    const fresh = (GIFT_ID_PATTERN.test(explicitId || '') ? explicitId : null) || takeGiftIdFromUrl();
    if (fresh) {
        persistPendingGift(fresh);
        if (window.logVpEvent) logVpEvent('gift_link_opened');
    }
    if (!loadPendingGiftId()) return;

    if (window.egUser) {
        claimPendingGift();
    } else if (window._authResolved && fresh) {
        // Only nag for a gift that just arrived; a parked one waits quietly
        // for whenever the player next signs in.
        if (window.openSignInModal) openSignInModal();
        showToast(t('toast.giftSignIn'));
    } else if (fresh) {
        // Auth still resolving — the signed-out branch in js/firebase.js asks.
        window._pendingGiftPrompt = true;
    }
}

// Must run after maybeRestoreCloudState() has settled: a restore replaces the
// balance wholesale and would wipe a gift credited just before it. js/firebase.js
// calls this right after the restore; a warm tap arrives long after.
function claimPendingGift() {
    const id = loadPendingGiftId();
    const user = window.egUser;
    if (!id || !user || !db || giftClaimInFlight) return Promise.resolve(false);
    if (!cloudRestoreChecked) return Promise.resolve(false);

    giftClaimInFlight = true;
    const giftRef = db.collection('dailyGifts').doc(id);
    return (firebaseSafe(function() {
        return giftRef.get().then(function(giftDoc) {
            const gift = giftDoc.exists ? giftDoc.data() : null;
            const expired = !gift || !gift.expiresAt || gift.expiresAt.toMillis() <= Date.now();
            if (expired) {
                clearPendingGift();
                showToast(t('toast.giftExpired'));
                return false;
            }
            const claimRef = giftRef.collection('claims').doc(user.uid + '_' + gift.roundKey);
            return claimRef.get().then(function(claimDoc) {
                if (claimDoc.exists) {
                    clearPendingGift();
                    showToast(t('toast.giftAlreadyClaimed'));
                    return false;
                }
                return claimRef.set({
                    uid: user.uid,
                    roundKey: gift.roundKey,
                    amount: gift.amount,
                    claimedAt: firebase.firestore.FieldValue.serverTimestamp()
                }).then(function() {
                    // Credit before un-parking: if the app dies in between, the
                    // retry lands on "already claimed" instead of losing coins.
                    grantBonusCoins(gift.amount);
                    clearPendingGift();
                    showToast(t('toast.giftClaimed', { amount: formatNumber(gift.amount) }));
                    if (window.logVpEvent) logVpEvent('gift_claimed', { amount: gift.amount });
                    return true;
                });
            });
        });
    }, function(err) {
        // Kept parked: a network blip retries on the next launch or sign-in.
        console.warn('Gift claim failed:', err && (err.code || err.message));
    }) || Promise.resolve(false)).then(function(result) {
        giftClaimInFlight = false;
        return !!result;
    });
}

window.handleIncomingGift = handleIncomingGift;
window.claimPendingGift = claimPendingGift;
