# Nummo — istruzioni per gli agenti

Web app personale (PWA prevista) per registrare spese in Google Sheets («Registro spese»),
in sostituzione di Google Forms. Nome dell'app: **Nummo** (in passato «Nummus»,
nome ancora presente nello storico di `docs/progress.md`; `recap.md` lo indica «da definire»). Stato operativo e
prossimi passi: `HANDOFF.md`.

## Fonti
- `recap.md`: specifica originale v0.4 (comportamento previsto). Leggerla integralmente
  prima di modifiche funzionali; non modificarla.
- `docs/architecture.md`: decisioni confermate, confini del backend, proposte non approvate.
- `docs/progress.md`: piano a fasi e registro dettagliato delle verifiche.
- Lo stato effettivo si ricava dal codice e dall'esecuzione dei controlli, non dai documenti.

## Architettura effettiva
Frontend Expo web + backend Firebase (Auth + Cloud Functions + ledger Firestore → Sheets).
Progetto Firebase reale `nummo-6b6e2` (alias `real` in `.firebaserc`, mai predefinito)
usato **solo per Authentication**; Functions e Firestore girano sempre negli emulatori.
Nessun deployment, nessun foglio reale.
Modalità scelta in build con `EXPO_PUBLIC_NUMMO_BACKEND`, mai mescolate:
- assente: solo browser (`localStorage`, nessun login);
- `emulator`: tutto emulato, progetto `demo-nummo`, account Google simulati;
- `firebase`: Auth reale da `EXPO_PUBLIC_FIREBASE_*` (in `.env.local`, modello
  `.env.example`) + Functions su `EXPO_PUBLIC_FUNCTIONS_EMULATOR` (host:porta) se
  impostata, altrimenti quelle pubblicate (oggi inesistenti).
Protocollo, API ed errori: `docs/architecture.md` § Backend.

`index.ts` → `App.tsx` (tema Material 3, sessione) → `Workspace` (sezioni Nuova · Spese ·
Dashboard · Categorie, stato React locale, senza router né store globale). Le sezioni
ricevono un `ExpenseStore` e non sanno quale archivio c'è dietro.

