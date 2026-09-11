// Sets the "What's new" release notes for the version already live on a track,
// in every locale in play-store-assets/listings.json. Uploads no bundle, so it
// is safe to run after scripts/play-release-upload.js has shipped the build.
//
// Usage:
//   node scripts/play-release-notes.js validate   # dry run, edit discarded
//   node scripts/play-release-notes.js commit     # real publish
//
// Auth: service account at ~/.config/mcp/google-play-service-account.json

const fs = require('fs');
const path = require('path');
const { JWT } = require('google-auth-library');

const PKG = 'com.micorlov.videopoker';
const TRACK = 'production';
const LISTINGS_PATH = path.join(__dirname, '..', 'play-store-assets/listings.json');
const API = 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications/' + PKG;
const KEY_FILE = path.join(process.env.HOME, '.config/mcp/google-play-service-account.json');
const NOTES_CAP = 500;

const mode = process.argv[2];
if (mode !== 'validate' && mode !== 'commit') {
    console.error('usage: node play-release-notes.js validate|commit');
    process.exit(1);
}

async function api(token, method, url, body) {
    const res = await fetch(url, {
        method,
        headers: {
            Authorization: 'Bearer ' + token,
            ...(body ? { 'Content-Type': 'application/json' } : {})
        },
        body
    });
    if (!res.ok) throw new Error(`${method} ${url} -> ${res.status}: ${(await res.text()).slice(0, 500)}`);
    return res.status === 204 ? null : res.json();
}

(async () => {
    const listings = JSON.parse(fs.readFileSync(LISTINGS_PATH, 'utf8'));
    const notes = [];
    for (const [language, l] of Object.entries(listings)) {
        const text = l.whatsNew;
        if (!text) throw new Error(`${language}: no whatsNew in listings.json`);
        if (text.length > NOTES_CAP) throw new Error(`${language}: whatsNew is ${text.length} chars, over the ${NOTES_CAP} cap`);
        notes.push({ language, text });
    }
    console.log(`${notes.length} locales validated locally`);

    const key = JSON.parse(fs.readFileSync(KEY_FILE, 'utf8'));
    const jwt = new JWT({
        email: key.client_email,
        key: key.private_key,
        scopes: ['https://www.googleapis.com/auth/androidpublisher']
    });
    const { token } = await jwt.getAccessToken();

    const edit = await api(token, 'POST', `${API}/edits`, '{}');
    console.log('edit', edit.id);

    // Reuse whatever version the track already carries — this script never ships a build.
    const track = await api(token, 'GET', `${API}/edits/${edit.id}/tracks/${TRACK}`);
    const release = track.releases && track.releases[0];
    if (!release) throw new Error(`track ${TRACK} has no release to annotate`);
    console.log('track', TRACK, 'versionCodes', release.versionCodes.join(','), 'status', release.status);

    await api(token, 'PUT', `${API}/edits/${edit.id}/tracks/${TRACK}`, JSON.stringify({
        releases: [{ ...release, releaseNotes: notes }]
    }));
    console.log('release notes set for', notes.length, 'locales');

    if (mode === 'validate') {
        await api(token, 'POST', `${API}/edits/${edit.id}:validate`, '{}');
        await api(token, 'DELETE', `${API}/edits/${edit.id}`);
        console.log('VALIDATED ok — edit discarded, nothing published');
        return;
    }
    await api(token, 'POST', `${API}/edits/${edit.id}:commit`, '{}');
    console.log('COMMITTED — release notes live');
})().catch(e => { console.error(e.message); process.exit(1); });
