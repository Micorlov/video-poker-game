'use strict';

// Locks in the silent-failure repairs of 2026-09-27: every Firestore listener
// reports through onSnapshotError(), no promise rejection is discarded by an
// empty .catch(), and every Firestore write sits inside firebaseSafe() or a
// transaction. It reads js/*.js as text, so it needs no emulator and runs in
// CI. The first half proves each rule fires on the shape it guards against,
// so a green project scan means something.

const test = require('node:test');
const assert = require('node:assert');

const sf = require('./silentFailures');

// Firestore writes that are unguarded in the text but guarded at runtime.
// Keyed on file, enclosing top-level function and the chain shape, so an
// entry excuses exactly one site and a new write in the same file still
// fails. Add a reason with every entry; delete the entry when the code moves.
const WRITE_ALLOWLIST = [
    {
        file: 'js/firebase.js', fn: 'setWithRetry', chain: 'ref',
        reason: 'retried three times, then rethrown into logUserToFirestore(), whose only caller wraps it in firebaseSafe()'
    },
    {
        file: 'js/firebase.js', fn: 'logUserToFirestore', chain: 'db.collection.doc',
        reason: 'the returned promise is wrapped by firebaseSafe() at the single call site in onAuthStateChanged'
    }
];

// --- rule 1: listeners -------------------------------------------------------

test('a listener with an empty error callback is flagged with its line', () => {
    const src = [
        'function subscribe() {',
        "    db.collection('x').onSnapshot(function(snap) {",
        '        render(snap);',
        '    }, function() { /* silently ignore */ });',
        '}'
    ].join('\n');
    const [finding] = sf.findListeners(src);
    assert.strictEqual(finding.line, 2);
    assert.match(finding.reason, /not onSnapshotError/);
});

test('a listener with no error callback at all is flagged', () => {
    const src = "db.collection('x').onSnapshot(function(snap) { render(snap); });";
    assert.match(sf.findListeners(src)[0].reason, /no error callback/);
});

test('a listener that passes onSnapshotError() passes', () => {
    const src = [
        "db.collection('x').where('a', '==', 1)",
        "    .onSnapshot(function(snap) { render(snap); }, onSnapshotError('board'));"
    ].join('\n');
    assert.deepStrictEqual(sf.findListeners(src), []);
});

test('onSnapshot mentioned in a comment or a string is not a listener', () => {
    const src = [
        "// the live onSnapshot(x, y) listeners pick this up",
        "var s = '.onSnapshot(a)';"
    ].join('\n');
    assert.deepStrictEqual(sf.findListeners(src), []);
});

// --- rule 2: empty catches ---------------------------------------------------

test('an empty .catch() is flagged, whether bare, commented or an arrow', () => {
    const src = [
        'a().catch(function() {});',
        'b().catch(function() { /* silently ignore */ });',
        'c().catch(() => {});',
        'd().catch(e => {});'
    ].join('\n');
    assert.deepStrictEqual(sf.findEmptyCatches(src).map((f) => f.line), [1, 2, 3, 4]);
});

test('a .catch() that only returns a bare literal is just as silent', () => {
    const src = [
        'a().catch(function() { return null; });',
        'b().catch(function(err) { return false; });',
        'c().catch(() => undefined);',
        'd().catch(() => ({}));',
        "e().catch(function() { return ''; });"
    ].join('\n');
    assert.deepStrictEqual(sf.findEmptyCatches(src).map((f) => f.line), [1, 2, 3, 5], 'the parenthesised object literal is the one shape left alone');
});

test('a .catch() that does something with the rejection passes', () => {
    const src = [
        'a().catch(function(err) { vpReportError(err, "native"); });',
        'b().catch(function(err) { return fallbackFor(err); });',
        "c().catch(function(err) { if (err.code !== 'permission-denied') throw err; return ref.get(); });",
        'try { x(); } catch (e) {}'
    ].join('\n');
    assert.deepStrictEqual(sf.findEmptyCatches(src), []);
});

test('a deliberate silence carries a vp-silent marker', () => {
    const marked = 'a().catch(function() { /* vp-silent: Play declining is normal */ });';
    assert.deepStrictEqual(sf.findEmptyCatches(marked), []);
    const trailing = 'a().catch(function() {}); // vp-silent: fire and forget';
    assert.deepStrictEqual(sf.findEmptyCatches(trailing), []);
    const unmarked = 'a().catch(function() { /* silent */ });';
    assert.strictEqual(sf.findEmptyCatches(unmarked).length, 1);
});

// --- rule 3: unguarded writes ------------------------------------------------

