'use strict';

// Tests for the i18n layer.
//
// The important one is keySets: with 14 dictionaries, the only thing that keeps
// them honest as copy changes is an automated parity check. A missing key does
// not throw at runtime — it silently falls back to English — so nothing else
// would catch the drift.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..', '..');
const I18N_JS = path.join(ROOT, 'js', 'i18n.js');
const LANG_DIR = path.join(ROOT, 'js', 'lang');

// js/i18n.js is a browser-global script that touches the DOM at boot. These
// stubs absorb that so the lookup logic can run under node:test.
function makeSandbox(navigatorLanguages, storedLang) {
    const store = new Map();
    if (storedLang !== undefined) store.set('vp_lang', storedLang);

    const noopEl = {
        classList: { toggle() {}, add() {}, remove() {} },
        textContent: '',
        innerHTML: '',
        setAttribute() {},
        getAttribute: () => null,
        appendChild() {}
    };

    const sandbox = {
        console,
        Math,
        JSON,
        Object,
        Number,
        String,
        Array,
        Intl,
        isFinite,
        localStorage: {
            getItem: (k) => (store.has(k) ? store.get(k) : null),
            setItem: (k, v) => store.set(k, String(v)),
            removeItem: (k) => store.delete(k)
        },
        navigator: { languages: navigatorLanguages, language: navigatorLanguages[0] },
        document: {
            // lang/dir are asserted on, so this element holds real values.
            documentElement: Object.assign({}, noopEl, { lang: '', dir: '' }),
            title: '',
            getElementById: () => null,
            querySelectorAll: () => [],
            addEventListener() {}
        }
    };
    sandbox.window = sandbox;
    return sandbox;
}

// Loads the engine plus every js/lang/*.js into one shared scope, exactly the
// way build.js concatenates them into a single <script>.
function loadI18n({ languages = ['en-US'], stored, langs } = {}) {
    const sandbox = makeSandbox(languages, stored);
    const context = vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(I18N_JS, 'utf8'), context, { filename: 'i18n.js' });

    const files = (langs || fs.readdirSync(LANG_DIR).filter((f) => f.endsWith('.js')));
    files.forEach((f) => {
        vm.runInContext(fs.readFileSync(path.join(LANG_DIR, f), 'utf8'), context, { filename: f });
    });
    return { sandbox, context };
}

function langFiles() {
    return fs.readdirSync(LANG_DIR).filter((f) => f.endsWith('.js'));
}

function dictFor(context, code) {
    return vm.runInContext(`LANG_DICTS[${JSON.stringify(code)}]`, context);
}

test('every shipped language has a dictionary file', () => {
    const { sandbox, context } = loadI18n();
    // Array.from: SUPPORTED_LANGS is built inside the VM context, so its
    // prototype differs from the host's and deepStrictEqual would reject it
    // even when the contents match.
    const supported = Array.from(sandbox.SUPPORTED_LANGS);
    const missing = supported.filter((code) => !dictFor(context, code));
    assert.deepStrictEqual(missing, [], `no js/lang/*.js registered for: ${missing.join(', ')}`);
});

test('every dictionary has exactly the English key set', () => {
    const { sandbox, context } = loadI18n();
    const enKeys = Object.keys(dictFor(context, 'en')).sort();

    Array.from(sandbox.SUPPORTED_LANGS).filter((c) => c !== 'en').forEach((code) => {
        const dict = dictFor(context, code);
        if (!dict) return; // covered by the previous test
        const keys = Object.keys(dict).sort();
        const missing = enKeys.filter((k) => !keys.includes(k));
        const extra = keys.filter((k) => !enKeys.includes(k));
        assert.deepStrictEqual(missing, [], `${code} is missing: ${missing.join(', ')}`);
        assert.deepStrictEqual(extra, [], `${code} has keys English lacks: ${extra.join(', ')}`);
    });
});

test('every dictionary keeps the same {{placeholders}} as English', () => {
    const { sandbox, context } = loadI18n();
    const en = dictFor(context, 'en');
    const placeholders = (s) => (String(s).match(/\{\{\w+\}\}/g) || []).sort();

    Array.from(sandbox.SUPPORTED_LANGS).filter((c) => c !== 'en').forEach((code) => {
        const dict = dictFor(context, code);
        if (!dict) return;
        Object.keys(en).forEach((key) => {
            if (!(key in dict)) return;
            assert.deepStrictEqual(
                placeholders(dict[key]), placeholders(en[key]),
                `${code} "${key}" placeholder mismatch: ${dict[key]}`
            );
        });
    });
});

test('detectLanguage folds regional tags onto shipped languages', () => {
    const cases = [
        [['pt-PT'], 'pt-BR'],       // no pt-PT build; Brazilian is closer than English
        [['pt-BR'], 'pt-BR'],
        [['en-GB'], 'en'],
        [['de-AT'], 'de'],
        [['zh-Hans-CN'], 'zh-CN'],
        [['zh-TW'], 'zh-CN'],
        [['es-419'], 'es'],
        [['fr_CA'], 'fr'],          // underscore form some WebViews report
        [['cy', 'ja-JP'], 'ja'],    // first unsupported tag is skipped, not fatal
        [['he-IL'], 'he'],
        [['iw'], 'he'],             // Android still reports the pre-1989 code
        [['iw-IL'], 'he'],
        [['ar-EG'], 'ar'],
        [['ar'], 'ar'],
        [['xx-YY'], 'en']           // nothing recognised
    ];
    cases.forEach(([languages, expected]) => {
        const { sandbox } = loadI18n({ languages });
        assert.strictEqual(sandbox.detectLanguage(), expected, `${languages.join(',')} → ${expected}`);
    });
});

