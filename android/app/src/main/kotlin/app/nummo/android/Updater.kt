package app.nummo.android

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageInfo
import android.content.pm.PackageInstaller
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.StatFs
import java.io.File
import java.io.IOException
import java.lang.ref.WeakReference
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest
import kotlin.concurrent.thread

// Updates of the app from the repository's GitHub Releases (0.3.6, 27 November, on request). The page reads the releases from
// GitHub's public API and asks for one APK; here, with platform APIs only (no library, no backend):
// 1. download it, only from this repository's release downloads (`https://github.com/<repo>/releases/download/…`, which
//    redirects to GitHub's storage over https), into the app's private cache, with progress for the page;
// 2. check its SHA-256 against the release's (`digest` of the API, or the `.apk.sha256` asset) when the release has one;
// 3. check that it is this app (same package), newer than the installed one and signed with the same key: Android would
//    refuse it anyway at install time, but the user then learns it before being asked anything;
// 4. hand it to Android's PackageInstaller, which always asks the user to confirm (USER_ACTION_REQUIRED: never silent).
// Installing needs the «install unknown apps» permission for Nummo (REQUEST_INSTALL_PACKAGES), granted by the user in
// Android's settings (MainActivity.allowUpdateInstalls). Data stay: an update keeps the app's storage (WebView, IndexedDB).
object Updater {
    private const val maxBytes = 100L * 1024 * 1024
    private const val folderName = "updates"
    private const val apkName = "update.apk"
    private const val action = "app.nummo.android.UPDATE_STATUS"
    private val downloadPrefix = "https://github.com/${BuildConfig.UPDATE_REPOSITORY}/releases/download/"
    private val hexPattern = Regex("^[0-9a-f]{64}$")
    private val hashInText = Regex("\\b([0-9a-fA-F]{64})\\b")

    private var activity = WeakReference<MainActivity>(null)
    @Volatile private var running: Job? = null

    private class Job(val id: String) { @Volatile var cancelled = false }
    private class Failure(val reason: String) : Exception(reason)

    fun attach(target: MainActivity) { activity = WeakReference(target) }
    fun detach(target: MainActivity) { if (activity.get() === target) activity = WeakReference(null) }

    private fun folder(context: Context) = File(context.cacheDir, folderName)
    private fun apk(context: Context) = File(folder(context), apkName)

    // A fresh start: a downloaded APK that is not newer than the installed app (already installed, or stale) is deleted.
    fun cleanStale(context: Context) {
        val file = apk(context)
        if (!file.exists()) { folder(context).deleteRecursively(); return }
        val archive = archiveInfo(context, file)
        if (archive == null || archive.longVersionCode <= installedVersion(context)) folder(context).deleteRecursively()
    }

    fun allowed(url: String): Boolean {
        val uri = Uri.parse(url)
        return url.startsWith(downloadPrefix) && uri.scheme == "https" && uri.host == "github.com" && !url.contains("..") &&
            uri.userInfo == null && uri.port == -1
    }

    fun download(context: Context, id: String, url: String, sha256: String, sha256Url: String, size: Long) {
        running?.cancelled = true
        val job = Job(id)
        running = job
        thread(name = "nummo-update") {
            val outcome = try {
                fetch(context.applicationContext, job, url, sha256.lowercase(), sha256Url, size)
                "ok" to null
            } catch (failure: Failure) {
                "error" to failure.reason
            } catch (_: Cancelled) {
                "cancelled" to null
            } catch (_: Exception) {
                "error" to "error"
            }
            if (running === job) running = null
            if (!job.cancelled || outcome.first != "error") deliver(id, outcome.first, outcome.second)
        }
    }

    fun cancel(id: String) {
        running?.takeIf { it.id == id }?.cancelled = true
    }

    private class Cancelled : Exception()

