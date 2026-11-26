package app.nummo.android

import android.graphics.Color
import android.hardware.biometrics.BiometricManager
import android.hardware.biometrics.BiometricPrompt
import android.os.CancellationSignal
import android.view.HapticFeedbackConstants
import android.webkit.JavascriptInterface

// `window.NummoAndroid` for the page (src/services/androidApp.ts, which checks every method). Methods run on a binder
// thread: anything touching views goes to the main thread. Only the site's origin is ever loaded (MainActivity), and
// nothing here reads data: haptics, bar colours, a file the user chooses where to save, the device's unlock.
class NummoBridge(private val activity: MainActivity) {
    @Volatile
    var authenticating = false
        private set
    private val prompts = HashMap<String, CancellationSignal>()
    private val google = GoogleSignIn(activity)

    // Android's touch feedback, as native controls use it: it follows the system's touch-feedback setting and keeps
    // working on silent and in Do Not Disturb (navigator.vibrate in Chrome does not). `tap` a heavy click (LONG_PRESS, the
    // step above VIRTUAL_KEY's click, which felt slightly too weak: 0.3.2, 23 November, on request), `tick` a light tick.
    @JavascriptInterface
    fun haptic(kind: String) {
        val effect = when (kind) {
            "tap" -> HapticFeedbackConstants.LONG_PRESS
            "tick" -> HapticFeedbackConstants.CLOCK_TICK
            else -> return
        }
        activity.runOnUiThread { activity.webView.performHapticFeedback(effect) }
    }

    @JavascriptInterface
    fun setSystemBars(color: String, dark: Boolean) {
        if (!colorPattern.matches(color)) return
        val value = Color.parseColor(color)
        activity.runOnUiThread {
            activity.applyBars(value, dark)
            activity.saveBars(value, dark)
        }
    }

    @JavascriptInterface
    fun saveFile(name: String, mime: String, content: String) {
        val safeName = name.replace(unsafeName, "_").take(100).ifBlank { "nummo" }
        val type = mime.substringBefore(';').trim().ifBlank { "application/octet-stream" }
        val bytes = content.toByteArray(Charsets.UTF_8)
        activity.runOnUiThread { activity.saveFile(safeName, type, bytes) }
    }

    @JavascriptInterface
    fun canAuthenticate(): Boolean =
        activity.getSystemService(BiometricManager::class.java)?.canAuthenticate(authenticators) == BiometricManager.BIOMETRIC_SUCCESS

    // The answer goes back through `window.nummoAndroidResult(id, outcome)`: ok, cancelled, unavailable or error.
    @JavascriptInterface
    fun authenticate(id: String) {
        activity.runOnUiThread { start(id) }
    }

    @JavascriptInterface
    fun cancelAuthentication(id: String) {
        activity.runOnUiThread { prompts.remove(id)?.cancel() }
    }

    // The app's own version for the «Info» page (0.3.5, 26 November, on request): the browser and the installed web app have
    // none to show. JSON `{"name":"0.3.5","code":8}`, validated by the page.
    @JavascriptInterface
    fun appVersion(): String = "{\"name\":\"${BuildConfig.VERSION_NAME}\",\"code\":${BuildConfig.VERSION_CODE}}"

