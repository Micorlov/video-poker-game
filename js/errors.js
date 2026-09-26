// Client error reporting — the app's only crash signal.
//
// This is a Capacitor app: it never crashes natively, it breaks in JavaScript
// and the WebView survives, so Android vitals reports 0 crashes forever.
// Before this file nothing listened for window errors, and firebaseSafe()
// (js/firebase.js) swallowed every Firestore rejection.
//
// Reports travel over js/telemetry.js (REST, no auth) and wait in a
// localStorage outbox until the server accepts them. That matters for the
// main suspect, an exhausted Firestore write quota: the report of it is
// rejected for the same reason (HTTP 429), so it is held and delivered after
// the midnight-UTC reset instead of being lost.
//
// Hard limits, because a reporter that loops is the very failure it hunts:
// at most VP_ERR_MAX_PER_SESSION distinct reports per session, one per
// distinct error (repeats only bump its count while it is still queued), and
// nothing in here may throw back into the caller.

var VP_ERR_MAX_PER_SESSION = 15;
var VP_ERR_OUTBOX_KEY = 'vp_error_outbox';
var VP_ERR_OUTBOX_MAX = 20;
var VP_ERR_FLUSH_DELAY_MS = 4000;
var VP_ERR_STARTUP_FLUSH_MS = 8000;
// A Firestore SDK write never rejects on quota: RESOURCE_EXHAUSTED is a
// retryable code, so the SDK backs off and the promise just stays pending.
// A request still pending this long while online and visible is reported as
// a stall — and that report's own REST send says whether quota is the cause.
var VP_ERR_STALL_MS = 60000;
var VP_ERR_MAX_AGE_SEC = 30 * 24 * 60 * 60;

var vpErrSeen = {};
var vpErrSessionCount = 0;
var vpErrFlushTimer = null;
var vpErrFlushDueAt = 0;
var vpErrFlushing = false;
var vpErrQuotaQueued = false;
var vpErrStallReported = false;
var vpErrLastHiddenAt = 0;

// Crashlytics, on native only. It exists to catch native crashes, which this
// app does not have — it breaks in JavaScript and the WebView survives — so
// every report is also recorded there as a non-fatal exception. Without this
// forwarding, Crashlytics would report zero for the same reason Android vitals
// does. The Firestore `errors` collection stays the primary record: it covers
// web, works for signed-out guests, and is queryable from the admin panel.
function vpCrashlytics() {
    try {
        var cap = window.Capacitor;
        if (!cap || !cap.isNativePlatform || !cap.isNativePlatform()) return null;
        return (cap.Plugins && cap.Plugins.FirebaseCrashlytics) || null;
    } catch (e) {
        return null;
    }
}

// Crashlytics groups non-fatals by their stack, so the frames are parsed out of
// the string rather than passed as one blob. Anything unparseable still travels
// as the message.
function vpStackFrames(stack) {
    if (!stack) return [];
    return String(stack).split('\n').slice(0, 8).map(function(line) {
        var m = line.match(/at\s+(?:(.+?)\s+\()?(.+?):(\d+):(\d+)\)?\s*$/);
        if (!m) return null;
        return {
            methodName: (m[1] || '<anonymous>').slice(0, 120),
            fileName: m[2].replace(/https?:\/\/[^\s)]*\//g, '').slice(0, 160),
            lineNumber: parseInt(m[3], 10) || 0
        };
    }).filter(function(frame) { return !!frame; });
}

function vpSendToCrashlytics(fields, stack) {
    var crashlytics = vpCrashlytics();
    if (!crashlytics) return;
    try {
        var label = fields.kind + ': ' + (fields.code ? '[' + fields.code + '] ' : '') + fields.message;
        var frames = vpStackFrames(stack);
        var options = { message: label.slice(0, 300) };
        if (frames.length) options.stacktrace = frames;
        var sent = crashlytics.recordException(options);
        if (sent && sent.catch) sent.catch(function() {});
        // Screen and version make a Crashlytics issue actionable; they are the
        // two things a raw JS stack still lacks.
        if (crashlytics.setCustomKey) {
            [['screen', fields.screen], ['app_version', fields.version], ['quota', String(fields.quota)]]
                .forEach(function(pair) {
                    var done = crashlytics.setCustomKey({ key: pair[0], value: pair[1], type: 'string' });
                    if (done && done.catch) done.catch(function() {});
                });
        }
    } catch (e) { /* diagnostics must never throw back into the caller */ }
}

