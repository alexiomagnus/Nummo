# HANDOFF — Nummo BYOF

Aggiornamento: 5 novembre 2026. Branch `main` (= `origin/main`, `6a1466b`); `backend-firebase` remoto fermo a `b440e59`.
Ultimo commit: `refactor(config): separa gli ambienti emulator, hybrid e cloud` (riassetto ambienti Firebase; hash in
`git log -1`, non pubblicato), sopra `6a1466b` «center content in AppShell for mobile view when using fab»
(centraggio verticale di «Nuova spesa» su smartphone, non verificato visivamente), `26a910f`, `00acb4a` (pannello chiaro),
`b440e59`, `9ba1665` (rimozione adapter localStorage), `e2b84d3` (Swiss minimalism), `390f9e2` piano prezzi, `3ca98bd`
impostazioni di aspetto, `8e1fa0a` UI M3, `b77e1db` migrazione Firestore, `fe759d5` ultimo col vecchio backend.
Working tree pulito dopo il commit; push non eseguito. Nessuna modifica a UI o logica applicativa nel riassetto.
Architettura e comandi: `AGENTS.md`; decisioni: `docs/architecture.md`; migrazione: `docs/migrazione-byof.md`;
guida utente: `docs/firebase-personale.md`.

## Stato implementato (verificato su codice e test)

App web con Google Auth e Cloud Firestore personale (BYOF). Nessun backend dello sviluppatore, Sheets o
Functions nel percorso attivo (rimossi il 2 nov; recuperabili da `fe759d5`; il foglio non è mai stato reale).

- **Dati**: spese e categorie da listener SDK; UUID, centesimi, data civile Europe/Rome, timestamp server.
  Occorrenze ricorrenti calcolate, non salvate. Conflitti di revisione espliciti. Rules: proprietario in
  `config/owner`, solo Google, validazione campi/importi/date/revisioni, indice `categoryNames`.
- **Offline/sessione**: coda SDK; UI distingue cache/connessione/pending (`SyncChip`). Cache disco opt-in.
  Logout attende le scritture (timeout 5 s → sessione resta attiva); copia di recupero in memoria dei
  pending rifiutati, da scaricare prima di uscire.
- **Backup**: export CSV (BOM, CRLF, anti-formula) e JSON solo da snapshot server senza pending; importazione
  esplicita da file JSON (≤ 5 MB, anteprima, preflight, gruppi ripetibili, originali intatti).
- **Piano prezzi ricorrenze**: prezzo fisso o promozionale («dopo N rinnovi»), modifica «solo prossimo
  rinnovo»/«tutti i futuri» senza toccare i pagamenti maturati; card «Prossimi rinnovi» (previsti ≠ effettivi).
  `src/domain/pricing.ts`, `PriceSchedule.tsx`, `UpcomingRenewals.tsx`, Rules.
- **UI** (Swiss minimalism su base Material 3): `AppShell` (barra <600, rail 600–1023, drawer ≥1024), 3
  destinazioni + FAB; contenuto centrato fino a `maxContent` 1440; `Card` piatta, `PageHeader` senza
  sottotitolo, raggi 8/12; logo/«Nummo» porta a Nuova spesa. `ExpenseFields` condiviso da Nuova spesa e modale
  Modifica (colonna unica; due colonne da 600 px nella pagina): Importo + Data (`DateField`, calendario senza
  dipendenze, 2000-01-01…oggi), Descrizione, Categoria (obbligatoria), Ricorrente. Categorie in riga unica
  Nome · Icona · Aggiungi; **54 glifi** categoria (`category.ts`, `categoryGlyphs.ts`, Rules). Dashboard:
  totale grande + statistiche, tabella dettaglio chiusa. Spese: filtri, riepilogo, azioni di riga a icone.
- **Impostazioni** (menu account): tema Sistema/Chiaro/Scuro, Monocolore o Palette (6 tinte: Menta predefinita,
  Blu, Viola, Rosa, Ambra, Grafite), carattere Google Sans (`public/fonts/`) o Sistema, «Ripristina».
- **Ambienti Firebase** (5 nov): `EXPO_PUBLIC_NUMMO_BACKEND` = `emulator` (`npm run dev`, demo),
  `hybrid` (`dev:hybrid`: Google reale + Firestore localhost, config da `.env.local`) o `cloud` (`build:cloud`, produzione).
  Nessun default: assente, ignoto o il vecchio `firebase` bloccano l'avvio con messaggio. Rimossi `dev:emulator`, `dev:firebase`,
  `dev:cloud`, `build`; aggiunti `build:cloud`, `build:demo`, `preview:cloud`, `check:env`. `.env.local` (sviluppo) contiene solo le
  4 variabili `EXPO_PUBLIC_FIREBASE_*` (ho tolto da questo checkout le due righe backend/emulatore); la produzione usa
  `.env.production.local` (da creare, ignorato) o la shell; `build:cloud` imposta `cloud` da sé. Dettagli e motivazioni: `AGENTS.md`, `docs/architecture.md`.
