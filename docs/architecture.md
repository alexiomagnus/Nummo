# Architettura Nummo — modalità Standard (dispositivo) e Avanzata (Firebase personale)

Decisione BYOF: 2 novembre 2026; revisione UI e contesto: 12 novembre 2026. La richiesta BYOF sostituisce la direzione Sheets di
`recap.md` v0.4, conservata come specifica originale. Analisi della base e piano
incrementale: [migrazione-byof.md](migrazione-byof.md).

Le sezioni datate conservano anche decisioni successivamente sostituite. Comportamento corrente:
quattro destinazioni Spese, Analisi, Fondi e Liste; Impostazioni, Notifiche, Categorie e Archiviazione e backup (ex Importa ed esporta) dal menu account.
Impostazioni è una pagina (anche prima del login), con due colonne solo da 752 px effettivi di contenuto.
Analisi usa Barre complete (preferenza legacy `ranking` → `bars`), Ciambella senza totale centrale e Blocchi;
l'andamento consente di leggere data/importo, senza aprire le transazioni giornaliere. Prevalgono codice e
convenzioni aggiornate in `AGENTS.md`; lo stato operativo e i limiti delle prove sono in `HANDOFF.md`.

## Saldo facoltativo per fondo — 15 novembre 2026

Su richiesta (opzione 3 tra: lasciare i fondi come gruppi di spesa, mostrare sempre Aggiungi/Trasferisci, saldo per fondo).
Rivede in parte la #7: un fondo resta di base un gruppo di spese, ma il modulo offre saldo iniziale (alla `start_date`, oggi
per i nuovi) e ricarica mensile, facoltativi. *Aggiornamento dello stesso giorno, su richiesta:* tolto l'interruttore «Tieni
traccia del saldo»; «Saldo iniziale (facoltativo)» è sempre visibile, seguito dagli interruttori Ricarica mensile e Budget mensile. **Nessun nuovo campo**: un flag avrebbe richiesto Rules,
decoder, backup e pubblicazione Rules prima di poter scrivere in Avanzata. Il saldo esiste finché il fondo ha saldo iniziale,
ricariche o movimenti (`hasBalanceData`); ricariche e movimenti già registrati restano (spegnere la ricarica la sospende da ora),
perché quei dati non si cancellano né si riscrivono nel passato. Aggiungi/Trasferisci
operano solo tra fondi attivi con saldo. `setRecharge` non crea più accrediti datati nel passato: una ricarica attivata o
spostata a un giorno già trascorso del mese parte dal mese successivo.

## Firebase collegato dall'app (soluzione «a» di BYOF senza installazione) — 15 novembre 2026

Su richiesta, affianca alla copia installata (configurazione a build) un progetto collegato dall'utente nel browser.

- **Configurazione a runtime, solo pubblica**: `services/customFirebase.ts` (puro) legge dal blocco `firebaseConfig`
  incollato le quattro chiavi, le valida e le salva in `nummo.firebaseConfig.v1`; `backendConfig.ts` ne ricava
  `activeFirebaseConfig` (collegata, altrimenti quella del sito). Build `cloud`: solo progetti reali; `emulator`: solo
  `demo-`; `hybrid`: mai (Firestore emulato del progetto del sito). Una modalità o un ambiente non validi restano errori.
- **Ricaricamento** a ogni collegamento/scollegamento: l'SDK si inizializza una volta per pagina; un account connesso esce
  prima (dopo le scritture pendenti), l'indizio di sessione si azzera.
- **Proprietario sempre dalla Console** (scelta dell'utente, «manuale guidato»): nessuna regola di auto-nomina. Per un
  progetto collegato il rifiuto di `config/owner` mostra `OwnerSetup` (UID da copiare, Regole da pubblicare, «Controlla
  di nuovo»); per il progetto del sito resta «Questo Nummo è privato», con «Collega il tuo Firebase».
- **Regole offerte da copiare**: `public/firestore.rules`, copia statica identica a `firestore.rules` (test).
- Scartata l'auto-nomina del primo accesso (finestra in cui un estraneo poteva arrivare prima) e la soluzione «c»
  (`TODO.md`), che renderebbe il proprietario del sito responsabile dei dati altrui.

## Notifiche di sistema con Web Push (fase 1) — 14 novembre 2026

Su richiesta, sostituisce progressivamente il punto «solo in-app» della decisione sotto. Dettagli in
[notifiche-push.md](notifiche-push.md).

- **Perché un servizio.** Senza un server non esiste un modo affidabile di consegnare notifiche ad app chiusa: Notification
  Triggers è abbandonata, Periodic Background Sync è solo Chrome per app installate e non esiste su iOS.
- **Un solo servizio per le due modalità, senza Firebase**: `push-service/` (API web standard: Cloudflare Workers + D1
  gratuito in produzione, Node + `node:sqlite` in locale). Scartate le Cloud Functions: piano Blaze con fatturazione e
  dipendenza da Firebase anche in Standard.
- **Privacy.** Gli orari si calcolano sul dispositivo (`domain/pushSchedule.ts`, stesse regole di `notifications.ts`); il
  servizio conserva solo sottoscrizione, lingua, tipo/orario/ripetizione dei promemoria, date del periodo e ultima consegna.
  Messaggio cifrato (RFC 8291) senza testo né dati: lo scrive `sw.js`, generico e vero; il riepilogo si calcola
  all'apertura. Nessun account: l'endpoint stesso fa da credenziale; solo origini ammesse e host dei servizi push noti.
- **Nessun duplicato**: un promemoria per tipo, riepilogo per periodo consegnato una volta, backup mai anticipato dopo una
  consegna, tag per tipo; con il push attivo gli avvisi in-app del browser sono spenti.
- **Service worker** `public/sw.js` limitato alle notifiche: nessuna cache, nessuna promessa di avvio offline.
- **Fase 2** (rimozione degli avvisi in-app e del controllo ogni 15 minuti) **eseguita il 15 novembre** su richiesta:
  solo notifiche di sistema; eliminata anche la domanda «Hai salvato il backup?», il download del backup completo conta
  come backup (prima contava solo dopo la conferma).

## Rimozione di Google Drive, protezione locale e notifiche in-app — 14 novembre 2026

Su richiesta, sostituisce il punto «Google Drive» della decisione del 12 novembre (sotto, conservato come storia).

- **Niente Drive.** Rimossi servizi (`googleAuth.ts`, `googleDrive.ts`), regole (`domain/driveBackup.ts`), hook, UI,
  test e la variabile `EXPO_PUBLIC_GOOGLE_CLIENT_ID` (ora rifiutata da `build:cloud` come ogni variabile sconosciuta).
  La Standard ha solo backup JSON manuale; nessun altro servizio cloud lo sostituisce. Login Google, Firebase Auth e
  BYOF invariati; formato del backup (v6), importazione, esportazione e ripristino invariati. La chiave
  `nummo.driveBackup.v1` eventualmente rimasta nei browser non viene più letta né cancellata.
- **Protezione dell'archivio locale** (`services/storageProtection.ts`, `features/storage/useStorageProtection.ts`):
  `navigator.storage.persist()` chiesto in automatico solo in Standard, quando l'archivio contiene dati (all'avvio o
  dopo la prima modifica), al massimo ogni 30 giorni (`nummo.storageProtection.v1` registra solo l'ora del tentativo,
  prima di chiedere). Stato da `persisted()`, riletto al ritorno in primo piano; API assente o in errore = «non
  disponibile». Nessun interruttore; l'app funziona uguale con ogni esito. Le scritture IndexedDB chiedono durabilità
  `strict`: la transazione si conclude solo a dati scritti, e solo allora il salvataggio è confermato; un listener che
  fallisce dopo il commit non trasforma più un salvataggio riuscito in errore.
- **Notifiche in-app.** Regole pure in `domain/notifications.ts` (`dueNotifications` restituisce gli avvisi dovuti:
  un futuro canale push potrà riusarle cambiando solo la presentazione); preferenze per browser
  `nummo.notifications.v1`, stato per archivio `nummo.notifications.v1.<scope>` (le due modalità non si mescolano),
  sincronizzati tra schede con l'evento `storage`. Pagina `NotificationsPage` dal menu account (sotto Impostazioni),
  avvisi `NotificationCards` sopra le pagine, nel flusso, mai modali. Controllo all'avvio, al ritorno in primo piano e
  ogni 15 minuti ad app aperta. Promemoria backup solo in Standard (serve l'orologio `lastChange` dell'archivio locale,
  passato come `localArchive`; `DataStore` invariato): intervallo dall'ultimo backup **confermato** o dall'attivazione,
  dati cambiati dopo il backup, rinvio di 3 giorni; il download avviato non conta finché l'utente non conferma.
  Riepilogo in entrambe le modalità su periodi allineati (settimana lun–dom, blocchi di 14 giorni dal 1° gennaio 2024,
  mese di calendario), sole spese singole fino a oggi via `expandOccurrences` sulle voci senza ricorrenza. Attivazione,
  riattivazione e cambio di frequenza del riepilogo partono da adesso: nessun avviso per il tempo passato.
  Alternative scartate allora: Notification API/push (permessi, nessuna garanzia ad app chiusa senza service worker;
  superata dalla sezione Web Push del 14 novembre),
  conferma implicita del backup al download (il browser non dice se il file è stato salvato).

## ID icona eliminate: di nuovo valide e ritirate — 20 novembre 2026

