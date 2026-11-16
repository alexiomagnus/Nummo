import assert from 'node:assert/strict';
import { test } from 'node:test';
import { breakdown, expandOccurrences, type Occurrence } from '../src/domain/history.ts';
import { dashboardInsights, rankCategories, variation } from '../src/features/dashboard/insights.ts';
import { translate } from '../src/i18n/translate.ts';
const item = (date: string, amount = 100, category: string | null = null): Occurrence => ({
  key: date + category, expenseId: date, index: 0, date, amount_minor: amount, category_id: category, description: 'Test', recurrence: null,
});
const analyze = (items: Occurrence[], period: 'month' | 'previous-month' | 'year' = 'month', today = '2026-11-08') =>
  dashboardInsights(breakdown(items, [], period, today), items, [], today);

test('dashboard: giorni a zero, nessun futuro e periodo equivalente esatto', () => {
  const result = analyze([item('2026-11-02'), item('2026-10-24', 200)]);
  assert.equal(result.days.length, 8);
  assert.equal(result.days[0]!.total, 0);
  assert.equal(result.previousFrom, '2026-10-24');
  assert.equal(result.previousTo, '2026-10-31');
  assert.equal(result.current.length, 1);
  assert.equal(result.change, -50);
});
test('dashboard: confronto senza base, archivio vuoto e storico insufficiente', () => {
  assert.equal(variation(100, 0), null);
  assert.equal(variation(0, 100), -100);
  assert.equal(variation(150, 100), 50);
  assert.equal(analyze([]).change, null);
  assert.equal(analyze([item('2026-11-01')]).change, null);
  assert.equal(analyze([item('2026-10-24', 200), item('2026-11-01')]).change, -50);
});
test('dashboard: febbraio bisestile e anno con tutti i giorni osservati', () => {
  const leap = analyze([], 'previous-month', '2024-03-03');
  assert.equal(leap.days.length, 29);
  assert.equal(leap.previousTo, '2024-01-31');
  assert.equal(leap.previousFrom, '2024-01-03');
  assert.equal(analyze([], 'year', '2026-11-08').days.length, 343);
});
test('dashboard: categorie orfane riunite, conteggio include rinnovi maturati', () => {
  const items = expandOccurrences([{ id: 'a', amount_minor: 100, description: 'Serie', category_id: 'deleted',
    expense_date: '2026-10-01', recurrence: 'monthly', created_at: '' }], '2026-11-08');
  const result = analyze(items);
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0]!.key, '__none');
  assert.equal(result.rows[0]!.count, 1);
  assert.equal(result.rows[0]!.total, 100);
  assert.equal(result.keyOf(items[0]!), '__none');
});
test('categorie: nessun limite, ordinamenti distinti e parità deterministica', () => {
  const rows = Array.from({ length: 30 }, (_, i) => ({ key: String(i), label: 'C', slot: 0, values: [], total: i, count: 30 - i, change: null }));
  assert.equal(rankCategories(rows, 'amount').length, 30);
  assert.equal(rankCategories(rows, 'amount')[0]!.total, 29);
  assert.equal(rankCategories(rows, 'count')[0]!.count, 30);
  assert.equal(rows[0]!.total, 0);
});
test('dashboard: nuovi testi localizzati senza tradurre i dati utente', () => {
  for (const text of ['Barre', 'Transazioni', 'Andamento nel tempo', 'Confronto non disponibile', 'Mostra transazioni']) {
    assert.equal(translate('it', text), text);
    assert.notEqual(translate('en', text), text);
  }
});
