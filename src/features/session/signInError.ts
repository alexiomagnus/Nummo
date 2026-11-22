const messages: Readonly<Record<string, string>> = {
  'auth/popup-blocked': 'Il browser ha bloccato la finestra di accesso: consentila e riprova.',
  'auth/unauthorized-domain': 'Questo indirizzo non è tra i domini autorizzati del progetto Firebase.',
  'auth/operation-not-allowed': 'L’accesso con Google non è abilitato nel progetto Firebase.',
  'auth/network-request-failed': 'Connessione assente: accesso non riuscito.',
  'auth/invalid-api-key': 'Configurazione Firebase non valida (apiKey).',
  'auth/app-no-google-account': 'Nessun account Google su questo telefono: aggiungine uno nelle impostazioni di Android e riprova.',
};

// Show only a bounded SDK code, never the raw error message/customData (which may
// contain account information or credentials). Keep source-language errors in state.
export function signInError(code: string): string | null {
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return null;
  if (Object.hasOwn(messages, code)) return messages[code]!;
  const diagnostic = /^auth\/[a-z][a-z0-9-]{0,79}$/.test(code) ? code : 'unknown';
  return `Accesso non riuscito (${diagnostic}). Riprova.`;
}
