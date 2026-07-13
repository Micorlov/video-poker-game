function getHourKey(date) {
        const now = date || new Date();
        return now.getFullYear() + '-' +
            String(now.getMonth() + 1).padStart(2, '0') + '-' +
            String(now.getDate()).padStart(2, '0') + 'T' +
            String(now.getHours()).padStart(2, '0');
    }

    // No more tab switching — both leaderboards always shown

    function getDayKey(date) {
        const now = date || new Date();
        return now.getFullYear() + '-' +
            String(now.getMonth() + 1).padStart(2, '0') + '-' +
            String(now.getDate()).padStart(2, '0');
    }

    function getWeekKey(date) {
        // ISO week: week belongs to the year of its Thursday
        const now = date || new Date();
        const target = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const dayNr = (target.getDay() + 6) % 7; // Mon=0 … Sun=6
        target.setDate(target.getDate() - dayNr + 3);
        const firstThursday = new Date(target.getFullYear(), 0, 4);
        const ftDayNr = (firstThursday.getDay() + 6) % 7;
        firstThursday.setDate(firstThursday.getDate() - ftDayNr + 3);
        const weekNo = 1 + Math.round((target - firstThursday) / (7 * 24 * 3600 * 1000));
        return target.getFullYear() + '-W' + String(weekNo).padStart(2, '0');
    }

    function updateScores(win, betAmount, handType) {
        const user = auth.currentUser;
        if (!user) return;
        
        const handRank = HAND_RANK[handType] || 0;
        
        // 1. Update Hourly Score
        checkHourReset();
        const hourKey = getHourKey();
        const hourlyDocId = hourKey + '_' + user.uid;
        const hourlyRef = db.collection('hourly_scores').doc(hourlyDocId);
        const hourlyScoreVal = balance - 100 * (1 + hourlyRebuys);
        
        const hourlyPromise = hourlyRef.get().then(function(doc) {
            if (doc.exists) {
                const data = doc.data();
                const prevBestRank = HAND_RANK[data.bestHand] || 0;
                return hourlyRef.update({
                    score: hourlyScoreVal,
                    rebuys: hourlyRebuys,
                    hands: firebase.firestore.FieldValue.increment(1),
                    bestHand: handRank > prevBestRank ? handType : data.bestHand,
                    level: egLevel,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            } else {
                return hourlyRef.set({
                    hourKey: hourKey,
                    uid: user.uid,
                    displayName: user.displayName || '',
                    photoURL: user.photoURL || '',
                    score: hourlyScoreVal,
                    rebuys: hourlyRebuys,
                    hands: 1,
                    bestHand: handType,
                    level: egLevel,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        });
        
        // 2. Update Daily Score
        checkDayReset();
        const dayKey = getDayKey();
        const dailyDocId = dayKey + '_' + user.uid;
        const dailyRef = db.collection('daily_scores').doc(dailyDocId);
        const dailyScoreVal = balance - 100 * (1 + dailyRebuys);
        
        const dailyPromise = dailyRef.get().then(function(doc) {
            if (doc.exists) {
                const data = doc.data();
                const prevBestRank = HAND_RANK[data.bestHand] || 0;
                return dailyRef.update({
                    score: dailyScoreVal,
                    rebuys: dailyRebuys,
                    hands: firebase.firestore.FieldValue.increment(1),
                    bestHand: handRank > prevBestRank ? handType : data.bestHand,
                    level: egLevel,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            } else {
                return dailyRef.set({
                    dayKey: dayKey,
                    uid: user.uid,
                    displayName: user.displayName || '',
                    photoURL: user.photoURL || '',
                    score: dailyScoreVal,
                    rebuys: dailyRebuys,
                    hands: 1,
                    bestHand: handType,
                    level: egLevel,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        });
        
        Promise.all([hourlyPromise, dailyPromise]).then(function() {
            refreshLeaderboard();
        }).catch(function(err) {
            console.error('Error in updateScores:', err);
            // Even if writing to one of them fails, try to refresh the leaderboard so it's not stale
            refreshLeaderboard();
        });

        // 3. Update Friend Room Scores
        if (window.updateRoomScores) window.updateRoomScores(handType);
    }

    function fillLeaderboardTable(tbodyId, snap, user, rankBarPrefix) {
        const tbody = document.getElementById(tbodyId);
        let myRank = null;
        let myScore = 0;
        if (!snap || snap.empty) {
            tbody.innerHTML = '<tr><td colspan="4" class="lb-empty">Play a hand to join!</td></tr>';
            return { rank: null, score: 0 };
        }
        tbody.innerHTML = '';
        let rank = 0;
        snap.forEach(function(doc) {
            rank++;
            const d = doc.data();
            const isYou = user && d.uid === user.uid;
            if (isYou) { myRank = rank; myScore = d.score || 0; }
            const photo = d.photoURL ? '<img src="' + d.photoURL + '">' : '';
            const name = (d.displayName || 'Anonymous').split(' ')[0];
            const badge = isYou ? '<span class="lb-badge lb-badge-you">YOU</span>' : '';
            const rebuyBadge = d.rebuys > 0 ? '<span class="lb-badge lb-badge-rebuys">♻' + d.rebuys + '</span>' : '';
            
            let isOnline = false;
            if (d.updatedAt && typeof d.updatedAt.toDate === 'function') {
                if (Date.now() - d.updatedAt.toDate().getTime() < 3 * 60 * 1000) isOnline = true;
            } else if (d.updatedAt === null) {
                isOnline = true; // Pending local write
            }
            const onlineIndicator = isOnline ? '<span class="online-fire" title="Online">🔥</span>' : '';

            const rankClass = rank <= 3 ? ' lb-rank-' + rank : '';
            const s = d.score || 0;
            const scoreClass = s > 0 ? 'lb-positive lb-score' : s < 0 ? 'lb-negative lb-score' : 'lb-zero lb-score';
            const scoreText = s > 0 ? '+' + s : '' + s;
            const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank;

            const lvlBadge = d.level ? '<span class="lvl-badge">' + d.level + '</span>' : '';
            const row = document.createElement('tr');
            if (isYou) row.className = 'lb-you';
            row.innerHTML =
                '<td class="lb-rank' + rankClass + '">' + medal + '</td>' +
                '<td><span class="lb-name" onclick="egOpenProfile(\'' + d.uid + '\')">' + photo + name + '</span>' + lvlBadge + badge + rebuyBadge + onlineIndicator + '</td>' +
                '<td class="' + scoreClass + '">' + scoreText + '</td>' +
                '<td>' + d.hands + '</td>';
            tbody.appendChild(row);
        });
        return { rank: myRank, score: myScore };
    }

    function refreshLeaderboard() {
        const user = auth.currentUser;
        if (!user) return;

        // Fetch hourly
        const hourlyPromise = db.collection('hourly_scores')
            .where('hourKey', '==', getHourKey())
            .orderBy('score', 'desc')
            .limit(20)
            .get()
            .catch(function(err) { console.error('Hourly LB error:', err); return null; });

        // Fetch daily
        const dailyPromise = db.collection('daily_scores')
            .where('dayKey', '==', getDayKey())
            .orderBy('score', 'desc')
            .limit(20)
            .get()
            .catch(function(err) { console.error('Daily LB error:', err); return null; });

        Promise.all([hourlyPromise, dailyPromise]).then(function(results) {
            const hourlyResult = fillLeaderboardTable('lb-hourly-body', results[0], user);
            const dailyResult = fillLeaderboardTable('lb-daily-body', results[1], user);
            updateRankBar(hourlyResult, dailyResult);
        });
    }

    function updateRankBar(hourlyResult, dailyResult) {
        const bar = document.getElementById('rank-bar');
        if (!auth.currentUser) { bar.classList.add('hidden'); return; }
        bar.classList.remove('hidden');

        const hRank = document.getElementById('rb-hourly-rank');
        const hScore = document.getElementById('rb-hourly-score');
        hRank.textContent = hourlyResult.rank ? '#' + hourlyResult.rank : '#—';
        hScore.textContent = hourlyResult.score > 0 ? '+' + hourlyResult.score : '' + hourlyResult.score;
        hScore.className = 'rank-bar-value' + (hourlyResult.score > 0 ? ' positive' : hourlyResult.score < 0 ? ' negative' : '');

        const dRank = document.getElementById('rb-daily-rank');
        const dScore = document.getElementById('rb-daily-score');
        dRank.textContent = dailyResult.rank ? '#' + dailyResult.rank : '#—';
        dScore.textContent = dailyResult.score > 0 ? '+' + dailyResult.score : '' + dailyResult.score;
        dScore.className = 'rank-bar-value' + (dailyResult.score > 0 ? ' positive' : dailyResult.score < 0 ? ' negative' : '');
    }

    function updateCountdown() {
        const now = new Date();
        // Hourly countdown
        const hMins = 59 - now.getMinutes();
        const hSecs = 59 - now.getSeconds();
        const hourlyStr = String(hMins).padStart(2, '0') + ':' + String(hSecs).padStart(2, '0');
        const lbHourly = document.getElementById('lb-hourly-countdown');
        const rbHourly = document.getElementById('rb-hourly-countdown');
        if (lbHourly) lbHourly.textContent = hourlyStr;
        if (rbHourly) rbHourly.textContent = hourlyStr;

        // Daily countdown
        const dHours = 23 - now.getHours();
        const dMins = 59 - now.getMinutes();
        const dSecs = 59 - now.getSeconds();
        const dailyStr = String(dHours).padStart(2, '0') + ':' + String(dMins).padStart(2, '0') + ':' + String(dSecs).padStart(2, '0');
        const lbDaily = document.getElementById('lb-daily-countdown');
        const rbDaily = document.getElementById('rb-daily-countdown');
        if (lbDaily) lbDaily.textContent = dailyStr;
        if (rbDaily) rbDaily.textContent = dailyStr;

        if (window.updateRoomCountdown) window.updateRoomCountdown();
    }

    setInterval(updateCountdown, 1000);
    updateCountdown();
    setInterval(refreshLeaderboard, 30000);

    function loadAdminData() {
        db.collection('users').orderBy('lastLogin', 'desc').get().then(function(snap) {
            const tbody = document.getElementById('admin-users-body');
            tbody.innerHTML = '';
            let todayCount = 0;
            const now = new Date();
            const todayStr = now.toISOString().slice(0, 10);

            snap.forEach(function(doc) {
                const d = doc.data();
                const lastLogin = d.lastLogin ? d.lastLogin.toDate() : null;
                const firstSeen = d.firstSeen ? d.firstSeen.toDate() : lastLogin;
                if (lastLogin && lastLogin.toISOString().slice(0, 10) === todayStr) {
                    todayCount++;
                }
                const photo = d.photoURL
                    ? '<img src="' + d.photoURL + '">'
                    : '';
                const row = document.createElement('tr');
                row.innerHTML =
                    '<td>' + photo + (d.displayName || '—') + '</td>' +
                    '<td>' + (d.email || '—') + '</td>' +
                    '<td>' + (firstSeen ? firstSeen.toLocaleDateString() : '—') + '</td>' +
                    '<td>' + (lastLogin ? lastLogin.toLocaleString() : '—') + '</td>';
                tbody.appendChild(row);
            });

            document.getElementById('admin-total').textContent = snap.size;
            document.getElementById('admin-today').textContent = todayCount;
        });
    }

    // ===================== Poker Rooms =====================
    var MAX_JOINED_ROOMS = 5;
    var ROOM_CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O/1/I/L
    var myRooms = [];        // [{id, name, ownerUid, ownerName, cadence}]
    var activeRoomId = null;
    var roomPrevRanks = {};  // uid -> rank at last refresh (active room only)
    var roomModalCadence = 'hourly';
    var pendingInviteCode = null;

    var ROOM_I18N = {
        en: {
            roomsTitle: 'Poker Rooms', createRoom: '+ Create Room', joinRoom: 'Join with Code',
            createTitle: 'Create a Poker Room', createSub: 'Your table, your friends, your crown',
            joinTitle: 'Join a Room', joinSub: 'Got a code from a friend?',
            roomNamePh: 'Room name…', createBtn: 'Create & Invite', joinBtn: 'Join Room',
            cadencePrompt: 'Competition resets:', cadenceHourly: 'Hourly', cadenceDaily: 'Daily', cadenceWeekly: 'Weekly',
            shareTitle: 'Invite your friends!', shareSub: 'Share the link or the code — the table is waiting',
            codeLabel: 'Room code', copyLink: 'Copy Link', copied: 'Copied ✓', whatsapp: 'Share on WhatsApp',
            resetsIn: 'Resets in', playToJoin: 'Play a hand to join!',
            noRooms: 'Create a private room and challenge your friends!',
            invite: '🔗 Invite', leave: '🚪 Leave', leaveConfirm: 'Leave this room?',
            errNotFound: 'Room not found — check the code', errMax: 'You can be in up to 5 rooms', errName: 'Give your room a name',
            lead: '👑 You lead by {n}! Defend the crown', toPass: '⚡ {n} pts to pass {name}!',
            passedYou: '🔻 {name} just passed you — take it back!', lastWinner: 'Last round champ',
            inviteTitle: "You're invited!", invitedBy: '{name} invited you to', inviteJoin: 'Join the Table',
            waText: '🃏 Join my poker room "{name}"! Code: {code}',
            loginInvite: "🎉 You've been invited to a private poker room — sign in to join!"
        },
        es: {
            roomsTitle: 'Salas de Póker', createRoom: '+ Crear Sala', joinRoom: 'Unirse con Código',
            createTitle: 'Crear una Sala de Póker', createSub: 'Tu mesa, tus amigos, tu corona',
            joinTitle: 'Unirse a una Sala', joinSub: '¿Tienes un código de un amigo?',
            roomNamePh: 'Nombre de la sala…', createBtn: 'Crear e Invitar', joinBtn: 'Unirse',
            cadencePrompt: 'La competición se reinicia:', cadenceHourly: 'Cada hora', cadenceDaily: 'Diaria', cadenceWeekly: 'Semanal',
            shareTitle: '¡Invita a tus amigos!', shareSub: 'Comparte el enlace o el código — la mesa espera',
            codeLabel: 'Código de sala', copyLink: 'Copiar Enlace', copied: 'Copiado ✓', whatsapp: 'Compartir en WhatsApp',
            resetsIn: 'Se reinicia en', playToJoin: '¡Juega una mano para unirte!',
            noRooms: '¡Crea una sala privada y desafía a tus amigos!',
            invite: '🔗 Invitar', leave: '🚪 Salir', leaveConfirm: '¿Salir de esta sala?',
            errNotFound: 'Sala no encontrada — revisa el código', errMax: 'Puedes estar en hasta 5 salas', errName: 'Dale un nombre a tu sala',
            lead: '👑 ¡Lideras por {n}! Defiende la corona', toPass: '⚡ ¡{n} pts para superar a {name}!',
            passedYou: '🔻 ¡{name} te acaba de superar — recupéralo!', lastWinner: 'Campeón de la ronda anterior',
            inviteTitle: '¡Estás invitado!', invitedBy: '{name} te invitó a', inviteJoin: 'Sentarse a la Mesa',
            waText: '🃏 ¡Únete a mi sala de póker "{name}"! Código: {code}',
            loginInvite: '🎉 Te han invitado a una sala privada de póker — ¡inicia sesión para unirte!'
        },
        fr: {
            roomsTitle: 'Salons de Poker', createRoom: '+ Créer un Salon', joinRoom: 'Rejoindre avec Code',
            createTitle: 'Créer un Salon de Poker', createSub: 'Ta table, tes amis, ta couronne',
            joinTitle: 'Rejoindre un Salon', joinSub: 'Un ami t\'a donné un code ?',
            roomNamePh: 'Nom du salon…', createBtn: 'Créer et Inviter', joinBtn: 'Rejoindre',
            cadencePrompt: 'La compétition se réinitialise :', cadenceHourly: 'Horaire', cadenceDaily: 'Journalière', cadenceWeekly: 'Hebdomadaire',
            shareTitle: 'Invite tes amis !', shareSub: 'Partage le lien ou le code — la table vous attend',
            codeLabel: 'Code du salon', copyLink: 'Copier le Lien', copied: 'Copié ✓', whatsapp: 'Partager sur WhatsApp',
            resetsIn: 'Réinitialisation dans', playToJoin: 'Joue une main pour participer !',
            noRooms: 'Crée un salon privé et défie tes amis !',
            invite: '🔗 Inviter', leave: '🚪 Quitter', leaveConfirm: 'Quitter ce salon ?',
            errNotFound: 'Salon introuvable — vérifie le code', errMax: 'Tu peux être dans 5 salons max', errName: 'Donne un nom à ton salon',
            lead: '👑 Tu mènes de {n} ! Défends la couronne', toPass: '⚡ {n} pts pour dépasser {name} !',
            passedYou: '🔻 {name} vient de te dépasser — reprends ta place !', lastWinner: 'Champion du tour précédent',
            inviteTitle: 'Tu es invité !', invitedBy: '{name} t\'invite à', inviteJoin: 'Rejoindre la Table',
            waText: '🃏 Rejoins mon salon de poker "{name}" ! Code : {code}',
            loginInvite: '🎉 Tu as été invité à un salon de poker privé — connecte-toi pour le rejoindre !'
        },
        de: {
            roomsTitle: 'Poker-Räume', createRoom: '+ Raum Erstellen', joinRoom: 'Mit Code Beitreten',
            createTitle: 'Poker-Raum Erstellen', createSub: 'Dein Tisch, deine Freunde, deine Krone',
            joinTitle: 'Raum Beitreten', joinSub: 'Code von einem Freund bekommen?',
            roomNamePh: 'Raumname…', createBtn: 'Erstellen & Einladen', joinBtn: 'Beitreten',
            cadencePrompt: 'Wettbewerb wird zurückgesetzt:', cadenceHourly: 'Stündlich', cadenceDaily: 'Täglich', cadenceWeekly: 'Wöchentlich',
            shareTitle: 'Lade deine Freunde ein!', shareSub: 'Teile den Link oder den Code — der Tisch wartet',
            codeLabel: 'Raumcode', copyLink: 'Link Kopieren', copied: 'Kopiert ✓', whatsapp: 'Auf WhatsApp Teilen',
            resetsIn: 'Reset in', playToJoin: 'Spiel eine Hand, um teilzunehmen!',
            noRooms: 'Erstelle einen privaten Raum und fordere deine Freunde heraus!',
            invite: '🔗 Einladen', leave: '🚪 Verlassen', leaveConfirm: 'Diesen Raum verlassen?',
            errNotFound: 'Raum nicht gefunden — prüfe den Code', errMax: 'Maximal 5 Räume möglich', errName: 'Gib deinem Raum einen Namen',
            lead: '👑 Du führst mit {n}! Verteidige die Krone', toPass: '⚡ {n} Pkt., um {name} zu überholen!',
            passedYou: '🔻 {name} hat dich überholt — hol es dir zurück!', lastWinner: 'Champion der letzten Runde',
            inviteTitle: 'Du bist eingeladen!', invitedBy: '{name} lädt dich ein zu', inviteJoin: 'An den Tisch',
            waText: '🃏 Komm in meinen Poker-Raum "{name}"! Code: {code}',
            loginInvite: '🎉 Du wurdest in einen privaten Poker-Raum eingeladen — melde dich an!'
        },
        he: {
            roomsTitle: 'חדרי פוקר', createRoom: '+ צור חדר', joinRoom: 'הצטרף עם קוד',
            createTitle: 'יצירת חדר פוקר', createSub: 'השולחן שלך, החברים שלך, הכתר שלך',
            joinTitle: 'הצטרפות לחדר', joinSub: 'קיבלת קוד מחבר?',
            roomNamePh: 'שם החדר…', createBtn: 'צור והזמן חברים', joinBtn: 'הצטרף לחדר',
            cadencePrompt: 'התחרות מתאפסת:', cadenceHourly: 'כל שעה', cadenceDaily: 'כל יום', cadenceWeekly: 'כל שבוע',
            shareTitle: 'הזמן את החברים!', shareSub: 'שתף את הלינק או את הקוד — השולחן מחכה',
            codeLabel: 'קוד החדר', copyLink: 'העתק לינק', copied: 'הועתק ✓', whatsapp: 'שתף בוואטסאפ',
            resetsIn: 'מתאפס בעוד', playToJoin: 'שחק יד כדי להצטרף!',
            noRooms: 'צור חדר פרטי ואתגר את החברים שלך!',
            invite: '🔗 הזמן', leave: '🚪 עזוב', leaveConfirm: 'לעזוב את החדר?',
            errNotFound: 'החדר לא נמצא — בדוק את הקוד', errMax: 'אפשר להיות עד 5 חדרים', errName: 'תן שם לחדר',
            lead: '👑 אתה מוביל ב-{n}! שמור על הכתר', toPass: '⚡ עוד {n} נק׳ לעקוף את {name}!',
            passedYou: '🔻 {name} עקף אותך — קח את המקום בחזרה!', lastWinner: 'אלוף הסיבוב הקודם',
            inviteTitle: 'הוזמנת!', invitedBy: '{name} הזמין אותך אל', inviteJoin: 'שב לשולחן',
            waText: '🃏 בוא לחדר הפוקר שלי "{name}"! קוד: {code}',
            loginInvite: '🎉 הוזמנת לחדר פוקר פרטי — התחבר כדי להצטרף!'
        },
        ar: {
            roomsTitle: 'غرف البوكر', createRoom: '+ إنشاء غرفة', joinRoom: 'انضم برمز',
            createTitle: 'إنشاء غرفة بوكر', createSub: 'طاولتك، أصدقاؤك، تاجك',
            joinTitle: 'الانضمام إلى غرفة', joinSub: 'حصلت على رمز من صديق؟',
            roomNamePh: 'اسم الغرفة…', createBtn: 'إنشاء ودعوة', joinBtn: 'انضم',
            cadencePrompt: 'تُعاد المسابقة:', cadenceHourly: 'كل ساعة', cadenceDaily: 'يومياً', cadenceWeekly: 'أسبوعياً',
            shareTitle: 'ادعُ أصدقاءك!', shareSub: 'شارك الرابط أو الرمز — الطاولة بانتظارك',
            codeLabel: 'رمز الغرفة', copyLink: 'نسخ الرابط', copied: 'تم النسخ ✓', whatsapp: 'مشاركة عبر واتساب',
            resetsIn: 'تُعاد خلال', playToJoin: 'العب يداً للانضمام!',
            noRooms: 'أنشئ غرفة خاصة وتحدَّ أصدقاءك!',
            invite: '🔗 دعوة', leave: '🚪 مغادرة', leaveConfirm: 'مغادرة هذه الغرفة؟',
            errNotFound: 'الغرفة غير موجودة — تحقق من الرمز', errMax: 'يمكنك الانضمام إلى 5 غرف كحد أقصى', errName: 'أعطِ غرفتك اسماً',
            lead: '👑 أنت في الصدارة بفارق {n}! دافع عن التاج', toPass: '⚡ {n} نقطة لتجاوز {name}!',
            passedYou: '🔻 {name} تجاوزك للتو — استعد مكانك!', lastWinner: 'بطل الجولة السابقة',
            inviteTitle: 'أنت مدعو!', invitedBy: '{name} دعاك إلى', inviteJoin: 'اجلس إلى الطاولة',
            waText: '🃏 انضم إلى غرفة البوكر الخاصة بي "{name}"! الرمز: {code}',
            loginInvite: '🎉 تمت دعوتك إلى غرفة بوكر خاصة — سجّل الدخول للانضمام!'
        }
    };

    function rt(key) {
        var pack = ROOM_I18N[currentLang] || ROOM_I18N.en;
        return pack[key] || ROOM_I18N.en[key] || key;
    }

    function firstName(name) {
        return (name || 'Anonymous').split(' ')[0];
    }

    function escapeHtml(s) {
        var div = document.createElement('div');
        div.textContent = s || '';
        return div.innerHTML;
    }

    function cadenceEmoji(cadence) {
        return cadence === 'hourly' ? '⏱' : cadence === 'weekly' ? '🗓' : '📅';
    }

    function cadenceLabel(cadence) {
        return cadence === 'hourly' ? rt('cadenceHourly') : cadence === 'weekly' ? rt('cadenceWeekly') : rt('cadenceDaily');
    }

    // --- weekly rebuys persistence (device-local, keyed to current ISO week) ---
    function loadWeeklyRebuys() {
        try {
            var raw = localStorage.getItem('vp_weekly_rebuys');
            if (raw) {
                var o = JSON.parse(raw);
                if (o.weekKey === getWeekKey()) return o.count || 0;
            }
        } catch (e) { /* private mode etc. */ }
        return 0;
    }

    function saveWeeklyRebuys() {
        try {
            localStorage.setItem('vp_weekly_rebuys', JSON.stringify({ weekKey: getWeekKey(), count: weeklyRebuys }));
        } catch (e) { /* private mode etc. */ }
    }

    // --- lifecycle ---
    window.initRooms = function(user) {
        checkWeekReset();
        applyRoomLang();
        loadMyRooms(user).then(function() {
            handleInviteParam(user);
        });
    };

    window.teardownRooms = function() {
        myRooms = [];
        activeRoomId = null;
        roomPrevRanks = {};
        pendingInviteCode = null;
        renderRoomTabs();
        closeRoomModal();
        if (roomEventsUnsubscribe) {
            roomEventsUnsubscribe();
            roomEventsUnsubscribe = null;
        }
    };

    function loadMyRooms(user) {
        return db.collection('room_members').where('uid', '==', user.uid).get().then(function(snap) {
            var roomIds = [];
            snap.forEach(function(doc) { roomIds.push(doc.data().roomId); });
            if (roomIds.length === 0) {
                myRooms = [];
                renderRoomTabs();
                return;
            }
            return Promise.all(roomIds.map(function(id) {
                return db.collection('rooms').doc(id).get();
            })).then(function(docs) {
                myRooms = docs.filter(function(d) { return d.exists; }).map(function(d) {
                    var r = d.data();
                    r.id = d.id;
                    return r;
                });
                if (!activeRoomId || !myRooms.some(function(r) { return r.id === activeRoomId; })) {
                    activeRoomId = myRooms.length ? myRooms[0].id : null;
                }
                renderRoomTabs();
                syncWeeklyRebuysFromRooms(user);
                refreshRoomLeaderboard();
                listenToActiveRoomEvents(activeRoomId);
            });
        }).catch(function(err) { console.error('loadMyRooms:', err); });
    }

    function syncWeeklyRebuysFromRooms(user) {
        // Weekly rebuys live in localStorage (per device); recover the max from any weekly room doc
        myRooms.filter(function(r) { return r.cadence === 'weekly'; }).forEach(function(r) {
            var docId = r.id + '_' + getWeekKey() + '_' + user.uid;
            db.collection('room_scores').doc(docId).get().then(function(doc) {
                if (doc.exists && (doc.data().rebuys || 0) > weeklyRebuys) {
                    weeklyRebuys = doc.data().rebuys;
                    saveWeeklyRebuys();
                }
            }).catch(function() {});
        });
    }

    // --- create / join / leave ---
    function generateRoomCode() {
        var code = '';
        for (var i = 0; i < 6; i++) {
            code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
        }
        return code;
    }

    function addMembership(roomId, user) {
        return db.collection('room_members').doc(roomId + '_' + user.uid).set({
            roomId: roomId,
            uid: user.uid,
            displayName: user.displayName || '',
            photoURL: user.photoURL || '',
            joinedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    }

    function submitCreateRoom() {
        var user = auth.currentUser;
        if (!user) return;
        if (myRooms.length >= MAX_JOINED_ROOMS) { showRoomError(rt('errMax')); return; }
        var name = document.getElementById('room-name-input').value.trim();
        if (!name) { showRoomError(rt('errName')); return; }

        var code = generateRoomCode();
        db.collection('rooms').doc(code).get().then(function(existing) {
            if (existing.exists) code = generateRoomCode(); // 31^6 space — one retry is plenty
            var room = {
                name: name,
                code: code,
                ownerUid: user.uid,
                ownerName: firstName(user.displayName),
                cadence: roomModalCadence,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            return db.collection('rooms').doc(code).set(room).then(function() {
                return addMembership(code, user);
            }).then(function() {
                room.id = code;
                myRooms.push(room);
                activeRoomId = code;
                roomPrevRanks = {};
                renderRoomTabs();
                refreshRoomLeaderboard();
                openShareView(room);
                if (window.egOnRoomEvent) window.egOnRoomEvent('create');
            });
        }).catch(function(err) { showRoomError(err.message); });
    }

    function submitJoinRoom() {
        var code = document.getElementById('room-code-input').value.trim().toUpperCase();
        joinRoomByCode(code);
    }

    function joinRoomByCode(code) {
        var user = auth.currentUser;
        if (!user || !code) return;
        if (myRooms.some(function(r) { return r.id === code; })) {
            switchRoom(code);
            closeRoomModal();
            return;
        }
        if (myRooms.length >= MAX_JOINED_ROOMS) { showRoomError(rt('errMax')); return; }
        db.collection('rooms').doc(code).get().then(function(doc) {
            if (!doc.exists) { showRoomError(rt('errNotFound')); return; }
            return addMembership(code, user).then(function() {
                var room = doc.data();
                room.id = code;
                myRooms.push(room);
                switchRoom(code);
                closeRoomModal();
                if (window.egOnRoomEvent) window.egOnRoomEvent('join');
            });
        }).catch(function(err) { showRoomError(err.message); });
    }

    function leaveActiveRoom() {
        var user = auth.currentUser;
        var room = getActiveRoom();
        if (!user || !room) return;
        if (!confirm(rt('leaveConfirm'))) return;
        db.collection('room_members').doc(room.id + '_' + user.uid).delete().then(function() {
            myRooms = myRooms.filter(function(r) { return r.id !== room.id; });
            activeRoomId = myRooms.length ? myRooms[0].id : null;
            roomPrevRanks = {};
            renderRoomTabs();
            refreshRoomLeaderboard();
        }).catch(function(err) { console.error('leaveRoom:', err); });
    }

    function getActiveRoom() {
        return myRooms.find(function(r) { return r.id === activeRoomId; }) || null;
    }

    function switchRoom(roomId) {
        activeRoomId = roomId;
        roomPrevRanks = {};
        renderRoomTabs();
        refreshRoomLeaderboard();
        listenToActiveRoomEvents(roomId);
    }

    // --- period keys ---
    function getPeriodKey(cadence, date) {
        if (cadence === 'hourly') return getHourKey(date);
        if (cadence === 'weekly') return getWeekKey(date);
        return getDayKey(date);
    }

    function getPrevPeriodDate(cadence) {
        var ms = cadence === 'hourly' ? 3600e3 : cadence === 'weekly' ? 7 * 86400e3 : 86400e3;
        return new Date(Date.now() - ms);
    }

    // --- score writes (called after every hand) ---
    window.updateRoomScores = function(handType) {
        var user = auth.currentUser;
        if (!user || myRooms.length === 0) return;
        checkWeekReset();
        var handRank = HAND_RANK[handType] || 0;
        myRooms.forEach(function(room) {
            var periodKey = getPeriodKey(room.cadence);
            var rebuys = room.cadence === 'hourly' ? hourlyRebuys :
                         room.cadence === 'weekly' ? weeklyRebuys : dailyRebuys;
            var score = balance - 100 * (1 + rebuys);
            var ref = db.collection('room_scores').doc(room.id + '_' + periodKey + '_' + user.uid);
            ref.get().then(function(doc) {
                if (doc.exists) {
                    var prevBestRank = HAND_RANK[doc.data().bestHand] || 0;
                    return ref.update({
                        score: score,
                        rebuys: rebuys,
                        hands: firebase.firestore.FieldValue.increment(1),
                        bestHand: handRank > prevBestRank ? handType : doc.data().bestHand,
                        level: egLevel,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
                return ref.set({
                    roomPeriodKey: room.id + '_' + periodKey,
                    roomId: room.id,
                    periodKey: periodKey,
                    uid: user.uid,
                    displayName: user.displayName || '',
                    photoURL: user.photoURL || '',
                    score: score,
                    rebuys: rebuys,
                    hands: 1,
                    bestHand: handType,
                    level: egLevel,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }).then(function() {
                if (room.id === activeRoomId) refreshRoomLeaderboard();
            }).catch(function(err) { console.error('room score:', err); });
        });
    };

    // --- leaderboard ---
    function refreshRoomLeaderboard() {
        var user = auth.currentUser;
        var room = getActiveRoom();
        var area = document.getElementById('room-lb-area');
        var empty = document.getElementById('rooms-empty');
        if (!area || !empty) return;
        if (!room || !user) {
            area.classList.add('rm-hidden');
            empty.classList.remove('rm-hidden');
            return;
        }
        empty.classList.add('rm-hidden');
        area.classList.remove('rm-hidden');
        var periodKey = getPeriodKey(room.cadence);
        // Equality-only query (no orderBy) → no composite index needed; sort client-side
        db.collection('room_scores')
            .where('roomPeriodKey', '==', room.id + '_' + periodKey)
            .limit(50)
            .get()
            .then(function(snap) { renderRoomLb(snap, room, user); })
            .catch(function(err) { console.error('room lb:', err); });
        fetchLastPeriodWinner(room);
    }

    function renderRoomLb(snap, room, user) {
        if (room.id !== activeRoomId) return; // user switched rooms mid-flight
        var rows = [];
        snap.forEach(function(doc) { rows.push(doc.data()); });
        rows.sort(function(a, b) { return (b.score || 0) - (a.score || 0); });

        var tbody = document.getElementById('room-lb-body');
        tbody.innerHTML = '';
        if (rows.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="lb-empty">' + rt('playToJoin') + '</td></tr>';
            setRoomNudge(null);
            roomPrevRanks = {};
            return;
        }

        var myRank = null, meRow = null, aboveRow = null;
        rows.forEach(function(d, idx) {
            var rank = idx + 1;
            var isYou = d.uid === user.uid;
            if (isYou) {
                myRank = rank;
                meRow = d;
                aboveRow = idx > 0 ? rows[idx - 1] : null;
            }
            var photo = d.photoURL ? '<img src="' + d.photoURL + '">' : '';
            var badge = isYou ? '<span class="lb-badge lb-badge-you">YOU</span>' : '';
            var rebuyBadge = d.rebuys > 0 ? '<span class="lb-badge lb-badge-rebuys">♻' + d.rebuys + '</span>' : '';
            var isOnline = false;
            if (d.updatedAt && typeof d.updatedAt.toDate === 'function') {
                if (Date.now() - d.updatedAt.toDate().getTime() < 3 * 60 * 1000) isOnline = true;
            } else if (d.updatedAt === null) {
                isOnline = true; // pending local write
            }
            var onlineIndicator = isOnline ? '<span class="online-fire" title="Online">🔥</span>' : '';
            var rankClass = rank <= 3 ? ' lb-rank-' + rank : '';
            var s = d.score || 0;
            var scoreClass = s > 0 ? 'lb-positive lb-score' : s < 0 ? 'lb-negative lb-score' : 'lb-zero lb-score';
            var scoreText = s > 0 ? '+' + s : '' + s;
            var medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank;

            var lvlBadge = d.level ? '<span class="lvl-badge">' + d.level + '</span>' : '';
            var row = document.createElement('tr');
            row.dataset.uid = d.uid;
            if (isYou) row.className = 'lb-you';
            row.innerHTML =
                '<td class="lb-rank' + rankClass + '">' + medal + '</td>' +
                '<td><span class="lb-name" onclick="egOpenProfile(\'' + d.uid + '\')">' + photo + escapeHtml(firstName(d.displayName)) + '</span>' + lvlBadge + badge + rebuyBadge + onlineIndicator + '</td>' +
                '<td class="' + scoreClass + '">' + scoreText + '</td>' +
                '<td>' + (d.hands || 0) + '</td>';
            tbody.appendChild(row);
        });

        // Overtake detection: my rank got worse and someone who was below me is now above
        var overtaker = null;
        if (myRank !== null && roomPrevRanks[user.uid] && myRank > roomPrevRanks[user.uid]) {
            for (var i = 0; i < myRank - 1; i++) {
                var d = rows[i];
                if (roomPrevRanks[d.uid] && roomPrevRanks[d.uid] > roomPrevRanks[user.uid]) {
                    overtaker = d;
                    break;
                }
            }
        }
        var newRanks = {};
        rows.forEach(function(d, idx) { newRanks[d.uid] = idx + 1; });
        roomPrevRanks = newRanks;

        if (overtaker) {
            setRoomNudge(rt('passedYou').replace('{name}', firstName(overtaker.displayName)), true);
        } else if (myRank === 1 && rows.length > 1) {
            var gap = (meRow.score || 0) - (rows[1].score || 0);
            setRoomNudge(rt('lead').replace('{n}', gap));
        } else if (myRank !== null && aboveRow) {
            var need = (aboveRow.score || 0) - (meRow.score || 0) + 1;
            setRoomNudge(rt('toPass').replace('{n}', need).replace('{name}', firstName(aboveRow.displayName)));
        } else {
            setRoomNudge(null);
        }
    }

    function setRoomNudge(text, overtaken) {
        var el = document.getElementById('room-nudge');
        if (!el) return;
        if (!text) {
            el.classList.add('rm-hidden');
            return;
        }
        el.textContent = text;
        el.classList.toggle('overtaken', !!overtaken);
        el.classList.remove('rm-hidden');
    }

    function fetchLastPeriodWinner(room) {
        var el = document.getElementById('room-winner-line');
        if (!el) return;
        var prevKey = getPeriodKey(room.cadence, getPrevPeriodDate(room.cadence));
        db.collection('room_scores')
            .where('roomPeriodKey', '==', room.id + '_' + prevKey)
            .limit(50)
            .get()
            .then(function(snap) {
                if (room.id !== activeRoomId) return;
                var rows = [];
                snap.forEach(function(d) { rows.push(d.data()); });
                if (!rows.length) { el.classList.add('rm-hidden'); return; }
                rows.sort(function(a, b) { return (b.score || 0) - (a.score || 0); });
                var w = rows[0];
                var s = w.score || 0;
                el.innerHTML = '🏆 ' + rt('lastWinner') + ': <b>' + escapeHtml(firstName(w.displayName)) + '</b> (' + (s > 0 ? '+' + s : s) + ')';
                el.classList.remove('rm-hidden');
            })
            .catch(function() { el.classList.add('rm-hidden'); });
    }

    function renderRoomTabs() {
        var wrap = document.getElementById('rooms-tabs');
        if (!wrap) return;
        wrap.innerHTML = '';
        myRooms.forEach(function(room) {
            var b = document.createElement('button');
            b.className = 'room-tab' + (room.id === activeRoomId ? ' active' : '');
            b.textContent = cadenceEmoji(room.cadence) + ' ' + room.name;
            b.onclick = function() { switchRoom(room.id); };
            wrap.appendChild(b);
        });
    }

    // --- countdown (invoked from updateCountdown every second) ---
    window.updateRoomCountdown = function() {
        var room = getActiveRoom();
        var el = document.getElementById('room-countdown');
        if (!room || !el) return;
        var now = new Date();
        var next = new Date(now);
        if (room.cadence === 'hourly') {
            next.setMinutes(60, 0, 0);
        } else if (room.cadence === 'daily') {
            next.setHours(24, 0, 0, 0);
        } else {
            var dayNr = (now.getDay() + 6) % 7; // Mon=0
            next.setDate(now.getDate() + (7 - dayNr));
            next.setHours(0, 0, 0, 0);
        }
        var s = Math.max(0, Math.floor((next - now) / 1000));
        var d = Math.floor(s / 86400);
        var h = Math.floor((s % 86400) / 3600);
        var m = Math.floor((s % 3600) / 60);
        var sec = s % 60;
        el.textContent = (d > 0 ? d + 'd ' : '') +
            String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
    };

    // --- modal ---
    function openRoomModal(view) {
        document.getElementById('room-modal').classList.remove('rm-hidden');
        ['create', 'join', 'share', 'invite'].forEach(function(v) {
            document.getElementById('room-view-' + v).classList.toggle('rm-hidden', v !== view);
        });
        showRoomError('');
        if (view === 'create') document.getElementById('room-name-input').focus();
        if (view === 'join') document.getElementById('room-code-input').focus();
    }

    function closeRoomModal() {
        var modal = document.getElementById('room-modal');
        if (modal) modal.classList.add('rm-hidden');
        pendingInviteCode = null;
    }

    function showRoomError(msg) {
        var el = document.getElementById('room-modal-error');
        if (el) el.textContent = msg || '';
    }

    function pickCadence(cadence) {
        roomModalCadence = cadence;
        document.querySelectorAll('.cadence-btn').forEach(function(b) {
            b.classList.toggle('selected', b.dataset.cadence === cadence);
        });
    }

    // --- share / invite ---
    function roomLink(code) {
        return location.origin + location.pathname + '?room=' + code;
    }

    function openShareView(room) {
        document.getElementById('share-code').textContent = room.id;
        document.getElementById('share-link').value = roomLink(room.id);
        var waText = rt('waText').replace('{name}', room.name).replace('{code}', room.id);
        document.getElementById('whatsapp-share').href =
            'https://wa.me/?text=' + encodeURIComponent(waText + '\n' + roomLink(room.id));
        openRoomModal('share');
    }

    function openShareForActiveRoom() {
        var room = getActiveRoom();
        if (room) openShareView(room);
    }

    function copyShareLink() {
        var link = document.getElementById('share-link').value;
        var btn = document.getElementById('rm-copy-btn');
        var done = function() {
            btn.textContent = rt('copied');
            setTimeout(function() { btn.textContent = rt('copyLink'); }, 1500);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(link).then(done).catch(function() {
                document.getElementById('share-link').select();
                document.execCommand('copy');
                done();
            });
        } else {
            document.getElementById('share-link').select();
            document.execCommand('copy');
            done();
        }
    }

    function handleInviteParam(user) {
        var code = '';
        try {
            code = (sessionStorage.getItem('vp_pending_room_code') || '').trim().toUpperCase();
            sessionStorage.removeItem('vp_pending_room_code');
        } catch (e) {}
        if (!code) return;
        if (myRooms.some(function(r) { return r.id === code; })) {
            switchRoom(code);
            return;
        }
        db.collection('rooms').doc(code).get().then(function(doc) {
            if (!doc.exists) return;
            var room = doc.data();
            pendingInviteCode = code;
            document.getElementById('rm-invite-by').textContent =
                rt('invitedBy').replace('{name}', room.ownerName || '?');
            document.getElementById('rm-invite-name').textContent = '🃏 ' + room.name;
            document.getElementById('rm-invite-cadence').textContent =
                cadenceEmoji(room.cadence) + ' ' + cadenceLabel(room.cadence);
            openRoomModal('invite');
        }).catch(function(err) { console.error('invite lookup:', err); });
    }

    function acceptInvite() {
        if (pendingInviteCode) joinRoomByCode(pendingInviteCode);
    }

    // --- i18n for room UI ---
    window.applyRoomLang = function() {
        var set = function(id, text) {
            var el = document.getElementById(id);
            if (el) el.textContent = text;
        };
        set('rooms-title', '🃏 ' + rt('roomsTitle'));
        set('rooms-empty', rt('noRooms'));
        set('create-room-btn', rt('createRoom'));
        set('join-room-btn', rt('joinRoom'));
        set('room-share-btn', rt('invite'));
        set('room-leave-btn', rt('leave'));
        set('room-resets-label', rt('resetsIn'));
        set('rm-create-title', rt('createTitle'));
        set('rm-create-sub', rt('createSub'));
        set('rm-cadence-prompt', rt('cadencePrompt'));
        set('cad-hourly', '⏱ ' + rt('cadenceHourly'));
        set('cad-daily', '📅 ' + rt('cadenceDaily'));
        set('cad-weekly', '🗓 ' + rt('cadenceWeekly'));
        set('rm-create-btn', rt('createBtn'));
        set('rm-join-title', rt('joinTitle'));
        set('rm-join-sub', rt('joinSub'));
        set('rm-join-btn', rt('joinBtn'));
        set('rm-share-title', rt('shareTitle'));
        set('rm-share-sub', rt('shareSub'));
        set('rm-code-label', rt('codeLabel'));
        set('rm-copy-btn', rt('copyLink'));
        set('rm-wa-label', rt('whatsapp'));
        set('rm-invite-title', rt('inviteTitle'));
        set('rm-invite-btn', rt('inviteJoin'));
        
        set('pf-ref-title', rt('refInviteTitle'));
        set('pf-ref-sub', rt('refInviteSub'));
        set('pf-ref-wa-label', rt('whatsapp'));
        
        var nameInput = document.getElementById('room-name-input');
        if (nameInput) nameInput.placeholder = rt('roomNamePh');
    };

    // Invite hint on the login screen when arriving via a room link
    (function() {
        if (new URLSearchParams(location.search).get('room') || sessionStorage.getItem('vp_pending_room_code')) {
            var sub = document.querySelector('.login-subtitle');
            if (sub) sub.textContent = rt('loginInvite');
        }
    })();

    setInterval(refreshRoomLeaderboard, 30000);

    // ===================== Engagement: Phase 1 =====================
    // Daily login rewards, comeback bonus, win streaks, daily challenges

    var EG_REWARDS = [50, 75, 100, 150, 200, 300, 500];
    var EG_COMEBACK_SHORT_MS = 24 * 3600e3;
    var EG_COMEBACK_LONG_MS = 72 * 3600e3;
    var EG_COMEBACK_SHORT_CREDITS = 100;
    var EG_COMEBACK_LONG_CREDITS = 200;

    var egUser = null;
    var egModalQueue = [];
    var egRewardState = null;    // {day, streak, longestStreak, totalClaimed}
    var egComebackAmount = 0;
    var egChallenges = null;     // {dateKey, list: [{id, target, progress, completed, reward}]}
    var egChallengesCollapsed = false;