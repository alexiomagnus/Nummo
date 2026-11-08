# HANDOFF — Nummo

Aggiornamento: **8 novembre 2026**, revisione di codice, documentazione e Git locale.
Ramo `main`, HEAD **`3b1edac`** (8 nov), «feat: enhance category icons and labels,
add new periods for dashboard»; `origin/main` locale coincide, nessun fetch eseguito.
Working tree inizialmente pulito: le modifiche prima indicate come non committate
sono incluse in HEAD. Dopo la revisione documentale, applicata la correzione hybrid
descritta sotto, ancora non committata (file modificati: `.env.example`, `AGENTS.md`, `HANDOFF.md`,
`README.md`, `docs/architecture.md`, `docs/firebase-personale.md`, `package.json`, `Workspace.tsx`; nuovi:
`scripts/{dev-hybrid,check-hybrid,hybridRunner,hybridPreflight}.ts`, `HybridConnectionNotice.tsx`,
`tests/hybrid*.test.ts`, `tests/integration/`). Nessuna operazione sul cloud.

## Funzionalità implementate

Gestionale personale solo web, con Google Auth e Firestore personale (BYOF), accesso
riservato al proprietario. Struttura, comandi e regole stabili: `AGENTS.md`;
installazione personale: `README.md` e `docs/firebase-personale.md`.

- CRUD spese, ricerca/filtri/ordinamento; categorie sincronizzate con nomi unici,
  rinomina e 47 icone. Quattro categorie predefinite aggiunte solo su azione esplicita;
  l'elenco proposto di 12 non è implementato. Categoria obbligatoria nel modulo;
  dominio/archivio ammettono riferimenti null o a categorie eliminate.
- Ricorrenze settimanali/mensili/annuali, promozioni e variazioni dal prossimo rinnovo
  (singolo o tutti i futuri), preservando i prezzi maturati. Storico e dashboard
  calcolano le occorrenze fino a oggi; previsioni separate in «Prossimi rinnovi».
- Sincronizzazione SDK con stati cache/pending/rete distinti, conferma di inserimento
  verificata sul server, conflitti per revisione e recupero in memoria dei pending
  rifiutati osservati. Cache in memoria o persistente opt-in; logout attende i pending
  per massimo 5 secondi, poi mantiene la sessione. Cambio UID smonta stato e listener.
- Spese → «Dati»: CSV delle occorrenze e JSON completo letti dal server; importazione
  CSV/JSON Nummo con anteprima, conferma, preflight e gruppi ripetibili senza sovrascritture.
  Il nuovo CSV conserva serie, prezzi e categorie utilizzate; solo JSON include anche
  categorie senza spese. Vecchi CSV ricorrenti o con testi protetti ambigui sono rifiutati.
- UI adattiva Material 3, navigazione mobile flottante, tema chiaro/scuro, sei tinte,
  monocolore/palette, font locale Google Sans o Sistema. Guida pubblica statica `#guida`,
  manifest/icone e configurazione Hosting presenti; nessun service worker o addebito automatico.

## Modifiche recenti e fase corrente

| Commit | Risultato presente nel codice |
| --- | --- |
| `3b1edac` (8 nov) | Import CSV con conservazione delle serie e test; dashboard «Mese scorso» e «Ultimi 3 mesi», griglia giornaliera, palette a 12 slot e rimozione «Media»; 11 icone rimosse anche dalle Rules. |
| `3b1edac` | Modulo con caricamento/errore categorie distinto dall'archivio vuoto, contorni preservati nei campi bloccati; cache categorie popolata subito utilizzabile; menu lunghi con scorrimento e limiti al viewport; transizioni di sezione e icona sync ingrandita. |
| `738b68b`, `baa352e` (6 nov) | Altezza/scorrimento di `SelectField`, focus interno nei menu, rimozione riepilogo numero/totale da Spese. |
| `755a439`, `02d6bda`, `9ed57e8` (6 nov) | Nuovi glifi categoria e navigazione mobile flottante/animata. |
| `3517b27`, `6f4d42b`, `afc6ebf` | Preparazione alla distribuzione BYOF, guida pubblica, Hosting e manifest. |

**Workflow hybrid autonomo (8 nov, non committato):** diagnosticato Expo attivo in hybrid
su 8081 ma connessione a Firestore 8180 rifiutata (`ECONNREFUSED`). Una lettura SDK
con progetto demo fittizio, senza Auth o scritture, ha riprodotto `unavailable` e
cache vuota inutilizzabile dal modulo. `dev:hybrid` avviava solo Expo.

- `npm run dev` (prima `dev:hybrid`) avvia `scripts/dev-hybrid.ts`/`hybridRunner.ts`: ambiente sviluppo
  letto dal parser Expo e congelato per i figli; Auth reale, solo Firestore emulato.
  Riusa l'istanza identificata da locator Hub del progetto/PID/endpoint, altrimenti
  avvia Firestore con config temporanea nella radice e import da `emulator-data/`.
  Readiness REST prima di Expo; timeout, errore su progetto/servizio sconosciuto e
  cleanup dei soli gruppi di processo gestiti. `check:hybrid` resta disponibile.
