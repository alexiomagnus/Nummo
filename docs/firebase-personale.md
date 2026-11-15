# Configurare il proprio Firebase

Nummo usa il tuo progetto Firebase. La configurazione web è pubblica: protegge i dati
la combinazione UID + Security Rules, non la segretezza di `apiKey`. Non inserire mai
chiavi di servizio, client secret o credenziali Admin in `.env` del frontend.

## Collegare il tuo Firebase dall'app (senza installare nulla)

Dal sito pubblicato, in modalità Avanzata: «Usa il tuo progetto Firebase» sotto «Accedi con Google», oppure «Collega il tuo
Firebase» nella schermata «Questo Nummo è privato». La pagina elenca i passaggi nella Console Firebase:

1. progetto e app Web;
2. Authentication → Google attivo e, in Impostazioni → Domini autorizzati, l'indirizzo del sito che si sta usando (mostrato
   con «Copia»): senza, l'accesso fallisce con `auth/unauthorized-domain`;
3. Firestore in modalità produzione e Regole di Nummo («Copia le regole» copia `public/firestore.rules`, copia identica a
   `firestore.rules` imposta dai test; «Apri il file» la mostra);
4. il blocco `firebaseConfig` da Impostazioni progetto, incollato nel campo. Si leggono solo `apiKey`, `authDomain`,
   `projectId`, `appId` (validati; le altre chiavi sono ignorate).

