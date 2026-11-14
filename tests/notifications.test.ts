import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  addInterval, backupReminderDue, changeNotificationPreferences, closeSummary, confirmBackup, defaultNotificationPreferences, dueNotifications,
  newNotificationState, notificationStateKey, parseNotificationPreferences, parseNotificationState, snoozeBackup, spendingSummary, summaryDue,
  summaryPeriod, type NotificationPreferences, type NotificationState,
} from '../src/domain/notifications.ts';
import type { ExpenseEntry } from '../src/domain/history.ts';
import type { Category } from '../src/domain/category.ts';

const at = (iso: string) => new Date(iso);
const prefs = (change: Partial<NotificationPreferences> = {}): NotificationPreferences => ({ ...defaultNotificationPreferences, ...change });
const state = (change: Partial<NotificationState> = {}): NotificationState => ({ ...newNotificationState(at('2026-11-01T10:00:00.000Z')), ...change });
const expense = (id: string, amount: number, date: string, category: string | null, recurrence: ExpenseEntry['recurrence'] = null): ExpenseEntry =>
  ({ id, amount_minor: amount, description: id, category_id: category, expense_date: date, recurrence, created_at: `${date}T08:00:00.000Z` });
const categories: Category[] = [{ id: 'food', label: 'Alimentari', icon: null }, { id: 'fun', label: 'Intrattenimento', icon: null }] as Category[];

test('notifiche: predefiniti richiesti e preferenze danneggiate ripristinate campo per campo', () => {
  assert.deepEqual(defaultNotificationPreferences, {
    backupEnabled: true, backupFrequency: 'weekly', backupSince: null, summaryEnabled: true, summaryFrequency: 'weekly', summarySince: null,
  });
  assert.deepEqual(parseNotificationPreferences(null), defaultNotificationPreferences);
  assert.deepEqual(parseNotificationPreferences('{rotto'), defaultNotificationPreferences);
  assert.deepEqual(parseNotificationPreferences('[]'), defaultNotificationPreferences);
  const parsed = parseNotificationPreferences(JSON.stringify({ enabled: false, backupFrequency: 'daily', summaryFrequency: 'monthly', backupSince: 'ieri', summarySince: '2026-11-02T10:00:00.000Z' }));
  assert.equal(parsed.backupEnabled, false, 'vecchio interruttore generale spento: avvisi spenti');
  assert.equal(parsed.summaryEnabled, false);
  assert.equal(parseNotificationPreferences('{"enabled":true,"summaryEnabled":false}').backupEnabled, true);
  assert.equal('enabled' in parsed, false, 'nessun interruttore generale nelle preferenze');
  assert.equal(parsed.backupFrequency, 'weekly');
  assert.equal(parsed.summaryFrequency, 'monthly');
  assert.equal(parsed.backupSince, null);
  assert.equal(parsed.summarySince, '2026-11-02T10:00:00.000Z');
  // Stato per archivio, separato tra modalità; uno stato danneggiato riparte da adesso, senza avvisi immediati.
  assert.equal(notificationStateKey('local'), 'nummo.notifications.v1.local');
  const now = at('2026-11-14T09:00:00.000Z');
  assert.deepEqual(parseNotificationState('{"startedAt":"x","lastBackupAt":"2026-11-01T00:00:00.000Z"}', now), newNotificationState(now));
  assert.equal(parseNotificationState(JSON.stringify({ ...state(), summaryShownThrough: '2026-13-01' }), now).summaryShownThrough, null);
});

test('notifiche: riattivare un avviso o cambiare frequenza riparte da adesso', () => {
  const now = at('2026-11-14T09:00:00.000Z');
  const off = changeNotificationPreferences(prefs(), { backupEnabled: false, summaryEnabled: false }, now);
  assert.equal(off.backupFrequency, 'weekly', 'spegnere conserva la frequenza');
  assert.equal(off.backupSince, null);
  const on = changeNotificationPreferences(off, { backupEnabled: true, summaryEnabled: true }, now);
  assert.equal(on.backupSince, now.toISOString());
  assert.equal(on.summarySince, now.toISOString());
  const later = at('2026-11-20T09:00:00.000Z');
  const backupFrequency = changeNotificationPreferences(on, { backupFrequency: 'monthly' }, later);
  assert.equal(backupFrequency.backupSince, now.toISOString(), 'la frequenza del backup non sposta l’ultimo riferimento');
  const summaryFrequency = changeNotificationPreferences(on, { summaryFrequency: 'monthly' }, later);
  assert.equal(summaryFrequency.summarySince, later.toISOString());
  // Le frequenze dei due avvisi sono indipendenti.
  assert.equal(summaryFrequency.backupFrequency, 'weekly');
});

