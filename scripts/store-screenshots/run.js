// Localized Play Store screenshot pipeline.
//
// Phase 1 (capture): boots the web app at http://localhost:8642 in headless
// Chrome (360x760 CSS @ 3x = 1080x2280 raw PNGs), forces each supported
// language via localStorage.vp_lang, seeds a level-21 player so Deuces Wild
// and Five Play are unlocked, stages six scenes with the app's own global
// functions, and screenshots them to out/raw/<lang>/s<N>.png.
//
// Phase 2 (compose): renders frame.html (branded 9:16 marketing frame) around
// each raw capture at phone (1080x1920) size for every language, plus
// tablet7 (1200x2133) and tablet10 (1440x2560) sizes for English, writing
// out/framed/<set>/... .
//
// Usage: node scripts/store-screenshots/run.js [lang ...]   (default: all)
// Requires: python3 -m http.server 8642 serving the repo root.
// The feature graphic is a separate step: node scripts/store-screenshots/feature.js

const { Builder } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:8642';
const CAPTIONS = require('./captions.json');
const RTL_LANGS = ['he', 'ar'];
const ALL_LANGS = Object.keys(CAPTIONS);
const PLAY_LOCALE = {
    en: 'en-US', es: 'es-ES', 'pt-BR': 'pt-BR', de: 'de-DE', fr: 'fr-FR',
    it: 'it-IT', pl: 'pl-PL', ru: 'ru-RU', tr: 'tr-TR', id: 'id',
    hi: 'hi-IN', ja: 'ja-JP', ko: 'ko-KR', 'zh-CN': 'zh-CN',
    he: 'iw-IL', ar: 'ar'
};
const OUT = path.join(__dirname, 'out');
const RAW = path.join(OUT, 'raw');
const FRAMED = path.join(OUT, 'framed');

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Card literals for deterministic hands (suit chars match js/game.js SUITS).
const HAND_NEUTRAL = "[{rank:'7',suit:'\\u2665'},{rank:'9',suit:'\\u2666'},{rank:'Q',suit:'\\u2660'},{rank:'A',suit:'\\u2665'},{rank:'10',suit:'\\u2666'}]";
const HAND_STRAIGHT = "[{rank:'9',suit:'\\u2666'},{rank:'Q',suit:'\\u2660'},{rank:'K',suit:'\\u2666'},{rank:'J',suit:'\\u2663'},{rank:'10',suit:'\\u2660'}]";
// Deuces Wild: four 2s dealt straight — hold all, draw, Four Deuces (200x).
const HAND_FOUR_DEUCES = "[{rank:'2',suit:'\\u2660'},{rank:'2',suit:'\\u2665'},{rank:'A',suit:'\\u2660'},{rank:'2',suit:'\\u2666'},{rank:'2',suit:'\\u2663'}]";
// Five Play: three Kings held, so every one of the five hands pays at least trips.
const HAND_TRIP_KINGS = "[{rank:'K',suit:'\\u2660'},{rank:'K',suit:'\\u2665'},{rank:'K',suit:'\\u2666'},{rank:'7',suit:'\\u2663'},{rank:'4',suit:'\\u2666'}]";

// Lifetime hands seeded before load: level = 1 + floor(hands / 5), so 100
// hands = level 21, which unlocks every variant (Deuces at 3, Double Bonus
// at 15) and Triple/Five Play (level 10).
const SEED_LIFETIME_HANDS = '100';

const RESET_UI = `
    window.logVpEvent = function(){};
    window.maybeShowSigninPrompt = function(){};
    window.maybeOfferBigWinShare = function(){};
    document.querySelectorAll('.sheet-backdrop').forEach(e => e.classList.add('hidden'));
    document.querySelectorAll('.toast').forEach(e => e.remove());
    document.body.classList.remove('screen-shake');
    document.querySelectorAll('.flash-overlay, .confetti-burst-piece, .gold-rain-piece').forEach(e => e.remove());
`;

// Put the play screen into a known variant / hand count before dealing.
// setGameVariant/setMultiHand only act while gameState === 'bet'.
function prepPlay(variant, hands) {
    return `
        showScreen('play');
        document.querySelectorAll('#nearby-panel, #champions-panel').forEach(e => e.style.display = 'none');
        gameState = 'bet';
        held = [false, false, false, false, false];
        setGameVariant('${variant}');
        setMultiHand(${hands});
        balance = 1000;
        // Wins in earlier scenes leave a streak pill and a best-hand story
        // avatar behind; clear both so every shot starts clean.
        winStreak = 0;
        updateStreakUI(false);
        document.getElementById('stories-row').style.display = 'none';
    `;
}

