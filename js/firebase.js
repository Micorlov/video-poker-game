const firebaseConfig = {
        apiKey: "AIzaSyB6m0Yis89jxvm06OFBqxs8P_vADjRXk0U",
        authDomain: "video-poker-6d665.firebaseapp.com",
        projectId: "video-poker-6d665",
        storageBucket: "video-poker-6d665.firebasestorage.app",
        messagingSenderId: "53702406091",
        appId: "1:53702406091:web:1ef4969a8cc77ebd6a504e"
    };
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const db = firebase.firestore();
    const ADMIN_EMAIL = 'micorlov@gmail.com';

    function signInWithGoogle() {
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        const el = document.getElementById('login-error');
        if (el) el.style.display = 'none';

        // Redirect-first: avoids Safari popup blocker and ITP issues.
        // Falls back to popup only if redirect is not supported (e.g. in some webviews).
        auth.signInWithRedirect(provider).catch(function(redirectErr) {
            // Redirect not available — try popup as fallback
            auth.signInWithPopup(provider).catch(function(popupErr) {
                if (el) {
                    el.textContent = popupErr.message;
                    el.style.display = 'block';
                }
            });
        });
    }

    function signInWithEmail() {
        var email = document.getElementById('login-email').value.trim();
        var firstName = document.getElementById('login-first-name').value.trim();
        var lastName = document.getElementById('login-last-name').value.trim();
        var errorEl = document.getElementById('login-error');
        var confirmEl = document.getElementById('email-confirm-msg');
        var submitBtn = document.getElementById('email-submit-btn');

        if (errorEl) errorEl.style.display = 'none';
        if (confirmEl) confirmEl.style.display = 'none';

        if (!email || !firstName || !lastName) {
            if (errorEl) {
                errorEl.textContent = 'Please fill in all fields.';
                errorEl.style.display = 'block';
            }
            return;
        }

        // Store name so we can set it after sign-in completes
        var displayName = firstName + ' ' + lastName;
        try {
            localStorage.setItem('vp_email_name', displayName);
            localStorage.setItem('vp_email_address', email);
        } catch (e) {}

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Sending link...';
        }

        var actionCodeSettings = {
            url: window.location.href.split('?')[0],
            handleCodeInApp: true
        };

        auth.sendSignInLinkToEmail(email, actionCodeSettings).then(function() {
            // Store email locally so we don't need to ask again
            try {
                localStorage.setItem('vp_email_for_signin', email);
            } catch (e) {}

            if (confirmEl) confirmEl.style.display = 'block';
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = '✉ Continue with Email';
            }
        }).catch(function(err) {
            if (errorEl) {
                errorEl.textContent = err.message;
                errorEl.style.display = 'block';
            }
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = '✉ Continue with Email';
            }
        });
    }

    auth.onAuthStateChanged(function(user) {
        // Handle redirect result (must be called after auth state is ready)
        auth.getRedirectResult().catch(function(err) {
            if (err && err.code !== 'auth/no-current-user') {
                var el = document.getElementById('login-error');
                if (el) {
                    el.textContent = err.message;
                    el.style.display = 'block';
                }
            }
        });

        // Check for email link sign-in completion
        if (!user && auth.isSignInWithEmailLink(window.location.href)) {
            var savedEmail = '';
            try { savedEmail = localStorage.getItem('vp_email_for_signin') || ''; } catch (e) {}
            if (!savedEmail) {
                savedEmail = window.prompt('Please enter your email to confirm sign-in:') || '';
                if (savedEmail) {
                    try { localStorage.setItem('vp_email_for_signin', savedEmail); } catch (e) {}
                }
            }
            if (savedEmail) {
                auth.signInWithEmailLink(savedEmail, window.location.href).then(function() {
                    try { localStorage.removeItem('vp_email_for_signin'); } catch (e) {}
                }).catch(function(err) {
                    var el = document.getElementById('login-error');
                    if (el) {
                        el.textContent = err.message;
                        el.style.display = 'block';
                    }
                });
            }
            return;
        }

        if (user) {
            // If user signed in via email link, set their display name
            var pendingName = '';
            try {
                pendingName = localStorage.getItem('vp_email_name') || '';
            } catch (e) {}
            if (pendingName && !user.displayName) {
                user.updateProfile({ displayName: pendingName }).then(function() {
                    try { localStorage.removeItem('vp_email_name'); } catch (e) {}
                    injectUserBar(user);
                }).catch(function() {
                    // Non-fatal: name will still be saved in Firestore
                });
            }

            document.getElementById('login-overlay').classList.add('hidden');
            document.getElementById('game-container').style.display = '';
            document.getElementById('rank-bar').classList.remove('hidden');
            injectUserBar(user);
            logUserToFirestore(user);
            loadUserState(user);
            refreshLeaderboard();
            initSound();
            if (window.initRooms) window.initRooms(user);
            if (window.initEngagement) window.initEngagement(user);
        } else {
            document.getElementById('login-overlay').classList.remove('hidden');
            document.getElementById('game-container').style.display = 'none';
            document.getElementById('rank-bar').classList.add('hidden');
            var bar = document.getElementById('user-bar');
            if (bar) bar.remove();
            if (window.teardownRooms) window.teardownRooms();
            if (window.teardownEngagement) window.teardownEngagement();
        }
    });

    function injectUserBar(user) {
        let bar = document.getElementById('user-bar');
        if (bar) bar.remove();
        bar = document.createElement('div');
        bar.id = 'user-bar';
        bar.className = 'user-bar';
        const photo = user.photoURL
            ? '<img src="' + user.photoURL + '" alt="" onclick="egOpenProfile()" style="cursor:pointer">'
            : '';
        const adminBtn = user.email === ADMIN_EMAIL
            ? '<a class="admin-link" href="admin.html" target="_blank">Admin</a>'
            : '';
        bar.innerHTML = photo +
            '<span onclick="egOpenProfile()" style="cursor:pointer">' + (user.displayName || user.email) + '</span>' +
            '<span class="lvl-badge" id="ub-level" onclick="egOpenProfile()" style="cursor:pointer">1</span>' +
            '<span class="xp-bar"><span class="xp-fill" id="ub-xp-fill"></span></span>' +
            '<span class="xp-text" id="ub-xp-text"></span>' +
            '<span class="ub-ach-count" id="ub-ach-count" onclick="egOpenProfile()">🏆 0</span>' +
            adminBtn +
            '<button id="sound-toggle-btn" onclick="toggleSound()" style="background:none; border:none; color:#ffd700; font-size:18px; cursor:pointer; padding:0 10px; line-height:1;">🔊</button>' +
            '<button onclick="signOut()">Sign Out</button>';
        const container = document.getElementById('game-container');
        container.insertBefore(bar, container.firstChild);
        updateSoundButtonUI();
    }

    function signOut() {
        auth.signOut();
    }

    function loadUserState(user) {
        // Try localStorage first as instant fallback
        restoreGameState();

        const hourKey = getHourKey();
        const hourlyDocId = hourKey + '_' + user.uid;
        firebaseSafe(function() {
            return db.collection('hourly_scores').doc(hourlyDocId).get().then(function(doc) {
                if (doc.exists) {
                    const data = doc.data();
                    hourlyRebuys = data.rebuys || 0;
                    balance = (data.score || 0) + 100 * (1 + hourlyRebuys);
                    document.getElementById('balance').textContent = balance;
                    saveGameState();
                }
            });
        }, function(err) {
            console.error('Error loading hourly state:', err);
        });

        const dayKey = getDayKey();
        const dailyDocId = dayKey + '_' + user.uid;
        db.collection('daily_scores').doc(dailyDocId).get().then(function(doc) {
            if (doc.exists) {
                dailyRebuys = doc.data().rebuys || 0;
            }
        }).catch(function(err) {
            console.error('Error loading daily state:', err);
        });
    }

    function logUserToFirestore(user) {
        // For email sign-in, fall back to stored name if profile has no displayName
        var displayName = user.displayName || '';
        if (!displayName) {
            try {
                var stored = localStorage.getItem('vp_email_name') || '';
                if (stored) {
                    displayName = stored;
                    try { localStorage.removeItem('vp_email_name'); } catch (e) {}
                }
            } catch (e) {}
        }
        db.collection('users').doc(user.uid).set({
            uid: user.uid,
            email: user.email,
            displayName: displayName,
            photoURL: user.photoURL || '',
            lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true }).then(function() {
            return db.collection('users').doc(user.uid).get();
        }).then(function(doc) {
            var updateData = {};
            var data = doc.exists ? doc.data() : {};
            
            if (!data.referralCode) {
                updateData.referralCode = generateRoomCode();
            }
            
            if (doc.exists && !data.firstSeen) {
                updateData.firstSeen = firebase.firestore.FieldValue.serverTimestamp();
                updateData.referralCount = 0;
                
                var refCode = '';
                try {
                    refCode = (sessionStorage.getItem('vp_referred_by_code') || '').trim().toUpperCase();
                    sessionStorage.removeItem('vp_referred_by_code');
                } catch (e) {}
                
                if (refCode && refCode !== updateData.referralCode) {
                    updateData.referredBy = refCode;
                }
            }
            
            if (Object.keys(updateData).length > 0) {
                return db.collection('users').doc(user.uid).update(updateData);
            }
        }).catch(function(err) {
            console.error('logUserToFirestore error:', err);
        });
    }

    function openAdmin() {
        const panel = document.getElementById('admin-panel');
        panel.classList.remove('hidden');
        loadAdminData();
    }

    function closeAdmin() {
        document.getElementById('admin-panel').classList.add('hidden');
    }

    // Hourly Competition
    const HAND_RANK = {
        'Nothing': 0, 'Jacks or Better': 1, 'Two Pair': 2, 'Three of a Kind': 3,
        'Straight': 4, 'Flush': 5, 'Full House': 6, 'Four of a Kind': 7,
        'Straight Flush': 8, 'Royal Flush': 9
    };