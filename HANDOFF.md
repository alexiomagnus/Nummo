# HANDOFF — Nummo BYOF

Aggiornamento: 2 novembre 2026. Migrazione e rimozione del vecchio backend committate
sul branch `backend-firebase` (base `fe759d5`), non pubblicate né unite a `main`.
Stato precedente ricostruito in `docs/migrazione-byof.md`. Architettura corrente in `AGENTS.md` e `docs/architecture.md`.

## Risultato corrente

App web con Google Authentication e accesso diretto a **Cloud Firestore personale**.
Nessuna integrazione Sheets/callable nel percorso attivo, nessun cloud dello
sviluppatore obbligatorio, nessun database locale indipendente. Configurazione da env
pubbliche a build. L'alias personale `real` e i file `.env` esistenti sono intatti.

- Riutilizzati dominio, modulo, ricorrenze, ricerca, dashboard, componenti e icone.
- Spese e categorie sincronizzate da listener SDK. Timestamp Firestore, UUID,
  centesimi interi, data civile Europe/Rome. Occorrenze calcolate, non salvate.
- Proprietario amministrativo in `config/owner`; regole restrittive UID/provider
  Google, validazione campi/importi/date/timestamp/revisioni, indice nomi categoria
  mantenuto in transazione. Client incapace di assegnarsi autorizzazioni.
- CRUD spese; modifica serie su tutte le occorrenze, data iniziale invariata.
  Rinomina/icona/eliminazione categorie e unicità concorrente. Le modifiche e le
  conferme di eliminazione conservano la versione iniziale: conflitti espliciti.
- Inserimenti offline in coda SDK; UI distingue cache, connessione indicativa e
  scritture pendenti. Nessun falso successo. Persistenza disco opt-in per dispositivi
  fidati; altrimenti cache in memoria. SDK gestisce retry e più schede.
- Logout attende le scritture; timeout 5 s lascia la sessione attiva e segnala di
  riconnettersi. Cambio account smonta stato/listener. Cache disco non cancellata.
- Copia recuperabile in memoria delle spese pendenti osservate e poi rifiutate/non
  confermate: download esplicito prima di uscire. Nessun archivio di errori parallelo.
- CSV UTF-8 BOM/CRLF con importi esatti, quoting e protezione formule; JSON completo
  di spese/serie/categorie/metadati. Download solo da snapshot server senza pending.
- Migrazione locale esplicita con download originali, anteprima del progetto/UID,
  preflight e gruppi ripetibili. Progresso parziale dichiarato in caso di interruzione;
  ID uguali con dati diversi non sono sovrascritti. Originali mai cancellati.
- Le vecchie ricorrenze locali senza data restano nel backup grezzo, escluse dalla
  migrazione automatica. Rimossi gli hook di scrittura localStorage dal frontend.
- **Vecchio backend rimosso** (Cloud Functions, ledger, adapter Sheets,
  `firebase.legacy.json`, `firestore.legacy.rules`, test callable/token, esportatore
  `emulator_sheet_rows`, script npm legacy, codice morto delle callable). Motivo: il
  foglio non è mai stato reale (`SHEET_ID=emulator`) e nessun emulatore conteneva
  righe storiche oltre alle fixture dei test. Recupero: commit `fe759d5`. I `.env`
  personali in `functions/` restano sul disco, ignorati. Nessuna dipendenza aggiunta.

## Verifiche eseguite

Ambiente: Linux, Node 26.13.0, npm 12.2.1, Java 21, Chromium headless con profilo
**temporaneo**. Nessun dato/servizio reale coinvolto nei test di scrittura.

- Baseline prima delle modifiche: `npm run check`, **84 app + 25 backend**, typecheck
  ed export web riusciti.
