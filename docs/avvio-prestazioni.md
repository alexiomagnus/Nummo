# Avvio dell'app: diagnosi, misure e procedura

Stato al **8 novembre 2026**. Le misure sono **emulate** (Chromium headless con profilo Pixel, CPU e rete rallentate,
Auth e Firestore degli emulatori): **non** sono state eseguite su un Pixel 8 reale. Decisioni di architettura: `architecture.md`.

## Sequenza osservata (prima delle correzioni)

Riprodotta in emulazione, identica alla segnalazione dal Pixel 8:

1. splash Android (sfondo `#121212` dal manifest, icona del manifest);
2. pagina vuota con lo sfondo statico dell'HTML (schema Menta, **diverso** da quello scelto dall'utente);
3. intestazione con indicatore «Caricamento della sessione» (guscio della schermata di accesso, senza navigazione);
4. cambio di guscio: titolo, barra di navigazione e indicatore «Caricamento dei dati», modulo invisibile;
5. modulo completo.

## Cause

| Causa | Stato | Controllabile dall'app |
| --- | --- | --- |
| Sfondo dell'HTML fisso (Menta) ≠ tema/accento scelti: due cambi di colore prima del contenuto | **Confermata** (3 fotogrammi, `bgColours` 2) | Sì |
| Il primo render mostrava solo guscio + spinner; il modulo arrivava dopo sessione e dati (≈ 1 s di schermate «vuote» in emulazione) | **Confermata** | Sì |
| `SafeAreaProvider` non rende i figli finché un effetto non ha misurato i margini (un commit in più) | **Confermata** nel sorgente e nei tempi | Sì |
| Il ripristino della sessione salvata attende una richiesta di rete (`reloadAndSetCurrentUserOrClear`; due se il token è scaduto) | **Confermata** nel codice dell'SDK; il costo reale dipende dalla rete | Solo mascherabile (segnaposto) |
| Su browser mobili l'SDK Auth inizializza subito il resolver del popup (script gapi + iframe) e **solo dopo** ripristina la sessione | **Confermata** nel codice (`_shouldInitProactively`) e nelle richieste di rete emulate; il ritardo su rete reale non è misurato | Sì, con cautela (vedi sotto) |
| Font richiesto solo dopo il mount di React (`@font-face` iniettato da un effetto): prima il testo usa il font di ripiego | **Confermata** (richiesta a 421 ms prima, a ≈ 10 ms ora) | Sì |
| Attesa dei primi snapshot Firestore (connessione + token) | Confermata, inevitabile | No, solo mascherabile |
| Bundle unico da 2,2 MB (437 KB con Brotli) | Pesa solo all'avvio a freddo dopo un deploy; da riapertura la cache HTTP lo serve in ≈ 10 ms | **Non ottimizzato**: nessuna evidenza che sia il collo di bottiglia in riapertura |
| Splash Android: colore e icona statici del manifest | Confermata | No: il manifest non segue tema/accento; dal 9 novembre 2026 `#0F1511` (sfondo scuro Menta, prima `#121212`), usato da Android 15+ anche per la barra di navigazione dell’app installata |
| Ripresa dell'app già in memoria da «Recenti» | Gestita da Android/Chrome | No: nessun avvio da rifare |

## Correzioni

- **Sfondo coerente dal primo fotogramma:** `GlobalStyle` salva in `nummo.boot-theme.v1` lo sfondo di entrambi gli schemi
  (chiaro/scuro) della tinta scelta; lo script inline `nummo-boot` di `public/index.html` lo applica prima del bundle
  (con tema «sistema» sceglie in base al dispositivo) e aggiorna `theme-color`. Valori non validi o storage negato: restano i colori statici.
- **Segnaposto `StartupWorkspace`:** se l'ultima visita era una sessione, mentre Auth ripristina l'utente e finché
  `RemoteWorkspace` non è pronto (stesso rilascio di prima: dati pronti, errore o 4 s) viene mostrata la pagina «Nuova spesa»
  con lo stesso guscio e lo stesso modulo a campi disabilitati, in un contenitore `inert` e `aria-hidden`. Non legge né scrive
  nulla. Un solo elemento resta al suo posto da «caricamento» a «connesso» (campi già misurati, nessun lampo senza etichette).
