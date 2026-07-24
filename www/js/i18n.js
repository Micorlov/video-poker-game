// i18n — language detection (auto: Israel/Hebrew browsers get Hebrew + RTL by
// default) plus a manual Settings toggle. Translates static DOM text via
// [data-i18n] attributes and exposes t()/vpHandLabel()/vpHandExplanation()
// for the dynamic strings built in JS.

const TRANSLATIONS = {
    en: {
        'app.title': 'Video Poker',
        'app.brandTitle': 'Video Poker',

        'nav.play': 'Play',
        'nav.stats': 'Stats',
        'nav.friends': 'Friends',
        'nav.settings': 'Settings',

        'play.balance': 'Balance',
        'play.totalBet': 'Total Bet',
        'play.allIn': 'ALL IN',
        'play.handPlaceholder': 'Tap a card or Deal to start the hand',
        'play.deal': 'Deal',
        'play.draw': 'Draw',
        'play.hintTitle': 'Strategy hints',
        'play.winStreak': 'Win Streak',
        'play.friendsLeaderboard': 'Friends Leaderboard',
        'play.signInFriends': 'Sign in to see your friends',
        'play.hourlyChampions': '⏱ Hourly Champions',
        'play.signInCompete': 'Sign in to compete for the hourly crown',
        'play.lbFriends': 'Friends',
        'play.lbHourly': 'Hourly',
        'play.lbDaily': 'Daily',
        'play.signInLeaderboards': 'Sign in to see leaderboards',
        'play.playWithFriends': 'Play With Friends',
        'play.seeAll': 'See All ›',
        'play.createRoomLong': '+ Create a Poker Room with Friends',
        'play.resultDefault': 'Place your bet and deal to play',
        'play.winResult': '🎉 {{hand}}! +{{win}} credits! 🎉',
        'play.nothingResult': 'Nothing — {{cards}}',
        'play.unlockAt': 'Unlock · {{level}}',

        'stats.title': 'Statistics',
        'stats.today': 'Today',
        'stats.allTime': 'All-Time',
        'stats.net': 'Net',
        'stats.won': 'Won',
        'stats.lost': 'Lost',
        'stats.handsPlayed': 'Hands Played',
        'stats.bestStreak': 'Best Streak',

        'friends.title': 'Friends',
        'friends.invite': '+ Invite',
        'friends.signInAdd': 'Sign in to add friends',
        'friends.yourCode': 'Your Code',
        'friends.inviteFriends': 'Invite Friends',
        'friends.copyInviteLink': 'Copy Invite Link',
        'friends.whatsapp': 'WhatsApp',
        'friends.addFriend': 'Add a Friend',
        'friends.friendCodePlaceholder': 'Friend code…',
        'friends.add': 'Add',
        'friends.leaderboard': 'Leaderboard',
        'friends.pokerRooms': 'Poker Rooms',
        'friends.addByCode': 'Add friends by their code to compare scores.',
        'friends.noRoomsYet': 'No rooms yet — create one below.',
        'friends.roomNamePlaceholder': 'Room name…',
        'friends.createAndInvite': 'Create & Invite',

        'settings.title': 'Settings',
        'settings.language': 'Language',
        'settings.langEnglish': 'English',
        'settings.langHebrew': 'עברית',
        'settings.gameplay': 'Gameplay',
        'settings.soundEffects': 'Sound Effects',
        'settings.hapticFeedback': 'Haptic Feedback',
        'settings.theme': 'Theme',
        'settings.themeGreen': '🟢 Green',
        'settings.themeBlue': '🔵 Blue',
        'settings.themeCrimson': '🔴 Crimson',
        'settings.defaultBet': 'Default Bet',
        'settings.gameVariant': 'Game Variant',
        'settings.handsPerDeal': 'Hands per Deal',
        'settings.oneHand': '1 Hand',
        'settings.threeHands': '3× Hands',
        'settings.fiveHands': '5× Hands',
        'settings.support': 'Support',
        'settings.payoutTable': 'Payout Table',
        'settings.account': 'Account',
        'settings.signInGoogle': 'Sign in with Google',
        'settings.signedIn': 'Signed in',
        'settings.signOut': 'Sign Out',
        'settings.notifications': 'Notifications',
        'settings.friendActivity': 'Friend activity',
        'settings.leaderboardUpdates': 'Leaderboard updates',
        'settings.dailyBonusReminder': 'Daily bonus reminder',
        'settings.friendsBestHands': "Friends' best hands",
        'settings.enableNotifications': 'Enable Notifications',
        'settings.resetStats': 'Reset Statistics',
        'settings.footer': 'Video Poker · v3.0',

        'variant.jacks': 'Jacks or Better',
        'variant.deuces': 'Deuces Wild',
        'variant.bonus': 'Bonus Poker',
        'variant.doubleBonus': 'Double Bonus',

        'modal.signInTitle': 'Sign in to play with friends',
        'modal.signInSub': 'Add friends, join rooms, and compare scores.',
        'modal.continueGoogle': 'Continue with Google',
        'modal.continueFacebook': 'Continue with Facebook',
        'modal.createRoom': 'Create a Poker Room',
        'modal.roomNamePlaceholder': 'Room name…',
        'modal.stake5': 'Stake 5',
        'modal.stake10': 'Stake 10',
        'modal.stake20': 'Stake 20',
        'modal.stake50': 'Stake 50',
        'modal.createRoomBtn': 'Create Room',
        'modal.gotCode': 'Got a code from a friend?',
        'modal.roomCodePlaceholder': 'Room code…',
        'modal.join': 'Join',
        'modal.room': 'Room',
        'modal.code': 'Code:',

        'sheet.inviteFriends': 'Invite Friends',
        'sheet.copy': 'Copy',
        'sheet.shareInviteLink': 'Share Invite Link',
        'sheet.roomCreated': 'Room Created 🎉',
        'sheet.inviteToRoom': 'Invite friends to "{{name}}"',
        'sheet.telegram': 'Telegram',
        'sheet.done': 'Done',
        'sheet.goAllIn': '🔥 Go All In',
        'sheet.allInSub': 'You can use ALL IN once a day. This bets your entire balance — {{amount}} credits — on the next hand. Slide to confirm.',
        'sheet.slideToConfirm': 'Slide to confirm',

        'ob.eyebrow': 'Social Casino',
        'ob.welcomeTitle': 'Royal Video Poker',
        'ob.welcomeSubtitle': 'Five cards. One decision. Play with free chips — no real money, all the thrill.',
        'ob.pill5card': '5-Card Draw',
        'ob.pillFreeChips': 'Free Chips Daily',
        'ob.pillNoRealMoney': 'No Real Money',
        'ob.knowYourHands': 'Know Your Hands',
        'ob.biggerHands': 'Bigger hands pay bigger multipliers.',
        'ob.plusNote': 'Plus Flush, Straight, Three of a Kind, and Two Pair — nine winning hands in total.',
        'ob.betAfterDecide': 'Bet After You Decide',
        'ob.seeCards': 'See your cards, hold what you want, then set your bet before the draw.',
        'ob.oneFreeAllIn': 'One free All-In per day — invite a friend to unlock another.',
        'ob.competeClimb': 'Compete & Climb',
        'ob.raceLeaderboards': 'Race Friends, Hourly, and Daily leaderboards for bonus chips.',
        'ob.friendsToday': 'Friends · Today',
        'ob.youre1': "#1 · You're #1!",
        'ob.alsoLive': 'Also live: hourly and daily tournaments against every player in the app.',
        'ob.neverMissWin': 'Never Miss a Win',
        'ob.getNotified': 'Get notified about tournament results, friend challenges, and daily bonuses.',
        'ob.dailyBonusReminders': 'Daily bonus reminders',
        'ob.friendChallengeAlerts': 'Friend challenge alerts',
        'ob.tournamentResults': 'Tournament results',
        'ob.enableNotifications': 'Enable Notifications',
        'ob.notNow': 'Not Now',
        'ob.saveProgress': 'Save Your Progress',
        'ob.signInSync': 'Sign in to sync your chips and compete with friends.',
        'ob.neverLose': 'Never lose your chips or progress',
        'ob.playAcross': 'Play across your phone and tablet',
        'ob.findFriends': 'Find friends by name automatically',
        'ob.continueGoogle': 'Continue with Google',
        'ob.continueGuest': 'Continue as Guest',
        'ob.back': 'Back',
        'ob.next': 'Next',
        'ob.held': 'HELD',

        'hand.royalFlush': 'Royal Flush',
        'hand.straightFlush': 'Straight Flush',
        'hand.fourOfKind': 'Four of a Kind',
        'hand.fourAces': 'Four Aces',
        'hand.four2s4s': 'Four 2s-4s',
        'hand.four5sKs': 'Four 5s-Ks',
        'hand.fourDeuces': 'Four Deuces',
        'hand.wildRoyalFlush': 'Wild Royal Flush',
        'hand.fiveOfKind': 'Five of a Kind',
        'hand.fullHouse': 'Full House',
        'hand.flush': 'Flush',
        'hand.straight': 'Straight',
        'hand.threeOfKind': 'Three of a Kind',
        'hand.twoPair': 'Two Pair',
        'hand.jacksOrBetter': 'Jacks or Better',
        'hand.nothing': 'Nothing',

        'exp.royalFlush': 'A, K, Q, J, 10 — all the same suit. The best hand in the game.',
        'exp.straightFlush': 'Five cards in a row, all the same suit.',
        'exp.fourOfKind': 'Four cards of the same rank.',
        'exp.fourAces': 'Four Aces — the biggest quad bonus.',
        'exp.four2s4s': 'Four of a kind, rank 2 through 4.',
        'exp.four5sKs': 'Four of a kind, rank 5 through King.',
        'exp.fourDeuces': 'Four wild deuces — an automatic top-tier win.',
        'exp.wildRoyalFlush': 'A Royal Flush made using at least one wild deuce.',
        'exp.fiveOfKind': 'Five cards of the same rank, using wild deuces.',
        'exp.fullHouse': 'Three of a kind plus a pair.',
        'exp.flush': 'Five cards of the same suit, not in sequence.',
        'exp.straight': 'Five cards in sequence, mixed suits.',
        'exp.threeOfKind': 'Three cards of the same rank.',
        'exp.twoPair': 'Two separate pairs.',
        'exp.jacksOrBetter': 'A pair of Jacks, Queens, Kings, or Aces.',
        'exp.nothing': 'No paying hand — better luck next deal.',

        'win.pair': 'Pair',
        'win.threeOfKind': '3 of a Kind',
        'win.fourOfKind': '4 of a Kind',
        'win.straight': 'Straight',
        'win.flush': 'Flush',
        'win.straightFlush': 'Str. Flush',
        'win.royalFlush': 'Royal Flush',

        'suit.spades': 'Spades',
        'suit.hearts': 'Hearts',
        'suit.diamonds': 'Diamonds',
        'suit.clubs': 'Clubs',
        'rank.ace': 'Ace',
        'rank.jack': 'Jack',
        'rank.queen': 'Queen',
        'rank.king': 'King',
        'aria.cardOf': '{{rank}} of {{suit}}',
        'aria.cardOfHeld': '{{rank}} of {{suit}}, held',

        'common.you': 'You',
        'common.player': 'Player',
        'common.leader': 'Leader',
        'common.copy': 'Copy',
        'common.copied': 'Copied!',
        'common.cancel': 'Cancel',
        'common.rankYouAreFirst': "#{{rank}} · You're #1!",
        'common.rankLeadsBy': '#{{rank}} · {{name}} leads by {{gap}}',
        'common.noScoresYet': 'No scores yet — be the first!',
        'common.resetsInM': 'Resets in {{m}}m',
        'common.resetsInHM': 'Resets in {{h}}h {{m}}m',
        'common.tournament': 'Tournament',

        'toast.unlockLevel': '🔒 Unlocks at level {{level}}',
        'toast.multiHandUnlock': '🔒 Multi-hand unlocks at level {{level}}',
        'toast.rebuy': '♻ +500 credits',
        'toast.noAllInLeft': '⛔ No ALL INs left — back tomorrow!',
        'toast.allInGoodLuck': '🔥 ALL IN — good luck!',
        'toast.statsReset': 'Statistics reset',
        'toast.hintsOn': '💡 Hints on — suggested holds glow blue',
        'toast.noPlayerFound': 'No player found with that code.',
        'toast.ownCode': 'That is your own code!',
        'toast.alreadyFriends': 'Already in your friends list.',
        'toast.friendAdded': 'Friend added!',
        'toast.couldNotAddFriend': 'Could not add friend — try again.',
        'toast.couldNotGenerateLink': 'Could not generate invite link.',
        'toast.linkCopied': 'Invite link copied!',
        'toast.couldNotCopy': 'Could not copy — tap and hold the link.',
        'toast.couldNotOpenWhatsApp': 'Could not open WhatsApp.',
        'toast.signInConnect': 'Sign in to connect with your friend!',
        'toast.noPlayerInviteLink': 'No player found with that invite link.',
        'toast.ownInviteLink': "That's your own invite link!",
        'toast.giveName': 'Give your room a name.',
        'toast.roomCreated': 'Room created — code: {{code}}',
        'toast.couldNotCreateRoom': 'Could not create room — try again.',
        'toast.noRoomFound': 'No room found with that code.',
        'toast.joinedRoom': 'Joined {{name}}!',
        'toast.couldNotJoinRoom': 'Could not join room — try again.',
        'toast.linkCopiedShare': 'Link copied — share it with friends!',
        'toast.signInJoinRoom': 'Sign in to join the poker room!',

        'room.defaultName': 'Room',
        'room.open': 'Open',
        'room.inProgress': 'In Progress',
        'room.joinTable': 'Join Table',
        'room.enterTable': 'Enter Table',
        'room.membersMeta': '{{count}}/{{capacity}} friends · Stake {{stake}}',
        'room.createShort': '+ Create a Poker Room with Friends',

        'lb.friendsToday': 'Friends · Today',
        'lb.hourlyChampions': '⏱ Hourly Champions',
        'lb.dailyChampions': '📅 Daily Champions',
        'lb.showTop20': 'Show Top 20 ▾',
        'lb.showTop5': 'Show Top 5 ▴',

        'champ.resetsPlaceholder': 'Resets in —m',
        'champ.noChampionsYet': 'No champions yet this hour — be the first!',
        'champ.braceletDaily': 'Daily Bracelet',
        'champ.braceletHourly': 'Hourly Bracelet',

        'story.noWinningHands': 'No winning hands yet',
        'story.winAHand': 'Win a hand to create your story',
        'story.creditsMult': '+{{payout}} credits · {{mult}}×',
        'story.braceletStrip': '💍 {{type}} — {{hand}} for +{{amount}} credits',

        'pwa.installBar': 'Install Video Poker for quick access',
        'pwa.install': 'Install',
        'pwa.dismiss': '✕',

        'share.appName': 'Video Poker',
        'share.inviteText': '{{name}} wants to play Video Poker with you! Join with this link:\n{{link}}',
        'share.inviteTextShort': '{{name}} wants to play Video Poker with you! Join here: {{link}}',
        'share.roomText': 'Join my poker room "{{name}}" in Video Poker!\n{{link}}'
    },
    he: {
        'app.title': 'וידאו פוקר',
        'app.brandTitle': 'וידאו פוקר',

        'nav.play': 'משחק',
        'nav.stats': 'סטטיסטיקה',
        'nav.friends': 'חברים',
        'nav.settings': 'הגדרות',

        'play.balance': 'יתרה',
        'play.totalBet': 'הימור כולל',
        'play.allIn': 'כל הקופה',
        'play.handPlaceholder': 'הקש על קלף או על "חלק" כדי להתחיל יד',
        'play.deal': 'חלק',
        'play.draw': 'משוך',
        'play.hintTitle': 'רמזי אסטרטגיה',
        'play.winStreak': 'רצף ניצחונות',
        'play.friendsLeaderboard': 'טבלת דירוג חברים',
        'play.signInFriends': 'התחבר כדי לראות את החברים שלך',
        'play.hourlyChampions': '⏱ אלופי השעה',
        'play.signInCompete': 'התחבר כדי להתחרות על כתר השעה',
        'play.lbFriends': 'חברים',
        'play.lbHourly': 'שעתי',
        'play.lbDaily': 'יומי',
        'play.signInLeaderboards': 'התחבר כדי לראות טבלאות דירוג',
        'play.playWithFriends': 'שחק עם חברים',
        'play.seeAll': 'הצג הכל ‹',
        'play.createRoomLong': '+ צור חדר פוקר עם חברים',
        'play.resultDefault': 'הנח הימור ולחץ "חלק" כדי לשחק',
        'play.winResult': '🎉 {{hand}}! +{{win}} קרדיטים! 🎉',
        'play.nothingResult': 'כלום — {{cards}}',
        'play.unlockAt': 'פתיחה · {{level}}',

        'stats.title': 'סטטיסטיקה',
        'stats.today': 'היום',
        'stats.allTime': 'כל הזמנים',
        'stats.net': 'נטו',
        'stats.won': 'זכיות',
        'stats.lost': 'הפסדים',
        'stats.handsPlayed': 'ידיים ששוחקו',
        'stats.bestStreak': 'הרצף הטוב ביותר',

        'friends.title': 'חברים',
        'friends.invite': '+ הזמן',
        'friends.signInAdd': 'התחבר כדי להוסיף חברים',
        'friends.yourCode': 'הקוד שלך',
        'friends.inviteFriends': 'הזמן חברים',
        'friends.copyInviteLink': 'העתק קישור הזמנה',
        'friends.whatsapp': 'וואטסאפ',
        'friends.addFriend': 'הוסף חבר',
        'friends.friendCodePlaceholder': 'קוד חבר…',
        'friends.add': 'הוסף',
        'friends.leaderboard': 'טבלת דירוג',
        'friends.pokerRooms': 'חדרי פוקר',
        'friends.addByCode': 'הוסף חברים לפי הקוד שלהם כדי להשוות תוצאות.',
        'friends.noRoomsYet': 'אין עדיין חדרים — צור אחד למטה.',
        'friends.roomNamePlaceholder': 'שם חדר…',
        'friends.createAndInvite': 'צור והזמן',

        'settings.title': 'הגדרות',
        'settings.language': 'שפה',
        'settings.langEnglish': 'English',
        'settings.langHebrew': 'עברית',
        'settings.gameplay': 'משחק',
        'settings.soundEffects': 'אפקטים קוליים',
        'settings.hapticFeedback': 'משוב מגע',
        'settings.theme': 'ערכת נושא',
        'settings.themeGreen': '🟢 ירוק',
        'settings.themeBlue': '🔵 כחול',
        'settings.themeCrimson': '🔴 אדום',
        'settings.defaultBet': 'הימור ברירת מחדל',
        'settings.gameVariant': 'וריאנט משחק',
        'settings.handsPerDeal': 'ידיים לחלוקה',
        'settings.oneHand': 'יד אחת',
        'settings.threeHands': '3× ידיים',
        'settings.fiveHands': '5× ידיים',
        'settings.support': 'תמיכה',
        'settings.payoutTable': 'טבלת תשלומים',
        'settings.account': 'חשבון',
        'settings.signInGoogle': 'התחבר עם Google',
        'settings.signedIn': 'מחובר',
        'settings.signOut': 'התנתק',
        'settings.notifications': 'התראות',
        'settings.friendActivity': 'פעילות חברים',
        'settings.leaderboardUpdates': 'עדכוני טבלת דירוג',
        'settings.dailyBonusReminder': 'תזכורת בונוס יומי',
        'settings.friendsBestHands': 'הידיים הטובות ביותר של חברים',
        'settings.enableNotifications': 'הפעל התראות',
        'settings.resetStats': 'אפס סטטיסטיקה',
        'settings.footer': 'וידאו פוקר · v3.0',

        'variant.jacks': 'נסיכים ומעלה',
        'variant.deuces': 'שתיים פרועות',
        'variant.bonus': 'בונוס פוקר',
        'variant.doubleBonus': 'דאבל בונוס',

        'modal.signInTitle': 'התחבר כדי לשחק עם חברים',
        'modal.signInSub': 'הוסף חברים, הצטרף לחדרים והשווה תוצאות.',
        'modal.continueGoogle': 'המשך עם Google',
        'modal.continueFacebook': 'המשך עם Facebook',
        'modal.createRoom': 'צור חדר פוקר',
        'modal.roomNamePlaceholder': 'שם חדר…',
        'modal.stake5': 'הימור 5',
        'modal.stake10': 'הימור 10',
        'modal.stake20': 'הימור 20',
        'modal.stake50': 'הימור 50',
        'modal.createRoomBtn': 'צור חדר',
        'modal.gotCode': 'קיבלת קוד מחבר?',
        'modal.roomCodePlaceholder': 'קוד חדר…',
        'modal.join': 'הצטרף',
        'modal.room': 'חדר',
        'modal.code': 'קוד:',

        'sheet.inviteFriends': 'הזמן חברים',
        'sheet.copy': 'העתק',
        'sheet.shareInviteLink': 'שתף קישור הזמנה',
        'sheet.roomCreated': 'החדר נוצר 🎉',
        'sheet.inviteToRoom': 'הזמן חברים אל "{{name}}"',
        'sheet.telegram': 'טלגרם',
        'sheet.done': 'סיום',
        'sheet.goAllIn': '🔥 כל הקופה',
        'sheet.allInSub': 'ניתן להשתמש ב"כל הקופה" פעם ביום. הפעולה מהמרת את כל היתרה שלך — {{amount}} קרדיטים — על היד הבאה. החלק כדי לאשר.',
        'sheet.slideToConfirm': 'החלק כדי לאשר',

        'ob.eyebrow': 'קזינו חברתי',
        'ob.welcomeTitle': 'וידאו פוקר רויאל',
        'ob.welcomeSubtitle': 'חמישה קלפים. החלטה אחת. שחק עם ז\'יטונים חינם — בלי כסף אמיתי, כל הריגוש.',
        'ob.pill5card': 'חמישה קלפים',
        'ob.pillFreeChips': "ז'יטונים חינם מדי יום",
        'ob.pillNoRealMoney': 'ללא כסף אמיתי',
        'ob.knowYourHands': 'הכר את הידיים שלך',
        'ob.biggerHands': 'ידיים גדולות יותר משלמות מכפילים גדולים יותר.',
        'ob.plusNote': 'בנוסף פלאש, סטרייט, שלישייה וזוג זוגות — תשע ידיים מנצחות בסך הכל.',
        'ob.betAfterDecide': 'הימר אחרי שהחלטת',
        'ob.seeCards': 'ראה את הקלפים שלך, החזק את מה שתרצה, ואז קבע את ההימור לפני המשיכה.',
        'ob.oneFreeAllIn': 'כל הקופה חינם פעם ביום — הזמן חבר כדי לפתוח עוד אחת.',
        'ob.competeClimb': 'התחרה וטפס',
        'ob.raceLeaderboards': "התחרה בטבלאות דירוג חברים, שעתיות ויומיות על ז'יטוני בונוס.",
        'ob.friendsToday': 'חברים · היום',
        'ob.youre1': '#1 · אתה במקום הראשון!',
        'ob.alsoLive': 'גם בשידור חי: טורנירים שעתיים ויומיים מול כל שחקן באפליקציה.',
        'ob.neverMissWin': 'אל תפספס אף ניצחון',
        'ob.getNotified': 'קבל התראות על תוצאות טורנירים, אתגרי חברים ובונוסים יומיים.',
        'ob.dailyBonusReminders': 'תזכורות בונוס יומי',
        'ob.friendChallengeAlerts': 'התראות אתגרי חברים',
        'ob.tournamentResults': 'תוצאות טורנירים',
        'ob.enableNotifications': 'הפעל התראות',
        'ob.notNow': 'לא עכשיו',
        'ob.saveProgress': 'שמור את ההתקדמות שלך',
        'ob.signInSync': "התחבר כדי לסנכרן את הז'יטונים שלך ולהתחרות עם חברים.",
        'ob.neverLose': "לעולם אל תאבד את הז'יטונים או ההתקדמות שלך",
        'ob.playAcross': 'שחק בטלפון ובטאבלט',
        'ob.findFriends': 'מצא חברים לפי שם אוטומטית',
        'ob.continueGoogle': 'המשך עם Google',
        'ob.continueGuest': 'המשך כאורח',
        'ob.back': 'אחורה',
        'ob.next': 'הבא',
        'ob.held': 'מוחזק',

        'hand.royalFlush': 'רויאל פלאש',
        'hand.straightFlush': 'סטרייט פלאש',
        'hand.fourOfKind': 'רביעייה',
        'hand.fourAces': 'ארבעה אסים',
        'hand.four2s4s': 'רביעייה 2 עד 4',
        'hand.four5sKs': 'רביעייה 5 עד מלך',
        'hand.fourDeuces': 'ארבע שתיים',
        'hand.wildRoyalFlush': 'רויאל פלאש פרוע',
        'hand.fiveOfKind': 'חמישייה',
        'hand.fullHouse': 'פול האוס',
        'hand.flush': 'פלאש',
        'hand.straight': 'סטרייט',
        'hand.threeOfKind': 'שלישייה',
        'hand.twoPair': 'שני זוגות',
        'hand.jacksOrBetter': 'נסיכים ומעלה',
        'hand.nothing': 'כלום',

        'exp.royalFlush': 'A, K, Q, J, 10 — כולם באותה סדרה. היד הטובה ביותר במשחק.',
        'exp.straightFlush': 'חמישה קלפים ברצף, כולם באותה סדרה.',
        'exp.fourOfKind': 'ארבעה קלפים באותו ערך.',
        'exp.fourAces': 'ארבעה אסים — בונוס הרביעייה הגדול ביותר.',
        'exp.four2s4s': 'רביעייה בערך שבין 2 ל-4.',
        'exp.four5sKs': 'רביעייה בערך שבין 5 למלך.',
        'exp.fourDeuces': 'ארבע שתיים פרועות — ניצחון עליון אוטומטי.',
        'exp.wildRoyalFlush': 'רויאל פלאש שהושג באמצעות לפחות שתיים פרועה אחת.',
        'exp.fiveOfKind': 'חמישה קלפים באותו ערך, באמצעות שתיים פרועות.',
        'exp.fullHouse': 'שלישייה ועוד זוג.',
        'exp.flush': 'חמישה קלפים באותה סדרה, שלא ברצף.',
        'exp.straight': 'חמישה קלפים ברצף, בסדרות מעורבות.',
        'exp.threeOfKind': 'שלושה קלפים באותו ערך.',
        'exp.twoPair': 'שני זוגות נפרדים.',
        'exp.jacksOrBetter': 'זוג נסיכים, מלכות, מלכים או אסים.',
        'exp.nothing': 'אין יד משלמת — בהצלחה בחלוקה הבאה.',

        'win.pair': 'זוג',
        'win.threeOfKind': 'שלישייה',
        'win.fourOfKind': 'רביעייה',
        'win.straight': 'סטרייט',
        'win.flush': 'פלאש',
        'win.straightFlush': 'סטר. פלאש',
        'win.royalFlush': 'רויאל פלאש',

        'suit.spades': 'עלה',
        'suit.hearts': 'לב',
        'suit.diamonds': 'יהלום',
        'suit.clubs': 'תלתן',
        'rank.ace': 'אס',
        'rank.jack': 'נסיך',
        'rank.queen': 'מלכה',
        'rank.king': 'מלך',
        'aria.cardOf': '{{rank}} {{suit}}',
        'aria.cardOfHeld': '{{rank}} {{suit}}, מוחזק',

        'common.you': 'אתה',
        'common.player': 'שחקן',
        'common.leader': 'מוביל',
        'common.copy': 'העתק',
        'common.copied': 'הועתק!',
        'common.cancel': 'ביטול',
        'common.rankYouAreFirst': '#{{rank}} · אתה במקום הראשון!',
        'common.rankLeadsBy': '#{{rank}} · {{name}} מוביל/ה ב-{{gap}}',
        'common.noScoresYet': 'אין עדיין תוצאות — היה הראשון!',
        'common.resetsInM': 'מתאפס בעוד {{m}} ד\'',
        'common.resetsInHM': 'מתאפס בעוד {{h}} ש\' {{m}} ד\'',
        'common.tournament': 'טורניר',

        'toast.unlockLevel': '🔒 נפתח ברמה {{level}}',
        'toast.multiHandUnlock': '🔒 מצב רב-ידני נפתח ברמה {{level}}',
        'toast.rebuy': '♻ +500 קרדיטים',
        'toast.noAllInLeft': '⛔ לא נשארו "כל הקופה" — חזור מחר!',
        'toast.allInGoodLuck': '🔥 כל הקופה — בהצלחה!',
        'toast.statsReset': 'הסטטיסטיקה אופסה',
        'toast.hintsOn': '💡 רמזים פעילים — החזקות מומלצות זוהרות בכחול',
        'toast.noPlayerFound': 'לא נמצא שחקן עם קוד זה.',
        'toast.ownCode': 'זהו הקוד שלך!',
        'toast.alreadyFriends': 'כבר ברשימת החברים שלך.',
        'toast.friendAdded': 'חבר נוסף!',
        'toast.couldNotAddFriend': 'לא ניתן להוסיף חבר — נסה שוב.',
        'toast.couldNotGenerateLink': 'לא ניתן ליצור קישור הזמנה.',
        'toast.linkCopied': 'קישור ההזמנה הועתק!',
        'toast.couldNotCopy': 'לא ניתן להעתיק — הקש והחזק על הקישור.',
        'toast.couldNotOpenWhatsApp': 'לא ניתן לפתוח את וואטסאפ.',
        'toast.signInConnect': 'התחבר כדי להתחבר עם החבר שלך!',
        'toast.noPlayerInviteLink': 'לא נמצא שחקן עם קישור הזמנה זה.',
        'toast.ownInviteLink': 'זהו קישור ההזמנה שלך!',
        'toast.giveName': 'תן שם לחדר שלך.',
        'toast.roomCreated': 'החדר נוצר — קוד: {{code}}',
        'toast.couldNotCreateRoom': 'לא ניתן ליצור חדר — נסה שוב.',
        'toast.noRoomFound': 'לא נמצא חדר עם קוד זה.',
        'toast.joinedRoom': 'הצטרפת אל {{name}}!',
        'toast.couldNotJoinRoom': 'לא ניתן להצטרף לחדר — נסה שוב.',
        'toast.linkCopiedShare': 'הקישור הועתק — שתף אותו עם חברים!',
        'toast.signInJoinRoom': 'התחבר כדי להצטרף לחדר הפוקר!',

        'room.defaultName': 'חדר',
        'room.open': 'פתוח',
        'room.inProgress': 'במשחק',
        'room.joinTable': 'הצטרף לשולחן',
        'room.enterTable': 'כניסה לשולחן',
        'room.membersMeta': '{{count}}/{{capacity}} חברים · הימור {{stake}}',
        'room.createShort': '+ צור חדר פוקר עם חברים',

        'lb.friendsToday': 'חברים · היום',
        'lb.hourlyChampions': '⏱ אלופי השעה',
        'lb.dailyChampions': '📅 אלופי היום',
        'lb.showTop20': 'הצג 20 המובילים ▾',
        'lb.showTop5': 'הצג 5 המובילים ▴',

        'champ.resetsPlaceholder': 'מתאפס בעוד —ד\'',
        'champ.noChampionsYet': 'אין עדיין אלופים השעה — היה הראשון!',
        'champ.braceletDaily': 'צמיד יומי',
        'champ.braceletHourly': 'צמיד שעתי',

        'story.noWinningHands': 'אין עדיין ידיים מנצחות',
        'story.winAHand': 'נצח ביד כדי ליצור את הסיפור שלך',
        'story.creditsMult': '+{{payout}} קרדיטים · {{mult}}×',
        'story.braceletStrip': '💍 {{type}} — {{hand}} עבור +{{amount}} קרדיטים',

        'pwa.installBar': 'התקן את וידאו פוקר לגישה מהירה',
        'pwa.install': 'התקן',
        'pwa.dismiss': '✕',

        'share.appName': 'וידאו פוקר',
        'share.inviteText': '{{name}} רוצה לשחק איתך וידאו פוקר! הצטרף עם הקישור הזה:\n{{link}}',
        'share.inviteTextShort': '{{name}} רוצה לשחק איתך וידאו פוקר! הצטרף כאן: {{link}}',
        'share.roomText': 'הצטרף לחדר הפוקר שלי "{{name}}" בוידאו פוקר!\n{{link}}'
    }
};

