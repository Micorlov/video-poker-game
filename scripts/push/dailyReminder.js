// Standalone entrypoint — run once per day by
// .github/workflows/daily-reminder.yml, deliberately NOT part of
// scripts/push/poll.js's 5-minute cycle.
//
// Why: the where('lastPlayedDate', '<', today) query below returns EVERY
// currently-stale user on each run, not just newly-stale ones — there's no
// single instant a user "becomes stale" that a where('field', '>', since)
// cursor query could capture, so this can't be made incremental like the
// other checks. Running it every 5 minutes would re-read every stale user's
// doc 288 times a day, which would quickly blow through Firestore's
// Spark-plan free quota of 50k reads/day. Once a day keeps it cheap.
//
// Ports functions/src/dailyReminder.js's dailyComebackReminder scheduled
// Cloud Function unchanged in logic.
const { getFirestore } = require('../lib/firebaseAdmin');
const { sendPushToUser } = require('../lib/sendPush');
const { loadSettings } = require('../lib/pushPolicy');

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

async function dailyComebackReminder() {
  const today = todayString();
  const db = getFirestore();
  // Quiet hours matter most here: this is the one push that goes to players
  // who are, by definition, not currently in the app.
  const settings = await loadSettings();

  const staleUsersSnap = await db.collection('users').where('lastPlayedDate', '<', today).get();
  const dueUsers = staleUsersSnap.docs.filter((doc) => doc.get('lastDailyReminderSent') !== today);

  // A reason to come back beats a restated feature: the daily board resets at
  // the player's own midnight (getDayKey() in js/leaderboards.js uses the
  // device's local date), so "still open today" is true for every timezone
  // without promising a countdown this once-a-day job cannot know.
  //
  // This job stays on server time by design — see the quota note above, which
  // is why it cannot run hourly. A campaign that needs each player's own
  // evening goes through the Push Center's localDaily mode instead
  // (scripts/lib/localHour.js).
  await Promise.all(dueUsers.map(async (doc) => {
    await sendPushToUser(doc.id, 'dailyReminder', {
      title: "Today's leaderboard is still open",
      body: 'It resets at midnight and your ALL IN is waiting. One hand puts you on the board.',
    }, { settings });
    await doc.ref.set({ lastDailyReminderSent: today }, { merge: true });
  }));
}

dailyComebackReminder()
  .then(() => {
    console.log('Daily reminder run complete.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Daily reminder run failed:', err);
    process.exit(1);
  });

module.exports = { dailyComebackReminder };
