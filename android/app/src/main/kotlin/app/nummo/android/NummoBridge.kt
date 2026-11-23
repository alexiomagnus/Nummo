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