- **Ultimi ritocchi UI (5 nov, `00acb4a`, `26a910f`)**: pagine su pannello arrotondato appena più chiaro
  (`colors.panel`, `panelColor()` in `theme.ts`; assente su smartphone); Nuova spesa mobile a colonna senza pannello
  né barra; righe di Spese con contorno; `MenuSelect` con righe proprie e spunta fissa; Dashboard: dettaglio sul
  periodo corrente, il resto a richiesta; hitbox di Ricorrente/cestino/Annulla/Salva. Non verificati nel browser dall'agente.
- **Ritocchi UI del 5 nov sera** (visti a schermo dall'utente): titoli pagina 34 px (`PageHeader`; «Nuova spesa» abbassata con `lowered`); dialog elimina categoria senza virgolette né testo, pulsanti 40 dp; spunta dei `MenuSelect` più distante; hover di navigazione e legenda dashboard pari all'area colorata; tolti «Si ripete…», «Scegli la frequenza.» e «(+N)»; più spazio sopra «Prezzo promozionale» e «Salva». Inoltre: `StateLayerPressable` con `bleed` (layer hover/pressed oltre l'elemento, usato
  nelle voci di navigazione); logo senza layer né anello di focus; spaziatura voci rail/drawer `lg`;
  Impostazioni con titolo bold, azioni più alte, senza linee dell'area scorrevole; chip/segmenti con più spazio
  dopo la spunta; rimossi `categoryStorage.ts`, `expenseStorage.ts`, `tests/expenseStorage.test.ts`, il pannello
  «Dati del browser» e il codice di migrazione localStorage (`tests/category.test.ts` ridotto al dominio;
  recuperabili dal commit `e2b84d3`). Le palette extra provate in precedenza sono state tolte (restano le 6 originali).

## Decisioni da ricordare

- Un solo `Menu` Paper per elenco, ancorato a coordinate (`ExpenseList`): un `Menu` per riga sposta il focus.
- `expo/virtual/env` fonde `.env.local` sopra `process.env`: `expo start` con backend `emulator` può usare il
  progetto reale. Prove isolate: `expo export` con `EXPO_NO_DOTENV=1` (vedi `AGENTS.md`).
- Importazione atomica per gruppo, non per archivio; letture/backup caricano collezioni intere.
- Nessuna dipendenza aggiunta; nessun downgrade forzato per `npm audit`.
- Nella modale Modifica di una serie, l'indice dei rinnovi del piano prezzi resta riferito alla data originale.

## Verifiche

Eseguite il 5 nov 2026 (Node 26.13) sul working tree attuale:
- `npm run check` (ora senza variabili esterne): typecheck ok, **142/142** test app, `build:demo` ok in `dist-demo/`
  (nessun `127.0.0.1:8180` nel bundle). I test sono saliti da 138 con quelli di `backendConfig` e `envPolicy`.
- Con un `.env.production.local` **temporaneo e finto** (poi rimosso): `check:env` non lo considera; `build:cloud` rifiuta
  backend ≠ cloud nel file o nella shell, endpoint emulatore e conflitti file/shell, e riesce con il solo set di 4 variabili.
- `npm run check:env`: ok su `.env.local` pulito; con un `.env.development` temporaneo contenente un endpoint emulatore
  si ferma con errore (poi rimosso).
- `build:cloud` con **configurazione finta** (progetto `fake-proj`, nessun accesso di rete a Firebase): rifiuta variabili
  mancanti e `EXPO_PUBLIC_FIRESTORE_EMULATOR`; con 4 variabili finte esporta e supera la scansione del bundle. La cartella
  `dist/` di prova è stata eliminata: **non esiste ancora una build cloud reale**.
- Prova preliminare: `expo export` con `EXPO_NO_DOTENV=1` non incorpora `.env.local` (con la vecchia riga emulatore: 0 occorrenze).

Non rieseguite oggi / non verificate:
- `test:emulator`: ultima esecuzione registrata **11/11** (porte alternative 9299/8380, config temporanea poi
  rimossa) prima dei ritocchi UI e della pulizia; Rules e accesso dati non toccati dal working tree. Riverificato a fine giornata: le porte
  4000 e 8180 risultano in ascolto dagli emulatori dell'utente (non fermati), quindi non rieseguito.
- **Nessuna verifica visiva nel browser** di: Swiss minimalism, calendario, 32 nuovi glifi, piano prezzi (campo
  promo, modifica serie, «Prossimi rinnovi»), dialog Impostazioni, `bleed`/logo senza anello, tema scuro con
  i nuovi schemi. Ultime prove visive: Chromium headless su pagina con dati finti (360–1440 px, 3–5 nov) e
  flusso su emulatori 2 nov (6 viewport, 21 controlli). Avviso console residuo: `useNativeDriver` di Paper/RNW.
- Login Google reale con emulatore persistente: dichiarato riuscito dall'utente, non ripetuto dall'agente.
- Nessun lint nel progetto. `npm audit`: 29 segnalazioni (25 moderate, 4 alte, catena `@grpc/grpc-js`), non risolte.

## Problemi aperti e limiti

1. Non verificati: Firestore cloud reale (CRUD/Rules), OAuth mobile, Android/iOS, Safari/Firefox/Edge, Node LTS,
   scadenza/revoca token, storage negato/private browsing, lettori di schermo, tastiera virtuale e safe area,
   download/import reali dal pannello UI, tooltip sulle icone senza testo.
2. Solo web: nessuna PWA/service worker/avvio a freddo offline; crash dell'intero browser non collaudato.
3. La copia di recupero vive in memoria e riguarda solo pending osservati.
4. Export non è snapshot atomico tra collezioni; import UI limitato a 5 MB.
5. Palette dei grafici non rivalidata con la skill dataviz sulle nuove superfici; contrasti token testati
   (`tests/theme.test.ts`), non l'intera UI. Il FAB compatto può coprire parte dell'ultima riga.
6. `expo start`/`expo export` lanciati direttamente (senza i comandi npm) non impostano la modalità: l'app mostra
   «configurazione mancante» invece di scegliere un ambiente. `build:cloud` non è stato provato con il progetto reale né
   con `.env.production.local` (assente); `preview:cloud` (`expo serve dist`) non eseguito.
7. Chi aveva dati nel vecchio localStorage non ha più un percorso di migrazione in app (vedi sopra).

## Prossimi passi (priorità)

1. Revisione visiva in browser (412×915 e desktop) di tutte le schermate toccate dal 3 al 5 nov, con emulatore
   persistente e login reale; correggere ciò che emerge. Verificare anche il centraggio di «Nuova spesa» su smartphone (`6a1466b`).
2. Pubblicare il commit del riassetto ambienti (su richiesta); provare `npm run dev` e `dev:hybrid` dal vivo.
   Rieseguire `npm run check` e `test:emulator` (porte alternative se 8180/9099 sono occupate) prima del commit;
   ripubblicare le Rules dove già distribuite (icone e piano prezzi).
3. Collaudo cloud personale (manuale, con autorizzazione), in quest'ordine: (a) Console: Google Auth attivo,
   `localhost` e dominio di pubblicazione tra i domini autorizzati, Firestore Standard in produzione nella regione scelta;
   (b) accesso una volta per ottenere l'UID, creare `config/owner` `{ uid }`; (c) pubblicare solo le Rules
   (`firebase deploy --only firestore:rules --project ID`, richiede `firebase login`); (d) creare `.env.production.local`
   con le 4 variabili (la modalità `cloud` la imposta lo script); (e) `npm run build:cloud`, `npm run preview:cloud`, collaudo
   (login, secondo account rifiutato, spesa, ricarica); (f) scegliere l'hosting; poi dispositivi reali.
4. Aggiornare le dipendenze vulnerabili in una fase dedicata, senza `--force`.
5. Se serve scala: paginazione delle letture e snapshot di backup più robusto.
6. Prima di mobile/PWA: pianificare manifest/service worker (il default del backend ora è esplicito: nessun fallback).

### Studio logo (in attesa di selezione dell'utente)

`docs/design/logo-concepts/`: tre concept (Nastro, Spicchio, Moduli; commit `3ca98bd`) e `hybrids-10/` (10 ibridi
Spicchio+Moduli, anche con «n»; tavola comparativa e ZIP). L'utente non era convinto di Nastro; nessuna selezione
definitiva. L'app usa già un `Logo.tsx` SVG (sorgente fornita dall'utente: file `logo` nella radice), quindi
l'integrazione di un nuovo marchio è da fare solo su richiesta, dopo la scelta.

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
npm run dev:hybrid
```

L'UID proprietario è quello dell'account Google (Console → Authentication), mai nei file versionati (in questo
checkout coincide con `ALLOWED_UID` di `functions/.env.nummo-6b6e2`, ignorato). `emulators:real` importa da
`emulator-data/` e riesporta all'arresto: i dati sopravvivono **solo con arresto pulito** (un solo Ctrl+C,
attendere «Export complete»). Nessun documento è stato creato nel progetto cloud reale; deploy, Blaze e servizi
aggiuntivi restano manuali.
