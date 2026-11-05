# HANDOFF — Nummo BYOF

Aggiornamento: 5 novembre 2026 (dopo piano prezzi e ritocchi UI). Branch `backend-firebase` (non pubblicato né unito a `main`).
Ultimo commit: il commit «piano prezzi ricorrenze e ritocchi UI» (5 nov), sopra `0a3e0fb` (docs/studio logo),
`3ca98bd` (impostazioni di aspetto, Google Sans), `8e1fa0a` (UI/UX M3), `b77e1db` (migrazione Firestore),
`fe759d5` (ultimo col vecchio backend). Architettura e comandi: `AGENTS.md`; decisioni: `docs/architecture.md`;
migrazione: `docs/migrazione-byof.md`.

## Stato implementato

App web con Google Auth e Cloud Firestore personale (BYOF). Nessun backend dello sviluppatore,
Sheets o Functions nel percorso attivo (rimossi il 2 nov 2026; recuperabili da `fe759d5`:
il foglio non è mai stato reale, `SHEET_ID=emulator`).

- Spese e categorie da listener SDK; UUID, centesimi, data civile Europe/Rome, timestamp server.
  Occorrenze ricorrenti calcolate, non salvate. Modifica serie = tutte le occorrenze, tranne il prezzo
  (vedi sotto).
- Rules: proprietario in `config/owner`, solo provider Google, validazione campi/importi/date/
  revisioni, indice `categoryNames` in transazione. Conflitti di revisione espliciti.
- Offline: coda SDK, UI distingue cache/connessione/pending, nessun falso successo. Cache disco
  opt-in (`EXPO_PUBLIC_FIRESTORE_CACHE=persistent`), altrimenti memoria.
- Logout attende le scritture (timeout 5 s → sessione resta attiva). Copia di recupero in memoria
  dei pending rifiutati, da scaricare prima di uscire.
- Backup: CSV (BOM, CRLF, anti-formula) e JSON solo da snapshot server senza pending. Migrazione
  esplicita dei vecchi dati localStorage (anteprima, preflight, gruppi ripetibili, originali intatti);
  ricorrenze locali senza data restano solo nel backup grezzo.
- UI Material 3: token in `src/theme/`, `AppShell` (barra <600, rail 600–1023, drawer ≥1024), 3
  destinazioni + FAB «Nuova spesa», `SyncChip`, snackbar, dashboard con KPI/legenda, categorie con
  conteggi, glifi SVG categoria.
- Uniformità componenti (3 nov): `radius`/`paperRoundness`/`inputOutline`/`layout` in
  `tokens.ts`; `components/Button` (altezza 48) e `ListRow`/`IconTile` (riga unica di Spese e Categorie,
  `divider`); nessun tetto di larghezza sull'area principale; Nuova spesa su due colonne (expanded);
  Categorie = card a larghezza piena con «Nuova categoria» in alto; `layout.fieldBoxHeight` (50 dp)
  allinea ricerca e `MenuSelect`. `SplitLayout` creato e poi rimosso.

- Impostazioni (3 nov): menu account → «Impostazioni» (tema Sistema/Chiaro/Scuro,
  Monocolore o Palette, 6 colori: Menta predefinito, Blu, Viola, Rosa, Ambra, Grafite; carattere Google
  Sans o Sistema; «Ripristina»). Font variabile 400–700 ospitato in `public/fonts/` (sottoinsiemi latin e latin-ext, ~58 KB;
  predefinito: Google Sans). Un valore salvato `roman` (versioni precedenti) torna al predefinito.
  Icone UI e glifi categoria a linea sottile (1,5 invece di 2) via `iconStroke`; aggiunta l'icona
  `settings`; i glifi non sono stati ridisegnati, solo alleggeriti. Le icone categoria nei tile usano
  `tertiaryContainer` (neutro in monocolore, colorato in palette). Il tema nella barra superiore resta e
  scrive la stessa preferenza.

- Piano prezzi ricorrenze (5 nov): prezzo fisso, promozionale («dopo N rinnovi»),
  modifica «solo prossimo rinnovo» / «tutti i futuri» senza toccare i pagamenti maturati, card «Prossimi
  rinnovi» con previsti separati dagli effettivi. Modello e limiti: `docs/architecture.md`. Codice:
  `src/domain/pricing.ts`, `PriceSchedule.tsx`, `ExpenseEditor.tsx`, `UpcomingRenewals.tsx`, Rules.

