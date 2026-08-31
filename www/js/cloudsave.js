// Cloud backup of the local chip stack — makes onboarding's "never lose your
// chips" promise true. localStorage stays the source of truth while playing;
// the cloud copy is written on every save (debounced) and only ever restored
// onto a fresh install, so an existing local stack is never clobbered.

const CLOUD_SAVE_DEBOUNCE_MS = 10000;
let cloudSaveTimer = null;
let cloudRestoreChecked = false;

function schedulePushCloudState() {
    if (!window.egUser || !db) return;
    if (cloudSaveTimer) clearTimeout(cloudSaveTimer);
    cloudSaveTimer = setTimeout(pushCloudState, CLOUD_SAVE_DEBOUNCE_MS);
}

function pushCloudState() {
    cloudSaveTimer = null;
    const user = window.egUser;
    if (!user || !db) return;
    firebaseSafe(function() {
        return db.collection('users').doc(user.uid).set({
            cloudState: {
                balance: balance,
                totalWon: totalWon,
                totalLost: totalLost,
                handsPlayed: handsPlayed,
                bestStreak: bestStreak,
                referralBonus: referralBonusTotal,
                savedAt: firebase.firestore.FieldValue.serverTimestamp()
            }
        }, { merge: true });
    });
}

// A device qualifies for a restore only when it has nothing worth keeping:
// no saved state at all, or an untouched default stack. Anything else means
// the player is mid-run here and the local stack wins (it gets pushed up).
function localStateIsFresh() {
    try {
        if (!localStorage.getItem('vp_game_state')) return true;
    } catch (e) {
        return false;
    }
    return handsPlayed === 0 && balance === STARTING_BALANCE;
}

// Called from logUserToFirestore() once the users/{uid} doc has been read.
function maybeRestoreCloudState(userDoc) {
    if (cloudRestoreChecked) return;
    cloudRestoreChecked = true;

    const cloud = userDoc && userDoc.cloudState;
    if (!cloud || typeof cloud.balance !== 'number') {
        // Nothing in the cloud yet — seed it from whatever this device holds.
        schedulePushCloudState();
        return;
    }
    if (!localStateIsFresh()) {
        schedulePushCloudState();
        return;
    }

    balance = cloud.balance;
    totalWon = cloud.totalWon || 0;
    totalLost = cloud.totalLost || 0;
    handsPlayed = cloud.handsPlayed || 0;
    bestStreak = cloud.bestStreak || 0;

    // The referral bonus rides along so netProfitBaseline() stays honest on
    // the new device — otherwise gifted coins would read as winnings here.
    referralBonusTotal = cloud.referralBonus || 0;
    saveReferralBonusTotal();

    // The restored stack is this device's day-one starting point: daily net
    // must begin at zero, not at (restored balance − default baseline).
    if (window.ensureDailyBaseline) {
        ensureDailyBaseline();
        dailyProgress.baseline = balance;
        saveDailyProgress();
    }

    const balanceEl = document.getElementById('balance');
    if (balanceEl) balanceEl.textContent = balance;
    if (window.saveGameState) saveGameState();
    if (window.updateStats) updateStats();
    if (window.pushNetProfit) pushNetProfit();
    showToast(t('toast.cloudRestored', { amount: formatNumber(balance) }));
}

window.schedulePushCloudState = schedulePushCloudState;
window.maybeRestoreCloudState = maybeRestoreCloudState;
