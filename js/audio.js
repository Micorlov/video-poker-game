var audioCtx = null;
    var soundEnabled = true;
    var audioUnlocked = false;

    function initSound() {
        try {
            var stored = localStorage.getItem('vp_sound_enabled');
            if (stored !== null) soundEnabled = stored === 'true';
        } catch (e) {}
        updateSoundButtonUI();
        unlockAudioOnInteraction();
    }

    // Mobile browsers suspend AudioContext until a user gesture unlocks it.
    function unlockAudioOnInteraction() {
        if (audioUnlocked) return;
        function unlock() {
            if (audioUnlocked) return;
            audioUnlocked = true;
            try {
                ensureAudioContext();
                // Play a silent buffer to fully unlock the audio subsystem
                var buf = audioCtx.createBuffer(1, 1, 22050);
                var src = audioCtx.createBufferSource();
                src.buffer = buf;
                src.connect(audioCtx.destination);
                src.start(0);
            } catch (e) {}
        }
        document.addEventListener('touchstart', unlock, { once: true, capture: true });
        document.addEventListener('click', unlock, { once: true, capture: true });
    }

    function ensureAudioContext() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            generatePreDecodedBuffers();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume().catch(function(e) {
                // Some browsers reject resume() if no user gesture — that's fine,
                // the unlock listener will retry on the next user interaction
            });
        }
    }

    function createSynthesizedBuffer(duration, synthFn) {
        var sampleRate = audioCtx.sampleRate;
        var buffer = audioCtx.createBuffer(1, sampleRate * duration, sampleRate);
        var data = buffer.getChannelData(0);
        synthFn(data, sampleRate);
        return buffer;
    }

    function generatePreDecodedBuffers() {
        audioBuffers.deal = createSynthesizedBuffer(0.15, synthDeal);
        audioBuffers.flip = createSynthesizedBuffer(0.1, synthFlip);
        audioBuffers.click = createSynthesizedBuffer(0.05, synthClick);
        audioBuffers.loss = createSynthesizedBuffer(0.5, synthLoss);
        audioBuffers.coin = createSynthesizedBuffer(0.3, synthCoin);
        audioBuffers.win = createSynthesizedBuffer(0.4, synthWin);
        audioBuffers.bigWin = createSynthesizedBuffer(1.0, synthBigWin);
        audioBuffers.levelUp = createSynthesizedBuffer(0.8, synthLevelUp);
    }

    function playSound(name) {
        if (!soundEnabled) return;
        ensureAudioContext();
        var buffer = audioBuffers[name];
        if (!buffer) return;
        var source = audioCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(audioCtx.destination);
        source.start(0);
    }

    function toggleSound() {
        ensureAudioContext();
        soundEnabled = !soundEnabled;
        try {
            localStorage.setItem('vp_sound_enabled', soundEnabled);
        } catch (e) {}
        updateSoundButtonUI();
        if (soundEnabled) {
            playSound('click');
        }
    }

    function updateSoundButtonUI() {
        var btn = document.getElementById('sound-toggle-btn');
        if (btn) {
            btn.textContent = soundEnabled ? '🔊' : '🔇';
        }
    }

    /* Sound Synthesizer Functions */
    function synthDeal(data, sampleRate) {
        for (var i = 0; i < data.length; i++) {
            var t = i / sampleRate;
            var freq = 600 * Math.exp(-30 * t) + 100;
            var amp = Math.exp(-25 * t);
            data[i] = Math.sin(2 * Math.PI * freq * t) * amp * 0.5;
        }
    }

    function synthFlip(data, sampleRate) {
        for (var i = 0; i < data.length; i++) {
            var t = i / sampleRate;
            var noise = Math.random() * 2 - 1;
            var amp = Math.exp(-40 * t);
            data[i] = (noise * 0.3 + Math.sin(2 * Math.PI * 150 * t) * 0.7) * amp * 0.6;
        }
    }

    function synthClick(data, sampleRate) {
        for (var i = 0; i < data.length; i++) {
            var t = i / sampleRate;
            var freq = 2000 * Math.exp(-100 * t);
            var amp = Math.exp(-80 * t);
            data[i] = Math.sin(2 * Math.PI * freq * t) * amp * 0.4;
        }
    }

    function synthLoss(data, sampleRate) {
        for (var i = 0; i < data.length; i++) {
            var t = i / sampleRate;
            var freq = 120 * Math.exp(-4 * t);
            var amp = Math.exp(-3 * t);
            data[i] = Math.sin(2 * Math.PI * freq * t) * amp * 0.5;
        }
    }

    function synthCoin(data, sampleRate) {
        for (var i = 0; i < data.length; i++) {
            var t = i / sampleRate;
            var amp = Math.exp(-12 * t);
            var tone1 = Math.sin(2 * Math.PI * 1800 * t);
            var tone2 = Math.sin(2 * Math.PI * 2400 * t);
            data[i] = (tone1 + tone2) * 0.5 * amp * 0.4;
        }
    }

    function synthWin(data, sampleRate) {
        var freqs = [523.25, 659.25, 783.99, 1046.50];
        for (var i = 0; i < data.length; i++) {
            var t = i / sampleRate;
            var noteIdx = Math.min(freqs.length - 1, Math.floor(t / 0.1));
            var freq = freqs[noteIdx];
            var amp = Math.exp(-6 * (t % 0.1)) * Math.exp(-1.5 * t);
            data[i] = Math.sin(2 * Math.PI * freq * t) * amp * 0.4;
        }
    }

    function synthBigWin(data, sampleRate) {
        var chords = [
            [523.25, 659.25, 783.99],
            [587.33, 739.99, 880.00],
            [659.25, 830.61, 987.77],
            [783.99, 987.77, 1174.66]
        ];
        for (var i = 0; i < data.length; i++) {
            var t = i / sampleRate;
            var chordIdx = Math.min(chords.length - 1, Math.floor(t / 0.25));
            var freqs = chords[chordIdx];
            var amp = Math.exp(-3 * (t % 0.25)) * Math.exp(-0.5 * t);
            var val = 0;
            for (var f = 0; f < freqs.length; f++) {
                val += Math.sin(2 * Math.PI * freqs[f] * t);
            }
            data[i] = (val / freqs.length) * amp * 0.4;
        }
    }

    function synthLevelUp(data, sampleRate) {
        var freqs = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98];
        for (var i = 0; i < data.length; i++) {
            var t = i / sampleRate;
            var noteIdx = Math.min(freqs.length - 1, Math.floor(t / 0.08));
            var freq = freqs[noteIdx];
            var amp = noteIdx === freqs.length - 1 ? Math.exp(-2 * (t - 0.4)) : Math.exp(-8 * (t % 0.08));
            data[i] = Math.sin(2 * Math.PI * freq * t) * amp * 0.4;
        }
    }

    /* Win Celebrations */
    function triggerWinCelebration(handType, win) {
        var rank = HAND_RANK[handType] || 0;
        
        if (rank >= 7) {
            playSound('bigWin');
        } else {
            playSound('win');
        }

        if (rank <= 2) {
            var resultEl = document.getElementById('result');
            if (resultEl) {
                var winSpan = resultEl.querySelector('.win');
                if (winSpan) winSpan.classList.add('shimmer-gold');
            }
        }
        
        if (rank === 3 || rank === 4) {
            var cardElements = document.querySelectorAll('#hand .card.winning');
            cardElements.forEach(function(el, idx) {
                el.classList.add('bounce');
                el.style.animationDelay = (idx * 0.1) + 's';
            });
        }

        if (rank === 5 || rank === 6) {
            confettiBurst();
        }

        if (rank === 7) {
            confettiBurst();
            setTimeout(confettiBurst, 200);
            setTimeout(confettiBurst, 400);
            triggerScreenFlash();
        }

        if (rank >= 8) {
            launchFireworks();
            triggerScreenFlash();
            triggerScreenShake();
            goldRain();
        }

        var oldBalance = balance - win;
        animateBalance(oldBalance, balance, 1000);
    }

    function triggerScreenFlash() {
        var flash = document.createElement('div');
        flash.className = 'flash-overlay';
        document.body.appendChild(flash);
        setTimeout(function() { flash.remove(); }, 500);
    }

    function triggerScreenShake() {
        document.body.classList.add('screen-shake');
        setTimeout(function() {
            document.body.classList.remove('screen-shake');
        }, 500);
    }

    function confettiBurst() {
        var colors = ['#ffd700', '#4ade80', '#ff6b6b', '#8a2be2', '#ffffff', '#ffaa00'];
        var container = document.body;
        for (var i = 0; i < 30; i++) {
            var p = document.createElement('div');
            p.className = 'confetti-burst-piece';
            p.style.background = colors[Math.floor(Math.random() * colors.length)];
            
            var angle = Math.random() * Math.PI * 2;
            var velocity = 50 + Math.random() * 150;
            var tx = Math.cos(angle) * velocity;
            var ty = Math.sin(angle) * velocity;
            
            p.style.setProperty('--tx', tx + 'px');
            p.style.setProperty('--ty', ty + 'px');
            
            p.style.left = '50vw';
            p.style.top = '50vh';
            container.appendChild(p);
            
            setTimeout(function(el) { return function() { el.remove(); }; }(p), 1000);
        }
    }

    function launchFireworks() {
        for (var f = 0; f < 5; f++) {
            setTimeout(function() {
                var x = 20 + Math.random() * 60;
                var y = 20 + Math.random() * 40;
                createFirework(x, y);
            }, f * 400);
        }
    }

    function createFirework(x, y) {
        var colors = ['#ffd700', '#ffaa00', '#ff5500', '#ff00aa', '#00ffaa', '#00aaff'];
        var container = document.body;
        for (var i = 0; i < 24; i++) {
            var p = document.createElement('div');
            p.className = 'confetti-burst-piece';
            p.style.background = colors[Math.floor(Math.random() * colors.length)];
            
            var angle = Math.random() * Math.PI * 2;
            var velocity = 30 + Math.random() * 120;
            var tx = Math.cos(angle) * velocity;
            var ty = Math.sin(angle) * velocity;
            
            p.style.setProperty('--tx', tx + 'px');
            p.style.setProperty('--ty', ty + 'px');
            
            p.style.left = x + 'vw';
            p.style.top = y + 'vh';
            container.appendChild(p);
            
            setTimeout(function(el) { return function() { el.remove(); }; }(p), 1000);
        }
    }

    function goldRain() {
        for (var i = 0; i < 50; i++) {
            var p = document.createElement('div');
            p.className = 'gold-rain-piece';
            p.style.left = (Math.random() * 100) + 'vw';
            p.style.animationDuration = (1.5 + Math.random() * 2) + 's';
            p.style.animationDelay = (Math.random() * 1.5) + 's';
            document.body.appendChild(p);
            setTimeout(function(el) { return function() { el.remove(); }; }(p), 3500);
        }
    }

    function animateBalance(startValue, endValue, durationMs) {
        var el = document.getElementById('balance');
        if (!el) return;
        
        var startTime = performance.now();
        var coinTriggerIndex = 0;
        
        function update(now) {
            var elapsed = now - startTime;
            var pct = Math.min(1, elapsed / durationMs);
            
            var ease = pct * (2 - pct);
            var current = Math.round(startValue + (endValue - startValue) * ease);
            el.textContent = current;

            // Arpeggiate coin sound every few credits
            var step = Math.floor(current / 5);
            if (step > coinTriggerIndex) {
                playSound('coin');
                coinTriggerIndex = step;
            }
            
            if (pct < 1) {
                requestAnimationFrame(update);
            } else {
                el.textContent = endValue;
            }
        }
        
        requestAnimationFrame(update);
    }