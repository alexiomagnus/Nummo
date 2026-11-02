# Nummo

Gestionale personale delle spese: Expo web, Firebase Authentication Google e
**Cloud Firestore del tuo progetto Firebase**. Nessun servizio centralizzato,
Google Sheets API o database locale parallelo. Configurazione senza modificare il codice.

Quattro sezioni: Nuova, Spese (ricerca, modifica, eliminazione, CSV e backup JSON),
Dashboard e Categorie. Ricorrenze settimanali/mensili/annuali, icone pixel art e tema
chiaro/scuro restano disponibili. La sincronizzazione usa l'SDK Firestore.

## Avvio locale sicuro

Richiede Node `^22.18 || ^24.3 || ^26` (preferire LTS), npm, Java per gli emulatori.

```sh
npm ci
npm run emulators       # terminale 1: Auth + Firestore locali
npm run emulators:seed  # terminale 2, dopo l’avvio degli emulatori
npm run dev             # demo, account Google simulati
```

`npm run dev` forza la demo anche se esiste una configurazione Firebase reale.
Il proprietario demo è autorizzato; l'estraneo è respinto. I dati degli emulatori
non sono un backup: esportarli prima di fermarli se si desidera conservarli.

## Firebase personale

Segui [la guida BYOF](docs/firebase-personale.md): progetto personale, Google Auth,
Firestore, domini autorizzati, UID amministrativo e regole restrittive. La sola
`firebaseConfig` non completa la configurazione sicura.

- `dev:firebase`: Google reale, Firestore su localhost, progetto da `.env.local`.
- `dev:cloud`: Firebase personale, dopo la configurazione manuale.
- Cache persistente opzionale per dispositivi fidati: `EXPO_PUBLIC_FIRESTORE_CACHE=persistent`.

Spese e categorie locali precedenti non vengono cancellate: importazione esplicita
con anteprima e backup. Vedi [migrazione e analisi](docs/migrazione-byof.md).

## Verifiche

```sh
npm run check             # typecheck, test app, export web
npm run test:emulator     # SDK e Security Rules contro Auth/Firestore locali
```

Il vecchio backend Cloud Functions/Sheets è stato rimosso; resta consultabile nella
cronologia Git (commit `fe759d5`).
Nessuna nuova dipendenza o commit automatico; nessun deployment o fatturazione attivati.

L'unico target è **web**. PWA completa, installazione e dispositivi Android/iOS reali
restano da collaudare/implementare; il recupero dati dalla cache non implica apertura
a freddo offline dell'app. Importazioni/modifiche e backup richiedono rete; gli
inserimenti possono restare pendenti nella coda SDK fino alla conferma server.

- [Stato operativo e verifiche](HANDOFF.md)
- [Architettura](docs/architecture.md)
- [Istruzioni agenti](AGENTS.md)
- [Storico](docs/progress.md)
- [Specifica originale conservata](recap.md)