- **Indizio di sessione** (`nummo.session.hint.v1` = `cloud|local`, scritto a login, cancellato a logout/sessione assente):
  decide il segnaposto e le connessioni anticipate. **Non concede accesso e non contiene identità**: la schermata reale
  richiede sempre Firebase Auth.
- **Connessioni anticipate:** con indizio `cloud`, `preconnect` verso `identitytoolkit`, `securetoken` e `firestore.googleapis.com`.
  Solo dopo una sessione cloud, così la guida pubblica e gli utenti non connessi non contattano Google. **Effetto non misurabile
  in emulazione.**
- **Auth senza resolver all'avvio quando c'è l'indizio:** `firebase.ts` non passa `popupRedirectResolver` a `initializeAuth` e lo
  passa a `signInWithPopup`. Il ripristino della sessione non aspetta più gapi/iframe (richieste sparite nel log). Senza indizio
  (primo accesso, sessione assente) il comportamento è quello precedente. Compromesso: dopo un logout o con sessione scaduta il
  primo accesso inizializza il resolver al clic; su Chrome Android il popup è consentito (attivazione utente ≈ 5 s) e, se il browser
  lo bloccasse, compare il messaggio `auth/popup-blocked` e il secondo tentativo trova il resolver già pronto.
- **Avvio dei servizi all'import** (`warmUpServices` in `App.tsx`): il ripristino della sessione parte durante il primo render
  invece che dopo.
- **Margini di sicurezza iniziali** (`initialSafeAreaMetrics`): i figli di `SafeAreaProvider` si renderizzano nel primo commit.
- **Font:** `@font-face` nell'HTML e `preload` del sottoinsieme latino (stesso file, nessun dato in più per chi usa il font di sistema
  salvo ≈ 36 KB scaricati).

Nessun ritardo artificiale, animazione aggiunta o cache applicativa. Rules, schema, dipendenze e Material 3 invariati.

## Misure (emulazione)

Mediana di 9 esecuzioni, Chromium 412×915 (DPR 2,625, UA Android), tema scuro/ambra, utente salvato, build di produzione
`emulator` servita con Brotli e cache come Hosting. «A freddo» = cache HTTP vuota; «a caldo» = bundle in cache.
Reti: `4g` = 40 ms RTT, 8 Mbit/s; `slow4g` = 150 ms, 1,6 Mbit/s. Valori in ms dall'inizio della navigazione.

| Condizione | Fase | Prima | Dopo |
| --- | --- | --- | --- |
| CPU ×2, rete veloce | a caldo: modulo visibile / pronto | 747 / 747 | **248** / **632** |
| | a freddo: modulo visibile / pronto | 1094 / 1094 | **539** / **924** |
| | schermate senza modulo (solo spinner) | 537 | **0** |
| CPU ×4, 4g | a caldo: modulo visibile / pronto | 1424 / 1424 | **593** / 1491 |
| | a freddo: modulo visibile / pronto | 2883 / 2883 | **1731** / **2648** |
| | schermate senza modulo | 1020 (caldo), 1409 (freddo) | **0** |
| CPU ×4, slow4g | a caldo: modulo visibile / pronto | 1807 / 1807 | **668** / 1845 |
| | a freddo: modulo visibile / pronto | 5562 / 5562 | **4270** / **5408** |
| Tutte | colori di sfondo distinti prima del contenuto | 2 | **1** |

«Modulo visibile» = primo fotogramma con il modulo (prima: reale, dopo: segnaposto); «pronto» = modulo reale, dati caricati, segnaposto rimosso.

Letture oneste dei numeri:

- Il primo contenuto utile arriva **500–1300 ms prima**; le schermate intermedie senza modulo scompaiono.
- Il tempo «pronto» migliora con CPU ×2 (−115/−170 ms), è **alla pari** con CPU ×4 a caldo e migliora di 140–235 ms a freddo.
- Il primo commit è più pesante (renderizza il modulo): `reactMounted` e il primo paint di testo arrivano **più tardi** di 100–300 ms
  in emulazione (a caldo CPU ×4: 289 → 593 ms), ma con contenuto completo al posto di un guscio vuoto.
