// Read-only diagnostic: why has the admin panel's user count stopped moving?
//
// Compares two independent records of the same event — a player signing in:
//   * Firebase Auth accounts, created by the sign-in itself.
//   * Firestore users/ docs, written by logUserToFirestore() afterwards.
// If Auth grows while Firestore does not, the client is failing to write. If
// neither grows, nobody is completing sign-in at all. Prints aggregates and
// dates only: no emails, names, uids or tokens ever reach the log.
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('../scripts/lib/firebaseAdmin');

const WEEKS = 10;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function weekIndex(ms, now) {
    return Math.floor((now - ms) / WEEK_MS);
}

function histogram(label, buckets, now) {
    console.log(`\n${label}`);
    for (let i = 0; i < WEEKS; i++) {
        const start = new Date(now - (i + 1) * WEEK_MS).toISOString().slice(0, 10);
        const end = new Date(now - i * WEEK_MS).toISOString().slice(0, 10);
        const n = buckets[i] || 0;
        const bar = n ? '█'.repeat(Math.min(n, 50)) : '·';
        console.log(`  ${start} → ${end}  ${String(n).padStart(4)}  ${bar}`);
    }
}

async function listAllAuthUsers() {
    const users = [];
    let pageToken;
    do {
        const page = await getAuth().listUsers(1000, pageToken);
        page.users.forEach(u => users.push(u));
        pageToken = page.pageToken;
    } while (pageToken);
    return users;
}

async function main() {
    const now = Date.now();

    console.log('=== FIREBASE AUTH (the sign-in itself) ===');
    let authUsers = null;
    try {
        authUsers = await listAllAuthUsers();
    } catch (err) {
        console.log('  could not read Auth:', err.code || err.message);
    }

    if (authUsers) {
        const created = {}, signedIn = {}, providers = {};
        let newest = 0;
        authUsers.forEach(u => {
            const c = Date.parse(u.metadata.creationTime);
            if (c > newest) newest = c;
            const ci = weekIndex(c, now);
            if (ci >= 0 && ci < WEEKS) created[ci] = (created[ci] || 0) + 1;
            const l = Date.parse(u.metadata.lastSignInTime || u.metadata.creationTime);
            const li = weekIndex(l, now);
            if (li >= 0 && li < WEEKS) signedIn[li] = (signedIn[li] || 0) + 1;
            (u.providerData || []).forEach(p => { providers[p.providerId] = (providers[p.providerId] || 0) + 1; });
        });
        console.log(`  total accounts      : ${authUsers.length}`);
        console.log(`  newest account      : ${newest ? new Date(newest).toISOString() : 'n/a'}`);
        console.log(`  providers           : ${JSON.stringify(providers)}`);
        histogram('  accounts CREATED per week (newest first):', created, now);
        histogram('  accounts SIGNED IN per week (newest first):', signedIn, now);
    }

    console.log('\n=== FIRESTORE users/ (what the admin panel counts) ===');
    const snap = await getFirestore().collection('users').get();
    const login = {}, first = {}, platforms = {}, versions = {};
    let withFirstSeen = 0, withEmail = 0, newestLogin = 0;
    snap.forEach(doc => {
        const d = doc.data();
        if (d.email) withEmail++;
        if (d.firstSeen) {
            withFirstSeen++;
            const fi = weekIndex(d.firstSeen.toMillis(), now);
            if (fi >= 0 && fi < WEEKS) first[fi] = (first[fi] || 0) + 1;
        }
        if (d.lastLogin) {
            const ms = d.lastLogin.toMillis();
            if (ms > newestLogin) newestLogin = ms;
            const li = weekIndex(ms, now);
            if (li >= 0 && li < WEEKS) login[li] = (login[li] || 0) + 1;
        }
        platforms[d.platform || '(none)'] = (platforms[d.platform || '(none)'] || 0) + 1;
        versions[d.appVersion || '(none)'] = (versions[d.appVersion || '(none)'] || 0) + 1;
    });
    console.log(`  total docs          : ${snap.size}`);
    console.log(`  with firstSeen      : ${withFirstSeen}`);
    console.log(`  with email          : ${withEmail}`);
    console.log(`  newest lastLogin    : ${newestLogin ? new Date(newestLogin).toISOString() : 'n/a'}`);
    console.log(`  platforms           : ${JSON.stringify(platforms)}`);
    console.log(`  appVersions         : ${JSON.stringify(versions)}`);
    histogram('  docs by lastLogin week (newest first):', login, now);
    histogram('  docs by firstSeen week (newest first):', first, now);

    if (authUsers) {
        // The decisive cross-reference: for each week, how many accounts
        // created then actually ended up with a Firestore doc. A count that
        // "stopped moving" means recent weeks losing their docs; an even
        // sprinkle of losses across all weeks means something else froze.
        const docIds = new Set();
        snap.forEach(doc => docIds.add(doc.id));
        const perWeek = {};
        const missingWeeks = {};
        authUsers.forEach(u => {
            const i = weekIndex(Date.parse(u.metadata.creationTime), now);
            if (i < 0 || i >= WEEKS) return;
            if (!perWeek[i]) perWeek[i] = { total: 0, withDoc: 0 };
            perWeek[i].total++;
            if (docIds.has(u.uid)) perWeek[i].withDoc++;
            else missingWeeks[i] = (missingWeeks[i] || 0) + 1;
        });
        console.log('\n=== ACCOUNTS CREATED vs DOC WRITTEN (per week, newest first) ===');
        for (let i = 0; i < WEEKS; i++) {
            const w = perWeek[i] || { total: 0, withDoc: 0 };
            const start = new Date(now - (i + 1) * WEEK_MS).toISOString().slice(0, 10);
            const end = new Date(now - i * WEEK_MS).toISOString().slice(0, 10);
            const lost = w.total - w.withDoc;
            console.log(`  ${start} → ${end}  created ${String(w.total).padStart(3)}  with doc ${String(w.withDoc).padStart(3)}  MISSING ${lost}`);
        }
        console.log(`  missing by week: ${JSON.stringify(missingWeeks)}`);

        console.log('\n=== VERDICT ===');
        const missing = authUsers.length - snap.size;
        console.log(`  Auth accounts ${authUsers.length} vs Firestore docs ${snap.size} → ${missing} account(s) with no doc`);
        console.log(missing > 0
            ? '  Accounts exist that never got a Firestore doc → the client write is failing.'
            : '  Every account has a doc → sign-ups themselves are what stopped.');
    }
}

main().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
