// Unit tests for the delivery-policy rules. Run with `npm test`.
//
// pushPolicy.js only touches Firestore for Timestamp construction and the
// settings read, so firebaseAdmin is replaced in the require cache with a
// minimal fake — no emulator, no network, no service-account key.
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');

const adminPath = require.resolve('./firebaseAdmin');

function stub(modulePath, exports) {
  require.cache[modulePath] = {
    id: modulePath,
    filename: modulePath,
    path: path.dirname(modulePath),
    loaded: true,
    exports,
  };
}

stub(adminPath, {
  getFirestore: () => { throw new Error('not used in these tests'); },
  Timestamp: {
    fromDate: (d) => ({ toMillis: () => d.getTime(), toDate: () => d }),
  },
});

const {
  mergeSettings,
  triggerConfig,
  withinCooldown,
  isQuietHours,
  quietHoursEndAt,
  localMinutesFor,
  cooldownPatch,
  DEFAULT_SETTINGS,
} = require('./pushPolicy');

const HOUR = 60 * 60 * 1000;
const at = (iso) => new Date(iso);

// --- settings merging ---

test('an absent settings doc behaves exactly like the shipped defaults', () => {
  // Arrange / Act
  const settings = mergeSettings(null);

  // Assert
  assert.deepStrictEqual(settings.triggers, DEFAULT_SETTINGS.triggers);
  assert.deepStrictEqual(settings.quietHours, DEFAULT_SETTINGS.quietHours);
});

test('a partial settings doc keeps every default it does not mention', () => {
  // Arrange — the admin only ever toggled quiet hours on.
  const stored = { quietHours: { enabled: true } };

  // Act
  const settings = mergeSettings(stored);

  // Assert — sibling fields survive, and triggers are untouched.
  assert.strictEqual(settings.quietHours.enabled, true);
  assert.strictEqual(settings.quietHours.startHour, 23);
  assert.strictEqual(settings.quietHours.mode, 'drop');
  assert.strictEqual(settings.triggers.globalRank.topN, 200);
});

test('a partial trigger override keeps that trigger other fields', () => {
  // Arrange
  const settings = mergeSettings({ triggers: { globalRank: { cooldownHours: 48 } } });

  // Act
  const config = triggerConfig(settings, 'globalRank');

  // Assert
  assert.strictEqual(config.cooldownHours, 48);
  assert.strictEqual(config.topN, 200);
  assert.strictEqual(config.enabled, true);
});

// --- cooldown ---

test('cooldown is inactive when the trigger has never fired for this user', () => {
  assert.strictEqual(withinCooldown({}, 'globalRank', 24, at('2026-08-25T12:00:00Z')), false);
});

test('cooldown suppresses a repeat inside the window', () => {
  // Arrange — notified 2 hours ago, cooldown is 6 hours.
  const now = at('2026-08-25T12:00:00Z');
  const user = { _pushCooldowns: { globalRank: now.getTime() - 2 * HOUR } };

  // Act / Assert
  assert.strictEqual(withinCooldown(user, 'globalRank', 6, now), true);
});

test('cooldown lapses once the window has passed', () => {
  // Arrange — notified 7 hours ago, cooldown is 6 hours.
  const now = at('2026-08-25T12:00:00Z');
  const user = { _pushCooldowns: { globalRank: now.getTime() - 7 * HOUR } };

  // Act / Assert
  assert.strictEqual(withinCooldown(user, 'globalRank', 6, now), false);
});

test('a zero cooldown disables the check rather than blocking forever', () => {
  // Arrange
  const now = at('2026-08-25T12:00:00Z');
  const user = { _pushCooldowns: { globalRank: now.getTime() } };

  // Act / Assert
  assert.strictEqual(withinCooldown(user, 'globalRank', 0, now), false);
});

test('cooldown reads Firestore Timestamps as well as raw millis', () => {
  // Arrange — this is the shape a real user doc actually returns.
  const now = at('2026-08-25T12:00:00Z');
  const stamp = { toMillis: () => now.getTime() - HOUR };
  const user = { _pushCooldowns: { friendRank: stamp } };

  // Act / Assert
  assert.strictEqual(withinCooldown(user, 'friendRank', 6, now), true);
});

test('cooldownPatch records the trigger under the shared _pushCooldowns map', () => {
  // Arrange
  const now = at('2026-08-25T12:00:00Z');

  // Act
  const patch = cooldownPatch('dailyProfit', now);

  // Assert — merge-safe shape, so two triggers do not clobber each other.
  assert.strictEqual(patch._pushCooldowns.dailyProfit.toMillis(), now.getTime());
});

