function logRoomEvent(eventType, detail) {
        var user = auth.currentUser;
        if (!user || myRooms.length === 0) return;
        
        myRooms.forEach(function(room) {
            db.collection('room_events').add({
                roomId: room.id,
                uid: user.uid,
                displayName: user.displayName || '',
                photoURL: user.photoURL || '',
                eventType: eventType,
                detail: detail,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            }).then(function() {
                db.collection('room_events')
                    .where('roomId', '==', room.id)
                    .get()
                    .then(function(snap) {
                        if (snap.size > 50) {
                            var docs = [];
                            snap.forEach(function(d) { docs.push({ id: d.id, data: d.data() }); });
                            docs.sort(function(a, b) {
                                var tA = a.data.timestamp ? (a.data.timestamp.toDate ? a.data.timestamp.toDate().getTime() : a.data.timestamp) : 0;
                                var tB = b.data.timestamp ? (b.data.timestamp.toDate ? b.data.timestamp.toDate().getTime() : b.data.timestamp) : 0;
                                return tA - tB;
                            });
                            var toDeleteCount = docs.length - 50;
                            for (var i = 0; i < toDeleteCount; i++) {
                                db.collection('room_events').doc(docs[i].id).delete();
                            }
                        }
                    }).catch(function(err) { console.error('event cleanup:', err); });
            }).catch(function(err) { console.error('add room event:', err); });
        });
    }

    function handleIncomingRoomEvent(data) {
        if (data.eventType === 'reaction') {
            triggerFloatingEmoji(data.uid, data.detail);
        } else {
            var text = '';
            var name = escapeHtml(firstName(data.displayName));
            var t = TRANSLATIONS[currentLang] || TRANSLATIONS.en;
            
            if (data.eventType === 'hand') {
                var handName = t.payouts[data.detail] || data.detail;
                var template = rt('feedHitHand') || '{name} just hit a {hand}!';
                text = template.replace('{name}', name).replace('{hand}', handName);
            } else if (data.eventType === 'streak') {
                var template = rt('feedStreak') || '{name} is on a {n}-win streak!';
                text = template.replace('{name}', name).replace('{n}', data.detail);
            } else if (data.eventType === 'levelUp') {
                var template = rt('feedLevelUp') || '{name} just leveled up to {n}!';
                text = template.replace('{name}', name).replace('{n}', data.detail);
            } else if (data.eventType === 'chat') {
                // showFeedToast assigns via textContent, so the raw message is safe here
                text = firstName(data.displayName) + ': ' + String(data.detail || '').slice(0, 120);
            }
            
            if (text) {
                showFeedToast(text);
            }
        }
    }

    var maxFeedToasts = 3;
    function showFeedToast(text) {
        var container = document.getElementById('feed-toasts');
        if (!container) return;

        var existing = container.getElementsByClassName('feed-toast');
        if (existing.length >= maxFeedToasts) {
            var oldest = existing[0];
            oldest.remove();
        }

        var toast = document.createElement('div');
        toast.className = 'feed-toast';
        toast.textContent = text;
        container.appendChild(toast);

        setTimeout(function() {
            toast.classList.add('out');
            setTimeout(function() {
                toast.remove();
            }, 300);
        }, 4000);
    }

    function triggerFloatingEmoji(uid, emoji) {
        var lbContainer = document.getElementById('rooms-panel');
        if (!lbContainer) return;

        var rowEl = document.querySelector('#room-lb-body tr[data-uid="' + uid + '"]');
        var topOffset, leftOffset;
        var lbRect = lbContainer.getBoundingClientRect();
        
        if (rowEl) {
            var rowRect = rowEl.getBoundingClientRect();
            topOffset = rowRect.top - lbRect.top + (rowRect.height / 2) - 15;
            leftOffset = rowRect.left - lbRect.left + (rowRect.width / 2) - 15;
        } else {
            topOffset = lbRect.height / 2 - 15;
            leftOffset = lbRect.width / 2 - 15;
        }

        var emojiEl = document.createElement('div');
        emojiEl.className = 'float-emoji';
        emojiEl.textContent = emoji;
        emojiEl.style.top = topOffset + 'px';
        emojiEl.style.left = leftOffset + 'px';
        
        lbContainer.appendChild(emojiEl);

        setTimeout(function() {
            emojiEl.remove();
        }, 2000);
    }

    var lastReactionTime = 0;
    function sendReaction(emoji) {
        var user = auth.currentUser;
        var room = getActiveRoom();
        if (!user || !room) return;

        var now = Date.now();
        if (now - lastReactionTime < 5000) return;
        lastReactionTime = now;

        var buttons = document.querySelectorAll('.reaction-btn');
        buttons.forEach(function(btn) { btn.disabled = true; });
        setTimeout(function() {
            buttons.forEach(function(btn) { btn.disabled = false; });
        }, 5000);

        db.collection('room_events').add({
            roomId: room.id,
            uid: user.uid,
            displayName: user.displayName || '',
            photoURL: user.photoURL || '',
            eventType: 'reaction',
            detail: emoji,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(function(err) { console.error('send reaction error:', err); });
    }

    function checkAndProcessReferral() {
        var user = auth.currentUser;
        if (!user) return;

        db.collection('users').doc(user.uid).get().then(function(doc) {
            if (!doc.exists) return;
            var data = doc.data();
            var referredByCode = data.referredBy;
            if (!referredByCode) return;

            db.collection('users').where('referralCode', '==', referredByCode).limit(1).get().then(function(snap) {
                if (snap.empty) return;
                var referrerDoc = snap.docs[0];
                var referrerUid = referrerDoc.id;
                
                if (referrerUid === user.uid) return;
                var referralDocId = referrerUid + '_' + user.uid;

                db.collection('referrals').doc(referralDocId).get().then(function(refDoc) {
                    if (refDoc.exists) return;

                    db.collection('referrals').doc(referralDocId).set({
                        referrerUid: referrerUid,
                        refereeUid: user.uid,
                        creditedAt: firebase.firestore.FieldValue.serverTimestamp()
                    }).then(function() {
                        db.collection('users').doc(referrerUid).update({
                            bonusCredits: firebase.firestore.FieldValue.increment(200),
                            referralCount: firebase.firestore.FieldValue.increment(1)
                        });

                        egAddCredits(200);
                        egConfetti();
                        egToast('🎉 Referral Reward! +200 credits! 🎉');
                        saveGameState();
                    });
                });
            });
        });
    }

    function copyRefLink() {
        var link = document.getElementById('pf-ref-link').value;
        var btn = document.getElementById('pf-ref-copy-btn');
        var done = function() {
            btn.textContent = rt('copied') || 'Copied ✓';
            setTimeout(function() { btn.textContent = rt('copyLink') || 'Copy Link'; }, 1500);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(link).then(done).catch(function() {
                document.getElementById('pf-ref-link').select();
                document.execCommand('copy');
                done();
            });
        } else {
            document.getElementById('pf-ref-link').select();
            document.execCommand('copy');
            done();
        }
    }

    function openShareWinModal() {
        var canvas = document.getElementById('share-canvas');
        if (!canvas) return;

        var room = getActiveRoom();
        var user = auth.currentUser;
        
        var inviteCode = '';
        var inviteLink = '';
        
        if (room) {
            inviteCode = room.id;
            inviteLink = roomLink(room.id);
            drawAndShowShareModal(canvas, hand, lastHandType, lastWinAmount, inviteLink, inviteCode);
        } else if (user && user.uid) {
            db.collection('users').doc(user.uid).get().then(function(doc) {
                var data = doc.exists ? doc.data() : {};
                var refCode = data.referralCode || '';
                var refLink = location.origin + location.pathname + '?ref=' + refCode;
                drawAndShowShareModal(canvas, hand, lastHandType, lastWinAmount, refLink, refCode);
            });
        }
    }

    function drawAndShowShareModal(canvas, hand, handType, winAmount, inviteLink, inviteCode) {
        var t = TRANSLATIONS[currentLang] || TRANSLATIONS.en;
        var translatedHandType = t.payouts[handType] || handType;
        
        drawWinCard(canvas, hand, translatedHandType, winAmount, inviteLink, inviteCode);
        
        var waText = 'Wow! I just hit a ' + translatedHandType + ' and won ' + winAmount + ' credits in Video Poker! Play with me: ' + inviteLink;
        document.getElementById('share-win-whatsapp').href = 'https://wa.me/?text=' + encodeURIComponent(waText);
        
        var copyBtn = document.getElementById('share-win-copy-btn');
        copyBtn.dataset.link = inviteLink;
        copyBtn.textContent = rt('copyLink') || 'Copy Link';

        document.getElementById('share-win-modal').classList.remove('rm-hidden');
    }

    function closeShareWinModal() {
        document.getElementById('share-win-modal').classList.add('rm-hidden');
    }

    function copyWinCardLink() {
        var btn = document.getElementById('share-win-copy-btn');
        var link = btn.dataset.link;
        var done = function() {
            btn.textContent = rt('copied') || 'Copied ✓';
            setTimeout(function() { btn.textContent = rt('copyLink') || 'Copy Link'; }, 1500);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(link).then(done).catch(function() {
                var temp = document.createElement('input');
                temp.value = link;
                document.body.appendChild(temp);
                temp.select();
                document.execCommand('copy');
                temp.remove();
                done();
            });
        } else {
            var temp = document.createElement('input');
            temp.value = link;
            document.body.appendChild(temp);
            temp.select();
            document.execCommand('copy');
            temp.remove();
            done();
        }
    }

    function downloadWinCard() {
        var canvas = document.getElementById('share-canvas');
        if (!canvas) return;
        var link = document.createElement('a');
        link.download = 'video_poker_win_' + lastHandType.toLowerCase().replace(/ /g, '_') + '.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    }

    function drawWinCard(canvas, hand, handType, winAmount, inviteLink, inviteCode) {
        var ctx = canvas.getContext('2d');
        
        var grad = ctx.createRadialGradient(300, 200, 50, 300, 200, 350);
        grad.addColorStop(0, '#0f3c26');
        grad.addColorStop(1, '#05190e');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 600, 400);

        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 6;
        ctx.strokeRect(3, 3, 594, 394);

        ctx.strokeStyle = 'rgba(255, 215, 0, 0.05)';
        ctx.lineWidth = 1;
        for (var i = 0; i < 600; i += 30) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, 400);
            ctx.stroke();
        }

        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 24px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('♠ ♥ VIDEO POKER ♦ ♣', 300, 45);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 36px "Segoe UI", sans-serif';
        ctx.fillText(handType.toUpperCase(), 300, 95);

        ctx.fillStyle = '#4ade80';
        ctx.font = 'bold 24px "Segoe UI", sans-serif';
        ctx.fillText('+' + winAmount + ' CREDITS', 300, 135);

        var cardW = 75;
        var cardH = 110;
        var gap = 15;
        var totalW = (5 * cardW) + (4 * gap);
        var startX = (600 - totalW) / 2;
        var startY = 165;

        function roundRect(ctx, x, y, width, height, radius) {
            ctx.beginPath();
            ctx.moveTo(x + radius, y);
            ctx.lineTo(x + width - radius, y);
            ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
            ctx.lineTo(x + width, y + height - radius);
            ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
            ctx.lineTo(x + radius, y + height);
            ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
            ctx.lineTo(x, y + radius);
            ctx.quadraticCurveTo(x, y, x + radius, y);
            ctx.closePath();
        }

        hand.forEach(function(card, idx) {
            var x = startX + idx * (cardW + gap);
            var y = startY;

            ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
            ctx.shadowBlur = 10;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 4;

            ctx.fillStyle = '#ffffff';
            roundRect(ctx, x, y, cardW, cardH, 8);
            ctx.fill();

            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;

            ctx.strokeStyle = '#cccccc';
            ctx.lineWidth = 1;
            ctx.stroke();

            var evaluated = evaluateHand(hand);
            var isWinner = evaluated.winIndices.includes(idx) || evaluated.secondPairIndices.includes(idx) || evaluated.thirdMatchIndices.includes(idx);
            if (isWinner) {
                ctx.strokeStyle = '#ffd700';
                ctx.lineWidth = 3;
                roundRect(ctx, x, y, cardW, cardH, 8);
                ctx.stroke();
            }

            var isRed = card.suit === '♥' || card.suit === '♦';
            ctx.fillStyle = isRed ? '#e63946' : '#2d3748';
            
            ctx.font = 'bold 18px "Segoe UI", sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(card.rank, x + 8, y + 22);

            ctx.font = 'bold 36px "Segoe UI", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(card.suit, x + cardW / 2, y + cardH / 2 + 12);

            ctx.font = 'bold 18px "Segoe UI", sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(card.rank, x + cardW - 8, y + cardH - 10);
        });

        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        roundRect(ctx, 30, 310, 540, 65, 8);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 215, 0, 0.2)';
        ctx.lineWidth = 1.5;
        roundRect(ctx, 30, 310, 540, 65, 8);
        ctx.stroke();

        drawMockQRCode(ctx, 505, 318, 48);

        ctx.textAlign = 'left';
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 15px "Segoe UI", sans-serif';
        if (inviteCode) {
            ctx.fillText('PLAY WITH ME! ROOM CODE: ' + inviteCode, 45, 338);
            ctx.fillStyle = '#ffffff';
            ctx.font = '12px "Segoe UI", sans-serif';
            ctx.fillText(inviteLink, 45, 360);
        } else {
            ctx.fillText('PLAY VIDEO POKER & WIN CREDITS!', 45, 348);
        }
    }

    function drawMockQRCode(ctx, x, y, size) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x, y, size, size);

        var finderSize = Math.floor(size * 7 / 25);
        drawFinderPattern(ctx, x, y, finderSize);
        drawFinderPattern(ctx, x + size - finderSize, y, finderSize);
        drawFinderPattern(ctx, x, y + size - finderSize, finderSize);

        ctx.fillStyle = '#000000';
        var cellSize = size / 25;
        for (var row = 0; row < 25; row++) {
            for (var col = 0; col < 25; col++) {
                if ((row < 8 && col < 8) || (row < 8 && col >= 17) || (row >= 17 && col < 8)) {
                    continue;
                }
                if (Math.random() > 0.5) {
                    ctx.fillRect(x + col * cellSize, y + row * cellSize, cellSize, cellSize);
                }
            }
        }
    }

    function drawFinderPattern(ctx, x, y, size) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(x, y, size, size);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + size/7, y + size/7, size*5/7, size*5/7);
        ctx.fillStyle = '#000000';
        ctx.fillRect(x + size*2/7, y + size*2/7, size*3/7, size*3/7);
    }

    /* ===================== Phase 4: Audio & Visual Polish ===================== */
    var audioBuffers = {};