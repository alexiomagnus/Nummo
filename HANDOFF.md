# HANDOFF — Nummo

Aggiornamento: **8 novembre 2026, ore 19:15 (Europe/Rome)**. Gestionale personale solo web, Google Auth e Firestore BYOF;
accesso riservato all’UID amministrativo in `config/owner`. Architettura, convenzioni e comandi:
`AGENTS.md`; configurazione: `README.md` e `docs/firebase-personale.md`; decisioni: `docs/architecture.md`.
Ultima fase: pagina Spese divisa in Spese/Abbonamenti con stati degli abbonamenti (sezione «Abbonamenti» sotto).
Requisiti e registri storici non attestano implementazione o pubblicazione.

## Git e lavoro da preservare

- Ramo `main`, HEAD **`112ebcb`**, «Add comprehensive tests for category icons, presentation, defaults, startup, and
  subscription features», 8 novembre 2026, 17:49 +01:00; contiene la fase abbonamenti, icone, avvio e test. Uguale al
  riferimento locale `origin/main` (0 commit avanti); nessun fetch, remoto non verificato.
- Non committato (`git status`): `HANDOFF.md`, `src/components/categoryPixelGlyphs.ts` (sprite wifi/car/fuel/maglietta),
  `src/features/dashboard/blockLabels.ts` + `tests/blockLabels.test.ts` (etichette Blocchi), `SubscriptionList.tsx`
  (ritocchi layout) e `public/manifest.webmanifest` (`theme_color` da `#121212` a `#F5FBF5`: origine non documentata;
  la splash Android usa questi colori statici, confermare l’intenzione prima del commit).
  Nessun commit o deployment da questo passaggio; preservare il lavoro preesistente.
- HEAD traccia `.nummo-hybrid-12312.json` (config temporanea del runner, rinominata dalla `-97110` già tracciata per errore);
  `.gitignore` non la copre. Da rimuovere dall’indice e ignorare in una fase di igiene separata; non cancellare
  config, lock, staging o copie `previous` di runner utente in uso.
- Il precedente passaggio segnalava hybrid su 8180/4000 ed Expo su 8081, con materiale di recupero in
  `.firebase/`. Stato dei processi **non riconfermato**: `ss` è limitato dal sandbox (`Operation not permitted`).
  Ispezionare prima di riavviare o ripulire; i test di questa revisione usano porte/dati separati.

## Implementato nel checkout

Riscontro nel codice e nei test automatici; non equivale a collaudo cloud o su telefono.

- Login Google popup, sessione SDK, logout dopo scritture pendenti, isolamento al cambio UID, avatar con fallback;
  errori login IT/EN con codici validati. Guida pubblica statica `#guida` con history e reload.
- CRUD spese con UUID stabile, conferma server, conflitti per revisione, verifica degli esiti incerti e copie di recupero
  in memoria. Bozza conservata tra sezioni; elenco con ricerca, filtri, ordinamento e riepiloghi mensili.
- Ricorrenze settimanali/mensili/annuali, promozioni e prezzi per numero di rinnovo; modifiche dal prossimo rinnovo,
  singolo o futuri, senza riscrivere il passato. Massimo otto variazioni; storico e prossimi rinnovi calcolati,
  nessun job o addebito automatico. Eliminare una ricorrenza elimina l’intera serie. Ogni serie è un abbonamento:
  stati Attivo/In pausa/Annullato con storico pagamenti nella vista Abbonamenti (vedi sotto).
- Categorie sincronizzate, nomi unici, editor nome/icona transazionale, nessun limite numerico applicativo;
  **40 icone** in tre stili (`minimal`, `colorful`, `pixel`), scelta solo di presentazione.
  Categoria obbligatoria nel modulo; null/riferimenti orfani ammessi nell’archivio, mostrati come «Senza categoria».
  Cinque predefinite create una volta per UID/browser su entrambe le collezioni vuote e confermate dal server;
  disponibili anche dal pulsante a lista vuota, con nomi nella lingua corrente.
