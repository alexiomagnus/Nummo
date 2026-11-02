# HANDOFF — stato operativo

Aggiornamento: 2 novembre 2026. Ultimo commit rilevante: «Rinomina in Nummo, categorie
predefinite/eliminabili e spese ricorrenti» (`611f4aa`, su `main`). Contesto stabile in `AGENTS.md`.

## Fase corrente
**Fase 1 — base locale: completata.** L'app non registra ancora spese reali.
Prossima fase: **2 — prova tecnica** (login Google, UID autorizzato, scrittura unica in
Sheets, idempotenza/recupero). Fasi successive: 3 MVP PWA, 4 passaggio dal vecchio
Form (dettaglio in `docs/progress.md`). Nessuna attività è attualmente in corso.

## Modifiche recenti — to-do list utente (2 novembre 2026)
- Rinomina **Nummus → Nummo** (intestazione, HTML, `app.json`, `package.json`, lockfile, README).
  Le categorie salvate con la vecchia chiave vengono lette e riscritte sulla nuova.
- Titolo «Nummo» più grande (`headlineMedium`) e in grassetto.
- Rimossi i pulsanti «Gestisci categorie» e «Modifica data»: la data è sempre oggi (Roma).
- Eliminazione categorie (con conferma Annulla/Elimina).
- Categorie predefinite per un browser nuovo: Spesa alimentare, Ristorazione, Salute,
  Uscita, Shopping online.
- Nuova sezione «Ricorrenti»: importo, descrizione, ricorrenza settimanale/mensile/annuale;
  elenco locale con eliminazione.

## Implementato
- Modulo «Nuova spesa»: importo (virgola o punto, max 2 decimali, 0,01–99.999,99 €),
  categoria a chip, data sempre automatica e nascosta (Roma), nota max 500 punti di
  codice. Validazione per campo al blur.
- «Salva spesa» **disabilitato**: nessun salvataggio simulato. La bozza è solo in memoria
  e sopravvive al cambio di sezione (il modulo è nascosto, non smontato).
- Sezione «Categorie»: creazione ed eliminazione (UUID, nomi normalizzati NFC/spazi,
  unici senza distinzione maiuscole, max 40 caratteri); predefinite solo se il browser
  non ha mai salvato categorie; persistenza in `localStorage`, rilettura su evento
  `storage` da altre schede. Nessuna rinomina.
- Sezione «Ricorrenti»: creazione ed eliminazione in `localStorage` (descrizione max 100
  caratteri). Non generano spese e non hanno data di inizio né categoria.
- Tema chiaro/scuro (sistema + override con icona sole/luna), palette provvisoria.
- `submissionReducer`: stati bozza/invio/incerto/confermato/rifiutato, testato ma **non
  collegato** a UI, rete o storage.

## Decisioni significative (motivazioni in `docs/architecture.md`)
- Stack TypeScript + Expo + RN Web + Paper; backend Firebase Auth + Cloud Functions
  (confermato come direzione, nessun servizio configurato).
- Uso personale; registro predisposto e condiviso con identità di servizio.
- EUR, 2 decimali, Europe/Rome, date 2000-01-01…oggi, nota 500 caratteri.
- Categorie dell'utente eliminabili, con cinque predefinite seminate una sola volta
  (eliminarle tutte non le ripristina).
- Data sempre automatica, risolta alla validazione per evitare date obsolete; il dominio
  accetta ancora date esplicite, ma la UI non permette più di inserirle.
- Ricorrenze anticipate rispetto alla roadmap della specifica (era fuori dal MVP), su
  richiesta esplicita dell'utente, limitate a un elenco locale.
- Limiti di 40 (categoria) e 100 (descrizione ricorrente) caratteri: scelte implementative.

## Problemi aperti e limitazioni
- Impossibile registrare spese con data passata: conseguenza diretta della rimozione
  di «Modifica data». Da confermare con l'utente se accettabile.
