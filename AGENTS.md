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
- Codice e verifiche eseguite descrivono lo stato effettivo; requisiti e registri
  storici non dimostrano implementazione, collaudo o pubblicazione corrente.

## Architettura effettiva

`index.ts` → `App.tsx` (tema da `src/theme/`, sessione) → `AppShell` adattivo →
`RemoteWorkspace` (key UID), sezioni Nuova · Spese · Dashboard · Categorie. Stato React locale, niente router/store globale.
Navigazione: 3 destinazioni (Spese, Dashboard, Categorie) + «Nuova spesa» come azione primaria, mai due navigazioni. Su smartphone: barra flottante in pillola (3 destinazioni uguali, icona + etichetta, attiva su `primaryContainer`) + pulsante tondo «Nuova spesa» in `primary` (nascosto nella sua pagina), nel flusso del layout; rail/drawer con FAB.

- `src/domain/`: funzioni pure senza SDK. `policy.ts`, `expense.ts`, `contract.ts`,
  `category.ts`, `recurrence.ts`, `pricing.ts` (piano prezzi per numero di rinnovo),
  `history.ts`, `submission.ts` riutilizzati;
  `firestore.ts` valida i record sincronizzati e genera le chiavi nome categoria;
  `backup.ts`: JSON di backup versionato (`makeBackup`/`parseBackup`, un lettore per versione), piano di importazione
  (`planImport`: aggiunte, identici, conflitti, sostituzioni) e CSV delle transazioni (`exportCsv`, sola consultazione).
