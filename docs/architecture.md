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
al dominio e i decoder rifiutano archivi non conformi. Le predefinite si aggiungono
con un'azione esplicita quando la lista è vuota, mai tramite un effetto di lettura.
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

## Piattaforme

| Ambiente | Stato |
| --- | --- |
| Web Chromium Linux | Collaudo concreto con Auth/Firestore emulati, cache persistente, reload e offline |
| Web Chrome Android, Safari iOS | Obiettivi; dispositivi reali e OAuth mobile da verificare |
| React/Expo web | Build/typecheck verificati; unico target dichiarato in app.json |
| App native Android/iOS | Non implementate: UI SVG DOM e login popup richiedono adattamenti; il Firebase JS SDK in RN non fornisce persistenza Firestore nativa equivalente |
| PWA installabile/apertura a freddo senza rete | Non implementata: manca service worker/manifest completo; cache dati ≠ disponibilità offline del bundle |

La persistenza web supportata e le differenze RN sono documentate da
[Firebase offline](https://firebase.google.com/docs/firestore/manage-data/enable-offline),
[ambienti Firebase JS](https://firebase.google.com/docs/web/environments-js-sdk) e
[Expo Firebase](https://docs.expo.dev/guides/using-firebase/).
Le transazioni richiedono rete: [documentazione Firebase](https://firebase.google.com/docs/firestore/manage-data/transactions).

## Esportazione e migrazione

CSV UTF-8 con BOM, CRLF, separatore virgola e quoting RFC 4180: occorrenze fino a oggi,
ID serie/occorrenza, data ISO, importo decimale con punto e centesimi interi, valuta,
descrizione, ID/nome categoria, ricorrenza e timestamp. Un apostrofo anteposto ai testi
che iniziano con `=`, `+`, `-`, `@` anche dopo spazi/controlli limita l'interpretazione
come formule. Il JSON mantiene i testi originali senza questa trasformazione.

JSON versione 1: origine (progetto/UID), data export, tutte le spese/serie, categorie
e metadati di revisione. Gli indici dei nomi si ricostruiscono durante l'importazione;
configurazione amministrativa e token non sono dati da esportare. Esportazioni dal
server, disabilitate con scritture pendenti o cache non verificata; nessun backup
silenziosamente parziale da cache. Le due collezioni sono lette separatamente:
fermare le modifiche nelle altre sessioni durante un backup, che non è uno snapshot
atomico dell'intero database. Guida alla migrazione e limiti in `migrazione-byof.md`.

## Configurazioni e legacy

- `npm run dev` / `dev:emulator`: demo locale, ignora i valori reali.
- `dev:firebase`: Auth dal progetto personale, Firestore obbligatoriamente su localhost.
- `dev:cloud`: scelta esplicita, usa i parametri dell'ambiente. Richiede che il
  proprietario abbia predisposto Firestore/regole; nessun deploy è stato eseguito.
- Config mancante o endpoint malformato: messaggio bloccante. Una vecchia variabile
  Functions senza il nuovo endpoint Firestore blocca l'avvio per evitare passaggi
  silenziosi al cloud. Nessun ritorno implicito a localStorage.

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
  dashboard o negli export; mostrate nella card «Prossimi rinnovi» della sezione Spese.
- Rules: gli elementi della lista si controllano per posizione (niente cicli) e il limite di
  1000 espressioni per richiesta fissa il massimo a **8 variazioni per serie** (con 10 la
  creazione fallisce). Le Rules vanno ripubblicate dove già distribuite; per le spese
  singole `price_changes` deve essere vuoto.
- Il formato backup resta `version: 1`: il campo è additivo, i backup precedenti si importano
  con `[]`. Il confronto tra record usa `sameFieldValue` (uguaglianza per valore).
- Non implementato: variazioni programmate aggiunte in modifica (si possono solo rimuovere),
  correzione del prezzo di un pagamento già maturato, più di 8 variazioni.