- Dashboard: mese corrente/precedente, ultimi 3/6/12 mesi; Ciambella, Blocchi e Barre con proiezione comune di massimo
  otto serie e «Altre categorie» virtuale. Aggregazione completa preservata; colori stabili per ID su 12 slot,
  legenda con dettaglio completo e icone (le tessere dei Blocchi ne sono prive). Dettaglio giornaliero con sette giorni iniziali ed espansione,
  senza giorni vuoti o futuri; oggi, se presente, è collocato dopo gli altri giorni visibili.
- UI Material 3 adattiva, tre destinazioni e azione Nuova spesa, dialoghi condivisi, temi chiaro/scuro/sistema,
  sei tinte, monocolore/palette e font locale Google Sans/Sistema. IT/EN anche prima del login;
  lingua, aspetto, stile icone e scelte dashboard persistono nel browser, senza rimontare sessione/bozze.
- CSV solo consultazione: occorrenze fino a oggi al rispettivo prezzo, BOM/CRLF, `;`, virgola decimale,
  intestazioni italiane e testi quotati con formule neutralizzate. **Nessun import CSV.** JSON `nummo-backup` **v2**
  (stati degli abbonamenti; v1 letto come «sempre attivo») è l’unico ripristino: lettura server-only, categorie vuote incluse, metadati Firestore e UID/progetto esclusi;
  ordinamento deterministico salvo `exported_at`, vecchi v1 con campi extra leggibili, versioni future rifiutate.
  File UI massimo 5 MB; unione senza sovrascritture o sostituzione confermata con download della copia attuale.
- Avvio: tema prima del bundle, preload font, safe area iniziale, SDK anticipati; indizio di sessione solo visivo,
  segnaposto decorativo `StartupWorkspace` durante Auth e caricamento dati. Il gate dati termina per disponibilità,
  errore o dopo 4 s; non limita il tempo di ripristino Auth. Procedura e misure in `docs/avvio-prestazioni.md`.
- Ambienti demo/hybrid/cloud separati; runner hybrid verifica Firestore prima di Expo e protegge export/persistenza;
  build produzione isolata, script di pubblicazione limitato a Hosting.

## Modifiche recenti e stato

- **Abbonamenti (8 novembre, non committato).** Pagina Spese con `SegmentedButtons` Spese | Abbonamenti (larghezza
  piena della pagina su mobile e desktop). Spese: solo spese singole, stessi filtri/ricerca/ordinamento, intestazioni
  mensili senza abbonamenti. Abbonamenti (`src/features/history/SubscriptionList.tsx`): ogni serie ricorrente con importo
  del prossimo rinnovo, frequenza, prossimo rinnovo o data di pausa/annullamento e badge di stato (icona + testo);
  dettagli espandibili con pagamenti effettuati, totale speso, inizio e storico (12 più recenti, poi «Mostra tutti»);
  azioni Metti in pausa / Riattiva / Annulla abbonamento, disabilitate senza sincronizzazione completa, conferma dopo
  la transazione server e snackbar. «Prossimi rinnovi» spostato in questa vista. Nessuna nuova collezione: gli
  abbonamenti sono le stesse spese ricorrenti.
  Ritocchi successivi su richiesta: pillola a tutta larghezza anche su desktop; testo esplicativo sotto le azioni rimosso
  (resta solo l’avviso offline); icona × su «Annulla abbonamento»; 24 px prima dello storico; su mobile pulsanti
  `compact` di Paper (altezza 48 px invariata) affiancati. Misurato in Chromium headless: stessa riga a 412 px,
  a capo a 360 e 320 px (etichette mai troncate, ritorno a capo come riserva).
  Dominio `src/domain/subscription.ts` (stati, `setStatus`, codifica), occorrenze/previsioni/rinnovi che saltano i
  periodi non attivi in `history.ts`, `subscriptionSummaries`, `dataOf`; campo `status_changes` in contratto, editor
  (conservato), servizio (stringa compatta, omessa se vuota, `deleteField` al ritorno a vuoto), Rules, backup v2;
  icone UI `pause`/`play`; Guida e `en.ts` aggiornati. Dettagli e motivazioni: `docs/architecture.md`, sezione
  «Abbonamenti: vista separata e stati».
  **Le Rules modificate non sono pubblicate:** finché il cloud usa le precedenti, spese e serie senza stati funzionano
  (forma invariata), mentre pausa/annullamento vengono rifiutati con «Accesso negato».

