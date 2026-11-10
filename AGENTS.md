# Nummo — istruzioni per gli agenti

Gestionale personale di spese, solo web, con Firebase personale configurabile (BYOF).
Firestore è l'unica fonte di verità. Stato, problemi e verifiche correnti: `HANDOFF.md`.

## Fonti e precedenze

- Codice e verifiche descrivono lo stato effettivo; requisiti e registri storici non provano implementazione o pubblicazione.
- `docs/architecture.md` e `docs/migrazione-byof.md`: decisione BYOF del 2 novembre 2026, che sostituisce Sheets/callable.
- `recap.md`: specifica originale v0.4, storica; leggerla integralmente prima di modifiche funzionali, non modificarla.
- `README.md` e `docs/firebase-personale.md`: configurazione e uso; `docs/progress.md`: registro storico.
- Mantenere qui architettura, strumenti e convenzioni stabili; aggiornare `HANDOFF.md` a fine fase o prima del passaggio di contesto.

## Architettura e directory

`index.ts` → `App.tsx` (tema, lingua, sessione) → `RemoteWorkspace` con key UID → `AppShell` adattivo.
Stato React locale e Context di presentazione, nessun router/store globale. Quattro destinazioni (Spese, Dashboard, Fondi, Liste) e «Nuova spesa»
come azione primaria: mai due navigazioni. Impostazioni, Categorie e Importa ed esporta: pagine del menu account fuori dalle destinazioni (contatori
`settingsRequest`/`categoriesRequest`/`backupRequest` da `App.tsx`; Categorie anche dal modulo), «Fatto» torna alla sezione di partenza.
Da disconnessi Impostazioni sostituisce la schermata di accesso. Nessun dialogo per le impostazioni. Smartphone: pillola nel flusso del layout, destinazioni uguali
con icona/etichetta (sotto 380 dp etichetta `labelSmall`), attiva su `primaryContainer`: un solo indicatore che scorre con la molla
`spatialSpring` (M3 Expressive) e segue il dito trascinato sulla pillola, aprendo la destinazione al rilascio (pointer event DOM,
geometria pura in `navIndicator.ts`, click successivo al trascinamento soppresso); pulsante tondo in `primary`, nascosto nella pagina Nuova.
Desktop: rail/drawer con FAB. Le azioni di Nuova spesa sono sempre nel flusso, dopo tutti i campi, senza barra sticky.
Il contenuto occupa sempre tutta la larghezza del pannello, anche su monitor grandi: nessun limite
di larghezza né colonna centrata in `AppShell`. Salva su expanded non cresce a tutta riga (minimo 192 px).
La navigazione mobile si nasconde già al tocco su un campo scrivibile (anticipo con scadenza se non segue la tastiera)
e, dopo conferma dal viewport, resta nascosta durante la chiusura fino al recupero dell'altezza;
il solo focus da tastiera fisica non la nasconde. `KeyboardContext` in `AppShell` condivide solo questo stato visuale.
Barre sticky in fondo a uno scroller: pubblicarne l'altezza con `reserveScrollPadding` (`viewport.ts`), applicata
come scroll padding solo in navigazione da tastiera fisica (il focus programmatico dei `Menu` Paper non deve scorrere).

