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

## Sessione UI/UX (2 novembre 2026)

Solo presentazione, nessuna logica/backend toccata: stato sincronizzazione, banner di
recupero ed errori di sessione in contenitori colorati (errorContainer/surfaceVariant);
slogan nascosto dopo il login; esportazione/migrazione in `Surface` con pulsanti
`outlined`; conferma eliminazione che va a capo su schermi stretti.
Seconda tranche: barra di navigazione inferiore fissa (icone SVG inline) al posto dei
`SegmentedButtons`, con scroll in alto al cambio sezione e colonna fino a 720 px; campo
data facoltativo (AAAA-MM-GG, vuoto = oggi, usa la validazione esistente) solo nel form
«Nuova»; prefisso € sull'importo; snackbar «Spesa salvata.» (Portal); chip categoria
compressi a 8 con «Mostra tutte» (la selezionata resta visibile); elenco raggruppato per
mese con totale quando l'ordinamento è per data; righe elenco che vanno a capo.
`npm run check` superato. **Non verificato visivamente nel browser** (barra `fixed`,
snackbar sopra la barra, righe strette). Restano: misure di contrasto e aree di tocco.

## Revisione UI/UX e responsive (2 novembre 2026)

Solo presentazione: nessuna modifica a backend, Rules, schema, sessione, sincronizzazione,
import/export o logica delle ricorrenze. Sostituisce lo stato «non verificato visivamente» sopra.

- **Navigazione** (`AppShell`): una sola navigazione primaria con 3 destinazioni (Spese ·
  Dashboard · Categorie). «Nuova spesa» è l'azione primaria: FAB esteso nel drawer (≥1024),
  FAB nella rail (600–1023), FAB esteso sopra la barra inferiore (<600, solo icona sotto 360 px,
  nascosto sulla propria schermata). Prima «Nuova» era sia tab sia FAB.
