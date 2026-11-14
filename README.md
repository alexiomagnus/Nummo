# Nummo

Gestionale personale di spese per il web. Registri le spese, le organizzi per categoria,
gestisci abbonamenti e ricorrenze e guardi l'andamento nella pagina Analisi.

## Due modalità: Standard e Avanzata

Alla prima apertura Nummo chiede dove salvare i dati. La scelta resta in questo browser e si cambia da
**Impostazioni → Archiviazione e backup → Cambia modalità**.

| | **Standard** (consigliata) | **Avanzata** (Firebase BYOF) |
| --- | --- | --- |
| Per chi | Chi vuole usare subito l'app | Chi ha, o vuole creare, un proprio progetto Firebase |
| Account | **Nessuno**: si entra senza accesso | Account Google del proprietario del progetto |
| Dove sono i dati | Nel browser del dispositivo (IndexedDB) | In Cloud Firestore, nel tuo progetto |
| Senza rete | Tutto funziona (tranne Google Drive) | Lettura dalla cache; modifiche e backup richiedono la rete |
| Più dispositivi | **No**: ogni dispositivo ha il suo archivio | Sì, sincronizzazione di Firestore |
| Copia di sicurezza | File JSON e, se configurato, Google Drive | File JSON (Firestore non è un backup) |
| Configurazione | Nessuna per l'utente | Progetto Firebase, regole e proprietario (sotto) |

Le due modalità hanno **archivi separati**. Cambiare modalità non copia, non sposta e non cancella nulla: i dati
dell'altra modalità restano dove sono e si ritrovano tornando indietro. Per portarli dall'una all'altra si esporta un
backup JSON e lo si importa dopo il cambio. Nummo **non è un servizio**: non esiste un server centrale né un database
condiviso, in nessuna delle due modalità.

### Usare Nummo senza account (Standard)

1. Apri l'app e scegli **Standard → Inizia subito**. Non servono registrazione, accesso o Firebase.
2. Al primo avvio vengono create cinque categorie predefinite; da lì registri spese, abbonamenti, fondi e liste.
3. Proteggi i dati: **Impostazioni → Archiviazione e backup** (Google Drive, se disponibile) oppure
   **menu → Importa ed esporta → Scarica backup (JSON)**.

