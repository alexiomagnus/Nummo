# Notifiche di sistema (Web Push)

Stato al 15 novembre 2026: **fase 1** (sistema push, verificato in locale e pubblicato) e **fase 2** (rimozione degli
avvisi in-app, su richiesta dell'utente) eseguite. Nummo avvisa solo con le notifiche di sistema.

## Come funziona

```text
App (Standard o Avanzata)                Servizio push di Nummo               Servizio push del browser
 calcola QUANDO avvisare          ──►     conserva endpoint + orari     ──►    Google (Chrome/Edge/Android),
 (domain/pushSchedule.ts)                 invia all'orario un messaggio        Mozilla (Firefox), Apple (Safari/iOS)
 public/sw.js mostra la notifica  ◄──     cifrato senza dati di spesa   ◄──
```

- **Nessuna API del browser consegna in modo affidabile notifiche pianificate ad app chiusa senza un server**:
  Notification Triggers è stata abbandonata, Periodic Background Sync esiste solo in Chrome, solo per app installate,
  con frequenza decisa dal browser, e non esiste su iOS. Serve quindi un piccolo servizio di invio.
- **Il servizio non vede mai le spese.** È l'app, che i dati li ha, a calcolare gli orari con le stesse regole di
  `domain/notifications.ts` e a inviarli quando cambiano (al massimo un aggiornamento per pausa di 1,5 s, e almeno uno
  al giorno quando l'app viene aperta). Il servizio conserva solo: endpoint e chiavi della sottoscrizione, lingua
  (it/en), per ogni promemoria tipo, orario, intervallo di ripetizione (backup) e date del periodo (riepilogo), e l'ultima
  consegna per tipo. Nessun account, UID, indirizzo IP, importo, categoria o descrizione. Per i rinnovi degli abbonamenti
  solo la data del rinnovo (nessun nome).
- **Un unico servizio per Standard e Avanzata**: non dipende da Firebase. In Standard non serve alcun account; in
  Avanzata non serve configurare nulla nel progetto Firebase personale.
- **Testi generici, mai inventati.** Il messaggio porta solo tipo e date; il testo lo scrive `public/sw.js`:
  - Riepilogo: «Riepilogo spese pronto — Il riepilogo dal 9 novembre al 15 novembre è pronto. Tocca per vederlo.» Il riepilogo
    vero (totale, numero, categoria principale, abbonamenti esclusi) è calcolato **all'apertura**, sui dati attuali.
  - Backup (solo Standard): «I dati di Nummo sono cambiati dall'ultimo backup.» È vero per costruzione:
    in Standard i dati cambiano solo con l'app aperta, e ogni cambio o backup scaricato ricalcola l'orario.
- **Regole mantenute**: riepilogo alle 9:00 (Europe/Rome) del giorno dopo la fine del periodo di calendario
  (settimana lunedì–domenica, blocchi di 14 giorni dal 1° gennaio 2024, mese), solo se il periodo contiene già almeno
  una spesa singola (abbonamenti esclusi), mai per periodi conclusi prima dell'attivazione. Promemoria backup
  quando è passato l'intervallo dall'ultimo backup (o dall'attivazione) e i dati sono cambiati, ripetuto a
  ogni intervallo finché l'app non lo annulla; all'**orario scelto** dall'utente (7–22, Europe/Rome, predefinito 9:00: Mattina/Pranzo/Sera/Altra); un promemoria in ritardo aspetta la prossima occorrenza di quell'ora. «Ricordamelo tra 3 giorni» c'è sia sulla
  notifica (dove il sistema mostra le azioni: Chrome desktop/Android) sia nella pagina Notifiche. Il backup conta al
  download del backup completo, senza conferma (dal 15 novembre).
  - Rinnovo (entrambe le modalità, dal 15 novembre): «Rinnovo in arrivo — Un abbonamento si rinnova il 18 novembre. Tocca per
    vedere i rinnovi.» Il tocco apre Spese → Abbonamenti. Orario: l'ora scelta del giorno prima del primo rinnovo di un abbonamento
    attivo (`renewalJob`, finestra di 45 giorni); un rinnovo il cui promemoria è già passato si salta. Il servizio tiene un solo
    promemoria `renewal` alla volta (chiave `renewal:AAAA-MM-GG`, mai consegnato due volte): il successivo viene programmato
    quando l'app invia di nuovo gli orari. **Il Worker va ripubblicato** prima dell'Hosting: la versione precedente rifiuta il
    nuovo tipo e quindi l'intero elenco degli orari.
- **Nessun duplicato**: un solo promemoria in attesa per tipo e sottoscrizione; un riepilogo già consegnato per quel
  periodo non viene rinviato; un backup già consegnato non viene anticipato da un nuovo invio degli orari; tag per tipo
  nel sistema (`nummo-backup`, `nummo-summary`) e header `Topic` presso il servizio push. Non esistono avvisi in-app.
- **Errori**: endpoint scaduto (404/410) → sottoscrizione dimenticata; errore temporaneo → nuovo tentativo dopo 15 min,
  al massimo 5; dispositivi non più aperti da 120 giorni → dimenticati. `pushsubscriptionchange` → il service worker
  si reiscrive e sposta i promemoria (`/v1/renew`).
- **Tocco**: apre Nummo sulla pagina Notifiche (con il riepilogo del periodo, o il promemoria backup con Esporta /
  Ricordamelo tra 3 giorni), riusando una finestra già aperta se c'è.

### File

| Percorso | Ruolo |
| --- | --- |
| `src/domain/pushSchedule.ts` | Orari di consegna (puro, testato in `tests/pushSchedule.test.ts`). |
| `src/services/pushNotifications.ts` | Supporto, service worker, permesso, sottoscrizione, invio orari, prove, apertura da notifica. |
| `src/features/notifications/usePushNotifications.ts` | Stato nella pagina e sincronizzazione degli orari. |
| `public/sw.js` | Solo notifiche: nessun gestore `fetch`, nessuna cache (nessuna promessa di avvio offline). |
| `push-service/` | Servizio di invio: `service.ts` (API e invio, SQL), `webPush.ts` (RFC 8291/8292 con WebCrypto), `worker.ts` (Cloudflare), `local.ts` (Node, prove), `keys.ts`. |

Nessuna dipendenza npm aggiunta: cifratura e firma usano WebCrypto; in locale l'archivio è `node:sqlite`.

## Costi e piattaforma consigliata

Consigliato **Cloudflare Workers + D1, piano gratuito**: nessuna carta di credito, cron ogni minuto incluso, limiti
(100 000 richieste/giorno, D1 5 milioni di letture e 100 000 scritture/giorno) molto oltre l'uso di un'app personale.
Il codice usa solo API web standard: può girare anche su un proprio server Node (`push-service/local.ts` come base)
o su Deno. Firebase Cloud Functions è stato scartato: richiede il piano Blaze con fatturazione, e legherebbe la
modalità Standard a Firebase.

## Configurazione (manuale, richiede il tuo account)

Crea risorse cloud e va fatta da te. Stato al 14 novembre 2026: database D1 creato con lo schema applicato in remoto
(`npx wrangler@4 d1 execute nummo-push --remote --file=…`, facoltativo: le tabelle si creano comunque alla prima
richiesta), `wrangler.toml` e `.env.production.local` preparati; segreto, deploy del Worker e Hosting **non eseguiti**.
`EXPO_PUBLIC_NUMMO_PUSH_KEY` è la chiave **pubblica** VAPID: il servizio non usa altre chiavi API.

1. Account Cloudflare gratuito; poi, dalla radice del repository:
   ```sh
   cd push-service
   cp wrangler.toml.example wrangler.toml          # ignorato da Git
   npx wrangler@4 login
   npx wrangler@4 d1 create nummo-push             # copia database_id in wrangler.toml
   node keys.ts                                    # chiavi VAPID: la privata non va salvata nel repository
   cd ..
   npx wrangler@4 secret put VAPID_PRIVATE_KEY --config push-service/wrangler.toml   # incolla la chiave privata
   ```
   **Sempre `--config push-service/wrangler.toml`** per `secret`, `deploy` e `d1 execute`: `npx` dentro il repository
   esegue wrangler dalla radice del pacchetto, dove non trova la configurazione e ne genera una automatica che pubblica
   `dist/` come Worker separato (successo il 14 novembre: Worker `nummo` creato per errore).
   In `wrangler.toml` imposta `VAPID_PUBLIC_KEY`, `VAPID_SUBJECT` (l'indirizzo del sito) e `ALLOWED_ORIGINS` (gli
   indirizzi esatti da cui apri Nummo, per esempio `https://PROGETTO.web.app,https://PROGETTO.firebaseapp.com`).
2. Dalla radice: `npx wrangler@4 deploy --config push-service/wrangler.toml` → annota l'indirizzo `https://nummo-push.<account>.workers.dev`. Le tabelle si creano da
   sole alla prima richiesta.
3. In `.env.production.local` aggiungi:
   ```sh
   EXPO_PUBLIC_NUMMO_PUSH_URL=https://nummo-push.<account>.workers.dev
   EXPO_PUBLIC_NUMMO_PUSH_KEY=<chiave pubblica VAPID>
   ```
   `build:cloud` le accetta solo insieme, in https e non locali; senza di esse la pagina dice «non configurate».
4. `npm run deploy:hosting` (con la tua autorizzazione) per pubblicare il sito con `sw.js`.

Le chiavi VAPID non vanno cambiate: con una chiave nuova ogni dispositivo deve riattivare le notifiche (l'app lo fa
da sola alla riattivazione, sostituendo la vecchia sottoscrizione).

## Prova sul tuo dispositivo

- **Aspetto**: Notifiche → «Invia notifica di prova». È una vera notifica di sistema, mostrata dal service worker,
  ma **non passa dal servizio push**: prova solo permesso e aspetto.
- **Consegna ad app chiusa**: «Prova con Nummo chiusa», poi chiudi Nummo (su telefono anche dall'elenco delle app
  recenti). Entro circa un minuto arriva «Notifica push di prova — Arrivata dal servizio di notifiche». Solo questa
  prova certifica la ricezione ad app chiusa sul dispositivo.
- Sul computer, in locale: `node push-service/local.ts` (chiavi in `push-service/.local/`, ignorate), poi una build
  con `EXPO_PUBLIC_NUMMO_PUSH_URL=http://127.0.0.1:8790` e la chiave stampata, servita su `http://localhost:8091`
  (origine ammessa con `PUSH_ALLOWED_ORIGINS`).

## Compatibilità

| Piattaforma | Stato |
| --- | --- |
| Chrome/Edge desktop (Windows, Linux, macOS) | Supportato; ad app chiusa serve il browser in esecuzione (anche in background). |
| Brave (desktop) | Supportato dopo aver attivato «Use Google services for push messaging» in `brave://settings/privacy` e riavviato il browser; altrimenti l'iscrizione fallisce («Il browser non è riuscito a iscriversi…»). Verificato dall'utente il 14 novembre 2026. |
| Chrome Android | Supportato, anche senza installazione; azione «Ricordamelo tra 3 giorni» sulla notifica. |
| Firefox desktop/Android | Supportato (servizio Mozilla); il permesso va chiesto da un gesto, come fa la pagina. |
| Safari macOS 16+ | Supportato (servizio Apple); azioni sulla notifica non mostrate. |
| iPhone/iPad (iOS/iPadOS 16.4+) | **Solo con Nummo aggiunta alla schermata Home** e aperta da lì; la pagina lo spiega. Azioni non mostrate. |
| Browser senza Push API, finestre private di alcuni browser | La pagina dice «non supporta»; nessun avviso (nessun ripiego in-app dalla fase 2). |

## Verifiche eseguite (14 novembre 2026)

- Test automatici: vettore ufficiale RFC 8291 (cifratura identica byte per byte), firma VAPID verificata, decifratura
  lato dispositivo simulato; API del servizio (origini, endpoint ammessi, dedup, ripetizioni, 410, tentativi, prove,
  rinvio, rinnovo, pulizia, campi conservati); orari (ora legale, fascia 9–21, periodi, spese assenti); service worker in
  sandbox (testi it/en, icone, tag, tocco con e senza finestra aperta, rinvio).
- **Consegna reale, solo desktop Linux**: Chromium 156 headless, profilo temporaneo, servizio `local.ts` sul computer,
  build demo in Standard. Sottoscrizione presso Google (`jmt17.google.com`), orari registrati (backup e, dopo una spesa,
  riepilogo alle 9 del 16 novembre), notifica locale, **push di prova ricevuta e mostrata dal service worker con nessuna
  pagina di Nummo aperta** (circa 30 s), apertura da URL di notifica e messaggio a finestra già aperta, disattivazione:
  23/23. La registrazione di Chromium presso Google è risultata a volte lenta o fallita (`PHONE_REGISTRATION_ERROR`):
  problema del browser, che la pagina ora distingue da un errore del servizio Nummo.
- **Non verificato**: il clic reale sulla notifica del sistema operativo (il browser consente `openWindow` solo a un clic
  vero; coperto dal test in sandbox), Firefox, Safari, Android, iOS, app installata, Windows/macOS, modalità Avanzata nel
  browser (stessa logica, senza promemoria backup), Cloudflare Workers/D1 reali (nessun deploy).

## Fase 2: rimozione degli avvisi in-app — eseguita il 15 novembre 2026

Eseguita su richiesta dell'utente («voglio solo le notifiche del sistema operativo»), con queste differenze dal piano:
«Hai salvato il backup?» è stato **eliminato** (non spostato): il download del backup completo conta come backup; gli
ascoltatori `focus`/`visibilitychange` restano per aggiornare lo stato della pagina Notifiche. Piano originale:


- eliminare `NotificationCards.tsx` e il suo montaggio in `Workspace.tsx`, il controllo ogni 15 minuti e gli ascoltatori
  `focus`/`visibilitychange` di `useNotifications` (l'ora serve solo per calcolare gli orari, all'apertura e ai cambi);
- spostare «Hai salvato il backup?» dopo i download fuori dalla pagina Notifiche (oggi è nelle schede in-app) in un
  punto stabile, per esempio la pagina Archiviazione e backup;
- conservare preferenze, frequenze, `lastBackupAt`, rinvio, `summaryShownThrough` e le regole di `domain/notifications.ts`
  (usate da `pushSchedule.ts`); rimuovere `dueNotifications`/`summaryDue` se non più usate, con i loro test;
- sui browser senza Push o senza configurazione la pagina dirà che le notifiche non sono disponibili: nessun ripiego.
