// Ports functions/src/leaderboard.js's onHourlyLeaderboardChanged trigger
// (Cloud Functions onDocumentWritten, fired per-write) to a polling model.
// Instead of firing per-write, this just re-runs the same top-5-diff-
// against-cached-topFive check once per poll run for the CURRENT hour —
// six reads total (the hour doc + a limit(5) query), cheap regardless of
// how often the poller runs. Hour-key format matches js/champions.js's
// getHourKey() (also mirrored in js/bracelets.js's braceletHourKeyOf()).
const { getFirestore } = require('../lib/firebaseAdmin');
const { sendPushToUser } = require('../lib/sendPush');
const { triggerConfig } = require('../lib/pushPolicy');

const TOP_N = 5;
const TRIGGER = 'hourlyTop5';

function currentHourKey() {
  const d = new Date();
  return d.getUTCFullYear() + String(d.getUTCMonth() + 1).padStart(2, '0') +
    String(d.getUTCDate()).padStart(2, '0') + String(d.getUTCHours()).padStart(2, '0');
}

async function checkHourlyLeaderboard(settings) {
  const config = triggerConfig(settings, TRIGGER);
  if (config.enabled === false) return;

  const db = getFirestore();
  const hourKey = currentHourKey();
  const hourDocRef = db.doc(`hourly/${hourKey}`);

  const [hourDoc, entriesSnap] = await Promise.all([
    hourDocRef.get(),
    db.collection(`hourly/${hourKey}/entries`).orderBy('points', 'desc').limit(TOP_N).get(),
  ]);

  const previousTopFive = hourDoc.get('topFive') || [];
  const currentTopFive = entriesSnap.docs.map((doc) => doc.id);

  const bumpedOut = previousTopFive.filter((uid) => !currentTopFive.includes(uid));

  await Promise.all(bumpedOut.map((uid) =>
    sendPushToUser(uid, 'leaderboard', {
      title: 'Hourly leaderboard',
      body: "You've dropped out of this hour's top 5",
    }, { trigger: TRIGGER, cooldownHours: config.cooldownHours, settings })
  ));

  await hourDocRef.set({ topFive: currentTopFive }, { merge: true });
}

module.exports = { checkHourlyLeaderboard };
