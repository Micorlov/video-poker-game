// Security-rule coverage for the duels collection — the money-moving surface
// of the head-to-head Duel feature. A tampered client can already set its
// own local balance to anything, so these rules aren't about hiding scores;
// they're the only thing standing between a tampered client and someone
// ELSE's coins (double-claiming a payout, impersonating a player, taking a
// duel that isn't theirs). Exercised against a real emulator rather than
// eyeballed, same as scripts/referrals/rules.test.js.
//
// The suite skips itself unless a Firestore emulator is already serving
// firestore.rules on FIRESTORE_EMULATOR_HOST (default localhost:8181), which
// keeps `npm test` green on a machine with no emulator running. To run it:
//   mkdir -p /tmp/vp-emulator && cd /tmp/vp-emulator
//   printf '{"firestore":{"rules":"%s/firestore.rules"},"emulators":{"firestore":{"port":8181},"ui":{"enabled":false}}}' "$OLDPWD" > firebase.json
//   PATH="/opt/homebrew/opt/openjdk@21/bin:$PATH" npx firebase emulators:start --only firestore --project video-poker-6d665
const test = require('node:test');
const assert = require('node:assert');

const PID = process.env.DUELS_TEST_PROJECT || 'video-poker-6d665';
const HOST = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8181';
const BASE = `http://${HOST}/v1/projects/${PID}/databases/(default)/documents`;

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');

// The emulator accepts unsigned tokens and reads uid/provider straight from
// the claims, which is how a signed-in caller is simulated without real
// credentials.
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
const I = (v) => ({ integerValue: String(v) });
const N = { nullValue: null };
const holdsArr = (arr) => ({ arrayValue: { values: arr.map(I) } });
const T = (iso) => ({ timestampValue: iso });

// A valid, freshly-created open duel: challenger C, seed 1, fee 100, five
// zero (hold-nothing) hold masks, no target uid — matches exactly what
// js/duel.js writes for an untargeted share-link challenge.
function openDuel(overrides) {
    return { fields: Object.assign({
        status: S('open'),
        seed: I(1),
        fee: I(100),
        challengerUid: S('C'),
        challengerName: S('Challenger'),
        challengerHolds: holdsArr([0, 0, 0, 0, 0]),
        challengerScore: I(0),
        opponentUid: N,
        opponentHolds: N,
        toUid: N,
        participants: { arrayValue: { values: [S('C')] } },
        claims: { mapValue: { fields: {} } },
        createdAt: T(new Date().toISOString())
    }, overrides || {}) };
}

async function emulatorReachable() {
    try {
        const res = await fetch(`http://${HOST}/`, { signal: AbortSignal.timeout(1500) });
        return res.status < 500;
    } catch (e) { return false; }
}

// Real duel codes are exactly 6 characters (js/firebase.js generateRoomCode(),
// enforced by duelId.size() == 6 in the create rule) — unlike the descriptive,
// suffixed ids the rest of this suite uses for player uids, document ids here
// must fit that exactly. Modulus keeps every value under 36^6 so
// padStart(6,'0') always lands on exactly 6 characters, and the per-run
// random starting offset keeps re-runs against a warm emulator collision-free.
let _codeSeq = Math.floor(Math.random() * 1e9) % 2176782336;
function nextCode() {
    _codeSeq = (_codeSeq + 1) % 2176782336;
    return _codeSeq.toString(36).toUpperCase().padStart(6, '0');
}

