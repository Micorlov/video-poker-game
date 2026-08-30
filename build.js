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
    'styles/onboarding.css'
];

let combinedCss = '';
cssFiles.forEach(file => {
    combinedCss += `\n/* --- ${file} --- */\n` + fs.readFileSync(path.join(projectDir, file), 'utf8') + '\n';
});

// Combine JS files in dependency order
const jsFiles = [
    'js/audio.js',
    'js/ui.js',
    'js/progress.js',
    'js/firebase.js',
    'js/deeplink.js',
    'js/push.js',
    'js/presence.js',
    'js/friends.js',
    'js/referral.js',
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
    'js/tabs.js',
    'js/pwa.js'
];

let combinedJs = '';
jsFiles.forEach(file => {
    combinedJs += `\n/* --- ${file} --- */\n` + fs.readFileSync(path.join(projectDir, file), 'utf8') + '\n';
});

// Replace placeholders
indexHtml = indexHtml.replace('<!-- BUILD_CSS_PLACEHOLDER -->', combinedCss);
indexHtml = indexHtml.replace('<!-- BUILD_JS_PLACEHOLDER -->', combinedJs);

fs.writeFileSync(outputPath, indexHtml, 'utf8');
console.log('🎉 Successfully built video_poker.html!');

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
    const rootFiles = ['manifest.json', 'icon.svg', 'sw.js'];
    rootFiles.forEach(function(file) {
        const src = path.join(projectDir, file);
        if (fs.existsSync(src)) {
            fs.copyFileSync(src, path.join(wwwDir, file));
        }
    });
    console.log('📱 Copied to www/ for Android app');
}
