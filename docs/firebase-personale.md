# Configurare il proprio Firebase

Nummo usa il tuo progetto Firebase. La configurazione web è pubblica: protegge i dati
la combinazione UID + Security Rules, non la segretezza di `apiKey`. Non inserire mai
chiavi di servizio, client secret o credenziali Admin in `.env` del frontend.

## Prova senza servizi cloud

Node conforme a `package.json`, npm e Java 21 consigliati per la CLI corrente:

```sh
npm ci
npm run emulators           # terminale 1: Auth 9099, Firestore 8180, UI 4000
npm run emulators:seed      # terminale 2, dopo l’avvio: autorizza demo-owner
npm run dev                # oppure dev:emulator
```

Seleziona il proprietario demo; l'estraneo deve ricevere accesso negato. Ogni riavvio
senza export/import perde i dati dell'emulatore: esportali prima se servono. Il seed
incluso contiene account dimostrativi, non dati reali. Le porte restano su loopback.
Non avviare due suite sulle stesse porte; istruzioni alternative in AGENTS.md.

## Installazione personale

Questi sono passaggi manuali: nessuna risorsa reale, fatturazione o regola cloud è
stata modificata durante questa migrazione.

1. Scegli/crea il tuo progetto nella Console Firebase. Registra un'app **Web** e
   abilita **Authentication → Google**, con email di supporto e impostazioni OAuth
   richieste dalla Console. Autorizza esplicitamente il dominio dell'app e `localhost`
   per lo sviluppo. `authDomain` deve essere quello del progetto/configurazione OAuth.
2. Crea **Cloud Firestore (default), Standard edition**, scegliendo consapevolmente la
   regione. Parti in modalità production/deny-all, non test mode. Non servono Cloud
   Functions, Google Sheets API, service account scaricati o Blaze per questa
   architettura. Rimangono [quote e limiti Firestore](https://firebase.google.com/docs/firestore/quotas):
   controllali nella Console; nessuna promessa di uso illimitato gratuito.
3. Crea `.env.local` da `.env.example` **solo se non esiste già**. Compila
   `EXPO_PUBLIC_FIREBASE_API_KEY`, `AUTH_DOMAIN`, `PROJECT_ID`, `APP_ID` (ognuno con
   prefisso `EXPO_PUBLIC_FIREBASE_`). Per cloud aggiungi
   `EXPO_PUBLIC_NUMMO_BACKEND=firebase`; lascia assenti gli endpoint emulatori.
   L'app va ricompilata/Expo riavviato dopo ogni cambio di progetto.
4. Accedi con Google per creare l'utente Authentication. Anche con regole deny-all il
   login può riuscire: i dati resteranno negati. Copia l'UID esatto da Authentication
   → Utenti (non email, non Google subject ID).
5. Nella Console Firestore crea `config/owner`, unico campo stringa `uid` con quell'UID.
   È un'operazione amministrativa; l'app non può nominare il proprietario. Trasferire
   qui l'eventuale vecchio `ALLOWED_UID`, senza affidarsi a una variabile del client.
6. Revisiona e pubblica manualmente **solo** `firestore.rules` nel tuo progetto.
   Le regole incluse
   negano estranei, accessi incrociati e autopromozione e validano i dati.
7. Avvia `npm run dev:cloud`, oppure costruisci il web con `npm run build` e ospita
   `dist/` su HTTPS di tua scelta. Non è stato scelto o configurato un hosting.
   Verifica nel tuo ambiente login/logout, secondo account rifiutato, una spesa
   confermata, reload e lettura su una seconda sessione prima di migrare lo storico.

`.firebaserc` mantiene l'alias personale esistente `real` per non rompere il checkout
attuale; non è usato dall'app o dalla demo. Chi clona deve indicare esplicitamente il
proprio `--project ID` alla CLI: non usare quell'alias come progetto condiviso.

Un wizard interno che chiedesse solo `firebaseConfig` non completerebbe i passaggi
2, 4, 5 e 6. Per questo la prima versione BYOF usa configurazione a build e questa
guida; nessuna credenziale amministrativa è richiesta dal client.

## Mantenere il login reale con Firestore locale

Il progetto personale esistente e `.env.local` restano validi. Al posto del vecchio
parametro delle Functions, autorizza lo stesso UID nel **solo emulatore**:

```sh
npx firebase emulators:start --only firestore --project ID_PROGETTO
npm run emulators:seed:owner -- ID_PROGETTO UID_PROPRIETARIO
npm run dev:firebase
```

Nel checkout originale `npm run emulators:real` usa l'alias già esistente. Quello script
importa da `emulator-data/` e vi riesporta all'arresto (Ctrl+C una volta): il
proprietario va impostato una sola volta. La modalità non richiede Functions. Non
avviare l'Auth emulator in questa modalità. Gli emulatori non devono essere esposti
in rete e non dimostrano la verifica crittografica dei token della produzione.

## Offline e dispositivi

Per un dispositivo fidato puoi aggiungere:

```dotenv
EXPO_PUBLIC_FIRESTORE_CACHE=persistent
```

È la cache nativa dell'SDK Firestore, con supporto a più schede. Senza questa opzione
la cache è in memoria: chiudere la pagina può perdere scritture non confermate.
La cache su disco può contenere dati personali anche dopo logout; non abilitarla su
un dispositivo condiviso. Non cancellare dati del sito mentre ci sono scritture
pendenti. Browser privati, storage bloccato e browser non supportati richiedono prova
specifica; la persistenza non è garantita in questi casi.

La versione corrente è web: Chrome desktop collaudato, browser Android/iOS da provare.
L'apertura **a freddo** senza rete non è garantita perché manca un service worker.
App native Expo/RN richiedono un progetto separato di adattamento (login, SVG,
persistenza); non basta attivare questa opzione. Vedi le
[differenze ufficiali degli ambienti SDK](https://firebase.google.com/docs/web/environments-js-sdk).

## Backup e passaggio dai vecchi dati

Spese → Backup JSON per tutte le entità, Esporta CSV per le occorrenze fino a oggi.
Durante il backup evita modifiche da altre sessioni. In Excel/Sheets importa il CSV
come UTF-8, separatore virgola e punto decimale; `amount_minor` resta intero in ogni
locale. I testi sospetti di formula sono protetti da apostrofo.

Importa backup JSON legge file fino a 5 MB, controlla dati e duplicati, richiede conferma del progetto
ed esegue gruppi ripetibili. Non elimina gli originali. Conserva i backup fuori dalla
cartella del sito. Procedura completa e vecchio emulatore in
[migrazione-byof.md](migrazione-byof.md).