| Percorso | Responsabilità |
| --- | --- |
| `src/domain/` | Funzioni pure senza SDK: validazione, contratti, categorie, ricorrenze, prezzi per numero di rinnovo, stati degli abbonamenti (`subscription.ts`), fondi/ricariche/budget/saldi (`funds.ts`), liste della spesa (`shoppingList.ts`), storico, invio, decoder Firestore e backup/import/CSV. |
| `src/services/` | Configurazione pubblica a build, Auth e cache Firestore, listener, CRUD e transazioni con revisioni, export server-only e import per gruppi; selezione foto account. Con indizio di sessione, `initializeAuth` omette il resolver popup, passato esplicitamente a `signInWithPopup`. |
| `src/features/session/` | Login Google popup, sessione SDK, logout dopo le scritture pendenti; guida pubblica statica `#guida` con history/link diretto/reload, senza letture o scritture dell'archivio. Il bootstrap Auth è in `App.tsx`. Errori login: solo codici `auth/...` validati, mai messaggi grezzi/token. |
| `src/features/workspace/` | Composizione sezioni, listener e sincronizzazione; stato smontato al cambio UID. Navigazione locale in `WorkspaceNavigation`, sotto i listener: i cambi pagina non ricreano gli store. Spese, Dashboard, Fondi e Liste montate alla prima visita e conservate con `Activity` nascosta (effetti sospesi); filtri e stato visuale restano fino al cambio UID. Copertura iniziale limitata a 4 s; `StartupWorkspace` mostra shell e caricamento, senza un secondo modulo fittizio. Il modulo reale resta montato per conservare misure e bozza, invisibile e `inert` finché mancano i dati necessari; il limite di attesa libera la navigazione, non i campi incompleti. |
| `src/features/expenses/` | Modulo, validazione, `ExpenseStore`, `useRemoteExpenses`, editor; nessun archivio locale applicativo nel percorso attivo. |
| `src/features/categories/` | Categorie con ID stabili e nomi unici tramite indice `categoryNames`; cinque predefinite (Alimentari, Intrattenimento, Shopping, Tecnologia, Trasporti) create una volta per account/browser su archivio vuoto confermato dal server (`workspace/seedDefaults.ts`), altrimenti dal pulsante a lista vuota. `CategoryEditor` salva nome/icona insieme. Nessun limite applicativo al numero di categorie; unicità e validazione dei record restano obbligatorie. |
| `src/features/history/`, `dashboard/` | Occorrenze calcolate fino a oggi, non materializzate nel database; pagina Spese in due viste a segmenti, spese singole (`ExpenseList`) e abbonamenti = serie ricorrenti (`SubscriptionList`, stati e storico pagamenti); ciambella SVG DOM e blocchi/treemap puro su proiezione comune (`categoryPresentation.ts`), barre complete senza raggruppamenti, ordinate per spesa, lunghezza relativa alla categoria maggiore e quota sul totale esplicita, riepilogo e andamento SVG giornaliero (`insights.ts`). Variazione per categoria nelle Barre sui giorni precedenti di pari durata, solo con base positiva e storico sufficiente, nessun confronto globale; dettagli categoria in sola lettura sui dati già caricati; andamento con selezione del giorno e lettura di data/importo, senza apertura delle transazioni giornaliere. |
| `src/features/lists/` | Liste della spesa: panoramica, checklist (`ListsPage`), dialoghi lista/prodotto, conferma `RegisterListDialog` (riusa `ExpenseFields`/`FundField`); `useRemoteLists` con scritture semplici accodate dall'SDK per liste e prodotti e registrazione in transazione server (una spesa + archiviazione). |
| `src/features/funds/` | Pagina «Fondi e budget» (mese navigabile, effettivo/previsione): spesa del mese totale e per fondo, budget mensile generale facoltativo (`GeneralBudgetDialog`), fondi semplici (nome, icona, colore, budget; `FundEditor`/`fundFromForm`), spese del fondo nel mese, assegnazione esplicita delle spese senza fondo, `FundField` del modulo spesa. Saldo, ricariche e movimenti solo per i fondi che li avevano (`hasBalanceData`); `useRemoteFunds` con mutazioni solo in transazione server. |
| `src/features/backup/` | Pagina «Importa ed esporta» dal menu account sotto Categorie, fuori dalle destinazioni; azioni mantenute montate per conservare anteprima e operazioni al cambio sezione. CSV solo consultazione; JSON unico ripristino, riepilogo, unione senza sovrascritture o sostituzione con conferma/copia automatica. Nessun import CSV o adapter localStorage. |
| `src/features/settings/`, `src/i18n/` | Pagina `SettingsPage` (sezioni in due colonne da medium); aspetto, IT/EN, stile delle icone di categoria e scelte di dashboard (grafico, periodo, andamento mostrato/nascosto) in `nummo.preferences.v1` nel browser; italiano iniziale. `I18nProvider` cambia lingua senza rimontare sessione/bozze; nessuna sincronizzazione Firebase. |
| `src/components/`, `src/theme/` | Controlli Material 3, shell, icone, notifiche; palette e token condivisi, transizioni CSS in `motion.ts` e apertura dettagli con `Reveal`; overlay condivisi in `Overlay.tsx` (menu, fogli, base di `AppDialog`). `colors.panel`/`panelColor()` per pannelli desktop. |
| `firestore.rules` | Accesso Google del solo UID in `config/owner` (amministrativo); namespace `users/{uid}` con `expenses/{uuid}` (con `fund_id` facoltativo), `categories/{uuid}`, `categoryNames/{name_key}`, `funds/{uuid}`, `movements/{uuid}` (immutabili), `settings/budget` (budget mensile generale, stringa compatta), `lists/{uuid}` e `listItems/{uuid}` (senza revisione), spese con `list_id`/`list_items` facoltativi; validazione di campi, tipi, importi, date, versioni e indici. |
| `scripts/` | Seed solo localhost; policy ambienti, runner hybrid, build cloud e pubblicazione solo Hosting. `measure-startup.mjs`: misura d'avvio in emulazione, procedura in `docs/avvio-prestazioni.md`. Config temporanea `.nummo-hybrid-<PID>.json` rimossa all'arresto: mai versionarla. |
| `tests/` | Node runner per dominio/tema/i18n/config/strumenti; `emulator/` per SDK/Rules e `integration/` per lifecycle hybrid. |
| `public/` | Modello HTML, manifest statico neutro, icone e font locali copiati nell'export; nessun service worker. `GlobalStyle` aggiorna theme-color e viewport via VisualViewport, senza reflow durante pinch zoom. Lo script inline `nummo-boot` di `index.html` legge solo valori di presentazione validati (`nummo.boot-theme.v1`, `nummo.session.hint.v1`) e ripiega sui colori statici. |
| `firebase.json` | Rules, emulatori e Hosting da `dist/`, fallback SPA, HTML/manifest no-cache, bundle Expo immutable, font/icone 1 giorno; niente COOP/COEP che interferirebbero col popup Google. |
| `docs/testing/` | Backup JSON fittizi (dati TEST, date fisse) e guida ai risultati attesi per il collaudo d'importazione, preferibilmente in demo; aggiornarli con il `backupVersion`. |
| `emulator-data/`, `emulator-seed/` | Archivio personale persistente ignorato da Git; account Auth demo versionati. |

