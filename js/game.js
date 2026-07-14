const SUITS = ['♠', '♥', '♦', '♣'];
        const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        
        const PAYTABLES = {
            jacks: {
                'Royal Flush': 250,
                'Straight Flush': 50,
                'Four of a Kind': 20,
                'Full House': 7,
                'Flush': 5,
                'Straight': 4,
                'Three of a Kind': 3,
                'Two Pair': 2,
                'Jacks or Better': 1,
                'Nothing': 0
            },
            deuces: {
                'Royal Flush': 250,
                'Four Deuces': 200,
                'Wild Royal Flush': 25,
                'Five of a Kind': 15,
                'Straight Flush': 9,
                'Four of a Kind': 5,
                'Full House': 3,
                'Flush': 2,
                'Straight': 2,
                'Three of a Kind': 1,
                'Nothing': 0
            }
        };
        const HAND_ORDERS = {
            jacks: ['Royal Flush', 'Straight Flush', 'Four of a Kind', 'Full House', 'Flush', 'Straight', 'Three of a Kind', 'Two Pair', 'Jacks or Better', 'Nothing'],
            deuces: ['Royal Flush', 'Four Deuces', 'Wild Royal Flush', 'Five of a Kind', 'Straight Flush', 'Four of a Kind', 'Full House', 'Flush', 'Straight', 'Three of a Kind', 'Nothing']
        };
        let gameVariant = 'jacks';
        try {
            if (localStorage.getItem('vp_game_variant') === 'deuces') gameVariant = 'deuces';
        } catch (e) {}

        function basePayouts() {
            return PAYTABLES[gameVariant];
        }
        let currentPayouts = { ...basePayouts() };

        function setGameVariant(v) {
            if (!PAYTABLES[v] || gameState !== 'bet' || v === gameVariant) return;
            gameVariant = v;
            try { localStorage.setItem('vp_game_variant', v); } catch (e) {}
            currentPayouts = { ...basePayouts() };
            updateVariantUI();
            renderPayouts(TRANSLATIONS[currentLang]);
        }

        function updateVariantUI() {
            const jacksBtn = document.getElementById('variant-jacks');
            const deucesBtn = document.getElementById('variant-deuces');
            if (jacksBtn) jacksBtn.classList.toggle('selected', gameVariant === 'jacks');
            if (deucesBtn) deucesBtn.classList.toggle('selected', gameVariant === 'deuces');
        }

        // --- Engagement tuning (play-money game) ---
        const BOOST_BASE = 0.18;          // baseline chance to improve a dead deal
        const BOOST_PER_LOSS = 0.06;      // extra boost per consecutive loss (mercy)
        const BOOST_LOSS_CAP = 5;         // loss streak past which mercy stops growing
        const LOW_BALANCE_HANDS = 10;     // "getting low" = fewer than this many max bets left
        const CRITICAL_BALANCE_HANDS = 4; // "almost broke" = strong comeback help
        const BOOST_LOW = 0.15;           // extra help when getting low
        const BOOST_CRITICAL = 0.35;      // extra help when almost broke
        const BOOST_MAX = 0.85;           // never a guaranteed rig

        function getBoostChance() {
            let chance = BOOST_BASE;
            chance += Math.min(lossStreak, BOOST_LOSS_CAP) * BOOST_PER_LOSS;
            if (balance <= bet * CRITICAL_BALANCE_HANDS) {
                chance += BOOST_CRITICAL;   // comeback: keep the session alive
            } else if (balance <= bet * LOW_BALANCE_HANDS) {
                chance += BOOST_LOW;
            }
            return Math.min(chance, BOOST_MAX);
        }

        var currentLang = 'en';
        let deck = [];
        let hand = [];
        let held = [false, false, false, false, false];
        var balance = 100;
        let bet = 5;
        let gameState = 'bet';
        let lastHandType = null;
        let totalWon = 0;
        let totalLost = 0;
        let handsPlayed = 0;
        let lossStreak = 0;
        let winStreak = 0;
        let bestStreak = 0;
        var hourlyRebuys = 0;
        var dailyRebuys = 0;
        var weeklyRebuys = loadWeeklyRebuys();
        var currentHourKey = '';
        var currentDayKey = '';
        var currentWeekKey = '';
        let lastWinAmount = 0;
        let activeLbTab = 'hourly';

        // --- State Persistence (localStorage backup) ---
        function saveGameState() {
            try {
                const state = {
                    balance: balance,
                    bet: bet,
                    totalWon: totalWon,
                    totalLost: totalLost,
                    handsPlayed: handsPlayed,
                    hourlyRebuys: hourlyRebuys,
                    dailyRebuys: dailyRebuys,
                    lossStreak: lossStreak,
                    winStreak: winStreak,
                    bestStreak: bestStreak,
                    hourKey: currentHourKey,
                    dayKey: currentDayKey,
                    savedAt: Date.now()
                };
                localStorage.setItem('vp_game_state', JSON.stringify(state));
            } catch (e) { /* localStorage unavailable, silently fail */ }
        }

        function restoreGameState() {
            try {
                const raw = localStorage.getItem('vp_game_state');
                if (!raw) return false;
                const state = JSON.parse(raw);
                // Only restore if saved less than 24h ago
                if (Date.now() - state.savedAt > 24 * 60 * 60 * 1000) return false;
                balance = state.balance || 100;
                bet = state.bet || 5;
                totalWon = state.totalWon || 0;
                totalLost = state.totalLost || 0;
                handsPlayed = state.handsPlayed || 0;
                hourlyRebuys = state.hourlyRebuys || 0;
                dailyRebuys = state.dailyRebuys || 0;
                lossStreak = state.lossStreak || 0;
                winStreak = state.winStreak || 0;
                bestStreak = state.bestStreak || 0;
                // Only restore hour/day rebuys if same period
                if (state.hourKey !== getHourKey()) hourlyRebuys = 0;
                if (state.dayKey !== getDayKey()) dailyRebuys = 0;
                document.getElementById('balance').textContent = balance;
                setBet(bet); // keep the bet display and selected button in sync with the restored value
                return true;
            } catch (e) { return false; }
        }

        // --- Firebase Error Handling Wrapper ---
        function firebaseSafe(operation, fallback) {
            try {
                var result = operation();
                if (result && typeof result.catch === 'function') {
                    return result.catch(function(err) {
                        console.error('Firebase operation failed:', err);
                        if (typeof fallback === 'function') fallback(err);
                        return null;
                    });
                }
                return result;
            } catch (err) {
                console.error('Firebase operation threw:', err);
                if (typeof fallback === 'function') fallback(err);
                return null;
            }
        }


        function checkHourReset() {
            const hk = getHourKey();
            if (currentHourKey && currentHourKey !== hk) {
                hourlyRebuys = 0;
            }
            currentHourKey = hk;
        }

        function checkDayReset() {
            const dk = getDayKey();
            if (currentDayKey && currentDayKey !== dk) {
                dailyRebuys = 0;
            }
            currentDayKey = dk;
        }

        function checkWeekReset() {
            const wk = getWeekKey();
            if (currentWeekKey && currentWeekKey !== wk) {
                weeklyRebuys = 0;
                saveWeeklyRebuys();
            }
            currentWeekKey = wk;
        }

        function doRebuy() {
            hourlyRebuys++;
            dailyRebuys++;
            weeklyRebuys++;
            saveWeeklyRebuys();
            balance = 100;
            document.getElementById('balance').textContent = balance;
            saveGameState();
            showRebuyNotification();
        }

        function showRebuyNotification() {
            let note = document.getElementById('rebuy-note');
            if (!note) {
                note = document.createElement('div');
                note.id = 'rebuy-note';
                note.className = 'rebuy-notification';
                document.getElementById('game-container').appendChild(note);
            }
            note.textContent = '♻ +100 credits (rebuy #' + hourlyRebuys + ')';
            note.classList.remove('show');
            void note.offsetWidth;
            note.classList.add('show');
            setTimeout(function() { note.classList.remove('show'); }, 2000);
        }

        function changeLanguage(lang) {
            currentLang = lang;
            const t = TRANSLATIONS[lang];
            document.documentElement.lang = lang;
            document.documentElement.dir = t.dir;
            document.body.dir = t.dir;
            document.title = t.title;
            
            // Update UI texts
            document.getElementById('game-title').textContent = t.gameTitle;
            document.getElementById('balance-label').textContent = t.balanceLabel;
            document.getElementById('bet-label').textContent = t.betLabel;
            document.getElementById('credits-label').textContent = t.creditsLabel;
            document.getElementById('choose-bet-label').textContent = t.chooseBetLabel;
            document.getElementById('deal-btn').textContent = t.dealBtn;
            document.getElementById('hold-btn').textContent = t.drawBtn;
            document.getElementById('how-to-play').textContent = t.howToPlay;
            
            // Update payouts table
            renderPayouts(t);
            
            // Update instructions
            const instructionsList = document.getElementById('instructions-list');
            instructionsList.innerHTML = '';
            t.instructions.forEach(inst => {
                const li = document.createElement('li');
                li.textContent = inst;
                instructionsList.appendChild(li);
            });
            
            // Update stats labels
            document.getElementById('stat-won-label').textContent = t.statWon;
            document.getElementById('stat-lost-label').textContent = t.statLost;
            document.getElementById('stat-net-label').textContent = t.statNet;
            document.getElementById('stat-hands-label').textContent = t.statHands;

            if (lastHandType) {
                document.getElementById('explanation').textContent = t.explanations[lastHandType];
                const resultEl = document.getElementById('result');
                if (lastWinAmount > 0) {
                    resultEl.innerHTML = `<span class="win">🎉 ${t.payouts[lastHandType]}! +${lastWinAmount} ${t.creditsLabel}! 🎉</span>`;
                } else {
                    resultEl.innerHTML = `<span style="color:#aaa">${t.payouts['Nothing']} - ${hand.map(c => c.rank + c.suit).join(' ')}</span>`;
                }
            }

            // Update leaderboard UI language dynamically
            const hourlyTitleEl = document.getElementById('lb-hourly-title');
            if (hourlyTitleEl) hourlyTitleEl.textContent = '⏱ ' + (t.hourlyTitle || 'Hourly Competition');
            const dailyTitleEl = document.getElementById('lb-daily-title');
            if (dailyTitleEl) dailyTitleEl.textContent = '📅 ' + (t.dailyTitle || 'Daily Competition');

            const formulaNote = document.getElementById('lb-formula-note');
            if (formulaNote) {
                formulaNote.innerHTML = '<strong>' + (t.formulaTitle || 'How is score calculated?') + '</strong><br>' +
                                        (t.hourlyFormula || 'Score = Balance - (100 × Rebuys) - 100<br><span style="opacity:0.7">(This equals your exact Net Profit/Loss)</span>');
            }

            if (window.applyRoomLang) window.applyRoomLang();
            if (window.applyEngageLang) window.applyEngageLang();
        }

        function renderPayouts(t) {
            const payoutsEl = document.getElementById('payouts');
            payoutsEl.innerHTML = '';
            const handOrder = HAND_ORDERS[gameVariant];
            handOrder.forEach(handType => {
                const row = document.createElement('div');
                row.className = 'payout-row';
                const isBoosted = currentPayouts[handType] > basePayouts()[handType];
                const valStyle = isBoosted ? 'color: #4ade80; text-shadow: 0 0 10px rgba(74, 222, 128, 0.5);' : '';
                row.innerHTML = `<div class="payout-hand">${t.payouts[handType]}</div><div class="payout-value" style="${valStyle}">${currentPayouts[handType]}</div>`;
                payoutsEl.appendChild(row);
            });
        }

        function setBet(amount) {
            bet = amount;
            document.getElementById('bet-display').textContent = bet;
            document.querySelectorAll('.bet-btn').forEach(btn => {
                btn.classList.remove('selected');
            });
            const btn = document.getElementById('bet-' + amount);
            if (btn) btn.classList.add('selected');
        }

        function createDeck() {
            const d = [];
            for (let suit of SUITS) {
                for (let rank of RANKS) {
                    d.push({rank, suit});
                }
            }
            return d;
        }

        function shuffle(deck) {
            for (let i = deck.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [deck[i], deck[j]] = [deck[j], deck[i]];
            }
        }

        function boostHand() {
            if (Math.random() >= getBoostChance()) return;

            const rankCounts = {};
            hand.forEach(c => rankCounts[c.rank] = (rankCounts[c.rank] || 0) + 1);
            const counts = Object.values(rankCounts).sort((a, b) => b - a);

            if (counts[0] >= 2) return;

            const targetRank = hand[Math.floor(Math.random() * 5)].rank;
            const usedSuits = hand.filter(c => c.rank === targetRank).map(c => c.suit);
            const availableSuits = SUITS.filter(s => !usedSuits.includes(s));
            if (availableSuits.length === 0) return;
            const newSuit = availableSuits[Math.floor(Math.random() * availableSuits.length)];
            const newCard = { rank: targetRank, suit: newSuit };

            const otherIndices = hand.map((c, i) => c.rank !== targetRank ? i : -1).filter(i => i !== -1);
            if (otherIndices.length === 0) return;
            const replaceIdx = otherIndices[Math.floor(Math.random() * otherIndices.length)];

            const oldCard = hand[replaceIdx];
            deck.push(oldCard);
            hand[replaceIdx] = newCard;
            const deckIdx = deck.findIndex(c => c.rank === newCard.rank && c.suit === newCard.suit);
            if (deckIdx !== -1) deck.splice(deckIdx, 1);
        }

        function deal() {
            checkHourReset();
            checkDayReset();
            checkWeekReset();
            if (balance < bet) {
                if (balance === 0) {
                    doRebuy();
                } else {
                    bet = Math.max(5, Math.floor(balance / 5) * 5);
                    if (bet > balance) bet = 5;
                    setBet(bet);
                    if (balance < bet) {
                        doRebuy();
                    }
                }
            }

            // Clean up celebration classes & overlays
            document.body.classList.remove('screen-shake');
            document.querySelectorAll('.flash-overlay, .confetti-burst-piece, .gold-rain-piece').forEach(el => el.remove());

            balance -= bet;
            document.getElementById('balance').textContent = balance;
            saveGameState();

            deck = createDeck();
            shuffle(deck);
            hand = deck.splice(0, 5);
            boostHand();
            held = [false, false, false, false, false];
            gameState = 'hold';

            renderHand();
            document.getElementById('deal-btn').disabled = true;
            document.getElementById('hold-btn').disabled = false;
            lastHandType = null;
            const resultEl = document.getElementById('result');
            resultEl.className = 'result';
            resultEl.innerHTML = '';
            document.getElementById('explanation').innerHTML = '';
        }

        function getStreakBonus(streak) {
            if (streak >= 10) return 0.5;
            if (streak >= 7) return 0.3;
            if (streak >= 5) return 0.2;
            if (streak >= 3) return 0.1;
            return 0;
        }

        function draw() {
            // Was a pair held before the draw? (for daily challenges)
            const heldRankCounts = {};
            hand.forEach(function(c, i) {
                if (held[i]) heldRankCounts[c.rank] = (heldRankCounts[c.rank] || 0) + 1;
            });
            const hadHeldPair = Object.values(heldRankCounts).some(function(n) { return n >= 2; });

            // Replace unheld cards
            for (let i = 0; i < 5; i++) {
                if (!held[i]) {
                    hand[i] = deck.pop();
                }
            }
            const result = gameVariant === 'deuces' ? evaluateDeucesHand(hand) : evaluateHand(hand);
            const handType = result.type;
            lastHandType = handType;
            const winIndices = result.winIndices || []; // Ensure it's an array
            const thirdMatchIndices = result.thirdMatchIndices || []; // Ensure it's an array
            const secondPairIndices = result.secondPairIndices || []; // Ensure it's an array
            let win = bet * currentPayouts[handType];
            if (win > 0) {
                winStreak++;
                const streakBonus = getStreakBonus(winStreak);
                if (streakBonus > 0) win += Math.round(win * streakBonus);
                if (window.vpTournamentMultiplier) win = Math.round(win * vpTournamentMultiplier());
            } else {
                winStreak = 0;
            }
            updateStreakUI(win > 0);
            lastWinAmount = win;
            balance += win;
            handsPlayed++;
            
            if (win > 0) {
                totalWon += win;
                lossStreak = 0;
                currentPayouts = { ...basePayouts() };
            } else {
                totalLost += bet;
                lossStreak++;
                for (let key in currentPayouts) {
                    if (key !== 'Nothing') currentPayouts[key]++;
                }
            }
            updateStats();
            renderPayouts(TRANSLATIONS[currentLang]);

            if (win === 0) {
                document.getElementById('balance').textContent = balance;
                playSound('loss');
            } else {
                triggerWinCelebration(handType, win);
            }
            saveGameState();

            if (win > 0 && HAND_RANK[handType] >= 3) {
                logRoomEvent('hand', handType);
            }

            const t = TRANSLATIONS[currentLang];
            const resultEl = document.getElementById('result');

            if (win > 0) {
                resultEl.className = 'result';
                var shareWinBtn = '<br>';
                shareWinBtn += '<button id="gamble-trigger-btn" onclick="openGamble()" style="margin-top: 10px; margin-inline-end: 8px; padding: 8px 16px; font-size: 14px; border-radius: 8px;">' +
                    (window.et ? et('gambleBtn') : '🎴 Gamble') + '</button>';
                if (HAND_RANK[handType] >= 3) {
                    shareWinBtn += '<button id="share-win-trigger-btn" onclick="openShareWinModal()" style="margin-top: 10px; padding: 8px 16px; font-size: 14px; border-radius: 8px;">Share Win</button>';
                }
                resultEl.innerHTML = `<span class="win">🎉 ${t.payouts[handType]}! +${win} ${t.creditsLabel}! 🎉</span>` + shareWinBtn;
                document.getElementById('explanation').textContent = t.explanations[handType];
            } else {
                resultEl.className = 'result';
                resultEl.innerHTML = `<span style="color:#aaa">${t.payouts['Nothing']} - ${hand.map(c => c.rank + c.suit).join(' ')}</span>`;
                document.getElementById('explanation').textContent = t.explanations[handType];
            }

            renderHand(winIndices, thirdMatchIndices, secondPairIndices, true);
            updateScores(win, bet, handType);
            if (window.egOnHandPlayed) {
                window.egOnHandPlayed({ handType: handType, win: win, bet: bet, heldPair: hadHeldPair, streak: winStreak });
            }

            gameState = 'bet';
            document.getElementById('deal-btn').disabled = false;
            document.getElementById('hold-btn').disabled = true;
        }

        function toggleHold(i) {
            if (gameState !== 'hold') return;
            held[i] = !held[i];
            renderHand([], [], [], false, false);
            playSound('click');
        }

        function getWinBadgeText(cardIndex, handType) {
            const card = hand[cardIndex];
            const ranks = hand.map(c => c.rank);
            const rankCounts = {};
            ranks.forEach(r => rankCounts[r] = (rankCounts[r] || 0) + 1);
            
            const t = TRANSLATIONS[currentLang];
            const wl = t.winLabels || {};
            const rankLabel = card.rank;

            if (handType === 'Jacks or Better') {
                return (wl.pair || 'Pair') + ' ' + rankLabel;
            }
            if (handType === 'Two Pair') {
                return (wl.pair || 'Pair') + ' ' + rankLabel;
            }
            if (handType === 'Three of a Kind') {
                return wl.threeOfKind || '3 of a Kind';
            }
            if (handType === 'Full House') {
                const count = rankCounts[card.rank] || 0;
                if (count === 3) {
                    return wl.threeOfKind || '3 of a Kind';
                } else if (count === 2) {
                    return (wl.pair || 'Pair') + ' ' + rankLabel;
                }
            }
            if (handType === 'Four of a Kind') {
                return wl.fourOfKind || '4 of a Kind';
            }
            if (handType === 'Straight') {
                return wl.straight || 'Straight';
            }
            if (handType === 'Flush') {
                return wl.flush || 'Flush';
            }
            if (handType === 'Straight Flush') {
                return wl.straightFlush || 'Str. Flush';
            }
            if (handType === 'Royal Flush') {
                return wl.royalFlush || 'Royal Flush';
            }
            return '';
        }

        function renderHand(winningIndices = [], thirdMatchIndices = [], secondPairIndices = [], isDraw = false, animateFlip = true) {
            const handEl = document.getElementById('hand');
            handEl.innerHTML = '';
            const t = TRANSLATIONS[currentLang];
            const anyHeld = held.some(h => h);

            const PIP_MAPS = {
                '2': [1, 13],
                '3': [1, 7, 13],
                '4': [0, 2, 12, 14],
                '5': [0, 2, 7, 12, 14],
                '6': [0, 2, 6, 8, 12, 14],
                '7': [0, 2, 6, 8, 12, 14, 4],
                '8': [0, 2, 6, 8, 12, 14, 4, 10],
                '9': [0, 2, 3, 5, 9, 11, 12, 14, 7],
                '10': [0, 2, 3, 5, 9, 11, 12, 14, 4, 10]
            };

            hand.forEach((card, i) => {
                const cardEl = document.createElement('div');
                const isResult = winningIndices.length > 0 || thirdMatchIndices.length > 0 || secondPairIndices.length > 0;
                
                // If draw is true, only unheld cards start face-down (flipped)
                const shouldStartFlipped = animateFlip && (isDraw ? !held[i] : true);
                
                const isHeld = !isResult && held[i];
                const isUnheld = !isResult && anyHeld && !held[i];
                let classes = `card ${shouldStartFlipped ? 'flipped' : ''} ${isHeld ? 'held' : ''} ${isUnheld ? 'unheld' : ''} ${card.suit === '♥' || card.suit === '♦' ? 'red' : ''}`;

                if (winningIndices.includes(i)) {
                    classes += ' winning';
                }
                if (secondPairIndices.includes(i)) {
                    classes += ' second-pair';
                }
                if (thirdMatchIndices.includes(i)) {
                    classes += ' third-match';
                }

                cardEl.className = classes.trim();
                cardEl.onclick = () => toggleHold(i);
                
                const badgeText = t.heldBadge || 'HELD';
                const winBadgeText = isResult ? getWinBadgeText(i, lastHandType) : '';
                
                // Generate center content
                let centerContent = '';
                if (card.rank === 'A') {
                    centerContent = `<div class="card-suit-large">${card.suit}</div>`;
                } else if (['J', 'Q', 'K'].includes(card.rank)) {
                    centerContent = `<div class="card-royalty-center rank-${card.rank}">${card.rank === 'J' ? '⚔️' : card.rank === 'Q' ? '👑' : '🛡️'}</div>`;
                } else {
                    const pips = PIP_MAPS[card.rank] || [];
                    let gridHtml = '<div class="pip-grid">';
                    for (let cell = 0; cell < 15; cell++) {
                        const isActive = pips.includes(cell);
                        gridHtml += `<div class="pip ${isActive ? 'active' : ''}">${card.suit}</div>`;
                    }
                    gridHtml += '</div>';
                    centerContent = gridHtml;
                }

                cardEl.innerHTML = `
                    <div class="held-badge">${badgeText}</div>
                    <div class="win-badge">${winBadgeText}</div>
                    <div class="card-inner">
                        <div class="card-front">
                            <div class="card-index top-left">
                                <div class="card-index-rank">${card.rank}</div>
                                <div class="card-index-suit">${card.suit}</div>
                            </div>
                            ${centerContent}
                            <div class="card-index bottom-right">
                                <div class="card-index-rank">${card.rank}</div>
                                <div class="card-index-suit">${card.suit}</div>
                            </div>
                        </div>
                        <div class="card-back"></div>
                    </div>
                `;
                handEl.appendChild(cardEl);
            });

            if (animateFlip) {
                // Staggered flip animation trigger
                let flipDelayIndex = 0;
                hand.forEach((card, i) => {
                    const cardEl = handEl.children[i];
                    if (cardEl && cardEl.classList.contains('flipped')) {
                        setTimeout(() => {
                            const inner = cardEl.querySelector('.card-inner');
                            if (inner) {
                                inner.classList.add('animating');
                                cardEl.classList.remove('flipped');
                                playSound('deal');
                                setTimeout(() => {
                                    inner.classList.remove('animating');
                                }, 600);
                            }
                        }, flipDelayIndex * (window.vpDealStagger ? vpDealStagger() : 250));
                        flipDelayIndex++;
                    }
                });
            }

        }

        function evaluateHand(hand) {
            const ranks = hand.map(c => c.rank);
            const suits = hand.map(c => c.suit);
            
            const rankCounts = {};
            ranks.forEach(r => rankCounts[r] = (rankCounts[r] || 0) + 1);
            const counts = Object.values(rankCounts).sort((a, b) => b - a);
            
            const flush = new Set(suits).size === 1;
            
            let values = ranks.map(r => {
                if (r === 'A') return 14;
                if (r === 'J') return 11;
                if (r === 'Q') return 12;
                if (r === 'K') return 13;
                return parseInt(r);
            }).sort((a, b) => a - b);
            
            let straight = false;
            const uniqueValues = [...new Set(values)];
            if (uniqueValues.length === 5) { 
                if (uniqueValues[4] - uniqueValues[0] === 4) {
                    straight = true;
                } else if (uniqueValues.join(',') === '2,3,4,5,14') { // Ace-low straight
                    straight = true;
                    values = [1, 2, 3, 4, 5]; // Adjust values for consistent check
                }
            }
            
            // Helper to find indices of cards matching certain ranks
            const findIndices = (targetRanks) => {
                return hand.map((card, i) => targetRanks.includes(card.rank) ? i : -1).filter(i => i !== -1);
            };
            
            // Helper to find indices for a specific count
            const findIndicesByCount = (targetCount) => {
                const targetRanks = Object.keys(rankCounts).filter(r => rankCounts[r] === targetCount);
                return findIndices(targetRanks);
            };
            
            const allIndices = [0, 1, 2, 3, 4];
            let result = { type: 'Nothing', winIndices: [], thirdMatchIndices: [], secondPairIndices: [] }; // Initialize thirdMatchIndices // Initialize thirdMatchIndices

            if (straight && flush) {
                if (values.join(',') === '10,11,12,13,14') {
                    result.type = 'Royal Flush';
                } else {
                    result.type = 'Straight Flush';
                }
                result.winIndices = allIndices;
            } else if (counts[0] === 4) {
                result.type = 'Four of a Kind';
                result.winIndices = findIndicesByCount(4);
            } else if (counts[0] === 3 && counts[1] === 2) { // Full House
                result.type = 'Full House';
                const threeRank = Object.keys(rankCounts).find(r => rankCounts[r] === 3);
                const twoRank = Object.keys(rankCounts).find(r => rankCounts[r] === 2);
                result.winIndices = findIndices([threeRank]);
                result.secondPairIndices = findIndices([twoRank]);
            } else if (flush) {
                result.type = 'Flush';
                result.winIndices = allIndices;
            } else if (straight) {
                result.type = 'Straight';
                result.winIndices = allIndices;
            } else if (counts[0] === 3) { // Three of a Kind
                result.type = 'Three of a Kind';
                result.winIndices = findIndicesByCount(3);
                const threeRank = Object.keys(rankCounts).find(r => rankCounts[r] === 3);
                const threeIndices = findIndices([threeRank]);
                if (threeRank === 'J' && threeIndices.length > 0) {
                    result.thirdMatchIndices.push(threeIndices[0]); 
                }
            } else if (counts[0] === 2 && counts[1] === 2) { // Two Pair
                const pairRanks = Object.keys(rankCounts).filter(r => rankCounts[r] === 2);
                result.type = 'Two Pair';
                result.winIndices = findIndices([pairRanks[0]]);
                result.secondPairIndices = findIndices([pairRanks[1]]);
            } else if (counts[0] === 2) { // One Pair
                const pairRank = Object.keys(rankCounts).find(r => rankCounts[r] === 2);
                if (['J', 'Q', 'K', 'A'].includes(pairRank)) {
                    result.type = 'Jacks or Better';
                    result.winIndices = findIndices([pairRank]);
                }
            }
            return result;
        }

        // Deuces Wild: 2s substitute for any card. Minimum paying hand is Three of a Kind.
        function evaluateDeucesHand(hand) {
            const allIndices = [0, 1, 2, 3, 4];
            const result = { type: 'Nothing', winIndices: [], thirdMatchIndices: [], secondPairIndices: [] };
            const others = hand.filter(c => c.rank !== '2');
            const n = 5 - others.length; // wild deuces count

            if (n === 4) {
                result.type = 'Four Deuces';
                result.winIndices = allIndices;
                return result;
            }

            const rankCounts = {};
            others.forEach(c => rankCounts[c.rank] = (rankCounts[c.rank] || 0) + 1);
            const counts = Object.values(rankCounts).sort((a, b) => b - a);
            const maxCount = counts[0] || 0;
            const flush = new Set(others.map(c => c.suit)).size <= 1;
            const vals = others.map(c =>
                c.rank === 'A' ? 14 : c.rank === 'J' ? 11 : c.rank === 'Q' ? 12 : c.rank === 'K' ? 13 : parseInt(c.rank));
            const distinct = new Set(vals).size === others.length;

            // Distinct natural cards + wilds can form a straight iff they fit a 5-value window
            const fitsWindow = arr => arr.length === 0 || (Math.max(...arr) - Math.min(...arr) <= 4);
            const straight = distinct && (fitsWindow(vals) || (vals.includes(14) && fitsWindow(vals.map(v => v === 14 ? 1 : v))));
            const allRoyalVals = distinct && vals.every(v => v >= 10);

            if (n === 0 && flush && straight && Math.min(...vals) === 10) {
                result.type = 'Royal Flush';
            } else if (n > 0 && flush && allRoyalVals) {
                result.type = 'Wild Royal Flush';
            } else if (maxCount + n >= 5) {
                result.type = 'Five of a Kind';
            } else if (flush && straight) {
                result.type = 'Straight Flush';
            } else if (maxCount + n >= 4) {
                result.type = 'Four of a Kind';
            } else if ((maxCount === 3 && counts[1] === 2) || (n === 1 && maxCount === 2 && counts[1] === 2)) {
                result.type = 'Full House';
            } else if (flush) {
                result.type = 'Flush';
            } else if (straight) {
                result.type = 'Straight';
            } else if (maxCount + n >= 3) {
                result.type = 'Three of a Kind';
            }

            if (result.type !== 'Nothing') result.winIndices = allIndices;
            return result;
        }

        function updateStats() {
            const net = totalWon - totalLost;
            document.getElementById('stat-won-value').textContent = '+' + totalWon;
            document.getElementById('stat-lost-value').textContent = '-' + totalLost;
            document.getElementById('stat-hands-value').textContent = handsPlayed;

            const netEl = document.getElementById('stat-net');
            const netValueEl = document.getElementById('stat-net-value');
            netEl.classList.remove('positive', 'negative', 'zero');
            if (net > 0) {
                netValueEl.textContent = '+' + net;
                netEl.classList.add('positive');
            } else if (net < 0) {
                netValueEl.textContent = '' + net;
                netEl.classList.add('negative');
            } else {
                netValueEl.textContent = '0';
                netEl.classList.add('zero');
            }
        }

        function updateStreakUI(justWon) {
            const bar = document.getElementById('streak-bar');
            const count = document.getElementById('streak-count');
            const tag = document.getElementById('streak-bonus-tag');
            count.textContent = winStreak;
            bar.classList.toggle('active', winStreak >= 2);
            const bonus = getStreakBonus(winStreak);
            if (bonus > 0) {
                tag.textContent = (window.et ? et('bonusTag') : '+{n}% payout bonus').replace('{n}', Math.round(bonus * 100));
                tag.classList.remove('eg-hidden');
            } else {
                tag.classList.add('eg-hidden');
            }
            if (justWon && winStreak >= 2) {
                bar.classList.remove('bump');
                void bar.offsetWidth;
                bar.classList.add('bump');
            }
            if (justWon && winStreak >= 5 && winStreak % 5 === 0) {
                logRoomEvent('streak', winStreak);
            }
            if (winStreak > bestStreak) {
                bestStreak = winStreak;
                document.getElementById('stat-best-streak-value').textContent = '🔥 ' + bestStreak;
                const user = auth.currentUser;
                if (user) {
                    db.collection('users').doc(user.uid).set({ bestStreak: bestStreak }, { merge: true })
                        .catch(function(err) { console.error('bestStreak save:', err); });
                }
            }
        }

        // Initialize
        changeLanguage('en');
        updateVariantUI();
    // Keyboard support for bet selection (keys 1-5)
    document.addEventListener('keydown', function(e) {
        const keyMap = { '1': 5, '2': 10, '3': 20, '4': 50 };
        if (keyMap[e.key]) setBet(keyMap[e.key]);
    });

    // Firebase