// Internal hand-type strings (used throughout game.js as object keys and
// state) stay in English — only their *display* is translated via this
// suffix map, shared between the hand.* and exp.* namespaces.
const HAND_I18N_SUFFIX = {
    'Royal Flush': 'royalFlush',
    'Straight Flush': 'straightFlush',
    'Four of a Kind': 'fourOfKind',
    'Four Aces': 'fourAces',
    'Four 2s-4s': 'four2s4s',
    'Four 5s-Ks': 'four5sKs',
    'Four Deuces': 'fourDeuces',
    'Wild Royal Flush': 'wildRoyalFlush',
    'Five of a Kind': 'fiveOfKind',
    'Full House': 'fullHouse',
    'Flush': 'flush',
    'Straight': 'straight',
    'Three of a Kind': 'threeOfKind',
    'Two Pair': 'twoPair',
    'Jacks or Better': 'jacksOrBetter',
    'Nothing': 'nothing'
};

const LANG_STORAGE_KEY = 'vp_lang';
let currentLang = 'en';

function detectLanguage() {
    try {
        const stored = localStorage.getItem(LANG_STORAGE_KEY);
        if (stored === 'en' || stored === 'he') return stored;
    } catch (e) {}
    try {
        const langs = (navigator.languages && navigator.languages.length) ? navigator.languages : [navigator.language || 'en'];
        if (langs.some(function(l) { return /^he/i.test(l); })) return 'he';
    } catch (e) {}
    return 'en';
}

