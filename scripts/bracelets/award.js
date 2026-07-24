// Ports functions/src/bracelets.js's hourlyBraceletAward/dailyBraceletAward
// scheduled Cloud Functions (onSchedule) into the 5-minute poller.
// awardBracelet() is already idempotent (bails out if the bracelet doc
// already exists), so it's safe and cheap to attempt every poll run rather
// than needing exact-time cron scheduling — one extra doc read per type per
// run (~576/day total, negligible on the Spark plan's free quota).
const { getFirestore, admin } = require('../lib/firebaseAdmin');

function hourKeyOf(d) {
  return d.getUTCFullYear() + String(d.getUTCMonth() + 1).padStart(2, '0') +
    String(d.getUTCDate()).padStart(2, '0') + String(d.getUTCHours()).padStart(2, '0');
}

function dayKeyOf(d) {
  return d.getUTCFullYear() + String(d.getUTCMonth() + 1).padStart(2, '0') +
    String(d.getUTCDate()).padStart(2, '0');
}

function previousHourKey() {
  const d = new Date();
  d.setUTCHours(d.getUTCHours() - 1);
  return hourKeyOf(d);
}

function previousDayKey() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return dayKeyOf(d);
}

async function awardBracelet(type, periodKey, collectionName) {
  const db = getFirestore();
  const docId = `${type}_${periodKey}`;
  const braceletRef = db.collection('bracelets').doc(docId);
  if ((await braceletRef.get()).exists) return; // already awarded (idempotent against retries)

  const topSnap = await db.collection(collectionName).doc(periodKey).collection('entries')
    .orderBy('maxWin', 'desc').limit(1).get();
  if (topSnap.empty) return; // nobody played this period

  const top = topSnap.docs[0];
  await braceletRef.create({
    type,
    periodKey,
    uid: top.id,
    displayName: top.get('displayName') || 'Player',
    handType: top.get('maxWinHandType') || '',
    winAmount: top.get('maxWin') || 0,
    awardedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

async function checkBracelets() {
  await Promise.all([
    awardBracelet('hourly', previousHourKey(), 'hourly'),
    awardBracelet('daily', previousDayKey(), 'dailyMaxWin'),
  ]);
}

module.exports = { checkBracelets, awardBracelet, hourKeyOf, dayKeyOf, previousHourKey, previousDayKey };
