// Uploads the signed release AAB to Google Play and rolls it out to a
// track, via the Play Developer API.
//
// Usage:
//   node scripts/play-release-upload.js validate   # dry run, edit discarded
//   node scripts/play-release-upload.js commit     # real upload + rollout
//
// Auth: service account at ~/.config/mcp/google-play-service-account.json
// (same credential the google-play MCP uses; has upload+commit permission).

const fs = require('fs');
const path = require('path');
const { JWT } = require('google-auth-library');

const PKG = 'com.micorlov.videopoker';
const TRACK = 'production';
const AAB_PATH = path.join(__dirname, '..', 'android/app/build/outputs/bundle/release/app-release.aab');
const API = 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications/' + PKG;
const UPLOAD_API = 'https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/' + PKG;
const KEY_FILE = path.join(process.env.HOME, '.config/mcp/google-play-service-account.json');

const RELEASE_NOTES = {
    'en-US': `A fresh table-felt look across the game.

Fixed: pending room invites could disappear from the Play screen instead of showing up.

Fixed: winning highlights, sounds, and haptics now land exactly when the card finishes flipping, not before.`
};

const mode = process.argv[2];
if (mode !== 'validate' && mode !== 'commit') {
    console.error('usage: node play-release-upload.js validate|commit');
    process.exit(1);
}

async function api(token, method, url, body, contentType) {
    for (let attempt = 1; attempt <= 3; attempt++) {
        const res = await fetch(url, {
            method,
            headers: {
                Authorization: 'Bearer ' + token,
                ...(contentType ? { 'Content-Type': contentType } : {})
            },
            body
        });
        if (res.status >= 500 && attempt < 3) {
            console.warn(`  ${res.status} on ${method} ${url.slice(API.length)} — retry ${attempt}`);
            await new Promise(r => setTimeout(r, 1500 * attempt));
            continue;
        }
        if (!res.ok) {
            throw new Error(`${method} ${url} -> ${res.status}: ${(await res.text()).slice(0, 500)}`);
        }
        return res.status === 204 ? null : res.json();
    }
}

(async () => {
    for (const [lang, text] of Object.entries(RELEASE_NOTES)) {
        if (text.length > 500) throw new Error(`release notes for ${lang} are ${text.length} chars, over the 500 cap`);
    }

    const key = JSON.parse(fs.readFileSync(KEY_FILE, 'utf8'));
    const jwt = new JWT({
        email: key.client_email,
        key: key.private_key,
        scopes: ['https://www.googleapis.com/auth/androidpublisher']
    });
    const { token } = await jwt.getAccessToken();

    const edit = await api(token, 'POST', `${API}/edits`, '{}', 'application/json');
    console.log('edit', edit.id);

    const bundle = await api(token, 'POST',
        `${UPLOAD_API}/edits/${edit.id}/bundles?uploadType=media`,
        fs.readFileSync(AAB_PATH), 'application/octet-stream');
    console.log('uploaded bundle, versionCode', bundle.versionCode);

    await api(token, 'PUT', `${API}/edits/${edit.id}/tracks/${TRACK}`, JSON.stringify({
        releases: [{
            versionCodes: [String(bundle.versionCode)],
            status: 'completed',
            releaseNotes: Object.entries(RELEASE_NOTES).map(([language, text]) => ({ language, text }))
        }]
    }), 'application/json');
    console.log('track', TRACK, 'set to versionCode', bundle.versionCode);

    if (mode === 'validate') {
        await api(token, 'POST', `${API}/edits/${edit.id}:validate`, '{}', 'application/json');
        await api(token, 'DELETE', `${API}/edits/${edit.id}`);
        console.log('VALIDATED ok — edit discarded, nothing published');
    } else {
        await api(token, 'POST', `${API}/edits/${edit.id}:commit`, '{}', 'application/json');
        console.log('COMMITTED — release submitted for review / rollout');
    }
})().catch(err => { console.error(err.message || err); process.exit(1); });
