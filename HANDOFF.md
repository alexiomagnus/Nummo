# HANDOFF — Nummo

Aggiornamento: **8 novembre 2026, sera (Europe/Rome)**. Gestionale personale di spese solo web, Google Auth e
Firestore BYOF, accesso riservato all'UID in `config/owner`. Contesto stabile, architettura e comandi: `AGENTS.md`;
motivazioni: `docs/architecture.md`; configurazione: `README.md`, `docs/firebase-personale.md`.
Questo file descrive il checkout: risultati emulati non certificano cloud, dispositivi reali o pubblicazione.

## Git

- Ramo `main`, HEAD **`5a42ef1`** (8 novembre 2026, 21:41 +01:00), allineato al riferimento locale `origin/main`
  (nessun fetch: stato remoto non verificato).
- **Non committato:** dettaglio lista (`ListsPage.tsx`), «Totale spesa» e «Registra spesa» sulla stessa riga come
  «Aggiungi prodotto», senza riquadro né rientro (anche su mobile). `npm run check` OK (303/303, build demo);
  resa nel browser non verificata.
- Commit recenti: `5a42ef1` pagina Importa ed esporta, ritocchi Dashboard/Fondi/Liste, backup fittizio standard;
  `296407b` liste della spesa, backup v4, Dashboard informativa, backup fittizio limite; `85fb9aa` fondi e budget,
  icone a tema denaro; `96777ac` transizioni e ricerca abbonamenti; `112ebcb` stati abbonamenti, backup v2, tre stili
  icone, predefiniti, avvio. I titoli dei commit non descrivono interamente il contenuto.
- HEAD traccia ancora `.nummo-hybrid-12312.json` (config temporanea del runner, non coperta da `.gitignore`).

## Funzionalità implementate (riscontro nel codice)

- **Sessione:** login Google popup, logout dopo scritture pendenti, isolamento per UID, avatar con fallback, errori
  `auth/...` validati IT/EN; guida pubblica `#guida`.
- **Spese:** CRUD con UUID stabile, conferma server, revisioni e conflitti espliciti, verifica degli esiti incerti,
  copie di recupero in memoria, bozza conservata tra sezioni. Pagina Spese a due viste: «Spese» (singole, ricerca,
  filtro categoria, ordinamento, raggruppamento mensile) e «Pagamenti ricorrenti» (serie, ricerca normalizzata,
  stati Attivo/In pausa/Annullato, storico pagamenti, prossimi rinnovi). Ricorrenze settimanali/mensili/annuali con
  fino a otto variazioni di prezzo per numero di rinnovo; i pagamenti maturati non vengono mai riscritti.
- **Categorie:** pagina dal menu account (sotto Impostazioni) o dal modulo; nomi unici, 45 icone in tre stili
  (minimale, colorato, pixel); cinque predefinite su archivio vuoto confermato dal server.
- **Fondi e budget** (destinazione «Fondi»): saldo iniziale, ricarica mensile calcolata, budget mensile con eccezioni,
  entrate e trasferimenti immutabili, archiviazione, fondo predefinito per browser, mesi navigabili
  effettivo/previsione, selettore fondo nel modulo, assegnazione esplicita delle spese «Senza fondo».
- **Liste della spesa** (destinazione «Liste»): crea/rinomina/duplica/elimina, checklist con salvataggio automatico,
  «Registra spesa» in transazione (una spesa con `list_id`/`list_items`, lista archiviata, non acquistati spostabili
  in nuova lista); eliminare la spesa riattiva la lista. Limite 100 prodotti per lista solo lato client.
- **Dashboard:** periodi mese corrente/precedente, 3/6/12 mesi; riepilogo con date del periodo (confronto globale col
  periodo precedente rimosso; resta la variazione per categoria nelle righe Barre); Ciambella (centro vuoto, dettagli al passaggio/
  selezione), Blocchi treemap senza testo nelle tessere con pannello dettagli, Barre complete ordinate per spesa;
  dettaglio transazioni per categoria con conteggio; andamento giornaliero SVG con selezione del giorno (nessuna
  apertura delle transazioni del giorno). Preferenza `ranking` legacy migrata a `bars`.
