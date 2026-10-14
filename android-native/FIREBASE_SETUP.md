# Firebase setup for the native app

The network features (sign-in, Friends, rooms, leaderboards, stories, bracelets, presence, push,
cloud save / carry-over, analytics, Crashlytics) all need the native app registered with Firebase.
Everything that works offline or against public data is already built; see `e2e-artifacts/REPORT.md`.

## Steps (once, in the Firebase console for project `video-poker-6d665`)

1. Project settings → Your apps → **Add app → Android**.
   - Package name: `com.micorlov.videopoker` (since 3.0.0; the Capacitor app's Firebase app,
     already registered with the upload and Play app-signing SHA-1s)
   - Debug signing SHA-1: `0C:46:3D:6E:46:30:10:D2:1B:59:15:2E:5D:1A:6B:47:69:55:24:9D`
     (from `~/.android/debug.keystore`; add the release SHA-1 later for Play builds)
2. Authentication → Sign-in method → make sure **Google** is enabled.
3. Download `google-services.json` and put it at `android-native/app/google-services.json`.
   Add that path to `android-native/.gitignore` before committing anything, as the Capacitor
   app already does for `android/app/google-services.json`.

## Then, with the phone connected

- Build sign-in with Credential Manager + Firebase Auth, using `default_web_client_id` from that file.
- Port, in this order: user profile + cloud save, friends (codes, invite links), leaderboards,
  rooms, stories + bracelets, presence, FCM push, Analytics, Crashlytics.
- Test on the real device with test Google accounts signed in by hand; writes go to production
  Firestore with those accounts (approved), and test documents are cleaned up afterwards.
