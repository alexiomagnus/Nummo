import java.util.Properties

// Nummo's Android app: a WebView around the published site with a small native bridge (MainActivity, NummoBridge).
// Personal values stay out of Git:
// - local.properties: `sdk.dir`, `nummo.url` (the published site, https) and optionally `nummo.debugUrl`
//   (default http://localhost:8095/, reached on a phone or emulator through `adb reverse tcp:8095 tcp:8095`);
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

fun quoted(value: String) = "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"") + "\""

android {
    namespace = "app.nummo.android"
    compileSdk = 36

    defaultConfig {
        applicationId = "app.nummo.android"
        minSdk = 30
        targetSdk = 36
        versionCode = 1
        versionName = "0.1.0"
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
        }
        release {
            isMinifyEnabled = false
            buildConfigField("String", "NUMMO_URL", quoted(releaseUrl))
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

// The release build must point at an https site: a missing or plain-http address is refused before building.
tasks.matching { it.name == "preReleaseBuild" }.configureEach {
    doFirst {
        require(releaseUrl.startsWith("https://")) { "nummo.url mancante o non https in android/local.properties" }
    }
}
