// i18n engine — automatic device-language detection with a manual override.
//
// Loads FIRST in build.js's jsFiles array: every other module calls t() at
// render time, so the engine has to exist before any of them are parsed.
// The dictionaries live in js/lang/*.js and register themselves into
// LANG_DICTS immediately after this file. Nothing here runs against the DOM
// at parse time — boot happens on DOMContentLoaded, by which point every
// js/lang/*.js has registered.
//
// All 14 languages are left-to-right; there is deliberately no dir handling.

const SUPPORTED_LANGS = [
    'en', 'es', 'pt-BR', 'de', 'fr', 'it', 'pl',
    'ru', 'tr', 'id', 'hi', 'ja', 'ko', 'zh-CN'
];

// Each language's name in its own script — a picker that says "German" is
// useless to the person who needs to find "Deutsch".
const LANG_NATIVE_NAMES = {
    'en': 'English',
    'es': 'Español',
    'pt-BR': 'Português (Brasil)',
    'de': 'Deutsch',
    'fr': 'Français',
    'it': 'Italiano',
    'pl': 'Polski',
    'ru': 'Русский',
    'tr': 'Türkçe',
    'id': 'Bahasa Indonesia',
    'hi': 'हिन्दी',
    'ja': '日本語',
    'ko': '한국어',
    'zh-CN': '简体中文'
};

// Base tag → shipped variant, for locales we cover but don't tag exactly.
// pt-PT gets pt-BR rather than English; every Chinese variant gets zh-CN.
const LANG_BASE_ALIASES = {
    'pt': 'pt-BR',
    'zh': 'zh-CN',
    'in': 'id'   // legacy ISO code some Android builds still report
};

const LANG_STORAGE_KEY = 'vp_lang';
const DEFAULT_LANG = 'en';

const LANG_DICTS = {};
let currentLang = DEFAULT_LANG;

// Called by each js/lang/*.js at the bottom of the file.
function vpRegisterLang(code, dict) {
    LANG_DICTS[code] = dict;
}

// ── Detection ──

// Resolve one BCP-47 tag ('pt-PT', 'zh-Hans-CN', 'en_GB') to a shipped code.
function resolveLangTag(tag) {
    if (!tag) return null;
    const norm = String(tag).replace(/_/g, '-');
    // Exact, case-insensitively: 'pt-br' → 'pt-BR'
    const exact = SUPPORTED_LANGS.find(function(l) {
        return l.toLowerCase() === norm.toLowerCase();
    });
    if (exact) return exact;

    const base = norm.split('-')[0].toLowerCase();
    if (LANG_BASE_ALIASES[base] && SUPPORTED_LANGS.indexOf(LANG_BASE_ALIASES[base]) !== -1) {
        return LANG_BASE_ALIASES[base];
    }
    // Bare base tag we ship as-is: 'de-AT' → 'de', 'en-GB' → 'en'
    if (SUPPORTED_LANGS.indexOf(base) !== -1) return base;
    return null;
}

// A stored choice always wins; otherwise walk the device's preference list in
// order and take the first language we ship. Falls back to English.
function detectLanguage() {
    try {
        const stored = localStorage.getItem(LANG_STORAGE_KEY);
        if (stored && SUPPORTED_LANGS.indexOf(stored) !== -1) return stored;
    } catch (e) {}

    try {
        const tags = (navigator.languages && navigator.languages.length)
            ? navigator.languages
            : [navigator.language];
        for (let i = 0; i < tags.length; i++) {
            const resolved = resolveLangTag(tags[i]);
            if (resolved) return resolved;
        }
    } catch (e) {}

    return DEFAULT_LANG;
}

// True until the user picks a language by hand — lets callers tell an
// auto-detected language apart from a deliberate choice.
function languageWasAutoDetected() {
    try { return localStorage.getItem(LANG_STORAGE_KEY) === null; } catch (e) { return true; }
}

// ── Lookup ──

