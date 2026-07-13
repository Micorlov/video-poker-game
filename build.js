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
    'styles/animations.css',
    'styles/leaderboard.css',
    'styles/mobile.css'
];

let combinedCss = '';
cssFiles.forEach(file => {
    combinedCss += `\n/* --- ${file} --- */\n` + fs.readFileSync(path.join(projectDir, file), 'utf8') + '\n';
});

// Combine JS files in dependency order
const jsFiles = [
    'js/i18n.js',
    'js/audio.js',
    'js/firebase.js',
    'js/rooms.js',
    'js/competitions.js',
    'js/challenges.js',
    'js/achievements.js',
    'js/rewards.js',
    'js/ui.js',
    'js/game.js'
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