- **Pizza colorata:** ridisegnata l’icona indicata dall’utente con fetta triangolare, bordo della crosta chiuso
  e tre condimenti leggibili. ID e palette arancione invariati; anteprima verificata a 24/96 px su chiaro/scuro.
  `npm run check` passato: typecheck, 259 test e build demo; collaudo nell’app non eseguito qui.

- **Carrello colorato:** aggiunto contorno nero a manico, cestello e ruote dell’icona indicata dall’utente,
  mantenendo i riempimenti verdi. Colore dedicato in `iconPalette.ts`, applicato solo al carrello colorato.
  Anteprima controllata a 24/96 px su chiaro/scuro; `npm run check` passato alle 17:24 (259 test, typecheck,
  build demo). Questo esito supera il blocco transitorio del typecheck riportato sotto; nessun collaudo nell’app qui.

- **Animazioni e transizioni (8 novembre, su richiesta, non committato).** Analisi: esistevano solo la transizione di pagina
  (opacità + 8 px), l'azione tonda della pillola (larghezza/scala), l'interruttore M3 (animava larghezza/altezza/left/top) e
  le animazioni di Paper (menu, dialoghi, snackbar, che seguono `theme.animation.scale`); state layer, selezioni di pillola/
  segmenti/chip, dimming dei grafici e apertura dei dettagli erano istantanei. Ora: `src/theme/motion.ts` (`transition`,
  `fadeTransition`, `fillTransition`: CSS via RN Web, token `motion`); `StateLayerPressable` e `HoverLayer` sfumano layer,
  sfondo, bordo e opacità (copre pillola, segmenti, chip, righe, barre); `Reveal` (fade + 4 px, solo opacity/transform) per i
  dettagli di abbonamenti, giorni della Dashboard e Prossimi rinnovi; `M3Switch` ora usa solo `transform` (maniglia fissa 24 px
  con scala 16/24) e colori in transizione; ciambella e foto account con transizione di opacità. `prefers-reduced-motion`
  (regola CSS globale) e `useReducedMotion` restano rispettati; nessun cambio di layout né di funzioni.
  Verifiche: `npm run check` OK (274 test, nuovo `tests/motion.test.ts`). **Non verificato nel browser/su telefono:** resa
  e fluidità reali (anche con riduzione movimento attiva), geometria della maniglia dell'interruttore (calcolata, non vista).
  Secondo passaggio «più smooth»: `motion.enter` (emphasized-decelerate) e `motion.long` 300 ms per la pagina; `Reveal` ora è
  un'animazione CSS keyframe (fuori dal thread JS); state layer a 100 ms per un feedback immediato; barre della Dashboard con
  `scaleX` + transizione 400 ms invece della larghezza. `npm run check` OK (275 test); resa non vista nel browser.
  Non toccate: animazione larghezza dell'azione tonda (resta layout, necessaria alla pillola flex), uscita dei dettagli
  (istantanea), animazioni interne di Paper.

- **Etichette dei Blocchi su mobile (su richiesta):** `blockLabelPlan` prova 14/12/11/10 px e rimpicciolisce il testo prima di
  spezzare una parola («Tecnolog/ia», «Alimenta/ri» nello screenshot a 412 px); solo l’ultimo livello può ancora spezzarla.
  Tessere larghe meno di 72 px usano 2 px di margine interno. Test aggiunto (273/273, `npm run check` OK). **Non verificato con il
  font reale nel browser:** «Tecnologia» in una tessera di circa 60 px è al limite; se si spezza ancora, valutare un livello a 9 px.

- **Sprite pixel `wifi`, `car`, `fuel` rigenerati (su richiesta):** `wifi` con arco esterno, arco interno e punto separati;
  `car` con contorno, tetto/finestrini in `t`, archi delle ruote; `fuel` con pompa 7 celle (finestrino in `t`) e tubo a destra.
  Anteprima 24/48/96 px chiaro/scuro, 9/9 test icone e `npm run check` OK; non verificati nell’app. Richiesta aperta: una scritta
  da rendere più minimale, il cui testo incollato non è arrivato (da richiedere all’utente).