function vpIsQuotaError(err) {
    if (!err) return false;
    if (err.code === 'resource-exhausted') return true;
    return /resource[ _-]?exhausted|quota/i.test(String(err.message || err));
}

function vpTrimStack(stack) {
    if (!stack) return '';
    return String(stack).split('\n').slice(0, 6).map(function(line) {
        // Keep "video_poker.html:1234:56", drop the origin and path before it.
        return line.trim().replace(/https?:\/\/[^\s)]*\//g, '').slice(0, 160);
    }).join('\n').slice(0, 1000);
}

function vpCurrentScreen() {
    try {
        var overlay = document.getElementById('onboarding-overlay');
        if (overlay && !overlay.classList.contains('hidden')) return 'onboarding';
        var active = document.querySelector('[id^="screen-"].active');
        return active ? active.id.slice('screen-'.length, 'screen-'.length + 30) : 'boot';
    } catch (e) {
        return 'unknown';
    }
}

function vpErrUid() {
    try { return (window.egUser && window.egUser.uid) ? String(window.egUser.uid).slice(0, 128) : ''; } catch (e) { return ''; }
}

function vpBuildErrorFields(err, kind) {
    var device = vpDeviceInfo();
    var message = (err && (err.message || err.reason)) || err || 'unknown';
    // A FirebaseError carries no frames of its own, so firebaseSafe() attaches
    // the stack of whichever caller made the request.
    var stack = (err && err.__vpCallSite) || (err && err.stack);
    return {
        kind: String(kind).slice(0, 20),
        message: String(message).slice(0, 300),
        code: (err && typeof err.code === 'string') ? err.code.slice(0, 60) : '',
        stack: vpTrimStack(stack),
        quota: vpIsQuotaError(err),
        count: 1,
        screen: vpCurrentScreen(),
        version: device.version,
        platform: device.platform,
        country: vpCountry(),
        uid: vpErrUid(),
        installId: vpInstallId(),
        online: navigator.onLine !== false
    };
}

function vpErrSignature(fields) {
    return fields.kind + '|' + fields.code + '|' + fields.message.slice(0, 120);
}

function vpOutboxRead() {
    try {
        var list = JSON.parse(localStorage.getItem(VP_ERR_OUTBOX_KEY) || '[]');
        return Array.isArray(list) ? list : [];
    } catch (e) {
        return [];
    }
}

function vpOutboxWrite(list) {
    try { localStorage.setItem(VP_ERR_OUTBOX_KEY, JSON.stringify(list.slice(-VP_ERR_OUTBOX_MAX))); } catch (e) { /* storage full or blocked */ }
}

function vpBumpQueuedCount(sig) {
    var found = false;
    var next = vpOutboxRead().map(function(entry) {
        if (entry.sig !== sig) return entry;
        found = true;
        var fields = {};
        Object.keys(entry.fields).forEach(function(k) { fields[k] = entry.fields[k]; });
        fields.count = (fields.count || 1) + 1;
        return { id: entry.id, sig: entry.sig, queuedAt: entry.queuedAt, fields: fields };
    });
    if (found) vpOutboxWrite(next);
}

// Public entry point. kind: 'error' | 'rejection' | 'firebase' | 'stall' |
// 'quota' | 'manual'. Never throws.
function vpReportError(err, kind) {
    try {
        var fields = vpBuildErrorFields(err, kind || 'manual');
        var sig = vpErrSignature(fields);
        if (vpErrSeen[sig]) {
            vpErrSeen[sig] += 1;
            vpBumpQueuedCount(sig);
            return;
        }
        if (vpErrSessionCount >= VP_ERR_MAX_PER_SESSION) return;
        vpErrSeen[sig] = 1;
        vpErrSessionCount += 1;
        vpOutboxWrite(vpOutboxRead().concat([{ id: vpRandomId(), sig: sig, queuedAt: Date.now(), fields: fields }]));
        // Crashlytics gets the untrimmed stack, since it symbolicates its own
        // frames; the Firestore copy keeps the trimmed one for the admin table.
        vpSendToCrashlytics(fields, (err && err.stack) || fields.stack);
        vpScheduleErrorFlush(VP_ERR_FLUSH_DELAY_MS);
    } catch (e) { /* the reporter must never become the error */ }
}

