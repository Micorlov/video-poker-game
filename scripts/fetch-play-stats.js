// Fetches app stats from the Play Console API and writes docs/stats.json.
// Used by the GitHub Actions deploy-share workflow.
//
// Required env var (CI):    PLAY_SERVICE_ACCOUNT_JSON  (JSON string of the service account key)
// Required env var (local): falls back to ~/.config/mcp/google-play-service-account.json
//
// Output: docs/stats.json  { version, installs, rating, updatedAt }

const fs   = require('fs');
const path = require('path');
const { JWT } = require('google-auth-library');

const PKG    = 'com.micorlov.videopoker';
const API    = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PKG}`;
const OUT    = path.join(__dirname, '..', 'docs', 'stats.json');
const SCOPES = ['https://www.googleapis.com/auth/androidpublisher'];

async function getToken() {
  let key;
  if (process.env.PLAY_SERVICE_ACCOUNT_JSON) {
    key = JSON.parse(process.env.PLAY_SERVICE_ACCOUNT_JSON);
  } else {
    const keyPath = path.join(process.env.HOME, '.config/mcp/google-play-service-account.json');
    key = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
  }
  const jwt = new JWT({ email: key.client_email, key: key.private_key, scopes: SCOPES });
  const { token } = await jwt.getAccessToken();
  return token;
}

async function apiFetch(token, url) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

async function main() {
  // Sensible fallback values shown until real data is available
  const stats = {
    version:   '2.4',
    installs:  '10+',
    rating:    null,
    updatedAt: new Date().toISOString(),
  };

  try {
    const token = await getToken();

    // Version name from the production track's latest completed release
    const tracksData = await apiFetch(token, `${API}/tracks/production`);
    const releases   = (tracksData.releases || []);
    const latest     = releases.find(r => r.status === 'completed') || releases[0];
    if (latest?.name) stats.version = latest.name;

    // Rating approximated from the most-recent 100 public reviews
    const reviewsData = await apiFetch(token, `${API}/reviews?maxResults=100&translationLanguage=en`);
    const reviews     = reviewsData.reviews || [];
    if (reviews.length > 0) {
      const stars = reviews
        .flatMap(r => (r.comments || []).filter(c => c.userComment).map(c => c.userComment.starRating || 0))
        .filter(s => s > 0);
      if (stars.length > 0) {
        stats.rating = (stars.reduce((a, b) => a + b, 0) / stars.length).toFixed(1);
      }
      // Rough install tier from review count (Play does not expose installs via this API)
      stats.installs = reviews.length >= 50 ? '500+' : reviews.length >= 10 ? '100+' : '10+';
    }
  } catch (err) {
    console.warn('⚠  Could not fetch live stats from Play Console:', err.message);
    console.warn('   Writing fallback stats.');
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(stats, null, 2));
  console.log('✓ docs/stats.json written:', stats);
}

main().catch(e => { console.error(e); process.exit(1); });
