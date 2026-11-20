import assert from 'node:assert/strict';
import { test } from 'node:test';
import { actionCleared, actionFailed, listenerFailed, listenerRecovered, noDataErrors, snapshotReceived, visibleError, type DataErrors } from '../src/features/workspace/dataErrors.ts';

const denied = 'Accesso negato: verifica UID del proprietario e regole Firestore del progetto.';
const run = (steps: readonly ((state: DataErrors) => DataErrors)[]) => steps.reduce((state, step) => step(state), noDataErrors);

test('fondi: un listener fallito resta visibile dopo lo snapshot dell’altro listener', () => {
  // Funds from the cache, movements refused (Rules not published), then the funds' server snapshot: before the fix the
  // shared message was cleared here while `ready` stayed false, and the new-expense form waited forever without a word.
  const state = run([
    (s) => snapshotReceived(s, 'funds'),
    (s) => listenerFailed(s, 'movements', denied),
    (s) => snapshotReceived(s, 'funds'),
  ]);
  assert.equal(visibleError(state), denied);
});

test('chiudere un dialogo o un’operazione riuscita non nasconde il listener fallito', () => {
  const failed = listenerFailed(noDataErrors, 'movements', denied);
  assert.equal(visibleError(actionCleared(failed)), denied);
  // An operation error is shown first, and dismissing it brings the listener's message back.
  const both = actionFailed(failed, 'Operazione non riuscita. Verifica la connessione e riprova.');
  assert.equal(visibleError(both), 'Operazione non riuscita. Verifica la connessione e riprova.');
  assert.equal(visibleError(actionCleared(both)), denied);
});

test('il listener che riprende cancella solo il proprio errore', () => {
  const state = run([
    (s) => listenerFailed(s, 'lists', 'primo'),
    (s) => listenerFailed(s, 'items', 'secondo'),
    (s) => listenerRecovered(s, 'lists'),
  ]);
  assert.equal(visibleError(state), 'secondo');
  assert.equal(visibleError(listenerRecovered(state, 'items')), null);
});

test('snapshot: come prima cancella l’errore di un’operazione (spese, categorie, fondi), non nelle liste', () => {
  const failedAction = actionFailed(noDataErrors, 'Conflitto');
  assert.equal(visibleError(snapshotReceived(failedAction, 'expenses')), null);
  // Lists: the error of a queued write arrives with the snapshot that rolls it back, and must stay.
  assert.equal(visibleError(listenerRecovered(failedAction, 'items')), 'Conflitto');
});

test('nessun cambiamento restituisce lo stesso oggetto (niente render inutili)', () => {
  assert.equal(snapshotReceived(noDataErrors, 'funds'), noDataErrors);
  assert.equal(listenerRecovered(noDataErrors, 'items'), noDataErrors);
  assert.equal(actionCleared(noDataErrors), noDataErrors);
  const failed = actionFailed(noDataErrors, 'x');
  assert.equal(actionFailed(failed, 'x'), failed);
  assert.equal(visibleError(noDataErrors), null);
});
