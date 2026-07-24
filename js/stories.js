// Stories — personal-best tracking + story viewer overlay.
// Works offline (localStorage) with optional Firestore push when signed in.
// One story per person: the best hand they've ever won.

// --- Personal best (localStorage) ---
function getBestHand() {
    try {
        const raw = localStorage.getItem('vp_best_hand');
        if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
}

function setBestHand(handData) {
    try { localStorage.setItem('vp_best_hand', JSON.stringify(handData)); } catch (e) {}
    pushBestHandToFirestore(handData);
}

function pushBestHandToFirestore(handData) {
    const user = window.egUser;
    if (!user) return;
    firebaseSafe(function() {
        return db.collection('users').doc(user.uid).set({
            bestHand: {
                handName: handData.handName,
                mult: handData.mult,
                payout: handData.payout,
                cards: handData.cards,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            },
            // Top-level sibling field (nested map fields can't be queried with
            // a range filter) so scripts/push/bestHand.js can poll for changes
            // via where('bestHandAt', '>', cursor) instead of a Cloud Functions
            // onUpdate trigger.
            bestHandAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    });
}

// Called by game.js after every winning draw
function checkAndUpdateBestHand(handType, win, hand) {
    if (win <= 0) return;
    const current = getBestHand();
    if (current && current.payout >= win) return;

    const cards = hand.map(function(c) {
        return { rank: c.rank, suit: c.suit };
    });

    const mult = Math.round(win / bet);
    setBestHand({
        handName: handType,
        mult: mult,
        payout: win,
        cards: cards,
        updatedAt: Date.now()
    });
}

// --- Stories list assembly ---
function buildStoriesList() {
    const stories = [];
    const user = window.egUser;

    // Always include my own best hand (even if offline)
    const myBest = getBestHand();
    stories.push({
        id: 'me',
        name: 'You',
        initial: user ? (user.displayName || 'Y').charAt(0).toUpperCase() : 'Y',
        bestHand: myBest,
        bracelet: (user && typeof latestBraceletForUid === 'function') ? latestBraceletForUid(user.uid) : null,
        isMe: true
    });

    // Add friends' best hands (only if signed in and we have friend data)
    if (user && typeof friendsList !== 'undefined' && friendsList.length) {
        friendsList.forEach(function(f) {
            const bracelet = typeof latestBraceletForUid === 'function' ? latestBraceletForUid(f.uid) : null;
            if ((f.bestHand && f.bestHand.handName) || bracelet) {
                stories.push({
                    id: f.uid,
                    name: f.displayName || 'Player',
                    initial: (f.displayName || 'P').charAt(0).toUpperCase(),
                    bestHand: f.bestHand,
                    bracelet: bracelet,
                    isMe: false
                });
            }
        });
    }

    return stories;
}

function renderStoriesRow() {
    const row = document.getElementById('stories-row');
    if (!row) return;
    row.innerHTML = '';

    const stories = buildStoriesList();

    stories.forEach(function(s, i) {
        const item = document.createElement('div');
        item.className = 'story-item';
        item.onclick = function() { openStoryViewer(i); };

        const ring = document.createElement('div');
        ring.className = 'story-ring' + ((s.bestHand || s.bracelet) ? '' : ' empty');

        const avatar = document.createElement('div');
        avatar.className = 'story-avatar';
        avatar.textContent = s.initial;

        ring.appendChild(avatar);

        if (s.bracelet) {
            const badge = document.createElement('span');
            badge.className = 'bracelet-badge';
            badge.title = s.name + ' — ' + (s.bracelet.type === 'daily' ? 'Daily' : 'Hourly') + ' Bracelet';
            badge.textContent = '💍';
            ring.appendChild(badge);
        }

        const name = document.createElement('div');
        name.className = 'story-name' + (s.isMe ? ' you' : '');
        name.textContent = s.isMe ? 'You' : s.name;

        item.appendChild(ring);
        item.appendChild(name);
        row.appendChild(item);
    });
}

// --- Story Viewer ---
let storyViewerData = [];
let storyViewerIndex = 0;
let storyProgressTimer = null;
let storyProgressMs = 0;
const STORY_DURATION_MS = 5000;

function openStoryViewer(index) {
    storyViewerData = buildStoriesList();
    storyViewerIndex = Math.max(0, Math.min(index, storyViewerData.length - 1));
    renderStoryViewer();
}

function closeStoryViewer() {
    if (storyProgressTimer) {
        clearInterval(storyProgressTimer);
        storyProgressTimer = null;
    }
    const el = document.getElementById('story-viewer');
    if (el) el.remove();
}

function navigateStory(direction) {
    storyViewerIndex += direction;
    if (storyViewerIndex < 0) {
        closeStoryViewer();
        return;
    }
    if (storyViewerIndex >= storyViewerData.length) {
        closeStoryViewer();
        return;
    }
    renderStoryViewer();
}

function renderStoryViewer() {
    // Remove any existing viewer
    const existing = document.getElementById('story-viewer');
    if (existing) existing.remove();

    const story = storyViewerData[storyViewerIndex];
    if (!story) return;

    // Outer overlay (dismiss on backdrop tap) — matches design .modaloverlay
    const overlay = document.createElement('div');
    overlay.id = 'story-viewer';
    overlay.className = 'story-viewer-overlay';
    overlay.onclick = function(e) { if (e.target === overlay) closeStoryViewer(); };

    // Card — matches design .storycard
    const card = document.createElement('div');
    card.className = 'story-viewer-card';

    // Progress bars — matches design .storyprogress > .storybar > .storybarfill
    let progressHtml = '<div class="story-progress-row">';
    storyViewerData.forEach(function(s, i) {
        let fillClass = 'story-bar-fill';
        if (i < storyViewerIndex) fillClass += ' done';
        if (i === storyViewerIndex) fillClass += ' active';
        progressHtml += '<div class="story-bar"><div class="' + fillClass + '" style="width:' + (i < storyViewerIndex ? '100%' : '0%') + '"></div></div>';
    });
    progressHtml += '</div>';

    // Header
    let headerHtml = '<div class="story-viewer-header">';
    headerHtml += '<div class="story-viewer-avatar">' + story.initial + '</div>';
    headerHtml += '<div class="story-viewer-name">' + story.name + '</div>';
    headerHtml += '<button class="story-viewer-close" onclick="closeStoryViewer()">✕</button>';
    headerHtml += '</div>';

    // Body
    let bodyHtml = '<div class="story-viewer-body">';
    if (story.bestHand) {
        bodyHtml += '<div class="story-hand-name">' + story.bestHand.handName + '</div>';
        bodyHtml += '<div class="story-cards">';
        story.bestHand.cards.forEach(function(c) {
            var red = c.suit === '♥' || c.suit === '♦';
            bodyHtml += '<div class="story-card' + (red ? ' red' : '') + '">';
            bodyHtml += '<div class="story-card-rank">' + c.rank + '</div>';
            bodyHtml += '<div class="story-card-suit">' + c.suit + '</div>';
            bodyHtml += '</div>';
        });
        bodyHtml += '</div>';
        bodyHtml += '<div class="story-payout">+' + story.bestHand.payout + ' credits · ' + story.bestHand.mult + '×</div>';
    } else {
        bodyHtml += '<div class="story-hand-name" style="color:var(--text-muted)">No winning hands yet</div>';
        bodyHtml += '<div style="color:var(--text-faint);font-size:13px">Win a hand to create your story</div>';
    }
    if (story.bracelet) {
        bodyHtml += '<div class="story-bracelet-strip">💍 ' +
            (story.bracelet.type === 'daily' ? 'Daily' : 'Hourly') + ' Bracelet — ' + story.bracelet.handType +
            ' for +' + story.bracelet.winAmount + ' credits</div>';
    }
    bodyHtml += '</div>';

    // Tap zones (design: .storytapzone.left / .storytapzone.right)
    bodyHtml += '<div class="story-tap-left" onclick="event.stopPropagation();navigateStory(-1)"></div>';
    bodyHtml += '<div class="story-tap-right" onclick="event.stopPropagation();navigateStory(1)"></div>';

    card.innerHTML = progressHtml + headerHtml + bodyHtml;
    overlay.appendChild(card);
    document.body.appendChild(overlay);

    // Start progress timer
    storyProgressMs = 0;
    if (storyProgressTimer) clearInterval(storyProgressTimer);

    var fillEl = card.querySelector('.story-bar-fill.active');
    storyProgressTimer = setInterval(function() {
        storyProgressMs += 100;
        var pct = Math.min(100, (storyProgressMs / STORY_DURATION_MS) * 100);
        if (fillEl) fillEl.style.width = pct + '%';
        if (storyProgressMs >= STORY_DURATION_MS) {
            clearInterval(storyProgressTimer);
            storyProgressTimer = null;
            navigateStory(1);
        }
    }, 100);
}

// Keyboard shortcut for story viewer
document.addEventListener('keydown', function(e) {
    if (!document.getElementById('story-viewer')) return;
    if (e.key === 'Escape') { closeStoryViewer(); return; }
    if (e.key === 'ArrowLeft') { navigateStory(-1); return; }
    if (e.key === 'ArrowRight') { navigateStory(1); return; }
});
