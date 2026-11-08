# Architettura Nummo — Firebase personale

Aggiornamento: 2 novembre 2026. La richiesta BYOF sostituisce la direzione Sheets di
`recap.md` v0.4, conservata come specifica originale. Analisi della base e piano
incrementale: [migrazione-byof.md](migrazione-byof.md).

## Flusso attivo

```text
Expo web / React Native Web / Material 3
  ├─ Firebase Authentication: Google, sessione gestita dall’SDK
  └─ SDK Firestore: listener, cache, coda e retry nativi
       └─ Security Rules: UID proprietario + provider Google + validazione
            └─ Cloud Firestore del progetto configurato dall’utente
```

Firestore è l'unica fonte di verità per spese e categorie. Nessuna callable, Sheets
API, Drive, database locale indipendente, backend gestito dallo sviluppatore o servizio
aggiuntivo nel percorso attivo. La cache IndexedDB opzionale appartiene all'SDK
Firestore: non è un archivio applicativo parallelo. Il client non contiene Admin SDK,
chiavi private o token copiati manualmente.

Stack effettivo: Expo 58.0.22, React 19.3, React Native 0.88.1, RN Web 0.21.4,
Paper 5.15.4, Firebase JS SDK 13.1.0, TypeScript 6.0.3. Nessuna nuova dipendenza.
`App` gestisce tema/sessione; `RemoteWorkspace`, montato con chiave UID, gestisce sezioni,
listener e bozze. Il dominio rimane puro. Le sezioni ricevono `ExpenseStore`, categorie
e callback; il servizio `createFirestoreStore` riceve database e UID ed è testato con
veri SDK contro emulatori.

Avvio del modulo (7 novembre 2026): la lettura iniziale delle due collezioni è distinta
dall'archivio vuoto. Il campo Categoria mantiene il proprio ingombro e indica
«Caricamento…» fino a categorie disponibili o a uno snapshot server che ne confermi
l'assenza; una cache iniziale vuota non basta. Un errore di lettura è esposto come tale.
Le categorie valide già in cache sono utilizzabili subito (resta visibile lo stato di sincronizzazione).
I campi bloccati usano sola lettura e trigger disabilitati, preservando i contorni anche nel
tema scuro; bozza e modulo rimangono montati. Nessun ritardo artificiale o scrittura all'avvio.

Avvio dell'app (8 novembre 2026; misure e procedure in `avvio-prestazioni.md`). Il primo fotogramma usa lo sfondo
del tema scelto (`nummo.boot-theme.v1`, scritto da `GlobalStyle`, letto da uno script inline di `index.html`), e
`@font-face`/preload del font stanno nell'HTML. Se la visita precedente era una sessione (`nummo.session.hint.v1`,
solo presentazione, mai accesso) si mostra `StartupWorkspace`, la pagina «Nuova spesa» con campi disabilitati, sopra la
schermata reale finché dati o errore (o i 4 s) la rilasciano; così guscio e modulo non cambiano durante il ripristino della
sessione. Con l'indizio, Auth è inizializzato senza `popupRedirectResolver` (l'SDK su mobile lo inizializza subito e
aspetta gapi/iframe prima di ripristinare l'utente) e il resolver è passato al solo `signInWithPopup`; gli SDK partono
all'import (`warmUpServices`). Motivazioni e limiti (prova solo emulata, popup reale non provato dopo logout): vedi il documento.

## Schema e proprietà

| Percorso | Contenuto |
| --- | --- |
| `config/owner` | `{ uid: string }`, creato solo dall'amministratore via Console o bootstrap emulatore |
| `users/{uid}/expenses/{uuid}` | campi `ExpenseData`, `created_at`, `updated_at` Timestamp Firestore, `revision` intera da 1 |
| `users/{uid}/categories/{uuid}` | `label`, `icon` oppure null, `name_key`, `revision`, `updated_at` Timestamp |
| `users/{uid}/categoryNames/{name_key}` | `{ category_id: uuid }`, indice di unicità aggiornato nella stessa transazione |

Una spesa contiene `amount_minor` intero positivo ≤ 9.999.999, `currency=EUR`,
`description` obbligatoria ≤100 caratteri, `category_id` UUID o null,
`expense_date` come data civile ISO `YYYY-MM-DD` dal 2000 a oggi a Roma,
`recurrence` null/weekly/monthly/yearly, `source=web_app`, `schema_version=1`.
L'ID è il nome del documento, esposto come `id` al dominio; in ingresso il modulo
continua a generare `expense_id` una volta. I timestamp server sono convertiti in ISO
UTC al confine, con stime SDK solo per le visualizzazioni pendenti.

Ricorrenze/abbonamenti rimangono attributi della spesa. Occorrenze e dashboard sono
calcolate fino a oggi, con riduzione al giorno valido nei mesi corti. La data iniziale
rimane invariata nell'editor; modificare/eliminare una serie riguarda tutte le sue
occorrenze. Non vengono creati job, addebiti automatici o nuove collezioni.

Categorie: normalizzazione NFC e spazi, nomi unici senza distinzione di caso,
ID e icona conservati nelle rinomine. `name_key` = `n-` + nome minuscolo con `%` e `/`
escapati; le regole verificano l'associazione reciproca con `getAfter`. Un client non
può creare una categoria senza prenotarne il nome, rubare un indice, o lasciarlo
orfano dopo una rinomina/eliminazione. Le regole controllano tipi/campi, limiti,
icone, revisioni, timestamp e date; le normalizzazioni Unicode complete appartengono
al dominio e i decoder rifiutano archivi non conformi. Le cinque predefinite (Alimentari, Intrattenimento, Shopping, Tecnologia, Trasporti)
si creano una sola volta, in un effetto del workspace, quando spese e categorie sono entrambe vuote
in snapshot del server senza scritture pendenti né errori; un marcatore `localStorage` per UID
impedisce di ricrearle dopo che l'utente le elimina. In ogni altro caso restano disponibili
con il pulsante della lista vuota. Il tentativo è una scrittura sola, non un invio nel render.
Eliminare una categoria non altera le spese: i riferimenti mancanti appaiono senza
categoria, preservando la semantica precedente.

