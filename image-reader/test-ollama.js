const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const path = require('path');
const http = require('http');
const fs = require('fs');

// === Configuration ===
const PORT = 8765;
const BASE_URL = `http://localhost:${PORT}`;
const OLLAMA_BASE = 'http://localhost:11434';
const TEST_IMAGE = '/tmp/test-image-reader.png';
const VISUAL_WAIT = 5000; // ms to wait for visual rendering

let server;
let driver;

// === Simple HTTP server to serve the image-reader ===
function startServer() {
  return new Promise((resolve) => {
    const mimeTypes = { '.html': 'text/html', '.png': 'image/png', '.jpg': 'image/jpeg', '.js': 'application/javascript', '.css': 'text/css' };
    const root = path.resolve(__dirname);
    server = http.createServer((req, res) => {
      let filePath = path.join(root, req.url === '/' ? '/index.html' : req.url);
      const ext = path.extname(filePath);
      fs.readFile(filePath, (err, data) => {
        if (err) { res.writeHead(404); res.end('Not found'); return; }
        res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
        res.end(data);
      });
    }).listen(PORT, () => {
      console.log(`Test server running on ${BASE_URL}`);
      resolve();
    });
  });
}

function stopServer() {
  return new Promise((resolve) => {
    if (server) server.close(resolve);
    else resolve();
  });
}

// === Selenium test ===
async function runTest() {
  console.log('=== Image Reader + Ollama Selenium Test ===\n');

  // 1. Verify test image exists
  if (!fs.existsSync(TEST_IMAGE)) {
    console.error('FAIL: Test image not found at', TEST_IMAGE);
    process.exit(1);
  }
  console.log('✓ Test image exists');

  // 2. Start local server
  await startServer();
  console.log('✓ Test server started');

  // 3. Verify Ollama is running
  try {
    const ollamaRes = await fetch(`${OLLAMA_BASE}/api/tags`);
    const ollamaData = await ollamaRes.json();
    const visionModels = ollamaData.models
      .filter(m => ['llava', 'moondream', 'bakllava', 'llama3.2-vision', 'llama3.2-vision:90b'].includes(m.name))
      .map(m => m.name);
    console.log(`✓ Ollama running, vision models: ${visionModels.length > 0 ? visionModels.join(', ') : 'none (testing anyway)'}`);
  } catch (e) {
    console.error('FAIL: Ollama not running on', OLLAMA_BASE);
    await stopServer();
    process.exit(1);
  }

  // 4. Launch Chrome
  const opts = new chrome.Options();
  opts.addArguments('--headless=new', '--no-sandbox', '--disable-gpu');
  driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(opts)
    .build();

  try {
    // 5. Open the page
    await driver.get(BASE_URL);
    console.log('✓ Page loaded');

    // Wait for the page to render
    await driver.wait(until.elementLocated(By.id('providerSelect')), 5000);
    console.log('✓ Provider select found');

    // 6. Switch to Ollama provider
    const providerSelect = await driver.findElement(By.id('providerSelect'));
    await providerSelect.sendKeys('Ollama');
    console.log('✓ Switched to Ollama provider');

    // Small wait for switchProvider to execute
    await driver.sleep(500);

    // 7. Check models populated and select moondream
    const modelSelect = await driver.findElement(By.id('modelSelect'));
    const modelOptions = await modelSelect.findElements(By.tagName('option'));
    console.log(`✓ Model options: ${modelOptions.length} models available`);

    // Select moondream since it's the one we pulled
    await modelSelect.sendKeys('moondream');
    await driver.sleep(200);

    // 8. Upload the test image via file input
    const fileInput = await driver.findElement(By.id('fileInput'));
    await fileInput.sendKeys(TEST_IMAGE);
    await driver.sleep(500);

    // 9. Verify preview shows
    const preview = await driver.findElement(By.id('preview'));
    const previewClass = await preview.getAttribute('class');
    console.log(`✓ Preview visible: ${previewClass.includes('show')}`);

    // 10. Type a question
    const questionInput = await driver.findElement(By.id('question'));
    await questionInput.clear();
    await questionInput.sendKeys('What text is in this image?');
    console.log('✓ Question typed');

    // 11. Check if API key is required (should NOT be for Ollama)
    const apiKeyInput = await driver.findElement(By.id('apiKey'));
    const inputType = await apiKeyInput.getAttribute('type');
    console.log(`✓ API key field type: ${inputType} (expected: text for Ollama)`);

    // 12. Click Ask button
    const askBtn = await driver.findElement(By.id('askBtn'));
    await askBtn.click();
    console.log('✓ Ask button clicked');

    // 13. Wait for AI or error response (not just user message)
    await driver.wait(until.elementLocated(By.css('.role.ai, .role.error')), 120000);
    await driver.sleep(1000); // extra time for response text to fully render

    // 14. Get results
    const messages = await driver.findElements(By.className('msg'));
    console.log(`\n=== Results (${messages.length} messages) ===`);

    for (const msg of messages) {
      const roleEl = await msg.findElement(By.className('role'));
      const bodyEl = await msg.findElement(By.className('body'));
      const role = await roleEl.getText();
      const body = await bodyEl.getText();
      console.log(`\n[${role}]:`);
      console.log(body.substring(0, 500) + (body.length > 500 ? '...' : ''));
    }

    // Find the last AI response
    const lastMsg = messages[messages.length - 1];
    const lastRole = await (await lastMsg.findElement(By.className('role'))).getText();

    if (lastRole === 'Error') {
      const lastBody = await (await lastMsg.findElement(By.className('body'))).getText();
      console.error(`\n❌ TEST FAILED: ${lastBody}`);
      process.exitCode = 1;
    } else {
      console.log('\n✅ TEST PASSED: Ollama integration works!');
      process.exitCode = 0;
    }

  } catch (err) {
    console.error(`\n❌ TEST ERROR: ${err.message}`);
    process.exitCode = 1;
  } finally {
    if (driver) await driver.quit();
    await stopServer();
  }
}

runTest();
