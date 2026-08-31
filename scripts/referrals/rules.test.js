// Security-rule coverage for the referral reward ledger.
//
// These rules are the only thing standing between a tampered client and other
// players' coin balances, so they are exercised rather than eyeballed. The
// suite skips itself unless a Firestore emulator is already serving the rules
// from FIRESTORE_RULES_REFERRALS.md — see that file for the one-command setup —
// which keeps `npm test` green on a machine with no emulator running.
const test = require('node:test');
const assert = require('node:assert');

const PID = process.env.REFERRALS_TEST_PROJECT || 'video-poker-6d665';
const HOST = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8181';
const BASE = `http://${HOST}/v1/projects/${PID}/databases/(default)/documents`;

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');

// The emulator accepts unsigned tokens and reads uid/provider straight from the
// claims, which is how a signed-in caller is simulated without real credentials.
function token(uid) {
    const now = Math.floor(Date.now() / 1000);
    return [b64({ alg: 'none', typ: 'JWT' }), b64({
        iss: `https://securetoken.google.com/${PID}`, aud: PID, sub: uid, user_id: uid,
        iat: now, exp: now + 3600, auth_time: now,
        firebase: { sign_in_provider: 'google.com', identities: {} }
    }), ''].join('.');
}

async function call(method, path, uid, body) {
    const res = await fetch(BASE + path, {
        method,
        headers: { Authorization: 'Bearer ' + token(uid), 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined
    });
    return res.status >= 200 && res.status < 300;
}

const S = (v) => ({ stringValue: v });

function row(overrides) {
    return { fields: Object.assign({
        referredUid: S('friendA'), referredName: S('Dana'), inviterUid: S('inviter1'),
        code: S('AB12CD'), provider: S('google.com'),
        rewardCoins: { integerValue: '2000' }, inviteeCoins: { integerValue: '1000' },
        claimedAt: { nullValue: null }
    }, overrides || {}) };
}

function query(inviterUid) {
    return { structuredQuery: { from: [{ collectionId: 'referrals' }], where: { fieldFilter: {
        field: { fieldPath: 'inviterUid' }, op: 'EQUAL', value: S(inviterUid) } } } };
}

async function emulatorReachable() {
    try {
        const res = await fetch(`http://${HOST}/`, { signal: AbortSignal.timeout(1500) });
        return res.status < 500;
    } catch (e) { return false; }
}

test('referral ledger security rules', async (t) => {
    if (!await emulatorReachable()) {
        t.skip(`no Firestore emulator on ${HOST} — see FIRESTORE_RULES_REFERRALS.md`);
        return;
    }

    // Unique per run so a re-run against a warm emulator starts clean.
    const suffix = '_' + process.pid + '_' + Math.floor(Math.random() * 1e6);
    const A = 'friendA' + suffix, INV = 'inviter1' + suffix;
    const mine = (o) => row(Object.assign({ referredUid: S(A), inviterUid: S(INV) }, o || {}));

    await t.test('only the referred player may file their own row', async () => {
        assert.ok(await call('POST', `/referrals?documentId=${A}`, A, mine()));
        assert.ok(!await call('POST', `/referrals?documentId=victim${suffix}`, 'attacker' + suffix,
            row({ referredUid: S('victim' + suffix), inviterUid: S('attacker' + suffix) })));
    });

    await t.test('the payout amount cannot be inflated by the client', async () => {
        assert.ok(!await call('POST', `/referrals?documentId=b${suffix}`, 'b' + suffix,
            row({ referredUid: S('b' + suffix), rewardCoins: { integerValue: '999999' } })));
    });

    await t.test('the invitee welcome amount cannot be inflated either', async () => {
        assert.ok(!await call('POST', `/referrals?documentId=e${suffix}`, 'e' + suffix,
            row({ referredUid: S('e' + suffix), inviteeCoins: { integerValue: '999999' } })));
    });

    await t.test('a pre-2.1 row without inviteeCoins is still accepted', async () => {
        const legacy = row({ referredUid: S('f' + suffix), inviterUid: S(INV) });
        delete legacy.fields.inviteeCoins;
        assert.ok(await call('POST', `/referrals?documentId=f${suffix}`, 'f' + suffix, legacy));
    });

    await t.test('a row cannot name its own author as inviter', async () => {
        assert.ok(!await call('POST', `/referrals?documentId=c${suffix}`, 'c' + suffix,
            row({ referredUid: S('c' + suffix), inviterUid: S('c' + suffix) })));
    });

    await t.test('a row cannot be created already claimed', async () => {
        assert.ok(!await call('POST', `/referrals?documentId=d${suffix}`, 'd' + suffix,
            row({ referredUid: S('d' + suffix), claimedAt: { timestampValue: '2026-01-01T00:00:00Z' } })));
    });

    await t.test('only the two parties can read the row', async () => {
        assert.ok(await call('GET', `/referrals/${A}`, INV));
        assert.ok(await call('GET', `/referrals/${A}`, A));
        assert.ok(!await call('GET', `/referrals/${A}`, 'stranger' + suffix));
    });

    // The live reward subscription is a collection query, which rules evaluate
    // as a distinct `list` operation — a get-only rule would pass the two cases
    // above and still break the feature.
    await t.test('the inviter query is scoped to its own rows', async () => {
        assert.ok(await call('POST', ':runQuery', INV, query(INV)));
        assert.ok(!await call('POST', ':runQuery', 'stranger' + suffix, query(INV)));
    });

    await t.test('a reward can be claimed exactly once, only by the inviter', async () => {
        const claim = { fields: { claimedAt: { timestampValue: '2026-08-23T12:00:00Z' } } };
        const path = `/referrals/${A}?updateMask.fieldPaths=claimedAt`;
        assert.ok(!await call('PATCH', path, A, claim), 'referred player must not claim');
        assert.ok(await call('PATCH', path, INV, claim), 'inviter claims');
        // This is the whole anti-double-credit mechanism: js/referral.js credits
        // coins only after the write is accepted.
        assert.ok(!await call('PATCH', path, INV, claim), 'second claim must fail');
    });

    await t.test('claiming cannot smuggle in other field edits', async () => {
        assert.ok(!await call('PATCH', `/referrals/${A}?updateMask.fieldPaths=rewardCoins`, INV,
            { fields: { rewardCoins: { integerValue: '999999' } } }));
    });

    await t.test('the ledger is append-only', async () => {
        assert.ok(!await call('DELETE', `/referrals/${A}`, INV));
    });
});
