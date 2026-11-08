# Nummo

Gestionale personale di spese per il web. Registri le spese, le organizzi per categoria,
gestisci abbonamenti e ricorrenze e guardi l'andamento in una dashboard.

## Il modello BYOF (Bring Your Own Firebase)

Nummo **non è un servizio**: non esiste un server centrale né un database condiviso.
Ogni installazione usa il **tuo** progetto Firebase (Authentication Google + Cloud Firestore)
e, se vuoi, il tuo Firebase Hosting. I dati restano nel tuo database; solo l'account Google
il cui UID è scritto in `config/owner` può leggerli e scriverli. Costi, quote, backup e
sicurezza del progetto sono una tua responsabilità (vedi [Sicurezza](#sicurezza-e-responsabilità)).

## Funzionalità

- **Nuova spesa** con importo, data, descrizione e categoria; **Spese** con ricerca, filtri, modifica ed eliminazione.
- **Ricorrenze** settimanali, mensili e annuali, con prezzo promozionale per i primi rinnovi e riepilogo dei prossimi rinnovi.
- **Categorie** personalizzabili, con icone, e **Dashboard** con totali e grafici.
- **Dati**: esportazione delle transazioni in CSV (per Excel/LibreOffice) e backup completo in JSON, l'unico formato importabile per il ripristino.
- Tema chiaro/scuro e colori personalizzabili; layout per smartphone, tablet e desktop.
- Interfaccia in italiano e inglese: **Impostazioni → Lingua / Settings → Language**,
  dal menu account o dall'ingranaggio prima dell'accesso. Scelta immediata, salvata
  nel browser; italiano iniziale. Nomi e descrizioni dei dati esistenti restano invariati.
- Sincronizzazione tramite l'SDK Firestore. Solo web; vedi i [limiti](#installazione-come-pwa).

Stato: progetto personale in fase di preparazione alla distribuzione. Collaudato su Chrome desktop;
browser mobili e dispositivi reali non sono ancora stati verificati. Non è presente una licenza:
senza di essa il codice non è formalmente riutilizzabile.

## Requisiti

| Cosa | Dettaglio |
| --- | --- |
| Node.js | `^22.18`, `^24.3` o `^26` (meglio una LTS) e npm |
| Java | solo per gli emulatori locali (verificato con Java 21) |
| Account Google | per creare il progetto Firebase e accedere all'app |
| Progetto Firebase | Authentication, Cloud Firestore e, per pubblicare, Hosting. Non servono Cloud Functions, service account né Blaze |

Hosting e Firestore hanno quote gratuite: controllale nella Console e nella
[documentazione dei limiti](https://firebase.google.com/docs/firestore/quotas), senza darle per illimitate.

## Installazione

Tutti i passaggi sono obbligatori, salvo dove indicato.

### 1. Prova locale senza Firebase (facoltativa)

```sh
git clone <URL-del-repository> nummo
cd nummo
npm ci
npm run emulators        # terminale 1: Auth e Firestore locali
npm run emulators:seed   # terminale 2, dopo l'avvio
npm run dev:demo              # demo con account simulati
```

La demo usa il progetto fittizio `demo-nummo` e ignora ogni configurazione reale.

### 2. Crea il progetto Firebase

Nella [Console Firebase](https://console.firebase.google.com):

1. Crea un progetto e registra un'app **Web** (Impostazioni progetto → Le tue app).
2. **Authentication** → Metodo di accesso → abilita **Google**.
3. **Firestore Database** → crea il database `(default)`, edizione **Standard**, scegliendo la regione. Avvia in modalità **production**, non test.
4. Copia i quattro valori di `firebaseConfig`: `apiKey`, `authDomain`, `projectId`, `appId`. Sono pubblici, non segreti.

### 3. Configura le variabili

```sh
cp .env.example .env.local              # sviluppo (usato da npm run dev)
cp .env.example .env.production.local   # produzione (usato da build:cloud)
```

In entrambi compila le quattro variabili `EXPO_PUBLIC_FIREBASE_*`. Non aggiungere
`EXPO_PUBLIC_NUMMO_BACKEND` né variabili `*_EMULATOR`: l'ambiente lo scelgono i comandi npm,
e gli script si fermano se le trovano. I file `.env*` sono ignorati da Git.

### 4. Pubblica le regole Firestore

```sh
npx firebase login
npx firebase deploy --only firestore:rules --project ID_PROGETTO
```

`ID_PROGETTO` è il `projectId` del passaggio 2. Il repository non ha un progetto
predefinito: il flag `--project` è sempre richiesto.

### 5. Primo accesso e proprietario

1. Avvia l'app di produzione in locale: `npm run build:cloud && npm run preview:cloud`.
2. Accedi con Google. L'accesso riesce ma i dati risultano negati: è corretto, il proprietario non è ancora impostato.
3. Console → Authentication → Utenti: copia il tuo **UID** (non l'email).
4. Console → Firestore → crea la collezione `config`, documento `owner`, con un solo campo stringa `uid` uguale all'UID.
5. Ricarica l'app: ora puoi inserire una spesa. Verifica con un secondo account Google che l'accesso sia rifiutato.

Dettagli, motivazioni e sviluppo con Google reale: [docs/firebase-personale.md](docs/firebase-personale.md).

## Pubblicazione

Richiede Hosting attivo nel progetto (Console → Hosting → Inizia) e `npx firebase login`.

```sh
npm run deploy:hosting -- --dry-run            # build e controlli, mostra progetto e comando, non pubblica
npm run deploy:hosting -- --channel anteprima  # URL temporaneo (7 giorni), sito live invariato
npm run deploy:hosting                         # sito definitivo: https://ID_PROGETTO.web.app
```

Lo script legge il progetto da `EXPO_PUBLIC_FIREBASE_PROJECT_ID` (`.env.production.local` o shell),
ricostruisce con `build:cloud` e pubblica **solo Hosting**. Controlla sempre il progetto nel `--dry-run`.

**Domini per il login Google**: i domini `*.web.app` e `*.firebaseapp.com` del progetto sono autorizzati di
default. Aggiungi in Authentication → Impostazioni → Domini autorizzati gli URL dei canali di anteprima e
ogni dominio personalizzato.

**Accesso**: da desktop e smartphone basta aprire l'URL e accedere con l'account proprietario.

### Installazione come PWA

Esistono manifest e icone, quindi dal browser mobile (es. Chrome Android: ⋮ → «Installa app» o
«Aggiungi a schermata Home») si può aggiungere Nummo alla schermata Home. Limiti reali:

- Non c'è un service worker: **non è garantita l'apertura a freddo senza rete**.
- Le modifiche, i backup e le importazioni richiedono la rete; gli inserimenti possono restare in coda nell'SDK fino alla conferma del server.
- L'installazione e il login da app installata non sono ancora stati provati su dispositivi reali (iOS compreso).

## Sviluppo e aggiornamenti

| Comando | Ambiente | Cosa fa |
| --- | --- | --- |
| `npm run dev:demo` | emulator | Tutto locale (`demo-nummo`), account simulati. Richiede `emulators` e `emulators:seed` |
| `npm run dev` | hybrid | Avvia o riusa Firestore locale, poi Expo; Google reale da `.env.local` |
| `npm run check:hybrid` | hybrid | Verifica l'endpoint locale prima di Expo; non avvia Firestore né controlla il proprietario |
| `npm run build:cloud` | cloud | Build di produzione in `dist/` con controlli bloccanti |
| `npm run preview:cloud` | cloud | Serve `dist/` in locale: usa il progetto reale |
| `npm run check` | – | Typecheck, test e build demo (`dist-demo/`, mai da pubblicare) |
| `npm run test:emulator` | emulator | Test di SDK e Security Rules su Auth/Firestore locali |
| `npm run test:hybrid` | emulator | Test isolati di avvio, riuso, arresto, persistenza e guasti del runner |

Con le quattro variabili Firebase in `.env.local`, basta un comando:

```sh
npm run dev
```

Il comando riusa Firestore solo se l'Emulator Hub lo identifica come appartenente al
progetto previsto; altrimenti lo avvia con i dati in `emulator-data/`. Ctrl+C attende
l'export e arresta solo i servizi avviati dal comando. Gli emulatori preesistenti
rimangono attivi. Il progetto locale deve avere `config/owner`: solo al primo uso,
da un secondo terminale, `npm run emulators:seed:owner -- ID_PROGETTO UID`.
Non viene copiato automaticamente dal cloud. Dettagli e recupero di export falliti
in [docs/firebase-personale.md](docs/firebase-personale.md).

Per aggiornare il tuo sito: scarica le modifiche (`git pull`, `npm ci`), esegui `npm run check`, poi `npm run deploy:hosting`.
Le **regole Firestore non vengono pubblicate da `deploy:hosting`**: dopo un aggiornamento che modifica `firestore.rules`
ripeti a mano `npx firebase deploy --only firestore:rules --project ID_PROGETTO`. Non usare `firebase deploy`
senza `--only`.

Architettura e convenzioni: [AGENTS.md](AGENTS.md) e [docs/architecture.md](docs/architecture.md).

## Sicurezza e responsabilità

- L'accesso è riservato all'UID in `config/owner`, creato solo dalla Console: l'app non può nominare il proprietario.
- Le regole in `firestore.rules` sono la vera protezione dei dati (la `apiKey` è pubblica). Pubblicale prima dell'uso e non usare la modalità test.
- `.env.local`, `.env.production.local`, `.firebaserc` ed `emulator-data/` sono ignorati da Git: non versionarli e non pubblicarli. Non inserire chiavi di servizio nel frontend.
- **Backup**: da Spese → «Dati» scarichi il backup JSON (il CSV serve solo a consultare le spese e non ripristina nulla); fallo con regolarità e conservalo fuori dal sito. Firestore non è un backup.
- Cache su disco (`EXPO_PUBLIC_FIRESTORE_CACHE=persistent`) solo su dispositivi fidati: contiene dati personali anche dopo il logout.
- Costi, quote, fatturazione e conformità del progetto Firebase sono a tuo carico. Il software è fornito senza garanzie.

## Risoluzione dei problemi

| Sintomo | Causa e rimedio |
| --- | --- |
| `PERMISSION_DENIED` / accesso negato dopo il login | `config/owner` manca, o le regole non sono pubblicate nel progetto giusto. Controlla i passaggi 4 e 5 |
| Accesso negato con l'account giusto | L'`uid` in `config/owner` non coincide: va copiato da Authentication → Utenti (non email né ID Google) e il campo deve essere una stringa |
| `auth/unauthorized-domain` | Il dominio non è tra quelli autorizzati: Authentication → Impostazioni → Domini autorizzati |
| Popup di login bloccato | Consenti i popup per il sito e riprova dal tocco/clic |
| «Configurazione mancante» o `build:cloud` si ferma | Mancano le quattro `EXPO_PUBLIC_FIREBASE_*`, o hai valori in conflitto tra file e shell, o un file `.env*` contiene `EXPO_PUBLIC_NUMMO_BACKEND`/`*_EMULATOR` |
| Le modifiche a `.env.local` non hanno effetto | Riavvia Expo, se serve con `npx expo start --web --clear` (le variabili sono incorporate nel bundle); per la produzione ricostruisci |
| Porta degli emulatori occupata (9099, 8180, 4000) | Chiudi il processo che la usa; alternative in [AGENTS.md](AGENTS.md) (config temporanea con altre porte e `FIRESTORE_PORT`/`AUTH_PORT`) |
| La CLI Firebase non trova il progetto | Il repository non ha un progetto predefinito: aggiungi sempre `--project ID_PROGETTO` |

## Documentazione

- [Guida Firebase personale (dettagli)](docs/firebase-personale.md)
- [Migrazione e analisi BYOF](docs/migrazione-byof.md)
- [Architettura](docs/architecture.md) · [Istruzioni agenti](AGENTS.md) · [Stato operativo](HANDOFF.md)
- [Storico](docs/progress.md) · [Specifica originale](recap.md)
