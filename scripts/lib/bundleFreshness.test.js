// Unit tests for the release pre-flight that refuses to upload an AAB whose
// web bundle is older than the sources. Run with `npm test`.
//
// The zip reader is injected, so no real AAB or `unzip` binary is needed.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { checkAabBundle, AAB_BUNDLE_ENTRY } = require('./bundleFreshness');

function tempFiles(builtHtml) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vp-bundle-'));
  const aab = path.join(dir, 'app-release.aab');
  const built = path.join(dir, 'video_poker.html');
  fs.writeFileSync(aab, 'zip bytes are never read directly');
  fs.writeFileSync(built, builtHtml);
  return { aab, built };
}

test('passes when the AAB ships exactly the freshly built bundle', () => {
  const { aab, built } = tempFiles('<html>v2.9</html>');
  const result = checkAabBundle(aab, built, () => Buffer.from('<html>v2.9</html>'));
  assert.deepStrictEqual(result, { ok: true });
});

test('fails when the AAB ships an older bundle than the sources build', () => {
  const { aab, built } = tempFiles('<html>v2.9 with rating card</html>');
  const result = checkAabBundle(aab, built, () => Buffer.from('<html>v2.6</html>'));
  assert.strictEqual(result.ok, false);
  assert.match(result.reason, /sync:android/);
});

test('reads the bundle from the base module public assets', () => {
  const { aab, built } = tempFiles('x');
  let requested = null;
  checkAabBundle(aab, built, (zip, entry) => { requested = entry; return Buffer.from('x'); });
  assert.strictEqual(requested, 'base/assets/public/video_poker.html');
  assert.strictEqual(AAB_BUNDLE_ENTRY, requested);
});

test('fails clearly when the AAB has no web bundle at all', () => {
  const { aab, built } = tempFiles('x');
  const result = checkAabBundle(aab, built, () => { throw new Error('filename not matched'); });
  assert.strictEqual(result.ok, false);
  assert.match(result.reason, /has no base\/assets\/public\/video_poker\.html/);
});

test('fails clearly when there is no AAB to check', () => {
  const { built } = tempFiles('x');
  const result = checkAabBundle('/nonexistent/app-release.aab', built, () => Buffer.from('x'));
  assert.strictEqual(result.ok, false);
  assert.match(result.reason, /no AAB at/);
});