test('duel security rules', async (t) => {
    if (!await emulatorReachable()) {
        t.skip(`no Firestore emulator on ${HOST} — see the comment at the top of this file`);
        return;
    }

    // Unique per run so a re-run against a warm emulator starts clean.
    const suffix = '_' + process.pid + '_' + Math.floor(Math.random() * 1e6);
    const uid = (base) => base + suffix;

    await t.test('create: a valid open challenge succeeds', async () => {
        const C = uid('c1');
        const code = nextCode();
        assert.ok(await call('POST', `/duels?documentId=${code}`, C,
            openDuel({ challengerUid: S(C), participants: { arrayValue: { values: [S(C)] } } })));
    });

    await t.test('create: cannot impersonate a different challengerUid', async () => {
        const C = uid('c2');
        const code = nextCode();
        assert.ok(!await call('POST', `/duels?documentId=${code}`, C,
            openDuel({ challengerUid: S('someoneElse' + suffix) })));
    });

    await t.test('create: fee must be 0 or 100, nothing else', async () => {
        const C = uid('c3');
        const code = nextCode();
        assert.ok(!await call('POST', `/duels?documentId=${code}`, C,
            openDuel({ challengerUid: S(C), participants: { arrayValue: { values: [S(C)] } }, fee: I(9999) })));
    });

    await t.test('create: hold masks must be 5 integers in 0..31', async () => {
        const C = uid('c4');
        assert.ok(!await call('POST', `/duels?documentId=${nextCode()}`, C,
            openDuel({ challengerUid: S(C), participants: { arrayValue: { values: [S(C)] } },
                challengerHolds: holdsArr([0, 0, 0, 0]) })), 'wrong length must be rejected');
        assert.ok(!await call('POST', `/duels?documentId=${nextCode()}`, C,
            openDuel({ challengerUid: S(C), participants: { arrayValue: { values: [S(C)] } },
                challengerHolds: holdsArr([32, 0, 0, 0, 0]) })), 'out-of-range mask must be rejected');
    });

    await t.test('create: cannot self-target toUid', async () => {
        const C = uid('c5');
        assert.ok(!await call('POST', `/duels?documentId=${nextCode()}`, C,
            openDuel({ challengerUid: S(C), participants: { arrayValue: { values: [S(C)] } }, toUid: S(C) })));
    });

    await t.test('create: opponentUid must be null and claims must be empty', async () => {
        const C = uid('c6');
        assert.ok(!await call('POST', `/duels?documentId=${nextCode()}`, C,
            openDuel({ challengerUid: S(C), participants: { arrayValue: { values: [S(C)] } },
                opponentUid: S('ghost') })));
        assert.ok(!await call('POST', `/duels?documentId=${nextCode()}`, C,
            openDuel({ challengerUid: S(C), participants: { arrayValue: { values: [S(C)] } },
                claims: { mapValue: { fields: { [C]: T(new Date().toISOString()) } } } })));
    });

    await t.test('create: id collision is rejected, not silently overwritten', async () => {
        const C = uid('c7');
        const code = nextCode();
        assert.ok(await call('POST', `/duels?documentId=${code}`, C,
            openDuel({ challengerUid: S(C), participants: { arrayValue: { values: [S(C)] } } })));
        assert.ok(!await call('POST', `/duels?documentId=${code}`, C,
            openDuel({ challengerUid: S(C), participants: { arrayValue: { values: [S(C)] } } })),
            'Firestore createDocument on an existing id must fail regardless of rules');
    });

    // --- get / list ---

    await t.test('get: an open duel is readable by any signed-in user', async () => {
        const C = uid('c8'), stranger = uid('stranger8');
        const code = nextCode();
        await call('POST', `/duels?documentId=${code}`, C,
            openDuel({ challengerUid: S(C), participants: { arrayValue: { values: [S(C)] } } }));
        assert.ok(await call('GET', `/duels/${code}`, stranger));
    });

    const submitMask = '?updateMask.fieldPaths=status&updateMask.fieldPaths=opponentUid' +
        '&updateMask.fieldPaths=opponentName&updateMask.fieldPaths=opponentHolds' +
        '&updateMask.fieldPaths=opponentScore&updateMask.fieldPaths=participants' +
        '&updateMask.fieldPaths=scoredAt';
    function submitPatch(opponent, participants, extra) {
        return { fields: Object.assign({
            status: S('scored'),
            opponentUid: S(opponent),
            opponentName: S('Opponent'),
            opponentHolds: holdsArr([0, 0, 0, 0, 0]),
            opponentScore: I(0),
            participants: { arrayValue: { values: participants.map(S) } },
            scoredAt: T(new Date().toISOString())
        }, extra || {}) };
    }
    async function makeOpen(challenger, extra) {
        const code = nextCode();
        await call('POST', `/duels?documentId=${code}`, challenger,
            openDuel(Object.assign({ challengerUid: S(challenger),
                participants: { arrayValue: { values: [S(challenger)] } } }, extra || {})));
        return code;
    }

    await t.test('get: once no longer open, only participants/invitee may read', async () => {
        const C = uid('c9'), O = uid('o9'), stranger = uid('stranger9');
        const code = await makeOpen(C);
        await call('PATCH', `/duels/${code}${submitMask}`, O, submitPatch(O, [C, O]));
        assert.ok(await call('GET', `/duels/${code}`, C), 'challenger can still read');
        assert.ok(await call('GET', `/duels/${code}`, O), 'opponent can read');
        assert.ok(!await call('GET', `/duels/${code}`, stranger), 'a stranger cannot read a settled duel');
    });

    // --- duelSubmit (open -> scored) ---

    await t.test('submit: an open, untargeted duel can be taken by anyone but the challenger', async () => {
        const C = uid('c10'), O = uid('o10');
        const code = await makeOpen(C);
        assert.ok(!await call('PATCH', `/duels/${code}${submitMask}`, C, submitPatch(C, [C, C])),
            'the challenger cannot take their own duel');
        assert.ok(await call('PATCH', `/duels/${code}${submitMask}`, O, submitPatch(O, [C, O])),
            'a different player can take it');
    });

    await t.test('submit: a targeted duel can only be taken by the invited uid', async () => {
        const C = uid('c11'), Target = uid('target11'), Other = uid('other11');
        const code = await makeOpen(C, { toUid: S(Target) });
        assert.ok(!await call('PATCH', `/duels/${code}${submitMask}`, Other, submitPatch(Other, [C, Other])),
            'a non-invitee cannot take a targeted duel');
        assert.ok(await call('PATCH', `/duels/${code}${submitMask}`, Target, submitPatch(Target, [C, Target])),
            'the invited player can take it');
    });

    await t.test('submit: a second attempt to take an already-scored duel is rejected', async () => {
        const C = uid('c12'), O = uid('o12'), Racer = uid('racer12');
        const code = await makeOpen(C);
        assert.ok(await call('PATCH', `/duels/${code}${submitMask}`, O, submitPatch(O, [C, O])), 'first taker succeeds');
        assert.ok(!await call('PATCH', `/duels/${code}${submitMask}`, Racer, submitPatch(Racer, [C, Racer])),
            'a racing second taker must fail once status is no longer open');
    });

    await t.test('submit: hold masks are validated the same way on the opponent side', async () => {
        const C = uid('c13'), O = uid('o13');
        const code = await makeOpen(C);
        assert.ok(!await call('PATCH', `/duels/${code}${submitMask}`, O,
            submitPatch(O, [C, O], { opponentHolds: holdsArr([0, 0, 0, 0]) })));
    });

    await t.test('submit: cannot smuggle in a self-declared winnerUid alongside a valid submit', async () => {
        const C = uid('c14'), O = uid('o14');
        const code = await makeOpen(C);
        const patch = submitPatch(O, [C, O]);
        patch.fields.winnerUid = S(O);
        assert.ok(!await call('PATCH', `/duels/${code}${submitMask}&updateMask.fieldPaths=winnerUid`, O, patch),
            'adding winnerUid to the update mask must be rejected — outside duelSubmit\'s allowed key set');
    });

    // --- duelClaim ---

    async function makeScored(challenger, opponent) {
        const code = await makeOpen(challenger);
        await call('PATCH', `/duels/${code}${submitMask}`, opponent, submitPatch(opponent, [challenger, opponent]));
        return code;
    }
    function claimPatch(uidToClaim) {
        return { fields: { claims: { mapValue: { fields: { [uidToClaim]: T(new Date().toISOString()) } } } } };
    }

    await t.test('claim: each participant can stamp their own claim exactly once', async () => {
        const C = uid('c15'), O = uid('o15');
        const code = await makeScored(C, O);
        // Dotted field-mask path: merges into just this one key of the claims
        // map rather than replacing the whole map, so the challenger's claim
        // (already stamped) survives the opponent's later, separate claim.
        const pathFor = (claimant) => `/duels/${code}?updateMask.fieldPaths=claims.${claimant}`;
        assert.ok(await call('PATCH', pathFor(C), C, claimPatch(C)), 'challenger claims');
        assert.ok(!await call('PATCH', pathFor(C), C, claimPatch(C)),
            'the SAME claim again must be rejected — this is the anti-double-credit mechanism');
        assert.ok(await call('PATCH', pathFor(O), O, claimPatch(O)), 'opponent claims their own, separate entry');
    });

    await t.test('claim: cannot write another participant\'s claim entry', async () => {
        const C = uid('c16'), O = uid('o16');
        const code = await makeScored(C, O);
        assert.ok(!await call('PATCH', `/duels/${code}?updateMask.fieldPaths=claims.${C}`, O, claimPatch(C)),
            'opponent cannot stamp the challenger\'s claim');
    });

    await t.test('claim: a non-participant cannot claim at all', async () => {
        const C = uid('c17'), O = uid('o17'), stranger = uid('stranger17');
        const code = await makeScored(C, O);
        assert.ok(!await call('PATCH', `/duels/${code}?updateMask.fieldPaths=claims.${stranger}`, stranger, claimPatch(stranger)));
    });

    await t.test('claim: cannot claim on a duel that is still open', async () => {
        const C = uid('c18');
        const code = await makeOpen(C);
        assert.ok(!await call('PATCH', `/duels/${code}?updateMask.fieldPaths=claims.${C}`, C, claimPatch(C)));
    });

    await t.test('claim: cannot smuggle in another field alongside claims', async () => {
        const C = uid('c19'), O = uid('o19');
        const code = await makeScored(C, O);
        const patch = claimPatch(C);
        patch.fields.challengerScore = I(999999);
        assert.ok(!await call('PATCH',
            `/duels/${code}?updateMask.fieldPaths=claims.${C}&updateMask.fieldPaths=challengerScore`, C, patch));
    });

    // --- duelShareMark ---

    await t.test('shareMark: only the challenger can record sharedVia, only while open', async () => {
        const C = uid('c20'), O = uid('o20');
        const code = await makeOpen(C);
        const path = `/duels/${code}?updateMask.fieldPaths=sharedVia`;
        const patch = { fields: { sharedVia: { arrayValue: { values: [S('whatsapp')] } } } };
        assert.ok(!await call('PATCH', path, O, patch), 'a non-challenger cannot mark it shared');
        assert.ok(await call('PATCH', path, C, patch), 'the challenger can');

        const scoredCode = await makeScored(C, O);
        assert.ok(!await call('PATCH', `/duels/${scoredCode}?updateMask.fieldPaths=sharedVia`, C, patch),
            'sharedVia cannot be edited once the duel is no longer open');
    });

    // --- server-only fields ---

    await t.test('no client update path can ever write winnerUid/resolvedAt/expiredAt/notifiedAt', async () => {
        const C = uid('c21'), O = uid('o21');
        const code = await makeScored(C, O);
        const patch = { fields: { winnerUid: S(C), resolvedAt: T(new Date().toISOString()) } };
        assert.ok(!await call('PATCH',
            `/duels/${code}?updateMask.fieldPaths=winnerUid&updateMask.fieldPaths=resolvedAt`, C, patch));
    });

    // --- delete ---

    await t.test('duels are never deletable, by anyone', async () => {
        const C = uid('c22');
        const code = await makeOpen(C);
        assert.ok(!await call('DELETE', `/duels/${code}`, C));
    });
});
