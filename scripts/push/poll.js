// Entrypoint run every 5 minutes by .github/workflows/push-poll.yml.
// Replaces the Cloud Functions event triggers (friends/rooms/leaderboard/
// bestHand) plus the bracelets scheduled functions with one polling pass:
// read the cursor, run every check against "since", then advance the cursor.
const { getCursor, setCursor } = require('../lib/cursor');
const { checkNewFriends } = require('./friends');
const { checkRoomActivity } = require('./rooms');
const { checkHourlyLeaderboard } = require('./leaderboard');
const { checkBestHand } = require('./bestHand');
const { checkFriendLeaderboardOvertakes } = require('./friendRank');
const { checkBracelets } = require('../bracelets/award');
async function poll() {
  const since = await getCursor();
  const pollStartedAt = new Date();

  await Promise.all([
    checkNewFriends(since),
    checkRoomActivity(since),
    checkHourlyLeaderboard(),
    checkBestHand(since),
    checkFriendLeaderboardOvertakes(since),
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