    private fun fetch(context: Context, job: Job, url: String, given: String, sha256Url: String, size: Long) {
        if (!allowed(url) || size <= 0 || size > maxBytes) throw Failure("error")
        if (given.isNotEmpty() && !hexPattern.matches(given)) throw Failure("error")
        if (sha256Url.isNotEmpty() && !allowed(sha256Url)) throw Failure("error")
        val expected = given.ifEmpty { if (sha256Url.isNotEmpty()) readHash(sha256Url) else "" }
        val dir = folder(context)
        dir.mkdirs()
        val target = apk(context)
        // Already downloaded and verified (the page was reloaded, or Android restarted the app after the permission).
        if (expected.isNotEmpty() && target.exists() && target.length() == size && sha256Of(target) == expected) {
            checkArchive(context, target)
            progress(job.id, size, size)
            return
        }
        if (StatFs(dir.path).availableBytes < size + 16L * 1024 * 1024) throw Failure("storage")
        val part = File(dir, "$apkName.part")
        target.delete()
        val digest = MessageDigest.getInstance("SHA-256")
        val connection = open(url)
        try {
            if (connection.responseCode != HttpURLConnection.HTTP_OK) throw Failure("network")
            if (connection.url.protocol != "https") throw Failure("network")
            val total = connection.contentLengthLong.takeIf { it > 0 } ?: size
            if (total > maxBytes) throw Failure("error")
            var received = 0L
            var reported = 0L
            try {
                connection.inputStream.use { input ->
                    part.outputStream().use { output ->
                        val buffer = ByteArray(64 * 1024)
                        while (true) {
                            if (job.cancelled) throw Cancelled()
                            val read = input.read(buffer)
                            if (read < 0) break
                            received += read
                            if (received > maxBytes) throw Failure("error")
                            digest.update(buffer, 0, read)
                            output.write(buffer, 0, read)
                            val now = System.currentTimeMillis()
                            if (now - reported >= 150) { reported = now; progress(job.id, received, total) }
                        }
                    }
                }
            } catch (error: IOException) {
                throw Failure(if (error.message?.contains("ENOSPC") == true) "storage" else "network")
            }
            progress(job.id, received, total)
            if (received != total) throw Failure("network")
        } catch (error: Exception) {
            part.delete()
            throw error
        } finally {
            connection.disconnect()
        }
        val hash = digest.digest().joinToString("") { "%02x".format(it) }
        if (expected.isNotEmpty() && hash != expected) { part.delete(); throw Failure("integrity") }
        try { checkArchive(context, part) } catch (failure: Failure) { part.delete(); throw failure }
        if (!part.renameTo(target)) { part.delete(); throw Failure("storage") }
    }

    private fun open(url: String): HttpURLConnection = try {
        (URL(url).openConnection() as HttpURLConnection).apply {
            instanceFollowRedirects = true
            connectTimeout = 15_000
            readTimeout = 30_000
            setRequestProperty("Accept", "application/octet-stream")
        }
    } catch (_: IOException) { throw Failure("network") }

    // The `.apk.sha256` asset: the first 64-hex token (`sha256sum` format: «hash  name»), at most a few hundred bytes.
    private fun readHash(url: String): String {
        val connection = open(url)
        try {
            if (connection.responseCode != HttpURLConnection.HTTP_OK) throw Failure("network")
            // At most 1 KB (readNBytes is Android 13+, the app starts at Android 11).
            val bytes = ByteArray(1024)
            var count = 0
            connection.inputStream.use { input ->
                while (count < bytes.size) { val read = input.read(bytes, count, bytes.size - count); if (read < 0) break; count += read }
            }
            val text = String(bytes, 0, count, Charsets.UTF_8)
            return hashInText.find(text)?.groupValues?.get(1)?.lowercase() ?: throw Failure("integrity")
        } catch (_: IOException) {
            throw Failure("network")
        } finally {
            connection.disconnect()
        }
    }

    private fun sha256Of(file: File): String {
        val digest = MessageDigest.getInstance("SHA-256")
        file.inputStream().use { input ->
            val buffer = ByteArray(64 * 1024)
            while (true) { val read = input.read(buffer); if (read < 0) break; digest.update(buffer, 0, read) }
        }
        return digest.digest().joinToString("") { "%02x".format(it) }
    }

    private fun installedVersion(context: Context): Long =
        context.packageManager.getPackageInfo(context.packageName, 0).longVersionCode

