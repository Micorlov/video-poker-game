// Local ASO quality gate. This never contacts Play Console or publishes data.
// Run with: node scripts/validate-aso.js

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const listingsPath = path.join(root, 'play-store-assets', 'listings.json');
const experimentsPath = path.join(root, 'play-store-assets', 'aso-experiments.json');
const captionsPath = path.join(root, 'scripts', 'store-screenshots', 'captions.json');
const limits = { title: 30, shortDescription: 80, fullDescription: 4000 };
const requiredTerms = ['video poker', 'jacks or better', 'deuces wild'];
const disclosureMarkers = {
    'ru-RU': ['реальные деньги'],
    'tr-TR': ['gerçek para'],
    'id': ['uang asli'],
    'hi-IN': ['असली पैसे'],
    'ja-JP': ['リアルマネー'],
    'ko-KR': ['실제 돈'],
    'iw-IL': ['כסף אמיתי'],
    'ar': ['مال حقيقي']
};
const errors = [];

function readJson(file) {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
}

const listings = readJson(listingsPath);
const experiments = readJson(experimentsPath);
const captions = readJson(captionsPath);

for (const [locale, listing] of Object.entries(listings)) {
    for (const [field, limit] of Object.entries(limits)) {
        const value = String(listing[field] || '');
        if (!value.trim()) errors.push(`${locale}: ${field} is empty`);
        if (value.length > limit) errors.push(`${locale}: ${field} is ${value.length}/${limit} characters`);
    }
    const searchableText = `${listing.title} ${listing.shortDescription} ${listing.fullDescription}`.toLowerCase();
    if (locale === 'en-US') {
        for (const term of requiredTerms) {
            if (!searchableText.includes(term)) errors.push(`${locale}: missing keyword phrase "${term}"`);
        }
    }
    const markers = disclosureMarkers[locale] || [];
    const hasDisclosure = markers.length
        ? markers.some(marker => searchableText.includes(marker.toLowerCase()))
        : /real money|真钱|dinero real|argent réel|echtes geld|denaro reale|dinheiro real|prawdziw/i.test(searchableText);
    if (!hasDisclosure) {
        errors.push(`${locale}: missing real-money entertainment disclosure`);
    }
}

const requiredAssets = [
    ['feature graphic', 'play-store-assets/feature_graphic.png'],
    ['512 icon', 'play-store-assets/icon_512.png'],
    ['phone screenshot 1', 'play-store-assets/phone/phone_1.png'],
    ['phone screenshot 2', 'play-store-assets/phone/phone_2.png'],
    ['phone screenshot 3', 'play-store-assets/phone/phone_3.png']
];
for (const [name, relative] of requiredAssets) {
    if (!fs.existsSync(path.join(root, relative))) errors.push(`missing ${name}: ${relative}`);
}

const shortVariants = experiments.experiments
    .filter(experiment => experiment.element === 'short_description')
    .flatMap(experiment => experiment.variants || []);
for (const variant of shortVariants) {
    if (variant.text.length > limits.shortDescription) {
        errors.push(`experiment ${variant.name}: short description is ${variant.text.length}/${limits.shortDescription} characters`);
    }
}

for (const [locale, slides] of Object.entries(captions)) {
    if (!Array.isArray(slides) || slides.length < 3) errors.push(`${locale}: fewer than 3 screenshot captions`);
}

if (errors.length) {
    console.error('ASO validation failed:');
    errors.forEach(error => console.error(`- ${error}`));
    process.exit(1);
}

console.log(`ASO validation passed: ${Object.keys(listings).length} listings, ${experiments.experiments.length} experiments, ${Object.keys(captions).length} caption locales.`);
