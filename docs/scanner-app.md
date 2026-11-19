# Orvo Scanner

The Orvo Scanner Android app reads packing lists from
`https://erp.orvo.bd`. In the app, use that address and sign in with an ERP
staff account, or open the ERP's **Orders → Scan** page, choose **Pair device**,
and paste the issued code into the app. The existing APK still accepts the
ERP address and a pasted pairing code.

The [GitHub Actions workflow](../.github/workflows/build-scanner-apk.yml)
builds and signs the app from [`scanner-app/`](../scanner-app), then publishes it
as `public/app/orvo-scanner.apk`. Deploy that commit to distribute the APK at
`https://orvo.bd/app/orvo-scanner.apk`.

### Signing key (do this once, recommended)

Without a keystore the workflow generates a throwaway one each run — the APK
still installs, but **app updates require uninstalling the old app first**
(Android refuses an update signed by a different key). To get seamless updates,
create one persistent keystore and add it as repo secrets:

```bash
keytool -genkeypair -v -keystore release.keystore -alias orvo \
  -keyalg RSA -keysize 2048 -validity 9125 \
  -storepass 'CHOOSE_A_PASSWORD' -keypass 'CHOOSE_A_PASSWORD' \
  -dname "CN=Orvo Scanner, O=Orvo, C=BD"
base64 -w0 release.keystore   # copy this output
```

Repo → **Settings → Secrets and variables → Actions** → add:

| Secret | Value |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | the base64 output above |
| `ANDROID_KEYSTORE_PASSWORD` | the store password you chose |
| `ANDROID_KEY_ALIAS` | `orvo` |
| `ANDROID_KEY_PASSWORD` | the key password you chose |

Keep `release.keystore` somewhere safe and **out of git** — losing it means
future updates again need an uninstall-first.

### Building locally (optional)

Needs **JDK 17** + the **Android SDK**:

```bash
cd scanner-app
npm install
npx cap add android && npx cap sync android
cd android && ./gradlew assembleRelease
# sign android/app/build/outputs/apk/release/app-release-unsigned.apk with apksigner
```
