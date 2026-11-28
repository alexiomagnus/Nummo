# HANDOFF — Nummo

## «Categoria predefinita» di Nuova lista intera — 28 novembre 2026 (notte)

Su richiesta (screenshot): il selettore «Categoria predefinita» di Nuova/Modifica lista (`ListDialogs.tsx`) ha `whole`, si apre alla massima altezza su smartphone. `typecheck` e test 632/632; pubblicato con `deploy:hosting` (solo web); non provato sul telefono.

## Filtro Categoria: icona e pannello intero — 28 novembre 2026 (notte)

Su richiesta (screenshot). In Uscite e Abbonamenti il filtro Categoria usa l'icona `tag` (campo e voce «Tutte le categorie») al posto dell'imbuto, che resta solo sul pulsante «Filtri»; il pannello si apre intero su smartphone (`whole`). `typecheck` e test 632/632; pubblicato con `deploy:hosting` su `nummo-6b6e2` (solo web, Rules invariate, nessuna nuova APK); non provato sul telefono.

## Pubblicazione — 28 novembre 2026 (notte, seconda)

`deploy:hosting` su `nummo-6b6e2` dal commit `d755517` («Deploy complete!», solo Hosting, Rules invariate, nessuna nuova APK). Online: Nuova spesa non apre più la tastiera da sola. Non provato sul telefono.

## Niente tastiera automatica in Nuova spesa — 28 novembre 2026 (notte)

Su segnalazione («comportamento odioso»): a ogni arrivo su Nuova spesa il cursore andava in Importo e la tastiera si apriva. Tolto l'effetto da `Workspace.tsx`; `androidShowKeyboard` resta in `services/androidApp.ts` (con test) ma non è più usato. Solo web: nessuna nuova APK. `typecheck` e test 632/632; **non pubblicato** (serve `deploy:hosting`), non provato sul telefono.

## Pubblicazione — 28 novembre 2026 (notte)

