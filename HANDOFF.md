# HANDOFF — stato operativo

Aggiornamento: 2 novembre 2026. Backend e login reale descritti sotto sono nel ramo
`backend-firebase` (commit «Backend Firebase locale con login Google reale», da unire a
`main` dopo la revisione); base: `038c652` «new implementations» su `main`. Commit precedente rilevante: `611f4aa` (rinomina in Nummo, categorie
predefinite). Contesto stabile in `AGENTS.md`; progetto del backend in
`docs/architecture.md` § Backend.

## Fase corrente
**Fase 2 — prova tecnica, primo incremento completato negli emulatori**: login Google
(simulato), callable autenticata, ledger Firestore con riga fissa, scrittura idempotente,
elenco riletto dal backend dopo il ricaricamento. In più, **login Google reale** con il
progetto Firebase `nummo-6b6e2` (solo Authentication) e backend locale. Nessun deployment,
nessuna scrittura su Google Sheets reale. Fase 1 (base locale, estesa con ricorrenze, elenco e
dashboard su richiesta dell'utente) resta disponibile come modalità «solo browser».
Poi 3 MVP PWA e 4 passaggio dal vecchio Form (`docs/progress.md`). Nessuna attività in corso.

## Implementato (stato del codice)
Tre modalità, scelte in build con `EXPO_PUBLIC_NUMMO_BACKEND`:
- **Solo browser** (default, `npm run dev`): come in fase 1, spese in `localStorage`.
- **Emulatori** (`npm run emulators` + `npm run dev:emulator`): schermata «Accedi con
  Google» (popup dell'emulatore con due account: «Proprietario (demo)» ammesso, «Estraneo
  (demo)» no); email e «Esci» in alto; spese salvate tramite `submitExpense` e rilette
  con `listExpenses`; nessun cestino (eliminazione fuori MVP). Il finto foglio è in
  Firestore (`emulator_sheet_rows`, visibile nella UI emulatori su 127.0.0.1:4000) e si
  azzera a ogni riavvio degli emulatori.
- **Auth reale + backend locale** (`npm run emulators:real` + `npm run dev:firebase`):
  config web in `.env.local` (non versionato, modello `.env.example`), Functions e
  Firestore negli emulatori con progetto `nummo-6b6e2`, parametri in
  `functions/.env.nummo-6b6e2` (non versionato). **`ALLOWED_UID` è ancora il segnaposto
  `da-impostare`**: finché l'utente non inserisce il proprio UID nessun account è
  autorizzato (messaggio «Questo account non è autorizzato…»).
- **Functions pubblicate**: `dev:firebase` senza `EXPO_PUBLIC_FUNCTIONS_EMULATOR`;
  nessuna funzione è pubblicata, quindi oggi non funziona.

Stati d'invio nel modulo (entrambe le modalità, `submissionReducer`): «Salvataggio…» con
campi bloccati; conferma → modulo svuotato e «Spesa salvata.»; esito incerto → campi
bloccati, messaggio e «Riprova» con stesso ID e dati; rifiuto definitivo → messaggio,
campi modificabili, nuovo invio con nuovo ID. Account non ammesso: «Questo account non è
autorizzato ad accedere al registro.», modulo disattivato.

Backend (`functions/`): verifica esplicita dell'ID token (`verifyIdToken`, perché
l'emulatore la salta), validazione runtime condivisa (`src/domain/contract.ts`),
autorizzazione di un solo UID con accesso Google, transazione Firestore che assegna la
riga, scrittura RAW verificata, nessuna sovrascrittura se la riga contiene un altro ID,
errori imprevisti → `unavailable` (esito incerto). Adapter REST Google Sheets con
credenziali dell'account di servizio della funzione (nessuna chiave nel codice).

Quattro sezioni (`src/features/workspace/Workspace.tsx`): **Nuova · Spese · Dashboard · Categorie**.
- **Nuova**: importo (font 20, virgola o punto, max 2 decimali, 0,01–99.999,99 €),
  nome dell'acquisto (obbligatorio, max 100 punti di codice), categoria facoltativa
  (chip pieni nel colore primario, senza spunta; secondo tocco deseleziona), riga
  «Ripeti questa spesa» con interruttore Material 3 (`M3Switch`: binario 52×32, maniglia
  16→24 px con spunta) che mostra tre riquadri Settimanale/Mensile/Annuale (solo il nome). Errori brevi
  («Inserisci l'importo.», «Importo non valido (es. 12,50).»); un campo lasciato vuoto non
  è segnalato all'uscita ma solo al salvataggio. Data sempre
  oggi (Europe/Rome) risolta al salvataggio. Una nota sotto il pulsante dichiara dove
  finiscono le spese (browser, emulatori o Sheets).
- **Ricorrenze**: una spesa con `recurrence` è una serie che parte da `expense_date`;
  elenco e dashboard la contano una volta per scadenza fino a oggi (`expandOccurrences`,
  mesi corti: 31 → 30/28, 29 feb → 28). Le occorrenze sono calcolate, non salvate.
- **Spese**: elenco delle occorrenze con ricerca per nome (senza maiuscole/accenti),
  ordinamento per data o importo (crescente/decrescente), conteggio e totale dei risultati,
  eliminazione con cestino + conferma (solo in modalità browser; su una ricorrente
  elimina l'intera serie).
- **Dashboard**: grafico scelto al momento fra Ciambella (per categoria), Andamento
  (area del totale) e Barre impilate (per categoria e periodo); periodo Questo mese
  (giorni) / Ultimi 6 mesi / Ultimi 12 mesi; totale in evidenza, dettaglio a hover/tocco,
  legenda con importi e %, vista tabella. SVG inline, nessuna libreria di grafici.
- **Categorie**: creazione, rinomina (matita → campo in linea, Salva/Annulla; ID e icona
  invariati, quindi le spese restano collegate), eliminazione, icona pixel art facoltativa
  (22 sprite 12×12; nel tema scuro con un alone chiaro di 1 px, perché il contorno quasi
  nero sparirebbe sullo sfondo). Predefinite, solo per un browser senza categorie salvate:
  Spesa (carrello), Ristorazione (pasta), Uscita (popcorn), Shopping (maglietta).
  I browser con le vecchie predefinite («Spesa alimentare», «Shopping online», senza icone)
  **non vengono migrati**: si correggono con rinomina e icona. Nomi unici, max 40.
- Marchio con logo «N» e «Nummo» grande; tema chiaro/scuro.

## Decisioni significative (dettaglio in `docs/architecture.md`)
- Stack TypeScript + Expo + RN Web + Paper; backend Firebase Auth + Cloud Functions.
  Uso personale, registro condiviso con l'account di servizio della funzione.
- **Protocollo di scrittura (confermato dall'utente il 2/11/2026)**: ledger Firestore
  che riserva in transazione una riga fissa per `expense_id` (con hash del payload);
  scrittura sempre su quella riga, mai append; conferma solo dopo la scrittura
  verificata. Motivo: la sola coppia ricerca+append in Sheets non regge richieste
  concorrenti; Firestore come archivio principale avrebbe cambiato due requisiti.
- **Login reale, backend locale (richiesta utente)**: Firebase Auth del progetto reale,
  Functions/Firestore negli emulatori, nessun deployment. Modalità separate: la demo
  ignora la config reale; mancando una variabile la modalità reale mostra un avviso.
- **Verifica negli emulatori (confermata dall'utente)**: nessun progetto, foglio o
  credenziale disponibili; Sheets sostituito da un finto foglio ammesso solo lì.
- Scelte dell'agente da confermare: regione `europe-west1`, `maxInstances: 2`,
  sessione `browserLocalPersistence`, colonne A–J della scheda «Spese», UID ammesso
  come unico criterio (più provider `google.com`).
- **Modalità solo browser mantenuta** come default, per non rompere l'uso attuale
  senza backend; i dati del browser **non** vengono mai caricati sul registro in
  automatico.
- La ricorrenza è un attributo della spesa (richiesta utente: «nella home»), non più una
  sezione; le occorrenze future non contano come spese.
- Nome dell'acquisto obbligatorio (scelta dell'agente, da confermare); sostituisce la nota.
- Grafici: palette categoriale di riferimento della skill dataviz in ordine fisso, colore
  legato alla posizione della categoria nell'elenco (non alla classifica); dalla 8ª
  categoria in poi «Altre categorie», senza categoria in grigio. Validata con lo script
  della skill sulle superfici dell'app: nel chiaro 4 colori < 3:1, compensati da legenda e tabella.
- Icone pixel art proprie, salvate come ID; ID sconosciuti letti come `null`.
- Archivio definitivo delle categorie: raccomandazione non decisa in `docs/architecture.md`.

## Problemi aperti e limitazioni
- Login Google reale **non completato** dall'agente (richiede l'account dell'utente):
  verificato solo fino alla pagina di accesso di Google.
- Revoca non controllata: un ID token resta valido fino a 1 ora dopo il logout.
- Backend mai eseguito fuori dagli emulatori: adapter Google Sheets testato solo con
  `fetch` simulato; permessi IAM, quote e latenza reali sconosciuti.
- Esito incerto non sopravvive al ricaricamento della pagina (proposta di recupero in
  `docs/architecture.md`, non implementata): il ledger evita duplicati, ma l'utente deve
  controllare l'elenco.
- Righe del foglio inserite o riordinate a mano rompono l'associazione riga↔ID (rilevato,
  la scrittura fallisce senza sovrascrivere); va protetta la scheda. Una riga prenotata e
  mai scritta resta vuota.
- Categorie solo nel browser anche con il backend; il foglio contiene solo `category_id`
  (illeggibile in Sheets). Archivio definitivo delle categorie: non deciso.
- Modalità browser: spese perse cancellando i dati del sito, `localStorage` non atomico
  tra schede. Per portarle nel registro serve una **migrazione esplicita**, non scritta.
- Bundle web: +~350 KB per l'SDK Firebase, caricato anche in modalità browser.
- Console di sviluppo: avviso di React Native Paper «`useNativeDriver` is not supported»
  (animazioni), non indagato; nessun errore.
- `listExpenses` legge l'intero foglio a ogni apertura (va bene per uso personale).
- Nessuna data passata inseribile (rimossa «Modifica data» su richiesta) e nessuna modifica
  di una spesa salvata: solo eliminazione. Una serie ricorrente non si può interrompere
  senza eliminarla (cancellando anche le occorrenze passate).
- Modello dati diverso da `recap.md` §5 (`description` al posto di `note`, `recurrence`
  aggiunta, `legacy_ref` rimandato): documentato in `docs/architecture.md`.
- Dati della vecchia sezione Ricorrenti (`nummo.recurring.v1`) **non migrati né cancellati**:
  non avevano data di inizio. Esistono solo in browser usati per le prove.
- Grafici solo web (SVG DOM): una futura app nativa richiederà `react-native-svg`.
- Dashboard: dettaglio a hover/tocco senza navigazione da tastiera tra i segmenti.
- `npm audit`: radice 29 (25 moderate, 4 alte da `@grpc/grpc-js` tramite
  `@firebase/firestore`, non usato dall'app); `functions/` 6 moderate. Dettaglio e
  motivazioni in `docs/architecture.md`; non usare `--force`.
- Non è una PWA (manifest, icone, HTTPS, aggiornamenti: fase 3).
- `docs/progress.md` è uno storico della fase 1 (cita ancora «Nummus» e un `.git` non valido).

## Prossime attività (per priorità)
1. **Revisione e merge** del ramo `backend-firebase`. Login reale con UID impostato:
   accesso confermato dall'utente; salvataggio, ricaricamento e uscita da riprovare.
   I dati restano nel Firestore degli emulatori e si perdono alla chiusura
   (possibile `--import/--export-on-exit`, proposto all'utente, non fatto).
2. **Confermare con l'utente** le scelte dell'agente: regione, `maxInstances`,
   persistenza della sessione, colonne della scheda, nome dell'acquisto obbligatorio,
   assenza di date passate, interruzione delle ricorrenti.
3. **Functions pubblicate e Sheets reale** (richiede autorizzazione esplicita: piano
   Blaze, budget e avvisi di spesa). Progetto e Auth Google esistono già (`nummo-6b6e2`).
   Servono dall'utente: foglio di prova con scheda «Spese» e intestazioni A–J (riga 1), condiviso
   come Editor solo con l'account di servizio delle funzioni, UID ammesso. Poi:
   `functions/.env.<progetto>` non versionato con `ALLOWED_UID`, `SHEET_ID`; config web
   in `EXPO_PUBLIC_FIREBASE_*`. Mai credenziali in chat. Ripetere sul foglio reale i casi
   di `tests/emulator/backend.e2e.ts` contando le righe per `expense_id`.
4. **Recupero dopo ricaricamento** (proposta in `docs/architecture.md`): operazione
   pendente per UID in `localStorage`, riconciliata al ritorno della sessione.
5. Protezione della scheda (intervallo protetto) e decisione sull'archivio delle
   categorie (scheda «Categorie» proposta) per rendere leggibile `category_id`.
6. Migrazione esplicita delle spese della modalità browser verso il registro.
7. Fase 3: PWA (manifest, icone, HTTPS, Firebase Hosting da confermare), matrice
   browser/dispositivi (proposta: Chrome Android, Safari iPhone, Chrome desktop).

## Verifiche
Login reale (2 novembre 2026):
- `npm run check`: **84/84** test app (nuovo: lettura dell'indirizzo emulatore Functions),
  **25/25** `functions/`, export web.
- `test:emulator:real` (progetto `nummo-6b6e2`, senza emulatore Auth, su porte
  alternative perché gli emulatori demo dell'utente erano aperti): senza token →
  «Accedi per continuare.»; token falsificati (alg `none` e `RS256` con firma falsa, ma
  emittente, destinatario e provider corretti) → rifiutati con il messaggio della
  **verifica del backend**, quindi non dall'emulatore. 3/3.
- `test:emulator` demo ripetuto con la verifica dei token: 2/2.
- Chromium: modalità `firebase` con `.env.local` → «Accedi con Google», il popup apre
  `accounts.google.com` (config valida, `localhost` autorizzato), nessun errore in
  console. **Login completo, salvataggio con UID reale e uscita non verificati.**

Incremento backend (2 novembre 2026, Linux, Node 26.13.0, npm 12.2.1, Java 21; le funzioni
negli emulatori girano con Node 26, non con il runtime 22 dichiarato):
- `npm run check` superato: typecheck, **83/83 test** app (nuovi: contratto, classificazione
  errori), **25/25 test** di `functions/` (servizio con ledger e foglio in memoria: una
  riga, ritentativi e 5 invii concorrenti, conflitto, crash dopo la scrittura, scrittura
  fallita, riga occupata, 12 payload non validi, formula come testo, elenco; adapter Sheets
  con `fetch` simulato: RAW, token, range, verifica, errori senza corpo), export web.
- `npm run test:emulator` superato (2 test, emulatori reali Auth/Functions/Firestore):
  senza login e con account non ammesso nessuna lettura/scrittura; **6 invii concorrenti
  con lo stesso ID → una sola riga e una sola `created_at`**; dati diversi →
  `ALREADY_EXISTS`; importo decimale → `INVALID_ARGUMENT`.
- Chromium headless 500 px con emulatori (script CDP non versionato): accesso col
  popup, salvataggio «12,50 / Pane e latte», elenco, **ricaricamento con sessione e spesa
  rilette dal backend**, rete disattivata → esito incerto con campi bloccati e «Riprova»,
  rete riattivata → salvata **una sola volta**, «Esci» → nessun dato visibile, account
  non ammesso → messaggio e modulo disattivato. Screenshot ispezionati.
- Chromium in modalità browser: validazione, salvataggio, ricaricamento, eliminazione.
- **Non verificati**: Firebase/Sheets reali, deployment, scadenza/revoca della sessione,
  crash reale del backend dopo la scrittura (coperto solo dai test con fake), più schede.

Ricontrollo sul commit `038c652` (2 novembre 2026, Linux, Node 26.13.0, npm 12.2.1):
`npm run check` superato (typecheck, **78/78 test**, export web in `dist/`, bundle ~959 KB);
`npm audit`: 11 moderate, invariato. Prove nel browser **non ripetute** in questo ricontrollo.

Eseguite durante le revisioni UI (prima del commit):
- Ultima modifica (Salute tolta dalle predefinite, alone delle icone nel tema scuro):
  `npm run check` con **78/78 test** (nuovo: l'alone circonda lo sprite senza coprirlo);
  nel browser con profilo nuovo 4 predefinite, icone in chip, selettore, elenco categorie
  ed elenco spese controllate in scuro (leggibili) e in chiaro (invariate); console pulita.
- Modifica precedente (rinomina, nuove predefinite con icone, riquadri senza descrizione):
  `npm run check` con **77/77 test**; nel browser con profilo nuovo verificate predefinite e
  icone, rinomina con duplicato rifiutato, salvataggio e annulla, riquadri; console pulita.
  Sprite pasta e popcorn ispezionati ingranditi (pasta ridisegnata una volta).
- Modifica precedente (messaggi importo, interruttore M3, `aria-*`): **76/76 test**; nel browser verificati assenza di errore all'uscita da un campo vuoto,
  messaggi brevi, interruttore spento/acceso in chiaro e scuro, `aria-checked` corretto su
  interruttore, riquadri ricorrenza e chip (prima era assente: `accessibilityState` ignorato).
- `npm run check` della revisione precedente: **75/75 test superati**. Test aggiunti allora:
  occorrenze (settimanale, fine mese, 29 febbraio, nessuna futura), ricerca senza accenti,
  4 ordinamenti, periodi a cavallo d'anno, aggregazione (fuori periodo, «Altre», senza
  categoria), archivio spese (validazione, corruzione non sovrascritta, ID duplicato).
- Chromium headless ~500 px (script DevTools locale, non versionato), con 12 spese di esempio
  su 6 mesi: errori del modulo, salvataggio di una mensile, conteggio 17 occorrenze e totale
  619,08 € corrispondenti al calcolo manuale, ricerca «SUPER» (2), ordinamento per importo,
  tre grafici con hover/tocco, legenda, tabella, tema scuro, eliminazione di una serie.
  Nessun errore in console. Screenshot ispezionati (corretto il font serif nel testo SVG).
- Revisioni precedenti: icone pixel art ispezionate ingrandite, icone emoji legacy lette
  come assenti, chiave `nummus.*` coperta solo dai test.
- `npm audit` (nessuna dipendenza aggiunta da allora): 11 moderate, 0 alte/critiche.

**Mai verificati:** login Google reale, permessi e scrittura reale su Sheets, installazione
PWA, telefoni reali, desktop largo, screen reader, navigazione da tastiera, zoom testuale,
Node LTS 22/24.