- Ctrl+C: export in staging, promozione dopo successo, copia precedente conservata
  in `.firebase/hybrid-*/previous`. Lock di archivio contro avvii concorrenti; resta
  in caso di export fallito o interruzione forzata, da esaminare prima del recupero.
  Nessun bootstrap automatico del proprietario; nessuna nuova dipendenza o modifica Rules.
- Comandi rinominati: `dev` = workflow hybrid autonomo; `dev:demo` = precedente
  demo con Auth/Firestore emulati. Rimosso il comando npm `dev:hybrid`; file interni
  `dev-hybrid.ts`, `check:hybrid` e `test:hybrid` mantengono il nome tecnico.
  Rinomina verificata con `npm run check` (155 test, typecheck e build demo) e
  controllo della mappatura dei comandi; nessun nuovo avvio servizi o deploy in questa sottofase.
- Avviso solo hybrid dopo 10 s senza conferma, rimosso alla sincronizzazione o in
  presenza di errore esplicito. Nessuna modifica a UUID, Promise o coda/retry SDK.
- Nella precedente fase riavviato `emulators:real` importando `emulator-data/`, con export all'arresto;
  CLI isolata in `/tmp/nummo-hybrid-cli-isolated` senza login/credenziali reali.
  Copia preventiva: `/tmp/nummo-hybrid-backup-t2ajt781/emulator-data` (temporanea,
  non sostituisce un backup durevole). Firestore lasciato attivo su 8180, UI su 4000;
  Expo preesistente su 8081 non arrestato. In questa fase le istanze preesistenti
  sono state preservate: il nuovo runner le riusa, ma non ne gestisce arresto/export.
- Lettura locale amministrativa: `config/owner` presente, due categorie e nessuna
  icona non supportata. Nessun record modificato; corrispondenza con l'account Google
  e creazione dall'interfaccia non provate, per non usare credenziali reali.

Restano i collaudi e le decisioni elencati sotto. Le correzioni di
avvio rispondono al difetto segnalato su Pixel 8, ma il nuovo avvio reale non è stato
ricollaudato. Gli studi di logo restano separati dall'identità già usata nell'app.

## Decisioni tecniche e motivazioni

- BYOF sostituisce Sheets/callable: elimina il coordinamento tra due archivi.
  Motivazioni in `docs/architecture.md` e `docs/migrazione-byof.md`; `recap.md` è storico.
  Backend recuperabile da `fe759d5`, adapter localStorage da `e2b84d3`.
- Ambienti scelti dagli script npm e build cloud isolata dai dotenv di Expo per evitare
  bundle con progetti/endpoint misti. `check` costruisce solo la demo, mai pubblicabile.
- Prezzi indicizzati per numero di rinnovo per preservare lo storico; massimo otto
  variazioni per serie a causa del limite di valutazione delle Rules.
- Importazione atomica per gruppo (8 categorie o 200 spese), non per archivio, per i
  limiti delle Rules. Export di collezioni separate: sospendere modifiche concorrenti
  durante il backup; ripetere lo stesso file per riprendere gruppi interrotti.
- Hosting e Rules si pubblicano separatamente. Cache dati e disponibilità offline del
  bundle sono distinte: il manifest non garantisce l'avvio senza rete.

## Verifiche e pubblicazioni

**Eseguite l'8 novembre sul working tree con la correzione hybrid:** Linux, Node **26.13.0**, npm **12.2.2**,
Java **21.0.13**; dipendenze già presenti.

| Verifica | Risultato attuale |
| --- | --- |
| `npm run check` | OK, ripetuto durante questo aggiornamento documentale: typecheck, **155/155 test**, export web demo in `dist-demo/`. |
| `npm run check:env` | OK sulla configurazione di sviluppo presente, senza riportarne i valori. |
| Suite `tests/emulator/firestore.e2e.ts` | OK: **11/11**, Auth/Firestore demo su porte alternative 9199/8280 (hub 14400, logging 14500, websocket 19150), tramite config temporanea nella radice poi rimossa. Emulatori arrestati dalla CLI; `PERMISSION_DENIED` attesi nei casi negativi. Nessun arresto delle istanze personali. |
| Fixture in memoria, senza scritture | Riprodotto il rifiuto delle 11 icone rimosse in `parseSyncedCategory` e `parseImport`; controllo positivo con `cart`. |
| `npm run test:hybrid` | OK: **8/8** (7 scenari + contenitore), Firestore demo reale/Expo simulato e dati temporanei: avvio automatico, riuso, progetto diverso, Ctrl+C selettivo, persistenza categorie/spese, crash CLI con discendente poi terminato, servizio sconosciuto. Hash degli originali invariato dopo errore. |
| Comando completo con Expo reale | `BROWSER=none npm run dev:hybrid -- --port 18081` (nome precedente alla rinomina in `dev`, non ripetuto dopo): Firestore personale preesistente riconosciuto e riusato, Metro avviato; Ctrl+C arresta Expo con codice 0. Browser non aperto, nessun login/salvataggio; istanze preesistenti preservate. |

