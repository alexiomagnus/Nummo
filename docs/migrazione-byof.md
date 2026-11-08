# Analisi e piano della migrazione BYOF

2 novembre 2026. Analisi sul ramo `backend-firebase`, base `fe759d5`, checkout iniziale
pulito. Nessun commit creato. `recap.md` v0.4 letta integralmente e conservata:
la richiesta BYOF sostituisce le sue decisioni su Sheets e sul backend.

## Riscontro prima delle modifiche

- Expo 58.0.22, React 19.3, RN 0.88.1/RN Web 0.21.4, Paper 5.15.4,
  TypeScript 6.0.3 strict. `app.json` dichiara solo `web`; grafici e icone usano SVG DOM.
- `App` → sessione → Workspace → quattro sezioni; dominio puro già riutilizzabile.
  Importi interi, UUID, date Europe/Rome, ricorrenze calcolate; nessuna entità
  abbonamento separata. Il database non deve materializzare le occorrenze.
- Default locale: spese e categorie in localStorage. Nel percorso remoto, categorie
  ancora locali; Auth Google → callable → ledger Firestore → Sheets o foglio finto.
  Conferma dopo scrittura verificata; nessuna modifica/eliminazione remota.
- Backend: `ALLOWED_UID` più provider Google, verifica esplicita del token Admin SDK,
  transazione per prenotare riga e hash del payload. Le regole negavano tutti i client.
  Questo coordinamento era necessario per Sheets, non per documenti Firestore.
- Config Firebase pubblica già esterna in `.env.local`; progetto reale usato per Auth,
  backend solo locale. Nel file reale `ALLOWED_UID` risulta ora configurato (valore non
  riportato), diversamente dal vecchio HANDOFF che lo indicava ancora come segnaposto.
  Nessun file personale modificato.
- Git: `611f4aa` (nome, categorie, ricorrenze), `038c652` (UI), `fe759d5`
  (backend locale e Auth reale). Questi passaggi spiegano gli adapter paralleli.
- Baseline eseguita: `npm run check`, 84 test app e 25 backend, typecheck ed export.
  La cronologia di prove nel browser non è stata scambiata per una verifica corrente.

## Priorità e risultato

| Priorità | Intervento indispensabile | Risultato |
| --- | --- | --- |
| 1 | Schema, isolamento, configurazione BYOF e regole prima della sostituzione | Implementati; test SDK contro emulatori |
| 2 | Sostituire callable e archivi locali nel flusso attivo | Auth + Firestore, listener e cache SDK; UI riutilizzata |
| 3 | CRUD, categorie condivise, stato pendente e conflitti | Implementati; transazioni online per modifiche/eliminazioni/categorie |
| 4 | Backup, CSV e migrazione esplicita senza cancellazioni | Implementati; importazioni controllate, ripetibili, in gruppi |
| 5 | Disattivare wiring legacy dopo i test e documentare | Backend rimosso dopo la verifica (vedi sotto) |

Facoltativi e non anticipati: wizard runtime, app native, PWA completa e service
worker, App Check, hosting, automazioni, grandi ottimizzazioni/paginazione. Nessun
Drive, SQLite, database IndexedDB gestito dall'app, servizio centralizzato o Blaze.

## Decisioni operative

Configurazione a build tramite variabili pubbliche: appropriata per chi clona il
repository e usa il proprio Firebase. Un wizard che accettasse `firebaseConfig` non
potrebbe creare in sicurezza regole e proprietario; non è stato introdotto. L'app
spiega i valori mancanti; la guida copre i passaggi amministrativi separati.

Il backend precedente (`functions/`, configurazione e regole legacy, test callable,
esportatore `export:legacy:emulator`) è stato rimosso il 2 novembre 2026 dopo aver
verificato che non c'erano dati da migrare: il foglio non è mai stato reale
(`SHEET_ID=emulator`) e gli emulatori non contenevano righe storiche oltre ai dati dei
test. Recupero dalla cronologia Git, commit `fe759d5`.
Gli hook che scrivevano in localStorage e gli adapter storici sono rimossi (5 novembre 2026,
recuperabili dal commit `e2b84d3`): l'unica importazione resta quella da file JSON.

## Conservazione dei dati

1. Conservare gli originali prima di cambiare ambiente. Non svuotare cache o emulatori
   che contengono dati; `firebase emulators:export <cartella-nuova>` permette una copia
   manuale dell'emulatore in esecuzione (specificare progetto/config corretti).
2. (Rimosso) L'esame dei dati del browser non esiste più: i vecchi dati localStorage
   vanno esportati prima con una versione precedente (commit `e2b84d3`) e importati da JSON.
3. Riepilogo con conteggi (aggiunte, già presenti, conflitti), poi conferma esplicita; il
   destinatario è sempre l'account che ha effettuato il login. Il backup non contiene UID né progetto.
4. Preflight di tutti gli ID, nomi e payload contro il server. Se esistono con valori
   diversi, nessuna scrittura. Le transazioni ricontrollano ogni gruppo per coprire
   modifiche concorrenti: 8 categorie (limite accessi Rules) o 200 spese.
5. Importazione **non atomica sull'intero archivio**: ogni gruppo è atomico. Se la rete
   cade o sopraggiunge un conflitto, quelli già confermati restano. Il messaggio lo
   dichiara; ripetere lo stesso file salta gli ID con dati uguali e riprende senza
   duplicati. Nessuna sovrascrittura né cancellazione degli originali.
6. ID, importi, date originali, `created_at`, ricorrenze e categorie sono conservati;
   la nuova installazione inizia con revisioni proprie e `updated_at` di importazione.
   Date future, ID non UUID o dati corrotti richiedono una migrazione dedicata: vengono
   rifiutati, non riparati silenziosamente. Categorie già eliminate possono lasciare
   riferimenti orfani, come prima; non vengono ricreate inventando nomi.
7. Confrontare backup prima/dopo: numero di serie e categorie, somma dei centesimi,
   ID e date. Il CSV (solo consultazione) conta le occorrenze; non confrontare il suo numero
   di righe con il numero di serie nel JSON.

Per un vero foglio storico non disponibile in questa sessione: fare prima una copia
manuale; il suo schema e la conversione richiedono analisi dedicata, non un importatore
che indovini le colonne.