- **Maglietta pixel art rigenerata (su richiesta):** lo sprite 6×8 senza contorno era illeggibile a 24 px. Ora 12×10
  celle con contorno `i`, massa `b`, polsini in `t`, scollo a V; ID e tinta rosa invariati. Anteprima 24/48/96 px chiaro/scuro
  verificata; 9/9 test icone e `npm run check` OK.

- **Ultima modifica dashboard:** icone spostate dalla legenda alle tessere dei Blocchi, rispettando lo stile scelto;
  spazio riservato sopra le etichette, omissione sulle tessere sotto 40×40 px. Legenda con colore, nome e valori.
  `npm run check` passato dopo la modifica: typecheck, 259 test e build demo; resa nel browser da verificare.

- **Non committate:** categorie senza limite e nuovi predefiniti; grafici separati e proiezione comune;
  stili colorato/pixel con preferenze e test; ottimizzazioni d’avvio e script di misura; icone nelle tessere dei Blocchi, legenda senza icone;
  selezione/deselezione Blocchi anche da tastiera; focus dei campi Data/Categoria e viewport mobile.
  Implementazione presente e check automatici passati; accettazione visiva ancora parziale.
- **Tastiera virtuale in Nuova spesa (8 novembre, non committato):** prima, con tastiera aperta, barra superiore,
  «Salva» sticky e pillola lasciavano ai campi 263 px su 503 (412×915 emulato) e Descrizione finiva sotto «Salva»:
  toccarla premeva il pulsante. Ora `observeVirtualKeyboard` (`viewport.ts`: campo di testo attivo + viewport visibile
  < 80% del massimo alla stessa larghezza, zoom ignorato) alimenta `KeyboardContext` in `AppShell`: pillola nascosta
  (`display: none`, resta montata), campo attivo riportato in vista; `ExpenseForm` toglie lo sticky a «Salva», che resta
  in fondo al modulo. Con tastiera chiusa lo sticky pubblica la sua altezza (`reserveScrollPadding`) e `GlobalStyle` la
  applica come scroll padding **solo** con `data-input='key'`: Tab non porta più Categoria sotto «Salva» a 320×568.
  **Verificato in Chromium headless** (tastiera emulata riducendo il viewport, come `resizes-content`) a 320/360/412,
  safe area 24/24, tablet 800, desktop 1280 e landscape 740: campi mai coperti, modulo scorrevole, ripristino alla
  chiusura, apertura in cima, salvataggio confermato in Firestore emulato a 412 e 320, Spese/Dashboard/Categorie invariate.
  **Da provare su dispositivo:** tastiere reali Android/iOS (iOS sposta solo il visual viewport), app da Home, Gboard
  fluttuante/divisa, rotazione con tastiera aperta (il riferimento si azzera: la pillola può restare visibile).
  L'icona «grafico» vicino a Descrizione citata dall'utente è con ogni probabilità quella di Dashboard nella pillola
  (unica icona `chart` in quella pagina); screenshot non ricevuto, non confermato.
- Rimosse rispetto a HEAD le icone `receipt`, `phone`, `bed`, `ticket`, `briefcase`, `droplet`, `wrench`
  anche da catalogo e Rules locali. **Distribuzione delle Rules correnti non verificata**; nessuna pubblicazione qui.
  Disegni e sprite sono stati rivisti; il precedente handoff riporta campioni SVG e prove SSR del focus,
  non un collaudo completo nell’app. Provare anche le sagome pixel meno riviste (`bike`, `car`, `paw`, `gamepad`).
- Ultimi commit utili: `d2fbe15` separa CSV/JSON e introduce piano import; `cad1cc8` azioni backup mobile;
  `af3113e` bersagli touch/intestazioni; `98d2e1b` dialoghi/editor/avatar; `31a5d3b` IT/EN; `6a27536` runner hybrid.
  Non risultano altre attività assegnate deducibili dal solo repository: la coda sotto è proposta operativa.

## Decisioni e motivazioni

