// Uploads the signed release AAB to Google Play and rolls it out to a
// track, via the Play Developer API.
//
// Usage:
//   node scripts/play-release-upload.js validate   # dry run, edit discarded
//   node scripts/play-release-upload.js commit     # real upload + rollout
//
// Auth: service account at ~/.config/mcp/google-play-service-account.json
// (same credential the google-play MCP uses; has upload+commit permission).

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { JWT } = require('google-auth-library');
const { checkAabBundle } = require('./lib/bundleFreshness');

const PKG = 'com.micorlov.videopoker';
const TRACK = 'production';
const AAB_PATH = path.join(__dirname, '..', 'android/app/build/outputs/bundle/release/app-release.aab');
const API = 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications/' + PKG;
const UPLOAD_API = 'https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/' + PKG;
const KEY_FILE = path.join(process.env.HOME, '.config/mcp/google-play-service-account.json');

const RELEASE_NOTES = {
    'en-US': 'Daily leaderboard fix: your daily score is now stamped by the server clock, so a hand played near midnight lands on the right day.\n\nSync fix: saves that used to fail quietly are retried, so your chips and stats stay where you left them.\n\nLighter on battery and data: the game syncs far less often in the background.',
    'es-ES': 'Corrección de la clasificación diaria: tu puntuación del día ahora se marca con el reloj del servidor, así una mano jugada cerca de medianoche cuenta en el día correcto.\n\nCorrección de sincronización: los guardados que fallaban en silencio se reintentan, así tus fichas y estadísticas se quedan donde las dejaste.\n\nMenos batería y datos: el juego sincroniza mucho menos en segundo plano.',
    'pt-BR': 'Correção no ranking diário: sua pontuação do dia agora usa o relógio do servidor, então uma mão jogada perto da meia-noite entra no dia certo.\n\nCorreção de sincronização: os salvamentos que falhavam em silêncio são refeitos, então suas fichas e estatísticas ficam onde você parou.\n\nMenos bateria e dados: o jogo sincroniza bem menos em segundo plano.',
    'de-DE': 'Tagesranglisten-Fix: Dein Tagesergebnis wird jetzt mit der Serveruhr gestempelt, damit eine Hand kurz vor Mitternacht am richtigen Tag zählt.\n\nSync-Fix: Speichervorgänge, die still fehlschlugen, werden wiederholt – deine Chips und Statistiken bleiben, wo du sie gelassen hast.\n\nSchonender für Akku und Datenvolumen: Das Spiel synchronisiert im Hintergrund deutlich seltener.',
    'fr-FR': 'Correctif du classement quotidien : votre score du jour est désormais horodaté par l\'horloge du serveur, pour qu\'une main jouée près de minuit compte le bon jour.\n\nCorrectif de synchronisation : les sauvegardes qui échouaient en silence sont réessayées, vos jetons et statistiques restent là où vous les avez laissés.\n\nMoins de batterie et de données : le jeu se synchronise bien moins souvent en arrière-plan.',
    'it-IT': 'Correzione della classifica giornaliera: il tuo punteggio del giorno ora usa l\'orologio del server, così una mano giocata vicino a mezzanotte finisce nel giorno giusto.\n\nCorrezione della sincronizzazione: i salvataggi che fallivano in silenzio vengono ritentati, quindi fiche e statistiche restano dove le hai lasciate.\n\nMeno batteria e dati: il gioco si sincronizza molto meno in background.',
    'pl-PL': 'Poprawka rankingu dziennego: Twój dzienny wynik jest teraz oznaczany zegarem serwera, więc rozdanie tuż przed północą trafia do właściwego dnia.\n\nPoprawka synchronizacji: zapisy, które po cichu się nie udawały, są ponawiane — żetony i statystyki zostają na swoim miejscu.\n\nMniej baterii i danych: gra synchronizuje się w tle znacznie rzadziej.',
    'ru-RU': 'Исправление ежедневного рейтинга: дневной результат теперь отмечается по часам сервера, поэтому раздача около полуночи попадает в нужный день.\n\nИсправление синхронизации: сохранения, которые молча не проходили, теперь повторяются — фишки и статистика остаются на месте.\n\nМеньше расхода батареи и трафика: игра синхронизируется в фоне намного реже.',
    'tr-TR': 'Günlük sıralama düzeltmesi: Günlük puanın artık sunucu saatiyle damgalanıyor, böylece gece yarısına yakın oynanan el doğru güne yazılıyor.\n\nEşitleme düzeltmesi: Sessizce başarısız olan kayıtlar yeniden deneniyor; çiplerin ve istatistiklerin bıraktığın yerde kalıyor.\n\nDaha az pil ve veri: Oyun arka planda çok daha seyrek eşitleniyor.',
    'id': 'Perbaikan papan peringkat harian: skor harianmu kini dicap dengan jam server, jadi kartu yang dimainkan menjelang tengah malam masuk ke hari yang benar.\n\nPerbaikan sinkronisasi: penyimpanan yang diam-diam gagal kini dicoba ulang, sehingga chip dan statistikmu tetap seperti saat kamu tinggalkan.\n\nLebih hemat baterai dan kuota: game jauh lebih jarang menyinkronkan di latar belakang.',
    'hi-IN': 'दैनिक लीडरबोर्ड ठीक किया: आपका दैनिक स्कोर अब सर्वर की घड़ी से दर्ज होता है, इसलिए आधी रात के आसपास खेला गया हाथ सही दिन में गिना जाता है।\n\nसिंक ठीक किया: जो सेव चुपचाप विफल हो जाते थे, अब दोबारा आज़माए जाते हैं — आपके चिप्स और आँकड़े वहीं रहते हैं जहाँ आपने छोड़े थे।\n\nबैटरी और डेटा की बचत: गेम बैकग्राउंड में अब काफ़ी कम सिंक करता है।',
    'ja-JP': 'デイリーランキングの修正: 1日のスコアがサーバー時刻で記録されるようになり、日付が変わる直前のハンドも正しい日に入ります。\n\n同期の修正: これまで静かに失敗していた保存を再試行します。チップと成績はそのまま残ります。\n\nバッテリーと通信量を節約: バックグラウンドでの同期回数を大幅に減らしました。',
    'ko-KR': '일일 리더보드 수정: 일일 점수가 서버 시각으로 기록되어 자정 무렵에 친 핸드도 올바른 날짜에 반영됩니다.\n\n동기화 수정: 조용히 실패하던 저장을 다시 시도합니다. 칩과 통계가 그대로 유지됩니다.\n\n배터리와 데이터 절약: 백그라운드 동기화 횟수를 크게 줄였습니다.',
    'zh-CN': '每日排行榜修复：每日分数现在以服务器时间记录，临近午夜打出的牌也会计入正确的日期。\n\n同步修复：此前悄悄失败的存档现在会自动重试，筹码和统计数据保持原样。\n\n更省电省流量：游戏在后台的同步次数大幅减少。',
    'iw-IL': 'תיקון בטבלת המובילים היומית: הניקוד היומי שלך נרשם עכשיו לפי שעון השרת, כך שיד ששוחקה סמוך לחצות נספרת ביום הנכון.\n\nתיקון סנכרון: שמירות שנכשלו בשקט נשלחות שוב, כך שהז\'יטונים והסטטיסטיקות שלך נשארים במקום.\n\nפחות סוללה ונתונים: המשחק מסתנכרן ברקע הרבה פחות.',
    'ar': 'إصلاح لوحة الصدارة اليومية: تُسجَّل نتيجتك اليومية الآن بتوقيت الخادم، لذا تُحتسب اليد التي تلعبها قرب منتصف الليل في اليوم الصحيح.\n\nإصلاح المزامنة: تُعاد الآن محاولة عمليات الحفظ التي كانت تفشل بصمت، فتبقى رقائقك وإحصاءاتك كما تركتها.\n\nاستهلاك أقل للبطارية والبيانات: قلّت كثيرًا مزامنة اللعبة في الخلفية.',
};

