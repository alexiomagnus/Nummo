# HANDOFF — Nummo

Aggiornamento: **8 novembre 2026, ore 20:02 (Europe/Rome)**. Gestionale personale solo web con Google Auth e
Firestore BYOF, accesso riservato all’UID in `config/owner`. Contesto stabile e comandi: `AGENTS.md`;
configurazione: `README.md` e `docs/firebase-personale.md`; motivazioni architetturali: `docs/architecture.md`.
Il codice e le verifiche sotto descrivono il checkout; requisiti e risultati storici non certificano il cloud.

## Icone a tema denaro — 8 novembre, 20:10 (non committato)

- Cinque nuovi ID di icona, utili per fondi e categorie: `wallet` (portafoglio), `bank` (banca), `cash` (contanti),
  `safe` (cassaforte), `growth` (investimenti), nei tre stili: contorni in `categoryGlyphs.ts`, disegni colorati
  (arancio, blu, verde, ardesia, verde acqua) e sprite pixel. Aggiornati etichette IT/EN e liste icone di
  categorie **e** fondi in `firestore.rules`: **Rules non pubblicate**, finché non lo sono il cloud rifiuta queste icone.
- Anteprima 24/72 px chiaro/scuro controllata; lo sprite `growth` è stato ridisegnato dopo la prima anteprima (barre
  piene e diagonale continua: le barre bordate d'inchiostro sparivano nel tema scuro). `npm run check` OK (288/288),
  `test:emulator` 14/14; nessuna prova specifica delle nuove icone contro le Rules e nessun collaudo nell'app.

## Fondi e budget — 8 novembre, 20:02 (non committato)

- **Implementato:** quarta destinazione «Fondi» (pagina «Fondi e budget»), fondi con nome, icona, colore, saldo
  iniziale e data di inizio fissa, ricarica mensile facoltativa (importo, giorno, sospensione), budget mensile
  ricorrente con eccezioni per mese, entrate manuali e trasferimenti, archiviazione, eliminazione solo se inutilizzato,
  fondo predefinito per browser. Mesi navigabili (effettivo/previsione), riepilogo disponibilità, speso, entrate,
  budget e residuo con barre, dettagli mensili e storico movimenti. Selettore del fondo in «Nuova spesa» e nella
  modifica (saldo e budget residuo sotto il campo, «Nessun fondo» esplicito, nessun blocco oltre il budget).
  Assegnazione esplicita delle spese senza fondo. Backup v3, CSV con colonna «Fondo», Guida e IT/EN aggiornati.
- **File:** `src/domain/funds.ts`, `src/features/funds/*`, `src/theme/chartPalette.ts` (palette spostata da Dashboard),
  `firestore.rules`, `src/services/firestoreStore.ts`, contratto/validazione/backup, `Workspace`, `ExpenseForm`,
  `ExpenseEditor`, `BackupActions`, `AppShell` (etichette `labelSmall` sotto 380 dp con quattro destinazioni),
  `DateField` (prop `name`), icone `wallet`/`swap`/`archive`/`star`. Decisioni: `docs/architecture.md`, «Fondi e budget».
- **Migrazione:** nessuna scrittura automatica. Spese esistenti senza `fund_id` = «Senza fondo», fuori da ogni saldo,
  assegnabili dalla pagina Fondi. Ricariche calcolate dal piano, mai documenti: niente duplicati tra dispositivi.
- **Verifiche:** `npm run check` OK (typecheck, **288/288** test, build demo); nuovi `tests/funds.test.ts` (12 casi:
  ricariche e mesi corti, saldo vs budget vs speso, soglie, modifiche senza toccare il passato, trasferimenti,
  pause delle serie, spese senza fondo, codifica, modulo, backup v3, traduzioni). `test:emulator` **14/14** su porte
  39099/39280 con config temporanea rimossa: nuovo caso fondi (Rules, revisioni, `start_date` immutabile, movimenti
  idempotenti e immutabili, `fund_id` omesso/rimosso, assegnazione con conflitto, import v3 ripetibile) e caso peggiore
  8 prezzi + 8 stati + `fund_id` accettato. **Chromium headless** su build demo con emulatori dedicati: flusso a
  412×915 chiaro IT (creazione di due fondi, trasferimento, predefinito, spesa da 120 € → saldo 400 → 280 €, budget
  residuo 130 €, dicembre previsto +300 €), desktop 1280×900 scuro EN, 360×780 scuro EN e 320×640: nessuna eccezione
  di pagina; corretti durante il collaudo azioni mobile a piena larghezza, etichette della pillola troncate a 320 px e
  traduzioni «Trasferimento inviato/ricevuto».
- **Non verificato:** dispositivi reali e touch, screen reader, riduzione movimento, dialoghi Fondi a 320 px e in
  landscape, eccezioni di budget e sospensione della ricarica nel browser (coperte solo da test di dominio),
  assegnazione massiva oltre 100 spese con emulatore, unione/sostituzione v3 dall'interfaccia, `test:hybrid`.
- **Limiti noti:** nome del fondo unico solo lato client; esistenza del fondo referenziato non verificata dalle Rules
  (fondo assente = «Senza fondo»); eliminazione consentita in base ai dati caricati (concorrenza → spese orfane, non
  perse). Cambiare il fondo di una serie sposta anche i pagamenti passati. Ricarica modificata prima della scadenza del
  mese ma con nuovo giorno già passato viene datata in quel giorno del mese. Predefinito non sincronizzato.
- **Rules modificate e non pubblicate:** con le Rules cloud attuali spese senza fondo funzionano, mentre fondi,
  movimenti e spese con `fund_id` sono rifiutati («Accesso negato»). Pubblicare le Rules solo con autorizzazione e prima
  della build che usa i fondi.

## Testi Fondi — 8 novembre, 20:04

Aggiornamento successivo: eliminate anche le note sul giorno del saldo iniziale e sulla ricarica mensile nello stato vuoto.
`npm run check` ripetuto: typecheck, 288/288 test e build demo OK; `git diff --check` OK.

- Titolo pagina e sezione Guida ridotti a «Fondi». Nello stato vuoto rimossa la nota sulle spese già registrate;
  «Può ricevere una ricarica ogni mese e avere un budget di spesa.» spostata su un paragrafo sotto la descrizione.
  Rimossi dal modulo i dettagli sui mesi corti e sulla disattivazione della ricarica; traduzioni inglesi aggiornate.
- `npm run check` **OK**: typecheck, **288/288** test e build demo; `git diff --check` OK.
  Nessuna modifica alla logica dei fondi, verifica cloud o pubblicazione da questa fase.

## Ripristino minimale e selezione ciambella — 8 novembre, 19:50

- Conflitto import: solo titolo «Impossibile unire il backup» e conteggio degli elementi diversi; nascosti file,
  statistiche e pulsante Unisci inutilizzabile. Restano Sostituisci (con la conferma/copia esistente) e Annulla.
  Traduzioni IT/EN e regressione i18n aggiunte; nessuna modifica alla logica di importazione.
- Ciambella: hover locale temporaneo distinto dalla selezione della Dashboard. Clic/tocco seleziona e mantiene
  evidenziata la fetta anche quando il puntatore esce; secondo clic la deseleziona, altro clic cambia categoria.
- Typecheck e build demo OK, `git diff --check` OK. Check completo: **275/276**, unico errore catalogo i18n nella
  fase concorrente fondi (`BudgetMeter.tsx`: «Budget superato di {p0}»). Aggiunta anche la traduzione mancante
  del nome accessibile generico di DateField rilevata dalla verifica precedente. Interazione browser/touch non verificata.

## Focus da tastiera — 8 novembre, 19:48

- Indicatore Tab dei controlli `StateLayerPressable` ora interno al bersaglio, per evitare tagli e sporgenze nei
  contenitori con overflow nascosto. Segmenti iniziale/finale arrotondati come la pillola esterna.
- Nei pulsanti Paper il focus sul ripple interno eredita il raggio della Surface e usa un contorno interno:
  correzione condivisa per pulsanti e azioni icona in Spese, Pagamenti ricorrenti, Categorie e dialoghi.
- `npm run check`: typecheck OK, **274/275** test; fallisce il controllo catalogo i18n per la chiave
  `{p0}: {p1}. Cambia data` di `DateField.tsx`, fuori dalle modifiche focus. Build demo separata e
  `git diff --check` OK. Nessuna verifica interattiva Tab nel browser disponibile; ricontrollare desktop e menu.

## Fase UI precedente — nome vista e centratura (8 novembre, 19:44)

- Vista Spese: «Abbonamenti» rinominata «Pagamenti ricorrenti» / «Recurring payments»; Guida e test i18n aggiornati.
  Selettore condiviso con altezza minima e testo a capo centrato, per mostrare integralmente il nome su schermi stretti.
- Centratura verticale della legenda Dashboard: `alignContent: center` oltre ad `alignItems: center` nelle righe
  con wrap (RN Web usa `alignContent: flex-start`, che lasciava spazio sotto il contenuto). Stessa correzione nelle
  anteprime icone delle Impostazioni; contenuto delle righe Barre centrato nella relativa altezza minima.
- Verifiche di questa fase: typecheck passato dentro `npm run check`; test i18n **7/7**, build demo separata **OK**,
  `git diff --check` **OK**. `npm run check` si è fermato ai test: **271/275**, quattro errori in contratto/pricing/
  abbonamenti/backup durante la fase concorrente fondi (`fund_id`, backup atteso v2 ma passato a v3).
  I file del dominio e quei test non sono stati modificati per questa correzione UI.
- Resa nel browser/dispositivi, IT/EN con cambio lingua/bozza e comportamento a 320 px non verificati:
  host del browser non disponibile. Verificare soprattutto centratura della riga selezionata e nome lungo nel selettore.
  Nessuna modifica dati/Rules o pubblicazione da questa fase UI; preservare il lavoro concorrente sotto.

## Git e fase corrente

- Ramo `main`, HEAD **`96777ac`**, «feat: update theme colors and improve transitions», 8 novembre 2026,
  19:29 +01:00. Allineato al riferimento locale `origin/main`; nessun fetch, stato remoto non verificato.
- Checkout pulito all’inizio della revisione documentale precedente, che ha aggiornato soltanto `AGENTS.md` e `HANDOFF.md`;
  nessuna modifica al codice applicativo da parte di questa revisione, commit o pubblicazione.
- **Fase fondi completata nel checkout, non committata** (sezione in cima): file di dominio, servizio, Rules, UI e test
  elencati lì, insieme alle fasi UI concorrenti (focus, ciambella, ripristino). Le funzionalità sotto descrivono la base
  committata più quanto indicato nelle sezioni datate.
- HEAD traccia ancora `.nummo-hybrid-12312.json`, config temporanea non coperta da `.gitignore`.
  Correzione dell’indice/ignore da fare separatamente, preservando il file se usato da un runner.
  Non ripulire `.firebase/`, lock, staging, `previous` o `emulator-data/` senza ispezione.
  Lo stato dei servizi utente non è stato ricensito in questa fase.

## Funzionalità implementate

Riscontro nel codice; il collaudo automatico non equivale a verifica cloud o su dispositivi.

- Google login popup, sessione SDK, logout dopo scritture pendenti, isolamento al cambio UID, avatar con fallback;
  errori login IT/EN con codici validati. Guida pubblica `#guida` con history e reload.
- CRUD spese con UUID stabile, conferma server, conflitti per revisione, verifica degli esiti incerti e copie di recupero
  in memoria. Bozza mantenuta tra sezioni. Pagina Spese con viste separate Spese (singole) e Abbonamenti (serie).
  Le singole hanno ricerca, filtro categoria, ordinamento e riepiloghi mensili; gli abbonamenti ricerca per nome
  normalizzata (accenti, maiuscole e spazi), dettagli espandibili e prossimi rinnovi.
- Ricorrenze settimanali/mensili/annuali, promozioni e prezzi per numero di rinnovo, fino a otto variazioni.
  Editor del prezzo per prossimo rinnovo o futuri senza riscrivere i pagamenti maturati; eliminazione dell’intera serie.
  Abbonamenti Attivo/In pausa/Annullato, riattivabili, con numero/totale/storico pagamenti (12 iniziali, poi tutti).
  Azioni di stato solo con sincronizzazione completa, transazione server e snackbar; nessun job o addebito automatico.
- Categorie sincronizzate con nomi unici, editor nome/icona transazionale, nessun limite numerico applicativo;
  45 icone in stili minimale, colorato e pixel. Cinque predefinite create una volta per UID/browser su archivio
  completamente vuoto confermato dal server, oppure dal pulsante esplicito a lista vuota, nella lingua corrente.
  Categoria obbligatoria nel modulo; riferimenti null/orfani nell’archivio mostrati come «Senza categoria».
- Dashboard: mese corrente/precedente, ultimi 3/6/12 mesi; Ciambella, Blocchi e Barre su proiezione comune di massimo
  otto serie con «Altre categorie» virtuale. Aggregazione completa preservata, colori stabili per ID su 12 slot.
  **Icone nella legenda e nelle righe Barre, nessuna icona nelle tessere Blocchi**; legenda con dettaglio completo.
  Etichette Blocchi adattive da 14 a 10 px; dettaglio giornaliero espandibile con sette giorni iniziali,
  esclusi giorni vuoti/futuri; oggi, se presente, dopo gli altri giorni visibili.
- UI Material 3 adattiva, tre destinazioni e azione Nuova spesa, dialoghi condivisi, temi chiaro/scuro/sistema,
  sei tinte, monocolore/palette, Google Sans locale o font sistema. IT/EN anche prima del login; preferenze browser
  senza rimontare sessione o bozze. Con tastiera virtuale rilevata, pillola nascosta e Salva nel flusso del modulo;
  a tastiera chiusa barra sticky e scroll padding per navigazione con tastiera fisica.
- CSV di consultazione: occorrenze fino a oggi al rispettivo prezzo, BOM/CRLF, `;`, virgola decimale, intestazioni
  italiane, testi quotati e formule neutralizzate. Nessun import CSV. JSON `nummo-backup` **v2**, unico ripristino,
  include gli stati; lettore v1 compatibile come «sempre attivo», versioni future rifiutate. Export server-only,
  categorie vuote incluse, esclusi metadati Firestore e UID/progetto; deterministico salvo `exported_at`.
  File UI fino a 5 MB; anteprima, unione senza sovrascritture, sostituzione confermata con copia automatica.
- Avvio con tema prima del bundle, preload font, safe area iniziale, SDK anticipati e segnaposto decorativo di sessione.
  Attesa dati fino a disponibilità/errore o 4 s, senza limite analogo al ripristino Auth.
  Ambienti demo/hybrid/cloud separati, runner con verifica progetto e protezione export, pubblicazione solo Hosting.

## Modifiche recenti rilevanti

- **`96777ac`**: ricerca abbonamenti; transizioni CSS condivise, dettagli con `Reveal`, interruttore animato tramite
  transform, barre con `scaleX`, transizioni pagina/state layer/avatar/ciambella; riduzione movimento gestita dal tema
  e dalle regole CSS. Ritoccati sprite wifi/auto/carburante/maglietta e riduzione del testo Blocchi prima di spezzare
  le parole. Manifest con `theme_color` chiaro statico. Test automatici passati; resa e fluidità reali da verificare.
- **`112ebcb`** (8 novembre, 17:49): include abbonamenti/stati, backup v2 e Rules, tre stili icone, grafici separati,
  predefiniti, avvio e tastiera mobile con relativi test. Il titolo del commit cita solo i test: non ne esaurisce il contenuto.
  Il precedente errore `CategoryLegend` (prop `categories` non destrutturata) è corretto nel checkout.
- **`d2fbe15`**: separazione CSV/JSON e piano import; **`cad1cc8`**: azioni backup mobile a larghezza piena;
  **`af3113e`**: bersagli touch e intestazioni; **`98d2e1b`**: dialoghi/editor/avatar.

## Decisioni tecniche

- BYOF sostituisce Sheets/callable: Firestore unica fonte, cache/coda/retry SDK e revisioni per conflitti espliciti.
- Prezzi indicizzati sul calendario originale preservano il passato. Lo stato cambia solo oggi e vale dalle occorrenze
  successive; riattivare mantiene il ciclo originale, anche dopo annullamento. Massimo otto cambi di stato.
  `status_changes` è una stringa compatta in Firestore, omessa se vuota, e un array nel backup: scelta per il budget Rules.
- JSON unico ripristino perché CSV espanso perde ID, piani e categorie vuote. Preflight completo e gruppi ripetibili
  (8 categorie o 200 spese); aggiunte transazionali per gruppo, **nessuna atomicità dell’intero ripristino**.
- Stili icone, budget grafico e segnaposto sono presentazione: non limitano l’archivio né anticipano l’autorizzazione.

## Problemi aperti e limitazioni

- **Compatibilità icone:** decoder/import rifiutano gli ID rimossi `receipt`, `phone`, `bed`, `ticket`, `briefcase`,
  `droplet`, `wrench`, oltre a `pill`, `book`, `plane`, `scissors`, `baby`, `flame`, `wine`, `umbrella`, `leaf`, `shield`,
  `ellipsis`. Vecchi record possono bloccare categorie e backup; nessun adapter, presenza nei dati personali non verificata.
- **Rules cloud:** il precedente handoff dichiarava non pubblicate le Rules per abbonamenti; nessuna pubblicazione
  o verifica cloud in questa fase. Con le Rules precedenti, pausa/annullamento sono rifiutati mentre la forma senza stati
  resta compatibile. Verificare anche l’allineamento del catalogo icone prima di distribuire.
  Budget di 1000 espressioni stretto: rimisurare ogni nuova validazione. Le Rules non verificano ordine/date civili
  degli stati né assenza di date future, controllati dai decoder. Client precedenti non leggono backup v2.
- **Backup/concorrenza:** letture separate delle collezioni, nessuno snapshot globale; il piano di sostituzione viene
  ricalcolato senza nuova anteprima e le eliminazioni batch non ricontrollano revisioni. Evitare modifiche concorrenti.
  Download automatico, interruzione/ripresa nel browser e CSV in Excel/LibreOffice ancora da collaudare.
- **Guida/avvio:** `Guide.tsx` non legge l’archivio, ma `warmUpServices()` parte da `App.tsx` con config valida anche su
  `#guida`: assenza di richieste Firebase non garantita, traffico non misurato. Resolver popup differito da provare con Google reale.
- **UI mobile, diagnosi storiche da riprodurre:** menu Categoria di Spese può allargare il layout viewport durante
  l’apertura Paper; scroll annidato nei menu bassi; a 320 px creazione categoria/etichetta Dashboard possono sbordare;
  menu Categoria può coprire la pillola; Nuova spesa in landscape può aprirsi scorsa per focus dell’anchor Menu.
  Non corretti né riverificati qui. Tastiera reale iOS, Gboard fluttuante/divisa e rotazione con tastiera aperta mancanti;
  al cambio larghezza il riferimento si azzera e la pillola può restare visibile.
- Contrasto 4,5:1 delle etichette Blocchi non garantito; font reali nelle tessere strette, animazioni/riduzione movimento,
  sagome icone e geometria interruttore richiedono collaudo visivo. Due schede possono confliggere sui predefiniti;
  un nuovo browser su archivio svuotato può ricrearli. Marcatore scritto prima del tentativo: dopo errore usare il pulsante.
- Nessun service worker o garanzia di avvio offline a freddo; splash Android statica. Recuperi dei rifiuti solo in memoria;
  cache persistente non cancellata al logout, guasto disco non provato. Collezioni caricate integralmente.
  Editor senza correzione prezzi maturati o aggiunta di variazioni programmate (rimozione disponibile).
  Licenza assente; audit non aggiornato (29 segnalazioni nel registro storico, non conteggio corrente).
- Richieste pregresse non risolvibili dal repository: scritta da rendere minimale senza testo ricevuto e scelta colori
  attivi mobile/rail. Richiedono contesto prima di intervenire; nessuna modifica autorizzata da questa revisione.

## Verifiche

**Eseguite in questa revisione con base Git `96777ac`**, dipendenze già presenti, Node **26.13.0**, npm **12.2.2**, Java **21.0.13**.
Al controllo finale sono emerse le modifiche concorrenti sui fondi: gli esiti sotto non certificano quel lavoro in corso.

| Comando | Esito e perimetro |
| --- | --- |
| `npm run check` | **OK**: typecheck, **275/275** test, export demo in `dist-demo/` (400 moduli, bundle circa 2,2 MB). |
| `git diff --check` | **OK** al controllo finale; nessun errore di whitespace. |
| `npm run check:env` | **OK**: policy dotenv sviluppo, senza certificare credenziali/cloud. |
| `npm run test:hybrid` | **8/8**: avvio, riuso, arresto/export, persistenza, servizio/progetto estraneo e guasti; Firestore demo reale, Expo simulato, dati temporanei. |
| `AUTH_PORT=39099 FIRESTORE_PORT=39280 npm run test:emulator -- --config .nummo-docs-review.json` | **13/13**: SDK/Rules, autorizzazione, CRUD, conflitti, offline, stati abbonamenti e import/round trip JSON. Config temporanea con UI disattivata e porte separate, rimossa dopo la suite. |

Le suite con porte locali non sono partite nel sandbox (SDK/Rules: `listen EPERM`), poi sono passate con autorizzazione
fuori dal sandbox. Non è prova di porte occupate o bug applicativo. I rifiuti Rules nei casi negativi sono attesi.
Nessun accesso cloud o arresto di servizi utente in questa revisione.

**Evidenza storica, non ripetuta qui:** il precedente handoff riporta Chromium headless con emulatori per CRUD,
viste abbonamenti e transazioni di stato; dopo la correzione della legenda, Dashboard desktop coerente con totale
calcolato a mano (440,30 € su 12 mesi). Ripetizione mobile Dashboard non completata per ripristino sessione.
Tastiera simulata riducendo il viewport a 320/360/412 px e altri formati: campi visibili e salvataggi demo a 320/412;
non riproduce una tastiera iOS reale. Anteprime SVG icone e prove focus SSR non sostituiscono il collaudo nell’app.
Misure d’avvio e limiti in `docs/avvio-prestazioni.md`: segnaposto anticipato circa 500–1300 ms in emulazione,
nessuna prova di miglioramento equivalente del tempo pronto o su Pixel 8.

**Non eseguiti qui:** `npm ci`/clone pulito, avvio interattivo dev/demo, `check:hybrid`, build/preview cloud,
dry-run/deploy, audit, misure d’avvio, browser, dispositivi reali o screen reader. Nessun lint configurato.
Precedenti build cloud/dry-run/header locali sono solo evidenza storica, non prova di pubblicazione attuale.

## Prossime attività, per priorità

1. **Fondi:** collaudo su telefono (touch, dialoghi a 320 px, landscape), eccezioni di budget e sospensione ricarica
   nell'interfaccia, unione/sostituzione backup v3 dall'interfaccia; poi pubblicazione autorizzata delle Rules prima
   di distribuire la build. Valutare unicità server del nome e sincronizzazione del fondo predefinito.
2. **Compatibilità prima della distribuzione:** decidere conservazione ID icona o migrazione esplicita e aggiungere
   regressioni decoder/import; verificare Rules cloud prima di usare gli stati. Dati personali e pubblicazione richiedono autorizzazione.
3. **Collaudo demo UI:** riprodurre i problemi mobile sopra; Dashboard mobile, ricerca/stati abbonamenti, icone nella
   legenda, tre stili, etichette Blocchi/font reali, contrasto, selezione/deselezione e tastiera Tab/Invio/Spazio.
   Poi animazioni con riduzione movimento, IT/EN/reload/bozze, dialoghi, touch, safe area, zoom e rotazione.
4. **Avvio/sessione/guida:** misurare rete su `#guida`; seguire `docs/avvio-prestazioni.md` su Pixel 8 e rete lenta;
   provare popup dopo logout/scadenza/revoca, storage negato, Android/iOS da Home e Safari/Firefox/Edge.
5. **Igiene Git separata:** ignorare e togliere dall’indice la config temporanea tracciata senza cancellare quella in uso;
   preservare dati e materiale di recupero. Nessun commit automatico.
6. **Backup in demo:** CSV in foglio reale; JSON unione/conflitti/sostituzione con copia automatica,
   interruzione/ripresa, file invalidi e modifiche concorrenti; predefiniti da due schede.
7. **Cloud solo con autorizzazione:** allineare Rules (stati e icone), owner e domini; verificare CRUD, account estraneo
   negato, due sessioni e ripristino, poi valutare Hosting. Nessuna pubblicazione attestata in questa fase.
8. **Riproducibilità:** clone pulito con `npm ci` su Node LTS, audit aggiornato e scelta licenza.
   Paginazione, service worker e rafforzamento backup sono evoluzioni da valutare, non lavori già implementati.
