// First-party install funnel: did this install open, and did it boot?
//
// Play Console showed 96 device acquisitions in 28 days against 33 first
// opens, and nothing we controlled could say which side of "open" the
// missing two thirds fell on. Two docs per install answer it:
//   installs/{id}_open — sent the moment this early script runs, before the
//                        main bundle can fail to parse or throw during init
//   installs/{id}_boot — sent once js/tabs.js finishes its DOMContentLoaded
//                        init and calls vpMarkBooted()
// An open with no boot is an install that launched and died during init.
// `opens` on the boot doc counts the launches it took to get there, so a
// first launch that died and a second that worked still shows up.
// `existing` marks upgrades from builds that predate this file — they report
// once too, and the admin panel keeps them out of the new-install figures.

var VP_BOOT_SEND_DELAY_MS = 3000; // lets country and install referrer resolve
var VP_MAX_BOOT_MS = 24 * 60 * 60 * 1000; // firestore.rules caps bootMs here
var vpScriptStartedAt = Date.now();
var vpBootedAt = 0;

function vpAcquisitionSource() {
    try {
        if (typeof getStoredUtmContext === 'function') {
            var utm = getStoredUtmContext();
            if (utm && utm.utm_source) return String(utm.utm_source).slice(0, 40);
        }
    } catch (e) { /* main bundle not initialised */ }
    try {
        if (localStorage.getItem('vp_referral_invited')) return 'referral';
    } catch (e) { /* storage blocked */ }
    return 'organic';
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
        source: isBoot ? vpAcquisitionSource() : '',
        bootMs: isBoot && vpBootedAt ? Math.max(0, Math.min(VP_MAX_BOOT_MS, vpBootedAt - vpScriptStartedAt)) : 0
    };
}

// Sends one stage at most once per install. A 'rejected' result means the doc
// already exists (an earlier send landed but its response was lost) or the
// rules refused the shape — either way resending cannot help.
function vpSendInstallStage(stage) {
    var flag = stage === 'open' ? 'openSent' : 'bootSent';
    if (vpInstallState()[flag]) return Promise.resolve('done');
    return vpRestCreate('installs', vpInstallId() + '_' + stage, vpInstallRecord(stage)).then(function(result) {
        if (result === 'ok' || result === 'rejected') {
            var patch = {};
            patch[flag] = true;
            vpUpdateInstall(patch);
        }
        return result;
    });
}

function vpMarkBooted() {
    if (vpBootedAt) return;
    vpBootedAt = Date.now();
    setTimeout(function() { vpSendInstallStage('boot'); }, VP_BOOT_SEND_DELAY_MS);
}

(function vpInitInstallTracking() {
    try {
        var install = vpInstallState();
        if (install.bootSent) return;
        vpUpdateInstall({ opens: (install.opens || 0) + 1 });
        vpSendInstallStage('open');
    } catch (e) { /* diagnostics must never break boot */ }
})();
