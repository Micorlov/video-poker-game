// Referral rewards — the inviter gets REFERRAL_REWARD_COINS for every friend
// who installs and signs in with Google through their invite link.
//
// Ledger shape: one referrals/{referredUid} document, created by the referred
// player on their first sign-in. Keying it by the *referred* uid rather than
// storing a counter on the inviter is what makes the payout idempotent — a
// second invite link, a reinstall, or a replayed Play install referrer all land
// on the same document id and are rejected as already-present. The inviter then
// claims each row by stamping claimedAt, which the security rules only permit
// while it is still null (see FIRESTORE_RULES_REFERRALS.md).

const REFERRAL_REWARD_COINS = 2000;
const STARTING_BALANCE = 500;
// A referral only pays out for a genuinely new account, so an existing player
// can't re-click a friend's link for coins. Firebase reports creationTime on
// every sign-in path (popup, redirect, and the native plugin's credential
// hand-off), which the UserCredential.additionalUserInfo flag does not.
const REFERRAL_SIGNUP_WINDOW_MS = 10 * 60 * 1000;

function loadReferralBonusTotal() {
    try { return parseInt(localStorage.getItem('vp_referral_bonus'), 10) || 0; } catch (e) { return 0; }
}

let referralBonusTotal = loadReferralBonusTotal();
let referralStats = { invited: 0, coinsEarned: 0 };
let referralUnsubscribe = null;
const referralClaimsInFlight = {};

function saveReferralBonusTotal() {
    try { localStorage.setItem('vp_referral_bonus', String(referralBonusTotal)); } catch (e) { /* localStorage unavailable */ }
}

// Bonus coins are a gift, not winnings. Every leaderboard here ranks on net
// profit, so the baseline rises with each bonus — otherwise an invite spree
// would read as a hot streak and outrank people who actually played well.
function netProfitBaseline() {
    return STARTING_BALANCE + referralBonusTotal;
}

// Called by doRebuy(). The rebuy hands the player a fresh STARTING_BALANCE, so
// every coin gifted before it has been wiped along with the stack — leaving the
// bonus in the baseline would show them at -referralBonusTotal from a clean start.
function resetReferralBaseline() {
    referralBonusTotal = 0;
    saveReferralBonusTotal();
}

function _signedInWithGoogle(user) {
    const providers = ((user && user.providerData) || []).map(function(p) { return p && p.providerId; });
    return providers.indexOf('google.com') !== -1;
}

function _isFreshAccount(user) {
    try {
        const created = Date.parse(user.metadata && user.metadata.creationTime);
        if (!created) return false;
        return (Date.now() - created) < REFERRAL_SIGNUP_WINDOW_MS;
    } catch (e) { return false; }
}

function isReferralEligibleSignup(user) {
    return !!user && _signedInWithGoogle(user) && _isFreshAccount(user);
}

// Called from addFriendByInviteCode() once the friendship itself is connected,
// so a link click always makes friends even when it earns nobody any coins.
function recordReferralJoin(code, inviterUid) {
    const user = window.egUser;
    if (!user || !db || !inviterUid || inviterUid === user.uid) return Promise.resolve(false);
    if (!isReferralEligibleSignup(user)) return Promise.resolve(false);

    const rowRef = db.collection('referrals').doc(user.uid);
    return firebaseSafe(function() {
        return rowRef.get().then(function(doc) {
            if (doc.exists) return false;
            return rowRef.set({
                referredUid: user.uid,
                referredName: user.displayName || 'Player',
                inviterUid: inviterUid,
                code: code,
                provider: 'google.com',
                rewardCoins: REFERRAL_REWARD_COINS,
                claimedAt: null,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            }).then(function() { return true; });
        });
    }, function() { /* the friendship already landed — a lost reward row is not worth a toast */ })
        || Promise.resolve(false);
}

// Live subscription rather than a one-shot read, so an inviter watching the
// Friends screen sees the coins arrive the moment a friend signs in.
function subscribeReferralRewards() {
    const user = window.egUser;
    if (!user || !db) return;
    if (referralUnsubscribe) referralUnsubscribe();
    referralUnsubscribe = db.collection('referrals').where('inviterUid', '==', user.uid)
        .onSnapshot(function(snap) {
            const pending = [];
            let invited = 0;
            let earned = 0;
            snap.forEach(function(doc) {
                const data = doc.data();
                const coins = data.rewardCoins || REFERRAL_REWARD_COINS;
                invited++;
                if (data.claimedAt) {
                    earned += coins;
                } else if (!referralClaimsInFlight[doc.id]) {
                    pending.push({ id: doc.id, ref: doc.ref, coins: coins, name: data.referredName || 'A friend' });
                }
            });
            referralStats = { invited: invited, coinsEarned: earned };
            renderInviteRewardLine();
            if (pending.length) claimReferralRewards(pending);
        }, function() { /* ignore Firestore errors — rewards retry on next sign-in */ });
}

function claimReferralRewards(pending) {
    pending.forEach(function(item) { referralClaimsInFlight[item.id] = true; });
    return Promise.all(pending.map(function(item) {
        // Credit only what the server actually accepted. The rule rejects the
        // update once claimedAt is set, so a second device replaying the same
        // reward drops out here instead of paying twice.
        return item.ref.update({ claimedAt: firebase.firestore.FieldValue.serverTimestamp() })
            .then(function() { return item; })
            .catch(function() { return null; });
    })).then(function(results) {
        pending.forEach(function(item) { delete referralClaimsInFlight[item.id]; });
        const claimed = results.filter(Boolean);
        if (claimed.length) creditReferralCoins(claimed);
    });
}

function creditReferralCoins(claimed) {
    const total = claimed.reduce(function(sum, item) { return sum + item.coins; }, 0);
    balance += total;
    referralBonusTotal += total;
    saveReferralBonusTotal();

    // Today's baseline was captured before the gift arrived, so raise it by the
    // same amount to keep the daily board honest as well as the all-time one.
    if (window.ensureDailyBaseline) {
        ensureDailyBaseline();
        dailyProgress.baseline += total;
        saveDailyProgress();
    }

    const balanceEl = document.getElementById('balance');
    if (balanceEl) balanceEl.textContent = balance;
    if (window.saveGameState) saveGameState();

    referralStats.coinsEarned += total;
    renderInviteRewardLine();
    if (window.renderFriendsScreen) renderFriendsScreen();
    if (window.pushNetProfit) pushNetProfit();

    const who = claimed.length === 1
        ? claimed[0].name + ' joined'
        : claimed.length + ' friends joined';
    showToast('🎁 ' + who + ' — +' + total + ' coins!');
}

function cleanupReferrals() {
    if (referralUnsubscribe) { referralUnsubscribe(); referralUnsubscribe = null; }
    referralStats = { invited: 0, coinsEarned: 0 };
    renderInviteRewardLine();
}

function renderInviteRewardLine() {
    const el = document.getElementById('invite-reward-line');
    if (!el) return;
    if (!referralStats.invited) {
        el.textContent = 'Get ' + REFERRAL_REWARD_COINS + ' coins for every friend who joins with Google.';
        return;
    }
    const n = referralStats.invited;
    el.textContent = n + ' friend' + (n === 1 ? '' : 's') + ' joined · ' +
        referralStats.coinsEarned + ' coins earned';
}