test('notifiche: intervalli di 7 e 14 giorni e mese di calendario limitato alla fine del mese', () => {
  assert.equal(addInterval('2026-11-01T10:00:00.000Z', 'weekly').toISOString(), '2026-11-08T10:00:00.000Z');
  assert.equal(addInterval('2026-11-01T10:00:00.000Z', 'biweekly').toISOString(), '2026-11-15T10:00:00.000Z');
  assert.equal(addInterval('2026-01-31T10:00:00.000Z', 'monthly').toISOString(), '2026-02-28T10:00:00.000Z');
  assert.equal(addInterval('2028-01-31T10:00:00.000Z', 'monthly').toISOString(), '2028-02-29T10:00:00.000Z');
  assert.equal(addInterval('2026-12-15T10:00:00.000Z', 'monthly').toISOString(), '2027-01-15T10:00:00.000Z');
});

test('promemoria backup: solo dopo l’intervallo, con modifiche, mai al primo avvio; rinvio di 3 giorni e conferma', () => {
  const base = state();
  const changed = '2026-11-03T12:00:00.000Z';
  const due = (s: NotificationState, now: string, p = prefs(), lastChange: string | null = changed) => backupReminderDue({ preferences: p, state: s, lastChange, now: at(now) });
  assert.equal(due(base, '2026-11-08T09:59:00.000Z'), false, 'intervallo non ancora trascorso dal primo avvio');
  assert.equal(due(base, '2026-11-08T10:00:00.000Z'), true);
  assert.equal(due(base, '2026-11-20T10:00:00.000Z', prefs(), null), false, 'nessun dato modificato (o modalità Avanzata)');
  assert.equal(due(base, '2026-11-20T10:00:00.000Z', prefs({ backupEnabled: false })), false);
  assert.equal(due(base, '2026-11-12T10:00:00.000Z', prefs({ backupFrequency: 'biweekly' })), false);
  assert.equal(due(base, '2026-11-15T10:00:00.000Z', prefs({ backupFrequency: 'biweekly' })), true);
  // Attivato di recente: conta da allora.
  assert.equal(due(base, '2026-11-20T10:00:00.000Z', prefs({ backupSince: '2026-11-18T00:00:00.000Z' })), false);

  const snoozed = snoozeBackup(base, at('2026-11-10T08:00:00.000Z'));
  assert.equal(snoozed.backupSnoozedUntil, '2026-11-13T08:00:00.000Z');
  assert.equal(due(snoozed, '2026-11-13T07:59:00.000Z'), false);
  assert.equal(due(snoozed, '2026-11-13T08:00:00.000Z'), true);

  // Backup confermato: niente promemoria senza nuove modifiche, poi un intervallo intero dopo la conferma.
  const confirmed = confirmBackup(snoozed, '2026-11-10T09:00:00.000Z');
  assert.equal(confirmed.backupSnoozedUntil, null);
  assert.equal(due(confirmed, '2026-12-30T10:00:00.000Z'), false, 'nessuna modifica dopo il backup');
  assert.equal(due(confirmed, '2026-11-16T10:00:00.000Z', prefs(), '2026-11-11T09:00:00.000Z'), false);
  assert.equal(due(confirmed, '2026-11-17T09:00:00.000Z', prefs(), '2026-11-11T09:00:00.000Z'), true);
  // Una conferma più vecchia non riporta indietro la data; il formato senza millisecondi è confrontato come istante.
  assert.equal(confirmBackup(confirmed, '2026-11-01T00:00:00Z').lastBackupAt, '2026-11-10T09:00:00.000Z');
  assert.equal(due(confirmed, '2026-11-20T10:00:00.000Z', prefs(), '2026-11-10T09:00:00Z'), false);
});

test('riepilogo: periodi allineati (settimana lun–dom, blocchi di 14 giorni, mese di calendario) conclusi prima di oggi', () => {
  // 14 novembre 2026 è sabato; 16 novembre è lunedì e inizia un blocco di 14 giorni (dal 1° gennaio 2024).
  assert.deepEqual(summaryPeriod('weekly', '2026-11-14'), { from: '2026-11-02', to: '2026-11-08' });
  assert.deepEqual(summaryPeriod('weekly', '2026-11-16'), { from: '2026-11-09', to: '2026-11-15' });
  assert.deepEqual(summaryPeriod('biweekly', '2026-11-14'), { from: '2026-10-19', to: '2026-11-01' });
  assert.deepEqual(summaryPeriod('biweekly', '2026-11-16'), { from: '2026-11-02', to: '2026-11-15' });
  assert.deepEqual(summaryPeriod('monthly', '2026-11-14'), { from: '2026-10-01', to: '2026-10-31' });
  assert.deepEqual(summaryPeriod('monthly', '2026-03-01'), { from: '2026-02-01', to: '2026-02-28' });
  assert.deepEqual(summaryPeriod('monthly', '2027-01-05'), { from: '2026-12-01', to: '2026-12-31' });
});