- `src/domain/`: regole pure, senza dipendenze UI/SDK, compilate anche nel backend.
  `policy.ts` (limiti condivisi, `todayInRome`), `expense.ts` (bozza, parsing importi,
  validazione), `contract.ts` (validazione runtime di richieste, conferme, elenchi e
  record: ogni dato non fidato passa da qui), `category.ts` (normalizzazione, unicità
  nomi, predefinite, ID icone), `recurrence.ts` (date delle occorrenze), `history.ts`
  (occorrenze, ricerca, ordinamento, periodi e aggregazione per la dashboard),
  `submission.ts` (reducer degli stati d'invio e classificazione degli errori).
- `src/features/expenses/`: modulo «Nuova spesa» (`ExpenseFields`, `CategoryPicker`,
  `RecurrencePicker`), interfaccia `ExpenseStore` e i due archivi `useLocalExpenses` /
  `useRemoteExpenses` (entrambi passano da `submissionReducer`).
- `src/features/session/`: `useSession` (Firebase Auth) e schermata `SignIn`.
- `src/features/workspace/`: `LocalWorkspace`, `RemoteWorkspace` (montato con
  `key` = UID: uscire o cambiare account scarta tutto lo stato) e sezioni.
- `src/features/history/`: elenco ricercabile e ordinabile («Spese»; cestino solo in locale).
- `src/features/dashboard/`: dashboard e grafici SVG inline (`charts.tsx`, solo web).
- `src/features/categories/`: sezione «Categorie», `IconPicker` e hook `useCategories`
  (categorie sempre in `localStorage`, anche con il backend).
- `src/services/`: `backendConfig.ts` (modalità e config web pubblica), `firebase.ts`
  (unico punto che usa l'SDK: sessione e callable, risposte validate), adapter
  `localStorage` (`categoryStorage.ts`, `expenseStorage.ts`) che validano i dati letti
  e rileggono prima di ogni scrittura.
- `functions/`: pacchetto npm separato (Cloud Functions v2, ESM, compilato con `tsc` in
  `functions/lib/`). `src/index.ts` (callable `submitExpense`/`listExpenses`, parametri,
  wiring), `expenses.ts` (servizio applicativo puro), `ports.ts` (`Ledger`, `Sheet`),
  `firestoreLedger.ts` (transazione + finto foglio per gli emulatori), `googleSheet.ts`
  (REST Sheets con `fetch`), `sheetRow.ts` (colonne A–J), `authorize.ts`.
  Il servizio e il mapping non importano SDK: si testano con i fake in `functions/tests/`.
- `firebase.json`, `firestore.rules` (nega tutto ai client), `emulator-seed/` (account
  di prova), `functions/.env.demo-nummo` (parametri solo demo, versionato),
  `functions/.env.nummo-6b6e2` (parametri del progetto reale: `ALLOWED_UID`,
  `SHEET_ID=emulator`; non versionato).
- `src/components/`: componenti UI condivisi. Non c'è una libreria di icone: le icone
  di interfaccia sono SVG inline (`SvgIcon` + `iconShapes`); quelle delle categorie sono
  sprite pixel art 12×12 in `pixelIcons.ts` (dati puri, testati), resi da `PixelIcon`
  (che aggiunge da solo l'alone chiaro nel tema scuro: non disegnare sprite fuori da lì).
  Aggiungere un'icona = sprite + voce in `categoryIconLabels` (`src/domain/category.ts`).
  `DeleteAction`: cestino + conferma, da riusare per ogni eliminazione. `ChoiceChips`:
  stile unico per le scelte singole (pieno nel colore primario, senza spunta).
- `tests/`: test di dominio e storage con il runner integrato di Node;
  `tests/emulator/backend.e2e.ts`: test d'integrazione eseguito dentro gli emulatori.
- `public/index.html`: documento HTML web in italiano. `dist/`: export generato, ignorato da Git.

## Stack
TypeScript strict (`noUncheckedIndexedAccess`), Expo SDK 58 (solo piattaforma web,
bundler Metro), React 19.3, React Native 0.88 + React Native Web, React Native Paper 5.
Firebase JS SDK 13 (web: `app`, `auth`, `functions`); backend con `firebase-functions` 7,
`firebase-admin` 14, `google-auth-library` 11, TypeScript 6 (runtime dichiarato Node 22).
`firebase-tools` (dev) per gli emulatori, richiede Java 11+.
Nessuna libreria di test esterna. Versioni fissate da `package-lock.json` e
`functions/package-lock.json`.

## Comandi
Node `^22.18 || ^24.3 || ^26` (preferire LTS), npm, lockfile versionato.
- `npm ci && npm ci --prefix functions`: installazione (npm 12 blocca gli script di
  installazione; gli emulatori funzionano comunque).
- `npm run dev`: anteprima web solo browser su localhost (Expo).
- `npm run emulators` (terminale 1) + `npm run dev:emulator` (terminale 2): app con
  login simulato e backend locale; UI emulatori su 127.0.0.1:4000. Porte: Auth 9099,
  Functions 5001, Firestore 8180 (8080 era occupata). Se 8081 è occupata:
  `EXPO_PUBLIC_NUMMO_BACKEND=emulator npx expo start --web --port 8082`.
- `npm run emulators:real` (terminale 1) + `npm run dev:firebase` (terminale 2): login
  Google reale, backend locale. Usa le stesse porte della modalità demo: una alla volta.
- `npm run typecheck`, `npm test`, `npm run build` (export web in `dist/`).
- `npm run check`: typecheck, test app, controlli di `functions/` e build, con arresto
  al primo errore.
- `npm run test:emulator`: compila le funzioni e verifica il backend negli emulatori
  (non incluso in `check`: richiede Java e porte libere).
- `npm run test:emulator:real`: progetto reale senza emulatore Auth; verifica che token
  mancanti o falsificati siano rifiutati dal backend.
- Con le porte occupate (es. emulatori dell'utente aperti): copia temporanea di
  `firebase.json` **nella radice** con porte diverse, `--config <file>`, e `AUTH_PORT` /
  `FUNCTIONS_PORT` per gli script di test; cancellarla dopo.

I test girano in-process (`--experimental-test-isolation=none`) con
`--experimental-strip-types`: per questo gli import nei file di dominio e in
`functions/src` usano l'estensione `.ts` (riscritta in `.js` da `tsc`). Niente sintassi
TypeScript non cancellabile (es. proprietà nei parametri del costruttore, `enum`).
Metro a volte non rileva modifiche fatte da script: se il bundle è vecchio, riavviare
con `--clear`.

## Convenzioni
- Accessibilità: usare `role`/`aria-*` (`aria-checked`, `aria-selected`, `aria-disabled`).
  React Native Web 0.21 **ignora `accessibilityState`**: lo stato non arriva al DOM.
- Material 3: componenti personalizzati quando Paper non rende lo stile M3 sul web
  (es. `M3Switch`, `ChoiceChips`); riusarli invece di introdurne di nuovi.
- Grafici e colori dei dati: seguire la skill dataviz (palette categoriale in ordine fisso,
  validata col suo script; legenda e tabella; colore legato alla categoria).
- Nomi del codice in inglese; interfaccia e documentazione in italiano.
- Importi interi in centesimi, nessun arrotondamento implicito; data spesa in Europe/Rome,
  timestamp backend in UTC. Data vuota nella bozza = oggi al momento della validazione.
  Limiti solo in `src/domain/policy.ts`.
- Nessun invio in render/effect. Conferma solo da esito applicativo verificato con `expense_id`.
- Solo `unauthenticated`/`permission-denied`/`invalid-argument`/`already-exists` sono
  rifiuti definitivi; ogni altro errore del backend è esito incerto (`isDefinitiveRejection`).
- Il backend non scrive mai in append: solo sulla riga riservata dal ledger.
- Retry con stesso ID e payload immutabile; timeout = esito incerto, non rifiuto.
- Il client non decide identità, registro o permessi. Non memorizzare token manualmente.
- Il backend verifica sempre l'ID token con `firebase-admin` (`requireOwner`): l'emulatore
  delle Functions li decodifica soltanto (`skipTokenVerification`). Non rimuovere.
- Il finto foglio (`SHEET_ID=emulator`) esiste solo negli emulatori; non usarlo altrove.
- Campi in sola lettura: React Native Paper blocca i `TextInput` con `readonly`, non
  `disabled` (rilevante per test nel browser).
- Note scritte come testo (Sheets `valueInputOption: RAW`), mai come formule.
- Storage illeggibile o negato: nessun falso successo, nessuna sovrascrittura.

## Regole per gli agenti
- Niente segreti, `.env` reali, deployment, fatturazione o servizi aggiuntivi senza autorizzazione.
- Non usare `npm audit fix --force` (retrocede Expo).
- Una fase alla volta; non anticipare funzioni fuori dal MVP (es. OCR, Google Pay) senza
  richiesta esplicita dell'utente. Dashboard e ricorrenze sono già implementate su sua richiesta.
- Eseguire `npm run check` prima di dichiarare un lavoro concluso.
- Testare comportamento e rischi reali; distinguere test locali da prove effettive su Sheets.
- A fine fase aggiornare `HANDOFF.md`; aggiornare questo file solo se cambiano
  architettura, strumenti o convenzioni; le decisioni vanno in `docs/architecture.md`.