- **Nuova spesa**: colonna centrata (max 560), importo in evidenza, data con scorciatoie Oggi/Ieri
  (prima il campo non era collegato al modulo), `RepeatField` condiviso con la modifica (frequenza
  solo se attiva, frase che spiega la ricorrenza), asterischi tolti dalle etichette (obbligo dichiarato
  una volta nell'intestazione, «facoltativa» sui campi opzionali), barra di salvataggio sticky su mobile.
- **Spese**: ricerca + `MenuSelect` Ordina/Categoria (filtro nuovo, solo lato client), totale e
  raggruppamento mensile invariati, azioni «Modifica»/«Elimina» con etichetta (menu a tre puntini
  su mobile), larghezza massima 880. Esporta/importa fuori dal flusso: pulsante nell'intestazione che
  apre il pannello (rimane montato per non perdere un'anteprima di importazione).
- **Dashboard**: toolbar compatta (chip su ≥600, due `MenuSelect` su mobile), 4 KPI in alto (totale,
  n. spese, media per spesa, categoria principale escluse «Altre»/«Senza categoria»), grafico con legenda
  affiancata (colore, importo, %; «<1%» invece di 0%), «Dettaglio per periodo» con i soli periodi che hanno
  spese e «Mostra tutto il periodo». Stato vuoto esplicito.
- **Categorie**: elenco in primo piano (max 720), creazione in pannello laterale (≥1024) o a scomparsa
  («Nuova»), ricerca se >8 categorie, conteggio spese per categoria; il dialog di eliminazione dice quante
  spese perdono la categoria (restano registrate: comportamento invariato, nessun dato perso).
- **Difetti reali corretti**: (1) cambiando sezione su una lista lunga la pagina saltava in fondo: Paper
  `Menu` montato chiuso mette il focus sul proprio anchor (web) e con un menu per riga vinceva l'ultimo;
  ora un solo `Menu` per elenco ancorato a coordinate (`ExpenseList`); (2) icone decorative dei campi esposte
  come pulsanti (`FieldIcon`); (3) toolbar Dashboard fuori dal viewport su mobile; (4) IconButton/Button
  <48 px nelle azioni principali.
- Nessuna ombra aggiunta (FAB `flat`), nessuna dipendenza. `tests/theme.test.ts`: contrasti AA dei token
  (testo ≥4,5:1, bordi ≥3:1, entrambi i temi) e classi di finestra.

### Verifiche (UI)

Ambiente isolato: emulatori Auth 9399/Firestore 8480, progetto `demo-nummo`, config temporanea nella
radice (rimossa), dati demo di prova; i processi dell'utente (8180, 4000, 8081, 8280) non sono stati toccati.
**Attenzione, scoperta durante il lavoro:** in sviluppo `expo/virtual/env` fonde `.env.local` *sopra*
`process.env` (anche con `EXPO_NO_DOTENV=1` Metro lo include): `expo start` con
`EXPO_PUBLIC_NUMMO_BACKEND=emulator` avrebbe usato il progetto reale `nummo-6b6e2`. Per i test sono stati usati
build di produzione (`expo export` con `EXPO_NO_DOTENV=1`) in una cartella temporanea, controllando che il
bundle non contenesse chiave/progetto reali, serviti in locale; Chromium headless con profilo temporaneo e rete
confinata al loopback (il popup Google tenta `apis.google.com`: bloccato, sessione dell'emulatore Auth iniettata
in localStorage).

- `npm run check`: typecheck, **95/95** test app, build riusciti.
- Browser, viewport 320×700, 390×844, 430×932, 768×1024, 1280×800, 1600×900: nessun overflow orizzontale
  del documento (24 coppie viewport/sezione); flusso di 21 controlli superato su tutti e 6 (validazione, ricorrenza
  spenta di default e frequenza condizionata, salvataggio con snackbar, ordinamento, filtro categoria, ricerca,
  dialog di eliminazione con annulla/conferma, pannello esporta/importa, categorie: duplicato rifiutato, creazione,
  ricerca, eliminazione, avviso per categoria usata). Tema scuro ispezionato (desktop e mobile). Ordine di tabulazione
  ragionevole.
- **Non eseguito/non verificabile qui**: `test:emulator` (nessun accesso ai dati/Rules modificato); tastiera
  virtuale reale e safe area (la barra sticky usa l'altezza dinamica `dvh`, non provata su dispositivo); download
  reali di CSV/JSON e importazione da file (non toccati, solo pannello aperto); lettori di schermo; dispositivi
  reali; tooltip al passaggio del mouse sulle icone senza testo (hanno solo `aria-label`).
- Residuo: il FAB compatto può coprire in parte l'ultima riga visibile (c'è spazio di scorrimento sotto); lo
  strumento di overflow segnala le etichette interne di Paper `TextInput` (ritagliate, non visibili).

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

## Refactoring UI Material 3 (2 novembre 2026)

Solo frontend: nessuna modifica a backend, Rules, modello dati, auth o logica di
business; nessuna dipendenza aggiunta (resta Paper 5, già MD3). Non committato.

- Token centralizzati in `src/theme/` (`tokens.ts` colori chiaro/scuro menta, spaziatura
  4 px, forme, breakpoint, tipografia Roboto con fallback di sistema; `theme.ts` costruisce
  il tema Paper, i livelli `elevation` mappano i surface-container; `GlobalStyle.tsx` focus
  visibile, `100dvh`, `prefers-reduced-motion`). Roboto non è incluso: usa il font se
  installato, altrimenti il sistema.
- `AppShell`: top app bar + Navigation Bar (<600), Navigation Rail (600–1023), drawer
  permanente (≥1024); contenuto scrollabile nella shell, nessun `position: fixed`,
  safe area, max-width 1200. FAB «Nuova spesa» solo su compatto in Spese/Dashboard.
  `section` resta stato locale di `RemoteWorkspace` (nessun router, come prima).
- Stato sync: `SyncChip` discreto (`syncStatus.ts`, testato); «Sincronizzato» solo con
  dati pronti, online, non da cache e senza scritture pendenti. Snackbar
  (`SnackbarHost`) per esiti temporanei; errori e copie di recupero restano inline.
- Menu account (email + Esci), tema nella top bar. Eliminazioni con dialog di conferma
  (`DeleteDialog`/`DeleteAction`); su compatto le righe spesa usano il menu «Azioni».
- Categorie su due colonne (≥1024), anteprima/scelta icona, modifica inline di nome e
  icona (le due operazioni restano separate: ognuna con la propria revisione attesa).
- Verifica: `npm run check` (typecheck, 91+2 test app, build). Chromium headless via CDP
  su build demo (emulatori su porte alternative, poi fermati) a 360/390/768/1024/1440/
  1920 px, chiaro e scuro, 4 sezioni: nessuno scroll orizzontale; flussi spesa/categoria/
  account/elimina/modifica ok a 390 px. Non eseguito `test:emulator` (nessun accesso
  ai dati modificato). Palette grafici non rivalidata con lo script dataviz sulle nuove
  superfici. Contrasto controllato a campione, non con uno strumento WCAG.
- **Nuova spesa rifatta** (stesso giorno): colonna singola max 640 px, nessuna centratura o
  altezza forzata; Importo con icona € sempre visibile e Descrizione con contatore discreto;
  helper solo sugli errori; categoria obbligatoria solo nel modulo (dominio invariato);
  ricorrenza spenta all'avvio, nessuna frequenza preselezionata, segmented button.
  Icone categoria: glifi vettoriali (`categoryGlyphs.ts`, `CategoryGlyph`) al posto degli
  sprite pixel-art (rimossi `pixelIcons.ts`/`PixelIcon`; ID e Rules invariati). Drawer più
  compatto (248 px, voci da 48). Messaggio dominio: «Inserisci la descrizione.».
  Verifica: `npm run check` (90 test, build), Chromium su build demo/emulatori locali a
  360/390/768/1280/1920 px chiaro+scuro, errori di validazione e segmented button a 390 px.
- Osservazione: in dev (`expo start`) Metro ha servito `EXPO_PUBLIC_NUMMO_BACKEND=firebase`
  dal `.env.local` nonostante la variabile `emulator` nella shell; per le prove ho usato
  `EXPO_NO_DOTENV=1` con `expo export`. Verificare cosa fa `npm run dev` in questo checkout.

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
