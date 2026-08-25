// "You lost your place" on the daily net-profit leaderboard (daily_scores),
// the one board that had no rank-drop notification at all.
//
// Same cached-top-N diff as checkHourlyLeaderboard, but daily_scores is a flat
// collection keyed {dayKey}_{uid} with no parent day document to hang the
// cache on, so the previous standings live in system/pushRankCache instead.
const { getFirestore } = require('../lib/firebaseAdmin');
const { sendPushToUser } = require('../lib/sendPush');
const { triggerConfig } = require('../lib/pushPolicy');

const TRIGGER = 'dailyProfit';
const CACHE_DOC_PATH = 'system/pushRankCache';
const TITLE = 'Daily leaderboard';

// Matches getDayKey() in js/leaderboards.js, which is what writes the dayKey
// field these documents are queried by.
function currentDayKey() {
  const d = new Date();
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

async function checkDailyProfitRank(settings) {
  const config = triggerConfig(settings, TRIGGER);
  if (config.enabled === false) return;

  const topN = config.topN || 10;
  const db = getFirestore();
  const dayKey = currentDayKey();
  const cacheRef = db.doc(CACHE_DOC_PATH);

  const [cacheDoc, entriesSnap] = await Promise.all([
    cacheRef.get(),
    db.collection('daily_scores').where('dayKey', '==', dayKey).orderBy('score', 'desc').limit(topN).get(),
  ]);

  const cached = (cacheDoc.get(TRIGGER)) || {};
  const currentTop = entriesSnap.docs.map((doc) => doc.get('uid')).filter(Boolean);

  // A new day resets the board, so everyone from yesterday would read as
  // "dropped out". Reseed silently instead of notifying the whole top N.
  const sameDay = cached.dayKey === dayKey;
  const previousTop = sameDay ? (cached.top || []) : [];
  const bumpedOut = previousTop.filter((uid) => !currentTop.includes(uid));

  await Promise.all(bumpedOut.map((uid) =>
    sendPushToUser(uid, 'leaderboard', {
      title: TITLE,
      body: `You've lost your place in today's top ${topN}`,
    }, { trigger: TRIGGER, cooldownHours: config.cooldownHours, settings })
  ));

  await cacheRef.set({ [TRIGGER]: { dayKey, top: currentTop } }, { merge: true });
}

module.exports = { checkDailyProfitRank, TRIGGER, CACHE_DOC_PATH };
