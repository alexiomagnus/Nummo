# Architettura e decisioni

Aggiornamento: 2 novembre 2026. Specifica di riferimento: `recap.md` v0.4,
letta integralmente e mantenuta invariata.

## Requisiti e conferme

| Aspetto | Stato |
| --- | --- |
| Web app installabile, React Native, Google obbligatorio, Sheets, Material You | Requisiti della specifica |
| TypeScript + Expo + React Native Web + React Native Paper | Confermati dall'utente in questa sessione |
| Uso personale, registro predisposto condiviso con identità di servizio | Confermato dall'utente |
| Firebase Authentication + Cloud Functions | Confermati come direzione del backend; servizi non configurati |
| EUR, 2 decimali, Europe/Rome, massimo 99.999,99 € | Confermati dall'utente |
| Nota rimossa; «nome dell'acquisto» dopo l'importo | Richiesta utente; obbligatorietà e limite 100 scelti dall'agente |
| Categoria facoltativa; icona pixel art facoltativa per categoria | Richiesta utente (prima emoji, sostituite) |
| Date dal 2000-01-01 a oggi; nessuna data futura | Confermato dall'utente |
| Categorie dell’utente rinominabili ed eliminabili; predefinite con icona: Spesa, Ristorazione, Uscita, Shopping | Richiesta utente 2/11/2026; nessuna migrazione dei browser con le predefinite precedenti |
| Nome applicazione: Nummo (prima Nummus) | Richiesta utente; il foglio resta «Registro spese» |
| Ricorrenza come attributo della spesa nella home (settimanale/mensile/annuale) | Richiesta utente; sostituisce la sezione «Ricorrenti» separata |
| Salvataggio locale delle spese, elenco ricercabile/ordinabile, dashboard con 3 grafici | Richiesta utente; anticipa funzioni post-MVP. Archivio locale scelto dall'agente |
| Data spesa sempre automatica, nessuna modifica dalla UI | Richiesta utente (rimossa «Modifica data») |
| Firebase Hosting, budget, deployment e palette | Non confermati |
| Protocollo di scrittura: ledger Firestore che assegna a ogni `expense_id` una riga fissa del foglio; conferma solo dopo la scrittura verificata | Confermato dall'utente 2/11/2026 (alternative scartate sotto) |
| Verifica locale con Firebase Emulator Suite (progetto `demo-nummo`), Sheets sostituito negli emulatori | Confermato dall'utente 2/11/2026 |
| Regione `europe-west1`, `maxInstances: 2`, persistenza sessione `browserLocalPersistence` | Scelte dell'agente, da confermare prima del deployment |
| Recupero di un invio dopo chiusura/ricaricamento della pagina | Da progettare (proposta sotto, non implementata) |
| Progetto Firebase reale `nummo-6b6e2` solo per Authentication; Functions e Firestore locali, nessun deployment | Richiesta utente 2/11/2026 |
| Verifica esplicita dell'ID token nel backend, anche negli emulatori | Richiesta utente 2/11/2026 |

## Archivio locale temporaneo

`localStorage` conserva categorie (`nummo.categories.v1`, con lettura di ripiego della
chiave `nummus.categories.v1` del nome precedente) e spese (`nummo.expenses.v1`), mai
credenziali. Ogni adapter in `src/services/` valida tutto ciò che legge, rilegge prima
di scrivere e non sovrascrive un archivio illeggibile; storage negato o corrotto non
produce conferme. La chiave `nummo.recurring.v1` della sezione Ricorrenti rimossa non è
più letta né cancellata (quegli elementi non avevano data di inizio).

Le spese salvate localmente esistono perché elenco e dashboard richiedono dati prima
del backend. Non sono una conferma su Sheets e l'interfaccia lo dichiara. Restano per
browser, senza sincronizzazione, e `localStorage` non è atomico tra schede. Al
collegamento con il backend: migrazione **esplicita** dei dati del browser, mai
associazione automatica a chi accede; il record locale (`id` UUID, `created_at`) è già
compatibile con `expense_id` e con il payload previsto.