Su richiesta, completa la decisione del 14 novembre (sotto). Le 24 ID eliminate dall'8 al 12 novembre (`baby bed beer book briefcase bus
car droplet ellipsis flame graduation leaf phone pill plane receipt scissors shield star ticket tree umbrella wine wrench`, ricavate
dalla storia delle liste `icon in [...]` delle Rules) erano rifiutate da decoder, import e Rules: una sola categoria o un fondo con una di
esse rendeva l'archivio «non valido» (esportazione e modifiche bloccate) e un backup che la conteneva non si importava. Ora sono
valide e ritirate (`legacyCategoryIconLabels`, mai nel selettore, etichetta accessibile tradotta), con l'ultimo glifo minimale che
avevano; negli stili colorato e pixel si usa il ripiego già previsto sul contorno (i 6 disegni colorati/pixel storici non sono
reintrodotti: precedono la palette e i controlli di contrasto attuali). Nessuna migrazione o riscrittura dei dati. Il test che voleva
stella, istruzione e birra non disegnate è sostituito: il ritiro vale anche per loro. Le Rules vanno pubblicate a parte, con
autorizzazione; finché non lo sono, in Avanzata si leggono ma non si salvano modifiche che conservano una di queste icone.

## Icone ritirate e chiave — 14 novembre 2026

Un'icona tolta dal selettore non viene più rimossa dall'elenco degli ID validi: le precedenti rimozioni rendevano
illeggibili categorie e backup che la usavano. `retiredCategoryIcons` (`sofa`, su richiesta) resta accettata da
decoder, backup e Rules e conserva i disegni nei tre stili; `IconPicker` mostra solo `selectableCategoryIcons` più
l'eventuale icona ritirata della categoria aperta. Aggiunta `key` (chiave) nei tre stili e nelle Rules.

## Modalità Standard e Avanzata — 12 novembre 2026

Decisione: un'unica webapp con due archivi alternativi scelti dall'utente prima di ogni accesso. Sostituisce, per la
sola modalità Standard, il principio «Firestore unica fonte di verità»; in Avanzata il flusso BYOF resta invariato.

- **Contratto unico.** `DataStore` (`src/services/dataStore.ts`) è la forma che lo store Firestore aveva già: hook e
  pagine non sono stati riscritti, ricevono lo store. `kind` distingue i due casi nei pochi punti in cui conta
  (esito incerto di un invio, stato «online», testi). Nessuna logica applicativa duplicata: validazione, piani di
  importazione, backup e calcoli restano nel dominio.
- **Standard.** `localStore.ts` su `localDatabase.ts`: database IndexedDB `nummo-local`, un object store per tipo di
  record con chiave `id`, più `settings` (budget generale) e `meta` (ora dell'ultima modifica, non nel backup). Ogni
  mutazione è una transazione atomica che controlla la revisione vista dall'editor; i listener ricevono i dati prima
  che la chiamata risponda; le altre schede vengono avvisate con BroadcastChannel e rileggono. L'importazione
  (unione o sostituzione) è un'unica transazione: mai un ripristino parziale. Versione dello schema = numero di passi
  in `localMigrations`; una versione più recente del codice è rifiutata con un messaggio. localStorage contiene solo
  preferenze e la modalità.
- **Scelta e separazione.** `nummo.storageMode.v1`; senza scelta salvata, un browser con indizio di sessione Firebase
  resta in Avanzata (utenti esistenti), gli altri vedono la schermata di scelta. Firebase non viene inizializzato in
  Standard. Il cambio di modalità smonta il workspace e non tocca nessuno dei due archivi.
- **Google Drive (rimosso il 14 novembre, vedi sopra).** Solo backup e ripristino, via REST su `appDataFolder` con ambito `drive.appdata`. Autorizzazione
  con Google Identity Services (modello a token, nessun segreto, nessun backend): il token dura circa un'ora e resta
  in memoria. Conseguenza accettata: nessun rinnovo silenzioso; il backup automatico gira mentre l'app è aperta e
  l'accesso è valido, altrimenti resta in attesa di un tocco. Alternative scartate: refresh token (richiede un server
  e un segreto), token in localStorage (esposizione), file unico sovrascritto (un dispositivo vuoto distruggerebbe il
  backup: da qui un file per backup, cinque conservati, e nessun caricamento automatico di archivi vuoti).
- **Limiti noti.** `build:cloud` richiede ancora la configurazione Firebase (nessuna build solo Standard); nessun
  service worker, quindi l'avvio a freddo senza rete non è garantito nemmeno in Standard; l'adattatore IndexedDB reale
  è verificato in Chromium, non dai test Node (che usano il gemello in memoria).

## Visibilità dei controlli budget — 12 novembre 2026

*Superata il 15 novembre 2026, su richiesta:* rimossi l'interruttore «Mostra budget mensile» e la preferenza
`showGeneralBudget`; i budget sono sempre visibili e il valore già salvato nel browser viene ignorato. Testo storico:

La preferenza locale `showGeneralBudget` nasconde anche la sezione budget nei moduli Nuovo fondo e Modifica fondo.
Il modulo non valida né invia una modifica del budget quando i controlli sono nascosti: `fundFromForm` riceve il
campo omesso e conserva esattamente il piano esistente, comprese variazioni future ed eccezioni. I nuovi fondi
creati in questa modalità non hanno budget. Riattivando la preferenza tornano i controlli; dati, calcoli e
indicatori dei budget già presenti sui singoli fondi restano invariati.

## Tocchi, tastiera e overlay — 12 novembre 2026

Nascondere la navigazione con `display: none` durante `pointerdown` faceva aumentare lo spazio dello scroller:
vicino al fondo il browser riduceva `scrollTop`, spostando un altro controllo sotto il dito prima del rilascio.
Riprodotto in Liste: toccando Totale spesa veniva spuntato l'ultimo prodotto. Ora la barra diventa invisibile e
`inert`, ma conserva il proprio spazio durante l'anticipo; lo libera solo dopo la conferma della tastiera dal
viewport. Anche lo scroll del campo attivo attende questa conferma. Restano fallback di 800 ms e attesa del
recupero dell'altezza in chiusura. La rail medium scorre verticalmente quando la finestra è bassa.

`AppDialog` condivide Escape e passaggio del focus con gli altri overlay: listener in cattura (RN Web TextInput
ferma la propagazione), pila di aperture per chiudere solo il livello superiore, rispetto di `dismissable` e dei
gestori che bloccano la chiusura durante un salvataggio; nessun secondo listener in DeleteDialog.
Il dialogo Registra spesa riceve il totale digitato dalla bozza, senza attendere il listener della scrittura
accodata. Il dettaglio lista è identificato dall'ID per non trasferire bozze/editor alla lista duplicata.

## Etichette della navigazione mobile (11 novembre 2026, issue #13)

Le quattro destinazioni restano slot uguali con un solo indicatore e la geometria di `navIndicator.ts`.
`NavigationBar` misura la propria larghezza nel layout (già al netto della safe area) e riserva il FAB
anche quando nascosto in Nuova spesa, così la sua animazione non cambia la tipografia. Un elemento DOM
invisibile misura le etichette tradotte in `labelMedium`, al peso attivo 700 e con il font scelto;
la misura si aggiorna anche al caricamento dei font. Tutte le etichette usano la stessa variante:
`labelMedium` se entra con un margine di sicurezza, altrimenti `labelSmall` senza tracking.
Nessuna soglia sul modello di telefono o sulla larghezza della finestra. Margini laterali 4 dp,
spazio dal FAB 4 dp e nessun gap tra gli slot recuperano spazio senza ridurre il FAB o le aree di tocco.
Il testo è centrato e vincolato alla larghezza del pulsante; il pulsante lascia visibile il contenuto
agli angoli, mentre lo strato di feedback conserva il proprio raggio (evita il taglio delle lettere
nella parte bassa della pillola). Dimensioni dei font e ingrandimento
restano quelli di Paper/browser, senza disabilitare lo scaling.

## Salvataggio Nuova spesa nel flusso (9 novembre 2026)

Desktop: su richiesta dell'utente (screenshot 1920×1080, monitor 24") il contenuto
occupa sempre tutta la larghezza del pannello, a qualsiasi dimensione dello schermo.
Rimossi sia i limiti per attività (800/1120/1280 px) sia il limite globale di 1440 px
con colonna centrata: lasciavano ampie fasce vuote ai lati del modulo.
Salva su expanded resta nel flusso con larghezza minima 192 px,
senza espandersi all'intera riga; su mobile mantiene la larghezza piena.

Il pulsante Salva e il recupero degli esiti incerti seguono sempre tutti i campi
nel normale scorrimento, anche su smartphone. Rimossa la barra sticky mobile:
copriva ricorrenza e prezzo promozionale quando il modulo superava lo spazio
disponibile. Per salvare un modulo lungo si scorre fino alla fine; nessuna azione
si sovrappone ai campi, con o senza tastiera. La navigazione mobile continua a
nascondersi quando si apre la tastiera virtuale.

## Barra di navigazione Android dell'app installata (9 novembre 2026)

Aggiornamento dal sorgente Chromium (ramo main, letto il 9 novembre 2026): in un'app installata (WebAPK
standalone) la barra di navigazione prende il **`theme_color` del manifest** (`WebappIntentDataProvider`,
`getNavigationBarColor`, flag `WebAppNavigationBarThemeColor` attivo di default); senza `theme_color` resta al
colore predefinito di Chrome/sistema. Il colore è salvato nella WebAPK: la pagina non lo cambia. Il meta
`theme-color` dinamico tocca la barra di navigazione solo in edge-to-edge, che per le app installate Chrome usa
soltanto nel visualizzatore multimediale o in fullscreen con un flag disattivato; `viewport-fit=cover` non lo attiva.
La variante scura (`dark_theme_color`) esiste nella WebAPK ma il parser del manifest Blink legge solo
`theme_color`/`background_color` di primo livello, e comunque sceglierebbe in base alla modalità notte di sistema,
non al tema di Nummo. Quindi la barra non può seguire il tema chiaro/scuro scelto nell'app: ripiego statico scuro,
`theme_color` `#121212` (testo e pulsanti bianchi leggibili con tema chiaro e scuro), `background_color` `#0F1511`
per la splash. Le WebAPK già installate restano col vecchio `theme_color` (fino al 9 novembre `#F5FBF5`, chiaro)
finché Chrome non le aggiorna: verifica al lancio se sono passate 24 ore, nuovo pacchetto solo con tutte le finestre
dell'app chiuse, dispositivo in carica e Wi-Fi ([web.dev](https://web.dev/articles/manifest-updates)); altrimenti
reinstallazione. Le versioni di Chrome precedenti a questa logica lasciano la barra al colore di sistema.