    private fun archiveInfo(context: Context, file: File): PackageInfo? =
        context.packageManager.getPackageArchiveInfo(file.path, PackageManager.GET_SIGNING_CERTIFICATES)

    // This app, a newer version, every signer of the APK one of the installed app's certificates.
    private fun checkArchive(context: Context, file: File) {
        val archive = archiveInfo(context, file) ?: throw Failure("package")
        if (archive.packageName != context.packageName) throw Failure("package")
        if (archive.longVersionCode <= installedVersion(context)) throw Failure("version")
        val signers = archive.signingInfo?.apkContentsSigners
        if (signers.isNullOrEmpty()) throw Failure("signature")
        val same = signers.all {
            context.packageManager.hasSigningCertificate(context.packageName, it.toByteArray(), PackageManager.CERT_INPUT_RAW_X509)
        }
        if (!same) throw Failure("signature")
    }

    // Android's installer with the verified APK; the answer comes back through UpdateReceiver.
    fun install(context: Context, id: String) {
        val app = context.applicationContext
        if (!app.packageManager.canRequestPackageInstalls()) { deliver(id, "unavailable"); return }
        val file = apk(app)
        if (!file.exists()) { deliver(id, "unavailable"); return }
        thread(name = "nummo-install") {
            try {
                checkArchive(app, file)
                val installer = app.packageManager.packageInstaller
                val params = PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL).apply {
                    setAppPackageName(app.packageName)
                    setSize(file.length())
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) setRequireUserAction(PackageInstaller.SessionParams.USER_ACTION_REQUIRED)
                }
                val sessionId = installer.createSession(params)
                installer.openSession(sessionId).use { session ->
                    file.inputStream().use { input ->
                        session.openWrite("nummo.apk", 0, file.length()).use { output ->
                            input.copyTo(output)
                            session.fsync(output)
                        }
                    }
                    val intent = Intent(app, UpdateReceiver::class.java).setAction(action).setPackage(app.packageName).putExtra("id", id)
                    val flags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
                    session.commit(PendingIntent.getBroadcast(app, sessionId, intent, flags).intentSender)
                }
            } catch (failure: Failure) {
                deliver(id, "error", failure.reason)
            } catch (_: Exception) {
                deliver(id, "error")
            }
        }
    }

    // Android asks the user (STATUS_PENDING_USER_ACTION): its confirmation screen, in front of the app.
    fun confirm(context: Context, confirmation: Intent) {
        val target = activity.get()
        if (target != null) target.runOnUiThread { target.showInstallConfirmation(confirmation) }
        else context.startActivity(confirmation.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }

    fun deliver(id: String, outcome: String, value: String? = null) {
        val target = activity.get() ?: return
        target.runOnUiThread { target.deliver(id, outcome, value) }
    }

    private fun progress(id: String, received: Long, total: Long) {
        val target = activity.get() ?: return
        target.runOnUiThread {
            target.webView.evaluateJavascript(
                "window.nummoAndroidUpdate && window.nummoAndroidUpdate(${org.json.JSONObject.quote(id)}, $received, $total)", null)
        }
    }

    fun isStatus(intent: Intent) = intent.action == action
}

// Answers of PackageInstaller for a session committed by Updater.install. Not exported: only the system, through the
// PendingIntent of the app, sends it.
class UpdateReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (!Updater.isStatus(intent)) return
        val id = intent.getStringExtra("id") ?: return
        when (intent.getIntExtra(PackageInstaller.EXTRA_STATUS, PackageInstaller.STATUS_FAILURE)) {
            PackageInstaller.STATUS_PENDING_USER_ACTION -> {
                val confirmation = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    intent.getParcelableExtra(Intent.EXTRA_INTENT, Intent::class.java)
                } else {
                    @Suppress("DEPRECATION") intent.getParcelableExtra(Intent.EXTRA_INTENT)
                }
                if (confirmation == null) Updater.deliver(id, "error") else Updater.confirm(context, confirmation)
            }
            PackageInstaller.STATUS_SUCCESS -> Updater.deliver(id, "ok")
            PackageInstaller.STATUS_FAILURE_ABORTED -> Updater.deliver(id, "cancelled")
            else -> Updater.deliver(id, "error", "install")
        }
    }
}
