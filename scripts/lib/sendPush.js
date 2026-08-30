// Near-identical port of functions/src/lib/sendPush.js (now deleted along
// with the rest of the Cloud Functions backend) — same token-cleanup-on-
// invalid-token logic, just requiring the shared scripts/lib/firebaseAdmin.js
// instead of a bare `require('firebase-admin')` + Cloud-Functions-managed init.
//
// Every automatic trigger routes through here, so this is also where delivery
// policy is enforced: a caller passing `options.trigger` opts that send into
// the quiet-hours window and the per-user cooldown configured in
// config/pushSettings (see scripts/lib/pushPolicy.js). Suppressions are logged
// as status='skipped' with a reason rather than dropped silently, which is
// what makes them visible in the admin center's delivery log.
const { getFirestore, getMessaging } = require('./firebaseAdmin');
const { logPush } = require('./pushLog');
const { withinCooldown, isQuietHours, cooldownPatch } = require('./pushPolicy');

async function sendPushToUser(uid, category, notification, options = {}) {
  const { trigger = null, cooldownHours = 0, settings = null } = options;
  const db = getFirestore();
  const userSnap = await db.doc(`users/${uid}`).get();
  const userData = userSnap.data() || {};
  const displayName = userSnap.get('displayName') || null;
  const prefs = userSnap.get('notificationPrefs') || {};

  // Skipped sends are logged too — the admin panel needs to explain why a
  // user is missing from a delivery, not just omit them silently.
  const base = {
    uid,
    displayName,
    category,
    title: notification.title,
    body: notification.body,
    source: 'poll',
  };

  if (prefs[category] === false) {
    await logPush({ ...base, status: 'skipped', error: 'Category muted in notificationPrefs' });
    return;
  }

  // Quiet hours apply to every automatic send, not just rank triggers — a 3am
  // "someone added you as a friend" is no more welcome than a 3am rank alert.
  // Cooldowns are per-trigger, so they only apply where a trigger was named.
  const now = new Date();
  if (isQuietHours(userData, settings, now)) {
    await logPush({ ...base, status: 'skipped', error: 'Quiet hours in user local time' });
    return;
  }
  if (trigger && withinCooldown(userData, trigger, cooldownHours, now)) {
    await logPush({ ...base, status: 'skipped', error: `Cooldown active (${cooldownHours}h) for ${trigger}` });
    return;
  }

  const tokensSnap = await db.collection(`users/${uid}/fcmTokens`).get();
  if (tokensSnap.empty) {
    await logPush({ ...base, status: 'skipped', error: 'No registered device tokens' });
    return;
  }

  const tokens = tokensSnap.docs.map((doc) => doc.id);
  const platforms = tokensSnap.docs.map((doc) => doc.get('platform') || 'unknown');
  const response = await getMessaging().sendEachForMulticast({
    tokens,
    notification,
  });

  await logPush({
    ...base,
    status: response.successCount > 0 ? 'sent' : 'failed',
    tokenCount: tokens.length,
    successCount: response.successCount,
    failureCount: response.failureCount,
    platforms,
  });

  // Only a delivery that actually reached a device starts the cooldown —
  // otherwise a user with nothing but stale tokens would be muted for hours
  // on the strength of a send that never arrived.
  if (trigger && response.successCount > 0) {
    await db.doc(`users/${uid}`).set(cooldownPatch(trigger, now), { merge: true });
  }

  const staleTokens = [];
  response.responses.forEach((result, index) => {
    if (!result.success && result.error.code === 'messaging/registration-token-not-registered') {
      staleTokens.push(tokens[index]);
    }
  });

  await Promise.all(
    staleTokens.map((token) => db.doc(`users/${uid}/fcmTokens/${token}`).delete())
  );
}

module.exports = { sendPushToUser };