La configurazione è salvata **solo in quel browser** (`nummo.firebaseConfig.v1`), mai inviata altrove; la pagina si
ricarica sul nuovo progetto (l'SDK si inizializza una volta per pagina; un account connesso esce prima). Dopo il primo
accesso con Google, finché `config/owner` manca o le Regole non sono pubblicate, compare «Ultimo passaggio»: UID con
«Copia» e istruzioni per creare `config/owner` con il campo stringa `uid`, poi «Controlla di nuovo». L'app non scrive mai
il proprietario: le Regole restano invariate. In «Archiviazione e backup» il progetto appare come «Progetto collegato da
te», con «Scollega progetto» (esce e torna al progetto del sito; i dati restano nel progetto dell'utente).

Vincoli: solo build `cloud` con progetti reali; nella demo locale (`emulator`) solo progetti `demo-`, per le prove (serve
un emulatore senza `singleProjectMode`); non disponibile in `hybrid`. Su un altro browser o dispositivo il collegamento va
ripetuto. Le notifiche push restano indipendenti da Firebase.

## Prova senza servizi cloud

Node conforme a `package.json`, npm e Java 21 consigliati per la CLI corrente:

```sh
npm ci
npm run emulators           # terminale 1: Auth 9099, Firestore 8180, UI 4000
npm run emulators:seed      # terminale 2, dopo l’avvio: autorizza demo-owner
npm run dev:demo                # modalità emulator (demo)
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
3. Variabili (da `.env.example`, **solo se i file non esistono già**): le quattro
   `EXPO_PUBLIC_FIREBASE_API_KEY`, `AUTH_DOMAIN`, `PROJECT_ID`, `APP_ID`.
   - Sviluppo: in `.env.local`. Usate solo da `dev`.
   - Produzione: in `.env.production.local` (ignorato da Git) oppure variabili di shell/CI. `build:cloud`
     **non legge** `.env.local`, imposta da sé la modalità `cloud` e si ferma se la stessa variabile ha valori
     diversi nel file e nella shell. Expo in sviluppo non carica mai `.env.production.local`.
   - Nessun file deve contenere `EXPO_PUBLIC_NUMMO_BACKEND` o endpoint `*_EMULATOR`: scelgono l'ambiente
     i comandi npm, e `npm run dev*` si ferma se li trova.
   Dopo ogni cambio di progetto va rieseguita la build/riavviato Expo.
4. Accedi con Google per creare l'utente Authentication. Anche con regole deny-all il
   login può riuscire: i dati resteranno negati. Copia l'UID esatto da Authentication
   → Utenti (non email, non Google subject ID).
5. Nella Console Firestore crea `config/owner`, unico campo stringa `uid` con quell'UID.
   È un'operazione amministrativa; l'app non può nominare il proprietario. Trasferire
   qui l'eventuale vecchio `ALLOWED_UID`, senza affidarsi a una variabile del client.
6. Revisiona e pubblica manualmente **solo** `firestore.rules` nel tuo progetto.
   Le regole incluse
   negano estranei, accessi incrociati e autopromozione e validano i dati.
7. Costruisci con `npm run build:cloud` (si interrompe con configurazione mista, mancante o
   endpoint emulatore nel bundle), prova in locale con `npm run preview:cloud` (usa il progetto
   reale, `localhost` deve essere tra i domini autorizzati). Mai pubblicare `dist-demo/` (build demo di `check`).
   Hosting: vedi «Pubblicazione su Firebase Hosting» sotto.
   Verifica nel tuo ambiente login/logout, secondo account rifiutato, una spesa
   confermata, reload e lettura su una seconda sessione prima di migrare lo storico.

Il repository non contiene `.firebaserc`: nessun progetto Firebase è preimpostato e la CLI
richiede sempre `--project ID_PROGETTO` esplicito (`deploy:hosting` lo ricava dalle variabili
della build). Un `.firebaserc` locale è ignorato da Git.

Un wizard interno che chiedesse solo `firebaseConfig` non completerebbe i passaggi
2, 4, 5 e 6. Per questo la prima versione BYOF usa configurazione a build e questa
guida; nessuna credenziale amministrativa è richiesta dal client.

## Mantenere il login reale con Firestore locale

Il progetto personale esistente e `.env.local` (le 4 variabili `EXPO_PUBLIC_FIREBASE_*`)
restano validi. Per avviare tutto lo sviluppo hybrid:

```sh
npm run dev
```

Il runner legge la configurazione sviluppo con il parser incluso in Expo, impone
Auth reale/Firestore locale e usa lo stesso ID progetto per entrambi. Se Firestore
è spento, lo avvia con `firebase.json` e importa `emulator-data/`. Se è acceso, verifica
il locator Hub del progetto, il PID, l'endpoint registrato e una risposta REST di
Firestore prima di riutilizzarlo. Una porta occupata da un servizio sconosciuto o
da un altro progetto blocca l'avvio senza toccare quel processo. Expo parte solo dopo
la readiness (timeout complessivo 90 s). Non servono alias `.firebaserc` o login CLI.

Al primo uso configura una volta `config/owner` **nel solo emulatore**, da un secondo
terminale: `npm run emulators:seed:owner -- ID_PROGETTO UID_PROPRIETARIO`.
Il proprietario cloud non viene copiato e il runner non sceglie un UID. Con l'override
di porta imposta anche `FIRESTORE_PORT` per il seed. `config/owner` persiste insieme ai dati.

**Arresto e dati:** Ctrl+C una volta e attendere il messaggio «dati salvati».
Il runner ferma solo i propri figli, lascia intatti gli emulatori preesistenti e
ne delega l'export al loro gestore. Per il proprio Firestore esporta in staging
`.firebase/hybrid-*/export`, poi aggiorna `emulator-data/` solo dopo conferma di successo;
il precedente archivio resta in `.firebase/hybrid-*/previous`. Queste cartelle sono
ignorate da Git e contengono dati personali. Nessuna pulizia automatica dei backup.
Se l'export fallisce, l'archivio precedente resta intatto e il lock
`.firebase/hybrid.lock` impedisce un nuovo avvio gestito: controllare staging/log e
recuperare il backup appropriato prima di rimuovere il lock. Lo stesso controllo serve
dopo un arresto forzato. Un archivio non vuoto ma invalido non viene reinizializzato.

L'override `EXPO_PUBLIC_FIRESTORE_EMULATOR` deve essere `localhost:porta` o
`127.0.0.1:porta`, solo nella shell; le altre porte restano quelle di `firebase.json`.
`npm run check:hybrid` rimane un controllo TCP manuale (1,5 s), non certifica progetto,
proprietario o Rules. `npm run emulators:personal -- --project ID_PROGETTO` e
`emulators:real` restano disponibili per gestire il database separatamente.
Non avviare Auth Emulator in hybrid; non esporre porte in rete. Se Firestore cade
dopo l'avvio, l'avviso UI dopo 10 s resta informativo, senza reinviare le spese.

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

Da «Archiviazione e backup» (menu account) ci sono due cose distinte:

- **Esporta transazioni (CSV)**: tabella per consultare e analizzare le spese, una riga per ogni occorrenza fino a oggi
  (un abbonamento compare una volta per rinnovo, al prezzo di quel rinnovo). Colonne: Data, Descrizione, Categoria,
  Importo, Valuta, Ricorrenza. UTF-8 con BOM, separatore `;` e virgola decimale (formato italiano); se il foglio è in
  un'altra lingua, importa il file scegliendo `;` come separatore. I testi che iniziano con `=`, `+`, `-`, `@` hanno un
  apostrofo iniziale contro le formule. Non è un backup e **non si può importare**.
- **Scarica backup (JSON)**: tutte le spese, categorie e ricorrenze con gli ID e i prezzi programmati, senza UID,
  progetto o altri dati dell'account. Il file ha formato e versione (`nummo-backup`, `version`). È l'unico formato di ripristino.

**Importa backup (JSON)** legge file fino a 5 MB, valida ogni elemento (un solo errore rifiuta l'intero file), confronta
il contenuto con i dati salvati sul server e mostra un riepilogo: elementi nel backup, da aggiungere, già presenti e
identici, conflitti. «Unisci ai dati esistenti» aggiunge soltanto ciò che manca; un conflitto (stesso ID o stesso nome
categoria con contenuto diverso) blocca l'unione prima di qualsiasi scrittura.
«Sostituisci tutti i dati» rende l'archivio uguale al file: elimina solo ciò che differisce, aggiunge il resto e prima
scarica da solo una copia JSON dei dati attuali. Ogni operazione è ripetibile con lo stesso file; non è atomica
sull'intero archivio (i gruppi sono confermati uno alla volta), quindi in caso di errore ripeti il ripristino.
Durante il backup evita modifiche da altre sessioni. Conserva i backup fuori dalla cartella del sito. I CSV
esportati da versioni precedenti non sono più importabili: usa un backup JSON. Procedura completa e vecchio emulatore in
[migrazione-byof.md](migrazione-byof.md).

## Pubblicazione su Firebase Hosting

`firebase.json` contiene la sezione `hosting` (cartella `dist/`); `npm run deploy:hosting` ricostruisce con
`build:cloud` e pubblica **solo Hosting** sul progetto delle variabili `EXPO_PUBLIC_FIREBASE_PROJECT_ID`.
Rules e Firestore si pubblicano a parte e solo a mano (`firebase deploy --only firestore:rules --project ID`).
Non usare `firebase deploy` senza `--only`: includerebbe anche le Rules.

Prima pubblicazione (manuale, richiede autorizzazione):

1. Prerequisiti già descritti sopra: Google attivo, `config/owner` creato, Rules pubblicate, `.env.production.local` con le
   4 variabili. Console → Hosting → «Inizia» se il sito non esiste (nessuna fatturazione richiesta dal piano base).
2. `npx firebase login` (una volta, su questa macchina).
3. `npm run deploy:hosting -- --dry-run`: build e verifiche, stampa progetto e comando, non pubblica. Controlla che il
   progetto sia quello atteso.
4. `npm run deploy:hosting -- --channel anteprima`: pubblica su un URL temporaneo `...--anteprima-xxxx.web.app` (scade in 7
   giorni, il sito live resta vuoto/invariato). Provalo da PC e da Android (login, secondo account rifiutato, nuova spesa,
   ricarica). I domini `*.web.app` e `*.firebaseapp.com` del progetto sono autorizzati di default; per gli URL dei canali di
   anteprima e per un dominio personalizzato verifica Authentication → Impostazioni → Domini autorizzati.
5. Solo dopo l'esito positivo: `npm run deploy:hosting` per il sito live (`https://ID.web.app`).
6. Su Android (Chrome): menu ⋮ → «Installa app» / «Aggiungi a schermata Home» e riprova il login dall'app installata.

Sviluppo e pubblicazione restano separati: `npm run dev:demo`/`dev` non usano `dist/` né Hosting. L'emulatore Hosting non
è parte del flusso; per provare localmente la build di produzione usa `npm run preview:cloud`.

Login Google sui browser mobili: l'app usa il popup (`signInWithPopup`) avviato direttamente dal tocco, quindi i blocchi popup
sono evitati; se il browser lo blocca compare un messaggio. Possibili limiti non verificati su dispositivo: browser integrati
in altre app (Google rifiuta il login in alcune WebView), Safari iOS con prevenzione del tracciamento e app installata iOS.
Il sito non invia `Cross-Origin-Opener-Policy` (renderebbe inaffidabile il popup): non aggiungerlo.
