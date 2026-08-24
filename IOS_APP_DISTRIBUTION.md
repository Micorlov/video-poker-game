# iOS builds on Firebase App Distribution

How to get **Video Poker** onto testers' iPhones through Firebase App
Distribution. The Capacitor iOS project already exists and is already
registered with Firebase — what this document covers is the signing and
release plumbing around it.

Everything below assumes the Firebase account **micorlov@gmail.com**, which
owns the `video-poker-6d665` project.

## What is already in place

| Thing | Value | Where it lives |
| --- | --- | --- |
| Bundle identifier | `com.micorlov.videopoker` | `ios/App/App.xcodeproj/project.pbxproj` |
| Firebase project | `video-poker-6d665` | `ios/App/App/GoogleService-Info.plist` |
| Firebase iOS app id | `1:53702406091:ios:99950ac18ad1e1a16a504e` | `ios/App/App/GoogleService-Info.plist` |
| Apple team id | `MC9464K5FU` | `ios/App/App.xcodeproj/project.pbxproj` |

The iOS app is registered in Firebase already, so **no new Firebase app needs
to be created** — the `GOOGLE_APP_ID` above is the id App Distribution wants.

## The one hard prerequisite

Firebase App Distribution hands testers a signed `.ipa`. Producing one
requires a **paid Apple Developer Program membership** ($99/year). A free
personal Apple ID team can build to a cable-connected device, but it cannot
create the ad-hoc provisioning profile an `.ipa` needs, and it cannot
provision Push Notifications or Sign In with Apple at all — which is why
`ios/App/App/AppDebug.entitlements` exists in this repo.

Team `MC9464K5FU` is currently used as a personal team. Check it at
<https://developer.apple.com/account> — if it is not enrolled in the Apple
Developer Program, enrol first; nothing else here can work until then. Once
enrolled, `ios/App/App/AppDebug.entitlements` can be deleted and the Debug
configuration pointed back at `App/App.entitlements`.

## One-time setup

### 1. Firebase — turn on App Distribution

