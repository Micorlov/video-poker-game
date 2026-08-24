#!/usr/bin/env bash
#
# Build the iOS app and ship it to Firebase App Distribution.
#
# Runs on macOS with Xcode installed — locally on a Mac, or on the macOS
# runner used by .github/workflows/ios-distribute.yml. The two paths are
# deliberately the same script so a CI failure can be reproduced by hand.
#
# Everything is configured through environment variables; sensible defaults
# are read out of GoogleService-Info.plist and the Xcode project so the
# bundle id, team and Firebase app id are never duplicated here.
#
#   FIREBASE_APP_ID     Firebase iOS app id       (default: GoogleService-Info.plist)
#   IOS_TEAM_ID         Apple Developer team id   (default: project.pbxproj)
#   IOS_BUNDLE_ID       Bundle identifier         (default: project.pbxproj)
#   IOS_EXPORT_METHOD   release-testing | ad-hoc | app-store-connect | enterprise
#   IOS_PROFILE_NAME    Provisioning profile name — set it to sign manually,
#                       leave it empty to let Xcode sign automatically
#   IOS_SIGNING_IDENTITY  Codesign identity (default: "Apple Distribution")
#   BUILD_NUMBER        CFBundleVersion  (default: commit count)
#   APP_VERSION         CFBundleShortVersionString (default: project value)
#   FIREBASE_GROUPS     Comma-separated tester groups (default: testers)
#   FIREBASE_TESTERS    Comma-separated tester emails
#   RELEASE_NOTES       Release notes (default: latest commit subject)
#   SKIP_UPLOAD=1       Build and export the IPA but do not upload
#
# Firebase auth comes from GOOGLE_APPLICATION_CREDENTIALS (a service account
# JSON with the Firebase App Distribution Admin role) or, for local runs, an
# existing `firebase login` session.
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
IOS_PROJECT="$ROOT/ios/App/App.xcodeproj"
BUILD_DIR="$ROOT/ios/App/build/distribute"
ARCHIVE_PATH="$BUILD_DIR/App.xcarchive"
EXPORT_DIR="$BUILD_DIR/export"
PLIST_BUDDY=/usr/libexec/PlistBuddy

info() { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
fail() { printf '\033[1;31mError:\033[0m %s\n' "$*" >&2; exit 1; }

# --- preflight ---------------------------------------------------------------

[ "$(uname -s)" = "Darwin" ] || fail "iOS builds need macOS; this is $(uname -s).
Run this on a Mac, or push to the branch and use the 'iOS app distribution'
GitHub Actions workflow, which runs on a macOS runner."

command -v xcodebuild >/dev/null 2>&1 || fail "xcodebuild not found — install Xcode and run 'xcode-select --install'."
command -v node >/dev/null 2>&1 || fail "node not found."
[ -d "$IOS_PROJECT" ] || fail "Xcode project missing at $IOS_PROJECT"

# --- configuration -----------------------------------------------------------

pbx_setting() {
  # First occurrence of a build setting; Debug and Release agree on all
  # of the ones read here.
  sed -n "s/^[[:space:]]*$1 = \(.*\);$/\1/p" "$IOS_PROJECT/project.pbxproj" | head -1
}

FIREBASE_APP_ID="${FIREBASE_APP_ID:-$("$PLIST_BUDDY" -c 'Print :GOOGLE_APP_ID' "$ROOT/ios/App/App/GoogleService-Info.plist" 2>/dev/null || true)}"
IOS_TEAM_ID="${IOS_TEAM_ID:-$(pbx_setting DEVELOPMENT_TEAM)}"
IOS_BUNDLE_ID="${IOS_BUNDLE_ID:-$(pbx_setting PRODUCT_BUNDLE_IDENTIFIER)}"
IOS_EXPORT_METHOD="${IOS_EXPORT_METHOD:-release-testing}"
IOS_PROFILE_NAME="${IOS_PROFILE_NAME:-}"
IOS_SIGNING_IDENTITY="${IOS_SIGNING_IDENTITY:-Apple Distribution}"
APP_VERSION="${APP_VERSION:-$(pbx_setting MARKETING_VERSION)}"
BUILD_NUMBER="${BUILD_NUMBER:-$(git -C "$ROOT" rev-list --count HEAD 2>/dev/null || date +%Y%m%d%H%M)}"
FIREBASE_GROUPS="${FIREBASE_GROUPS:-testers}"
FIREBASE_TESTERS="${FIREBASE_TESTERS:-}"
RELEASE_NOTES="${RELEASE_NOTES:-$(git -C "$ROOT" log -1 --pretty=%s 2>/dev/null || echo 'Video Poker test build')}"

[ -n "$FIREBASE_APP_ID" ] || fail "FIREBASE_APP_ID is empty and GOOGLE_APP_ID could not be read from GoogleService-Info.plist."
[ -n "$IOS_TEAM_ID" ] || fail "IOS_TEAM_ID is empty and DEVELOPMENT_TEAM could not be read from the Xcode project."

if [ -n "$IOS_PROFILE_NAME" ]; then
  SIGNING_STYLE="manual"
else
  SIGNING_STYLE="automatic"
fi

info "Bundle id     $IOS_BUNDLE_ID"
info "Team          $IOS_TEAM_ID"
info "Firebase app  $FIREBASE_APP_ID"
info "Version       $APP_VERSION ($BUILD_NUMBER)"
info "Signing       $SIGNING_STYLE${IOS_PROFILE_NAME:+ — profile '$IOS_PROFILE_NAME'}"
info "Export method $IOS_EXPORT_METHOD"

# --- web assets --------------------------------------------------------------

info "Building web bundle"
[ -d "$ROOT/node_modules" ] || (cd "$ROOT" && npm ci)
(cd "$ROOT" && node build.js)

info "Syncing Capacitor iOS project"
(cd "$ROOT" && npx --no-install cap sync ios)

# --- archive -----------------------------------------------------------------

rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

# xcodebuild wants its flags before any KEY=value build settings, so the
# two are assembled separately and concatenated at the call.
archive_flags=(
  -project "$IOS_PROJECT"
  -scheme App
  -configuration Release
  -destination 'generic/platform=iOS'
  -archivePath "$ARCHIVE_PATH"
)
archive_settings=(
  DEVELOPMENT_TEAM="$IOS_TEAM_ID"
  PRODUCT_BUNDLE_IDENTIFIER="$IOS_BUNDLE_ID"
  CURRENT_PROJECT_VERSION="$BUILD_NUMBER"
  MARKETING_VERSION="$APP_VERSION"
)

if [ "$SIGNING_STYLE" = "manual" ]; then
  archive_settings+=(
    CODE_SIGN_STYLE=Manual
    CODE_SIGN_IDENTITY="$IOS_SIGNING_IDENTITY"
    PROVISIONING_PROFILE_SPECIFIER="$IOS_PROFILE_NAME"
  )
else
  # Lets Xcode create or refresh the profile — including picking up test
  # devices registered since the last build.
  archive_flags+=(-allowProvisioningUpdates)
  archive_settings+=(CODE_SIGN_STYLE=Automatic)
fi

info "Archiving"
xcodebuild archive "${archive_flags[@]}" "${archive_settings[@]}"

# --- export ------------------------------------------------------------------

write_export_options() {
  local method="$1" out="$2"
  sed -e "s|__METHOD__|$method|" \
      -e "s|__TEAM_ID__|$IOS_TEAM_ID|" \
      -e "s|__SIGNING_STYLE__|$SIGNING_STYLE|" \
      -e "s|__BUNDLE_ID__|$IOS_BUNDLE_ID|" \
      -e "s|__PROFILE_NAME__|$IOS_PROFILE_NAME|" \
      "$ROOT/ios/ExportOptions.template.plist" > "$out"
  if [ "$SIGNING_STYLE" = "automatic" ]; then
    "$PLIST_BUDDY" -c 'Delete :provisioningProfiles' "$out" >/dev/null 2>&1 || true
  fi
}

export_archive() {
  local method="$1"
  local options="$BUILD_DIR/ExportOptions-$method.plist"
  write_export_options "$method" "$options"
  local args=(
    -exportArchive
    -archivePath "$ARCHIVE_PATH"
    -exportPath "$EXPORT_DIR"
    -exportOptionsPlist "$options"
  )
  if [ "$SIGNING_STYLE" = "automatic" ]; then
    args+=(-allowProvisioningUpdates)
  fi
  xcodebuild "${args[@]}"
}

# Xcode 15.4 renamed the export methods; older Xcode only knows the old
# names and newer Xcode only documents the new ones. Try the requested
# method, then its counterpart, before giving up.
alias_method() {
  case "$1" in
    release-testing) echo "ad-hoc" ;;
    ad-hoc) echo "release-testing" ;;
    app-store-connect) echo "app-store" ;;
    app-store) echo "app-store-connect" ;;
    *) echo "" ;;
  esac
}