- `src/services/backendConfig.ts`: modalità (`emulator|hybrid|cloud`) e env pubbliche a build, niente segreti;
  configurazioni miste → `missingFirebaseConfig` (l'app non avvia la sessione).
  `firebase.ts`: Auth e inizializzazione Firestore/cache; `firestoreStore.ts`: listener,
  CRUD, transazioni con revisioni, esportazioni server-only e importazioni in gruppi.
- `src/features/session/`: login Google popup, sessione SDK, logout con attesa delle
  scritture pendenti; `Guide.tsx`: guida pubblica statica («Cos'è Nummo e come funziona?»), aperta da `SignIn`
  su `#guida` (history, link diretto e ricarica; nessuna richiesta Firebase, nessun router). Testo da aggiornare quando
  cambiano le funzioni descritte; non presentare l'app come aperta a registrazioni. UI/errori account e stato smontati al cambio UID.
  `signInError.ts` mostra solo codici `auth/...` validati (mai messaggi grezzi/token); `src/services/sessionProfile.ts`
  sceglie la foto account (Google prima del generico Firebase, stringhe vuote ignorate).
- `src/features/expenses/`: modulo/validazione, `ExpenseStore`, `useRemoteExpenses`,
  `ExpenseEditor`. Nessun hook di spese locali nel percorso attivo.
- `src/features/categories/`: `useRemoteCategories`, impostazioni, icone. ID stabili,
  unicità nomi tramite transazioni e indice `categoryNames`. Predefinite aggiunte da
  azione esplicita. Modifica di nome e icona in `CategoryEditor` (`AppDialog`, una transazione);
  creazione/eliminazione nella pagina. Limite applicativo di 10 categorie (non imposto dalle Rules);
  gli archivi esistenti oltre limite restano leggibili. Nessun salvataggio in localStorage.
- `src/features/settings/`: preferenze di aspetto e lingua (`preferences.ts` puro, `usePreferences`
  su localStorage, `SettingsDialog` dal menu account o dall'ingranaggio prima del login). `src/theme/palette.ts` genera
  gli schemi da tinta e modalità; `createTheme` li riceve da `App.tsx` e aggiunge `colors.panel`
  (pannello pagine, `panelColor()`; su smartphone il pannello non c'è).
- `src/i18n/`: italiano/inglese tramite `I18nProvider` e `useI18n()`, catalogo `en.ts`
  con messaggi sorgente italiani, traduzione e formattazione pure in `translate.ts`.
  Lingua iniziale `it`, salvata in `nummo.preferences.v1`, solo nel browser; nessuna
  sincronizzazione Firebase. Il provider cambia valore senza rimontare sessione o bozze.
- `src/features/history/`, `dashboard/`: logica/grafici esistenti; occorrenze calcolate
  fino a oggi, non materializzate nel database. Ciambella SVG DOM, blocchi con layout
  treemap puro e dettaglio giornaliero da occorrenze già caricate; solo web.
- `src/features/backup/`: «Esporta transazioni (CSV)» solo per consultare (mai importabile); «Scarica backup (JSON)» e
  «Importa backup (JSON)» sono l'unico ripristino. Riepilogo prima della conferma; unione bloccata dai conflitti
  (stesso ID o nome con contenuto diverso), sostituzione distruttiva con conferma e copia automatica dei dati attuali.
  Entrambe per gruppi, non atomiche sull'intero archivio. Nessun import CSV né adapter per vecchi dati localStorage.
- `src/components/`: controlli Material 3 condivisi, shell adattiva, icone e notifiche;
  `src/features/workspace/`: composizione delle sezioni, listener e stato di sincronizzazione.
  All'apertura la pagina attende i primi dati (spinner; modulo montato e invisibile per conservare misure e bozza),
  rilasciata da dati pronti, errore o 4 s: mai un blocco permanente.
- `firestore.rules`: proprietario da `config/owner` (solo amministratore), provider
  Google, namespace `users/{uid}`, campi/tipi/importi/date/versioni/indici verificati.
  `users/{uid}/expenses/{uuid}` e `categories/{uuid}` contengono le entità.
- `scripts/`: seed demo e configurazione proprietario (solo emulatore localhost); `check-dev-env.ts`,
  `dev-hybrid.ts`/`hybridRunner.ts` (avvio, riuso verificato e arresto dei servizi hybrid),
  `check-hybrid.ts`/`hybridPreflight.ts` (raggiungibilità locale),
  `build-cloud.ts`, `envPolicy.ts` (ambienti), `deploy-hosting.ts` (pubblicazione solo Hosting).
- `public/`: copiato dall'export: modello `index.html`, manifest con colori statici e neutri (`#121212`: la splash di Android non segue accento/tema scelti),
  icone PNG/SVG (anche maskable e apple-touch), font locali. `GlobalStyle` aggiorna
  `theme-color` su `colors.background` e l'altezza visibile tramite `viewport.ts`
  (VisualViewport, senza reflow durante pinch zoom); CSS iniziale in `index.html`.
  Nessun service worker.
- `firebase.json`: `firestore` (Rules), `hosting` (`dist/`, fallback SPA su `/index.html`, cache lunga solo per
  `/_expo/static/**`, `no-cache` per HTML/manifest, senza COOP/COEP: romperebbero il popup Google) ed `emulators`.
- `emulator-data/`: dati persistenti dell'emulatore personale (`emulators:real`),
  dati personali ignorati da Git. `emulator-seed/`: account Auth della demo.
- `functions/` può contenere solo `.env` personali ignorati del vecchio backend: non
  versionarli né cancellarli senza conferma.
- `docs/design/logo-concepts/`: studi SVG separati dal logo già usato dall'app;
  non integrarli senza una richiesta esplicita.
- `tests/`: Node runner per dominio/tema/preferenze/backup/config/policy ambienti (`scripts/envPolicy.ts`); `tests/emulator/firestore.e2e.ts`
  per SDK e Rules. `dist/` (build cloud) e `dist-demo/` sono generati e ignorati.

## Stack e comandi

TypeScript strict/noUncheckedIndexedAccess, Expo 58 solo web/Metro, React 19.3,
RN 0.88, RN Web, Paper 5; Firebase JS SDK 13 (`app`, `auth`, `firestore`).
TypeScript 6 e Firebase CLI 15 per gli strumenti; nessuna libreria esterna di test.
Versioni risolte in `package-lock.json`; non aggiungere dipendenze senza richiesta.

Node `^22.18 || ^24.3 || ^26` (preferire LTS), npm; Java necessario per emulatori.
Ambiente effettivamente provato e risultati correnti: `HANDOFF.md`.

- `npm ci`: installazione da lockfile di app e strumenti; stato della prova da clone pulito in `HANDOFF.md`.
- Tre ambienti, scelti **solo dai comandi npm** (`EXPO_PUBLIC_NUMMO_BACKEND` = `emulator|hybrid|cloud`,
  nessun default: assente/ignoto/`firebase` è un errore bloccante):
  - `npm run emulators`, `emulators:seed`, poi `npm run dev:demo` (**emulator**): progetto `demo-nummo`, nessuna
    risorsa reale, ignora la config reale. Auth 9099, Firestore 8180, UI 4000; loopback.
  - `npm run dev` (**hybrid**): Google reale (config da `.env.local`) + Firestore emulato su
    `127.0.0.1:8180` (override di shell `EXPO_PUBLIC_FIRESTORE_EMULATOR`, solo `localhost`/`127.0.0.1`).
    Avvia Firestore con import da `emulator-data/` o riusa un'istanza identificata dal locator Hub del
    progetto effettivo, PID e endpoint; poi attende una risposta Firestore prima di avviare Expo.
    Configurazione sviluppo letta dal parser già incluso in Expo e passata identica ai due processi;
    nessun alias `.firebaserc` necessario. `config/owner` locale va predisposto una volta tramite
    `npm run emulators:seed:owner -- ID_PROGETTO UID`; il comando non inventa UID né modifica il cloud.
    Ctrl+C arresta solo i processi avviati dal runner. Export in staging e promozione dopo successo;
    copia precedente in `.firebase/hybrid-*/previous`, lock `.firebase/hybrid.lock` contro gestioni concorrenti.
    Export fallito/interruzione forzata: preservare staging e originali, controllare prima di rimuovere il lock.
    `check:hybrid` resta un controllo TCP manuale: non avvia servizi né certifica progetto/Rules/proprietario.
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
- `npm run test:emulator`: test SDK Auth/Firestore e Rules; avvia e arresta emulatori demo, richiede porte libere.
- `npm run test:hybrid`: ciclo di vita del runner con Firestore demo reale, porte/dati temporanei
  ed Expo simulato (avvio, riuso, segnali, persistenza e guasti); richiede Java e porte locali.
- Porte occupate: config temporanea **nella radice** con porte alternative, `--config`,
  `AUTH_PORT` e `FIRESTORE_PORT` per test/seed. Non fermare gli emulatori dell'utente.
  Per la demo web: `EXPO_PUBLIC_AUTH_EMULATOR` e `EXPO_PUBLIC_FIRESTORE_EMULATOR`;
  eliminare la config temporanea a fine verifica.

Variabili pubbliche: `EXPO_PUBLIC_FIREBASE_*` (4, in `.env.local` per lo sviluppo, in `.env.production.local`
o shell/CI per la produzione; entrambi ignorati da Git; Expo in dev non carica `.env.production.local`). I file `.env*` **non** devono contenere
`EXPO_PUBLIC_NUMMO_BACKEND` né `*_EMULATOR`: `check:env` (eseguito da `dev:demo` e `dev`) si ferma, perché in
`expo start` il file vince sulla shell. `EXPO_PUBLIC_FIRESTORE_CACHE=persistent` è opt-in su dispositivi fidati;
altrimenti memoria (cache SDK, mai IndexedDB dell'app). Expo richiede accessi letterali alle env; Metro può
richiedere riavvio con `npm run dev:demo -- --clear` o `npm run dev -- --clear`.

**Build di produzione** (`scripts/build-cloud.ts`, regole pure in `scripts/envPolicy.ts`): disattiva i `.env*` di Expo
(`EXPO_NO_DOTENV=1`, verificato: con `expo export` `.env.local` non entra nel bundle), legge solo
`.env.production.local` + shell (valori in conflitto = errore), imposta `cloud` da sé (un altro valore dichiarato = errore) e richiede le 4 variabili, rifiuta endpoint emulatori, progetto `demo-*` e variabili
`EXPO_PUBLIC_*` sconosciute, poi scansiona il bundle (endpoint locali, chiave demo, presenza dell'ID progetto) e lo
cancella se fallisce. Stampa solo nomi e conteggi. Per test browser isolati senza progetto reale: `build:demo`.
Mai pubblicare `dist-demo/`.

Test in-process con `--experimental-test-isolation=none` e strip-types; import `.ts`
nel dominio/servizi testati direttamente. Non usare enum o parameter properties.

## Convenzioni

- Codice inglese, documentazione italiano, **UI italiano e inglese**. Per ogni nuovo
  testo, errore, guida o etichetta accessibile usare `useI18n().t('testo italiano')`
  e aggiungere la traduzione in `src/i18n/en.ts`; interpolare con `{p0}`, `{p1}`, ecc.
  I messaggi di dominio/servizi restano puri e si traducono al confine UI; conservarli
  nella lingua sorgente nello stato. Niente stato globale mutabile per la lingua.
  Usare `formatAmount`/`formatDate` del contesto o `locale` per `Intl` nella UI.
  Non tradurre descrizioni, nomi di categorie già salvati, ID o campi dei backup;
  solo le categorie predefinite appena create assumono la lingua corrente.
  Valuta EUR, date civili Europe/Rome, calcoli e formato CSV/JSON restano invariati.
  Nei grafici tradurre solo serie sintetiche tramite `seriesLabel`, mai nomi utente.
  Estendere `tests/i18n.test.ts` per nuovi casi; verificare entrambe le lingue,
  persistenza della scelta e conservazione delle bozze. Non riscrivere UI senza necessità.
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
- Importazione sempre esplicita, file originali intatti, preflight completo (file + dati del server) prima della prima
  scrittura, poi gruppi ripetibili; elementi identici saltati, mai riscritti. L'unione non sovrascrive; la sostituzione
  elimina solo ciò che differisce dal file e richiede conferma. Non promettere atomicità dell'intero archivio.
  Backup server-only, nessun dato privato inserito nei log. JSON: solo dati di ripristino (niente UID/progetto, revisioni,
  `updated_at`, `name_key`), ordinato e deterministico; nuova forma → nuovo `backupVersion` + lettore in `readers`.
  CSV: intestazioni italiane, `;` come separatore, virgola decimale, BOM, una riga per occorrenza fino a oggi,
  testi con formule neutralizzati dall'apostrofo e sempre quotati.
- `DeleteAction` per ogni eliminazione; conserva l'azione/versione vista nella conferma.
  `AppDialog` per tutti i dialoghi: superficie dedicata, contorno, limiti viewport/safe area;
  contenuti lunghi in `ScrollArea` + `ScrollView`, azioni esterne all'area scorrevole.
  `Button` (unico pulsante), `ListRow`/`IconTile` (riga di Spese e Categorie), `ChoiceChips`,
  `SegmentedButtons`, `SwitchRow`/`M3Switch`, `SelectField` (menu a tendina), `DateField` (picker modale), `Card`,
  `StateLayerPressable` per componenti Material 3 personalizzati.
  Raggi (`radius`: controlli 20, campi/card 16, dialog 28, `pill`), `inputOutline` (per ogni `TextInput` outlined) e `layout` da `src/theme/tokens.ts`. Font e spessore icone (`typefaces`, `iconStroke`) dai token; font in `public/fonts/`. Colori solo dai token (`src/theme/`, `useTheme()`), niente hex sparsi;
  esiti temporanei con `useSnackbar()`; layout per classe di finestra con `useSizeClass()`.
- Paper `Menu` montato chiuso mette il focus sul proprio anchor (web): mai un `Menu` per riga di una lista
  (la pagina salta all'ultima riga); usare un solo menu con anchor a coordinate, come `ExpenseList`.
  `MenuSelect` per selettori compatti (ordina/filtri), `FieldIcon` per icone decorative dei campi.
  Nei campi-azione (`SelectField`, `DateField`) il `Pressable` esterno è l'unico
  bersaglio: input e icone decorativi in un contenitore DOM `inert`. Il solo
  `pointerEvents="none"` sul contenitore non neutralizza le Surface Paper interne.
- Accessibilità `role`/`aria-*`: RN Web 0.21 ignora `accessibilityState` nel DOM.
  TextInput Paper: `readonly`, non `disabled`, quando si verifica sola lettura.
- Icone UI SVG inline, categorie glifi outline 24×24 in `categoryGlyphs.ts` via
  `CategoryGlyph`. Aggiornare insieme glifi, `categoryIconLabels` e Rules;
  prima di rimuovere un identificativo valutare compatibilità di record e backup esistenti.
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
