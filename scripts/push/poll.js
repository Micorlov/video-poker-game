// Entrypoint run every 5 minutes by .github/workflows/push-poll.yml.
// Replaces the Cloud Functions event triggers (friends/rooms/leaderboard/
// bestHand) plus the bracelets scheduled functions with one polling pass:
// read the cursor, run every check against "since", then advance the cursor.
//
// This pass is also the execution half of the admin center: push-admin.html
// can only write intent to Firestore, so processCampaigns() is what actually
// delivers anything an admin composes.
const { getCursor, setCursor } = require('../lib/cursor');
const { loadSettings } = require('../lib/pushPolicy');
const { checkNewFriends } = require('./friends');
const { checkRoomActivity } = require('./rooms');
const { checkRoomInvites } = require('./roomInvites');
const { checkHourlyLeaderboard } = require('./leaderboard');
const { checkBestHand } = require('./bestHand');
const { checkFriendRanks } = require('./friendRank');
const { checkDailyProfitRank } = require('./dailyProfitRank');
const { checkGlobalRank } = require('./globalRank');
const { processCampaigns } = require('./campaigns');
const { checkBracelets } = require('../bracelets/award');

async function poll() {
  const since = await getCursor();
  const pollStartedAt = new Date();

  // One read, shared by every check — cooldowns and quiet hours are enforced
  // inside sendPushToUser, which needs the settings passed down to it.
  const settings = await loadSettings();

  await Promise.all([
    checkNewFriends(since, settings),
    checkRoomActivity(since, settings),
    checkRoomInvites(since, settings),
    checkHourlyLeaderboard(settings),
    checkBestHand(since, settings),
    checkFriendRanks(since, settings),
    checkDailyProfitRank(settings),
    checkGlobalRank(settings),
    processCampaigns(settings),
    checkBracelets(),
  ]);

  await setCursor(pollStartedAt);
}

poll()
  .then(() => {
    console.log('Push poll complete.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Push poll failed:', err);
    process.exit(1);
  });