- Prima della rimozione: `npm run check`, **91/91 app + 25/25 legacy**, build riuscita.
- Dopo la rimozione: vedi § Consolidamento.
- Suite nuova `tests/emulator/firestore.e2e.ts`: **11/11** (10 sottotest più contenitore),
  veri SDK e Rules negli emulatori, progetto `demo-nummo`. Porte alternative Auth 9199,
  Firestore 8280 perché quelle dell'utente erano occupate; i processi dell'utente non
  sono stati fermati. Config temporanea nella radice rimossa a fine lavoro.
- Copertura emulata: anonimi/estranei/namespace diverso/autopromozione negati,
  provider non Google negato anche con UID proprietario, due sessioni, CRUD,
  conflitto di revisione e cancellazione obsoleta, campi extra/importi/date/timestamp
  invalidi, nessuna sovrascrittura create, nomi concorrenti e indici manomessi negati,
  creazione offline senza conferma anticipata, riconnessione senza duplicazione,
  importazione ripetuta, conflitto senza sovrascrittura, gruppi con **205 spese + 12
  categorie**, logout. (Il sottotest dell'esportatore legacy è stato rimosso con esso.)
- Config: due progetti pubblici differenti, demo indipendente, valori mancanti,
  endpoint errati e variabile Functions legacy; test senza subprocessi per rispettare
  i limiti del runner/sandbox. Queste prove non sono due progetti cloud reali.
- Chromium via CDP: popup Google **simulato**, inserimento e conferma, modifica importo
  verificata nell'elenco, creazione categoria, download JSON/CSV, eliminazione,
  logout senza dati in UI, estraneo negato senza mostrare dati proprietario.
- Chromium offline: nessuna conferma anticipata, logout bloccato con pending,
  reload della pagina con Firestore ancora irraggiungibile → spesa e coda recuperate
  dalla cache SDK; riconnessione → conferma. Rifiuto dopo reload provocato revocando
  temporaneamente il proprietario **nel solo emulatore di prova** → download copia
  recuperabile mostrato; proprietario demo ripristinato.
- Due schede Chromium con cache persistente: nuova categoria sincronizzata tra schede.
  Migrazione dalla UI: anteprima, conferma, spesa visibile nell'altra scheda e
  **localStorage sorgente identico** dopo l'importazione. Screenshot ispezionato.
- `npm audit`: **29** segnalazioni (25 moderate, 4 alte), già presenti. Alte nella
  catena Node `@grpc/grpc-js`/Firestore; correzione proposta retrocede Firebase.
  Nessuna modifica automatica alle dipendenze.

I primi tentativi degli emulatori sulle porte predefinite sono stati respinti dal
sandbox/porte occupate: ripetuti su porte separate. Una ripetizione nella stessa
suite già popolata ha rilevato collisioni tra nomi dei dati di test: corretto il test
con nomi unici per esecuzione, senza cancellare l'archivio. Test finali tutti passati.

## Consolidamento (2 novembre 2026)

- `npm run check` (typecheck, test app, build): **89/89**. Rispetto a 91: rimossi i
  test di `isDefinitiveRejection`, `parseReceipt`, `parseExpenseList` (solo callable),
  aggiunto un test di `isUtcTimestamp`.
- `tests/emulator/firestore.e2e.ts` su emulatori isolati (Auth 9299, Firestore 8380):
  **10/10**. Emulatori dell'utente non toccati.
- Script npm: nessun riferimento a file mancanti o a `functions/`. `git diff --check`
  pulito; nessun UID personale, chiave o `emulator-data/` nei file versionati.
- Prova manuale nel browser con login Google reale ed emulatore persistente:
  dichiarata riuscita dall'utente, non ripetuta dall'agente.
- Processo residuo dell'agente precedente: Firestore emulator su 8280 (dati di test
  `demo-nummo`), non fermato. Può essere chiuso dall'utente.

## Avvio e passaggi manuali

Guida completa: `docs/firebase-personale.md`.

