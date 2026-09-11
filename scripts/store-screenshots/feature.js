// Renders scripts/store-screenshots/feature.html (1024x500 Play Store feature
// graphic) with the same headless Chrome the screenshot pipeline uses and
// overwrites play-store-assets/feature_graphic.png.
//
// Usage: node scripts/store-screenshots/feature.js
// Requires: python3 -m http.server 8642 serving the repo root.

const { Builder } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:8642';
const WIDTH = 1024;
const HEIGHT = 500;
const OUT = path.join(__dirname, '..', '..', 'play-store-assets', 'feature_graphic.png');
const READY_POLLS = 50;
const POLL_MS = 100;

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function makeDriver() {
    const opts = new chrome.Options().addArguments(
        '--headless=new', '--disable-gpu', '--hide-scrollbars',
        '--force-color-profile=srgb', `--window-size=${WIDTH},${HEIGHT + 200}`
    );
    return new Builder().forBrowser('chrome').setChromeOptions(opts).build();
}

// Headless Chrome's window includes ~140px of chrome; size the window so the
// CSS viewport (innerWidth/innerHeight) lands exactly on WIDTH x HEIGHT.
async function setViewport(driver, w, h) {
    await driver.manage().window().setRect({ width: w, height: h });
    const [iw, ih] = await driver.executeScript('return [window.innerWidth, window.innerHeight]');
    if (iw !== w || ih !== h) {
        await driver.manage().window().setRect({ width: w + (w - iw), height: h + (h - ih) });
    }
}

(async () => {
    const driver = await makeDriver();
    try {
        await setViewport(driver, WIDTH, HEIGHT);
        await driver.get(`${BASE}/scripts/store-screenshots/feature.html`);
        let ready = false;
        for (let i = 0; i < READY_POLLS && !ready; i++) {
            ready = await driver.executeScript('return window.frameReady === true');
            if (!ready) await sleep(POLL_MS);
        }
        if (!ready) throw new Error('feature.html never signalled frameReady (fonts?)');
        await sleep(300);
        const b64 = await driver.takeScreenshot();
        fs.mkdirSync(path.dirname(OUT), { recursive: true });
        fs.writeFileSync(OUT, Buffer.from(b64, 'base64'));
        console.log(`wrote ${OUT}`);
    } finally {
        await driver.quit();
    }
})().catch(err => { console.error(err); process.exit(1); });
