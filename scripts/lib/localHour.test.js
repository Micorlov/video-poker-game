// Unit tests for local-time campaign delivery. Run with `npm test`.
//
// The load-bearing property: run once per UTC hour and every player matches the
// target local hour on exactly one run per day. The sweep test below asserts
// that for a spread of real timezone offsets.
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');

const adminPath = require.resolve('./firebaseAdmin');
require.cache[adminPath] = {
  id: adminPath,
  filename: adminPath,
  path: path.dirname(adminPath),
  loaded: true,
  exports: { getFirestore: () => { throw new Error('not used'); }, Timestamp: {} },
};

const { isLocalHourMode, nextUtcHour, localHourOf, entriesInLocalHour } = require('./localHour');

// getTimezoneOffset() is minutes BEHIND UTC: positive west of Greenwich.
const NEW_YORK = 240;      // UTC-4
const LOS_ANGELES = 420;   // UTC-7
const LONDON = -60;        // UTC+1
const BERLIN = -120;       // UTC+2
const INDIA = -330;        // UTC+5:30 — the half-hour case
const TOKYO = -540;        // UTC+9
const AUCKLAND = -780;     // UTC+13

const utc = (hour, minute = 0) => new Date(Date.UTC(2026, 8, 26, hour, minute, 0));

test('only localDaily is local-hour mode', () => {
  assert.strictEqual(isLocalHourMode({ mode: 'localDaily' }), true);
  assert.strictEqual(isLocalHourMode({ mode: 'recurring' }), false);
  assert.strictEqual(isLocalHourMode({ mode: 'now' }), false);
  assert.strictEqual(isLocalHourMode(null), false);
});

test('local hour is read from the timezone the app reported', () => {
  assert.strictEqual(localHourOf({ timezoneOffset: NEW_YORK }, utc(1)), 21);
  assert.strictEqual(localHourOf({ timezoneOffset: LOS_ANGELES }, utc(4)), 21);
  assert.strictEqual(localHourOf({ timezoneOffset: TOKYO }, utc(12)), 21);
  assert.strictEqual(localHourOf({ timezoneOffset: AUCKLAND }, utc(8)), 21);
});

test('a half-hour timezone still resolves to one whole local hour', () => {
  // 15:30 UTC is 21:00 in India; the whole 15:00 UTC hour maps to local 20:30
  // through 21:29, i.e. hour 20 then 21 — each exactly once in the day.
  assert.strictEqual(localHourOf({ timezoneOffset: INDIA }, utc(15, 30)), 21);
  assert.strictEqual(localHourOf({ timezoneOffset: INDIA }, utc(15, 0)), 20);
});

test('a user whose timezone was never recorded is treated as UTC', () => {
  assert.strictEqual(localHourOf({}, utc(21)), 21);
  assert.strictEqual(localHourOf({ timezoneOffset: 'nonsense' }, utc(21)), 21);
});

// The property the whole design rests on.
test('each timezone matches the target hour on exactly one of the 24 hourly runs', () => {
  const offsets = { NEW_YORK, LOS_ANGELES, LONDON, BERLIN, INDIA, TOKYO, AUCKLAND };
  Object.entries(offsets).forEach(([name, offset]) => {
    const matches = [];
    for (let hour = 0; hour < 24; hour++) {
      if (localHourOf({ timezoneOffset: offset }, utc(hour)) === 21) matches.push(hour);
    }
    assert.strictEqual(matches.length, 1, `${name} matched on ${matches.length} runs: ${matches}`);
  });
});

test('a run sends only to the devices whose owner is in the target hour', () => {
  const entries = [
    { uid: 'ny', token: 't1', platform: 'android' },
    { uid: 'ny', token: 't2', platform: 'web' },
    { uid: 'tokyo', token: 't3', platform: 'android' },
  ];
  const users = new Map([
    ['ny', { timezoneOffset: NEW_YORK }],
    ['tokyo', { timezoneOffset: TOKYO }],
  ]);

  // 01:00 UTC is 21:00 in New York and 10:00 in Tokyo.
  const atNewYorkEvening = entriesInLocalHour(entries, users, 21, utc(1));
  assert.deepStrictEqual(atNewYorkEvening.map((e) => e.token), ['t1', 't2']);

  // 12:00 UTC is 21:00 in Tokyo and 08:00 in New York.
  const atTokyoEvening = entriesInLocalHour(entries, users, 21, utc(12));
  assert.deepStrictEqual(atTokyoEvening.map((e) => e.token), ['t3']);
});

test('an hour that matches nobody sends to nobody', () => {
  const entries = [{ uid: 'ny', token: 't1', platform: 'android' }];
  const users = new Map([['ny', { timezoneOffset: NEW_YORK }]]);
  assert.deepStrictEqual(entriesInLocalHour(entries, users, 21, utc(5)), []);
});

test('a device whose owner doc is missing is treated as UTC, not dropped', () => {
  const entries = [{ uid: 'ghost', token: 't1', platform: 'android' }];
  assert.deepStrictEqual(
    entriesInLocalHour(entries, new Map(), 21, utc(21)).map((e) => e.token),
    ['t1']
  );
});

test('the next run is the top of the next UTC hour, never a drifting offset', () => {
  assert.strictEqual(nextUtcHour(utc(20, 34)).toISOString(), '2026-09-26T21:00:00.000Z');
  assert.strictEqual(nextUtcHour(utc(20, 0)).toISOString(), '2026-09-26T21:00:00.000Z');
  assert.strictEqual(nextUtcHour(utc(23, 59)).toISOString(), '2026-09-27T00:00:00.000Z');
});
