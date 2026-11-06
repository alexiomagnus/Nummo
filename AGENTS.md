# Nummo — istruzioni per gli agenti

Gestionale personale di spese, Expo web + Firebase personale configurabile (BYOF).
Firestore è l'unica fonte di verità. Stato operativo: `HANDOFF.md`.

## Fonti e precedenze

- Richiesta BYOF del 2 novembre 2026 recepita in `docs/architecture.md` e
  `docs/migrazione-byof.md`: sostituisce Sheets come archivio e il backend callable,
  rimosso il 2 novembre 2026 (recuperabile dalla cronologia Git, commit `fe759d5`).
- `recap.md`: specifica originale v0.4, da leggere integralmente prima di modifiche
  funzionali e da non modificare. Storico delle decisioni, non architettura corrente.
- `docs/firebase-personale.md`: guida operativa per chi clona il repository.
- `docs/progress.md`: registro storico; verificare sempre codice ed esecuzione.

## Architettura effettiva

`index.ts` → `App.tsx` (tema da `src/theme/`, sessione) → `AppShell` adattivo →
`RemoteWorkspace` (key UID), sezioni Nuova · Spese · Dashboard · Categorie. Stato React locale, niente router/store globale.
Navigazione: 3 destinazioni (Spese, Dashboard, Categorie) + «Nuova spesa» come azione primaria (FAB), mai due navigazioni.

- `src/domain/`: funzioni pure senza SDK. `policy.ts`, `expense.ts`, `contract.ts`,
  `category.ts`, `recurrence.ts`, `pricing.ts` (piano prezzi per numero di rinnovo),
  `history.ts`, `submission.ts` riutilizzati;
  `firestore.ts` valida i record sincronizzati e genera le chiavi nome categoria;
  `backup.ts` valida le importazioni, genera JSON e CSV protetto da formule.
