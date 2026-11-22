package app.nummo.android

import android.Manifest
import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.app.Notification
import android.os.Build
import org.json.JSONArray
import org.json.JSONObject
import java.time.Instant

// System notifications of Nummo's Android app (22 November, user's request): a WebView has no Web Push, so the reminders
// the page computes (src/domain/pushSchedule.ts: backup, summary, renewal; times and dates only, never amounts or names)
// are scheduled here with Android's alarms and shown as local notifications. Same rules as the push service
// (push-service/service.ts): a summary or renewal already shown for that period or date is not shown again, the backup
// reminder repeats every 7/14/30 days until the page cancels it, «Ricordamelo tra 3 giorni» moves it three days ahead.
// Same words as public/sw.js, in the language the page sends. Everything lives in this app's private preferences.
object Reminders {
    private const val store = "reminders"
    private const val channel = "reminders"
    private const val day = 86_400_000L
    private const val snoozeDays = 3
    const val actionFire = "app.nummo.android.REMINDER"
    const val actionSnooze = "app.nummo.android.SNOOZE"
    private val kinds = listOf("backup", "summary", "renewal", "test")

    data class Job(val kind: String, val at: Long, val key: String, val repeatDays: Int?, val from: String?, val to: String?)

    private fun prefs(context: Context) = context.getSharedPreferences(store, Context.MODE_PRIVATE)

    // The runtime permission exists from Android 13; before, only the switch in Android's settings counts.
    fun needsPermission(): Boolean = Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU

    fun granted(context: Context): Boolean = !needsPermission() ||
        context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED

    fun permitted(context: Context): Boolean =
        granted(context) && context.getSystemService(NotificationManager::class.java).areNotificationsEnabled()

    fun enabled(context: Context): Boolean = prefs(context).getBoolean("enabled", false)

    // Turned off, the app forgets what it showed too (as the push service forgets a subscription): turned on again, a
    // summary or renewal already shown may come once more.
    fun setEnabled(context: Context, value: Boolean) {
        prefs(context).edit().putBoolean("enabled", value).apply()
        if (value) return
        replace(context, null, emptyList())
        val editor = prefs(context).edit()
        for (kind in kinds) editor.remove("sent_$kind")
        editor.apply()
    }

    // Jobs from the page (the JSON of `PushJob[]`), checked as the push service checks them (push-service/service.ts,
    // `parseJobs`): keys bound to their period or date, at most 400 days ahead; anything malformed is left out.
    fun parse(json: String, now: Long = System.currentTimeMillis()): List<Job> {
        val list = runCatching { JSONArray(json) }.getOrNull() ?: return emptyList()
        val civil = Regex("^\\d{4}-\\d{2}-\\d{2}$")
        return (0 until list.length()).mapNotNull { i ->
            val item = list.optJSONObject(i) ?: return@mapNotNull null
            val kind = item.optString("kind")
            val at = runCatching { Instant.parse(item.optString("at")).toEpochMilli() }.getOrNull() ?: return@mapNotNull null
            if (at > now + 400 * day) return@mapNotNull null
            val key = item.optString("key")
            val from = item.optString("from").takeIf { civil.matches(it) }
            val to = item.optString("to").takeIf { civil.matches(it) }
            when (kind) {
                "backup" -> item.optInt("repeatDays").takeIf { it in listOf(7, 14, 30) && key == "backup" }?.let { Job(kind, at, key, it, null, null) }
                "summary" -> if (from != null && to != null && from <= to && key == "summary:$to") Job(kind, at, key, null, from, to) else null
                "renewal" -> if (from != null && to == from && key == "renewal:$from") Job(kind, at, key, null, from, from) else null
                else -> null
            }
        }.distinctBy { it.kind }
    }

    // Replaces the reminders with what the page computed now (`lang` null: keep the language already stored).
    fun replace(context: Context, lang: String?, jobs: List<Job>) {
        val preferences = prefs(context)
        val kept = jobs.mapNotNull { job ->
            val sent = sent(context, job.kind)
            when {
                (job.kind == "summary" || job.kind == "renewal") && sent?.first == job.key -> null
                job.kind == "backup" && sent != null && job.at <= sent.second -> job.copy(at = sent.second + job.repeatDays!! * day)
                else -> job
            }
        }
        val editor = preferences.edit()
        if (lang != null) editor.putString("lang", if (lang == "en") "en" else "it")
        for (kind in kinds.filter { it != "test" }) editor.remove("job_$kind")
        for (job in kept) editor.putString("job_${job.kind}", encode(job))
        editor.apply()
        for (kind in kinds.filter { it != "test" }) cancel(context, kind)
        for (job in kept) schedule(context, job)
    }

