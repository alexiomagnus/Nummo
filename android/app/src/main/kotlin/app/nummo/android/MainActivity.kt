package app.nummo.android

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.SystemClock
import android.provider.Settings
import android.view.ViewGroup
import android.view.ViewTreeObserver
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.webkit.PermissionRequest
import android.webkit.RenderProcessGoneDetail
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.Toast
import android.window.OnBackInvokedCallback
import android.window.OnBackInvokedDispatcher
import org.json.JSONObject

// Nummo's Android app: the published site in a WebView, with a small native bridge (NummoBridge) for what a page cannot
// do in Chrome: haptics through Android's touch feedback, the system bars in the page's colour, saving files and the
// device's unlock. Only the site's own origin is loaded here; every other link opens outside the app.
class MainActivity : Activity() {
    lateinit var webView: WebView
        private set
    private lateinit var root: FrameLayout
    private lateinit var bridge: NummoBridge
    private val home: Uri = Uri.parse(BuildConfig.NUMMO_URL)
    private var fileCallback: ValueCallback<Array<Uri>>? = null
    private var cameraRequest: PermissionRequest? = null
    private var pendingFile: ByteArray? = null
    // A picker, a permission dialog, a save sheet or the Google account sheet of the app itself is in front: the page stays
    // «visible», as a dialog of its own would (otherwise the app lock set to «Subito» would lock on the way back).
    var awayForResult = false
    private var backCallback: OnBackInvokedCallback? = null
    private var notificationRequest: String? = null
    private var installPermissionRequest: String? = null
    // The page has drawn its first frame (onPageCommitVisible): until then the system splash stays (see holdSplash).
    private var pageVisible = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG)
        // Edge to edge on every version (Android 15+ imposes it): the bars are transparent over the root view, whose
        // background is the page's colour, and the WebView sits inside the bars (and above the keyboard) as padding.
        // Deprecated from Android 15 (where edge to edge is the rule), still needed on Android 11–14.
        @Suppress("DEPRECATION")
        run {
            window.setDecorFitsSystemWindows(false)
            window.statusBarColor = Color.TRANSPARENT
            window.navigationBarColor = Color.TRANSPARENT
            window.isStatusBarContrastEnforced = false
        }
        window.isNavigationBarContrastEnforced = false
        root = FrameLayout(this)
        webView = WebView(this)
        root.addView(webView, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
        setContentView(root)
        root.setOnApplyWindowInsetsListener { view, insets ->
            val bars = insets.getInsets(WindowInsets.Type.systemBars() or WindowInsets.Type.displayCutout())
            val keyboard = insets.getInsets(WindowInsets.Type.ime())
            view.setPadding(bars.left, bars.top, bars.right, maxOf(bars.bottom, keyboard.bottom))
            WindowInsets.CONSUMED
        }
        val saved = getSharedPreferences(barsPreferences, MODE_PRIVATE)
        val startColor = saved.getInt("color", getColor(R.color.start_background))
        applyBars(startColor, saved.getBoolean("dark", true))
        // Before the page paints, the WebView shows the last background of the app instead of its own black.
        webView.setBackgroundColor(startColor)
        holdSplash()
        bridge = NummoBridge(this)
        Updater.attach(this)
        // A downloaded update already installed (or stale) is deleted at a fresh start.
        if (savedInstanceState == null) Thread { runCatching { Updater.cleanStale(applicationContext) } }.start()
        configure(webView)
        if (savedInstanceState == null || webView.restoreState(savedInstanceState) == null) webView.loadUrl(startUrl(intent))
    }

    // The system splash leaves at the activity's first frame, which used to be an empty (black) WebView while the page was
    // still loading (25 November, from a recording of the start). The first frame now waits for the page's own first
    // frame, at most splashLimitMs: a page that cannot load (offline, server down) still shows its error.
    private fun holdSplash() {
        val started = SystemClock.uptimeMillis()
        root.viewTreeObserver.addOnPreDrawListener(object : ViewTreeObserver.OnPreDrawListener {
            override fun onPreDraw(): Boolean {
                if (!pageVisible && SystemClock.uptimeMillis() - started < splashLimitMs) return false
                root.viewTreeObserver.removeOnPreDrawListener(this)
                return true
            }
        })
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun configure(view: WebView) {
        view.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = false
            allowContentAccess = false
            setSupportMultipleWindows(false)
            javaScriptCanOpenWindowsAutomatically = false
        }
        view.isHapticFeedbackEnabled = true
        view.addJavascriptInterface(bridge, "NummoAndroid")
        view.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                if (isOurs(request.url)) return false
                openOutside(request.url)
                return true
            }

            override fun onPageCommitVisible(view: WebView, url: String?) {
                pageVisible = true
            }

            // Also for the page's own history entries (pushState, back, forward): Back is the app's while it can go back.
            override fun doUpdateVisitedHistory(view: WebView, url: String?, isReload: Boolean) = updateBack()

            override fun onRenderProcessGone(view: WebView, detail: RenderProcessGoneDetail): Boolean {
                root.removeView(view)
                view.destroy()
                recreate()
                return true
            }
        }
        view.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(view: WebView, callback: ValueCallback<Array<Uri>>, params: FileChooserParams): Boolean {
                fileCallback?.onReceiveValue(null)
                fileCallback = callback
                return try {
                    awayForResult = true
                    startActivityForResult(params.createIntent(), requestFile)
                    true
                } catch (_: ActivityNotFoundException) {
                    awayForResult = false
                    fileCallback = null
                    false
                }
            }

            // Only the camera, only for the site: the receipt photo of the scan dialog.
            override fun onPermissionRequest(request: PermissionRequest) {
                val video = PermissionRequest.RESOURCE_VIDEO_CAPTURE
                if (!isOurs(request.origin) || request.resources.any { it != video }) {
                    request.deny()
                    return
                }
                if (checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
                    request.grant(arrayOf(video))
                    return
                }
                cameraRequest?.deny()
                cameraRequest = request
                awayForResult = true
                requestPermissions(arrayOf(Manifest.permission.CAMERA), requestCamera)
            }

            override fun onPermissionRequestCanceled(request: PermissionRequest) {
                if (cameraRequest == request) cameraRequest = null
            }
        }
    }

    // A notification tapped with the app closed: the page starts on that reminder (`?notifica=…&dal=…&al=…`, read by
    // src/services/pushNotifications.ts as for the service worker's new window).
    private fun startUrl(intent: Intent?): String {
        val kind = intent?.getStringExtra("notifica") ?: return home.toString()
        val builder = home.buildUpon().appendQueryParameter("notifica", kind)
        val from = intent.getStringExtra("dal")
        val to = intent.getStringExtra("al")
        if (from != null && to != null) builder.appendQueryParameter("dal", from).appendQueryParameter("al", to)
        return builder.build().toString()
    }

    // …and with the app open: the page is told directly (as the service worker's message to an open window).
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        val kind = intent.getStringExtra("notifica") ?: return
        val args = listOf(kind, intent.getStringExtra("dal"), intent.getStringExtra("al"))
            .joinToString(", ") { if (it == null) "null" else JSONObject.quote(it) }
        webView.evaluateJavascript("window.nummoNotificationOpened && window.nummoNotificationOpened($args)", null)
    }

    fun notificationStatus(): String {
        val enabled = Reminders.enabled(this)
        val permitted = Reminders.permitted(this)
        val granted = Reminders.granted(this)
        // Refused for good: asked before, not granted, and Android would not show its dialog again.
        val refused = Reminders.needsPermission() && !granted &&
            getSharedPreferences(barsPreferences, MODE_PRIVATE).getBoolean("notificationsAsked", false) &&
            !shouldShowRequestPermissionRationale(Manifest.permission.POST_NOTIFICATIONS)
        return when {
            enabled && permitted -> "active"
            enabled || refused || (granted && !permitted) -> "denied"
            else -> "off"
        }
    }

    fun requestNotifications(id: String) {
        if (Reminders.granted(this)) {
            Reminders.setEnabled(this, true)
            deliver(id, if (Reminders.permitted(this)) "ok" else "unavailable")
            return
        }
        notificationRequest?.let { deliver(it, "cancelled") }
        notificationRequest = id
        getSharedPreferences(barsPreferences, MODE_PRIVATE).edit().putBoolean("notificationsAsked", true).apply()
        awayForResult = true
        requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), requestNotifications)
    }

    // «Install unknown apps» for Nummo (updates, Updater.kt): Android's own settings page; ok if allowed on the way back.
    fun allowUpdateInstalls(id: String) {
        if (packageManager.canRequestPackageInstalls()) { deliver(id, "ok"); return }
        installPermissionRequest?.let { deliver(it, "cancelled") }
        installPermissionRequest = id
        try {
            awayForResult = true
            startActivityForResult(Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:$packageName")), requestInstallPermission)
        } catch (_: ActivityNotFoundException) {
            awayForResult = false
            installPermissionRequest = null
            deliver(id, "unavailable")
        }
    }

    // Android's confirmation of an update (PackageInstaller), in front of the app: the page stays «visible» meanwhile.
    fun showInstallConfirmation(confirmation: Intent) {
        try {
            awayForResult = true
            startActivityForResult(confirmation, requestInstall)
        } catch (_: ActivityNotFoundException) {
            awayForResult = false
        }
    }

    fun openNotificationSettings() {
        try {
            startActivity(Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, packageName))
        } catch (_: ActivityNotFoundException) { /* no settings screen: nothing to open */ }
    }

    private fun isOurs(uri: Uri): Boolean = uri.scheme == home.scheme && uri.host == home.host && uri.port == home.port

    private fun openOutside(uri: Uri) {
        if (uri.scheme !in setOf("http", "https", "mailto", "tel")) return
        try {
            startActivity(Intent(Intent.ACTION_VIEW, uri))
        } catch (_: ActivityNotFoundException) {
            Toast.makeText(this, R.string.no_app_for_link, Toast.LENGTH_SHORT).show()
        }
    }

    // Status and navigation bars: the page's background behind them, icons dark on a light colour and light on a dark one.
    fun applyBars(color: Int, dark: Boolean) {
        root.setBackgroundColor(color)
        val light = WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS or WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS
        window.insetsController?.setSystemBarsAppearance(if (dark) 0 else light, light)
    }

    // The next start paints the last colour before the page loads.
    fun saveBars(color: Int, dark: Boolean) {
        getSharedPreferences(barsPreferences, MODE_PRIVATE).edit().putInt("color", color).putBoolean("dark", dark).apply()
    }

    // «Save as» sheet of the system (local folders, Drive…); the content is written once a place is chosen.
    fun saveFile(name: String, mime: String, bytes: ByteArray) {
        pendingFile = bytes
        val intent = Intent(Intent.ACTION_CREATE_DOCUMENT)
            .addCategory(Intent.CATEGORY_OPENABLE)
            .setType(mime)
            .putExtra(Intent.EXTRA_TITLE, name)
        try {
            awayForResult = true
            startActivityForResult(intent, requestSave)
        } catch (_: ActivityNotFoundException) {
            awayForResult = false
            pendingFile = null
            Toast.makeText(this, R.string.file_not_saved, Toast.LENGTH_LONG).show()
        }
    }

    private fun writeFile(uri: Uri, bytes: ByteArray) {
        Thread {
            val saved = runCatching { contentResolver.openOutputStream(uri, "wt")!!.use { it.write(bytes) } }.isSuccess
            runOnUiThread {
                Toast.makeText(this, if (saved) R.string.file_saved else R.string.file_not_saved, Toast.LENGTH_SHORT).show()
            }
        }.start()
    }

    // Answer to a request of the page (NummoBridge.authenticate, googleSignIn), with an optional value (the ID token).
    fun deliver(id: String, outcome: String, value: String? = null) {
        val extra = if (value == null) "" else ", ${JSONObject.quote(value)}"
        webView.evaluateJavascript(
            "window.nummoAndroidResult && window.nummoAndroidResult(${JSONObject.quote(id)}, ${JSONObject.quote(outcome)}$extra)", null)
    }

    @Deprecated("Activity result API of the platform")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        awayForResult = false
        when (requestCode) {
            requestFile -> {
                fileCallback?.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultCode, data))
                fileCallback = null
            }
            requestSave -> {
                val bytes = pendingFile
                pendingFile = null
                val uri = data?.data
                if (resultCode == RESULT_OK && uri != null && bytes != null) writeFile(uri, bytes)
            }
            requestInstallPermission -> {
                val id = installPermissionRequest
                installPermissionRequest = null
                if (id != null) deliver(id, if (packageManager.canRequestPackageInstalls()) "ok" else "cancelled")
            }
            // The installer's answer comes through UpdateReceiver; here only the page's «visible» state ends.
            requestInstall -> Unit
            else -> @Suppress("DEPRECATION") super.onActivityResult(requestCode, resultCode, data)
        }
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        if (requestCode == requestNotifications) {
            awayForResult = false
            val id = notificationRequest ?: return
            notificationRequest = null
            val granted = grantResults.firstOrNull() == PackageManager.PERMISSION_GRANTED
            if (granted) Reminders.setEnabled(this, true)
            deliver(id, when {
                granted -> "ok"
                shouldShowRequestPermissionRationale(Manifest.permission.POST_NOTIFICATIONS) -> "cancelled"
                else -> "unavailable"
            })
            return
        }
        if (requestCode != requestCamera) return super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        awayForResult = false
        val request = cameraRequest ?: return
        cameraRequest = null
        if (grantResults.firstOrNull() == PackageManager.PERMISSION_GRANTED) request.grant(arrayOf(PermissionRequest.RESOURCE_VIDEO_CAPTURE))
        else request.deny()
    }

    // Back: the page's history while there is one (its guard entry closes what is open: theme/backStack.ts), then the
    // system's own (leaves the app, with the predictive animation). Android 13+ asks for a callback registered only while
    // the app wants Back.
    private fun updateBack() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return
        val wanted = webView.canGoBack()
        val current = backCallback
        if (wanted && current == null) {
            val callback = OnBackInvokedCallback { if (webView.canGoBack()) webView.goBack() else moveTaskToBack(true) }
            onBackInvokedDispatcher.registerOnBackInvokedCallback(OnBackInvokedDispatcher.PRIORITY_DEFAULT, callback)
            backCallback = callback
        } else if (!wanted && current != null) {
            onBackInvokedDispatcher.unregisterOnBackInvokedCallback(current)
            backCallback = null
        }
    }

    @Deprecated("Android 12 and earlier; Android 13+ uses updateBack")
    override fun onBackPressed() {
        if (webView.canGoBack()) webView.goBack() else @Suppress("DEPRECATION") super.onBackPressed()
    }

    override fun onPause() {
        super.onPause()
        if (!awayForResult && !bridge.authenticating) webView.onPause()
    }

    override fun onResume() {
        super.onResume()
        webView.onResume()
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        webView.saveState(outState)
    }

    override fun onDestroy() {
        Updater.detach(this)
        root.removeView(webView)
        webView.destroy()
        super.onDestroy()
    }

    private companion object {
        const val requestFile = 1
        const val requestSave = 2
        const val requestCamera = 3
        const val requestNotifications = 4
        const val requestInstallPermission = 5
        const val requestInstall = 6
        const val barsPreferences = "systemBars"
        const val splashLimitMs = 1500L
    }
}
