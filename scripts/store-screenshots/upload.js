// Uploads the framed store screenshots to Google Play via the Play Developer
// API, replacing each localized listing's phone screenshots (and the en-US
// tablet sets) in a single edit.
//
// Usage:
//   node scripts/store-screenshots/upload.js validate   # dry run, edit discarded
//   node scripts/store-screenshots/upload.js commit     # real upload
//
// Auth: service account at ~/.config/mcp/google-play-service-account.json
// (same credential the google-play MCP uses; has upload+commit permission).

const fs = require('fs');
const path = require('path');
const { JWT } = require('google-auth-library');

const PKG = 'com.micorlov.videopoker';
const API = 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications/' + PKG;
const UPLOAD_API = 'https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/' + PKG;
const KEY_FILE = path.join(process.env.HOME, '.config/mcp/google-play-service-account.json');
const FRAMED = path.join(__dirname, 'out', 'framed');

const mode = process.argv[2];
if (mode !== 'validate' && mode !== 'commit') {
    console.error('usage: node upload.js validate|commit');
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
            throw new Error(`${method} ${url} -> ${res.status}: ${(await res.text()).slice(0, 300)}`);
        }
        return res.status === 204 ? null : res.json();
    }
}

(async () => {
    const key = JSON.parse(fs.readFileSync(KEY_FILE, 'utf8'));
    const jwt = new JWT({
        email: key.client_email,
        key: key.private_key,
        scopes: ['https://www.googleapis.com/auth/androidpublisher']
    });
    const { token } = await jwt.getAccessToken();

    const edit = await api(token, 'POST', `${API}/edits`, '{}', 'application/json');
    console.log('edit', edit.id);

    const jobs = [];
    for (const locale of fs.readdirSync(path.join(FRAMED, 'phone')).sort()) {
        jobs.push({ locale, imageType: 'phoneScreenshots', dir: path.join(FRAMED, 'phone', locale) });
    }
    jobs.push({ locale: 'en-US', imageType: 'sevenInchScreenshots', dir: path.join(FRAMED, 'tablet7') });
    jobs.push({ locale: 'en-US', imageType: 'tenInchScreenshots', dir: path.join(FRAMED, 'tablet10') });

    for (const job of jobs) {
        const files = fs.readdirSync(job.dir).filter(f => f.endsWith('.png')).sort();
        await api(token, 'DELETE', `${API}/edits/${edit.id}/listings/${job.locale}/${job.imageType}`);
        for (const f of files) {
            await api(token, 'POST',
                `${UPLOAD_API}/edits/${edit.id}/listings/${job.locale}/${job.imageType}?uploadType=media`,
                fs.readFileSync(path.join(job.dir, f)), 'image/png');
        }
        console.log(`${job.locale} ${job.imageType}: ${files.length} uploaded`);
    }

    if (mode === 'validate') {
        await api(token, 'POST', `${API}/edits/${edit.id}:validate`, '{}', 'application/json');
        await api(token, 'DELETE', `${API}/edits/${edit.id}`);
        console.log('VALIDATED ok — edit discarded, nothing published');
    } else {
        await api(token, 'POST', `${API}/edits/${edit.id}:commit`, '{}', 'application/json');
        console.log('COMMITTED — graphics submitted for review');
    }
})().catch(err => { console.error(err.message || err); process.exit(1); });