    // Material You (0.3.11, 27 November, on request): the system's tonal palettes (Android 12+, taken from the wallpaper) as JSON
    // `{"a1":{"0":"#FFFFFF",…,"1000":"#000000"},"a2":…,"a3":…,"n1":…,"n2":…}`; "" before Android 12. The page validates it.
    @JavascriptInterface
    fun systemColors(): String {
        if (android.os.Build.VERSION.SDK_INT < android.os.Build.VERSION_CODES.S) return ""
        val tones = intArrayOf(0, 10, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000)
        val ids = mapOf(
            "a1" to intArrayOf(android.R.color.system_accent1_0, android.R.color.system_accent1_10, android.R.color.system_accent1_50, android.R.color.system_accent1_100, android.R.color.system_accent1_200, android.R.color.system_accent1_300, android.R.color.system_accent1_400, android.R.color.system_accent1_500, android.R.color.system_accent1_600, android.R.color.system_accent1_700, android.R.color.system_accent1_800, android.R.color.system_accent1_900, android.R.color.system_accent1_1000),
            "a2" to intArrayOf(android.R.color.system_accent2_0, android.R.color.system_accent2_10, android.R.color.system_accent2_50, android.R.color.system_accent2_100, android.R.color.system_accent2_200, android.R.color.system_accent2_300, android.R.color.system_accent2_400, android.R.color.system_accent2_500, android.R.color.system_accent2_600, android.R.color.system_accent2_700, android.R.color.system_accent2_800, android.R.color.system_accent2_900, android.R.color.system_accent2_1000),
            "a3" to intArrayOf(android.R.color.system_accent3_0, android.R.color.system_accent3_10, android.R.color.system_accent3_50, android.R.color.system_accent3_100, android.R.color.system_accent3_200, android.R.color.system_accent3_300, android.R.color.system_accent3_400, android.R.color.system_accent3_500, android.R.color.system_accent3_600, android.R.color.system_accent3_700, android.R.color.system_accent3_800, android.R.color.system_accent3_900, android.R.color.system_accent3_1000),
            "n1" to intArrayOf(android.R.color.system_neutral1_0, android.R.color.system_neutral1_10, android.R.color.system_neutral1_50, android.R.color.system_neutral1_100, android.R.color.system_neutral1_200, android.R.color.system_neutral1_300, android.R.color.system_neutral1_400, android.R.color.system_neutral1_500, android.R.color.system_neutral1_600, android.R.color.system_neutral1_700, android.R.color.system_neutral1_800, android.R.color.system_neutral1_900, android.R.color.system_neutral1_1000),
            "n2" to intArrayOf(android.R.color.system_neutral2_0, android.R.color.system_neutral2_10, android.R.color.system_neutral2_50, android.R.color.system_neutral2_100, android.R.color.system_neutral2_200, android.R.color.system_neutral2_300, android.R.color.system_neutral2_400, android.R.color.system_neutral2_500, android.R.color.system_neutral2_600, android.R.color.system_neutral2_700, android.R.color.system_neutral2_800, android.R.color.system_neutral2_900, android.R.color.system_neutral2_1000),
        )
        return try {
            ids.entries.joinToString(",", "{", "}") { (name, colors) ->
                "\"$name\":" + tones.indices.joinToString(",", "{", "}") { i ->
                    "\"${tones[i]}\":\"" + String.format("#%06X", activity.getColor(colors[i]) and 0xFFFFFF) + "\""
                }
            }
        } catch (e: Exception) { "" }
    }

    // Google sign-in (GoogleSignIn.kt): the project the app is registered with ("" without a client ID: Standard only),
    // the token through `window.nummoAndroidResult(id, outcome, idToken)`, and the account forgotten after «Esci».
    @JavascriptInterface
    fun googleProject(): String = google.project

    @JavascriptInterface
    fun googleSignIn(id: String) {
        activity.runOnUiThread { google.signIn(id) }
    }

    @JavascriptInterface
    fun googleSignOut() {
        activity.runOnUiThread { google.signOut() }
    }

    // System notifications (Reminders.kt): the page's reminder times scheduled as local notifications.
    // Status: active, off or denied (blocked in Android's settings, or the permission refused for good).
    @JavascriptInterface
    fun notificationStatus(): String = activity.notificationStatus()

    // Asks the permission (Android 13+) and turns them on: ok, cancelled (refused this time) or unavailable (refused for good).
    @JavascriptInterface
    fun requestNotifications(id: String) {
        activity.runOnUiThread { activity.requestNotifications(id) }
    }

    @JavascriptInterface
    fun scheduleNotifications(lang: String, jobs: String): Boolean {
        if (!Reminders.enabled(activity) || !Reminders.permitted(activity)) return false
        Reminders.replace(activity, lang, Reminders.parse(jobs))
        return true
    }