Testo precedente, superato per la barra di navigazione: i colori statici `background_color` e `theme_color` erano
entrambi `#0F1511`. È un ripiego statico, non un manifest dinamico
per tema: con tema chiaro o altro accento la splash può differire dalla pagina. La precedente attribuzione
esatta dei colori delle barre alle versioni Android proveniva da fonti non ufficiali e non è provata sul Pixel.
La [documentazione Chrome](https://developer.chrome.com/docs/lighthouse/pwa/splash-screen) conferma che la splash
è generata dal manifest; la pagina non ne controlla l'animazione di uscita. Il meta `theme-color` runtime segue
il tema, ma il risultato sulle barre native dipende anche da Chrome, Android e dall'installazione.
`viewport-fit=cover` e safe area restano attivi, senza altezze Android hardcoded; la
[guida edge-to-edge](https://developer.chrome.com/docs/css-ui/edge-to-edge) descrive viewport e insets del browser,
non garantisce lo stesso comportamento per ogni WebAPK. Test installati ancora necessari.

Prima del paint React, `GlobalStyle` aggiorna insieme sfondo di `html`/`body`, variabile del boot,
`color-scheme` inline sulla radice e un solo meta `theme-color`, rimuovendo i media statici.
Lo schema inline del boot prima restava quello dell'avvio anche dopo il cambio tema.
Il viewport ignora misure da documento nascosto e rimisura su `visibilitychange`/`pageshow`, senza timer,
per non affidarsi a un resize alla ripresa. Questo corregge una lacuna del lifecycle verificata in test,
non dimostra la causa dei ritagli nelle animazioni del launcher.

## Icona monocromatica di installazione (9 novembre 2026)

Il manifest separa gli scopi `any`, `maskable` e `monochrome`. La silhouette
`public/icons/icon-monochrome.svg` riusa le forme del logo con riempimento opaco e
sfondo trasparente; scala 0,77 (+6,9% rispetto alla favicon), entro l'area sicura.
Logo principale, favicon, PNG normali/maskable/Apple e colori di avvio restano invariati.
Lo scopo standard non garantisce il trasferimento al layer Android del WebAPK:
supporto e procedura di collaudo sono in [icone-installazione.md](icone-installazione.md).

## Flusso attivo

```text
Expo web / React Native Web / Material 3
  └─ App (tema, lingua, modalità in nummo.storageMode.v1)
       ├─ Standard: StandardRoot → localStore.ts su IndexedDB `nummo-local` (nessun account, backup JSON manuale)
       └─ Avanzata: AdvancedRoot → Firebase Authentication (Google) → SDK Firestore
            └─ Security Rules: UID proprietario + provider Google + validazione
                 └─ Cloud Firestore del progetto configurato dall'utente
```

In ciascuna modalità c'è una sola fonte di verità: IndexedDB in Standard, Firestore in Avanzata; mai entrambe,
mai copie o migrazioni automatiche tra le due. Firebase si inizializza solo in Avanzata. Nessuna callable, Sheets
API, Drive, backend gestito dallo sviluppatore o servizio aggiuntivo nel percorso attivo. In Avanzata la cache
IndexedDB opzionale appartiene all'SDK Firestore: non è un archivio applicativo parallelo. Il client non contiene
Admin SDK, chiavi private o token copiati manualmente.

Stack effettivo: Expo 58.0.22, React 19.3, React Native 0.88.1, RN Web 0.21.4,
Paper 5.15.4, Firebase JS SDK 13.1.0, TypeScript 6.0.3. Nessuna nuova dipendenza.
`App` gestisce tema, lingua e modalità; `DataWorkspace` gestisce sezioni, listener e bozze, con ambito `local` in
Standard o UID in Avanzata (l'involucro `RemoteWorkspace` è montato con chiave UID). Il dominio rimane puro.
Hook e pagine conoscono solo il contratto `DataStore`: `createFirestoreStore` (database e UID, testato con veri SDK
contro emulatori) oppure lo store locale (testato con il gemello in memoria in `tests/localStore.test.ts`).

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
solo presentazione, mai accesso) si mostra `StartupWorkspace`, shell di «Nuova spesa» e indicatore di caricamento, sopra la
schermata reale finché dati o errore (o i 4 s) la rilasciano. Il segnaposto non disegna un modulo con dati fittizi.
Anche dopo il rilascio, il modulo resta montato ma invisibile e `inert` finché i suoi dati non sono utilizzabili;
un errore viene esposto, la navigazione resta disponibile. Non si aggiungono ritardi o animazioni d'ingresso.
Con l'indizio, Auth è inizializzato senza `popupRedirectResolver` (l'SDK su mobile lo inizializza subito e
aspetta gapi/iframe prima di ripristinare l'utente) e il resolver è passato al solo `signInWithPopup`; gli SDK partono
all'import (`warmUpServices`). Motivazioni e limiti (prova solo emulata, popup reale non provato dopo logout): vedi il documento.

## Schema e proprietà

| Percorso | Contenuto |
| --- | --- |
| `config/owner` | `{ uid: string }`, creato solo dall'amministratore via Console o bootstrap emulatore |
| `users/{uid}/expenses/{uuid}` | campi `ExpenseData`, `created_at`, `updated_at` Timestamp Firestore, `revision` intera da 1 |
| `users/{uid}/categories/{uuid}` | `label`, `icon` oppure null, `name_key`, `revision`, `updated_at` Timestamp |
| `users/{uid}/categoryNames/{name_key}` | `{ category_id: uuid }`, indice di unicità aggiornato nella stessa transazione |

Una spesa contiene `amount_minor` intero positivo ≤ 99.999.999.999 (999.999.999,99 €, dal 22 novembre 2026; prima ≤ 9.999.999), `currency=EUR`,
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
  Con la cache su disco (dal 17 novembre attiva nella build pubblicata, `.env.production.local`), dopo
  `signOut` l'app ferma Firestore (`terminate`), cancella la cache (`clearIndexedDbPersistence`) e
  ricarica la pagina, perché un Firestore fermato non riparte nella stessa pagina. Se un'altra scheda
  tiene aperta la cache la cancellazione fallisce in silenzio: la cache resta fino a un'uscita successiva
  con una sola scheda. Con la cache in memoria nulla da cancellare, nessun ricaricamento.

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
I gruppi non entrano in Firestore o nei backup. I colori usano 12 slot esistenti: ogni
categoria parte dallo slot dell’hash del suo ID e, se occupato, prende il primo libero (`categoryColorSlots`, issue #10).
L’insieme considerato è quello delle categorie con almeno una spesa nell’archivio, non quello del periodo: con
fino a 12 categorie usate nessun colore si ripete e i colori restano uguali tra periodi, grafici, filtri, ordinamenti e
rinomine. Possono cambiare solo quando una categoria riceve la prima spesa o perde l’ultima. Oltre 12 le ripetizioni
restano inevitabili: i colori distinti vanno alle 12 categorie con più spesa nell’archivio (quelle che i grafici mostrano
insieme), le altre usano lo slot dell’hash; etichette sempre disponibili. Revisione del 10 novembre 2026.
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
le scelte restano nella sessione; nessun dato Firebase aggiunto. «Ripristina predefiniti» nelle impostazioni
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

Storico, superato dall'andamento senza dettaglio giornaliero descritto sotto (8 novembre 2026): elenco compatto dei giorni con
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
| Installazione Android (manifest + icone) | Manifest e icone presenti (6 nov 2026); installabilità non provata su dispositivo; service worker `sw.js` per le notifiche (14 nov) e, dal 21 nov, per la sola pagina offline di Nummo (cache `nummo-offline-v<n>`) |
| Apertura a freddo senza rete | Non implementata: il service worker non mette in cache l'app né il bundle, senza rete mostra solo `offline.html`; cache dati ≠ disponibilità offline del bundle |
| Firebase Hosting | Configurato in `firebase.json` e `npm run deploy:hosting` (solo Hosting); pubblicato più volte su autorizzazione sul progetto personale (cronologia nel «Registro dei rilasci» di `HANDOFF.md`) |

**Tastiera virtuale (8 novembre 2026).** Nessuna API web la segnala ovunque (`navigator.virtualKeyboard` solo Chromium
e con contenuto sovrapposto), quindi è dedotta: campo di testo attivo e viewport visibile sotto l'80% del più alto
osservato alla stessa larghezza (`observeVirtualKeyboard`). Copre sia `interactive-widget=resizes-content` (Chrome
Android) sia il solo visual viewport (iOS), ignora pinch zoom e barre del browser. Dal 9 novembre il tocco su un campo
scrivibile anticipa la scomparsa della barra prima dei resize; se la tastiera non viene confermata entro 800 ms,
la barra torna visibile. Dal 22 novembre l'anticipo parte dal focus dato da un tocco (rilascio sul campo, poi focus entro 500 ms) o dal
rilascio su un campo già attivo, mai dalla pressione: nascondere la barra a `pointerdown` e rimostrarla a `pointercancel` la faceva
lampeggiare (circa 85 ms) a ogni scorrimento iniziato su un campo, cioè quasi ogni scorrimento di Nuova spesa. Dopo la conferma resta nascosta anche al blur finché il viewport non recupera almeno il 95%
dell'altezza, evitando ricomparse durante la chiusura. Il solo focus da tastiera fisica non anticipa l'apertura.
Durante la digitazione la pillola mobile
si nasconde; dal 9 novembre le azioni di Nuova spesa restano sempre nel flusso (vedi decisione sopra): nel poco spazio
sopra la tastiera nessun elemento fisso deve coprire i campi. Scartati: offset fissi per dispositivo, solo focus (una tastiera fisica nasconderebbe la navigazione),
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

Su POSIX i figli hanno gruppi di processo separati: Ctrl+C attende l'export Firestore prima
di terminare eventuali discendenti rimasti, senza segnalare emulatori preesistenti.
Su Windows (9 novembre 2026) i figli condividono la console; il runner richiede un export
esplicito via REST al proprio Firestore prima di arrestarne l'albero con `taskkill /T`.
Non si affida a `child.kill('SIGINT')`, che su Windows termina il processo senza il
gestore di export della CLI. Export/validazione falliti conservano lock e staging;
gli errori di cleanup mantengono visibile anche la causa iniziale. Percorsi dell'archivio
validati con `relative` e separatori della piattaforma. Il test Windows invoca il
gestore tramite IPC; Ctrl+C interattivo e crash CLI con discendenti richiedono prove dedicate.
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

Nota storica: il dialogo è stato sostituito dalla pagina Impostazioni; vedere il riepilogo corrente in apertura.

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
  dashboard o negli export; mostrate nella card «Prossimo mese» (già «Prossimi rinnovi») della vista Abbonamenti (dall'8 novembre).
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
singole, `recurrence === null`) e **Abbonamenti** (ogni serie ricorrente, `SubscriptionList`, con «Prossimo mese», già «Prossimi rinnovi»).
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

Fase storica, superata da «Ripristino Barre» e «Andamento senza dettaglio giornaliero» sotto.
La ciambella corrente ha il centro vuoto; la migrazione delle preferenze è `ranking` → `bars`.

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

## Pagina Importa ed esporta — 8 novembre 2026

Esportazioni CSV/JSON e importazione JSON spostate dal pannello Dati della pagina Spese a una pagina
del workspace, aperta dal menu account sotto Categorie. «Fatto» torna alla sezione principale di provenienza,
anche passando da una pagina account all'altra. La richiesta di apertura è un evento di presentazione
da App a RemoteWorkspace, senza router o destinazione aggiuntiva.

BackupActions resta montato e nascosto fuori dalla pagina per preservare anteprima e lavoro asincrono;
il montaggio non legge né scrive dati. Conferme, sincronizzazione richiesta, preflight, copia automatica
e operazioni server restano quelle esistenti. CSV rimane solo esportazione, JSON esportazione/ripristino.
La bozza del modulo resta montata e la pagina viene smontata con il workspace al cambio UID.

## Focus dei selettori e apertura Spese — 8 novembre 2026

`SelectField` e `MenuSelect` usano pulsanti esterni e anchor a coordinate: Paper richiama il focus sull'anchor
anche al primo montaggio chiuso, facendo scorrere i dialoghi fino ai selettori più in basso. Il focus viene
restituito esplicitamente solo alla chiusura, con `preventScroll`, conservando l'accesso da tastiera.

Spese calcola i riepiloghi mensili in un passaggio sui risultati filtrati, con chiavi civili `YYYY-MM` e
formattatori `Intl` riusati per lingua. Monta inizialmente 50 righe; «Mostra altre spese» ne aggiunge 50.
Ricerca, ordinamento e riepiloghi lavorano sull'intero insieme; cambiare ricerca/filtro/ordine torna alle prime 50.
È un limite al rendering, senza paginazione Firestore o modifica ai dati: evita di montare subito centinaia di
controlli Paper dopo un'importazione. Tutti i risultati restano consultabili, senza nuove dipendenze.


## Prestazioni delle righe e animazioni web (9 novembre 2026)

ExpenseList mantiene lo stato dei dettagli e la progressione di 50 righe nel genitore;
ExpenseRow memoizzato riusa righe e formatter durante le interazioni locali. I riepiloghi
continuano a includere tutto il risultato filtrato. SubscriptionList riusa il formatter
di data per lingua e indicizza le categorie. Nessun cambiamento alle query Firestore.
La transizione di sezione usa Web Animations API sul contenitore esistente: 250 ms,
opacity/transform, cancellazione al cleanup, rispetto di reduced motion e animation.scale;
nessun rimontaggio del modulo. Senza API il cambio ? immediato. Reveal dura 250 ms.

## Costo dei cambi pagina (9 novembre 2026)

Il cambio sezione prima rieseguiva RemoteWorkspace (ricreando gli oggetti esposti dai suoi hook) e rimontava
Spese, Dashboard, Fondi e Liste. Anche il modulo Nuova spesa, nascosto ma montato, riceveva nuove props.
Con 240 spese TEST e CPU 4× il lavoro sincrono rendeva indisponibile il thread principale per centinaia di ms;
la transizione WAAPI del contenuto non elimina il costo React/layout, né quello della molla JS della pillola.

La navigazione è ora stato locale di WorkspaceNavigation, sotto gli hook remoti. Callback e props del modulo
restano stabili; modulo e pagine principali usano memo. Le quattro destinazioni montano alla prima visita,
poi Activity conserva DOM/stato e sospende gli effetti quando nascoste, senza precaricare tutte le pagine all'avvio.
Filtri, dettagli e mese selezionato restano tra le visite; tutto è eliminato al cambio UID come prima.
Le richieste di navigazione usano startTransition: React può cedere il thread durante il primo rendering,
mentre la pagina precedente resta visibile fino al commit. Non garantisce un commit senza costo o una latenza minore.
Modulo spesa e backup conservano il proprio ciclo di vita precedente (anche le conferme asincrone).

Nessun nuovo store, router, servizio o query; aggiornamenti remoti, lingua e tema continuano a propagarsi.
Compromesso: DOM e stato delle pagine già visitate occupano più memoria; la prima apertura resta da ottimizzare
se ancora lenta sul dispositivo. Geometria, molla, animazione pagina e limite iniziale di 50 spese invariati.
`scripts/check-navigation.mjs --measure` registra tre giri, commit della destinazione, intervalli rAF e long task;
le prime visite vanno separate dai ritorni. Gli intervalli rAF misurano disponibilità del thread principale,
non FPS presentati dal compositor. Misure e limiti del collaudo in HANDOFF.md.

## Feedback della pillola durante il trascinamento (9 novembre 2026, issue #1)

Il drag della pillola assume il controllo del gesto dopo la soglia orizzontale. Il feedback premuto della voce
iniziale resta soppresso fino alla prossima pressione pointer o attivazione con Invio/Spazio; hover e focus restano
indipendenti. `StateLayerPressable.suppressPressed` azzera immediatamente quel solo strato, anche se il rilascio
interno di Pressable arriva dopo il cambio di selezione: il ritorno dal colore trasparente non deve rivelare una
pressione residua seguita dalla dissolvenza. La soppressione vale anche dopo `pointercancel`. Indicatore, molla,
transizione della pagina e montaggio delle bozze mantengono il comportamento esistente.
Invio/Spazio azzerano anche la soppressione del click residuo del drag: l'attivazione da tastiera è un nuovo
gesto e non deve essere intercettata come il click sintetico del rilascio touch.
Regressione browser con Chromium/CDP, senza nuove dipendenze: `scripts/check-navigation.mjs`, su export demo
con emulatori dedicati; richiede Chromium nel PATH e non certifica il comportamento del dispositivo Android reale.

## Overlay condivisi: menu, fogli dal basso e dialoghi (9 novembre 2026)

Video da smartphone Android (Nuova spesa): il menu Categoria copriva «Salva» e la pillola di navigazione, si apriva
scalando da zero e si chiudeva con una dissolvenza di 250 ms in cui la pagina traspariva dalle voci; il calendario
usciva con 220 ms di dissolvenza decelerata, lasciando il contenuto semitrasparente quando lo scrim era già sparito.
Cause nel codice: Paper `Menu` (scala X/Y da 0 + opacità, chiusura solo opacità) e Paper `Modal` (opacità con
`Easing.out`), più un'altezza del menu calcolata fino al bordo dello schermo, ignorando la navigazione mobile.
La sovrapposizione non dipende dalle transizioni (misurata ad animazione conclusa: con 10 categorie a 412×915 il menu
arrivava al bordo superiore della pillola). Trasparenze e spostamenti erano invece animazioni JS di Paper che,
dal codice, nemmeno il movimento ridotto del sistema disattivava (vedi `animation.scale` sotto).

Decisione: un solo livello `Overlay.tsx` sostituisce Paper `Menu` e `Modal` nell'app.
- `usePresence`: montaggio nascosto, transizione CSS su `opacity`/`transform` dopo due frame, smontaggio dopo
  l'uscita; superfici opache entro 100 ms all'ingresso, uscita sulla curva accelerata (stanno piene, poi spariscono).
- Smartphone: `SelectField` e `MenuSelect` aprono un foglio modale dal basso (M3), sopra scrim e navigazione,
  con lista scorrevole, titolo, Escape, scrim e trascinamento della maniglia; mai menu sotto i pulsanti o la pillola.
- Da medium: menu ancorato sotto il campo, o sopra se sotto non c'è spazio per almeno 192 dp, sempre entro
  viewport/safe area; 4 dp di scorrimento e scala 0,96 → 1 dal lato del campo.
- `AppDialog`: stessa impaginazione dei sottocomponenti Paper; scala 0,92 → 1 e opacità rapida all'ingresso, uscita
  in 100 ms prima dello scrim. Ora anche gli editor montati già visibili hanno l'ingresso animato.
- Focus alla prima voce all'apertura e ritorno all'elemento d'origine con `preventScroll`; overlay chiusi non
  montano nulla, quindi nessun furto di focus o scorrimento al montaggio dei dialoghi.
- Movimento ridotto da `useReducedMotion()`: `PaperProvider`, ricevendo un tema, forza `animation.scale` a 1 e
  ignora quello di `createTheme`. Le animazioni interne di Paper (es. etichette dei campi) non lo rispettano.
Nessuna nuova dipendenza, nessuna modifica a dati, servizi o Rules.

## Chiusura del foglio dal basso con swipe (9 novembre 2026, issue #3)

Il trascinamento della maniglia previsto sopra non si attivava mai: il `Portal` di Paper monta i figli in un commit
successivo, quindi l'effetto di `useSheetDrag` (dipendente solo da `mounted`) trovava i ref vuoti e non ripartiva.
Prova in Chromium: testata con `touch-action: auto`, foglio fermo dopo 260 px di trascinamento.
- I nodi (foglio, testata, lista, scrim) arrivano da ref a callback in stato: l'effetto riparte quando esistono.
  Regola generale per gli overlay nel `Portal`: niente effetti che leggono ref al montaggio senza dipendere dal nodo.
- Testata: pointer event DOM (touch e mouse), `touch-action: none`. Lista: eventi touch con `touchmove` non passivo,
  perché con `pan-y` il browser emette `pointercancel` appena scorre. Il gesto passa al foglio solo se inizia con la
  lista in cima e va verso il basso oltre 8 px, in prevalenza verticale (`sheetGestureOwner`); deciso una volta per
  gesto, così risalire fino in cima non si trasforma in chiusura. `overscroll-behavior: contain` sulla lista;
  click successivo al trascinamento soppresso.
- Chiusura oltre un terzo dell'altezza (max 160 dp) o con swipe ≥ 0,5 px/ms sugli ultimi 100 ms (`recentVelocity`,
  non la media del gesto). Lo scrim schiarisce con la distanza; l'uscita riparte dalla posizione raggiunta con la
  transizione esistente, il ritorno con la propria; movimento ridotto: immediati. Vale per `SelectField` e `MenuSelect`.

## Prova gratuita degli abbonamenti (9 novembre 2026, issue #8)

La prova non è una spesa a zero. `amount_minor` resta positivo, `expense_date` è l'inizio dell'abbonamento,
`first_payment_date` il primo addebito (data civile valida, successiva all'inizio, entro 2099-12-31).
Campo assente = calendario storico invariato. Il calendario pagato e la numerazione dei prezzi partono dal primo
addebito: indice 0 al primo pagamento, indice 1 al rinnovo successivo, con gli stessi limiti di fine mese/bisestili.
Storico, prossimi rinnovi, previsioni, Dashboard, fondi e CSV condividono questa proiezione. Nessun documento di
pagamento, timer di scrittura o cron; al trascorrere dei giorni l'app ricalcola le occorrenze come già faceva.

Durante la prova lo stato persistente è active/paused/cancelled, come prima. «In prova gratuita» è derivato da
active e oggi < primo pagamento. L'indice 0 della prova rispetta i cambi di stato, a differenza dell'indice 0
storico delle serie ordinarie, già pagato alla creazione. Annullamento/pausa di oggi vale dai giorni successivi:
annullare entro il giorno prima del primo pagamento lo evita; farlo nel giorno dell'addebito non lo cancella.
La riattivazione riprende il calendario originale, senza recuperare pagamenti saltati.

UI: opzione solo dopo Ricorrente nel modulo di creazione, un solo campo «Primo pagamento», inizializzato a un
mese dopo l'inizio e modificabile nel calendario. Non si salva anche una durata che potrebbe divergere dalla data.
L'editor delle serie con prova consente di cambiare la prima data solo finché futura e l'importo base finché
non sono iniziati gli addebiti; poi il prezzo vale sui rinnovi futuri. Una prova salvata non si rimuove e non si
aggiunge a una serie ordinaria già registrata: altrimenti si cancellerebbero pagamenti storici. Dopo l'inizio
pagato non si spostano data iniziale, prima data o frequenza. Impostazioni e bozze conservano IT/EN come prima.
`DateField` riceve limiti opzionali e un'etichetta: il default per le spese ordinarie resta 2000-01-01…oggi.

Compatibilità: solo le prove usano `schema_version: 2`, così un vecchio decoder non ignora il campo nuovo
contando spese dalla data di inizio. Il vecchio client blocca l'archivio come non valido: nessuna migrazione
silenziosa, ma aggiornamento obbligatorio prima di usare un archivio con prove. I documenti esistenti restano
schema 1; nessuna riscrittura automatica.

Il budget Rules è stato provato sul caso otto prezzi + otto stati + fondo: la rappresentazione array dei prezzi
non lasciava spazio ai controlli aggiuntivi in aggiornamento. Solo nello schema 2 `price_changes` è quindi una
stringa `indice:centesimi:0|1;…` (vuota senza variazioni, massimo 8), come gli stati e i piani dei fondi.
Decoder rigoroso; nel dominio e nel JSON resta un array. Le Rules conservano importi positivi e limiti per entrambi
gli schemi. Nei controlli legacy si riusano lunghezza/valori e si evita il controllo ridondante sulla dimensione:
chiavi extra negate da hasOnly, campi obbligatori letti e tipizzati (assenza = rifiuto), con test negativi dedicati.

Backup v5 include prima data e versione documento, preserva i lettori v1–v4 e rifiuta prove etichettate con una
versione vecchia. Confronti import includono la prima data; ripristino/unione usano il codec corretto per lo schema.
Fixture aggiornate a v5 e nuovo file TEST delle prove. Sito e nuove Rules devono essere pubblicati separatamente
con autorizzazione; nessuna pubblicazione o modifica dei dati personali fa parte di questa implementazione.

## Cambio di frequenza degli abbonamenti (issue #9) — 10 novembre 2026

**Problema.** «Modifica serie» non permetteva di cambiare la frequenza. Una serie è un solo documento e le sue occorrenze
sono calcolate da data di partenza e frequenza: cambiare semplicemente `recurrence` avrebbe ricalcolato anche le date e il
numero dei pagamenti già maturati, contro la regola «mai alterare pagamenti già maturati». Il modello dati andava quindi esteso.

**Decisione.** Campo facoltativo `calendar_changes`: elenco (massimo 4) di `{ index, start, recurrence }`. Dall'occorrenza
`index` il calendario riparte da `start` con la nuova frequenza. Il numero delle occorrenze non cambia (prezzi per numero di
rinnovo invariati), gli stati restano per data, le occorrenze già maturate mantengono data e importo. `recurrence` resta la
frequenza iniziale; la frequenza in vigore per un'occorrenza è `recurrenceAt`. Funzioni pure in `src/domain/recurrence.ts`
(`scheduleDateAt`, `scheduleDates`, `parseCalendarChanges`, `switchFrequency`, codec); `applyFrequencyChange` in `expense.ts`.
Senza cambi il risultato è identico a prima (test di equivalenza). Prima del primo pagamento (prova in corso) si sostituisce
direttamente la frequenza di base, senza segmento. Un cambio non ancora in vigore (stessa occorrenza) si sostituisce.
La data del nuovo primo rinnovo deve essere successiva a oggi, quindi solo il futuro cambia; la validazione in avanti
(la ripartenza segue l'occorrenza precedente) è del decoder, non delle Rules.

**Schema 3.** Un vecchio client ignorerebbe il campo e calcolerebbe date sbagliate (e lo cancellerebbe al salvataggio):
si introduce `schema_version: 3`, rifiutato dai vecchi decoder come lo schema 2 delle prove. Schema 3 = prezzi in forma
compatta (come lo schema 2, per il budget di 1000 espressioni delle Rules), `first_payment_date` facoltativa,
`calendar_changes` facoltativo (stringa `indice:AAAA-MM-GG:w|m|y;…`). Le serie senza cambi restano schema 1 o 2: **nessuna
migrazione**, i documenti esistenti non vengono riscritti; solo salvando un cambio la serie passa a schema 3 (i prezzi si
ricodificano nella forma compatta nella stessa transazione). Le Rules impongono forma, versione (non regredisce) e che il
campo non venga tolto né accorciato; il caso peggiore (8 prezzi, 8 stati, fondo, prova, 4 cambi) è verificato in emulatore.

**Backup v6.** `calendar_changes` come array solo quando presente; lettori v1–v5 invariati, e i file precedenti con schema 3
o `calendar_changes` sono rifiutati con messaggio dedicato. Fixture `tests/fixtures/nummo-cambio-frequenza-2026-11-10.json`.

**Compatibilità.** Rilascio: prima le Rules, poi il sito. I client aperti vanno ricaricati; quelli vecchi rifiutano un archivio
con serie schema 3. CSV: una riga per occorrenza con la frequenza in vigore alla data; elenco abbonamenti: frequenza del
prossimo rinnovo.

## Fondi e budget semplificati (issue #7) — 10 novembre 2026

**Obiettivo.** Fondi e budget devono essere strumenti facoltativi per organizzare le spese, non contabilità. Nummo è completamente
utilizzabile senza fondi e senza budget; con fondi esistenti l'inserimento di una spesa non richiede nessuna scelta.

**Cosa cambia, senza toccare il modello dei fondi.** Nessuna migrazione e nessuna cancellazione:
- il documento fondo resta com'è (le Rules non cambiano per i fondi); un **nuovo** fondo nasce con saldo iniziale 0, nessuna ricarica e
  nessuna eccezione, e il modulo offre solo nome, icona, colore e budget mensile;
- la pagina mostra la **spesa del mese** (totale e per fondo), il budget rimasto e, aprendo un fondo, le sue spese del mese; i saldi,
  «Aggiungi denaro» e «Trasferisci» compaiono **solo** finché esiste un fondo con dati di saldo (`hasBalanceData`: saldo iniziale, ricariche o
  movimenti). Per quei fondi saldo, ricariche e movimenti restano consultabili (e i movimenti eliminabili) e il salvataggio del fondo riscrive
  invariati saldo iniziale, data di inizio, ricariche ed eccezioni (`fundFromForm`, coperto da test);
- in Nuova spesa e nel dialogo «Registra spesa» la scelta del fondo parte da «Nessun fondo» (o dal fondo predefinito), senza errore obbligatorio;
  il saldo del fondo si mostra solo se ne tiene uno.

**Budget mensile generale.** Un documento `users/{uid}/settings/budget` con il piano compatto `YYYY-MM:importo;…` del budget ricorrente di un fondo
(stesso codec, stessa regola «vale dal mese corrente, i mesi chiusi restano»; nessuna eccezione per mese). Si confronta con la spesa totale del mese
(ogni fondo e «Senza fondo»; per i mesi futuri la previsione). Le Rules (`generalBudget`) impongono documento unico, campi esatti, formato e revisione;
l'ordine dei mesi è del decoder. Scritture in transazione sulla revisione vista, con listener separato in `useRemoteFunds`: un suo errore non nasconde i fondi.
**Backup v6** (non ancora rilasciato, nessun nuovo numero): `general_budget` solo se presente; unione = riempie un budget vuoto, mai sovrascrive
(un budget diverso blocca l'importazione), sostituzione = uguaglia il file (senza `general_budget` lo azzera, con copia automatica precedente: superata il 22 novembre, ora il backup è solo proposto, vedi «Backup proposto, non automatico, prima di eliminare»).

**Scelte non fatte.** Non si rimuovono ricariche, movimenti, trasferimenti o eccezioni dal modello né dal backup: sarebbe una migrazione
distruttiva di dati reali. Una futura dismissione richiede una decisione esplicita. Il budget generale non ha eccezioni mensili.


## Revisione icone da riferimenti visivi — 12 novembre 2026

Su richiesta esplicita rimossi gli ID `star` e `graduation` dai tre stili e dalle Rules locali.
Come per le precedenti rimozioni, decoder e import non accettano questi ID: nessuna trasformazione automatica
dei dati personali. La terza icona richiesta era `beer`, rimossa allo stesso modo; ridisegnati inoltre gli sprite pixel di
gamepad, borsa, fotocamera, divano e moneta (ora pila di monete), che non si riconoscevano.
Fotocamera, divano, pizza e borsa mantengono gli ID, con sprite più dettagliati sulla stessa griglia 12×12.
Il popcorn conserva l'ID e usa nei due set illustrati una palette semantica dedicata: cartone rosso,
strisce bianche, chicchi gialli in entrambi i temi. Colori nei token `iconPalette.ts`, nessun colore letterale
nei disegni e controlli di contrasto comuni agli altri set.

## Templates di «Nuova spesa» — 15 novembre 2026

- **Cosa sono:** preimpostazioni (descrizione, importo facoltativo, data, categoria, fondo; mai la ricorrenza) scelte da un
  campo «Template» sotto Fondo in Nuova spesa. Si gestiscono nella pagina Templates (menu account, sotto Categorie): interruttore
  (spento di base, `templatesEnabled` nelle preferenze del browser), nuovo template, elenco con modifica ed eliminazione.
- **Dove vivono:** sono dati d'archivio, non preferenze, quindi seguono la regola delle due modalità: `DataStore`
  (`watchTemplates`, `saveTemplate`, `removeTemplate`) in Firestore (`users/{uid}/templates/{uuid}`, Rules con campi, importo,
  data, UUID e timestamp; scritture semplici come le liste, ultima vince, nessuna revisione) e in IndexedDB (store `templates`,
  **passo 2** dello schema locale; il passo 1 elenca ora i soli store originali). Nel backup JSON **v7** (`templates`,
  assente se vuoto; unione/sostituzione come per i movimenti, lettore v7, file precedenti senza template). `onQueuedWriteError`
  accetta più ascoltatori (liste e template).
- **Scelte da confermare:** il nome nel selettore è la descrizione (nessun campo «nome» a parte); la data del template è
  quella salvata (compilata così in Nuova spesa); con più fondi il fondo va scelto (anche «Nessun fondo») come nella spesa.

## Pausa/annullamento datati, filtro per fondo, promemoria dei rinnovi — 15 novembre 2026

- **Stato con data (soluzione 1 concordata).** Dimenticare di mettere in pausa o annullare lasciava nello storico un
  pagamento mai avvenuto. `setStatus` accetta ora la data di efficacia (non solo oggi): `StatusDialog` offre «Da oggi» o
  «Da una data passata» (da max(inizio, ultimo cambio) a oggi) e mostra prima di salvare i pagamenti che smetterebbero di
  contare (`paymentsRemoved`, stesse regole di `expandOccurrences`). Cambia solo `status_changes`: nessun documento
  cancellato, nessuna modifica a Rules/schema/backup. Resta valido «il cambio vale per le occorrenze successive alla sua
  data»; la regola «mai alterare i pagamenti già maturati» vale ora per il cambio di oggi, mentre una data passata li
  toglie su scelta esplicita e con anteprima. La riattivazione non si data nel passato (inventerebbe pagamenti).
- **Filtro «Fondo»** in Spese (viste Spese e Abbonamenti, scheda «Prossimo mese» compresa) e in Analisi: tutti, senza
  fondo o un fondo (anche archiviato). Solo presentazione (stato locale, `effectiveFundFilter`), con `Occurrence.fund_id`.
  Sempre presente con almeno un fondo (l'interruttore «Filtra per fondo», `showFundFilter`, è stato rimosso il 15 novembre su richiesta).
- **Promemoria dei rinnovi** (tipo `renewal` del servizio push): notifica alle 9:00 del giorno prima del primo rinnovo di
  un abbonamento attivo, interruttore «Avvisa prima dei rinnovi» in Notifiche (`renewalEnabled`). Il servizio riceve solo
  la data; tiene un promemoria alla volta (come il riepilogo), il successivo parte quando l'app rinvia gli orari. Il tocco
  apre Spese → Abbonamenti. Richiede il deploy del Worker prima dell'Hosting (il vecchio Worker rifiuta il nuovo tipo).

## Budget mensile generale rimosso dall'interfaccia — 16 novembre 2026

- Su richiesta dell'utente: la pagina Fondi non mostra più il budget mensile generale (card, «Budget»/«Imposta un budget mensile»,
  `GeneralBudgetDialog` eliminato) e `useRemoteFunds` non ascolta più `settings/budget`. Restano i budget mensili dei singoli fondi.
- **Dati invariati:** `settings/budget` (Rules, `DataStore`, store locale), funzioni di dominio e campo `general_budget` del backup
  restano, così archivi e backup esistenti continuano a validarsi, esportarsi e importarsi senza perdite. Nessuna cancellazione
  automatica; un'eventuale dismissione dei dati richiede una decisione esplicita (nuovo `backupVersion`, Rules, migrazione locale).

## Templates eliminati, Fondi senza saldo nell'interfaccia — 16 novembre 2026

- **Templates (rimozione completa, scelta dell'utente):** tolti pagina, voce di menu, campo «Template» di Nuova spesa, preferenza
  `templatesEnabled` (un valore salvato si ignora), dominio `template.ts`, `DataStore.watchTemplates/saveTemplate/removeTemplate` in
  entrambe le implementazioni, Rules `users/{uid}/templates/{id}` (ora rifiutate come ogni percorso non elencato) e campo `templates` del
  backup. **`backupVersion` 8**: nessun `templates`; i file v7 (e v6) si leggono ancora e i loro `templates` vengono ignorati, perché nessun
  altro dato ne dipende. Dati esistenti: lo store IndexedDB `templates` (passo 2 dello schema) resta ma nessuno lo legge o scrive (un passo
  esistente non si modifica e una cancellazione automatica di dati è esclusa); in Firestore i documenti restano, inaccessibili.
  Serve ripubblicare le Rules (autorizzazione separata).
- **Fondi «molto semplici» (scelta dell'utente: tutto il saldo fuori dall'interfaccia):** un fondo è un gruppo di spese con budget mensile
  facoltativo. Tolti dalla pagina «Saldo e movimenti», «Senza ricarica»/ricarica, «Aggiungi denaro» (+), «Aggiungi»/«Trasferisci»,
  «Disponibile ora»/«Saldo a fine mese», saldo dei fondi archiviati; dal modulo «Saldo iniziale» e «Ricarica mensile»; da Nuova spesa
  «Saldo disponibile». `MovementDialog` eliminato, `createMovement/removeMovement` tolti da `useRemoteFunds`. **Dati invariati:** dominio,
  `DataStore`, Rules e backup di saldo, ricariche e movimenti restano; `fundFromForm` senza `balance` riscrive invariati i dati di saldo
  esistenti; un fondo con movimenti resta non eliminabile (si archivia).

## Fondi: Aggiungi, Trasferisci e ricarica ripristinati, riepilogo a soli totali — 16 novembre 2026

- Su richiesta, sostituisce in parte la voce precedente: tornano esattamente come prima «Aggiungi»/«Trasferisci» (`MovementDialog`) e il «+»
  della scheda, solo per i fondi con dati di saldo, e «Ricarica mensile» nel modulo (con la riga «Ricarica di … il giorno …» sulla scheda;
  niente «Senza ricarica»). Restano tolti il saldo iniziale dal modulo (quello salvato si riscrive invariato) e ogni cifra di saldo.
- *(Superato dalle scelte successive del 16 novembre: sette righe sempre presenti, «Entrata» … «Spesa totale»; vedi AGENTS «Fondi».)*
- La scheda espansa («Riepilogo del mese») mostra solo totali: aggiunte, trasferimenti ricevuti/inviati, ricariche (ricevute/previste) se
  presenti e lo speso totale; nessun elenco di spese o movimenti (quindi i movimenti non si eliminano dall'interfaccia).

## Pagamenti eliminati dallo storico di un abbonamento — 16 novembre 2026

- Su richiesta (scelta dell'utente: «togli un singolo pagamento», non «da qui in poi»): i pagamenti sono calcolati, quindi eliminarne uno salva
  il **numero dell'occorrenza** in `skipped_payments` (facoltativo, solo serie, 0–9999, crescente, max 60). Il numero non cambia mai (prezzi e
  cambi di frequenza lo usano già), quindi gli altri pagamenti mantengono data e prezzo; la pausa/annullamento datati restano la soluzione per
  «da qui in poi».
- Forma: Firestore stringa «3,7,12» solo se non vuota (come `status_changes`), Rules con una regex e `hasOnly` aggiornato; IndexedDB e backup
  array. **`backupVersion` 9**; un file < 9 con il campo è rifiutato. Nessun `schema_version` nuovo (scelta consapevole): un client non aggiornato
  ignora il campo e conta ancora il pagamento eliminato finché non carica la versione nuova (nessun dato perso; uso personale, Hosting
  aggiornato insieme). Rules da ripubblicare.

## Scansione dello scontrino con OCR e AI facoltativa — 16 novembre 2026

Su richiesta. In Nuova spesa «Scansiona scontrino» apre un dialogo: foto o file → anteprima → lettura → revisione → i quattro
campi base del modulo vengono compilati. Decisioni:

- **Solo proposta.** Nessuna scrittura parte dalla scansione: il salvataggio resta su «Salva» con `validateDraft`. Nessun campo
  nuovo nel modello dati, nessun metodo `DataStore`, Rules e backup invariati. Prodotti e sconti letti si mostravano nella revisione
  senza salvarli (superato il 17 novembre: non si mostrano più, su richiesta; il dominio li legge ancora).
- **OCR standard locale.** Tesseract.js 7 (motore LSTM, dati `ita` + `eng` `best_int`) gira in un worker del browser. Libreria,
  core WebAssembly e dati sono serviti dall'app da `/ocr/` (copiati da `node_modules` con `scripts/sync-ocr.ts`, non versionati,
  circa 16 MB su disco; il browser ne scarica circa 8 MB alla prima scansione) e non da un CDN: nessun codice di terze parti
  caricato a runtime, la foto non lascia il dispositivo. La libreria si carica con un tag `<script>` solo alla prima scansione,
  quindi non entra nel bundle Metro. Le regole di lettura (`domain/receipt.ts`) sono prudenti: il totale viene da una riga di
  totale (mai subtotale, IVA, sconti, contanti o resto); senza di essa l'importo è dedotto dal pagamento o è il più alto letto ed
  è sempre segnalato «da controllare»; ciò che non c'è resta mancante.
- **AI facoltativa, BYOK.** OpenAI, Google Gemini, Claude (Messages API, intestazione `anthropic-dangerous-direct-browser-access`) e API
  compatibili OpenAI con chiamata `fetch` diretta dal browser (tutti accettano richieste CORS): nessun proxy, nessun backend, nessuna chiave del progetto. La chiave API resta solo in memoria
  (persa a ogni ricarica): niente localStorage, Firestore o bundle. Consenso esplicito per destinazione prima del primo invio.
  La risposta deve essere un oggetto JSON e ogni campo è validato (`parseAiReceipt`): importi e date possibili per una spesa,
  categoria solo tra quelle esistenti. Se l'AI fallisce si può usare la scansione standard.
- **Limiti noti.** La chiave va reinserita a ogni apertura (superato il 17 novembre: ora è salvata, vedi «Chiave API salvata»; scelta di sicurezza iniziale: una chiave salvata nel browser sarebbe leggibile
  da qualunque script della pagina). Una chiave usata dal browser è comunque visibile a chi controlla il dispositivo. Un servizio
  compatibile che non consente CORS non è utilizzabile: non si aggiunge un proxy. HEIC e altri formati dipendono dal browser.
  L'accuratezza dell'OCR su scontrini reali (carta termica sbiadita, foto storte) non è stata misurata.

## Esercenti in Nuova spesa — 16 novembre 2026

Su richiesta (specifica incollata dall'utente). Campo **Esercente** facoltativo in Nuova spesa e nella modifica, dopo la Descrizione,
con suggerimenti dagli esercenti già usati. Decisioni:

- **Entità riutilizzabile, ID derivato dal nome.** `users/{uid}/merchants/{id}` con il solo `name` mostrato; le spese hanno `merchant_id`
  facoltativo (assente = nessun esercente, come per tutte le spese precedenti). L'ID è la **chiave del nome** (`merchantKey`: NFC, spazi
  normalizzati, minuscole, `%`/`/` codificati, prefisso `m-`), non un UUID: «amazon», «AMAZON» e «  Amazon  » sono lo stesso documento per
  costruzione, anche offline, in due schede o su due dispositivi, e due backup con lo stesso esercente non vanno mai in conflitto. Nessun
  indice dei nomi da mantenere (a differenza di `categoryNames`) e nessuna transazione necessaria per crearlo. Scartati: UUID + indice dei
  nomi (una creazione contemporanea offline rifiuterebbe l'intera spesa e due archivi uniti andrebbero in conflitto sul nome) e nome copiato
  in ogni spesa (duplicazione, nessuna entità). Limite consapevole: senza una pagina di gestione non c'è rinomina; una rinomina futura
  dovrebbe aggiornare i riferimenti.
- **Nome mostrato separato dal confronto.** Un nome scritto tutto minuscolo o tutto maiuscolo diventa «Iniziale maiuscola» parola per parola
  (parole brevi di collegamento in minuscolo: «Bar da Mario»); una grafia con maiuscole miste («eBay», «McDonald's», «IKEA Bari») resta com'è.
  Il nome è fissato al primo uso: una grafia diversa dello stesso nome riusa l'esercente senza rinominarlo. Unica eccezione in Avanzata: due
  dispositivi che creano lo stesso esercente prima di sincronizzarsi scrivono lo stesso documento e resta l'ultima grafia (stesso nome).
- **Creazione solo con la spesa.** Nessuna scrittura automatica: l'esercente nuovo parte con la spesa che lo usa per la prima volta, nello
  stesso batch Firestore (accodato offline come la spesa) o nella stessa transazione IndexedDB; nella modifica, nella transazione della
  spesa. Rimuovere l'esercente da una spesa non elimina l'esercente (resta tra i suggerimenti, in fondo); solo una sostituzione da backup
  elimina quelli assenti dal file. Nessuna pagina di gestione, nessun catalogo, nessuna conferma.
- **Uso calcolato, non salvato.** Frequenza e recenza vengono dalle spese (`rankMerchants`): ogni spesa pesa 0,5^(giorni dalla data / 90),
  quindi le abitudini recenti prevalgono su quelle vecchie senza cancellarle. Nessun contatore da tenere allineato: modifiche, eliminazioni e
  importazioni aggiornano l'ordine da sole. Suggerimenti: nome o parola che inizia con il testo (accenti facoltativi), poi testo contenuto da
  3 caratteri; massimo 5; l'esercente già scritto esattamente non viene riproposto. Combobox nel flusso del modulo (nessun overlay): il campo
  conserva il focus e la tastiera, frecce + Invio, Escape chiude.
- **Forma dei dati.** Firestore `merchant_id` solo se presente (`deleteField` quando si toglie), Rules: forma dell'ID nella spesa
  (budget di espressioni rimisurato con il caso peggiore), documento esercente con solo `name` (1–60, senza tabulazioni né doppi spazi) e ID
  uguale a `merchantKey(name)`. IndexedDB: passo di schema **3** (`merchants`). **`backupVersion` 10**: `merchants` (solo se non vuoto) e
  `merchant_id` nelle spese; una spesa che nomina un esercente assente dal file rende il file non valido; file < 10 con esercenti rifiutati.
  Unione: stesso ID = stesso esercente, mai un conflitto, si conserva la grafia salvata; sostituzione: uguale al file. CSV: colonna finale
  «Esercente». Nessun nuovo `schema_version`: un client non aggiornato ignora il campo. **Rules da pubblicare** prima di usare gli esercenti
  in Avanzata (con le Rules attuali il salvataggio di una spesa con esercente è rifiutato; senza esercente nulla cambia).
- Fuori ambito: liste della spesa (la registrazione non chiede l'esercente) e scansione dello scontrino (non compila l'esercente), ricerca
  per esercente in Spese, filtri o grafici per esercente.

## Chiave API salvata e modello a sola scelta — 17 novembre 2026

Su richiesta, supera due decisioni qui sotto:

- **Chiave salvata nel browser.** «La chiave non si salva, ogni volta devo aggiungerla»: la chiave ora resta in `nummo.receiptAi.keys.v1`,
  una per destinazione (`aiDestination`), separata dalle impostazioni; cambiando servizio si usa la chiave di quel servizio, tornando
  indietro ricompare la precedente. Valori validati alla lettura (`parseAiKeys`), salvata solo una chiave senza spazi né caratteri di
  controllo, «Dimentica la chiave» la cancella. Rischio accettato dall'utente: una chiave nel `localStorage` è leggibile da qualunque
  script della pagina (Nummo non carica script di terzi) e da chi usa il dispositivo. Resta fuori da Firestore, backup, bundle, log e URL.
- **Modello a sola scelta.** Il campo «Modello» è un `SelectField` con l'elenco del servizio: nessun nome scritto a mano. Senza elenco
  (chiave assente, rete, CORS) il campo resta disabilitato, con l'errore e «Riprova»; un modello già salvato resta tra le voci. Il
  consigliato (con Gemini prima `gemini-3.1-flash-lite`; dal 21 novembre, su richiesta, `gemini-3.5-flash-lite`) è segnato «(consigliato)» e preselezionato solo a campo vuoto.
- **Elenco dei modelli ridotto** (screenshot del piano gratuito di Gemini, decine di voci): per Gemini restano solo le famiglie stabili
  `gemini-<versione>-flash-lite`, `-flash`, `-pro` (con o senza edizione `-001`, una voce per versione), le due versioni più recenti di
  flash-lite e flash e la più recente di pro, più i consigliati se elencati (`curateGeminiModels`). Fuori generatori di immagini, voce e
  musica, Gemma, robotica, anteprime, alias `-latest` e nomi in codice. Se una nuova denominazione non corrisponde a nessuna famiglia,
  l'elenco resta intero invece di vuoto. Per OpenAI si tolgono snapshot datati, anteprime e `latest` quando resta il nome del modello.
- Tolti dalla scheda i testi d'aiuto (introduzione, chiave non salvata, suggerimento del modello, nota della scansione predefinita, testo
  del consenso); restano «Dimentica la chiave» e «Revoca il consenso».

## Elenco dei modelli AI nelle Impostazioni — 16 novembre 2026

Su richiesta. Il campo «Modello» di «Analisi scontrini con AI» propone i modelli del servizio scelto. Decisioni:

- **Combobox, non selettore chiuso** (superato il 17 novembre: sola scelta, vedi sopra). Il campo resta un testo libero con l'elenco sotto (stesso schema dell'Esercente): l'elenco può
  mancare (chiave non ancora scritta, CORS, rete), essere filtrato troppo o non aggiornato, e un nome scritto a mano deve restare valido.
- **Richiesta automatica con ritardo di 500 ms** dopo l'ultima modifica della chiave o dell'indirizzo, annullata se cambiano ancora; è una
  GET che invia la sola chiave al servizio a cui appartiene (cambiando destinazione la chiave viene già dimenticata), nessuna foto e
  nessun dato: non richiede il consenso della scansione. L'elenco vive nello stato della scheda, mai salvato.
- **Chiave sempre in un header**, anche per Gemini (`x-goog-api-key` invece di `?key=` della specifica): un indirizzo finisce in
  cronologie e log.
- **Filtro solo dove serve**: OpenAI elenca insieme ogni tipo di modello, quindi si tengono le famiglie chat; Gemini dichiara i metodi
  (`generateContent`); Claude e i server compatibili non si filtrano. Nessuno dei servizi dichiara in modo uniforme la lettura delle
  immagini: se il modello scelto non le accetta, l'errore arriva alla scansione («controlla che il modello accetti immagini»).
- **Consigliato solo a campo vuoto**: una scelta dell'utente non viene mai sostituita; il modello si svuota al cambio di servizio.

## Scansione: esercente separato dalla descrizione, scansione predefinita — 16 novembre 2026

Su richiesta (screenshot: «Spazio Conad» finiva nella Descrizione). Decisioni:

- **Il negozio è l'Esercente.** `ReceiptProposal.merchant` (massimo 60 caratteri) compila il campo Esercente della revisione, con gli
  stessi suggerimenti del modulo; passa al modulo come gli altri campi (`scanPatch`: mai sopra un valore già scritto senza «Sostituisci i
  dati già inseriti»). L'esercente nuovo nasce solo con il salvataggio della spesa, come sempre: la scansione non scrive nulla.
- **La Descrizione è il tipo di acquisto.** Con l'OCR una parola fissa dal tipo di negozio riconosciuto («Spesa», «Ristorante»,
  «Carburante», «Farmacia», «Trasporti», «Abbigliamento», «Elettronica»; tradotta al confine UI), vuota se il tipo non è chiaro; con
  l'AI il campo `description` della risposta (una–tre parole nella lingua dell'interfaccia, mai il nome del negozio). È sempre «da
  controllare» e da sola non rende valida una scansione (`emptyProposal` la ignora).
- **Scansione predefinita** (`scan` in `nummo.receiptAi.v1`, `ocr` di base): scelta nella scheda delle Impostazioni, decide solo con
  quale tipo si apre il dialogo quando l'AI è configurata; l'altro tipo, il consenso e il ripiego sull'OCR restano invariati.

## Scansione dello scontrino solo con AI, spenta di base — 21 novembre 2026

Su richiesta: l'AI è la lettura che conviene usare, quindi l'OCR locale è stato tolto del tutto. Le sezioni del 16 e 17 novembre
sulla scansione restano come storia; dove parlano di OCR, scansione predefinita o «API compatibile OpenAI» sono superate.

- **Rimossi:** Tesseract.js e i dati `ita`/`eng` (devDependency e lockfile), `scripts/sync-ocr.ts`, `npm run ocr:sync` e il suo uso in
  `dev`, `dev:demo`, `build:demo` e `build:cloud`, la cartella generata `public/ocr/` (circa 16 MB non più nell'export), l'intestazione
  Hosting `/ocr/**`, `services/receiptOcr.ts`, la lettura del testo in `domain/receipt.ts` (totali, date, esercente, tipo di negozio),
  il testo OCR passato al prompt, il tipo di scansione nel dialogo, il ripiego sull'OCR e la «Scansione predefinita».
- **Rimosso anche il servizio «API compatibile OpenAI»** (indirizzo personalizzato): restano OpenAI, Google Gemini e Claude. Un'impostazione
  salvata con `compatible` vale «nessun servizio scelto»; la sua chiave resta nel browser ma non si usa più.
- **Interruttore.** `enabled` in `nummo.receiptAi.v1`, spento di base. Finché è spento «Scansiona scontrino» non compare in Nuova spesa e
  nella scheda «Analisi scontrini con AI» servizio, chiave e modello sono attenuati e `inert`, senza richieste al servizio. Compatibilità:
  un'impostazione senza `enabled` vale accesa solo se aveva già un servizio scelto, così chi usava l'AI non perde il pulsante.
- **Dialogo.** Se manca il servizio o il modello lo dice («Scegli il servizio AI nelle Impostazioni.») e «Scansiona» resta disattivato; un
  errore dell'AI mostra il messaggio e «Riprova». Consenso, revisione, `scanPatch` e il resto delle regole sono invariati.
- **Nessun cambiamento** a `DataStore`, Rules, backup o dati salvati.
- **Abbonamenti ChatGPT/Claude al posto della chiave (valutato, non implementato).** Claude: i token OAuth dei piani Free/Pro/Max sono
  ammessi solo in Claude Code e Claude.ai, l'uso in app di terzi è vietato dai termini (febbraio 2026) e bloccato (aprile 2026): non fattibile.
  OpenAI: «Sign in with ChatGPT» con uso del piano (DevDay, 29 settembre 2026) consente ad app di terzi aderenti di usare il piano dell'utente;
  da verificare se l'accesso per sviluppatori è aperto o su adesione, i limiti per app e se il flusso funziona da una pagina statica senza
  backend. Decisione rinviata all'utente.

## Templates reintrodotti, con l'Esercente — 21 novembre 2026

Su richiesta: la funzione Templates, eliminata il 16 novembre, torna com'era, adattata al codice di oggi. Le sezioni del
16 novembre sulla rimozione restano come storia.

- **Ripristinato dalla storia Git** (`f9c4d8f^`): `domain/template.ts`, `features/templates/` (pagina, editor, modulo, hook), metodi
  `DataStore.watchTemplates/saveTemplate/removeTemplate` in entrambe le implementazioni, Rules `templates/{uuid}`, voce «Templates» del
  menu account (dopo Categorie), preferenza `templatesEnabled` (spenta di base), campo «Template» di Nuova spesa, `amountOptional` di
  `ExpenseFields`, voce della guida pubblica.
- **Novità rispetto al 15 novembre:** campo Esercente facoltativo nel template, salvato come **nome** (`merchant`, normalizzato, massimo 60
  caratteri), mai come documento `merchants`: l'esercente si crea come sempre solo insieme alla spesa salvata dal modulo, quindi un
  template non scrive mai esercenti. Il modulo del template usa il layout attuale (fondo accanto alla Categoria o sotto su smartphone,
  Esercente con suggerimenti); l'hook usa `dataErrors` come gli altri.
- **Dati esistenti:** lo store IndexedDB `templates` (passo 2) non era mai stato svuotato e i documenti Firestore `templates` erano solo
  resi inaccessibili dalle Rules: i template salvati prima del 16 novembre tornano visibili. Sono senza `merchant`: il decoder lo legge
  come assente, le Rules lo ammettono facoltativo (`hasAll` senza, `hasOnly` con) e la prima modifica lo scrive.
- **Backup v11:** `templates` di nuovo, ciascuno con `merchant` solo se presente. Il lettore v7 legge di nuovo i template (senza
  esercente); v8–v10, scritti mentre i template non esistevano, non ne hanno (un campo `templates` lì si ignora); un esercente nei template
  di un file anteriore alla v11 è rifiutato. Unione e sostituzione come le liste (`planById`, conflitto `template`).
- **Rules da pubblicare** prima dell'Hosting: senza, in Avanzata il listener dei template fallisce (`permission-denied`), mostrato come
  errore della sola pagina Templates; spese, fondi e liste non ne dipendono.

## Importo obbligatorio nei template — 21 novembre 2026

- Su richiesta, il modulo dei template (pagina Templates e modifica) richiede l'importo, come Nuova spesa («Inserisci l’importo.»);
  `amountOptional` di `ExpenseFields` è rimossa.
- **Compatibilità, senza migrazioni:** `amount_minor` resta `number | null` nel dominio, nel decoder, nelle Rules e nel backup v11. I
  template salvati prima senza importo si leggono ancora e riempiono Nuova spesa lasciando l'importo da scrivere; alla prima modifica il
  modulo lo chiede. Nessuna modifica a Rules, `DataStore` o `backupVersion`: la regola è solo del modulo.

## Feedback aptico sul web: niente expo-haptics, impulsi singoli con distanza minima — 21 novembre 2026

- **Contesto.** Su richiesta (vibrazione «lunga e ronzante» sul Pixel 8) si è valutato `expo-haptics` con
  `performAndroidHapticsAsync` (effetti nativi `Context_Click`, `Segment_Tick`, `Confirm`, `Toggle_On/Off`, `Reject`).
- **Decisione.** Non adottarlo. Nummo è solo web: gli effetti nativi Android (`performHapticFeedback`, `EFFECT_CLICK`/`TICK`,
  primitive) esistono solo nelle app native e la libreria li dichiara «Android»; sul web chiama lo stesso `navigator.vibrate`
  con impulsi da 35–60 ms (`ExpoHaptics.web.ts`), più lunghi dei 10/6 ms già usati. Una dipendenza in più senza vantaggio.
- **Cosa resta alla pagina:** impulsi singoli brevi (`tap` per spostarsi, `tick` per selezionare), mai pattern; un solo
  cancello per app che scarta le richieste entro 60 ms dall'ultima accettata; zona morta di 0,15 di passo sui confini della
  barra mobile durante il trascinamento (prima un dito fermo sul confine dava un impulso ogni 33 ms, misurato); nessuna
  vibrazione quando la scelta non cambia. Conferma, rifiuto e interruttori senza vibrazione: sul web sarebbero solo durate o
  impulsi multipli, non effetti distinti.
- **Durate (stesso giorno, su richiesta):** da 10/6 a 6/4 ms, perché ancora «forte e zanzarosa» sul Pixel 8; l'intensità la fissa
  il browser, quindi più delicata significa solo più breve.
- **Seguito (stesso giorno, su richiesta):** durate 4/3 ms per una vibrazione ancora più leggera; nessuna vibrazione su pulsanti a
  segmenti e righe della legenda di Analisi.
- **Ritorno a 6/5 ms (21 novembre, sera, su richiesta):** a 4/3 ms il Pixel 8 non vibrava affatto (il motore non parte per un
  impulso così breve); `tap` 6 ms, l'ultima durata percepita, e `tick` 5 ms. Sotto 5 ms non si scende.
- **Limiti.** La forma dell'impulso (attacco, frenata del motore) la decide Chrome/Android, non la pagina; Safari/iOS e Firefox
  non vibrano. Le durate si scelgono provandole sul telefono con `docs/testing/prova-vibrazione.html`.

## «Template» di Nuova spesa nella prima riga, come pulsante — 21 novembre 2026

- **Contesto.** Su smartphone, con i template attivi, il campo «Template» sotto Categoria/Fondo e sopra «Ricorrente» spingeva «Salva»
  sotto la barra di navigazione (screenshot dell'utente).
- **Decisione (dell'utente).** Il campo diventa un pulsante-selettore (`TemplatePicker`) nella prima riga, accanto a «Scansiona
  scontrino», o al suo posto se la scansione è spenta; scelto un template mostra solo l'icona della sua categoria; aspetto distinto dal
  resto del modulo. Su smartphone i due pulsanti dividono la riga come Importo e Data.
- **Seguito (stesso giorno, su richiesta).** Il pulsante non cambia più dopo la scelta (sempre icona «template» ed etichetta «Template»:
  la scelta si vede nei campi compilati e nella voce selezionata dell'elenco); «Nessun template» svuota tutto il modulo, come dopo un
  salvataggio, anche se i dati erano stati scritti a mano.
- **Scelte tecniche.** Contorno, icona ed etichetta in `primary`, con la freccia del selettore: diverso dai campi (contorno grigio) e dal
  pulsante tonale della scansione con ogni accento; scartato `tertiaryContainer`, che in modalità mono è il grigio neutro delle
  superfici e sembra disattivato. Scelta con lo stesso foglio (smartphone) e menu (da medium) di `SelectField`, esteso con `trigger`
  e `menuMinWidth` (360) invece di un secondo selettore. Il nome del template resta nell'etichetta accessibile e nell'elenco.

## Offline in Avanzata, pagina offline, passaggio dei dati tra le modalità — 21 novembre 2026

- **Contesto.** Su richiesta dell'utente, dopo un'analisi in tre livelli (inserire offline, modificare offline, aprire senza rete): l'app è
  di solito già aperta quando la rete cade e basta **inserire**. Unire le due modalità in un archivio locale sincronizzato è stato valutato e
  scartato (motore di sincronizzazione proprio, conflitti, lapidi, nomi unici, operazioni atomiche spezzate): resta una sola fonte di verità per modalità.
- **Livello 1, più spese offline.** In Avanzata `createExpense` attende il server, quindi il modulo restava su «In attesa di conferma…» e se ne
  poteva inserire una sola. Ora, quando la spesa è già nella copia del dispositivo (`pendingIds` del listener, dati identici alla richiesta),
  lo stato `queued` libera il modulo: subito se `navigator.onLine` è falso, altrimenti dopo 2 s. Non è una conferma: messaggio dedicato,
  etichetta «In attesa di invio» nella riga di Spese finché il server non risponde; una conferma tardiva non tocca la spesa successiva
  (ID controllato), un rifiuto del server finisce nelle copie di recupero già esistenti. Il motore resta la coda dell'SDK; modifiche,
  eliminazioni e transazioni restano solo online (livello 2 non fatto: un'eliminazione offline non può verificare la versione vista).
- **Pagina offline.** La schermata «Sei offline» vista sul telefono era quella di Chrome per le app installate. `sw.js` ora risponde alle
  sole navigazioni fallite con `offline.html` (rete sempre per prima, cache solo della pagina e del font latino), con i colori del tema scelto
  (campo `ink` di `nummo.boot-theme.v1`, facoltativo) e la lingua scelta; il worker si registra per tutti all'avvio, allo stesso indirizzo usato
  dalle notifiche. Non è un avvio offline: l'app e i dati non sono in cache.
- **Passaggio dei dati.** In Standard Firebase non si avvia mai, quindi entrambe le direzioni stanno in Avanzata (`ModeTransfer`), come gesti
  espliciti con anteprima e **solo unione**: l'altro archivio diventa un backup in memoria (`archiveAsImport`, stesso formato e lettore) e le
  categorie con lo stesso nome si allineano a quella già salvata (`alignCategoriesByName`), perché entrambe le modalità creano le cinque
  predefinite con ID diversi e l'unione da file le considera conflitti. La regola vale solo per il passaggio, non per i file. Google Drive è
  nominato solo come consiglio su dove tenere il backup, senza integrazione.

## Backup proposto, non automatico, prima di eliminare — 22 novembre 2026

- Su richiesta dell'utente («chiedere se si vuole fare il backup attuale in json, non farlo in automatico»): «Elimina tutte le spese» e
  «Sostituisci tutti i dati» non scaricano più da soli una copia (`nummo-backup-prima-di-eliminare.json`, `nummo-backup-prima-del-ripristino.json`).
  Il dialogo di conferma chiede «Vuoi prima scaricare un backup dei dati attuali?» con «Scarica backup (JSON)»: lo stesso backup completo di
  Archiviazione e backup (`nummo-backup.json`), che conta come backup per il promemoria. La scelta è dell'utente: eliminare senza backup è
  possibile. Le note precedenti su una «copia automatica» prima della sostituzione sono superate.

## Piani dei fondi fino a 120 voci — 22 novembre 2026

- Su richiesta: `fundPolicy.maxChanges` 24 → **120** (dieci anni di cambi mensili) per ricariche, budget ricorrenti, eccezioni e budget
  generale (stessa `parseBudgets`, dati ancora nel backup). Rules (le due copie): quattro regex `{0,23}` → `{0,119}`, lunghezze esatte
  2519 per le ricariche (120 × «YYYY-MM:9999999:31:a» + 119) e 1919 per budget, eccezioni e budget generale (120 × «YYYY-MM:9999999» +
  119; prima 600 e 400 con margine). Margine RE2 sulle ripetizioni annidate rispettato (1000/119 = 8 ≥ 7). Nessun cambio di formato né di
  `backupVersion`; un fondo oltre 24 voci è non valido per un client non aggiornato finché non ricarica, e per un Firebase personale con le
  Rules vecchie.

## Revisione dei limiti degli abbonamenti — 22 novembre 2026

- Su richiesta (audit dei limiti per un uso pluriennale): `maxCalendarChanges` 4 → **100**, `maxSkippedPayments` 60 → **1000**,
  `maxOccurrences` 1000 → **5000** (numeri di occorrenza 0–4999), `maxStatusChanges` **1000** (vedi sotto); `maxPriceChanges` resta **8**
  (le Rules controllano la lista di schema 1 voce per voce e 10 superano già il budget di 1000 espressioni: aumentarlo richiede prima
  un'altra rappresentazione). «Prezzo promozionale dopo n rinnovi» resta 1–999 (`maxPromoAfter` separato da `maxOccurrences`).
- **Regex delle Rules e RE2.** RE2 (C++ e il port Go) rifiuta le ripetizioni contate annidate il cui prodotto supera 1000
  (`(;[0-9]{4}…){0,999}`: 999 × 4). L'emulatore usa RE2J e le accetta, quindi una prova in emulatore non basta. Dove il numero di voci
  supera questo margine la regex controlla solo la forma (`(;voce)*`) e il numero lo conta `split(sep).size()` (stati: `;`, ≤ 1000;
  pagamenti eliminati: `,`, ≤ 1000), con `size()` come tetto del documento: conteggio esatto, valido con ogni motore. I cambi di
  frequenza restano con `{0,99}` (1000/99 = 10 ≥ 4, il ramo più profondo). Tutte le Rules esistenti con ripetizioni contate rispettano
  il margine (fondi `{0,23}` con `{1,7}`: 43/7 ≥ 1).
- **Indici a 4 cifre.** Prezzi (lista `index <= 4999`, forma compatta `([1-9][0-9]{0,2}|[1-4][0-9]{3})`, 151 caratteri), cambi di frequenza
  (stessa alternativa, 1799 caratteri per 100 voci) e pagamenti eliminati (`([0-9]{1,3}|[1-4][0-9]{3})`, 4999 caratteri per 1000; prima le
  Rules ammettevano fino a 9999 mentre il client si fermava a 999). Caso peggiore in emulatore con tutti i massimi insieme: circa 29 KB.
- **Prestazioni.** Le occorrenze si calcolano solo fino al giorno chiesto (oggi o la fine del periodo previsto), mai tutte. Con 1000 stati
  e 1000 pagamenti eliminati il controllo per occorrenza era quadratico (`statusAt` e `includes`: circa 52 ms per serie nel 2099); ora
  un `Set` e un cursore sulle date crescenti (`paidChecker`, stesso risultato del calcolo semplice, verificato da un test): circa 16 ms.
- **Compatibilità.** Nessun cambio di formato né di `backupVersion` (v11, come per i 40 stati): i dati esistenti restano validi. Un client
  non aggiornato (scheda aperta, altro dispositivo) vede come non valida una serie oltre i vecchi limiti finché non ricarica; un Firebase
  personale con le Rules vecchie rifiuta quelle scritture finché non le ricopia. Pubblicazione: Rules prima di Hosting.
- **Limiti generali analizzati e non cambiati** (scelta richiesta: nessuna modifica senza verifica): importo massimo, saldi e movimenti,
  ricariche e budget (99.999,99 €, Rules `[0-9]{1,7}`: coerenti), 24 voci di piano per fondo (si aggiunge una voce per mese in cui il
  piano cambia: sono 2 anni di cambi mensili o 24 di annuali; alzabile fino a circa 140 senza superare il margine RE2; **portate a 120**
  subito dopo, vedi sotto), 100 prodotti per
  lista (le Rules non possono contare i documenti; alla registrazione `list_items` ≤ 6100 caratteri), 100 template, lunghezze dei testi
  (identiche tra client e Rules).

## Cambi di stato degli abbonamenti fino a 40 — 22 novembre 2026

- **Poi 1000, lo stesso giorno** (su richiesta, dopo la domanda «non sarebbe più comodo non avere queste limitazioni?»): `maxStatusChanges`
  **1000** (circa 500 cicli pausa/riattiva), Rules `size() <= 20999` (1000 × «YYYY-MM-DD:cancelled» + 999 separatori), forma con
  `(;voce)*` e numero con `split(';').size() <= 1000` (vedi sotto, «Revisione dei limiti»: la prima stesura con `{0,999}` è stata
  corretta prima di pubblicarla).
  Un limite resta (non «nessun limite»): le Rules e il decoder del client devono dare un confine preciso ai dati non fidati e al documento
  (al massimo circa 21 KB per il campo, contro 1 MiB per documento). Il conteggio non dipende dalla lunghezza: 1001 voci brevi
  («active») stanno sotto i 20999 caratteri e sono rifiutate lo stesso. Caso peggiore rimisurato in emulatore (8 prezzi, 1000 stati di lunghezza massima, prova,
  4 cambi di frequenza, 60 pagamenti eliminati, fondo, esercente): accettato. Gli altri limiti degli abbonamenti sono invariati. Le note
  sotto su «40» descrivono il limite di allora.

- Su richiesta (un abbonamento reale bloccato da «Troppe variazioni di stato…»): `maxStatusChanges` da 8 a **40** (circa 20 cicli
  pausa/riattiva). Il limite di 8 veniva dai controlli per posizione delle Rules; da quando `status_changes` è una stringa compatta
  validata da una sola regex il numero di voci non pesa sul budget di espressioni: Rules `size() <= 839` (40 × «YYYY-MM-DD:cancelled»
  + 39 separatori) e `{0,39}`. Caso peggiore rimisurato in emulatore (8 prezzi, 40 stati di lunghezza massima, prova, 4 cambi di frequenza,
  60 pagamenti eliminati, fondo, esercente): accettato. Le note precedenti su «8 stati» descrivono il limite di allora.
- Scartati: togliere i cambi più vecchi (decidono quali pagamenti passati contano), trasformare le pause in `skipped_payments` (perde la
  pausa, limite 60). Backup invariato (v11): un client precedente rifiuterebbe una serie con più di 8 cambi, come ogni dato più recente.
- Messaggio separato quando la data scelta precede l'ultimo cambio (`statusChangeProblem`), prima mostrato come «troppe variazioni».
- Rules da pubblicare con autorizzazione; chi usa il proprio Firebase deve ricopiarle.
