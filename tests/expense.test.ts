import assert from 'node:assert/strict';
import { test } from 'node:test';
import { newDraft, parseAmountMinor, validateDraft } from '../src/domain/expense.ts';
import { todayInRome } from '../src/domain/policy.ts';

const now = new Date('2026-11-02T12:00:00Z');
const categories = [{ id: 'groceries', label: 'Alimentari', icon: null }];
const draft = { amount: '12,30', description: 'Pane', categoryId: 'groceries', date: '2026-11-02', repeat: false, recurrence: '' as const, promo: false, promoAmount: '', promoAfter: '', fundId: '', trial: false, firstPaymentDate: '' };

for (const [input, expected] of [['0,01', 1], ['12,3', 1230], ['12.30', 1230], ['99999,99', 9999999], [' 42 ', 4200]] as const) {
  test(`importo esatto: ${input}`, () => assert.equal(parseAmountMinor(input), expected));
}
for (const input of ['', '0', '-1', '1,001', '1.000,00', '1e3', '100000', 'Infinity', '1,', '1 00', '0.009', '12abc']) {
  test(`importo rifiutato senza arrotondamento: ${input}`, () => assert.equal(parseAmountMinor(input), null));
}
test('normalizza il modulo in centesimi e conserva il nome come testo', () => {
  const result = validateDraft({ ...draft, description: '=IMPORTXML("url")' }, categories, now);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.data.amount_minor, 1230);
    assert.equal(result.data.description, '=IMPORTXML("url")');
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
test('la categoria è facoltativa', () => {
  const result = validateDraft({ ...draft, categoryId: '' }, [], now);
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.data.category_id, null);
});
test('il nome dell’acquisto è obbligatorio, normalizzato e limitato in punti di codice', () => {
  assert.equal(validateDraft({ ...draft, description: '   ' }, categories, now).ok, false);
  const result = validateDraft({ ...draft, description: '  Pane   e latte ' }, categories, now);
  assert.equal(result.ok && result.data.description, 'Pane e latte');
  assert.equal(validateDraft({ ...draft, description: '😀'.repeat(100) }, categories, now).ok, true);
  assert.equal(validateDraft({ ...draft, description: 'a'.repeat(101) }, categories, now).ok, false);
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
  assert.equal(validateDraft({ ...draft, categoryId: 'personal-id' }, [{ id: 'personal-id', label: 'Libri', icon: null }], now).ok, true);
  assert.equal(validateDraft(draft, [{ id: 'personal-id', label: 'Libri', icon: null }], now).ok, false);
});
test('spesa ricorrente: serve la ricorrenza solo se attivata', () => {
  assert.equal(validateDraft({ ...draft, repeat: true }, categories, now).ok, false);
  const result = validateDraft({ ...draft, repeat: true, recurrence: 'monthly' }, categories, now);
  assert.equal(result.ok && result.data.recurrence, 'monthly');
  const oneOff = validateDraft({ ...draft, repeat: false, recurrence: 'monthly' }, categories, now);
  assert.equal(oneOff.ok && oneOff.data.recurrence, null);
});
test('messaggi brevi per importo mancante o non valido', () => {
  const missing = validateDraft({ ...draft, amount: '  ' }, categories, now);
  assert.equal(!missing.ok && missing.errors.amount, 'Inserisci l’importo.');
  const invalid = validateDraft({ ...draft, amount: '1,001' }, categories, now);
  assert.equal(!invalid.ok && invalid.errors.amount, 'Importo non valido (es. 12,50).');
});
