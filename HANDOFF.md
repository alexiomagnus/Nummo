# HANDOFF — Nummo

## Deploy Hosting autorizzato — 9 novembre 2026, ~03:27 Europe/Rome

- Su richiesta esplicita dell'utente: `npm run check` OK (typecheck, 321/321, build demo), poi
  `npm run deploy:hosting` (solo Hosting, Rules non toccate) su nummo-6b6e2, sito LIVE. Pubblicato il working tree
  non committato: contenuto a tutta larghezza, Salva desktop min 192 px, manifest `theme_color` `#121212`,
  script build/deploy Windows. Base Git `5e67dcf`, **nessun commit**: il sito non corrisponde a un commit.
- Verificato via HTTP: index.html live referenzia il bundle `index-069e9b72….js` di `dist/` (HTTP 200), manifest
  live con `theme_color` `#121212`. Login, caricamento dati e resa nel browser di produzione non verificati.

## Contenuto a tutta larghezza del pannello — 9 novembre 2026

- Screenshot utente 1920×1080 (monitor 24"), hybrid su localhost:8081: Nuova spesa in una colonna
  centrata di 800 px con ampie fasce vuote. Richiesta: il contenuto deve occupare tutta la card anche su
  schermi grandi. Sostituisce la fase «Larghezze desktop per attività» qui sotto.
- Rimossi `contentMaxWidth` (AppShell), `pageWidths` (Workspace) e i token `maxContent`, `pageForm`,
  `pageList`, `pageOverview`: `styles.content` è a larghezza 100% senza centratura. Conservato Salva su
  expanded non espanso (minimo 192 px). Aggiornati AGENTS.md e docs/architecture.md.
- `npm run check` con script-shell Git Bash **OK**: typecheck, **321/321**, build demo 588 moduli.
  Resa a 1920×1080 e su monitor ultrawide non riverificata visivamente da questa sessione.
- Avvio locale: lock orfano del PID 14940 (sessione `hybrid-LzwWoK` senza export/previous, processo assente)
  rinominato in `.firebase/hybrid.lock.stale-14940`; `npm run dev -- --port 8081` avviato, HTTP 200.
  Nello screenshot «Accesso negato: verifica UID del proprietario e regole»: probabile `config/owner`
  dell'archivio locale assente o diverso dall'UID di login; non indagato né modificato.
- La sessione hybrid (PID 11888, `.firebase/hybrid-NpA797`) si è chiusa da sola: Firestore Java uscito con
  0xC000013A (segnale Ctrl+C/chiusura console, origine non identificata), export non confermato. Nessun export
  nella sessione, `emulator-data/` invariato (01:20–01:23): lock rinominato in `hybrid.lock.stale-11888`, riavviato
  su 8081 (HTTP 200). **`emulator-data/` contiene solo i metadati dell'export, nessun documento**: l'archivio locale è
  vuoto, quindi manca anche `config/owner`. La cartella `recovery/` citata sotto non esiste più.

## Barra di navigazione Android dell'app installata — 9 novembre 2026

- Sorgente Chromium (main): in una WebAPK standalone la barra di navigazione usa solo il `theme_color` del manifest
  salvato nella WebAPK (`WebappIntentDataProvider.getNavigationBarColor`, flag `WebAppNavigationBarThemeColor` attivo
  di default). Il meta `theme-color` dinamico la cambia solo in edge-to-edge, che per le app installate Chrome usa
  solo nel visualizzatore multimediale o in fullscreen con flag disattivato. `dark_theme_color` non viene letto dal
  parser del manifest e dipenderebbe dalla modalità notte di sistema. Seguire il tema di Nummo: **non possibile**.
- Causa probabile della barra chiara: WebAPK installata col `theme_color` `#F5FBF5` del commit `96777ac`. Produzione
  (GET pubblico del manifest, nessun'altra lettura) serve già `#0F1511` (Last-Modified 9 nov 02:07 GMT); la WebAPK
  si aggiorna solo dopo la verifica giornaliera al lancio, con app chiusa, in carica e su Wi-Fi, oppure reinstallando.
  In alternativa, Chrome precedente alla logica lascia il colore di sistema. Versione Chrome dell'utente non nota.
- Modifica: `theme_color` `#121212` (ripiego scuro richiesto); `background_color` `#0F1511` (splash), meta
  `theme-color` runtime, `color-scheme`, viewport, safe area, layout e temi invariati. Nuovo `tests/manifest.test.ts`.
  Corrette AGENTS.md, docs/architecture.md, docs/avvio-prestazioni.md (l'attribuzione a `background_color` su
  Android 15+ era errata).
- `npm run check` con script-shell Git Bash **OK**: typecheck, **321/321**, build demo; manifest esportato con
  `#121212`. Non verificato su Android: serve `npm run deploy:hosting` (autorizzazione) e aggiornamento o
  reinstallazione della WebAPK. Nessun commit o deploy.

## Larghezze desktop per attività — 9 novembre 2026

- Screenshot 1920×1080: Nuova spesa dilatata a 1440 px, pulsante Salva a tutta riga.
  Diagnosi nel codice: unico maxContent per tutte le schermate, ExpenseForm senza
  limite e pulsante con flexGrow:1 indipendente dalla classe desktop.
- AppShell riceve contentMaxWidth; Workspace assegna token per pagina: modulo 800,
  Spese/Liste/Categorie/Backup/Impostazioni 1120, Dashboard/Fondi 1280 px. Titolo,
  contenuto e azioni condividono l'allineamento, colonna centrata e larghezza 100%
  sotto il limite; il pannello resta esteso. Startup usa la stessa larghezza del modulo.
  Salva su expanded non cresce e ha minimo 192 px; mobile/tablet invariati.
- Nessuna modifica a dati/Rules/logica, nessun nuovo testo UI o dipendenza.
  Check con Git Bash OK: typecheck, 319/319 test, build demo 588 moduli.
  Browser host e pipe Computer Use indisponibili: screenshot dopo, zoom 125/150%,
  monitor ultrawide e resa mobile non verificati visivamente. Nessun commit/deploy.

## Correzione autorizzata categoria cloud bus → train — 9 novembre 2026

- Con autorizzazione esplicita, aggiornata la sola categoria non valida su nummo-6b6e2:
  icon bus → train, revision +1 e updated_at server. Commit REST con precondizione
  updateTime del documento appena letto, senza retry automatici.
- Riletta la collezione: 10/10 categorie accettate da parseSyncedCategory, zero invalide.
  Verificati gli altri campi del documento invariati e le altre categorie identiche.
  Nessuna spesa letta/modificata, nessun deploy o modifica Rules. Nessun contenuto
  personale/ID/credenziale nei log. Da confermare la scomparsa dell'errore nell'app;
  le altre collezioni non sono state controllate. Nessuna modifica applicativa,
  test/build non necessari per questa singola correzione dati verificata sul server.

## Diagnosi archivio di produzione in sola lettura — 9 novembre 2026

- Autorizzata dall'utente la diagnosi sul cloud. Letto config/owner e la sola collezione
  categorie del proprietario su nummo-6b6e2, tramite GET e sessione CLI esistente.
  10 categorie controllate: una rifiutata dal decoder attuale esclusivamente perché
  `icon` vale `bus`, ID rimosso. Sostituendo solo icon con null nella copia in memoria,
  parseSyncedCategory accetta il record: gli altri campi di quella categoria sono validi.
- Nessuna scrittura cloud, deploy o lettura delle spese; nessun nome categoria, UID,
  ID documento o credenziale stampato. Diagnosi conferma una causa del blocco,
  non certifica le altre collezioni (non lette). Proposta: cambio esplicito bus → train
  sulla sola categoria interessata, con controllo della revisione e timestamp aggiornato;
  modifica cloud ancora da autorizzare. Non rieseguiti test/build: nessuna modifica applicativa.

## Preparazione produzione e CLI Windows — 9 novembre 2026

- Segnalato deploy bloccato per PROJECT_ID mancante: `.env.production.local` assente,
  creato con le sole quattro variabili pubbliche già compilate in `.env.local`.
  File ignorato da Git, nessun valore di configurazione sensibile stampato.
- Dry-run iniziale fallito: spawnSync('npx') su Windows restituisce ENOENT (riprodotto
  anche con --version). build-cloud/deploy-hosting ora eseguono le CLI locali Expo/Firebase
  tramite process.execPath e createRequire, senza shell; errori di avvio espliciti.
- `deploy:hosting -- --dry-run` OK: build cloud validata, target nummo-6b6e2,
  solo Hosting, nessuna pubblicazione. `check` OK: typecheck, 319/319 test e build demo;
  diff check OK. Nessuna modifica alle Rules o ai dati, nessun deploy o commit.
  Restano i controlli di compatibilità icone descritti sotto prima del rilascio effettivo.

## Overlay condivisi: selettori, menu e dialoghi senza glitch — 9 novembre 2026

- Fonte: video `C:\Users\aless\Downloads\video_2026-11-09_02-16-22.mp4` (69 fotogrammi esaminati, Nuova spesa su
  Android). Cause nel codice: Paper `Menu` (scala da zero, chiusura con dissolvenza lunga), Paper `Modal` (uscita
  decelerata: contenuto semitrasparente oltre lo scrim), altezza del menu Categoria calcolata fino al bordo dello
  schermo ignorando la pillola. `PaperProvider` con tema esplicito forza `animation.scale` a 1: il movimento ridotto
  impostato da `createTheme` non arriva a Paper (preesistente, anche per animazioni Paper interne non sostituite).
- Nuovo `src/components/Overlay.tsx` (`usePresence`, `AnchoredMenu`, `BottomSheet`, `Scrim`): transizioni CSS solo
  opacity/transform, superfici opache entro 100 ms, uscita accelerata, Escape, focus alla prima voce e ritorno con
  `preventScroll`, nulla montato da chiusi. `SelectField`/`MenuSelect`: foglio dal basso su compact, menu ancorato
  sotto/sopra da medium; `AccountMenu` sul menu ancorato; `AppDialog` con modale propria (Title/Content/ScrollArea/
  Actions Paper invariati). Geometria pura in `menuGeometry.ts` (`menuVerticalPlacement`, `sheetDragOutcome`), helper
  `transitions` in `motion.ts`, token `motion.fade/exit/exitEasing`, traduzione «Chiudi menu». Logica, dati, servizi,
  Rules e dipendenze invariati. Aggiornati AGENTS.md e docs/architecture.md.
- Verifiche: `npm run check` con script-shell Git Bash **OK** (typecheck, **319/319**, build demo 590 moduli).
  Chrome headless (CDP) su build demo prima/dopo con emulatori dedicati (Auth 39199, Firestore 39380, Hub 39417;
  39400 era occupata da altro processo, non toccato), 10 categorie demo aggiunte nell'emulatore, touch emulato.
  Prima, 412×915: menu fino a y 840 (pillola da 839), contenuto semitrasparente ~140 ms in apertura e chiusura,
  coda del calendario sotto 0,3 di opacità per ~120 ms. Dopo: foglio opaco in ogni frame (0 frame parziali), calendario
  in chiusura 11 frame parziali, ultimo visibile ~70 ms dopo l'avvio dell'uscita; menu ancorati a 820×1000 e
  1280×900 sotto il campo ed entro il viewport; 320×740 e 412×915 senza overflow orizzontale; Escape e scelta
  restituiscono il focus al campo; viewport ridotto al 55% con campo Importo a fuoco (sostituto della tastiera):
  pillola nascosta, foglio entro l'area visibile; selettore Mese dentro «Nuovo fondo»: foglio sopra il dialogo,
  scroll del dialogo invariato; movimento ridotto emulato: apertura/chiusura immediate. Nessun errore JS.
  Config temporanea `.nummo-overlay-review.json` rimossa, emulatori propri arrestati; hybrid utente su 8180 non toccato.
- Non verificati: tastiera virtuale reale Android/iOS, trascinamento della maniglia su touch reale, screen reader,
  Safari/Firefox, telefono dello screenshot. Rimasto di Paper: animazione delle etichette dei `TextInput` (non
  disattivata dal movimento ridotto per il problema di `animation.scale`). Possibile correzione separata: ripassare
  il tema con `ThemeProvider` dentro `PaperProvider` in `App.tsx` (non fatta: file modificato da un'altra sessione).
  Nessun commit o deploy.

## Ripristino discreto nelle impostazioni — 9 novembre 2026

- `SettingsPage`: rimosso il pulsante pieno finale. «Ripristina predefiniti» è ora
  un Button text subito sotto le opzioni Stile delle icone, con icona rotate-ccw
  SVG e `colors.secondary`, senza sfondo, bordi o contenitori aggiuntivi.
  Spaziatura della sezione esistente, target minimo 48 dp e feedback Paper.
  Callback onReset e preferenze predefinite invariati; traduzione EN e caso i18n aggiornati.
- `npm run check` con script-shell Git Bash OK: typecheck, 319/319 test, build demo
  (590 moduli). Resa browser/Pixel non verificata. Nessun commit o deploy.

## Avvio web, temi e ripresa PWA — 9 novembre 2026

- Analisi del codice effettivo, manifest, HTML, GlobalStyle, safe area e startup. Video indicato
  `C:\Users\aless\Downloads\video_2026-11-09_02-16-26.mp4` non disponibile: `Test-Path` false,
  ffprobe «No such file or directory». Nessun fotogramma esaminato. Browser access host e pipe nativa
  risultano indisponibili; nessuna verifica visiva eseguita. Non attribuire il logo sovrapposto o i
  ritagli del launcher a una causa dimostrata. Nel codice non esiste una splash centrale col logo:
  c'è il logo nella testata; la splash installata è generata da Chrome/Android dal manifest.
- Cause dimostrate e correzioni: `StartupWorkspace` disegnava un secondo modulo con categorie vuote;
  ora mostra shell e caricamento. Il limite di 4 s liberava anche il modulo incompleto: ora libera
  la navigazione, mentre il modulo reale resta misurabile ma invisibile e `inert` finché mancano
  spese/categorie utilizzabili/fondi (gli errori restano esposti). Conservate bozze e blocchi d'invio.
- `GlobalStyle`/`bootTheme`: lo schema inline di html rimaneva quello del boot dopo un cambio tema;
  ora canvas html/body, variabile boot, color-scheme e unico meta theme-color seguono il tema prima
  del paint. HTML colora anche la radice. Regressione testata su cambio scuro/chiaro/scuro e meta assente.
- Manifest: allineato theme_color a background_color scuro già presente (#0F1511), eliminando la
  discordanza statica. Non promette adattamento della splash al tema chiaro o alle tinte personali.
  Corrette in architecture.md le affermazioni non dimostrate sulle singole versioni Android.
- `observeViewportHeight`: mancavano i segnali di ripresa; ora ignora misure da pagina nascosta e
  rimisura su visibilitychange/pageshow anche senza resize. Test di Home/multitasking simulati,
  cleanup, tastiera, rotazione e zoom. È una lacuna dimostrata, non una riproduzione dei glitch Pixel.
- Verifiche: `npm.cmd --script-shell="C:\Program Files\Git\bin\bash.exe" run check` OK:
  typecheck, **316/316 test**, build demo (588 moduli); `check:env` OK. Un errore di tipo nel nuovo
  fake DOM del test è stato corretto prima dell'esecuzione finale verde. Nessuna nuova libreria,
  modifica a servizi/Rules/dati, commit o deploy. Suite SDK/emulatori e hybrid non rieseguite
  (nessuna modifica ai relativi percorsi).
- Matrice residua Pixel 8: primo avvio = logica boot testata, splash nativa da provare;
  riapertura in memoria = nessun rimontaggio introdotto, da provare; Home e multitasking = lifecycle
  testato con eventi simulati, animazioni native da provare; cambio tema = DOM e palette testati,
  contrasto delle barre da provare; rete lenta = corretto il rilascio prematuro dal codice, nessuna
  prova browser di throttling. Necessari Android/Chrome/launcher/versione installata e video allegato.
  I colori del manifest possono richiedere aggiornamento del WebAPK: nessuna pubblicazione eseguita.

## Navigazione durante apertura/chiusura tastiera — 9 novembre 2026

- Segnalato flash della pillola mobile durante l'apertura della tastiera in Liste
  e Nuova spesa. Nel codice la scomparsa attendeva una riduzione del viewport del
  20%; inoltre il blur ripristinava la barra prima della fine della chiusura.
- `observeVirtualKeyboard`: il pointerdown touch su un campo scrivibile anticipa
  la scomparsa prima dei resize. Se non segue conferma dal viewport entro 800 ms,
  torna visibile (tastiera fisica/focus impedito). Dopo conferma resta nascosta
  anche al blur finché l'altezza non recupera il 95% del riferimento. Mouse, focus
  da tastiera, campi readonly, sole barre browser e pinch zoom non confermano
  l'apertura. Listener e timer rimossi al cleanup.
- Estesi i test per apertura anticipata, primi resize, blur e chiusura graduale,
  mancata apertura con barre browser e cleanup. `npm run check` con script-shell
  Git Bash OK: typecheck, 314/314 test, build demo (589 moduli); diff check OK.
  Aggiornati AGENTS.md e docs/architecture.md. Nessuna modifica a dati/Rules.
  Animazione su telefono reale non verificata; nessun commit o deploy.

## Nuova spesa senza barra Salva sovrapposta — 9 novembre 2026

- Screenshot mobile: la barra sticky «Salva» copre parte del prezzo promozionale
  nel modulo ricorrente. `ExpenseForm.tsx`: azioni sempre nel normale flusso dopo
  tutti i campi, raggiungibili scorrendo; eliminati sticky, sfondo sovrapposto,
  misura della barra e relativo scroll padding. Anche «Verifica sul server» segue
  il modulo. Validazione, invio e conservazione della bozza invariati.
- Aggiornati AGENTS.md e decisione in docs/architecture.md. Nessun nuovo testo UI;
  la guida non descriveva la posizione della barra e non richiede modifiche.
- `npm run check` con script-shell Git Bash OK: typecheck, 313/313 test, build demo
  (587 moduli); `git diff --check` OK. Resa mobile/browser non verificata in questa
  fase (host browser/pipe nativa indisponibili al precedente tentativo).
  Nessuna modifica ai dati/Rules, nessun commit o deploy.

## Stabilità campo Totale spesa — 9 novembre 2026

- Segnalato ancora un flash del campo «Totale spesa» alle spunte. Il campo non
  dipende da `canRegister`: la correzione del pulsante non ne copriva il rendering.
- `AppShell`: tema del pannello memorizzato con `useMemo`, per non pubblicare un
  nuovo oggetto tema ai controlli Paper a ogni snapshot della checklist.
- `ListsPage`: campo estratto in `ListTotalField` memoizzato, callback di modifica
  e salvataggio stabili; `useRemoteLists.updateList` mantiene identità stabile a
  backend invariato. Le spunte non cambiano le props del campo; importo, errori,
  cambio lingua/tema e modifiche remote del totale continuano ad aggiornarlo.
  Conservati salvataggio al blur/Invio e prima dell'apertura della conferma.
  Nessuna modifica a query, scritture SDK, Rules o dati.
- `npm run check` con script-shell Git Bash OK: typecheck, 312/312 test, build
  demo (585 moduli); `git diff --check` OK. Diagnosi del repaint dal codice,
  flash non riprodotto né verificato visivamente: host browser e pipe nativa
  Computer Use indisponibili. Da confermare sul dispositivo segnalato.
  Nessun commit o deploy.

## Allineamento menu Categoria — 9 novembre 2026

- Screenshot utente: il menu «Tutte le categorie» in Spese appare sotto Ordina.
  Nel codice Paper il fallback al bordo destro sottrae la larghezza del menu
  all'ancora; le nostre ancore a coordinate hanno larghezza zero, quindi il
  fallback può spostare l'intero menu a sinistra del campo.
- `MenuSelect` e `SelectField`: posizione orizzontale e larghezza imposte anche
  sul contenitore esterno del Menu, con limiti viewport/safe area calcolati da
  `menuGeometry.ts`. Conservati ancore a coordinate, focus senza scroll e scelta.
- Due test di geometria per 320/412 px, misure frazionarie, safe area e campi
  più larghi del viewport. `npm run check` con script-shell Git Bash OK:
  typecheck, 312/312 test, build demo (588 moduli). `git diff --check` OK.
  Resa browser e dispositivo dello screenshot non verificate in questa fase.
  Nessuna modifica ai dati/Rules, nessun commit o deploy.

## Pulsante Registra spesa stabile — 9 novembre 2026

- Rimossa su richiesta la scritta «La registrazione richiede la connessione e dati
  sincronizzati» dalla pagina Liste e dal dialogo, insieme alla traduzione EN inutilizzata.
- Causa del lampeggio nel codice: ogni spunta accodata dall'SDK rende temporaneamente
  `canRegister` falso; il pulsante passava dal colore primario al colore disabilitato
  e viceversa. La precedente correzione dell'altezza della nota non risolveva questo cambio.
- `ListsPage.tsx`: «Registra spesa» resta attivo perché apre solo il dialogo.
  `RegisterListDialog.tsx` conserva sia la disabilitazione della conferma sia il controllo
  nel gestore di invio finché i dati non sono sincronizzati; nessuna modifica a servizi o Rules.
- `npm run check` con script-shell Git Bash OK: typecheck, 310/310 test, build demo
  (588 moduli). `git diff --check` OK. Lampeggio non riverificato in browser o su
  dispositivo reale. Nessun commit o deploy.

## Stabilità checklist Liste — 9 novembre 2026

- Analisi del lampeggio segnalato quando si spunta un prodotto: la scrittura SDK
  rende temporaneamente `canRegister` falso, inserendo una nota sotto il pulsante;
  alla conferma la nota scompariva, cambiando altezza alla pagina.
- `ListsPage.tsx`: indicazione «La registrazione richiede la connessione e dati
  sincronizzati» sempre presente, senza inserimento/rimozione a ogni spunta.
  Disabilitazione durante scritture pendenti e stato sincronizzazione invariati.
- `npm run check` con script-shell Git Bash OK: typecheck, 310/310 test, build demo
  (584 moduli). Primo tentativo bloccato da un errore di tipo in AppShell, modificato
  in parallelo nella workspace e poi risolto esternamente; AppShell non modificato
  in questa fase. Resa browser e sintomo esatto sul dispositivo non verificati.
  Nessun commit o deploy.

## Legenda senza linee e conteggio discreto — 9 novembre 2026

- `CategoryLegend.tsx`: rimossi i divisori orizzontali nella tabella categorie
  della Dashboard, compreso il dettaglio di Altre; conservati spaziatura,
  selezione, colori e colonne importo/percentuale.
- `TransactionDetails.tsx`: conteggio transazioni da `titleLarge` grassetto a
  `bodyMedium`, più piccolo e subordinato al titolo categoria.
- `npm run check` con script-shell Git Bash OK: typecheck, 306/306 test e build demo.
  Resa browser non ricontrollata; nessun commit o deploy.

## Divisori dettaglio transazioni — 9 novembre 2026

- `TransactionDetails.tsx`: rimossi i bordi superiore/inferiore di Paper ScrollArea
  e il divisore sotto l'ultima ListRow. I bordi di area e ultima riga si sovrapponevano
  nel dettaglio categoria della Dashboard; ora i divisori sono solo tra transazioni.
- Controllati gli altri usi di ScrollArea e ListRow: gli altri dialoghi azzerano
  già i bordi; Categorie, dettaglio giornaliero, storico pagamenti e prodotti lista
  escludono già il divisore finale. Le righe Spese/Abbonamenti hanno contorni propri.
  Nei movimenti Fondi il bordo inferiore non si sovrappone a un bordo ScrollArea.
- `npm run check` con script-shell Git Bash OK: typecheck, 306/306 test, build demo.
  Resa sul telefono non riverificata; nessun commit o deploy.

## Larghezza menu dei selettori — 9 novembre 2026

- Analisi dei selettori condivisi: `MenuSelect` dimensionava il menu sul contenuto;
  coinvolti Periodo/Grafico in Dashboard e Ordina/Categoria in Spese. Ora misura
  il campo e applica la stessa larghezza al menu, entro il limite sicuro del viewport;
  le righe consentono il restringimento delle etichette con spunta a destra.
- `SelectField` aveva già la larghezza del campo: verificati gli usi in modulo
  spesa, fondo, trasferimenti/entrate, eccezioni di budget, assegnazione fondo e
  dialogo lista. Aggiornata anche la misura all'apertura per usare quella corrente.
  Menu account e menu di azioni non sono selettori e restano dimensionati al contenuto.
- `npm run check` con script-shell Git Bash OK: typecheck, 306/306 test e build demo.
  `git diff --check` OK. Resa browser/telefono non verificata (strumenti UI non
  disponibili nella fase corrente). Nessun commit o deploy.

## Evidenza Ripristina — 9 novembre 2026

- `SettingsPage.tsx`: «Ripristina» ora usa il pulsante pieno primario, larghezza
  minima 192 dp e altezza minima 56 dp, mantenendo la posizione a fine pagina.
- `npm run check` con script-shell Git Bash OK: typecheck, 306/306 test e build demo.
  Verifica visiva non ripetuta; nessun commit o deploy.

## Pulsanti dialogo lista — 9 novembre 2026

- `ListDialogs.tsx`: «Annulla» e «Crea»/«Salva» nel dialogo lista condividono una
  larghezza minima di 96 dp, per evitare il pulsante primario stretto mostrato nella
  foto mobile. Nessun cambiamento alla registrazione o ai dati.
- `npm run check` con script-shell Git Bash OK: typecheck, 306/306 test, build demo.
  Resa su telefono non riverificata; nessun commit o deploy.

## Azione Nuova lista — 9 novembre 2026

- `ListsPage.tsx`: pulsante «Nuova lista» spostato dalla riga del titolo a una riga
  dedicata sotto «Liste della spesa», allineata a sinistra prima dell'elenco.
- Verifiche: `npm run check` con script-shell Git Bash OK (typecheck, 306/306 test,
  build demo). Nessuna modifica ai servizi o alle Rules; nessun commit o deploy.
  Resa browser non ricontrollata (strumenti UI indisponibili nella fase corrente).

## Layout Impostazioni desktop — 9 novembre 2026

- Screenshot utente Windows 11, 1920×1080: il flex basis di 420 dp permetteva tre
  colonne nella prima riga e due nella successiva, con palette isolata a capo.
- `SettingsPage.tsx`: contenuto a tutta larghezza interna della card (limite iniziale
  di 1120 dp rimosso su richiesta dopo il secondo screenshot), due colonne uguali
  solo con almeno 872 dp effettivi della pagina (misurati con `onLayout`), altrimenti
  una. Lingua/Tema e Colore/Carattere affiancati; stili icona a larghezza intera.
  Preservata la modifica preesistente dell'anteprima Trasporti a `train`.
- `npm.cmd --script-shell="C:\Program Files\Git\bin\bash.exe" run check` OK:
  typecheck, 306/306 test, build demo (587 moduli). `git diff --check` OK.
  Verifica visiva browser non eseguita: host Browser Use e pipe Computer Use
  indisponibili. Da controllare resa a 1920×1080, zoom Windows/browser e mobile;
  il numero di pollici del monitor non determina la larghezza CSS disponibile.
- Nessun accesso cloud, commit o deploy.

## Correzione runner Windows e recupero export — 9 novembre 2026

- Sessione `.firebase/hybrid-3zr7jR`: CLI e runner terminati, Firestore Java ancora
  raggiungibile su 8180. Export locale esplicito salvato in `recovery/`, validato e
  copiato in `emulator-data` senza sovrascrivere archivi esistenti. Originale conservato.
  Arrestato solo l'albero Java identificato della sessione; lock conservato come
  `.firebase/hybrid.lock.stale-14728`. Nessun accesso al cloud o lettura dei record nei log.
- `scripts/hybridRunner.ts`: processi senza console separata su Windows, export
  esplicito dall'emulatore posseduto prima dell'arresto del relativo albero con taskkill;
  validazione percorsi tramite `relative`/`sep`, lock conservato anche su errori di cleanup,
  errore originale di Expo non più nascosto dall'eventuale errore di export.
- Test aggiunti per percorsi esterni e crash Expo con persistenza al riavvio. Harness
  Windows usa IPC per invocare il gestore SIGINT: non equivale al Ctrl+C da tastiera.
  La prova del discendente orfano dopo crash CLI resta specifica POSIX; su Windows il
  caso di errore iniziale usa una CLI senza figli. Linux non riverificato in questa fase.
- Verifiche Windows/Node 24.13.1: `npm run check` con script-shell Git Bash **OK**
  (typecheck, **306/306**, build demo), `test:hybrid` **9/9**, `test:emulator` **15/15**
  su porte 39099/39280 e Hub dedicato. Config `.nummo-windows-review.json` rimossa;
  emulatori demo arrestati. Nessun commit o deploy. Da verificare `npm run dev`
  interattivo/Expo reale e Ctrl+C nel PowerShell dell'utente; il crash originario di
  Expo non è diagnosticabile dal solo messaggio di export precedente.

## Recupero lock hybrid — 9 novembre 2026

Lock abbandonato del PID 11972: processo assente e nessun listener sulle porte
8180/4400/8081 al controllo. Sessione `.firebase/hybrid-NFkRZS` senza `export` o
`previous`; `emulator-data` assente. Lock rinominato, senza cancellarlo, in
`.firebase/hybrid.lock.stale-20261109-011900`. Nessun riavvio o recupero dati eseguito;
il prossimo avvio partirà senza archivio locale precedente. Nessuna modifica al runner.

Aggiornamento: **9 novembre 2026, variante icona monocromatica su base `a7230de` (Europe/Rome)**.
Gestionale personale di spese solo web, Google Auth e
Firestore BYOF, accesso riservato all'UID in `config/owner`. Contesto stabile, architettura e comandi: `AGENTS.md`;
motivazioni: `docs/architecture.md`; configurazione: `README.md`, `docs/firebase-personale.md`.
Questo file descrive il checkout: risultati emulati non certificano cloud, dispositivi reali o pubblicazione.

## Fase attuale — icona monocromatica (non pubblicata)

- Aggiunta `public/icons/icon-monochrome.svg`, stesse forme del logo con riempimento nero
  opaco e sfondo trasparente; scala 0,77 contro 0,72 della favicon (+6,9%), entro il
  cerchio sicuro di raggio 40%. Manifest: nuova voce separata `monochrome`, SVG `sizes: any`.
- Logo principale, favicon, PNG any/maskable/Apple, HTML e colori di splash/tema invariati.
  Nessuno script di generazione delle icone di installazione trovato nel repository;
  nessuna nuova dipendenza. Dettagli/fonti e collaudo: `docs/icone-installazione.md`.
- Il protocollo WebAPK corrente di Chromium indica ancora MONOCHROME come non usato;
  Android 16 QPR2 può generare icone a tema automaticamente. Non è dimostrato che
  Chrome/Pixel Launcher usino il nuovo SVG, né che risolva il contrasto sul Pixel 8.
- Controlli asset: percorsi/dimensioni PNG, manifest e scopi, geometria SVG uguale al logo,
  riempimento opaco, limite conservativo del raggio 23,902/64 < 25,6/64; PNG esistenti
  completamente opachi e invariati. Export demo: manifest e tutti gli asset icona
  copiati identici ai sorgenti.
- Verifiche su Windows, Node 24.13.1: dipendenze assenti all'avvio; `npm.cmd ci --ignore-scripts`
  completato da lockfile fuori sandbox dopo errore di accesso alla cache. Nessuna modifica a package/lockfile.
  `npm.cmd run check`: typecheck OK, test **304/305**, si ferma prima della build.
  Fallisce il test preesistente `hybrid: promuove solo export completi e conserva la versione precedente`:
  `validateArchive` confronta un percorso `resolve()` Windows con `resolve(path) + '/'`
  (`scripts/hybridRunner.ts`), codice non modificato. Non dichiarare check verde.
  Build demo eseguita separatamente con Git Bash come script-shell: **OK**, 587 moduli;
  fuori sandbox per consentire la creazione della configurazione Expo. `git diff --check` OK.
  La verifica automatica degli asset non prova il rendering/installazione su Android.
- Nessun deploy o test su Pixel 8. Prossimo passo: verifica dell'icona effettivamente
  installata, temi/palette, confronto con icone a tema disattivate e splash.
- Git prima delle modifiche: pulito, `main` a `a7230de`, allineato al riferimento locale
  `origin/main` (nessun fetch). Quel commit ha già rimosso `.nummo-hybrid-12312.json`:
  la nota storica sotto e il passo di rimozione dall'indice sono superati; manca il glob in `.gitignore`.

## Fase attuale — icone di categoria (non pubblicata, Rules locali cambiate)

- Su richiesta dell'utente **eliminati del tutto gli ID `car`, `bus`, `tree`** (auto, autobus, natura): rimossi da
  `categoryIconLabels`, glifi minimali, disegni colorati, sprite pixel, traduzioni EN e dalle due liste `icon in [...]`
  di `firestore.rules`. Icone attive: **42**. Come per i 18 ID storici, decoder e import ora li rifiutano.
- Predefinita «Trasporti» → `train` (scelta dell'utente); anteprima stili in Impostazioni → `train`.
- **Rischio produzione:** archivi con categorie `bus` (probabile: era la predefinita di Trasporti), `car` o `tree`
  risulteranno bloccati con il nuovo client e le nuove Rules rifiuteranno modifiche che conservano quell'ID.
  Non verificato sui dati personali; nessun adapter o migrazione. Le Rules **non** sono ripubblicate: farlo
  (separatamente, con autorizzazione) solo insieme all'Hosting e dopo aver cambiato le icone nell'archivio.
- Sprite pixel `popcorn` ridisegnato due volte (la prima versione giudicata confusa dall'utente). Attuale 11×12:
  cupola di chicchi `t` con solo contorno esterno, che trabocca oltre il bordo di una vaschetta alta e dritta a righe
  verticali sottili `b`/`o`, nessun puntino interno. Vista in anteprima a 24/48/120 px chiaro/scuro, non nell'app.
  Dopo il secondo ridisegno: typecheck OK, `npm test` **306/306** (nel frattempo l'altra sessione ha toccato i test hybrid).
- Backup fittizi `docs/testing/`: `Demo · Trasporti` `bus` → `train`, `TEST Trasporti` `car` → `fuel`; entrambi
  letti da `parseBackup` (8 e 15 categorie).
- Verifiche: typecheck OK; test **304/305** (unico fallimento il preesistente `hybridRunner` Windows sopra);
  `test:emulator` **15/15** su porte dedicate (Auth 39099, Firestore 39280, config temporanea rimossa);
  `build:demo` OK con `--script-shell` Git Bash; `git diff --check` OK. Nessun commit o deploy.
- **Fondi, eccezioni del budget nascoste di base** (`FundEditor.tsx`): «Eccezioni per singoli mesi» diventa un
  pulsante outlined a scomparsa (chevron, `aria-expanded`, come «Scegli un'icona»), chiuso a ogni apertura del dialogo.
  Da chiuso, se esistono eccezioni future, mostra «Eccezioni programmate: N» (nuova traduzione EN). Dati e salvataggio
  invariati. Typecheck OK, test **306/306**, `build:demo` OK; resa browser e 320 px non verificate.
- Poi, su richiesta, **tutta la sezione budget è a scomparsa**: pulsante «Budget mensile» chiuso di base che contiene
  interruttore «Budget ricorrente» (nuova etichetta), importo ed eccezioni, queste ultime di nuovo visibili subito
  all'apertura della sezione (il pulsante interno delle eccezioni è stato tolto su richiesta). Da chiuso mostra
  «Budget ricorrente: €X» se attivo e il conteggio delle eccezioni; un errore sull'importo al salvataggio riapre la
  sezione. Nuove traduzioni EN. Typecheck OK, test **306/306**, `build:demo` OK; resa browser non verificata.
- **Pillola mobile, indicatore scorrevole e trascinamento** (stile Liquid Glass richiesto, resa Material 3 Expressive):
  `AppShell.tsx` disegna un solo indicatore `primaryContainer` che scorre tra le destinazioni con la molla
  `spatialSpring` (stiffness 380, smorzamento 0,8, nuovo token in `tokens.ts`). Tenendo premuto e scorrendo
  orizzontalmente sulla pillola l'indicatore segue il dito, leggermente ingrandito, l'etichetta sotto il dito si evidenzia,
  e al rilascio si apre quella destinazione; il click che segue il gesto viene soppresso, i movimenti piccoli o verticali
  restano tocchi. Pointer event DOM sul nodo della pillola (`touch-action: none`), geometria pura in
  `src/components/navIndicator.ts` con `tests/navIndicator.test.ts`. Su «Nuova spesa» l'indicatore sfuma e ricompare sul
  posto. Ridotto movimento: salti senza molla. Tastiera e lettori di schermo invariati (pulsanti, `aria-current`).
- Verifiche: typecheck OK, test **310/310**, `build:demo` OK, `git diff --check` OK. **Chrome headless (CDP)** su build demo
  con emulatori dedicati (Auth 39099, Firestore 39280, config temporanea rimossa ed emulatori arrestati), touch emulato:
  412×915 chiaro e 320×740 scuro — tocco su Dashboard, trascinamento touch Dashboard→Liste, trascinamento mouse
  Liste→Spese, tocco con tremolio di 4 px (resta tocco su Fondi), trascinamento riportato al punto di partenza (nessun
  cambio), Nuova spesa (indicatore nascosto) e ritorno: tutti corretti, nessun overflow né errore JS. Corretto lo strato
  «premuto» che restava sulla voce di partenza durante il gesto. Non provato su telefono reale né Safari/iOS.
- **Barra di navigazione Android dell'app installata:** segnalata non integrata col tema. Fonti pubbliche (nessuna
  documentazione ufficiale Chrome): nell'app installata Chrome la colora dal manifest, fissato all'installazione e non
  modificabile dalla pagina; fino ad Android 14 `theme_color`, da Android 15 `background_color`. Nessun campo manifest
  chiaro/scuro risulta supportato su Android, quindi **solo tema scuro** (ripiego accettato dall'utente):
  `background_color` `#121212` → `#0F1511` (sfondo scuro Menta predefinito; gli altri accenti differiscono di pochi
  livelli). `theme_color` resta chiaro per non scurire la barra di stato all'avvio in tema chiaro: su Android ≤ 14 la
  barra resta chiara. In Chrome (scheda) `viewport-fit=cover`, già presente, porta la pagina sotto la barra gestuale
  (Chrome 135+). Effetto solo dopo **deploy Hosting** (non eseguito) e aggiornamento del WebAPK (periodico o
  reinstallazione). Build demo: manifest copiato identico; test **310/310**. Non verificato su dispositivo.
- **Menu `MenuSelect` con etichette troncate su telefono** (segnalazione: «Importo più …» nel menu Ordina).
  Causa: la modifica non committata che posiziona il menu (`menuGeometry.ts`, altra sessione) gli dava la larghezza
  esatta del campo, mezza riga su telefono. Correzione in `MenuSelect.tsx`: clone nascosto delle righe che misura la
  larghezza naturale (testo `nowrap`, non `numberOfLines`, che con RN Web sottostima `max-content`; +2 px perché
  `onLayout` arrotonda), larghezza = max(campo, voce più lunga) entro i margini di `menuHorizontalBounds`; clone in un
  box 0×0 ritagliato. Scoperto anche che l'animazione d'apertura del `Menu` Paper parte spostata a destra di metà
  larghezza: un menu sul campo destro usciva dallo schermo per qualche frame e Chrome mobile allargava la pagina
  (innerWidth 412 → 501, persistente). `#root` in `public/index.html` ora ha `overflow: clip` (ripiego `hidden`).
  Nuovo test in `tests/menuGeometry.test.ts`. Typecheck OK, test **314/314**, `build:demo` OK.
  Chrome headless (CDP), emulatori su porte dedicate 39199/39380 (le 39280/39400 erano occupate da un altro processo,
  non toccato; per errore il seed demo idempotente `config/owner` è stato eseguito anche sul Firestore su 39280):
  Ordina/Categoria/Periodo/Grafico a 412 chiaro, 320 scuro, 360 chiaro — nessuna etichetta troncata (confronto
  `Range` vs riquadro), menu entro i margini, viewport invariato, nessun errore JS; il controllo riproduce il difetto
  sulla versione precedente («Importo più alto/basso» 116/133 px in 108 px). Config temporanea rimossa, emulatori
  arrestati. Restano troncati, fuori dai menu: il valore del campo chiuso «Tutte le categorie» a ≤ 360 px e «Dashboard»
  nella pillola a 320–360 px (già noto).

## Produzione — Rules pubblicate e verificate

- Lettura live del progetto `nummo-6b6e2`: release Firestore aggiornata **6 novembre 2026, 15:45:05 UTC**;
  contenuto diverso dal file locale, senza regole per fondi, movimenti, liste e prodotti. L'app attuale legge queste
  collezioni; il rifiuto spiega il blocco del modulo. `deploy:hosting` pubblica solo il sito, non le Rules.
- Pubblicate con autorizzazione tramite `npx firebase deploy --only firestore:rules --project nummo-6b6e2`.
  Release aggiornata **8 novembre 2026, 21:23:01 UTC** (22:23 Europe/Rome): riletta via API e confrontata,
  contenuto identico al file locale; presenti fondi, movimenti, liste e prodotti. Hosting non ripubblicato.
  Nessun dato privato, UID o documento proprietario letto/modificato; nessuna modifica applicativa in questa diagnosi.
- Su HEAD corrente: `npm run check` **OK** (305/305, typecheck e build demo), suite emulatori dedicati **15/15**.
  Config temporanea rimossa, emulatori arrestati. CRUD cloud e verifica sul browser di produzione non eseguiti.

## Fase precedente — focus dei selettori e apertura Spese (integrata in `b97758d`)

- **Diagnosi riprodotta:** montando «Nuovo fondo», Paper `Menu` chiuso metteva il focus sul selettore Mese:
  scorrimento automatico di 253 px. `SelectField` e `MenuSelect` ora usano anchor a coordinate e ripristino esplicito
  del focus con `preventScroll`; il dialogo parte a scroll zero, anche alla riapertura.
- **Spese:** rimossi formattatori `Intl` ricreati per riga e scansioni ripetute dell'elenco per ciascun mese.
  Riepiloghi in un passaggio (`expenseMonths.ts`), categorie indicizzate, formattatori riusati per lingua.
  Prime 50 righe, altre 50 con «Mostra altre spese»; ricerca/ordinamento/riepiloghi restano completi.
  Cambio ricerca/filtro/ordine riparte da 50. Guida e traduzioni IT/EN aggiornate; motivazioni in `docs/architecture.md`.
- **Misura Chromium headless:** 240 spese TEST su 24 mesi, 412×915, CPU 4×, tre aperture effettive della sezione:
  prima **4052/4024/4146 ms**, dopo **629/549/541 ms** (mediana 4052 → 549 ms).
  Il confronto misura l'apertura con tutte le righe prima e le prime 50 dopo; tutte le 240 restano consultabili.
  Sono dati emulati, non una misura sul dispositivo o sull'archivio personale dell'utente.
- **Verifiche attuali:** `npm run check` **OK**, typecheck, **305/305** test e build demo con endpoint espliciti
  Auth 39099/Firestore 39280. Due regressioni sui riepiloghi (mesi/anni, filtri, totali, ordine e input intatti),
  casi i18n estesi. Browser: selezione mese, Escape e focus ripristinato senza scroll, ordinamento, ricerca,
  espansione fino a tutte le 240 righe; layout 320×740 chiaro IT e 1280×900 scuro EN senza overflow orizzontale,
  dialogo in cima e prime 50 righe/traduzioni verificate. Controllo diff OK. Nessuna modifica a servizi/Rules o dati reali.

## Git

- **Ritocco integrato in `b97758d`:** rimossa l'icona di spunta dal pulsante «Registra spesa» nel dettaglio
  lista (`ListsPage.tsx`). `npm run check` OK: typecheck, 305/305 test e build demo; resa browser non ricontrollata.

- Ramo `main`, HEAD **`b97758d`**: correzioni focus/prestazioni, Impostazioni come pagina, sprite pixel e pulsante
  Registra spesa senza spunta. `d5170ee` aveva allineato totale e pulsante nel dettaglio lista. Riferimento `origin/main` non ricontrollato (nessun fetch).
- **Integrato in HEAD — pagina Impostazioni:** il dialogo `SettingsDialog` diventa `SettingsPage.tsx`, pagina del
  workspace aperta dal menu account (contatore `settingsRequest` da `App.tsx`, come Categorie/Importa ed esporta),
  con «Fatto» che torna alla sezione d'origine e «Ripristina» in fondo. Sezioni impilate su mobile, in due colonne
  da medium in su. Da disconnessi l'icona Impostazioni sostituisce la schermata di accesso fino a «Fatto».
- **Integrato in HEAD — sprite pixel `wifi`, `music`, `film` ridisegnati** (`categoryPixelGlyphs.ts`, stessi ID e tinte):
  wifi con due archi spessi e punto, due note unite piene, pellicola verticale con fori e due fotogrammi, come negli
  altri stili. Non viste nell'app con categorie reali; prove visive pregresse sotto.
- **Revisione documentale precedente:** riesaminati codice, script, Rules, documentazione e Git; aggiornati solo questi due
  documenti, conservando le modifiche applicative preesistenti e la rinomina già nell'indice. Nessun commit o deploy.
- Commit recenti: `d5170ee` riga checkout liste; `5a42ef1` pagina Importa ed esporta, ritocchi Dashboard/Fondi/Liste, backup fittizio standard;
  `296407b` liste della spesa, backup v4, Dashboard informativa, backup fittizio limite; `85fb9aa` fondi e budget,
  icone a tema denaro; `96777ac` transizioni e ricerca abbonamenti; `112ebcb` stati abbonamenti, backup v2, tre stili
  icone, predefiniti, avvio. I titoli dei commit non descrivono interamente il contenuto.
- HEAD traccia ancora `.nummo-hybrid-12312.json` (config temporanea del runner, non coperta da `.gitignore`).

## Funzionalità implementate (riscontro nel codice)

- **Sessione:** login Google popup, logout dopo scritture pendenti, isolamento per UID, avatar con fallback, errori
  `auth/...` validati IT/EN; guida pubblica `#guida`.
- **Spese:** CRUD con UUID stabile, conferma server, revisioni e conflitti espliciti, verifica degli esiti incerti,
  copie di recupero in memoria, bozza conservata tra sezioni. Pagina Spese a due viste: «Spese» (singole, ricerca,
  filtro categoria, ordinamento, raggruppamento mensile) e «Pagamenti ricorrenti» (serie, ricerca normalizzata,
  stati Attivo/In pausa/Annullato, storico pagamenti, prossimi rinnovi). Ricorrenze settimanali/mensili/annuali con
  fino a otto variazioni di prezzo per numero di rinnovo; i pagamenti maturati non vengono mai riscritti.
- **Categorie:** pagina dal menu account (sotto Impostazioni) o dal modulo; nomi unici, 42 icone in tre stili
  (minimale, colorato, pixel); cinque predefinite su archivio vuoto confermato dal server.
- **Fondi e budget** (destinazione «Fondi»): saldo iniziale, ricarica mensile calcolata, budget mensile con eccezioni,
  entrate e trasferimenti immutabili, archiviazione, fondo predefinito per browser, mesi navigabili
  effettivo/previsione, selettore fondo nel modulo, assegnazione esplicita delle spese «Senza fondo».
- **Liste della spesa** (destinazione «Liste»): crea/rinomina/duplica/elimina, checklist con salvataggio automatico,
  «Registra spesa» in transazione (una spesa con `list_id`/`list_items`, lista archiviata, non acquistati spostabili
  in nuova lista); eliminare la spesa riattiva la lista. Limite 100 prodotti per lista solo lato client.
- **Dashboard:** periodi mese corrente/precedente, 3/6/12 mesi; riepilogo con date del periodo (confronto globale col
  periodo precedente rimosso; resta la variazione per categoria nelle righe Barre); Ciambella (centro vuoto, dettagli al passaggio/
  selezione), Blocchi treemap senza testo nelle tessere con pannello dettagli, Barre complete ordinate per spesa;
  dettaglio transazioni per categoria con conteggio; andamento giornaliero SVG con selezione del giorno (nessuna
  apertura delle transazioni del giorno). Preferenza `ranking` legacy migrata a `bars`.
- **Importa ed esporta** (menu account, sotto Categorie): CSV di sola consultazione; JSON `nummo-backup` **v4** unico
  ripristino (lettori storici per le versioni precedenti), anteprima su una riga, unione senza sovrascritture,
  sostituzione confermata con copia automatica, esiti in snackbar.
- **Shell/UI:** Material 3 adattiva, quattro destinazioni + «Nuova spesa» (modulo desktop compatto ≥1024 dp),
  temi/tinte, IT/EN senza rimontare sessione o bozze, tastiera virtuale gestita, transizioni con riduzione movimento.
- **Collaudo:** `docs/testing/` con due backup fittizi v4 (casi limite; spese standard prefissate `Demo ·`) e guida
  ai risultati attesi. Da importare preferibilmente nella demo.

## Decisioni tecniche recenti (dettagli in `docs/architecture.md`)

- Ricariche dei fondi calcolate dal piano come le occorrenze, mai documenti: niente duplicati tra dispositivi né
  migrazioni automatiche; spese esistenti senza `fund_id` restano «Senza fondo».
- Liste e prodotti con scritture semplici «ultima vince» (uso offline in negozio tramite coda SDK); l'unica scrittura
  economica è la registrazione transazionale.
- Backup v4 aggiunge fondi, movimenti, liste; piani e `status_changes` stringhe compatte in Firestore per il budget
  di espressioni delle Rules, array nel backup.
- Pagina Importa ed esporta montata nascosta fuori pagina per conservare anteprima e operazioni in corso.

## Problemi aperti e limitazioni

- **Compatibilità icone:** decoder/import rifiutano ID rimossi (`receipt`, `phone`, `bed`, `ticket`, `briefcase`,
  `droplet`, `wrench`, `pill`, `book`, `plane`, `scissors`, `baby`, `flame`, `wine`, `umbrella`, `leaf`, `shield`,
  `ellipsis`; prova locale: tutti i 18 ID sono rifiutati da decoder categorie e lettore backup), più `car`, `bus`,
  `tree` rimossi il 9 novembre (`bus` era la predefinita di Trasporti). Vecchi record possono bloccare categorie e backup;
  presenza nei dati personali non verificata, nessun adapter.
- **Rules:** budget di 1000 espressioni stretto (rimisurare a ogni nuovo controllo sulle spese); non verificano
  esistenza di fondo/lista referenziati, unicità dei nomi di fondo (solo client), ordine/date degli stati.
- **Fondi:** eliminazione basata sui dati caricati (concorrenza → spese orfane, non perse); cambiare fondo a una serie
  sposta anche i pagamenti passati; fondo predefinito non sincronizzato tra browser.
- **Liste:** spunte simultanee su due dispositivi: prevale l'ultima; nomi non unici; lista archiviata non modificabile.
- **Backup/concorrenza:** nessuno snapshot globale né atomicità dell'intero ripristino; piano di sostituzione
  ricalcolato senza nuova anteprima. Client precedenti non leggono backup più recenti.
- **Guida/avvio:** `warmUpServices()` parte da `App.tsx` anche su `#guida`: assenza di traffico Firebase non garantita.
- **UI mobile (diagnosi storiche non riverificate):** menu Categoria che allarga il viewport o copre la pillola, scroll
  annidato nei menu bassi, etichetta «Dashboard» troncata a 320 px, Nuova spesa in landscape aperta scorsa.
- Nessun service worker né avvio offline a freddo; cache persistente non cancellata al logout; collezioni caricate
  integralmente. Licenza assente; audit dipendenze non aggiornato. Nessun lint configurato.
- Richieste pregresse senza contesto sufficiente (scritta «minimale» senza testo, colori attivi mobile/rail): chiarire
  con l'utente prima di intervenire.
- **Documentazione d'uso parzialmente storica:** README indica ancora Spese → «Dati» per i backup e non elenca Fondi/Liste;
  `docs/architecture.md` conserva sezioni poi superate (classifica, dettaglio giornaliero, totale centrale ciambella).
  Per il comportamento attuale usare codice e questo stato; riallineamento fuori dalla presente revisione di due file.

## Verifiche

**Revisione documentale precedente** sulla base `d5170ee`, prima della correzione focus/prestazioni, dipendenze già installate,
Node 26.13.0, npm 12.2.2, Java 21.0.13:

| Comando | Esito |
| --- | --- |
| `npm run check` | **OK**: typecheck, **303/303** test, export demo `dist-demo/` (435 moduli, bundle 2,4 MB). |
| `npm run check:env` | **OK**: policy dei file di sviluppo; non certifica servizi o credenziali. |
| `git diff --check` | **OK**. |
| `AUTH_PORT=39099 FIRESTORE_PORT=39280 npm run test:emulator -- --config .nummo-docs-review.json` | **15/15** (SDK/Rules, CRUD, conflitti, stati, fondi, liste, import v4). Porte dedicate anche per Hub/log/websocket, UI disattivata; config temporanea rimossa dopo la suite. |
| `npm run test:hybrid` | **8/8** (lifecycle runner, Firestore demo reale, Expo simulato). |
| Prova locale decoder/import con ID icona rimossi | **OK**: 45 icone attive, 18 ID storici rifiutati da entrambi. Nessun dato personale letto. |

Le suite hybrid ed emulatori sono state rieseguite fuori dalla sandbox dopo i primi tentativi falliti
(avvio test hybrid; binding porte emulatori). Solo dati demo isolati, nessun arresto dei servizi utente.
I `PERMISSION_DENIED` nei casi negativi delle Rules sono attesi; non costituiscono un fallimento della suite.

**Evidenza delle fasi precedenti (stesso giorno, non ripetuta qui):** Chromium headless su build demo con emulatori
dedicati per fondi, liste, Dashboard, modulo desktop compatto, Importa ed esporta e nuova pagina Impostazioni
(412×915 chiaro IT, 1280×900 scuro EN, 320×740 scuro IT): nessun overflow o errore JS riportato.
Per Impostazioni riportati accesso da connessi/disconnessi e ritorno con «Fatto»; sprite pixel visti in anteprima
24/48/72 px chiaro/scuro. Queste prove non sono state ripetute nella revisione documentale.
Riepilogo/esiti del ripristino, centro ciambella, Blocchi senza
testo e rimozioni di testi verificati solo da typecheck/test/build. Misure d'avvio: `docs/avvio-prestazioni.md`.

**Ancora non verificati nell'ultima fase:** `npm ci`/clone pulito, `check:hybrid`, avvio interattivo dev/demo, build/preview cloud,
dry-run/deploy, audit, import UI dei backup fittizi, dispositivi reali, touch, tastiera virtuale reale,
screen reader, concorrenza tra due dispositivi.

## Prossime attività, per priorità

1. **Collaudo produzione e compatibilità:** dopo la pubblicazione Rules verificata sopra, ricaricare l’app e verificare
   caricamento e sincronizzazione. Per prove CRUD cloud serve autorizzazione. Decidere conservazione o migrazione
   esplicita degli ID icona rimossi, con regressioni decoder/import; nessuna migrazione automatica dei dati personali.
2. **Collaudo in demo** con i backup di `docs/testing/` (`npm run emulators`, `emulators:seed`, `dev:demo`):
   unione/conflitto/sostituzione v4 dall'interfaccia, riepilogo ed esiti del ripristino, eccezioni di budget e
   sospensione ricarica, dialoghi Fondi/Liste a 320 px e in landscape, CSV in foglio di calcolo reale.
3. **Collaudo dispositivi:** telefono reale (touch, tastiera virtuale, safe area, rotazione), screen reader, Tab/Invio
   su Blocchi e Ciambella, riduzione movimento; riprodurre i problemi UI mobile elencati sopra.
4. **Igiene Git separata:** aggiungere `.nummo-hybrid-*.json` a `.gitignore` e togliere dall'indice il file tracciato
   (`git rm --cached`) senza cancellarlo se un runner lo usa. Non ripulire `.firebase/`, lock, staging o `emulator-data/`
   senza ispezione. Nessun commit automatico.
5. **Avvio/guida:** misurare rete su `#guida`; procedura `docs/avvio-prestazioni.md` su dispositivo e rete lenta;
   popup dopo logout/scadenza, Safari/Firefox/Edge.
6. **Riproducibilità:** `npm ci` da clone pulito su Node LTS, audit aggiornato, scelta della licenza.
   Riallineare README e sezioni superate di `docs/architecture.md` alle funzioni attuali, preservandone le decisioni valide.
   Unicità server dei nomi fondo, sincronizzazione del predefinito, paginazione e service worker sono evoluzioni da
   valutare, non lavori pianificati né implementati.