```sh
npm run emulators          # terminale 1, prima preservare eventuali vecchi dati
npm run emulators:seed     # terminale 2, dopo l’avvio
npm run dev               # demo locale, ignora configurazione reale
```

Per conservare il login Google reale del progetto esistente con DB locale:

```sh
npm run emulators:real
npm run emulators:seed:owner -- ID_PROGETTO UID_PROPRIETARIO
npm run dev:firebase
```

L'UID del proprietario è quello dell'account Google (Console → Authentication → Utenti),
mai nei file versionati; in questo checkout coincide con `ALLOWED_UID` del vecchio
`functions/.env.nummo-6b6e2` (ignorato). Auth reale non richiede l'emulatore Auth.
Con `emulator-data/` il proprietario si imposta una sola volta. Non è stato creato nessun documento nel progetto cloud reale.

Persistenza (2 novembre 2026): `emulators:real` importa da `emulator-data/` e vi
riesporta all'arresto (`--export-on-exit`). La cartella contiene dati personali ed è
esclusa da Git. `config/owner`, spese e categorie sopravvivono ai riavvii **solo con
arresto pulito** (Ctrl+C una volta, attendere «Export complete»); un kill forzato
perde le modifiche dall'ultimo avvio. Esportazione iniziale creata a mano con
`firebase emulators:export emulator-data --project real` dall'emulatore 8180 attivo
(conteneva solo `config/owner`). Ciclo import → scrittura → export → reimport
verificato su copia con emulatore isolato. Senza `emulator-data/` (nuovo checkout)
l'emulatore parte vuoto e crea la cartella all'arresto (verificato).

Per produzione personale: abilitare Firestore nel proprio progetto, Google Auth e
domini, creare `config/owner`, revisionare/pubblicare regole, poi avviare/configurare
la build Firebase. Tutti questi passaggi
cloud rimangono manuali: nessun deploy, Blaze, servizio aggiuntivo o commit eseguito.

## Limiti e prossime verifiche

1. **Non verificati**: login Google reale completo, CRUD/regole sul Firestore cloud
   personale, OAuth mobile, browser Android/iOS reali, Safari/Firefox/Edge, Node LTS,
   revoca/scadenza reale dei token e negazione storage/private browsing.
2. Unico target web. PWA completa, manifest/icone/service worker e avvio a freddo
   senza rete non implementati; app native richiedono adattamenti. Il test offline
   ha ricaricato con bundle Expo raggiungibile e Firestore bloccato, non avviato una
   PWA completamente disconnessa. Chiusura/crash dell'intero browser non collaudati.
3. Firestore non conserva una cronologia dei rifiuti applicativi: la copia di
   recupero riguarda pending osservati dai listener e vive in memoria. Scaricarla
   prima di chiudere. Storage cancellato/negato può perdere dati non confermati.
4. Importazione atomica per gruppo, non per tutto l'archivio. JSON file fino a 5 MB
   nella UI. Eventuali volumi superiori o schema diverso richiedono analisi dedicata.
   Le letture iniziali/backup caricano le collezioni intere: per un archivio grande
   valutare paginazione e costi. Export di due collezioni non è snapshot globale
   atomico: evitare modifiche da altre sessioni durante il backup.
5. Aggiornare in una fase dedicata le dipendenze vulnerabili senza downgrade forzati.
6. Nessuna prova/importazione da un Google Sheet reale: formato e copie originali
   non disponibili. Non inferire compatibilità con il vecchio Form senza esaminarlo.
7. Senza `EXPO_PUBLIC_NUMMO_BACKEND` la modalità è `firebase` (cloud). Gli script
   `dev`/`dev:emulator`/`dev:firebase` forzano emulatori; `dev:cloud`, `build` e
   `expo start` diretto leggono `.env.local`, che in questo checkout imposta l'endpoint
   dell'emulatore 8180: una build per il cloud richiede un ambiente senza quella
   variabile. Valutare un default più esplicito prima della versione mobile.
