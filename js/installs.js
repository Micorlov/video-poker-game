// First-party install funnel: did this install open, did it boot, and does it
// keep coming back?
//
// Play Console showed 96 device acquisitions in 28 days against 33 first
// opens, and nothing we controlled could say which side of "open" the
// missing two thirds fell on. Two docs per install answer it:
//   installs/{id}_open — sent on the first launch from this early script,
//                        before the main bundle can fail to parse or throw
//                        during init
//   installs/{id}_boot — sent once js/tabs.js finishes its DOMContentLoaded
//                        init and calls vpMarkBooted()
// An open with no boot is an install that launched and died during init.
//
// `opens` on the open doc is the install's launch count: every later launch
// moves it forward and stamps `lastOpenAt`, which is what retention needs. It
// is an absolute count, not an increment, so a launch that could not be sent
// is folded into the next one and a resend can never double-count. `opens` on
// the boot doc is the launches it took to boot, so a first launch that died
// and a second that worked still shows up.
// `existing` marks upgrades from builds that predate this file, and the admin
// panel keeps them out of the new-install figures.

var VP_BOOT_SEND_DELAY_MS = 3000; // lets the install referrer arrive
var VP_COUNTRY_WAIT_MS = 5000; // a stage never waits longer for the IP lookup
var VP_MAX_BOOT_MS = 24 * 60 * 60 * 1000; // firestore.rules caps bootMs here
var vpScriptStartedAt = Date.now();
var vpBootedAt = 0;

function vpQueryParam(query, key) {
    var m = String(query || '').replace(/^\?/, '').match(new RegExp('(?:^|&)' + key + '=([^&]*)'));
    if (!m) return '';
    try { return decodeURIComponent(m[1].replace(/\+/g, ' ')).slice(0, 40); } catch (e) { return ''; }
}

function vpStoredUtmSource() {
    try {
        var utm = JSON.parse(localStorage.getItem('vp_first_utm') || 'null');
        return utm && utm.utm_source ? String(utm.utm_source).slice(0, 40) : '';
    } catch (e) {
        return '';
    }
}

function vpUrlUtmSource() {
    try { return vpQueryParam(location.search, 'utm_source'); } catch (e) { return ''; }
}

// An invite link sets one of these: js/deeplink.js parks a pending invite from
// the install referrer, js/referral.js marks one it has applied.
function vpWasInvited() {
    try {
        return !!(localStorage.getItem('vp_referral_invited') || localStorage.getItem('vp_pending_invite'));
    } catch (e) {
        return false;
    }
}

// Play's install referrer, as MainActivity parks it on window, e.g.
// "ref=AB12CD" for an invite or "utm_source=google-play&utm_medium=organic".
function vpReferrerSource(raw) {
    if (vpQueryParam(raw, 'ref') || vpQueryParam(raw, 'join')) return 'referral';
    var source = vpQueryParam(raw, 'utm_source');
    if (!source || vpQueryParam(raw, 'utm_medium') === 'organic') return 'organic';
    return source;
}

// Reads only what this early script can see, so the open stage is attributed
// even when the main bundle never boots. '' means not known yet.
function vpDetectSource() {
    var utm = vpStoredUtmSource() || vpUrlUtmSource();
    if (utm) return utm;
    if (vpWasInvited()) return 'referral';
    var raw = '';
    try { raw = window.__installReferrerRaw || ''; } catch (e) { /* no bridge */ }
    if (raw) return vpReferrerSource(raw);
    // The web has no install referrer, so no signal there means organic. On
    // native, Play answers asynchronously and only on the first launch: no
    // answer yet is unknown, not organic.
    return vpPlatform() === 'web' ? 'organic' : '';
}

// The first answer is kept, because MainActivity asks Play only once.
function vpAcquisitionSource() {
    var known = vpInstallState().source;
    if (known) return known;
    var source = vpDetectSource();
    if (source) vpUpdateInstall({ source: source });
    return source;
}

function vpInstallRecord(stage) {
    var install = vpInstallState();
    var device = vpDeviceInfo();
    var isBoot = stage === 'boot';
    return {
        stage: stage,
        installId: install.id,
        existing: !!install.existing,
        opens: install.opens || 1,
        version: device.version,
        platform: device.platform,
        android: device.android,
        chrome: device.chrome,
        lang: device.lang,
        country: vpCountry(),
        source: vpAcquisitionSource(),
        bootMs: isBoot && vpBootedAt ? Math.max(0, Math.min(VP_MAX_BOOT_MS, vpBootedAt - vpScriptStartedAt)) : 0
    };
}

// Runs `send` once the IP country is known, or after VP_COUNTRY_WAIT_MS with
// the country left empty — a stage is never held back for good by a lookup.
function vpWhenCountryKnown(send) {
    var sent = false;
    var go = function() {
        if (sent) return;
        sent = true;
        send();
    };
    vpResolveCountry().then(go);
    setTimeout(go, VP_COUNTRY_WAIT_MS);
}

// Sends one stage at most once per install. A 'rejected' result means the doc
// already exists (an earlier send landed but its response was lost) or the
// rules refused the shape — either way resending cannot help.
// The open stage remembers what country and source it sent, so a later launch
// can fill in whichever of the two it did not know.
function vpSendInstallStage(stage) {
    var flag = stage === 'open' ? 'openSent' : 'bootSent';
    if (vpInstallState()[flag]) return Promise.resolve('done');
    var record = vpInstallRecord(stage);
    return vpRestCreate('installs', vpInstallId() + '_' + stage, record).then(function(result) {
        if (result === 'ok' || result === 'rejected') {
            var patch = {};
            patch[flag] = true;
            if (stage === 'open') {
                patch.sentCountry = record.country;
                patch.sentSource = record.source;
            }
            vpUpdateInstall(patch);
        }
        return result;
    });
}

// A later launch: the open doc's count moves forward, and a country or source
// that was unknown at the open stage is filled in once. firestore.rules allows
// exactly this change and nothing else. Installs first tracked by an earlier
// build never recorded what they sent (sentCountry is undefined), and theirs
// may be a language guess the rules will not let us overwrite — so they only
// ever send the count.
function vpSendLaunch() {
    var install = vpInstallState();
    var patch = { opens: install.opens };
    var country = vpCountry();
    var source = vpAcquisitionSource();
    if (install.sentCountry === '' && country) patch.country = country;
    if (install.sentSource === '' && source) patch.source = source;
    return vpRestUpdate('installs', install.id + '_open', patch, 'lastOpenAt').then(function(result) {
        if (result === 'ok') {
            vpUpdateInstall({
                sentCountry: patch.country || install.sentCountry,
                sentSource: patch.source || install.sentSource
            });
        }
        return result;
    });
}

function vpMarkBooted() {
    if (vpBootedAt) return;
    vpBootedAt = Date.now();
    setTimeout(function() {
        vpWhenCountryKnown(function() { vpSendInstallStage('boot'); });
    }, VP_BOOT_SEND_DELAY_MS);
}

(function vpInitInstallTracking() {
    try {
        var install = vpUpdateInstall({ opens: (vpInstallState().opens || 0) + 1 });
        vpWhenCountryKnown(function() {
            if (install.openSent) vpSendLaunch();
            else vpSendInstallStage('open');
        });
    } catch (e) { /* diagnostics must never break boot */ }
})();