const mode = process.argv[2];
if (mode !== 'validate' && mode !== 'commit') {
    console.error('usage: node play-release-upload.js validate|commit');
    process.exit(1);
}

async function api(token, method, url, body, contentType) {
    for (let attempt = 1; attempt <= 3; attempt++) {
        const res = await fetch(url, {
            method,
            headers: {
                Authorization: 'Bearer ' + token,
                ...(contentType ? { 'Content-Type': contentType } : {})
            },
            body
        });
        if (res.status >= 500 && attempt < 3) {
            console.warn(`  ${res.status} on ${method} ${url.slice(API.length)} — retry ${attempt}`);
            await new Promise(r => setTimeout(r, 1500 * attempt));
            continue;
        }
        if (!res.ok) {
            throw new Error(`${method} ${url} -> ${res.status}: ${(await res.text()).slice(0, 500)}`);
        }
        return res.status === 204 ? null : res.json();
    }
}

(async () => {
    for (const [lang, text] of Object.entries(RELEASE_NOTES)) {
        if (text.length > 500) throw new Error(`release notes for ${lang} are ${text.length} chars, over the 500 cap`);
    }

    // Refuse to upload an AAB whose web bundle predates the sources: rebuild
    // video_poker.html from js/ + styles/ and require the AAB to match it.
    const root = path.join(__dirname, '..');
    execFileSync('node', ['build.js'], { cwd: root, stdio: 'ignore' });
    const freshness = checkAabBundle(AAB_PATH, path.join(root, 'video_poker.html'));
    if (!freshness.ok) throw new Error('stale bundle: ' + freshness.reason);
    console.log('bundle check ok — AAB matches the current sources');

    const key = JSON.parse(fs.readFileSync(KEY_FILE, 'utf8'));
    const jwt = new JWT({
        email: key.client_email,
        key: key.private_key,
        scopes: ['https://www.googleapis.com/auth/androidpublisher']
    });
    const { token } = await jwt.getAccessToken();

    const edit = await api(token, 'POST', `${API}/edits`, '{}', 'application/json');
    console.log('edit', edit.id);

    const bundle = await api(token, 'POST',
        `${UPLOAD_API}/edits/${edit.id}/bundles?uploadType=media`,
        fs.readFileSync(AAB_PATH), 'application/octet-stream');
    console.log('uploaded bundle, versionCode', bundle.versionCode);

    await api(token, 'PUT', `${API}/edits/${edit.id}/tracks/${TRACK}`, JSON.stringify({
        releases: [{
            versionCodes: [String(bundle.versionCode)],
            status: 'completed',
            releaseNotes: Object.entries(RELEASE_NOTES).map(([language, text]) => ({ language, text }))
        }]
    }), 'application/json');
    console.log('track', TRACK, 'set to versionCode', bundle.versionCode);

    if (mode === 'validate') {
        await api(token, 'POST', `${API}/edits/${edit.id}:validate`, '{}', 'application/json');
        await api(token, 'DELETE', `${API}/edits/${edit.id}`);
        console.log('VALIDATED ok — edit discarded, nothing published');
    } else {
        await api(token, 'POST', `${API}/edits/${edit.id}:commit`, '{}', 'application/json');
        console.log('COMMITTED — release submitted for review / rollout');
    }
})().catch(err => { console.error(err.message || err); process.exit(1); });