function t(key, vars) {
    const dict = TRANSLATIONS[currentLang] || TRANSLATIONS.en;
    let str = (Object.prototype.hasOwnProperty.call(dict, key) ? dict[key] : TRANSLATIONS.en[key]) || key;
    if (vars) {
        Object.keys(vars).forEach(function(k) {
            str = str.replace(new RegExp('\\{\\{' + k + '\\}\\}', 'g'), vars[k]);
        });
    }
    return str;
}

function vpHandLabel(handType) {
    const suffix = HAND_I18N_SUFFIX[handType];
    return suffix ? t('hand.' + suffix) : handType;
}

function vpHandExplanation(handType) {
    const suffix = HAND_I18N_SUFFIX[handType];
    return suffix ? t('exp.' + suffix) : '';
}

const I18N_REFRESHERS = [];
function vpOnLanguageChange(fn) {
    I18N_REFRESHERS.push(fn);
}

function translateDom(root) {
    (root || document).querySelectorAll('[data-i18n]').forEach(function(el) {
        el.textContent = t(el.getAttribute('data-i18n'));
    });
    (root || document).querySelectorAll('[data-i18n-placeholder]').forEach(function(el) {
        el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder')));
    });
    (root || document).querySelectorAll('[data-i18n-title]').forEach(function(el) {
        el.setAttribute('title', t(el.getAttribute('data-i18n-title')));
    });
    (root || document).querySelectorAll('[data-i18n-aria-label]').forEach(function(el) {
        el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria-label')));
    });
}

