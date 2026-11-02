# HANDOFF — stato operativo

Aggiornamento: 2 novembre 2026. Ultimo commit: `87b2647` (su `main`; contenuto funzionale in
`611f4aa` «Rinomina in Nummo, categorie predefinite/eliminabili e spese ricorrenti»).
**Sei revisioni UI successive non sono ancora committate** (descritte sotto come stato attuale).
Contesto stabile in `AGENTS.md`.

## Fase corrente
Fase 1 (base locale) estesa su richiesta dell'utente con funzioni previste dopo l'MVP:
**salvataggio locale delle spese, spese ricorrenti, elenco ricercabile e dashboard**.
Nulla è ancora collegato a Google/Sheets. Prossima fase prevista: **2 — prova tecnica**
(login Google, UID autorizzato, scrittura unica in Sheets, idempotenza/recupero);
poi 3 MVP PWA e 4 passaggio dal vecchio Form (`docs/progress.md`). Nessuna attività in corso.

## Implementato (stato del codice)
Quattro sezioni in `App.tsx`: **Nuova · Spese · Dashboard · Categorie**.
- **Nuova**: importo (font 20, virgola o punto, max 2 decimali, 0,01–99.999,99 €),
  nome dell'acquisto (obbligatorio, max 100 punti di codice), categoria facoltativa
  (chip pieni nel colore primario, senza spunta; secondo tocco deseleziona), riga
  «Ripeti questa spesa» con interruttore Material 3 (`M3Switch`: binario 52×32, maniglia
  16→24 px con spunta) che mostra tre riquadri Settimanale/Mensile/Annuale (solo il nome). Errori brevi
  («Inserisci l'importo.», «Importo non valido (es. 12,50).»); un campo lasciato vuoto non
  è segnalato all'uscita ma solo al salvataggio. Data sempre
  oggi (Europe/Rome) risolta al salvataggio. «Salva spesa» **salva in `localStorage`**
  (`nummo.expenses.v1`) e svuota il modulo; il testo dichiara che Sheets non è collegato.
- **Ricorrenze**: una spesa con `recurrence` è una serie che parte da `expense_date`;
  elenco e dashboard la contano una volta per scadenza fino a oggi (`expandOccurrences`,
  mesi corti: 31 → 30/28, 29 feb → 28). Le occorrenze sono calcolate, non salvate.
- **Spese**: elenco delle occorrenze con ricerca per nome (senza maiuscole/accenti),
  ordinamento per data o importo (crescente/decrescente), conteggio e totale dei risultati,
  eliminazione con cestino + conferma (su una ricorrente elimina l'intera serie).
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
- `submissionReducer` (stati d'invio verso il backend): testato, **non collegato**.

## Decisioni significative (dettaglio in `docs/architecture.md`)
- Stack TypeScript + Expo + RN Web + Paper; backend previsto Firebase Auth + Cloud Functions
  (nessun servizio configurato). Uso personale, registro condiviso con identità di servizio.
- **Spese salvate in `localStorage`** perché elenco e dashboard richiesti dall'utente
  necessitano di dati: archivio temporaneo, per browser, senza conferma Sheets.
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
- Spese solo nel browser: perse cancellando i dati del sito, nessuna sincronizzazione,
  `localStorage` non atomico tra schede. Al collegamento con Sheets serve una **migrazione
  esplicita** (mai associare automaticamente i dati del browser all'utente che accede).
- Nessuna data passata inseribile (rimossa «Modifica data» su richiesta) e nessuna modifica
  di una spesa salvata: solo eliminazione. Una serie ricorrente non si può interrompere
  senza eliminarla (cancellando anche le occorrenze passate).
- Il modello dati di `recap.md` (`note`, nessuna `recurrence`) va riallineato prima del backend.
- Dati della vecchia sezione Ricorrenti (`nummo.recurring.v1`) **non migrati né cancellati**:
  non avevano data di inizio. Esistono solo in browser usati per le prove.
- Grafici solo web (SVG DOM): una futura app nativa richiederà `react-native-svg`.
- Dashboard: dettaglio a hover/tocco senza navigazione da tastiera tra i segmenti.
- `npm audit`: 11 moderate nella catena Expo (`glob`, `minimatch`); non usare `--force`.
- Non è una PWA (manifest, icone, HTTPS, aggiornamenti: fase 3).
- `docs/progress.md` è uno storico della fase 1 (cita ancora «Nummus» e un `.git` non valido).

## Prossime attività (per priorità)
1. **Confermare con l'utente**: nome dell'acquisto obbligatorio, assenza di date passate,
   comportamento delle ricorrenti (interruzione senza cancellare lo storico?).
2. **Decidere** protocollo di coordinamento/recupero delle scritture e archivio di
   categorie/spese (`docs/architecture.md`), prima del codice backend.
3. **Ottenere dall'utente** progetto Firebase di test, UID ammesso, foglio di prova e
   identità di servizio. Mai credenziali in chat; nessun deployment/fatturazione senza
   autorizzazione (Cloud Functions richiede piano Blaze).
4. Prova tecnica: login Firebase Web SDK; callable autenticata che valida il payload
   (riusando `src/domain`), assegna `created_at` UTC, scrive con `RAW`, conferma con
   `expense_id`. Accettazione: una riga per ID con doppio tocco, concorrenza, risposta
   persa, crash dopo la scrittura; stesso ID con dati diversi → conflitto.
5. Sostituire `expenseStorage` con il backend passando per `submissionReducer`, mantenendo
   elenco e dashboard sulle stesse funzioni pure di `src/domain/history.ts`.
6. Concordare matrice browser/dispositivi (proposta: Chrome Android, Safari iPhone, Chrome
   desktop), hosting, budget, palette.

## Verifiche
Eseguite dopo l'ultima revisione (Linux, Node 26.13.0, npm 12.2.1):
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

**Mai verificati:** login Google, permessi e scrittura reale su Sheets, concorrenza backend,
logout/cambio account, installazione PWA, telefoni reali, desktop largo, screen reader,
navigazione da tastiera, zoom testuale, Node LTS 22/24.
