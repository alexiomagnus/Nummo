import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeAmount, normalizeDate, readPrefillHash, resolvePrefill } from '../src/domain/prefillLink.ts';
import { noFund } from '../src/domain/funds.ts';

const categories = [{ id: 'c-food', label: 'Alimentari' }, { id: 'c-bar', label: 'Bar e  caffè' }];
const funds = [{ id: 'f-home', name: 'Casa' }];
const fill = (hash: string) => resolvePrefill(readPrefillHash(hash)!, categories, funds);

test('link di precompilazione: solo #nuova, parametri italiani, il primo ripetuto vale', () => {
  assert.equal(readPrefillHash(''), null);
  assert.equal(readPrefillHash('#guida'), null);
  assert.equal(readPrefillHash('#nuovaspesa'), null);
  assert.deepEqual(readPrefillHash('#nuova'), { values: {}, unknown: 0 });
  assert.deepEqual(readPrefillHash('#nuova?importo=12,50&Descrizione=Bar%20Roma&importo=3&prezzo=1'),
    { values: { importo: '12,50', descrizione: 'Bar Roma' }, unknown: 1 });
  // `+` is a space, as in any query string.
  assert.equal(readPrefillHash('#nuova?descrizione=Caff%C3%A8+al+bar')!.values.descrizione, 'Caffè al bar');
});

test('importo come lo scrivono app di pagamento e comandi rapidi', () => {
  assert.equal(normalizeAmount('12,50'), '12,50');
  assert.equal(normalizeAmount('12.5'), '12,5');
  assert.equal(normalizeAmount('€ 12,50'), '12,50');
  assert.equal(normalizeAmount('12,50 EUR'), '12,50');
  assert.equal(normalizeAmount('1.234,56'), '1234,56');
  assert.equal(normalizeAmount('1,234.56'), '1234,56');
  assert.equal(normalizeAmount('1.234'), '1234');
  assert.equal(normalizeAmount('1.234.567'), '1234567');
  assert.equal(normalizeAmount('7'), '7');
  assert.equal(normalizeAmount('12,505'), '12505');
  assert.equal(normalizeAmount('999.999.999,99'), '999999999,99');
  for (const bad of ['', '0', '0,00', '-5', 'dodici', '12,345,6', '1.000.000.000', '1e3']) assert.equal(normalizeAmount(bad), null, bad);
});

test('data ISO o all’italiana, solo se esiste', () => {
  assert.equal(normalizeDate('2026-11-24'), '2026-11-24');
  assert.equal(normalizeDate('24/11/2026'), '2026-11-24');
  assert.equal(normalizeDate('3.2.2026'), '2026-02-03');
  assert.equal(normalizeDate('2026-02-30'), null);
  assert.equal(normalizeDate('31/04/2026'), null);
  assert.equal(normalizeDate('domani'), null);
});

test('campi compilati: categoria e fondo per nome, testi al limite del campo, valori inutilizzabili contati', () => {
  assert.deepEqual(fill('#nuova?importo=12,50&descrizione=%20Bar%20&esercente=Bar%20Sport&data=24/11/2026&categoria=bar%20E%20caff%C3%A8&fondo=CASA'), {
    patch: { amount: '12,50', description: 'Bar', merchant: 'Bar Sport', date: '2026-11-24', categoryId: 'c-bar', fundId: 'f-home' }, ignored: 0 });
  assert.deepEqual(fill('#nuova?fondo=Nessun%20fondo'), { patch: { fundId: noFund }, ignored: 0 });
  assert.deepEqual(fill('#nuova?importo=gratis&categoria=Viaggi&fondo=Vacanze&data=ieri&descrizione=%20&x=1'), { patch: {}, ignored: 6 });
  const long = fill(`#nuova?descrizione=${'a'.repeat(150)}&esercente=${'b'.repeat(50)}`).patch;
  assert.equal(long.description?.length, 100);
  assert.equal(long.merchant?.length, 30);
  assert.deepEqual(fill('#nuova'), { patch: {}, ignored: 0 });
});