`dist/` (cloud) e `dist-demo/` sono generati e ignorati. `.firebaserc` è personale e ignorato: nessun progetto CLI
predefinito nel repository. `functions/` può contenere `.env` personali ignorati del vecchio backend: non versionarli
né cancellarli senza conferma. Backend storico recuperabile da `fe759d5`, adapter localStorage da `e2b84d3`.
Gli SVG in `docs/design/logo-concepts/` sono studi separati: non integrarli senza richiesta esplicita.
Chiavi `localStorage` dell'app: `nummo.preferences.v1`, `nummo.boot-theme.v1`, `nummo.session.hint.v1`,
`nummo.defaultCategories.v1.<uid>`, `nummo.defaultFund.v1.<uid>` (solo ID del fondo predefinito); nessun dato di spesa. L'indizio di sessione serve solo alla presentazione
(segnaposto d'avvio, connessioni anticipate): non concede mai accesso, l'app attende sempre Firebase Auth.
Aggiornare `Guide.tsx` quando cambiano le funzioni descritte; non presentare l’app come aperta a registrazioni.
La splash Android usa colori/icone statici del manifest, non il tema o accento scelti nell’app.
La barra di navigazione dell'app installata usa solo il `theme_color` del manifest (scuro, `#121212`), fissato nella
WebAPK: la pagina e il tema di Nummo non possono cambiarla; non reintrodurre un `theme_color` chiaro.

## Stack e comandi

TypeScript 6 strict/noUncheckedIndexedAccess, Expo 58/Metro, React 19.3, RN 0.88, RN Web 0.21,
Paper 5, Firebase JS SDK 13 (app/auth/firestore), Firebase CLI 15. Versioni risolte nel lockfile;
non aggiungere dipendenze senza richiesta. Solo target web. Node `^22.18 || ^24.3 || ^26` (preferire LTS), npm;
Java per emulatori. La tabella descrive gli script del repository; esecuzioni verificate e limiti sono in `HANDOFF.md`.

| Comando | Uso |
| --- | --- |
| `npm ci` | Installazione da lockfile; verifica da clone pulito distinta dai check su dipendenze presenti (esiti in `HANDOFF.md`). |
| `npm run emulators`, poi `npm run emulators:seed`, poi `npm run dev:demo` | Demo interamente locale `demo-nummo`: Auth 9099, Firestore 8180, UI 4000, loopback; ignora config reale. |
| `npm run dev` | Hybrid: Google reale da `.env.local`, Firestore emulato; avvia/riusa Firestore verificato prima di Expo. Nessun `dev:cloud`. |
| `npm run emulators:seed:owner -- ID_PROGETTO UID` | Predispone proprietario locale esplicito, non inventa UID e non modifica il cloud. |
| `npm run check:env` / `npm run check:hybrid` | Policy dotenv sviluppo / solo raggiungibilità TCP manuale, senza certificare progetto/Rules/proprietario. |
| `npm run check` | Typecheck, test app e `build:demo` in `dist-demo/` (mai pubblicare). |
| `npm run typecheck` / `npm test` / `npm run build:demo` | Singole parti di `check`; test con runner Node, export web con Metro. |
| `npm run test:emulator` | SDK Auth/Firestore e Rules demo; avvia/arresta emulatori, richiede porte libere. |
| `npm run test:hybrid` | Lifecycle con Firestore demo reale ed Expo simulato, porte/dati temporanei. |
| `npm run build:cloud` / `npm run preview:cloud` | Build in `dist/` / serve l'export locale: usa progetto reale, nessuna scrittura senza autorizzazione. |
| `npm run deploy:hosting` | Unico flusso previsto di pubblicazione, solo con autorizzazione; ricostruisce e pubblica solo Hosting sul progetto della build. `-- --dry-run` non pubblica; `-- --channel nome` pubblica anteprima per 7 giorni. |

Modalità scelta **solo dai comandi npm**, `EXPO_PUBLIC_NUMMO_BACKEND=emulator|hybrid|cloud`;
assente/ignota/`firebase` o configurazioni miste bloccano la sessione. Quattro `EXPO_PUBLIC_FIREBASE_*` da
`.env.local` in sviluppo, `.env.production.local` o shell/CI in produzione. Mai backend o `*_EMULATOR` nei
`.env*`: `check:env` li rifiuta perché in `expo start` il file prevale sulla shell.
Cache Firestore in memoria; `EXPO_PUBLIC_FIRESTORE_CACHE=persistent` opt-in su dispositivi fidati, cache SDK
IndexedDB e non archivio parallelo. Env Expo con accessi letterali; per aggiornamenti Metro usare `-- --clear`.

Hybrid: endpoint predefinito `127.0.0.1:8180`, override shell `EXPO_PUBLIC_FIRESTORE_EMULATOR` solo localhost/127.0.0.1.
Il runner usa il parser dotenv di Expo per entrambi i processi; riusa solo istanze con progetto/PID/endpoint verificati.
Import da `emulator-data/`, export in staging e promozione dopo successo, copia in `.firebase/hybrid-*/previous`,
lock `.firebase/hybrid.lock`. Un solo Ctrl+C ferma i processi propri; preservare lock/staging/originali su export fallito
o arresto forzato e ispezionare prima di ripartire. Variante manuale: `npm run emulators:personal -- --project ID`;
`emulators:real` usa l'alias personale `real` e importa/riesporta `emulator-data/`.

Build cloud: disabilita dotenv Expo (`EXPO_NO_DOTENV=1`), legge solo `.env.production.local` + shell, rifiuta conflitti,
config incomplete, endpoint locali, progetti demo e `EXPO_PUBLIC_*` sconosciute; imposta cloud e scansiona il bundle,
cancellandolo se non valido. Non usare `firebase deploy` senza `--only hosting`: includerebbe anche le Rules.
La CLI deve sempre ricevere `--project ID`; pubblicazione Rules separata e autorizzata.

Porte occupate: non fermare emulatori utente; config temporanea **nella radice**, `--config`, `AUTH_PORT` e
`FIRESTORE_PORT` per suite/seed; `EXPO_PUBLIC_AUTH_EMULATOR` e `EXPO_PUBLIC_FIRESTORE_EMULATOR` per demo web.
Rimuovere solo la propria config a fine verifica. Test in-process con `--experimental-test-isolation=none` e
strip-types, import `.ts` nei moduli testati direttamente; niente enum o parameter properties.

## Convenzioni

- Codice inglese, documentazione italiano, **UI italiano e inglese**. Per ogni nuovo
  testo, errore, guida o etichetta accessibile usare `useI18n().t('testo italiano')`
  e aggiungere la traduzione in `src/i18n/en.ts`; interpolare con `{p0}`, `{p1}`, ecc.
  I messaggi di dominio/servizi restano puri e si traducono al confine UI; conservarli
  nella lingua sorgente nello stato. Niente stato globale mutabile per la lingua.
  Usare `formatAmount`/`formatDate` del contesto o `locale` per `Intl` nella UI.
  Non tradurre descrizioni, nomi di categorie già salvati, ID o campi dei backup;
  solo le categorie predefinite appena create assumono la lingua corrente.
  Valuta EUR, date civili Europe/Rome, calcoli e formato CSV/JSON restano invariati.
  Nei grafici tradurre solo serie sintetiche tramite `seriesLabel`, mai nomi utente.
  Estendere `tests/i18n.test.ts` per nuovi casi; verificare entrambe le lingue,
  persistenza della scelta e conservazione delle bozze. Non riscrivere UI senza necessità.
- Stati degli abbonamenti: si scrive solo il cambio di oggi, valido dalle occorrenze successive; mai alterare pagamenti
  già maturati. In Firestore `status_changes` è una stringa compatta e solo se non vuoto; nel backup è un array.
  Rimisurare con l'emulatore il budget di espressioni delle Rules a ogni nuovo controllo sulle spese.
- Prove gratuite: `expense_date` è l'inizio, `first_payment_date` (solo serie, documento schema 2) l'inizio del calendario
  pagato (`trial.ts`); importi sempre positivi, nessuna occorrenza durante la prova. Stato «In prova gratuita» calcolato,
  mai salvato. Indice 0 = primo addebito, soggetto a pause/annullamenti per le prove; stato cambiato oggi vale da domani.
  Prima data modificabile solo finché futura; prova salvata non rimovibile né aggiungibile retroattivamente a serie ordinarie.
  Schema 2: prezzi compatti in Firestore (`pricing.ts`), array nel dominio/backup v5; schema 1 e record esistenti invariati.
  I vecchi client rifiutano lo schema 2 invece di conteggiare pagamenti inesistenti: aggiornamento client necessario.
- Cambio di frequenza (#9): il numero di occorrenza non cambia mai (i prezzi lo usano), cambiano solo le date dalla modifica in
  poi: `calendar_changes` (indice, nuova data di partenza, frequenza; massimo 4) riavvia il calendario dall'occorrenza successiva
  a oggi (`recurrence.ts`: `scheduleDates`/`scheduleDateAt`/`recurrenceAt`; mai `occurrenceDates` direttamente per le serie).
  `recurrence` resta la frequenza di base; `Occurrence.recurrence` e `SubscriptionSummary.frequency` danno quella in vigore.
  Schema 3 (prezzi compatti, prova facoltativa); Firestore: una stringa compatta e solo se non vuota, nel backup (v6) un array.
  Senza pagamenti maturati (prova in corso) cambia direttamente la frequenza di base. Un cambio non ancora in vigore si sostituisce.
  Le Rules verificano forma e che la versione non regredisca né il campo si accorci; la correttezza in avanti è del decoder.
- Fondi: saldo, ricarica, budget e speso restano grandezze distinte (`src/domain/funds.ts`). Ricariche **calcolate**
  dal piano come le occorrenze (una per mese, giorno limitato alla fine del mese, contata solo se ≤ oggi): mai scritte
  come documenti né in render/effect. Modifiche a ricarica/budget solo da ora in poi (mai il passato); `start_date` del
  fondo immutabile. Trasferimento = un solo documento, escluso da entrate e spese. Piani in Firestore come stringhe
  compatte (`recharges`, `budgets`, `budget_exceptions`), nel backup come array. Spese senza `fund_id` = «Senza fondo»,
  assegnate solo su richiesta esplicita; un fondo con movimenti o spese si archivia, non si elimina.
- Fondi semplificati (#7): fondi e budget sono sempre facoltativi, nessun passaggio obbligato in Nuova spesa («Nessun fondo» di base, `resolveFund`).
  Un nuovo fondo ha solo nome/icona/colore/budget (saldo iniziale 0, nessuna ricarica); la pagina privilegia la spesa per fondo. I dati di
  saldo esistenti (saldo iniziale, ricariche, movimenti, eccezioni) non si eliminano né si nascondono per i fondi che li hanno: `fundFromForm`
  riscrive invariato tutto ciò che il modulo non mostra. Budget generale = un solo documento `settings/budget` con lo stesso piano compatto del
  budget ricorrente (`setGeneralBudget`: vale dal mese corrente, mesi chiusi invariati), confrontato con la spesa totale del mese; nel backup v6 come
  `general_budget` (unione: riempie solo un budget vuoto, mai sovrascrive; sostituzione: lo uguaglia al file).
- Importi in centesimi interi; data civile Europe/Rome, timestamp Firestore server in
  UTC. Data vuota = oggi alla validazione. Limiti client in `policy.ts`, corrispettivi
  in Rules da aggiornare e testare insieme (le Rules non importano TypeScript).
- Dati non fidati validati runtime; archivi corrotti negano modifica/esportazione,
  mai nascondere righe invalide o sovrascriverle silenziosamente.
- Nessun invio di spese in render/effect (unica scrittura automatica: le categorie predefinite, vedi `seedDefaults.ts`). SDK gestisce coda/retry. Confermare solo dopo server;
  `hasPendingWrites` non è successo; `fromCache` non equivale a offline.
- Un UUID per creazione. Non reimplementare sincronizzazione/idempotenza con un
  secondo archivio. Modifiche/eliminazioni/categorie online in transazione con la
  revisione vista all'apertura; conflitti espliciti. Salvataggi incerti: verifica in
  lettura, mai nuovo ID automatico. Conservare le copie di recupero visibili.
- Importazione sempre esplicita, file originali intatti, preflight completo (file + dati del server) prima della prima
  scrittura, poi gruppi ripetibili; elementi identici saltati, mai riscritti. L'unione non sovrascrive; la sostituzione
  elimina solo ciò che differisce dal file e richiede conferma. Non promettere atomicità dell'intero archivio.
  Backup server-only, nessun dato privato inserito nei log. JSON: solo dati di ripristino (niente UID/progetto, revisioni,
  `updated_at`, `name_key`), ordinamento deterministico (`exported_at` variabile); cambi incompatibili → nuovo
  `backupVersion` + lettore storico in `readers`.
  CSV: intestazioni italiane, `;` come separatore, virgola decimale, BOM, una riga per occorrenza fino a oggi,
  testi con formule neutralizzati dall'apostrofo e sempre quotati.
- Liste della spesa: liste e prodotti salvati con scritture semplici (ultima vince, nessuna revisione); la registrazione è
  l'unica scrittura economica, una transazione che crea **una** spesa singola con `list_id`/`list_items` (nomi spuntati,
  in Firestore una stringa unita da `\n`, nel backup un array) e archivia la lista. Eliminare quella spesa riattiva la
  lista nella stessa transazione; modificarla conserva collegamento e prodotti. Backup `backupVersion` 6.
- `DeleteAction` per ogni eliminazione; conserva l'azione/versione vista nella conferma.
  `AppDialog` per tutti i dialoghi: superficie dedicata, contorno, limiti viewport/safe area;
  contenuti lunghi in `ScrollArea` + `ScrollView`, azioni esterne all'area scorrevole.
  `Button` (unico pulsante), `ListRow`/`IconTile` (riga di Spese e Categorie), `ChoiceChips`,
  `SegmentedButtons`, `SwitchRow`/`M3Switch`, `SelectField` (foglio dal basso su smartphone, menu da medium), `DateField` (picker modale), `Card`,
  `StateLayerPressable` per componenti Material 3 personalizzati.
  Raggi (`radius`: controlli 20, pulsanti/campi/card 16, dialog 28, `pill`), `inputOutline` (per ogni `TextInput` outlined) e `layout` da `src/theme/tokens.ts`. Font e spessore icone (`typefaces`, `iconStroke`) dai token; font in `public/fonts/`. Colori solo dai token (`src/theme/`, `useTheme()`), niente hex sparsi;
  esiti temporanei con `useSnackbar()`; layout per classe di finestra con `useSizeClass()`.
  Per le animazioni riusare `motion`/`motion.ts` (`transitions` per durate/curve per proprietà) e `Reveal`, rispettando
  `prefers-reduced-motion` con `useReducedMotion()`: `theme.animation.scale` non è affidabile, perché `PaperProvider`
  con un tema esplicito lo forza sempre a 1.
- Overlay (`Overlay.tsx`, unico livello per menu, fogli e dialoghi): mai Paper `Menu` o `Modal`/`Dialog` diretti.
  `usePresence` + transizioni CSS solo su `transform`/`opacity`; superfici opache in pochi frame all'ingresso
  (`motion.fade`), uscita con `motion.exitEasing` senza copie semitrasparenti sulla pagina; con movimento ridotto
  montaggio/smontaggio immediati. Escape chiude; il focus va alla prima voce e torna all'elemento d'origine con
  `preventScroll`. Chiusi non montano nulla (nessun focus al montaggio). `AppDialog` conserva Title/Content/ScrollArea/
  Actions di Paper. `SelectField`/`MenuSelect`: `BottomSheet` su compact (sopra navigazione e scrim, lista scorrevole,
  trascinamento della maniglia o della lista se è in cima; nodi da ref a callback perché il `Portal` Paper monta dopo),
  `AnchoredMenu` da medium (sotto il campo o sopra se manca spazio, geometria pura in
  `menuGeometry.ts`); `AccountMenu` usa `AnchoredMenu` allineato a destra; `Menu.Item` Paper solo come riga.
  `MenuSelect` per selettori compatti (ordina/filtri), `FieldIcon` per icone decorative dei campi.
  Il menu di `MenuSelect` è largo max(campo, voce più lunga misurata da un clone nascosto) entro i margini dello schermo:
  mai etichette troncate per un campo stretto. `#root` ha `overflow: clip`: overlay in movimento non allargano la pagina.
  Nei campi-azione (`SelectField`, `DateField`) il `Pressable` esterno è l'unico
  bersaglio: input e icone decorativi in un contenitore DOM `inert`. Il solo
  `pointerEvents="none"` sul contenitore non neutralizza le Surface Paper interne.
- Accessibilità `role`/`aria-*`: RN Web 0.21 ignora `accessibilityState` nel DOM.
  TextInput Paper: `readonly`, non `disabled`, quando si verifica sola lettura.
- Icone UI SVG inline (`SvgIcon`/`iconShapes`, non seguono lo stile scelto). Le icone di categoria hanno tre stili di
  visualizzazione, preferenza `iconStyle` (`minimal` predefinito | `colorful` | `pixel`) in `nummo.preferences.v1`, mai nei dati:
  glifi outline 24×24 in `categoryGlyphs.ts`, disegni colorati in `categoryColorGlyphs.ts` e sprite pixel art (griglia ≤12×12 a
  caratteri, scala ×2, solo celle intere) in `categoryPixelGlyphs.ts`, con ruoli colore `{b}{t}{i}{o}{l}`
  risolti per tema da `theme/iconPalette.ts` (niente hex nei disegni). Solo `categoryIconSets.ts` (puro) sceglie il disegno e i
  fallback (pixel → colorato → outline → segnaposto) e la dimensione (`glyphSize`: il pixel si aggancia a multipli di 12); solo `CategoryGlyph` lo mostra, con lo stile da `IconStyleProvider` (sopra
  `PaperProvider`, come la lingua) o dalla prop `style`. Nuova icona: aggiornare insieme `categoryIconLabels`, glifo minimale,
  disegno colorato con tinta per significato, sprite pixel (dettagli sottili in b/t, mai solo in `i`) e Rules (`tests/categoryIcons.test.ts` impone la corrispondenza e i contrasti);
  prima di rimuovere un identificativo valutare compatibilità di record e backup esistenti.
- Grafici: palette categoriale stabile, legenda e tabella, colore legato alla categoria;
  proiezione visuale separata dall’aggregazione completa (`categoryPresentation.ts`), gruppi virtuali mai salvati.
  Colori deterministici sulla palette finita (`categoryColorSlots`: slot distinti fino a 12 categorie con spese, stabili tra periodi), dettaglio completo anche se oltre 12 si ripetono;
  seguire la skill dataviz se disponibile quando si modificano grafici/palette.
- Web è l'unico target: non promettere persistenza RN nativa, PWA o avvio offline a
  freddo. Distinguere cache dati, disponibilità bundle, login e test su dispositivi.

## Vincoli operativi

Nessun segreto, cancellazione dati, modifica alle credenziali, cloud reale, deployment,
fatturazione o servizio aggiuntivo senza autorizzazione. Niente commit automatici,
`npm audit fix --force`, SQLite, Drive, Sheets o Cloud Functions senza richiesta.

Una fase verificabile alla volta; niente OCR/Google Pay o evoluzioni fuori richiesta.
Prima di dichiarare concluso eseguire `npm run check`; per accesso dati/Rules anche
`test:emulator`. Aggiornare `HANDOFF.md`; decisioni in `docs/architecture.md`; questo
file solo per architettura, strumenti e convenzioni stabili. Separare sempre prove
emulate da verifiche cloud/dispositivi effettivamente eseguite.