// Never throws, never renders a raw key to the user: missing keys fall back to
// English, and a key missing from English too yields '' rather than 'play.foo'.
function t(key, vars) {
    const dict = LANG_DICTS[currentLang] || LANG_DICTS[DEFAULT_LANG] || {};
    const fallback = LANG_DICTS[DEFAULT_LANG] || {};
    let str = Object.prototype.hasOwnProperty.call(dict, key)
        ? dict[key]
        : (Object.prototype.hasOwnProperty.call(fallback, key) ? fallback[key] : '');

    if (vars) {
        Object.keys(vars).forEach(function(k) {
            str = str.split('{{' + k + '}}').join(vars[k]);
        });
    }
    return str;
}

// Plural-aware lookup for the few strings that cannot be reworded to a
// count-neutral form. Expects sibling keys 'base.one', 'base.other', plus
// 'base.few'/'base.many' for Russian and Polish.
function tPlural(baseKey, count, vars) {
    let form = 'other';
    try {
        form = new Intl.PluralRules(currentLang).select(count);
    } catch (e) {}
    const merged = Object.assign({ count: formatNumber(count) }, vars || {});
    const specific = t(baseKey + '.' + form, merged);
    return specific || t(baseKey + '.other', merged);
}

// ── Number formatting ──

// Chip counts follow the *app* language, not the device: a German UI on an
// en-US phone must render 1.000, not 1,000. Every call site that used a bare
// .toLocaleString() goes through here.
function formatNumber(n) {
    const num = Number(n);
    if (!isFinite(num)) return String(n);
    try {
        return num.toLocaleString(currentLang);
    } catch (e) {
        return num.toLocaleString();
    }
}

// Signed variant for leaderboard deltas: '+1,200' / '-340' / '+0'.
function formatSigned(n) {
    const num = Number(n) || 0;
    return (num >= 0 ? '+' : '-') + formatNumber(Math.abs(num));
}

// ── Hand names ──

// Internal hand-type strings are object keys in js/game.js (EXPLANATIONS,
// TICKER_LABELS, HAND_ORDERS, HAND_RANK), comparison values in js/hints.js,
// and stored Firestore field values. They stay English forever — only the
// *display* is translated, via this suffix map.
const HAND_I18N_SUFFIX = {
    'Royal Flush': 'royalFlush',
    'Straight Flush': 'straightFlush',
    'Four of a Kind': 'fourOfKind',
    'Four Aces': 'fourAces',
    'Four 2s-4s': 'four2s4s',
    'Four 5s-Ks': 'four5sKs',
    'Four Deuces': 'fourDeuces',
    'Wild Royal Flush': 'wildRoyalFlush',
    'Five of a Kind': 'fiveOfKind',
    'Full House': 'fullHouse',
    'Flush': 'flush',
    'Straight': 'straight',
    'Three of a Kind': 'threeOfKind',
    'Two Pair': 'twoPair',
    'Jacks or Better': 'jacksOrBetter',
    'Nothing': 'nothing'
};

function vpHandLabel(handType) {
    const suffix = HAND_I18N_SUFFIX[handType];
    return suffix ? (t('hand.' + suffix) || handType) : handType;
}

function vpHandExplanation(handType) {
    const suffix = HAND_I18N_SUFFIX[handType];
    return suffix ? t('exp.' + suffix) : '';
}

function vpHandTicker(handType) {
    const suffix = HAND_I18N_SUFFIX[handType];
    return suffix ? (t('ticker.' + suffix) || handType) : handType;
}

// ── DOM translation ──

const I18N_ATTR_TARGETS = [
    ['data-i18n-placeholder', 'placeholder'],
    ['data-i18n-title', 'title'],
    ['data-i18n-aria-label', 'aria-label']
];

function translateDom(root) {
    const scope = root || document;

    scope.querySelectorAll('[data-i18n]').forEach(function(el) {
        const value = t(el.getAttribute('data-i18n'));
        if (value) el.textContent = value;
    });

    // Sentences that carry inline decoration (<strong>, <span>). The markup
    // comes from our own dictionaries, never from user input, so innerHTML is
    // no wider an injection surface than index.html itself.
    scope.querySelectorAll('[data-i18n-html]').forEach(function(el) {
        const value = t(el.getAttribute('data-i18n-html'));
        if (value) el.innerHTML = value;
    });

    I18N_ATTR_TARGETS.forEach(function(pair) {
        scope.querySelectorAll('[' + pair[0] + ']').forEach(function(el) {
            const value = t(el.getAttribute(pair[0]));
            if (value) el.setAttribute(pair[1], value);
        });
    });
}