- Spese ricorrenti: da definire con l'utente data di inizio, categoria e come/quando
  diventano spese effettive (backend pianificato? conferma manuale?).
- Eliminando una categoria selezionata nella bozza, la selezione resta invisibile e la
  validazione la rifiuta («Scegli una categoria»): comportamento corretto ma non spiegato
  all'utente.
- `localStorage` non è atomico tra schede, non è legato a un account e non sincronizza.
  Prima del login: categorie autorizzate lato backend per UID e migrazione esplicita
  (mai associare automaticamente le categorie del browser all'utente che accede).
- Protocollo di idempotenza/recupero delle scritture su Sheets non definito; esiste solo
  una proposta non approvata in `docs/architecture.md`.
- `npm audit`: 11 vulnerabilità moderate nella catena Expo (`glob`, `minimatch`);
  il fix forzato installerebbe `expo@53` → non applicarlo.
- Non è una PWA: manca manifest, icone, HTTPS, service worker/aggiornamenti (fase 3).
- Warning console Paper/Animated (fallback ad animazioni JS sul web), non bloccante.
- `docs/progress.md` riporta che `.git` non era un repository valido: **superato**, ora
  il repository è valido con un commit.

## Prossime attività (per priorità)
1. **Decidere con l'utente** il protocollo di coordinamento/recupero delle scritture
   (proposta in `docs/architecture.md`), prima di scrivere codice backend.
2. **Ottenere dall'utente** progetto Firebase di test, UID ammesso, foglio di prova e
   identità di servizio. Non chiedere credenziali in chat; nessun deployment/fatturazione
   senza autorizzazione esplicita (Cloud Functions richiede piano Blaze).
3. Implementare la prova tecnica: login Firebase Web SDK con persistenza scelta
   esplicitamente; callable autenticata che valida a runtime il payload (riusando
   `src/domain`), assegna `created_at` UTC, scrive con `RAW` e conferma con `expense_id`.
   Accettazione: una sola riga per ID con doppio tocco, concorrenza, risposta persa e
   crash dopo la scrittura; stesso ID con dati diversi → conflitto.
4. Collegare `submissionReducer` al modulo e generare l'`expense_id` solo all'invio.
5. Spostare categorie e spese ricorrenti sul backend per UID, con migrazione esplicita
   da `localStorage`.
6. Concordare persistenza di sessione e operazioni pendenti, matrice browser/dispositivi
   (proposta: Chrome Android, Safari iPhone, Chrome desktop), hosting, budget e palette.

## Verifiche
Eseguite dopo le modifiche della to-do list (Linux, Node 26.13.0, npm 12.2.1):
- `npm run check`: typecheck OK, **66/66 test superati** (nuovi: predefinite, eliminazione,
  chiave precedente, ricorrenze), export web riuscito.
- Chromium headless 420 px sull'export (script DevTools locale, non versionato): voci rimosse,
  predefinite visibili, eliminazione «Salute» con conferma e persistenza, errori della
  sezione Ricorrenti, creazione/persistenza dopo ricarica/eliminazione di una ricorrenza,
  nessun errore in console. Screenshot controllati; corretto l'a capo di «Elimina» con
  descrizioni lunghe. Non verificati: tema scuro delle nuove sezioni, desktop, migrazione
  della chiave precedente nel browser (coperta solo dai test).
- `npm audit` (prima delle modifiche, nessuna dipendenza aggiunta): 11 moderate, 0 alte/critiche.

Riportate in `docs/progress.md` ma **non ripetute** in questa sessione: prove manuali nel
browser integrato (validazione campi, creazione/duplicati/persistenza categorie, temi,
layout 300 e 984 px, console senza errori JS).

**Mai verificati:** login Google, permessi del registro, scrittura reale su Sheets,
concorrenza backend, recupero dopo riapertura, logout/cambio account, installazione PWA,
telefoni reali, screen reader, zoom testuale, Node LTS 22/24.
