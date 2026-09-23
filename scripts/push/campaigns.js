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
const GIFTS_COLLECTION = 'dailyGifts';
const GIFT_LIFETIME_MS = 24 * HOUR_MS;

// A coin-reward campaign opens one claimable round per send. The doc id is the
// campaign id so the share link (invite.html?gift=<id>) never changes; the
// roundKey inside it is what firestore.rules binds each player's claim to, so
// a new round is claimable again and an old one can't be claimed twice.
async function openGiftRound(db, campaignId, amount, now) {
  await db.doc(`${GIFTS_COLLECTION}/${campaignId}`).set({
    campaignId,
    amount,
    roundKey: now.toISOString().slice(0, 10),
    expiresAt: Timestamp.fromDate(new Date(now.getTime() + GIFT_LIFETIME_MS)),
    updatedAt: Timestamp.fromDate(now),
  });
}

function payloadFor(campaign, giftId) {
  const data = {
    ...(campaign.deepLink ? { deepLink: campaign.deepLink } : {}),
    ...(giftId ? { giftId } : {}),
  };
  // FCM rejects a message carrying an empty data map.
  return Object.keys(data).length ? data : null;
}

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

// A recurring campaign just books its next run — forever, unless it carries a
// maxRuns limit ("run for N days"), in which case its last run is terminal like
// a one-off. Terminal is what keeps it from being picked up again next poll.
function completionPatch(campaign, now, stats) {
  const schedule = campaign.schedule || {};
  const runCount = (Number(schedule.runCount) || 0) + 1;
  const maxRuns = Number(schedule.maxRuns) || 0;
  const base = {
    stats,
    error: null,
    'schedule.lastRunAt': Timestamp.fromDate(now),
    'schedule.runCount': runCount,
  };

  const hasRunsLeft = maxRuns === 0 || runCount < maxRuns;
  if (schedule.mode === 'recurring' && schedule.intervalHours > 0 && hasRunsLeft) {
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

  // Opened even when no device is eligible — the share link still pays out.
  const coinReward = Number(campaign.coinReward) || 0;
  if (coinReward > 0) await openGiftRound(db, doc.id, coinReward, now);

  if (entries.length === 0) {
    await doc.ref.update(
      completionPatch(campaign, now, { audienceSize, sent: 0, failed: 0, skipped: audienceSize })
    );
    console.log(`Campaign ${doc.id}: no eligible recipients.`);
    return;
  }

  const data = payloadFor(campaign, coinReward > 0 ? doc.id : null);
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

module.exports = { processCampaigns, COLLECTION, GIFTS_COLLECTION };