`owner(uid)` richiede autenticazione Google, UID del percorso uguale al token e al
documento amministrativo. Il client non può creare/modificare `config/owner` o
scegliere un altro proprietario. Nessun accesso agli archivi tecnici legacy; tutto il
resto è negato. In produzione la verifica dei token è responsabilità di Firebase,
non del JavaScript dell'app. Gli emulatori sono strumenti locali, non un confine di
sicurezza pubblico: non esporne le porte. Il vecchio `ALLOWED_UID` resta solo nel
backend isolato; nel nuovo percorso si trasferisce manualmente in `config/owner`.

## Sincronizzazione e conflitti

`onSnapshot` con `includeMetadataChanges` aggiorna UI, categorie, storico e dashboard.
`fromCache` significa dati non ancora verificati dal server, non prova di assenza rete;
`navigator.onLine` è un indizio separato. `hasPendingWrites` distingue le scritture
locali dal salvataggio confermato. La data di aggregazione si aggiorna anche a focus
ed entro un minuto dal cambio giorno.

- Inserimento: un solo `setDoc` con UUID stabile e timestamp server. SDK accoda e
  ritenta. Il modulo si svuota solo dopo conferma server con ID/payload corrispondenti.
  Il tentativo di sovrascrivere un ID già creato con `revision=1` è respinto.
- In esito incerto, «Verifica sul server» legge soltanto: nessun secondo inserimento.
- Aggiornamenti/eliminazioni e categorie: transazioni online. Si conserva la versione
  vista all'apertura dell'editor/conferma; una revisione diversa produce conflitto e
  richiede di riaprire la modifica. Niente last-write-wins nascosto nella UI.
- Ricaricamento con cache persistente: la coda SDK è recuperata; lo stato pendente e
  la spesa appaiono nel listener anche se la vecchia Promise JavaScript non esiste più.
  Il modulo appena riaperto è una nuova bozza, non un reinvio della vecchia richiesta.
- Rifiuti/rollback delle spese osservate come pendenti: la UI conserva una copia in
  memoria e propone il download prima di uscire/chiudere. Non reinvia automaticamente
  né crea un secondo archivio persistente. Un rifiuto completato prima che un listener
  osservi il dato pendente non è un registro durevole degli errori: Firestore non offre
  una cronologia applicativa dei rifiuti. La cache può inoltre essere cancellata dal
  browser; per i dati confermati usare backup manuali.
- Logout: attende le scritture pendenti; dopo 5 secondi senza completamento segnala di
  riconnettersi, mantenendo la sessione. Logout/cambio UID smonta listener e stato UI.
  La cache SDK non viene cancellata automaticamente: i dati possono restare sul disco
  del dispositivo fidato, pur non essendo mostrati all'altro account dall'app.

Persistenza predefinita: memoria. `EXPO_PUBLIC_FIRESTORE_CACHE=persistent` abilita
`persistentLocalCache` con `persistentMultipleTabManager` quando IndexedDB è disponibile;
il fallback del SDK resta in memoria negli ambienti non compatibili. Non promettere
recupero dopo chiusura in modalità memoria/private browsing o se lo storage è negato.
Nessun motore di sincronizzazione personalizzato.

## Consultazione di spese e dashboard

Nell'elenco Spese ogni occorrenza occupa una riga intera, anche su desktop, e mostra
inizialmente descrizione/importo e azioni;
data, categoria e ripetizione si consultano nel pannello aperto dalla freccia della
riga. Il dettaglio usa solo le occorrenze già caricate; più pannelli possono restare
aperti, con stato indipendente per chiave di occorrenza. La matita apre l'editor;
«Elimina» è solo nell'editor, con conferma e revisione del record vista all'apertura.
Per una ricorrenza elimina l'intera serie; non salva prima le modifiche della bozza.

Categorie senza limite numerico applicativo: rimossi i controlli di creazione e importazione;
le Rules già non contano le categorie. Schema e backup v1 invariati, nessuna migrazione dati.
`breakdown` conserva tutte le categorie con spese nel periodo, senza raggruppamenti, e tratta
null/riferimenti orfani come «Senza categoria». Le categorie inutilizzate non compaiono nei grafici.
`categoryPresentation` produce la stessa proiezione per ciambella, blocchi e barre: oltre otto serie,
principali per importo + «Altre categorie», lasciando «Senza categoria» distinta. È un budget visivo,
non un limite dati: la legenda espande tutti i membri di Altre con percentuali sul totale completo.
I gruppi non entrano in Firestore o nei backup. I colori derivano dall’ID su 12 slot esistenti:
restano stabili tra periodi/ordinamenti/rinomine ma possono ripetersi, con etichette sempre disponibili.
Tre modalità esplicite: Ciambella (`donut`), Blocchi (`blocks`, treemap recuperata da `d2fbe15`),
Barre (`bars`, estratte dal precedente fallback). Blocchi conserva sempre rettangoli proporzionali,
anche su mobile: gutter ridotti sulle tessere sottili senza espandere l’area nelle tessere vicine;
contenuto interno solo se leggibile, dettagli completi nella legenda collegata via `aria-describedby`.
Etichette adattive (`blockLabels.ts`): misura Canvas nel font scelto, padding e altezza utile;
Icona di categoria da 24 px sulle tessere di almeno 40×40 px, con spazio riservato;
nello spazio restante nome completo (a capo), poi importo/percentuale. Font 14/12 px, mai ridotto sotto 12; ricalcolo dopo caricamento font.
I dettagli completi sono visibili selezionando una tessera con tocco/focus e nella legenda.
Testo e icone bianchi nel tema scuro, `onSurface` nel tema chiaro, indipendenti dal riempimento categoriale;
niente opacità sulle tessere non selezionate, contorno per la selezione. Geometrie, importi e altri grafici invariati.
Le tessere sotto 48 px non aggiungono minuscoli bersagli al percorso Tab: i controlli della legenda restano disponibili.
Barre mostra nomi/importi/percentuali una volta sola; la legenda aggiunge soltanto l’eventuale dettaglio di Altre.
Le tre scelte sono persistite nello stesso campo browser; `blocks` già salvato resta Blocchi. Menu compatto mobile,
chip a capo su desktop; nessun cambio automatico di visualizzazione al ridimensionamento.

