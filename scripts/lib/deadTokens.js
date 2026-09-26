// Which FCM send failures mean a device token is dead for good, and the
// cleanup that removes it.
//
// Only sendPushToUser() used to purge, and only on one code, while the
// campaign/broadcast fan-out (scripts/lib/multicast.js) never purged at all —
// so the daily campaign re-sent to the same dead third of all tokens every
// run, and the delivery log recorded "failed" with no reason why.

// Permanent for this project: the app was uninstalled or its data cleared
// (not-registered), the token is malformed (invalid-registration-token), or it
// belongs to a different Firebase sender (mismatched-credential).
const DEAD_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/mismatched-credential',
]);

// invalid-argument is ambiguous: it is also what a malformed *payload* gets,
// and treating that as a dead token would wipe every token on one bad
// campaign. Only a message naming the registration token counts.
function isDeadTokenError(error) {
  if (!error) return false;
  if (DEAD_TOKEN_CODES.has(error.code)) return true;
  return error.code === 'messaging/invalid-argument' && /registration token/i.test(error.message || '');
}

// { 'messaging/…': n } for the failed results — what the delivery log shows
// in place of a bare failure count.
function errorCodeCounts(results) {
  return results.reduce((counts, result) => {
    if (result.success) return counts;
    const code = (result.error && result.error.code) || 'unknown';
    return { ...counts, [code]: (counts[code] || 0) + 1 };
  }, {});
}

// entries: [{ uid, token }]
async function purgeDeadTokens(db, entries) {
  await Promise.all(entries.map(({ uid, token }) =>
    db.doc(`users/${uid}/fcmTokens/${token}`).delete().catch((err) => {
      console.error(`Failed to purge dead token for ${uid}:`, err.message);
    })
  ));
  return entries.length;
}

module.exports = { isDeadTokenError, errorCodeCounts, purgeDeadTokens, DEAD_TOKEN_CODES };
