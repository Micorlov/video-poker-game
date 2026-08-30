# Project Rules

## Auto-commit after a feature or bug fix (mandatory)

After completing a new feature or a bug fix (and after the Android emulator
verification below has passed), automatically create a git commit for the
change without asking for confirmation first — do not wait for the user to
say "commit this". Use a conventional commit message (`feat: ...` or
`fix: ...`) describing the change. This auto-commit authorization covers
`git commit` only: never `git push` or any other remote/destructive
operation without explicit user approval in chat.

## Android emulator verification (mandatory)

After creating a new feature or fixing a bug, always build and install the new
version on the Android emulator before considering the work done. Use the
`android-design-sync` agent to port/build/sync/run, and follow up with
`android-appium-qa` to verify the running app actually matches the intended
behavior — do not rely on a code read or a web preview alone.

### Prefer a real device when one is connected

Before targeting the emulator, check for a connected real Android device
(e.g. `adb devices` shows a device whose ID isn't an emulator, like `emulator-5554`).
If a real device is connected, build/install/run and verify on that real device
only — do not also run on the emulator for that verification pass.