Dashboard: grafico e periodo sono preferenze di presentazione in `nummo.preferences.v1`,
insieme a tema e lingua; caricati da `App` e passati alla dashboard senza un secondo stato persistente.
Vecchie preferenze o valori invalidi usano ciambella/mese corrente. Se lo storage è negato,
le scelte restano nella sessione; nessun dato Firebase aggiunto. «Ripristina» nelle impostazioni
ripristina anche queste scelte. La lista giorni parte nascosta a ogni mount della dashboard;
«Mostra giorni con spese» / «Nascondi giorni con spese» controlla solo la visibilità locale.

Stile delle icone di categoria (8 novembre 2026): preferenza di visualizzazione `iconStyle` (`minimal` | `colorful` | `pixel`) in
`nummo.preferences.v1`, con le altre scelte di aspetto; predefinito `minimal`, mancante o invalido ricade su `minimal`.
Non entra in Firestore, backup, CSV o Rules: gli ID icona salvati restano gli stessi, cambia solo il disegno. Il minimale
è il set outline originale (`categoryGlyphs.ts`, invariato); il colorato (`categoryColorGlyphs.ts`) ridisegna le stesse icone (40 dall'8 novembre 2026, dopo la rimozione di `wrench`, `briefcase`, `droplet`, `phone`, `bed`, `ticket` e `receipt`)
con forme piene a due toni e contorno, senza emoji Unicode né raster, per un aspetto uguale su ogni piattaforma.
Colori: nove tinte (`theme/iconPalette.ts`) assegnate **per significato** (cibo, trasporti, salute, svago…), non per categoria
dell'utente né per gradimento; indipendenti dall'accento scelto. Ruoli per disegno: base `b`, tinta `t`, inchiostro `i`,
sul-base `o` e linea `l` (tratti liberi, chiari nel tema scuro dove il contorno scuro si confonde col fondo). Ogni coppia
usata è controllata da test per contrasto (base e linee ≥3:1 sulle superfici di ogni accento e modo, inchiostro su tinta
≥4,5:1). Architettura: `categoryIconSets.ts` (puro) è l'unico punto che associa ID, stile e tema a un disegno, con fallback
colorato → outline → segnaposto tag e nessun errore per ID ignoti; `CategoryGlyph` è l'unico componente che lo disegna e legge
lo stile da `IconStyleProvider`, posto sopra `PaperProvider` perché dialoghi e menu in portale lo ereditino. Nessun
componente delle pagine conosce lo stile. Eccezioni consapevoli: `IconTile` usa 24 px invece di 20 per il colorato (i disegni
pieni lo richiedono per leggersi). Su richiesta dell'utente (8 novembre 2026) le icone sono nelle tessere di
`BlockChart`, sopra le etichette, e non nella legenda (`CategoryLegend`), che conserva colore, nome, importo e percentuale.
Le serie sintetiche (Altre categorie, Senza categoria) non hanno icona. Le tessere troppo piccole restano identificabili
nella legenda; quelle con spazio per la sola icona possono mostrarla senza testo. Le Barre mantengono l'icona nella riga.
Le icone di navigazione e azione non seguono lo stile. Le icone restano
decorative (`accessible={false}`): il nome della categoria è sempre accanto o nell'etichetta del controllo. Nessun lampeggio
all'avvio: la preferenza è letta in modo sincrono con le altre e le icone compaiono solo dopo il montaggio di React.

Stile pixel art (8 novembre 2026): terzo valore di `iconStyle`, aggiunto senza toccare gli altri due set. Ogni categoria ha uno
sprite in `categoryPixelGlyphs.ts`: righe di caratteri (`.` vuoto, `i` inchiostro, `b` base, `t` tinta, `o` sul-base) su una griglia
di al più 12×12 celle, centrata su una tela 12×12 e mostrata a 24×24 (due pixel per cella). `spriteMarkup` (puro) unisce le celle
uguali di una riga in un solo tratto per colore e disegna senza antialiasing (`shape-rendering="crispEdges"`), con gli stessi ruoli
colore e le stesse nove tinte per significato del colorato: nessun hex, nessun raster, nessuna dipendenza. Scelta della griglia 12:
con 24 px la cella resta di due pixel interi, quindi i bordi sono netti; una griglia 16 darebbe celle da 1,5 px sfocate. Per lo
stesso motivo `CategoryGlyph` aggancia la dimensione al multiplo di 12 più vicino solo in questo stile (`glyphSize`: 20 → 24,
26 → 24), e `IconTile` usa 24 px come per il colorato. Nel tema scuro l'inchiostro è scuro quanto la pagina: i dettagli sottili
sono quindi in `b`/`t` e ogni sprite deve avere almeno dieci celle piene (test). Fallback pixel → colorato → outline →
segnaposto; stessi ID, nessuna modifica a Firestore, Rules, backup o CSV. Etichetta «Pixel art» tradotta in en.ts.

Dashboard, dettaglio giornaliero (8 novembre 2026): elenco compatto dei giorni con
spese per tutti i periodi (anche 3/6/12 mesi), dal più recente, sette iniziali con
espansione esplicita. Senza titolo/intestazione mensile: il mese è nella data di ogni
riga, con anno quando l'intervallo attraversa due anni. I giorni senza
spese si possono mostrare; quelli futuri sono esclusi. Una riga espandibile mostra
le occorrenze originali già caricate (categoria, descrizione e importo), senza nuove
letture o scritture. Totali e grafici mantengono l'aggregazione esistente; cambio
periodo/mese azzera espansione e filtri del dettaglio.

Ciambella: l'affiancamento della legenda dipende dalla larghezza effettiva del
contenitore (almeno 616 px), così rail e drawer non comprimono il grafico. Raggi
proporzionali su superfici strette e testo confinato al foro, con descrizione
accessibile completa anche quando il nome viene troncato visivamente.

## Piattaforme

| Ambiente | Stato |
| --- | --- |
| Web Chromium Linux | Collaudo concreto con Auth/Firestore emulati, cache persistente, reload e offline |
| Web Chrome Android, Safari iOS | Obiettivi; dispositivi reali e OAuth mobile da verificare |
| React/Expo web | Build/typecheck verificati; unico target dichiarato in app.json |
| App native Android/iOS | Non implementate: UI SVG DOM e login popup richiedono adattamenti; il Firebase JS SDK in RN non fornisce persistenza Firestore nativa equivalente |
| Installazione Android (manifest + icone) | Manifest e icone presenti (6 nov 2026); installabilità non provata su dispositivo; niente service worker |
| Apertura a freddo senza rete | Non implementata: manca il service worker; cache dati ≠ disponibilità offline del bundle |
| Firebase Hosting | Configurato in `firebase.json` e `npm run deploy:hosting` (solo Hosting); nessuna pubblicazione eseguita |

**Tastiera virtuale (8 novembre 2026).** Nessuna API web la segnala ovunque (`navigator.virtualKeyboard` solo Chromium
e con contenuto sovrapposto), quindi è dedotta: campo di testo attivo e viewport visibile sotto l'80% del più alto
osservato alla stessa larghezza (`observeVirtualKeyboard`). Copre sia `interactive-widget=resizes-content` (Chrome
Android) sia il solo visual viewport (iOS), ignora pinch zoom e barre del browser. Durante la digitazione la pillola mobile
si nasconde e le azioni del modulo escono dallo sticky: nel poco spazio sopra la tastiera nessun elemento fisso deve
coprire i campi. Scartati: offset fissi per dispositivo, solo focus (una tastiera fisica nasconderebbe la navigazione),
sticky con soli margini (lo spazio utile resterebbe circa metà). Lo scroll padding delle barre sticky vale solo in
navigazione da tastiera perché i `Menu` Paper mettono il focus sull'anchor al montaggio.

La persistenza web supportata e le differenze RN sono documentate da
[Firebase offline](https://firebase.google.com/docs/firestore/manage-data/enable-offline),
[ambienti Firebase JS](https://firebase.google.com/docs/web/environments-js-sdk) e
[Expo Firebase](https://docs.expo.dev/guides/using-firebase/).
Le transazioni richiedono rete: [documentazione Firebase](https://firebase.google.com/docs/firestore/manage-data/transactions).

## Esportazione e migrazione

Dall'8 novembre 2026 CSV e JSON hanno scopi separati (decisione: il CSV con JSON incorporato era un backup
mascherato, illeggibile in un foglio; due formati di ripristino raddoppiavano validazione e test).

- **CSV, solo consultazione.** UTF-8 con BOM, CRLF, `;` come separatore e virgola decimale (Excel/LibreOffice in
  locale italiano; date ISO leggibili ovunque). Colonne `Data;Descrizione;Categoria;Importo;Valuta;Ricorrenza`.
  Una riga per occorrenza fino a oggi, al prezzo di quel rinnovo: le serie sono espanse una volta, mai ripetute, e i
  rinnovi futuri non compaiono. Nessun ID, timestamp, centesimi o JSON incorporato. Testi sempre quotati; con `=`, `+`,
  `-`, `@` iniziali (anche dopo spazi/controlli) ricevono un apostrofo. L'importazione CSV e il suo codice di
  compatibilità sono stati rimossi: i CSV vecchi non si importano.
- **JSON, unico backup.** `{ format: 'nummo-backup', version, exported_at, categories, expenses }`: solo i campi che il
  ripristino usa (ID, importi, date, ricorrenze, piano prezzi, `created_at`, categorie con icona). Niente UID/progetto,
  `revision`, `updated_at`, `name_key`: le revisioni ripartono da 1 e gli indici dei nomi si ricostruiscono. Output
  ordinato, quindi due export degli stessi dati coincidono. `parseBackup` sceglie il lettore dalla versione (`readers`):
  una versione più recente è rifiutata con messaggio dedicato; un cambio di schema richiede nuovo numero e lettore
  per il precedente. I file della versione 1 scritti da build precedenti (con `origin`, `revision`…) restano leggibili: i
  campi extra sono ignorati.
- **Ripristino.** `planImport` (puro) confronta file e dati del server: aggiunte, identici (saltati), conflitti e
  riferimenti a categorie assenti. *Unisci*: ogni conflitto (stesso ID con contenuto diverso, stesso nome con ID
  diverso) blocca prima della prima scrittura. *Sostituisci*: elimina solo gli elementi diversi
  dal file, poi aggiunge; la UI scarica prima una copia dei dati attuali. Il piano è ricalcolato dallo store prima di
  scrivere e ogni gruppo ricontrolla i propri ID in transazione. Rules e schema invariati; non esiste atomicità
  sull'intero archivio (limiti di gruppo delle Rules): un errore a metà lascia uno stato intermedio, riparabile
  ripetendo lo stesso file.

Esportazioni dal server, disabilitate con scritture pendenti o cache non verificata; nessun backup
silenziosamente parziale da cache. Le due collezioni sono lette separatamente: fermare le modifiche nelle altre
sessioni durante un backup, che non è uno snapshot atomico dell'intero database. Configurazione amministrativa e
token non sono dati da esportare. Guida alla migrazione e limiti in `migrazione-byof.md`.

## Configurazioni e legacy

- Tre ambienti, scelti dai comandi npm tramite `EXPO_PUBLIC_NUMMO_BACKEND`, senza default (5 nov 2026):
  `emulator` (`npm run dev:demo`: demo `demo-nummo`, ignora la config reale), `hybrid` (`dev`: Auth reale,
  Firestore obbligatoriamente su localhost) e `cloud` (`build:cloud`: Auth e Firestore reali, endpoint emulatore vietati).
  `firebase` è il vecchio nome ambiguo e ora è un errore. `dev:cloud` e `dev:emulator` sono stati rimossi.
- Motivo: `expo start` fonde `.env.local` sopra la shell, quindi un file con backend/endpoint avrebbe potuto mescolare
  ambienti o incorporare `127.0.0.1:8180` in una build. Ora i file `.env*` portano solo le 4 variabili Firebase
  (`check:env` blocca `dev*` se vi trova backend/emulatori) e la build di produzione ignora i `.env*` di Expo
  (`EXPO_NO_DOTENV=1`), legge `.env.production.local`/shell, valida (`scripts/envPolicy.ts`), scansiona il bundle e lo scarta
  se contiene endpoint locali. `check` costruisce solo la demo (`dist-demo/`), per non confondere gli artefatti.
- Config mancante o mista: messaggio bloccante, sessione non avviata. Nessun ritorno implicito a localStorage.

In hybrid, `scripts/hybridRunner.ts` legge l'ambiente sviluppo con il parser incluso
in Expo e lo passa identico a Expo e al processo Firestore. Riusa un endpoint solo
dopo confronto tra locator Hub del progetto, PID e registro degli emulatori, più
readiness REST; altrimenti avvia il solo Firestore con import da `emulator-data/`.
Questo evita di scambiare un altro servizio/progetto per il database previsto.
`check:hybrid` resta disponibile per il solo controllo TCP manuale (1,5 s).

I figli hanno gruppi di processo separati: Ctrl+C attende l'export Firestore prima
di terminare eventuali discendenti rimasti, senza segnalare emulatori preesistenti.
L'export è in staging, promosso solo dopo successo con copia dell'archivio precedente;
un lock impedisce due gestioni concorrenti dello stesso archivio. Errori di export
conservano il lock per richiedere recupero esplicito. Nessun bootstrap automatico
del proprietario o modifica al cloud. Se la conferma tarda oltre 10 s, l'avviso UI
solo hybrid resta informativo: non annulla Promise, cambia UUID o riaccoda scritture.

Il vecchio backend (`functions/`, `firebase.legacy.json`, regole deny-all, test
callable/token ed esportatore del finto foglio) è stato rimosso il 2 novembre 2026:
nessun dato da migrare (foglio mai reale, emulatori senza righe storiche). Recupero
dalla cronologia Git, commit `fe759d5`. I `.env` personali in `functions/` restano
sul disco, ignorati. Gli adapter localStorage e l'anteprima «dati del browser» sono stati rimossi il 5 novembre 2026
(recuperabili da Git, commit `e2b84d3`).

Audit npm corrente: 29 segnalazioni (25 moderate, 4 alte), invariate rispetto alla
base. La catena alta è `@grpc/grpc-js` via Firestore, dipendenza Node del SDK, non il
trasporto browser; sono comunque interessati gli strumenti Node. Il fix automatico
propone Firebase 9.14, incompatibile con la direzione attuale: nessun downgrade o
`audit fix --force`. Pianificare aggiornamento compatibile e nuova verifica. Non è
un audit di sicurezza completo.

## Impostazioni di aspetto (3 novembre 2026)

Menu account → «Impostazioni» (dialog, non una seconda navigazione). Preferenze solo di
presentazione (tema, monocolore/palette, colore principale, carattere), salvate in
`localStorage` con chiave `nummo.preferences.v1`: per browser, non sincronizzate, mai dati
di spesa; valori invalidi tornano ai predefiniti campo per campo. Gli schemi colore
derivano da una tinta (`src/theme/palette.ts`); Menta+monocolore resta l'identità
originale a valori fissi. Ogni combinazione è verificata a ≥ 4,5:1 (testo) e ≥ 3:1
(bordi) in `tests/theme.test.ts`. Il carattere Google Sans (SIL OFL, variabile 400–700, sottoinsiemi latin/latin-ext) è
ospitato in `public/fonts/`: nessuna richiesta a Google a runtime. Le icone usano un
unico spessore di linea (`iconStroke`, 1,5).

### Dialoghi e viewport mobile (8 novembre 2026)

`AppDialog` condivide superficie dedicata, contorno e limiti di viewport/safe area tra
Impostazioni, editor spese/categorie, calendario e conferme. Il ruolo `dialog` usa la superficie più
chiara dei contenitori in scuro e bianca in chiaro, con scrim nero; non cambia i colori
di menu e navigazione. Il tema interno allinea `background` al dialogo per le etichette
dei campi outlined. Contenuti lunghi scorrono, con azioni fuori dall'area scorrevole.

Il CSS in `public/index.html` imposta sfondo e altezza dinamica prima del bundle.
`GlobalStyle` mantiene `--nummo-viewport-height` con `viewport.ts`: la tastiera può
ridurre il [viewport visibile](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport)
senza ridurre quello del layout. Si osservano resize di finestra e VisualViewport,
ignorando il pinch zoom per non ridisporre la pagina durante l'ingrandimento;
fallback su `innerHeight` senza API. Il meta viewport richiede anche
`interactive-widget=resizes-content` ai browser che lo supportano.
Test di contrasto per tutte le tinte/modalità e test degli eventi simulati passati;
tastiera, barre browser e apertura su telefono reale restano da collaudare.

La matita in Categorie apre `CategoryEditor` al posto dell'editor nella riga.
Nome e icona restano una bozza fino a «Salva», che li aggiorna insieme tramite
`saveCategory` nella transazione esistente, con la revisione vista all'apertura.
Annullamento senza scritture; errori e duplicati visibili nel dialogo, chiusura e
controlli bloccati durante il salvataggio. La creazione rimane nella pagina.

## Lingua dell'interfaccia (8 novembre 2026)

Italiano e inglese, scelti in Impostazioni anche prima del login; italiano iniziale.
`language: it|en` estende `nummo.preferences.v1` senza migrazione: preferenze precedenti
o valori invalidi tornano all'italiano. Scelta locale al browser; storage negato significa
scelta valida solo per la sessione, come le altre preferenze.

`I18nProvider` in `App.tsx` espone `t`, `locale`, `formatAmount` e `formatDate`.
I messaggi sorgente italiani sono chiavi del catalogo inglese (`src/i18n/en.ts`),
senza dipendenze aggiuntive. Dominio e servizi mantengono i messaggi esistenti:
`translate.ts` li traduce alla presentazione, anche quando contengono parametri o
cause concatenate; le stringhe sconosciute restano visibili. Ogni nuovo messaggio
deve avere una voce inglese; testano copertura dei richiami statici e parametri.

La lingua aggiorna anche guida, accessibilità e `html.lang`; `it-IT`/`en-GB` determinano
la visualizzazione di date e importi EUR. Nessuna chiave React dipende dalla lingua:
sessione, listener e bozze rimangono montati. Non si traducono dati utente, schemi,
CSV/JSON, né si cambia il fuso di business Europe/Rome. Solo la creazione
delle categorie predefinite (automatica o esplicita) ne scrive i nomi nella lingua scelta.

## Piano prezzi delle spese ricorrenti (5 novembre 2026)

Prima, una serie aveva un solo importo: modificarlo riscriveva anche le occorrenze già
maturate. Ora `amount_minor` è il prezzo della prima occorrenza e il campo `price_changes`
(array, sempre scritto, `[]` se vuoto; assente nei documenti precedenti = nessuna variazione)
elenca le variazioni `{ index, amount_minor, once }`:

- `index` è il **numero di occorrenza** (1 = primo rinnovo), non una data: il passato non
  dipende dalle date e il prezzo promozionale è «dopo N rinnovi» (Aruba annuale: N = 1).
  `once: false` vale da quel rinnovo in poi, `once: true` solo per quel rinnovo.
- `priceAt` (`src/domain/pricing.ts`) è l'unica funzione che risolve il prezzo; la usano elenco,
  dashboard, CSV e previsioni. Nessun importo è salvato per occorrenza (restano calcolate).
- Modificare il prezzo di una serie vale dal **prossimo rinnovo** («solo questo» o «tutti i
  futuri»): le occorrenze maturate non cambiano. «Tutti i futuri» sostituisce le variazioni
  future programmate; una variazione uguale al prezzo già in vigore non viene salvata.
- Previsioni (`forecastOccurrences`, `upcomingRenewals`): calcolate, mai nei totali, nella
  dashboard o negli export; mostrate nella card «Prossimi rinnovi» della vista Abbonamenti (dall'8 novembre).
- Rules: gli elementi della lista si controllano per posizione (niente cicli) e il limite di
  1000 espressioni per richiesta fissa il massimo a **8 variazioni per serie** (con 10 la
  creazione fallisce). Le Rules vanno ripubblicate dove già distribuite; per le spese
  singole `price_changes` deve essere vuoto.
- Il formato backup restava `version: 1` (campo additivo, backup precedenti importati con `[]`);
  dall'8 novembre è `version: 2` per gli stati degli abbonamenti (sezione dedicata). Il confronto tra record usa `sameFieldValue` (uguaglianza per valore).
- Non implementato: variazioni programmate aggiunte in modifica (si possono solo rimuovere),
  correzione del prezzo di un pagamento già maturato, più di 8 variazioni.

## Abbonamenti: vista separata e stati (8 novembre 2026)

Su richiesta, la pagina Spese ha due viste in un controllo segmentato (`SegmentedButtons`): **Spese** (solo spese
singole, `recurrence === null`) e **Abbonamenti** (ogni serie ricorrente, `SubscriptionList`, con «Prossimi rinnovi»).
Un abbonamento è una spesa ricorrente: nessuna nuova collezione né duplicazione, gli stessi documenti `expenses`.

- **Stati** `active` | `paused` | `cancelled` in `status_changes` (`src/domain/subscription.ts`): cronologia
  `{ date, status }` a date strettamente crescenti, massimo 8; assente = sempre attivo. Si scrive solo il cambio di
  oggi; vale per le occorrenze **successive** al giorno del cambio (`statusAt` usa `<`), quindi pausa, annullamento e
  riattivazione non toccano mai un pagamento già mostrato, nemmeno quello di oggi. Due cambi nello stesso giorno si
  sostituiscono (pausa e riattivazione lo stesso giorno = nessuna voce).
- Scelte dell'utente: alla riattivazione vale il **ciclo originale** (prossima data del calendario della serie, numeri
  di occorrenza e piano prezzi invariati; i rinnovi saltati non si recuperano); **l'annullamento è riattivabile**.
  Pausa e annullamento differiscono per significato ed etichetta, non per calcolo.
- `expandOccurrences`, previsioni e `upcomingRenewals` saltano le occorrenze non attive (l'occorrenza 0 è sempre
  pagata): elenco, dashboard, CSV e riepiloghi derivano dalla stessa funzione, senza doppi conteggi. La dashboard
  include sempre i pagamenti effettuati degli abbonamenti; le intestazioni mensili della vista Spese contano solo le
  spese singole.
- **Firestore:** `status_changes` è salvato come **una stringa** `"AAAA-MM-GG:stato;…"` e solo se non vuoto.
  Motivo misurato con l'emulatore: con 8 variazioni di prezzo il budget di 1000 espressioni era già quasi pieno; una
  lista di mappe costava più di una variazione di prezzo per voce e anche un solo stato lo superava. La stringa si
  valida con una sola regex. Anche `priceChange` è stato alleggerito (`hasOnly` + `size() == 3` al posto di
  `is map` + `hasAll` + `hasOnly`, stessa semantica). Dopo le modifiche passano tutte le combinazioni da 0 a 8 prezzi
  × 0 a 8 stati, ma il margine resta stretto: misurare di nuovo ogni nuovo controllo sulle spese. Le Rules verificano
  forma, serie e numero di voci; ordine delle date e «non nel futuro» li verifica il decoder del client, che blocca
  l'archivio se non validi (stesso criterio dei duplicati nel piano prezzi).
- **Compatibilità:** un documento senza il campo ha la forma accettata dalle Rules precedenti, quindi creare e
  modificare spese singole e serie mai sospese funziona anche prima di ripubblicare le Rules; servono le nuove Rules
  solo per pausa/annullamento. Pubblicazione Rules separata e autorizzata.
- **Backup `version: 2`** con `status_changes` come array leggibile (sempre presente, anche vuoto). I file v1 si
  leggono come «sempre attivo». Un'app precedente rifiuta i v2 («versione più recente») invece di perdere gli stati
  in silenzio.
- La modifica della serie (`ExpenseEditor` → `applyPriceEdit`) conserva gli stati; trasformarla in spesa singola li
  azzera, come il piano prezzi.
- Non implementato: data di effetto scelta dall'utente (solo oggi), più di 8 cambi di stato per serie (oltre si crea
  una nuova serie), nuovo ciclo dalla data di riattivazione.

## Fondi e budget (8 novembre 2026)

Su richiesta, una quarta destinazione «Fondi» (pagina «Fondi e budget») gestisce disponibilità separate (soldi
personali, risparmi, contributi, stipendio). Niente metodi di pagamento, carte o conti.

- **Quattro grandezze distinte** (`src/domain/funds.ts`): *saldo* = iniziale + ricariche maturate + entrate +
  trasferimenti ricevuti − inviati − occorrenze pagate delle spese del fondo; *ricarica* = denaro aggiunto ogni mese;
  *budget* = limite del mese, che non aggiunge né toglie denaro e non blocca le spese; *speso* = occorrenze pagate del
  mese. Il budget non speso resta nel saldo e non si somma al mese dopo.
- **Ricariche calcolate, non materializzate**, come le occorrenze delle spese ricorrenti: al massimo una per mese, nel
  giorno scelto limitato alla fine del mese (31 → 30/28), mai prima di `start_date`, contata solo quando la data è ≤ oggi.
  Essendo una funzione pura del piano salvato, non può duplicarsi per riavvii, più dispositivi o sincronizzazioni, una
  ricarica prevista non risulta mai accreditata e i mesi senza accesso sono comunque contati. Alternativa scartata:
  documenti di ricarica scritti dal client (scrittura automatica in effect, idempotenza da reimplementare, conflitti tra
  dispositivi), contraria alle convenzioni del progetto.
- **Modifiche senza riscrivere il passato:** il piano `recharges` è una cronologia `{ month, amount_minor, day, active }`.
  Se la ricarica del mese corrente è già maturata la modifica vale dal mese successivo, altrimenti già da questo mese;
  le voci precedenti restano. Disattivare = voce `active: false` (sospensione). Il budget ricorrente `budgets` cambia dal
  mese corrente; le eccezioni `budget_exceptions` valgono per un mese corrente o futuro (0 = nessun budget). Massimo 24
  voci per piano. `start_date` non cambia dopo la creazione (Rules); il saldo iniziale è correggibile e ricalcola tutto.
- **Movimenti** `movements/{uuid}`: entrata (`to_fund_id`) o trasferimento (`from_fund_id` → `to_fund_id`) in **un solo
  documento**, quindi atomico; immutabili (si possono eliminare). Creati in transazione con ID scelto all'apertura del
  dialogo: ripetere la stessa richiesta non crea un secondo movimento. I trasferimenti sono esclusi da entrate e spese
  complessive. Date non future.
- **Spese:** `fund_id` facoltativo, salvato solo se presente (come `status_changes`), quindi le spese esistenti e quelle
  senza fondo hanno la stessa forma accettata dalle Rules precedenti. Il fondo è una proprietà della serie: cambiarlo
  sposta anche i pagamenti già effettuati (avviso nell'editor). Misurato con l'emulatore il caso peggiore 8 prezzi +
  8 stati + `fund_id`: accettato.
- **Migrazione:** nessuna modifica automatica. Le spese senza fondo (o con fondo inesistente) non incidono su alcun
  saldo, restano nello «speso» complessivo e sono offerte per l'assegnazione esplicita a un fondo (transazioni a gruppi
  di 100 sulle revisioni viste). Un fondo con movimenti o spese collegate si archiva (resta nel totale disponibile e
  nello storico, esce dalle scelte); eliminazione solo se nulla vi fa riferimento, verificata sui dati caricati.
- **Mesi navigabili:** dal primo mese di un fondo a 12 mesi avanti. Mesi passati effettivi; mese corrente effettivo più
  rinnovi e ricariche ancora attesi; mesi futuri come previsione (ricariche del piano e rinnovi delle serie attive).
- **Fondo predefinito** del modulo per account e browser (`nummo.defaultFund.v1.<uid>`), non sincronizzato.
- **Firestore:** `funds/{uuid}` con piani come stringhe compatte validate da una regex ciascuna e decodificate/validate
  dal client; aggiornamenti in transazione sulla revisione. **Backup `version: 3`** con `funds`, `movements` e
  `fund_id` per spesa; v1/v2 letti senza fondi. Il CSV aggiunge la colonna finale «Fondo». Unione/sostituzione
  trattano fondi e movimenti come le altre collezioni.
- Non implementato: prelievi manuali diversi dalle spese, frequenze di ricarica non mensili, unicità del nome del fondo
  sul server (solo client), verifica server dell'esistenza del fondo referenziato, sincronizzazione del predefinito.

## Liste della spesa (8 novembre 2026)

Su richiesta, la destinazione «Liste» sostituisce «Categorie» nella navigazione; le categorie restano con tutte le
funzioni in una pagina aperta dalla voce **Categorie del menu account** (sotto Impostazioni) (e dal modulo quando non ne esiste nessuna), con
«Fatto» che riporta alla sezione di partenza. Non è un secondo livello di navigazione: la pagina non è tra le destinazioni.

- **Modello** (`src/domain/shoppingList.ts`): `lists/{uuid}` con `name`, `category_id` predefinita (facoltativa),
  `total_minor` scritto a mano (facoltativo, niente prezzi per prodotto), `expense_id` (null = lista attiva) e timestamp;
  `listItems/{uuid}` in una collezione **piatta** con `list_id`, `name`, `checked`, `position`. Un documento per prodotto
  rende la spunta una singola scrittura; la collezione piatta permette un solo listener per i conteggi di tutte le liste
  (nessuna query collection group, Rules semplici). Alternativa scartata: prodotti come array nel documento della lista
  (Rules senza cicli, conflitti tra spunte concorrenti, transazione per ogni tocco).
- **Salvataggio automatico, ultima scrittura vince:** liste e prodotti non hanno revisione; creazione, rinomina,
  spunta, totale ed eliminazione sono scritture semplici accodate dall'SDK (funzionano con segnale debole in negozio e
  compaiono subito tramite listener), errori del server riportati nella pagina. È un'eccezione documentata alla regola
  «modifiche in transazione con revisione», limitata a dati senza effetti economici. Cache in memoria: le scritture non
  ancora inviate si perdono chiudendo la pagina (stesso limite delle altre scritture offline). Duplicazioni ed
  eliminazioni di una lista con i suoi prodotti sono un unico batch.
- **Registrazione = una sola spesa, in una transazione server**: crea la spesa singola (UUID scelto all'apertura della
  conferma) con `list_id` e `list_items` (nomi dei soli prodotti spuntati, copiati) e imposta `expense_id` e
  `total_minor` sulla lista, eventualmente anche la categoria predefinita. Ripetere dopo un esito incerto ritrova la
  stessa spesa e non scrive nulla; una lista già registrata (altro dispositivo, doppio tocco) è rifiutata. Richiede
  connessione e dati sincronizzati. Saldo e budget del fondo derivano dalla spesa come per ogni altra: sulla lista non
  c'è denaro, quindi niente doppi conteggi.
- **Spese:** `list_id` + `list_items` facoltativi, entrambi o nessuno, salvati solo se presenti (come `fund_id`), solo
  per spese singole. In Firestore i nomi sono **una stringa unita da `\n`** (un controllo regex nelle Rules: niente nomi
  vuoti, tab o CR, lunghezza ≤ 6100); quantità e lunghezze dei nomi sono verificate dal decoder client. Il budget delle
  espressioni è stato rimisurato con l'emulatore (caso peggiore 8 prezzi + 8 stati + `fund_id` ancora accettato).
  La modifica della spesa conserva collegamento e prodotti; l'eliminazione, nella stessa transazione, riporta la lista
  tra quelle attive se puntava ancora a quella spesa. Una lista la cui spesa sparisce per altre vie (sostituzione da
  backup) è mostrata come «spesa non più presente» e si può riattivare esplicitamente.
- **Archivio:** una lista registrata è in sola lettura; si consulta, si duplica (prodotti non spuntati, rinumerati) o
  genera una nuova lista con i prodotti non acquistati, anche direttamente dalla conferma. Le Rules non verificano
  l'esistenza della spesa o della lista referenziata (come per i fondi).
- **Backup v4:** `lists` con i prodotti annidati (array, senza `list_id`), spese con `list_id`/`list_items`; lettori
  v1–v3 invariati (nessuna lista). Unione per ID con lista + prodotti confrontati insieme; importazione di una lista per
  transazione (lista e prodotti insieme, ripetibile); la sostituzione elimina le liste diverse dal file con tutti i loro
  prodotti e i prodotti orfani. CSV invariato: una spesa da lista è una riga come le altre.

## Dashboard: riepilogo, classifica e andamento — 8 novembre 2026

La Dashboard legge esclusivamente le occorrenze già espanse dal workspace (inclusi i pagamenti ricorrenti
maturati). Riepilogo e classifica usano l'aggregazione completa; solo Ciambella e Blocchi mantengono la proiezione
a otto serie. Classifica senza limite, ordinata per spesa o numero di transazioni: ordinare per percentuale
equivarrebbe alla spesa. La preferenza storica `bars` viene letta come `ranking`.

Il confronto usa i giorni civili effettivamente trascorsi nella finestra selezionata e gli altrettanti giorni
immediatamente precedenti. Le date sono esposte: non è un confronto fra mesi di diversa durata. Si calcola
solo con base positiva e una prima occorrenza antecedente o uguale all'inizio della finestra precedente;
l'archivio non offre metadati che certifichino la completezza dello storico. Sotto l'1% le variazioni delle
categorie sono omesse. Nessuna percentuale di crescita da zero.

Andamento SVG giornaliero, con zeri e senza giorni futuri: densità delle etichette adattata alla larghezza,
date brevi nei periodi corti e mesi/anni nei lunghi; la granularità dei valori resta giornaliera per non
nascondere i picchi. Puntatore/tocco e frecce/Home/End selezionano il giorno, Invio o il pulsante aprono i
dettagli. Giorni e categorie condividono un dialogo di sola lettura con ListRow: nessuna nuova lettura
Firestore, modifica dei filtri della pagina Spese o scrittura. Blocchi senza legenda duplicata, accesso
alla classifica completa anche per tessere minuscole; Ciambella mantiene totale centrale e dettaglio selezionato.

## Ripristino Barre — 8 novembre 2026

Su richiesta successiva la vista Classifica è sostituita da Barre (`bars`); la preferenza transitoria
`ranking` viene letta come `bars`, mantenendo periodo, tema e lingua. Le barre usano tutte le categorie
dell'aggregazione completa, ordinate per importo decrescente, senza menu di ordinamento e senza legenda
duplicata. Riga con icona, nome, importo, barra sottile arrotondata, quota sul totale, conteggio e variazione
significativa quando disponibile. Per rendere confrontabili anche molte categorie, la barra maggiore
occupa tutta la larghezza: la scala relativa al massimo è dichiarata nella vista e nella Guida; la
percentuale testuale resta sul totale. Clic o attivazione da tastiera apre le occorrenze del periodo.
Si riutilizzano `IconTile`, `StateLayerPressable`, palette, token e `barTransition` con riduzione movimento
globale. Riepilogo, Ciambella, Blocchi e andamento restano quelli della fase precedente.

## Andamento senza dettaglio giornaliero — 8 novembre 2026

Su richiesta successiva, rimosso il pulsante «Spese del …» e il collegamento da Invio alle transazioni
del giorno. TimeChart conserva selezione e lettura esatta di data/importo, senza callback di apertura.
Il dialogo delle transazioni resta accessibile dalle categorie. Guida aggiornata in entrambe le lingue.