`deploy:hosting` su `nummo-6b6e2` dal commit `ab5c271` («Deploy complete!», solo Hosting, Rules invariate, nessuna nuova APK; l'app resta alla 0.3.19). Il sito comprende tutte le modifiche delle sezioni sotto del 28 notte: font dei filtri uniformi su smartphone, pannelli interi (Fuso, categorie preferite), pagina «Liste», pulsante singolo scansione/template a tutta riga, sezione «Visualizzazione», schede e pannello desktop opachi, schermata di aggiornamento non obbligatoria e subito all'avvio. Nulla provato sul telefono.

## Aggiornamento: prima schermata, non obbligatorio — 28 novembre 2026 (notte)

Su richiesta. `AppUpdateCheck` controlla subito all'avvio (tolto il ritardo di 3 s) e, se c'è una release più recente, `UpdateDialog` è la prima cosa sopra l'app; «Più tardi»/Indietro la chiudono e ricompare a ogni riapertura. Tolta la modalità `required` (e la «valvola» sul fallimento, ora inutile). Il controllo è asincrono: con rete lenta la schermata compare appena arriva la risposta, non blocca l'avvio; sopra c'è comunque lo schermo di blocco dell'app se acceso (da verificare l'ordine). Solo nell'app Android 0.3.6+; `typecheck` e test 632/632; non provato sul telefono.

## Schede e pannello opachi — 28 novembre 2026 (notte)

Su richiesta (confronto con Morphe): l'animazione dello sfondo (Neve ecc.) si vedeva attraverso schede e pannello desktop. `glassColors` ha alpha 1 (era 0,78 scuro / 0,88 chiaro) e il pannello desktop di `AppShell` è opaco (era 0,7): l'animazione resta tra le schede. Barre e pillola restano in vetro sfocato. `typecheck` e test 632/632; non visto a schermo.

## Impostazioni: sezione «Visualizzazione» — 28 novembre 2026 (notte)

Su richiesta (screenshot). Scala dell'interfaccia e icona dell'app (con «Reimposta/Applica») stanno in un gruppo «Visualizzazione» sotto «Lingua e ora», visibile solo se almeno una è disponibile; la card della scala ha ora 16 di padding anche in alto. `typecheck` e test 632/632; non visto a schermo.

## Font dei filtri, pannelli interi, «Liste», riga scansione/template — 28 novembre 2026 (notte)

Su richiesta (screenshot). (1) **Filtri su smartphone**: il Fondo passa `large={false}` (Uscite e Abbonamenti), così i tre campi hanno lo stesso testo; da desktop invariato. (2) **`whole`** anche per «Fuso» e per le categorie preferite («Nuova spesa», «Nuove liste»): AGENTS.md aggiornato. (3) La pagina Liste si chiama **«Liste»** (titolo a 34 come «Fondi»; chiave inglese «Liste della spesa» tolta) e «Nuova lista» è alta 48. (4) In Nuova spesa, con un solo pulsante tra «Scansiona scontrino» e «Template», occupa tutta la riga (tolta la metà vuota; l'etichetta breve «Scansiona» solo se affiancati). README: esempio di versione 0.3.19. `typecheck` e test 632/632; non visto a schermo né provato sul telefono; `check` completo non rieseguito.

## Tastiera: schermi in ritardo, Nuova spesa con la tastiera subito — 28 novembre 2026 (notte)

Su segnalazione (due registrazioni dello schermo con l'APK 0.3.18: Uscite → ricerca e Nuova lista). **Analisi**: nei fotogrammi la pagina di Uscite segue la tastiera, ma lo schermo di Nuova lista (`ScreenLayer`) restava indietro: il suo riquadro veniva misurato (`getBoundingClientRect`) e messo in stato React, quindi arrivava un rendering **dopo** l'altezza di `#root`. Misurato su un emulatore Android (Medium Phone API 37, APK di debug, DevTools della WebView, altezza dello schermo e di `innerHeight` a ogni fotogramma): prima l'altezza dello schermo seguiva `innerHeight` con un fotogramma di ritardo (es. finestra 641, schermo 836, «Crea» sotto il bordo visibile), dopo è identica a ogni fotogramma. **Correzione**: su smartphone il guscio è `rootFull` (`left/top 0`, `width/height 100%`, `ScreenLayer.tsx`); lo stato `frame` resta per animazioni e pannelli. Il ritardo più grande dei video (la pagina ferma finché la tastiera è su, poi lo scatto) può avere anche un'altra parte nativa (relayout della WebView a ogni fotogramma di `WindowInsetsAnimation`, 0.3.18): sull'emulatore, lento, le altezze seguono la tastiera passo per passo; **da provare sul telefono**. **Nuova spesa**: a ogni arrivo sulla pagina (dati pronti, nessun dialogo aperto, nessun campo di testo già attivo) il cursore va in Importo e, nell'app, `androidShowKeyboard` chiede la tastiera (`showKeyboard` nel ponte, **serve l'app 0.3.19**: il metodo è nel codice nativo ma la versione non è alzata né rilasciata; senza, resta il cursore). Sull'emulatore con l'APK di debug la tastiera numerica si apre subito all'avvio. `npm run check` OK (632/632, nuovo test del ponte); committato e pubblicato (vedi sotto).

**Release 0.3.19 pubblicata** (28 novembre, notte): `main` a `e6445d7`, `deploy:hosting` su `nummo-6b6e2` («Deploy complete!»), tag e release GitHub `android-v0.3.19` (APK firmato `nummo-0.3.19.apk` 9 248 400 byte + `.sha256`, SHA-256 `6fd8ecb5…6d51`, certificato `00b1c85c…0fcf` verificato con `apksigner`, «Latest», non bozza). Chi ha la 0.3.18 vede l'aggiornamento **obbligatorio** alla prossima apertura. **Da provare sul telefono**: tastiera su Importo in Nuova spesa (`showKeyboard`), schermi (Nuova lista…) che seguono la tastiera senza ritardo; se il ritardo resta, la causa è la parte nativa (relayout della WebView a ogni fotogramma), non riprodotta sull'emulatore.

**Pulizia di HANDOFF** (stesso giorno, su richiesta): da 6770 a ~170 righe; le sezioni dal 27 novembre in giù e i due riallineamenti del 28 sera (superati) sono in `docs/handoff-archive.md`.

## Liste: schermi al posto dei fogli; interruttore di «Altra ora» a destra — 28 novembre 2026 (notte)

Su richiesta (video 16:59). Nuova lista, Modifica lista e Modifica prodotto (`ListDialogs`) non sono più fogli (`variant="sheet"` tolto): sono schermi con il pulsante Indietro, perché con la tastiera il foglio scattava e la tastiera si apriva da sola (nel video, con la 0.3.18, anche dopo `focusTextEntry={!record}`: non indagato; sullo schermo il campo non è più nel foglio che si sposta). Interruttore di «Altra ora»: il `StateLayerPressable` di `OptionRow toggle` metteva icona, testo e interruttore in colonna (`RowContent` è un fragment); ora una riga (`optionToggle`), interruttore a destra del titolo. `typecheck` e test 631/631; `npm run check` OK; commit `3552885` su `main` e `deploy:hosting` su `nummo-6b6e2` («Deploy complete!», solo web). Non visto a schermo né provato sul telefono.

## «Altra ora» con interruttore — 28 novembre 2026 (notte)

Su richiesta (screenshot di Notifiche → Orario): la scheda «Altra ora» non è più solo attenuata; ha un **interruttore** in testa (`toggle` di `OptionRow` in `ActionList.tsx`). Spento: campo «Ora» attenuato (0,38) e `inert`. Acceso (di partenza se l'ora salvata non è Mattina/Pranzo/Sera): nessun segmento selezionato e l'ora si sceglie dal pannello. Scegliere un segmento lo spegne; spegnerlo con un'ora personalizzata riporta a «Mattina». Stato locale in `ReminderTime`, nulla di nuovo salvato. `npm run check` OK; commit `feat: Altra ora with a switch in Notifiche` su `main` e `deploy:hosting` su `nummo-6b6e2` («Deploy complete!», solo web, nessuna nuova APK). Non visto a schermo né provato sul telefono.

## Release 0.3.18 — 28 novembre 2026 (notte)

Commit `chore: Android app 0.3.18` su `main` (versionCode 21, `0.3.18`; il sito era già pubblicato con `482f6b2`: tre pannelli interi, vibrazione Aggiungi/Trasferisci, Nuova lista senza tastiera automatica), tag e release GitHub `android-v0.3.18` (APK firmato `nummo-0.3.18.apk` + `.sha256`, «Latest», non bozza). Chi ha la 0.3.17 vede l'aggiornamento **obbligatorio** alla prossima apertura. La correzione della tastiera (sezione sotto) è **rilasciata ma mai provata sul telefono**: da controllare apertura e chiusura fluide, sfarfallii e peso del relayout; se non va, ripiego solo web (transizione su `--nummo-viewport-height`) o tornare alla 0.3.17 con una 0.3.19.

## Tastiera fluida nell'app Android (0.3.18) — 28 novembre 2026 (notte)

Da una registrazione dello schermo (60 fps, «Nuova lista»): il foglio saltava in **un fotogramma** sopra la tastiera, che lo raggiungeva ~9 fotogrammi dopo. Causa: `MainActivity` imposta il padding in basso dal listener degli inset, e da Android 11 il sistema consegna l'altezza **finale** della tastiera appena parte l'animazione, quindi la WebView si ridimensiona di colpo. Correzione nativa: `WindowInsetsAnimation.Callback` (`DISPATCH_MODE_STOP`) su `root`; durante l'animazione della tastiera (`keyboardAnimating`, da `onPrepare`) il listener non tocca il padding e `onProgress` lo imposta a ogni fotogramma con l'altezza reale; `onEnd` richiama `requestApplyInsets()` per il valore finale. Il lato web non cambia (`batchKeyboardReports` già riunisce i resize ravvicinati). Versione 0.3.18 (versionCode 21); `assembleDebug` OK. **Non provata sul telefono**: da controllare fluidità in apertura e chiusura, assenza di sfarfallii, costo del relayout a ogni fotogramma; se pesa, ripiego solo web (transizione su `--nummo-viewport-height`). Rilasciata (vedi sopra).

## Tre pannelli interi, vibrazione Aggiungi/Trasferisci, AGENTS.md allineato — 28 novembre 2026 (notte)

Su richiesta (screenshot). (1) **`whole` torna, solo per tre pannelli**: «Animazione dello sfondo», Categoria di Nuova spesa/modifica (`ExpenseFields`) e «Modello» della scheda AI si aprono a tutta altezza su smartphone (`whole` di `ChoiceScreen`/`SelectField`/`MenuSelect` → `opensHalf` e `fitPeek` spenti); tutti gli altri pannelli di scelta restano a metà e alti quanto le righe. Se servono interi anche i filtri Categoria o altri, basta aggiungere `whole` al punto d'uso. (2) **Vibrazione** sul selettore Aggiungi/Trasferisci (`haptic` su `SegmentedButtons` di `MovementDialog`). (3) **AGENTS.md** allineato: niente ombra sui pannelli, pannelli di scelta uguali con le tre eccezioni, vibrazione nell'elenco dei punti ammessi. (4) **Nuova lista** non apre più la tastiera da sola su smartphone (`focusTextEntry={!record}` come Nuovo fondo: il focus automatico resta solo con tastiera fisica e mouse; il valore `'touch'` dell'helper resta, con il suo test). `typecheck` e test 631/631 OK; `check` non rieseguito, non visto a schermo né sul telefono; non committato né pubblicato.

## Release 0.3.17 — 28 novembre 2026 (sera)

Commit `861a745` (versionCode 20, `0.3.17`, solo il numero di versione), tag e release GitHub `android-v0.3.17` (APK firmato `nummo-0.3.17.apk` + `.sha256`, «Latest»). Il sito era già pubblicato (`ddd438b`). Chi ha la 0.3.16 vede l'aggiornamento **obbligatorio** alla prossima apertura: prima prova reale dell'obbligo, mai vista sul telefono.

## Barra di scorrimento solo se serve, voce «Liste» animata — 28 novembre 2026 (sera)

Su richiesta (screenshot di Nuova spesa su desktop). (1) **Scrollbar**: sul pannello desktop `AppShell` imposta `overflow-y: hidden` sullo scroller quando il contenuto, **senza il padding in fondo della pagina**, sta già nell'altezza visibile (`ResizeObserver` su scroller e contenuto); basta che una finestra sia di pochi pixel troppo bassa perché il solo padding (32) mostrasse una barra quasi piena. Misurato in Chromium headless a 1502×745: nascosta; con «Ricorrente» acceso (contenuto 850 su 706): compare. (2) **Toggle «Pagina Liste»**: la voce non sparisce più di colpo; `useNavEntries` la tiene in navigazione per la durata dell'uscita (stato derivato nel render, mai assente da un render) e `NavPresence` la anima: nel drawer e nella rail altezza + dissolvenza (`Disclosure grow`, con `appear={false}` per le voci presenti all'avvio, che non si animano), nella pillola dello smartphone quota di larghezza (`flex-grow`) + dissolvenza. Nella pillola l'indicatore usa già il numero di voci finale, quindi durante i ~280 ms può essere un poco fuori posto. **Non provato dal vivo**: lo script headless non è riuscito ad aprire Impostazioni (solo `typecheck`, test 631/631 e build); da guardare a schermo, desktop e telefono. Pubblicato insieme a pannelli uniformi e senza ombra (sezione sotto).

## Pannelli di scelta tutti uguali, niente ombra, scala non su desktop — 28 novembre 2026 (sera)

Su richiesta (screenshot). (1) **Pannelli di scelta uguali**: `ChoiceScreen` apre sempre a metà e alto quanto le sue righe (`opensHalf` + `fitPeek="shrink"`); la prop `whole` (Categoria, Fondo, Modello, Fuso, Ora, Categoria predefinita, Animazione sfondo, Aggiungi/Trasferisci…) è **tolta**: annulla le richieste «intero» del 26–28 novembre (lasciavano molto spazio vuoto, es. Template). «Template» di Nuova spesa ora usa `ChoiceScreen` (con `trailing` = importo) invece di un `ScreenLayer` proprio. Una lista lunga si apre a metà e si tira su. (2) **Nessuna ombra** sopra i bordi sollevati di pannelli, schermi e fogli (`liftShadow`/`flatShadow` di `ScreenLayer.tsx` non disegnano nulla; resta il velo). (3) **Scala dell'interfaccia** non compare più su desktop (`!desktop`, classe `expanded`, anche con puntatore touch/emulazione). (4) **Barra «Reimposta | Applica»**: `Disclosure grow` anima anche l'altezza (riga di griglia 0fr→1fr, stesse curve) oltre a dissolvenza e scorrimento. `check` OK; non visto a schermo; non pubblicato. Se «animazione più smooth» riguardava la molla dei pannelli (`slideSpring`, 220/0,95) e non la barra, dirlo: si ammorbidisce lì.

## Release 0.3.16 — 28 novembre 2026 (sera)

Commit `f5e6d17` (aggiornamento obbligatorio, barra «Reimposta/Applica» animata, docs) su `main` e `deploy:hosting` su `nummo-6b6e2`; poi commit `ba12d85` (versionCode 19, `0.3.16`, **solo il numero di versione**, nessuna modifica nativa), tag e release GitHub `android-v0.3.16` (APK firmato `nummo-0.3.16.apk` + `.sha256`, «Latest», non bozza). Chi ha la 0.3.15 (o 0.3.6+) alla prossima apertura vede «Aggiornamento disponibile» **obbligatorio**: è la prima prova dell'obbligo, mai vista sul telefono. Se non compare o non si installa, controllare permesso «installa app» e che la release sia «Latest». Questa sezione sostituisce «Stato corrente» e «Riallineamento» più sotto per quanto riguarda ciò che è pubblicato.

## «Reimposta/Applica» con animazione — 28 novembre 2026 (sera)

Su richiesta (screenshot). In Impostazioni la barra «Reimposta | Applica» di scala dell'interfaccia e icona dell'app compare e sparisce con `Disclosure` (dissolvenza + scorrimento di 4 dp in entrata, uscita rapida; solo `opacity`/`transform`, movimento ridotto → immediata), la stessa animazione delle opzioni sotto un interruttore. Come per quelle, l'altezza si libera di colpo a fine uscita (non si anima il layout). `typecheck` e test 631/631; non visto a schermo; non pubblicato.

## Aggiornamento obbligatorio all'avvio — 28 novembre 2026 (sera)

Su richiesta. Nell'app Android il controllo degli aggiornamenti parte **a ogni apertura** (prima al massimo ogni 24 ore; `runIfDue` tolto da `useAppUpdate`) e, se c'è una release più recente, `UpdateDialog` si apre con `required`: Indietro/Escape non lo chiudono (`dismissable` falso) e «Più tardi» non c'è; restano «Annulla download» durante il download, «Aggiorna», «Installa». Solo con l'aggiornatore dell'app (0.3.6+): nella 0.3.5 «Aggiorna» apre GitHub e non si forza nulla. **Valvola di sicurezza (mia scelta)**: se download o installazione falliscono («Riprova» mostrato) «Più tardi» ricompare, così una release rotta o un permesso negato non bloccano l'app per sempre. Controllo fallito/offline: silenzio, app usabile. Info → «Controlla aggiornamenti» resta con «Più tardi». `updateCheckDue`/`updateCheckInterval` restano nel dominio (con test) ma non sono più usati. `typecheck` e test 631/631; non visto a schermo né provato sul telefono; non pubblicato. Vale solo per chi ha la 0.3.6+: l'obbligo parte dal sito (web), non richiede nuova APK. Rischio da tenere presente: una release pubblicata con APK non scaricabile (asset assente o hash errato) mostra «Riprova»/«Più tardi».

## «Spese» → «Uscite»; Reimposta/Applica per scala e icona — 28 novembre 2026

Su richiesta. **Rinomina**: la destinazione, il titolo della pagina e la prima vista a segmenti (accanto ad «Abbonamenti») si chiamano «Uscite»; aggiornati «Vista della pagina Uscite», «Torna alle uscite», le note di Liste («sezione Uscite»), la Guida («Da Uscite e Analisi…»), il README e `scripts/check-navigation.mjs`. In inglese «Uscite» = «Outgoings» (la stessa chiave dei fondi, con «Income»; un test la fissa), mentre il resto («Back to expenses», «Expenses page view») resta «expenses». **Non** rinominati: «Nuova spesa», «Elimina le spese», i totali «Spese» del dettaglio del fondo e i nomi interni (`list`, `expenses`). **Conferma come in Morphe** (sostituisce il dialogo): scegliere una scala (al rilascio) o un'icona mostra sotto il controllo due pillole uguali, «Reimposta» (contorno) e «Applica» (piena); finché non si preme, il cursore/l'icona sono solo in anteprima e nulla cambia; «Reimposta» riporta il valore salvato. `ApplyBar` in `SettingsPage.tsx`; chiavi del dialogo tolte da `en.ts`. `npm run check` OK (631/631); non visto a schermo.

## Chiave API più chiara, «Tutte le categorie», «Categoria predefinita» intera — 28 novembre 2026

Su richiesta (screenshot). **Lista scontrini**: la riga dell'interruttore dice ora che serve la chiave API di un servizio AI (Claude, OpenAI o Google Gemini) da inserire sotto, e accendendolo le impostazioni si aprono. **Filtri Categoria** di Spese e Abbonamenti: la voce senza filtro si chiama «Tutte le categorie» (era «Tutte»). **«Categoria predefinita»** di Nuova lista e Modifica lista si apre intera su smartphone (`whole`). `typecheck` e test 631/631; non visto a schermo.

## Pannello tirato in basso: scatto a metà molla — 28 novembre 2026

Su segnalazione (registrazione schermo, «Ordina» da intero a metà). Dai fotogrammi a 120 Hz: al rilascio il pannello passava in **un solo fotogramma** dalla posizione del dito a quella di metà schermo, senza molla. Riprodotto in Chromium headless (CDP, tocco simulato, `top` letto a ogni fotogramma): la molla partiva (233 → 450) e a 180 ms `top` saltava a 515. Causa: nei pannelli con `fitPeek` il `ResizeObserver` del contenuto (`ScreenLayer.tsx`) scattava **mentre il pannello si accorciava** (l'altezza cambia con `top`), misurava un picco diverso di 1 px e chiamava un nuovo `settle('peek')`, la cui animazione sostituiva quella in corso (stessa proprietà) e portava il pannello alla fine di colpo, poi un ritocco di 1 px. Correzione: l'osservatore aspetta la fine delle animazioni del pannello (`getAnimations`) prima di rimisurare e ignora scarti fino a 1 px (prima ≥ 1). Dopo: curva continua da 233 a 515, nessun ritocco finale. Riguarda **tutti** i pannelli con `fitPeek`: Ordina, Periodo, Fondo, Categoria, selettore della data, Modifica categoria, Aggiungi/Trasferisci, rinomina Esercente; i pannelli senza `fitPeek` (Template, Prodotti) non usano l'osservatore. Misurato solo in headless (senza il peso del telefono); da riprovare sul dispositivo. `npm run check` da rieseguire; non pubblicato.

## Ombra dei pannelli troppo pesante — 28 novembre 2026

Su segnalazione (registrazione schermo, Analisi con «Periodo» a metà): sopra il bordo del pannello restava una macchia scura sopra i blocchi colorati. Analisi dai fotogrammi e dal codice: l'ombra di `ScreenLayer` usava il colore pieno del `backdrop` (nero al 64 % nello scuro) con sfocatura 32 px e scarto −12, **sopra** il velo che già scurisce la pagina; il pannello è quasi dello stesso colore della pagina, quindi il bordo si leggeva solo come una fascia nera doppia. Ora `liftShadow`/`flatShadow` (`ScreenLayer.tsx`): 0 −4 14 con il 40 % dell'opacità del `backdrop`, stesso colore per la forma piatta, così l'animazione cambia solo la dimensione. Vale per pannelli, schermi e fogli (tutti i punti con ombra). `npm run check` OK (631/631). Non visto a schermo né provato sul telefono; non pubblicato. «Pagina Liste» è già **accesa di base** (`listsEnabled: true`, test in `preferences.test.ts`): nessuna modifica.

## Pubblicazione e release 0.3.15 — 28 novembre 2026 (pomeriggio)

Commit `5918e9c` su `main`, `deploy:hosting` su `nummo-6b6e2` («Deploy complete!»), poi release GitHub `android-v0.3.15` (APK firmato `nummo-0.3.15.apk` + `.sha256`, «Latest»). Il sito comprende barra di navigazione sotto la maniglia, conferme di scala e icona, interruttore «Pagina Liste», Fondo/Template interi. Nessuna delle voci è stata provata sul telefono: da controllare con la 0.3.15 installata (pillola e FAB sopra la maniglia, fogli, tastiera).

## Fondo e Template si aprono interi — 28 novembre 2026

Su richiesta (screenshot): il selettore «Template» di Nuova spesa (`opensHalf` tolto), il campo «Fondo» del modulo (`FundField`, `whole`) e il filtro «Fondo» di Spese e Analisi (`FundFilter`, `whole`) su smartphone si aprono alla massima estensione, come Categoria. Da medium invariato. `typecheck` OK; non visto a schermo.

## Conferme per scala e icona; pagina Liste disattivabile — 28 novembre 2026

Su richiesta (`npm run check` OK). **Conferma**: cambiare la scala dell'interfaccia (al rilascio del cursore) o l'icona dell'app apre un dialogo `alert` («Cambiare la scala dell'interfaccia?» / «Cambiare l'icona dell'app?», Annulla/Cambia, `ConfirmChangeDialog` di `SettingsPage.tsx`); con «Annulla» il cursore torna al valore salvato (remontaggio con `scaleKey`) e l'icona non cambia; scegliere quella già attiva non chiede nulla. **Pagina Liste**: interruttore «Pagina Liste» in Impostazioni → Funzionalità (`listsEnabled` in `nummo.preferences.v1`, acceso di base, riportato da «Ripristina predefiniti»): spento, la destinazione sparisce da barra, rail e drawer, `ListsPage` non si monta e, se si era lì (Indietro, cronologia), si passa a Spese; le liste restano nell'archivio e nel backup, i listener restano attivi. «Mostra liste archiviate» resta visibile anche con Liste spenta. `typecheck` e test 631/631; non visto a schermo.

## Barra di navigazione di Android: solo la maniglia, come Morphe — 28 novembre 2026

Su richiesta (screenshot di Nummo e Morphe): in Nummo sotto la pillola restava una fascia di separazione tra l'app e la barra di sistema (la `WebView` era riempita in basso con l'inset della barra). Ora, come già in alto dalla 0.3.12, la pagina disegna **sotto** la barra di navigazione e si vede solo la maniglia dei gesti. App **0.3.15** (versionCode 18, non ancora rilasciata né installata): `MainActivity` non dà più padding in basso per la barra (solo per la tastiera), ponte `bottomInset` facoltativo e `window.nummoAndroidInsets(top, bottom)`; con la tastiera aperta il basso vale 0. Web: `androidBottomInset`/`currentBottomInset` in `services/androidApp.ts`, `useInsets().bottom` (pillola, schermi, fogli, snackbar già lo usano; senza il metodo vale 0: browser e app ≤ 0.3.14 invariati). Ordine di uscita: prima `deploy:hosting`, poi la release 0.3.15. `typecheck`, test 630/630 e `assembleDebug` OK; **non provata sul telefono**: da controllare pillola e FAB sopra la maniglia, fogli e dialoghi in basso, tastiera.

## Pubblicazione — 28 novembre 2026

Commit `27d0bc0` su `main`, `npm run check` OK, poi `deploy:hosting` su `nummo-6b6e2` («Deploy complete!», Rules invariate). Il sito comprende tutte le modifiche del 28 novembre elencate sotto (Filtri, tema chiaro, barre opache, totali, guida in cima, selettore Aggiungi/Trasferisci, scansione con Indietro, vibrazioni, avatar Anello, rivelazione del tema, ecc.). Nessuna nuova APK: l'inset della fotocamera richiede l'app 0.3.12+, già rilasciata. Nulla di questo è stato provato sul telefono.

## «Modello» (scheda AI) si apre intero — 28 novembre 2026

Su richiesta: il selettore «Modello» di «Lista scontrini» usa `whole` (su smartphone il pannello si apre alla massima apertura e non a metà, come Categoria e Fondo). `typecheck` OK; non provato a schermo. Se dopo l'apertura piena restava comunque a metà, serve verificare `ChoiceScreen`.

## Cambio tema: l'animazione a cerchio a scatti — 28 novembre 2026

Su segnalazione («a volte laggava»). Analisi dal codice, **senza misure sul dispositivo**: (1) durante la rivelazione lo snapshot nuovo è vivo e ridisegna la pagina a ogni fotogramma, e dietro il vetro si muovevano da soli i cerchi CSS (`[data-orb]`) e le animazioni su canvas di `Orbs.tsx` (JS a ogni fotogramma, più il ricalcolo dei livelli sfocati sopra); (2) il rendering sincrono (`flushSync`) di tutto l'albero col nuovo tema, comprese le pagine nascoste conservate, ritarda l'avvio (non toccato: costo del cambio di tema stesso); (3) il canvas dello sfondo si ricrea al cambio d'inchiostro. **Correzione**: attributo `data-theme-revealing` (`themeRevealAttribute` di `themeTransition.ts`) dall'inizio alla fine della rivelazione: i cerchi CSS vanno in pausa e i canvas disegnano un solo fotogramma fermo (così il nuovo non è vuoto) e poi nulla; al termine tutto riprende. Se lo scatto resta all'avvio, il passo successivo sarebbe ridurre il rendering delle pagine nascoste (`Activity`) al cambio di tema. Non provato sul telefono; `typecheck` e test 630/630.

## Sesto avatar del profilo: «Anello», grigio — 28 novembre 2026

Su richiesta: nuovo avatar `ring` («Anello», «Ring»): anello spesso attorno a un piccolo disco, in grigio neutro. Per averlo davvero grigio (non il blu-grigio di `slate`) è stata aggiunta la tinta `graphite` a `iconPalette.ts` (chiara e scura, superata dai test di contrasto della palette). Test sugli avatar portati a sei. Il valore salvato dei profili esistenti non cambia. Non visto a schermo.

## «Animazione dello sfondo» come riga, sul modello di Morphe — 28 novembre 2026

Su richiesta (screenshot di Morphe): in Impostazioni → Aspetto la scelta non è più un campo con contorno dentro una scheda ma una riga con l'icona dell'animazione attuale, il titolo, la scelta corrente sotto e il chevron; al tocco si apre lo schermo di scelta (`ChoiceScreen`) come prima. Nuova prop `row` di `MenuSelect` (solo con `panel`), usata solo qui. `typecheck` OK; non visto a schermo. Se piace, lo stesso schema vale per altre scelte singole (Lingua, Tema, Carattere…): chiedere.

## Testi di «Vibrazione» e «Modalità AMOLED» accorciati — 28 novembre 2026

Su richiesta: «Una breve vibrazione quando tocchi l'app.» e «Sfondo nero puro nel tema scuro.» (traduzioni e test aggiornati). Test 630/630.

## Vibrazione sulle Barre, spunta immediata nelle liste — 28 novembre 2026

Su richiesta (screenshot). **Analisi, Barre**: la scheda di una categoria vibra al tocco come blocchi, ciambella e legenda (`BarChart.tsx`, `useHaptics`; solo app Android). **Liste, checklist**: la casella sembrava poco reattiva perché la spunta compariva solo dopo lo snapshot dello store (in Standard una transazione IndexedDB con durabilità `strict`). `ItemRow` ora mostra subito il nuovo stato (`pending`, tolto all'arrivo dello snapshot o se la scrittura è rifiutata) e `toggleItem` riceve il valore voluto (`onToggle(item, checked)`, restituisce l'esito), così anche due tocchi ravvicinati sono coerenti. Il contatore «n di m acquistati» e la barra restano legati allo snapshot. `typecheck` e test: vedi sotto; non provato sul telefono.

## «Scansiona scontrino» con Indietro, titolo della fotocamera sotto la barra di stato — 28 novembre 2026

Su richiesta e segnalazione (screenshot). **Dialogo**: `ScanReceiptDialog` non è più un pannello a tre posizioni (`detents` tolto): su smartphone è uno schermo intero con Indietro e senza maniglia né trascinamento; da medium invariato. **Fotocamera** (`CameraViewfinder`): il titolo e la torcia finivano sotto l'orologio perché nell'app Android la pagina disegna sotto la barra di stato (0.3.12) e `env(safe-area-inset-top)` vale 0; la fascia in alto usa ora `useInsets().top` (ponte `topInset`). `typecheck` e test 630/630; non visto a schermo né provato sul telefono (richiede app 0.3.12+ per l'inset).

## Aggiungi/Trasferisci: selettore in cima al dialogo — 28 novembre 2026

Su richiesta: `MovementDialog` ha in cima un `SegmentedButtons` «Aggiungi | Trasferisci» (tipo iniziale = pulsante premuto; passando a Trasferisci «Dal fondo» prende il primo fondo diverso da quello di destinazione; errori azzerati; importo, data e nota restano). Con un solo fondo movibile il selettore non c'è. Titolo e pulsante di conferma seguono il tipo. Traduzione «Tipo di movimento». `typecheck` e test 630/630; non visto a schermo.

## «Altra ora» attenuata con Mattina/Pranzo/Sera — 28 novembre 2026

Su richiesta (Notifiche → Orario): con una delle tre scelte rapide selezionate la scheda «Altra ora» è attenuata (opacità 0,38, come le schede spente). **Non è `inert`**, di proposito: i segmenti non si deselezionano, quindi scegliere un'ora lì è l'unico modo di tornare a «Altra ora», e la scheda torna piena. La scheda è avvolta in un `View` (figlio diretto del gruppo vetro: l'attenuazione copre anche il fondo). `typecheck` OK; non visto a schermo.

## «Il nuovo nome vale anche per la spesa che lo usa» tolta — 28 novembre 2026

Su richiesta: nel dialogo di rinomina di «Esercenti» (`MerchantsPage.tsx`) non c'è più la nota sotto il campo (singolare e plurale, traduzioni tolte). Resta l'avviso di unione quando il nome esiste già. `typecheck` e test 630/630.

## La guida si apriva a metà pagina — 28 novembre 2026

Segnalazione (screenshot): «Cos'è Nummo?» da Info si apriva dove Info era stata scorsa. Causa: lo scroller condiviso torna a 0 solo al cambio di `selected`, e la guida sostituisce il contenuto **nella stessa pagina**. Verificato lo stesso nella guida aperta dalla scelta della modalità e dall'accesso (`ModeChoice`, `SignIn`); le altre pagine cambiano `selected` o aprono schermi (overlay con scroll proprio), quindi non risultano toccate. Correzione: `useScrollToTopOn(chiave)` di `AppShell.tsx` (contesto `ScrollTopContext`), usato con `guide` in `InfoPage`, `ModeChoice` e `SignIn`; vale anche al ritorno («Torna indietro» riporta Info in cima). `typecheck` OK; non provato a schermo.

## Vibrazione su «Filtri» — 28 novembre 2026

Su richiesta: `FiltersButton` (Spese e Abbonamenti, smartphone) chiama `useHaptics()` al tocco, come «Salva». Solo nell'app Android (nel browser nessuna vibrazione). `typecheck` OK; non provato sul telefono.

## Niente linee di separazione ai bordi dei dialoghi — 28 novembre 2026

Su richiesta, da uno screenshot di «Note di rilascio» (la linea sotto l'ultima voce): `AppDialog.ScrollArea` non disegna più i bordi 1 px che comparivano sul lato con contenuto nascosto (`scrollEdges.ts` e `tests/scrollEdges.test.ts` rimossi, il layout non cambia: i bordi trasparenti erano solo un padding da 1 dp, ora assente, quindi il contenuto sale/scende di 1 dp). Tolti anche il `Divider` del menu dell'account, il filtro di riga di `DailyBreakdown` (Analisi) e uno stile `details` inutilizzato di `FundsPage`. Restano i contorni delle schede (`glassBorder`) e il linguaggio vetro. Se «sezione di separazione» voleva dire anche i contorni delle schede, chiedere. `typecheck` OK; non visto a schermo.

## Meno totali: Spese senza scheda «Totale», Analisi con una scheda sola — 28 novembre 2026

Su richiesta, dopo il confronto delle due pagine. **Spese** (`ExpenseList.tsx`): la scheda «Totale» non c'è più; con una ricerca, il filtro Categoria o un fondo attivi compare una riga discreta «n spese | importo» (totale di tutti i risultati, non solo della pagina caricata); senza filtri nulla, restano i totali mensili. Sort non conta come filtro. **Analisi** (`Dashboard.tsx`): un solo riquadro «Totale nel periodo» con importo e, sotto, «date | n transazioni» (prima due riquadri affiancati; la distanza di 12 aggiunta poco prima non serve più). `AGENTS.md` aggiornato. `typecheck` e test 631/631; non visto a schermo, non pubblicato.

## Abbonamenti: Categoria e Ordina — 28 novembre 2026

Su richiesta. Verificato nel codice: il filtro Fondo **segue** la scheda «Prossimo mese» (`renewals`/`soon` da `shownEntries`), quindi anche Categoria la restringe (scelta coerente con Fondo, diversa da quanto avevo proposto prima). `Workspace` tiene `subCategoryChoice` (una categoria sparita vale «Tutte»), passa `categoryFilter`/`onCategoryFilter` a `SubscriptionList` e un `emptyLabel` per fondo o categoria. «Ordina» è locale alla lista: `subscriptionSortOptions` (Prossimo rinnovo, predefinito = ordine di prima; Importo più alto/basso; Nome A–Z) e `sortSubscriptions` in `domain/history.ts`, con gli attivi sempre prima di pausa e annullati (test nuovo, 631/631). Smartphone: nel pannello «Filtri» con Fondo (il conteggio include categoria e ordine diverso dal predefinito); da medium Ordina e Categoria stanno sotto la ricerca, come in Spese. Un filtro che lascia la lista vuota non fa sparire i controlli. Non visto a schermo né provato sul telefono; non pubblicato.

## Spese su smartphone: pulsante «Filtri» — 28 novembre 2026

Su richiesta. Solo smartphone, vista «Spese» e, dal 28 novembre sera (su richiesta), anche «Abbonamenti» (stessa riga ricerca + «Filtri» con `FiltersButton`; il pannello aveva solo Fondo (poi, lo stesso giorno, anche Categoria e Ordina: vedi la sezione «Abbonamenti: Categoria e Ordina»); con un fondo che non lascia abbonamenti la riga resta, per poterlo cambiare); non Analisi: ricerca e pulsante «Filtri» (con «Filtri · n» se ci sono filtri attivi, tonale) sulla stessa riga; il pannello a scomparsa (`Reveal`, chiuso di base) contiene **Fondo** e **Categoria**; **Ordina** (dal 28 novembre sera, su richiesta, dentro il pannello; conta come filtro attivo se non è «Più recenti»). `Workspace` passa il `FundFilter` a `ExpenseList` (`fundFilter`, `fundActive`); da medium e negli Abbonamenti il Fondo resta sopra la lista come prima. Stato dei filtri invariato (solo presentazione). Traduzioni in `en.ts`. `typecheck` e test 630/630; **non visto a schermo** né provato sul telefono. Correzioni dopo il primo deploy (su segnalazione): spazi di 12 tra i campi (mancava lo stile `toolbar`) e «Filtri» alto 50 come il riquadro visibile della ricerca (i 56 dp del campo includono 6 dp sopra il contorno, come per «Aggiungi» in Liste).

Sessione hybrid: il lock `.firebase/hybrid.lock` del 26 novembre (PID 199921, non più attivo) era rimasto; la cartella di sessione conteneva solo `cli-config`, nessun export da recuperare, `emulator-data/` intatta: lock rimosso su richiesta.

## Tema chiaro più vicino a Morphe — 28 novembre 2026

Su richiesta, da due screenshot (Nummo e Morphe, Material You chiaro). `glassColors` (`palette.ts`), solo chiaro: schede col tono `surfaceContainer` (prima bianco `surfaceContainerLowest`) al 88 % (prima 72 %), contorno più marcato (mix 0,5 invece di 0,3 verso lo sfondo), barre dello stesso tono. Il tema scuro non cambia. Vale per tutti i colori, non solo Material You. Calibrazione approssimata, non provata sul telefono né pubblicata (nessun commit); da riguardare: contrasto di testo e icone sulle nuove schede. Non toccati: sfondo, pulsanti attivi, grandi riquadri (Totale), cursore.

## Barre senza blur nel browser — 28 novembre 2026

Su richiesta: nel browser e nella web app installata (le barre di sistema di Android restano a colore fisso, vedi `AGENTS.md`) barra in alto, pillola di navigazione e menu ancorati sono opachi, senza `backdrop-filter` (`blurBars = inAndroidApp()` in `AppShell.tsx`, stesso criterio in `Overlay.tsx`). Nell'app Android il vetro sfocato resta. Layout invariato. Schede e gruppi restano in vetro traslucido. Non provato a vista.

## Prodotti di lista senza conferma, Invio che aggiunge, colori nel browser — 28 novembre 2026

Su richiesta, dalle immagini dell'utente. `npm run check` non rieseguito (typecheck e test 630/630); nulla provato sul telefono; non su Hosting.

- **«Modifica prodotto»**: «Elimina» toglie il prodotto subito, senza dialogo (`confirm={false}` di `DeleteAction`, solo lì).
- **«Aggiungi prodotto»**: `returnKeyType`/`enterKeyHint` «done»: il tasto Invio della tastiera aggiunge il prodotto invece di portare al campo «Totale spesa».
- **Colore nel browser** (bug): con `colorMode: 'system'` salvato e senza palette di sistema, `buildScheme` forzava l'accento a «Grigio»: pallini tutti grigi (uno solo) e scelta del colore senza effetto. Ora vale «Palette» con l'accento scelto, anche in `accentSwatches`. Test aggiornato.
