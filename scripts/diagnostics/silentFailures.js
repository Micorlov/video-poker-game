'use strict';

// Static guard against the silent-failure shapes this project keeps growing
// back. Every one of them was found by hand once already:
//
//   1. a Firestore onSnapshot listener whose error callback is empty — the
//      whole real-time read path reported nothing until js/firebase.js gained
//      onSnapshotError();
//   2. a promise whose rejection is discarded by an empty .catch() — push-open
//      attribution was lost this way, making a working campaign look dead;
//   3. a Firestore write outside firebaseSafe() (or a transaction), which is
//      the only place a rejection is reported.
//
// It parses source rather than running the app, so it needs no emulator and
// runs in CI with `npm test`. silentFailures.test.js applies it to js/*.js.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const JS_DIR = path.join(ROOT, 'js');

// --- literal masking ---------------------------------------------------------
//
// Bracket matching must never see a paren inside a string, a comment or a
// regex literal. maskLiterals() returns a same-length copy of the source with
// the contents of those blanked to spaces (delimiters and newlines kept), so
// every index maps straight back to the original for line numbers and for the
// vp-silent marker, which lives inside a comment.

const REGEX_PRECEDING_CHARS = '(,=:[!&|?{};+-*%<>~^';
const REGEX_PRECEDING_WORDS = /^(?:return|typeof|instanceof|in|of|new|delete|void|throw|case|do|else)$/;

function regexCanStart(out, i) {
    let k = i - 1;
    while (k >= 0 && /\s/.test(out[k])) k--;
    if (k < 0) return true;
    const ch = out[k];
    if (REGEX_PRECEDING_CHARS.includes(ch)) return true;
    if (!/[\w$]/.test(ch)) return false;
    let w = k;
    while (w >= 0 && /[\w$]/.test(out[w])) w--;
    return REGEX_PRECEDING_WORDS.test(out.slice(w + 1, k + 1).join(''));
}

function maskLiterals(src) {
    const out = src.split('');
    const blank = (from, to) => {
        for (let k = from; k < to && k < out.length; k++) if (out[k] !== '\n') out[k] = ' ';
    };
    let i = 0;
    while (i < src.length) {
        const c = src[i];
        const next = src[i + 1];
        if (c === '/' && next === '/') {
            const end = src.indexOf('\n', i);
            const stop = end === -1 ? src.length : end;
            blank(i, stop);
            i = stop;
        } else if (c === '/' && next === '*') {
            const end = src.indexOf('*/', i + 2);
            const stop = end === -1 ? src.length : end + 2;
            blank(i, stop);
            i = stop;
        } else if (c === '"' || c === "'" || c === '`') {
            let j = i + 1;
            while (j < src.length && src[j] !== c) {
                if (src[j] === '\\') j++;
                j++;
            }
            blank(i + 1, j);
            i = j + 1;
        } else if (c === '/' && regexCanStart(out, i)) {
            let j = i + 1;
            let inClass = false;
            while (j < src.length && src[j] !== '\n' && (inClass || src[j] !== '/')) {
                if (src[j] === '\\') j++;
                else if (src[j] === '[') inClass = true;
                else if (src[j] === ']') inClass = false;
                j++;
            }
            blank(i + 1, j);
            i = j + 1;
        } else {
            i++;
        }
    }
    return out.join('');
}

// --- structure helpers -------------------------------------------------------

const OPENERS = '([{';
const CLOSERS = ')]}';

function matchParen(masked, open) {
    let depth = 0;
    for (let i = open; i < masked.length; i++) {
        const c = masked[i];
        if (OPENERS.includes(c)) depth++;
        else if (CLOSERS.includes(c)) {
            depth--;
            if (depth === 0) return i;
        }
    }
    return -1;
}

function matchParenBackward(masked, close) {
    let depth = 0;
    for (let i = close; i >= 0; i--) {
        const c = masked[i];
        if (CLOSERS.includes(c)) depth++;
        else if (OPENERS.includes(c)) {
            depth--;
            if (depth === 0) return i;
        }
    }
    return -1;
}