    // After a restart, an update or a change of clock: the stored reminders again.
    fun restore(context: Context) {
        if (!enabled(context)) return
        for (kind in kinds) stored(context, kind)?.let { schedule(context, it) }
    }

    fun snoozes(context: Context): String {
        val preferences = prefs(context)
        val value = preferences.getString("snoozes", "[]") ?: "[]"
        preferences.edit().remove("snoozes").apply()
        return value
    }

    // «Invia notifica di prova» (shown now) and «Prova con Nummo chiusa» (after a delay, through an alarm).
    fun test(context: Context, lang: String, delaySeconds: Int) {
        prefs(context).edit().putString("lang", if (lang == "en") "en" else "it").apply()
        if (delaySeconds <= 0) {
            show(context, Job("local", System.currentTimeMillis(), "local", null, null, null))
            return
        }
        val job = Job("test", System.currentTimeMillis() + delaySeconds * 1000L, "test", null, null, null)
        prefs(context).edit().putString("job_test", encode(job)).apply()
        schedule(context, job)
    }

    private fun encode(job: Job) = JSONObject().put("kind", job.kind).put("at", job.at).put("key", job.key)
        .put("repeatDays", job.repeatDays ?: 0).put("from", job.from ?: "").put("to", job.to ?: "").toString()

    private fun stored(context: Context, kind: String): Job? {
        val item = prefs(context).getString("job_$kind", null)?.let { runCatching { JSONObject(it) }.getOrNull() } ?: return null
        return Job(kind, item.optLong("at"), item.optString("key"), item.optInt("repeatDays").takeIf { it > 0 },
            item.optString("from").ifEmpty { null }, item.optString("to").ifEmpty { null })
    }

    private fun sent(context: Context, kind: String): Pair<String, Long>? {
        val value = prefs(context).getString("sent_$kind", null) ?: return null
        val key = value.substringBefore('|')
        val at = value.substringAfter('|').toLongOrNull() ?: return null
        return key to at
    }

    private fun intent(context: Context, kind: String): PendingIntent =
        PendingIntent.getBroadcast(context, kinds.indexOf(kind),
            Intent(context, ReminderReceiver::class.java).setAction(actionFire).putExtra("kind", kind),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)

