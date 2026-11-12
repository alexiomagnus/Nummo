import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sameFieldValue, parseExpenseRecord, parseExpenseRequest } from '../src/domain/contract.ts';
import { applyPriceEdit, currentPrice, newDraft, validateDraft, type ExpenseData } from '../src/domain/expense.ts';
import { addDays, expandOccurrences, forecastOccurrences, upcomingRenewals, type ExpenseEntry } from '../src/domain/history.ts';
import { changePrice, makeChange, nextRenewal, parsePriceChanges, priceAt } from '../src/domain/pricing.ts';
import { exportCsv } from '../src/domain/backup.ts';

const entry = (over: Partial<ExpenseEntry>): ExpenseEntry => ({
  id: 'a', amount_minor: 600, description: 'Dominio', category_id: null, expense_date: '2025-03-12',
  recurrence: 'yearly', created_at: '2025-03-12T10:00:00.000Z', ...over,
});
const amounts = (items: { amount_minor: number }[]) => items.map((item) => item.amount_minor);

test('prezzo fisso: senza variazioni ogni occorrenza costa quanto la prima (spese esistenti incluse)', () => {
  assert.deepEqual(amounts(expandOccurrences([entry({ recurrence: 'monthly', expense_date: '2026-09-02' })], '2026-11-02')), [600, 600, 600]);
  assert.deepEqual(amounts(expandOccurrences([entry({ price_changes: [] })], '2027-06-01')), [600, 600, 600]);
});

test('prezzo promozionale (Aruba): 6 € il primo anno, 12 € dal secondo', () => {
  const aruba = entry({ price_changes: [makeChange(1, 1200, false)] });
  assert.deepEqual(expandOccurrences([aruba], '2027-03-11').map((o) => [o.date, o.amount_minor]), [['2025-03-12', 600], ['2026-03-12', 1200]]);
  assert.deepEqual(amounts(expandOccurrences([aruba], '2028-03-12')), [600, 1200, 1200, 1200]);
});

test('promo dopo N rinnovi: mensile, 3 pagamenti a prezzo promo poi il prezzo pieno', () => {
  const monthly = entry({ recurrence: 'monthly', expense_date: '2026-01-15', price_changes: [makeChange(3, 1000, false)] });
  assert.deepEqual(amounts(expandOccurrences([monthly], '2026-06-30')), [600, 600, 600, 1000, 1000, 1000]);
});

test('priceAt: variazione singola solo su quel rinnovo, sopra il prezzo persistente', () => {
  const changes = [makeChange(1, 1200, false), makeChange(2, 1500, true), makeChange(4, 1800, false)];
  assert.deepEqual([0, 1, 2, 3, 4, 5].map((i) => priceAt(600, changes, i)), [600, 1200, 1500, 1200, 1800, 1800]);
});

test('modifica "tutti i futuri": il passato non cambia e le variazioni future sono sostituite', () => {
  const before = [makeChange(1, 1200, false), makeChange(3, 2000, false), makeChange(4, 900, true)];
  const next = changePrice(600, before, 2, 1500, 'future')!;
  assert.deepEqual(next, [makeChange(1, 1200, false), makeChange(2, 1500, false)]);
  assert.deepEqual([0, 1, 2, 3, 4].map((i) => priceAt(600, next, i)), [600, 1200, 1500, 1500, 1500]);
  // Same price as the one in force: nothing stored; and it cancels the scheduled increase.
  assert.deepEqual(changePrice(600, before, 2, 1200, 'future'), [makeChange(1, 1200, false)]);
});

test('modifica "solo il prossimo rinnovo": un solo pagamento cambia, poi si torna al prezzo normale', () => {
  const next = changePrice(600, [makeChange(1, 1200, false)], 2, 1000, 'once')!;
  assert.deepEqual([0, 1, 2, 3].map((i) => priceAt(600, next, i)), [600, 1200, 1000, 1200]);
  // Repeating the one-off replaces it instead of piling up.
  assert.deepEqual(changePrice(600, next, 2, 1100, 'once'), [makeChange(1, 1200, false), makeChange(2, 1100, true)]);
  // Back to the normal price removes it.
  assert.deepEqual(changePrice(600, next, 2, 1200, 'once'), [makeChange(1, 1200, false)]);
});

test('limite di variazioni: oltre 8 la modifica è rifiutata', () => {
  const many = Array.from({ length: 8 }, (_, i) => makeChange(i + 1, 700 + i, false));
  assert.equal(changePrice(600, many, 30, 5000, 'future'), null);
  assert.equal(parsePriceChanges([...many, makeChange(9, 800, false)]), null);
});

