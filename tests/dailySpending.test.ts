import assert from 'node:assert/strict';
import { test } from 'node:test';
import { breakdown, type Occurrence } from '../src/domain/history.ts';
import { dailySpendingRows } from '../src/features/dashboard/dailySpending.ts';

const item = (key: string, date: string, amount_minor: number): Occurrence => ({
  key, expenseId: key, date, amount_minor, description: key, category_id: null, recurrence: null,
});

test('dettaglio giornaliero: giorni con spese dal più recente, importi e occorrenze coerenti con la dashboard', () => {
  const today = '2026-11-08';
  const occurrences = [item('Pane', '2026-11-08', 150), item('Abbonamento', '2026-11-08', 2000),
    item('Cena', '2026-11-02', 3050), item('Fuori mese', '2026-10-31', 999)];
  const original = structuredClone(occurrences);
  const data = breakdown(occurrences, [], 'month', today);
  const rows = dailySpendingRows(data, occurrences, today);
  assert.deepEqual(rows.map((row) => [row.date, row.total]), [['2026-11-08', 2150], ['2026-11-02', 3050]]);
  assert.deepEqual(rows[0]!.items.map((entry) => entry.key), ['Abbonamento', 'Pane']);
  assert.equal(rows.reduce((sum, row) => sum + row.total, 0), data.total);
  assert.equal(rows.flatMap((row) => row.items).length, data.count);
  assert.deepEqual(occurrences, original);
});

test('giorni senza spese opzionali, senza mostrare date future nemmeno con dati futuri in ingresso', () => {
  const today = '2026-11-08';
  const occurrences = [item('Oggi', today, 100), item('Futura', '2026-11-09', 900)];
  const data = breakdown(occurrences, [], 'month', today);
  const rows = dailySpendingRows(data, occurrences, today, true);
  assert.equal(rows.length, 8);
  assert.equal(rows[0]!.date, today);
  assert.equal(rows[7]!.date, '2026-11-01');
  assert.ok(rows.every((row) => row.date <= today));
  assert.deepEqual(rows[1]!.items, []);
  assert.equal(rows[1]!.total, 0);
  assert.deepEqual(dailySpendingRows(data, occurrences, today).map((row) => row.date), [today]);
});

test('mese scorso a cavallo d’anno: tutti i giorni passati restano consultabili e gli altri mesi esclusi', () => {
  const today = '2026-01-08';
  const occurrences = [item('Dicembre', '2025-12-31', 1234), item('Gennaio', '2026-01-01', 500)];
  const data = breakdown(occurrences, [], 'previous-month', today);
  const rows = dailySpendingRows(data, occurrences, today, true);
  assert.equal(rows.length, 31);
  assert.equal(rows[0]!.date, '2025-12-31');
  assert.equal(rows[30]!.date, '2025-12-01');
  assert.equal(rows.reduce((sum, row) => sum + row.total, 0), 1234);
  assert.deepEqual(rows.flatMap((row) => row.items).map((entry) => entry.key), ['Dicembre']);
});

test('dettaglio: conserva prezzi, identità delle occorrenze ricorrenti e riferimenti a categorie eliminate', () => {
  const today = '2026-11-08';
  const occurrences: Occurrence[] = [
    { ...item('serie:2026-11-08', today, 699), expenseId: 'serie', description: 'Servizio', recurrence: 'monthly', category_id: 'eliminata' },
    { ...item('serie:2026-11-01', '2026-11-01', 99), expenseId: 'serie', description: 'Servizio', recurrence: 'monthly', category_id: 'eliminata' },
  ];
  const data = breakdown(occurrences, [], 'month', today);
  const rows = dailySpendingRows(data, occurrences, today);
  assert.deepEqual(rows.flatMap((row) => row.items), occurrences);
  assert.deepEqual(rows.map((row) => row.total), [699, 99]);
});

test('3, 6 e 12 mesi: dettaglio per singolo giorno e totali coerenti con i grafici mensili', () => {
  const today = '2026-01-08';
  const occurrences = Array.from({ length: 12 }, (_, index) => {
    const month = index === 11 ? '2026-01' : `2025-${String(index + 2).padStart(2, '0')}`;
    return item(month, `${month}-08`, (index + 1) * 100);
  });
  for (const [period, count] of [['quarter', 3], ['year', 12]] as const) {
    const data = breakdown(occurrences, [], period, today);
    const rows = dailySpendingRows(data, occurrences, today);
    assert.equal(rows.length, count);
    assert.equal(rows[0]!.date, today);
    assert.ok(rows.every((row) => row.date.endsWith('-08')));
    assert.equal(rows[rows.length - 1]!.date.slice(0, 7), data.buckets[0]!.from.slice(0, 7));
    assert.equal(rows.reduce((sum, row) => sum + row.total, 0), data.total);
    assert.equal(rows.flatMap((row) => row.items).length, data.count);
  }
});

test('12 mesi con giorni vuoti: intervallo continuo, febbraio bisestile e nessuna data futura', () => {
  const today = '2024-03-10';
  const occurrences = [item('Bisestile', '2024-02-29', 999), item('Futura', '2024-03-11', 123)];
  const data = breakdown(occurrences, [], 'year', today);
  const rows = dailySpendingRows(data, occurrences, today, true);
  assert.equal(rows[0]!.date, today);
  assert.equal(rows[rows.length - 1]!.date, '2023-04-01');
  const expected = (Date.parse(today) - Date.parse('2023-04-01')) / 86400000 + 1;
  assert.equal(rows.length, expected);
  assert.equal(new Set(rows.map((row) => row.date)).size, expected);
  assert.equal(rows.find((row) => row.date === '2024-02-29')!.total, 999);
  assert.ok(rows.every((row) => row.date <= today));
  assert.equal(rows.reduce((sum, row) => sum + row.total, 0), 999);
});
