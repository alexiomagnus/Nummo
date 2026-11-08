# HANDOFF — Nummo

Aggiornamento: **8 novembre 2026**, riorganizzazione di esportazione CSV e backup/ripristino JSON
(modifiche **non ancora committate**). Progetto personale web BYOF: Google Auth e Firestore, accesso riservato al proprietario.
Architettura, comandi e convenzioni: `AGENTS.md`; configurazione personale:
`README.md` e `docs/firebase-personale.md`. Le specifiche storiche non attestano lo stato corrente.

## Stato Git e attività in corso

- Ramo `main`; ultimo commit **`cad1cc8`** — `fix(ui): make mobile backup actions full width` (8 novembre), allineato a `origin/main`.
  Sopra di esso l'albero contiene la fase «CSV/JSON» qui sotto, **non committata** (nessun commit senza richiesta).
  Per HEAD e sincronizzazione correnti controllare Git. Esiste anche il ramo remoto
  `backend-firebase` (storico, `b440e59`), non più base di lavoro.
- La fase «dialoghi e mobile» è **committata** (`98d2e1b`, `af3113e`, `cad1cc8`). Attività in corso:
  la fase «Esportazione e backup» sotto, implementata e verificata con test, da collaudare nel browser.
- Al momento della revisione era in esecuzione una sessione `npm run dev` **dell'utente**
  (Firestore emulato su 8180 per `nummo-6b6e2`, Expo su 8081, lock `.firebase/hybrid.lock`):
  non fermarla né rimuovere il lock. Le cartelle `.firebase/hybrid-*` sono staging/copie
  precedenti dei suoi export (ignorate da Git).
- Gli ultimi interventi sono confermati «funziona» dall'utente (conferma distinta dal
  collaudo diretto dell'agente). Nessuna scrittura dati cloud né pubblicazione dell'app in
  questa fase. Restano aperti compatibilità dati e collaudi sotto elencati.

## Fase corrente — esportazione CSV e backup JSON (non committata)

Richiesta: separare il CSV (consultazione) dal JSON (unico backup/ripristino), senza compatibilità con i vecchi CSV.

- **CSV** (`exportCsv`): `Data;Descrizione;Categoria;Importo;Valuta;Ricorrenza`, BOM, CRLF, `;` e virgola
  decimale (Excel/LibreOffice in italiano), una riga per occorrenza fino a oggi al prezzo di quel rinnovo, nessun
  ID/timestamp/JSON incorporato. Formule neutralizzate con apostrofo; testi sempre quotati. Non importabile.
- **JSON** (`makeBackup`/`parseBackup`): `nummo-backup` versione 1 (numero invariato: forma compatibile), ma ora solo
  campi di ripristino — **rimossi** `origin` (UID/progetto), `revision`, `updated_at`, `name_key`; output ordinato e
  deterministico; lettori per versione in `readers`, versione più recente rifiutata con messaggio dedicato.
  I file v1 già scaricati (con campi extra) si importano ancora: i campi extra sono ignorati.
- **Ripristino**: `planImport` puro (aggiunte, identici, conflitti, categorie mancanti, totale categorie) usato per il
  riepilogo e dallo store (`previewImport`, `importRecords`) prima di scrivere. Unione bloccata da qualsiasi conflitto
  (stesso ID con contenuto diverso o stesso nome con ID diverso) o da >10 categorie. Sostituzione: elimina solo ciò che
  differisce dal file (gli identici non vengono toccati, revisioni invariate), poi aggiunge; la UI scarica prima una copia
  JSON dei dati attuali (`nummo-backup-prima-del-ripristino.json`). `DeleteDialog` ha il nuovo `confirmLabel`.
- **Rimosso**: `parseCsvImport`, lettore CSV, colonne tecniche, relative traduzioni e test; scelta file solo `.json`
  (un `.csv` dà un messaggio esplicito). Il pulsante recupero «Scarica spese da recuperare» usa lo stesso JSON.
- **UI** (`BackupActions`): due gruppi con testo informativo — «Esporta transazioni (CSV)» e «Scarica backup (JSON)» /
  «Importa backup (JSON)» — e riepilogo del ripristino con «Unisci ai dati esistenti», «Sostituisci tutti i dati», «Annulla».
  Guida pubblica, `en.ts`, README e `docs/` aggiornati (`architecture.md` ha la decisione e le motivazioni).