    private fun schedule(context: Context, job: Job) {
        val alarms = context.getSystemService(AlarmManager::class.java)
        val at = maxOf(job.at, System.currentTimeMillis() + 1000)
        // At the chosen hour, also in Doze; inexact (within the hour) only if exact alarms were taken away.
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S || alarms.canScheduleExactAlarms()) alarms.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, intent(context, job.kind))
        else alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, intent(context, job.kind))
    }

    private fun cancel(context: Context, kind: String) {
        context.getSystemService(AlarmManager::class.java).cancel(intent(context, kind))
    }

    // An alarm went off: show the reminder if it is still the one stored, remember it, and plan the backup's next one.
    fun fire(context: Context, kind: String) {
        val job = stored(context, kind) ?: return
        if (job.at > System.currentTimeMillis() + 60_000) { schedule(context, job); return }
        val editor = prefs(context).edit()
        if (enabled(context) || kind == "test") show(context, job)
        if (kind != "test") editor.putString("sent_$kind", "${job.key}|${System.currentTimeMillis()}")
        if (kind == "backup" && job.repeatDays != null && enabled(context)) {
            var next = job.at + job.repeatDays * day
            while (next <= System.currentTimeMillis()) next += job.repeatDays * day
            val again = job.copy(at = next)
            editor.putString("job_backup", encode(again)).apply()
            schedule(context, again)
            return
        }
        editor.remove("job_$kind").apply()
    }

    // «Ricordamelo tra 3 giorni»: the page reads the postponement at its next start (as from the service worker).
    fun snooze(context: Context) {
        context.getSystemService(NotificationManager::class.java).cancel(kinds.indexOf("backup") + 1)
        val now = System.currentTimeMillis()
        val preferences = prefs(context)
        val list = runCatching { JSONArray(preferences.getString("snoozes", "[]")) }.getOrDefault(JSONArray())
        list.put(Instant.ofEpochMilli(now).toString())
        preferences.edit().putString("snoozes", list.toString()).apply()
        stored(context, "backup")?.let {
            val later = it.copy(at = now + snoozeDays * day)
            preferences.edit().putString("job_backup", encode(later)).apply()
            schedule(context, later)
        }
    }

    private val texts = mapOf(
        "it" to mapOf(
            "backup" to ("Promemoria backup" to "I dati di Nummo sono cambiati dall’ultimo backup. Tocca per esportarne una copia."),
            "summary" to ("Riepilogo spese pronto" to "Il riepilogo {period} è pronto. Tocca per vederlo."),
            "renewal" to ("Rinnovo in arrivo" to "Un abbonamento si rinnova {date}. Tocca per vedere i rinnovi."),
            "test" to ("Notifica di prova" to "Arrivata con Nummo chiusa: le notifiche funzionano anche ad app chiusa."),
            "local" to ("Notifica di prova" to "Così appariranno le notifiche di Nummo su questo dispositivo."),
        ),
        "en" to mapOf(
            "backup" to ("Backup reminder" to "Your Nummo data changed since the last backup. Tap to export a copy."),
            "summary" to ("Spending summary ready" to "Your summary {period} is ready. Tap to see it."),
            "renewal" to ("Upcoming renewal" to "A subscription renews {date}. Tap to see your renewals."),
            "test" to ("Test notification" to "Delivered with Nummo closed: notifications work even with the app closed."),
            "local" to ("Test notification" to "This is how Nummo notifications look on this device."),
        ),
    )
    private val months = mapOf(
        "it" to listOf("gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"),
        "en" to listOf("January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"),
    )

    private fun day(lang: String, date: String): String {
        val month = months.getValue(lang)[date.substring(5, 7).toInt() - 1]
        val number = date.substring(8, 10).toInt()
        return if (lang == "it") "$number $month" else "$month $number"
    }

    // Italian elides the article before a day read with a vowel (uno, otto, undici): «dall’8», «all’1», «l’11» (as public/sw.js).
    private fun elided(date: String): Boolean = date.substring(8, 10).toInt() in setOf(1, 8, 11)

    private fun show(context: Context, job: Job) {
        if (!permitted(context)) return
        val lang = prefs(context).getString("lang", "it") ?: "it"
        val (title, template) = texts.getValue(lang).getValue(job.kind)
        var body = template
        if (job.kind == "summary" && job.from != null && job.to != null) {
            val period = if (lang == "it") "${if (elided(job.from)) "dall’" else "dal "}${day(lang, job.from)} ${if (elided(job.to)) "all’" else "al "}${day(lang, job.to)}" else "for ${day(lang, job.from)} – ${day(lang, job.to)}"
            body = body.replace("{period}", period)
        }
        if (job.kind == "renewal") body = body.replace("{date}", job.from?.let { (if (lang != "it") "on " else if (elided(it)) "l’" else "il ") + day(lang, it) } ?: if (lang == "it") "a breve" else "soon")
        val manager = context.getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(NotificationChannel(channel, context.getString(R.string.reminders_channel), NotificationManager.IMPORTANCE_DEFAULT))
        // Tap: Nummo opens on that reminder's page (MainActivity passes it to the page, as the service worker does).
        val open = Intent(context, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            .putExtra("notifica", job.kind).putExtra("dal", job.from).putExtra("al", job.to)
        val builder = Notification.Builder(context, channel)
            .setSmallIcon(R.drawable.ic_notification)
            .setColor(context.getColor(R.color.icon_foreground))
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(Notification.BigTextStyle().bigText(body))
            .setAutoCancel(true)
            .setContentIntent(PendingIntent.getActivity(context, 100 + kinds.indexOf(job.kind).coerceAtLeast(0), open,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE))
        if (job.kind == "backup") {
            val snooze = Intent(context, ReminderReceiver::class.java).setAction(actionSnooze)
            builder.addAction(Notification.Action.Builder(null, if (lang == "it") "Ricordamelo tra 3 giorni" else "Remind me in 3 days",
                PendingIntent.getBroadcast(context, 50, snooze, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)).build())
        }
        // One notification per kind: a newer one replaces the older one (as the service worker's tags).
        manager.notify(kinds.indexOf(job.kind).let { if (it < 0) 10 else it } + 1, builder.build())
    }
}

// Alarms and the «snooze» action of a backup reminder.
class ReminderReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            Reminders.actionFire -> Reminders.fire(context, intent.getStringExtra("kind") ?: return)
            Reminders.actionSnooze -> Reminders.snooze(context)
        }
    }
}

// Alarms do not survive a restart (nor, to be safe, an update or a change of clock): planned again from the stored jobs.
class ReminderRestore : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action in restoreActions) Reminders.restore(context)
    }

    private companion object {
        val restoreActions = setOf(Intent.ACTION_BOOT_COMPLETED, Intent.ACTION_MY_PACKAGE_REPLACED, Intent.ACTION_TIME_CHANGED,
            Intent.ACTION_TIMEZONE_CHANGED)
    }
}
