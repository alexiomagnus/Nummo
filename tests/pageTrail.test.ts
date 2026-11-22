import assert from 'node:assert/strict';
import test from 'node:test';
import { done, maxTrail, stepBack, visit } from '../src/features/workspace/pageTrail.ts';

test('Indietro: un passo alla volta, nell’ordine delle pagine visitate', () => {
  let trail = visit<string>([], 'expense', 'list');
  trail = visit(trail, 'list', 'dashboard');
  trail = visit(trail, 'dashboard', 'funds');
  assert.deepEqual(trail, ['expense', 'list', 'dashboard']);
  let step = stepBack(trail, 'funds', 'expense');
  assert.deepEqual(step, { to: 'dashboard', trail: ['expense', 'list'] }, 'da Fondi ad Analisi, non a Nuova spesa');
  step = stepBack(step!.trail, 'dashboard', 'expense');
  assert.deepEqual(step, { to: 'list', trail: ['expense'] });
  step = stepBack(step!.trail, 'list', 'expense');
  assert.deepEqual(step, { to: 'expense', trail: [] });
  assert.equal(stepBack(step!.trail, 'expense', 'expense'), null, 'da Nuova spesa senza passi: Indietro esce dall’app');
});

test('Indietro: la stessa pagina non si aggiunge, Nuova spesa visitata a metà resta un passo', () => {
  assert.deepEqual(visit(['expense'], 'list', 'list'), ['expense']);
  const trail = visit(visit(visit([], 'expense', 'list'), 'list', 'expense'), 'expense', 'dashboard');
  assert.deepEqual(stepBack(trail, 'dashboard', 'expense'), { to: 'expense', trail: ['expense', 'list'] });
  assert.deepEqual(stepBack(['expense', 'list'], 'expense', 'expense'), { to: 'list', trail: ['expense'] }, 'da Nuova spesa si torna ancora indietro');
});

test('Indietro: cronologia limitata, poi Nuova spesa', () => {
  let trail: readonly string[] = [];
  let current = 'expense';
  for (let i = 0; i < maxTrail + 5; i++) { const next = i % 2 ? 'list' : 'dashboard'; trail = visit(trail, current, next); current = next; }
  assert.equal(trail.length, maxTrail);
  assert.deepEqual(stepBack([], 'funds', 'expense'), { to: 'expense', trail: [] }, 'passi dimenticati: si torna all’inizio');
});

test('«Fatto»: torna alla pagina di partenza come passo indietro, senza lasciare le pagine del menu nella cronologia', () => {
  const trail = visit(visit([], 'expense', 'list'), 'list', 'settings');
  assert.deepEqual(done(trail, 'settings', 'list'), { to: 'list', trail: ['expense'] }, 'Impostazioni non resta nella cronologia');
  // Spese → Impostazioni → Categorie → Fatto: back to Spese, and Back from there goes to Nuova spesa, not to Categorie.
  const deeper = visit(trail, 'settings', 'categories');
  assert.deepEqual(done(deeper, 'categories', 'list'), { to: 'list', trail: ['expense'] });
  assert.deepEqual(done(['expense'], 'settings', 'funds'), { to: 'funds', trail: ['expense', 'settings'] }, 'pagina di partenza dimenticata: una visita');
});