test('storico: la modifica del prezzo non altera gli importi già maturati', () => {
  const today = '2028-03-12';
  const series = entry({ price_changes: [makeChange(1, 1200, false)] });
  const data = { ...series, currency: 'EUR', source: 'web_app', schema_version: 1 } as unknown as ExpenseData;
  const before = expandOccurrences([series], today);
  // The user types 20,00 for the next renewal (2029-03-12).
  const typed = applyPriceEdit(series, { ...data, amount_minor: 2000 }, { shownAmount: 1200, scope: 'future', changes: series.price_changes! }, today);
  assert.ok(typed.ok);
  const edited = { ...series, ...typed.data };
  assert.equal(edited.amount_minor, 600);
  assert.deepEqual(expandOccurrences([edited], today), before);
  assert.deepEqual(amounts(expandOccurrences([edited], '2029-03-12')), [600, 1200, 1200, 1200, 2000]);
});

test('modifica di un importo invariato o di una spesa singola', () => {
  const series = entry({ price_changes: [makeChange(1, 1200, false)] });
  const data = { ...series, source: 'web_app', schema_version: 1, currency: 'EUR' } as unknown as ExpenseData;
  const same = applyPriceEdit(series, { ...data, amount_minor: 1200 }, { shownAmount: 1200, scope: 'once', changes: series.price_changes! }, '2027-01-01');
  assert.deepEqual(same.ok && same.data.price_changes, [makeChange(1, 1200, false)]);
  assert.equal(same.ok && same.data.amount_minor, 600);
  const oneOff = applyPriceEdit({ ...series, recurrence: null }, { ...data, recurrence: null, amount_minor: 900 }, { shownAmount: 600, scope: 'future', changes: [] }, '2027-01-01');
  assert.deepEqual(oneOff.ok && [oneOff.data.amount_minor, oneOff.data.price_changes], [900, []]);
});

test('importo mostrato in modifica: quello del prossimo rinnovo', () => {
  const series = entry({ price_changes: [makeChange(1, 1200, false)] });
  assert.equal(currentPrice(series, '2025-06-01'), 1200);
  assert.equal(currentPrice(series, '2026-03-12'), 1200);
  assert.equal(currentPrice({ ...series, recurrence: null }, '2026-03-12'), 600);
});

test('previsioni: pagamenti futuri con il prezzo programmato, separati dagli effettivi', () => {
  const aruba = entry({ price_changes: [makeChange(1, 1200, false)] });
  const monthly = entry({ id: 'b', recurrence: 'monthly', expense_date: '2026-10-20', amount_minor: 999, description: 'Musica' });
  const today = '2025-11-02';
  // Aruba renews next on 2026-03-12 at the promotional price's end.
  assert.deepEqual(upcomingRenewals([aruba], today).map((r) => [r.occurrence.date, r.occurrence.amount_minor, r.previous]), [['2026-03-12', 1200, 600]]);
  assert.deepEqual(forecastOccurrences([aruba], today, '2027-12-31').map((o) => [o.date, o.amount_minor]),
    [['2026-03-12', 1200], ['2027-03-12', 1200]]);
  // Effective occurrences never include the future ones.
  assert.deepEqual(expandOccurrences([aruba], today).map((o) => o.date), ['2025-03-12']);
  // Soonest first across series; a one-off expense has no renewal.
  const sorted = upcomingRenewals([aruba, monthly, entry({ id: 'c', recurrence: null })], '2026-11-02');
  assert.deepEqual(sorted.map((r) => r.occurrence.expenseId), ['b', 'a']);
  assert.deepEqual(forecastOccurrences([monthly], '2026-11-02', addDays('2026-11-02', 30)).map((o) => o.date), ['2026-11-20']);
  // With a window (the card's 30 days), renewals due later are left out; the limit day itself is included.
  assert.deepEqual(upcomingRenewals([aruba, monthly], '2026-11-02', addDays('2026-11-02', 30)).map((r) => r.occurrence.expenseId), ['b']);
  assert.deepEqual(upcomingRenewals([monthly], '2026-10-21', '2026-11-20').map((r) => r.occurrence.date), ['2026-11-20']);
  assert.deepEqual(upcomingRenewals([monthly], '2026-10-21', '2026-11-19'), []);
});

