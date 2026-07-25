// Delivery log for every push notification sent by any path (poll checks via
// sendPush.js, the manual broadcast tool, and the admin test queue). Rendered
// by admin.html's Push tab so there's a single place to see which users were
// actually reached. Writes never throw — a logging failure must not abort or
// retry an already-delivered notification.
const { getFirestore } = require('./firebaseAdmin');

const PUSH_LOGS_COLLECTION = 'pushLogs';

async function logPush(entry) {
  try {
    const db = getFirestore();
    await db.collection(PUSH_LOGS_COLLECTION).add({
      uid: entry.uid || null,
      displayName: entry.displayName || null,
      category: entry.category || 'unknown',
      title: entry.title || '',
      body: entry.body || '',
      source: entry.source || 'poll',
      status: entry.status || 'sent',
      tokenCount: entry.tokenCount || 0,
      successCount: entry.successCount || 0,
      failureCount: entry.failureCount || 0,
      platforms: entry.platforms || [],
      error: entry.error || null,
      sentAt: new Date(),
    });
  } catch (err) {
    console.error('Failed to write push log:', err.message);
  }
}

module.exports = { logPush, PUSH_LOGS_COLLECTION };