test('a Firestore write outside firebaseSafe is flagged with its function and chain', () => {
    const src = [
        'function flush(uid, update) {',
        "    db.collection('users').doc(uid).update(update).catch(function() {});",
        '}'
    ].join('\n');
    const [finding] = sf.findUnguardedWrites(src);
    assert.strictEqual(finding.line, 2);
    assert.strictEqual(finding.fn, 'flush');
    assert.strictEqual(finding.chain, 'db.collection.doc');
});

test('writes inside firebaseSafe or a transaction pass, across lines', () => {
    const src = [
        'firebaseSafe(function() {',
        "    return db.collection('users').doc(uid)",
        "        .collection('fcmTokens').doc(token)",
        '        .set({ token: token }, { merge: true });',
        '});',
        'db.runTransaction(function(tx) {',
        '    tx.set(hourRef, { a: 1 }, { merge: true });',
        '    return tx.get(dayRef).then(function() { tx.update(dayRef, { b: 2 }); });',
        '});'
    ].join('\n');
    assert.deepStrictEqual(sf.findUnguardedWrites(src), []);
});

test('writes through a ref variable or a transaction handle count as Firestore', () => {
    const src = [
        'claimRef.set({ a: 1 });',
        'item.ref.update({ b: 2 });',
        'tx.set(ref, {});',
        'batch.delete(ref);'
    ].join('\n');
    assert.deepStrictEqual(sf.findUnguardedWrites(src).map((f) => f.chain), ['claimRef', 'item.ref', 'tx', 'batch']);
});

test('non-Firestore set/add/delete calls are ignored', () => {
    const src = [
        "el.classList.add('x');",
        "url.searchParams.delete('gift');",
        "target.searchParams.set(key, value);",
        'usedRanks.add(rank);',
        'scoreMap.set(uid, data);'
    ].join('\n');
    assert.deepStrictEqual(sf.findUnguardedWrites(src), []);
});

test('an allowlist entry excuses exactly its file, function and chain', () => {
    const src = [
        'function setWithRetry(ref, payload) {',
        '    return ref.set(payload, { merge: true });',
        '}',
        'function other(ref, payload) {',
        '    return ref.set(payload);',
        '}'
    ].join('\n');
    const allow = [{ fn: 'setWithRetry', chain: 'ref', reason: 'test' }];
    assert.deepStrictEqual(sf.findUnguardedWrites(src, allow).map((f) => f.fn), ['other']);
});

test('parens inside strings, comments and regex literals do not break matching', () => {
    const src = [
        "var re = /at\\s+(?:(.+?)\\s+\\()?(.+?):(\\d+)\\)?/;",
        "// a comment with an unbalanced ( paren",
        "var s = 'unbalanced ) too';",
        'firebaseSafe(function() {',
        "    return db.collection('x').doc('y').set({ a: 1 });",
        '});',
        "db.collection('z').doc('w').set({ b: 2 });"
    ].join('\n');
    assert.deepStrictEqual(sf.findUnguardedWrites(src).map((f) => f.line), [7]);
});

// --- the project itself ------------------------------------------------------

const scan = sf.scanProject(WRITE_ALLOWLIST);

test('every onSnapshot listener in js/ reports through onSnapshotError()', () => {
    assert.strictEqual(scan.listeners.length, 0, '\n' + sf.describe(scan.listeners));
});

test('no promise rejection in js/ is discarded by an empty .catch()', () => {
    assert.strictEqual(scan.catches.length, 0, '\n' + sf.describe(scan.catches));
});

test('every Firestore write in js/ is inside firebaseSafe() or a transaction', () => {
    assert.strictEqual(scan.writes.length, 0, '\n' + sf.describe(scan.writes));
});

test('the allowlist names only sites that still exist', () => {
    const unguarded = sf.scanProject([]).writes;
    WRITE_ALLOWLIST.forEach((entry) => {
        const hit = unguarded.find((f) => f.file === entry.file && f.fn === entry.fn && f.chain === entry.chain);
        assert.ok(hit, `stale allowlist entry: ${entry.file} ${entry.fn} ${entry.chain}`);
        assert.ok(entry.reason, 'every allowlist entry needs a reason');
    });
});

test('the project has the listeners the repair covered, each with a distinct context', () => {
    const contexts = [];
    sf.projectSources().forEach(({ src }) => {
        const re = /onSnapshotError\('([^']+)'\)/g;
        let m;
        while ((m = re.exec(src))) contexts.push(m[1]);
    });
    assert.strictEqual(new Set(contexts).size, contexts.length, 'listener contexts must be unique: ' + contexts.join(', '));
    assert.ok(contexts.length >= 10, 'expected at least the ten listeners repaired, found ' + contexts.length);
});