- UI 5 nov: logo SVG (`Logo.tsx`, colore `primary`) al posto della N; nome 26 px; titoli pagina 32 px bold;
  Nuova spesa su due colonne (Importo, Descrizione, Data | Categoria, ricorrenza), form max 720 px; data = chip
  Oggi/Ieri/«Altra data» (il campo compare solo al tocco); chip 44 dp su mobile. Verificato in Chromium
  headless su una pagina di prova con dati finti (360–1440 px), non con login/emulatori. Avviso console residuo:
  `useNativeDriver` di Paper/RNW. Il file `logo` nella radice è la sorgente fornita dall'utente.

## Decisioni da ricordare

- Un solo `Menu` Paper per elenco, ancorato a coordinate (`ExpenseList`): un `Menu` per riga sposta il
  focus all'ultima riga al cambio sezione.
- `expo/virtual/env` fonde `.env.local` sopra `process.env`: `expo start` con backend `emulator` può
  usare il progetto reale. Per prove isolate: `expo export` con `EXPO_NO_DOTENV=1`, output fuori dal repo,
  controllo del bundle (vedi `AGENTS.md`).
- Importazione atomica per gruppo, non per archivio; letture/backup caricano collezioni intere.
- Nessuna dipendenza aggiunta; nessun downgrade forzato per `npm audit`.

## Verifiche (ultima esecuzione, 5 nov 2026)

- Piano prezzi: `npm run check` ok (**156/156** test app, 15 nuovi in `tests/pricing.test.ts`: fisso, promo,
  una tantum, tutti i futuri, storico, previsioni, validazione, CSV). `test:emulator` **11/11** su porte
  alternative (Auth 9299, Firestore 8380; config temporanea rimossa), incl. un test Rules sul piano prezzi.
  **Non verificate visivamente** le nuove schermate (campo promo, modifica serie, card «Prossimi rinnovi»).

- `npm run check` (5 nov, con `EXPO_NO_DOTENV=1 EXPO_PUBLIC_NUMMO_BACKEND=emulator`): typecheck ok, **141/141**
  test app (incl. contrasti AA di 24 combinazioni accento/modalità/tema, parsing preferenze), build ok.
- Impostazioni: verificata in Chromium headless solo la schermata di accesso (font caricato, icone sottili).
  **Non verificati visivamente**: dialog Impostazioni, palette/colori in tutte le schermate, tema scuro con i
  nuovi schemi, grafici con il nuovo font.
- `test:emulator`: ultima esecuzione registrata 2 nov, **10/10** (Auth 9299, Firestore 8380, `demo-nummo`);
  **non rieseguito** dopo (nessun accesso dati/Rules toccato dai commit successivi).
- Browser (Chromium headless, build demo con emulatori su porte alternative, popup Google simulato):
  2 nov, 6 viewport 320–1600 px, nessun overflow orizzontale, flusso di 21 controlli, tema chiaro/scuro.
  3 nov: screenshot 390/820/1440 px su harness temporaneo con dati finti (poi rimosso), non con Auth/dati reali.
- Offline/due schede/migrazione/recupero: verificati il 2 nov su emulatori con Chromium (dettagli in
  `docs/progress.md`). Login Google reale con emulatore persistente: dichiarato riuscito dall'utente,
  non ripetuto dall'agente.
- `npm audit`: 29 segnalazioni (25 moderate, 4 alte, catena `@grpc/grpc-js`/Firestore), non risolte.
- Nessun lint nel progetto. Nessun confronto screenshot prima/dopo.

## Problemi aperti e limiti

1. Non verificati: Firestore cloud reale (CRUD/Rules), OAuth mobile, Android/iOS, Safari/Firefox/Edge,
   Node LTS, scadenza/revoca token, storage negato/private browsing, lettori di schermo, tastiera
   virtuale e safe area (barra sticky con `dvh`), download/import reali di file dal pannello UI,
   tooltip sulle icone senza testo.
2. Solo web: nessuna PWA/service worker/avvio a freddo offline; crash dell'intero browser non collaudato.
3. La copia di recupero vive in memoria e riguarda solo pending osservati; storage cancellato può
   perdere dati non confermati.
