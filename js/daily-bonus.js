// Daily free chips: +200 on the first launch of each local calendar day.
//
// Same bookkeeping as the invitee welcome gift (js/referral.js): the chips
// raise the referral-bonus and daily-net baselines so they never read as
// winnings on any leaderboard.

const DAILY_BONUS_CHIPS = 200;
const DAILY_BONUS_KEY = 'vp_daily_bonus';

function loadDailyBonusDate() {
    try {
        const raw = JSON.parse(localStorage.getItem(DAILY_BONUS_KEY));
        return (raw && typeof raw.date === 'string') ? raw.date : '';
    } catch (e) {
        return '';
    }
}

function saveDailyBonusDate(date) {
    try {
        localStorage.setItem(DAILY_BONUS_KEY, JSON.stringify({ date: date }));
    } catch (e) { /* localStorage unavailable, silently fail */ }
}

// A device with no saved state yet may be about to receive a cloud restore
// (js/cloudsave.js), which only happens while the local stack looks untouched.
// Granting first would make the stack look played and block the restore, so
// the grant waits; maybeRestoreCloudState() calls back in once it has settled.
function dailyBonusMustWaitForCloud() {
    try {
        if (localStorage.getItem('vp_game_state')) return false;
    } catch (e) {
        return false;
    }
    return !!(window.localStateIsFresh && localStateIsFresh());
}

// Idempotent per day: safe to call at boot and again after a cloud restore.
function maybeGrantDailyBonus() {
    const today = vpTodayKey();
    if (loadDailyBonusDate() === today) return false;
    if (dailyBonusMustWaitForCloud()) return false;
    grantBonusCoins(DAILY_BONUS_CHIPS);
    saveDailyBonusDate(today);
    if (window.logVpEvent) logVpEvent(VP_ASO_EVENTS.dailyBonusClaimed, { amount: DAILY_BONUS_CHIPS });
    showToast(t('toast.dailyBonus', { amount: formatNumber(DAILY_BONUS_CHIPS) }));
    return true;
}

window.maybeGrantDailyBonus = maybeGrantDailyBonus;
