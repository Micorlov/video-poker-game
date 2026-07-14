// ===================== Game variants: Bonus Poker & Double Bonus (Phase 7.1) =====================
// Hand names + explanations for the bonus-quad subtypes, merged into the main
// translation packs. Must load before game.js (changeLanguage runs at its load).

    (function() {
        var packs = {
            en: { fa: 'Four Aces', f24: 'Four 2s-4s', f5k: 'Four 5s-Ks',
                  xfa: 'Four aces — the premium quad of Bonus Poker!',
                  xf24: 'Four of a kind, twos through fours — boosted payout!',
                  xf5k: 'Four of a kind, fives through kings.' },
            es: { fa: 'Cuatro Ases', f24: 'Cuatro 2-4', f5k: 'Cuatro 5-K',
                  xfa: '¡Cuatro ases — el póker premium del Bonus Poker!',
                  xf24: 'Póker de doses a cuatros — ¡pago aumentado!',
                  xf5k: 'Póker de cincos a reyes.' },
            fr: { fa: 'Quatre As', f24: 'Quatre 2-4', f5k: 'Quatre 5-K',
                  xfa: 'Quatre as — le carré premium du Bonus Poker !',
                  xf24: 'Carré de 2 à 4 — gain augmenté !',
                  xf5k: 'Carré de 5 à Roi.' },
            de: { fa: 'Vier Asse', f24: 'Vier 2-4', f5k: 'Vier 5-K',
                  xfa: 'Vier Asse — der Premium-Vierling im Bonus Poker!',
                  xf24: 'Vierling von Zwei bis Vier — erhöhte Auszahlung!',
                  xf5k: 'Vierling von Fünf bis König.' },
            he: { fa: 'ארבעה אסים', f24: 'רביעייה 2-4', f5k: 'רביעייה 5-K',
                  xfa: 'ארבעה אסים — הרביעייה המשתלמת ביותר!',
                  xf24: 'רביעייה של 2 עד 4 — תשלום מוגדל!',
                  xf5k: 'רביעייה של 5 עד מלך.' },
            ar: { fa: 'أربعة آصات', f24: 'رباعية 2-4', f5k: 'رباعية 5-K',
                  xfa: 'أربعة آصات — الرباعية الأعلى في بونص بوكر!',
                  xf24: 'رباعية من 2 إلى 4 — دفعة مضاعفة!',
                  xf5k: 'رباعية من 5 إلى الملك.' }
        };
        Object.keys(packs).forEach(function(lang) {
            if (!TRANSLATIONS[lang]) return;
            var p = packs[lang];
            TRANSLATIONS[lang].payouts['Four Aces'] = p.fa;
            TRANSLATIONS[lang].payouts['Four 2s-4s'] = p.f24;
            TRANSLATIONS[lang].payouts['Four 5s-Ks'] = p.f5k;
            TRANSLATIONS[lang].explanations['Four Aces'] = p.xfa;
            TRANSLATIONS[lang].explanations['Four 2s-4s'] = p.xf24;
            TRANSLATIONS[lang].explanations['Four 5s-Ks'] = p.xf5k;
        });
    })();

    Object.assign(ENGAGE_I18N.en, {
        variantLocked: 'Unlocks at level {n}',
        multiLocked: 'Multi-hand unlocks at level {n}'
    });
