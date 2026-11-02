# Nummo

Web app per registrare spese personali in Google Sheets. Per impostazione predefinita
le spese si salvano solo nel browser. Il backend (Cloud Functions, Sheets) gira **solo
negli emulatori locali**; il login può essere simulato o, con un progetto Firebase reale,
Google vero. Nessun deployment e nessun foglio reale collegato.

## Avvio

Usare Node LTS compatibile con `package.json` (22.18+ oppure 24.3+; supportato anche 26).

```sh
npm ci
npm run dev
```

Aprire l'indirizzo localhost stampato da Expo. Le sezioni sono:

- **Nuova**: importo, nome dell'acquisto, categoria facoltativa e, se serve,
  «Ripeti questa spesa» (settimanale, mensile o annuale). La data è sempre oggi (Roma).
- **Spese**: elenco ricercabile per nome e ordinabile per data o importo; le spese
  ricorrenti compaiono a ogni scadenza fino a oggi.
- **Dashboard**: ciambella, andamento o barre impilate, per mese corrente, 6 o 12 mesi.
- **Categorie**: al primo avvio Spesa, Ristorazione, Uscita e Shopping, con icone
  pixel art; si possono aggiungere, rinominare, eliminare e cambiare icona.

In questa modalità spese e categorie sono salvate **solo in questo browser**
(`localStorage`): non c'è sincronizzazione e cancellare i dati del sito le elimina.
Il tema si cambia con l'icona sole/luna.

### Con il backend negli emulatori

Richiede Java 11+. Nessuna credenziale: il progetto `demo-nummo` esiste solo in locale.

```sh
npm ci --prefix functions
npm run emulators       # terminale 1: Auth, Functions, Firestore (UI su 127.0.0.1:4000)
npm run dev:emulator    # terminale 2: app con accesso Google simulato
```

Accedere con «Proprietario (demo)» (autorizzato) o «Estraneo (demo)» (non autorizzato).
Le spese passano dalla funzione `submitExpense` e sono rilette dopo il ricaricamento;
negli emulatori Google Sheets è sostituito da una raccolta Firestore, azzerata a ogni
riavvio. `npm run test:emulator` verifica il backend (accessi, concorrenza, conflitti).

### Con il login Google reale e il backend locale

Usa Firebase Authentication del progetto reale; Functions e Firestore restano negli
emulatori e niente viene pubblicato né scritto su Google Sheets.

1. Copiare `.env.example` in `.env.local` e compilare la configurazione web del progetto.
2. In `functions/.env.<id-progetto>` impostare `ALLOWED_UID` (il proprio UID, dalla
   Console Firebase → Authentication → Utenti) e `SHEET_ID=emulator`.
3. Avviare (fermando prima gli emulatori demo, usano le stesse porte):

```sh
npm run emulators:real   # terminale 1
npm run dev:firebase     # terminale 2
```

`npm run test:emulator:real` verifica che il backend rifiuti token mancanti o falsificati.

```sh
npm run typecheck
npm test
npm run build
# Oppure tutti insieme (inclusi i test di functions/), con arresto al primo errore:
npm run check
```

L'export web è in `dist/`. Non è ancora una PWA installabile: manifest, icone,
HTTPS e ciclo di aggiornamento appartengono alla fase 3. Nessun service worker
o cache dei dati privati è configurato.

Il runner Node esegue i test nello stesso processo (`--experimental-test-isolation=none`):
in questo ambiente il runner con subprocessi riportava solo i file senza dettaglio
dei casi. Non sono necessarie librerie di test aggiuntive.

## Documentazione

- [Specifica originale v0.4](recap.md)
- [Decisioni e confini architetturali](docs/architecture.md)
- [Piano, avanzamento e verifiche](docs/progress.md)
- [Istruzioni per gli agenti](AGENTS.md)

Non sono presenti credenziali o configurazioni di servizi reali. Non abilitare
fatturazione e non effettuare deployment senza autorizzazione.