Categorie: ID UUID stabili, nomi normalizzati per spazi e Unicode, unici senza distinzione
maiuscole/minuscole, max 40 caratteri. La rinomina conserva ID e icona (le spese puntano
all'ID). Le predefinite sono scritte solo se nessuna chiave esiste: eliminarle tutte non le
ripristina, e un browser con predefinite precedenti non viene modificato. Eliminare una categoria non modifica le spese:
quelle che la citavano appaiono senza categoria; se era selezionata nel modulo viene
deselezionata, ma un `category_id` indicato e inesistente è rifiutato dalla validazione.
Le icone sono ID di sprite pixel art propri: in lettura un ID sconosciuto diventa `null`,
in scrittura è rifiutato. Campi assenti in dati più vecchi valgono `null`. Gli sprite sono
disegnati in una tela 14×14 (1 px di margine); nel tema scuro quel margine ospita un alone
chiaro attorno ai pixel pieni, così il contorno scuro resta leggibile senza ricolorare lo sprite.

Nome dell'acquisto (`description`): obbligatorio, normalizzato, max 100 caratteri, scritto
come testo. I limiti 40/100 sono scelte implementative, non vincoli concordati.

La data non è visibile né modificabile: viene risolta come «oggi in Europe/Rome» al
salvataggio. Il dominio accetta ancora date esplicite (2000-01-01…oggi).

### Ricorrenze

Una spesa con `recurrence` è una serie che inizia a `expense_date`. Le occorrenze non
vengono salvate ma calcolate (`src/domain/recurrence.ts`, `history.ts`) fino a oggi:
settimanale ogni 7 giorni, mensile e annuale allo stesso giorno, ridotto all'ultimo
giorno dei mesi più corti (31 → 30/28, 29 febbraio → 28). Le scadenze future non sono
spese. Eliminare una spesa ricorrente elimina la serie, incluse le occorrenze passate;
interruzione e modifica non esistono ancora. Con il backend andrà deciso se le
occorrenze diventano righe reali nel foglio (richiede un processo pianificato e
idempotenza per occorrenza) o restano calcolate.

### Dashboard e grafici

Funzioni pure in `src/domain/history.ts` (occorrenze, ricerca senza accenti, ordinamenti,
periodi, aggregazione); disegno in `src/features/dashboard/charts.tsx` con SVG inline
(app solo web; un'app nativa richiederebbe `react-native-svg`). Specifiche dalla skill
dataviz: palette categoriale di riferimento in ordine fisso (validata con il suo script
su superfici `#F7F2F9` chiara e `#1F2421` scura: chiaro con 4 colori < 3:1, quindi
legenda e tabella obbligatorie), colore legato alla posizione della categoria
nell'elenco e non alla classifica, 7 categorie con nome + «Altre categorie», «Senza
categoria» in grigio neutro; linee 2 px, area al 10%, barre ≤ 24 px con angoli
superiori di 4 px e 2 px di stacco, griglia sottile; dettaglio a hover/tocco.

### Archivio definitivo delle categorie — raccomandazione, non decisa

Proposta: scheda «Categorie» nello stesso file «Registro spese» (colonne `category_id`,
`label`, `icon`, `archived_at`), letta e scritta solo dalle Cloud Functions con
l'identità di servizio. Motivi: la specifica vuole Sheets come archivio senza database
principale aggiuntivo; uso personale con un solo registro; categorie visibili e
salvabili col backup del foglio. Le spese salvano `category_id`; eliminare una
categoria la **archivia** (nascosta nella UI) invece di cancellarla, così le righe
storiche restano interpretabili. Alternativa: Firestore per UID, da preferire se la
prova tecnica introduce comunque un archivio tecnico per l'idempotenza (transazioni,
cache offline, nessun limite di quota Sheets). `localStorage` resterebbe solo come cache.

## Frontend

Expo SDK 58 e versioni React/React Native allineate al template ufficiale, con Paper 5.
Il lockfile fissa l'albero installato. Stato React locale, senza router né store
globale; quattro sezioni (Nuova, Spese, Dashboard, Categorie). Il modulo resta montato
per non perdere la bozza al cambio sezione.

`src/domain` contiene funzioni pure indipendenti da Expo e Firebase, compilate anche
nel backend (`functions/tsconfig.json` include `../src/domain`). `contract.ts` valida a
runtime ciò che attraversa un confine: richieste al backend (campi esatti, UUID, date),
conferme, elenchi e record letti da `localStorage`. I tipi TypeScript non bastano.

Il reducer degli invii (`submission.ts`) governa entrambi gli archivi (`ExpenseStore`):
locale (sincrono, conferma immediata) e backend. Il modulo si svuota solo dopo una
conferma; con esito incerto i campi restano bloccati e «Riprova» rinvia la stessa
richiesta. La modalità si sceglie in fase di build con `EXPO_PUBLIC_NUMMO_BACKEND`
(`emulator` | `firebase`; assente = solo browser).

## Backend (prova tecnica, verificato solo negli emulatori)

```text
Web app ── Firebase Auth (Google, browserLocalPersistence)
   │ callable HTTPS con token Firebase (SDK)
   ▼
Cloud Functions europe-west1 (functions/)
   │ 1. autorizzazione: solo ALLOWED_UID con accesso google.com
   │ 2. validazione runtime (src/domain/contract.ts, condiviso)
   │ 3. transazione Firestore: operations/{expense_id} + contatore riga
   │ 4. scrittura RAW sulla riga riservata, verificata dalla risposta
   ▼
Google Sheets «Registro spese», scheda SHEET_TAB (default «Spese»)
```

**API** (callable, regione `europe-west1`):
- `submitExpense(ExpenseRequest) → { expense_id, created_at }`. Richiesta con
  esattamente i campi `expense_id` (UUID), `amount_minor`, `currency`, `description`,
  `category_id` (UUID o `null`), `expense_date` (≤ oggi a Roma), `recurrence`,
  `source`, `schema_version`; campi in più o mancanti = rifiuto. `created_at` (UTC)
  è assegnato dal backend alla prima prenotazione e restituito identico ai tentativi.
- `listExpenses() → { expenses, invalid_rows }`: tutte le righe del foglio; righe
  vuote (prenotate ma mai scritte) ignorate, righe illeggibili o ID duplicati contati
  in `invalid_rows` e segnalati nell'interfaccia, mai nascosti in silenzio.

**Errori**: `unauthenticated`, `permission-denied`, `invalid-argument` (validazione)
e `already-exists` (stesso ID con dati diversi o di un altro account) sono rifiuti
definitivi, decisi prima di ogni scrittura: il client sblocca il modulo e un nuovo
invio usa un nuovo ID. Ogni altro errore diventa `unavailable` (log con solo nome e
messaggio dell'errore, mai payload o token) ed è trattato come **esito incerto**:
il client ritenta con lo stesso ID e gli stessi dati. Una conferma vale solo se
contiene lo stesso `expense_id` e un timestamp UTC valido.

**Idempotenza**: la transazione Firestore crea `operations/{expense_id}` con UID,
hash SHA-256 del payload canonico, riga assegnata (`ledger/sheet.next_row`, da 2) e
`written`. Doppio tocco, richieste concorrenti, risposta persa e crash dopo la
scrittura riscrivono la **stessa riga** con gli stessi valori (mai append); se la
riga contiene già esattamente quei valori non viene riscritta. Se la riga riservata
contiene un altro ID (righe inserite o riordinate a mano) la funzione non sovrascrive
e fallisce: la scheda va protetta da modifiche manuali. Le regole Firestore negano
ogni accesso dai client (`firestore.rules`); scrive solo l'Admin SDK.

**Modello della scheda** (`functions/src/sheetRow.ts`, colonne A–J): `expense_id`,
`expense_date`, `amount_minor`, `currency`, `description`, `category_id`,
`recurrence`, `created_at`, `source`, `schema_version`. Scrittura con
`valueInputOption: RAW` (un nome «=…» resta testo) e lettura `UNFORMATTED_VALUE`.
Differenze da `recap.md` §5: `note` → `description` (obbligatoria), aggiunta
`recurrence`; `legacy_ref` rimandato alla migrazione dal Form.

**Accesso a Sheets**: Application Default Credentials dell'account di servizio della
funzione (`google-auth-library`), nessuna chiave nel codice; il foglio va condiviso
solo con quell'account. `SHEET_ID` e `ALLOWED_UID` sono parametri lato server: il
client non indica né foglio né proprietario.

**Verifica dei token**: ogni callable verifica l'ID token con `getAuth().verifyIdToken`
(firma, scadenza, emittente e destinatario del progetto) prima dell'autorizzazione,
perché l'emulatore delle Functions si limita a decodificarlo (`skipTokenVerification`).
In produzione è un secondo controllo, con chiavi pubbliche in cache. Con l'emulatore
Auth attivo l'Admin SDK accetta i suoi token non firmati; nella modalità «Auth reale»
l'emulatore Auth non è avviato, quindi solo token emessi da Google passano. Non è
controllata la revoca (`checkRevoked` richiede credenziali): un token resta valido fino
alla scadenza (1 ora) anche dopo il logout.

**Configurazione del client**: `EXPO_PUBLIC_*` sono inserite nel bundle in build, quindi
solo valori pubblici. Le modalità non si mescolano: `emulator` usa una configurazione
demo fissa e ignora `EXPO_PUBLIC_FIREBASE_*`; `firebase` le richiede tutte e, se ne manca
una, mostra un avviso invece di avviare Firebase. `EXPO_PUBLIC_FUNCTIONS_EMULATOR`
collega solo le Functions all'emulatore, mai l'Auth.

**Emulatori**: `SHEET_ID=emulator` sostituisce Sheets con la collezione Firestore
`emulator_sheet_rows`; il codice lo rifiuta fuori dagli emulatori. Il progetto
`demo-nummo` non richiede credenziali; gli account di prova sono in
`emulator-seed/` (`demo-owner` ammesso, `demo-intruder` no) e i parametri in
`functions/.env.demo-nummo`.

**Alternative valutate e non adottate**: Firestore come archivio principale con copia
asincrona in Sheets (più semplice e atomica, ma cambierebbe due requisiti: Sheets
archivio principale e conferma dopo la scrittura nel foglio); solo Sheets con ricerca
e append (nessuna garanzia contro richieste concorrenti).

**Limiti noti**: una riga prenotata e mai scritta (invio abbandonato) resta vuota;
riordinare o inserire righe a mano rompe l'associazione riga↔ID (rilevato, non
corretto); `listExpenses` legge tutto il foglio a ogni apertura; le categorie restano
nel browser (il foglio contiene solo `category_id`). Deployment, fatturazione e un
foglio reale non sono mai stati usati: l'adapter Google Sheets è testato solo con
`fetch` simulato.

### Recupero dopo chiusura o ricaricamento — proposta non implementata

Oggi un esito incerto vive solo nella pagina: ricaricando si perde la richiesta
(il ledger evita duplicati, ma l'utente non sa se la spesa è salvata finché non
consulta l'elenco). Proposta: prima della prima chiamata salvare localmente
un'operazione pendente minima, associata all'UID, con ID e payload immutabile; se la
persistenza fallisce, non inviare. Al ripristino della sessione riconciliare solo le
operazioni dello stesso utente (nuovo invio con stesso ID: il ledger restituisce la
conferma), mantenendo i campi bloccati fino a un esito certo. Non salvare copie dei
token. Precisare conservazione, logout, storage negato e richieste da più schede.

## Dipendenze e sicurezza

App web: `firebase` (solo `app`, `auth`, `functions`; ~350 KB in più nel bundle,
caricati anche in modalità solo browser). Strumenti: `firebase-tools` (dev) per gli
emulatori, richiede Java. Backend (`functions/`, pacchetto separato con lockfile):
`firebase-functions`, `firebase-admin`, `google-auth-library`. Niente segreti né
`.env` reali: la configurazione web di Firebase è pubblica, i parametri reali vanno
in un `.env.<progetto>` non versionato o impostati al deployment. Firebase Hosting e
il deployment (piano Blaze) richiedono autorizzazione; nessuna attivazione eseguita.

`npm audit` (2/11/2026): radice 29 (25 moderate, 4 alte). Le alte vengono da
`@grpc/grpc-js` tramite `@firebase/firestore`, non importato dall'app (non finisce nel
bundle web); la «correzione» proposta retrocede `firebase` alla 9.14. Le moderate
sono nella catena Expo e `firebase-tools` (`glob`, `minimatch`, `@opentelemetry`).
`functions/`: 6 moderate (`glob`/`minimatch`/`rimraf` tramite `google-gax`), con
`npm audit fix` non forzato disponibile ma non applicato senza verifica.
Non applicare `npm audit fix --force` (retrocede Expo). Questa analisi non equivale
a un audit di sicurezza completo.

## Fonti tecniche consultate

- [Expo: creazione progetto](https://docs.expo.dev/get-started/create-a-project/)
- [Expo per il web](https://docs.expo.dev/workflow/web/)
- [Configurazione PWA](https://docs.expo.dev/guides/progressive-web-apps/)
- [React Native Paper](https://oss.callstack.com/react-native-paper/)

Versioni controllate anche sui metadati npm e con `expo install`.