// Deterministic side-hand draws for the Five Play scene: swap the game's
// Math.random shuffle for a seeded LCG so every locale gets the same hands.
const SEEDED_SHUFFLE = `
    (function() {
        let seed = 20260909;
        shuffle = function(d) {
            for (let i = d.length - 1; i > 0; i--) {
                seed = (seed * 1103515245 + 12345) % 2147483648;
                const j = seed % (i + 1);
                [d[i], d[j]] = [d[j], d[i]];
            }
        };
    })();
`;

const SCENES = [
    { // 1: hook — Jacks or Better gameplay, pre-draw hold state
        stage: RESET_UI + prepPlay('jacks', 1) + `
            deal();
            hand = ${HAND_NEUTRAL};
            dealtHand = hand.slice();
            renderHand();
            window.scrollTo(0, 0);
        `,
        settle: 2000
    },
    { // 2: Deuces Wild — Four Deuces win
        stage: RESET_UI + prepPlay('deuces', 1) + `
            deal();
            hand = ${HAND_FOUR_DEUCES};
            dealtHand = hand.slice();
            renderHand();
            held = [true, true, true, true, true];
            draw();
        `,
        after: RESET_UI + `window.scrollTo(0, 0);`,
        settle: 2200
    },
    { // 3: Five Play — hold trip Kings, draw five hands
        stage: RESET_UI + SEEDED_SHUFFLE + prepPlay('jacks', 5) + `
            deal();
            hand = ${HAND_TRIP_KINGS};
            dealtHand = hand.slice();
            renderHand();
            held = [true, true, true, false, false];
            draw();
        `,
        after: RESET_UI + `
            // The sticky bet dock would cover the main hand + result under
            // four extra rows; let it flow so all five hands are on screen.
            document.querySelector('.bet-dock').style.position = 'static';
            window.scrollTo(0, 0);
        `,
        settle: 2200
    },
    { // 4: straight win with held badges + result
        stage: RESET_UI + prepPlay('jacks', 1) + `
            deal();
            hand = ${HAND_STRAIGHT};
            dealtHand = hand.slice();
            renderHand();
            held = [true, true, true, true, true];
            draw();
        `,
        after: RESET_UI + `window.scrollTo(0, 0);`,
        settle: 2000
    },
    { // 5: global daily leaderboard panel under a fresh hand
        stage: RESET_UI + prepPlay('jacks', 1) + `
            deal();
            hand = ${HAND_NEUTRAL};
            dealtHand = hand.slice();
            renderHand();
            // The unified panel is native-gated and the daily board is guest-gated;
            // fake both so the bot-merged daily list renders.
            window.egUser = window.egUser || { uid: 'store-shot', displayName: 'M' };
            const p = document.getElementById('leaderboard-panel');
            p.classList.remove('hidden');
            p.style.display = 'block';
            setLeaderboardTab('daily', true);
            document.querySelectorAll('.social-signin-prompt').forEach(e => e.style.display = 'none');
        `,
        after: `
            document.getElementById('leaderboard-panel').scrollIntoView({ block: 'center' });
        `,
        settle: 2000
    },
    { // 6: settings + language sheet
        stage: RESET_UI + `
            showScreen('settings');
            openLanguageSheet();
            window.scrollTo(0, 0);
        `,
        settle: 900
    }
];
const SHOTS = SCENES.length;

async function makeDriver(args) {
    const opts = new chrome.Options().addArguments(
        '--headless=new', '--disable-gpu', '--hide-scrollbars',
        '--force-color-profile=srgb', ...args
    );
    return new Builder().forBrowser('chrome').setChromeOptions(opts).build();
}

async function shoot(driver, file) {
    const b64 = await driver.takeScreenshot();
    fs.writeFileSync(file, Buffer.from(b64, 'base64'));
}

// Headless Chrome's window includes ~140px of chrome; size the window so the
// CSS viewport (innerWidth/innerHeight) lands exactly on w x h.
async function setViewport(driver, w, h) {
    await driver.manage().window().setRect({ width: w, height: h });
    const [iw, ih] = await driver.executeScript('return [window.innerWidth, window.innerHeight]');
    if (iw !== w || ih !== h) {
        await driver.manage().window().setRect({ width: w + (w - iw), height: h + (h - ih) });
    }
}

