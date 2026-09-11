// Pushes the store listing text (title, short and full description) for every
// locale in play-store-assets/listings.json to Google Play, in one edit.
//
// Usage:
//   node scripts/play-listing-upload.js validate   # dry run, edit discarded
//   node scripts/play-listing-upload.js commit     # real publish
//
// Auth: service account at ~/.config/mcp/google-play-service-account.json
// (same credential as scripts/play-release-upload.js).

const fs = require('fs');
const path = require('path');
const { JWT } = require('google-auth-library');

const PKG = 'com.micorlov.videopoker';
const LISTINGS_PATH = path.join(__dirname, '..', 'play-store-assets/listings.json');
const API = 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications/' + PKG;
const KEY_FILE = path.join(process.env.HOME, '.config/mcp/google-play-service-account.json');

const LIMITS = { title: 30, shortDescription: 80, fullDescription: 4000 };

const mode = process.argv[2];
if (mode !== 'validate' && mode !== 'commit') {
    console.error('usage: node play-listing-upload.js validate|commit');
    process.exit(1);
}

async function api(token, method, url, body) {
    for (let attempt = 1; attempt <= 3; attempt++) {
        const res = await fetch(url, {
            method,
            headers: {
                Authorization: 'Bearer ' + token,
                ...(body ? { 'Content-Type': 'application/json' } : {})
            },
            body
        });
        if (res.status >= 500 && attempt < 3) {
            console.warn(`  ${res.status} on ${method} — retry ${attempt}`);
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
    const listings = JSON.parse(fs.readFileSync(LISTINGS_PATH, 'utf8'));
    // Fail before touching Play if any field is over its cap.
    for (const [lang, l] of Object.entries(listings)) {
        for (const [field, cap] of Object.entries(LIMITS)) {
            const len = (l[field] || '').length;
            if (!len) throw new Error(`${lang}: ${field} is empty`);
            if (len > cap) throw new Error(`${lang}: ${field} is ${len} chars, over the ${cap} cap`);
        }
    }
    console.log(`${Object.keys(listings).length} locales validated locally`);

    const key = JSON.parse(fs.readFileSync(KEY_FILE, 'utf8'));
    const client = new JWT({
        email: key.client_email,
        key: key.private_key,
        scopes: ['https://www.googleapis.com/auth/androidpublisher']
    });
    const token = (await client.getAccessToken()).token;

    const edit = await api(token, 'POST', `${API}/edits`);
    console.log('edit', edit.id);

    for (const [lang, l] of Object.entries(listings)) {
        await api(token, 'PUT', `${API}/edits/${edit.id}/listings/${lang}`, JSON.stringify({
            language: lang,
            title: l.title,
            shortDescription: l.shortDescription,
            fullDescription: l.fullDescription
        }));
        console.log('  listing set:', lang);
    }

    if (mode === 'validate') {
        await api(token, 'POST', `${API}/edits/${edit.id}:validate`);
        await api(token, 'DELETE', `${API}/edits/${edit.id}`);
        console.log('VALIDATED ok — edit discarded, nothing published');
        return;
    }
    await api(token, 'POST', `${API}/edits/${edit.id}:commit`);
    console.log('COMMITTED — listings live');
})().catch(e => { console.error(e.message); process.exit(1); });
