const fs = require('fs');
const path = require('path');

const projectDir = __dirname;
const templatePath = path.join(projectDir, 'index.html');
const outputPath = path.join(projectDir, 'video_poker.html');

if (!fs.existsSync(templatePath)) {
    console.error('index.html template not found!');
    process.exit(1);
}

let indexHtml = fs.readFileSync(templatePath, 'utf8');

// Combine CSS files
const cssFiles = [
    'styles/tokens.css',
    'styles/layout.css',
    'styles/cards.css',
    'styles/social.css',
    'styles/animations.css',
    'styles/onboarding.css',
    // Last: RTL overrides must win specificity ties with the rules above.
    'styles/rtl.css'
];

let combinedCss = '';
cssFiles.forEach(file => {
    combinedCss += `\n/* --- ${file} --- */\n` + fs.readFileSync(path.join(projectDir, file), 'utf8') + '\n';
});

// Guard against the drift that hid new users from the admin dashboard: the
// bundle's VP_APP_VERSION and the Android versionName must agree. This used to
// only warn, and a warning scrolls past unread in a release build.
const analyticsSrc = fs.readFileSync(path.join(projectDir, 'js/analytics.js'), 'utf8');
const gradlePath = path.join(projectDir, 'android/app/build.gradle');
const bundleVersion = (analyticsSrc.match(/const VP_APP_VERSION = '([^']+)'/) || [])[1];
if (fs.existsSync(gradlePath)) {
    const gradleVersion = (fs.readFileSync(gradlePath, 'utf8').match(/versionName "([^"]+)"/) || [])[1];
    if (bundleVersion && gradleVersion && bundleVersion !== gradleVersion) {
        console.error(`❌ version drift: js/analytics.js says ${bundleVersion}, android/app/build.gradle says ${gradleVersion}`);
        process.exit(1);
    }
}

// Diagnostics go in their own <script> ahead of the main bundle, so a bundle
// that fails to parse or throws during boot is still reported. ES5 only.
const earlyJsFiles = [
    'js/telemetry.js',
    'js/errors.js',
    'js/installs.js'
];
let earlyJs = `\nvar VP_BUILD_VERSION = ${JSON.stringify(bundleVersion || 'unknown')};\n`;
earlyJsFiles.forEach(file => {
    earlyJs += `\n/* --- ${file} --- */\n` + fs.readFileSync(path.join(projectDir, file), 'utf8') + '\n';
});

// Combine JS files in dependency order
const jsFiles = [
    // i18n first: every module below calls t() at render time.
    'js/i18n.js',
    'js/lang/en.js',
    'js/lang/es.js',
    'js/lang/pt-BR.js',
    'js/lang/de.js',
    'js/lang/fr.js',
    'js/lang/it.js',
    'js/lang/pl.js',
    'js/lang/ru.js',
    'js/lang/tr.js',
    'js/lang/id.js',
    'js/lang/hi.js',
    'js/lang/ja.js',
    'js/lang/ko.js',
    'js/lang/zh-CN.js',
    'js/lang/he.js',
    'js/lang/ar.js',
    'js/audio.js',
    'js/analytics.js',
    'js/ui.js',
    'js/progress.js',
    'js/review.js',
    // Pure engine modules — no DOM, no game state — loaded early so anything
    // below (game.js, leaderboard-bots.js, duel-play.js) can rely on them.
    'js/prng.js',
    'js/hand-eval.js',
    'js/duel-deck.js',
    'js/firebase.js',
    'js/deeplink.js',
    'js/push.js',
    'js/presence.js',
    'js/friends.js',
    'js/referral.js',
    'js/daily-bonus.js',
    'js/cloudsave.js',
    'js/coin-gift.js',
    'js/rooms.js',
    'js/stories.js',
    'js/leaderboard-bots.js',
    'js/champions.js',
    'js/bracelets.js',
    'js/leaderboards.js',
    'js/invite.js',
    'js/game.js',
    'js/hints.js',
    'js/onboarding.js',
    'js/signin-prompt.js',
    'js/tabs.js',
    'js/pwa.js'
];

let combinedJs = '';
jsFiles.forEach(file => {
    combinedJs += `\n/* --- ${file} --- */\n` + fs.readFileSync(path.join(projectDir, file), 'utf8') + '\n';
});

// Replace placeholders. A function replacement, because a string one would
// expand `$&`-style patterns that occur in the bundled code.
const placeholders = {
    '<!-- BUILD_CSS_PLACEHOLDER -->': combinedCss,
    '<!-- BUILD_EARLY_JS_PLACEHOLDER -->': earlyJs,
    '<!-- BUILD_JS_PLACEHOLDER -->': combinedJs
};
Object.keys(placeholders).forEach(marker => {
    if (!indexHtml.includes(marker)) {
        console.error(`❌ index.html is missing ${marker}`);
        process.exit(1);
    }
    indexHtml = indexHtml.replace(marker, () => placeholders[marker]);
});

fs.writeFileSync(outputPath, indexHtml, 'utf8');
console.log('🎉 Successfully built video_poker.html!');

// build-info.json travels with the deploy so the admin panel can report which
// build it is actually serving, instead of trusting a constant that has to be
// remembered and edited by hand.
const { execSync } = require('child_process');
function gitOut(cmd, fallback) {
    try { return execSync(cmd, { cwd: projectDir, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); }
    catch (e) { return fallback; }
}
const commit = process.env.GITHUB_SHA || gitOut('git rev-parse HEAD', '');
const buildInfo = {
    version: bundleVersion || 'unknown',
    // Increments on its own with every Actions run, so a redeploy of the same
    // version is still distinguishable in the panel.
    build: process.env.GITHUB_RUN_NUMBER || gitOut('git rev-list --count HEAD', '0'),
    commit: commit,
    shortCommit: commit ? commit.slice(0, 7) : '',
    branch: process.env.GITHUB_REF_NAME || gitOut('git rev-parse --abbrev-ref HEAD', ''),
    builtAt: new Date().toISOString()
};
fs.writeFileSync(path.join(projectDir, 'build-info.json'), JSON.stringify(buildInfo, null, 2) + '\n', 'utf8');
console.log(`🏷️  build-info.json: v${buildInfo.version} build ${buildInfo.build} (${buildInfo.shortCommit})`);

// Copy to Capacitor www/ directory for Android app
const wwwDir = path.join(projectDir, 'www');
if (fs.existsSync(wwwDir)) {
    // Copy built HTML
    fs.copyFileSync(outputPath, path.join(wwwDir, 'video_poker.html'));
    // Copy assets
    const dirsToCopy = ['media', 'styles', 'js'];
    dirsToCopy.forEach(function(dir) {
        const src = path.join(projectDir, dir);
        const dst = path.join(wwwDir, dir);
        if (fs.existsSync(src)) {
            fs.cpSync(src, dst, { recursive: true });
        }
    });
    // Copy root files
    const rootFiles = ['manifest.json', 'icon.svg', 'sw.js', 'build-info.json'];
    rootFiles.forEach(function(file) {
        const src = path.join(projectDir, file);
        if (fs.existsSync(src)) {
            fs.copyFileSync(src, path.join(wwwDir, file));
        }
    });
    console.log('📱 Copied to www/ for Android app');
}
