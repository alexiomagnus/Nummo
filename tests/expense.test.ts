import assert from 'node:assert/strict';
import { test } from 'node:test';
import { newDraft, parseAmountMinor, validateDraft } from '../src/domain/expense.ts';
import { todayInRome } from '../src/domain/policy.ts';

const now = new Date('2026-11-02T12:00:00Z');
const categories = [{ id: 'groceries', label: 'Alimentari' }];
const draft = { amount: '12,30', categoryId: 'groceries', date: '2026-11-02', note: '' };

for (const [input, expected] of [['0,01', 1], ['12,3', 1230], ['12.30', 1230], ['99999,99', 9999999], [' 42 ', 4200]] as const) {
  test(`importo esatto: ${input}`, () => assert.equal(parseAmountMinor(input), expected));
}
for (const input of ['', '0', '-1', '1,001', '1.000,00', '1e3', '100000', 'Infinity', '1,', '1 00', '0.009', '12abc']) {
  test(`importo rifiutato senza arrotondamento: ${input}`, () => assert.equal(parseAmountMinor(input), null));
}
test('normalizza il modulo in centesimi e conserva le note come testo', () => {
  const result = validateDraft({ ...draft, note: '=IMPORTXML("url")' }, categories, now);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.data.amount_minor, 1230);
    assert.equal(result.data.note, '=IMPORTXML("url")');
    assert.equal(result.data.currency, 'EUR');
  }
});
for (const date of ['2026-02-29', '2024-02-30', '2026-13-01', '2026-11-03', '1999-12-31', '02/11/2026']) {
  test(`data rifiutata: ${date}`, () => assert.equal(validateDraft({ ...draft, date }, categories, now).ok, false));
}
for (const date of ['2000-01-01', '2024-02-29', '2026-11-02']) {
  test(`data ammessa: ${date}`, () => assert.equal(validateDraft({ ...draft, date }, categories, now).ok, true));
}
test('rifiuta categorie sconosciute', () => assert.equal(validateDraft({ ...draft, categoryId: 'unknown' }, categories, now).ok, false));
test('limite nota in punti di codice Unicode', () => {
  assert.equal(validateDraft({ ...draft, note: '😀'.repeat(500) }, categories, now).ok, true);
  assert.equal(validateDraft({ ...draft, note: 'a'.repeat(501) }, categories, now).ok, false);
});
test('la data precompilata usa Roma a cavallo della mezzanotte e in ora legale', () => {
  assert.equal(todayInRome(new Date('2026-11-01T23:30:00Z')), '2026-11-02');
  assert.equal(todayInRome(new Date('2026-07-01T22:30:00Z')), '2026-07-02');
  assert.equal(newDraft().date, '');
});
test('la data automatica viene risolta alla validazione anche se cambia il giorno', () => {
  const result = validateDraft({ ...draft, date: '' }, categories, new Date('2026-11-02T23:30:00Z'));
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.data.expense_date, '2026-11-03');
});
test('una data esplicita resta invariata', () => {
  const result = validateDraft({ ...draft, date: '2026-10-31' }, categories, now);
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.data.expense_date, '2026-10-31');
});
test('accetta solo categorie presenti nella lista fornita', () => {
  assert.equal(validateDraft(draft, [], now).ok, false);
  assert.equal(validateDraft({ ...draft, categoryId: 'personal-id' }, [{ id: 'personal-id', label: 'Libri' }], now).ok, true);
  assert.equal(validateDraft(draft, [{ id: 'personal-id', label: 'Libri' }], now).ok, false);
});
