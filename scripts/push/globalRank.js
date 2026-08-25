// "You lost your place" on the all-time global standings, ranked by the same
// users/{uid}.netProfit field the friends leaderboard uses.
//
// This is the most expensive check in the poller, so it is bounded twice.
// First, it ranks only the top N players (default 200) rather than every user
// — falling from rank 800 to 900 is not a moment anyone wants a notification
// about, so the cap costs no real signal. Second, it self-throttles to once an
// hour rather than running on all 288 daily poll passes. Together that is
// roughly 4.8k reads/day against Firestore's 50k/day Spark free quota, versus
// the ~57k/day an unthrottled top-200 check would cost — which is precisely
// the quota blowout that makes the naive version unshippable.
const { getFirestore, Timestamp } = require('../lib/firebaseAdmin');
const { sendPushToUser } = require('../lib/sendPush');
const { triggerConfig } = require('../lib/pushPolicy');

const TRIGGER = 'globalRank';
const CACHE_DOC_PATH = 'system/pushRankCache';
const TITLE = 'Global leaderboard';
const MINUTE_MS = 60 * 1000;

function lastRunMillis(cached) {
  const value = cached.lastRunAt;
  if (!value) return null;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.toDate === 'function') return value.toDate().getTime();
  return typeof value === 'number' ? value : null;
}

async function checkGlobalRank(settings) {
  const config = triggerConfig(settings, TRIGGER);
  if (config.enabled === false) return;

  const db = getFirestore();
  const cacheRef = db.doc(CACHE_DOC_PATH);
  const cacheDoc = await cacheRef.get();
  const cached = cacheDoc.get(TRIGGER) || {};

  const now = new Date();
  const throttleMs = (config.minRunIntervalMinutes || 60) * MINUTE_MS;
  const lastRun = lastRunMillis(cached);
  if (lastRun !== null && now.getTime() - lastRun < throttleMs) return;

  const topN = config.topN || 200;
  const entriesSnap = await db.collection('users').orderBy('netProfit', 'desc').limit(topN).get();
  const currentTop = entriesSnap.docs.map((doc) => doc.id);
  const previousTop = cached.top || [];

  // First run has no baseline; seeding it silently avoids telling 200 players
  // they were just knocked off a board that had never been measured.
  const bumpedOut = previousTop.length ? previousTop.filter((uid) => !currentTop.includes(uid)) : [];

  await Promise.all(bumpedOut.map((uid) =>
    sendPushToUser(uid, 'leaderboard', {
      title: TITLE,
      body: `You've lost your place in the all-time top ${topN}`,
    }, { trigger: TRIGGER, cooldownHours: config.cooldownHours, settings })
  ));

  await cacheRef.set(
    { [TRIGGER]: { top: currentTop, lastRunAt: Timestamp.fromDate(now) } },
    { merge: true }
  );
}

module.exports = { checkGlobalRank, TRIGGER, CACHE_DOC_PATH };