**Evidenza storica, non ripetuta:** precedenti HANDOFF registrano prove Chromium con
emulatori (2 nov: CRUD, due schede, offline/reload, recupero e backup/import) e UI
simulata (6 nov: modulo/menu, navigazione, guida e tema). Il 6 nov è registrato un
dry-run Hosting con build cloud e controllo locale di fallback/manifest/header.
Il login Google con Firestore emulato era stato dichiarato riuscito dall'utente;
non è una verifica corrente dell'agente.

Il commit **`a30a988`** registra la pubblicazione delle Rules il **6 nov, 15:45 UTC**,
allora confrontate con il file locale. HEAD restringe successivamente le icone:
la pubblicazione di questa versione non risulta documentata. Stato remoto, proprietario
ed effettivo salvataggio cloud non interrogati. Nessuna pubblicazione Hosting risulta
registrata nelle fonti esaminate; ciò non dimostra l'assenza di un sito remoto.

**Non eseguiti in questa fase:** `npm ci`/clone pulito,
build/preview cloud, dry-run/deploy, browser/dispositivi e `npm audit`. Nessun lint
configurato. Le prove automatiche non verificano OAuth reale, resa visiva del nuovo
avviso, UI touch o Node LTS. Non verificata la comparsa/scomparsa dell'avviso nel browser.
Lifecycle del runner verificato su Linux; Windows/macOS e recupero dopo guasto fisico
del disco non collaudati. I test di persistenza usano fixture locali, non account reali.

## Problemi aperti e limitazioni

- **Compatibilità icone (riprodotta su fixture):** HEAD rimuove `pill`, `book`,
  `plane`, `scissors`, `baby`, `flame`, `wine`, `umbrella`, `leaf`, `shield`, `ellipsis`.
  `parseSyncedCategory` e `parseImport` le rifiutano: eventuali record/backup precedenti
  con tali valori bloccano lettura categorie/importazione ed export completo.
  Nessun adapter di migrazione presente; presenza nei dati personali non verificata.
- UI recente non ricollaudata nel browser: avvio Pixel 8 con rete lenta/tema scuro,
  menu lunghi e finestre basse/rotazione, editor, griglia giornaliera e cambi rapidi
  di sezione. Mancano prove complete di prezzi, impostazioni e grafici su dati reali.
- Dashboard: oltre la 12ª categoria della lista confluenza in «Altre categorie».
  Mobile evidenzia con `primaryContainer`, rail/drawer con `secondaryContainer`:
  uniformità cromatica ancora da decidere.
- Android/iOS, Safari/Firefox/Edge, installazione e OAuth da schermata Home, safe area,
  movimento ridotto, screen reader e flusso completo da tastiera non collaudati.
  Manifest/splash statici; effetto di `theme-color` sulle barre Android da verificare.
- Avvio offline a freddo non garantito; crash, storage negato/private browsing e
  revoca/scadenza token non collaudati. Recupero rifiuti solo in memoria e per pending
  osservati; cache persistente può restare sul disco dopo logout.
- Collezioni lette integralmente, backup non atomico, import UI massimo 5 MB.
  Non disponibili correzioni di prezzi già maturati o aggiunta di variazioni
  programmate nell'editor (si possono rimuovere quelle esistenti).
- Licenza assente; installazione da clone pulito e guida su progetto nuovo non provate.
  Audit storico: 29 segnalazioni (25 moderate, 4 alte, catena `@grpc/grpc-js`), conteggio
  non aggiornato. Contrasti dei token testati, accessibilità complessiva non certificata.

## Prossime attività, in ordine

1. **Compatibilità dei dati:** definire preservazione o migrazione esplicita delle
   icone rimosse prima di distribuire; usare le fixture descritte sopra come regressione.
   Non modificare dati personali né ripubblicare Rules alla cieca.
2. **Collaudo UI demo:** `npm run emulators`, `npm run emulators:seed`, `npm run dev:demo`;
   mobile 412×915 e desktop, rete lenta, menu fino all'ultima voce, editor/prezzi,
   import CSV/JSON, tastiera/focus, griglia e animazioni. Preservare emulatori utente;
   porte alternative come in `AGENTS.md`.
   Per hybrid, ricaricare l'app con Firestore locale attivo e provare categoria/spesa
   con l'account proprietario; controllare anche l'avviso in caso di arresto del servizio.
3. **Cloud e dispositivi, previa autorizzazione:** controllare Auth/domini, proprietario
   e Rules effettive; categoria con icona valida, CRUD, estraneo negato, reload/seconda
   sessione e ripristino backup. Poi build/preview, eventuale anteprima Hosting e live
   secondo la guida; verificare Android/iOS e avvio installato.
4. **Distribuzione/manutenzione:** scegliere licenza; provare `npm ci` e guida da clone
   pulito su Node LTS; aggiornare audit e valutare dipendenze compatibili senza `--force`.
   Paginazione, backup più robusto e service worker richiedono una necessità confermata.
