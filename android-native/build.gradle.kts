// Versions are pinned to the toolchain the Capacitor app in ../android already
// builds with (AGP 8.13.0 on Gradle 8.14.3, compileSdk 36), so one JDK and one
// Android SDK serve both projects.
plugins {
    id("com.android.application") version "8.13.0" apply false
    id("org.jetbrains.kotlin.android") version "2.2.21" apply false
    id("org.jetbrains.kotlin.plugin.compose") version "2.2.21" apply false
}
