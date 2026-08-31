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
// Two-sided: the invitee gets a welcome gift too. The invitee's reward is what
// motivates the inviter — it turns the ask into gift-giving. Pinned in
// firestore.rules alongside rewardCoins.
const REFERRAL_INVITEE_COINS = 1000;
// Single source of truth for the opening stack — onboarding promises
// "Start with 1,000 chips", so every grant site must agree with it.
const STARTING_BALANCE = 1000;
// A referral only pays out for a genuinely new account, so an existing player
// can't re-click a friend's link for coins. Firebase reports creationTime on
// every sign-in path (popup, redirect, and the native plugin's credential
// hand-off), which the UserCredential.additionalUserInfo flag does not.
const REFERRAL_SIGNUP_WINDOW_MS = 10 * 60 * 1000;

const REFERRAL_INVITED_KEY = 'vp_referral_invited';

// How many friends this player has referred — powers the All-In unlock
// (js/game.js getAllInDailyLimit). Reads the persisted copy so it works at
// cold start and offline; subscribeReferralRewards() keeps it current.
function getReferralInvitedCount() {
    try { return parseInt(localStorage.getItem(REFERRAL_INVITED_KEY), 10) || 0; } catch (e) { return 0; }
}
window.getReferralInvitedCount = getReferralInvitedCount;

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
                inviteeCoins: REFERRAL_INVITEE_COINS,
                claimedAt: null,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            }).then(function() {
                if (window.logVpEvent) logVpEvent('referral_joined');
                // The ledger row landed exactly once (doc is keyed by this
                // uid), so the welcome gift credits exactly once too.
                creditInviteeWelcomeCoins();
                return true;
            });
        });
    }, function() { /* the friendship already landed — a lost reward row is not worth a toast */ })
        || Promise.resolve(false);
}

// The invitee's side of the two-sided reward. Local credit, same bookkeeping
// as the inviter's: the gift raises the net-profit baselines so it never
// reads as winnings on any leaderboard.
function creditInviteeWelcomeCoins() {
    balance += REFERRAL_INVITEE_COINS;
    referralBonusTotal += REFERRAL_INVITEE_COINS;
    saveReferralBonusTotal();
    if (window.ensureDailyBaseline) {
        ensureDailyBaseline();
        dailyProgress.baseline += REFERRAL_INVITEE_COINS;
        saveDailyProgress();
    }
    const balanceEl = document.getElementById('balance');
    if (balanceEl) balanceEl.textContent = balance;
    if (window.saveGameState) saveGameState();
    if (window.pushNetProfit) pushNetProfit();
    showToast('🎁 Your friend sent you ' + REFERRAL_INVITEE_COINS.toLocaleString() + ' coins — welcome to the table!');
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
            // Persisted so getAllInDailyLimit() (js/game.js) can read the
            // referral count offline and before this subscription first fires.
            try { localStorage.setItem(REFERRAL_INVITED_KEY, String(invited)); } catch (e) {}
            if (window.updateAllInUI) updateAllInUI();
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
    if (window.logVpEvent) logVpEvent('referral_claimed', { coins: total });
}

function cleanupReferrals() {
    if (referralUnsubscribe) { referralUnsubscribe(); referralUnsubscribe = null; }
    referralStats = { invited: 0, coinsEarned: 0 };
    renderInviteRewardLine();
}

function renderInviteRewardLine() {
    // Same line lives in two places: the invite sheet and the Friends screen
    // action strip (the OS share sheet can't carry the reward pitch, so it
    // stays visible on the page itself).
    // Milestone framing with endowed progress: the player themselves counts
    // as the first seat, so the ladder never starts from zero.
    let text;
    const n = referralStats.invited;
    if (!n) {
        text = '1 of 3 seats filled — you hold the first. You get ' +
            REFERRAL_REWARD_COINS.toLocaleString() + ' coins per friend, they get ' +
            REFERRAL_INVITEE_COINS.toLocaleString() + '.';
    } else if (n < 3) {
        text = (n + 1) + ' of 3 seats filled · ' +
            referralStats.coinsEarned.toLocaleString() + ' coins earned';
    } else {
        text = 'Table regular — ' + n + ' friends joined · ' +
            referralStats.coinsEarned.toLocaleString() + ' coins earned';
    }
    ['invite-reward-line', 'friends-invite-reward'].forEach(function(id) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    });
}
