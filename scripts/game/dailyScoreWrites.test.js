'use strict';

// Every write to daily_scores must carry uid, because firestore.rules gates the
// collection on `request.resource.data.uid == request.auth.uid`.
//
// patchOwnCountry() did not, and a merge that *creates* the document therefore
// had no uid in request.resource.data and was denied. It hit every player who
// opened the app before playing their first hand of the day, and firebaseSafe
// swallowed it, so the daily leaderboard silently lost their country. Caught on
// a real device by the error reporting added in js/errors.js.
//
// This is a source-level assertion rather than a behavioural one: the rule
// applies to the payload regardless of which function builds it, so the useful
// guarantee is that no future writer forgets the field.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..', '..');
const LEADERBOARDS = fs.readFileSync(path.join(ROOT, 'js', 'leaderboards.js'), 'utf8');
const RULES = fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8');

// The top-level functions in the module, as {name, body}. Splitting on
// column-0 `function` is enough here: the file has no nested top-level forms.
function topLevelFunctions(src) {
    const parts = src.split(/\n(?=function )/);
    return parts.map((body) => {
        const m = body.match(/^function\s+([A-Za-z0-9_$]+)/);
        return m ? { name: m[1], body } : null;
    }).filter(Boolean);
}

// Functions that write to daily_scores. The payload is sometimes a literal and
// sometimes a variable built a few lines earlier, so the assertion is made
// against the whole writing function rather than against a brace-matched
// fragment — which is also what a future reader would check.
function dailyScoreWriters(src) {
    return topLevelFunctions(src).filter((fn) =>
        /db\.collection\('daily_scores'\)\.doc\([^)]*\)\s*\n?\s*\.?set\(/.test(fn.body));
}

test('the rule really does gate daily_scores on a uid field', () => {
    const block = RULES.match(/match \/daily_scores\/\{docId\} \{[\s\S]*?\n {4}\}/)[0];
    assert.match(block, /request\.resource\.data\.uid == request\.auth\.uid/);
});

test('every function that writes daily_scores sends uid', () => {
    const writers = dailyScoreWriters(LEADERBOARDS);
    assert.deepStrictEqual(
        writers.map((fn) => fn.name).sort(),
        ['flushDailyScore', 'patchOwnCountry', 'pushDailyRebuy'],
        'a new daily_scores writer appeared — make sure it sends uid, then add it here'
    );
    writers.forEach((fn) => {
        assert.match(fn.body, /\buid:\s*user\.uid\b/,
            `${fn.name} writes daily_scores without uid, which the rules deny on create`);
    });
});

// The specific regression: a country-only payload.
test('patchOwnCountry sends uid alongside country', () => {
    const fn = LEADERBOARDS.match(/function patchOwnCountry\(\)[\s\S]*?\n}/)[0];
    const payload = fn.match(/\.set\(\{[\s\S]*?\}, \{ merge: true \}\)/)[0];
    assert.match(payload, /uid: user\.uid/);
    assert.match(payload, /country: country/);
});

// And that it actually reaches Firestore that way when it runs.
test('running patchOwnCountry writes uid and country to the day document', async () => {
    const writes = [];
    const context = vm.createContext({
        window: { egUser: { uid: 'u1' } },
        db: {
            collection: (name) => ({
                doc: (id) => ({
                    set: (fields, opts) => { writes.push({ name, id, fields, opts }); return Promise.resolve(); },
                    collection: () => ({ doc: () => ({ set: () => Promise.resolve() }) })
                })
            })
        },
        firebaseSafe: (op) => op(),
        getCountry: () => 'US',
        getDayKey: () => '2026-09-26',
        getHourKey: () => '2026092619',
        resolveCountryFromIP: () => Promise.resolve('US'),
        Promise, Object, String
    });
    vm.runInContext(LEADERBOARDS.match(/function patchOwnCountry\(\)[\s\S]*?\n}/)[0], context);

    context.patchOwnCountry();
    await new Promise((r) => setImmediate(r));

    const daily = writes.find((w) => w.name === 'daily_scores');
    assert.ok(daily, 'expected a daily_scores write');
    assert.strictEqual(daily.id, '2026-09-26_u1');
    assert.strictEqual(daily.fields.uid, 'u1');
    assert.strictEqual(daily.fields.country, 'US');
    assert.strictEqual(daily.opts.merge, true);
});