info "Exporting IPA"
if ! export_archive "$IOS_EXPORT_METHOD"; then
  fallback="$(alias_method "$IOS_EXPORT_METHOD")"
  [ -n "$fallback" ] || fail "Export failed for method '$IOS_EXPORT_METHOD'."
  info "Export method '$IOS_EXPORT_METHOD' rejected; retrying as '$fallback'"
  rm -rf "$EXPORT_DIR"
  export_archive "$fallback"
fi

IPA_PATH="$(find "$EXPORT_DIR" -maxdepth 1 -name '*.ipa' | head -1)"
[ -n "$IPA_PATH" ] || fail "Export finished but produced no .ipa in $EXPORT_DIR"
info "Built $IPA_PATH ($(du -h "$IPA_PATH" | cut -f1))"

if [ -n "${GITHUB_OUTPUT:-}" ]; then
  echo "ipa-path=$IPA_PATH" >> "$GITHUB_OUTPUT"
fi

# --- upload ------------------------------------------------------------------

if [ "${SKIP_UPLOAD:-}" = "1" ]; then
  info "SKIP_UPLOAD=1 — stopping before Firebase upload"
  exit 0
fi

if [ -z "${GOOGLE_APPLICATION_CREDENTIALS:-}" ] && [ -z "${FIREBASE_TOKEN:-}" ]; then
  info "No GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_TOKEN set — falling back to your 'firebase login' session"
fi

upload_args=(
  appdistribution:distribute "$IPA_PATH"
  --app "$FIREBASE_APP_ID"
  --release-notes "$RELEASE_NOTES"
)
if [ -n "$FIREBASE_GROUPS" ]; then
  upload_args+=(--groups "$FIREBASE_GROUPS")
fi
if [ -n "$FIREBASE_TESTERS" ]; then
  upload_args+=(--testers "$FIREBASE_TESTERS")
fi

info "Uploading to Firebase App Distribution"
npx --yes "firebase-tools@${FIREBASE_TOOLS_VERSION:-latest}" "${upload_args[@]}"

recipients="${FIREBASE_GROUPS:-}${FIREBASE_GROUPS:+ }${FIREBASE_TESTERS:-}"
info "Done — release ${APP_VERSION} (${BUILD_NUMBER}) sent to: ${recipients:-no one (set FIREBASE_GROUPS or FIREBASE_TESTERS)}"
