// Global error catcher to display runtime errors on screen
        window.addEventListener('error', function(e) {
            const errDiv = document.createElement('div');
            errDiv.style.position = 'fixed';
            errDiv.style.top = '0';
            errDiv.style.left = '0';
            errDiv.style.right = '0';
            errDiv.style.background = '#ff4d4d';
            errDiv.style.color = '#fff';
            errDiv.style.padding = '15px';
            errDiv.style.zIndex = '99999';
            errDiv.style.fontSize = '14px';
            errDiv.style.fontFamily = 'monospace';
            errDiv.style.whiteSpace = 'pre-wrap';
            errDiv.textContent = 'Error: ' + e.message + '\nSource: ' + e.filename + ':' + e.lineno + '\nStack: ' + (e.error ? e.error.stack : 'No stack');
            document.body.appendChild(errDiv);
        });
        window.addEventListener('unhandledrejection', function(e) {
            const errDiv = document.createElement('div');
            errDiv.style.position = 'fixed';
            errDiv.style.top = '0';
            errDiv.style.left = '0';
            errDiv.style.right = '0';
            errDiv.style.background = '#ff9900';
            errDiv.style.color = '#fff';
            errDiv.style.padding = '15px';
            errDiv.style.zIndex = '99999';
            errDiv.style.fontSize = '14px';
            errDiv.style.fontFamily = 'monospace';
            errDiv.style.whiteSpace = 'pre-wrap';
            errDiv.textContent = 'Promise Rejection: ' + e.reason;
            document.body.appendChild(errDiv);
        });

        // Parse and store URL parameters in sessionStorage so they survive redirects
        (function() {
            var params = new URLSearchParams(location.search);
            var ref = params.get('ref');
            if (ref) {
                try {
                    sessionStorage.setItem('vp_referred_by_code', ref.trim().toUpperCase());
                } catch (e) {}
            }
            var room = params.get('room');
            if (room) {
                try {
                    sessionStorage.setItem('vp_pending_room_code', room.trim().toUpperCase());
                } catch (e) {}
            }
            if (ref || room) {
                history.replaceState(null, '', location.pathname);
            }
        })();

        // Language translations

