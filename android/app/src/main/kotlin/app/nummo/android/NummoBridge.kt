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

    // Android's touch feedback, as native controls use it: it follows the system's touch-feedback setting and keeps
    // working on silent and in Do Not Disturb (navigator.vibrate in Chrome does not). `tap` a click, `tick` a light tick.
    @JavascriptInterface
    fun haptic(kind: String) {
        val effect = when (kind) {
            "tap" -> HapticFeedbackConstants.VIRTUAL_KEY
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