- `src/services/backendConfig.ts`: modalità (`emulator|hybrid|cloud`) e env pubbliche a build, niente segreti;
  configurazioni miste → `missingFirebaseConfig` (l'app non avvia la sessione).
  `firebase.ts`: Auth e inizializzazione Firestore/cache; `firestoreStore.ts`: listener,
  CRUD, transazioni con revisioni, esportazioni server-only e importazioni in gruppi.
- `src/features/session/`: login Google popup, sessione SDK, logout con attesa delle
  scritture pendenti; `Guide.tsx`: guida pubblica statica («Cos'è Nummo e come funziona?»), aperta da `SignIn`
  su `#guida` (history, link diretto e ricarica; nessuna richiesta Firebase, nessun router). Testo da aggiornare quando
  cambiano le funzioni descritte; non presentare l'app come aperta a registrazioni. UI/errori account e stato smontati al cambio UID.
- `src/features/expenses/`: modulo/validazione, `ExpenseStore`, `useRemoteExpenses`,
  `ExpenseEditor`. Nessun hook di spese locali nel percorso attivo.
- `src/features/categories/`: `useRemoteCategories`, impostazioni, icone. ID stabili,
  unicità nomi tramite transazioni e indice `categoryNames`. Predefinite aggiunte da
  azione esplicita. Nessun salvataggio in localStorage.
- `src/features/settings/`: preferenze di aspetto (`preferences.ts` puro, `usePreferences`
  su localStorage, `SettingsDialog` aperto dal menu account). `src/theme/palette.ts` genera
  gli schemi da tinta e modalità; `createTheme` li riceve da `App.tsx` e aggiunge `colors.panel`
  (pannello pagine, `panelColor()`; su smartphone il pannello non c'è).
- `src/features/history/`, `dashboard/`: logica/grafici esistenti; occorrenze calcolate
  fino a oggi, non materializzate nel database. Grafici SVG DOM, solo web.
- `src/features/backup/`: download CSV/JSON e importazione esplicita da file JSON.
  Gli adapter localStorage per i vecchi dati del browser sono stati rimossi (5 nov 2026).
- `firestore.rules`: proprietario da `config/owner` (solo amministratore), provider
  Google, namespace `users/{uid}`, campi/tipi/importi/date/versioni/indici verificati.
  `users/{uid}/expenses/{uuid}` e `categories/{uuid}` contengono le entità.
- `scripts/`: seed demo e configurazione proprietario (solo emulatore localhost); `check-dev-env.ts`,
  `build-cloud.ts`, `envPolicy.ts` (ambienti), `deploy-hosting.ts` (pubblicazione solo Hosting).
- `public/`: copiato in `dist/` dall'export: `index.html` (modello HTML con manifest/icone), `manifest.webmanifest`,
  `icons/` (PNG 192/512, maskable, apple-touch, SVG: segno «n» su `#0F1512`), `fonts/`.
- `firebase.json`: `firestore` (Rules), `hosting` (`dist/`, fallback SPA su `/index.html`, cache lunga solo per
  `/_expo/static/**`, `no-cache` per HTML/manifest, senza COOP/COEP: romperebbero il popup Google) ed `emulators`.
- `emulator-data/`: dati persistenti dell'emulatore personale (`emulators:real`),
  dati personali ignorati da Git. `emulator-seed/`: account Auth della demo.
- `functions/` può contenere solo `.env` personali ignorati del vecchio backend: non
  versionarli né cancellarli senza conferma.
- `docs/design/logo-concepts/`: proposte di logo SVG (non integrate nell'app).
- `tests/`: Node runner per dominio/tema/preferenze/backup/config/policy ambienti (`scripts/envPolicy.ts`); `tests/emulator/firestore.e2e.ts`
  per SDK e Rules. `dist/` (build cloud) e `dist-demo/` sono generati e ignorati.

## Stack e comandi

TypeScript strict/noUncheckedIndexedAccess, Expo 58 solo web/Metro, React 19.3,
RN 0.88, RN Web, Paper 5; Firebase JS SDK 13 (`app`, `auth`, `firestore`).
Nessuna libreria esterna di test. Versioni nei due lockfile; nessuna nuova dipendenza.

Node `^22.18 || ^24.3 || ^26` (preferire LTS), npm; Java necessario per emulatori
(Java 21 verificato). In questo ambiente npm 12 blocca gli script di installazione.

- `npm ci`: app e strumenti.
- Tre ambienti, scelti **solo dai comandi npm** (`EXPO_PUBLIC_NUMMO_BACKEND` = `emulator|hybrid|cloud`,
  nessun default: assente/ignoto/`firebase` è un errore bloccante):
  - `npm run emulators`, `emulators:seed`, poi `npm run dev` (**emulator**): progetto `demo-nummo`, nessuna
    risorsa reale, ignora la config reale. Auth 9099, Firestore 8180, UI 4000; loopback.
  - `npm run dev:hybrid` (**hybrid**): Google reale (config da `.env.local`) + Firestore emulato su
    `127.0.0.1:8180` (override: variabile di shell `EXPO_PUBLIC_FIRESTORE_EMULATOR`). Avviare prima l'emulatore
    Firestore del progetto personale e impostarvi `config/owner` con `npm run emulators:seed:owner -- ID_PROGETTO UID`.
  - `npm run build:cloud` (**cloud**): build di produzione in `dist/`, vedi sotto. Non esiste `dev:cloud`.
- `npm run emulators:personal -- --project ID` è la variante generica (Firestore, import/export in `emulator-data/`).
  `emulators:real` usa l'alias `real` del solo `.firebaserc` locale di questo checkout (non versionato, ignorato). Importa da
  `emulator-data/` e riesporta all'arresto: fermare con un solo Ctrl+C.
- `npm run deploy:hosting`: **l'unico modo previsto di pubblicare**. Ricostruisce con `build:cloud`, ricava il progetto dalle
  stesse variabili della build e lancia `firebase deploy --only hosting --project ID` (mai Rules/indici). `-- --channel nome`:
  anteprima temporanea (7 giorni) senza toccare il sito live; `-- --dry-run`: build e controlli, stampa il comando e non
  pubblica. Non lanciare `firebase deploy` senza `--only hosting` (pubblicherebbe anche `firestore.rules`) e non farlo
  senza autorizzazione. `.firebaserc` non è versionato (ignorato): il repository non ha alcun progetto predefinito, la CLI richiede sempre `--project`.
- `npm run preview:cloud`: serve `dist/` in locale (verifica; usa il progetto reale: non eseguire azioni di scrittura senza autorizzazione).
- `npm run check`: typecheck, test app, `build:demo` (demo in `dist-demo/`, mai da pubblicare).
- `npm run test:emulator`: nuovi test Auth/Firestore; richiede porte libere.
- Porte occupate: config temporanea **nella radice** con porte alternative, `--config`,
  `AUTH_PORT` e `FIRESTORE_PORT` per test/seed. Non fermare gli emulatori dell'utente.
  Per la demo web: `EXPO_PUBLIC_AUTH_EMULATOR` e `EXPO_PUBLIC_FIRESTORE_EMULATOR`;
  eliminare la config temporanea a fine verifica.

Variabili pubbliche: `EXPO_PUBLIC_FIREBASE_*` (4, in `.env.local` per lo sviluppo, in `.env.production.local`
o shell/CI per la produzione; entrambi ignorati da Git; Expo in dev non carica `.env.production.local`). I file `.env*` **non** devono contenere
`EXPO_PUBLIC_NUMMO_BACKEND` né `*_EMULATOR`: `check:env` (eseguito da `dev` e `dev:hybrid`) si ferma, perché in
`expo start` il file vince sulla shell. `EXPO_PUBLIC_FIRESTORE_CACHE=persistent` è opt-in su dispositivi fidati;
altrimenti memoria (cache SDK, mai IndexedDB dell'app). Expo richiede accessi letterali alle env; Metro può
richiedere riavvio `--clear`.

**Build di produzione** (`scripts/build-cloud.ts`, regole pure in `scripts/envPolicy.ts`): disattiva i `.env*` di Expo
(`EXPO_NO_DOTENV=1`, verificato: con `expo export` `.env.local` non entra nel bundle), legge solo
`.env.production.local` + shell (valori in conflitto = errore), imposta `cloud` da sé (un altro valore dichiarato = errore) e richiede le 4 variabili, rifiuta endpoint emulatori, progetto `demo-*` e variabili
`EXPO_PUBLIC_*` sconosciute, poi scansiona il bundle (endpoint locali, chiave demo, presenza dell'ID progetto) e lo
cancella se fallisce. Stampa solo nomi e conteggi. Per test browser isolati senza progetto reale: `build:demo`.
Mai pubblicare `dist-demo/`.

Test in-process con `--experimental-test-isolation=none` e strip-types; import `.ts`
nel dominio/servizi testati direttamente. Non usare enum o parameter properties.

## Convenzioni

- Codice inglese, UI e documentazione italiano. Non riscrivere UI senza necessità.
- Importi in centesimi interi; data civile Europe/Rome, timestamp Firestore server in
  UTC. Data vuota = oggi alla validazione. Limiti client in `policy.ts`, corrispettivi
  in Rules da aggiornare e testare insieme (le Rules non importano TypeScript).
- Dati non fidati validati runtime; archivi corrotti negano modifica/esportazione,
  mai nascondere righe invalide o sovrascriverle silenziosamente.
- Nessun invio in render/effect. SDK gestisce coda/retry. Confermare solo dopo server;
  `hasPendingWrites` non è successo; `fromCache` non equivale a offline.
- Un UUID per creazione. Non reimplementare sincronizzazione/idempotenza con un
  secondo archivio. Modifiche/eliminazioni/categorie online in transazione con la
  revisione vista all'apertura; conflitti espliciti. Salvataggi incerte: verifica in
  lettura, mai nuovo ID automatico. Conservare le copie di recupero visibili.
- Importazione sempre esplicita, originali intatti, preflight più gruppi ripetibili;
  non promettere atomicità dell'intero archivio. Backup server-only, nessun dato privato
  inserito nei log. JSON mantiene originali, CSV neutralizza formule e quota i campi.
- `DeleteAction` per ogni eliminazione; conserva l'azione/versione vista nella conferma.
  `Button` (unico pulsante), `ListRow`/`IconTile` (riga di Spese e Categorie), `ChoiceChips`,
  `M3Switch`, `Card`, `StateLayerPressable` per componenti Material 3 personalizzati.
  Raggi, `inputOutline` (per ogni `TextInput` outlined) e `layout` da `src/theme/tokens.ts`. Font e spessore icone (`typefaces`, `iconStroke`) dai token; font in `public/fonts/`. Colori solo dai token (`src/theme/`, `useTheme()`), niente hex sparsi;
  esiti temporanei con `useSnackbar()`; layout per classe di finestra con `useSizeClass()`.
- Paper `Menu` montato chiuso mette il focus sul proprio anchor (web): mai un `Menu` per riga di una lista
  (la pagina salta all'ultima riga); usare un solo menu con anchor a coordinate, come `ExpenseList`.
  `MenuSelect` per selettori compatti (ordina/filtri), `FieldIcon` per icone decorative dei campi.
- Accessibilità `role`/`aria-*`: RN Web 0.21 ignora `accessibilityState` nel DOM.
  TextInput Paper: `readonly`, non `disabled`, quando si verifica sola lettura.
- Icone UI SVG inline, categorie glifi outline 24×24 in `categoryGlyphs.ts` via
  `CategoryGlyph` (sostituiscono gli sprite pixel-art). Nuova icona = glifo +
  `categoryIconLabels` e Rules.
- Grafici: palette categoriale stabile, legenda e tabella, colore legato alla categoria;
  seguire la skill dataviz se disponibile quando si modificano grafici/palette.
- Web è l'unico target: non promettere persistenza RN nativa, PWA o avvio offline a
  freddo. Distinguere cache dati, disponibilità bundle, login e test su dispositivi.

## Vincoli operativi

Nessun segreto, cancellazione dati, modifica alle credenziali, cloud reale, deployment,
fatturazione o servizio aggiuntivo senza autorizzazione. Niente commit automatici,
`npm audit fix --force`, SQLite, Drive, Sheets o Cloud Functions senza richiesta.

Una fase verificabile alla volta; niente OCR/Google Pay o evoluzioni fuori richiesta.
Prima di dichiarare concluso eseguire `npm run check`; per accesso dati/Rules anche
`test:emulator`. Aggiornare `HANDOFF.md`; decisioni in `docs/architecture.md`; questo
file solo per architettura, strumenti e convenzioni stabili. Separare sempre prove
emulate da verifiche cloud/dispositivi effettivamente eseguite.