// --- quiet hours ---

const quiet = (overrides) => ({ quietHours: { ...DEFAULT_SETTINGS.quietHours, ...overrides } });

test('quiet hours do nothing while disabled', () => {
  // Arrange — 03:00 UTC is deep inside the default 23->08 window.
  assert.strictEqual(isQuietHours({}, quiet({ enabled: false }), at('2026-08-25T03:00:00Z')), false);
});

test('a window that wraps midnight covers both sides of it', () => {
  // Arrange — the default 23:00 -> 08:00 window, user on UTC.
  const settings = quiet({ enabled: true });

  // Act / Assert — late evening and early morning are both quiet...
  assert.strictEqual(isQuietHours({}, settings, at('2026-08-25T23:30:00Z')), true);
  assert.strictEqual(isQuietHours({}, settings, at('2026-08-25T03:00:00Z')), true);
  // ...and the middle of the day is not.
  assert.strictEqual(isQuietHours({}, settings, at('2026-08-25T12:00:00Z')), false);
});

test('boundaries are inclusive at the start and exclusive at the end', () => {
  // Arrange
  const settings = quiet({ enabled: true });

  // Act / Assert — 23:00 is already quiet, 08:00 is already awake.
  assert.strictEqual(isQuietHours({}, settings, at('2026-08-25T23:00:00Z')), true);
  assert.strictEqual(isQuietHours({}, settings, at('2026-08-25T08:00:00Z')), false);
  assert.strictEqual(isQuietHours({}, settings, at('2026-08-25T07:59:00Z')), true);
});

test('a window that does not wrap midnight is handled separately', () => {
  // Arrange — 01:00 -> 06:00.
  const settings = quiet({ enabled: true, startHour: 1, endHour: 6 });

  // Act / Assert
  assert.strictEqual(isQuietHours({}, settings, at('2026-08-25T03:00:00Z')), true);
  assert.strictEqual(isQuietHours({}, settings, at('2026-08-25T23:00:00Z')), false);
});

test('a zero-width window never suppresses anything', () => {
  // Arrange — start == end would otherwise read as "always quiet".
  const settings = quiet({ enabled: true, startHour: 8, endHour: 8 });

  // Act / Assert
  assert.strictEqual(isQuietHours({}, settings, at('2026-08-25T08:00:00Z')), false);
});

test('quiet hours are evaluated in the user local time, not UTC', () => {
  // Arrange — 04:00 UTC. A New York player (getTimezoneOffset 300) is at
  // 23:00 the previous evening, which is inside the window; a UTC player is
  // at 04:00, also inside it; a Tokyo player (offset -540) is at 13:00.
  const settings = quiet({ enabled: true });
  const now = at('2026-08-25T04:00:00Z');

  // Act / Assert
  assert.strictEqual(localMinutesFor({ timezoneOffset: 300 }, now), 23 * 60);
  assert.strictEqual(isQuietHours({ timezoneOffset: 300 }, settings, now), true);
  assert.strictEqual(isQuietHours({ timezoneOffset: -540 }, settings, now), false);
});

test('a user with no stored timezone falls back to UTC instead of throwing', () => {
  // Arrange — users registered before js/push.js started storing the offset.
  const settings = quiet({ enabled: true });

  // Act / Assert
  assert.strictEqual(isQuietHours({ displayName: 'Legacy' }, settings, at('2026-08-25T03:00:00Z')), true);
});

test('a held campaign resumes when the quiet window opens', () => {
  // Arrange — 02:00 UTC, default window ending at 08:00.
  const settings = quiet({ enabled: true, mode: 'hold' });

  // Act
  const resumeAt = quietHoursEndAt(settings, at('2026-08-25T02:00:00Z'));

  // Assert — same morning, not the next one.
  assert.strictEqual(resumeAt.toISOString(), '2026-08-25T08:00:00.000Z');
});

test('a campaign held after the window end rolls to the next day', () => {
  // Arrange — 23:30 UTC is past 08:00, so the next opening is tomorrow.
  const settings = quiet({ enabled: true, mode: 'hold' });

  // Act
  const resumeAt = quietHoursEndAt(settings, at('2026-08-25T23:30:00Z'));

  // Assert
  assert.strictEqual(resumeAt.toISOString(), '2026-08-26T08:00:00.000Z');
});
