// Frames the native Android app's raw store captures with the same branded
// 9:16 marketing frame (frame.html) the web pipeline (run.js phase 2) uses.
//
// Input:  android-native/store-assets/raw/<lang>/s1.png ... s6.png
//         (1080x2400 emulator captures, one folder per app language)
//         android-native/store-assets/captions.json (6 captions per language)
// Output: android-native/store-assets/phone/<play-locale>/1.png ... 6.png (1080x1920)
//
// Usage: node scripts/store-screenshots/native-frame.js [lang ...]   (default: all)
// No local server needed: frame.html and the captures load over file://.

const { Builder } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const ASSETS = path.join(__dirname, '..', '..', 'android-native', 'store-assets');
const RAW = path.join(ASSETS, 'raw');
const PHONE = path.join(ASSETS, 'phone');
const CAPTIONS = JSON.parse(fs.readFileSync(path.join(ASSETS, 'captions.json'), 'utf8'));
const FRAME_URL = pathToFileURL(path.join(__dirname, 'frame.html')).href;
const RTL_LANGS = ['he', 'ar'];
const PLAY_LOCALE = {
    en: 'en-US', es: 'es-ES', 'pt-BR': 'pt-BR', de: 'de-DE', fr: 'fr-FR',
    it: 'it-IT', pl: 'pl-PL', ru: 'ru-RU', tr: 'tr-TR', id: 'id',
    hi: 'hi-IN', ja: 'ja-JP', ko: 'ko-KR', 'zh-CN': 'zh-CN',
    he: 'iw-IL', ar: 'ar'
};
const WIDTH = 1080;
const HEIGHT = 1920;
const SHOTS = 6;
const READY_POLLS = 80;
const POLL_MS = 100;
const HEADLINE_MAX_PX = 92;
// The kicker is one line of 34px caps; anything taller wrapped into the headline.
const KICKER_ONE_LINE_PX = 60;

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function makeDriver() {
    const opts = new chrome.Options().addArguments(
        '--headless=new', '--disable-gpu', '--hide-scrollbars',
        '--force-color-profile=srgb', '--allow-file-access-from-files',
        `--window-size=${WIDTH},${HEIGHT}`
    );
    return new Builder().forBrowser('chrome').setChromeOptions(opts).build();
}

// Headless Chrome's window includes some chrome; size the window so the CSS
// viewport (innerWidth/innerHeight) lands exactly on w x h.
async function setViewport(driver, w, h) {
    await driver.manage().window().setRect({ width: w, height: h });
    const [iw, ih] = await driver.executeScript('return [window.innerWidth, window.innerHeight]');
    if (iw !== w || ih !== h) {
        await driver.manage().window().setRect({ width: w + (w - iw), height: h + (h - ih) });
    }
}

async function renderFrame(driver, { img, cap, dir, out }) {
    const params = new URLSearchParams({
        img, kicker: cap.kicker, l1: cap.l1, l2: cap.l2,
        w: String(WIDTH), h: String(HEIGHT), dir
    });
    await driver.get(`${FRAME_URL}?${params}`);
    let ready = false;
    for (let tries = 0; tries < READY_POLLS && !ready; tries++) {
        ready = await driver.executeScript('return window.frameReady === true');
        if (!ready) await sleep(POLL_MS);
    }
    if (!ready) throw new Error(`frame never became ready for ${out}`);
    await sleep(200);
    const [px, kickerH, imgOk] = await driver.executeScript(`
        const img = document.getElementById('shot');
        return [window.headlineFontPx,
                document.getElementById('kicker').offsetHeight,
                img.complete && img.naturalWidth > 0];
    `);
    if (!imgOk) throw new Error(`capture failed to load: ${img}`);
    const notes = [];
    if (px && px < HEADLINE_MAX_PX) notes.push(`headline ${px}px`);
    if (kickerH > KICKER_ONE_LINE_PX) notes.push(`KICKER WRAPS (${kickerH}px)`);
    if (notes.length) console.log(`  ${path.relative(PHONE, out)}: ${notes.join(', ')} — ${cap.kicker} / ${cap.l1} / ${cap.l2}`);
    const b64 = await driver.takeScreenshot();
    fs.writeFileSync(out, Buffer.from(b64, 'base64'));
}

async function frameLanguage(driver, lang) {
    const caps = CAPTIONS[lang];
    if (!caps || caps.length !== SHOTS) throw new Error(`need ${SHOTS} captions for ${lang}`);
    const dir = RTL_LANGS.includes(lang) ? 'rtl' : 'ltr';
    const outDir = path.join(PHONE, PLAY_LOCALE[lang]);
    fs.mkdirSync(outDir, { recursive: true });
    for (let i = 0; i < SHOTS; i++) {
        const rawFile = path.join(RAW, lang, `s${i + 1}.png`);
        if (!fs.existsSync(rawFile)) throw new Error(`missing capture ${rawFile}`);
        await renderFrame(driver, {
            img: pathToFileURL(rawFile).href,
            cap: caps[i], dir,
            out: path.join(outDir, `${i + 1}.png`)
        });
    }
    console.log(`framed phone/${PLAY_LOCALE[lang]}`);
}

(async () => {
    const args = process.argv.slice(2);
    const langs = args.length ? args : Object.keys(CAPTIONS);
    for (const l of langs) {
        if (!PLAY_LOCALE[l] || !CAPTIONS[l]) { console.error(`unknown lang ${l}`); process.exit(1); }
    }
    const driver = await makeDriver();
    try {
        await setViewport(driver, WIDTH, HEIGHT);
        for (const lang of langs) await frameLanguage(driver, lang);
    } finally {
        await driver.quit();
    }
    console.log('done');
})().catch(err => { console.error(err); process.exit(1); });