- BYOF sostituisce Sheets/callable: una fonte di verità, coda/cache/retry SDK e revisioni contro conflitti silenziosi.
  Prezzi per indice di rinnovo preservano lo storico; massimo otto variazioni per i limiti di valutazione Rules.
- JSON unico ripristino: il CSV espanso perde ID, piani e categorie vuote. Preflight completo, identici saltati,
  gruppi di otto categorie o 200 spese per rispettare le Rules; dopo interruzione ripetere lo stesso file.
  Ogni gruppo di aggiunte è transazionale, **l’intero ripristino non è atomico**.
- Abbonamenti: un cambio di stato vale dalle occorrenze successive al giorno in cui è fatto, per non alterare
  mai lo storico; riattivazione sul ciclo originale e annullamento riattivabile (scelte dell’utente). In Firestore
  stringa compatta perché il budget di 1000 espressioni delle Rules era già quasi esaurito da 8 variazioni di prezzo.
- Proiezione grafica e stile icone restano presentazione: il budget visuale non limita archivio o aggregazioni.
  Il segnaposto d’avvio migliora la continuità visiva, senza promettere dati pronti altrettanto prima.

## Problemi aperti e limiti

- **Dashboard irraggiungibile (risolto, 8 novembre 17:45):** `CategoryLegend.tsx` (modifica concorrente delle 17:26) usava
  `categories` senza riceverla tra le props: `ReferenceError` al render, l’app si smontava cliccando Dashboard e il
  typecheck falliva. Corretto aggiungendo `categories` alla destrutturazione (prop già dichiarata e passata da
  `Dashboard.tsx`). Resta da decidere se la legenda debba mostrare le icone: l’ultima voce «Ultima modifica dashboard»
  descrive una legenda senza icone, mentre il file del 17:26 le reintroduce (ora le mostrano sia legenda sia tessere).
  Su richiesta dell’utente (17:50) nella legenda l’icona sta a sinistra del nome: colore → icona → nome → importi;
  slot vuoto per le serie sintetiche. `npm run check` OK (272 test); resa non ricontrollata nel browser.
  Su richiesta (17:48) **nessuna icona sulle tessere dei Blocchi**: solo nome/importo/percentuale, che riprendono
  tutto lo spazio della tessera; le icone restano solo nella legenda. `BlockChart` non riceve più `categories`.
- **Abbonamenti:** Rules non pubblicate (vedi sopra); stato solo con effetto da oggi (nessuna data scelta); massimo 8
  cambi di stato per serie (poi messaggio: crearne una nuova); margine stretto sul budget Rules, da rimisurare a ogni
  nuovo controllo sulle spese. Le Rules non verificano ordine delle date né «non nel futuro» (lo fa il decoder).
  Un’app di versione precedente rifiuta i backup v2.
- **Compatibilità icone:** i sette ID sopra e gli undici rimossi in precedenza (`pill`, `book`, `plane`, `scissors`,
  `baby`, `flame`, `wine`, `umbrella`, `leaf`, `shield`, `ellipsis`) sono rifiutati da decoder/import correnti.
  Vecchi record possono bloccare categorie e backup; nessun adapter, presenza nei dati personali non verificata qui.
- **Guida:** il componente non legge l’archivio, ma `App.tsx` chiama `warmUpServices()` all’import con config valida,
  anche su `#guida`. Il requisito di assenza di richieste Firebase non è garantito; traffico non misurato.
- Backup legge le collezioni separatamente, senza snapshot globale. In sostituzione il piano ricalcolato non viene
  rimostrato e i batch di eliminazione non ricontrollano le revisioni: evitare modifiche concorrenti.
  Download automatico, interruzione/ripresa nel browser e apertura CSV in Excel/LibreOffice restano da provare.
- Contrasto 4,5:1 delle etichette Blocchi non garantito; icone, grafici, touch/focus, dialoghi, IT/EN e bozze senza
  collaudo visivo completo. Due schede possono confliggere sui nomi dei predefiniti; un nuovo browser su archivio
  svuotato può ricrearli. La guardia locale viene scritta prima del tentativo: dopo errore usare il pulsante esplicito.