test('riepilogo: abbonamenti e loro storico esclusi, spese future escluse, categoria principale', () => {
  const expenses = [
    expense('pane', 250, '2026-11-09', 'food'),
    expense('cinema', 1200, '2026-11-10', 'fun'),
    expense('spesa', 1500, '2026-11-12', 'food'),
    expense('libero', 300, '2026-11-11', null),
    expense('fuori', 999, '2026-11-08', 'food'),
    expense('futura', 5000, '2026-11-20', 'fun'),
    // Serie ricorrente iniziata prima: le occorrenze del periodo non contano.
    expense('streaming', 1299, '2026-01-10', 'fun', 'weekly'),
  ];
  const period = { from: '2026-11-09', to: '2026-11-15' };
  const summary = spendingSummary(expenses, categories, period, '2026-11-16');
  assert.equal(summary.total, 250 + 1200 + 1500 + 300);
  assert.equal(summary.count, 4);
  assert.deepEqual(summary.top, { id: 'food', label: 'Alimentari', amount: 1750 });
  // Mai oltre oggi, anche se il periodo è più lungo.
  assert.equal(spendingSummary(expenses, categories, { from: '2026-11-09', to: '2026-11-30' }, '2026-11-16').count, 4);
  // Senza categorie esistenti nessuna categoria principale.
  assert.equal(spendingSummary([expense('x', 100, '2026-11-10', 'cancellata')], categories, period, '2026-11-16').top, null);
});

test('riepilogo: non al primo avvio, una volta per periodo, nessun avviso senza spese, cambio di frequenza', () => {
  const s = state({ startedAt: '2026-11-11T10:00:00.000Z' });
  const expenses = [expense('pane', 250, '2026-11-12', 'food')];
  const input = (today: string, st = s, p = prefs(), list = expenses) => ({ preferences: p, state: st, expenses: list, categories, today });
  assert.equal(summaryDue(input('2026-11-14')), null, 'periodo concluso prima dell’attivazione');
  const due = summaryDue(input('2026-11-16'));
  assert.deepEqual(due?.period, { from: '2026-11-09', to: '2026-11-15' });
  assert.equal(due?.total, 250);
  const closed = closeSummary(s, due!.period);
  assert.equal(summaryDue(input('2026-11-20', closed)), null, 'già mostrato e chiuso');
  assert.equal(summaryDue(input('2026-11-16', s, prefs(), [])), null, 'nessuna spesa nel periodo');
  assert.equal(summaryDue(input('2026-11-16', s, prefs({ summaryEnabled: false }))), null);
  // Assenza lunga: solo l’ultimo periodo concluso, non una fila di avvisi.
  const late = summaryDue(input('2026-12-02', s, prefs(), [...expenses, expense('latte', 120, '2026-11-25', 'food')]));
  assert.deepEqual(late?.period, { from: '2026-11-23', to: '2026-11-29' });
  // Passando a mensile il 20 novembre si parte dal mese in corso: il riepilogo di novembre arriva a dicembre.
  const monthly = changeNotificationPreferences(prefs(), { summaryFrequency: 'monthly' }, at('2026-11-20T10:00:00.000Z'));
  assert.equal(summaryDue(input('2026-11-21', closed, monthly)), null);
  assert.deepEqual(summaryDue(input('2026-12-01', closed, monthly))?.period, { from: '2026-11-01', to: '2026-11-30' });
  // Chiudere un periodo più vecchio non riapre quelli successivi.
  assert.equal(closeSummary(closeSummary(s, { from: '2026-11-23', to: '2026-11-29' }), { from: '2026-11-09', to: '2026-11-15' }).summaryShownThrough, '2026-11-29');
});

test('notifiche dovute: il promemoria backup esiste solo con l’orologio dell’archivio locale', () => {
  const s = state();
  const base = { preferences: prefs(), state: s, expenses: [expense('pane', 250, '2026-11-10', 'food')], categories, today: '2026-11-16', now: at('2026-11-16T10:00:00.000Z') };
  assert.deepEqual(dueNotifications({ ...base, lastChange: '2026-11-10T10:00:00.000Z' }).map((item) => item.kind), ['backup', 'summary']);
  assert.deepEqual(dueNotifications({ ...base, lastChange: null }).map((item) => item.kind), ['summary']);
  assert.deepEqual(dueNotifications({ ...base, preferences: prefs({ backupEnabled: false, summaryEnabled: false }), lastChange: '2026-11-10T10:00:00.000Z' }), []);
});