function updateLanguageToggleUI() {
    const enBtn = document.getElementById('settings-lang-en');
    const heBtn = document.getElementById('settings-lang-he');
    if (enBtn) enBtn.classList.toggle('selected', currentLang === 'en');
    if (heBtn) heBtn.classList.toggle('selected', currentLang === 'he');
}

function applyLanguage(lang, opts) {
    currentLang = (lang === 'he') ? 'he' : 'en';
    document.documentElement.lang = currentLang;
    document.documentElement.dir = currentLang === 'he' ? 'rtl' : 'ltr';
    document.title = t('app.title');
    translateDom(document);
    updateLanguageToggleUI();
    I18N_REFRESHERS.forEach(function(fn) {
        try { fn(); } catch (e) { /* a refresher shouldn't be able to break the switch */ }
    });
    if (!opts || !opts.silent) {
        try { localStorage.setItem(LANG_STORAGE_KEY, currentLang); } catch (e) {}
    }
}

function vpSetLanguage(lang) {
    applyLanguage(lang);
}

currentLang = detectLanguage();
document.addEventListener('DOMContentLoaded', function() {
    applyLanguage(currentLang, { silent: true });
    const enBtn = document.getElementById('settings-lang-en');
    const heBtn = document.getElementById('settings-lang-he');
    if (enBtn) enBtn.onclick = function() { vpSetLanguage('en'); };
    if (heBtn) heBtn.onclick = function() { vpSetLanguage('he'); };
});

window.t = t;
window.vpHandLabel = vpHandLabel;
window.vpHandExplanation = vpHandExplanation;
window.vpSetLanguage = vpSetLanguage;
window.vpOnLanguageChange = vpOnLanguageChange;
window.vpTranslateDom = translateDom;
