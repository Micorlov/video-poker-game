// Delivering a daily campaign in each player's own evening rather than at one
// fixed server hour.
//
// 20:00 server time is the middle of the night for most of this app's players:
// 17 of 32 recent actives are in the US, and observed peak play is 21:00 local.
//
// The mechanism avoids any per-user "already sent today" bookkeeping. A
// local-hour campaign runs once per UTC hour; within one UTC hour a given
// player's local hour has exactly one value, so each player matches the target
// hour on exactly one run per day. The once-per-hour cadence is therefore load
// bearing, not just a cost control — see nextUtcHour().
const { localMinutesFor } = require('./pushPolicy');

const HOUR_MS = 60 * 60 * 1000;
const MINUTES_PER_HOUR = 60;

function isLocalHourMode(schedule) {
  return !!schedule && schedule.mode === 'localDaily';
}

// Top of the next UTC hour. Anchored to the clock rather than to now + 1h so
// runs can't drift into a pattern that skips or doubles a player's slot.
function nextUtcHour(now) {
  const next = new Date(now.getTime());
  next.setUTCMinutes(0, 0, 0);
  next.setUTCHours(next.getUTCHours() + 1);
  return next;
}

function localHourOf(userData, now) {
  return Math.floor(localMinutesFor(userData, now) / MINUTES_PER_HOUR);
}

// Keeps the token entries whose owner's local hour is targetHour right now.
// users is a Map<uid, userData> the caller already read.
function entriesInLocalHour(entries, users, targetHour, now) {
  return entries.filter((entry) => localHourOf(users.get(entry.uid) || {}, now) === targetHour);
}

module.exports = { isLocalHourMode, nextUtcHour, localHourOf, entriesInLocalHour, HOUR_MS };