4. JSON importabile fino a 5 MB nella UI; export non è snapshot atomico tra collezioni.
5. Nessuna prova con un Google Sheet reale (formato non disponibile): non inferire compatibilità.
6. Palette dei grafici non rivalidata con la skill dataviz sulle nuove superfici; contrasti token testati
   (`tests/theme.test.ts`), non l'intera UI. Il FAB compatto può coprire parte dell'ultima riga.
7. Senza `EXPO_PUBLIC_NUMMO_BACKEND` il default è `firebase`; `dev:cloud`, `build` ed `expo start` diretto
   leggono `.env.local`, che in questo checkout punta all'emulatore 8180: una build cloud richiede un
   ambiente senza quella variabile.
8. Il 5 nov nessuna porta emulatore (8180/8280/8380/9099/9299) risultava in ascolto.

## Prossimi passi (priorità)

### Studio logo (3 novembre 2026, in attesa di selezione dell'utente)

- Seconda esplorazione: l’utente non è convinto di Nastro e richiede dieci icone che
  combinino Spicchio e Moduli, anche suggerendo una n. Set in
  `docs/design/logo-concepts/hybrids-10/`: 10 simboli SVG in tre varianti cromatiche,
  tavola comparativa PNG/SVG e ZIP. Nessuna selezione definitiva; UI invariata.
  Tavola ispezionata e SVG validati; `npm run check` rieseguito: 141/141 test, typecheck
  e build superati, con env demo e dotenv disabilitato.
- Primo giro (committato in `3ca98bd`): tre concept SVG in `docs/design/logo-concepts/`: Nastro, Spicchio e Moduli; simbolo e
  versione con nome, ciascuno chiaro/scuro/monocromatico. `comparison.svg` e `comparison.png`
  mostrano il confronto e le prove 16/24/32 px; analisi e motivazioni nel README della cartella.
- Nessuna modifica alla UI né sostituzione degli asset esistenti. Attendere la selezione
  dell’utente prima di affinare e integrare. Nessuna nuova decisione architetturale.
- Rendering della tavola ispezionato; SVG verificati. `npm run check` superato con
  `EXPO_NO_DOTENV=1 EXPO_PUBLIC_NUMMO_BACKEND=emulator` (typecheck, test app, build).
  Nessuna prova cloud/dispositivi; nessun accesso dati/Rules modificato.

- Dopo la selezione: affinare e integrare il marchio (oggi `AppShell` usa una N in tile 36 px), su richiesta.

### Attività applicative

0. Revisionare in browser il piano prezzi (nuova spesa con promo, modifica serie, previsioni), poi committare
   su richiesta; ripubblicare le Rules dove già distribuite.

1. Prova visiva con login reale/emulatore persistente delle nuove schermate (Spese, Nuova, Categorie).
2. Collaudo cloud personale (manuale, con autorizzazione): abilitare Firestore e Google Auth, creare
   `config/owner`, pubblicare le Rules, build con env pulita; poi provare su dispositivi reali.
3. Aggiornare le dipendenze vulnerabili in una fase dedicata, senza `--force`.
4. Se serve scala: paginazione delle letture e snapshot di backup più robusto.
5. Prima di una versione mobile/PWA: rendere esplicito il default del backend (punto 7) e pianificare
   manifest/service worker.

## Avvio e passaggi manuali

Guida completa: `docs/firebase-personale.md`.

```sh
npm run emulators          # terminale 1 (preservare eventuali vecchi dati)
npm run emulators:seed     # terminale 2
npm run dev                # demo locale, ignora la configurazione reale
```

Login Google reale con DB locale persistente:

```sh
npm run emulators:real
npm run emulators:seed:owner -- ID_PROGETTO UID_PROPRIETARIO
npm run dev:firebase
```

L'UID proprietario è quello dell'account Google (Console → Authentication), mai nei file versionati
(in questo checkout coincide con `ALLOWED_UID` di `functions/.env.nummo-6b6e2`, ignorato). `emulators:real`
importa da `emulator-data/` e riesporta all'arresto: i dati sopravvivono **solo con arresto pulito**
(un solo Ctrl+C, attendere «Export complete»). Nessun documento è stato creato nel progetto cloud reale;
deploy, Blaze e servizi aggiuntivi restano manuali.