1. Open the [App Distribution console](https://console.firebase.google.com/project/video-poker-6d665/appdistribution)
   signed in as micorlov@gmail.com.
2. Click **Get started** if it has not been enabled yet.
3. Go to **Testers & Groups → Add group**, name it `testers`, and add the
   addresses from `testers.csv`. The group *alias* must be `testers`, which
   is what `scripts/ios/distribute.sh` passes by default.
4. Each tester opens the invite mail on their iPhone and follows the
   Firebase profile install — this is what registers their device UDID with
   you.

### 2. Apple — devices, App ID, profile, certificate

At <https://developer.apple.com/account/resources>:

1. **Devices** — add each tester's UDID. Ad-hoc builds only install on
   devices baked into the profile, so this has to happen *before* the build
   they are meant to receive.
2. **Identifiers** — confirm `com.micorlov.videopoker` exists with
   **Push Notifications** and **Sign In with Apple** enabled. Both are
   requested by `ios/App/App/App.entitlements`, and the export step fails if
   the profile does not grant them.
3. **Profiles → Ad Hoc** — create a profile for that App ID, select the
   distribution certificate and every registered device, and download it.
   Re-download and re-upload it whenever you add a device.
4. **Certificates → Apple Distribution** — create one if you have none, then
   open **Keychain Access**, find the certificate, right-click → **Export**,
   and save a `.p12` with a password. That file plus its password is what CI
   signs with.

### 3. Apple — APNs key, so push works in test builds

Test builds now use production APNs (see *A note on push* below). In
Firebase, go to **Project settings → Cloud Messaging → Apple app
configuration** and upload an **APNs authentication key** (`.p8`, created
under *Keys* in the Apple developer portal) if one is not already there. A
`.p8` key covers both sandbox and production, so this only needs doing once.

### 4. Google Cloud — let CI upload

The repo already has a `FIREBASE_SERVICE_ACCOUNT_KEY` secret, used by the
push workflows. Grant that same service account permission to publish
releases:

1. Open [IAM for video-poker-6d665](https://console.cloud.google.com/iam-admin/iam?project=video-poker-6d665).
2. Find the service account whose key is in that secret, **Edit principal →
   Add another role**, and add **Firebase App Distribution Admin**.

No new secret is needed for Firebase itself.

## Releasing a build

### From your Mac

The shortest path, and the one to use the first few times because Xcode's
error messages are far better than CI's.

```bash
npm ci
npx firebase-tools login          # once, as micorlov@gmail.com
./scripts/ios/distribute.sh
```

With no `IOS_PROFILE_NAME` set, the script signs automatically: Xcode picks
the profile itself and pulls in any device registered since the last build.
Common overrides:

```bash
# Dry run — build the IPA, skip the upload
SKIP_UPLOAD=1 ./scripts/ios/distribute.sh

# Ship to specific people with your own notes
FIREBASE_TESTERS="someone@example.com" \
RELEASE_NOTES="Fixes the All In bug mid-hand" \
  ./scripts/ios/distribute.sh
```

The full list of variables is documented in the header of
`scripts/ios/distribute.sh`.

### From GitHub Actions

Run the **iOS app distribution** workflow from the Actions tab
(`workflow_dispatch`; it takes tester groups, release notes and an export
method as inputs). It signs manually from repository secrets, so add these
under **Settings → Secrets and variables → Actions**:

| Secret | What it is |
| --- | --- |
| `IOS_DIST_CERT_P12_BASE64` | The exported `.p12`, base64-encoded |
| `IOS_DIST_CERT_PASSWORD` | The password you set when exporting it |
| `IOS_PROVISIONING_PROFILE_BASE64` | The ad-hoc `.mobileprovision`, base64-encoded |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Already present — just add the IAM role from step 4 |

Encode the two files like this:

```bash
base64 -i ~/Downloads/distribution.p12 | pbcopy
base64 -i ~/Downloads/Video_Poker_Ad_Hoc.mobileprovision | pbcopy
```

The workflow reads the profile's name and UUID out of the file itself, so
those are not separate secrets — replacing the profile means replacing one
secret and nothing else. Build numbers come from the workflow run number, so
every run is a distinct release to Firebase. The signed IPA is also attached
to the run as an artifact for 14 days.

## How the pieces fit

```
build.js            →  www/                    web bundle
npx cap sync ios    →  ios/App/App/public/     copied into the Xcode project
xcodebuild archive  →  App.xcarchive           signed against the ad-hoc profile
xcodebuild export   →  App.ipa                 via ios/ExportOptions.template.plist
firebase CLI        →  App Distribution        appdistribution:distribute
```

`scripts/ios/distribute.sh` runs all five steps and is what CI calls, so a
red workflow can be reproduced locally by running the same script.

## A note on push notifications

`ios/App/App/App.entitlements` requests `aps-environment: production`. Ad-hoc,
TestFlight and App Store builds are all signed with distribution profiles,
which provision production APNs — a `development` value there either fails the
export outright or yields a sandbox device token that the production FCM
sender can never deliver to. Debug builds are unaffected: they use
`AppDebug.entitlements` and Xcode's development profile, and still talk to
the APNs sandbox.

## Troubleshooting

**`No profiles for 'com.micorlov.videopoker' were found`** — the ad-hoc
profile does not exist yet, or the App ID is missing the Push Notifications /
Sign In with Apple capabilities that `App.entitlements` requests.

**A tester says "unable to install"** — their UDID is not in the profile.
Add the device in the Apple portal, regenerate the profile, replace
`IOS_PROVISIONING_PROFILE_BASE64`, and ship a new build. Ad-hoc profiles are
fixed at build time; there is no way to add a device to a build already out.

**`Provisioning profile doesn't include the aps-environment entitlement`** —
Push Notifications is off for the App ID. Enable it, then regenerate the
profile.

**`exportArchive: unsupported method`** — Xcode 15.4 renamed the export
methods (`ad-hoc` → `release-testing`). The script tries the configured name
and then its counterpart automatically, so this should self-heal; if it does
not, set `IOS_EXPORT_METHOD` explicitly.

**Upload rejected with a permissions error** — the service account is missing
the *Firebase App Distribution Admin* role from step 4.

## Related

- `ios/ExportOptions.template.plist` — export knobs, filled in by the script
- `scripts/ios/distribute.sh` — the build and upload script
- `.github/workflows/ios-distribute.yml` — the macOS CI job
- `PLAY_STORE_LISTING_DRAFT.md` — the Android counterpart of this pipeline
