// Guards against shipping a stale web bundle inside the Android app.
//
// The APK loads www/video_poker.html, which build.js assembles from
// index.html, js/ and styles/. `npx cap sync android` packages whatever www/
// last held, so a sync without `npm run build` first ships old code under a
// new versionCode — nothing crashes, the new feature is just silently absent.

const fs = require('fs');
const { execFileSync } = require('child_process');

const AAB_BUNDLE_ENTRY = 'base/assets/public/video_poker.html';
const MAX_ENTRY_BYTES = 64 * 1024 * 1024;

function readZipEntry(zipPath, entry) {
    return execFileSync('unzip', ['-p', zipPath, entry], {
        maxBuffer: MAX_ENTRY_BYTES,
        stdio: ['ignore', 'pipe', 'ignore']
    });
}

// Compares the bundle packaged inside an AAB with a freshly built
// video_poker.html. readEntry is injectable so tests need no real zip.
function checkAabBundle(aabPath, builtHtmlPath, readEntry = readZipEntry) {
    if (!fs.existsSync(aabPath)) {
        return { ok: false, reason: `no AAB at ${aabPath}` };
    }
    let shipped;
    try {
        shipped = readEntry(aabPath, AAB_BUNDLE_ENTRY);
    } catch (err) {
        return { ok: false, reason: `AAB has no ${AAB_BUNDLE_ENTRY}` };
    }
    const built = fs.readFileSync(builtHtmlPath);
    if (!Buffer.from(shipped).equals(built)) {
        return {
            ok: false,
            reason: 'the AAB ships a different web bundle than the current sources build. ' +
                'Run `npm run sync:android`, then rebuild the release AAB.'
        };
    }
    return { ok: true };
}

module.exports = { checkAabBundle, AAB_BUNDLE_ENTRY };