test('a stored choice beats the device language', () => {
    const { sandbox } = loadI18n({ languages: ['ja-JP'], stored: 'fr' });
    assert.strictEqual(sandbox.detectLanguage(), 'fr');
});

test('a stored language we no longer ship falls back to detection', () => {
    // 'sv' is deliberately not in SUPPORTED_LANGS — a stale value left in
    // storage by an older build must not pin the UI to a missing dictionary.
    const { sandbox } = loadI18n({ languages: ['de-DE'], stored: 'sv' });
    assert.strictEqual(sandbox.detectLanguage(), 'de');
});

test('t() interpolates, falls back to English, and never leaks a raw key', () => {
    const { sandbox } = loadI18n({ languages: ['en-US'] });
    const { t } = sandbox;

    assert.strictEqual(t('nav.play'), 'Play');
    assert.match(t('play.winResult', { hand: 'Flush', win: '250' }), /Flush.*250/);

    // Repeated placeholder is substituted everywhere it appears.
    assert.strictEqual(t('common.rankLeadsBy', { rank: 2, name: 'Ana', gap: 10 }),
        '#2 · Ana leads by 10');

    // A key missing everywhere renders as empty, never as 'some.missing.key' —
    // a raw dotted key on screen is worse than a blank label.
    assert.strictEqual(t('some.missing.key'), '');
    assert.ok(!t('some.missing.key').includes('some.missing'));
});

test('t() falls back to English for a key a translation is missing', () => {
    const { sandbox, context } = loadI18n({ languages: ['en-US'] });
    vm.runInContext("vpRegisterLang('de', { 'nav.play': 'Spielen' });", context);
    sandbox.vpSetLanguage('de');

    assert.strictEqual(sandbox.t('nav.play'), 'Spielen');
    assert.strictEqual(sandbox.t('nav.stats'), 'Stats', 'untranslated key should fall back to English');
});

test('hand names translate for display while the English key stays intact', () => {
    const { sandbox } = loadI18n({ languages: ['es-ES'] });
    sandbox.vpSetLanguage('es');

    // Display is Spanish...
    assert.strictEqual(sandbox.vpHandLabel('Royal Flush'), 'Escalera real');
    assert.ok(sandbox.vpHandExplanation('Royal Flush').length > 0);
    // ...but an unmapped type is passed through rather than blanked.
    assert.strictEqual(sandbox.vpHandLabel('Not A Hand'), 'Not A Hand');
});

test('numbers follow the app language, not the device', () => {
    const { sandbox } = loadI18n({ languages: ['en-US'] });

    assert.strictEqual(sandbox.formatNumber(1234567), '1,234,567');
    sandbox.vpSetLanguage('de');
    assert.strictEqual(sandbox.formatNumber(1234567), '1.234.567',
        'German UI on an en-US device must group with dots');

    sandbox.vpSetLanguage('en');
    assert.strictEqual(sandbox.formatSigned(-340), '-340');
    assert.strictEqual(sandbox.formatSigned(1200), '+1,200');
    assert.strictEqual(sandbox.formatNumber('not a number'), 'not a number');
});

test('language files register exactly the code named by their filename', () => {
    const { context } = loadI18n();
    langFiles().forEach((file) => {
        const code = file.replace(/\.js$/, '');
        assert.ok(dictFor(context, code), `${file} should call vpRegisterLang('${code}', ...)`);
    });
});

test('Hebrew and Arabic are right-to-left, every other language is not', () => {
    const { sandbox } = loadI18n({ languages: ['en-US'] });

    sandbox.vpSetLanguage('he');
    assert.strictEqual(sandbox.isRtl(), true);
    sandbox.vpSetLanguage('ar');
    assert.strictEqual(sandbox.isRtl(), true);

    Array.from(sandbox.SUPPORTED_LANGS)
        .filter((c) => c !== 'he' && c !== 'ar')
        .forEach((code) => {
            sandbox.vpSetLanguage(code);
            assert.strictEqual(sandbox.isRtl(), false, `${code} should be left-to-right`);
        });
});

test('applyLanguage sets dir on <html> in both directions', () => {
    const { sandbox } = loadI18n({ languages: ['en-US'] });
    const html = sandbox.document.documentElement;

    sandbox.vpSetLanguage('he');
    assert.strictEqual(html.dir, 'rtl');
    assert.strictEqual(html.lang, 'he');

    // Switching back must clear it, or the layout stays mirrored in English.
    sandbox.vpSetLanguage('en');
    assert.strictEqual(html.dir, 'ltr');
    assert.strictEqual(html.lang, 'en');
});