const TRANSLATIONS = {
            en: {
                dir: 'ltr',
                title: 'Video Poker - Jacks or Better',
                gameTitle: 'Video Poker',
                payouts: {
                    'Royal Flush': 'Royal Flush',
                    'Straight Flush': 'Straight Flush',
                    'Four of a Kind': 'Four of a Kind',
                    'Full House': 'Full House',
                    'Flush': 'Flush',
                    'Straight': 'Straight',
                    'Three of a Kind': 'Three of a Kind',
                    'Two Pair': 'Two Pair',
                    'Jacks or Better': 'Jacks or Better',
                    'Nothing': 'Nothing'
                },
                balanceLabel: 'Balance:',
                heldBadge: 'HELD',
                hourlyTitle: 'Hourly Competition',
                dailyTitle: 'Daily Competition',
                hourlyTab: 'Hourly',
                dailyTab: 'Daily',
                hourlyRankLabel: 'Hourly Rank',
                dailyRankLabel: 'Daily Rank',
                formulaTitle: 'How is score calculated?',
                hourlyFormula: 'Score = Balance - (100 × Rebuys) - 100<br><span style="opacity:0.7">(This equals your exact Net Profit/Loss)</span>',
                winLabels: {
                    pair: 'Pair of',
                    threeOfKind: '3 of a Kind',
                    fourOfKind: '4 of a Kind',
                    straight: 'Straight',
                    flush: 'Flush',
                    fullHouse: 'Full House',
                    straightFlush: 'Str. Flush',
                    royalFlush: 'Royal Flush'
                },
                betLabel: 'Bet:',
                creditsLabel: 'credits',
                chooseBetLabel: 'Choose Bet:',
                dealBtn: 'Deal',
                drawBtn: 'Draw',
                howToPlay: 'How to Play:',
                rulesTitle: 'Winning Hands & Rules:',
                instructions: [
                    'Click cards to HOLD/UNHOLD them (highlighted in gold)',
                    'Choose your bet (1-5 credits) before dealing',
                    'Click "Deal" to start a new hand',
                    'Click "Draw" to replace unheld cards',
                    'Jacks or Better: pair of J, Q, K, A wins'
                ],
                explanations: {
                    'Royal Flush': 'A♠ K♠ Q♠ J♠ 10♠ - The highest hand! All same suit, 10 through Ace.',
                    'Straight Flush': 'Five consecutive cards, all the same suit!',
                    'Four of a Kind': 'Four cards of the same rank - that\'s crazy luck!',
                    'Full House': 'Three of a kind plus a pair - a full house!',
                    'Flush': 'All five cards the same suit, but not in sequence.',
                    'Straight': 'Five consecutive cards of mixed suits.',
                    'Three of a Kind': 'Three cards of the same rank.',
                    'Two Pair': 'Two different pairs in one hand.',
                    'Jacks or Better': 'A pair of Jacks, Queens, Kings, or Aces wins!',
                    'Nothing': 'Better luck next hand!'
                },
                insufficientBalance: 'Insufficient balance!',
                statWon: 'Won',
                statLost: 'Lost',
                statNet: 'Net',
                statHands: 'Hands'
            },
            es: {
                dir: 'ltr',
                title: 'Video Póker - Jotas o Mejor',
                gameTitle: 'Video Póker',
                payouts: {
                    'Royal Flush': 'Escalera Real',
                    'Straight Flush': 'Escalera de Color',
                    'Four of a Kind': 'Póker',
                    'Full House': 'Full',
                    'Flush': 'Color',
                    'Straight': 'Escalera',
                    'Three of a Kind': 'Trío',
                    'Two Pair': 'Doble Pareja',
                    'Jacks or Better': 'Jotas o Mejor',
                    'Nothing': 'Nada'
                },
                balanceLabel: 'Saldo:',
                heldBadge: 'MANTENER',
                hourlyTitle: 'Competición Horaria',
                dailyTitle: 'Competición Diaria',
                hourlyTab: 'Por Hora',
                dailyTab: 'Diario',
                hourlyRankLabel: 'Rango Horario',
                dailyRankLabel: 'Rango Diario',
                formulaTitle: '¿Cómo se calcula la puntuación?',
                hourlyFormula: 'Puntuación = Saldo - (100 × Recompras) - 100<br><span style="opacity:0.7">(Esto equivale a tu beneficio/pérdida neta exacta)</span>',
                winLabels: {
                    pair: 'Pareja de',
                    threeOfKind: 'Trío',
                    fourOfKind: 'Póker',
                    straight: 'Escalera',
                    flush: 'Color',
                    fullHouse: 'Full House',
                    straightFlush: 'Escalera Color',
                    royalFlush: 'Escalera Real'
                },
                betLabel: 'Apuesta:',
                creditsLabel: 'créditos',
                chooseBetLabel: 'Elige Apuesta:',
                dealBtn: 'Repartir',
                drawBtn: 'Cambiar',
                howToPlay: 'Cómo Jugar:',
                rulesTitle: 'Manos Ganadoras y Reglas:',
                instructions: [
                    'Haz clic en las cartas para MANTENER/SOLTAR (resaltadas en dorado)',
                    'Elige tu apuesta (1-5 créditos) antes de repartir',
                    'Haz clic en "Repartir" para iniciar una nueva mano',
                    'Haz clic en "Cambiar" para reemplazar cartas no mantenidas',
                    'Jotas o Mejor: pareja de J, Q, K, A gana'
                ],
                explanations: {
                    'Royal Flush': 'A♠ K♠ Q♠ J♠ 10♠ - ¡La mejor mano! Todas del mismo palo, 10 a As.',
                    'Straight Flush': '¡Cinco cartas consecutivas, todas del mismo palo!',
                    'Four of a Kind': 'Cuatro cartas del mismo rango - ¡una locura de suerte!',
                    'Full House': 'Trío más una pareja - ¡un full!',
                    'Flush': 'Las cinco cartas del mismo palo, pero no en secuencia.',
                    'Straight': 'Cinco cartas consecutivas de palos mezclados.',
                    'Three of a Kind': 'Tres cartas del mismo rango.',
                    'Two Pair': 'Dos parejas diferentes en una mano.',
                    'Jacks or Better': '¡Una pareja de Jotas, Reinas, Reyes o Ases gana!',
                    'Nothing': '¡Mejor suerte la próxima mano!'
                },
                insufficientBalance: '¡Saldo insuficiente!',
                statWon: 'Ganado',
                statLost: 'Perdido',
                statNet: 'Neto',
                statHands: 'Manos'
            },
            fr: {
                dir: 'ltr',
                title: 'Video Poker - Valets ou Mieux',
                gameTitle: 'Video Poker',
                payouts: {
                    'Royal Flush': 'Quinte Flush Royale',
                    'Straight Flush': 'Quinte Flush',
                    'Four of a Kind': 'Carré',
                    'Full House': 'Full',
                    'Flush': 'Couleur',
                    'Straight': 'Quinte',
                    'Three of a Kind': 'Brelan',
                    'Two Pair': 'Double Paire',
                    'Jacks or Better': 'Valets ou Mieux',
                    'Nothing': 'Rien'
                },
                balanceLabel: 'Solde:',
                heldBadge: 'CONSERVÉ',
                hourlyTitle: 'Compétition Horaire',
                dailyTitle: 'Compétition Journalière',
                hourlyTab: 'Horaire',
                dailyTab: 'Journalier',
                hourlyRankLabel: 'Rang Horaire',
                dailyRankLabel: 'Rang Journalier',
                formulaTitle: 'Comment le score est-il calculé ?',
                hourlyFormula: 'Score = Solde - (100 × Rebuys) - 100<br><span style="opacity:0.7">(Ceci équivaut à votre gain/perte net exact)</span>',
                winLabels: {
                    pair: 'Paire de',
                    threeOfKind: 'Brelan',
                    fourOfKind: 'Carré',
                    straight: 'Quinte',
                    flush: 'Couleur',
                    fullHouse: 'Full House',
                    straightFlush: 'Quinte Flush',
                    royalFlush: 'Quinte Royale'
                },
                betLabel: 'Mise:',
                creditsLabel: 'crédits',
                chooseBetLabel: 'Choisir la Mise:',
                dealBtn: 'Donner',
                drawBtn: 'Tirer',
                howToPlay: 'Comment Jouer:',
                rulesTitle: 'Mains Gagnantes et Règles:',
                instructions: [
                    'Cliquez sur les cartes pour GARDER/LÂCHER (surlignées en or)',
                    'Choisissez votre mise (1-5 crédits) avant de donner',
                    'Cliquez sur "Donner" pour commencer une nouvelle main',
                    'Cliquez sur "Tirer" pour remplacer les cartes non gardées',
                    'Valets ou Mieux: paire de V, D, R, A gagne'
                ],
                explanations: {
                    'Royal Flush': 'A♠ K♠ Q♠ J♠ 10♠ - La meilleure main ! Même couleur, 10 à l\'As.',
                    'Straight Flush': 'Cinq cartes consécutives, toutes de la même couleur !',
                    'Four of a Kind': 'Quatre cartes du même rang - quelle chance incroyable !',
                    'Full House': 'Brelan plus une paire - un full !',
                    'Flush': 'Les cinq cartes de la même couleur, mais pas en séquence.',
                    'Straight': 'Cinq cartes consécutives de couleurs mélangées.',
                    'Three of a Kind': 'Trois cartes du même rang.',
                    'Two Pair': 'Deux paires différentes dans une main.',
                    'Jacks or Better': 'Une paire de Valets, Dames, Rois ou As gagne !',
                    'Nothing': 'Meilleure chance la prochaine main !'
                },
                insufficientBalance: 'Solde insuffisant !',
                statWon: 'Gagné',
                statLost: 'Perdu',
                statNet: 'Net',
                statHands: 'Mains'
            },
            de: {
                dir: 'ltr',
                title: 'Video Poker - Buben oder Besser',
                gameTitle: 'Video Poker',
                payouts: {
                    'Royal Flush': 'Royal Flush',
                    'Straight Flush': 'Straight Flush',
                    'Four of a Kind': 'Vierling',
                    'Full House': 'Full House',
                    'Flush': 'Flush',
                    'Straight': 'Straight',
                    'Three of a Kind': 'Drilling',
                    'Two Pair': 'Zwei Paare',
                    'Jacks or Better': 'Buben oder Besser',
                    'Nothing': 'Nichts'
                },
                balanceLabel: 'Guthaben:',
                heldBadge: 'GEHALTEN',
                hourlyTitle: 'Stündlicher Wettbewerb',
                dailyTitle: 'Täglicher Wettbewerb',
                hourlyTab: 'Stündlich',
                dailyTab: 'Täglich',
                hourlyRankLabel: 'Stundenrang',
                dailyRankLabel: 'Tagesrang',
                formulaTitle: 'Wie wird der Score berechnet?',
                hourlyFormula: 'Score = Guthaben - (100 × Rebuys) - 100<br><span style="opacity:0.7">(Dies entspricht Ihrem genauen Nettogewinn/-verlust)</span>',
                winLabels: {
                    pair: 'Paar ',
                    threeOfKind: 'Drilling',
                    fourOfKind: 'Vierling',
                    straight: 'Strasse',
                    flush: 'Flush',
                    fullHouse: 'Full House',
                    straightFlush: 'Straight Flush',
                    royalFlush: 'Royal Flush'
                },
                betLabel: 'Einsatz:',
                creditsLabel: 'Credits',
                chooseBetLabel: 'Einsatz Wählen:',
                dealBtn: 'Geben',
                drawBtn: 'Ziehen',
                howToPlay: 'Wie man spielt:',
                rulesTitle: 'Gewinnhände & Regeln:',
                instructions: [
                    'Klicken Sie auf Karten, um sie zu HALTEN/LOSLASSEN (gold hervorgehoben)',
                    'Wählen Sie Ihren Einsatz (1-5 Credits) vor dem Geben',
                    'Klicken Sie auf "Geben" für ein neues Blatt',
                    'Klicken Sie auf "Ziehen", um nicht gehaltene Karten zu ersetzen',
                    'Buben oder Besser: Paar B, D, K, A gewinnt'
                ],
                explanations: {
                    'Royal Flush': 'A♠ K♠ Q♠ J♠ 10♠ - Das höchste Blatt! Alle gleiche Farbe, 10 bis Ass.',
                    'Straight Flush': 'Fünf aufeinanderfolgende Karten, alle gleiche Farbe!',
                    'Four of a Kind': 'Vier Karten gleichen Rangs - das ist verrücktes Glück!',
                    'Full House': 'Drilling plus ein Paar - ein Full House!',
                    'Flush': 'Alle fünf Karten gleiche Farbe, aber nicht in Folge.',
                    'Straight': 'Fünf aufeinanderfolgende Karten gemischter Farben.',
                    'Three of a Kind': 'Drei Karten gleichen Rangs.',
                    'Two Pair': 'Zwei verschiedene Paare in einem Blatt.',
                    'Jacks or Better': 'Ein Paar Buben, Damen, Könige oder Asse gewinnt!',
                    'Nothing': 'Beim nächsten Mal mehr Glück!'
                },
                insufficientBalance: 'Nicht genügend Guthaben!',
                statWon: 'Gewonnen',
                statLost: 'Verloren',
                statNet: 'Netto',
                statHands: 'Hände'
            },
            he: {
                dir: 'rtl',
                title: 'וידאו פוקר - ג\'קס או בטר',
                gameTitle: 'וידאו פוקר',
                payouts: {
                    'Royal Flush': 'רויאל פלאש',
                    'Straight Flush': 'סטרייט פלאש',
                    'Four of a Kind': 'רביעייה',
                    'Full House': 'פול האוס',
                    'Flush': 'פלאש',
                    'Straight': 'סטרייט',
                    'Three of a Kind': 'שלישייה',
                    'Two Pair': 'שני זוגות',
                    'Jacks or Better': 'ג\'קס או בטר',
                    'Nothing': 'כלום'
                },
                balanceLabel: 'יתרה:',
                heldBadge: 'להשאיר',
                hourlyTitle: 'תחרות שעתית',
                dailyTitle: 'תחרות יומית',
                hourlyTab: 'שעתי',
                dailyTab: 'יומי',
                hourlyRankLabel: 'דירוג שעתי',
                dailyRankLabel: 'דירוג יומי',
                formulaTitle: 'איך הניקוד מחושב?',
                hourlyFormula: 'ניקוד = יתרה - (100 × הפקדות מחדש) - 100<br><span style="opacity:0.7">(הניקוד שווה בדיוק לרווח/הפסד הנקי שלך)</span>',
                winLabels: {
                    pair: 'זוג',
                    threeOfKind: 'שלישייה',
                    fourOfKind: 'רביעייה',
                    straight: 'סטרייט',
                    flush: 'פלאש',
                    fullHouse: 'פול האוס',
                    straightFlush: 'סטרייט פלאש',
                    royalFlush: 'רויאל פלאש'
                },
                betLabel: 'הימור:',
                creditsLabel: 'קרדיטים',
                chooseBetLabel: 'בחר הימור:',
                dealBtn: 'חלוקה',
                drawBtn: 'החלפה',
                howToPlay: 'איך לשחק:',
                instructions: [
                    'לחץ על קלפים כדי להחזיק/לשחרר אותם (מודגשים בזהב)',
                    'בחר את ההימור שלך (1-5 קרדיטים) לפני החלוקה',
                    'לחץ על "חלוקה" כדי להתחיל יד חדשה',
                    'לחץ על "החלפה" כדי להחליף קלפים שלא הוחזקו',
                    'ג\'קס או בטר: זוג נסיכים, מלכות, מלכים או אסים מנצח'
                ],
                explanations: {
                    'Royal Flush': 'A♠ K♠ Q♠ J♠ 10♠ - היד הגבוהה ביותר! כל אותה סדרה, 10 עד אס.',
                    'Straight Flush': 'חמש קלפים עוקבים, כולם באותה סדרה!',
                    'Four of a Kind': 'ארבע קלפים מאותה דרגה - זה מזל מטורף!',
                    'Full House': 'שלישייה ועוד זוג - פול האוס!',
                    'Flush': 'כל חמשת הקלפים באותה סדרה, אבל לא ברצף.',
                    'Straight': 'חמש קלפים עוקבים בסדרות מעורבות.',
                    'Three of a Kind': 'שלושה קלפים מאותה דרגה.',
                    'Two Pair': 'שני זוגות שונים ביד אחת.',
                    'Jacks or Better': 'זוג נסיכים, מלכות, מלכים או אסים מנצח!',
                    'Nothing': 'מזל טוב יותר ביד הבאה!'
                },
                insufficientBalance: 'יתרה לא מספקת!',
                statWon: 'רווח',
                statLost: 'הפסד',
                statNet: 'סיכום',
                statHands: 'ידיים'
            },
            ar: {
                dir: 'rtl',
                title: 'فيديو بوكر - جاكس أو أفضل',
                gameTitle: 'فيديو بوكر',
                payouts: {
                    'Royal Flush': 'رويال فلاش',
                    'Straight Flush': 'ستريت فلاش',
                    'Four of a Kind': 'أربع من نوع',
                    'Full House': 'فول هاوس',
                    'Flush': 'فلاش',
                    'Straight': 'ستريت',
                    'Three of a Kind': 'ثلاثة من نوع',
                    'Two Pair': 'زوجان',
                    'Jacks or Better': 'جاكس أو أفضل',
                    'Nothing': 'لا شيء'
                },
                balanceLabel: 'الرصيد:',
                heldBadge: 'إبقاء',
                hourlyTitle: 'مسابقة ساعية',
                dailyTitle: 'مسابقة يومية',
                hourlyTab: 'ساعي',
                dailyTab: 'يومي',
                hourlyRankLabel: 'الترتيب الساعي',
                dailyRankLabel: 'الترتيب اليومي',
                hourlyFormula: '(صافي ربحك/خسارتك لهذه الساعة)',
                dailyFormula: '(صافي ربحك/خسارتك لليوم)',
                winLabels: {
                    pair: 'زوج من',
                    threeOfKind: 'ثلاثة من نوع',
                    fourOfKind: 'أربعة من نوع',
                    straight: 'ستريت',
                    flush: 'فلاش',
                    fullHouse: 'فول هاوس',
                    straightFlush: 'ستريت فلاش',
                    royalFlush: 'رويال فلاش'
                },
                betLabel: 'الرهان:',
                creditsLabel: 'أرصدة',
                chooseBetLabel: 'اختر الرهان:',
                dealBtn: 'توزيع',
                drawBtn: 'سحب',
                howToPlay: 'كيف تلعب:',
                instructions: [
                    'انقر على البطاقات للاحتفاظ/إلغاء الاحتفاظ (محددة بالذهب)',
                    'اختر رهانك (1-5 أرصدة) قبل التوزيع',
                    'انقر على "توزيع" لبدء يد جديدة',
                    'انقر على "سحب" لاستبدال البطاقات غير المحتفظ بها',
                    'جاكس أو أفضل: زوج من J، Q، K، A يفوز'
                ],
                explanations: {
                    'Royal Flush': 'A♠ K♠ Q♠ J♠ 10♠ - أعلى يد! نفس النوع، من 10 إلى الآس.',
                    'Straight Flush': 'خمس بطاقات متتالية، كلها من نفس النوع!',
                    'Four of a Kind': 'أربع بطاقات من نفس الرتبة - هذا حظ مجنون!',
                    'Full House': 'ثلاثة من نوع وزوج - فول هاوس!',
                    'Flush': 'كل الخمس بطاقات من نفس النوع، لكن ليست في تسلسل.',
                    'Straight': 'خمس بطاقات متتالية من أنواع مختلطة.',
                    'Three of a Kind': 'ثلاث بطاقات من نفس الرتبة.',
                    'Two Pair': 'زوجان مختلفان في يد واحدة.',
                    'Jacks or Better': 'زوج من الجاك، كوين، كينج، أو آيس يفوز!',
                    'Nothing': 'حظ أفضل في اليد القادمة!'
                },
                insufficientBalance: 'رصيد غير كافٍ!',
                statWon: 'ربح',
                statLost: 'خسارة',
                statNet: 'صافي',
                statHands: 'أيدي'
            }
        };