- **Importa ed esporta** (menu account, sotto Categorie): CSV di sola consultazione; JSON `nummo-backup` **v4** unico
  ripristino (lettori storici per le versioni precedenti), anteprima su una riga, unione senza sovrascritture,
  sostituzione confermata con copia automatica, esiti in snackbar.
- **Shell/UI:** Material 3 adattiva, quattro destinazioni + «Nuova spesa» (modulo desktop compatto ≥1024 dp),
  temi/tinte, IT/EN senza rimontare sessione o bozze, tastiera virtuale gestita, transizioni con riduzione movimento.
- **Collaudo:** `docs/testing/` con due backup fittizi v4 (casi limite; spese standard prefissate `Demo ·`) e guida
  ai risultati attesi. Da importare preferibilmente nella demo.

## Decisioni tecniche recenti (dettagli in `docs/architecture.md`)

- Ricariche dei fondi calcolate dal piano come le occorrenze, mai documenti: niente duplicati tra dispositivi né
  migrazioni automatiche; spese esistenti senza `fund_id` restano «Senza fondo».
- Liste e prodotti con scritture semplici «ultima vince» (uso offline in negozio tramite coda SDK); l'unica scrittura
  economica è la registrazione transazionale.
- Backup v4 aggiunge fondi, movimenti, liste; piani e `status_changes` stringhe compatte in Firestore per il budget
  di espressioni delle Rules, array nel backup.
- Pagina Importa ed esporta montata nascosta fuori pagina per conservare anteprima e operazioni in corso.

## Problemi aperti e limitazioni

- **Rules cloud non allineate:** ultima pubblicazione registrata il 6 novembre 2026 (`a30a988`). Le Rules locali
  successive (stati abbonamenti, fondi/movimenti/`fund_id`, liste/`list_id`, icone `wallet`/`bank`/`cash`/`safe`/
  `growth`) non risultano pubblicate: in cloud queste scritture verrebbero rifiutate («Accesso negato»). Pubblicare
  solo con autorizzazione e **prima** di distribuire la build. Stato cloud non riverificato in questa revisione.
- **Compatibilità icone:** decoder/import rifiutano ID rimossi (`receipt`, `phone`, `bed`, `ticket`, `briefcase`,
  `droplet`, `wrench`, `pill`, `book`, `plane`, `scissors`, `baby`, `flame`, `wine`, `umbrella`, `leaf`, `shield`,
  `ellipsis`; verificato che non sono in `categoryIcons`). Vecchi record possono bloccare categorie e backup;
  presenza nei dati personali non verificata, nessun adapter.
- **Rules:** budget di 1000 espressioni stretto (rimisurare a ogni nuovo controllo sulle spese); non verificano
  esistenza di fondo/lista referenziati, unicità dei nomi di fondo (solo client), ordine/date degli stati.
- **Fondi:** eliminazione basata sui dati caricati (concorrenza → spese orfane, non perse); cambiare fondo a una serie
  sposta anche i pagamenti passati; fondo predefinito non sincronizzato tra browser.
- **Liste:** spunte simultanee su due dispositivi: prevale l'ultima; nomi non unici; lista archiviata non modificabile.
- **Backup/concorrenza:** nessuno snapshot globale né atomicità dell'intero ripristino; piano di sostituzione
  ricalcolato senza nuova anteprima. Client precedenti non leggono backup più recenti.
- **Guida/avvio:** `warmUpServices()` parte da `App.tsx` anche su `#guida`: assenza di traffico Firebase non garantita.
- **UI mobile (diagnosi storiche non riverificate):** menu Categoria che allarga il viewport o copre la pillola, scroll
  annidato nei menu bassi, etichetta «Dashboard» troncata a 320 px, Nuova spesa in landscape aperta scorsa.