**I dati esistono solo su quel dispositivo e in quel browser.** Si perdono se cancelli i dati del sito o la cronologia
con «cookie e dati dei siti», se disinstalli l'app installata o reimposti il dispositivo, se usi la navigazione privata
(l'archivio sparisce alla chiusura, o non è disponibile affatto) e, su alcuni browser, se lo spazio si esaurisce o il
sito non viene aperto per molto tempo (Safari elimina i dati dei siti non usati da alcune settimane, salvo app
aggiunta alla schermata Home). Un altro browser o un altro profilo sullo stesso dispositivo è un archivio diverso.
Nummo chiede al browser di rendere l'archivio persistente, ma è una richiesta, non una garanzia.

**Recupero**: su un dispositivo nuovo o svuotato scegli Standard, poi **Ripristina da Drive** oppure
**Importa ed esporta → Importa backup (JSON)**. Senza un backup i dati persi non sono recuperabili: nessuno ne ha una copia.

### Google Drive: backup, non sincronizzazione

In modalità Standard si può collegare Google Drive da **Impostazioni → Archiviazione e backup**.

- Nummo usa solo la cartella nascosta riservata all'app (`appDataFolder`, permesso `drive.appdata`): non vede né
  modifica i tuoi file. I backup non compaiono in Drive; si gestiscono da Drive → Impostazioni → Gestisci app.
- **Esegui backup** carica una copia completa (lo stesso JSON versionato dell'esportazione manuale). Ogni backup è un
  file nuovo; restano i cinque più recenti.
- **Ripristina da Drive** elenca i backup, scarica e convalida per intero quello scelto, ne mostra data e contenuto,
  avvisa che i dati del dispositivo verranno sostituiti e chiede conferma. Prima scarica una copia dei dati attuali; la
  sostituzione avviene in un'unica transazione locale: o tutta o niente. Backup di una versione più recente dell'app
  o non validi vengono rifiutati senza toccare nulla.
- **Backup automatico** (ogni giorno, settimana o mese): parte mentre l'app è aperta, se i dati sono cambiati
  dall'ultimo backup. Un archivio vuoto non viene mai caricato da solo.

Limiti da conoscere:

- **Non è una sincronizzazione.** I dispositivi non si aggiornano tra loro, non c'è unione né risoluzione dei
  conflitti: il ripristino sostituisce l'archivio del dispositivo con quello del backup. Usare due dispositivi sullo
  stesso Drive significa scegliere ogni volta quale copia tenere.
- **L'autorizzazione dura circa un'ora** e resta solo in memoria: non viene salvata nel browser. Un'app senza server
  non può rinnovarla da sola, quindi dopo una ricarica o a scadenza il backup automatico dovuto **resta in attesa** e
  l'app lo segnala: basta un tocco su «Esegui backup» (la finestra di Google di solito si chiude da sola). Il backup
  automatico non gira ad app chiusa.
- Serve la rete; senza, l'app lo dice e i dati sul dispositivo non cambiano.
- **Scollega** revoca il permesso e spegne il backup automatico; i backup già caricati restano su Drive.

#### Configurare Google OAuth e Drive (una volta, chi pubblica l'app)

Gli utenti non configurano nulla. Chi costruisce e pubblica Nummo deve creare un client OAuth, altrimenti la sezione
mostra Google Drive come «Non disponibile» (resta il backup su file). **Questi passaggi vanno fatti a mano nella
[Google Cloud Console](https://console.cloud.google.com): non sono stati eseguiti né verificati dal repository.**

1. Scegli il progetto Google Cloud (va bene quello del progetto Firebase, se ne hai uno; altrimenti creane uno).
2. **API e servizi → Libreria** → abilita **Google Drive API**.
3. **API e servizi → Schermata consenso OAuth** (Google Auth Platform): tipo **Esterno**, nome dell'app, email di
   assistenza e di contatto. In **Accesso ai dati / Ambiti** aggiungi solo `https://www.googleapis.com/auth/drive.appdata`
   (ambito non sensibile: non richiede la verifica riservata agli ambiti sensibili o con restrizioni).
4. In stato **Test** possono autorizzare solo gli account elencati tra gli utenti di test, con consenso da rinnovare
   periodicamente. Per aprirla a tutti: **Pubblica app** (passaggio in produzione); Google può chiedere una verifica
   del marchio (nome, logo, domini, informativa sulla privacy).
5. **Credenziali → Crea credenziali → ID client OAuth → Applicazione web**. In **Origini JavaScript autorizzate**
   inserisci ogni origine da cui l'app viene servita, senza percorso: ad esempio `https://ID_PROGETTO.web.app`,
   `https://ID_PROGETTO.firebaseapp.com`, il dominio personalizzato e, per lo sviluppo, `http://localhost:8081`.
   Gli URI di reindirizzamento non servono.
6. Copia l'**ID client** (`….apps.googleusercontent.com`) in `.env.production.local` (e in `.env.local` per lo sviluppo):

   ```sh
   EXPO_PUBLIC_GOOGLE_CLIENT_ID=000000000000-xxxxxxxx.apps.googleusercontent.com
   ```

   È un identificativo pubblico. Il **segreto client non serve e non va mai inserito** nei file o nel repository:
   `build:cloud` rifiuta valori che non siano un ID client web.
7. Ricostruisci e pubblica (`npm run deploy:hosting`), poi prova da un account autorizzato: Collega, Esegui backup,
   Ripristina.

Nota: in questa versione `build:cloud` richiede comunque le quattro variabili Firebase, quindi il sito pubblicato
offre entrambe le modalità; chi sceglie Standard non contatta mai Firebase.

## Il modello BYOF (modalità Avanzata)

Ogni installazione usa il **tuo** progetto Firebase (Authentication Google + Cloud Firestore)
e, se vuoi, il tuo Firebase Hosting. I dati restano nel tuo database; solo l'account Google
il cui UID è scritto in `config/owner` può leggerli e scriverli. Costi, quote, backup e
sicurezza del progetto sono una tua responsabilità (vedi [Sicurezza](#sicurezza-e-responsabilità)).
Le sezioni [Installazione](#installazione) e [Pubblicazione](#pubblicazione) sono la guida BYOF.

## Funzionalità

- **Nuova spesa** con importo, data, descrizione e categoria; **Spese** con ricerca, filtri, modifica ed eliminazione.
- **Abbonamenti** settimanali, mensili e annuali, con prove gratuite, variazioni di prezzo, pausa/annullamento e cambi di frequenza futuri che conservano i pagamenti maturati.
- **Categorie** personalizzabili, con 39 icone selezionabili in tre stili, e **Analisi** con totali e grafici.
- **Fondi e budget** facoltativi: spesa mensile per fondo e budget generale; i fondi già dotati di saldo conservano ricariche e movimenti.
- **Liste della spesa** con checklist, totale manuale e registrazione di una sola spesa per acquisto.
- **Importa ed esporta**, dal menu account: CSV per consultazione (Excel/LibreOffice) e backup JSON v6, unico formato di ripristino, con lettori delle versioni precedenti.
- Tema chiaro/scuro, colori personalizzabili e tre stili per le icone delle categorie (minimale, colorato o pixel art); layout per smartphone, tablet e desktop.
- Interfaccia in italiano e inglese: **Impostazioni → Lingua / Settings → Language**,
  dal menu account o dall'ingranaggio prima dell'accesso. Scelta immediata, salvata
  nel browser; italiano iniziale. Nomi e descrizioni dei dati esistenti restano invariati.
- **Due modalità di archiviazione**: Standard (sul dispositivo, senza account, backup su Google Drive o file) e Avanzata (Firestore, con sincronizzazione dell'SDK). Solo web; vedi i [limiti](#installazione-come-pwa).

Stato: progetto personale con rilasci Hosting documentati in [HANDOFF.md](HANDOFF.md).
Le verifiche automatiche e in Chromium emulato sono distinte dai collaudi su dispositivi reali, ancora da completare. Non è presente una licenza:
senza di essa il codice non è formalmente riutilizzabile.

## Requisiti

| Cosa | Dettaglio |
| --- | --- |
| Node.js | `^22.18`, `^24.3` o `^26` (meglio una LTS) e npm |
| Java | solo per gli emulatori locali (verificato con Java 21) |
| Account Google | solo per la modalità Avanzata (progetto Firebase e accesso) e per i backup su Google Drive |
| Progetto Firebase | Authentication, Cloud Firestore e, per pubblicare, Hosting. Non servono Cloud Functions, service account né Blaze |

Hosting e Firestore hanno quote gratuite: controllale nella Console e nella
[documentazione dei limiti](https://firebase.google.com/docs/firestore/quotas), senza darle per illimitate.

## Installazione

Guida BYOF per la modalità Avanzata e per pubblicare il sito. Tutti i passaggi sono obbligatori, salvo dove indicato.
Per il solo backup su Drive vedi [Configurare Google OAuth e Drive](#configurare-google-oauth-e-drive-una-volta-chi-pubblica-lapp).

### 1. Prova locale senza Firebase (facoltativa)

```sh
git clone <URL-del-repository> nummo
cd nummo
npm ci
npm run emulators        # terminale 1: Auth e Firestore locali
npm run emulators:seed   # terminale 2, dopo l'avvio
npm run dev:demo              # demo con account simulati
```

La demo usa il progetto fittizio `demo-nummo` e ignora ogni configurazione reale. Nella schermata iniziale scegli
**Avanzata** per gli account simulati, oppure **Standard** per l'archivio sul dispositivo (non servono gli emulatori).

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

**Accesso**: da desktop e smartphone basta aprire l'URL; in Standard si entra subito, in Avanzata accede l'account proprietario.

### Installazione come PWA

Esistono manifest e icone, quindi dal browser mobile (es. Chrome Android: ⋮ → «Installa app» o
«Aggiungi a schermata Home») si può aggiungere Nummo alla schermata Home. Limiti reali:

- Non c'è un service worker: **non è garantita l'apertura a freddo senza rete**.
- In modalità Avanzata le modifiche, i backup e le importazioni richiedono la rete; gli inserimenti possono restare in coda nell'SDK fino alla conferma del server.
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

- **Standard**: i dati non lasciano il dispositivo, salvo i backup che carichi tu su Google Drive. Chiunque usi quel browser li vede: non c'è accesso. L'autorizzazione a Drive non viene salvata nel browser.
- **Avanzata**: l'accesso è riservato all'UID in `config/owner`, creato solo dalla Console: l'app non può nominare il proprietario.
- Le regole in `firestore.rules` sono la vera protezione dei dati (la `apiKey` è pubblica). Pubblicale prima dell'uso e non usare la modalità test.
- `.env.local`, `.env.production.local`, `.firebaserc` ed `emulator-data/` sono ignorati da Git: non versionarli e non pubblicarli. Non inserire chiavi di servizio nel frontend.
- **Backup**: da menu account → «Importa ed esporta» scarichi il backup JSON (il CSV serve solo a consultare le spese e non ripristina nulla); fallo con regolarità e conservalo fuori dal sito. Firestore non è un backup.
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
| Porta degli emulatori occupata (9099, 8180, 4000) | Usa porte dedicate senza arrestare servizi preesistenti; vedi [AGENTS.md](AGENTS.md) (config temporanea e `FIRESTORE_PORT`/`AUTH_PORT`) |
| Google Drive «Non disponibile» | La build non ha `EXPO_PUBLIC_GOOGLE_CLIENT_ID`: vedi la configurazione OAuth |
| Errore di Google alla finestra di consenso (`origin_mismatch`, accesso bloccato) | L'origine del sito manca tra le Origini JavaScript autorizzate, oppure l'app è in Test e l'account non è tra gli utenti di test |
| «Google Drive non è abilitato per questa installazione» | Abilita Google Drive API nel progetto Google Cloud del client OAuth |
| «Dati non disponibili su questo dispositivo» | IndexedDB è bloccato (navigazione privata, dati dei siti disattivati): cambia impostazione o browser |
| La CLI Firebase non trova il progetto | Il repository non ha un progetto predefinito: aggiungi sempre `--project ID_PROGETTO` |

## Documentazione

- [Guida Firebase personale (dettagli)](docs/firebase-personale.md)
- [Migrazione e analisi BYOF](docs/migrazione-byof.md)
- [Architettura](docs/architecture.md) · [Istruzioni agenti](AGENTS.md) · [Stato operativo](HANDOFF.md)
- [Storico](docs/progress.md) · [Specifica originale](recap.md)
