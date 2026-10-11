#!/usr/bin/env node
// Builds the native app's translations from the web app's dictionaries (js/lang/*.js).
//
//   node android-native/tools/gen-i18n.js
//
// For every <string> in values/strings.xml it finds the web key whose English text is the
// same (placeholders compared by position), or an explicit entry in tools/i18n-map.json
// ({ "native_name": "web.key" }), and writes values-<lang>/strings.xml for the 15 other
// languages. Native strings with no web counterpart are listed so they can be mapped or
// translated by hand. Output is deterministic.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..', '..');
const RES = path.join(__dirname, '..', 'app', 'src', 'main', 'res');
const LANG_DIR = path.join(ROOT, 'js', 'lang');
const MAP_FILE = path.join(__dirname, 'i18n-map.json');
const EXTRA_DIR = path.join(__dirname, 'i18n-extra'); // hand translations: <lang>.json { native_name: text }

// web code -> Android resource qualifier
const FOLDERS = {
    es: 'es', 'pt-BR': 'pt-rBR', de: 'de', fr: 'fr', it: 'it', pl: 'pl', ru: 'ru', tr: 'tr',
    id: 'id', hi: 'hi', ja: 'ja', ko: 'ko', 'zh-CN': 'zh-rCN', he: 'he', ar: 'ar',
};

function loadDict(code) {
    let dict = null;
    const sandbox = { vpRegisterLang: (c, d) => { dict = d; } };
    vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(path.join(LANG_DIR, code + '.js'), 'utf8'), sandbox);
    return dict;
}

const unxml = (s) => s.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\@/g, '@').replace(/\\\?/g, '?')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');

function parseNative() {
    const xml = fs.readFileSync(path.join(RES, 'values', 'strings.xml'), 'utf8');
    const out = [];
    const re = /<string\s+name="([^"]+)"([^>]*)>([\s\S]*?)<\/string>/g;
    let m;
    while ((m = re.exec(xml))) {
        if (/translatable="false"/.test(m[2])) continue;
        out.push({ name: m[1], raw: unxml(m[3]) });
    }
    return out;
}

// "{{a}} x {{b}}" -> placeholder order ['a','b']; native "%1$s x %2$d" -> specs by index.
const webOrder = (text) => { const seen = []; (text.match(/\{\{(\w+)\}\}/g) || []).forEach((p) => { const n = p.slice(2, -2); if (!seen.includes(n)) seen.push(n); }); return seen; };
const nativeSpecs = (raw) => { const specs = {}; (raw.match(/%(\d)\$([sd])/g) || []).forEach((p) => { specs[+p[1]] = p[3]; }); return specs; };
const normWeb = (text) => { const order = webOrder(text); return text.replace(/\{\{(\w+)\}\}/g, (_, n) => '{' + (order.indexOf(n) + 1) + '}'); };
const normNative = (raw) => raw.replace(/%(\d)\$[sd]/g, '{$1}').replace(/%%/g, '%');

const escapeXml = (s, hasArgs) => {
    let t = s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/\n/g, '\\n');
    if (/^[@?]/.test(t)) t = '\\' + t;
    if (hasArgs) t = t.replace(/%(?!\d\$[sd])/g, '%%');
    return t;
};

function translate(webText, webEn, specs) {
    const order = webOrder(webEn);
    return webText.replace(/\{\{(\w+)\}\}/g, (_, n) => {
        const idx = order.indexOf(n) + 1;
        return idx > 0 ? '%' + idx + '$' + (specs[idx] || 's') : '';
    });
}

const dicts = { en: loadDict('en') };
for (const code of Object.keys(FOLDERS)) dicts[code] = loadDict(code);
const explicit = fs.existsSync(MAP_FILE) ? JSON.parse(fs.readFileSync(MAP_FILE, 'utf8')) : {};

const byText = new Map();
for (const [key, value] of Object.entries(dicts.en)) {
    if (typeof value !== 'string' || /Html$/.test(key)) continue;
    const norm = normWeb(value);
    if (!byText.has(norm)) byText.set(norm, key);
}

const natives = parseNative();
const resolved = {};
const stripped = new Set(); // names whose web text starts with an emoji the native label drops
const unmatched = [];
for (const n of natives) {
    const mapped = explicit[n.name];
    const key = mapped ? mapped.replace(/^strip:/, '') : byText.get(normNative(n.raw));
    if (key && typeof dicts.en[key] === 'string') {
        resolved[n.name] = key;
        if (mapped && mapped.startsWith('strip:')) stripped.add(n.name);
    } else unmatched.push(n.name);
}

const stats = {};
for (const [code, folder] of Object.entries(FOLDERS)) {
    const extraFile = path.join(EXTRA_DIR, code + '.json');
    const extra = fs.existsSync(extraFile) ? JSON.parse(fs.readFileSync(extraFile, 'utf8')) : {};
    const lines = [];
    let count = 0;
    for (const n of natives) {
        let text = null;
        const key = resolved[n.name];
        if (key && typeof dicts[code][key] === 'string') {
            text = translate(dicts[code][key], dicts.en[key], nativeSpecs(n.raw));
            if (stripped.has(n.name)) text = text.replace(/^[^\p{L}\p{N}]+/u, '');
        } else if (typeof extra[n.name] === 'string') {
            text = extra[n.name];
        }
        if (text === null) continue;
        lines.push('    <string name="' + n.name + '">' + escapeXml(text, /%\d\$[sd]/.test(text)) + '</string>');
        count++;
    }
    // Arrays and plurals have no web counterpart: they come from the hand translations only.
    for (const [name, value] of Object.entries(extra)) {
        if (Array.isArray(value)) {
            lines.push('    <string-array name="' + name + '">\n' + value.map((v) => '        <item>' + escapeXml(v, false) + '</item>').join('\n') + '\n    </string-array>');
        } else if (value && typeof value === 'object') {
            lines.push('    <plurals name="' + name + '">\n' + Object.entries(value).map(([q, v]) => '        <item quantity="' + q + '">' + escapeXml(v, true) + '</item>').join('\n') + '\n    </plurals>');
        }
    }
    const dir = path.join(RES, 'values-' + folder);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'strings.xml'),
        '<?xml version="1.0" encoding="utf-8"?>\n<!-- Generated by tools/gen-i18n.js from js/lang/' + code + '.js — do not edit. -->\n<resources>\n' +
        lines.join('\n') + '\n</resources>\n');
    stats[code] = count;
}

console.log('native strings:', natives.length, ' matched to web keys:', Object.keys(resolved).length);
console.log('translated per language:', JSON.stringify(stats));
if (unmatched.length) console.log('UNMATCHED (' + unmatched.length + '):\n  ' + unmatched.join('\n  '));