test('previsioni: oggi è già un pagamento effettivo, il prossimo rinnovo è il successivo', () => {
  assert.deepEqual(nextRenewal('2025-03-12', 'yearly', '2026-03-12'), { index: 2, date: '2027-03-12' });
  assert.deepEqual(nextRenewal('2025-03-12', 'yearly', '2026-03-11'), { index: 1, date: '2026-03-12' });
  assert.equal(nextRenewal('2025-03-12', null, '2026-03-12'), null);
});

test('modulo: prezzo promozionale validato e salvato come variazione dal rinnovo indicato', () => {
  const base = { ...newDraft(), amount: '6', description: 'Dominio', categoryId: 'c', date: '2026-03-12', repeat: true, recurrence: 'yearly' as const };
  const categories = [{ id: 'c', label: 'Web', icon: null }];
  const now = new Date('2026-11-02T12:00:00Z');
  const ok = validateDraft({ ...base, promo: true, promoAmount: '12', promoAfter: '1' }, categories, now);
  assert.deepEqual(ok.ok && [ok.data.amount_minor, ok.data.price_changes], [600, [makeChange(1, 1200, false)]]);
  const off = validateDraft({ ...base, promo: false, promoAmount: 'x', promoAfter: 'x' }, categories, now);
  assert.deepEqual(off.ok && off.data.price_changes, []);
  const notRepeating = validateDraft({ ...base, repeat: false, recurrence: '', promo: true, promoAmount: '12', promoAfter: '1' }, categories, now);
  assert.deepEqual(notRepeating.ok && notRepeating.data.price_changes, []);
  for (const patch of [{ promoAmount: '' }, { promoAmount: '6' }, { promoAmount: '1x' }, { promoAfter: '0' }, { promoAfter: '1.5' }, { promoAfter: '1000' }, { promoAfter: '' }]) {
    const bad = validateDraft({ ...base, promo: true, promoAmount: '12', promoAfter: '1', ...patch }, categories, now);
    assert.equal(bad.ok, false, JSON.stringify(patch));
  }
});

test('contratto: schedule validato; spese vecchie senza campo restano valide; confronto per valore', () => {
  assert.deepEqual(parsePriceChanges(undefined), []);
  for (const invalid of [null, 'x', [{ index: 0, amount_minor: 1, once: false }], [{ index: 1, amount_minor: 0, once: false }],
    [{ index: 1, amount_minor: 1.5, once: false }], [{ index: 1000, amount_minor: 5, once: false }], [{ index: 1, amount_minor: 5 }],
    [{ index: 1, amount_minor: 5, once: false, extra: 1 }], [makeChange(1, 5, false), makeChange(1, 6, false)]]) assert.equal(parsePriceChanges(invalid), null);
  // Same renewal may have one persistent and one one-off change.
  assert.equal(parsePriceChanges([makeChange(1, 5, false), makeChange(1, 6, true)])?.length, 2);
  const stored = { id: 'x', amount_minor: 600, currency: 'EUR', description: 'Dominio', category_id: null, expense_date: '2025-03-12', recurrence: 'yearly',
    source: 'web_app', schema_version: 1, created_at: '2025-03-12T10:00:00.000Z' };
  assert.deepEqual(parseExpenseRecord(stored)?.price_changes, []);
  assert.equal(parseExpenseRecord({ ...stored, price_changes: [{ index: 0 }] }), null);
  const request = { ...stored, expense_id: '3f1c2b9e-8d4a-4f6b-9c1e-2a7d5e8f0b13', price_changes: [makeChange(1, 1200, false)], status_changes: [], fund_id: null, list_id: null, list_items: [] } as Record<string, unknown>;
  delete request.id; delete request.created_at;
  assert.ok(parseExpenseRequest(request, new Date('2026-11-02T12:00:00Z')));
  delete request.price_changes;
  assert.equal(parseExpenseRequest(request, new Date('2026-11-02T12:00:00Z')), null);
  assert.ok(sameFieldValue([{ index: 1, amount_minor: 5, once: false }], [{ once: false, amount_minor: 5, index: 1 }]));
  assert.ok(!sameFieldValue([makeChange(1, 5, false)], [makeChange(1, 6, false)]));
  assert.ok(!sameFieldValue([], [makeChange(1, 6, false)]));
});

test('CSV: ogni occorrenza esporta il prezzo che aveva', () => {
  const record = { ...entry({ price_changes: [makeChange(1, 1200, false)] }), currency: 'EUR' as const, category_id: null, source: 'web_app' as const, schema_version: 1 as const };
  const csv = exportCsv([record as never], [], '2026-12-31');
  assert.ok(csv.includes(';6,00;EUR;') && csv.includes(';12,00;EUR;'));
});