- La rimozione dell'attesa di gapi non compare in questa tabella con rete veloce; è visibile nelle richieste (nessuna `api.js`/iframe
  prima del ripristino) e dovrebbe pesare di più su rete mobile reale. **Non misurato su rete reale.**
- Varianza elevata tra esecuzioni sullo stesso computer (decine di ms, alcuni outlier da 5–11 s esclusi dalla mediana): differenze
  inferiori a ≈ 100 ms non vanno interpretate.

## Procedura riproducibile (emulazione)

1. Config temporanea nella radice con porte alternative (Auth 19099, Firestore 19280, hub 19440, logging 19450, websocket 19151,
   UI disattivata), copiando `firebase.json`; `npx firebase emulators:start --only auth,firestore --project demo-nummo --config FILE
   --import emulator-seed`; `FIRESTORE_PORT=19280 node scripts/seed-demo.ts`.
2. Build di produzione fuori da `dist-demo/`:
   `EXPO_NO_DOTENV=1 EXPO_PUBLIC_NUMMO_BACKEND=emulator EXPO_PUBLIC_AUTH_EMULATOR=127.0.0.1:19099 EXPO_PUBLIC_FIRESTORE_EMULATOR=127.0.0.1:19280 npx expo export --platform web --output-dir /tmp/nummo-perf`.
3. `node scripts/measure-startup.mjs --dist /tmp/nummo-perf --cpu 4 --net 4g --runs 9` (opzioni: `--theme`, `--vp`, `--session out`,
   `--hint none|cloud|local`, `--snap DIR` per i fotogrammi a ogni cambio di stato). Serve Chromium (`chromium`) e nessuna dipendenza.
   Per un confronto, costruire e misurare anche la versione precedente (`git stash` o un worktree) con gli stessi parametri.
4. Arrestare gli emulatori (Ctrl+C) e rimuovere la config temporanea. Non usare 8180/9099 se l'utente ha `npm run dev` attivo.

## Procedura sul Pixel 8 (da eseguire: nessun dato reale finora)

Build `cloud` pubblicata solo con autorizzazione (`deploy:hosting -- --channel anteprima` per non toccare il sito live).

1. Installare la PWA dall'anteprima, accedere una volta e chiudere l'app dai Recenti.
2. Collegare il telefono (debug USB), aprire `chrome://inspect/#devices` sul computer, ispezionare la PWA e registrare in **Performance**
   (con «Screenshots») l'apertura dalla Home: avvio a freddo (app chiusa), riapertura dopo > 1 h (token scaduto), con rete 4G e Wi-Fi.
3. Confrontare: colore dello sfondo all'uscita della splash, presenza di schermate senza modulo, tempo fino al modulo con campi,
   tempo fino ad «Sincronizzato», richieste di rete prima del primo `accounts:lookup` (non devono comparire `api.js` né iframe).
4. Provare il login dopo «Esci» e con sessione scaduta: il popup Google deve aprirsi al primo tocco; annotare un eventuale
   `auth/popup-blocked`.
5. Registrare il video dello schermo come nella segnalazione originale e confrontarlo con quello precedente.

## Limiti rimasti

- Nessuna misura su dispositivo reale né su rete mobile reale; effetto di `preconnect` e della rimozione di gapi non quantificato.
- Splash Android: sfondo `#0F1511` (prima `#121212`) e icona statici (WebAPK aggiornato dal manifest solo periodicamente o dopo reinstallazione).
  Con tema chiaro la transizione splash scura → pagina chiara resta visibile.
- Indizio presente ma sessione scaduta o revocata: il segnaposto compare e poi lascia il posto alla schermata di accesso (verificato
  in emulazione, 1 cambio di schermata). Primo accesso o logout: nessun segnaposto.
- FCP e primo paint di testo più tardi di 100–300 ms (emulazione) per il primo commit più pesante.
- Il segnaposto duplica per un attimo il modulo (due istanze montate): costo CPU in più sul percorso critico, accettato.
- Bundle non ridotto; da valutare (divisione dei blocchi, import dinamici) solo se un test reale mostrerà l'avvio a freddo come problema.
