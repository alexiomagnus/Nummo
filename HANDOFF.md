# HANDOFF — Nummo BYOF

Aggiornamento: 5 novembre 2026. Branch `backend-firebase` (non pubblicato né unito a `main`).
Ultimo commit: `9ba1665` «rimuove adapter localStorage e rifinisce la UI», sopra `e2b84d3` (Swiss minimalism, calendario, icone)
(sopra `390f9e2` piano prezzi, `0a3e0fb` studio logo, `3ca98bd` impostazioni di aspetto, `8e1fa0a` UI M3,
`b77e1db` migrazione Firestore, `fe759d5` ultimo col vecchio backend).
Le modifiche successive a `e2b84d3` (rimozione adapter localStorage, ritocchi UI, documentazione) sono nel commit
`9ba1665`, pubblicato su `backend-firebase` e unito a `main`. Architettura e comandi: `AGENTS.md`; decisioni:
`docs/architecture.md`; migrazione: `docs/migrazione-byof.md`; guida utente: `docs/firebase-personale.md`.

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

Eseguite il 5 nov 2026 (Node 26.13, Java 21):
- `EXPO_NO_DOTENV=1 EXPO_PUBLIC_NUMMO_BACKEND=emulator npm run check`: typecheck ok, **138/138** test app, build
  ok (478 moduli). Il calo da 156 è dovuto alla rimozione dei test degli adapter localStorage.

Non rieseguite oggi / non verificate:
- `test:emulator`: ultima esecuzione registrata **11/11** (porte alternative 9299/8380, config temporanea poi
  rimossa) prima dei ritocchi UI e della pulizia; Rules e accesso dati non toccati dal working tree. Oggi le porte
  4000 e 8180 sono occupate dagli emulatori dell'utente (non fermati), quindi non rieseguito.
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
6. Senza `EXPO_PUBLIC_NUMMO_BACKEND` il default è `firebase`; `dev:cloud`, `build` ed `expo start` diretto leggono
   `.env.local`, che in questo checkout punta all'emulatore 8180: una build cloud richiede un ambiente pulito.
7. Chi aveva dati nel vecchio localStorage non ha più un percorso di migrazione in app (vedi sopra).

## Prossimi passi (priorità)

1. Revisione visiva in browser (412×915 e desktop) di tutte le schermate toccate dal 3 al 5 nov, con emulatore
   persistente e login reale; correggere ciò che emerge. Poi committare **su richiesta** il working tree.
2. Rieseguire `npm run check` e `test:emulator` (porte alternative se 8180/9099 sono occupate) prima del commit;
   ripubblicare le Rules dove già distribuite (icone e piano prezzi).
3. Collaudo cloud personale (manuale, con autorizzazione): abilitare Firestore e Google Auth, creare
   `config/owner`, pubblicare le Rules, build con env pulita; poi dispositivi reali.
4. Aggiornare le dipendenze vulnerabili in una fase dedicata, senza `--force`.
5. Se serve scala: paginazione delle letture e snapshot di backup più robusto.
6. Prima di mobile/PWA: rendere esplicito il default del backend (limite 6) e pianificare manifest/service worker.

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
npm run dev:firebase
```

L'UID proprietario è quello dell'account Google (Console → Authentication), mai nei file versionati (in questo
checkout coincide con `ALLOWED_UID` di `functions/.env.nummo-6b6e2`, ignorato). `emulators:real` importa da
`emulator-data/` e riesporta all'arresto: i dati sopravvivono **solo con arresto pulito** (un solo Ctrl+C,
attendere «Export complete»). Nessun documento è stato creato nel progetto cloud reale; deploy, Blaze e servizi
aggiuntivi restano manuali.