async function capture(langs) {
    const driver = await makeDriver(['--window-size=600,900']);
    try {
        // Emulate a 360x760 phone viewport at 3x — screenshots come out 1080x2280.
        await driver.sendAndGetDevToolsCommand('Emulation.setDeviceMetricsOverride', {
            width: 360, height: 760, deviceScaleFactor: 3, mobile: true
        });
        for (const lang of langs) {
            const dir = path.join(RAW, lang);
            fs.mkdirSync(dir, { recursive: true });
            await driver.get(BASE + '/video_poker.html');
            await driver.executeScript(`
                localStorage.clear();
                localStorage.setItem('vp_lang', arguments[0]);
                localStorage.setItem('vp_onboarding_seen', '1');
                localStorage.setItem('vp_push_permission_asked', '1');
                localStorage.setItem('vp_lifetime_hands', arguments[1]);
            `, lang, SEED_LIFETIME_HANDS);
            await driver.get(BASE + '/video_poker.html');
            await sleep(3500); // firebase init, fonts, i18n apply, bot boards
            for (let i = 0; i < SCENES.length; i++) {
                const s = SCENES[i];
                await driver.executeScript(s.stage);
                await sleep(s.settle);
                if (s.after) { await driver.executeScript(s.after); await sleep(400); }
                await shoot(driver, path.join(dir, `s${i + 1}.png`));
            }
            console.log(`captured ${lang}`);
        }
    } finally {
        await driver.quit();
    }
}

async function renderFrame(driver, { img, cap, dir, w, h, out }) {
    const params = new URLSearchParams({
        img, kicker: cap.kicker, l1: cap.l1, l2: cap.l2,
        w: String(w), h: String(h), dir
    });
    await setViewport(driver, w, h);
    await driver.get(`${BASE}/scripts/store-screenshots/frame.html?${params}`);
    for (let tries = 0; tries < 50; tries++) {
        if (await driver.executeScript('return window.frameReady === true')) break;
        await sleep(100);
    }
    await sleep(200);
    const px = await driver.executeScript('return window.headlineFontPx');
    if (px && px < 92) console.log(`  headline shrunk to ${px}px for ${path.basename(out)} (${cap.l1} / ${cap.l2})`);
    await shoot(driver, out);
}

async function compose(langs) {
    const driver = await makeDriver(['--window-size=1080,1920']);
    try {
        for (const lang of langs) {
            const caps = CAPTIONS[lang];
            const dir = RTL_LANGS.includes(lang) ? 'rtl' : 'ltr';
            const outDir = path.join(FRAMED, 'phone', PLAY_LOCALE[lang]);
            fs.mkdirSync(outDir, { recursive: true });
            for (let i = 0; i < SHOTS; i++) {
                await renderFrame(driver, {
                    img: `/scripts/store-screenshots/out/raw/${lang}/s${i + 1}.png`,
                    cap: caps[i], dir, w: 1080, h: 1920,
                    out: path.join(outDir, `phone_${i + 1}.png`)
                });
            }
            console.log(`framed phone/${PLAY_LOCALE[lang]}`);
        }
        // Tablet sets (English only; localized listings fall back to these).
        if (langs.includes('en')) {
            for (const [set, w, h] of [['tablet7', 1200, 2133], ['tablet10', 1440, 2560]]) {
                const outDir = path.join(FRAMED, set);
                fs.mkdirSync(outDir, { recursive: true });
                for (let i = 0; i < SHOTS; i++) {
                    await renderFrame(driver, {
                        img: `/scripts/store-screenshots/out/raw/en/s${i + 1}.png`,
                        cap: CAPTIONS.en[i], dir: 'ltr', w, h,
                        out: path.join(outDir, `${set}_${i + 1}.png`)
                    });
                }
                console.log(`framed ${set}`);
            }
        }
    } finally {
        await driver.quit();
    }
}

(async () => {
    const langs = process.argv.slice(2).length ? process.argv.slice(2) : ALL_LANGS;
    for (const l of langs) {
        if (!CAPTIONS[l]) { console.error(`unknown lang ${l}`); process.exit(1); }
    }
    if (!process.env.SKIP_CAPTURE) await capture(langs);
    await compose(langs);
    console.log('done');
})().catch(err => { console.error(err); process.exit(1); });
