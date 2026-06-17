# UniConnect Mobile (Android)

Capacitor wrapper for the UniConnect web application. It loads the hosted app at
`https://uni-connect.dev` inside an Android WebView.

## Architecture

```text
Android APK (Capacitor)
  -> WebView -> https://uni-connect.dev
       -> Cookie-based auth (httpOnly, same-origin)
       -> CSRF protection (same as web)
       -> Socket.IO real-time (same as web)
```

## Prerequisites

- Node.js 24
- npm 10+
- Java 17 or 21 JDK for Android Gradle builds
- Android Studio with SDK Platform 35 and Build Tools 35.0.0
- Windows `ANDROID_HOME` set to `D:\AndroidStudio\SDK`
- Windows `Path` includes `%ANDROID_HOME%\platform-tools`

The project is edited from WSL2, but Android Studio/Gradle builds run on the
Windows host using the portable Android Studio setup.

## Quick Start

```bash
cd mobile
npm install
npm run sync
```

Open the Android project from Windows Android Studio:

```text
\\wsl$\Ubuntu\home\ahmad\repos\UniConnect\main\mobile\android
```

## Release Signing

The release keystore is stored outside the repository. The Gradle signing file
is intentionally ignored by git:

```text
mobile/android/app/key.properties
```

Expected local content:

```properties
storePassword=<release keystore password>
keyPassword=<release key password>
keyAlias=uniconnect
storeFile=C:\\Users\\Ahmad\\keys\\uniconnect-release.jks
```

Never commit `key.properties`, `.jks`, or `.keystore` files.

## Building a Release APK or AAB

From Windows, open `mobile/android/` in Android Studio and use:

```text
Build -> Generate Signed Bundle / APK
```

For command-line builds from the Windows project path:

```cmd
gradlew.bat assembleRelease
gradlew.bat bundleRelease
```

Outputs:

- APK: `mobile/android/app/release/app-release.apk`
- AAB: `mobile/android/app/release/app-release.aab`

## Deep Linking

URLs at `https://uni-connect.dev` open directly in the app when Android verifies
the domain. The backend serves `/.well-known/assetlinks.json`; its SHA-256
fingerprint must match the release signing certificate.

## Capacitor Version

This project uses Capacitor 8. The official Capacitor support policy marks v8 as
active and v6 as end-of-support, so the original v6 plan was updated before
implementation.

## Deferred

- FCM push notifications.
- iOS project.
- Play Store listing and privacy-policy publication.