- Nessun service worker né avvio offline a freddo; cache persistente non cancellata al logout; collezioni caricate
  integralmente. Licenza assente; audit dipendenze non aggiornato. Nessun lint configurato.
- Richieste pregresse senza contesto sufficiente (scritta «minimale» senza testo, colori attivi mobile/rail): chiarire
  con l'utente prima di intervenire.

## Verifiche

**Eseguite in questa revisione** su HEAD `5a42ef1` pulito, dipendenze già installate, Node 26.13.0, npm 12.2.2, Java 21.0.13:

| Comando | Esito |
| --- | --- |
| `npm run check` | **OK**: typecheck, **303/303** test, export demo `dist-demo/` (488 moduli, bundle 2,4 MB). |
| `git diff --check` | **OK**. |
| `AUTH_PORT=39099 FIRESTORE_PORT=39280 npm run test:emulator -- --config .nummo-docs-review.json` | **15/15** (SDK/Rules, CRUD, conflitti, stati, fondi, liste, import v4). Config temporanea in radice, UI disattivata, rimossa dopo la suite; emulatori dell'utente su 8180/4000 non toccati. |
| `npm run test:hybrid` | **8/8** (lifecycle runner, Firestore demo reale, Expo simulato). |

**Evidenza delle fasi precedenti (stesso giorno, non ripetuta qui):** Chromium headless su build demo con emulatori
dedicati per fondi, liste, Dashboard, modulo desktop compatto e pagina Importa ed esporta (412×915, 1280×900, 320 px,
IT/EN, chiaro/scuro): nessun overflow o errore JS. Riepilogo/esiti del ripristino, centro ciambella, Blocchi senza
testo e rimozioni di testi verificati solo da typecheck/test/build. Misure d'avvio: `docs/avvio-prestazioni.md`.

**Non eseguiti:** `npm ci`/clone pulito, `check:env`, `check:hybrid`, avvio interattivo dev/demo, build/preview cloud,
dry-run/deploy, audit, browser, import UI dei backup fittizi, dispositivi reali, touch, tastiera virtuale reale,
screen reader, concorrenza tra due dispositivi.

## Prossime attività, per priorità

1. **Rules e compatibilità prima di distribuire** (con autorizzazione): decidere conservazione o migrazione esplicita
   degli ID icona rimossi, con regressioni decoder/import; poi pubblicare le Rules (`--only firestore:rules`,
   `--project ID`) e verificarle in sola lettura; infine valutare `npm run deploy:hosting`.
2. **Collaudo in demo** con i backup di `docs/testing/` (`npm run emulators`, `emulators:seed`, `dev:demo`):
   unione/conflitto/sostituzione v4 dall'interfaccia, riepilogo ed esiti del ripristino, eccezioni di budget e
   sospensione ricarica, dialoghi Fondi/Liste a 320 px e in landscape, CSV in foglio di calcolo reale.
3. **Collaudo dispositivi:** telefono reale (touch, tastiera virtuale, safe area, rotazione), screen reader, Tab/Invio
   su Blocchi e Ciambella, riduzione movimento; riprodurre i problemi UI mobile elencati sopra.
4. **Igiene Git separata:** aggiungere `.nummo-hybrid-*.json` a `.gitignore` e togliere dall'indice il file tracciato
   (`git rm --cached`) senza cancellarlo se un runner lo usa. Non ripulire `.firebase/`, lock, staging o `emulator-data/`
   senza ispezione. Nessun commit automatico.
5. **Avvio/guida:** misurare rete su `#guida`; procedura `docs/avvio-prestazioni.md` su dispositivo e rete lenta;
   popup dopo logout/scadenza, Safari/Firefox/Edge.
6. **Riproducibilità:** `npm ci` da clone pulito su Node LTS, audit aggiornato, scelta della licenza.
   Unicità server dei nomi fondo, sincronizzazione del predefinito, paginazione e service worker sono evoluzioni da
   valutare, non lavori pianificati né implementati.