// Index ranges of the top-level arguments between a call's parens.
function topLevelArgs(masked, open, close) {
    const args = [];
    let depth = 0;
    let start = open + 1;
    for (let i = open + 1; i < close; i++) {
        const c = masked[i];
        if (OPENERS.includes(c)) depth++;
        else if (CLOSERS.includes(c)) depth--;
        else if (c === ',' && depth === 0) {
            args.push({ start, end: i });
            start = i + 1;
        }
    }
    if (masked.slice(start, close).trim()) args.push({ start, end: close });
    return args;
}

function lineOf(src, idx) {
    return src.slice(0, idx).split('\n').length;
}

function eachCall(masked, pattern, visit) {
    const re = new RegExp(pattern.source, 'g');
    let m;
    while ((m = re.exec(masked))) {
        const open = m.index + m[0].length - 1;
        const close = matchParen(masked, open);
        visit(m.index, open, close, close === -1 ? [] : topLevelArgs(masked, open, close));
    }
}

// --- rule 1: every listener reports ----------------------------------------

function findListeners(src) {
    const masked = maskLiterals(src);
    const findings = [];
    eachCall(masked, /\.onSnapshot\s*\(/, (at, open, close, args) => {
        const second = args[1] ? src.slice(args[1].start, args[1].end).trim() : '';
        if (/^onSnapshotError\s*\(/.test(second)) return;
        findings.push({
            line: lineOf(src, at),
            reason: args.length < 2
                ? 'onSnapshot() has no error callback; pass onSnapshotError(<context>) as the second argument'
                : 'onSnapshot() error callback is not onSnapshotError(<context>)'
        });
    });
    return findings;
}

// --- rule 2: no discarded rejections ----------------------------------------

// The masked argument: comments are already blanked, so a body holding only
// "/* silently ignore */" is as empty as one holding nothing. A body that
// just returns a bare literal — `return null`, `() => false` — discards the
// rejection exactly the same way, so it counts as empty too.
const BARE_LITERAL = String.raw`(?:null|undefined|false|true|0|''|""|\{\s*\}|\[\s*\])`;
const SILENT_BODY = String.raw`\{\s*(?:return\s*${BARE_LITERAL}?\s*;?\s*)?\}`;
const PARAMS = String.raw`\([^)]*\)`;
const EMPTY_HANDLER = new RegExp(String.raw`^(?:function\s*[\w$]*\s*${PARAMS}\s*${SILENT_BODY}|(?:${PARAMS}|[\w$]+)\s*=>\s*(?:${SILENT_BODY}|${BARE_LITERAL}))$`);
const SILENT_MARKER = /vp-silent:/;

function findEmptyCatches(src) {
    const masked = maskLiterals(src);
    const findings = [];
    eachCall(masked, /\.catch\s*\(/, (at, open, close, args) => {
        if (!args.length) return;
        const handler = masked.slice(args[0].start, args[0].end).trim();
        if (!EMPTY_HANDLER.test(handler)) return;
        const lineEnd = src.indexOf('\n', args[0].end);
        const visible = src.slice(args[0].start, lineEnd === -1 ? src.length : lineEnd);
        if (SILENT_MARKER.test(visible)) return;
        findings.push({
            line: lineOf(src, at),
            reason: 'rejection discarded by a .catch() that does nothing with it; handle it, report it, or mark the decision with /* vp-silent: <why> */'
        });
    });
    return findings;
}

// --- rule 3: every Firestore write is guarded --------------------------------

const WRITE_CALL = /\.(?:set|update|delete|add)\s*\(/;
const GUARD_CALL = /\b(?:firebaseSafe|runTransaction)\s*\(/;
// Name-based on purpose: the code consistently names references *Ref, and a
// write through some other alias is still caught at runtime by the prototype
// tagging in js/firebase.js plus the unhandledrejection listener — it only
// loses firebaseSafe()'s call-site stack, which is what this rule protects.
const FIRESTORE_SEGMENT = /^(?:db|tx|transaction|batch)$|(?:[Rr]ef|Col|Collection|Doc)$/;

function guardSpans(masked) {
    const spans = [];
    eachCall(masked, GUARD_CALL, (at, open, close) => {
        if (close !== -1) spans.push([open, close]);
    });
    return spans;
}

// Walks back from the '.' of a method call over the member chain it applies
// to — identifiers, dots and balanced call arguments — and returns where the
// chain starts.
function receiverStart(masked, dot) {
    let i = dot;
    for (;;) {
        while (i > 0 && /\s/.test(masked[i - 1])) i--;
        if (i > 0 && masked[i - 1] === ')') {
            const open = matchParenBackward(masked, i - 1);
            if (open === -1) return i;
            i = open;
            while (i > 0 && /\s/.test(masked[i - 1])) i--;
        }
        let j = i;
        while (j > 0 && /[\w$]/.test(masked[j - 1])) j--;
        if (j === i) return i;
        i = j;
        while (i > 0 && /\s/.test(masked[i - 1])) i--;
        if (i > 0 && masked[i - 1] === '.') { i--; continue; }
        return j;
    }
}

// "db.collection('users').doc(uid)" -> "db.collection.doc": the chain with
// its call arguments removed, which is what the allowlist matches on.
function chainShape(maskedChain) {
    let out = '';
    let depth = 0;
    for (const c of maskedChain) {
        if (OPENERS.includes(c)) depth++;
        else if (CLOSERS.includes(c)) depth--;
        else if (depth === 0 && !/\s/.test(c)) out += c;
    }
    return out;
}

function isFirestoreChain(shape) {
    return shape.split('.').some((segment) => FIRESTORE_SEGMENT.test(segment));
}

// The top-level function declaration a position sits in ('' outside any).
// js/*.js are flat scripts of column-0 declarations, so this is exact enough
// to key an allowlist entry on without matching a sibling function.
function enclosingFunction(masked, idx) {
    const re = /^(?:async\s+)?function\s+([\w$]+)\s*\(/gm;
    const head = masked.slice(0, idx);
    let name = '';
    let m;
    while ((m = re.exec(head))) name = m[1];
    return name;
}

function findUnguardedWrites(src, allow = []) {
    const masked = maskLiterals(src);
    const guards = guardSpans(masked);
    const findings = [];
    const re = new RegExp(WRITE_CALL.source, 'g');
    let m;
    while ((m = re.exec(masked))) {
        const dot = m.index;
        const start = receiverStart(masked, dot);
        const shape = chainShape(masked.slice(start, dot));
        if (!shape || !isFirestoreChain(shape)) continue;
        if (guards.some(([open, close]) => dot > open && dot < close)) continue;
        const fn = enclosingFunction(masked, dot);
        if (allow.some((entry) => entry.fn === fn && entry.chain === shape)) continue;
        findings.push({
            line: lineOf(src, dot),
            fn,
            chain: shape,
            reason: 'Firestore write outside firebaseSafe() or a transaction: its rejection is never reported'
        });
    }
    return findings;
}

// --- the project scan --------------------------------------------------------

function projectSources() {
    return fs.readdirSync(JS_DIR)
        .filter((name) => name.endsWith('.js'))
        .sort()
        .map((name) => ({ file: 'js/' + name, src: fs.readFileSync(path.join(JS_DIR, name), 'utf8') }));
}

function scanProject(writeAllowlist = [], sources = projectSources()) {
    const tag = (file, list) => list.map((f) => Object.assign({ file }, f));
    const listeners = [];
    const catches = [];
    const writes = [];
    sources.forEach(({ file, src }) => {
        listeners.push(...tag(file, findListeners(src)));
        catches.push(...tag(file, findEmptyCatches(src)));
        const allow = writeAllowlist.filter((entry) => entry.file === file);
        writes.push(...tag(file, findUnguardedWrites(src, allow)));
    });
    return { listeners, catches, writes };
}

function describe(findings) {
    return findings.map((f) => {
        const where = f.chain ? ` (${f.fn || 'top level'}: ${f.chain})` : '';
        return `${f.file}:${f.line}${where} — ${f.reason}`;
    }).join('\n');
}

module.exports = {
    maskLiterals, findListeners, findEmptyCatches, findUnguardedWrites,
    scanProject, projectSources, describe
};