    @JavascriptInterface
    fun disableNotifications() = Reminders.setEnabled(activity, false)

    @JavascriptInterface
    fun testNotification(lang: String, delaySeconds: Int) = Reminders.test(activity, lang, delaySeconds.coerceIn(0, 600))

    // «Ricordamelo tra 3 giorni» pressed on a notification: the times, read once (JSON array of ISO instants).
    @JavascriptInterface
    fun takeSnoozes(): String = Reminders.snoozes(activity)

    @JavascriptInterface
    fun openNotificationSettings() {
        activity.runOnUiThread { activity.openNotificationSettings() }
    }

    // Updates from the repository's GitHub Releases (Updater.kt, 0.3.6): may Nummo install apps (Android's «install unknown
    // apps»), its settings page (answer ok when allowed on the way back), download and verify an APK (progress through
    // `window.nummoAndroidUpdate`, the end through `nummoAndroidResult(id, outcome, reason)`), cancel it, install it (Android
    // asks the user to confirm).
    @JavascriptInterface
    fun canInstallUpdates(): Boolean = activity.packageManager.canRequestPackageInstalls()

    @JavascriptInterface
    fun allowUpdateInstalls(id: String) {
        activity.runOnUiThread { activity.allowUpdateInstalls(id) }
    }

    @JavascriptInterface
    fun updateDownload(id: String, url: String, sha256: String, sha256Url: String, size: Double) =
        Updater.download(activity, id, url, sha256, sha256Url, size.toLong())

    @JavascriptInterface
    fun updateCancel(id: String) = Updater.cancel(id)

    @JavascriptInterface
    fun updateInstall(id: String) = Updater.install(activity, id)

    private fun start(id: String) {
        val signal = CancellationSignal()
        prompts[id] = signal
        authenticating = true
        try {
            BiometricPrompt.Builder(activity)
                .setTitle(activity.getString(R.string.unlock_title))
                .setAllowedAuthenticators(authenticators)
                .setConfirmationRequired(false)
                .build()
                .authenticate(signal, activity.mainExecutor, object : BiometricPrompt.AuthenticationCallback() {
                    override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult?) = finish(id, "ok")
                    override fun onAuthenticationError(code: Int, message: CharSequence?) = finish(id, outcomeOf(code))
                })
        } catch (_: RuntimeException) {
            finish(id, "unavailable")
        }
    }

    private fun finish(id: String, outcome: String) {
        prompts.remove(id)
        authenticating = prompts.isNotEmpty()
        activity.deliver(id, outcome)
    }

    private fun outcomeOf(code: Int): String = when (code) {
        BiometricPrompt.BIOMETRIC_ERROR_USER_CANCELED, BiometricPrompt.BIOMETRIC_ERROR_CANCELED,
        BiometricPrompt.BIOMETRIC_ERROR_TIMEOUT -> "cancelled"
        BiometricPrompt.BIOMETRIC_ERROR_HW_NOT_PRESENT, BiometricPrompt.BIOMETRIC_ERROR_HW_UNAVAILABLE,
        BiometricPrompt.BIOMETRIC_ERROR_NO_BIOMETRICS, BiometricPrompt.BIOMETRIC_ERROR_NO_DEVICE_CREDENTIAL,
        BiometricPrompt.BIOMETRIC_ERROR_SECURITY_UPDATE_REQUIRED -> "unavailable"
        else -> "error"
    }

    private companion object {
        // Fingerprint or face, or the screen-lock PIN/pattern/password: the same choice as the browser's passkey prompt.
        const val authenticators = BiometricManager.Authenticators.BIOMETRIC_WEAK or BiometricManager.Authenticators.DEVICE_CREDENTIAL
        val colorPattern = Regex("^#[0-9A-Fa-f]{6}$")
        val unsafeName = Regex("[\\\\/:*?\"<>|\\p{Cntrl}]")
    }
}