// Keeps the soonest requested flush: a new error must not wait behind the
// longer startup delay.
function vpScheduleErrorFlush(delayMs) {
    var dueAt = Date.now() + delayMs;
    if (vpErrFlushTimer && vpErrFlushDueAt <= dueAt) return;
    if (vpErrFlushTimer) clearTimeout(vpErrFlushTimer);
    vpErrFlushDueAt = dueAt;
    vpErrFlushTimer = setTimeout(function() {
        vpErrFlushTimer = null;
        vpFlushErrors();
    }, delayMs);
}

function vpDropFromOutbox(id) {
    vpOutboxWrite(vpOutboxRead().filter(function(entry) { return entry.id !== id; }));
}

// The quota signal is the one this whole module exists to catch: record it as
// its own report, which waits in the outbox until the quota resets.
function vpNoteQuotaHit() {
    if (vpErrQuotaQueued) return;
    vpErrQuotaQueued = true;
    vpReportError({ code: 'resource-exhausted', message: 'Firestore quota exhausted: an error report was rejected with HTTP 429' }, 'quota');
}

function vpSendNext(queue) {
    if (!queue.length) return Promise.resolve();
    var entry = queue[0];
    var age = Math.round((Date.now() - entry.queuedAt) / 1000);
    var data = {};
    Object.keys(entry.fields).forEach(function(k) { data[k] = entry.fields[k]; });
    data.ageSec = Math.max(0, Math.min(VP_ERR_MAX_AGE_SEC, age || 0));
    return vpRestCreate('errors', entry.id, data).then(function(result) {
        if (result === 'ok' || result === 'rejected') {
            vpDropFromOutbox(entry.id);
            return vpSendNext(queue.slice(1));
        }
        // 'quota' or 'retry': the rest would fail the same way. Keep them all.
        if (result === 'quota') vpNoteQuotaHit();
        return null;
    });
}

function vpFlushErrors() {
    if (vpErrFlushing) return Promise.resolve();
    var queue = vpOutboxRead();
    if (!queue.length) return Promise.resolve();
    vpErrFlushing = true;
    return vpSendNext(queue).then(function() {
        vpErrFlushing = false;
    }, function() {
        vpErrFlushing = false;
    });
}

// Called by firebaseSafe() for every Firestore promise it wraps.
function vpWatchPending(promise) {
    try {
        if (vpErrStallReported || !promise || typeof promise.then !== 'function') return;
        var startedAt = Date.now();
        var settled = false;
        var timer = setTimeout(function() {
            if (settled || vpErrStallReported) return;
            // Backgrounded WebViews suspend the network; that is not a stall.
            if (navigator.onLine === false || vpErrLastHiddenAt >= startedAt) return;
            if (document.visibilityState === 'hidden') return;
            vpErrStallReported = true;
            vpReportError({ code: 'stalled', message: 'Firestore request still pending after ' + (VP_ERR_STALL_MS / 1000) + 's while online' }, 'stall');
        }, VP_ERR_STALL_MS);
        var done = function() { settled = true; clearTimeout(timer); };
        promise.then(done, done);
    } catch (e) { /* never break the caller */ }
}

function vpErrorEventToError(ev) {
    if (ev.error) return ev.error;
    return { message: ev.message || 'Script error', stack: (ev.filename || '') + ':' + (ev.lineno || 0) + ':' + (ev.colno || 0) };
}

function vpInitErrorReporting() {
    try {
        window.addEventListener('error', function(ev) {
            vpReportError(vpErrorEventToError(ev), 'error');
        });
        window.addEventListener('unhandledrejection', function(ev) {
            var reason = ev.reason;
            vpReportError(reason && typeof reason === 'object' ? reason : { message: String(reason) }, 'rejection');
        });
        document.addEventListener('visibilitychange', function() {
            if (document.visibilityState === 'hidden') vpErrLastHiddenAt = Date.now();
            else vpScheduleErrorFlush(VP_ERR_FLUSH_DELAY_MS);
        });
        window.addEventListener('online', function() { vpScheduleErrorFlush(VP_ERR_FLUSH_DELAY_MS); });
        // Deliver whatever an earlier session could not (quota, offline).
        vpScheduleErrorFlush(VP_ERR_STARTUP_FLUSH_MS);
    } catch (e) { /* no DOM: nothing to listen to */ }
}

vpInitErrorReporting();
