// Delivery policy shared by every push source: per-user cooldowns and quiet
// hours. Both are configured from the admin center and stored in a single
// Firestore doc (config/pushSettings), which the poller reads once per pass
// and threads through every check.
//
// Cooldown state lives on the user doc under `_pushCooldowns.<trigger>`,
// following the same underscore-prefixed cache convention friendRank.js
// already uses for _prevFriendNetProfit — keeping per-user push bookkeeping
// on the user doc avoids a second read per recipient.
const { getFirestore, Timestamp } = require('./firebaseAdmin');

const SETTINGS_DOC_PATH = 'config/pushSettings';
const HOUR_MS = 60 * 60 * 1000;
const MINUTES_PER_DAY = 24 * 60;

// Mirrored by push-admin.html's Triggers panel. Every field is optional in
// Firestore — a missing doc must behave exactly like the shipped defaults, so
// push keeps working if the settings doc is never created.
const DEFAULT_SETTINGS = {
  triggers: {
    hourlyTop5: { enabled: true, cooldownHours: 6 },
    friendRank: { enabled: true, cooldownHours: 6 },
    dailyProfit: { enabled: true, cooldownHours: 12, topN: 10 },
    globalRank: { enabled: true, cooldownHours: 24, topN: 200, minRunIntervalMinutes: 60 },
  },
  quietHours: { enabled: false, startHour: 23, endHour: 8, mode: 'drop' },
};

function mergeTrigger(defaults, stored) {
  return { ...defaults, ...(stored || {}) };
}

// Shallow-merges the stored doc over the defaults one level deep, so a
// settings doc that only sets `quietHours.enabled` keeps every other default.
function mergeSettings(stored) {
  const raw = stored || {};
  const triggers = raw.triggers || {};
  return {
    triggers: Object.keys(DEFAULT_SETTINGS.triggers).reduce(
      (acc, key) => ({ ...acc, [key]: mergeTrigger(DEFAULT_SETTINGS.triggers[key], triggers[key]) }),
      {}
    ),
    quietHours: { ...DEFAULT_SETTINGS.quietHours, ...(raw.quietHours || {}) },
  };
}

async function loadSettings() {
  const db = getFirestore();
  try {
    const snap = await db.doc(SETTINGS_DOC_PATH).get();
    return mergeSettings(snap.exists ? snap.data() : null);
  } catch (err) {
    // Settings are an optimisation, never a prerequisite. A read failure must
    // not silently mute every notification in the app.
    console.error('Failed to load push settings, using defaults:', err.message);
    return mergeSettings(null);
  }
}

function triggerConfig(settings, trigger) {
  const merged = settings || mergeSettings(null);
  return (merged.triggers && merged.triggers[trigger]) || DEFAULT_SETTINGS.triggers[trigger] || {};
}

// Firestore hands back Timestamps, tests hand back plain numbers or Dates.
function toMillis(value) {
  if (!value) return null;
  if (typeof value === 'number') return value;
  if (value instanceof Date) return value.getTime();
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.toDate === 'function') return value.toDate().getTime();
  return null;
}

// True when this user was already notified about `trigger` less than
// `cooldownHours` ago. A zero/absent cooldown disables the check entirely.
function withinCooldown(userData, trigger, cooldownHours, now) {
  if (!cooldownHours || cooldownHours <= 0) return false;
  const cooldowns = (userData && userData._pushCooldowns) || {};
  const lastSent = toMillis(cooldowns[trigger]);
  if (lastSent === null) return false;
  return now.getTime() - lastSent < cooldownHours * HOUR_MS;
}

// getTimezoneOffset() is minutes BEHIND UTC (positive west of Greenwich), so
// local time is UTC minus the offset. Users registered before js/push.js
// started storing it fall back to UTC.
function localMinutesFor(userData, now) {
  const offset = (userData && typeof userData.timezoneOffset === 'number') ? userData.timezoneOffset : 0;
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  return ((utcMinutes - offset) % MINUTES_PER_DAY + MINUTES_PER_DAY) % MINUTES_PER_DAY;
}

// A window may wrap midnight (23:00 -> 08:00 is the default), so the two cases
// are tested separately rather than with a single range comparison.
function isQuietHours(userData, settings, now) {
  const quiet = (settings && settings.quietHours) || DEFAULT_SETTINGS.quietHours;
  if (!quiet.enabled) return false;
  if (quiet.startHour === quiet.endHour) return false;

  const minutes = localMinutesFor(userData, now);
  const start = quiet.startHour * 60;
  const end = quiet.endHour * 60;

  return start < end
    ? minutes >= start && minutes < end
    : minutes >= start || minutes < end;
}

// When a scheduled campaign lands inside the quiet window it is held, not
// dropped — this returns the instant the window opens so nextRunAt can be
// pushed there. Uses the admin's own timezone (UTC) rather than any single
// user's, since one campaign fans out across many timezones.
function quietHoursEndAt(settings, now) {
  const quiet = (settings && settings.quietHours) || DEFAULT_SETTINGS.quietHours;
  const end = new Date(now.getTime());
  end.setUTCHours(quiet.endHour, 0, 0, 0);
  if (end.getTime() <= now.getTime()) {
    end.setUTCDate(end.getUTCDate() + 1);
  }
  return end;
}

// Merge patch recording that `trigger` just fired for this user. Written by
// the caller alongside whatever other state it is already persisting, so this
// costs no extra write.
function cooldownPatch(trigger, now) {
  return { _pushCooldowns: { [trigger]: Timestamp.fromDate(now) } };
}

module.exports = {
  loadSettings,
  mergeSettings,
  triggerConfig,
  withinCooldown,
  isQuietHours,
  quietHoursEndAt,
  cooldownPatch,
  localMinutesFor,
  DEFAULT_SETTINGS,
  SETTINGS_DOC_PATH,
};
