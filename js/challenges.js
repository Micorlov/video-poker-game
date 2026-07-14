var CHALLENGE_POOL = [
        { id: 'play10',        type: 'play',        target: 10,  reward: 30 },
        { id: 'play20',        type: 'play',        target: 20,  reward: 50 },
        { id: 'play30',        type: 'play',        target: 30,  reward: 75 },
        { id: 'win3',          type: 'win',         target: 3,   reward: 40 },
        { id: 'win5',          type: 'win',         target: 5,   reward: 60 },
        { id: 'win8',          type: 'win',         target: 8,   reward: 90 },
        { id: 'streak3',       type: 'streak',      target: 3,   reward: 75 },
        { id: 'twopair2',      type: 'hand', hand: 'Two Pair',        target: 2, reward: 40 },
        { id: 'trips1',        type: 'hand', hand: 'Three of a Kind', target: 1, reward: 40 },
        { id: 'trips3',        type: 'hand', hand: 'Three of a Kind', target: 3, reward: 100 },
        { id: 'straight1',     type: 'hand', hand: 'Straight',        target: 1, reward: 60 },
        { id: 'flush1',        type: 'hand', hand: 'Flush',           target: 1, reward: 75 },
        { id: 'fullhouse1',    type: 'hand', hand: 'Full House',      target: 1, reward: 90 },
        { id: 'quads1',        type: 'hand', hand: 'Four of a Kind',  target: 1, reward: 100 },
        { id: 'jacks5',        type: 'hand', hand: 'Jacks or Better', target: 5, reward: 50 },
        { id: 'heldpair2',     type: 'heldPairWin', target: 2,   reward: 50 },
        { id: 'betmax3',       type: 'maxBet',      target: 3,   reward: 60 },
        { id: 'wincredits50',  type: 'winCredits',  target: 50,  reward: 50 },
        { id: 'wincredits150', type: 'winCredits',  target: 150, reward: 100 },
        { id: 'bigwin20',      type: 'bigWin',      target: 1,   reward: 75 }
    ];

    var ENGAGE_I18N = {
        en: {
            rewardTitle: '🎁 Daily Bonus', rewardSub: 'Come back every day — the rewards keep growing!',
            dayLabel: 'Day', claimBtn: 'Claim {n} credits',
            rewardHint: 'Miss a day and the streak resets to Day 1!',
            longestStreak: 'Longest streak: {n} days',
            comebackTitle: '👋 Welcome back!', comebackMsg: 'We missed you at the table — here\'s a little something to get you going.',
            comebackBtn: 'Collect {n} credits',
            streakLabel: 'Win Streak', bonusTag: '+{n}% payout bonus', bestStreakStat: 'Best Streak',
            challengesTitle: '🎯 Daily Challenges',
            challengeToast: '🏅 Challenge complete! +{n} credits',
            rewardToast: '🎁 +{n} credits!',
            chPlay: 'Play {n} hands', chWin: 'Win {n} hands', chStreak: 'Win {n} in a row',
            chHand: 'Get {hand} ×{n}', chHeldPair: 'Win holding a pair ×{n}', chMaxBet: 'Play {n} hands at max bet',
            chWinCredits: 'Win {n} credits total', chBigWin: 'Win {n}+ credits in one hand'
        },
        es: {
            rewardTitle: '🎁 Bono Diario', rewardSub: '¡Vuelve cada día — las recompensas crecen!',
            dayLabel: 'Día', claimBtn: 'Reclamar {n} créditos',
            rewardHint: '¡Si faltas un día, la racha vuelve al Día 1!',
            longestStreak: 'Racha más larga: {n} días',
            comebackTitle: '👋 ¡Bienvenido de vuelta!', comebackMsg: 'Te extrañamos en la mesa — aquí tienes algo para empezar.',
            comebackBtn: 'Recoger {n} créditos',
            streakLabel: 'Racha de Victorias', bonusTag: '+{n}% de bono', bestStreakStat: 'Mejor Racha',
            challengesTitle: '🎯 Desafíos Diarios',
            challengeToast: '🏅 ¡Desafío completado! +{n} créditos',
            rewardToast: '🎁 ¡+{n} créditos!',
            chPlay: 'Juega {n} manos', chWin: 'Gana {n} manos', chStreak: 'Gana {n} seguidas',
            chHand: 'Consigue {hand} ×{n}', chHeldPair: 'Gana manteniendo una pareja ×{n}', chMaxBet: 'Juega {n} manos con apuesta máxima',
            chWinCredits: 'Gana {n} créditos en total', chBigWin: 'Gana {n}+ créditos en una mano'
        },
        fr: {
            rewardTitle: '🎁 Bonus Quotidien', rewardSub: 'Reviens chaque jour — les récompenses grandissent !',
            dayLabel: 'Jour', claimBtn: 'Réclamer {n} crédits',
            rewardHint: 'Un jour manqué et la série repart au Jour 1 !',
            longestStreak: 'Plus longue série : {n} jours',
            comebackTitle: '👋 Bon retour !', comebackMsg: 'Tu nous as manqué à la table — voici de quoi bien reprendre.',
            comebackBtn: 'Récupérer {n} crédits',
            streakLabel: 'Série de Victoires', bonusTag: '+{n}% de bonus', bestStreakStat: 'Meilleure Série',
            challengesTitle: '🎯 Défis du Jour',
            challengeToast: '🏅 Défi accompli ! +{n} crédits',
            rewardToast: '🎁 +{n} crédits !',
            chPlay: 'Joue {n} mains', chWin: 'Gagne {n} mains', chStreak: 'Gagne {n} de suite',
            chHand: 'Obtiens {hand} ×{n}', chHeldPair: 'Gagne en gardant une paire ×{n}', chMaxBet: 'Joue {n} mains à la mise max',
            chWinCredits: 'Gagne {n} crédits au total', chBigWin: 'Gagne {n}+ crédits en une main'
        },
        de: {
            rewardTitle: '🎁 Täglicher Bonus', rewardSub: 'Komm jeden Tag zurück — die Belohnungen wachsen!',
            dayLabel: 'Tag', claimBtn: '{n} Credits abholen',
            rewardHint: 'Ein verpasster Tag setzt die Serie auf Tag 1 zurück!',
            longestStreak: 'Längste Serie: {n} Tage',
            comebackTitle: '👋 Willkommen zurück!', comebackMsg: 'Wir haben dich am Tisch vermisst — hier ist etwas für den Neustart.',
            comebackBtn: '{n} Credits abholen',
            streakLabel: 'Siegesserie', bonusTag: '+{n}% Bonus', bestStreakStat: 'Beste Serie',
            challengesTitle: '🎯 Tägliche Herausforderungen',
            challengeToast: '🏅 Herausforderung geschafft! +{n} Credits',
            rewardToast: '🎁 +{n} Credits!',
            chPlay: 'Spiele {n} Hände', chWin: 'Gewinne {n} Hände', chStreak: 'Gewinne {n} in Folge',
            chHand: 'Erziele {hand} ×{n}', chHeldPair: 'Gewinne mit gehaltenem Paar ×{n}', chMaxBet: 'Spiele {n} Hände mit Maximaleinsatz',
            chWinCredits: 'Gewinne insgesamt {n} Credits', chBigWin: 'Gewinne {n}+ Credits in einer Hand'
        },
        he: {
            rewardTitle: '🎁 בונוס יומי', rewardSub: 'חזור כל יום — הפרסים גדלים!',
            dayLabel: 'יום', claimBtn: 'אסוף {n} קרדיטים',
            rewardHint: 'פספסת יום? הרצף מתאפס ליום 1!',
            longestStreak: 'הרצף הארוך ביותר: {n} ימים',
            comebackTitle: '👋 ברוך שובך!', comebackMsg: 'התגעגענו אליך בשולחן — הנה משהו קטן בשבילך.',
            comebackBtn: 'אסוף {n} קרדיטים',
            streakLabel: 'רצף ניצחונות', bonusTag: 'בונוס +{n}%', bestStreakStat: 'הרצף הטוב ביותר',
            challengesTitle: '🎯 אתגרים יומיים',
            challengeToast: '🏅 אתגר הושלם! +{n} קרדיטים',
            rewardToast: '🎁 +{n} קרדיטים!',
            chPlay: 'שחק {n} ידיים', chWin: 'נצח ב-{n} ידיים', chStreak: 'נצח {n} ברצף',
            chHand: 'השג {hand} ×{n}', chHeldPair: 'נצח עם זוג שמור ×{n}', chMaxBet: 'שחק {n} ידיים בהימור מקסימלי',
            chWinCredits: 'צבור {n} קרדיטים מנצחונות', chBigWin: 'זכה ב-{n}+ קרדיטים ביד אחת'
        },
        ar: {
            rewardTitle: '🎁 مكافأة يومية', rewardSub: 'عُد كل يوم — المكافآت تكبر!',
            dayLabel: 'يوم', claimBtn: 'اجمع {n} رصيداً',
            rewardHint: 'إذا فاتك يوم، تعود السلسلة إلى اليوم 1!',
            longestStreak: 'أطول سلسلة: {n} أيام',
            comebackTitle: '👋 أهلاً بعودتك!', comebackMsg: 'اشتقنا إليك على الطاولة — إليك شيئاً يعيدك للعب.',
            comebackBtn: 'اجمع {n} رصيداً',
            streakLabel: 'سلسلة انتصارات', bonusTag: 'مكافأة +{n}%', bestStreakStat: 'أفضل سلسلة',
            challengesTitle: '🎯 تحديات يومية',
            challengeToast: '🏅 اكتمل التحدي! +{n} رصيد',
            rewardToast: '🎁 +{n} رصيد!',
            chPlay: 'العب {n} يداً', chWin: 'افز بـ{n} أيدٍ', chStreak: 'افز بـ{n} على التوالي',
            chHand: 'احصل على {hand} ×{n}', chHeldPair: 'افز محتفظاً بزوج ×{n}', chMaxBet: 'العب {n} أيدٍ بالرهان الأقصى',
            chWinCredits: 'اجمع {n} رصيداً من الأرباح', chBigWin: 'افز بـ{n}+ رصيد في يد واحدة'
        }
    };

    function et(key) {
        var pack = ENGAGE_I18N[currentLang] || ENGAGE_I18N.en;
        return pack[key] || ENGAGE_I18N.en[key] || key;
    }

    // --- lifecycle ---
    window.initEngagement = function(user) {
        egUser = user;
        egModalQueue = [];
        applyEngageLang();
        egLoadUserProfile(user);
        egLoadDailyReward(user);
        egLoadChallenges(user);
        if (window.initTournament) initTournament(user);
        if (window.initSeason) initSeason(user);
        if (window.initPwa) initPwa(user);
    };

    window.teardownEngagement = function() {
        egUser = null;
        egModalQueue = [];
        egRewardState = null;
        egChallenges = null;
        winStreak = 0;
        bestStreak = 0;
        egXp = 0;
        egLevel = 1;
        egStats = null;
        egAchievements = {};
        egHourHands = 0;
        egApplyCardStyle('classic');
        updateStreakUI(false);
        document.getElementById('challenges-panel').style.display = 'none';
        egCloseModal('eg-reward-modal');
        egCloseModal('eg-comeback-modal');
        egCloseModal('eg-levelup-modal');
        egCloseProfile();
        if (window.teardownTournament) teardownTournament();
        if (window.teardownSeason) teardownSeason();
    };

    // --- modal queue (one at a time) ---
    function egQueueModal(id) {
        egModalQueue.push(id);
        if (egModalQueue.length === 1) egShowModal(id);
    }

    function egShowModal(id) {
        document.getElementById(id).classList.remove('eg-hidden');
    }

    function egCloseModal(id) {
        document.getElementById(id).classList.add('eg-hidden');
        var idx = egModalQueue.indexOf(id);
        if (idx !== -1) egModalQueue.splice(idx, 1);
        if (egModalQueue.length > 0) egShowModal(egModalQueue[0]);
    }

    // --- toast + confetti ---