// Ships the native app (android-native/) as the update to the Play listing
// com.micorlov.videopoker, in ONE edit: the signed AAB rolled out to production,
// the store text for every locale, and every locale's phone screenshots.
//
// Usage:
//   node scripts/play-native-release.js validate   # dry run, edit discarded
//   node scripts/play-native-release.js commit     # real upload + rollout
//   PLAY_TRACK=internal node scripts/play-native-release.js commit
//     The play-publisher service account may upload and release to testing tracks
//     but not to production: ship to internal, then promote it in the console.
//   PLAY_SKIP_LISTINGS=1 ...  # version update only: AAB + release notes, listings and screenshots untouched
//
// Build first:  source ~/keys/videopoker-upload.env && (cd android-native && ./gradlew bundleRelease)
// Auth: service account JSON at $PLAY_SERVICE_ACCOUNT, default ~/Downloads/play-service-account.json.

const fs = require('fs');
const path = require('path');
const { JWT } = require('google-auth-library');

const PKG = 'com.micorlov.videopoker';
const TRACK = process.env.PLAY_TRACK || 'production';
const SKIP_LISTINGS = process.env.PLAY_SKIP_LISTINGS === '1';
const ROOT = path.join(__dirname, '..');
const NATIVE = path.join(ROOT, 'android-native');
const AAB_PATH = path.join(NATIVE, 'app/build/outputs/bundle/release/app-release.aab');
const NOTES_PATH = path.join(NATIVE, 'store-assets/release-notes.json');
const SCREENSHOTS_DIR = path.join(NATIVE, 'store-assets/phone');
const LISTINGS_PATH = path.join(ROOT, 'play-store-assets/listings.json');
const API = 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications/' + PKG;
const UPLOAD_API = 'https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/' + PKG;
const KEY_FILE = process.env.PLAY_SERVICE_ACCOUNT
    || path.join(process.env.HOME, 'Downloads/play-service-account.json');

const SCREENSHOTS_PER_LOCALE = 6;
const LIMITS = { title: 30, shortDescription: 80, fullDescription: 4000 };
const NOTES_LIMIT = 500;

const mode = process.argv[2];
if (mode !== 'validate' && mode !== 'commit') {
    console.error('usage: node play-native-release.js validate|commit');
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
            console.warn(`  ${res.status} on ${method} ${url.slice(UPLOAD_API.length)} — retry ${attempt}`);
            await new Promise(r => setTimeout(r, 1500 * attempt));
            continue;
        }
        if (!res.ok) {
            throw new Error(`${method} ${url} -> ${res.status}: ${(await res.text()).slice(0, 500)}`);
        }
        return res.status === 204 ? null : res.json();
    }
}

function gradleVersion() {
    const gradle = fs.readFileSync(path.join(NATIVE, 'app/build.gradle.kts'), 'utf8');
    const code = gradle.match(/versionCode = (\d+)/);
    const name = gradle.match(/versionName = "([^"]+)"/);
    if (!code || !name) throw new Error('versionCode/versionName not found in build.gradle.kts');
    return { versionCode: Number(code[1]), versionName: name[1] };
}

