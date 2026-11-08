import assert from 'node:assert/strict';
import { test } from 'node:test';
import { signInError } from '../src/features/session/signInError.ts';
import { translate } from '../src/i18n/translate.ts';

test('login: gli errori non mappati conservano il codice Firebase in IT/EN', () => {
  const message = signInError('auth/internal-error')!;
  assert.equal(message, 'Accesso non riuscito (auth/internal-error). Riprova.');
  assert.equal(translate('it', message), message);
  assert.equal(translate('en', message), 'Sign-in failed (auth/internal-error). Try again.');
});

test('login: popup annullati silenziosi e spiegazioni esistenti preservate', () => {
  assert.equal(signInError('auth/popup-closed-by-user'), null);
  assert.equal(signInError('auth/cancelled-popup-request'), null);
  assert.equal(signInError('auth/popup-blocked'), 'Il browser ha bloccato la finestra di accesso: consentila e riprova.');
  assert.equal(signInError('auth/unauthorized-domain'), 'Questo indirizzo non è tra i domini autorizzati del progetto Firebase.');
});

test('login: nessun messaggio arbitrario o dato personale nella diagnostica', () => {
  for (const code of ['unknown', '__proto__', 'auth/errore token=privato', 'auth/' + 'a'.repeat(100)]) {
    assert.equal(signInError(code), 'Accesso non riuscito (unknown). Riprova.');
  }
});
