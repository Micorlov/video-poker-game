// Drains the pushCampaigns queue written by push-admin.html.
//
// The admin center runs in a browser and so can never hold a service-account
// credential; it writes intent (what to send, to whom, when) and this runner —
// executing inside the GitHub Actions poll pass, where the credential lives —
// performs the actual delivery and writes the result back. That split is why
// a campaign takes up to one poll interval to go out.
const { getFirestore, Timestamp } = require('../lib/firebaseAdmin');
const { resolveAudience, filterByPrefs, displayNamesFor } = require('../lib/audience');
const { sendToEntries, totalsOf } = require('../lib/multicast');
const { logPush } = require('../lib/pushLog');
const { isQuietHours, quietHoursEndAt } = require('../lib/pushPolicy');

const COLLECTION = 'pushCampaigns';
const HOUR_MS = 60 * 60 * 1000;

async function logCampaignDelivery(db, perUser, campaign) {
  const names = await displayNamesFor(db, [...perUser.keys()]);
  await Promise.all(
    [...perUser.entries()].map(([uid, stat]) =>
      logPush({
        uid,
        displayName: names[uid],
        category: campaign.category || 'announcement',
        title: campaign.title,
        body: campaign.body,
        source: 'campaign',
        status: stat.successCount > 0 ? 'sent' : 'failed',
        ...stat,
      })
    )
  );
}

// A recurring campaign never completes — it just books its next run. A one-off
// is terminal, which is what keeps it from being picked up again next poll.
function completionPatch(campaign, now, stats) {
  const schedule = campaign.schedule || {};
  const base = {
    stats,
    error: null,
    'schedule.lastRunAt': Timestamp.fromDate(now),
  };

  if (schedule.mode === 'recurring' && schedule.intervalHours > 0) {
    return {
      ...base,
      status: 'scheduled',
      'schedule.nextRunAt': Timestamp.fromDate(new Date(now.getTime() + schedule.intervalHours * HOUR_MS)),
    };
  }

  return { ...base, status: 'sent' };
}

async function runCampaign(db, doc, settings, now) {
  const campaign = doc.data();

  // Quiet hours hold a composed campaign rather than dropping it: unlike a
  // rank-change alert, an announcement is just as true in the morning.
  if ((settings.quietHours || {}).mode === 'hold' && isQuietHours({}, settings, now)) {
    await doc.ref.update({ 'schedule.nextRunAt': Timestamp.fromDate(quietHoursEndAt(settings, now)) });
    console.log(`Campaign ${doc.id} held until quiet hours end.`);
    return;
  }

  await doc.ref.update({ status: 'sending' });

  const category = campaign.category || 'announcement';
  let entries = await resolveAudience(db, campaign.audience);
  const audienceSize = entries.length;

  if (campaign.respectPrefs !== false) {
    entries = await filterByPrefs(db, entries, category);
  }

  if (entries.length === 0) {
    await doc.ref.update(
      completionPatch(campaign, now, { audienceSize, sent: 0, failed: 0, skipped: audienceSize })
    );
    console.log(`Campaign ${doc.id}: no eligible recipients.`);
    return;
  }

  const data = campaign.deepLink ? { deepLink: campaign.deepLink } : null;
  const perUser = await sendToEntries(entries, { title: campaign.title, body: campaign.body }, data);
  await logCampaignDelivery(db, perUser, campaign);

  const totals = totalsOf(perUser);
  await doc.ref.update(
    completionPatch(campaign, now, {
      audienceSize,
      sent: totals.sent,
      failed: totals.failed,
      skipped: audienceSize - totals.tokens,
    })
  );
  console.log(`Campaign ${doc.id}: ${totals.sent} sent, ${totals.failed} failed across ${totals.users} users.`);
}

async function processCampaigns(settings) {
  const db = getFirestore();
  const now = new Date();
  const snap = await db
    .collection(COLLECTION)
    .where('status', '==', 'scheduled')
    .where('schedule.nextRunAt', '<=', Timestamp.fromDate(now))
    .get();

  if (snap.empty) return;

  // Sequential rather than parallel: campaigns can each fan out to every
  // device in the app, and running two large ones at once would multiply the
  // peak FCM and Firestore load for no wall-clock gain inside a 5-minute job.
  for (const doc of snap.docs) {
    try {
      await runCampaign(db, doc, settings || {}, now);
    } catch (err) {
      console.error(`Campaign ${doc.id} failed:`, err.message);
      // Terminal on purpose — a campaign that throws would throw again next
      // poll, and a retry loop on a send path can double-notify everyone.
      await doc.ref.update({ status: 'failed', error: err.message });
    }
  }
}

module.exports = { processCampaigns, COLLECTION };