- **Layout mobile (diagnosi in emulazione dell'8 novembre, non corretti):** il `MenuSelect` Categoria di Spese, allineato a
  destra, sborda durante l'animazione di apertura di Paper e Chrome mobile allarga il layout viewport (412×915 → 586×1302)
  finché il menu resta aperto: probabile causa della navigazione «sollevata». Doppio scroll annidato nei menu con poco
  spazio (landscape); a 320 px riga di creazione categoria e etichetta «Dashboard» della pillola sbordano; il menu
  Categoria di Nuova spesa può coprire la pillola. In landscape 740×360 Nuova spesa si apre già scorsa: il `Menu` Paper
  montato chiuso mette il focus sull'anchor (preesistente, confermato sulla build precedente).
- Popup Google reale con resolver differito, revoca sessione, storage negato, Pixel 8, Android/iOS da Home,
  Safari/Firefox/Edge, safe area, densità frazionarie e screen reader da verificare.
- Nessun service worker o garanzia d’avvio offline a freddo; splash Android statica. Recuperi dei rifiuti solo in memoria;
  cache persistente può restare dopo logout, guasto disco non provato. Collezioni caricate integralmente.
  Editor senza correzione prezzi maturati o aggiunta di variazioni programmate (rimozione disponibile).
  Colori attivi mobile/rail ancora da decidere; licenza assente. Audit storico: 29 segnalazioni, non audit corrente.

## Verifiche di questa revisione

**Riverifica del 19:15 (passaggio di contesto, nessuna modifica al codice):** Node 26.13.0, npm 12.2.2, dipendenze già
presenti. `npm run check` **OK**: typecheck, **273/273** test, build demo (402 moduli, bundle ~2,2 MB). Non rieseguiti
`test:emulator`, `test:hybrid`, `check:env`, browser: gli esiti sotto sono quelli precedenti.

**Fase abbonamenti (fino alle 17:37; i conteggi test sono quelli di allora),** Node 26.13.0, Java 21.0.13, porte 39099/39280 con config temporanea rimossa;
servizi utente su 8180/4000/8081 intatti:

| Comando | Risultato |
| --- | --- |
| `npm run check` (dopo la correzione di `CategoryLegend.tsx`, 17:45) | **OK**: typecheck, 272/272 test, build demo. Prima della correzione si fermava al typecheck. |
| `npm test` | **272/272**, inclusi `tests/subscription.test.ts` (13 casi: stati, pausa/riattivazione/annullamento, storico invariato, riepiloghi = dashboard, separazione senza doppi conteggi, contratto, codifica, editor, backup v1/v2, CSV) e i18n. |
| `npm run build:demo` | **OK** (567 moduli). |
| `npm run test:emulator` (porte alternative) | **13/13**, nuovo caso abbonamenti: Rules su stati validi/invalidi, campo assente compatibile, 8 stati + 8 prezzi, omissione/rimozione del campo, conflitto di revisione, round trip backup. |
| Sonda Rules temporanea | Tutte le combinazioni 0–8 prezzi × 0–8 stati accettate dopo l’ottimizzazione (prima fallivano già 8 prezzi + lista vuota). |
| Chromium headless su build demo con emulatori | **30/31 controlli**: viste e segmenti, esclusione reciproca, ordine e badge, storico/numero/totale di una serie annullata con pausa intermedia, pausa → riattiva (stesso giorno, campo rimosso) → annulla salvati in Firestore, mobile 412×915 chiaro IT e desktop 1280×900 scuro EN. Fallito solo il controllo Dashboard per l’errore di `CategoryLegend.tsx`, poi corretto: ripetuta su desktop 1280×900 con Blocchi e Barre, Dashboard visibile, nessuna eccezione, totale 12 mesi 440,30 € coerente con pagamenti di serie attive, in pausa e annullate (calcolato a mano). La ripetizione mobile si è fermata alla schermata di accesso (sessione della sonda non ancora ripristinata), quindi non verificata. |
| `git diff --check` | **OK**. |

Non eseguiti in questa fase: `test:hybrid`, dispositivi reali, cloud, screen reader, tastiera.

**Revisione documentale precedente (17:07).** Dipendenze già presenti; Node **26.13.0**, npm **12.2.2**, Java **21.0.13**.

| Comando | Risultato |
| --- | --- |
| `npm run check` | **OK**: typecheck, **259/259** test (rieseguito dopo le modifiche concorrenti alla tastiera), export demo in `dist-demo/` (bundle circa 2,2 MB). |
| `npm run check:env` | **OK**, policy dei file dotenv di sviluppo. |
| `AUTH_PORT=39099 FIRESTORE_PORT=39280 npm run test:emulator -- --config .nummo-docs-emulator.json` | **12/12**: SDK/Rules, autorizzazione, CRUD, conflitti, offline e import/round trip JSON. Config temporanea derivata da `firebase.json`, UI disattivata, porte separate; rimossa a fine test. |
| `npm run test:hybrid` | **8/8**: avvio/riuso, rifiuto progetto o servizio estraneo, arresto/export, persistenza e guasti; Firestore demo reale, Expo simulato, dati temporanei. |
| `git diff --check` | **OK**. |

Le suite con porte locali inizialmente bloccate da `listen EPERM` nel sandbox sono passate con autorizzazione
fuori dal sandbox. Le suite SDK/Rules e hybrid precedono le sole modifiche concorrenti a tastiera/UI;
il check finale le include. Non è evidenza di porte occupate o bug applicativo. Gli errori `PERMISSION_DENIED` nei casi
negativi della suite Rules sono attesi. Nessun accesso al cloud o modifica ai servizi utente effettuati qui.

**Evidenza precedente, non ripetuta:** prove Chromium con emulatori (CRUD/offline/icone), recupero hybrid,
SSR del focus, build cloud/dry-run/header locali e misure d’avvio descritte in `docs/avvio-prestazioni.md`.
Quel documento riporta il segnaposto circa 500–1300 ms prima in emulazione; tempo pronto circa invariato
con CPU ×4 a caldo e primo testo 100–300 ms più tardi. Non certifica rete reale o Pixel 8.
**Non eseguiti qui:** `npm ci`/clone pulito, avvio interattivo dev/demo, `check:hybrid`, build/preview cloud,
dry-run/deploy, audit, misure d’avvio, browser o dispositivi reali. Nessun lint configurato.

## Prossime attività, per priorità

0. **Legenda della Dashboard:** decidere se tenere le icone nella legenda oltre che nelle tessere dei Blocchi; provare la
   Dashboard anche su mobile.
1. **Compatibilità prima della distribuzione:** decidere conservazione ID icona o migrazione esplicita; aggiungere
   regressioni decoder/import. Dati personali e pubblicazione Rules richiedono autorizzazione separata.
2. **Collaudo UI in demo:** tre stili e legenda, focus Tab/Invio/Spazio di Data/Categoria, secondo clic Blocchi,
   contrasto e grafici con molte categorie/importi piccoli; poi IT/EN, reload/bozze, dialoghi, touch, zoom e rotazione.
3. **Avvio e guida:** seguire `docs/avvio-prestazioni.md` su Pixel 8 reale, verificare popup dopo logout/scadenza,
   splash/tema e rete lenta; misurare richieste su `#guida` e correggere il bootstrap se richiesto.
4. **Igiene Git, fase separata:** ignorare config temporanee e confermare la rimozione di quella tracciata;
   preservare runner e dati di recupero, rivedere tutti i file nuovi prima di eventuali commit richiesti.
5. **Backup e concorrenza in demo:** CSV in foglio reale; JSON unione/conflitti/sostituzione con copia automatica,
   interruzione/ripresa e file invalidi; creazione predefiniti da due schede.
6. **Cloud/dispositivi solo con autorizzazione:** pubblicare le Rules (abbonamenti e icone) prima di distribuire la
   build con gli stati; controllare owner/Rules/domini, CRUD, account estraneo negato,
   due sessioni e ripristino; allineare Rules e poi valutare Hosting. Nessuna pubblicazione Hosting attestata qui.
7. **Riproducibilità:** installazione e guida da clone pulito su Node LTS, audit aggiornato e licenza.
   Paginazione, service worker e rafforzamento backup sono evoluzioni da valutare, non lavori già implementati.
