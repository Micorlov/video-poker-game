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
const { JWT } = require('google-auth-library');

const PKG = 'com.micorlov.videopoker';
const TRACK = 'production';
const AAB_PATH = path.join(__dirname, '..', 'android/app/build/outputs/bundle/release/app-release.aab');
const API = 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications/' + PKG;
const UPLOAD_API = 'https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/' + PKG;
const KEY_FILE = path.join(process.env.HOME, '.config/mcp/google-play-service-account.json');

const RELEASE_NOTES = {
    'en-US': "Sign-in fix: creating your account on a weak connection could leave your progress unsaved. The app now retries automatically.\n\nLeaderboard fix: your daily score on the Friends tab now always matches the Daily leaderboard.",
    'es-ES': "Corrección de inicio de sesión: crear tu cuenta con una conexión débil podía dejar tu progreso sin guardar. La app ahora lo reintenta automáticamente.\n\nCorrección de clasificación: tu puntuación diaria en la pestaña Amigos ahora siempre coincide con la clasificación Diaria.",
    'pt-BR': "Correção no login: criar sua conta com uma conexão fraca podia deixar seu progresso sem salvar. O app agora tenta novamente automaticamente.\n\nCorreção no ranking: sua pontuação diária na aba Amigos agora sempre corresponde ao ranking Diário.",
    'de-DE': "Anmelde-Fix: Beim Erstellen deines Kontos über eine schwache Verbindung konnte dein Fortschritt ungespeichert bleiben. Die App versucht es jetzt automatisch erneut.\n\nRanglisten-Fix: Dein Tagesergebnis im Tab Freunde stimmt jetzt immer mit der Tagesrangliste überein.",
    'fr-FR': "Correctif de connexion : créer votre compte avec une connexion faible pouvait laisser votre progression non sauvegardée. L'appli réessaie désormais automatiquement.\n\nCorrectif du classement : votre score du jour dans l'onglet Amis correspond désormais toujours au classement Quotidien.",
    'it-IT': "Correzione dell'accesso: creare l'account con una connessione debole poteva lasciare i progressi non salvati. Ora l'app riprova automaticamente.\n\nCorrezione della classifica: il tuo punteggio giornaliero nella scheda Amici ora corrisponde sempre alla classifica Giornaliera.",
    'pl-PL': "Poprawka logowania: tworzenie konta przy słabym połączeniu mogło pozostawić postępy niezapisane. Aplikacja ponawia teraz próbę automatycznie.\n\nPoprawka rankingu: Twój dzienny wynik w karcie Znajomi zawsze zgadza się teraz z rankingiem dziennym.",
    'ru-RU': "Исправление входа: при создании аккаунта на слабом соединении прогресс мог остаться несохранённым. Теперь приложение повторяет попытку автоматически.\n\nИсправление рейтинга: ваш дневной результат на вкладке «Друзья» теперь всегда совпадает с дневным рейтингом.",
    'tr-TR': "Giriş düzeltmesi: Zayıf bağlantıda hesap oluştururken ilerlemeniz kaydedilmeden kalabiliyordu. Uygulama artık otomatik olarak yeniden dener.\n\nLiderlik tablosu düzeltmesi: Arkadaşlar sekmesindeki günlük skorunuz artık her zaman Günlük liderlik tablosuyla aynı.",
    'id': "Perbaikan masuk: membuat akun saat koneksi lemah bisa membuat progres tidak tersimpan. Aplikasi kini mencoba lagi secara otomatis.\n\nPerbaikan papan peringkat: skor harian Anda di tab Teman kini selalu sama dengan papan peringkat Harian.",
    'hi-IN': "साइन-इन सुधार: कमज़ोर कनेक्शन पर खाता बनाते समय आपकी प्रगति सेव न होने की समस्या ठीक की गई। ऐप अब अपने आप दोबारा कोशिश करता है।\n\nलीडरबोर्ड सुधार: फ़्रेंड्स टैब में आपका दैनिक स्कोर अब हमेशा दैनिक लीडरबोर्ड से मेल खाता है।",
    'ja-JP': "サインインの修正：通信が不安定なときにアカウントを作成すると、進行状況が保存されないことがありました。アプリが自動的に再試行するようになりました。\n\nランキングの修正：フレンドタブのデイリースコアが、常にデイリーランキングと一致するようになりました。",
    'ko-KR': "로그인 수정: 연결이 약할 때 계정을 만들면 진행 상황이 저장되지 않을 수 있었습니다. 이제 앱이 자동으로 다시 시도합니다.\n\n순위표 수정: 친구 탭의 일일 점수가 이제 항상 일일 순위표와 일치합니다.",
    'zh-CN': "登录修复：在网络较弱时创建账户，可能导致进度未能保存。应用现在会自动重试。\n\n排行榜修复：“好友”标签中的每日分数现在始终与每日排行榜一致。",
    'iw-IL': "תיקון התחברות: יצירת חשבון בחיבור חלש הייתה עלולה להשאיר את ההתקדמות לא שמורה. האפליקציה מנסה עכשיו שוב אוטומטית.\n\nתיקון טבלת המובילים: הניקוד היומי שלך בלשונית החברים תואם עכשיו תמיד את טבלת המובילים היומית.",
    'ar': "إصلاح تسجيل الدخول: إنشاء حسابك عبر اتصال ضعيف كان قد يترك تقدمك دون حفظ. يعيد التطبيق المحاولة تلقائيًا الآن.\n\nإصلاح لوحة الصدارة: نتيجتك اليومية في تبويب الأصدقاء تطابق الآن دائمًا لوحة الصدارة اليومية."
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
