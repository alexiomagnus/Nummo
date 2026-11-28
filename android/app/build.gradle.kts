import java.util.Properties

// Nummo's Android app: a WebView around the published site with a small native bridge (MainActivity, NummoBridge).
// Personal values stay out of Git:
// - local.properties: `sdk.dir`, `nummo.url` (the published site, https) and optionally `nummo.debugUrl`
//   (default http://localhost:8095/, reached on a phone or emulator through `adb reverse tcp:8095 tcp:8095`);
//   for Google sign-in (Advanced mode) `nummo.firebaseProject` and `nummo.googleClientId`, the project's Web OAuth client
//   (client_type 3 of `firebase apps:sdkconfig ANDROID`), with the app and its SHA-1 registered in that project; debug:
//   `nummo.debugFirebaseProject` (default demo-nummo) and `nummo.debugGoogleClientId`. Without a client ID the app offers
//   Standard only;
// - keystore.properties: `storeFile`, `storePassword`, `keyAlias`, `keyPassword` of the release key.
plugins {
    id("com.android.application")
}

fun properties(name: String): Properties = Properties().apply {
    val file = rootProject.file(name)
    if (file.exists()) file.inputStream().use { load(it) }
}

val local = properties("local.properties")
val keystore = properties("keystore.properties")
val releaseUrl = local.getProperty("nummo.url") ?: ""
val debugUrl = local.getProperty("nummo.debugUrl") ?: "http://localhost:8095/"
val firebaseProject = local.getProperty("nummo.firebaseProject") ?: ""
val googleClientId = local.getProperty("nummo.googleClientId") ?: ""
val debugFirebaseProject = local.getProperty("nummo.debugFirebaseProject") ?: "demo-nummo"
val debugGoogleClientId = local.getProperty("nummo.debugGoogleClientId") ?: ""

fun quoted(value: String) = "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"") + "\""

android {
    namespace = "app.nummo.android"
    compileSdk = 36

    defaultConfig {
        applicationId = "app.nummo.android"
        minSdk = 30
        targetSdk = 36
        versionCode = 20
        versionName = "0.3.17"
        // Releases with the APKs (Updater.kt; the same repository as src/domain/appUpdate.ts): tags `android-vX.Y.Z`, asset `nummo-X.Y.Z.apk` (+ `.apk.sha256`).
        buildConfigField("String", "UPDATE_REPOSITORY", quoted("alexiomagnus/Nummo"))
    }

    signingConfigs {
        if (keystore.getProperty("storeFile") != null) {
            create("release") {
                storeFile = rootProject.file(keystore.getProperty("storeFile"))
                storePassword = keystore.getProperty("storePassword")
                keyAlias = keystore.getProperty("keyAlias")
                keyPassword = keystore.getProperty("keyPassword")
            }
        }
    }

    buildTypes {
        debug {
            applicationIdSuffix = ".debug"
            buildConfigField("String", "NUMMO_URL", quoted(debugUrl))
            buildConfigField("String", "FIREBASE_PROJECT", quoted(debugFirebaseProject))
            buildConfigField("String", "GOOGLE_CLIENT_ID", quoted(debugGoogleClientId))
        }
        release {
            isMinifyEnabled = false
            buildConfigField("String", "NUMMO_URL", quoted(releaseUrl))
            buildConfigField("String", "FIREBASE_PROJECT", quoted(firebaseProject))
            buildConfigField("String", "GOOGLE_CLIENT_ID", quoted(googleClientId))
            signingConfig = signingConfigs.findByName("release")
        }
    }

    buildFeatures {
        buildConfig = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

// Google sign-in (Credential Manager, 22 November, user's request): the only libraries of the app.
dependencies {
    implementation("androidx.credentials:credentials:1.6.0")
    implementation("androidx.credentials:credentials-play-services-auth:1.6.0")
    implementation("com.google.android.libraries.identity.googleid:googleid:1.2.1")
}

// The release build must point at an https site: a missing or plain-http address is refused before building.
tasks.matching { it.name == "preReleaseBuild" }.configureEach {
    doFirst {
        require(releaseUrl.startsWith("https://")) { "nummo.url mancante o non https in android/local.properties" }
    }
}