// Everything is checked locally before Play is touched, so a bad asset never
// leaves a half-built edit behind.
function loadAssets() {
    const notes = JSON.parse(fs.readFileSync(NOTES_PATH, 'utf8'));
    const listings = SKIP_LISTINGS ? {} : JSON.parse(fs.readFileSync(LISTINGS_PATH, 'utf8'));

    for (const [lang, text] of Object.entries(notes)) {
        if (text.length > NOTES_LIMIT) throw new Error(`${lang}: release notes are ${text.length} chars, over ${NOTES_LIMIT}`);
    }
    for (const [lang, listing] of Object.entries(listings)) {
        for (const [field, cap] of Object.entries(LIMITS)) {
            const len = (listing[field] || '').length;
            if (!len || len > cap) throw new Error(`${lang}: ${field} is ${len} chars (cap ${cap})`);
        }
        if (!notes[lang]) throw new Error(`${lang}: no release notes`);
    }

    const screenshots = {};
    for (const lang of Object.keys(listings)) {
        const dir = path.join(SCREENSHOTS_DIR, lang);
        const files = fs.existsSync(dir)
            ? fs.readdirSync(dir).filter(f => f.endsWith('.png')).sort()
            : [];
        if (files.length !== SCREENSHOTS_PER_LOCALE) {
            throw new Error(`${lang}: expected ${SCREENSHOTS_PER_LOCALE} screenshots in ${dir}, found ${files.length}`);
        }
        screenshots[lang] = files.map(f => path.join(dir, f));
    }
    if (!fs.existsSync(AAB_PATH)) throw new Error('missing ' + AAB_PATH);
    return { notes, listings, screenshots };
}

async function replaceScreenshots(token, editId, lang, files) {
    await api(token, 'DELETE', `${API}/edits/${editId}/listings/${lang}/phoneScreenshots`);
    for (const file of files) {
        await api(token, 'POST',
            `${UPLOAD_API}/edits/${editId}/listings/${lang}/phoneScreenshots?uploadType=media`,
            fs.readFileSync(file), 'image/png');
    }
}

(async () => {
    const { versionCode, versionName } = gradleVersion();
    const { notes, listings, screenshots } = loadAssets();
    console.log(`local checks ok — ${versionName} (${versionCode}), ${Object.keys(notes).length} release-note locales, ${Object.keys(listings).length} listings`);

    const key = JSON.parse(fs.readFileSync(KEY_FILE, 'utf8'));
    const jwt = new JWT({
        email: key.client_email,
        key: key.private_key,
        scopes: ['https://www.googleapis.com/auth/androidpublisher']
    });
    const { token } = await jwt.getAccessToken();

    const edit = await api(token, 'POST', `${API}/edits`, '{}', 'application/json');
    console.log('edit', edit.id);
    try {
        const bundle = await api(token, 'POST',
            `${UPLOAD_API}/edits/${edit.id}/bundles?uploadType=media`,
            fs.readFileSync(AAB_PATH), 'application/octet-stream');
        if (bundle.versionCode !== versionCode) {
            throw new Error(`AAB is versionCode ${bundle.versionCode}, build.gradle.kts says ${versionCode}: rebuild`);
        }
        console.log('uploaded bundle, versionCode', bundle.versionCode);

        await api(token, 'PUT', `${API}/edits/${edit.id}/tracks/${TRACK}`, JSON.stringify({
            releases: [{
                name: versionName,
                versionCodes: [String(versionCode)],
                status: 'completed',
                releaseNotes: Object.entries(notes).map(([language, text]) => ({ language, text }))
            }]
        }), 'application/json');
        console.log('track', TRACK, '→', versionName);

        for (const [lang, listing] of Object.entries(listings)) {
            await api(token, 'PUT', `${API}/edits/${edit.id}/listings/${lang}`, JSON.stringify({
                language: lang,
                title: listing.title,
                shortDescription: listing.shortDescription,
                fullDescription: listing.fullDescription
            }), 'application/json');
            await replaceScreenshots(token, edit.id, lang, screenshots[lang]);
            console.log('  listing + screenshots:', lang);
        }

        if (mode === 'validate') {
            await api(token, 'POST', `${API}/edits/${edit.id}:validate`, '{}', 'application/json');
            await api(token, 'DELETE', `${API}/edits/${edit.id}`);
            console.log('VALIDATED ok — edit discarded, nothing published');
        } else {
            await api(token, 'POST', `${API}/edits/${edit.id}:commit`, '{}', 'application/json');
            console.log('COMMITTED — release submitted for review / rollout');
        }
    } catch (err) {
        await api(token, 'DELETE', `${API}/edits/${edit.id}`).catch(() => {});
        throw err;
    }
})().catch(err => { console.error(err.message || err); process.exit(1); });
