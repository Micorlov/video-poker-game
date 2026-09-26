// Fans one notification out across a resolved audience and reports the result
// per user rather than per token. Both the campaign runner and the standalone
// broadcast tool need exactly this, and the delivery log is keyed by user, so
// the token-level FCM responses are folded back onto their owning uid here.
const { getFirestore, getMessaging } = require('./firebaseAdmin');
const { chunk, FCM_BATCH_SIZE } = require('./audience');
const { isDeadTokenError, errorCodeCounts, purgeDeadTokens } = require('./deadTokens');

function emptyStat() {
  return { tokenCount: 0, successCount: 0, failureCount: 0, platforms: [], errorCodes: {} };
}

// entries: [{ token, uid, platform }] from scripts/lib/audience.js
// Returns Map<uid, { tokenCount, successCount, failureCount, platforms, errorCodes }>.
// Tokens that failed permanently are deleted before this returns, so the next
// send no longer counts them.
async function sendToEntries(entries, notification, data) {
  const perUser = new Map();
  const deadEntries = [];

  const recordResult = (entry, result) => {
    const stat = perUser.get(entry.uid) || emptyStat();
    const codes = errorCodeCounts([result]);
    perUser.set(entry.uid, {
      tokenCount: stat.tokenCount + 1,
      successCount: stat.successCount + (result.success ? 1 : 0),
      failureCount: stat.failureCount + (result.success ? 0 : 1),
      platforms: stat.platforms.includes(entry.platform) ? stat.platforms : [...stat.platforms, entry.platform],
      errorCodes: Object.keys(codes).reduce(
        (acc, code) => ({ ...acc, [code]: (acc[code] || 0) + codes[code] }),
        stat.errorCodes
      ),
    });
    if (!result.success && isDeadTokenError(result.error)) deadEntries.push(entry);
  };

  // FCM caps a multicast at 500 tokens, so a large audience goes out as
  // several sequential batches.
  for (const batch of chunk(entries, FCM_BATCH_SIZE)) {
    const message = {
      tokens: batch.map((entry) => entry.token),
      notification,
    };
    // FCM requires every data value to be a string, and rejects the whole
    // message if `data` is present but empty.
    if (data && Object.keys(data).length > 0) {
      message.data = Object.keys(data).reduce((acc, key) => ({ ...acc, [key]: String(data[key]) }), {});
    }
    const response = await getMessaging().sendEachForMulticast(message);
    response.responses.forEach((result, index) => recordResult(batch[index], result));
  }

  if (deadEntries.length) {
    await purgeDeadTokens(getFirestore(), deadEntries);
    console.log(`Purged ${deadEntries.length} dead device token(s).`);
  }
  return perUser;
}

function totalsOf(perUser) {
  const stats = [...perUser.values()];
  return {
    users: perUser.size,
    tokens: stats.reduce((sum, stat) => sum + stat.tokenCount, 0),
    sent: stats.reduce((sum, stat) => sum + stat.successCount, 0),
    failed: stats.reduce((sum, stat) => sum + stat.failureCount, 0),
  };
}

module.exports = { sendToEntries, totalsOf };