// ── Language change ──

// Modules that render their own DOM register a re-render here, so switching
// language updates already-painted content without a page reload (a reload
// mid-hand would lose the deal).
const I18N_REFRESHERS = [];
function vpOnLanguageChange(fn) {
    if (typeof fn === 'function') I18N_REFRESHERS.push(fn);
}

function getLanguage() {
    return currentLang;
}

function applyLanguage(lang, opts) {
    currentLang = (SUPPORTED_LANGS.indexOf(lang) !== -1) ? lang : DEFAULT_LANG;
    document.documentElement.lang = currentLang;
    document.title = t('app.title') || 'Video Poker';

    translateDom(document);
    updateLanguagePickerUI();

    I18N_REFRESHERS.forEach(function(fn) {
        // One broken renderer must not abort the rest of the switch and leave
        // the UI half-translated.
        try { fn(); } catch (e) {}
    });

    if (!opts || !opts.silent) {
        try { localStorage.setItem(LANG_STORAGE_KEY, currentLang); } catch (e) {}
        if (window.setUserLanguage) {
            // Persists to the user's Firestore doc so server-sent push copy can
            // match the in-app language. No-op while signed out.
            try { setUserLanguage(currentLang); } catch (e) {}
        }
    }
}

function vpSetLanguage(lang) {
    applyLanguage(lang);
    if (window.logVpEvent) logVpEvent('language_set', { lang: lang });
    if (window.closeSheet) closeSheet('language-sheet');
}

// ── Picker UI ──

function updateLanguagePickerUI() {
    document.querySelectorAll('[data-lang]').forEach(function(el) {
        el.classList.toggle('selected', el.getAttribute('data-lang') === currentLang);
    });
    document.querySelectorAll('[data-lang-current]').forEach(function(el) {
        el.textContent = LANG_NATIVE_NAMES[currentLang] || currentLang;
    });
}

// The rows are identical for both entry points (onboarding chip and Settings
// row), so they are generated once rather than hand-written 14 times.
function renderLanguageOptions() {
    const list = document.getElementById('language-list');
    if (!list) return;
    list.innerHTML = '';
    SUPPORTED_LANGS.forEach(function(code) {
        const btn = document.createElement('button');
        btn.className = 'language-option' + (code === currentLang ? ' selected' : '');
        btn.setAttribute('data-lang', code);
        btn.setAttribute('lang', code);

        const name = document.createElement('span');
        name.className = 'language-option-name';
        name.textContent = LANG_NATIVE_NAMES[code] || code;

        const check = document.createElement('span');
        check.className = 'language-option-check';
        check.textContent = '✓';

        btn.appendChild(name);
        btn.appendChild(check);
        btn.onclick = function() { vpSetLanguage(code); };
        list.appendChild(btn);
    });
}

function openLanguageSheet() {
    renderLanguageOptions();
    if (window.openSheet) openSheet('language-sheet');
}

// ── Boot ──

currentLang = detectLanguage();

document.addEventListener('DOMContentLoaded', function() {
    // silent: an auto-detected language must not be written to storage, or
    // languageWasAutoDetected() can never tell a guess from a real choice.
    applyLanguage(currentLang, { silent: true });
    renderLanguageOptions();
});

window.t = t;
window.tPlural = tPlural;
window.formatNumber = formatNumber;
window.formatSigned = formatSigned;
window.getLanguage = getLanguage;
window.detectLanguage = detectLanguage;
window.languageWasAutoDetected = languageWasAutoDetected;
window.vpRegisterLang = vpRegisterLang;
window.vpSetLanguage = vpSetLanguage;
window.vpOnLanguageChange = vpOnLanguageChange;
window.vpTranslateDom = translateDom;
window.vpHandLabel = vpHandLabel;
window.vpHandExplanation = vpHandExplanation;
window.vpHandTicker = vpHandTicker;
window.openLanguageSheet = openLanguageSheet;
window.SUPPORTED_LANGS = SUPPORTED_LANGS;
window.LANG_NATIVE_NAMES = LANG_NATIVE_NAMES;