- Rules, schema Firestore e dipendenze **non modificati**.
- Su richiesta dell'utente rimossi i due testi descrittivi sotto «Consulta le spese» e «Backup completo»
  (restano titoli e pulsanti); eliminate anche le due voci in `en.ts`.
- **Diagnosi apertura su Pixel 8** (video dell'utente, app dalla Home, tema scuro, accento ambra; 8 nov): la
  sequenza è splash Android (sfondo `#0F1511`, icona menta, dal manifest statico) → header con spinner mentre
  la splash svanisce → `Nuova spesa` con campi senza etichette, «Caricamento…» in Categoria, controlli
  disabilitati, avatar «A» e icona di sincronizzazione → campi completi. Circa 1,3 s dal tocco alla schermata
  stabile. Disallineamenti misurati sul video: splash (15,20,16) contro sfondo app (21,16,15), icona menta contro
  accento ambra; header da disconnesso (tema + impostazioni) a loggato (sync + tema + avatar). Prove emulate su
  Chromium (non Android): font Google Sans richiesto solo dopo il mount di React (FOUT), nessun indicatore prima
  del bundle da 2,2 MB.
- **Correzioni applicate (8 nov, dopo la diagnosi):** (1) `manifest.webmanifest` con `background_color`/`theme_color`
  neutri `#121212` al posto del verde `#0F1511`; l'icona della splash resta quella menta (cambiarla richiede un asset
  nuovo). Android aggiorna il WebAPK dal manifest solo periodicamente o dopo reinstallazione. (2) `RemoteWorkspace`:
  all'apertura mostra uno spinner finché i primi dati (spese, categorie utilizzabili) sono pronti, con il modulo
  montato a dimensione piena ma invisibile (etichette misurate, bozza e titolo fermi); rilascio definitivo con dati
  pronti, errore o dopo 4 s (`startGateMs`). Le altre sezioni attendono lo stesso rilascio. Nuova voce `en.ts`.
  **Verifica emulata** (Chromium 412×915, sessione salvata, emulatori demo su porte alternative, rete con latenza e
  CPU 3×, poi arrestati): niente scheletro con etichette mancanti, titolo fermo, modulo completo in un solo passo.
  **Non provato su Pixel 8**; non toccati header da disconnesso→loggato (sole icone che cambiano), foto avatar
  (la «A» resta finché l'immagine non è caricata), font Google Sans richiesto dopo il mount né loader prima del bundle.

## Fase precedente — dialoghi e mobile (committata)

- Dati su smartphone: pulsanti in colonna, ciascuno largo quanto l'area dei contenuti
  (ora CSV/JSON/Importa JSON, vedi sopra). Desktop conserva i pulsanti affiancati.
- **Avvio hybrid ripristinato (8 nov, recupero autorizzato):** Java Firestore PID
  17767 era rimasto attivo su 8180 dopo la morte del gestore PID 17700 e dell'Hub.
  Export diretto tramite lo stesso endpoint locale della CLI, prima di ogni arresto;
  ripristino su emulatore isolato e confronto SHA-256 di percorsi/campi di tutti i
  **29 documenti**: 8 spese, 10 categorie, 10 indici nomi e configurazione proprietario.
  Nessuna variazione durante export; ripristino identico. Processo residuo arrestato
  con SIGTERM, senza forzatura. Archivio recuperato predisposto in `emulator-data/`.
  Copie native e precedenti conservate in `.firebase/recovery-7au5sZ/` (ignorata da Git).
  Provato `BROWSER=none npm run dev -- --port 18081`: Firestore riconosciuto, tutti i
  campi ancora identici e Metro pronto. Un solo Ctrl+C: export riuscito e promozione
  completata, precedente archivio in `.firebase/hybrid-qTNrTt/previous`.
  Servizi della prova arrestati; utente può ora eseguire `npm run dev` nel suo terminale.
  Nessun cloud/OAuth, modifica del runner o test app aggiuntivo in questa fase operativa.
- Spese su tutte le larghezze, PC incluso: numero di spese sotto il nome del mese
  nella colonna sinistra, totale separato sulla destra. Nessun riepilogo congiunto
  «4 spese · importo» nelle intestazioni mensili.
- Conferme di eliminazione su smartphone: Annulla sopra, Elimina sotto;
  disposizione desktop invariata, modifica comune a tutte le conferme `DeleteDialog`.
  `npm run check` ripetuto: typecheck, 206 test e build demo OK.
- **Touch Categoria/Data:** dopo la segnalazione (centro Categoria apre il menu,
  freccia no), sostituito il contenitore `pointerEvents="none"` con DOM `inert` in
  `SelectField` e `DateField`. Le icone Paper non possono più intercettare eventi
  o focus: l'unico bersaglio è il `Pressable` esterno, anche nell'editor che riusa
  `ExpenseFields`. Disattivato anche `forceTextInputFocus` nelle icone di SelectField.
  Catena individuata nei sorgenti installati: Surface riabilita gli eventi web e
  PressResponder interno ne ferma la propagazione. Layout e logica menu invariati.
  `npm run check` OK: typecheck, **206 test**, build demo. Nessuna modifica dati/Rules,
  test emulatori non ripetuti. Browser ritentato e indisponibile: collaudo touch reale
  ancora necessario su centro/freccia/icona sinistra, Categoria e Data, creazione/editor,
  controlli disabilitati e apertura con Invio/Spazio da tastiera.
- **Login:** l'utente aveva segnalato «Accesso non riuscito. Riprova.» dopo
  i tentativi sulla foto. Il testo generico nascondeva i codici non mappati;
  `signInError.ts` ora conserva un codice `auth/...` validato nel messaggio IT/EN,
  senza messaggi grezzi/token/customData. Popup annullati restano silenziosi e le
  spiegazioni già presenti sono preservate. Causa del login e legame con foto non
  confermati; dopo questa modifica l'utente conferma il funzionamento. Nessuna modifica
  a credenziali o configurazione cloud. `check:env` OK; `npm run check` OK:
  **206 test**, typecheck ed export demo. OAuth reale non riprodotto dall'agente.
- Avatar account: l'utente segnala foto assente anche dopo reload completo; causa
  effettiva non confermata, browser diagnostico indisponibile. `sessionProfile.ts`
  privilegia la foto del provider Google rispetto a quella generica Firebase e ignora
  stringhe vuote (prima `??` poteva nascondere l'alternativa). Foto circolare 36 px
  con `<img>` web diretto, `referrerPolicy="no-referrer"`, senza preloader RN Web.
  Il menu distingue caricamento, URL assente e download fallito, con «Riprova foto»
  dopo errore; iniziale come fallback. Menu rimontato al cambio UID/URL.
  Nessun nuovo scope, servizio o dato Firestore. Successiva conferma generale
  dell'utente; caricamento reale non osservato direttamente dall'agente.
  `npm run check` dopo la correzione: typecheck, **203 test** ed export demo OK;
  nuovi casi per precedenza Google, stringhe vuote e foto assente. Rendering/caricamento
  della foto e retry nel browser ancora da collaudare.
  Test emulatori non ripetuti per questa modifica ai soli metadati di presentazione;
  accesso dati, autorizzazione e Rules invariati.
- Menu account: voci Impostazioni/Esci estese alla larghezza effettiva del menu,
  con margine interno e angoli coerenti col focus; hover/ripple ritagliati sui bordi
  arrotondati. Rimosso il limite fisso di larghezza delle voci Paper in questo menu.
  Resa del passaggio del mouse da collaudare nel browser.
  `npm run check` ripetuto dopo la correzione: typecheck, 200 test e build demo OK.
- Categorie: matita → `CategoryEditor` con `AppDialog`, nome e icona in area
  scorrevole e Annulla/Salva esterni allo scroll. Rimossa la modifica inline;
  selezionare un'icona cambia solo la bozza. `updateCategory` salva nome e icona
  nella stessa transazione esistente, validando il record/revisione aperti;
  duplicati/conflitti visibili nel dialogo, controlli/chiusura bloccati durante l'attesa.
  Creazione ed eliminazione restano nella pagina. Nessuna modifica alle Rules.
  Pulsanti Annulla e Salva della stessa larghezza (96), riducibili su finestre strette.
  `npm run check` ripetuto anche dopo rimozione frase e ampliamento pulsante: OK,
  typecheck, 200 test ed export demo; resa visiva ancora da collaudare.
- Stato sincronizzato con spunta cerchiata al posto della nuvola. Descrizione delle
  spese multilinea, quattro righe e altezza minima 128, condivisa da creazione/editor;
  limite e normalizzazione del testo salvato invariati. Nessuna modifica ai dati.
- Verificato nel codice il tema automatico già presente: `useColorScheme()` segue
  `prefers-color-scheme`, con preferenza `system` iniziale. Rimossa su richiesta la
  frase esplicativa da Impostazioni; scelte manuali chiaro/scuro conservate. Cambio reale del tema
  dispositivo da collaudare nel browser.
- `AppDialog` condiviso da Impostazioni, editor, calendario e conferme: superficie
  dedicata più distinguibile, contorno e scrim neutro; sfondo dei campi coerente col
  dialogo. Colori di menu e navigazione conservati.
- Tutti i dialoghi limitati all'altezza visibile e alle safe area; calendario e
  conferme ora scorrevoli, azioni esterne allo scroll. Editor con azioni a capo se
  necessario; celle calendario adattate alla larghezza su schermi stretti.
- CSS iniziale con sfondo chiaro/scuro e altezza dinamica prima del bundle.
  `viewport.ts` aggiorna il layout su resize di VisualViewport/finestra, anche con
  tastiera; durante pinch zoom non forza reflow. Meta viewport con richiesta
  `interactive-widget=resizes-content`, fallback senza API su `innerHeight`.
- Sono correzioni ai vincoli individuati nel codice: **non ancora collaudate nel
  browser o sul telefono**. Browser CUA tentato: «The browser access host is unavailable».
  Non identificata una causa unica per il problema generico di apertura mobile segnalato.

## Funzionalità presenti nel codice

- CRUD spese, ricerca, filtri categoria e ordinamento; elenco a colonna singola con
  dettagli espandibili per occorrenza. Eliminazione solo dall'editor, con conferma
  della versione aperta e conflitto esplicito; per ricorrenze elimina tutta la serie.
- Ricorrenze settimanali/mensili/annuali, prezzi promozionali e variazioni dal prossimo
  rinnovo (singolo o futuri), storico preservato e riepilogo prossimi rinnovi.
  Occorrenze calcolate, senza job né addebiti automatici.
- Categorie sincronizzate, nomi unici, rinomina e 47 icone. Quattro predefinite solo su
  richiesta; l'elenco proposto di 12 non è implementato. Limite applicativo di **10**,
  non imposto dalle Rules; archivi già più grandi leggibili, import oltre limite rifiutato.
  Categoria obbligatoria nel modulo; dominio/archivio ammettono null e riferimenti orfani.
- Dashboard con ciambella e blocchi (treemap su desktop, impilati su contenitori stretti),
  periodi inclusi mese scorso e ultimi 3/6/12 mesi, palette a 12 slot e aggregato «Altre categorie».
  Legenda della ciambella disposta in base alla larghezza effettiva del contenitore.
  Dettaglio giornaliero: sette giorni con spese iniziali, «Mostra tutti/meno», un giorno
  espanso alla volta; oggi in fondo ai giorni visibili, futuro escluso. L'helper supporta
  giorni vuoti, **la UI attuale non offre questa opzione**. Nessuna lettura aggiuntiva.
- CSV delle transazioni (sola consultazione) e backup JSON server-only; importazione solo JSON con riepilogo:
  unione che si ferma sui conflitti oppure **sostituzione di spese e categorie** con conferma distruttiva e copia
  automatica dei dati attuali. JSON conserva anche le categorie senza spese; file UI massimo 5 MB.
- UI adattiva Material 3, navigazione mobile flottante, chiaro/scuro, sei tinte,
  monocolore/palette, font locale Google Sans o Sistema; guida pubblica statica `#guida`.
  Italiano/inglese da Impostazioni anche prima del login; italiano iniziale, preferenza
  browser `nummo.preferences.v1`, date/importi `it-IT`/`en-GB`, EUR. Provider senza remount
  per lingua; nomi/descrizioni salvati e formati backup preservati.

## Modifiche recenti rilevanti

| Commit | Contenuto verificato nei sorgenti |
| --- | --- |
| non committato | Fase CSV/JSON: CSV italiano di sola consultazione, JSON versionato e minimo, piano di importazione con conflitti, import CSV rimosso. |
| `cad1cc8` (8 nov) | Dati su smartphone: pulsanti CSV/JSON/Importa a larghezza piena (`BackupActions`). |
| `af3113e` (8 nov) | Bersagli touch di `SelectField`/`DateField` (`inert`), intestazioni mensili di Spese con conteggio e totale separati, conferme di eliminazione su mobile impilate. |
| `98d2e1b` (8 nov) | `AppDialog` unificato, `CategoryEditor`, avatar Google e diagnostica login (`signInError.ts`, `sessionProfile.ts`), viewport mobile (`viewport.ts`), stato sincronizzato con spunta, descrizione multilinea. |
| `31a5d3b` (8 nov) | Italiano/inglese; Spese espandibili ed eliminazione nell'editor; dettaglio giornaliero, blocchi/treemap e ciambella adattiva; limite categorie e importazione sostitutiva. |
| `6a27536` (8 nov) | `npm run dev` avvia/riusa Firestore locale prima di Expo; demo separata in `dev:demo`; test lifecycle e avviso hybrid dopo 10 s senza conferma. |
| `3b1edac` (8 nov) | CSV ripristinabile, nuovi periodi dashboard, gestione caricamento/errori categorie; rimozione di 11 icone anche dalle Rules. |
| `738b68b`, `baa352e` (6 nov) | Scorrimento dei menu lunghi, focus interno e rimozione riepilogo da Spese. |

## Decisioni tecniche e motivazioni

- BYOF sostituisce Sheets/callable per mantenere un'unica fonte di verità. Motivazioni
  in `docs/architecture.md` e `docs/migrazione-byof.md`; `recap.md` resta storico.
  Backend recuperabile dalla storia Git (`fe759d5`), adapter localStorage da `e2b84d3`.
- SDK responsabile di cache/coda/retry; UUID stabile e conferma server, transazioni
  con revisione per modifiche/eliminazioni. Nessun secondo archivio di sincronizzazione.
- Prezzi indicizzati per numero di rinnovo: storico invariato e massimo otto variazioni
  per serie per il limite di valutazione delle Rules.
- Import per gruppi di 8 categorie o 200 spese per i limiti delle Rules, ripetibile ma
  non atomico sull'archivio. La sostituzione può lasciare dati parzialmente eliminati
  dopo un errore: la UI scarica prima una copia dei dati attuali; ripetere lo stesso file per il recupero.
  Un solo formato di ripristino (JSON) invece di due: meno validazione duplicata; il CSV non è un backup perché
  espande le occorrenze e non conserva ID, piano prezzi né categorie vuote. Il JSON resta alla versione 1 perché la
  forma è compatibile; un futuro cambio incompatibile richiede `backupVersion` 2 e un lettore per la 1.
  Export da collezioni separate: sospendere modifiche concorrenti durante il backup.
- Ambienti scelti dagli script; build cloud isolata dai dotenv di sviluppo. Hosting e
  Rules si pubblicano separatamente. Manifest e cache SDK non garantiscono avvio offline.
- Runner hybrid: riuso solo con identità progetto/PID/endpoint verificata; arresta solo
  processi propri. Export in staging, promozione dopo successo, copia precedente e lock;
  export fallito/interruzione forzata richiedono ispezione prima di rimuovere il lock.
  Proprietario locale da predisporre esplicitamente, mai copiato automaticamente dal cloud.

## Verifiche e confini dell'evidenza

Ambiente: Linux, Node **26.13.0**, npm **12.2.2**, Java **21.0.13** (versioni rilette l'8 nov),
dipendenze già installate. Esiti della fase CSV/JSON (8 nov), sul codice non committato sopra `cad1cc8`:

| Verifica | Risultato |
| --- | --- |
| `npm run check` | **OK**: typecheck, **210/210 test**, export web demo in `dist-demo/`. Nuovi test in `tests/backup.test.ts`: CSV (intestazioni, `;`, virgola decimale, assenza di dati tecnici, serie espansa senza duplicati né rinnovi futuri, prezzi per rinnovo, formule), JSON (schema minimo, round trip fedele e ripetibile, versioni, validazione, limite categorie) e `planImport` (unione, conflitti, sostituzione, riferimenti mancanti). Warning `NO_COLOR`/`FORCE_COLOR` non bloccante. |
| Suite SDK/Rules | **OK: 12/12** su emulatori demo con config temporanea nella radice (porte Auth/Firestore 19199/19280, hub 19440, logging 19450, websocket 19151; la sessione `npm run dev` dell'utente su 8180 non è stata toccata, config rimossa). Il test di migrazione ora fa il round trip JSON, verifica `previewImport`, il blocco per conflitto d'ID o di nome prima di ogni scrittura e che la sostituzione ripetuta non riscriva gli identici (revisione invariata). `PERMISSION_DENIED` attesi nei casi negativi. |
| `npm run check:env` | **OK** sulla configurazione di sviluppo presente; valori non riportati. |
| Fixture in memoria | **OK**: `cart` valido; tutte le 11 icone rimosse rifiutate da `parseSyncedCategory` e dal backup (la verifica risale a prima della rinomina `parseImport` → `parseBackup`, stessa validazione). Nessuna scrittura. |

**Registrate nel precedente HANDOFF, non ripetute in questa fase documentale:**

- `npm run test:hybrid`: **8/8** (7 scenari + contenitore), Firestore demo reale ed Expo
  simulato: avvio, riuso/rifiuto progetto diverso, segnali, persistenza, guasti e servizio sconosciuto.
- Avvio Expo reale con il vecchio nome `dev:hybrid`, poi rinominato `dev`: riuso di
  Firestore preesistente e arresto selettivo riusciti; nessun login/salvataggio provato.
- Chromium con emulatori (2 nov: CRUD, due schede, offline/reload, recupero e backup/import)
  e UI simulata (6 nov); dry-run Hosting/build cloud e fallback/manifest/header locali (6 nov).
  Login Google con Firestore emulato dichiarato riuscito dall'utente, non verifica corrente dell'agente.

**Pubblicazioni:** `a30a988` registra Rules pubblicate il 6 novembre, 15:45 UTC,
allora confrontate con il file locale. Le Rules successive restringono le icone e la loro
pubblicazione non risulta documentata. Nessuna pubblicazione Hosting risulta nelle fonti
esaminate: non dimostra l'assenza di un sito remoto. Stato remoto non interrogato.

**Non eseguiti qui:** la nuova UI dei dati nel browser, l'apertura del CSV in Excel/LibreOffice/Google Fogli
(il formato è verificato solo con un lettore di test), `npm ci`/clone pulito, avvio dev/demo, test hybrid,
build/preview cloud, dry-run/deploy, `npm audit`, browser o dispositivi.
Nessun lint configurato. Accesso browser ritentato in questa fase e indisponibile;
gli eventi simulati non dimostrano il comportamento della tastiera reale o la resa visiva.

## Problemi aperti e limitazioni

- **Backup/ripristino da collaudare nel browser** (solo dati demo): schermata Dati su smartphone e desktop, riepilogo,
  unione con conflitto, sostituzione con scarico automatico della copia, errore di rete a metà, file `.csv`/non JSON.
- CSV pensato per il formato italiano (`;` + virgola decimale): in un foglio con impostazioni inglesi va importato
  scegliendo `;` come separatore. Intestazioni sempre italiane, anche con interfaccia inglese. L'apostrofo contro le
  formule resta visibile nella cella. Compatibilità con Excel/LibreOffice reali non provata.
- Ripristino non atomico (limiti Rules su gruppi); dopo un errore a metà serve ripetere lo stesso file. Il riepilogo
  è calcolato al momento della scelta del file: lo store lo ricalcola prima di scrivere, ma non lo mostra di nuovo.
- I CSV scaricati in passato non sono più importabili (voluto); i JSON v1 precedenti sì.

- **Compatibilità icone confermata su fixture:** `pill`, `book`, `plane`, `scissors`,
  `baby`, `flame`, `wine`, `umbrella`, `leaf`, `shield`, `ellipsis` non sono più accettate.
  Record/backup precedenti con questi valori bloccano lettura categorie/import ed export
  completo. Nessun adapter presente; presenza nei dati personali non verificata.
- UI recente e due lingue da collaudare nel browser: persistenza della lingua, cambio
  con bozza/errori/calendario aperti, grafici con nomi/importi lunghi, menu bassi/rotazione,
  tastiera/focus, editor e avviso hybrid. Nuovo avvio sul Pixel 8, rete lenta/tema scuro
  e barra Salva mobile senza separatore non ricollaudati sul dispositivo.
- OAuth/cloud reale, Android/iOS, Safari/Firefox/Edge, schermata Home, safe area,
  screen reader e flusso tastiera completo non verificati. Contrasti dei token testati,
  accessibilità complessiva non certificata. Lifecycle runner provato solo su Linux.
- Nessun service worker; avvio offline a freddo non garantito. Recupero rifiuti solo in
  memoria e per pending osservati; cache persistente può restare dopo logout. Storage
  negato/private browsing, revoca/scadenza token e guasto disco non collaudati.
- Collezioni lette integralmente; backup non atomico. Editor senza correzione dei prezzi
  maturati né aggiunta di variazioni programmate (rimozione di quelle esistenti disponibile).
  Mobile usa `primaryContainer` per destinazione attiva, rail/drawer `secondaryContainer`:
  uniformità cromatica da decidere. Licenza assente.
- Audit storico: 29 segnalazioni (25 moderate, 4 alte, catena `@grpc/grpc-js`);
  conteggio non aggiornato, da non trattare come audit corrente.

## Prossime attività, in ordine

1. **Commit e collaudo della fase CSV/JSON** (su richiesta dell'utente): provare in `dev:demo` esportazione CSV in un
   foglio di calcolo reale, backup, unione con conflitto e sostituzione con dati demo; poi `npm run check` e
   `test:emulator` prima del commit.
2. **Compatibilità dati prima della distribuzione:** decidere preservazione degli ID
   icona o migrazione esplicita; aggiungere regressioni sui decoder/import. Non alterare
   dati personali né ripubblicare Rules senza autorizzazione.
3. **Collaudo UI isolato:** `npm run emulators`, `npm run emulators:seed`, `npm run dev:demo`.
   Preservare emulatori utente, usando porte alternative come in `AGENTS.md`. Provare
   prima i nuovi dialoghi in chiaro/scuro e l'apertura mobile a freddo, con barre browser
   aperte/chiuse, tastiera su importo/descrizione, zoom e rotazione; controllare azioni
   sempre raggiungibili, scorrimento interno e ripristino dell'altezza alla chiusura tastiera.
   Nell'editor categorie verificare Annulla senza scritture, nome/icona insieme,
   duplicati, nessuna icona, attesa/errori e conflitto da seconda scheda senza perdere la bozza.
   Poi verificare
   Italiano/English prima/dopo login, reload e bozze mantenute; nomi utente invariati;
   mobile 412×915 e desktop, ciambella a 600/640/768 px, blocchi, almeno otto giorni,
   cambio periodo, editor/prezzi, backup/import (anche sostituzione, solo dati demo).
4. **Hybrid/cloud e dispositivi, previa autorizzazione per risorse reali:** verificare
   avvio `npm run dev`, proprietario locale e categoria/spesa con Google; avviso al fermo
   Firestore. Controllare poi Auth/domini, proprietario/Rules remoti, CRUD e account estraneo
   negato, seconda sessione e ripristino backup. Build/preview e possibile anteprima Hosting
   con `deploy:hosting`, quindi Android/iOS e login da schermata Home.
5. **Distribuzione/manutenzione:** provare `npm ci` e guida da clone pulito su Node LTS,
   scegliere licenza, aggiornare audit e valutare aggiornamenti compatibili senza `--force`.
   Paginazione, backup più robusto e service worker richiedono una necessità confermata.
