# HANDOFF — Nummo

## Stato corrente — 24 novembre 2026

Leggere questa sezione per prima: è il riepilogo aggiornato. Le sezioni datate sotto, dal più recente, sono cronaca delle singole fasi
e possono dire cose superate; il riepilogo precedente (21 novembre) è conservato in «Stato corrente precedente», prima del «Registro dei
rilasci». Riallineato il 23 novembre: la cronaca dei rilasci del 22–23 novembre, l'elenco dei commit e la storia delle release Android,
prima qui, sono nel «Registro dei rilasci», alla voce «Dettaglio dei rilasci del 22–23 novembre». Aggiornato il 24 novembre con i rilasci
di quel giorno e la verifica su `d196dc9`.

- **Produzione (progetto `nummo-6b6e2`).** Ultimo **Hosting**: `a8f694f` (24 novembre, su richiesta: icona nera con logo bianco, transizione lista ↔ dettaglio, con le
  notifiche uniformi di `e58ce41`; bundle online `index-ab8ddc12…` identico byte per byte). Prima `89c776d` (testi di README e Guida;
  bundle `index-3bd84bf7…`). Prima `2d3feed` (link per compilare Nuova spesa; bundle `index-62e94e98…`). Prima `1ad74ad` («Template» apre uno schermo come la
  scansione; bundle `index-39223863…`). Prima `32a276f` (animazione piena anche per Nuova spesa e le
  destinazioni; bundle `index-4572a2bf…`). Prima `d196dc9` (animazioni degli schermi come prima della
  levigatura in più; bundle `index-5d17f911…`). Prima `695a5c4` (24 novembre: selettori e fogli da desktop come prima,
  schermi nei colori della pagina, data senza scorrimento), pubblicato con `npm run deploy:hosting` dall'albero principale pulito (al
  secondo tentativo: il primo si è fermato su un errore di rete della API di Hosting): «Deploy complete!», bundle online
  `index-609f9367…` identico byte per byte. Comprende tutto il codice fino a `695a5c4`. Prima `bafadd3` (24 novembre, bundle
  `index-aba7a80c…`), `de199c7` (bundle `index-290105cc…`), prima `7bfa99b` (pannelli come
  schermi, bundle `index-c592ccbd…`), prima `9e032b8` (dettaglio di spese e abbonamenti,
  bundle `index-d8345c5c…`), prima `da3103e` (accenti del tema
  chiaro, bundle `index-9f999119…`), prima ancora `e3c250e` (audit mobile, bundle `index-3ee80b89…`). Ultime **Rules**: `48361b9` (22 novembre, 500 prodotti per lista),
  invariate da allora. Chi ha collegato il proprio Firebase e non ha ricopiato le Rules dopo il 22 novembre deve farlo (importi oltre
  99.999,99 €, limiti degli abbonamenti, piani dei fondi, prodotti per lista). Le novità web arrivano anche all'app Android senza un nuovo APK.
- **Rilasci del 24 novembre** (dal più recente, tutti su richiesta, solo Hosting): `a8f694f` (icona, transizione del dettaglio) con `e58ce41` (notifiche), `89c776d` (testo della Guida sui fondi), `2d3feed` (link per compilare Nuova spesa), `1ad74ad` («Template» come schermo), `32a276f` (animazione piena per tutte le pagine), `d196dc9` (animazioni degli schermi come prima),
  `695a5c4` (selettori e fogli da desktop come prima), `bafadd3` (schermi dei fondi e della lista, chiusura alla navigazione).
- **Rilasci del 23 novembre** (dal più recente, tutti su richiesta, solo Hosting): `de199c7` (fogli, pillole, Elimina rosso), `7bfa99b` (pannelli come schermi), `9e032b8` (dettaglio di spese e abbonamenti), `da3103e` (accenti del tema chiaro), `e3c250e` (audit mobile), `d633282` (template dopo
  template senza importo ed esercente del precedente), `72fcf5a` (cambio tema animato, menu dell'account senza limite di altezza,
  vibrazione solo nell'app Android, tema chiaro più deciso, schede delle spese piene).
- **App Android: 0.3.3** (`6e3ebd0`, versionCode 6, 24 novembre: solo l'icona nera con logo bianco), release GitHub «Latest», non ancora
  installata. Prima **0.3.2** (`f74ff3a`, versionCode 5; vibrazione `HEAVY_CLICK`), **installata dall'utente da GitHub sul Pixel 8** il 23 novembre:
  intensità confermata. Funzioni: WebView del sito con ponte nativo (vibrazione anche in silenzioso e Non disturbare, barre di sistema del
  colore dell'app, sblocco con `BiometricPrompt`, salvataggio dei file), Avanzata con l'accesso Google del telefono (dalla 0.2.0),
  notifiche come notifiche locali dell'app (dalla 0.3.0). Da fare dall'utente: copiare altrove la chiave di firma
  (`android/nummo-release.jks`, `android/keystore.properties`): senza la stessa chiave l'app non si aggiorna.
- **Release GitHub** (repository privato): `android-v0.3.3` «Latest», poi 0.3.2, 0.3.1, 0.3.0, 0.2.0, 0.1.0, tutte con certificato
  `00b1c85c…0fcf`. La 0.1.0, la 0.2.0 e la 0.3.0 sono ricompilate (stesso codice, non gli stessi file installati allora).
- **Git.** `main` = `origin/main`, solo il ramo `main`, sei tag `android-v0.1.0`…`android-v0.3.3`. Ultimo commit di codice `a8f694f`,
  inviato e pubblicato. Commit di codice del 23 novembre, tutti inviati e pubblicati: `de199c7` (fogli, pillole, Elimina rosso), `7bfa99b` (pannelli come schermi), `9e032b8` (dettaglio di spese e abbonamenti), `da3103e` (accenti del tema chiaro), `e3c250e` (audit mobile), `d633282` (template dopo
  template), `f74ff3a` (app 0.3.2, solo Android), `72fcf5a` (tema chiaro, schede piene), `b9566dc` (vibrazione solo nell'app),
  `8e8a756` (rivelazione del tema più lenta), `902d38b` (cambio tema animato, menu dell'account), `7008e73` (backup di collaudo v11, test).
  L'hash di testa non si scrive qui; i commit di soli documenti non sono elencati.
- **Novità del 23 novembre, in breve** (dettagli nelle sezioni datate):
  - **iOS e tastiera:** `#root` è `position: fixed` sull'area visibile e segue lo spostamento del visual viewport di Safari: la barra
    superiore non esce più dallo schermo e non resta una striscia vuota sopra la tastiera. Lo stesso vale per lo schermo di blocco.
  - **Cambio chiaro/scuro** come cerchio che si allarga dal controllo (View Transitions, molla morbida da 868 ms); le barre del browser e
    dell'app cambiano colore quando il cerchio copre il bordo superiore.
  - **Tema chiaro più deciso** e schede di Spese/Abbonamenti piene nel tema chiaro; tema scuro invariato.
  - **Vibrazione solo nell'app Android**, un solo effetto ovunque (anche sulla legenda di Analisi); nel browser nessuna vibrazione.
  - **Accenti del tema chiaro** più chiari per ogni tinta (Blu, Viola, Rosa, Grafite non più quasi neri); pallini di «Colore» e anello del
    profilo con colori vivi. Tema scuro invariato (una revisione più accesa è stata provata e ritirata).
  - **Menu dell'account** senza limite di altezza fisso; **template dopo template**: importo ed esercente del precedente non restano.
- **Novità del 22 novembre, in breve:** app Android (0.1.0–0.3.1); Indietro che chiude ciò che è aperto ed esce solo da Nuova spesa;
  immagine del profilo (avatar astratti o foto); blocco dell'app (impronta, viso o PIN; PIN di Nummo in Standard); importo massimo
  999.999.999,99 € (Rules pubblicate); limiti di lunghezza dei campi; barra dei menu lontana dagli angoli; scansione più ordinata.
- **Verifiche (ultime).** Su `8d4023f` (24 novembre, codice di `1ad74ad`, albero pulito): `npm run check` OK (**590/590**, typecheck, build demo); documenti confrontati col codice e riallineati. Su `d196dc9` (24 novembre, albero pulito): `npm run check` OK (**590/590**, typecheck, build demo). Su `da3103e`: `npm run check` OK (**585/585**, typecheck, build demo). Su `e3c250e`: `npm run check` OK (**585/585**). `scripts/check-keyboard.mjs` in sei
  scenari, con la nuova modalità `--ios` (visual viewport che si riduce e si sposta come in Safari) e quella Android: `#root` sull'area
  visibile in ogni fotogramma, nessun long task né errore JS. Chromium headless: cambio tema (cerchio da 868 ms, `theme-color` dopo 145 ms),
  menu ancorato su desktop, nessun errore JS. Su `f74ff3a`: `assembleDebug assembleRelease` OK. `test:emulator` **24/24** l'ultima volta su
  `48361b9`: Rules, `DataStore` e servizi invariati da allora; `test:hybrid` **9/9** su `f4691aa`.
- **Da provare sul telefono (priorità):**
  0. iPhone (Safari e web app installata), dopo l'audit mobile: tastiera su Nuova spesa con un campo in basso e la Descrizione, dialogo di
     modifica, PIN della schermata di blocco; scorrimento del modulo a tastiera aperta (`#root` segue ogni spostamento: guardare se trema);
     cambio chiaro/scuro; Indietro a scorrimento; blocco (Safari può chiedere un tocco: c'è «Sblocca»).
  1. Colori del tema chiaro su telefono (ogni colore, Palette e Monocolore; anello in Avanzata). Tastiera lenta alla prima apertura: chiedere
     se nell'app o in Chrome, quanto presto dopo l'apertura, Standard o Avanzata (misure nella sezione datata «Colori degli accenti…»).
  2. App 0.3.2 sul Pixel 8: Notifiche → «Attiva notifiche di sistema», primo promemoria all'orario scelto dopo ore a schermo spento e in
     Non disturbare, tocco sulla notifica; Avanzata con l'accesso Google reale, uscita e nuovo accesso; vibrazione su legenda e grafici di
     Analisi e sul trascinamento della barra; cambio tema (le barre di Android hanno un solo colore: quella in basso può cambiare poco prima
     del cerchio).
  3. App sul Pixel 8: Indietro e gesto Indietro di sistema più volte di fila senza toccare lo schermo; blocco con impronta/viso reali e
     recupero in Avanzata con «Esci»; foto del profilo dalla galleria; in Standard PIN di Nummo («Non riesco a sbloccare», «Cambia il PIN»)
     e «Elimina tutte le spese»; fotocamera, backup e ripristino nell'app.
  4. In produzione (Avanzata): una spesa oltre 99.999,99 € accettata dal server; scelta di un avatar e ritorno alla foto Google; menu
     dell'account con «Esci» senza scorrimento.
  5. Rimasti dal 21 novembre: menu «immagine» al tocco prolungato, modifica spesa a 360–412 px, revisione dello scontrino su telefono reale.
- **Da verificare su dispositivo (storico):** «Carica foto» e scansione con l'AI da telefono; blocco dello zoom con due dita; ritocchi mobile
  del 17 novembre su iPhone e scheda AI con Gemini reale; icona dell'app (cache del launcher). Notifiche: consegna reale ad app chiusa (orario scelto, fuso diverso da Roma, rinnovi) non verificata.
- **Noti e non corretti:** nella scheda «Totale» di Spese, con importi enormi su schermi stretti (360 px), il conteggio va a capo e il
  separatore sottile resta a fine riga; la ricerca delle categorie (da 9 categorie) e quella degli abbonamenti non provate nel browser; il
  pulsante tondo della barra mobile anima la larghezza in JS (un ricalcolo del layout per fotogramma per 250 ms, nessun artefatto visto).
- **Ambiente.** Il 23 novembre era attivo un runner hybrid dell'utente (PID 6588, `dev-hybrid.ts --clear`, con il suo lock,
  `.nummo-hybrid-6588.json` e la sessione `hybrid-NBhDrA`): stato del momento, non toccato. In `.firebase/` restano, per scelta dell'utente,
  `hybrid-hRM9mM/previous` (copia del 16 novembre), `backup-prod-20261110-021925/` (backup dei dati di produzione del 10 novembre) e
  `hosting.*.cache` (della CLI); `hybrid-vtMRe6/previous` è la copia dell'archivio locale delle 17:11 del 22 novembre, lasciata dalla
  promozione delle 21:11 che ha prodotto l'attuale `emulator-data/`. Le altre cartelle citate nelle sezioni storiche sono state tolte il
  22 novembre. AVD `Pixel_8` dell'emulatore con un PIN di blocco sconosciuto: per le prove usare `Medium_Phone_API_37.0` (Android 17).
  Per prove con emulatori usare porte e config temporanee proprie (es. 39199/39380) e rimuoverle a fine prova.
- **Issue:** nessuna aperta. **Idee concordate:** `TODO.md` (Firebase unico per tutti; il link di precompilazione è implementato e pubblicato il 24
  novembre, vedi la sezione datata).
- **Cosa resta aperto** (dettagli in «Prossime attività», in fondo al file): prove su iPhone dopo l'audit mobile e sul Pixel 8 (sopra);
  Avanzata con notifiche e riepilogo mai provata nel browser (solo test di dominio); Safari/iOS/Firefox (protezione locale e richiesta di
  Firefox); collaudo in demo con `docs/testing/` (file v11 creato e collaudato il 23 novembre). La tastiera automatica di Nuova lista/Nuovo fondo
  non è più da provare: dal 23 novembre su touch nessun campo prende il focus all'apertura (`initialFocusAllowed`).

## Matita dei Templates, pulsanti a pillola nei dettagli, poster della fotocamera — 24 novembre 2026

- **Su richiesta.** (1) Templates: la riga non è più un pulsante; solo la matita a destra apre la modifica, `IconButton` 48×48 senza
  contorno come quella dei prodotti in Liste (prima tutta la riga, con una matita decorativa in un riquadro con contorno).
  (2) Dettaglio dell'abbonamento: «Annulla abbonamento», «Metti in pausa» e «Riattiva» a pillola (`radius.pill`) come «Modifica»;
  poi, sempre su richiesta, anche «Aggiungi denaro» e «Archivia» del dettaglio del fondo.
- **Su segnalazione** (screenshot dall'app Android): all'apertura della fotocamera della scansione la WebView mostrava il suo poster
  predefinito (grigio con il tasto play) durante «Avvio della fotocamera…». `CameraViewfinder`: `poster` GIF trasparente 1×1 e video a
  opacità 0 fino a `onPlaying`. Correzione solo web: arriva all'app con la pubblicazione, senza un nuovo APK.
- **Verifica:** `npm run check` OK (**597/597**). Chromium headless su `dist-demo`, Standard, scuro, 390×844 e 1440×900: Templates (9
  template di `nummo-template-v11.json`) clic sul testo della riga → nulla, sulla matita → «Modifica template», hover solo sulla matita;
  fotocamera finta: video a opacità 0 finché `readyState` < 4, poi 1 (circa 180 ms); dettaglio di «Affitto» e di un fondo
  (`nummo-utente-medio.json`): pulsanti con raggio a pillola; nessun errore JS. **Non provati** su telefono (il poster grigio compare solo
  nella WebView/Chrome Android). Commit `665d96e`, pubblicato su Hosting.

## «Apri a metà schermo»: testo più semplice, dopo «Vibrazione» — 24 novembre 2026

Su richiesta: la riga di supporto ora dice «Su smartphone le schede si aprono a metà: trascinale in su per ingrandirle.» (anche in
`en.ts`); l'interruttore è dopo «Vibrazione» nella scheda Funzionalità (nel browser, dove «Vibrazione» non c'è, è l'ultimo).
`npm run check` 596/596. Committato e pubblicato su Hosting.

## Archiviazione a pillole, form delle Categorie, ripristino delle categorie — 24 novembre 2026

Su richiesta. (1) Tutti i pulsanti di «Archiviazione e backup» a pillola (`StorageSection`, `ModeTransfer`, `BackupActions`).
(2) Categorie su smartphone: nome e «Icona» sulla stessa riga, «Aggiungi» sotto a tutta larghezza. (3) «Ripristina le categorie
predefinite» (scelta dell'utente: tenere quelle usate): conferma (`DeleteDialog`, «Ripristina») che dice quante se ne eliminano e
quante restano; poi elimina una per una le categorie non usate da spese o abbonamenti (`resetCategories` in `Workspace`, stessa
eliminazione del cestino) e aggiunge le predefinite mancanti per nome. Testi in `en.ts`. Verifica: solo `npm run check` 596/596
Commit `ca00370`, pubblicato su Hosting (bundle online identico
all'export). Poi headless a 390×844 con `nummo-utente-medio.json` (15 categorie): «Icona» a destra del nome (stessa riga), «Aggiungi»
sotto a tutta larghezza; l'avviso dice «Si eliminano 5 categorie non usate. 10 categorie restano perché le usano spese o
abbonamenti…»; dopo «Ripristina» restano le 10 usate più le 5 predefinite; nessun errore JS. Non provato su telefono.

## Pannelli anche in Fondi, niente Indietro nei dettagli, titolo staccato dalla maniglia — 24 novembre 2026

Su richiesta (screenshot dal telefono).
- Conferma di eliminazione: «Annulla» (e «Chiudi») alti quanto «Elimina» (`DeleteAction.tsx`: contenuto `minTouch - 2`, il bordo da 1
  del pulsante con contorno faceva 2 in più).
- Pannelli e dettagli su smartphone: il titolo e il contenuto partono 12 sotto la maniglia (`handleClearance` di `ScreenLayer`: prima il
  titolo di «Scansiona scontrino» la toccava).
- Nessun pulsante Indietro su smartphone in tutti gli schermi con le tre posizioni, quindi anche nei dettagli di spesa, abbonamento e
  fondo (prima solo nei pannelli).
- Pagina Fondi: «Nuovo fondo»/«Modifica fondo» (`FundEditor`) e «Aggiungi denaro»/«Trasferisci tra fondi» (`MovementDialog`) diventano
  pannelli (`detents` di `AppDialog`): trascinamento giù a metà o chiuso, su per espandere, aperti interi o a metà secondo
  «Apri a metà schermo».
- Verifica: `npm run check` 596/596; headless con touch a 390×844: titolo 22 sotto la maniglia (Scansiona, Nuovo fondo, Aggiungi
  denaro, Trasferisci), nessun Indietro nel dettaglio di una spesa e nei pannelli, i tre schermi di Fondi trascinati giù di 300 vanno a
  metà; nessun errore JS. Altezze della conferma di eliminazione non misurate in headless (stessa correzione dei pulsanti del fondo,
  misurata il 24). Commit `1ed557b`, pubblicato su Hosting (bundle online `index-ec8f0b2f…` identico all'export).

## «Annulla» a pillola nella conferma di eliminazione — 24 novembre 2026

Su richiesta (screenshot dal telefono, «Eliminare l'esercente Amazon?»): in `DeleteDialog` (`DeleteAction.tsx`) «Annulla», e «Chiudi»
quando l'eliminazione è bloccata, sono a pillola (`radius.pill`) come «Elimina» sotto, con il loro contorno; vale per ogni conferma
di eliminazione. `npm run check` 596/596. Commit `73b9d75`, pubblicato su Hosting (bundle online `index-5b145579…` identico
all'export, insieme alle due sezioni seguenti).

## Rilascio secondo la lunghezza, «Apri a metà schermo» spento di base — 24 novembre 2026

Su richiesta («se lo swipe è più lungo chiude l'intera pagina, se è più corto la tiene aperta a metà; il toggle al contrario: di base
si aprono per intero e con il toggle a metà»). Vale per dettagli e pannelli.
- `detentOutcome` (`menuGeometry.ts`) decide per lunghezza, non più per posizione più vicina: da intero, oltre metà schermo chiude; un
  trascinamento più corto ma voluto (almeno `deliberate` = min(64, 10 % dell'altezza)) o un colpo verso il basso lascia a metà; meno
  resta intero. Da metà: almeno `deliberate` (o un colpo) verso il basso chiude, verso l'alto riapre intero; meno resta a metà. Test
  aggiornati in `tests/menuGeometry.test.ts`.
- `halfScreens` spento di base (`defaultPreferences`, `HalfScreensContext` con `false`); testo della riga «… si aprono a metà invece
  che interi …» (anche in `en.ts`); test in `tests/preferences.test.ts`. Chi l'aveva già acceso lo ritrova acceso.
- Verifica: `npm run check` 596/596; headless con touch a 390×844: i passaggi del dettaglio come prima, più trascinamento lungo da
  intero (300 → 800) → chiuso e corto (300 → 450) → metà; con le preferenze di base la Categoria si apre intera (844). Nessun errore
  JS. Committato e inviato.

## Pannelli a metà schermo: Template, Scansiona scontrino, data, Categoria, Fondo — 24 novembre 2026

Su richiesta, dopo la prova sul telefono dei dettagli («funziona bene; stesso comportamento per Template, Scansiona scontrino, il
calendario, la categoria e il fondo; in queste sezioni eliminare il tasto torna indietro; un toggle nelle impostazioni per aprire la
pagina per intero o per metà, standard per metà»).
- `ScreenLayer` `detents="panel"`: le tre posizioni dei dettagli (intero, ridotto, chiuso; trascinamento da tutta la superficie,
  maniglia anche pulsante, tocco sopra chiude in ridotto), ma in ridotto lo schermo **si accorcia** (`top` = metà altezza, non un
  `transform`): l'area scorrevole e le azioni in fondo restano nella metà visibile («OK» della data, «Scatta foto»). Nessun pulsante
  Indietro su smartphone; da medium invariati (schermo del pannello con Indietro). Un campo di testo che prende il focus in ridotto apre
  il pannello intero (la tastiera). Apertura in ridotto: posizionato prima del primo disegno e poi sale come un foglio (pagina ferma e
  velata, barre dell'app visibili); intero come gli altri schermi.
- Dove: «Template» (`TemplatePicker`) e «Scansiona scontrino» (`ScanReceiptDialog`) con `detents` di `AppDialog`; il selettore della
  data su smartphone (`DateField`: prima un foglio, ora pannello; layout del telefono invariato, titolo dentro); Categoria e Fondo con
  `panel` di `SelectField`, impostato in `ExpenseFields` e `FundField` (quindi ovunque compaiono: Nuova spesa, modifica della spesa,
  Templates, revisione dello scontrino, registrazione di una lista); gli altri `SelectField` restano col foglio dal basso.
- Impostazioni › Funzionalità: «Apri a metà schermo» (`halfScreens` in `nummo.preferences.v1`, acceso di base, poi spento di base
  lo stesso giorno: vedi sopra; `HalfScreensContext` in `ScreenLayer`, fornito da `App.tsx`). Spento, i pannelli si aprono interi e si possono
  comunque ridurre. Testi in `en.ts`; test in `tests/preferences.test.ts`.
- Verifica: `npm run check` 596/596. Chromium headless con touch emulato a 390×844, backup di prova con fondi: acceso, Categoria,
  Fondo, data e Scansiona si aprono a metà (alto 422 su 844, nessun Indietro, «OK» a 820 visibile); trascinata su la Categoria diventa
  intera, giù torna a metà, la scelta di una voce chiude e imposta il campo; tocco sopra chiude Fondo e data. Spento: si aprono interi
  (alto 844). Nessun errore JS. Template non provato in headless (servono template salvati e l'interruttore «Usa i template»). Non
  provato su telefono. Committato e inviato.

## Trascinamento da tutto il pannello, nota su Drive tolta, pulsanti alti uguali — 24 novembre 2026

Su richiesta.
- **Trascinamento da qualunque punto** («lo swipe si potesse fare anche senza toccare la maniglia, in tutto il pannello»): dettagli
  su smartphone e fogli (Nuova lista, Modifica lista e prodotto, selettore della data e «Da quando») si trascinano col dito da tutta
  la superficie: `watchDrag` di `ScreenLayer` (eventi touch sulla superficie, proprietario del gesto deciso una volta oltre lo slop:
  `sheetGestureOwner` per i fogli, `detailGestureOwner` per i dettagli; se un contenitore tra il dito e la superficie è scorso, resta
  uno scorrimento normale, `scrolledBetween`). Col mouse dalla maniglia (fogli) o dalla barra in alto (dettagli), oltre lo slop.
- **Tolta la nota** «* Salva il file su Google Drive o in un altro posto sicuro, fuori da questo dispositivo.» sotto «Backup completo»
  (Archiviazione e backup); tolta anche da `en.ts`; `tests/i18n.test.ts` ammette ora un solo testo con «Google Drive» (il consiglio
  nel dialogo del cambio di modalità).
- **Pulsanti alti uguali** nel dettaglio del fondo: «Aggiungi denaro» e «Archivia» alti 56 come «Modifica» (prima 48); lo stesso per
  «Annulla abbonamento», «Metti in pausa»/«Riattiva» del dettaglio dell'abbonamento (`secondaryActionContent`, `outlinedActionContent`
  con 2 in meno per il bordo da 1 dei pulsanti con contorno: misurati 56/56/56 all'esterno).
- Verifica: `npm run check` 595/595. Chromium headless con touch emulato a 390×844: i dieci passaggi del dettaglio di una spesa come
  prima; foglio di Nuova lista: trascinamento corto dal titolo → torna su, trascinamento dal campo del nome → chiuso; altezze dei
  pulsanti del fondo a 1440×900. Commit `10f3f67`, pubblicato su Hosting (bundle online `index-d394291d…` identico all'export).

## Dettagli su smartphone: intero, ridotto, chiuso — 24 novembre 2026

Su richiesta («uno swipe solo da mobile per tirare giù la scheda e chiuderla, ma la si può anche tenere come piccola
visualizzazione e decidere se ingrandirla o chiuderla»; poi «procedi con la tua proposta, solo per i dettagli»).
- Solo i dettagli di spesa, abbonamento e fondo (`detents` passato da `DetailScreen` e `FundDetail`), solo su smartphone; da medium
  nulla cambia, e nemmeno moduli, «Prossimo mese», lista aperta e fogli.
- Tre posizioni: intero, ridotto (lo schermo scende di metà altezza, `peekOffset`, e mostra la sua parte alta sulla pagina velata;
  angoli da 28 e ombra come durante lo scorrimento; tornano la barra in alto e la navigazione della pagina, `holdChrome` rilasciato e
  ripreso) e chiuso. Rilascio: `detentOutcome` (`menuGeometry.ts`): un colpo veloce (≥ 0,5 px/ms e ≥ 24 px) fa un passo nella sua
  direzione (verso l'alto sempre intero), altrimenti la posizione più vicina; i passaggi animati sulla molla dello scorrimento.
- Dove si trascina: la barra in alto (il trascinamento parte oltre `sheetDragSlop`, così il tocco su Indietro resta un tocco; il clic
  che segue un trascinamento entro 500 ms è scartato) e il contenuto: da intero solo se è in cima e il gesto va in giù, da ridotto in
  entrambe le direzioni (`detailGestureOwner`, eventi touch con `overscroll-behavior: contain`).
- In ridotto un tocco sulla pagina sopra chiude (come il velo di un foglio); Indietro/Escape chiudono da entrambe le posizioni (dal
  ridotto lo schermo scende da dove è, `slideDown`). Maniglia in alto, anche pulsante: «Riduci i dettagli» / «Espandi i dettagli»
  (traduzioni in `en.ts`).
- Verifica: `npm run check` 595/595 (nuovo test delle posizioni in `tests/menuGeometry.test.ts`). Chromium headless con touch
  emulato, 390×844, dettaglio di una spesa: barra trascinata lenta → ridotto (barre dell'app visibili); maniglia → intero; contenuto
  in giù → ridotto; contenuto in su da ridotto → intero; colpo veloce → ridotto, un altro → chiuso; maniglia → ridotto, tocco sopra →
  chiuso; tocco su Indietro → chiuso; nessun errore JS. Nel simulatore il dito «si ferma» circa 50 ms prima di sollevarsi: i colpi
  provati con passi più ampi. **Da provare sul telefono** (Android nell'app e in Chrome, iPhone): sensibilità del colpo, conflitto con
  lo scorrimento del contenuto, rimbalzo di iOS. Commit `10f3f67`, pubblicato su Hosting.

## Schermi a scorrimento (scelto tra tre prove) — 24 novembre 2026

Su richiesta («le animazioni di chiusura continuano a non convincermi, proponimi tre tipi di aperture e chiusure sincronizzate»):
provate tre coppie sui pulsanti di Fondi (trasformazione sincronizzata, zoom con dissolvenza, scorrimento verticale); scelto lo
scorrimento, rifinito («più carino e smooth») e applicato a **tutti gli schermi interi** («sostituisci le vecchie animazioni con
questa»), tolte le altre due e i segni di prova.
- `ScreenLayer.tsx` (`slide`): lo schermo sale dal bordo inferiore del suo riquadro (pannello da medium, tutta l'app su smartphone)
  su `slideSpring` 0,95/220 (circa 470 ms, 90 % a 245 ms, senza rimbalzo), con angoli superiori da 28 e un'ombra sopra il bordo
  (colore `backdrop`) che si appianano all'arrivo: nel tema scuro schermo e pagina hanno lo stesso colore e senza il bordo non si
  vedeva. La pagina sotto (`[role=main]`) arretra a 0,96 attorno al centro della parte in vista e si scurisce (velo 0,32). Ridiscende in
  280 ms con la curva accelerata, di nuovo con angoli e ombra, mentre la pagina torna a 1 (non quando gli schermi si chiudono per un
  cambio di pagina, `closeAllScreens`: lì entra la nuova pagina). L'animazione della pagina si annulla appena finita. L'elemento
  premuto resta visibile (prima spariva finché lo schermo era aperto).
- Invariati, su richiesta: l'entrata delle pagine del menu account e delle destinazioni della barra (animazione della pagina in
  `AppShell`, `detailSpring`).
- Anche i fogli dal basso (`variant="sheet"`: Nuova lista, Modifica lista e prodotto, selettore della data e «Da quando» su
  smartphone), su segnalazione dello stesso giorno: salgono della propria altezza (più l'ombra) sulla stessa molla e ridiscendono;
  ombra sopra il bordo, angoli sempre da 28, velo che resta finché sono aperti, pagina sotto ferma (resta visibile sopra il foglio);
  il trascinamento della maniglia invariato (`slideDown`). Il vecchio container transform non ha più utenti ed è stato tolto
  (`play`, origine, copia della scheda, `cardClip`/`usableCard`/`crossfade`/`closeLead`/`closePrecision`/`contentScale` e i loro
  test); `originId` resta accettata da `ScreenLayer` ma non usata (la passano ancora quattro chiamanti, tra cui `FundDetail.tsx`,
  che ha modifiche aperte di un'altra sessione).
- `theme/containerTransform.ts`: `slideTimings`, `slideSpring`.
- Verifica: `npm run check` 594/594 (tolti i test del container transform, aggiunti quelli dello scorrimento); registrato anche il
  foglio di Nuova lista a 390×844; registrazione headless rallentata (0,3×) del dettaglio di una spesa a 1440×900 e 390×844 e,
  durante le prove, dei tre schermi di Fondi: nessun errore JS. Non provato su dispositivi reali né nel tema chiaro. Commit
  `05a5ed6`, pubblicato su Hosting (`npm run deploy:hosting`, bundle online `index-daac10be…` identico all'export locale).

## Schermi: chiusura senza coda, apertura e chiusura più rapide — 24 novembre 2026

Su richiesta («le animazioni non sono ancora perfette, in particolar modo la chiusura»; «leggermente più veloci»). Registrazione
headless rallentata (0,3×) del dettaglio di una spesa a 1440×900 e 390×844: in chiusura il contenitore, già vuoto, passava gli ultimi
circa 300 ms poco più grande della scheda, coprendo righe vicine e intestazione del mese, che poi riapparivano a scatto.
- `theme/containerTransform.ts`: `detailSpring` 0,95/260 (prima 0,95/200): apertura circa 480 ms (prima 550), anche l'entrata delle
  pagine di `AppShell`; `closePrecision` 0,01: la chiusura si ferma al 99 % (circa 380 ms); `closeLead` 70 (prima 90): chiusura completa
  circa 450 ms (prima circa 640); `crossfade.close.surfaceGone` 0,7.
- `ScreenLayer.tsx` (`play`): in chiusura il fondo del contenitore va dal colore della scheda (al 35 %, copia già piena) a trasparente
  al 70 %: la pagina riappare in dissolvenza attorno alla copia invece di essere coperta fino all'ultimo.
- Test: `tests/containerTransform.test.ts` aggiornato (durate, chiusura sotto i 460 ms, ordine delle dissolvenze). `npm run check`
  597/597. Rivista la registrazione dopo la modifica a entrambe le dimensioni, nessun errore JS. Non provato su dispositivi reali né nel
  tema chiaro (la copia della scheda piena porta il proprio fondo). Committato e inviato, non pubblicato su Hosting.

## Prima spesa sfumata entrando in Spese — 24 novembre 2026

Su segnalazione (desktop, tema scuro): entrando in Spese una riga interamente visibile restava sbiadita e ritagliata come
se fosse tagliata dal bordo del pannello. Causa: dal 24 novembre anche le destinazioni entrano con l'animazione della pagina
(`translateY` + `scale` in `AppShell`); `observeWholeRows` (`theme/wholeRows.ts`) misurava le righe durante l'animazione,
quando la pagina era ancora più in basso, marcava `data-clipped` la riga che allora toccava il bordo e non rimisurava più
(le animazioni WAAPI non generano `scroll`, `resize` né mutazioni). Correzione: prima di misurare, se un'animazione di
`transform` in corso dentro lo scroller contiene righe marcate, si aspetta la sua fine (`movingRows`, `finished`) e poi si
misura; nessun'altra modifica.

Verifica: `npm run check` (596/596). Headless Chromium 1440×900, Standard scura con `docs/testing/nummo-utente-medio.json`
unito, tre passaggi Analisi → Spese: prima della correzione «Spesa Lidl» (bordo inferiore 848, pannello 868) restava
`data-clipped`; dopo, solo la riga davvero tagliata dal bordo («Bolletta luce», 856–918). Non provato su smartphone o
tablet reali. Committato e inviato, non pubblicato su Hosting.

## App Android 0.3.3: icona nera con logo bianco — 24 novembre 2026

- **Su richiesta.** Solo la versione (versionCode 6, `versionName` 0.3.3, commit `6e3ebd0`): l'icona era già in `colors.xml` (`a8f694f`).
  Release compilata in una worktree pulita su `6e3ebd0` (rimossa con la copia della chiave): `apksigner verify` OK, certificato
  `00b1c85c…0fcf` (lo stesso delle versioni precedenti: si aggiorna sopra la 0.3.2), `aapt2`: `icon_background` `#ff000000`,
  `icon_foreground` `#ffffffff`. File: `android/app/build/outputs/apk/release/nummo-0.3.3.apk` (ignorato da Git) e `.sha256`
  (`52277a55…0f53`). **Non** installato su emulatore o telefono. **Release GitHub `android-v0.3.3`** (su richiesta: tag annotato su
  `6e3ebd0`, inviato; APK e `.sha256`, SHA-256 dell'APK confermato da GitHub), segnata «Latest» al posto della 0.3.2. Il sito non cambia.

## Icona nera con logo bianco; transizione lista ↔ dettaglio senza sovrapposizioni — 24 novembre 2026

- **Icona (su richiesta):** fondo nero e logo bianco per favicon, icone del manifest, `apple-touch-icon` e app Android (`colors.xml`);
  dettagli in `docs/icone-installazione.md`. Il logo nella barra in alto dell'app resta nel colore del tema. **App Android:** il cambio
  arriva solo con un nuovo APK (non ricompilato né rilasciato). PWA installate: icona aggiornata quando il browser rilegge il manifest.
- **Transizione (segnalazione dell'utente con tre sintomi):** cause e correzione in `docs/architecture.md` («Transizione lista ↔
  dettaglio…»). Verifica in Chromium headless su `dist-demo` (Standard, scuro, 14 spese create col link di precompilazione), animazioni
  ferme a 30/80/140/220/320 ms: prima il contenuto compariva sopra filtri e lista a 80–140 ms, la scheda lasciava un vuoto, la barra
  «Nummo» copriva il pulsante Indietro a 20–60 ms in chiusura; dopo nessuno dei tre. Chiusura seguita da scorrimento a 60 ms: copia tolta
  entro 150 ms, scheda opaca. Barra e navigazione: 0 da aperto, 1 dopo, anche con Modifica sopra il dettaglio; da desktop mai nascoste.
  Nessun errore JS. **Non provato su telefono reale** (gesto Indietro di iOS/Android). Movimento ridotto invariato (istantaneo).
  `npm run check` OK (**596/596**, insieme alle notifiche). Committato in `a8f694f`, inviato e pubblicato su Hosting (bundle
  `index-ab8ddc12…` e icone online identici byte per byte). APK non ricompilato.

## Modello assetlinks tolto — 24 novembre 2026

- **Su richiesta** («togli assetlinks.json con i segnaposto e ripubblica»): tolti `public/.well-known/assetlinks.json`, la regola
  `Content-Type: application/json` per quel percorso in `firebase.json` (senza il file l'avrebbe messa sull'`index.html` del rewrite) e
  il controllo del file in `scripts/deploy-hosting.ts`; `docs/notifiche-push.md` e `AGENTS.md` aggiornati. Il resto del lavoro sulle
  notifiche (sezione più sotto) resta. Per un'eventuale TWA il file vero andrà rimesso in `public/.well-known/`.
- **Verifica:** `npm run check` OK (**596/596**), `dist-demo/` senza `.well-known`. Committato in `27e46bd`, inviato e pubblicato su
  Hosting (bundle `index-050698b4…` invariato, identico byte per byte). Online `/.well-known/assetlinks.json` risponde ora `[]`
  (`application/json`, `x-cache: MISS`): è la risposta predefinita di Firebase Hosting per quel percorso senza un file del sito,
  nessuna app associata; niente più segnaposto.

## Fotocamera della scansione come livello immersivo — 24 novembre 2026

- **Su richiesta** (da riquadro centrato con «Annulla»/«Scatta» impilati a foglio immersivo ancorato in basso). Nuovo
  `src/features/receipts/CameraViewfinder.tsx`: portale in `#root` (`position: absolute; inset: 0` = l'area visibile, anche con il
  visual viewport di iOS; lo schermo di blocco lo rende `inert`), z-index 1100; fascia scura in alto (24 %, safe area) con «Scansiona
  scontrino» e la torcia solo se `getCapabilities().torch` (stato in `ScanReceiptDialog`, `applyConstraints({ advanced: [{ torch }] })`);
  foglio `flex: 1` con angoli superiori `radius.dialog` (28), `<video>` in `object-fit: cover` a tutta superficie, maniglia 38×4,
  suggerimento in pillola con `backdrop-filter: blur(10px)`; in fondo, su un gradiente, Indietro (48, sfocato 12), scatto (72, disco bianco
  con anello traslucido) e galleria (48). Colori fissi scuri in `viewfinderColors` (`theme/palette.ts`), icona `flash` in `SvgIcon`.
  `useEscape` (Escape e Indietro chiudono la fotocamera), `overrideDocumentChrome` (barra di stato scura), focus su Indietro e ritorno
  all'origine. Lo scatto è invariato (fotogramma nativo intero); i tracciati si fermano come prima (scatto, chiusura, smontaggio). La
  galleria dalla fotocamera la chiude solo quando si sceglie un file. Sotto il livello il dialogo resta al passo da cui si è partiti
  (`shown`). Testi nuovi: «Accendi la torcia»/«Spegni la torcia» (con l'inglese). A ogni dimensione copre tutta l'app, come chiesto
  («fullscreen»), non solo il pannello come gli schermi da medium.
- **Verifica:** `npm test` OK (**596/596**), typecheck, `build:demo`. Chromium headless con fotocamera finta su `dist-demo`, Standard,
  scuro, 390×844 e 1440×900: livello 390×844 / 1440×900 dentro `#root`, foglio da 203 / 216 alto 641 / 684 con angoli 28/28/0, video
  `cover` a 1920×1080 nativi, pulsanti 48/72/48, focus su «Torna indietro», `theme-color` #0B0A08; Escape → livello chiuso, dialogo
  al passo «Scegli»; «Scatta» → foto nell'anteprima e «Scansiona»; nessun errore JS. **Non provati:** torcia reale (Chrome Android),
  iPhone, app Android (WebView), galleria aperta dalla fotocamera su telefono. Committato in `b231eeb`, inviato e pubblicato su
  Hosting su richiesta (bundle `index-050698b4…` identico byte per byte).

## Notifiche: forma uniforme, tocco con ripiego, iOS solo dalla Home, modello assetlinks — 24 novembre 2026

- **Su richiesta** (audit e standardizzazione delle notifiche push). Scelte dell'utente: `icon` resta il PNG trasparente
  (niente icona ripetuta a destra su Android); con una finestra aperta il tocco resta un messaggio, `navigate` solo come ripiego.
  - `public/sw.js`: titolo del ripiego «Nuovo avviso»/«New notice» (prima «Nummo»); `data.url` (`/?notifica=…&dal=…&al=…`) in ogni
    notifica; push non JSON letto come testo (nome di un tipo → quel tipo), errore nel mostrare → notifica generica; tocco: finestra
    in primo piano per prima, messaggio, `navigate(data.url)` solo se il messaggio non arriva, poi `openWindow`; `data.url` di
    un'altra origine ignorato. Cache offline invariata (nessun file della pagina offline cambiato).
  - `src/services/pushNotifications.ts`: `isStandalone`; su iPhone/iPad `needs-install` fuori dalla Home anche se la scheda espone
    le API push; permesso già negato → `denied` senza richiesta; errori del service worker e di `getSubscription`/`unsubscribe`
    classificati come «browser»; una sola sottoscrizione per browser (riuso con la stessa chiave, come prima).
  - `public/.well-known/assetlinks.json` (modello con segnaposto `REPLACE_WITH_…`), `firebase.json` (`Content-Type:
    application/json`, cache 1 h), `deploy:hosting` richiede il file in `dist/`. La CLI di Firebase lo include già (`**/.*` esclude solo
    nomi che iniziano col punto, provato con il suo `listFiles`); l'export di Expo lo copia. **Attenzione:** il prossimo
    `deploy:hosting` pubblica il modello con i segnaposto (innocuo, nessuna app lo verifica). Serve solo a una TWA: l'app di
    `android/` è una WebView con notifiche locali, già senza «• dominio»; per le WebAPK di Chrome il suffisso non si toglie.
  - Manifest già conforme (`name`/`short_name` «Nummo», `standalone`, `start_url`/`scope` `/`, icone `any` e `maskable` separate): invariato.
  - Documenti: `docs/notifiche-push.md` (anche la riga superata «nessun gestore `fetch`»), `AGENTS.md`.
- **Verifica:** `npm run check` OK (**596/596**, typecheck, build demo; `dist-demo/.well-known/assetlinks.json` presente). Nuovi
  test in `tests/serviceWorker.test.ts` e `tests/androidApp.test.ts`. **Non provati:** notifiche reali nel browser, su Android e iPhone.
  Committato in `e58ce41`, inviato e pubblicato su Hosting con `a8f694f` (bundle `index-ab8ddc12…`; online `sw.js` identico e
  `/.well-known/assetlinks.json` servito come `application/json`, ancora il modello con i segnaposto).

## Testi superati di README e Guida — 24 novembre 2026

- **Su richiesta.** README, «Notifiche»: tolto «o, in mancanza, come avvisi dentro l'app» (non esistono dal 15 novembre); ora cita
  anche i rinnovi e le notifiche dell'app Android. Guida, «Fondi e budget»: «Gli avvisi ti segnalano…» diventa «Nella pagina Fondi vedi
  quanto hai speso e se sei vicino al limite o l'hai superato…» (la barra del budget, `BudgetMeter`, lo scrive ancora; tolta solo la riga
  sotto il campo di Nuova spesa il 17 novembre), con la traduzione inglese. `npm run check` OK (**594/594**). Committato in `89c776d`, inviato e pubblicato su Hosting
  (bundle `index-3bd84bf7…` identico byte per byte).

## Link per compilare Nuova spesa — 24 novembre 2026

- **Su richiesta** («implementa il link di precompilazione di Nuova spesa», idea di `TODO.md` del 15 novembre, ora tolta da lì).
  `#nuova?importo=…&descrizione=…&esercente=…&data=…&categoria=…&fondo=…` apre Nuova spesa con quei campi compilati; si salva solo
  con «Salva». Scelte prese senza domande (da confermare con l'utente se non vanno): parametri in italiano; importo con simboli di valuta
  e separatori delle migliaia («€ 1.234,56», «1,234.56», «1.234» = 1234); data ISO o GG/MM/AAAA; categoria e fondo per nome (maiuscole e
  spazi indifferenti; `fondo=Nessuno` = «Nessun fondo»), mai creati; descrizione ed esercente tagliati al limite del campo (100 e 30);
  il link sostituisce solo i campi che porta e azzera la scelta del template; valori inutilizzabili o parametri sconosciuti → lasciati
  fuori e un avviso «Alcuni valori del link non sono stati usati…»; indirizzo ripulito subito (un ricaricamento non ricompila); a pagina
  aperta un cambio di hash riporta a Nuova spesa. File: `domain/prefillLink.ts`, `services/prefillLink.ts`, `Workspace`, `ExpenseForm`
  (`prefill`), voce nella Guida, `tests/prefillLink.test.ts`, README (tabella dei parametri e automazioni iPhone/Android), architettura.
- **Verifica:** `npm run check` OK (**594/594**). Chromium headless su `dist-demo`, Standard, scuro, 390×844 e 1440×900: link a freddo →
  importo «1234,56», descrizione, esercente, data 20 nov 2026, categoria Alimentari, indirizzo `/`, avviso per il parametro sconosciuto;
  da Analisi `location.hash = '#nuova?importo=5'` → Nuova spesa con importo 5 e il resto conservato; «Salva» → spesa in Spese con
  esercente «Bar Sport»; ricaricamento → modulo vuoto; nessun errore JS. **Non provati:** Avanzata (accesso prima del link), blocco
  dell'app acceso, automazioni reali su iPhone e Android. Committato in `2d3feed`, inviato e pubblicato su Hosting (bundle
  `index-62e94e98…` identico byte per byte).

## «Template» apre uno schermo come «Scansiona scontrino» — 24 novembre 2026

- **Su richiesta** (screenshot di Nuova spesa: «stessa animazione del tasto scansiona scontrino e lo stesso comportamento di visualizzazione
  ma deve partire dall'input template l'animazione e rispettare i colori di template»). `TemplatePicker` disegna da sé il pulsante (stessi
  contorno, icona, etichetta e freccia in `primary`) e al tocco apre un `AppDialog` a schermo (container transform dal pulsante, che sparisce
  finché lo schermo è aperto): titolo «Template», elenco con «Nessun template» in testa, icona della categoria, descrizione, importo a destra;
  la voce scelta in `primaryContainer` con la spunta. Una scelta chiude lo schermo e compila il modulo come prima (`applyTemplate`
  invariato); Indietro/Escape chiudono senza cambiare nulla. Tolte da `SelectField` le prop `trigger`, `triggerStyle` e `menuMinWidth`,
  usate solo qui. Nessun testo nuovo.
- **Verifica:** Chromium headless su `dist-demo`, Standard, scuro, `nummo-template-v11.json` importato dall'interfaccia, 390×844 e
  1440×900: ritaglio iniziale uguale al rettangolo del pulsante (anche dentro il pannello da desktop), pulsante a opacità 0 da aperto e 1
  dopo, nove template più «Nessun template», scelta di «V11 Pizza d'asporto» → 18,50, descrizione ed esercente compilati, voce segnata alla
  riapertura, Escape chiude; nessun errore JS. Non provato su telefono reale. `npm run check` OK (**590/590**). Committato in `1ad74ad`,
  inviato e pubblicato su Hosting (bundle `index-39223863…` identico byte per byte).

## Animazione piena anche per Nuova spesa e le destinazioni — 24 novembre 2026

- **Su richiesta** (screenshot del menu account e della rail: «le animazioni aggiunte a ciascuna di queste pagine voglio che le implementi
  anche per queste pagine»): Nuova spesa, Spese, Analisi, Fondi e Liste entrano con la stessa animazione delle pagine del menu account
  (da 24 più in basso e scala 0,97 → 1 sulla molla degli schermi 0,95/200, opacità in 300 ms, avviata subito). In `AppShell` un solo ramo,
  tolti il prop `emphasized` e `isAccountPage` di `Workspace`. Movimento ridotto: nessuna animazione, come prima.
- **Verifica:** `npm run check` OK (**590/590**, typecheck, build demo). Chromium headless su `dist-demo`, Standard, scuro, 1440×900 e
  390×844: Spese, Analisi, Fondi, Liste e Nuova spesa entrano da scala 0,97 e 24 più in basso, opacità 0 → 1, ferme (`none`, 1) entro
  700 ms; nessun errore JS. Non provato su telefono reale. Committato in `32a276f`, inviato e pubblicato su Hosting (bundle
  `index-4572a2bf…` identico byte per byte).

## Animazioni degli schermi come prima del 23 sera — 24 novembre 2026

- **Su richiesta** («riporta le animazioni a come stavano prima, le preferivo, adesso sono quasi troppo smooth e ho l'impressione che ci
  mettano tanto tempo»): `theme/containerTransform.ts` e il suo test tornati a `de199c7` (molla 0,95/200, circa 550 ms; dissolvenze non
  sovrapposte); in `ScreenLayer` tolti `startAfterPaint` e `contain: paint`; in `AppShell` l'entrata delle pagine del menu account parte
  subito (senza i due fotogrammi di attesa). Restano tutte le altre funzioni degli schermi (barre colorate, chiusura alla navigazione,
  livello che blocca il resto da desktop, origine nascosta).
- **Verifica:** `npm test` e `npm run check` OK; Chromium headless 390×844 scuro: tutti gli schermi si aprono e si chiudono animati, nessuna
  copia lasciata, nessun errore JS. Committato, inviato e pubblicato su Hosting su richiesta.

## Desktop come prima per selettori e fogli, schermi senza colori propri — 24 novembre 2026

- **Su richiesta.** Prima: commit `bafadd3`, push e Hosting pubblicato (bundle `index-aba7a80c…` identico byte per byte). Poi:
  (1) `SelectField` di nuovo con il menu ancorato da medium (foglio solo su smartphone); (2) «Prossimo mese» e «Storico dei pagamenti»
  nei colori della pagina (tolto `tone`; la riga «Storico dei pagamenti» resta nel colore tonale secondario); (3) da medium, con uno schermo
  aperto il resto dell'app non si tocca (livello trasparente in `ScreenLayer`, come il velo dei dialoghi di prima); (4) selettore della data
  da desktop: la data scelta come titolo accanto a Indietro, senza il blocco «Seleziona data» grande, così il mese intero entra; (5) da
  medium ogni `variant="sheet"` è uno schermo che riempie il pannello (Nuova lista, Modifica lista/prodotto, «Da quando»); (6) nel dettaglio
  di un abbonamento sparisce solo il pulsante premuto («Annulla» o «Pausa»), non tutti e due.
- **Verifica:** `npm run check` OK. Chromium headless 1440×900 scuro: Nuova lista 1160×792 = pannello; data senza scorrimento (ultima
  settimana a 523, «OK» a 788); clic sulla rail con la data aperta → nessun cambio di pagina, schermo ancora aperto; Categoria → menu
  ancorato. 390×844 scuro: data come foglio senza scorrimento, «Pausa» toccato → opacità 0, «Annulla» 1; nessun errore JS.
  Committato in `695a5c4`, inviato e pubblicato su Hosting (bundle `index-609f9367…`).

## Navigazione che chiude gli schermi, pagine del menu animate, lista come schermo, selettori come fogli — 23 novembre 2026

- **Su richiesta:** (1) con uno schermo aperto (es. la data da desktop) e poi Impostazioni dal menu, si vedono le Impostazioni:
  `closeAllScreens` (registro degli schermi aperti in `ScreenLayer`) chiamato da `navigate` e `finish` di `Workspace`; (2) la lista aperta
  in Liste è uno schermo cresciuto dalla scheda (titolo = nome della lista, tolta l'intestazione con Indietro della pagina e il suo
  `useBackLayer`); (3) Impostazioni, Notifiche, Categorie, Templates, Archiviazione e backup, Esercenti entrano con un'animazione più piena
  (`emphasized` di `AppShell`: traslazione 24 → 0 e scala 0,97 → 1 sulla molla degli schermi, opacità in 300 ms, avviata dopo due
  fotogrammi); «Esci» invariato; (4) `SelectField` usa il foglio dal basso anche da desktop; (5) nel dettaglio di un abbonamento «Annulla»
  e «Pausa» spariscono (opacità 0) mentre è aperto il foglio «Da quando».
- **Verifica:** Chromium headless 390×844 e 1440×900 scuro: data aperta → Impostazioni dal menu → nessuno schermo, pagina animata (opacità
  0,17 → 1, scala 0,974 → 1); lista aperta e chiusa dalla scheda; Categoria come foglio (640 di larghezza da desktop); riga di stato a
  opacità 0 col foglio di pausa; nessun errore JS. `npm run check` OK. Committato e inviato (vedi `git log`), pubblicato su Hosting il 24 novembre.

## Transizioni degli schermi più fluide — 23 novembre 2026

- **Su richiesta** («rendile ancora più smooth, non mi sembrano così lineari»). Causa misurata (CPU 4×, 390×844): l'animazione partiva
  prima che lo schermo fosse disegnato, quindi il primo fotogramma era già al 10–20 % e mancavano fino a 170 ms di fotogrammi. Ora
  `startAfterPaint` in `ScreenLayer` (animazioni in pausa sul primo fotogramma, avviate dopo due fotogrammi; anche chiusura, discesa del
  foglio e ricomparsa dell'origine), dissolvenze sovrapposte (`crossfade` in `containerTransform.ts`, test aggiornato), `contain: paint`
  durante il movimento, molla 0,95/170. Misura dopo: primo fotogramma allo 0 % entro 8–42 ms, buchi massimi 33–67 ms (prima 67–167), nessun
  errore JS; suite degli schermi di nuovo OK. `npm run check` OK. **Da sentire su telefono reale.** Committato e inviato (vedi `git log`), pubblicato su Hosting il 24 novembre.

## Niente tastiera da sola, barre colorate, data a schermo intero da desktop — 23 novembre 2026

- **Su richiesta/segnalazione dell'utente (screenshot dall'app Android):** (1) su smartphone nessun campo prende il focus all'apertura, nemmeno
  in Nuova lista e Nuovo fondo (`initialFocusAllowed` di `viewport.ts` ignora `textEntry` su touch; con tastiera fisica e mouse il nome resta
  selezionato; test aggiornato); (2) gli schermi colorati («Prossimo mese», «Storico dei pagamenti») lasciavano scure la barra di stato e
  quella di navigazione dell'app: ora `ScreenLayer` con `tone` su smartphone colora `theme-color` e le barre di sistema dell'app con
  `overrideDocumentChrome` (nuovo in `bootTheme.ts`, pila di override, rilasciato alla chiusura, rispetta il blocco del cambio tema);
  (3) il selettore della data come foglio non piaceva da desktop: foglio solo su smartphone, da medium di nuovo schermo intero del pannello.
- **Verifica:** `npm test` OK (590/590). Chromium headless 390×844 e 1440×900 scuro: `theme-color` #1D533B («Prossimo mese») e #2C4B58
  (storico) da aperti, di nuovo #0F1512 dopo; Nuova lista su smartphone con il focus sul foglio (nessun campo), da desktop sul nome; data
  da desktop a schermo intero (OK largo 1112). **Non provato nell'app Android reale** (barre di sistema via ponte). Committato e inviato (vedi `git log`), pubblicato su Hosting il 24 novembre.

## Schede dei fondi come schermi — 23 novembre 2026

- **Su richiesta** («fai diventare schermi anche le schede dei fondi»). `features/funds/FundDetail.tsx`: lo schermo del fondo (stesso
  `ScreenLayer`, cresce dalla scheda `fund-card-<id>` e vi torna): icona grande, nome, «Preferito»/«Archiviato», spesa del mese (o prevista)
  con il mese della pagina, barra del budget, «Riepilogo del mese» (gli stessi sette totali con segni e colori di prima) in un gruppo,
  azioni a pillola: «Modifica», poi «Aggiungi denaro» (solo con dati di saldo) e «Archivia»; per un fondo archiviato «Ripristina» e
  «Elimina» rosso (con il motivo se è in uso). La scheda in `FundsPage` è ora una superficie toccabile (icona, nome, spesa del mese, budget,
  chevron): tolti «Riepilogo del mese»/«Nascondi riepilogo», il «+» e la matita della scheda e i pulsanti della scheda archiviata. Testi:
  «Torna ai fondi» nuovo, «Nascondi riepilogo» tolto.
- **Verifica:** Chromium headless 390×844 scuro con `nummo-test-casi-limite-2026-11-08.json`: scheda → schermo (origine vuota da aperto,
  di nuovo visibile dopo), «Modifica fondo» sopra lo schermo e ritorno, Escape chiude tutto, nessun errore JS; `npm run check` OK.
  Non provati nel browser «Aggiungi denaro» e «Archivia»/«Ripristina» dallo schermo, né un fondo archiviato. Committato e inviato (vedi `git log`), pubblicato su Hosting il 24 novembre.

## Pannelli come schermi, transizione più morbida — 23 novembre 2026

- **Poi, su richiesta (stesso giorno):** lo schermo «Prossimo mese» ha il colore della scheda (`tone` di `ScreenLayer`: fondo
  `primaryContainer`, testi e icone `onPrimaryContainer`, Indietro e riquadro del calendario in `primary`/`onPrimary`, righe con divisori
  tenui come la vecchia scheda aperta): la scheda cresce senza cambiare colore. Verificato in Chromium headless a 390×844 scuro (apertura,
  chiusura animata, nessun errore JS); `npm run check` OK. Committato in `de199c7`, inviato e pubblicato su Hosting (bundle `index-290105cc…`).
- **Poi, su richiesta (stesso giorno):** tolto «Chiudi» da Prodotti acquistati, Storico dei pagamenti e dettagli di Analisi (basta
  Indietro); negli schermi i pulsanti delle azioni occupano tutta la riga (`expandActions` di `AppDialog`, oggi `screenActions`, che poi ha tolto anche «Annulla»: «Annulla» e la conferma in parti
  uguali, il cestino con la sua larghezza); dettaglio dell'abbonamento in una pagina senza scorrere: eroe più compatto (`dense`), dettagli
  in due colonne (`InfoGrid`) con in testa la riga «Storico dei pagamenti» (n pagamenti · totale, apre lo storico; il pulsante separato è
  tolto). Misurato in Chromium headless: nessuno scorrimento a 360×740, 375×780 e 390×844; screens-check di nuovo OK, nessun errore JS.
- **Poi, su richiesta (stesso giorno):** negli schermi di modifica «Elimina» in una riga propria sopra «Annulla»/«Salva», a tutta larghezza
  e con l'etichetta anche su smartphone (`useScreenActions` di `AppDialog`, letto da `DeleteAction`); la riga «Storico dei pagamenti» e lo
  schermo dello storico nel colore della palette (`primaryContainer`, `tone` di `ScreenLayer`/`AppDialog`, che ora rifà anche il tema del
  contenuto: testi e icone in `onPrimaryContainer`), così la riga si apre nello schermo senza cambiare colore. Lo screenshot con «Chiudi»
  nei dettagli di Analisi era della versione pubblicata: il pulsante era già tolto nel codice. Chromium headless 390×844 scuro OK, nessun
  errore JS; `npm run check` OK. Committato in `de199c7`, inviato e pubblicato su Hosting (bundle `index-290105cc…`).
- **Poi, su richiesta (stesso giorno):** Nuova lista come foglio «a metà» con la maniglia per trascinarlo giù: `variant="sheet"` di
  `AppDialog` / `sheet` di `ScreenLayer` (alto quanto il contenuto, angoli in alto, velo fisso, tocco sul velo o trascinamento della
  maniglia oltre un terzo o veloce = chiude e scende dal punto lasciato, altrimenti torna su; colore `elevation.level1`; massimo 640 da
  desktop; apertura dal pulsante con il ritaglio più uno spostamento verticale). Applicato a Nuova lista, Modifica lista, Modifica prodotto.
  Chromium headless 390×844 scuro e 1440×900 chiaro: foglio alto 298, trascinamento di 300 px → chiuso, nessuna copia lasciata, nessun
  errore JS. Non provato su touch reale. Committato in `de199c7`, inviato e pubblicato su Hosting (bundle `index-290105cc…`).
- **Poi, su richiesta (stesso giorno):** foglio anche per il selettore della data (`DateField`) e per «Da quando» di «Metti in pausa» /
  «Annulla abbonamento» (`StatusDialog`, tolto il pulsante «Indietro» in fondo: resta la conferma a tutta larghezza). Nei fogli non c'è il
  pulsante Indietro tondo (la maniglia lo sostituisce). Chromium headless 360×740 scuro: data e pausa come fogli, nessun errore JS.
- **Poi, su richiesta (stesso giorno):** in tutti gli schermi e i fogli «Elimina», «Salva», «Crea» (e ogni conferma) sono pillole a tutta
  larghezza come «Salva» di Nuova spesa, in colonna (Elimina sopra); «Annulla» tolto ovunque negli schermi (scelta dell'utente: si annulla
  con Indietro/maniglia/tocco fuori; resta solo mentre lo schermo non si può chiudere, la lettura di uno scontrino); l'origine (il campo
  della data, il pulsante «Nuova lista»…) resta vuota mentre lo schermo è aperto e ricompare all'atterraggio. Non toccata la colonna di
  pulsanti della revisione dello scontrino su desktop (fuori da Actions). Chromium headless 390×844 scuro: origine a opacità 0 da aperto e
  1 dopo, pillole 342×56, nessun «Annulla», nessun errore JS; `npm run check` OK. Committato in `de199c7`, inviato e pubblicato su Hosting (bundle `index-290105cc…`).
- **Poi, su richiesta (stesso giorno):** in Nuova spesa «Scansiona scontrino» e «Template» a metà riga ciascuno anche da medium (prima solo
  su smartphone): misurati in Chromium headless 542+542 a 1440×900, 330+330 a 800×1100, 177+177 a 390×844, insieme larghi quanto «Salva».
- **Poi, su richiesta (stesso giorno):** l'origine sparisce per intero mentre lo schermo è aperto (`outermost`: risale al contenitore del
  pulsante Paper con il riempimento; prima restava la pillola vuota); Importo e Data della stessa lunghezza anche da medium
  (`ExpenseFields`: misurati 542+542 a 1440×900). Chromium headless 1440×900 scuro: nessun errore JS; `npm run check` OK. Committato in `de199c7`, inviato e pubblicato su Hosting (bundle `index-290105cc…`).
- **Poi, su richiesta (stesso giorno):** riga «Storico dei pagamenti» e il suo schermo nel colore di «Scansiona scontrino»
  (`secondaryContainer`, prima `primaryContainer`); ogni «Elimina» con etichetta rosso pieno a pillola (`DangerButton`, `useDangerColors`:
  nello scuro `errorContainer`, perché `error` è rosa): negli schermi, nella conferma di `DeleteDialog`, nelle pagine Backup, Templates e
  Liste. Chromium headless 390×844 scuro: nessun errore JS; `npm run check` OK. Committato in `de199c7`, inviato e pubblicato su Hosting (bundle `index-290105cc…`).

- **Su richiesta** («animazione ancora più smooth e soddisfacente»; sostituire con lo stesso metodo i pannelli: Nuova lista, selettore della
  data, Aggiungi denaro, Trasferisci, Modifica fondo, Storico dei pagamenti, Modifica serie/spesa, Prodotti acquistati, scheda «Prossimo mese»).
- **Fatto:** `components/ScreenLayer.tsx` (strato comune, origine, trasformazione in apertura e chiusura, anche per smontaggio su una copia),
  `theme/containerTransform.ts` (ex `features/history/detailMotion.ts`, molla 0,95/200, velo, scala del contenuto), `AppDialog` con
  `variant` (`screen` di base, `alert` per `DeleteDialog`, `StorageSection`, `AppLock`) e `label`; `DetailScreen` ora su `ScreenLayer`;
  «Prossimo mese» apre uno schermo dei rinnovi; `useFocusHandoff` con `textEntry` va al primo campo anche se prima c'è un pulsante. Tutti gli
  altri dialoghi (categorie, template, esercenti, scansione, registrazione della lista, stato dell'abbonamento, assegnazione ai fondi,
  dettagli di Analisi…) diventano schermi con lo stesso codice. Testi: «{p0} entro {p1} giorni» nuovo.
- **Verifica:** `npm run check` OK (**590/590**). Chromium headless, `nummo-test-casi-limite-2026-11-08.json` importato, 390×844 chiaro e
  1440×900 scuro: data, Modifica spesa dal dettaglio (schermo sopra schermo), «Prossimo mese», Storico dei pagamenti dal dettaglio di una
  serie, Aggiungi denaro, Trasferisci, Modifica fondo, Nuova lista (focus nel nome): ognuno cresce dal suo pulsante o campo e torna indietro
  animato, nessuna copia lasciata in `#root`, nessun errore JS. Con `nummo-pagamenti-eliminati-v9.json`: «Modifica serie», Storico e «Da
  quando» («Metti in pausa») aperti sopra il dettaglio della serie. **Non provati** nel browser gli altri schermi (categorie, template,
  esercenti, scansione con fotocamera, registrazione lista, assegnazione, dettagli di Analisi), né tastiera virtuale reale, iPhone, app
  Android. Committato in `7bfa99b`, inviato e pubblicato su Hosting
  (bundle `index-c592ccbd…`).

## Schermo di dettaglio delle spese — 23 novembre 2026

- **Su richiesta** (al tocco su una spesa uno schermo di dettaglio al posto dei dettagli aperti nella scheda, transizione M3 Expressive,
  ritorno alla lista com'era). Lo screenshot citato come riferimento nella richiesta non era allegato: riferimento alle schermate esistenti.
- **Fatto:** `features/history/ExpenseDetail.tsx` (livello Portal: su smartphone tutta l'app, da medium il pannello del contenuto;
  icona, descrizione, importo grande, esercente, segni «Lista spesa»/«In attesa di invio»; un gruppo con Data estesa, Categoria, Fondo,
  Ripetizione se c'è, Prodotti acquistati con «Prodotti (n)»; «Modifica» a pillola), `detailMotion.ts` (geometria e molla, puri; oggi `theme/containerTransform.ts`),
  `ExpenseList` (riga con chevron a destra, niente più dettagli interni né `usePresence`), stato in `Workspace`, `ListRow opens`,
  `data-app-panel` in `AppShell`, due testi nuovi IT/EN, uno tolto. Pulsante Indietro poi ingrandito su richiesta (stesso giorno): tondo
  tonale da 52 (`secondaryContainer`), freccia da 28, a ogni dimensione.
- **Poi, su richiesta (stesso giorno):** pulsante Indietro 16 più in basso (e sotto la safe area) a ogni dimensione; **stesso schermo per gli
  abbonamenti** (`SubscriptionDetail.tsx`). Il guscio (livello, trasformazione, barra con Indietro, eroe, gruppo di righe, azione
  principale) è ora `DetailScreen.tsx`, usato da `ExpenseDetail` e `SubscriptionDetail`. La riga degli abbonamenti (`SubscriptionList`) apre
  il dettaglio: storico, stato e Modifica sono passati lì (`StatusDialog`/`PaymentsDialog` invariati, `changeStatus`/`removePayment` di
  `Workspace` invariati); tolte le misure dei pulsanti della riga. Sotto lo stato il «da quando» solo per pausa/annullamento (il prossimo
  rinnovo ha la sua riga). Testi: «Torna agli abbonamenti» nuovo; «Mostra», «Nascondi», «{p0} dettagli di {p1}» tolti.
  **Verifica:** `npm run check` OK (**590/590**); Chromium headless con `nummo-pagamenti-eliminati-v9.json` importato, 360×740 e 390×844
  chiaro/scuro, 1440×900: tre abbonamenti aperti e chiusi (pulsante, Escape, `history.back()`), scorrimento 180 → 180, focus sulla scheda,
  «Modifica serie», «Storico dei pagamenti» e «Metti in pausa» aperti sopra il dettaglio; spese ancora OK (salvataggio ed eliminazione).
  Non provati il cambio di stato confermato né l'eliminazione di un pagamento dal dettaglio. Committato in `9e032b8`, inviato e
  pubblicato su Hosting (bundle `index-d8345c5c…`). Decisione e motivi in `docs/architecture.md`. L'eliminazione resta nel
  dialogo di modifica (non è stato aggiunto un secondo «Elimina» nel dettaglio); non esistono note né duplicazione delle spese.
- **Verifica:** `npm run check` OK (**590/590**: 5 test nuovi in `tests/detailMotion.test.ts`, oggi `tests/containerTransform.test.ts`, typecheck, build demo). Chromium headless
  su `dist-demo`, Standard, file v11 importato dall'interfaccia, 390×844 chiaro e scuro, 800×1100, 1440×900 chiaro e scuro: tre spese
  aperte per dimensione con i dati giusti, ritaglio che cresce dalla scheda (≈450 ms) e torna nella scheda, chiuse con il pulsante, con
  Escape e con `history.back()`; scorrimento della lista invariato (180 → 180), focus di nuovo sulla scheda, «Modifica» apre l'editor sopra
  il dettaglio; a 390×844 salvataggio dall'editor (il dettaglio mostra subito la nuova descrizione) ed eliminazione (il dettaglio si chiude,
  7 spese su 8, scorrimento invariato); nessun errore JS (solo l'avviso già noto di `useNativeDriver`). **Non provato** su telefono reale
  (Android, iPhone/Safari, app 0.3.2: gesto Indietro, fluidità del `clip-path` su un telefono di fascia media).

## Colori degli accenti nel chiaro, tastiera lenta alla prima apertura — 23 novembre 2026

- **Su richiesta** (screenshot di «Colore» e «Colore dell'anello»: colori del tema chiaro troppo scuri; tema scuro da migliorare come il
  chiaro; tastiera che su Android ci mette alcuni secondi la prima volta).
- **Colori chiari:** primario, secondario e terziario generati prendono per ogni tinta il tono più chiaro con 4,6:1 (contenitore più
  scuro, scheda, bianco sopra): Blu `#1B3C6A` → `#27589D`, Viola `#401E66` → `#7035B3`, Rosa `#681D33` → `#9C2B4D`, Grafite
  `#3D4148` → `#535962`, Ambra `#6A4A1B` → `#78541E` (più chiaro non si legge come testo). Pallini di «Colore» e anello (anche «Colore
  dell'app») con `accentSwatches`: colori vivi a 3:1 sullo sfondo nel chiaro. Menta monocolore chiara invariata.
- **Tema scuro:** una revisione come quella del chiaro (contenitori più saturi, superfici più distinte, primario più vivo, schede piene) è
  stata fatta e poi **ritirata su richiesta** («colori troppo accesi»): lo scuro è identico a prima (tutti i 12 schemi confrontati con
  `828babf`, schede col contorno). Dettagli in `docs/architecture.md`.
- **Tastiera (misure, nessuna correzione risolutiva):** emulatore Android 17 con l'app 0.3.2 sul sito di produzione, log `ImeTracker`:
  la pagina chiede la tastiera 75–90 ms dopo il tocco, ma 1279 ms se si tocca 2 s dopo l'apertura (avvio della pagina ancora in corso);
  quando Gboard deve ricreare la sua vista (`onCreateInputView`) passano ~1,5 s prima di `onKeyboardViewShown` (Gboard caldo: 335–540 ms),
  costo del sistema uguale in ogni app. In Chromium con CPU 4× e 2084 spese (backup generato, fittizio) l'avvio cresce di ~200 ms rispetto
  all'archivio vuoto; dal momento in cui il modulo è attivo il focus arriva in 67–157 ms. Il tempo d'avvio è rendering React (2,5 s di
  script con CPU 4×; layout 118 ms, stili 261 ms). Provata e ritirata la misura delle etichette della barra col canvas (nessun guadagno).
  Tenuti, senza guadagno misurabile: `useState(() => todayInRome())` in `Workspace.tsx`, formattatori `Intl` in cache in `policy.ts`,
  `expense.ts`, `timeZones.ts`, `pushSchedule.ts`. **Da chiedere all'utente:** app o Chrome, quanto presto dopo l'apertura, Standard o Avanzata.
- **Verifica:** `npm run check` OK (**585/585**, typecheck, build demo) dopo il ritiro della revisione dello scuro. Chromium headless su `dist-demo` 412×915: Spese e
  Impostazioni in chiaro e scuro con Ambra/Palette, Blu e Menta, nessun errore JS. **Non provato** su telefono. Committato in `da3103e`, inviato e pubblicato su Hosting (bundle `index-9f999119…`).

## Template dopo template: importo ed esercente del precedente non restano — 23 novembre 2026

- **Su richiesta** (opzione 2 tra tre proposte: togliere solo ciò che veniva dal template precedente). `templateOptionalFields` in
  `domain/template.ts` (puro): Importo ed Esercente del template scelto se li ha; altrimenti il valore lasciato dal template precedente,
  se ancora uguale, si svuota, e uno scritto a mano (prima del template o modificato dopo) resta. `ExpenseForm` ricorda in `templateFill`
  ciò che l'ultimo template ha messo (azzerato da «Nessun template» e dopo un salvataggio). Descrizione, categoria e fondo come prima;
  data e ricorrenza mai toccate. Commento di `applyTemplate` corretto (diceva che il template riempie la data).
- **Verifica:** `npm run check` OK (**582/582**, 1 test nuovo in `tests/template.test.ts`). Chromium headless su `dist-demo`, Standard,
  1280×900, file v11 unito dall'interfaccia: Pieno (60,00, Q8) → Caffè (2,50, esercente vuoto); Pieno → Vecchio senza importo (entrambi
  vuoti); Pieno, «Eni» scritto a mano → Caffè (2,50, «Eni» resta). Nessun errore JS. Non provato su smartphone (stesso codice, foglio al
  posto del menu). Committato e inviato; Hosting pubblicato (vedi «Produzione»).

## Audit mobile: area visibile su iOS, barre durante il cambio tema — 23 novembre 2026

- **Su richiesta** (audit di animazioni, aree in alto/in basso e inserimento dati su iOS, senza cambiare il design). La registrazione
  citata nella richiesta non era allegata né presente sul disco: analisi dal codice e prove in emulazione.
- **Causa principale trovata (iOS):** Safari riduce per la tastiera solo il visual viewport e lo sposta in basso (`offsetTop`) per mostrare
  il campo; `#root` era nel flusso, alto quanto il visual viewport ma disegnato dall'inizio del layout viewport: barra superiore fuori
  schermo e striscia vuota sopra la tastiera. **Correzione:** `#root` `position: fixed` con `top: var(--nummo-viewport-top)`
  (`public/index.html`), pubblicata da `observeViewportTop` (`viewport.ts`, evento `scroll` del visual viewport) in `GlobalStyle`; lo schermo
  di blocco (campo PIN) usa le stesse variabili (`AppLock.tsx`); `AnchoredMenu` sottrae l'inizio di `#root` dall'ancora (`Overlay.tsx`).
  Android/desktop: offset sempre 0.
- **Cambio tema:** `theme-color` e barre dell'app Android cambiavano all'inizio del cerchio; ora `holdDocumentChrome` (`bootTheme.ts`) li
  trattiene finché il cerchio non copre il bordo superiore (`topEdgeCover`/`springTimeAt` in `themeTransition.ts`).
- **Verificato e lasciato:** animazioni solo `opacity`/`transform` (overlay, `Reveal`, cambio di sezione sul solo contenuto), movimento
  ridotto rispettato, niente `filter`/`backdrop-filter`, zoom di Safari sui campi già impedito da `maximum-scale=1`. Pulsante tondo della
  barra: `width` animata in JS, accettato. Dettagli e motivazioni in `docs/architecture.md`.
- **Strumenti:** `scripts/check-keyboard.mjs --ios` (visual viewport sostituito che si riduce e si sposta come Safari; colonna `fit`).
  Prima della correzione (build di `fdd0a96`, `--ios --keyboard 520`): spostamento 72 px, `rootTop` 0, `fit:false`. Dopo: `rootTop` 72,
  `fit:true` in tutti i fotogrammi di sei scenari (iOS a passi con cambio di campo, dialogo Nuova lista, campo in alto a 360×640;
  Android a passi con cambio di campo, dialogo, 360×640), nessun long task né errore JS.
- **Verifica:** `npm run check` OK (**585/585**: 3 test nuovi in `tests/viewport.test.ts` e `tests/themeTransition.test.ts`, più quello dei template
  della sessione parallela, poi committato in `d633282`). Chromium
  headless su `dist-demo` 412×915: cerchio da 868 ms dal pulsante, `theme-color` cambiato 145 ms dopo l'inizio (prima: all'inizio); menu
  ancorato a 1280×800 4 px sotto il campo; nessun errore JS. **Non provato su iPhone/Safari reale** (servono: tastiera su Nuova spesa con
  campo basso, Descrizione, dialogo di modifica, PIN della schermata di blocco, PWA installata; scorrimento del modulo a tastiera aperta,
  dove Safari può spostare il visual viewport anche col dito: `#root` lo segue a ogni evento, da guardare se tremola). Committato in
  `e3c250e` (`npm run check` di nuovo OK, 585/585, sull'albero del commit) e pubblicato su Hosting (vedi «Stato corrente»).

## App Android 0.3.2: vibrazione un gradino più forte — 23 novembre 2026

- **Su richiesta** («leggermente più forte»; scelta dell'utente tra `HEAVY_CLICK` e una composizione del vibratore con intensità
  regolabile). In `NummoBridge.kt` `tap` → `HapticFeedbackConstants.LONG_PRESS` (prima `VIRTUAL_KEY`): effetto predefinito
  `HEAVY_CLICK`, sempre un impulso singolo, stesso uso TOUCH, nessun permesso nuovo. Versione 0.3.2 (versionCode 5). Il sito non cambia
  (solo un commento in `haptics.ts`): le app fino alla 0.3.1 restano sul CLICK. Decisione in `docs/architecture.md`.
- **Verifica:** typecheck e `npm test` OK (**581/581**); `assembleDebug assembleRelease` OK. Emulatore `Medium_Phone_API_37.0`
  (Android 17), release 0.3.2 sul sito di produzione, Standard: tocchi sulla barra → `Prebaked=HEAVY_CLICK(MEDIUM)`, `usage: TOUCH`,
  `finished`, anche con suoneria SILENT e Non disturbare attivo (l'emulatore lo riproduce col ripiego da 30 ms). **Non sentita** sul
  Pixel 8. Committata e inviata in `f74ff3a`. **Release GitHub `android-v0.3.2`** (su richiesta: tag annotato su `f74ff3a`, inviato;
  APK compilato in una worktree pulita, poi rimossa con la copia della chiave; SHA-256 `9889a428…092a`, confermato da GitHub; certificato
  `00b1c85c…0fcf`; versionCode 5), segnata «Latest» al posto della 0.3.1. **Installata dall'utente da GitHub sul Pixel 8 il 23 novembre:
  intensità confermata («la vibrazione ora va bene»).**

## Cambio tema chiaro/scuro animato (M3 Expressive) — 23 novembre 2026

- **Su richiesta.** Il passaggio tra chiaro e scuro (pulsante della barra in alto e «Tema» nelle Impostazioni) è una rivelazione
  circolare: il tema nuovo cresce dal controllo premuto (quello col focus; senza, dal centro) fino a coprire la finestra, sulla molla
  spaziale lenta dello schema espressivo di M3 Expressive (rapporto 0,8, rigidità 200: 656 ms, leggero overshoot), resa come easing
  CSS `linear()` (`springEasing`). View Transitions API (`src/theme/themeTransition.ts`, `switchTheme`), aggiornamento con `flushSync`
  in `changePreferences` di `App.tsx`; durante l'istantanea le transizioni CSS sono spente (`data-theme-switching`, `GlobalStyle`).
  Senza la API, con il movimento ridotto o se l'aspetto non cambia (per esempio «Sistema» uguale al tema attuale) il cambio resta
  istantaneo. Nessuna dipendenza nuova.
- **Verifica:** `npm run check` OK (**581/581** sullo snapshot del commit, senza il lavoro parallelo nell'albero; 5 nuovi in
  `tests/themeTransition.test.ts`). Chromium headless su `dist-demo` (Standard, 412×915): tocco sul pulsante → un'animazione
  `clip-path` su `::view-transition-new(root)` da (324, 32), 656 ms; tema scuro applicato, attributo tolto; con movimento ridotto
  nessuna animazione; nessun errore JS. Screencast: il DOM cambia in un unico commit, ma un solo fotogramma (192 ms) mostrava i campi
  ancora chiari dentro il cerchio, già corretti al successivo: probabilmente rasterizzazione software headless. **Da vedere su
  dispositivo reale** (telefono, WebView dell'app, Safari, Firefox); il percorso da «Tema» nelle Impostazioni non provato nel browser.
  Vale per web e app Android dopo `deploy:hosting`. Committato e inviato con il menu dell'account; Hosting pubblicato con `72fcf5a`.
- **Più lenta e morbida (su richiesta, stesso giorno: «troppo di fretta»).** La molla spaziale lenta (0,8/200) portava il cerchio al
  90 % del raggio in 215 ms, poi solo una coda invisibile. Ora `themeRevealSpring`, rapporto 0,95 e rigidità 80 (non un token M3:
  più morbida della molla lenta espressiva): nessun rimbalzo visibile, 90 % a circa 410 ms, durata 868 ms (precisione finale 0,2 %,
  meno di 2 px sul raggio). Test aggiornati; `npm run check` OK (**581/581** sullo snapshot del commit); Chromium headless:
  animazione da 868 ms dal pulsante, nessun errore JS. Committato e inviato; Hosting pubblicato con `72fcf5a`.

## Menu dell'account senza limite di altezza fisso — 23 novembre 2026

- **Su richiesta** (screenshot: in Avanzata «Esci» restava sotto lo scorrimento del menu). `AccountMenu` passa ad `AnchoredMenu`
  `maxHeight={Number.POSITIVE_INFINITY}`: il limite di 360 dei selettori (`MENU_MAX_HEIGHT`) non vale più per questo menu, che è
  limitato solo dallo spazio nella finestra (`menuVerticalPlacement`) e scorre solo se non c'entra. Vale per web e app Android
  (che apre il sito): nell'app arriva con `deploy:hosting`, senza un nuovo APK.
- **Verifica:** `npm run check` OK (**576/576**, build demo). Chromium headless su `dist-demo`, Standard, 1280×800, 390×844 e
  360×640: menu alto 351 senza scorrimento (6 voci da 48), almeno 229 px liberi sotto; nessun errore JS. **Non provato in Avanzata**
  (dove compare «Esci»): servirebbe l'emulatore Auth; con una voce in più l'altezza attesa è circa 400, dentro la finestra anche a 360×640.
  Committato e inviato con il cambio tema; Hosting pubblicato con `72fcf5a`.

## Tema chiaro più deciso, schede delle spese colorate — 23 novembre 2026

- **Su richiesta, in due passi** («il tema chiaro non è all'altezza dello scuro», poi «ancora più deciso, con le schede delle spese
  colorate»). Solo il tema chiaro, stessi ruoli Material 3; tema scuro invariato (verificato a schermo).
  - `palette.ts` (Palette e gli altri colori): contenitori di selezioni, chip e indicatori saturi e più scuri (tono ~76, prima ~86),
    livelli di superficie 92 → 83 (prima 95 → 89), sfondo 95 più tinto, contorni e testo secondario più scuri, primario più vivo.
  - `tokens.ts`: Menta monocolore con gli stessi toni (calcolati con la formula di `palette.ts` per la tinta menta) e rosso degli errori
    del tema chiaro `#A3161A` (prima `#BA1A1A`), altrimenti sotto 4,5:1 sul contenitore più scuro.
  - **Schede di Spese e Abbonamenti** (`ListRow outlined`): nel tema chiaro piene, con il nuovo colore `card` del tema (`cardColor` in
    `palette.ts` = metà contenitore primario e metà bianco, `cardFill` in `theme.ts`), senza contorno visibile (bordo del colore del fondo,
    misure invariate); nel tema scuro restano con il contorno.
- **Verifica:** `tests/theme.test.ts` (contrasti per ogni colore e modalità, più un test nuovo sulle schede: testo, secondario, primario e
  rosso ≥ 4,5:1, scheda distinta dallo sfondo, nessun fondo nello scuro); `npm run check` OK (**581/581**, compresi i test dell'altra
  sessione). Chromium headless su `dist-demo`, 412×915 e 1280×800, prima/dopo di Nuova spesa, Spese (anche una scheda aperta), Analisi,
  Fondi, Impostazioni con i dati del file v11; Spese nello scuro identica. Colori statici d'avvio (`#F5FBF5` in `public/index.html` e
  `offline.html`) lasciati: poi vale il colore salvato. **Non provato** su telefono reale né a schermo con gli altri cinque colori.

## Vibrazione solo nell'app Android, stessa intensità, anche sulla legenda di Analisi — 23 novembre 2026

- **Su richiesta.** Le righe della legenda di Analisi vibrano al tocco (`LegendRow`; erano state tolte il 21 novembre). Un solo effetto
  ovunque (`hapticEffect` = `tap`, CLICK di Android): niente più `tick` più leggero per grafici e trascinamento sulla barra. Vibrazione
  **solo nell'app Android** (`hasHaptics` = ponte presente): nel browser nessuna vibrazione e nessun interruttore «Vibrazione»; tolta
  la riga sul silenzioso del browser (IT/EN). Nessuna modifica Kotlin né nuova versione dell'app: arriva all'app con l'Hosting.
- **Verifica:** `npm run check` OK (**575/575**: 5 test della Vibration API tolti, 4 nuovi per il solo ponte). **Non provato** sul telefono (serve
  l'Hosting pubblicato e poi l'app 0.3.1 sul Pixel 8: legenda, grafici, trascinamento sulla barra con la stessa vibrazione).

## Backup di collaudo v11 con template ed esercente — 23 novembre 2026

- **Su richiesta.** `docs/testing/nummo-template-v11.json` (9 template `V11`, 8 spese, 4 categorie, 2 fondi di cui uno archiviato,
  5 esercenti), generato con `makeBackup` del dominio. Casi: esercente in altra grafia di uno salvato, esercente non ancora salvato,
  esercente di 60 caratteri con l'importo massimo, «Nessun fondo» esplicito, fondo archiviato, categoria assente, template senza
  importo (come quelli salvati prima del 21 novembre), descrizione con virgolette e `;`. Tabella dei risultati attesi e passi del
  collaudo in `docs/testing/README.md`; valori al 23 novembre verificati da un test nuovo in `tests/testingBackups.test.ts` (export
  identico byte per byte, unione su archivio vuoto e sopra il v10 senza conflitti, conflitto su un template modificato, file dichiarato
  v10 rifiutato).
- **Collaudo dall'interfaccia eseguito (su richiesta, stesso giorno)** in Chromium headless su `dist-demo/`, Standard e Avanzata
  (emulatori demo propri su porte dedicate 39199/39380, config temporanea rimossa; il runner hybrid dell'utente non toccato):
  tutti i passi con il risultato atteso, Rules che accettano i 9 template, nessun errore JS. Esiti in `docs/testing/README.md`.
- **Osservazione:** passando direttamente da un template all'altro, Importo ed Esercente del precedente restavano se il nuovo non li
  aveva: un caffè poteva ereditare l'esercente «Q8» del pieno. **Corretto il 23 novembre** (sezione «Template dopo template» sopra).

## App Android 0.3.0: notifiche nell'app — 22 novembre 2026

- **Su richiesta** (ripresa di un lavoro lasciato non committato e non documentato in un'altra sessione). Nella WebView non c'è Web Push:
  l'app programma i promemoria della pagina (backup, riepilogo, rinnovi: gli stessi `PushJob` del servizio push) con gli allarmi di
  Android e li mostra come notifiche locali con i testi di `sw.js`. Versione 0.3.0 (versionCode 3). Nessuna dipendenza, servizio o dato
  cloud nuovo; Rules e `DataStore` invariati. Decisione in `docs/architecture.md`.
- **Fatto:** `android/.../Reminders.kt` (`Reminders`, `ReminderReceiver`, `ReminderRestore`), icona `ic_notification` (l'«Arco»), canale
  «Promemoria», permessi `POST_NOTIFICATIONS`, `USE_EXACT_ALARM`, `SCHEDULE_EXACT_ALARM` (≤ 32), `RECEIVE_BOOT_COMPLETED`; ponte
  `notificationStatus`/`requestNotifications`/`scheduleNotifications`/`disableNotifications`/`testNotification`/`takeSnoozes`/
  `openNotificationSettings` (facoltativi: la 0.2.0 resta riconosciuta); `MainActivity`: richiesta del permesso, «Apri le impostazioni»,
  tocco sulla notifica (`?notifica=…` a freddo, `nummoNotificationOpened` ad app aperta). Web: `androidNotifications` e
  `requestNotificationsOnDevice` in `androidApp.ts`, un ramo per l'app in ogni funzione di `pushNotifications.ts` (`pushSupport` =
  `supported` nell'app anche senza servizio push configurato), stato `denied` con «Apri le impostazioni» in `NotificationsPage` (2 testi
  in `en.ts`), 1 test in `tests/androidApp.test.ts`.
- **Corretto in questa sessione** rispetto al lavoro trovato: Android 11–12 (minSdk 30) senza il permesso runtime (prima le notifiche
  non si sarebbero mai attivate: `checkSelfPermission(POST_NOTIFICATIONS)` lì è sempre negato); `canScheduleExactAlarms` solo da Android 12
  (su 11 l'app sarebbe andata in crash); voci validate come nel servizio (chiavi `summary:<to>`/`renewal:<from>`, `from ≤ to`, ≤ 400
  giorni); spegnendo si dimentica anche ciò che è stato mostrato (come `forget` del servizio); `setIntent` in `onNewIntent`; `ReminderRestore`
  controlla l'azione (avviso di lint).
- **Verifica:** `npm run check` OK (**574/574**, build demo) prima delle modifiche Kotlin (il web non è cambiato dopo). `./gradlew
  assembleDebug assembleRelease` OK (release 0.3.0 firmata, `apksigner verify`, non installata); `lintDebug` senza problemi nel codice nuovo (restano 3 errori preesistenti: `onBackPressed` (GestureBackNavigation),
  `windowSplashScreenBackground` con API 31, `app_name` non tradotto; da qui `lintDebug` fallisce, `assemble*` no). Emulatore
  `Medium_Phone_API_37.0` (Android 17), app debug su `dist-demo` (Standard), guidata con DevTools della WebView e `uiautomator`:
  - permesso: primo rifiuto → «Spente», secondo → «bloccate nelle impostazioni di Android» con «Apri le impostazioni», che apre la pagina
    delle notifiche dell'app; consentite lì e tornati, «Attiva» senza dialogo → «Attive»; allarme esatto (`policy_permission`) alle 9:00;
  - backup, riepilogo e rinnovo arrivano con l'app in secondo piano e **a processo chiuso**, testi uguali a `sw.js` (IT ed EN);
  - tocco: riepilogo → Notifiche con il riepilogo del periodo (anche a freddo, parametri tolti dall'indirizzo), rinnovo → Spese/Abbonamenti;
  - riepilogo già mostrato non riprogrammato; voci malformate scartate; «Ricordamelo tra 3 giorni» chiude la notifica, sposta il backup
    di 3 giorni e la pagina, al riavvio, registra `backupSnoozedUntil`;
  - riavvio dell'emulatore: allarme riprogrammato (`ReminderRestore` da `BOOT_COMPLETED`); «Disattiva» toglie allarmi e stato, «Attiva» li
    rimette.
- **Non verificato:** Pixel 8 reale (consegna puntuale in Doze dopo ore, Non disturbare), Android 11–12 (nessuna immagine di sistema
  installata), Avanzata nell'app con le notifiche. 
- **Articolo eliso (0.3.1, su richiesta):** davanti a 1, 8 e 11 nei testi delle notifiche, in `sw.js` e `Reminders.kt` («dall’8
  novembre all’1 dicembre», «si rinnova l’11 novembre»), e nel riquadro del riepilogo aperto in Notifiche (`NotificationsPage`: «Dall’{p0}
  al {p1}», «Dal {p0} all’{p1}», «Dall’{p0} all’{p1}», in inglese sempre «From {p0} to {p1}»). App 0.3.1 (versionCode 4). Test in
  `tests/serviceWorker.test.ts`; `npm run check` OK (**575/575**); riquadro provato in Chromium headless sulla demo (quattro forme in
  italiano, inglese invariato); `assembleRelease` OK; testo di `Reminders.kt` non visto su un dispositivo.
  Committato in `fa06adb`, inviato; Hosting pubblicato su richiesta (`npm run deploy:hosting`: «Deploy complete!», bundle online
  `index-053e3738…` e `sw.js` identici ai locali); release 0.3.1 installata sul Pixel 8 con `adb install -r` sopra la 0.3.0
  (`POST_NOTIFICATIONS` ancora da concedere con «Attiva»).
- Committata in `2b1e8fb`, inviata; Hosting pubblicato su richiesta (bundle `index-4a671be6…`, identico a `dist/`); release 0.3.0
  installata sul Pixel 8 con `adb install -r` sopra la 0.2.0.
- **Prova sul Pixel 8 (22 novembre, 18:29, su richiesta)** con l'app di **debug** (`app.nummo.android.debug`, dati propri, demo
  `dist-demo` servita dal computer con `adb reverse tcp:8095`; la release non riceve comandi dal computer: DevTools della WebView solo in
  debug, ricevitori non esportati, pulsanti di prova nascosti). `POST_NOTIFICATIONS` concesso con `pm grant` alla sola app di debug,
  Standard scelta, «Attiva notifiche di sistema» → `active`; dal ponte tre promemoria a +10/+20/+30 s: backup, riepilogo (15–21 novembre)
  e rinnovo (23 novembre) arrivati **all'orario esatto** (18:29:26, :36, :46, da `sent_*`), allarmi esatti `policy_permission`, nessun
  errore nel logcat. Release e suoi dati non toccati. Poi, su richiesta, app di debug disinstallata, `adb reverse`/`forward`
  tolti e server della demo fermato: sul Pixel resta solo la release 0.3.0. **Da provare sul telefono:** Notifiche → «Attiva notifiche di sistema»
  (dialogo di Android), arrivo all'orario scelto dopo ore a schermo spento, in Non disturbare, tocco sulla notifica.

## App Android 0.2.0: Avanzata con l'accesso Google nativo — 22 novembre 2026

- **Su richiesta** (dopo la conferma dell'utente che impronta, scansione dello scontrino e backup funzionano nell'app 0.1.0). Con
  autorizzazione esplicita: app Android `app.nummo.android` registrata in `nummo-6b6e2` (`firebase apps:create ANDROID`, ID
  `1:299139807907:android:cb257e7956800c4fc2dd16`) con SHA-1 `ee7171ef…a468` e SHA-256 `00b1c85c…0fcf` del certificato di firma;
  `apps:sdkconfig` mostra il client OAuth Android (tipo 1, con quello SHA-1) e il client web (tipo 3), messo in `android/local.properties`
  (`nummo.googleClientId`, anche `nummo.debugGoogleClientId`) con `nummo.firebaseProject=nummo-6b6e2`. Rules e dati non toccati.
  Librerie autorizzate: `androidx.credentials` 1.6.0, `credentials-play-services-auth` 1.6.0, `googleid` 1.2.1; Kotlin 2.4.0
  (googleid 1.2.1 non si compila con il 2.2 integrato in AGP 9.1). Versione 0.2.0 (versionCode 2); APK release circa 9 MB.
- **Fatto:** `GoogleSignIn.kt` (Credential Manager, `GetSignInWithGoogleOption`, token alla pagina; uscita con
  `clearCredentialStateAsync`; nel log solo il tipo di errore). Ponte: `googleProject`/`googleSignIn`/`googleSignOut`, **facoltativi** (l'app
  0.1.0 resta riconosciuta). Web: `androidGoogleSignIn(projectId)` e `googleSignInOnDevice` in `androidApp.ts` (token accettato solo con
  la forma di un JWT ≤ 8192), `firebase.ts` (`signInWithCredential`, nessun resolver del popup nell'app, `googleSignOut` dopo l'uscita),
  `signInError` («Nessun account Google su questo telefono…»), `ModeChoice`/`StandardStorage` (`appWithoutAdvanced`: Avanzata
  disattivata solo per un'app senza accesso, testo «Questa versione dell'app Android offre solo la modalità Standard: aggiornala o usa
  Nummo nel browser.»), `App.tsx` (`connectTarget`: niente «Collega il tuo Firebase» nell'app). Nel browser nulla cambia.
- **Verifica:** `npm run check` OK (**573/573**, 2 test nuovi). `assembleDebug assembleRelease` OK. Emulatore Pixel 8 (Android 15)
  con l'app debug su `dist-demo` (progetto `demo-nummo`): Avanzata attiva nella scelta della modalità, «Accedi con Google» apre il
  flusso di Play Services (senza account: «aggiungi un account»), Indietro → `TYPE_USER_CANCELED` → nessun messaggio, pagina ancora
  sull'accesso e visibile. **Non verificato:** accesso reale con un account Google (serve il telefono con la release e l'Hosting
  pubblicato), uscita e nuovo accesso, blocco dell'app in Avanzata.
- Committata in `0f340bf`, inviata e pubblicata su Hosting (bundle `index-9fe2b72e…`); release 0.2.0 installata sul Pixel 8 via adb
  sopra la 0.1.0 (stessa chiave: i dati della Standard restano).

## App Android (WebView con ponte nativo), fase 1 solo Standard — 22 novembre 2026

- **Su richiesta** (vibrazione assente in silenzioso/Non disturbare, barra di navigazione nera nell'app installata): analisi, poi scelta
  dell'utente tra le alternative (WebView in Kotlin; fase 1 solo Standard; SDK e chiave locale). Causa ricontrollata nel sorgente attuale
  di Chrome (`VibrationManagerAndroid.java`: `vibrate` solo se la suoneria non è `RINGER_MODE_SILENT`, `Vibrator.vibrate(long)` senza
  attributi): non correggibile da una pagina né con expo-haptics. Decisione in `docs/architecture.md`.
- **Fatto:** `android/` (Activity Kotlin, WebView sul sito pubblicato, sole API di piattaforma, minSdk 30, target 36, AGP 9.1, Gradle
  9.3.1 wrapper) con `NummoBridge`: `haptic` → `performHapticFeedback` (`tap` VIRTUAL_KEY, `tick` CLOCK_TICK), `setSystemBars`, `saveFile`
  (foglio «Salva come»), `canAuthenticate`/`authenticate`/`cancelAuthentication` (`BiometricPrompt`, biometria o PIN del dispositivo).
  Web: `services/androidApp.ts` (unico punto che conosce il ponte) usato da `haptics.ts`, `bootTheme.applyDocumentTheme`,
  `BackupActions.download`, `platformLock.ts`; nell'app l'Avanzata è disattivata con una riga che rimanda al browser (`ModeChoice`) e
  «Cambia modalità» è sostituito dalla stessa riga (`StandardStorage`); riga sotto «Vibrazione» diversa nell'app. Nel browser nulla cambia.
  Icona adattiva vettoriale dall'«Arco» (con livello monocromatico). Chiave di firma RSA 4096 creata in `android/nummo-release.jks`, password
  in `android/keystore.properties`, `android/local.properties` con `nummo.url=https://nummo-6b6e2.web.app/`: tutti ignorati da Git.
  **Da conservare altrove** (senza la chiave l'app non si aggiorna). Certificato SHA-256 `00b1c85c…6b0fcf`.
- **Verifica:** `npm run check` OK (**571/571**, 5 test nuovi in `tests/androidApp.test.ts`). `./gradlew assembleDebug assembleRelease`
  senza avvisi; release firmata (`apksigner verify`). Emulatore Pixel 8 (Android 15; WebView 124, poi 157 aggiornata dal Play Store durante
  la prova) con l'app debug su `dist-demo` locale (`adb reverse`):
  - suoneria **SILENT** e Non disturbare attivo (`zen_mode=2`): `dumpsys vibrator_manager` registra ogni vibrazione dell'app come
    «finished», `usage: TOUCH`, `View#performHapticFeedback`, `Prebaked=CLICK` per i tocchi reali su Spese/Analisi/Fondi e `TEXTURE_TICK`
    per `tick`;
  - barre di stato e navigazione col colore della pagina, icone scure nel tema chiaro e chiare nello scuro (screenshot);
  - Indietro: Fondi → Analisi → Spese → Nuova spesa → launcher; Home e ritorno: `visibilitychange` hidden/visible (blocco «Subito» ok);
  - sblocco: con un PIN di prova sull'emulatore `canAuthenticate` true, PIN → `ok`, annullamento → `cancelled`, pagina visibile dopo;
  - `saveFile`: foglio di sistema, file in Download con byte esatti (BOM, UTF-8);
  - tastiera: viewport 840 → 527 px, campo in vista, barra mobile nascosta;
  - Avanzata disattivata con la riga di spiegazione.
  La release sull'emulatore apre il sito di produzione, che **non ha ancora** il codice del ponte: lì barre scure e Avanzata attiva finché
  non si pubblica l'Hosting. **Non provati:** telefono reale (sensazione della vibrazione, impronta reale), blocco attivato dall'interfaccia
  delle Impostazioni con il PIN di Nummo (provato il ponte, non il percorso completo), fotocamera e «Carica una foto» nell'app, CSV.
- **Per usarla:** (Hosting già pubblicato, con i 500 prodotti per lista) installare `android/app/build/outputs/apk/release/app-release.apk` sul Pixel 8
  (`adb install` o file) e spostare i dati con backup e ripristino (archivio separato da Chrome). Committato in `759792c`, inviato e
  pubblicato su Hosting (bundle `index-18586346…`, identico a `dist/`).

## Prodotti per lista fino a 500 (Rules da pubblicare) — 22 novembre 2026

- Su richiesta: `listPolicy.maxItems` 100 → **500**; Rules (identiche, `cmp`) `list_items` ≤ 30499 (prima 6100); messaggio «al massimo 500
  prodotti» (IT/EN). Batch da 501 scritture per duplicare/eliminare una lista piena: ammesso da Firestore (nessun limite di scritture per
  commit dal marzo 2023). Motivazioni e misure in `docs/architecture.md`.
- **Prestazioni di Liste** (`ListsPage.tsx`): righe `ItemRow` memo con callback stabili e disegno progressivo (50 righe, poi blocchi da 100
  in transizioni). Chromium headless 390×844, CPU 4×, lista da 500 importata da backup in Standard: apertura da un blocco di ~3,9 s a prime
  righe in 0,76 s (resto a blocchi ≤ ~0,2 s), spunta da 1,6 s a 0,21 s; con 100 prodotti prime righe 0,65 s (prima 1,0 s), spunta 0,18 s
  (prima 0,5 s). Fondo della lista e campo «Totale spesa» corretti, nessun errore JS. `ProductsDialog` (righe leggere, su richiesta) invariato.
- **Test:** `tests/shoppingList.test.ts` (500 accettati e 501 rifiutati in lista, backup, spesa registrata; stringa da 30499; duplicazione;
  dati con 100 prodotti validi). Emulatori: spesa con `list_items` da 30499 accettata, 30500 rifiutata; lista da 500 prodotti creata ed
  eliminata dallo store (batch da 501).
- **Verifica:** `npm run check` OK (**571/571**, build demo: il conteggio comprende test di un lavoro parallelo, vedi sotto); `test:emulator`
  **24/24** su porte proprie (config `.nummo-lists-check.json` rimossa; runner hybrid 36786 non toccato). Committato in `48361b9` (solo i
  file della fase; l'indice verificato da solo: typecheck OK, **566/566**), inviato; **Rules pubblicate**, **Hosting no** (su richiesta:
  il lavoro Android nell'albero di lavoro finirebbe nella build); Hosting pubblicato poi con `759792c` (bundle `index-18586346…`).
- **Superato** (il lavoro parallelo è stato committato in `759792c`): allora nell'albero di lavoro c'era un lavoro parallelo non mio (app Android: `android/`, `src/services/androidApp.ts`,
  `tests/androidApp.test.ts`, modifiche a `BackupActions`, `SettingsPage`, `ModeChoice`, `StorageSection`, `platformLock`, `bootTheme`,
  `haptics` e due chiavi in `src/i18n/en.ts`). Un commit di questa fase va limitato ai file della fase (in `en.ts` solo la riga dei 500
  prodotti).

## Piani dei fondi fino a 120 voci (Rules da pubblicare) — 22 novembre 2026

- Su richiesta: `fundPolicy.maxChanges` 24 → **120** (ricariche, budget ricorrenti, eccezioni, budget generale). Rules (identiche, `cmp`):
  `{0,23}` → `{0,119}` nelle quattro regex, lunghezze 600 → 2519 (ricariche) e 400 → 1919 (budget, eccezioni, budget generale), esatte
  per 120 voci della forma più lunga. Margine RE2 rispettato. Motivazioni in `docs/architecture.md`.
- **Test:** `tests/funds.test.ts` (120 accettate e 121 rifiutate in array, stringa, record del fondo e backup; lunghezze 2519/1919; voci
  malformate; dati con 24 voci validi; un piano pieno non accetta un nuovo mese) e `tests/generalBudget.test.ts` (120). Emulatori: fondo con
  i tre piani al massimo creato e modificato, budget generale da 1919 caratteri accettato, 121 voci rifiutate (lunghe e brevi).
- **Verifica:** `npm run check` OK (**565/565**, build demo); `test:emulator` **24/24** su porte proprie (config `.nummo-funds-check.json`
  rimossa; runner hybrid 36786 non toccato). Committato in `17ebce0`, inviato e pubblicato (Rules compilate dal server, poi Hosting).

## Revisione dei limiti degli abbonamenti (Rules da pubblicare) — 22 novembre 2026

- Su richiesta (audit dei limiti; decisione e motivazioni in `docs/architecture.md`, «Revisione dei limiti degli abbonamenti»):
  `maxCalendarChanges` 4 → **100**, `maxSkippedPayments` 60 → **1000**, `maxOccurrences` 1000 → **5000** (numeri 0–4999, Rules a 4 cifre per
  prezzi, cambi di frequenza e pagamenti eliminati), `maxStatusChanges` **1000**; `maxPriceChanges` **8** e `maxPromoAfter` **999** invariati.
  Limiti generali analizzati e **non** cambiati.
- **Criticità trovata e corretta prima della pubblicazione:** `{0,999}` attorno a `[0-9]{4}` (stati) supera il margine di RE2 sulle
  ripetizioni annidate (prodotto > 1000); l'emulatore (RE2J, `com/google/re2j` nel jar) lo accettava. Ora stati e pagamenti eliminati:
  forma con `*`, numero con `split(…).size() <= 1000`.
- Prestazioni: `paidChecker` in `history.ts` (Set + cursore) al posto di `statusAt`/`includes` per occorrenza: caso peggiore (settimanale dal
  2000, 1000 stati, 1000 pagamenti eliminati, 100 cambi) da ~52 a ~16 ms per serie al 2099, ~6 ms a oggi. Messaggio «Troppi cambi di
  frequenza» senza «quattro» (IT/EN). Commento superato in `funds.ts` corretto.
- **Test:** unitari per massimi, superamenti, malformati, lunghezze massime (151, 1799, 4999, 20999), 5000 occorrenze, equivalenza con il
  calcolo semplice su cronologie lunghe, dati storici. `npm run check` OK (**564/564**, build demo). `test:emulator` **24/24** su porte
  proprie (39199/39380, config `.nummo-limits-check.json` rimossa; runner hybrid 36786 non toccato): caso peggiore con tutti i massimi
  (~28,7 KB) accettato in creazione e modifica; superamenti rifiutati (101 cambi, 1001 numeri brevi sotto i 4999 caratteri, indici 5000).
  `test:hybrid` **9/9**.
- **Prima della pubblicazione:** compilare le Rules sul server (la pubblicazione stessa, o una prova senza rilascio se autorizzata), poi
  Rules **prima** di Hosting; chi ha il proprio Firebase deve ricopiarle; schede vecchie vedono come non valide le serie oltre i vecchi
  limiti finché non ricaricano. Committato in `f4691aa`, inviato e pubblicato (Rules compilate dal server, poi Hosting).

## Cambi di stato fino a 1000 (Rules da pubblicare) — 22 novembre 2026

- Su richiesta: `maxStatusChanges` 40 → **1000** (`domain/subscription.ts`), `firestore.rules` e `public/firestore.rules` (identiche prima e
  dopo, `cmp`) `statusChanges`: `size() <= 20999`, regex `{0,999}` (**sostituita** nella revisione dei limiti qui sopra da `(;voce)*` +
  `split(';').size() <= 1000`, per RE2). Gli altri limiti degli abbonamenti invariati in questa fase.
- **Dove vale il limite (verificato):** un solo valore nel client, `maxStatusChanges`, usato da `parseStatusChanges` (letture Firestore dopo
  `decodeStatusChanges`, record IndexedDB, richieste di scrittura `parseExpenseRequest`, backup di ogni versione tramite `parseExpenseRecord`)
  e da `statusChangeProblem`/`setStatus` (`StatusDialog`, `Workspace`: messaggio «Troppe variazioni…» invariato); nelle Rules i due numeri
  della funzione `statusChanges`. Nessun'altra copia (README, guida, `docs/testing/` non lo citano).
- **Test:** `tests/subscription.test.ts` aggiornato (1000 ammessi, il 1001° rifiutato con `too-many`, cambio nello stesso giorno con la serie
  piena ammesso) e test nuovo: forma Firestore di 1000 stati lunga 20999 e reversibile, 1001 rifiutati in ogni forma (array, stringa, record,
  richiesta, backup v11 e v9), dati storici (campo assente, 1, 8, 40 stati) validi, documenti non validi rifiutati anche a 1000 voci (date
  non crescenti o ripetute, stato sconosciuto, chiavi in più, data impossibile, stringhe malformate). Emulatori: storie dal 2000 (tutte
  passate), 1000 voci brevi accettate, 1001 voci brevi (sotto i 20999 caratteri) rifiutate dalla sola regex.
- **Verifica:** `npm run check` OK (**561/561**, build demo). `test:emulator` **24/24** su porte proprie (39199/39380, config temporanea
  `.nummo-status1000-check.json` rimossa; runner hybrid 36786 non toccato): caso peggiore (8 prezzi, 1000 stati della lunghezza massima =
  20999 caratteri, prova, 4 cambi di frequenza, 60 pagamenti eliminati, fondo, esercente) accettato in creazione e modifica; 1001 rifiutati.
  **Non verificato:** compilazione delle Rules sul server di produzione (l'emulatore usa lo stesso linguaggio, ma la prova reale è la
  pubblicazione). Non pubblicato, non committato: alla pubblicazione Rules **prima** di Hosting; chi ha il proprio Firebase deve ricopiarle;
  schede vecchie non ricaricate vedrebbero come non valida una serie con più di 40 cambi.

## Indietro che usciva dopo uno o due passi, contorno di «Colore» come l'anello — 22 novembre 2026

- **Indietro su Android (segnalazione: «mi porta indietro di uno/due passaggi e poi mi fa uscire dall'app»).** Causa: l'intervento di
  Chrome contro la manipolazione della cronologia. Dopo ogni Indietro `backStack.ts` rimetteva la guardia con `pushState`, senza un tocco
  dell'utente. Dopo un back/forward Chrome non conta più l'attivazione precedente (crbug.com/1248529), e una voce aggiunta senza attivazione
  rende saltabili **tutte** le voci del documento: al successivo Indietro di sistema Chrome saltava l'intera app e la chiudeva. Bastava un
  tocco in mezzo per «riparare», da qui l'«uno/due passaggi». Le prove headless non lo vedevano perché `Page.navigateToHistoryEntry` non
  applica l'intervento.
  Correzione: dopo un Indietro la guardia è ancora la voce in avanti, quindi si ritorna su di essa con `history.forward()`, che non aggiunge
  voci e non è soggetto all'intervento. `pushState` resta solo quando avanti non c'è la guardia (primo livello aperto da un tocco). Due
  ripieghi: se avanti c'è un'altra voce (la guida) si torna indietro e si aggiunge la guardia; se avanti non c'è nulla, `pushState` dopo
  400 ms (`forwardTimeout`). La storia finta di `tests/backStack.test.ts` ora modella l'intervento (`intervention`, `tap()`): i due test
  nuovi falliscono sul codice precedente e passano col nuovo, più un test sul ripiego.
- **Selezione degli avatar come quella di «Colore dell'anello»** (su richiesta, con screenshot; una prima lettura aveva cambiato per errore
  la scheda «Colore», annullato): nella scheda «Immagine del profilo» l'avatar scelto ha l'anello `onSurface` da 2 (bianco nel tema scuro,
  scuro nel chiaro) invece di `primary`, con lo stesso spazio di 6 tra anello e immagine dei campioni (cerchio da 52 attorno all'avatar
  da 36, `avatarOption`).
- **Verifica:** `npm run check` OK (**560/560**). Chromium headless su `dist-demo` (Standard, 390×844): Spese → Analisi → Fondi → Liste,
  poi Indietro ×5: Fondi, Analisi, Spese, Nuova spesa, uscita; la cronologia resta di 3 voci (guardia ripresa con `forward()`, nessun
  nuovo `pushState`). Avatar scelto: anello bianco a 6 dall'avatar nel tema scuro, scuro nel chiaro, come i campioni dell'anello.
  Nessun errore JS. **Da provare sul telefono:** Indietro ripetuto senza toccare lo schermo (app installata e Chrome), gesto Indietro.
  Committato in `a4cbef0`, inviato e pubblicato su Hosting.

## Pagina «Esercenti»: rinomina, unione, eliminazione — 22 novembre 2026

- Su richiesta (scelte dell'utente: 1a = eliminare un esercente usato lo toglie dalle spese, 2 = rinominare verso un nome esistente unisce
  i due dopo conferma): voce «Esercenti» (icona negozio) nel menu account sotto «Archiviazione e backup», contatore `merchantsRequest`
  (Standard e Avanzata), sezione `merchants` tra le pagine del menu (`accountPages`, «Fatto», cronologia di Indietro).
  `features/merchants/MerchantsPage.tsx`: riga di spiegazione, ricerca (30), elenco alfabetico con «n spese»/«Nessuna spesa», matita →
  `RenameDialog` (nome a 30 nel campo; se la chiave è di un altro esercente: «Esiste già l'esercente …: i due diventeranno uno solo…» e
  «Unisci»), cestino → `DeleteAction` con il numero di spese che resteranno senza esercente. Pulsanti disattivati senza sincronizzazione.
- Dati: `renamedMerchant` (dominio), `DataStore.renameMerchant`/`removeMerchant` in Firestore (spese lette dal server con `where`
  su `merchant_id`, gruppi di 100 transazioni sulle revisioni, fino a 3 letture per le spese salvate nel frattempo, nuovo esercente prima e
  vecchio eliminato per ultimo; interruzione a metà → «Operazione interrotta… Riprova per completarla.») e in locale (una transazione).
  Rules invariate (gli esercenti si potevano già scrivere ed eliminare), backup invariato. Guida e README aggiornati (IT/EN).
- **Verifica:** `npm run check` OK (**557/557**, test nuovo in `tests/localStore.test.ts`). `test:emulator` **24/24** su porte proprie
  (test nuovo: stessa chiave, unione con revisioni +1, eliminazione con campo tolto, estraneo negato). Chromium headless su `dist-demo`
  (Standard, 390×844, `nummo-esercenti-v10.json` unito): 12 esercenti con i conteggi giusti; «Coop» → «esselunga» propone l'unione →
  «esselunga · 13 spese»; «Bar da Mario» (4 spese) eliminato con la conferma che lo dice; «Libreria Rossi» → «Libreria Bianchi»; ricerca
  «caffe» → «Caffè Centrale»; Indietro → Archiviazione e backup. Nessun errore JS. Non provati: Avanzata nel browser, desktop.

## Cambi di stato fino a 40 (Rules da pubblicare) — 22 novembre 2026

- Su richiesta («sono d'accordo, puoi procedere» dopo l'analisi qui sotto): `maxStatusChanges` 8 → **40**; `firestore.rules` e
  `public/firestore.rules` (identiche) `statusChanges`: `size() <= 839`, regex `{0,39}`. Nuova `statusChangeProblem` (`'too-many'` |
  `'before-last'`) in `domain/subscription.ts`: `StatusDialog` e `Workspace` dicono «Questo abbonamento ha già un cambio di stato dopo questa
  data: scegline una dal … in poi.» invece di «Troppe variazioni…» quando la data precede l'ultimo cambio (IT/EN). Decisione in
  `docs/architecture.md`.
- **Verifica:** `npm run check` OK (**556/556**; test di dominio con 40/41 cambi e i due motivi). `test:emulator` **23/23** su porte proprie
  (39199/39380, config temporanea `.nummo-status-check.json` rimossa; runner hybrid 36786 non toccato): 40 stati di lunghezza massima
  (839 caratteri) accettati anche nel caso peggiore con 8 prezzi, prova, 4 cambi di frequenza, 60 pagamenti eliminati, fondo ed esercente;
  41 stati e 40 + uno rifiutati.
- **Pubblicato:** Rules e poi Hosting da `f57b1b9` (vedi «Stato corrente»): in produzione il limite è 40.

## Colore dell'anello in Avanzata, analisi del limite dei cambi di stato — 22 novembre 2026

- **Colore dell'anello** (su richiesta; solo Avanzata da collegati): nella scheda «Immagine del profilo» delle Impostazioni, sotto gli avatar,
  «Colore dell'anello» con sette campioni tondi: «Colore dell'app» (il `primary` attuale, predefinito, segue «Colore») e i sei colori di
  «Colore» (Menta, Blu, Viola, Rosa, Ambra, Grafite: il loro `primary` nello schema chiaro o scuro corrente, già testato per il contrasto).
  Vale per il pulsante dell'account e per l'anteprima. Per account in `nummo.profileRing.v1.<uid>` (`profileImage.ts`: `parseProfileRing`,
  `profileRingColor`; `useProfileRing`/`saveProfileRing` in `useProfileImage.ts`), mai nel backup; «Ripristina predefiniti» lo riporta al
  colore dell'app. `AccountMenu.ring` ora è il colore (stringa) invece di un booleano. In Standard la sezione non c'è.
- **Analisi del limite dei cambi di stato (richiesta dell'utente, nessuna modifica):** il limite di 8 (`maxStatusChanges`) nasce quando le
  Rules controllavano gli stati per posizione nell'array; oggi `status_changes` in Firestore è una stringa compatta validata da **una sola
  regex** (`statusChanges` in `firestore.rules`: `size() <= 167` e `{0,7}`), quindi il numero di cambi non pesa sul budget di espressioni.
  Alzarlo (es. a 40: `size() <= 839`, `{0,39}`) cambia solo due costanti nelle Rules, `maxStatusChanges` e i test; da rimisurare comunque con
  `test:emulator` (caso peggiore). Conseguenze: Rules da ripubblicare (e da ricopiare per chi ha il proprio Firebase), client vecchi (schede
  non aggiornate) vedrebbero come non valida una serie con più di 8 cambi; i backup restano v11 (lettura più permissiva). Alternative
  valutate e scartate: compattare la cronologia (gli stati passati decidono quali pagamenti contano: non si possono togliere senza cambiare
  i totali), trasformare le pause passate in pagamenti eliminati (`skipped_payments`, limite 60, perde il senso della pausa). In attesa della scelta.
- **Verifica:** `npm run check` OK (**556/556**, test nuovo in `tests/profileImage.test.ts`). Chromium headless su un export dedicato con
  emulatori miei (39199/39380, config temporanea `.nummo-ring-check.json` rimossa, emulatori fermati; runner hybrid 36786 non toccato),
  accesso dal popup dell'emulatore come proprietario demo, 390×844 scuro: anello del pulsante = colore dell'app; sette campioni con i colori
  giusti; «Rosa» → pulsante e anteprima rosa, chiave `rose`; dopo il ricaricamento ancora rosa; tema chiaro → rosa dello schema chiaro;
  «Ripristina predefiniti» → chiave tolta, colore dell'app. Nessun errore JS. Non provati: telefono reale, larghezza desktop. Committato in `f57b1b9`, inviato e pubblicato (Rules e Hosting).

## Indietro di un passo alla volta, vibrazione sulla ricorrenza — 22 novembre 2026

- **Indietro (Android e browser), su richiesta:** torna esattamente alla pagina visitata prima, non più sempre a Nuova spesa. Cronologia pura
  in `features/workspace/pageTrail.ts` (`visit`, `stepBack`, `done`; test in `tests/pageTrail.test.ts`): solo in memoria, vuota a ogni
  avvio, al massimo 20 passi (oltre si dimenticano i più vecchi; con la cronologia vuota Indietro porta a Nuova spesa). Ordine invariato:
  prima overlay e lista aperta, poi la pagina. «Fatto» delle pagine del menu account torna alla sezione di partenza come passo indietro,
  togliendo dalla cronologia le pagine del menu aperte nel frattempo (Spese → Impostazioni → Categorie → Fatto → Indietro = Nuova spesa).
  Da Nuova spesa Indietro torna ancora indietro se ci sono pagine precedenti; esce dall'app solo con la cronologia vuota. Nessun cambio
  a `backStack.ts` (una sola voce di guardia): il livello `page` si registra di nuovo a ogni passo (`key` = pagina e lunghezza).
- **Vibrazione** (`tap`) al cambio di ricorrenza Settimana/Mese/Anno (`RecurrencePicker`, Nuova spesa e modifica della frequenza).
- **Domanda dell'utente:** «posso mettere in pausa un abbonamento solo 8 volte?» Risposta data: il limite è di 8 cambi di stato in tutto
  (pausa, riattivazione e annullamento contano uno ciascuno; più cambi nello stesso giorno valgono uno), quindi circa 4 cicli pausa/riattiva.
  In attesa di una scelta (alzarlo richiede Rules e rimisura del budget).
- **Verifica:** `npm run check` OK (**555/555**). Chromium headless su `dist-demo` (Standard, 390×844): Nuova spesa → Spese → Analisi →
  Fondi → Impostazioni → «Fatto» (Fondi) → Indietro: Analisi, Spese, Nuova spesa, poi uscita dalla pagina; cronologia del browser sempre
  con una sola voce in più. Vibrazione non provata su telefono (solo la prop, come per Spese/Abbonamenti). Committato in `f57b1b9`, inviato e pubblicato (Rules e Hosting).

## «Storico dei pagamenti» largo due pulsanti su smartphone — 22 novembre 2026

- Su richiesta (screenshot): nei dettagli di un abbonamento, su smartphone, «Storico dei pagamenti» è largo esattamente quanto gli ultimi due
  pulsanti della riga sopra (Pausa/Riattiva + Modifica) e allineato ai loro bordi. Le tre azioni crescono da etichette di larghezza diversa,
  quindi i due pulsanti si misurano (`onLayout`); se le azioni vanno su due righe (etichette lunghe a 360/320 px: «Modifica» da solo sotto)
  lo storico occupa tutta la riga, come la coppia sopra. Da medium invariato.
- **Domanda dell'utente sul dialogo «Metti in pausa» con «Troppe variazioni di stato…» (iPhone, «Claude Code Pro»):** è `StatusDialog`
  (pausa da oggi o da una data passata). `setStatus` rifiuta se l'abbonamento ha già 8 cambi di stato (`maxStatusChanges`, anche nelle
  Rules) o se l'ultimo cambio è successivo alla data scelta; il dialogo mostra lo stesso messaggio per entrambi i casi. Dati dell'utente
  non visti: causa da confermare (backup JSON, `status_changes` di quella serie). Nessuna modifica fatta in attesa della scelta.
- **Verifica:** `npm run check` OK. Chromium headless su `dist-demo` (Standard, `nummo-utente-medio.json` unito, «Affitto»): a 390 «Pausa»
  136,8 → «Modifica» 355,0, storico 137,0..355,0; a 412 144,2 → 377,0, storico 144,0..377,0; a 360 e 320 azioni su due righe, storico
  25..325 e 25..285 come «Modifica». Nessun errore JS. Committato in `f57b1b9`, inviato e pubblicato (Rules e Hosting).

## Barra inferiore che lampeggiava allo scorrimento, avvisi a 5 secondi — 22 novembre 2026

- **Barra inferiore (su segnalazione: «sparisce per millesimi di secondo e riappare»).** Causa: l'anticipo della tastiera virtuale
  nascondeva la barra a `pointerdown` su un campo scrivibile e la rimostrava a `pointercancel` quando il tocco diventava uno scorrimento.
  In Nuova spesa quasi ogni scorrimento parte da un campo, quindi lampeggiava spesso. Riprodotto in Chromium headless (390×640, touch
  emulato, trascinamento dalla Descrizione): opacità 0 per circa 85 ms, poi 1. Correzione in `observeVirtualKeyboard` (`theme/viewport.ts`):
  l'anticipo parte dal focus che segue il rilascio sul campo (entro `touchFocusWindow`, 500 ms) o dal rilascio su un campo già attivo
  (tastiera chiusa con Indietro); `pointercancel`/scroll non servono più e sono stati tolti. Un tocco che ferma lo scorrimento non mette
  il focus e non nasconde nulla. La barra sparisce ~80 ms più tardi (al rilascio invece che alla pressione), sempre prima della tastiera.
  Test riscritti in `tests/viewport.test.ts`.
- **Avvisi** a **5 s** (richiesta successiva, al posto dei 4 s qui sotto).
- **Verifica:** `npm run check` OK (**551/551**). Chromium headless su `dist-demo`: trascinamento dalla Descrizione a 390×640 e 360×640 →
  barra sempre visibile; tocco → nascosta al focus, di nuovo visibile dopo 800 ms (nessuna tastiera nell'emulazione, fallback atteso).
  `scripts/check-keyboard.mjs` (anche `--steps 4 --switch`): barra nascosta al focus con spazio conservato, liberato al primo restringimento
  oltre la soglia, ricompare in un fotogramma alla chiusura; nessun errore JS né long task. **Da provare sul telefono:** scorrimento di
  Nuova spesa partendo da un campo, tocco su un campo (la barra deve sparire prima della tastiera), riapertura dopo Indietro, iPhone.
  Committato in `f57b1b9`, inviato e pubblicato (Rules e Hosting).

## «Annulla»/«OK» della data più alti, avvisi a 4 secondi — 22 novembre 2026

- Su richiesta (screenshot): «Annulla» e «OK» del selettore della data (`small` di `CancelButton`/`ConfirmButton`) alti 44 invece di 40
  («leggermente»), sempre sotto i 48 degli altri pulsanti dei dialoghi; larghezza invariata.
- Avvisi temporanei (`useSnackbar`, `SnackbarHost.tsx`) da 3 a **4 s** (richiesta «un po' più lunga»; 5 s erano stati giudicati troppo lunghi
  il 17 novembre; 4 s è il minimo indicato da Material 3). «Chiudi» li chiude prima, come sempre.
- **Verifica:** `npm run check` OK (**551/551**). Chromium headless su `dist-demo` (Standard): selettore della data aperto da Nuova spesa a
  390×844 e 1280×900, «Annulla» e «OK» alti 44; nessun errore JS. Durata degli avvisi non cronometrata nel browser (costante `4e3` nel bundle).
  Committato in `f57b1b9`, inviato e pubblicato (Rules e Hosting).

## Riallineamento documentale — 22 novembre 2026

- Su richiesta, dopo il riscontro tra documenti e codice su `074171c` (`npm run check` OK, **551/551**; nessuna discrepanza nel codice rispetto
  ad `AGENTS.md`): corretti in questo file «Funzionalità implementate» (sostituzione senza copia automatica, «Elimina tutte le spese», categorie
  ripristinabili e non eliminabili se in uso) e «Prossime attività» (Hosting fino a `1e5c615`, Rules del 22 novembre con `17632af`), più un
  rimando in `docs/architecture.md` alla nota storica sulla copia automatica. Nessun codice toccato, nessun commit.

## «Elimina» dei dialoghi di modifica con contorno rosso — 22 novembre 2026

- Su richiesta (screenshot): da medium «Elimina» dei dialoghi di modifica (`DeleteAction labeled="wide"`: spesa, template, prodotto, fondo) è
  con contorno, contorno ed etichetta in `error`, alto 48 come «Annulla» e «Salva». Su smartphone resta il solo cestino con contorno.
- **Verifica:** `npm run check` OK. Chromium headless (Standard, 1280×900): «Modifica fondo» con Elimina, Annulla e Salva alti 48. Nessun errore
  JS. Committato in `1e5c615`, inviato e pubblicato su Hosting.

## «Elimina» del fondo nel dialogo di modifica, anche per i fondi usati (con il motivo) — 22 novembre 2026

- Su richiesta: «Elimina» tolto dalla scheda espansa del fondo e messo nel dialogo «Modifica fondo», sulla riga di Annulla/Salva come nei
  dialoghi di spesa, template e prodotto (`DeleteAction labeled="wide"`). Sempre presente: per un fondo con spese (anche abbonamenti) o movimenti
  il dialogo è «Il fondo … è in uso» / «Lo usano 15 spese, quindi non si può eliminare. Se non ti serve più, archivialo dalla sua scheda.» con
  solo «Chiudi». I fondi archiviati (senza dialogo di modifica) hanno «Elimina» sulla scheda, con la stessa regola («…: resta archiviato.»).
  Alla conferma `FundsPage` ricontrolla con i dati più recenti (`fundInUse`). Nessun cambio a `DataStore`/Rules.
- **Verifica:** `npm run check` OK. Chromium headless su `dist-demo` (Standard, 1280×900) con un backup di prova: nessun «Elimina» sulle schede
  attive; «Medio · Auto» → bloccato («15 spese»); «Prova attivo» non usato → eliminato, dialogo chiuso; archiviato non usato → conferma normale.
  Nessun errore JS. **Non provati:** smartphone (solo cestino a sinistra, come negli altri dialoghi), Avanzata. Committato in `1e5c615`, inviato e pubblicato su Hosting.

## «Palette» predefinita, fondi archiviati non usati eliminabili — 22 novembre 2026

- **Colore** (su richiesta): modalità colore predefinita «Palette» (prima «Monocolore»), e nelle Impostazioni «Palette» viene per prima. Vale
  per chi non ha mai salvato una scelta: le preferenze si salvano intere, quindi chi ha già cambiato qualunque impostazione resta su
  «Monocolore» finché non sceglie «Palette». Colori statici del primo avvio (`index.html`, `offline.html`, Menta monocolore) invariati: la
  differenza con Menta palette è minima (#F5FBF5 / #F5FAF8) e `GlobalStyle` la sostituisce subito. Test in `tests/preferences.test.ts`.
  Nota: con «Palette» i sei campioni del colore non stanno su una riga nella colonna destra a 1280 px (Grafite va a capo); già così prima.
- **Fondi** (domanda dell'utente): un fondo attivo senza spese né movimenti era già eliminabile («Elimina» nella scheda espansa); ora anche un
  fondo **archiviato** non usato ha «Elimina» accanto a «Ripristina», con la stessa conferma e `removeFund` (transazione con revisione).
- **Verifica:** `npm run check` OK (**551/551**). Chromium headless su `dist-demo` (Standard, 1280×900, profilo nuovo): «Palette|Monocolore»,
  «Palette» selezionata; con un backup di prova con un fondo archiviato inutilizzato: «Elimina Prova archiviato» → conferma → eliminato, sezione
  degli archiviati sparita. Nessun errore JS. Committato in `1e5c615`, inviato e pubblicato su Hosting.

## «Ripristina le categorie predefinite» come «Ripristina predefiniti», che su desktop è largo due pulsanti — 22 novembre 2026

- Su richiesta (screenshot): «Ripristina le categorie predefinite» con lo stesso aspetto di «Ripristina predefiniti» (pillola, etichetta e
  icona in `secondary`). Nelle Impostazioni, da medium, «Ripristina predefiniti» è largo quanto «Dimentica la chiave» e «Revoca il consenso»
  insieme (`doubleWidth`, non si misura; senza quei due pulsanti, larghezza propria). Smartphone invariato.
- **Verifica:** `npm run check` OK. Chromium headless (Standard, 1280×900): 281..456, 466..641, «Ripristina predefiniti» 281..641; Categorie
  con la pillola. Nessun errore JS. Committato in `1e5c615`, inviato e pubblicato su Hosting.

## «Elimina tutti i template» — 22 novembre 2026

- Su richiesta: nella pagina Templates, sotto l'elenco «I tuoi template (n)», «Elimina tutti i template» (contorno ed etichetta in `error`,
  solo con almeno un template; in grigio con i template spenti, come il resto della pagina). Conferma «Eliminare n template?» («Le spese già
  salvate non cambiano…»), poi `removeAll` in `useRemoteTemplates`: la `removeTemplate` di sempre per ognuno (scritture semplici accodate,
  nessun cambio a `DataStore`/Rules), si ferma al primo rifiuto e dice quanti ne ha eliminati.
- **Verifica:** `npm run check` OK. Chromium headless su `dist-demo` (Standard, 1280×900) con un backup v11 costruito per la prova (due template):
  «I tuoi template (2)» → pulsante → «Eliminare 2 template?» → «Nessun template.», pulsante sparito. Nessun errore JS. **Non provati:** Avanzata,
  smartphone. Committato in `3994330`, inviato e pubblicato su Hosting. (Manca ancora in `docs/testing/` un file di collaudo v11 con template.)

## «Elimina le liste archiviate», anello dell'avatar automatico in Avanzata — 22 novembre 2026

- **Liste** (su richiesta): con la sezione «Liste archiviate (n)» aperta, sotto le schede, «Elimina le liste archiviate» (contorno ed etichetta
  in `error`). Conferma «Eliminare n liste archiviate?» («Le spese già registrate restano nella sezione Spese con i loro prodotti…»), poi
  `removeLists` in `useRemoteLists`: la `removeList` di sempre per ogni lista (lista + prodotti; scritture semplici accodate dall'SDK, nessun
  cambio a `DataStore`/Rules), si ferma al primo rifiuto e dice quante ne ha eliminate. Le liste attive non si toccano.
- **Anello dell'avatar** (scelta dell'utente): tolti l'interruttore «Anello colorato» e la preferenza `avatarRing` (un valore salvato si ignora,
  test in `tests/preferences.test.ts`); l'anello `primary` compare da solo in Avanzata da collegati (pulsante dell'account e anteprima nelle
  Impostazioni), mai in Standard.
- **Verifica:** `npm run check` OK. Chromium headless su `dist-demo` (Standard, 1280×900) dopo l'import di `nummo-utente-medio.json`: «Liste
  archiviate (1)» → pulsante → «Eliminare 1 lista archiviata?» → eliminata, sezione sparita, lista attiva intatta; nessun anello in Standard.
  Nessun errore JS. **Non provati:** anello in Avanzata (serve l'accesso con l'emulatore), smartphone. Committato in `3994330`, inviato e pubblicato su Hosting.

## «Cambia modalità» nel colore principale, nota sotto «Elimina tutte le spese» tolta — 22 novembre 2026

- Su richiesta (screenshot): «Cambia modalità» di Archiviazione e backup pieno nel colore principale (`contained`, entrambe le modalità;
  «Scollega progetto» resta con contorno); tolta la nota «* Categorie, fondi, liste, template ed esercenti restano.» (e la traduzione).
- **Verifica:** `npm run check` OK (vedi rilascio). Committato in `a13e54c`, inviato e pubblicato su Hosting.

## «Cambia modalità» largo come due pulsanti su desktop — 22 novembre 2026

- Su richiesta (screenshot): da medium «Cambia modalità», solo nella sua riga, è largo come due pulsanti della pagina più lo spazio tra loro
  (`doubleWidth` in `components/SameWidth.tsx`; non si misura, quindi la larghezza comune resta quella di un'etichetta). In Avanzata, accanto a
  «Scollega progetto», ognuno resta largo uno. Smartphone invariato.
- **Verifica:** `npm run check` OK. Chromium headless (Standard, 1280×900): «Cambia modalità» 281+476, sotto 281+233 e 524+233 (stessi bordi);
  a 390 tutti 364. Avanzata non provata nel browser. Committato in `a13e54c`, inviato e pubblicato su Hosting.

## Impostazioni su desktop: «Dimentica la chiave», «Revoca il consenso» e «Ripristina predefiniti» della stessa larghezza — 22 novembre 2026

- Su richiesta (screenshot): da medium i tre pulsanti hanno la stessa larghezza, quella dell'etichetta più lunga, senza occupare la riga
  (`SameWidthGroup` attorno a `SettingsPage`, `useSameWidth` nella scheda AI e in `ResetAllButton`). Smartphone invariato (metà riga e tutta la riga).
- **Verifica:** `npm run check` OK. Chromium headless (Standard, 1280×900): 281..480, 490..689, 281..480 (199 ciascuno). Committato in `a13e54c`, inviato e pubblicato su Hosting.

## Dialoghi di eliminazione con backup: «Annulla» ed «Elimina» a metà riga su desktop — 22 novembre 2026

- Su richiesta (screenshot): in «Eliminare tutte le spese?» (e «Sostituire tutti i dati?», stesso dialogo) da medium «Annulla» e la conferma
  occupano tutta la riga, a metà ciascuno, allineati a «Scarica backup (JSON)» (`half` in `DeleteDialog`, solo quando c'è contenuto extra:
  gli altri dialoghi di eliminazione restano a destra). Su smartphone invariati (impilati a tutta larghezza).
- **Verifica:** `npm run check` OK. Chromium headless (Standard): a 1280×900 backup 465+350, Annulla 466+168, Elimina tutte 647+168; a 390×844
  tutti ~308 impilati. Committato in `a13e54c`, inviato e pubblicato su Hosting.

## Categorie in uso non eliminabili — 22 novembre 2026

- Su richiesta (dopo l'analisi: prima l'eliminazione lasciava spese e abbonamenti con un riferimento a una categoria inesistente, mostrati come
  «Senza categoria» e non salvabili in modifica senza sceglierne un'altra): una categoria usata da spese o abbonamenti **non si elimina**.
  Il cestino apre un dialogo «La categoria … è in uso» con «La usano 19 spese e 1 abbonamento. Per eliminarla, cambia prima la loro
  categoria, oppure rinominala con la matita.» (singolare «La usa 1 spesa…») e solo «Chiudi». Le categorie non usate si eliminano come prima.
- Conteggio puro `categoryUsage` (`domain/category.ts`, test in `tests/seedDefaults.test.ts`); liste e template non contano. `DeleteDialog`/
  `DeleteAction` con `blocked`. Cestino disattivato finché le spese non sono caricate; `Workspace` ricontrolla alla conferma sui dati più
  recenti. Solo nell'app: le Rules non lo impediscono (scelta concordata). Scartato lo spostamento in blocco su un'altra categoria (troppo complesso).
- **Verifica:** `npm run check` OK (**550/550**). Chromium headless su `dist-demo` (Standard, 1280×900) dopo l'import di `nummo-utente-medio.json`:
  le dieci categorie «Medio · …» bloccate con i conteggi giusti (es. 53 spese; 8 spese e 2 abbonamenti; 5 abbonamenti), le cinque predefinite
  inutilizzate con il dialogo di sempre; «Tecnologia» eliminata davvero (15 → 14). Nessun errore JS. **Non provati:** Avanzata, smartphone,
  la frase al singolare. Committato in `a13e54c`, inviato e pubblicato su Hosting.

## «Ripristina le categorie predefinite», « | » negli abbonamenti, «Cambia modalità» con contorno — 22 novembre 2026

- Su richiesta (screenshot dell'utente):
  - **Categorie:** «Aggiungi quelle predefinite» (solo a lista vuota) diventa «Ripristina le categorie predefinite», sempre presente sotto
    l'elenco (su smartphone a tutta larghezza). Aggiunge solo le cinque predefinite che mancano per nome (maiuscole e spazi ignorati, nella
    lingua corrente; `missingDefaultCategories` in `domain/category.ts`, test in `tests/seedDefaults.test.ts`); se ci sono tutte, «Le categorie
    predefinite ci sono già.». Non modifica né elimina nulla. La creazione automatica su archivio vuoto usa la stessa funzione.
  - **Abbonamenti (Spese):** nella riga «Mensile | Prossimo rinnovo …» al posto del punto, con uno spazio en (U+2002) per lato
    (circa il doppio di uno spazio normale; su richiesta, dopo il primo screenshot). Gli altri « · » (rinnovi in arrivo) invariati.
  - **Archiviazione e backup:** «Cambia modalità» (e «Scollega progetto» in Avanzata) con contorno invece che di testo; tutti i pulsanti della
    pagina (sezione di archiviazione, passaggio dei dati, file di backup, elimina) hanno la stessa larghezza da medium (`SameWidthGroup` attorno
    alla pagina in `Workspace`, `useSameWidth` in `components/SameWidth.tsx`, che sostituisce la misura interna di `BackupActions`); su
    smartphone a tutta larghezza come prima.
- **Verifica:** `npm run check` OK. Chromium headless su `dist-demo` (Standard): a 1280×900 i cinque pulsanti della pagina larghi 233, a 390×844
  tutti 364 (tutta la riga); Categorie con 5 categorie: pulsante presente, «ci sono già». Nessun errore JS. **Non provati nel browser:** ripristino
  con una predefinita mancante (solo test di dominio), riga di un abbonamento (archivio demo senza abbonamenti), pulsanti dell'Avanzata.
  Committato in `49a7c58`, inviato e pubblicato su Hosting.

## Pulsanti della scheda AI su smartphone, backup proposto prima di eliminare — 22 novembre 2026

- Su richiesta (screenshot dell'utente):
  - **Scheda «Analisi scontrini con AI», smartphone:** «Dimentica la chiave» e «Revoca il consenso» occupano tutta la riga, a metà ciascuno
    (uno solo: tutta la riga), con margini dell'etichetta ridotti perché entrino a 320 px; «Ripristina predefiniti» a tutta larghezza.
  - **Prima di eliminare** («Elimina tutte le spese», «Sostituisci tutti i dati»): niente più copia scaricata in automatico; il dialogo chiede
    «Vuoi prima scaricare un backup dei dati attuali?» con «Scarica backup (JSON)» (tonale; dopo il download «Backup scaricato», disattivato;
    si azzera a ogni apertura). È il backup completo di sempre (`nummo-backup.json`, conta per il promemoria). Decisione in `docs/architecture.md`.
- **Verifica:** `npm run check` OK (**548/548**). Chromium headless su `dist-demo` (Standard, 390×844 touch): pulsanti AI 13..190 e 200..377,
  «Ripristina predefiniti» 13..377; etichette intere a 360 e 320 px; dialogo di eliminazione: un solo download (`nummo-backup.json`) dal
  pulsante del dialogo, nessun download alla conferma, pulsante di nuovo «Scarica backup (JSON)» alla riapertura. Nessun errore JS.
  **Non provato nel browser:** il dialogo «Sostituisci tutti i dati». Committato in `49a7c58`, inviato e pubblicato su Hosting.

## Sezione «Passa alla modalità Standard» tolta, zoom a icona nella revisione, «Nuova lista», anello dell'avatar, «Salva» fermo — 22 novembre 2026

- Su richiesta (screenshot dell'utente):
  - **Archiviazione e backup (Avanzata):** tolti la frase «I dati sono anche sul dispositivo…» e il pulsante «Passa alla modalità Standard»
    che comparivano dopo «Da Firebase al dispositivo» (`ModeTransfer` senza `onChangeMode` né stato `copied`; traduzioni rimosse). Il cambio
    di modalità resta da «Cambia modalità».
  - **Revisione dello scontrino:** niente più pulsante di testo «Ingrandisci la foto»; come prima della scansione, l'icona sull'angolo della foto.
    Su desktop, sotto la foto resta uno spazio vuoto perché i pulsanti restino allineati ai campi.
  - **Liste:** il pulsante in testa dice «Nuova lista» anche su smartphone (prima «Nuova»); a 320 px il titolo va a capo, nessun overflow.
  - **Anello colorato** (Impostazioni → Immagine del profilo): interruttore, spento di base, preferenza `avatarRing` in `nummo.preferences.v1`;
    anello `primary` da 2 attorno al pulsante dell'account (entrambe le modalità; spazio riservato, la foto non si sposta) e da 3 attorno
    all'anteprima. «Ripristina predefiniti» lo spegne. Test in `tests/preferences.test.ts`.
  - **«Salva» che scendeva scrivendo (smartphone):** causa = il contatore «1/100» della Descrizione, che compare al primo carattere e
    aggiungeva ~16 dp al flusso. Ora, senza errori e fuori dalla revisione dello scontrino, sta fuori dal flusso nello spazio prima
    dell'Esercente (`counterOnly` in `ExpenseFields`). Restano voluti: i suggerimenti dell'Esercente (combobox nel flusso) e gli errori dopo «Salva».
- **Verifica:** `npm run check` OK (**548/548**). Chromium headless su `dist-demo` (Standard, 390×844 touch): «Salva» 556..612 prima e dopo aver
  scritto «g», contatore tra Descrizione ed Esercente; «Nuova lista» intero a 390/360/320 senza scorrimento orizzontale; anello acceso →
  preferenza salvata, anello sul pulsante dopo il ricaricamento e sull'anteprima. Nessun errore JS. **Non provati nel browser:** `ModeTransfer`
  (solo Avanzata) e la revisione dello scontrino (serve l'AI): solo typecheck. Committato in `49a7c58`, inviato e pubblicato su Hosting.

## Templates senza data — 22 novembre 2026

- Su richiesta («non deve essere possibile inserire la data»): pagina Templates e dialogo di modifica senza il campo Data (`withoutDate` di
  `ExpenseFields`: l'Importo occupa tutta la prima riga). Il campo `date` resta nei dati (Rules e backup invariati): si salva con il giorno
  del salvataggio (anche modificando un template vecchio) e non conta più: Nuova spesa non lo prende dal template (resta la data del modulo)
  e l'elenco non lo mostra. Guida (IT/EN) e README senza «data» nei template.
- **Verifica:** typecheck, `npm test` **547/547**, `build:demo`. Chromium headless su `dist-demo` (Standard) a 1280×900 e 390×844: nessun campo
  Data visibile, template creato (12,50 €, «Caffè al bar», categoria) con `date` di oggi; nessun errore JS. **Non provati:** dialogo di
  modifica e scelta del template in Nuova spesa nel browser. Committato in `67f4a29`, inviato e pubblicato su Hosting (22 novembre, sera).

## «Elimina tutte le spese», «Cambia modalità» nel colore principale, PIN del blocco in Standard — 22 novembre 2026

- **Elimina tutte le spese** (su richiesta: «solamente tutti i dati delle spese registrate», copia automatica prima, solo l'archivio): nuovo
  gruppo «Elimina le spese» in Archiviazione e backup, entrambe le modalità. `DeleteDialog` → download di `nummo-backup-prima-di-eliminare.json`
  → `DataStore.removeAllExpenses()` (nuova operazione, in **entrambe** le implementazioni: locale in una transazione con `clear`, Firestore
  lettura dal server poi gruppi da 400, non atomico, ripetibile, offline rifiutata prima di eliminare). Restano categorie, fondi, movimenti,
  liste (quelle registrate restano archiviate e diventano «staccate», come dopo un import), template, esercenti, budget. Rules invariate.
- **«Cambia modalità»** del dialogo di cambio modalità: dal rosso `error` al colore principale (screenshot dell'utente).
- **Conteggi tolti** da «Dati della modalità Standard» (Avanzata): niente più «Sul dispositivo: n spese, n categorie.», né «Controllo dei
  dati…»; restano «Nessun dato sul dispositivo.» e gli errori.
- **PIN del blocco in Standard** (scelta dell'utente: 6 cifre, obbligatorio): accendere il blocco in Standard apre «Scegli il PIN di Nummo»
  (due volte), poi chiede l'impronta; `pin` = sale 16 byte + PBKDF2-SHA-256 200.000 iterazioni in `nummo.appLock.v1` (`domain/appLock.ts`:
  `createPin`/`pinMatches`, mai in chiaro; un `pin` danneggiato si ignora). Sulla schermata di blocco, senza «Esci» dell'Avanzata, «Non riesco
  a sbloccare» chiede il PIN; errato → «PIN errato.». Il PIN si toglie con il blocco e si cambia («Cambia il PIN») solo dopo l'impronta. Un
  blocco acceso prima, senza PIN, mostra in rosso «Imposta un PIN…» e intanto resta la sola conferma. In Avanzata nessun PIN. Nessun limite
  ai tentativi (deterrente come il blocco: sei cifre si provano tutte offline da chi controlla il profilo).
- **Verifica:** `npm run check` OK (**547/547**), `test:emulator` **23/23** su porte proprie (39199/39380, config temporanea rimossa, runner
  hybrid 36786 non toccato). Chromium headless su `dist-demo` (Standard, `localhost`, autenticatore WebAuthn virtuale): import di
  `nummo-utente-medio.json` (196 spese), «Elimina tutte le spese» → copia scaricata, 0 spese, 15 categorie e 3 fondi rimasti, «196 spese
  eliminate.»; «Cambia modalità» verde (primary) nello screenshot; PIN a 5 cifre rifiutato, lettere ignorate, blocco acceso con hash; dopo il
  ricaricamento, impronta rifiutata, PIN errato rifiutato, PIN giusto → sbloccato, blocco e PIN spenti. Nessun errore JS. **Non provati:**
  eliminazione in Avanzata nel browser (solo emulatore), «Cambia il PIN», aspetto su smartphone. Committato in `9929c8f`, pubblicato su
  Hosting il 22 novembre (sera).

## Ricerche ed Esercente a 30 caratteri — 22 novembre 2026

- Su richiesta («hanno ancora troppi caratteri accettati»; scelta dell'utente: 30): «Cerca categoria», «Cerca per nome, mese o anno» e
  «Cerca per nome» si fermano a 30 (`searchPolicy.maxQueryLength` in `policy.ts`; prima 40/100/100); il campo Esercente (Nuova spesa,
  modifica, template) a 30 (`merchantPolicy.maxTypedLength`; prima 60). La validazione degli esercenti resta a 60 (`maxNameLength`, Rules
  invariate): esercenti salvati e backup con nomi più lunghi restano validi; la scansione dello scontrino può ancora proporre un nome fino
  a 60. Nuovo test in `tests/merchant.test.ts`.
- **Verifica:** `npm run check` OK. Chromium headless su `dist-demo` (Standard, 1280×900): Esercente 80 → 30, ricerca di Spese 80 → 30;
  nessun errore JS. Committato in `17632af`, pubblicato con `17632af` (Rules e Hosting, 22 novembre).

## Limiti nei campi di ricerca e delle liste, immagine del profilo in Avanzata — 22 novembre 2026

- **Limiti** (screenshot dell'utente): «Cerca categoria» 40 (come il nome), «Cerca per nome, mese o anno» (Spese) e «Cerca per nome»
  (Abbonamenti) 100 (come la Descrizione), «Nome della lista» 40, nome del prodotto (aggiunta e modifica) 60, tutti con `clipToLength` come
  il nome delle categorie; «Totale spesa» della lista con `amountInputFits` come l'Importo. L'Esercente aveva già il limite di 60
  (`MerchantField`), solo verificato.
- **Immagine del profilo in Avanzata** (su richiesta): stessa scheda da collegati; la scelta di base è la foto Google («Foto di Google»,
  nell'anteprima e nella prima scelta), l'omino se manca o non si carica (`ProfileAvatar` con `googlePhoto`, come già nel menu). Scelta
  per account in `nummo.profile.v1.<uid>` (la Standard resta su `nummo.profile.v1`); `ProfileScope` (`scope`, `googlePhoto`) passato da
  `App.tsx` a `SettingsPage`; il menu account riceve l'avatar solo se diverso dalla scelta di base e allora non mostra i messaggi sulla foto
  Google né «Riprova foto». «Ripristina predefiniti» torna alla foto Google. Nuovo test delle chiavi, traduzione «Foto di Google».
- **Verifica:** `npm run check` OK. Chromium headless su un export demo dedicato con emulatori miei (39199/39380, config temporanea
  `.nummo-avatar-check.json` ed export rimossi, emulatori fermati; runner hybrid 36786 non toccato); foto Google data al proprietario demo
  con l'API dell'emulatore Auth (immagine servita in locale), accesso dal popup dell'emulatore: pulsante con la foto Google; scheda con
  6 scelte, «Foto di Google» selezionata e nell'anteprima; avatar «Orbite» → pulsante e `nummo.profile.v1.demo-owner`, menu senza messaggi
  sulla foto; dopo il ricaricamento avatar conservato; «Foto di Google» → di nuovo la foto, chiave tolta. Limiti: ricerca di Spese 150 → 100,
  Esercente 80 → 60, nome della lista 55 → 40. Nessun errore JS. **Non provati nel browser:** ricerca delle categorie (compare da 9
  categorie), ricerca degli abbonamenti (archivio demo vuoto), foto Google che non si carica nella scheda. Committato in `973e8a9`, pubblicato con `17632af` (Rules e Hosting, 22 novembre).
- **Blocco dell'app:** su richiesta tolta «Nasconde i dati sullo schermo, non li cifra.» dalla riga sotto l'interruttore (IT/EN); resta
  «All’apertura e quando torni nell’app chiede impronta, viso o il PIN del dispositivo.». Typecheck e `npm test` OK. Il limite resta scritto
  nel README e in `AGENTS.md`.

## Importo massimo 999.999.999,99 €, barra dei menu lontana dagli angoli — 22 novembre 2026

- **Importo.** Su richiesta (prima 999.999,99, poi «9 cifre intere + 2 decimali»): massimo di una spesa da 99.999,99 a **999.999.999,99 €**
  (`maxAmountMinor` 99_999_999_999, molto sotto `Number.MAX_SAFE_INTEGER` anche sommando). Vale per spese, prezzi delle serie, totale di
  una lista e importo dei template. Il campo si ferma a 9 cifre intere e 2 decimali (`amountInputFits` e `parseAmountMinor` ricavati dal
  limite). Prezzi compatti (`pricing.ts` e Rules) fino a 11 cifre, stringa fino a **143** caratteri (8 prezzi al massimo; prima 111). La
  lettura della risposta AI accetta fino a 12 cifre intere, così un importo enorme è «fuori limite», non «non letto». **Non cambiati:**
  ricariche e budget dei fondi (99.999,99, `maxMonthlyMinor` ora fisso: con più cifre `budgets` supererebbe i 400 caratteri delle Rules),
  saldi e movimenti (9.999.999,99). Nessun nuovo `backupVersion`.
- **Rules** (radice e `public/`, identiche): `<= 99999999999` per prezzi, spese, totale delle liste e template; regex dei prezzi `{0,10}`, 143.
- **Campo su smartphone:** «99999,99» (il vecchio massimo) a 24 px usciva già di 7 dp dal campo a metà riga a 360 px. Ora `amountSize`:
  28 px fino a 6 caratteri, poi al massimo 24 e più piccolo secondo cifre (0,6 em) e separatore (0,3 em), misurati: «999999999,99» 14 px,
  «123456789» 18, «1234,56» 24; tutti entrano a 320, 360, 390, 412 px (1280: 28 px); «1234567890» si ferma a «123456789». Una spesa da
  999.999.999,99 € a 360 px: salvata, riga di Spese leggibile; nella scheda «Totale» «1 spesa» va a capo e il separatore sottile resta a fine
  riga (solo con importi enormi su schermi stretti; non corretto).
- **Barra dei menu** (screenshot dell'utente, menu Categoria su desktop): la barra arrivava negli angoli arrotondati ed era tagliata.
  `AnchoredMenu` marca lo scroller (`data-menu-scroll`) e `GlobalStyle` ne accorcia il binario di `radius.control` (20) sopra e sotto, come
  `data-panel-scroll`. Chromium 1280 px: barra sotto l'angolo in alto e sopra quello in basso, in cima e in fondo alla lista.
- **Verifica:** `npm run check` OK, `test:emulator` **22/22** su porte proprie (39199/39380, config temporanea rimossa, runner hybrid 36786
  non toccato), con 999.999.999,99 € accettato e 1.000.000.000,00 rifiutato. Nessun errore JS.
- **Pubblicazione, nell'ordine:** prima le **Rules** (`firebase deploy --only firestore:rules --project nummo-6b6e2`), poi Hosting; chi ha
  collegato il proprio Firebase deve ricopiare le Rules. Committato in `20b14e0`, pubblicato con `17632af` (Rules e Hosting, 22 novembre).

## Avatar «Pietre» al posto di «Onde» — 22 novembre 2026

- Su richiesta («rigenera quest'ultima icona»): «Onde» (`waves`) sostituito da **Pietre** (rosa, id `stones`): tre ciottoli ellittici
  impilati, più stretti verso l'alto e appena inclinati, base/accento/base con 3 di spazio tra l'uno e l'altro. `waves` salvato →
  «Nessuna immagine». EN «Stones». Typecheck, `npm test` **542/542**, build demo; Chromium headless 390×844 scuro e chiaro: selezione,
  salvataggio e pulsante in alto corretti, nessun errore JS. Committato in `c5d3ee8` e inviato; pubblicato con `17632af` (Rules e Hosting, 22 novembre).

## Avatar «Onde» al posto di «Sorriso» — 22 novembre 2026

- Su richiesta («abbandona l'idea della faccia»): «Sorriso» (`smile`) sostituito da **Onde** (rosa, id `waves`): due onde corte a tratto
  tondo, sfalsate (base sopra a sinistra, accento sotto a destra: uguali e allineate sembravano il segno dell'Acquario). Nessuna faccia nel set. `smile` salvato → «Nessuna immagine». EN «Waves». Typecheck, `npm test` **542/542**, build demo; Chromium headless 390×844 scuro
  e chiaro: selezione, salvataggio e pulsante in alto corretti, nessun errore JS. Committato in `c5d3ee8` e inviato; pubblicato con `17632af` (Rules e Hosting, 22 novembre).

## Avatar «Girandola» e «Sorriso» al posto di «Moduli» e «Prisma» — 22 novembre 2026

- Su richiesta (screenshot dei due avatar, «cerca di creare una faccia in almeno una delle due»): **Sorriso** (rosa, id `smile`) è una faccia
  geometrica, testa tonda in base con occhi a pillola e sorriso ritagliati sullo sfondo, più un pallino d'accento; **Girandola** (blu, id
  `pinwheel`) quattro mezzi dischi che girano attorno al centro, alternati base/accento. Gli id `modules`/`prism` salvati si leggono come
  «Nessuna immagine» (mai pubblicati). Nomi EN Pinwheel/Smile, chiavi vecchie tolte da `en.ts`. Typecheck, `npm test` **542/542**, build
  demo; Chromium headless 390×844 scuro e chiaro: selezione, salvataggio e pulsante in alto corretti, nessun errore JS. Committato in `c5d3ee8` e inviato; pubblicato con `17632af` (Rules e Hosting, 22 novembre).

## Cinque avatar astratti al posto delle icone del profilo — 22 novembre 2026

- **Su richiesta:** le icone di categoria non sono più scelte per l'immagine del profilo (Standard); al loro posto cinque avatar disegnati
  per Nummo in `src/features/settings/profileAvatars.ts` (puro, nessuna dipendenza): **Orbite** (due cerchi in diagonale, lente
  ritagliata; viola), **Goccia** (goccia con un angolo vivo e un satellite; teal), **Arco** (due archi annidati sopra una barra, l'arco del
  logo scomposto; arancio), **Moduli** (2×2: quarto di cerchio, quadrati, cerchio; blu), **Prisma** (rombo diviso in due metà staccate;
  rosa). SVG 100×100 a sfondo pieno, forme entro ~36 dal centro (intere nel cerchio, leggibili a 36 px). Colori **solo** dalla palette
  delle icone (`iconRamp`): chiaro = sfondo tinta, forma base, accento inchiostro; scuro = sfondo inchiostro, forma base, accento tinta.
- **Integrazione:** `ProfileImage` `{ kind: 'avatar', avatar }` in `nummo.profile.v1` (validato; il vecchio `{ kind: 'icon' }` si legge
  come «Nessuna immagine»: funzione mai pubblicata). `ProfileAvatar` disegna l'SVG come `Image` data URI secondo il tema; al cambio la
  nuova immagine entra con dissolvenza e scala 92 % → 100 % (`motion.medium`, solo dopo una scelta, mai al primo disegno; movimento
  ridotto rispettato da `GlobalStyle`); anello di selezione con `fillTransition`. Nomi IT/EN («Avatar {p0}», Orbits/Drop/Arch/Modules/Prism).
- **Test:** `tests/profileImage.test.ts` (cinque avatar con tinte e nomi distinti, SVG ben formato senza script/link, solo i tre colori dei
  ruoli, contrasto base/sfondo ≥ 3 e accento/sfondo ≥ 4,5 in entrambi i temi, salvataggio e rilettura di ciascuno), `tests/i18n.test.ts`
  (nomi tradotti). `npm test` **542/542**, typecheck OK, build demo OK.
- **Browser:** Chromium headless su `dist-demo`, Standard: 390×844 scuro e chiaro e 1280×900 chiaro; i cinque avatar cliccati uno per uno:
  `aria-checked` sul solo scelto, `nummo.profile.v1` aggiornato, pulsante in alto aggiornato; avatar salvato mostrato dopo il
  ricaricamento. Nessun errore JS. Ritoccati dopo la prima prova Goccia (più grande) e Prisma (metà più staccate). **Non provato** su
  Android reale. Committato in `c5d3ee8` e inviato; pubblicato con `17632af` (Rules e Hosting, 22 novembre).

## Immagine del profilo: stesse misure del pulsante, tre icone tolte dalla scelta — 22 novembre 2026

- **Causa** (screenshot dell'utente: icone della scelta diverse da quella in alto a destra): le icone pixel si agganciano a multipli di 12
  (`snapPixelSize`), quindi nel pulsante (cerchio 36) e nella scelta (cerchio 44) la zampa era larga 24 in entrambi: piena nel pulsante,
  piccola e diversa nella scelta; nell'anteprima (64) 36. **Correzione:** `accountAvatarSize` (36) in `ProfileImageCard.tsx`, usata dal
  pulsante (`StandardAvatar` senza prop) e da ogni scelta (bersaglio 48 con l'anello); anteprima a 72, il doppio esatto, con le stesse
  proporzioni in tutti e tre gli stili.
- **Scelte:** su richiesta tolte nota (`music`), torta (`cake`) e fotocamera (`camera`) da `avatarIcons` (ora 9); restano icone di categoria.
  Un valore salvato con una di queste si legge come «Nessuna immagine» (la funzione non è ancora pubblicata). Nuovo test in
  `tests/profileImage.test.ts`. `AGENTS.md`.
- **Verifica:** typecheck OK, `npm test` **541/541** sull'albero condiviso con l'altra sessione (blocco dell'app, non committato). Chromium
  headless su `dist-demo`, Standard, tema scuro, 390×844: stile pixel e minimale, zampa nel pulsante e nella scelta della stessa misura
  (20 px), nove icone in due righe. Nessun errore JS. Non provato sul telefono. Committato in `c5d3ee8` e inviato; pubblicato con `17632af` (Rules e Hosting, 22 novembre).
- **Testo tolto:** su richiesta, niente più «Compare sul pulsante del menu, in alto a destra. Resta solo su questo dispositivo e non entra
  nel backup.» sotto l'anteprima (chiave tolta da `en.ts`); la scheda ha solo anteprima, scelte e «Carica una foto». Typecheck e
  `npm test` **541/541**.

## Blocco dell'app con impronta o viso — 22 novembre 2026

- Su richiesta, con le scelte dell'utente: recupero con Google in Avanzata e «Non riesco a sbloccare» con conferma in Standard; blocco
  all'apertura e al ritorno dopo un tempo scelto (subito, 1, 5, 15 minuti; predefinito 1). WebAuthn con autenticatore di piattaforma, nessuna
  dipendenza nuova; dettagli e limiti in `AGENTS.md` (è uno schermo, non cifratura). File: `domain/appLock.ts`, `services/platformLock.ts`,
  `features/lock/` (`appLockStore.ts`, `AppLock.tsx`: schermata e scheda «Blocco dell’app»), `App.tsx` (schermata, recupero in Avanzata),
  `SettingsPage.tsx` (scheda dopo Funzionalità, reset del solo ritardo), `backStack.ts` (livello `lock`), icona `lock`, `createPortal` in
  `react-dom.d.ts`, Guida («Blocco con impronta o viso») e testi IT/EN.
- **Verifica:** `npm run check` OK (**540/540**, nuovo `tests/appLock.test.ts`). Chromium headless su `dist-demo` servito su `localhost`
  (WebAuthn rifiuta gli IP), autenticatore virtuale CDP, Standard, 390×844 touch: interruttore → credenziale creata (1) e scelta dei
  ritardi; nascosta e tornata subito con 1 minuto → nessun blocco; ricarica → bloccata, `#root` inert, Indietro ed Escape non sbloccano;
  impronta rifiutata → messaggio, accettata → sblocco; «Subito» → bloccata appena nascosta, sblocco automatico al ritorno; «Non riesco a
  sbloccare» → «Disattiva il blocco» → Nuova spesa; riaccensione con la stessa credenziale (sempre 1); spegnimento con impronta rifiutata
  negato, con impronta accettata riuscito. Nessun errore JS. **Non provati:** il recupero in Avanzata («Esci», serve un accesso Google),
  impronta/viso reali sul Pixel 8 nell'app installata e su iPhone (Safari può chiedere un tocco prima della richiesta: c'è «Sblocca»),
  dove appare la passkey «Nummo» nel gestore delle password del telefono. Committato in `a6c2b88`, pubblicato con `17632af` (Rules e Hosting, 22 novembre).

## Tasto «Indietro» che non esce dall'app, immagine del profilo in Standard — 22 novembre 2026

- **Indietro (Android e browser).** Su richiesta: prima l'app non scriveva nulla nella cronologia (solo la guida `#guida`), quindi Indietro
  chiudeva l'app installata o lasciava il sito. Ora pila unica pura `theme/backStack.ts` + `useBackLayer` (`components/BackNavigation.ts`):
  una sola voce di guardia nella cronologia finché qualcosa è aperto (spiegazione e ordine in `AGENTS.md`). Collegati: tutti gli overlay
  tramite `useEscape` (`AppDialog` non `dismissable` rifiuta), lista aperta (`ListsPage`), pagine del menu account e destinazioni
  (`WorkspaceNavigation`: account → sezione di partenza, destinazioni → Nuova spesa), Impostazioni da disconnessi e «Collega il tuo Firebase»
  (`App.tsx`). Da Nuova spesa Indietro esce (scelta dell'utente, niente «premi di nuovo»). `leaveGuide` conserva ora lo stato della voce.
- **Immagine del profilo (solo Standard).** Su richiesta, icone e foto insieme: scheda «Immagine del profilo» in testa alle Impostazioni
  (`ProfileImageCard`): «Nessuna immagine», 12 icone di categoria nello stile d'icona scelto, «Carica una foto»/«Cambia foto» (quadrato
  centrale a 192 px JPEG, `prepareAvatar` in `receipts/image.ts`, nessun ritaglio manuale). Chiave `nummo.profile.v1`, validata
  (`profileImage.ts`: solo data URL immagine base64 ≤ 200 000 caratteri), mai nel backup; mostrata nel pulsante del menu (`avatar` di
  `AccountMenu`); «Ripristina predefiniti» la riporta a nessuna. Testi IT/EN. `AGENTS.md`, README.
- **Verifica:** `npm run check` OK (**533/533**, nuovi `tests/backStack.test.ts` e `tests/profileImage.test.ts`) sull'albero condiviso con
  l'altra sessione. Chromium headless su `dist-demo`, Standard, 390×844 touch, `history.back()` come Indietro: Spese → Analisi → Indietro =
  Nuova spesa (una sola voce di guardia, `history.length` fermo); Liste → dialogo «Nuova lista» → Indietro chiude il dialogo (resta Liste)
  → Indietro = Nuova spesa; menu account → Indietro lo chiude; Impostazioni dal menu → icona «zampa» salvata, foto 640×400 → JPEG
  quadrato nel pulsante account (36 px) e «La tua foto» selezionata; Indietro = Nuova spesa; dopo il ricaricamento foto conservata e
  nessuna guardia rimasta; Indietro da Nuova spesa esce dalla pagina. Nessun errore JS. **Non provati:** WebAPK sul Pixel 8 (il vero tasto
  Indietro di sistema e il gesto), iOS Safari (scorrimento indietro), foto reale dalla galleria del telefono. Committato in `b2f6d1e`, pubblicato con `17632af` (Rules e Hosting, 22 novembre).

## Scansione più ordinata, importo con limite, Categorie su smartphone — 22 novembre 2026

- **Dialogo di scansione, prima della lettura** (screenshot da telefono: «Ingrandisci la foto» staccato, due pulsanti con contorno a metà e
  «Annulla»/«Scansiona» più stretti a destra): «Ingrandisci/Riduci la foto» diventa un'icona 40×40 sull'angolo della foto (nuove icone
  `expand`/`shrink`); «Scatta foto»/«Cambia foto» tonali; le due righe di pulsanti in metà uguali, a 12 di distanza, a ogni dimensione
  (smartphone 148/147, desktop 249/248). La revisione («Controlla i dati») è invariata.
- **Importo:** `amountInputFits` (dominio): il campo ignora il tasto che porterebbe oltre 5 cifre intere o 2 decimali (massimo
  99.999,99 €). Vale per Nuova spesa, modifica, template, revisione dello scontrino e registrazione delle liste (`ExpenseFields`).
- **Selettore della data:** «Annulla» e «OK» larghi entrambi 88 (16 ai lati dell'etichetta).
- **Categorie:** `maxCategoryNameLength` (40, come le Rules) nel dominio; il nome nuovo e quello in modifica si fermano lì (`clipToLength`).
  Su smartphone il nome a tutta larghezza e «Icona»/«Aggiungi» sotto, a metà. Alone del mouse di matita e cestino con angoli da 4 invece
  di 8 (`listRowStyles.iconButton` e `DeleteAction` senza contorno: vale per tutti i cestini senza contorno).
- **Verifica:** `npm run check` OK (**535/535**, due test nuovi). Chromium headless su `dist-demo`, Standard, 390×844 e 1280×900: importo
  «1234567,891» → «12345,89», «12,345» → «12,34», «99999.99» intero; date picker 88/88; dialogo di scansione con una foto caricata
  (OpenAI con chiave finta, nessuna richiesta inviata), icona di ingrandimento funzionante; nome di categoria fermo a 40; schermate
  controllate; alone squadrato visto prima della modifica (raggio 8). Nessun errore JS. Non provato sul telefono. Committato in `ec8c5c3`
  e inviato; pubblicato con `17632af` (Rules e Hosting, 22 novembre).

## Riepilogo del passaggio più breve, «Annulla»/«OK» della data più stretti — 22 novembre 2026

- **Passaggio dei dati** (Avanzata, «Dati della modalità Standard»; screenshot con «Riepilogo del passaggio», «Da questo progetto Firebase
  alla modalità Standard», «Niente da aggiungere: dati già presenti.» e «Aggiungi al dispositivo» disattivato): su richiesta meno parole.
  Con qualcosa da aggiungere: titolo «Da aggiungere al dispositivo» / «Da aggiungere a Firebase», sotto solo l'elenco («5 categorie»),
  «Aggiungi» e «Annulla». Senza niente da aggiungere: una frase, «Il dispositivo ha già tutti i dati di Firebase.» / «Firebase ha già tutti
  i dati del dispositivo.», e «Chiudi», mai un pulsante disattivato. Nuove prop facoltative di `ImportPreview` (`source` facoltativo,
  `emptyText`, `listOnly`); il ripristino da file è invariato. Chiavi vecchie tolte da `en.ts`, nuove aggiunte. `AGENTS.md`.
- **Selettore della data:** `small` di `CancelButton`/`ConfirmButton` con 16 ai lati dell'etichetta (prima 24) e minimo 72 (prima 88):
  «Annulla» 81×40, «OK» 72×40 (prima circa 104 e 88).
- **Verifica:** `npm run check` OK (**521/521**). Chromium headless su un export demo dedicato con emulatori miei (39099/39280, config
  temporanea `.nummo-preview-check.json`, rimossa, emulatori fermati; runner hybrid 36786 non toccato), accesso come proprietario demo
  dall'emulatore: «Da Firebase al dispositivo» → «Da aggiungere al dispositivo / 5 categorie», «Aggiungi», di nuovo → frase e «Chiudi»;
  «Dal dispositivo a Firebase» → «Firebase ha già tutti i dati del dispositivo.»; 390×844 uguale; date picker 1280×900 e 390×844 con le
  misure sopra. Nessun errore JS. L'export conteneva anche le modifiche non committate di un'altra sessione (vedi sotto).
- **Albero condiviso:** durante questa fase un'altra sessione ha modifiche non committate (immagine del profilo, navigazione Indietro:
  `App.tsx`, `AccountMenu.tsx`, `AppDialog.tsx`, `Overlay.tsx`, `ListsPage.tsx`, `image.ts`, `SignIn.tsx`, file nuovi in `settings/`,
  `BackNavigation.ts`, `backStack.ts`, test), anche in file toccati qui (`SettingsPage.tsx`, `Workspace.tsx`, forse `en.ts`). Nel commit
  separare per parti. Committato in `c862fa9` (separato per parti), pubblicato con `17632af` (Rules e Hosting, 22 novembre).

## Vibrazione al cambio Spese/Abbonamenti — 22 novembre 2026

- Su richiesta (screenshot del selettore «Spese | Abbonamenti»): `tap` quando la vista cambia, nessuna vibrazione sul segmento già
  selezionato. Nuova prop `haptic` di `SegmentedButtons`, spenta di base e accesa solo in `Workspace.tsx` per la «Vista della pagina
  Spese»: gli altri selettori a segmenti (Ricorrenza, Da quando, tipo di movimento, Notifiche) restano senza, come deciso il 21 novembre.
  `AGENTS.md`, README, commento di `preferences.ts`.
- **Verifica:** `npm run check` OK (**521/521**). Chromium headless su `dist-demo`, 390×844 con touch emulato: Spese → Abbonamenti `[5]`,
  → Spese `[5]`, di nuovo Spese `[]`; «Ricorrenza» in Nuova spesa → Annuale `[]`. Nessun errore JS. Non sentito sul telefono.
  Committato in `8dd92df`, pubblicato con `17632af` (Rules e Hosting, 22 novembre).

## Separatore delle schede in evidenza, menu «immagine» al tocco prolungato, vibrazione 5/4 solo touch — 22 novembre 2026

- **Separatore.** Su richiesta (screenshot del «Totale» di Spese, «1673,77 € · 66 spese»): prima un «–» con 8 di margine, poi, perché
  il trattino non piaceva, una **linea verticale sottile** (1×20, `onPrimaryContainer` al 40 %, `aria-hidden`) con 12 per lato tra
  importo e conteggio, testo sulla stessa linea di base, a capo solo in una scheda strettissima (`figures`/`figureDivider`). Nel «Totale»
  di Spese (`ExpenseList.tsx`) e in «Prossimo mese» degli abbonamenti (`UpcomingRenewals.tsx`), le sole due schede con questo schema;
  etichette accessibili invariate, gli altri «·» dell'app invariati.
- **Menu «svg>.bin» al tocco prolungato** (screenshot da Pixel 8 in Fondi: «Copia/Scarica/Condividi immagine»): ogni icona è un `Image`
  di react-native-web, cioè un `<img>` trasparente sopra lo sfondo, e Chrome Android apre il menu delle immagini. In `GlobalStyle`, solo su
  touch (`(hover: none) and (pointer: coarse)`): `img { pointer-events: none; -webkit-user-drag: none; }`; il tocco va al contenitore e
  quindi al pulsante che lo racchiude. Vale anche per la foto dello scontrino (il riquadro «Ingrandisci la foto» resta il bersaglio).
- **Vibrazione.** Causa del silenzio sul Pixel 8 trovata dall'utente: **Non disturbare** attivo; tutte le prove «senza vibrazione» del
  21 novembre (6/4, 4/3, 6/5, 8/7) erano in quello stato, quindi non c'è un limite del motore accertato. Su richiesta più morbida:
  `tap` 8 → **5** ms, `tick` 7 → **4** ms. Su richiesta **mai su desktop**: `hasHaptics` (Vibration API e `(pointer: coarse)`, letto una
  volta all'avvio) spegne il cancello e nasconde l'interruttore «Vibrazione» nelle Impostazioni. Riga sotto l'interruttore: «… non vibra con
  il telefono in silenzioso o in Non disturbare.» (IT/EN). Pagina di prova con 5/4 come attuali. `AGENTS.md`, README.
- **Verifica:** `npm run check` OK (**521/521**, nuovo test «mai su desktop»). Chromium headless su `dist-demo`, Standard, tema scuro, backup
  `nummo-utente-medio.json` importato dall'interfaccia: 1280×900 «6540,09 € | 187 spese» e «800,88 € | 4 rinnovi», `pointer: coarse`
  falso, nessun «Vibrazione» nelle Impostazioni, nessuna chiamata a `vibrate`; 390×844 con touch emulato: stesse schede, `pointer: coarse`
  vero, tocco sull'icona di «Fondi» nella barra → `elementFromPoint` dà il contenitore (non l'`<img>`), pagina Fondi aperta, **una**
  vibrazione `[5]`; pressione prolungata sull'icona del fondo senza `contextmenu` su un'immagine; interruttore e nuovo testo presenti.
  Nessun errore JS. **Non provati:** menu di Chrome sul telefono reale, percezione di 5/4 ms sul Pixel 8 (da sentire senza Non disturbare;
  se troppo debole, 6/5). Committato in `8bf4f4d`, inviato e pubblicato su Hosting (vedi «Produzione»).

## Matita dei template più grande — 21 novembre 2026 (notte)

- Su richiesta (screenshot di una riga della pagina Templates): la matita decorativa a destra di ogni template passa da 24 a 28 dp,
  sempre nel riquadro 44×44 con contorno (`TemplatesPage.tsx`, `AGENTS.md`).
- **Verifica:** `npm run check` OK (**520/520**). Non provato nel browser. Committato in `314064b`, inviato e pubblicato su Hosting (vedi «Produzione»).

## Nessun campo «Chiave API» nel dialogo di scansione — 21 novembre 2026 (notte)

- Su richiesta (screenshot di «Scansiona scontrino» con il campo «Chiave API» sopra «Scatta una foto»): il campo è tolto da
  `ScanReceiptDialog`; la chiave si scrive solo nella scheda «Analisi scontrini con AI» delle Impostazioni. Senza chiave salvata il dialogo
  lo dice come per servizio o modello mancanti, «Inserisci la chiave API nelle Impostazioni.» (IT/EN), e «Scansiona» resta disattivato.
  `aiSetupProblem` (dominio) invariato: il controllo della chiave è nel dialogo. `AGENTS.md` (riga `src/features/receipts/`).
- **Verifica:** `npm run check` OK (**520/520**). Chromium headless su un export demo in Standard, scansione accesa (OpenAI, modello
  salvato), rete esterna bloccata, immagine caricata dal file: 1280×900 e 390×844, senza chiave (messaggio nel passo iniziale e dopo la
  foto, «Scansiona» disattivato) e con una chiave finta salvata (nessun messaggio, «Scansiona» attivo); nessun campo di testo nel dialogo,
  nessuna richiesta esterna, nessun errore JS. Scansione reale non provata. Committato in `e008fcd`, inviato e pubblicato su Hosting.

## Vibrazione: Chrome Android tace con il telefono in silenzioso — 21 novembre 2026 (notte)

- Su richiesta («nessuna vibrazione, si sente solo se tengo premuto»). Anche a 8/7 ms (online da `1934641`) nessuna vibrazione dell'app
  sul Pixel 8; la pressione prolungata vibra. **Causa trovata nel sorgente di Chrome** (`services/device/vibration/android/.../
  VibrationManagerAndroid.java`, letto da GitHub): `vibrate` chiama il motore solo se `getRingerMode() != RINGER_MODE_SILENT`; altrimenti
  non fa nulla, mentre `navigator.vibrate()` nella pagina risponde comunque `true`. La pressione prolungata è un feedback di sistema di
  Android, che il silenzioso non blocca. Nello screenshot del desktop (KDE Connect) il Pixel 8 risultava con l'audio disattivato.
  Nessuna soluzione possibile dalla pagina. Riga sotto l'interruttore «Vibrazione»: «… Su Android non vibra con il telefono in
  silenzioso.» (IT/EN), commento in `haptics.ts`, `AGENTS.md`. Durate 8/7 invariate.
- **Da confermare sul telefono:** suoneria non in silenzioso → la barra vibra? Se no: risparmio energetico, «Vibrazione contenuti
  multimediali» (Android usa quell'intensità per le vibrazioni senza attributi come queste: dalla documentazione, non verificato); se vibra
  ma non si sente sui tocchi veloci, alzare `tap` a 10 (ultima durata percepita). Pagina di prova (artifact) con controlli 100/300 ms.
- **Verifica:** `npm run check` OK (**520/520**). Committato in `e008fcd`, inviato e pubblicato su Hosting.

## Dettagli di una categoria in Analisi più chiari — 21 novembre 2026 (notte)

- Su richiesta (screenshot di «Servizi digitali», «informazioni confusionarie»): ogni riga ripeteva icona e nome della categoria già nel
  titolo, e mancava il totale. Ora, se le transazioni sono di **una** categoria: in testa «3 transazioni · **Totale: 149,76 €**»; righe
  senza icona (`iconless`, nuova prop di `ListRow`) né categoria, con descrizione, sotto data e fondo (avatar e nome) sulla stessa riga,
  importo a destra anche su smartphone (prima tra descrizione e data). «Altre» (più categorie) invariato: icona e categoria per riga.
  Chiave «Totale: {p0}» già tradotta.
- **Verifica:** `npm run check` OK. Chromium headless su `dist-demo`, Standard, backup `nummo-utente-medio.json` importato dall'interfaccia,
  Analisi → «Medio · Alimentari» → «Mostra transazioni»: 390×844 e 1280×900 come previsto, nessun errore JS. Non provato in inglese nel
  browser né su telefono. Committato in `1934641`, inviato e pubblicato su Hosting.

## Vibrazione 8/7 ms — 21 novembre 2026 (notte)

- Su richiesta («la vibrazione da smartphone non sta funzionando»). **Analisi:** codice invariato da `1518b0c`; in Chromium headless
  (`dist-demo`, Standard, 412×915 touch, `navigator.vibrate` osservato ma inoltrato al browser) ogni tocco sulla barra chiede 6 ms e il
  trascinamento Spese→Liste 5+5+5 e 6 al rilascio, **tutti accettati** (`true`), attivazione utente presente, nessun errore. L'app quindi
  chiede la vibrazione; sul Pixel 8 non arriva. Storico: 10/6 percepiti (troppo forti), 6/4 non sentiti, 4/3 nulla, ora 6/5 nulla: sotto
  circa un ciclo del motore (~7 ms) l'impulso singolo non si sente. **Correzione:** `hapticPatterns` → `tap` 8, `tick` 7 (più corti di 10,
  mai sotto 7). Pagina di prova con 7/8 come attuali e tick fino a 10. Ricontrollato in Chromium: 8 e 7+7+7+8, accettati.
- **Se resta muto anche così**, la causa è del telefono: Chrome su Android non vibra con la suoneria in **silenzioso**, Android scarta
  queste vibrazioni con il **risparmio energetico** e le regola con «Vibrazione contenuti multimediali» (Suoni e vibrazione → Vibrazione e
  feedback aptico). Da provare con `docs/testing/prova-vibrazione.html` (7, 8, 10 ms). Supposizioni dalla documentazione, non verificate sul telefono.
- **Verifica:** `npm run check` OK (**520/520**). Non provato sul telefono. Committato in `1934641`, inviato e pubblicato su Hosting.

## Barre di scorrimento senza triangoli — 21 novembre 2026 (notte)

- Su richiesta (screenshot del menu Categoria su desktop: triangoli sopra e sotto la barra): erano i pulsanti a freccia della barra
  standard di Chromium (`scrollbar-width: thin`/`scrollbar-color`, su Linux e Windows). In `GlobalStyle`, dove esiste
  `::-webkit-scrollbar` e il puntatore non è touch (`not (pointer: coarse)`), si usa per ogni elemento la barra WebKit come nel pannello
  desktop: 10 px, cursore `outline` arrotondato, traccia trasparente, `::-webkit-scrollbar-button` nascosto; nei dialoghi il cursore resta
  trasparente finché non si scorre (`data-scrolling`). Touch e Firefox invariati. `(pointer: fine)` scartato: Chromium headless dichiara
  `pointer: none`.
- **Verifica:** `npm run check` OK (**520/520**). Chromium headless su un export demo in Standard, tema scuro: 1280×460 menu Categoria
  aperto, barre del menu e del pannello con `scrollbar-width: auto`, larghe 10, cursore arrotondato senza triangoli (screenshot);
  390×844 touch: regola non applicata. Nessun errore JS. Non provati: Chrome desktop reale, Windows, Safari macOS (lì la barra diventa
  sempre visibile invece che sovrapposta, come già nel pannello), barra nei dialoghi mentre si scorre. Committato in `1934641`, inviato e pubblicato su Hosting.

## «Esci» riporta alla scelta della modalità — 21 novembre 2026 (notte)

- Su richiesta (screenshot di «Semplifica le tue spese.»): «Esci» dal menu account, da «Questo Nummo è privato» e da «Ultimo passaggio»
  non lascia più sulla schermata di accesso Google ma sulla prima schermata (Standard / Avanzata). `useSession().signOut(afterward)`
  esegue `afterward` solo a uscita riuscita, prima dell'eventuale ricaricamento (cache su disco); `AdvancedRoot` passa
  `onChangeMode(null)`, che cancella `nummo.storageMode.v1`. Uscita fallita (scritture in attesa): modalità invariata, errore come prima.
  «Usa la modalità Standard» invariato. Configurazione Firebase collegata e dati non toccati: «Continua con Firebase» riporta allo stesso progetto.
- **Correzione prima del commit:** l'indizio di sessione (`nummo.session.hint.v1`) si cancella subito dopo l'uscita riuscita, prima di
  `afterward`, anche senza cache su disco: smontando `AdvancedRoot` prima che vedesse «signed-out», l'indizio restava e, senza modalità
  salvata, `initialStorageMode` avrebbe riaperto l'Avanzata al caricamento successivo (sviluppo/hybrid; in produzione la pagina si ricarica
  e l'indizio era già cancellato).
- **Verifica:** `npm run check` OK (**520/520**). Committato in `cffe2e8` e pubblicato su Hosting (vedi «Produzione»).
- **Provato nel browser con la demo (21 novembre, dopo la pubblicazione):** Chromium headless, export demo dedicati (cache in memoria e
  cache su disco) con emulatori miei su 39099/39280 (config temporanea `.nummo-esci-check.json`, rimossa; il runner hybrid 36786 non
  toccato), accesso dal popup dell'emulatore, script scritto per l'occasione (non nel repository). Sei scenari, tutti OK: proprietario
  dal menu account (cache in memoria e su disco, 390×844 e 1280×900 con cache su disco), «Questo Nummo è privato» con l'account
  estraneo (memoria e disco), «Ultimo passaggio» con un progetto `demo-guida` collegato (memoria e disco). In ognuno: dopo «Esci» la
  scelta della modalità, `nummo.storageMode.v1` e `nummo.session.hint.v1` cancellati, ancora la scelta dopo il ricaricamento,
  «Continua con Firebase» porta all'accesso (nessun accesso automatico), progetto collegato conservato, nessun errore JS. Controprova
  con l'ordine precedente alla correzione (export a parte, codice ripristinato): con la cache in memoria l'indizio restava («local») e
  dopo il ricaricamento si riapriva l'accesso dell'Avanzata invece della scelta. Non provato con un accesso Google reale né sul telefono.

## «Dati della modalità Standard» più chiara, nota del backup con asterisco — 21 novembre 2026 (notte)

- Su richiesta (screenshot della scheda, «non mi risulta chiara»): in `ModeTransfer` riepilogo breve «Sul dispositivo: 72 spese,
  13 categorie.» (o «Nessun dato sul dispositivo.»), pulsanti con la direzione esplicita «Dal dispositivo a Firebase» e «Da Firebase
  al dispositivo» (prima «Porta qui i dati della Standard» / «Copia questi dati sul dispositivo»; conferma dell'anteprima «Aggiungi a
  Firebase» / «Aggiungi al dispositivo», prima «Porta qui i dati» / «Copia sul dispositivo»), nota più corta **sotto** i pulsanti
  «* Si aggiunge solo ciò che manca: nulla viene sovrascritto o eliminato.». Sotto «Backup completo» la nota diventa «* Salva il file su
  Google Drive…» con 8 in più di distanza dai pulsanti (`footnote`). Riferimenti aggiornati nel dialogo «Cambia modalità», `en.ts`,
  `tests/i18n.test.ts`, README, `docs/firebase-personale.md`, `AGENTS.md`.
- **Test instabile (preesistente), corretto:** `tests/localStore.test.ts` («passaggio tra modalità…») falliva a volte (la spesa `kept`
  vista come conflitto «Già nel destinatario»): due `createExpense` separati davano a `kept` due `created_at` diversi se fra le due
  chiamate scattava un millisecondo, e `sameExpense` confronta anche `created_at`. Difetto del test, non dell'app: ora `kept` entra nel
  destinatario con `importRecords` dal record della sorgente. 15 esecuzioni di fila OK.
- **Riallineamento documentale (stessa sessione, su richiesta):** «Problemi aperti» e «Prossime attività» (service worker con pagina
  offline), priorità (0) con 6/5 ms, riga «Git» fino a `8c1ff66`, pubblicazione fino a `8c1ff66`, «Verifiche», «Funzionalità
  implementate» (spese offline, pagina offline, passaggio tra le modalità, vibrazione), sezione «Template accanto a Scansiona scontrino»
  segnata come superata, runner hybrid 36786 attivo; in `docs/architecture.md` la tabella «Piattaforme».
- **Verifica:** `npm run check` OK (**520/520**). Non provato nel browser. Committato in `69566dc`, inviato e pubblicato su Hosting
  (worktree pulito, senza le modifiche non committate di un'altra sessione).

## «Annulla» e «OK» più piccoli nel selettore della data — 21 novembre 2026 (notte)

- Su richiesta (screenshot del dialogo «Seleziona data»): `CancelButton`/`ConfirmButton` hanno la variante `small` (larghi almeno 88,
  alti 40, l'altezza dei pulsanti Material 3), usata solo in `DateField`; gli altri dialoghi restano a 112×48.
- **Verifica:** `npm run check` OK (**520/520**). Non provato nel browser né sul telefono. Committato in `01c2b7f` e pubblicato su Hosting.

## Gemini: consigliato `gemini-3.5-flash-lite` — 21 novembre 2026 (notte)

- Su richiesta: in `recommendedModels` Gemini propone prima `gemini-3.5-flash-lite` (poi `gemini-3.1-flash-lite`, `gemini-2.5-flash`).
  «(consigliato)» si sposta su quel modello; la preselezione avviene solo a campo Modello vuoto, quindi un modello già salvato resta finché
  l'utente non lo cambia. Se il servizio non elenca `gemini-3.5-flash-lite`, vale il consigliato successivo. Test aggiornati.
- **Verifica:** `npm run check` OK (**520/520**). Non provato con una chiave Gemini reale. Committato, inviato e pubblicato su Hosting (`dabe2eb`).

## «Ripristina predefiniti» riporta tutto ai valori predefiniti — 21 novembre 2026 (notte)

- Su richiesta: il pulsante delle Impostazioni riportava ai valori predefiniti solo `nummo.preferences.v1`; la scansione dello scontrino
  restava attiva. Ora riporta anche la scheda AI (`resetReceiptAi` in `aiSettings.ts`: spenta, nessun servizio, modello o consenso) e,
  con un archivio aperto, «Categorie preferite» e «Fondo preferito» (`onResetArchive`, terzo argomento di `renderSettings`). Le chiavi
  API salvate restano (sono credenziali, non impostazioni: si cancellano solo con «Dimentica la chiave»).
- **Verifica:** `npm run check` OK (**520/520**). Non provato nel browser né sul telefono. Committato, inviato e pubblicato su Hosting (`dabe2eb`).

## Nuovo testo della guida «Collega il tuo Firebase» — 21 novembre 2026 (notte)

- Su richiesta, dalla bozza approvata: `FirebaseConnect` con «Prima di iniziare» (account Google e 10 minuti, piano Spark senza carta,
  spese Standard da portare dopo il collegamento, due schede aperte, «Apri la Console Firebase»), sei passaggi con titolo, istruzioni e
  «Perché serve» (progetto; app web e configurazione, con il campo incollato **qui** invece che in fondo; accesso Google; dominio da
  autorizzare con il perché di `nummo-6b6e2.web.app`; database in Europa in produzione; regole), poi «Collega». «Ultimo passaggio» spiega
  perché Nummo non può nominare il proprietario e dà `config`, `owner` (da scrivere a mano, non «ID automatico»), `uid` (string) e UID,
  ciascuno con «Copia», più gli errori frequenti. Nomi della Console in italiano con l'inglese tra parentesi; in inglese solo i nomi inglesi.
  Etichette italiane della Console **non verificate** su una Console reale. Traduzioni vecchie rimosse da `en.ts`.
- `docs/firebase-personale.md` diviso: Parte 1 per chi usa l'app (gli stessi passaggi in prosa, con il perché del dominio), Parte 2 per
  chi installa Nummo. `AGENTS.md` (riga `src/features/session/`).
- **Verifica:** typecheck e `npm test` OK (**520/520**). Chromium headless su un export demo dedicato con emulatori miei su porte 39099/39280
  (config temporanea `.nummo-guide-check.json` senza `singleProjectMode`, rimossa; porte 8180/4000 occupate da emulatori non miei, non toccati):
  390×844 IT dalla schermata di accesso a «Collega il tuo Firebase», incollato un progetto `demo-guida`, «Collega», accesso Google
  dall'emulatore → «Ultimo passaggio» con i quattro valori; 1280×900 EN. Nessun errore JS.

## Spese offline, pagina offline, passaggio dei dati tra le modalità — 21 novembre 2026 (notte)

- **Prima della fase:** analisi su richiesta della guida a Firebase (bozza del nuovo testo, link diretti, sito senza progetto di base,
  link «Collega un altro dispositivo»: concordati, **non implementati**) e dell'unione delle due modalità (scartata: decisione in
  `docs/architecture.md`). Riallineamento documentale, lock hybrid 81456 messo da parte, `3ad9a75` pubblicato su Hosting e inviato.
- **Spese offline (livello 1).** In Avanzata, senza rete, il modulo restava su «In attesa di conferma…» dopo la prima spesa. Ora lo stato
  `queued` (`domain/submission.ts`) lo libera quando la spesa è già nella copia del dispositivo: subito offline, dopo 2 s con rete debole.
  Messaggio «Sei offline: la spesa è sul dispositivo e verrà inviata quando torni online.», etichetta tonale «In attesa di invio» (icona sync)
  nella riga di Spese e nell'etichetta accessibile. Standard invariata. Solo le spese singole mostrano l'etichetta: una serie creata offline
  in Abbonamenti non la mostra (non richiesto).
- **Pagina offline.** La schermata «Sei offline» dello screenshot era la pagina di Chrome. Ora `public/offline.html` con lo stile dell'app
  (marchio come nell'intestazione, nuvola barrata, titolo, testo, «Riprova» pieno a pillola), colori del tema scelto, IT/EN, carattere scelto;
  si riapre da sola all'evento `online`. `sw.js` la serve solo alle navigazioni fallite e si registra per tutti all'avvio. Va vista sul
  telefono **dopo** un'apertura con rete della nuova versione (il worker si installa allora).
- **Passaggio dei dati.** In Avanzata, «Archiviazione e backup» → scheda «Dati della modalità Standard»: «Porta qui i dati della Standard» e
  «Copia questi dati sul dispositivo» (poi «Passa alla modalità Standard»), con lo stesso riepilogo del ripristino (`ImportPreview`, estratto
  da `BackupActions`) e solo unione; categorie con lo stesso nome allineate. Dialogo «Cambia modalità» con le indicazioni e il consiglio del
  backup su Google Drive; riga «Salva il file su Google Drive o in un altro posto sicuro…» sotto «Backup completo». Guida e README aggiornati.
- **Verifica.** `npm run check` OK (**520/520**, build demo); `test:emulator` **22/22**. Chromium headless su `dist-demo` con emulatori demo
  (porte standard, fermati a fine prova): (1) Avanzata 390×844, server irraggiungibile: due spese di fila, modulo libero in ~200 ms, due
  etichette, al ritorno della rete etichette sparite e due documenti sul server; (2) pagina offline a 390×844 (ambra scuro, IT) e 1280×800
  (menta chiaro, EN): colori e font corretti, ritorno all'app al ritorno della rete; (3) 2 spese in Standard → Avanzata con 2 spese e le
  predefinite: «Porta qui» aggiunge 2 spese e nessuna categoria, «Copia sul dispositivo» 2 spese, poi Standard con 4 spese e 5 categorie;
  Firestore con 4 spese e 5 categorie. Nessun errore JS. **Non provati:** telefono reale (Android/iOS), Firefox/Safari, rete debole reale.
- **File di questa sessione:** `public/sw.js`, `public/offline.html`, `index.ts`, `App.tsx`, `src/domain/submission.ts`, `src/domain/backup.ts`,
  `src/features/expenses/{useRemoteExpenses.ts,expenseStore.ts,ExpenseForm.tsx}`, `src/features/history/ExpenseList.tsx`,
  `src/features/workspace/Workspace.tsx`, `src/features/backup/BackupActions.tsx`, `src/features/storage/{ModeTransfer.tsx,StorageSection.tsx}`,
  `src/features/session/Guide.tsx`, `src/services/pushNotifications.ts`, `src/theme/bootTheme.ts`, `src/i18n/en.ts`, test (`submission`,
  `serviceWorker`, `startup`, `backup`, `localStore`, `i18n`), `README.md`, `docs/architecture.md` (sezione in fondo), parti di `AGENTS.md` e
  di questo file. La sessione sulla vibrazione ha committato a parte i suoi (`1518b0c`).

## Vibrazione 6/5 ms, barra che spariva, scansione spenta di base — 21 novembre 2026 (notte)

- Verifica iniziale: `main` = `origin/main`, albero pulito, `npm run check` OK (**509/509**) su `c745f2b`; documenti e codice coincidenti.
- **Vibrazione assente** sul Pixel 8 dopo `1c7ca7f`: il codice chiede l'impulso (provato nel browser emulato), ma 4/3 ms sono troppo
  brevi perché il motore parta. `hapticPatterns` → `tap` 6 ms (ultima durata percepita), `tick` 5 ms; pagina di prova con 5/6 come
  attuali e scelte del tick 3–8. Da sentire sul telefono.
- **Barra inferiore che a volte spariva:** in `observeVirtualKeyboard` lo stato «tastiera in chiusura» durava finché il viewport non
  tornava al 95 % dell'altezza più alta vista alla stessa larghezza. Se quel riferimento era stato misurato con la barra degli indirizzi
  nascosta (915 → 859 a 412 di larghezza: sotto il 95 %) o durante un cambio d'app Android, la chiusura non finiva mai e la barra
  restava nascosta. Ora: chiusura al massimo `keyboardClosingLimit` (1 s), poi la barra torna e l'altezza attuale diventa il nuovo
  riferimento; ridimensionamenti con la pagina in background ignorati. Test nuovo in `tests/viewport.test.ts`.
- **Scansione dello scontrino:** `parseAiSettings` la dava accesa a chi aveva scelto un servizio prima che esistesse l'interruttore;
  ora è accesa solo con `enabled: true` salvato (chi la vuole la riaccende in Impostazioni). Test aggiornato.
- **Verifica:** `npm run check` OK (**511/511**). Non provato nel browser né sul telefono. Committato in `1518b0c`, inviato e pubblicato su Hosting (con `1c83b54`).
- **Pulsante «Template» (stessa sessione, su richiesta):** non cambia più dopo la scelta (sempre icona «template» ed etichetta
  «Template»); «Nessun template» svuota tutto il modulo di Nuova spesa (bozza, errori, campi rimontati come dopo un salvataggio),
  anche se i dati erano stati scritti a mano. Committato in `1518b0c`, inviato e pubblicato su Hosting (con `1c83b54`).
- **Pagina Templates con l'interruttore spento (stessa sessione, su richiesta):** «Nuovo template» e «I tuoi template» non spariscono
  più: restano visibili in grigio (opacità 0,38 come la scheda AI) e non raggiungibili (`inert`, campi e «Crea» disabilitati). Testo
  dell'interruttore «…il pulsante Template» invece di «…il campo Template» (IT/EN). Committato in `1518b0c`, inviato e pubblicato su Hosting (con `1c83b54`).

## «Template» accanto a «Scansiona scontrino» — 21 novembre 2026

- Su richiesta (screenshot da iPhone: con i template attivi «Salva» finiva sotto la navigazione): il campo «Template» sopra «Ricorrente»
  diventa il pulsante `TemplatePicker` (`features/templates/`) nella prima riga di Nuova spesa, accanto a «Scansiona scontrino» o al suo
  posto se la scansione è spenta. Su smartphone metà riga ciascuno, allineati a Importo e Data; da medium larghezza naturale, distanza 12.
  Aspetto: contorno, icona «template», etichetta «Template» e freccia in `primary` (provato prima `tertiaryContainer`: nel tema
  predefinito mono è il grigio delle superfici e sembrava disattivato). Scelto un template il pulsante mostra solo l'icona della sua
  categoria (icona «template» se la categoria non c'è più) e la freccia (**superato da `1518b0c`**: il pulsante non cambia più dopo la
  scelta); il nome resta nell'etichetta accessibile («Template: …») e
  nell'elenco. `SelectField` accetta `trigger`/`triggerStyle`/`menuMinWidth` (stesso foglio e menu; menu largo almeno 360 perché le
  descrizioni non siano troncate). La riga «Il pulsante Template compare quando…» (prima «Il campo…», corretta nella sessione del 21 novembre, notte) (template attivi ma nessuno salvato) sta sotto la prima riga.
- **Verifica:** `npm run check` OK (**509/509**). Chromium headless, `dist-demo` in Standard, tema scuro, backup v11 di prova con due
  template importato dall'interfaccia: 390×844 con e senza scansione, 360×780, 1280×900 con e senza scansione; aperto il foglio/menu,
  scelto un template. Smartphone: pulsanti a metà riga (12–189 e 201–378 a 390), «Salva» sopra la navigazione (fondo 676–696 contro
  768 a 390, 676–696 contro 704 a 360); dopo la scelta solo l'icona del carrello, campi compilati; desktop: menu con i nomi interi;
  nessuno scorrimento orizzontale, nessun errore JS. Non provato su iPhone reale. Committato in `ee2fcdc` e pubblicato su
  Hosting (21 novembre, sera): «Deploy complete!», sito 200, bundle online identico a `dist/` (SHA-256). Rules invariate.

## Vibrazione provata nel browser emulato — 21 novembre 2026

- Su richiesta, prova scritta per l'occasione (non nel repository): Chromium headless 390×844 con tocchi emulati, `dist-demo` in Standard
  con `nummo-utente-medio.json` importato dall'interfaccia (unione), rete esterna bloccata, ogni `navigator.vibrate` registrato. Codice di
  `62e3639`. Esiti (durate in ms):
  - destinazioni Spese/Analisi/Fondi/Liste [4] ciascuna, anche quella già aperta; pulsante tondo «Nuova spesa» [4];
  - trascinamento lento sulla barra Spese → Liste: [3,3,3] e [4] al rilascio; dito che oscilla ±3 px sul confine Spese|Analisi 20 volte:
    un [3] all'attraversamento e uno al ritorno, nulla durante le oscillazioni; trascinamento veloce (≈100 ms): [3,3,3] a 82 e 67 ms, il
    [4] del rilascio scartato dal cancello di 60 ms (come previsto);
  - segmenti di Spese (anche quello già scelto), scorrimento della pagina, righe della legenda, scrittura nell'Importo: nessuna;
  - spicchio della ciambella [3] alla selezione e alla deselezione; blocco del grafico a blocchi [3]; «Salva» e «Crea» [4];
  - «Vibrazione» spenta (destinazioni, «Nuova spesa», «Salva»): nessuna. Tutte le vibrazioni accettate dal browser, nessun errore JS.
- Dice solo che l'app chiede l'impulso giusto al momento giusto: la percezione di 3–4 ms sul Pixel 8 resta da provare a mano
  (`docs/testing/prova-vibrazione.html`); iOS e Firefox non hanno la Vibration API. Nessun codice toccato.

## Tastiera virtuale provata nel browser emulato, margine sotto il campo — 21 novembre 2026

- Su richiesta, `scripts/check-keyboard.mjs` sulla demo (Standard, rete esterna bloccata, tastiera simulata riducendo il viewport) con
  `6f95a08`: 390×844 campo alto, basso e dialogo Nuova lista; apertura in 4 passi; cambio di campo a tastiera aperta; CPU ×4 per due cicli;
  360×640 con tastiera di 300 in 3 passi, anche nel dialogo. In ogni caso `#root` = viewport a ogni fotogramma, apertura e chiusura in un
  fotogramma, barra invisibile ma con il suo spazio dal tocco alla conferma, campo sempre in vista, nessun errore JS. Con CPU ×4 otto task
  lunghi (54–101 ms) attorno a tocco e chiusura, senza fotogrammi intermedi; senza rallentamento nessuno.
- **Corretto:** a 360×640 con tastiera di 300 il campo riportato in vista finiva a filo della tastiera (292..340 su 340), coprendo ciò che
  sta sotto (contatore della Descrizione). Ora `AppShell` dà al campo attivo `scroll-margin-bottom` di 24 (`keyboardFieldMargin` =
  `spacing.xl`) solo durante `scrollIntoView` e poi lo ripristina: campo a 268..316, stesso fotogramma; Tab da tastiera fisica e altri
  scorrimenti invariati. Dove il campo era già lontano dalla tastiera (390×844) nessuno scorrimento in più.
- Osservato nella prova, non dipendente dalla tastiera: alla prima apertura di un archivio vuoto il messaggio «Categorie predefinite
  aggiunte» sta sopra la tastiera e copre il campo per qualche secondo.
- **Verifica:** `npm run check` OK (**509/509**); prove ripetute (360×640 con e senza passi, 390×844 basso/passi/cambio, dialogo a 360×640):
  stessi esiti più il margine. Animazione reale della tastiera e iOS non riprodotti: confermare su telefono. Committato in `62e3639` e
  pubblicato su Hosting (21 novembre, sera): «Deploy complete!», sito 200, bundle online identico a `dist/` (SHA-256). Rules invariate.

## Revisione dello scontrino provata nel browser, «Usa i dati» su smartphone stretti — 21 novembre 2026

- Su richiesta, prima prova nel browser della revisione («Controlla i dati») di `830ac24`/`2b9e763`/`3b74ea4`: Chromium headless su
  `dist-demo`, Standard, impostazioni AI di prova e risposta del servizio simulata nella pagina (nessuna chiamata reale), a 360, 375, 384,
  390, 412, 599, 640, 760, 900, 1024 e 1400 px. Conforme: pulsanti allineati ai campi (scarto ≤ 1 px), «Annulla»/«Usa questi dati» uguali
  su smartphone, impilati con colonna < 500 (640–900), su una riga da 1024; foto fino al fondo della Categoria, 73 px tra Categoria e
  pulsanti, nessuno scorrimento su desktop né orizzontale, nessun errore JS.
- **Difetto trovato e corretto:** sotto 390 px «Usa questi dati» era troncato («Usa questi …» a 360, «Usa questi d…» a 375–384). Ora su
  smartphone sotto 390 (`shortUseLabelBelow`) l'etichetta è «Usa i dati» (EN «Use data»), nome completo in `accessibilityLabel`, come
  «Scansiona» in Nuova spesa. Inoltre «Ingrandisci la foto», con i pulsanti impilati, stava a metà fra le due righe: ora è sulla riga del
  primo pulsante (`sideActions` in alto; su una riga sola invariato).
- **Verifica:** `npm run check` OK (**509/509**); ripetuta la prova a 360, 384, 390, 760, 1400: «Usa i dati» intero a 360/384, «Usa
  questi dati» da 390, «Ingrandisci la foto» allineato al primo pulsante, nessun errore JS. Committato in `6f95a08` e pubblicato su Hosting (21 novembre): «Deploy complete!», sito 200,
  bundle online identico a `dist/` (SHA-256), con «Usa i dati». Rules invariate.

## Revisione dello scontrino su desktop: foto alta come il modulo — 21 novembre 2026

- Su richiesta (screenshot di «Controlla i dati letti» a larghezza desktop: spazio vuoto sotto i campi, foto alta 420 fissi): nella revisione
  da medium in su la foto non ha più altezza fissa, occupa quella della colonna dei campi (`pictureFill`: `flex: 1`, minimo 240; colonne
  con `alignItems: 'stretch'`); «Ingrandisci la foto» resta sotto. Smartphone e foto ingrandita (640) invariati. Nella stessa sessione,
  su richiesta, tolta dal primo passo del dialogo la frase «Controlli tutto prima di salvare.» (IT e EN; già committata da un'altra sessione in `a2029bb`).
- Poi, su richiesta (screenshot): nella revisione da medium in su (foto non ingrandita) i tre pulsanti non sono più nella riga delle azioni del
  dialogo ma nella colonna dei campi, sotto la Categoria con 56 di distanza (prima 24, poi 40), larghi quanto gli input (`flexGrow` uguale, ognuno almeno
  quanto la sua etichetta, a capo se non entrano). Smartphone e foto ingrandita: azioni di prima. In questo caso `Dialog.Actions` non si
  rende (eccezione alla regola delle azioni fuori dall'area scorrevole). Titolo della revisione ora «Controlla i dati» (EN «Check the data»).
- Poi, su richiesta (due screenshot): distanza tra Categoria e pulsanti su desktop a **72** (prima 24, 40, 56) più 16 sotto i pulsanti (pannello più
  alto); su smartphone «Scansiona di nuovo» occupa da sola tutta la riga e «Annulla»/«Usa questi dati» si dividono la successiva
  (`fullRow`, `flexGrow`), così i tre pulsanti sono allineati ai campi invece di essere a destra a gradini. **Non provato nel browser**
  (né a 390 px né a 1400 px): da controllare che i margini laterali dei pulsanti coincidano con quelli degli input. Committato in `2b9e763` e pubblicato su Hosting (21 novembre): «Deploy complete!», sito 200.
- Poi, su richiesta (tre screenshot): su smartphone «Annulla» e «Usa questi dati» sono larghi uguali (`flex: 1`); su desktop il fondo della foto
  coincideva con la riga dei pulsanti (linea immaginaria): i pulsanti sono ora una riga a sé sotto le due colonne (distanza dalla Categoria
  sempre 72, allineati alla colonna dei campi), così la foto finisce con il modulo e «Ingrandisci la foto» sta più in alto. Poi, su richiesta: la foto arriva
  fino al fondo del campo Categoria e «Ingrandisci la foto» sta a sinistra, sulla riga dei pulsanti. Poi, su richiesta (screenshot di una
  finestra stretta, colonna dei campi ≈308: «Scansiona di nuovo» e «Annulla» sulla stessa riga di larghezze diverse): sotto 500 di colonna (`inlineRowMinimum`,
  misurata con `onLayout`) i pulsanti si impilano come su smartphone, «Scansiona di nuovo» a tutta larghezza e «Annulla»/«Usa questi dati» metà e metà.
  **Non provato nel browser** (né a 570 né a 1400 px). Committato in `3b74ea4` (con le due modifiche precedenti di questa sezione, mai
  pubblicate a parte) e pubblicato su Hosting (21 novembre): «Deploy complete!», sito 200.
- **Verifica:** typecheck e `npm test` OK (509/509). **Non provato nel browser**: da controllare a 1400×900 e a ~900 px (foto non
  collassata al minimo di 240, nessuna barra di scorrimento nuova). Committato in `830ac24` e pubblicato su Hosting (21 novembre): «Deploy complete!», sito 200; layout mai visto nel browser da me.

## Barre di Analisi senza variazione percentuale — 21 novembre 2026

- Su richiesta (screenshot con «+198%» sotto la barra di «Servizi digitali»): tolta dalle Barre la variazione rispetto ai giorni precedenti
  di pari durata, anche dall'etichetta accessibile. Rimossi il calcolo (`variation`, `change`, `previousFrom`/`previousTo` in
  `insights.ts`), la chiave «{p0} rispetto al periodo precedente» di `en.ts` e i test del confronto; resta la quota sul totale.
- **Verifica:** typecheck e `npm test` OK (509/509). Non provato nel browser. Committato in `26c5b8d` e pubblicato su Hosting
  (21 novembre): «Deploy complete!», sito 200. Rules invariate.

## «Salva» e «Crea» con vibrazione, matita dei template evidenziata, niente messaggio dopo il salvataggio — 21 novembre 2026

- Su richiesta: (1) «Salva» di Nuova spesa e «Crea» di Templates danno un `tap` al tocco, solo se «Vibrazione» è accesa (stesso cancello di
  `useHaptics()`). (2) Matita nell'elenco dei template: 24 dp in un riquadro 44×44 con contorno `outline` (`radius.button`), sempre
  decorativa (`aria-hidden`, la riga resta il bersaglio). (3) Dopo il salvataggio di una spesa o di un abbonamento da Nuova spesa non compare più
  il messaggio («Spesa salvata e confermata da Firestore.», «Spesa salvata.», «Abbonamento salvato.»): il modulo che si svuota è l'esito; le tre
  traduzioni sono rimosse da `en.ts`. (4) Template spenti di base: già così nel codice (`defaultPreferences.templatesEnabled = false`); il
  campo visto nello screenshot dipende dall'interruttore salvato nel browser dell'utente, non è cambiato nulla.
- **Verifica:** typecheck e `npm test` OK (510/510). Non provato nel browser né su telefono. Committato in `a29ced9` e pubblicato su
  Hosting (21 novembre): «Deploy complete!», sito 200. Rules invariate.

## Vibrazione tolta da segmenti e legenda, impulsi 4/3 ms — 21 novembre 2026

- Su richiesta (screenshot di «Spese | Abbonamenti» e della legenda di Analisi): nessuna vibrazione su `SegmentedButtons` (tutti) e
  sulle righe della legenda (`CategoryLegend`); restano barra mobile, blocchi e ciambella, «Salva» e «Crea». Durate ancora più brevi:
  `tap` 6 → 4 ms, `tick` 4 → 3 ms. README, `AGENTS.md`, `docs/architecture.md` e pagina di prova (anche l'artifact) allineati.
- **Verifica:** `npm run check` OK (**509/509**). Chromium headless 390×844 touch, demo Standard con `nummo-utente-medio.json`:
  destinazioni [4], segmenti nessuna, legenda nessuna, dito fermo sul confine della barra [3] + [4] al rilascio, trascinamento veloce
  [3,3,3], nessuna in scorrimento/digitazione o con «Vibrazione» spenta, nessun errore JS. Non sentito sul Pixel 8: 3 ms potrebbe
  essere quasi impercettibile. Committato in `1c7ca7f` (Guida in `e7953bf`) e pubblicato su Hosting (21 novembre, 15:11; vedi
  «Registro dei rilasci»).
- Nella stessa fase, controllando il lavoro dell'altra sessione (`a29ced9`, `26c5b8d`): la Guida («Analisi e grafici», IT/EN)
  prometteva ancora il «confronto con i periodi precedenti», tolto dalle Barre con `26c5b8d`; frase corretta.

## Feedback aptico: impulsi singoli senza ronzio — 21 novembre 2026

- Su richiesta (vibrazioni «lunghe, ronzanti, poco precise» sul Pixel 8). **Analisi:** nessuna libreria, solo
  `navigator.vibrate` da `theme/haptics.ts` tramite `useHaptics()`; un impulso per tocco già prima (misurato). Cause trovate:
  (1) trascinamento sulla barra senza zona morta: con il dito fermo sul confine tra due voci lo slot cambiava a ogni evento e
  ogni cambio vibrava, **24 impulsi a 33 ms** (≈800 ms di ronzio, misurato su `HEAD` in Chromium); (2) nessuna distanza minima
  tra vibrazioni: trascinamento veloce e rilascio davano impulsi a 54–67 ms, fusi; (3) segmenti, legenda e grafici con il `tap`
  da 10 ms anche per una selezione, e il segmento già scelto vibrava senza cambiare nulla. Il resto (impulso a durata fissa,
  forma decisa da Chrome) non dipende dal codice: expo-haptics sul web usa 35–60 ms ed è stato scartato (`docs/architecture.md`).
- **Correzioni:** `createHaptics` (cancello unico nel `HapticsProvider`, scarta richieste entro 60 ms, una richiesta rifiutata
  non blocca la successiva), `slotWithHysteresis` (zona morta 0,15 di passo; la destinazione aperta al rilascio è quella
  evidenziata), `tick` per segmenti, legenda, blocchi e ciambella, segmenti senza vibrazione se la scelta non cambia. Durate
  invariate (10/6 ms) finché non si scelgono sul telefono. Pagina di prova `docs/testing/prova-vibrazione.html`, pubblicata anche
  come artifact privato «Prova della vibrazione» per aprirla dal telefono.
- **Verifica:** `npm run check` OK (**510/510**); test nuovi in `tests/haptics.test.ts` (cancello, rifiuto, zona morta). Chromium headless
  390×844 touch, demo Standard con `nummo-utente-medio.json`, `navigator.vibrate` registrato: tocco di ogni destinazione [10];
  segmento già scelto nessuna, altro [6]; scorrimento, importazione e digitazione nessuna; dito fermo sul confine 1 tick + 1 tap
  al rilascio (prima 24 + 1); trascinamento veloce su quattro voci 3 tick a 65 ms, rilascio scartato (prima 4 a 54–80 ms);
  5 righe della legenda [6] ciascuna (prima [10]); «Vibrazione» spenta nessuna; nessun errore JS. **Qualità percepita non
  verificata su Pixel 8.** Committato in `7dc02a2` e pubblicato su Hosting (21 novembre, notte).

## Importo obbligatorio nei template, matita nell'elenco, fondo a capo in Analisi — 21 novembre 2026

- Su richiesta: (1) nel modulo dei template (pagina Templates e modifica) l'importo è **obbligatorio** («Inserisci l’importo.», etichetta
  «Importo»); `amountOptional` di `ExpenseFields` e le due traduzioni «facoltativo» rimosse. Nessuna migrazione: `amount_minor` resta
  `number | null` in dominio, decoder, Rules e backup v11; un template salvato prima senza importo si legge ancora, riempie Nuova spesa
  senza importo e alla modifica lo chiede (`docs/architecture.md`). (2) Nell'elenco «I tuoi template» ogni riga, già tutta premibile, ha a
  destra una matita decorativa (20 dp, `onSurfaceVariant`, `aria-hidden`) dopo l'importo. (3) Nei dettagli delle transazioni di Analisi
  (`TransactionDetails`) su smartphone il fondo torna in una riga propria sotto data e categoria (ripristinato `subtitleBelow` di
  `ListRow`, cioè il codice prima di `278b016`); da medium resta accanto alla categoria.
- **Verifica:** `npm run check` OK (507/507; test del template aggiornato: importo mancante rifiutato, template senza importo ancora
  letto e rifiutato alla modifica). Chromium headless su una copia di `dist-demo/`, Standard con `nummo-utente-medio.json` unito: «Crea»
  senza importo → errore sotto Importo, nessun template; con «45,00» → «I tuoi template (1)», matita a destra a 1400×900 e 390×844;
  Analisi Barre 12 mesi, «Medio · Casa e bollette»: a 390×844 fondo sotto, a 1400×900 accanto alla categoria. Committato in `e4bf945` e
  pubblicato su Hosting (21 novembre, sera). Template preesistenti senza importo non provati nel browser (solo test).
- Su richiesta, nella stessa sessione: riga di supporto di «Vibrazione» (Impostazioni → Funzionalità) ora «Una breve vibrazione quando
  interagisci con l'app.» (EN «A short vibration when you interact with the app.»). Typecheck e test OK. Committato in `e4bf945` e pubblicato.

## Importo e Data non più tagliati su smartphone — 21 novembre 2026

- Su richiesta (difetto preesistente visto a 360 px): in `ExpenseFields` (modifica spesa, revisione dello scontrino, template, Nuova spesa)
  su smartphone la riga Importo/Data va a capo quando le metà sono sotto 156 dp (`flexBasis` 156 + `flexWrap`): nei dialoghi da 320 a 390
  px Data va sotto l'Importo a tutta larghezza; da 412 px e nella pagina Nuova spesa da 360 px restano affiancati. Importo su smartphone:
  padding destro da 16 a 4 (solo `paddingHorizontal` lo sostituisce su RN Web: `paddingRight`/`paddingEnd` erano ignorati, sinistro
  già 0) e carattere 24 invece di 28 da 7 caratteri («1234,56»).
- **Verifica:** Chromium headless, demo con `nummo-esercenti-v10.json`: modifica spesa («48,20», «19 nov 2026») e Nuova spesa («1234,56»,
  «Oggi») a 320, 360, 390 e 412 px: in ogni caso larghezza del testo ≤ spazio dell'input (nessun valore tagliato); nessun errore JS.
  `npm run check` OK. Committato in `9a8285a` e pubblicato. Non provati: un importo da 8 caratteri o più («12345,67») a 360 px, il carattere
  scelto in Impostazioni diverso dal predefinito.

## Annulla e Salva a 96 su smartphone nei dialoghi di modifica — 21 novembre 2026

- Su richiesta: accanto al cestino (modifica spesa, template, prodotto) «Annulla» e «Salva» sono larghi almeno 96 invece di 112 su
  smartphone (`narrowOnPhone` di `CancelButton`/`ConfirmButton`); altrove e da medium resta 112.
- **Verifica:** Chromium headless, modifica spesa: 390 e **360 px** cestino + Annulla 97 + Salva 96 su una riga; 320 px ancora a capo
  (cestino sopra, atteso: ≈238 dp disponibili); 1400 px invariato (Elimina con etichetta, 110/112). `npm run check` OK. Committato in
  `8e513f4` e pubblicato.

## Cestino con contorno, azioni degli abbonamenti a tutta larghezza su smartphone — 21 novembre 2026

- Su richiesta (screenshot): il cestino di `DeleteAction labeled="wide"` su smartphone ha il contorno come «Annulla» (IconButton `outlined`,
  48×48, `radius.button`, icona in `error`). Poi, su richiesta, anche il contorno nello stesso rosso `error` dell'icona (verificato: bordo
  `#FFB4AB` da 1 px nel tema scuro, come l'icona). Committato in `3d1b5ea` e pubblicato. In Spese → Abbonamenti, su smartphone Annulla/Pausa (o Riattiva)/Modifica si allargano fino a
  coprire tutta la riga (`flexGrow: 1` da larghezza naturale); desktop invariato.
- **Verifica:** Chromium headless, demo con `nummo-esercenti-v10.json`: modifica spesa a 390×844 (cestino 48 con bordo, stessa riga di
  Annulla/Salva); «V10 Netflix» a 390×844 (109/99/118 dp, da 26 a 364 in un dettaglio largo 364) e 360×800 (96/96/104). `npm run check` OK.
  Committato in `3d1b5ea` e pubblicato.

## «Elimina» solo icona su smartphone nei dialoghi di modifica — 21 novembre 2026

- Su richiesta (opzione A dell'analisi dello screenshot «Modifica spesa»): su smartphone «Elimina» andava a capo da solo, a sinistra e
  rientrato, perché con l'etichetta (≈100 dp) la riga chiedeva ≈356 dp su ≈308 disponibili a 390 px. Ora `DeleteAction labeled="wide"`:
  etichetta da medium, su compact solo il cestino 48×48 in `error` (etichetta accessibile «Elimina {nome}» invariata). Usato in modifica
  spesa, modifica template e modifica prodotto (`ListDialogs`). Ai contenitori di «Elimina» `marginRight: 0`, che annulla gli 8 dp aggiunti
  da `Dialog.Actions` (resta solo il gap di 12).
- **Verifica:** Chromium headless, demo Standard con `nummo-esercenti-v10.json`, modifica spesa: 1400×900 «Elimina» con etichetta, una riga;
  390×844 cestino + Annulla + Salva su una riga (y 625); **360×800 e 320×640 ancora a capo** (≈278 dp disponibili per 296 richiesti):
  cestino sopra, coppia sotto. Template e prodotto hanno la stessa struttura, non riaperti nel browser. `npm run check` OK.
  Committato in `3d1b5ea` e pubblicato. Superato in parte: da 360 px la riga ora non va più a capo (Annulla/Salva a 96, `8e513f4`);
  Importo e Data tagliati a 360 px corretti in `9a8285a`.

## Pulsanti della revisione dello scontrino, esercente negli abbonamenti — 21 novembre 2026

- Su richiesta (screenshot di «Controlla i dati letti»): «Scansiona di nuovo» non è più di solo testo ma con contorno (`CancelButton`);
  «Annulla» e «Usa questi dati» sono uniti in `dialogActionPair` (senza margine automatico): desktop «Scansiona di nuovo · Annulla · Usa
  questi dati» a destra; smartphone «Scansiona di nuovo» sopra, la coppia sotto (prima «Usa questi dati» restava da solo sulla seconda riga).
  «Usa questi dati» sembrava stretto perché `Dialog.Actions` di Paper aggiunge `compact` (margini dell'etichetta 8 invece di 24):
  `CancelButton`/`ConfirmButton` ora lo annullano sempre (`compact={false}`), in tutti i dialoghi; tolto il `compact` esplicito dai dialoghi
  del prodotto in `ListDialogs`. Con etichette entro i 112 dp nulla cambia.
- Su richiesta (screenshot dei dettagli di TorBox): nei dettagli di un abbonamento, dopo la Categoria, «Esercente» con l'icona negozio in
  `primary`, solo se la serie ne ha uno; `SubscriptionList` riceve `merchantNames` da `Workspace` (la stessa mappa di `ExpenseList`).
- **Verifica:** Chromium headless sulla demo Standard con `nummo-esercenti-v10.json` unito; risposta di Claude simulata nella pagina
  (nessuna richiesta reale): revisione a 1400×900 (174/110/145 × 48, una riga) e 390×844 (Scansiona di nuovo sopra, coppia sotto);
  «V10 Netflix» mostra «Esercente Netflix» a 1400×900 e 390×844; nessun errore JS. `npm run check` OK (501/501). Committato in
  `3d1b5ea` e pubblicato.

## «Torna indietro» in «Collega il tuo Firebase» — 21 novembre 2026

- Su richiesta (screenshot della pagina accanto a «Cos'è Nummo»): in testa a `FirebaseConnect` c'è ora «Torna indietro» come nella guida,
  con la stessa azione di «Annulla» (`onCancel`), disattivato durante il collegamento. Nuovo `components/BackButton.tsx` (pulsante di testo
  compatto con chevron, allineato al bordo), usato anche da `Guide.tsx` al posto del pulsante in linea; nella pagina il padding superiore
  lascia il posto al pulsante, come nella guida. Testo già tradotto («Go back»). `OwnerSetup` invariato.
- **Verifica:** Chromium headless sulla demo, Avanzata da disconnessi → «Usa il tuo progetto Firebase»: a 390×844 pulsante a y 76 e titolo
  a y 148, a 1400×900 allineato alla colonna; «Torna indietro» riporta all'accesso; nessun errore JS. `npm run check` OK. Committato in
  `3d1b5ea` e pubblicato.

## Vibrazione su legenda e segmenti, selezione più reattiva — 21 novembre 2026

- Su richiesta (screenshot della legenda di Analisi e di «Spese | Abbonamenti»): vibrazione anche al tocco delle righe della legenda di
  Analisi (anche quelle dentro «Altre») e di ogni `SegmentedButtons` (Spese/Abbonamenti, ricorrenza, stato, movimento, notifiche).
- **Glitch segnalato** (cambio rapido di categoria nella legenda), misurato in Chromium headless (1478×900, Blocchi, CPU 4×, registro per
  fotogramma): (1) ogni tocco rifaceva il render di **tutta** la pagina Analisi (filtri, menu, riepilogo, andamento): long task di
  ~100 ms per tocco; (2) durante quel task la vecchia evidenziazione iniziava a sparire e la nuova partiva ~50 ms dopo (nessuna riga
  selezionata per 3 fotogrammi), poi una dissolvenza incrociata di 150 ms con due righe a metà; (3) `formatCurrency` e `formatCivilDate`
  creavano un `Intl` nuovo per ogni importo/data (~6 ms per tocco con CPU 4×, e in ogni elenco dell'app).
- **Correzioni:** `CategoryChart` (memo in `Dashboard.tsx`) tiene la categoria selezionata, con chiave periodo+fondo (che la azzera come
  prima); `openCategory` e i colori stabili. `LegendRow` memo: cambiano solo le due righe coinvolte. `selectionFill` (`motion.ts`): fondo
  della selezione istantaneo in legenda, `SegmentedButtons` e `ChoiceChips` (stesso difetto: testo nuovo sul fondo vecchio per 150 ms).
  `numberFormat`/`dateTimeFormat` in `i18n/translate.ts` con cache, usati da `formatCurrency`/`formatCivilDate`, rinnovi, prezzi,
  dettaglio giornaliero e variazioni delle Barre. Non toccati: attenuazione di blocchi e spicchi (150 ms, scelta grafica del grafico).
- **Verifica:** `npm run check` OK (**507/507**, test dei formattatori in `tests/i18n.test.ts`). Chromium headless, demo Standard con
  `nummo-utente-medio.json`, CPU 4×: legenda dei Blocchi a 1478×900, cinque tocchi a 200–250 ms l'uno dall'altro → selezione cambiata in un
  fotogramma, nessuna dissolvenza incrociata, nessun long task oltre il primo (60 ms, montaggio), prima ~100 ms per tocco. Ciambella a
  390×844 touch: 5 tocchi sulla legenda → 5 vibrazioni, nessun long task; «Abbonamenti» → vibrazione e selezione. Nessun errore JS.
  Non provato su telefono reale. Committato in tre parti: `a8f73a2` (formattatori), `9ae0d33` (selezione), `b2a80ce` (vibrazione e
  documenti). Pubblicato su Hosting il 21 novembre (pomeriggio).

## «Crea» dei template a tutta larghezza, «Salva» e «Crea» a pillola — 21 novembre 2026

- Su richiesta (screenshot di Templates su smartphone): «Crea» di «Nuovo template» occupa tutta la larghezza del modulo a ogni dimensione,
  come «Salva» di Nuova spesa (prima minimo 140, allineato a destra); entrambi hanno ora la forma a pillola (`radius.pill`) invece del
  raggio 16 degli altri pulsanti. Altezza invariata (56). `ExpenseForm.tsx`, `TemplatesPage.tsx`.
- **Verifica:** typecheck e `npm test` OK, `build:demo` OK. Chromium headless, demo Standard: 390×844 e 1400×900, «Salva» e «Crea» larghi
  quanto il contenitore (366 e 1056 px), alti 56, `border-radius` 999 px; nessun errore JS. Committato in `cc60ea6` e pubblicato su Hosting (21 novembre, pomeriggio).

## Fondo accanto alla categoria nei dettagli di Analisi su smartphone — 21 novembre 2026

- Su richiesta (screenshot di «Servizi digitali» su iPhone): nel dialogo delle transazioni di una categoria (`TransactionDetails`) il fondo
  (avatar e nome) sta ora accanto alla categoria, sulla riga della data, anche su smartphone; prima andava su una riga propria sotto.
  Nomi lunghi accorciati con «…» (categoria e fondo si restringono insieme). Tolta da `ListRow` la prop `subtitleBelow`, rimasta senza usi.
- **Verifica:** typecheck e `npm test` OK (506/506), `build:demo` OK. Chromium headless, demo Standard con `nummo-utente-medio.json`,
  Analisi a blocchi su 12 mesi, «Medio · Casa e bollette» → «Mostra transazioni»: a 390 e 360 px data, categoria e fondo sulla stessa
  riga, dentro il dialogo, nomi lunghi accorciati; senza fondo, la categoria intera. Nessun errore JS. Committato in `278b016`, pubblicato su Hosting con `cc60ea6`.
- **Superato** da `e4bf945` (su richiesta): su smartphone il fondo è di nuovo in una riga propria sotto data e categoria e
  `subtitleBelow` è tornata in `ListRow`; da medium resta accanto alla categoria.

## Feedback aptico nella barra mobile e in Analisi — 21 novembre 2026

- Su richiesta: vibrazione breve (Vibration API, l'unica disponibile a una pagina web) al tocco di una destinazione e del pulsante
  tondo nella barra in basso su smartphone, un «tick» più leggero a ogni destinazione attraversata trascinando il dito sulla pillola
  e un tocco al rilascio che apre la destinazione; in Analisi al tocco di un blocco o di uno spicchio della ciambella. Rail e drawer
  (medium/expanded) invariati. Interruttore «Vibrazione» in Impostazioni → Funzionalità, **acceso di base** (`haptics` in
  `nummo.preferences.v1`; valori non booleani → acceso).
- Codice: `src/theme/haptics.ts` (puro, navigator iniettabile: `tap` 10 ms, `tick` 6 ms; spento, senza API, rifiuto o eccezione →
  nessuna vibrazione e nessun errore), `components/Haptics.tsx` (`HapticsProvider` in `App.tsx`, `useHaptics()` stabile),
  `AppShell` (`NavigationBar`, `useSlidingIndicator`), `charts.tsx` (ciambella), `BlockChart.tsx`; traduzioni in `en.ts`; README e AGENTS.
- **Limiti:** Safari/iOS (anche installata) e Firefox non offrono la Vibration API: lì l'interruttore non ha effetto. Chrome vibra
  solo dopo la prima interazione con la pagina (sempre vera per un tocco). Il pulsante dei blocchi vibra anche con Invio da tastiera.
- **Verifica:** `npm run check` OK (**506/506**: 3 test nuovi, `tests/haptics.test.ts` e preferenze; i 503 di partenza comprendono il test
  della tastiera a passi dell'altra sessione, `0f218da`). Chromium headless 390×844 touch, demo Standard con
  `nummo-utente-medio.json` unito, `navigator.vibrate` sostituito da un registratore: tocco «Analisi» [10]; spicchio [10] e selezionato;
  trascinamento Spese → Liste partendo da Analisi [6,6,6,6,10] e Liste aperta; «Nuova spesa» [10]; blocco [10]; interruttore
  «Vibrazione» → `haptics: false` salvato, poi tocchi su barra e blocco senza vibrazioni; nessun errore JS. **Non provato su telefono
  reale** (intensità percepita delle durate scelte). Committato in `4d69d04`, dopo `0f218da` (tastiera). Pubblicato su Hosting il 21 novembre (pomeriggio).

## Tastiera aperta a passi: il campo resta in vista — 21 novembre 2026

- Seguito della sezione seguente. iOS riduce il visual viewport a passi durante l'animazione della tastiera; la conferma arriva al primo
  passo oltre la soglia e il campo attivo veniva portato in vista solo lì. Riprodotto con `scripts/check-keyboard.mjs --steps 4`
  (nuova opzione: viewport ridotto in N passi a un fotogramma di distanza): campo basso di Nuova spesa (332–380) tagliato di 16 px sotto
  il bordo dopo l'ultimo passo (364), `scrollTop` fermo a 0.
- **Correzione:** `observeViewportShrink` (`theme/viewport.ts`, target iniettabile) avvisa a ogni nuovo restringimento, in un microtask
  dopo tutti i listener dell'evento (variabile dell'altezza compresa) e prima del disegno; `AppShell`, finché la tastiera è confermata,
  riporta in vista il campo attivo (`scrollIntoView` `nearest`). Solo DOM, nessun render per passo; la crescita si ignora. Test in
  `tests/viewport.test.ts`.
- **Verifica** (export separato nello scratchpad: `dist-demo/` era in ricostruzione da un'altra sessione): 4 e 6 passi (CPU 4×) → campo
  316–364 nello stesso fotogramma dell'ultimo passo; tastiera in un passo, dialogo Nuova lista a passi, cambio di campo e cicli, desktop
  1400×900 invariati; nessun errore. Long task con 6 passi e CPU 4× uguali a quelli del codice committato (confronto in un worktree
  temporaneo, rimosso): vengono dal relayout della pagina. `npm run typecheck` OK, `npm test` **503/503**. Non provato su iPhone reale.
  Committato in `0f218da` (separato dal feedback aptico). Pubblicato su Hosting con `4d69d04`.

## Tastiera virtuale: transizione in un solo fotogramma — 21 novembre 2026

- Su richiesta (glitch all'apertura della tastiera). **Causa:** l'altezza della pagina (`--nummo-viewport-height`, impostata da
  `GlobalStyle` nell'evento `resize`) era dipinta subito, mentre lo stato della tastiera in `AppShell` (`setState` da un listener nativo
  `resize`, priorità predefinita di React) arrivava un fotogramma dopo, e `scrollIntoView` del campo attivo un altro ancora
  (`requestAnimationFrame`). Misurato in Chromium (Nuova spesa 390×844, CPU 4×), prima: apertura in tre stati in ~84 ms (area 212 px con
  la barra invisibile che occupava ancora 88 px → 300 → campo portato in vista), chiusura in due (striscia vuota di 88 px, poi la barra).
  Non responsabili: transizioni CSS, `position: fixed` (assente), rimontaggi al focus, `100dvh`, dialoghi (stessa variabile).
- **Correzione** (`fdfce0e`, già pubblicata con `3d1b5ea`): un microtask riunisce gli avvisi `open`/`confirmed` di un evento in un solo
  `flushSync`, ancora prima del disegno; il campo va in vista in un `useLayoutEffect`. `flushSync` dichiarato in `src/types/react-dom.d.ts`
  (`react-dom` è già una dipendenza diretta, senza tipi). `observeVirtualKeyboard` invariato.
- **Seguito, stesso giorno (`1a8dc14`, pubblicato con `9a8285a`):** il raggruppamento è ora la funzione pura `batchKeyboardReports` in `theme/viewport.ts`, con un
  test (un solo aggiornamento per gruppo, valori più recenti, niente dopo lo smontaggio); commento di `KeyboardContext` corretto (nessuna
  pagina lo legge oggi); `scripts/check-keyboard.mjs`, controllo manuale per fotogramma (`--field top|low|dialog`, `--keyboard`, `--cpu`,
  `--switch`, `--cycles`, `--vp`).
- **Verifica:** `scripts/check-keyboard.mjs` su `dist-demo`: campo basso con tastiera 480 e CPU 4× (apertura con scorrimento e chiusura in
  un fotogramma ciascuna), dialogo Nuova lista, passaggio tra campi con tastiera aperta e due cicli (nessuno spostamento), desktop
  1400×900 invariato; nessun errore. Long task con CPU 4× tra 57 e 99 ms, variabili tra esecuzioni come prima della correzione.
  `npm run check` OK. **Non provato su telefono reale:** l'animazione della tastiera di sistema e iOS (che riduce solo il visual viewport, a
  passi: il campo va in vista una volta sola, alla conferma) restano da verificare.

## «Chiudi» con contorno — 21 novembre 2026

- Su richiesta: «Chiudi» dei dialoghi a una sola azione (transazioni di Analisi, Prodotti, Storico dei pagamenti) e del riepilogo aperto da
  una notifica usa `CancelButton` come «Annulla» (contorno, minimo 112×48); tolta l'etichetta più grande 16/600 del 16 novembre. Restano
  com'erano il «Chiudi» dello snackbar e l'etichetta accessibile dello sfondo dei dialoghi (non sono pulsanti di dialogo).
- **Verifica:** Chromium headless, Analisi a 1400×900 e 390×844. `npm run check` OK. Committato in `bdc742b` e pubblicato (Hosting, 21 novembre, notte).

## Pulsanti dei dialoghi uniformi — 21 novembre 2026

- Su richiesta (screenshot: «Elimina · Annulla · Salva» con «Annulla» di solo testo). **Analisi:** «Annulla» era di testo in 11 punti e
  con contorno in 4; larghezze 88, 96 fissa, 96 minima, `minTouch*2`, 116 o nessuna; altezza 40 nelle conferme di eliminazione e in
  Archiviazione, 48 altrove; spazio 8 nelle conferme, 12 nei dialoghi.
- **Correzione:** in `components/Button.tsx` `CancelButton` (contorno), `ConfirmButton` (pieno), `dialogActionsRow` (a capo, spazio 12) e
  `dialogActionPair` (Annulla + conferma uniti accanto a Elimina); minimo 112×48, margine di Paper annullato. Usati in: modifica spesa,
  template, categoria, fondo, movimento, assegnazione fondo, stato abbonamento («Indietro»), lista e prodotto, registrazione lista,
  selettore della data (Annulla/OK), conferma di eliminazione (`DeleteAction`), dialoghi di Archiviazione, anteprima del ripristino,
  scansione dello scontrino. Invariati: «Chiudi» dei dialoghi a una sola azione, il modulo di collegamento Firebase (già con contorno, in
  colonna), «Scansiona di nuovo» (con contorno dal 21 novembre, mezzogiorno, `3d1b5ea`).
- Trovato e corretto anche un difetto preesistente: su smartphone «Elimina» della modifica spesa si sovrapponeva ad «Annulla» (contenitore
  `flex: 1`); ora la riga va a capo con Elimina sopra e la coppia Annulla/Salva sotto.
  Superato: su smartphone Elimina è il solo cestino con contorno sulla stessa riga (`3d1b5ea`, `8e513f4`).
- **Verifica:** Chromium headless, demo Standard con `nummo-utente-medio.json`: modifica spesa, conferma di eliminazione e selettore data
  a 1400×900 e 390×844 (Annulla 112, Salva/OK 112, alti 48, nessuna sovrapposizione). `npm run check` OK. Committato e pubblicato con `817a2f1` (Rules e Hosting, 21 novembre, notte).

## Icona dell'app un po' più squadrata — 21 novembre 2026

- Su richiesta (favicon della scheda): il fondo «squircle» di `icon.svg` era quasi un cerchio a 16 px. Punti di controllo della curva
  spostati da 10 a 6 unità dagli angoli (su 64): angoli ancora morbidi, più quadrato. Scelto dopo un confronto k=10/7/5/3 a 16, 32 e 96 px.
  Poi, su nuova richiesta, ancora un po' più squadrato: **4 unità** (SVG e PNG rigenerati allo stesso modo).
- Rigenerati con Chromium headless a sfondo trasparente `icon-192.png` e `icon-512.png` (RGBA, stessa forma); invariati
  `icon-maskable-512.png` e `apple-touch-icon.png` (quadrati, mascherati dal sistema) e `icon-monochrome.svg`. `docs/icone-installazione.md`
  aggiornato. Dopo la pubblicazione browser e launcher possono tenere in cache la vecchia icona. Committato e pubblicato con `817a2f1` (Rules e Hosting, 21 novembre, notte).

## Templates reintrodotti, con l'Esercente — 21 novembre 2026

- Su richiesta. Ripristinata dalla storia Git (`f9c4d8f^`) la funzione eliminata il 16 novembre: pagina «Templates» nel menu account
  (dopo Categorie), interruttore «Usa i template» (spento di base), campo «Template» in Nuova spesa (sotto Categoria/Fondo, sopra
  «Ricorrente»), modifica ed eliminazione, limite 100. In più l'**Esercente** facoltativo, salvato come nome (mai un documento
  `merchants`). Decisione e dettagli in `docs/architecture.md`.
- Dati: `DataStore` in entrambe le modalità; IndexedDB `templates` (passo 2, già nello schema: i template di prima tornano visibili);
  Firestore `templates/{uuid}` con Rules (radice e `public/` identiche; `merchant` facoltativo per i documenti vecchi). **Backup v11**
  (`templates`); lettore v7 di nuovo con i template, v8–v10 senza.
- **Verifiche:** `npm run check` OK, **501/501** (test di dominio, store locale con record vecchio senza esercente, backup v11/v7/v8–v10;
  aggiornate le asserzioni di versione e i confronti dei file di collaudo v9/v10). `npm run test:emulator` **22/22** su porte dedicate
  (config temporanea `.nummo-templates-check.json` nella radice, rimossa; emulatori dell'utente su 8180/4000/4400 non toccati), compreso
  il test dei template: Rules, scritture, documento senza `merchant`, modifica che conserva la creazione, backup. Chromium headless, demo
  Standard con `nummo-utente-medio.json`: menu → Templates → interruttore → nuovo template con importo, Esercente, categoria e fondo →
  «I tuoi template (1)» → Nuova spesa → campo Template → tutti i campi compilati (1400×900 e 390×844).
- **Pubblicazione:** fatta su richiesta nell'ordine previsto, prima le **Rules** e poi Hosting, da `817a2f1` (21 novembre, notte; «Registro
  dei rilasci»). Da provare in produzione: la pagina Templates in Avanzata.

## Ordine dei servizi AI, categoria e fondo nei dettagli di Analisi — 21 novembre 2026

- Su richiesta: nella scheda «Analisi scontrini con AI» i servizi sono nell'ordine Claude, OpenAI, Google Gemini (`aiProviders`; etichette
  invariate, «OpenAI» resta il nome mostrato).
- Analisi, dialogo delle transazioni di una categoria (`TransactionDetails`): sotto il nome la data, poi la categoria in `primary` (prima
  era grigia dopo «·») e, se la spesa ha un fondo, l'avatar del fondo (16 px) e il nome; nessun «Nessun fondo» nella riga. Da medium tutto
  su una riga; su smartphone il fondo va su una riga propria sotto data e categoria (nuova prop `subtitleBelow` di `ListRow`). `Dashboard`
  passa `funds`.
- **Verifica:** Chromium headless, demo in Standard con `nummo-utente-medio.json` unito, Analisi a barre su 12 mesi, dialogo «Medio · Casa
  e bollette»: 1400×900 (una riga per spesa, Affitto senza fondo) e 390×844 (fondo sotto). `npm run check` OK. Committato e pubblicato con `817a2f1` (Rules e Hosting, 21 novembre, notte).

## Errore «Invalid prop `compact` supplied to `React.Fragment`» — 21 novembre 2026

- Segnalato dall'utente in sviluppo. **Causa:** `Dialog.Actions` di Paper clona ogni figlio diretto aggiungendo `compact`, `uppercase` e
  `style`; in `ScanReceiptDialog` le azioni dei passaggi fotocamera, pronto, consenso e revisione erano un Fragment (`actions = <>…</>`),
  quindi Paper clonava il Fragment. React lo segnala quando aggiorna l'elemento (non al primo montaggio). Presente dal 16 novembre; solo
  avviso di sviluppo, nessun effetto in produzione (ma i pulsanti non ricevevano `compact` né il margine di Paper).
- **Correzione:** azioni come array di pulsanti con `key`; `marginRight: 0` su ogni pulsante annulla gli 8 dp che Paper aggiunge, così lo
  spazio resta solo il `gap` di 12 approvato. Gli altri `Dialog.Actions` dell'app hanno già i pulsanti come figli diretti. Regola in AGENTS.
- **Verifica:** Expo di sviluppo su porta 8099 (con `CI=1` il watcher è spento e serviva codice vecchio: riavviato senza), Chromium
  headless 390×844, passaggio «pronto» con digitazione nella chiave: col file precedente due `console.error` con l'avviso e un nodo
  `FRAGMENT` dentro `Dialog.Actions`; con la correzione nessun errore, pulsanti clonati direttamente, gap 13 px, 114/116 px. Server fermato.
  `npm run check` OK. Committato e pubblicato con `817a2f1` (Rules e Hosting, 21 novembre, notte).

## Icona «internet» (wifi) a tre segni negli stili minimale e colorato — 21 novembre 2026

- Su richiesta: minimale e colorato avevano tre archi più il punto; ora, come lo sprite pixel art, due archi e un punto. Stessa geometria nei
  due set (archi `M2.5 10.5a13.5 13.5 0 0 1 19 0` e `M6.5 14.5a8 8 0 0 1 11 0`, punto a 12,19): minimale con tratto standard e punto pieno
  (`fill="currentColor"`, r 1,2), colorato con archi `{b}` da 2,8 e punto `{l}` r 2,2. Sprite pixel invariato; ID, tinta e Rules invariati.
- **Verifica:** anteprima dei tre stili affiancati (Chromium headless, tema scuro, 96 px) con il wrapper di `SvgIcon`. `npm run check` OK
  (**494/494**, compresi i test di icone e contrasti). Non vista nell'app con una categoria reale. Committato e pubblicato con `817a2f1` (Rules e Hosting, 21 novembre, notte).

## Scansiona scontrino: «Annulla» proporzionato all'azione — 21 novembre 2026

- Su richiesta (screenshot del dialogo): «Annulla» era un'etichetta di testo stretta (73×48) accanto a «Scansiona» pieno (115×48). Ora in
  ogni passaggio del dialogo «Annulla» è con contorno e ha la stessa larghezza minima (116) dell'azione principale («Scansiona», «Scatta»,
  «Acconsento e invio», «Usa questi dati»), come nelle conferme di `DeleteAction`. «Scansiona di nuovo» restava di testo (superato: con contorno da `3d1b5ea`).
- Ritocchi successivi, su richiesta: spazio tra i pulsanti delle azioni da 4 a 8, poi a 12 (`spacing.md`).
- **Verifica:** Chromium headless, demo con scansione accesa e un'immagine sintetica, 390×844 e 1280×900: «Annulla» 114×48, «Scansiona»
  116×48. `npm run check` OK (**494/494**). Committato e pubblicato con `817a2f1` (Rules e Hosting, 21 novembre, notte).

## Fondo nei dettagli degli abbonamenti — 21 novembre 2026

- Su richiesta: in Spese → Abbonamenti, i dettagli aperti mostrano «Fondo» dopo la Categoria, con l'avatar del fondo (20 px) e il nome,
  o l'avatar tratteggiato e «Nessun fondo»; nessun campo se non esiste alcun fondo (archiviati compresi), come nelle spese singole.
  `SubscriptionList` riceve `funds={fundState.funds}` da `Workspace`; `Field` accetta un'icona prima del valore (nome lungo a capo).
- Layout invariato: i campi a `flexBasis` 140 danno sei colonne su desktop e tre righe da due su smartphone.
- **Verifica:** `npm run check` OK (**494/494**). Chromium headless, demo in Standard con `nummo-utente-medio.json` unito dall'interfaccia:
  1400×900 (una riga di sei campi, «Nessun fondo» su Affitto) e 390×844 (due colonne, «Medio · Tempo libero» con avatar a capo su
  Netflix). Committato e pubblicato con `817a2f1` (Rules e Hosting, 21 novembre, notte).

## Scansione dello scontrino solo con AI, spenta di base — 21 novembre 2026

- Su richiesta: OCR locale eliminato (Tesseract.js e dati dal lockfile, `scripts/sync-ocr.ts`, `ocr:sync` e il suo uso negli script,
  `public/ocr/` generata e cancellata, intestazione Hosting `/ocr/**`, `services/receiptOcr.ts`, parsing del testo in `domain/receipt.ts`,
  tipo e «Scansione predefinita»). Tolto anche il servizio «API compatibile OpenAI»: restano OpenAI, Google Gemini, Claude.
- Interruttore «Scansione dello scontrino» in testa alla scheda «Analisi scontrini con AI» (`enabled` in `nummo.receiptAi.v1`, spento di
  base): finché è spento «Scansiona scontrino» non compare in Nuova spesa e il resto della scheda è attenuato (0,38) e `inert`, senza
  richieste dell'elenco dei modelli. Chi aveva già scelto un servizio lo trova acceso (nessun `enabled` salvato + servizio = acceso).
- Dialogo: niente scelta del tipo né ripiego; con servizio o modello mancante dice «Scegli il servizio AI nelle Impostazioni.» o
  «Indica il modello da usare.» e «Scansiona» resta disattivato; errore → messaggio e «Riprova». Guida pubblica e `en.ts` aggiornati
  (24 traduzioni non più usate rimosse). Decisione e valutazione degli abbonamenti ChatGPT/Claude in `docs/architecture.md`.
- **Verifica:** `npm run check` OK, **494/494** (7 test dell'OCR tolti, test dell'interruttore e della compatibilità aggiunti); nessuna
  traccia di Tesseract in `dist-demo/`. Chromium headless 1280×900 (demo, Standard): senza interruttore nessun «Scansiona», scheda attenuata
  e `inert`; acceso → servizi attivi, Gemini salvato, pulsante presente, dialogo aperto. Non provati: smartphone, scansione reale con una
  chiave. Committato e pubblicato con `817a2f1` (Rules e Hosting, 21 novembre, notte).

## Pulsanti di prova delle notifiche nascosti — 21 novembre 2026

- Su richiesta: in Notifiche non compaiono più «Invia notifica di prova» e «Prova con Nummo chiusa» (né il messaggio «Chiudi Nummo
  ora…»). Codice conservato per il debugging dietro la costante `pushTests = false` in `NotificationsPage.tsx`; invariati
  `usePushNotifications` (`localTest`/`remoteTest`), l'API `/v1/test` del servizio push e le traduzioni (ancora referenziate).
  README, `docs/notifiche-push.md` e AGENTS aggiornati. `npm run check` OK. Committato in `9ad8e02`. Pubblicato con `817a2f1` (Rules e Hosting, 21 novembre, notte).

## Pulsanti di Archiviazione e backup della stessa larghezza — 21 novembre 2026

- Su richiesta: «Esporta transazioni (CSV)», «Scarica backup (JSON)» e «Importa backup (JSON)» hanno la stessa larghezza, quella
  dell'etichetta più lunga nella lingua corrente (`BackupActions`: `onLayout` dei tre pulsanti e `minWidth` comune, rimisurata al
  cambio di lingua). Su smartphone restano impilati a tutta larghezza come prima.
- **Verifica:** Chromium headless 1600×900 (demo): 233 px ciascuno in italiano, 236 px in inglese. `npm run check` OK. Committato in `9dd0880`. Pubblicato con `817a2f1` (Rules e Hosting, 21 novembre, notte).

## Riga velata anche su smartphone, icona del fondo nei dettagli — 21 novembre 2026

- Su richiesta: la riga dissolta verso il bordo inferiore (prima solo nel pannello desktop) vale a ogni dimensione con navigazione:
  `AppShell` marca lo scroller con `data-whole-rows` e avvia `observeWholeRows` con `hasNav`; `data-panel-scroll` resta solo per la
  barra di scorrimento del pannello. Su smartphone il bordo è quello sopra la barra di navigazione.
- Nei dettagli della spesa il «Fondo» ha l'avatar del fondo (20 px, `FundAvatar`) o quello tratteggiato di «Nessun fondo».
- **Verifica:** Chromium headless 500×900 (compact, demo, Standard): riga velata sopra la barra, avatar accanto a «Medio · Spesa e
  casa». `npm run check` OK. Committati in `0e536a5` (riga velata) e `661b984` (avatar). Pubblicato con `817a2f1` (Rules e Hosting, 21 novembre, notte).

## Fondo nei dettagli della spesa — 21 novembre 2026

- Su richiesta: nei dettagli di una spesa (Spese, vista spese singole) il campo «Fondo» dopo la Categoria, con il nome del fondo
  (archiviati compresi) o «Nessun fondo»; nessun campo se non esiste alcun fondo. `ExpenseList` riceve `funds={fundState.funds}` da
  `Workspace`. Traduzioni già presenti.
- **Ritocco precedente, stesso giorno:** la riga tagliata dal bordo del pannello desktop si dissolve invece di sparire (sezione seguente).
- **Verifica:** Chromium headless 1600×900 (demo, Standard, backup di collaudo): «Fondo | Medio · Spesa e casa» e «Fondo | Nessun fondo».
  `npm run check` OK. Pubblicato il 21 novembre (notte), vedi «Registro dei rilasci».

## Righe intere nel pannello desktop, esercente tolto dai dettagli — 21 novembre 2026

- Su richiesta: (1) tolto «Esercente» dai dettagli della spesa (resta accanto alla data e nell'etichetta accessibile della riga).
  (2) Desktop: nessuna riga visibile a metà sul bordo inferiore del pannello.
- `src/theme/wholeRows.ts`: `clippedRows` (puro, `tests/wholeRows.test.ts`) e `observeWholeRows` su `[data-panel-scroll]`, avviato da
  `AppShell` solo con il pannello. Righe marcate con `dataSet.wholeRow` (`ListRow`, mesi di Spese, schede dei fondi); la riga tagliata
  riceve `data-clipped` (`opacity: 0`, `pointer-events: none`); mai nascoste righe più alte della vista, iniziate sopra o con il focus.
  Una riga intera che cresce (dettagli aperti) fa scorrere il pannello invece di sparire.
- **Verifica:** Chromium headless 1600×900 (demo, Standard). `npm run check` **501/501**. Pubblicato il 21 novembre (sera).
- **Ritocco successivo (su richiesta: nascondere del tutto la riga sembrava la fine dell'elenco):** la riga tagliata non sparisce più
  ma si dissolve verso il bordo (`mask-image` da 55 % a trasparente sul bordo del pannello, altezza visibile in `--nummo-peek`),
  resta non cliccabile e un clic sulla sua area la fa scorrere in vista intera. Verificato in Chromium headless 1600×900 (porzione
  visibile 25 e 50 px; clic → riga intera, non espansa).

## Esercente accanto alla data in Spese — 21 novembre 2026

- Su richiesta, da uno screenshot di Spese su desktop: (1) sotto l'ultima riga visibile non deve comparire l'inizio di una nuova
  spesa; (2) l'esercente accanto alla data, con una scritta diversa per riconoscerlo.
- (1) È lo stesso difetto della sezione seguente: il taglio sulla linea 28 px dentro il pannello lasciava una striscia della
  spesa successiva. Con lo scroller che riempie il pannello le righe scompaiono sotto il bordo arrotondato; una riga parzialmente
  visibile durante lo scorrimento resta (comportamento normale di una lista che scorre).
- (2) `ListRow` ha `subtitleExtra` (sulla riga del sottotitolo, dopo di esso, si restringe per primo); `ExpenseList` vi mette
  l'esercente: icona `store` 14 px e testo `labelMedium` in `primary`, una riga con «…» (il nome completo resta nei dettagli).
  Solo spese singole; abbonamenti, Analisi e Categorie invariati.
- **Verifica:** `npm run check` OK. Chromium headless, `dist-demo/`, Standard con `nummo-utente-medio.json` e
  `nummo-esercenti-v10.json` uniti: 1600×900 scuro (esercente accanto alla data, righe tagliate dal bordo del pannello) e 500×844
  (esercente di 60 caratteri troncato con «…» prima dell'importo). Pubblicato il 21 novembre (sera).

## Ultima scheda tagliata nel pannello desktop — 21 novembre 2026

- Su richiesta, da uno screenshot (Fondi, desktop, tema scuro): l'ultima scheda («Risparmi») sembrava non entrare nel pannello.
- **Causa:** dal 17 novembre (`416f0db`) la `ScrollView` del pannello aveva 28 px di margine sopra e sotto, per tenere la barra di
  scorrimento lontana dagli angoli arrotondati. Quando il contenuto supera di poco l'altezza, lo scroller lo taglia su una linea
  28 px **dentro** il pannello: la scheda appare troncata a metà della superficie, non sul bordo.
- **Correzione:** `AppShell.tsx`, lo scroller riempie tutto il pannello (padding del contenuto di nuovo pieno) e porta
  `data-panel-scroll` solo con il pannello (expanded); `GlobalStyle.tsx`, per quel solo elemento e dove esiste `::-webkit-scrollbar`
  (`@supports selector(...)`): `scrollbar-width`/`scrollbar-color` riportati ad `auto` (altrimenti Chromium ignora gli stili WebKit),
  barra di 10 px con cursore `outline` arrotondato e traccia con `margin-block: 28px` (`radius.dialog`). Firefox: barra sottile
  standard per tutta l'altezza, ritagliata dagli angoli (non provato).
- **Verifica:** `npm run check` **499/499**. Chromium headless 1600×900, `dist-demo/`, Standard con `nummo-utente-medio.json` unito
  (profilo temporaneo nello scratchpad): scroller = pannello (76–781), in cima la scheda è tagliata dal bordo arrotondato, in fondo
  l'ultima scheda resta a 32 px dal bordo; barra lontana dagli angoli, chiaro e scuro; a 800 px nessun `data-panel-scroll`.
  Non provati: Firefox, Safari, Brave dell'utente (stesso motore di Chromium). Pubblicato il 21 novembre (sera).

## Collaudo v9/v10 su smartphone emulato — 21 novembre 2026

- Su richiesta. **Emulazione**, non dispositivo: Chromium headless 390×844, densità 2, touch, user agent Android, driver CDP
  persistente; `dist-demo/` di `aebd0ec`, modalità Standard. Tutti i passi del README di `docs/testing/` danno il risultato atteso
  (dettaglio lì).
- **Problemi trovati, corretti subito dopo su richiesta:**
  1. `ExpenseList.tsx`, dettagli su smartphone: `detailField` senza limite di larghezza nella riga `compactFields`; un esercente di
     60 caratteri resta su una riga, passa sotto «Modifica» ed esce dalla scheda (vale anche per categorie lunghe).
  2. `AppShell.tsx`: lo `<span>` di misura delle etichette della navigazione è `position: absolute` senza `top`/`left`, in fondo a
     `body`: il documento è alto 859 px su 844 e può scorrere di 15 px; allora fogli e dialoghi lasciano una striscia scoperta in
     basso. Presente anche prima delle modifiche di questa sessione.
  3. Archiviazione e backup su smartphone: l'anteprima del ripristino compare fuori schermo (solo il titolo sopra la navigazione).
- **Correzioni:** (1) `detailField` con `maxWidth: '100%'` e `flexShrink: 1`: il valore lungo va a capo; (2) lo `<span>` di
  misura fissato con `top`/`left` a 0 e `pointerEvents: 'none'`: documento alto quanto la finestra; (3) `BackupActions` porta
  l'anteprima in vista (`scrollIntoView` `nearest`, senza animazione con movimento ridotto). `npm run check` **499/499**.
  Riverificato in emulazione 390×844 (844/844, anteprima intera sopra la navigazione, esercente su due righe accanto a «Modifica»)
  e a 1280 px (dettagli su una riga). Pubblicato su Hosting il 21 novembre (vedi «Registro dei rilasci»).
- Non verificabili in emulazione: tastiera virtuale, safe area, gesti reali, prestazioni. Driver, server e browser chiusi.

## Collaudo v9/v10 in Avanzata — 20 novembre 2026 (notte)

- Su richiesta. Demo con `npm run emulators` + `emulators:seed` (porte standard, libere), `dist-demo/` con le correzioni di `aebd0ec`
  servito in locale, Chromium headless via CDP a 1280×900; accesso Google dal popup dell'emulatore Auth come proprietario demo
  (`demo-owner`), archivio Firestore vuoto con le categorie predefinite. Tutti i passi del README di `docs/testing/` danno il
  risultato atteso, con i testi corretti; in più, documenti letti dall'emulatore via REST: `skipped_payments` «7,10» (revisione 2),
  ID `m-a%2Fb ottica` e `m-outlet 30%25`, «Ebay» → «eBay» solo dopo Sostituisci, `merchant_id` delle spese di prova.
- Emulatori, server e browser fermati a fine prova; porte libere. Non provati: smartphone, cloud reale.

## Osservazioni del collaudo corrette — 20 novembre 2026 (notte)

Su richiesta, le quattro osservazioni del collaudo dei file v9/v10. Rules, `DataStore`, formato del backup e dati invariati.

- **Unione bloccata:** «1 elemento è diverso dai dati salvati.» al singolare (plurale da 2) e, sotto, i nomi dei primi tre elementi
  in conflitto (nomi del file, mai tradotti; «Budget mensile» e «Movimento senza nota» come etichette sintetiche), poi «altri N».
  Funzione pura `conflictPreview` in `domain/backup.ts`.
- **Esercenti nel ripristino:** il riepilogo conta gli esercenti nuovi («12 esercenti»), la conferma di «Sostituisci» conta anche
  quelli rimossi e quelli scritti. Il testo della conferma è ora «Elementi da eliminare: {p0}. Da scrivere: {p1}. …» (niente più
  «1 elementi»); «Da scrivere» comprende gli elementi diversi riscritti dal file (es. «Ebay» → «eBay»).
- **Messaggi sopra i dialoghi:** `SnackbarProvider` rende lo snackbar in un `Portal` Paper rimontato a ogni messaggio (i portali si
  impilano in ordine di montaggio): un messaggio inviato con un dialogo o un foglio aperto compare sopra lo scrim ed è cliccabile.
  Vale per tutti i messaggi dell'app. Al limite dei 60 pagamenti eliminati `removePayment` restituisce `true` (non è un errore
  temporaneo): la conferma si chiude e resta il messaggio.
- **Importo nel modulo di modifica:** `ExpenseEditor` usa `amountText` di `domain/receipt.ts` con il separatore della lingua
  («23,50» in italiano, «23.50» in inglese, come la scansione); il parser accetta entrambi. `FundEditor` usa sempre la virgola
  (non toccato).
- **Test:** `conflictPreview` (con un piano reale) in `tests/backup.test.ts`, nuove chiavi in `tests/i18n.test.ts`; traduzioni
  aggiunte e la vecchia frase della conferma rimossa da `en.ts`. `npm run check` **499/499**.
- **Riverificato nella demo** (Standard, `dist-demo/` ricostruito, Chromium headless 1280×900): anteprima v10 «27 spese · 5 categorie
  · 12 esercenti»; conferma «Elementi da eliminare: 18. Da scrivere: 44.»; 61° pagamento: conferma chiusa, messaggio sopra lo
  storico e «Chiudi» cliccabile; conflitto «1 elemento è diverso…» con «V9 Streaming»; importo «23,50» e salvataggio di «24,75»;
  in inglese «24.75», «1 item differs…» e «Items to delete: 50. To write: 1.». Non provati: smartphone (foglio dal basso con
  messaggio), «altri N» dall'interfaccia (solo test), Avanzata.

## File di collaudo v9 e v10 — 20 novembre 2026

- Su richiesta (punto 2 di «Prossime attività»). In `docs/testing/`: `nummo-pagamenti-eliminati-v9.json` (8 abbonamenti con
  `skipped_payments`: uno solo, in pausa, sul cambio di prezzo, primo pagamento annuale dopo un cambio di frequenza, limite di 60,
  rinnovo annuale, tutti quelli maturati, primo addebito dopo una prova; un fondo con budget) e `nummo-esercenti-v10.json`
  (12 esercenti: grafie, accento, apostrofo, `/` e `%` negli ID, nome di 60 caratteri, virgolette e `;` per il CSV, uno mai usato;
  27 spese, una serie con un pagamento eliminato). Prefissi `V9`/`V10`; gli esercenti senza prefisso (usare la demo).
- Generati con `makeBackup` (il v9 con il solo numero di versione cambiato) e letti con `parseBackup`; valori attesi al 20 novembre
  calcolati con il dominio e scritti in `docs/testing/README.md` (titolo ora «Backup di collaudo»), con i passi dall'interfaccia.
- Nuovo `tests/testingBackups.test.ts` (2 test): export identico al file, valori delle tabelle, ordine dei suggerimenti, piano di
  unione/sostituzione con una grafia diversa già salvata, riga CSV. `npm run check` **498/498**.
- **Importati nell'emulatore demo** (commit `6a8f890`): script temporaneo con `createFirestoreStore` e le Rules del checkout, emulatori
  dedicati (Auth 29099, Firestore 28180, config temporanea nella radice, entrambi rimossi a fine prova), archivio vuoto. v9 unito
  ed export identico (versione a parte), Lavanderia `0,…,59` accettata, seconda unione senza aggiunte; esercente «Ebay» già salvato,
  v10 unito («Ebay» conservato, ID `%2F`/`%25` accettati), poi Sostituisci (v9 rimosso, «eBay», export identico byte per byte) e
  seconda unione senza aggiunte. Esito nel README della cartella.
- **Collaudo dall'interfaccia (20 novembre, sera), modalità Standard:** `dist-demo/` servito in locale, Chromium headless pilotato via
  CDP a 1280×900, emulatori demo avviati e fermati alla fine. Tutti i passi dei due README danno il risultato atteso (dettaglio nel
  README della cartella). Le quattro osservazioni sono state corrette subito dopo (sezione seguente).
- **Non eseguiti:** Avanzata dall'interfaccia, smartphone, CSV in un foglio di calcolo reale. Nessun codice dell'app, Rules o backup modificati.

## ID icona storiche di nuovo valide — 20 novembre 2026

- Su richiesta (punto 1 di «Prossime attività»). Le ID eliminate erano **24**, non 21: ricavate dall'unione delle liste `icon in [...]`
  delle Rules in tutta la storia meno quelle attuali (`baby bed beer book briefcase bus car droplet ellipsis flame graduation leaf phone
  pill plane receipt scissors shield star ticket tree umbrella wine wrench`). Effetto prima della correzione: una sola categoria o un
  fondo con una di esse rendeva l'archivio non valido (export e modifiche bloccati); un backup che la conteneva non si importava.
- `domain/category.ts`: `legacyCategoryIconLabels` (etichette storiche), `ActiveCategoryIcon` (le 40 con tre disegni),
  `CategoryIcon` = attive + storiche, `allCategoryIconLabels` (usata da `IconPicker`), `retiredCategoryIcons` = `sofa` + storiche.
  `categoryGlyphs.ts`: l'ultimo contorno di ciascuna, ripreso dalla storia; colorato e pixel tipizzati sulle sole attive (le storiche
  ricadono sul contorno). Traduzioni inglesi: 13 dalla storia di `en.ts`, 11 scritte ora (mai esistite). Rules e copia in `public/`:
  le 24 ID aggiunte alle due liste (categorie e fondi). Nessun dato riscritto, nessuna migrazione.
- **Test:** nuovo «Rules: le due liste … accettano esattamente gli ID validi del dominio»; «icone eliminate prima del 14 novembre»
  sostituisce «stella, istruzione e birra non disegnate» (la regola del ritiro vale anche per loro); backup con `bus`/`pill`/`star`
  letto e `rocket` ancora rifiutato (l'esempio di icona non valida era `pill`); decoder Firestore con una categoria `bus`.
  `npm run check` **496/496**; `test:emulator` **22/22**.
- **Controllo dati, solo locale:** `emulator-data/` (archivio hybrid personale) contiene solo icone attuali. Produzione, archivi Standard
  nei browser e backup personali **non controllati** (servono autorizzazione o i file).
- **Pubblicato su richiesta il 20 novembre (sera):** prima le Rules, poi Hosting (vedi «Registro dei rilasci»).

## Audit React, rendering e prestazioni — 20 novembre 2026

Su richiesta: audit di rendering, stato, listener, animazioni e prestazioni con correzioni piccole e verificate. Commit `e4976be`
su `main` (il ramo di lavoro `fix/react-audit` non esiste più), pubblicato su Hosting il 20 novembre (sera) con `f3bd4df`. Rules, Auth, configurazione Firebase e `DataStore` invariati.

- **Corretto — errore di listener nascosto (media).** In `useRemoteFunds`/`useRemoteLists` i due listener condividevano un solo
  `error`, azzerato dallo snapshot dell'altro listener, da un'operazione riuscita o da `clearError` alla chiusura di un dialogo (spese e
  categorie: da un'operazione riuscita). Il listener Firestore fallito non riparte, quindi `ready` restava falso senza messaggio:
  Nuova spesa invisibile con lo spinner per sempre (Liste: spinner perpetuo). Ora `features/workspace/dataErrors.ts` (puro) tiene
  separati gli errori per listener e quello dell'operazione; lo snapshot continua ad azzerare l'errore dell'operazione dove lo faceva
  (non nelle liste, dove l'errore di una scrittura in coda arriva con lo snapshot che la annulla). Test `tests/dataErrors.test.ts` (5).
  **Riprodotto** in Chromium su emulatori dedicati (Auth 29099, Firestore 28180, config temporanea rimossa) con Rules che negano
  `movements` e un fondo scritto via REST: prima «Accesso negato…» spariva e compariva lo spinner; dopo il messaggio resta.
- **Corretto — richiesta Categorie ripetuta (bassa).** `categoriesRequest > 0` riapriva Categorie a ogni rimontaggio del workspace
  (Avanzata con cache in memoria: «Esci» e nuovo accesso senza ricarica); le altre tre richieste usavano già un `ref`. Ora le quattro
  passano da `useRequest` in `Workspace.tsx`. **Riprodotto** (secondo accesso da un'altra scheda, sincronizzazione Auth senza ricarica):
  prima «Categorie», dopo «Nuova spesa»; le quattro voci del menu aprono ancora la propria pagina.
- **Corretto — icona del FAB rianimata a ogni render (media, visiva).** In `Rail`/`Drawer` l'icona era una funzione inline: Paper
  `CrossFadeIcon` rifaceva rotazione −90°→0° e dissolvenza (200 ms, `Animated` JS che il CSS del movimento ridotto non ferma) a ogni
  cambio pagina e snapshot. Ora `useIconSource` (`useCallback` per forma). **Misurato** (hook DevTools in build di produzione, 1280×900):
  commit per navigazione 17–18 → 4–6 su Analisi/Fondi/Liste; tempo totale invariato entro il rumore (correzione visiva, non di velocità).
- **Misurato, nessun intervento:** con CPU 4× una navigazione verso una pagina già visitata costa 130–280 ms di task (desktop) e 280–460 ms
  (390×844), archivio vuoto. Le pagine sono già `memo` con props stabili; il costo è `Sections` più i suoi figli inline e la ricreazione
  degli effetti di `Activity` (scelta di progetto). Memoizzare l'oggetto di `useRemoteExpenses` è stato provato e **annullato**:
  nessuna differenza misurata (la navigazione non ri-renderizza `DataWorkspace`).
- **Limiti noti, non corretti:** etichetta del `TextInput` «Cerca» di Spese rianimata da Paper per ~200 ms quando la pagina torna visibile
  (nessuno spostamento visibile); indicatore della pillola su smartphone animato da `Animated` di RN Web con un commit da 2 componenti per
  fotogramma (voluto: molla che segue il dito). Nessun linter nel progetto. Chiavi per indice solo in liste statiche o di sola lettura
  (giorni del calendario, prodotti, segmenti dell'anello con selezione per chiave di categoria).
- **Controllato senza problemi:** cleanup di listener, timer e sottoscrizioni; risposte asincrone superate scartate (`useAiModels`,
  `useStorageProtection`, accesso del proprietario, apertura IndexedDB); valori dei Context stabili; liste lunghe di Spese paginate a 50
  con righe `memo`; transizioni solo su `transform`/`opacity`/colori, regola globale del movimento ridotto presente.
- **Non provati:** archivi grandi, telefono reale, `test:emulator` (nessun cambiamento a `DataStore`, servizi o Rules).

## Stato corrente precedente — 21 novembre 2026 (archivio)

Riepilogo sostituito il 22 novembre dal nuovo «Stato corrente» in apertura; conservato com'era per la cronologia delle pubblicazioni
del 21–22 novembre (riga «Produzione»), assente dal «Registro dei rilasci». Può dire cose superate.

Leggere questa sezione per prima: è il riepilogo aggiornato. Il «Registro dei rilasci» e le sezioni datate sotto, dal più
recente, sono cronaca delle singole fasi e possono dire cose superate.

- **Sessione del 20 novembre (chiusa).** Fatto, su richiesta: riallineamento di questo file allo stato reale; audit React di rendering,
  stato e prestazioni con tre correzioni verificate in Chromium (`e4976be`); le 24 ID icona eliminate prima del 14 novembre di nuovo
  valide e ritirate (`ad5aa73`); Rules e Hosting pubblicati; lock hybrid 25494 messo da parte. In serata/notte: rami uniti eliminati
  (14 locali, 3 remoti); file di collaudo v9/v10 con test, importati nell'emulatore e collaudati dall'interfaccia della demo; le quattro
  osservazioni del collaudo corrette (`aebd0ec`) e pubblicate su Hosting. Dettagli nelle sezioni del 20 novembre.
- **Sessione del 21 novembre (giorno).** Su richiesta: analisi iniziale con le discrepanze qui sotto, poi «Torna indietro» in «Collega il
  tuo Firebase», pulsanti della revisione dello scontrino, esercente e azioni a tutta larghezza negli abbonamenti, «Elimina» come cestino
  con contorno rosso su smartphone, Annulla/Salva a 96 accanto al cestino, Importo e Data non più tagliati; tutto committato e pubblicato
  su Hosting (ultimo `9a8285a`). Nella stessa giornata un'altra sessione ha lavorato sulla tastiera virtuale (`fdfce0e`, `1a8dc14`),
  committata a parte e pubblicata insieme: mai provata su telefono reale.
- **Discrepanze trovate all'inizio della sessione del 21 novembre e corrette qui (solo documentazione):** (1) questo riepilogo dava la
  scansione solo con AI come «non pubblicata», ma era uscita con `817a2f1`; (2) le sezioni del 21 novembre fino a `817a2f1` (pulsanti
  uniformi, icona, Templates, ordine dei servizi AI, Fragment, wifi, «Annulla» della scansione, fondo negli abbonamenti, scansione solo
  AI) finivano con «non pubblicato», e Templates chiedeva ancora di pubblicare le Rules, già pubblicate; (3) «Chiudi» con contorno era
  «non committato, non pubblicato», ma è `bdc742b`, pubblicato; (4) «Verifiche» diceva `test:emulator` sulle Rules di `ad5aa73` e Rules
  /servizi non più toccati, mentre `4144917` e `817a2f1` li toccano (il 22/22 sulle Rules dei template è nella sezione Templates); (5) la
  riga «Git» si fermava a `9ad8e02`; (6) commento in `ExpenseEditor.tsx` e sezione «Pulsanti dei dialoghi uniformi» davano per buono
  «Elimina» da solo sopra Annulla/Salva su smartphone, poi giudicato difettoso dall'utente e sostituito dal cestino (`3d1b5ea`). Le
  sezioni di questa sessione scritte «non committato» sono aggiornate con il commit. Codice e `AGENTS.md` coincidevano per il resto.
- **Analisi iniziale del 21 novembre (notte), corretta su richiesta:** la Guida («Template per le spese», IT e EN) diceva l'importo
  facoltativo, obbligatorio da `e4bf945`: ora «descrizione, importo, data, esercente, categoria e fondo»; la sezione «Fondo accanto alla
  categoria…» dava `subtitleBelow` per rimossa, ora segnata come superata. Committato in `3c8f614` e pubblicato su Hosting.
- **Feedback aptico rivisto (21 novembre, notte):** zona morta sulla barra, distanza minima tra vibrazioni, `tick` per le selezioni,
  pagina di prova delle durate; sezione dedicata qui sotto. Committato in `7dc02a2` e pubblicato su Hosting (21 novembre, notte);
  da provare sul Pixel 8 con la pagina di prova. Inviato a `origin` su richiesta.
- **Vibrazione più delicata (21 novembre, notte):** su richiesta («ancora troppo forte e zanzarosa») `tap` 10 → 6 ms e `tick` 6 → 4 ms
  (l'intensità la fissa il browser: si può solo accorciare). `npm run check` 510/510; Chromium: barra [6], segmenti/legenda [4], un
  solo impulso per tocco, nessuno in scorrimento/digitazione. Pagina di prova (anche l'artifact) aggiornata con 2–6 ms. Committato in
  `976a5cb` e pubblicato su Hosting (bundle online identico a `dist/`, con `tap:6,tick:4`); non sentito sul Pixel 8.
  **Superato da `1c7ca7f`** (punto seguente).
- **Vibrazione tolta da segmenti e legenda, impulsi 4/3 ms (21 novembre, pomeriggio):** su richiesta nessuna vibrazione su
  `SegmentedButtons` e sulle righe della legenda di Analisi; `tap` 6 → 4 ms, `tick` 4 → 3 ms; Guida senza «confronto con i periodi
  precedenti» (`e7953bf`). Committato in `1c7ca7f` e pubblicato su Hosting (15:11). Non sentito sul Pixel 8: 3 ms può essere quasi
  impercettibile.
- **Revisione dello scontrino (21 novembre, pomeriggio–sera):** su richiesta, a più riprese: foto alta quanto i campi su desktop, titolo
  «Controlla i dati», pulsanti nella colonna dei campi (da medium) o allineati ai campi (smartphone), impilati sotto 500 di colonna;
  intro del dialogo più breve (`a2029bb`). Committato in `830ac24`, `2b9e763`, `3b74ea4`, ciascuno pubblicato su Hosting. Provato poi
  nel browser da 360 a 1400 px (sezione «Revisione dello scontrino provata nel browser» qui sotto): conforme, salvo «Usa questi dati»
  troncato sotto 390 px e «Ingrandisci la foto» fra le due righe di pulsanti, corretti in `6f95a08`, pubblicato su Hosting.
- **«Template» accanto a «Scansiona scontrino» (21 novembre, sera):** su richiesta, perché «Salva» finiva sotto la navigazione su
  smartphone; pulsante distinto in `primary`, scelto un template solo l'icona della categoria. Committato in `ee2fcdc` e pubblicato su
  Hosting; sezione dedicata qui sotto.
- **Vibrazione provata nel browser emulato (21 novembre, sera):** tutti i 15 casi come previsto (sezione dedicata qui sotto); percezione
  sul Pixel 8 ancora da provare.
- **Tastiera virtuale provata nel browser emulato (21 novembre, sera):** `scripts/check-keyboard.mjs` su `dist-demo`: transizioni in un
  fotogramma ovunque (campo alto/basso, dialogo, 3–4 passi, cambio campo, CPU ×4, 360×640). Su richiesta, 24 px di margine sotto il
  campo riportato in vista (prima a filo della tastiera a 360×640). Committato in `62e3639` e pubblicato su Hosting; sezione dedicata qui sotto.
- **Vibrazione 6/5 ms, barra che spariva, scansione spenta (21 novembre, notte):** su richiesta; sezione dedicata qui sotto.
  Committato in `1518b0c`, pubblicato su Hosting insieme a `1c83b54`.
- **Stessa sessione, dopo:** «Ripristina predefiniti» completo e `gemini-3.5-flash-lite` consigliato (`dabe2eb`), «Annulla»/«OK» più piccoli
  nel selettore della data (`01c2b7f`); con la guida «Collega il tuo Firebase» dell'altra sessione (`8c1ff66`, committata su richiesta
  dopo `npm run check` OK **520/520** sull'albero completo) pubblicati su Hosting il 21 novembre (notte) con `npm run deploy:hosting`:
  «Deploy complete!», sito 200, bundle online identico a `dist/` (SHA-256). Rules invariate. Da provare sul telefono.
- **Spese offline, pagina offline, passaggio dei dati tra le modalità (21 novembre, notte; altra sessione, in parallelo alla
  precedente):** su richiesta; sezione dedicata qui sotto. `npm run check` **520/520**, `test:emulator` **22/22**, provato nel browser con la
  demo. Committato in `1c83b54`, inviato e pubblicato su Hosting su richiesta (con `1518b0c` della sessione sulla vibrazione): «Deploy
  complete!», sito 200, bundle, `sw.js` e `offline.html` online identici a `dist/`. Rules invariate. Da provare sul telefono.
- **Nuovo testo della guida «Collega il tuo Firebase» (21 novembre, notte):** su richiesta, dalla bozza concordata; sezione dedicata qui
  sotto. Committato in `8c1ff66` e pubblicato su Hosting (vedi punto sopra). Restano concordati e non fatti: link diretti alla Console, sito senza progetto di base,
  «Collega un altro dispositivo».
- **Prossima sessione, priorità consigliate:** (0) sul telefono, ricaricare l'app e provare: vibrazione su Android (tocco e trascinamento
  sulla barra, blocchi e ciambella di Analisi, «Salva»/«Crea», interruttore «Vibrazione» spento; impulsi da 6/5 ms percepibili?);
  revisione dello scontrino su telefono reale (vista nel browser emulato il 21 novembre); tastiera virtuale (aprire e chiudere su
  un campo in basso e in un dialogo: nessun doppio salto; iOS, anche il campo che resta in vista con la tastiera che si apre a passi), modifica spesa a 360–412 px (cestino, Annulla/Salva, Data sotto l'Importo
  sotto 412), azioni degli abbonamenti, revisione dello scontrino; poi in produzione: pagina Templates (in Avanzata compaiono i
  template salvati prima del 16 novembre, se ce n'erano), scansione dello scontrino da attivare in Impostazioni, pulsanti dei dialoghi,
  nuova icona (la cache del browser o del launcher può mostrare ancora quella vecchia); (1) in produzione, ricaricare l'app e provare un archivio o un backup con un'icona
  storica (se ne esistono), una spesa con esercente, l'eliminazione di un pagamento e «Esci»/nuovo accesso; (2) collaudo su telefono
  reale (elenco «Da verificare su dispositivo» qui sotto); (3) facoltativo, su decisione dell'utente: linter con le regole degli hook
  React (nuova dipendenza), misura delle prestazioni con un archivio grande; collaudo su telefono reale (tastiera virtuale, safe area,
  gesti) dei file v9/v10 e delle correzioni del 21 novembre, già pubblicate.
- **Git (21 novembre).** `main` allineato a `origin/main`, tutto inviato su richiesta; solo il ramo `main`, in locale e su
  `origin`. Ultimi commit di codice, tutti pubblicati: `8bf4f4d` (separatore delle schede, menu «immagine», vibrazione 5/4 solo touch), `314064b` (matita dei template da 28 dp), `e008fcd` (nessun campo «Chiave API» nella scansione, «Vibrazione» e telefono in
  silenzioso), `1934641` (dettagli di una categoria in Analisi, vibrazione 8/7 ms, barre di scorrimento senza frecce), `cffe2e8` («Esci» riporta alla scelta della modalità), `69566dc` (scheda «Dati della modalità Standard», test del passaggio stabile), `8c1ff66` (guida «Collega il tuo Firebase»), `01c2b7f` («Annulla»/«OK» 88×40 nel
  selettore della data), `dabe2eb` («Ripristina predefiniti» completo, `gemini-3.5-flash-lite`), `1c83b54` (spese offline in Avanzata,
  pagina offline, passaggio dei dati tra le modalità), `1518b0c` (vibrazione 6/5 ms, barra che spariva, scansione spenta di base,
  pulsante «Template» invariato), `3ad9a75` (testo «Il pulsante Template compare…», documenti, lock hybrid), `ee2fcdc` (pulsante «Template» accanto a «Scansiona scontrino»), `62e3639` (24 px tra campo attivo e tastiera virtuale), `6f95a08` («Usa i dati» sotto 390 px, «Ingrandisci la foto»
  sulla riga del primo pulsante impilato), `3b74ea4`, `2b9e763`, `830ac24` (revisione dello scontrino: foto, pulsanti,
  titolo «Controlla i dati»), `a2029bb` (intro del dialogo di scansione più breve), `1c7ca7f` (vibrazione tolta da segmenti e legenda,
  4/3 ms), `e7953bf` (Guida senza confronto con i periodi precedenti), `26c5b8d` (Barre di Analisi senza variazione percentuale), `a29ced9` (vibrazione su «Salva»/«Crea», matita dei
  template con contorno, nessun messaggio dopo il salvataggio), `976a5cb` (vibrazione più delicata, 6/4 ms), `3c8f614` (Guida: importo dei template obbligatorio), `7dc02a2` (vibrazione senza ronzio), `e4bf945` (importo obbligatorio nei template, matita nell'elenco, fondo a capo in
  Analisi su smartphone, testo di «Vibrazione»), `b2a80ce` (vibrazione su legenda e segmenti), `9ae0d33` (selezione di
  Analisi più reattiva), `a8f73a2` (formattatori Intl in cache), `cc60ea6` («Crea»/«Salva» a pillola), `278b016` (fondo accanto alla
  categoria in Analisi), `4d69d04` (feedback aptico), `0f218da` (tastiera a passi, altra
  sessione), `9a8285a` (Importo e Data su smartphone), `1a8dc14` (tastiera, altra
  sessione), `8e513f4` (Annulla/Salva a 96), `3d1b5ea` («Torna indietro», scansione, abbonamenti, cestino), `fdfce0e` (tastiera, altra
  sessione), `bdc742b` («Chiudi» con contorno), `817a2f1` (template, pulsanti uniformi, icona), `e72bc6f`, `4144917` (scansione solo AI).
  Prima, pubblicati con `817a2f1`: `9ad8e02` (pulsanti di prova delle notifiche nascosti
  dietro `pushTests`, più documenti), `9dd0880` (tre pulsanti di Archiviazione e backup della stessa larghezza), `661b984` (avatar del
  fondo nei dettagli), `0e536a5` (riga dissolta anche su smartphone). Prima, pubblicati: `de79c95` («Fondo» nei dettagli), prima `42d9beb` (riga dissolta nel pannello), prima `41a54ab` (righe intere nel pannello, esercente tolto dai dettagli), prima `e3fb997` (esercente accanto alla data), prima `231d22c` (pannello desktop), poi
  `78b424d` (correzioni del collaudo su smartphone emulato), prima `aebd0ec` (osservazioni del
  collaudo). L'hash di testa non si scrive qui: ogni commit che lo registrasse lo renderebbe superato; i commit che toccano solo
  documenti non sono elencati.
- **Ambiente (20 novembre).** Un altro runner hybrid (PID 25494, avviato il 17 alle 20:30) si era fermato senza pulizia. Su richiesta,
  dopo aver verificato che il processo non c'era più e che le porte erano libere: rimossa la config `.nummo-hybrid-25494.json` dalla
  radice e rinominato il lock in `.firebase/hybrid.lock.stale-25494`. `npm run dev` non è più bloccato. Gli altri `stale-*` sono conservati.
- **Produzione (progetto `nummo-6b6e2`).** **Rules e Hosting** da `17632af` pubblicati su richiesta il 22 novembre, nell'ordine: Rules (`firebase deploy --only firestore:rules --project nummo-6b6e2`: compilazione OK, «Deploy complete!»; importo fino a 999.999.999,99 €, prezzi compatti fino a 143 caratteri), poi `npm run deploy:hosting` («Deploy complete!»), sito 200, bundle online identico a `dist/` (SHA-256), `sw.js`, `offline.html` e `firestore.rules` pubblici identici. Contiene: Indietro di Android, immagine del profilo (Standard e Avanzata, avatar astratti), blocco dell'app, importo massimo e campo Importo, barra dei menu, limiti dei campi. Chi ha collegato il proprio Firebase deve ricopiare le Rules. Prima, **Hosting** da `8bf4f4d` (separatore delle schede, niente menu «immagine» al tocco
  prolungato, vibrazione 5/4 ms solo su touch) pubblicato su richiesta il 22 novembre con `npm run deploy:hosting`: «Deploy complete!», sito
  200, bundle online identico a `dist/` (SHA-256, con `tap:5,tick:4`). Rules invariate. Prima, **Hosting** da `314064b` (matita dei template da 28 dp) pubblicato su richiesta il 21 novembre
  (notte) con `npm run deploy:hosting`: «Deploy complete!», sito 200, bundle online identico a `dist/` (SHA-256). Rules invariate.
  Prima, **Hosting** da `e008fcd` (nessun campo «Chiave API» nel dialogo di scansione; testo di
  «Vibrazione» sul telefono in silenzioso) pubblicato su richiesta il 21 novembre (notte) con `npm run deploy:hosting`: «Deploy complete!»,
  sito 200, bundle online identico a `dist/` (SHA-256). Rules invariate. Prima, **Hosting** da `1934641` (dettagli di una categoria in Analisi, vibrazione 8/7 ms, barre di
  scorrimento senza frecce dell'altra sessione) pubblicato su richiesta il 21 novembre (notte) con `npm run deploy:hosting`: «Deploy
  complete!», sito 200, bundle online identico a `dist/` (SHA-256, con `tap:8,tick:7`). Rules invariate. Prima, **Hosting** da `cffe2e8` («Esci» riporta alla scelta della modalità) pubblicato su richiesta
  il 21 novembre (sera tardi) con `npm run deploy:hosting`: «Deploy complete!», sito 200, bundle online identico a `dist/` (SHA-256). Rules
  invariate. Prima, **Hosting** da `69566dc` (scheda «Dati della modalità Standard», note con asterisco)
  pubblicato su richiesta il 21 novembre (sera tardi) con `npm run deploy:hosting` da un worktree pulito di `69566dc` (l'albero principale
  aveva modifiche non committate di un'altra sessione a `App.tsx`/`useSession.ts`, escluse): «Deploy complete!», sito 200, bundle online
  identico a quello costruito (SHA-256). Rules invariate. Prima, **Hosting** da `1c83b54` (con `1518b0c`; spese offline, pagina offline, passaggio dei dati,
  vibrazione 6/5 ms) pubblicato su richiesta il 21 novembre (notte): «Deploy complete!», sito 200, bundle, `sw.js` e `offline.html` identici
  a `dist/`. Prima, **Hosting** da `3ad9a75` (testo «Il pulsante Template compare…») pubblicato su richiesta il
  21 novembre (notte): «Deploy complete!», sito 200, bundle online identico a `dist/`. Prima, **Hosting** da `ee2fcdc` (pulsante «Template» nella prima riga di Nuova spesa) pubblicato su
  richiesta il 21 novembre (sera): «Deploy complete!», sito 200, bundle online identico a `dist/`. Prima, **Hosting** da `62e3639` (24 px tra il campo riportato in vista e la tastiera virtuale)
  pubblicato su richiesta il 21 novembre (sera): «Deploy complete!», sito 200, bundle online identico a `dist/`. Prima, **Hosting** da `6f95a08` («Usa i dati» sotto 390 px, «Ingrandisci la foto» sulla riga del
  primo pulsante impilato) pubblicato su richiesta il 21 novembre (sera): «Deploy complete!», sito 200, bundle online identico a `dist/`.
  Prima, **Hosting** da `3b74ea4` (revisione dello scontrino: pulsanti uguali su smartphone, foto fino
  alla Categoria su desktop, pulsanti impilati in colonna stretta) pubblicato su richiesta il 21 novembre (sera): «Deploy complete!», sito
  200. Prima, **Hosting** da `2b9e763` e, prima ancora, da `830ac24` (revisione dello scontrino), stessa giornata, «Deploy complete!»,
  sito 200; per questi tre il bundle online non è registrato come confrontato con `dist/`. Prima, **Hosting** da `1c7ca7f` (con `e7953bf`;
  vibrazione 4/3 ms, niente vibrazione su segmenti e legenda) il 21 novembre alle 15:11: bundle identico a `dist/`, con la modifica
  di `ScanReceiptDialog.tsx` poi committata in `a2029bb` (vedi «Registro dei rilasci»). Rules invariate.
  Prima, **Hosting** da `26c5b8d` (Barre senza variazione percentuale; con `a29ced9`, vibrazione su «Salva»/«Crea», matita
  dei template, nessun messaggio dopo il salvataggio) pubblicato su richiesta il 21 novembre: «Deploy complete!», sito 200; bundle online non confrontato con `dist/`. Rules invariate.
  Prima, **Hosting** da `976a5cb` (vibrazione più delicata, 6/4 ms) pubblicato su richiesta il
  21 novembre (notte): «Deploy complete!», sito 200, bundle identico a `dist/`. Prima, **Hosting** da `7dc02a2` (feedback aptico senza ronzio; con `3c8f614`, testo dei template
  nella Guida) pubblicato su richiesta il 21 novembre (notte): «Deploy complete!», sito 200, bundle online identico a `dist/` (SHA-256).
  Rules invariate. Prima, **Hosting** da `e4bf945` (importo obbligatorio nei template, matita, fondo a capo in Analisi
  su smartphone, testo di «Vibrazione») pubblicato su richiesta il 21 novembre (sera): «Deploy complete!», sito 200, bundle online identico
  a `dist/`. Prima, **Hosting** da `b2a80ce` (vibrazione su legenda e segmenti; con `9ae0d33`, selezione di Analisi
  più reattiva, e `a8f73a2`, formattatori in cache) pubblicato su richiesta il 21 novembre (pomeriggio): «Deploy complete!», sito 200, bundle
  online identico a `dist/`. Prima, **Hosting** da `cc60ea6` («Crea» dei template a tutta larghezza, «Salva» e «Crea» a pillola;
  con `278b016`, fondo accanto alla categoria nei dettagli di Analisi su smartphone) pubblicato su richiesta il 21 novembre (pomeriggio):
  «Deploy complete!», sito 200, bundle online identico a `dist/`. Prima, **Hosting** da `4d69d04` (feedback aptico nella barra mobile e in Analisi, interruttore
  «Vibrazione»; con `0f218da`, tastiera aperta a passi) pubblicato su richiesta il 21 novembre (pomeriggio): «Deploy complete!», sito 200,
  bundle online identico a `dist/`. Prima, **Hosting** da `9a8285a` (Importo e Data non più tagliati su smartphone; con `1a8dc14`,
  raggruppamento della tastiera come funzione pura) pubblicato su richiesta il 21 novembre (pomeriggio). Prima, **Hosting** da `8e513f4` (Annulla/Salva a 96 su smartphone accanto al cestino) pubblicato su
  richiesta il 21 novembre (pomeriggio). Prima, **Hosting** da `3d1b5ea` pubblicato su richiesta il 21 novembre (mezzogiorno): tastiera
  virtuale nello stesso fotogramma (`fdfce0e`), «Torna indietro» in «Collega il tuo Firebase», pulsanti della revisione dello scontrino,
  esercente negli abbonamenti, cestino con contorno rosso su smartphone. Prima, **Hosting** da `bdc742b` («Chiudi» con contorno) pubblicato su richiesta il 21 novembre
  (notte, quarta parte). Prima, **Rules e Hosting** da `817a2f1` pubblicati su richiesta il 21 novembre (notte, terza
  parte): template, scansione solo AI, pulsanti uniformi, icona; dettagli nel «Registro dei rilasci». Prima, **Hosting** da `de79c95` pubblicato su richiesta il 21 novembre (notte, seconda parte):
  riga tagliata dissolta verso il bordo del pannello, «Fondo» nei dettagli della spesa; sito 200, bundle identico a `dist/`. Prima,
  **Hosting** da `41a54ab` pubblicato su richiesta il 21 novembre (notte): righe intere sul
  bordo del pannello desktop, esercente tolto dai dettagli; sito 200, bundle identico a `dist/`. Da provare in Brave: nessuna riga a
  metà in fondo al pannello, apertura dell'ultima riga visibile. Prima, **Hosting** da `e3fb997` pubblicato su richiesta il 21 novembre (sera) con
  `npm run deploy:hosting`: «Deploy complete!», sito 200, bundle online identico a `dist/`. Da provare: pannello desktop in Brave
  (righe tagliate dal bordo arrotondato, barra lontana dagli angoli), Firefox, esercente accanto alla data su telefono. Prima, **Hosting** da `f614f65` (codice di `78b424d`) pubblicato su richiesta il 21 novembre
  con `npm run deploy:hosting`: «Deploy complete!», sito 200, bundle online identico a `dist/`. Da provare sul telefono: dettagli
  di una spesa con esercente lungo, anteprima del ripristino, fogli e dialoghi senza striscia in basso. Prima, **Hosting** da
  `0765e5c` (codice di `aebd0ec`) pubblicato su richiesta il 20 novembre (notte) con `npm run deploy:hosting`: «Deploy complete!», sito 200, bundle online identico a `dist/`. Da provare in produzione:
  il ripristino da backup (riepilogo con gli esercenti, conflitto con i nomi) e un messaggio con un dialogo aperto. Prima, il 20 novembre (sera), nell'ordine: **Rules** da `ad5aa73`
  (`firebase deploy --only firestore:rules --project nummo-6b6e2`, compilazione OK, «Deploy complete!»: le 24 ID icona storiche
  ammesse per categorie e fondi), poi **Hosting** da `f3bd4df` (`npm run deploy:hosting`, «Deploy complete!», sito 200, bundle online
  identico a `dist/`): audit React e ID icona storiche. Worker `nummo-push` invariato (ripubblicato dall'utente per `f454d12`).
  Da provare in produzione: un archivio o un backup con un'icona storica, se ne esistono. Cronologia nel «Registro dei rilasci» qui sotto.
- **Terzo riallineamento documentale (21 novembre, sera).** Su richiesta, dopo una verifica (`main` = `origin/main`, albero pulito,
  `npm run check` OK **509/509** su `3b74ea4`): «Git», «Produzione», «Registro dei rilasci» e «Prossime attività» fermi a `26c5b8d`
  (mancavano `e7953bf`, `1c7ca7f`, `a2029bb`, `830ac24`, `2b9e763`, `3b74ea4`, tutti pubblicati); vibrazione 6/4 ms data come attuale
  (oggi 4/3); sezione 4/3 ms senza commit/rilascio; «Funzionalità implementate» con la variazione delle Barre, rimossa. `AGENTS.md` e
  codice coincidevano. Nessun codice toccato.
- **Secondo riallineamento documentale (21 novembre, pomeriggio).** Su richiesta, dopo una verifica (`main` = `origin/main`, albero
  pulito, `npm run check` OK **502/502**): corretti «Funzionalità implementate» (scansione solo AI, Templates, backup v11), «Prossime
  attività» (Rules del 20–21 novembre), tre sezioni ancora «Non pubblicato» (`9ad8e02`, `9dd0880`, `0e536a5`/`661b984`, usciti con
  `817a2f1`), «Scansiona di nuovo» di testo (superato); in `AGENTS.md` campi di `nummo.receiptAi.v1` e `BackButton`. Nessun codice toccato.
- **Riallineamento documentale (21 novembre).** Su richiesta: verificato il repository (`main` = `origin/main` dopo un fetch, albero
  pulito, `npm run check` OK **499/499**) e corrette le sezioni finali di questo file rimaste indietro («Funzionalità implementate»,
  «Problemi aperti», «Prossime attività»), più la riga `scripts/` di `AGENTS.md`. Nessun codice toccato.
- **Verifiche (21 novembre, sera tardi, ultime).** `npm run check` OK sull'albero di `c48ab1b` più la fase «Dati della modalità Standard»
  (typecheck, **520/520**, build demo); `test:emulator` **22/22** l'ultima volta su `1c83b54` (passaggio dei dati tra le modalità); da allora
  Rules, `DataStore` e servizi invariati. I due punti seguenti sono precedenti.
- **Verifiche (21 novembre, sera).** `npm run check` OK su `3b74ea4` (typecheck, **509/509**, build demo), albero pulito, `main` =
  `origin/main` dopo un fetch. `test:emulator` non rieseguito: Rules, `DataStore` e servizi invariati da `817a2f1`.
- **Verifiche (21 novembre, notte).** `npm run check` OK (typecheck, **510/510**, build demo) su `0fa04a9`; dopo `a29ced9` e `26c5b8d` solo typecheck e
  `npm test` OK (**509/509**, un test in meno per il confronto delle Barre rimosso), senza rifare `npm run check` né la build demo (il deploy ricostruisce il bundle cloud).
  Prima: **507/507** su `e4bf945` (507 anche su `b2a80ce`). `test:emulator` **22/22** l'ultima volta sulle Rules dei template
  (`817a2f1`); da allora Rules, `DataStore` e servizi non sono cambiati (il dominio solo nella validazione del modulo dei template).
- **Verificato dall'utente sul telefono (17 novembre):** con la fotocamera nella pagina (`23f8a55`) la barra di stato non diventa
  più nera.
- **Da provare in produzione (Avanzata, cloud):** spesa con esercente; eliminazione di un pagamento; accesso → ricarica → «Esci» (la
  pagina si ricarica sulla schermata di accesso e la cache su disco si cancella) → nuovo accesso.
- **Da verificare su dispositivo:** «Carica foto» (galleria) e scansione con l'AI da telefono; blocco dello zoom con due dita (Android
  e iPhone); ritocchi mobile del 17 novembre su iPhone reale e scheda AI con Gemini reale; icona dell'app (cache del launcher), filtri
  di Spese/Analisi e dissolvenza del segnaposto d'avvio sul Pixel 8; tastiera automatica di Nuova lista/Nuovo fondo (su iOS
  probabilmente non si apre).
- **Notifiche su telefono.** Icona doppia e segnaposto «N» risolti e verificati (sezione «immagine grande trasparente»).
  Consegna reale ad app chiusa (orario scelto, fuso diverso da Roma, rinnovi) non verificata.
- **Ambiente (17 novembre).** Il runner hybrid avviato il 16 alle 17:26 (PID 40726) si è fermato senza export (riavvio del sistema
  il 17 alle 20:03): `npm run dev` rifiutava l'avvio per il lock rimasto. Ispezione: processo inesistente, porte 8180/9099/4000/4400/8081
  libere, cartelle di sessione `.firebase/hybrid-I8KNPH` e `hybrid-iw5CbO` senza export, `emulator-data/` invariato dall'export del
  16 alle 03:42 (eventuali dati scritti in hybrid dopo le 17:26 del 16 sono andati persi con l'emulatore). Su richiesta: lock rinominato
  in `.firebase/hybrid.lock.stale-40726`, config `.nummo-hybrid-40726.json` rimossa dalla radice. Le altre cartelle e i lock
  `stale-*` in `.firebase/` sono conservati. Il prossimo `npm run dev` legge le Rules attuali (con gli esercenti).
- **Issue.** #4 e #5 **chiuse** su richiesta il 15 novembre con un commento ciascuno: #4 limite di piattaforma (barra
  `#121212` nell'app installata, non cambiabile dalla pagina), #5 splash di Android/Chrome lasciata com'è più la
  dissolvenza lato app; nessuna issue aperta. La dissolvenza non è stata riprovata sul telefono dopo la pubblicazione.
- **Ambiente (21 novembre, sera tardi).** Runner hybrid **attivo** dell'utente: PID 36786 (`node scripts/dev-hybrid.ts --clear`, avviato
  alle 22:59, progetto `nummo-6b6e2`), con il suo lock `.firebase/hybrid.lock` e la config `.nummo-hybrid-36786.json`: non toccarli
  finché il processo esiste; se si ferma senza pulizia, ispezionare come per il 81456 (punto seguente).
- **Ambiente (21 novembre, notte).** Il runner hybrid PID 81456 (`npm run dev` del 21 alle 01:20, progetto `nummo-6b6e2`) si è
  fermato senza pulizia: processo inesistente, porte 8180/9099/4000/4400/8081 libere, cartella di sessione `.firebase/hybrid-qVvetQ`
  con la sola `cli-config`, `emulator-data/` fermo all'export del 16 alle 03:42 (eventuali dati scritti in hybrid dal 21 alle 01:20
  persi con l'emulatore). Su richiesta: lock rinominato in `.firebase/hybrid.lock.stale-81456`, config `.nummo-hybrid-81456.json`
  rimossa dalla radice; le altre cartelle e i `stale-*` conservati. `npm run dev` non è più bloccato.
- **Quarto riallineamento (21 novembre, notte).** Su richiesta, dopo una verifica (`main` = `origin/main` dopo un fetch, albero pulito,
  `npm run check` OK **509/509** su `118b446`): runner hybrid dato per attivo ma fermo (punto sopra); testo «Il campo Template compare…»
  diventato «Il pulsante Template compare…» (IT/EN, `ExpenseForm.tsx`, `en.ts`); «Funzionalità implementate» e `AGENTS.md` con il
  pulsante «Template» invece del campo; etichetta breve «Scansiona» sotto 380 px (da `d66d3db`) ora citata in `AGENTS.md`.
- **Idee concordate:** `TODO.md` (precompilazione via link, Firebase unico per tutti).
- **Cosa resta aperto** (dettagli in «Prossime attività», in fondo al file): Avanzata con notifiche e riepilogo mai provata nel
  browser (solo test di dominio), telefoni reali e Safari/iOS/Firefox (protezione locale e richiesta di Firefox), collaudo in demo
  con `docs/testing/`, tastiera automatica di Nuova lista/Nuovo fondo su telefono reale.

## Registro dei rilasci — dal 15 novembre 2026

Dal più recente; ogni rilascio è stato fatto su richiesta. Dettagli nelle sezioni datate più sotto.

- **Rilasci del 23 novembre** (solo Hosting, dal più recente): `d196dc9`, `695a5c4` e `bafadd3` (24 novembre), `de199c7` (fogli, pillole, Elimina rosso), `7bfa99b` (pannelli come schermi), `9e032b8` (dettaglio di spese e abbonamenti), `da3103e` (accenti del tema chiaro), `e3c250e` (audit mobile), `d633282` (template dopo template),
  `72fcf5a` (cambio tema animato, menu dell'account, vibrazione solo nell'app, tema chiaro più deciso). Esiti nello «Stato corrente».

- **Rilasci successivi del 22 novembre** (dal più recente): Hosting da `fa06adb` (articolo eliso nei testi delle notifiche), `2b1e8fb`
  (notifiche dell'app Android 0.3.0), `0f340bf` (app 0.2.0, Avanzata con l'accesso Google nativo), `759792c` (app Android con ponte
  nativo); Rules da `48361b9` (500 prodotti per lista); Rules e Hosting da `17ebce0` (piani dei fondi a 120 voci), `f4691aa` (limiti degli
  abbonamenti), `f57b1b9` (cambi di stato fino a 40); Hosting da `a4cbef0`, `1e5c615`, `3994330`, `a13e54c`, `49a7c58`, `67f4a29`,
  `9929c8f`. Esiti e bundle nel «Dettaglio dei rilasci del 22–23 novembre», qui sotto.
- **Dettaglio dei rilasci del 22–23 novembre** (spostato dallo «Stato corrente» al riallineamento del 23 novembre, testo invariato:
  le voci «Produzione», «App Android», «Release dell'app Android» e «Git» com'erano allora):

  - **Produzione (progetto `nummo-6b6e2`).** Ultimo **Hosting**: `e3c250e` (23 novembre, su richiesta: audit mobile, `#root` sull'area
    visibile con la tastiera di iOS, barre di sistema che seguono il cerchio del cambio tema), pubblicato con `npm run deploy:hosting`
    dall'albero principale pulito (uguale al commit): «Deploy complete!», bundle online `index-3ee80b89…` identico a quello compilato
    (SHA-256), `sw.js` e `offline.html` identici, `index.html` online con `--nummo-viewport-top`. Rules invariate. Arriva all'app Android
    senza un nuovo APK. Prima `d633282` (23 novembre, su richiesta: template dopo template senza
    importo ed esercente del precedente, più tutto il codice fino a `f74ff3a`), da una worktree pulita (rimossa; il lavoro non committato
    di un'altra sessione escluso): «Deploy complete!», bundle online `index-8c4df371…` identico a quello compilato (SHA-256), `sw.js`
    identico. Rules invariate. Prima `72fcf5a` (23 novembre, su richiesta: cambio tema animato e più lento,
    menu dell'account senza limite di altezza, vibrazione solo nell'app Android, tema chiaro più deciso, schede delle spese piene),
    pubblicato con `npm run deploy:hosting` da una worktree pulita (rimossa, con la copia di `.env.production.local`): «Deploy complete!»,
    bundle online `index-e41d56f4…` identico a quello compilato (SHA-256), `sw.js` identico. Rules invariate. Arriva anche all'app Android
    (0.3.1) senza un nuovo APK. Prima `fa06adb` (articolo eliso nei testi delle notifiche), pubblicato su
    richiesta il 22 novembre con `npm run deploy:hosting` («Deploy complete!»): bundle online `index-053e3738…` e `sw.js` identici ai locali.
    Prima `2b1e8fb` (notifiche dell'app Android 0.3.0, bundle `index-4a671be6…`, identico a `dist/`), prima `0f340bf` (app Android 0.2.0,
    bundle `index-9fe2b72e…`). Ultime **Rules**: `48361b9` (invariate da allora). In ordine inverso: **Rules** da `48361b9` (prodotti per lista fino a 500: `list_items` ≤ 30499) pubblicate su
    richiesta il 22 novembre (`firebase deploy --only firestore:rules --project nummo-6b6e2`: «compiled successfully», «Deploy complete!»);
    **Hosting** poi pubblicato con `759792c` (app Android, vedi sotto): online `index-18586346…`, che comprende i 500 prodotti; verificato
    il 22 novembre ricompilando da `HEAD` pulito (`7b7ad76`) con `npm run build:cloud`: stesso bundle, stesso SHA-256 di quello online. Prima, **Rules e Hosting** da `17ebce0` (piani dei fondi fino a 120 voci) pubblicati su richiesta il
    22 novembre, nell'ordine: Rules («compiled successfully», «Deploy complete!»), poi `npm run deploy:hosting` («Deploy complete!»), bundle
    online `index-040a3433…` identico a `dist/` (SHA-256), `firestore.rules` pubblico identico. Chi ha il proprio Firebase deve ricopiare le
    Rules. Prima, **Rules e Hosting** da `f4691aa` (limiti degli abbonamenti: 1000 cambi di stato, 100 cambi di
    frequenza, 1000 pagamenti eliminati, 5000 occorrenze) pubblicati su richiesta il 22 novembre, nell'ordine: Rules
    (`firebase deploy --only firestore:rules --project nummo-6b6e2`: «compiled successfully», quindi la forma con `split` è accettata dal
    server; «Deploy complete!»), poi `npm run deploy:hosting` («Deploy complete!»), bundle online `index-d1e508c4…` identico a `dist/`
    (SHA-256), `firestore.rules` pubblico identico. Chi ha collegato il proprio Firebase deve ricopiare le Rules. Prima, **Hosting** da `a4cbef0` (Indietro che non esce più dopo uno o due passi, anello degli avatar)
    pubblicato su richiesta il 22 novembre con `npm run deploy:hosting`: «Deploy complete!», bundle online `index-46bee5bd…` identico a `dist/`
    (SHA-256). Rules invariate (quelle di `f57b1b9`). Prima, **Rules e Hosting** da `f57b1b9` pubblicati su richiesta il 22 novembre, nell'ordine: Rules
    (`firebase deploy --only firestore:rules --project nummo-6b6e2`: compilazione OK, «Deploy complete!»; cambi di stato fino a 40), poi
    `npm run deploy:hosting` («Deploy complete!»), bundle online `index-79ab0459…` identico a `dist/` (SHA-256), `firestore.rules` pubblico
    identico. Chi ha collegato il proprio Firebase deve ricopiare le Rules (oltre 8 cambi di stato). Prima, **Hosting** da `1e5c615` pubblicato su richiesta il 22 novembre con `npm run deploy:hosting`:
    «Deploy complete!», bundle online `index-5c7ec78e…` identico a `dist/` (SHA-256). Rules invariate (quelle di `17632af`).
    Prima, **Hosting** da `3994330` pubblicato su richiesta il 22 novembre con `npm run deploy:hosting`:
    «Deploy complete!», bundle online `index-bac866b2…` identico a `dist/` (SHA-256; per qualche secondo il CDN serviva ancora il precedente).
    Rules invariate (quelle di `17632af`). Prima, **Hosting** da `a13e54c` pubblicato su richiesta il 22 novembre con `npm run deploy:hosting`:
    «Deploy complete!», bundle online `index-04eef827…` identico a `dist/` (SHA-256; per qualche secondo dopo il rilascio il CDN serviva
    ancora l'HTML precedente). Rules invariate (quelle di `17632af`). Prima, **Hosting** da `49a7c58` pubblicato su richiesta il 22 novembre con `npm run deploy:hosting`:
    «Deploy complete!», bundle online `index-fe24bc41…` identico a `dist/` (SHA-256). Rules invariate (quelle di `17632af`).
    Prima, **Hosting** da `67f4a29` (template senza data) pubblicato su richiesta il 22 novembre (sera):
    «Deploy complete!», sito 200, bundle online identico a `dist/` (SHA-256; la prima lettura subito dopo il rilascio dava ancora l'HTML
    precedente, poi quello nuovo). Rules invariate dal `17632af` (nessuna differenza; `firestore.rules` pubblico identico): non ripubblicate.
    Prima, **Hosting** da `9929c8f` pubblicato su richiesta il 22 novembre (sera) con
    `npm run deploy:hosting`: «Deploy complete!», sito 200, bundle online identico a `dist/` (SHA-256). Rules invariate (quelle di `17632af`).
    Prima, **Rules e Hosting** da `17632af`, pubblicati su richiesta il 22 novembre nell'ordine: Rules
    (compilazione OK, «Deploy complete!»), poi `npm run deploy:hosting` («Deploy complete!»), sito 200, bundle online identico a `dist/`
    (SHA-256), `sw.js`, `offline.html` e `firestore.rules` pubblici identici. Rilascio precedente: Hosting da `8bf4f4d` (22 novembre, notte).
    Chi ha collegato il proprio Firebase deve ricopiare le Rules (importi oltre 99.999,99 €). Cronologia completa: «Registro dei rilasci» e,
    per il 21–22 novembre, «Stato corrente precedente».
  - **App Android 0.3.1 (22 novembre):** notifiche come notifiche locali dell'app (0.3.0, `2b1e8fb`), articolo eliso nei testi (0.3.1,
    `fa06adb`); commit inviati, Hosting pubblicato. Provate sull'emulatore Android 17 e, con l'app di debug (poi disinstallata), sul Pixel 8:
    tre notifiche all'orario esatto. **Release 0.3.1 installata sul Pixel 8** via adb (stessa chiave; `USE_EXACT_ALARM` concesso,
    `POST_NOTIFICATIONS` da chiedere con «Attiva»): da provare a orario reale. Sezione «App Android 0.3.0» qui sotto.
  - **App Android 0.2.0 (22 novembre):** Avanzata con l'accesso Google nativo (Credential Manager), app Android registrata in
    `nummo-6b6e2`. Committata in `0f340bf`, inviata, Hosting pubblicato su richiesta (`npm run deploy:hosting`: «Deploy complete!», bundle
    online `index-9fe2b72e…` identico a `dist/`, SHA-256), Rules invariate; release 0.2.0 installata sul Pixel 8 via adb sopra la 0.1.0.
    Da provare sul telefono: accesso Google reale, uscita e nuovo accesso. Sezione «App Android 0.2.0» qui sotto.
  - **App Android (22 novembre):** `android/` (WebView + ponte nativo, solo Standard) e modifiche web del ponte, committate in `759792c`,
    inviate e pubblicate su Hosting su richiesta (`npm run deploy:hosting`: «Deploy complete!», bundle online `index-18586346…` identico a
    `dist/` (SHA-256) e con il ponte; porta online anche i 500 prodotti per lista di `48361b9`, Rules già pubblicate). Rules invariate.
    Installata sul Pixel 8 dell'utente via adb il 22 novembre (Android 17, WebView 157): **verificato dall'utente che la vibrazione funziona
    anche in Non disturbare**. Ancora da provare sul telefono: blocco con impronta, fotocamera/«Carica una foto», backup e ripristino nell'app.
    Da fare dall'utente: copiare altrove la chiave di firma (`android/nummo-release.jks`, `android/keystore.properties`).
    Dettagli nella sezione «App Android» qui sotto.
  - **Release dell'app Android (GitHub, su richiesta, 22 novembre):** `android-v0.3.1` (tag annotato su `fa06adb`, inviato) con
    `nummo-0.3.1.apk` (SHA-256 `a04f6f3d…18ea`, confermato da GitHub; certificato `00b1c85c…0fcf`) e il file `.sha256`; repository privato.
    Poi, su richiesta, `android-v0.2.0` (su `0f340bf`, APK `6af4a0c8…9178`) e `android-v0.1.0` (su `759792c`, APK `06504315…c0f7`),
    **ricompilate** in worktree temporanee (rimosse) con la stessa chiave e la `local.properties` attuale: stesso codice, non lo stesso file
    degli APK installati allora (sovrascritti); pubblicate con `--latest=false` (la «Latest» resta la 0.3.1). Le note avvisano che Android
    non installa una versione più vecchia sopra una più recente. Il 23 novembre, su richiesta, anche `android-v0.3.0` (tag annotato su
    `2b1e8fb`, inviato; APK `a3efdc94…658f`, confermato da GitHub, certificato `00b1c85c…0fcf`, versionCode 3), ricompilata allo stesso
    modo in una worktree temporanea (rimossa, con la copia della chiave), `--latest=false`; le note dicono che è superata dalla 0.3.1.
    Poi, su richiesta (23 novembre, 15:32), la 0.3.1 **ripubblicata** perché comparisse come la più recente: GitHub ordina le release per
    data del tag, quindi tag `android-v0.3.1` ricreato con la data di oggi sullo stesso `fa06adb` (locale e remoto) e release ricreata con
    lo stesso titolo, le stesse note e gli stessi due file (APK scaricato prima e dopo, SHA-256 verificato), «Latest». Ordine su GitHub:
    0.3.1, 0.3.0, 0.2.0, 0.1.0. Chi aveva il vecchio tag in locale lo aggiorna con `git fetch --tags --force`.
  - **Git.** `main` = `origin/main`, solo il ramo `main`, cinque tag (`android-v0.1.0`, `android-v0.2.0`, `android-v0.3.0`, `android-v0.3.1`, `android-v0.3.2`). Ultimo commit di codice `fa06adb` (articolo eliso, app 0.3.1):
    inviato e pubblicato su Hosting; `npm run check` OK (**575/575**). Prima `2b1e8fb` (notifiche dell'app Android 0.3.0): inviato e
    pubblicato su Hosting. Prima `0f340bf` (app Android 0.2.0): inviato e pubblicato su Hosting. Prima `759792c` (app Android, altra
    sessione): inviato e pubblicato su Hosting. Prima `48361b9` (500 prodotti per lista, checklist più veloce): inviato, Rules pubblicate, Hosting con
    `759792c`. Prima `17ebce0` (piani dei fondi fino a 120 voci): inviato e pubblicato con le Rules.
    Prima `f4691aa` (revisione dei limiti degli abbonamenti): inviato e pubblicato con le Rules.
    Prima `a4cbef0` (Indietro su Android ripreso con `history.forward()`, anello dell'avatar scelto come
    quello di «Colore dell'anello»): inviato e pubblicato su Hosting. Prima `f57b1b9` (pagina Esercenti, cambi di stato
    fino a 40, Indietro di un passo, colore dell'anello, barra inferiore senza lampeggi, storico dei pagamenti largo due pulsanti, vibrazione
    sulla ricorrenza, «Annulla»/«OK» della data a 44, avvisi a 5 s): inviato e pubblicato con le Rules. Prima `1e5c615` (Elimina del fondo nel dialogo di modifica, «Palette» predefinita, pulsanti «Ripristina» uniformi, contorno rosso di Elimina): inviato e pubblicato su Hosting. Prima `3994330` (elimina le liste archiviate, elimina tutti i template, anello dell'avatar solo in Avanzata): inviato e pubblicato. Prima `a13e54c` (categorie in uso non eliminabili, larghezze e colori dei pulsanti): inviato e pubblicato. Prima `49a7c58` (categorie predefinite ripristinabili, backup proposto prima di eliminare, anello dell'avatar, ritocchi): inviato e pubblicato. Commit di codice precedenti del 22 novembre, tutti pubblicati: `67f4a29`
    (template senza data), `9929c8f`
    (elimina tutte le spese, PIN del blocco in Standard, «Cambia modalità» nel colore principale), poi, pubblicati con `17632af`: `17632af` (ricerche ed Esercente a 30 caratteri), `973e8a9` (limiti dei campi di ricerca e delle liste, immagine del profilo in Avanzata,
    frase tolta dal blocco), `20b14e0` (importo massimo 999.999.999,99 €, barra dei menu lontana dagli angoli), `c5d3ee8` (cinque avatar
    astratti; altra sessione), `a6c2b88` (blocco dell'app con impronta o viso), `ec8c5c3` (scansione più ordinata, categorie su smartphone;
    altra sessione), `b2f6d1e` (Indietro di Android, immagine del profilo in Standard), `c862fa9` (riepilogo del passaggio più breve, «Annulla»/
    «OK» della data; altra sessione), `8dd92df` (vibrazione al cambio Spese/Abbonamenti), `8bf4f4d` (separatore delle schede, vibrazione 5/4 ms
    solo touch). L'hash di testa non si scrive qui; i commit di soli documenti non sono elencati.
- **Rilascio del 22 novembre: Rules e Hosting da `17632af`**: Indietro di Android, immagine del profilo (Standard e Avanzata, avatar
  astratti), blocco dell'app, importo massimo 999.999.999,99 € (Rules: importi fino a 99.999.999.999 centesimi, prezzi compatti fino a 143
  caratteri), barra dei menu, limiti dei campi, scansione più ordinata, riepilogo del passaggio più breve, vibrazione al cambio Spese/Abbonamenti.
  Prima le Rules (`firebase deploy --only firestore:rules --project nummo-6b6e2`, «Deploy complete!»), poi `npm run deploy:hosting`
  («Deploy complete!»), sito 200, bundle, `sw.js`, `offline.html` e `firestore.rules` online identici a `dist/` (SHA-256).
- **Rilasci del 21–22 novembre tra `1c83b54` e `8bf4f4d`** (Hosting da `69566dc`, `cffe2e8`, `1934641`, `e008fcd`, `314064b`, `8bf4f4d`):
  elencati nella riga «Produzione» di «Stato corrente precedente», qui sopra.

- **Rilascio del 21 novembre (notte, seconda parte): Hosting da `1c83b54`** (con `1518b0c`): più spese offline in Avanzata, pagina offline
  di Nummo, passaggio dei dati tra le modalità; vibrazione 6/5 ms, barra che non resta nascosta, scansione spenta se non attivata.
  `npm run deploy:hosting`: «Deploy complete!», sito 200, bundle, `sw.js` e `offline.html` online identici a `dist/` (SHA-256). Rules invariate.
  Sul telefono la pagina offline compare solo dopo un'apertura con rete della nuova versione (installazione del service worker).

- **Rilascio del 21 novembre (notte): Hosting da `3ad9a75`**: testo «Il pulsante Template compare…» (IT/EN) al posto di «Il campo…».
  `npm run deploy:hosting`: «Deploy complete!», sito 200, bundle online identico a `dist/` (SHA-256) e con il testo nuovo. Rules invariate.

- **Rilascio del 21 novembre (sera, terza parte): Hosting da `ee2fcdc`**: pulsante «Template» accanto a «Scansiona scontrino» (o al suo
  posto), in `primary`, con la sola icona della categoria dopo la scelta; «Salva» di nuovo sopra la navigazione su smartphone.
  `npm run deploy:hosting`: «Deploy complete!», sito 200, bundle online identico a `dist/` (SHA-256). Rules invariate. Da provare su iPhone.

- **Rilascio del 21 novembre (sera, seconda parte): Hosting da `62e3639`**: 24 px di margine tra il campo riportato in vista e la tastiera
  virtuale; tastiera provata nel browser emulato. `npm run deploy:hosting`: «Deploy complete!», sito 200, bundle online identico a `dist/`
  (SHA-256). Rules invariate. Da provare su telefono reale (Android e iOS).

- **Rilascio del 21 novembre (sera): Hosting da `6f95a08`**: revisione dello scontrino con «Usa i dati» sugli smartphone sotto 390 px
  (prima troncato) e «Ingrandisci la foto» sulla riga del primo pulsante impilato; prima prova nel browser della revisione da 360 a 1400 px.
  `npm run deploy:hosting`: «Deploy complete!», sito 200, bundle online identico a `dist/` (SHA-256). Rules invariate.

- **Rilasci del 21 novembre (pomeriggio–sera): Hosting da `830ac24`, poi da `2b9e763`, poi da `3b74ea4`** (con `a2029bb`, già online
  dal rilascio di `1c7ca7f`): revisione dello scontrino (foto alta quanto i campi su desktop, titolo «Controlla i dati», pulsanti nella
  colonna dei campi o allineati ai campi su smartphone, impilati sotto 500 di colonna). `npm run deploy:hosting`: «Deploy complete!», sito
  200 per ciascuno; confronto del bundle con `dist/` non registrato. Rules invariate. Layout mai visto nel browser: da controllare.

- **Rilascio del 21 novembre (pomeriggio, 15:11): Hosting da `1c7ca7f`** (con `e7953bf`): niente vibrazione su segmenti e legenda,
  impulsi 4/3 ms, Guida senza «confronto con i periodi precedenti». `npm run deploy:hosting`: «Deploy complete!», sito 200, bundle online
  identico a `dist/`. **Attenzione:** la build ha incluso anche una modifica **non committata** di un'altra sessione,
  `ScanReceiptDialog.tsx` (testo del dialogo di scansione senza «Controlli tutto prima di salvare.»); la traduzione corrispondente in
  `en.ts` è finita per errore in `e7953bf`. Online è coerente; `ScanReceiptDialog.tsx` committato poi su richiesta, Git allineato.

- **Rilascio del 21 novembre (notte, seconda parte): Hosting da `976a5cb`**: vibrazione più delicata (`tap` 6 ms, `tick` 4 ms).
  `npm run deploy:hosting`: «Deploy complete!», sito 200, bundle online identico a `dist/`. Rules invariate. Da sentire sul Pixel 8.

- **Rilascio del 21 novembre (notte): Hosting da `7dc02a2`** (con `3c8f614`): vibrazione senza ronzio (zona morta sulla barra,
  distanza minima di 60 ms, `tick` per le selezioni), importo dei template obbligatorio anche nella Guida. `npm run deploy:hosting`
  (dopo `--dry-run`): «Deploy complete!», sito 200, bundle online identico a `dist/` (SHA-256). Rules invariate. La pagina di prova
  resta in `docs/testing/`, non nell'export. Da provare sul Pixel 8: barra, segmenti, legenda, pagina di prova.

- **Rilascio del 21 novembre (sera): Hosting da `e4bf945`**: importo obbligatorio nei template (i template senza importo salvati prima
  restano validi), matita nell'elenco dei template, fondo in una riga propria nei dettagli di Analisi su smartphone, testo breve di
  «Vibrazione». `npm run deploy:hosting`: «Deploy complete!», sito 200, bundle online identico a `dist/`. Rules invariate. Da provare sul
  telefono: pagina Templates (Crea senza importo, matita), dettagli di una categoria in Analisi.

- **Rilascio del 21 novembre (pomeriggio, quinta parte): Hosting da `b2a80ce`** (con `a8f73a2` e `9ae0d33`): vibrazione su legenda e
  segmenti, selezione di Analisi senza render dell'intera pagina, fondi di selezione istantanei, formattatori in cache. `npm run
  deploy:hosting`: «Deploy complete!», sito 200, bundle online identico a `dist/`. Rules invariate. Da provare sul telefono: cambio rapido
  di categoria nella legenda, segmenti Spese/Abbonamenti, vibrazione.

- **Rilascio del 21 novembre (pomeriggio, quarta parte): Hosting da `cc60ea6`** («Crea»/«Salva» a pillola e a tutta larghezza; `278b016`,
  fondo accanto alla categoria nei dettagli di Analisi). `npm run deploy:hosting`: «Deploy complete!», sito 200, bundle online identico a
  `dist/`. Rules invariate. Da provare sul telefono: dettagli di una categoria in Analisi, pagine Templates e Nuova spesa.

- **Rilascio del 21 novembre (pomeriggio, terza parte): Hosting da `4d69d04`** (feedback aptico e interruttore «Vibrazione»; `0f218da`,
  tastiera aperta a passi, committato a parte). `npm run deploy:hosting`: «Deploy complete!», sito 200, bundle online identico a `dist/`.
  Rules invariate. Da provare sul telefono: vibrazione su Android (barra, trascinamento, Analisi, interruttore spento), tastiera su iPhone.

- **Rilascio del 21 novembre (pomeriggio, seconda parte): Hosting da `9a8285a`** (Importo/Data su smartphone; `1a8dc14`, lavoro
  sulla tastiera di un'altra sessione, committato a parte). `npm run deploy:hosting`: «Deploy complete!», sito 200, bundle online identico
  a `dist/` (il primo controllo aveva letto l'HTML precedente dalla cache). Rules e Worker non toccati.

- **Rilascio del 21 novembre (pomeriggio): Hosting da `8e513f4`** (Annulla/Salva a 96 su smartphone nei dialoghi di modifica).
  `npm run deploy:hosting`: «Deploy complete!», sito 200, bundle online identico a `dist/`. Rules e Worker non toccati.

- **Rilascio del 21 novembre (mezzogiorno): Hosting da `3d1b5ea`** (con `fdfce0e`: stato della tastiera virtuale applicato nello stesso
  fotogramma, lavoro di un'altra sessione committato a parte; mai provato su telefono reale). `npm run deploy:hosting`: «Deploy complete!»,
  sito 200, bundle online identico a `dist/`. Rules e Worker non toccati. Da provare sul telefono: tastiera (nessun doppio salto del
  contenuto), cestino e azioni degli abbonamenti a 360–412 px.

- **Rilascio del 21 novembre (notte, quarta parte): Hosting da `bdc742b`** («Chiudi» con contorno come «Annulla»). `npm run
  deploy:hosting`: «Deploy complete!», sito 200, bundle online identico a `dist/`. Rules e Worker non toccati.

- **Rilascio del 21 novembre (notte, terza parte): Rules da `817a2f1`, poi Hosting da `817a2f1`** (tutto il lavoro da `0e536a5`: riga
  velata su smartphone, fondo nei dettagli di spese e abbonamenti, pulsanti di prova delle notifiche nascosti, scansione solo con AI e
  spenta di base (OCR rimosso), template reintrodotti con l'Esercente, pulsanti dei dialoghi uniformi, dettagli di Analisi con categoria
  colorata e fondo, icona più squadrata). Rules: `firebase deploy --only firestore:rules --project nummo-6b6e2`, compilazione OK, «Deploy
  complete!» (raccolta `templates` di nuovo ammessa). Hosting: `npm run deploy:hosting`, «Deploy complete!», sito 200, bundle online
  identico a `dist/` (SHA-256), `icon.svg` nuovo online, nessun file `/ocr/` (l'indirizzo dà solo il ripiego SPA). Worker non toccato.
  `npm run check` **501/501**, `test:emulator` **22/22** (sulle Rules pubblicate).

- **Rilascio del 21 novembre (notte, seconda parte): Hosting da `de79c95`** (riga tagliata dal bordo del pannello desktop dissolta
  invece che nascosta, clic che la porta in vista, `42d9beb`; «Fondo» nei dettagli della spesa). `npm run deploy:hosting`: «Deploy
  complete!», sito 200, bundle online identico a `dist/`. Rules e Worker non toccati. `npm run check` **501/501**.

- **Rilascio del 21 novembre (notte): Hosting da `41a54ab`** (righe intere sul bordo del pannello desktop, esercente tolto dai
  dettagli della spesa). `npm run deploy:hosting`: «Deploy complete!», sito 200, bundle online identico a `dist/`. Rules e Worker non
  toccati. `npm run check` **501/501**.

- **Rilascio del 21 novembre (sera): Hosting da `e3fb997`** (scroller del pannello desktop che riempie il pannello, barra lontana
  dagli angoli, `231d22c`; esercente accanto alla data nelle righe di Spese). `npm run deploy:hosting`: «Deploy complete!», sito 200,
  bundle online identico a `dist/`. Rules e Worker non toccati. `npm run check` **499/499**.

- **Rilascio del 21 novembre: Hosting da `f614f65`** (codice di `78b424d`: valori lunghi dei dettagli a capo su smartphone, pagina
  alta quanto la finestra senza striscia sotto fogli e dialoghi, anteprima del ripristino portata in vista).
  `npm run deploy:hosting`: «Deploy complete!», sito 200, bundle online identico a `dist/`. Rules e Worker non toccati.
  `npm run check` **499/499**.

- **Rilascio del 20 novembre (notte): Hosting da `0765e5c`** (codice di `aebd0ec`: unione bloccata con singolare/plurale e nomi degli
  elementi, esercenti contati nel ripristino, messaggi sopra i dialoghi, importo nel modulo di modifica con il separatore della
  lingua). `npm run deploy:hosting`: «Deploy complete!», sito 200, bundle online identico a `dist/`. Rules e Worker non toccati.
  `npm run check` **499/499**.

- **Rilascio del 20 novembre (sera): Rules da `ad5aa73`, poi Hosting da `f3bd4df`** (ID icona storiche di nuovo valide; audit React:
  errori di listener visibili, icona del FAB stabile, richieste del menu non ripetute). Rules: compilazione OK, «Deploy complete!».
  Hosting: «Deploy complete!», sito 200, bundle online identico a `dist/`. `npm run check` **496/496**, `test:emulator` **22/22**.

- **Rilascio del 17 novembre (notte, nona parte): `561968c`** (70 traduzioni inutilizzate rimosse da `en.ts`, variante `narrow` di
  `SelectField` rimossa; nessun cambiamento visibile), pubblicato su richiesta con `npm run deploy:hosting` («Deploy complete!», sito 200,
  bundle online identico a `dist/`). Rules e Worker non toccati. `npm run check` OK (**489/489**).
- **Rilascio del 17 novembre (notte, ottava parte): `23f8a55`** (precedente) (fotocamera nella pagina anche su smartphone, rimossi i due tentativi
  sul `theme-color`), inviato a `origin/main` e pubblicato su richiesta con `npm run deploy:hosting` («Deploy complete!», sito 200, bundle
  online identico a `dist/`). Rules e Worker non toccati. `npm run check` OK (**490/490**). **Verificato dall'utente sul telefono
  (17 novembre):** con la fotocamera nella pagina la barra di stato non diventa più nera. Non riferiti: «Carica foto» (galleria), qualità per l'OCR.
- **Rilascio del 17 novembre (notte, settima parte): `f3a72f5`** (precedente; non bastava) (seconda correzione della barra di stato dopo la fotocamera: il valore
  del `theme-color` lasciato all'uscita non si riusa più), inviato a `origin/main` e pubblicato su richiesta con `npm run deploy:hosting`
  («Deploy complete!», sito 200, nuovo codice nel bundle online). Rules e Worker non toccati. `npm run check` OK (**492/492**). Da verificare
  sul telefono dopo aver chiuso e riaperto l'app.
- **Rilascio del 17 novembre (notte, sesta parte): `dece43d`** (precedente; la correzione della barra non bastava) (barra di stato ridipinta al ritorno dalla fotocamera, icona «internet»
  pixel ridisegnata), inviato a `origin/main` e pubblicato su richiesta con `npm run deploy:hosting` («Deploy complete!», sito 200, nuovo
  codice nel bundle online). Rules e Worker non toccati. `npm run check` OK (**492/492**). Da verificare sul telefono: barra di stato dopo
  la fotocamera e resa dell'icona.
- **Rilascio del 17 novembre (notte, quinta parte): `6aa7683`** (precedente) (nessun messaggio dopo «Usa questi dati» della scansione), inviato a
  `origin/main` e pubblicato su richiesta con `npm run deploy:hosting` («Deploy complete!», sito 200). Rules e Worker non toccati.
  `npm run check` OK (**490/490**).
- **Rilascio del 17 novembre (notte, quarta parte): `416f0db`** (precedente) (cache Firestore su disco attiva e cancellata a «Esci», messaggi da 3 s,
  barra di scorrimento dentro il pannello desktop, Wi-Fi pixel con due archi e punto), inviato a `origin/main` e pubblicato su richiesta
  con `npm run deploy:hosting` («Deploy complete!», sito 200; bundle online identico a `dist/`, con `persistentCache` vero). Rules e Worker
  non toccati. `npm run check` OK (**490/490**), `test:emulator` **22/22**. Da provare in produzione: accesso, ricarica, «Esci» (la pagina
  si ricarica sulla schermata di accesso) e nuovo accesso.
- **Rilascio del 17 novembre (notte, terza parte): `dda68cb`** (precedente) (divisori in tutti i dialoghi scorrevoli, niente zoom con due dita,
  Esercente più vicino alla Descrizione), inviato a `origin/main` e pubblicato su richiesta con `npm run deploy:hosting` («Deploy
  complete!», sito 200, `user-scalable=no` nella pagina pubblicata). Rules e Worker non toccati. `npm run check` OK (**490/490**).
- **Rilascio del 17 novembre (notte, seconda parte): `bd61713`** (precedente) (scansione senza la nota sulla lettura locale e senza la sezione dei
  prodotti letti), inviato a `origin/main` e pubblicato su richiesta con `npm run deploy:hosting` («Deploy complete!», sito 200). Rules e
  Worker non toccati. `npm run check` OK (**490/490**).
- **Rilascio del 17 novembre (notte): `c837817`** (precedente) (divisori e campi rivelati nel modulo del fondo, Fondo sotto la Categoria su
  smartphone con Descrizione più bassa, «Cache offline: Non attiva»; sezione «Modulo del fondo leggibile…» qui sotto), inviato a
  `origin/main` e pubblicato su richiesta con `npm run deploy:hosting` («Deploy complete!», sito 200). Rules e Worker non toccati.
  `npm run check` OK (**490/490**).
- **Rilascio del 17 novembre (tarda sera): `e4fb9f8`** (icona «internet» pixel ad alta definizione, tolto anche «Budget del mese
  superato»; punti 14–15 della sezione «Ritocchi mobile e scheda AI»), inviato a `origin/main` e pubblicato su richiesta con
  `npm run deploy:hosting` («Deploy complete!», sito 200). Rules e Worker non toccati. `npm run check` OK (**489/489**).
- **Rilascio precedente del 17 novembre (sera): `1d21658`** (Categoria e Fondo affiancati anche su smartphone con freccia piccola, icone pasta
  colorata e internet pixel ridisegnate, tolto «Budget residuo del mese»; punti 12–14 della sezione «Ritocchi mobile e scheda AI»),
  inviato a `origin/main` e pubblicato su richiesta con `npm run deploy:hosting` («Deploy complete!», sito 200). Rules e Worker non
  toccati. `npm run check` OK (**489/489**).
- **Rilascio precedente del 17 novembre: `d66d3db`** (sezione «Ritocchi mobile e scheda AI» qui sotto: barra su iPhone, Data accanto all'Importo,
  Categoria e Fondo su una riga da medium, pulsanti di scansione su una riga, chiave API salvata, modello a sola scelta con elenco ridotto,
  testi tolti, «OK» del calendario più largo), inviato a `origin/main` e pubblicato su richiesta con `npm run deploy:hosting`
  («Deploy complete!», sito 200). Rules e Worker non toccati. `npm run check` OK (**489/489**). Non provato su iPhone reale né con Gemini reale.
- **Rilascio del 16 novembre (sera): `f5411fb`** (esercenti in Nuova spesa, elenco dei modelli AI nelle Impostazioni, esercente
  nella scansione, scansione predefinita), inviato a `origin/main`. **Rules pubblicate** (`firebase deploy --only firestore:rules
  --project nummo-6b6e2`, compilazione OK, «Deploy complete!», con `merchants/{chiave}` e `merchant_id`) e poi **Hosting**
  (`npm run deploy:hosting`, «Deploy complete!», sito 200). Spesa con esercente in Avanzata sul cloud non ancora provata.
  Dettagli nelle tre sezioni del 16 novembre (sera) qui sotto.
- **Scansione dello scontrino (16 novembre, pomeriggio):** OCR locale e AI facoltativa (sezione qui sotto), commit `26b95e9`,
  inviato e pubblicato su Hosting con `npm run deploy:hosting` («Deploy complete!»; `/ocr/` servita, sito 200). Rules e Worker non
  toccati. Nuove devDependency (`tesseract.js`, `@tesseract.js-data/ita|eng`). `npm run check` OK, **470/470**.
- **Rilasci precedenti (Hosting):** prima di `26b95e9`, dal più recente:
  **`4ffe1da`** («Speso nel mese» in evidenza, voci dei menu a tutta
  larghezza), pubblicato su richiesta il 16 novembre con `npm run deploy:hosting` («Deploy complete!», sito 200); Rules invariate. Prima: **`8a99fa6`** (posizione di «Storico dei pagamenti»), pubblicato su
  richiesta il 16 novembre con `npm run deploy:hosting` («Deploy complete!», sito 200); Rules invariate. Prima: **`1dbb396`**, pubblicato su richiesta il 16 novembre (sera) con
  `npm run deploy:hosting` («Deploy complete!», sito 200); Rules pubblicate subito dopo (vedi sotto). Prima: **`fd705f3`**, pubblicato su richiesta il 16 novembre con
  `npm run deploy:hosting` («Deploy complete!», sito 200). Prima: **`f9c4d8f`**, pubblicato su richiesta il 16 novembre con
  `npm run deploy:hosting` («Deploy complete!», sito 200). **Rules pubblicate** su richiesta il 16 novembre (`firebase deploy --only
  firestore:rules --project nummo-6b6e2`, compilazione OK, «Deploy complete!»), allineate a `firestore.rules` di `f9c4d8f`: `templates/{uuid}`
  ora rifiutato. Caricamento e sincronizzazione in Avanzata dopo la pubblicazione da verificare ricaricando l'app. Worker non toccato. Prima: **`4bf36e2`**, pubblicato su richiesta il 16 novembre con
  `npm run deploy:hosting` («Deploy complete!», sito 200); Rules e Worker non toccati (il budget generale resta ammesso dalle Rules).
  Prima: **`536b31e`**, pubblicato su richiesta il 16 novembre con
  `npm run deploy:hosting` («Deploy complete!», sito 200); Rules e Worker non toccati. Resa su telefono e tema scuro non verificati.
  Prima: **`db43c00`**, pubblicato su richiesta il 16 novembre
  con `npm run deploy:hosting` (build da `1e0b923`, codice identico a `db43c00`; «Deploy complete!», sito 200). Resa su
  telefono non verificata. Prima: `cdd957f` (fuso orario e formato 24/12 ore, «Filtra per fondo» rimosso, colonne delle
  Impostazioni, ritocchi ai Templates, coltello). Rilasci precedenti del 15 novembre, dal più recente: `c0b418c` (filtri di Spese e Analisi), `ec150a1` (Templates, backup v7,
  icona stondata; con Rules), `e0c2850` (icona trasparente delle notifiche), `f454d12` (Prossimo mese, filtro per fondo,
  pausa/annullamento datati, promemoria dei rinnovi, orario delle notifiche; Worker ripubblicato prima), `1889755`
  (dissolvenza del segnaposto d'avvio). Tutti con `npm run deploy:hosting`, «Deploy complete!», sito 200.
- **Rules.** Ultima pubblicazione su richiesta il 20 novembre (sera, prima dell'Hosting di `f3bd4df`) con `firebase deploy --only
  firestore:rules --project nummo-6b6e2` (compilazione OK, «Deploy complete!»), allineate a `firestore.rules` di `ad5aa73` (le 24 ID
  icona storiche per categorie e fondi). La precedente, il 16 novembre (sera, prima dell'Hosting di `f5411fb`), aveva introdotto gli
  esercenti, oltre a `skipped_payments` di `1dbb396`. Spesa con esercente ed eliminazione di un pagamento in Avanzata non ancora provate sul cloud.

## Icona «internet» pixel, quarto disegno — 17 novembre 2026 (notte)

- Su richiesta (screenshot: l'icona sembrava tre strisce): solo nel set **pixel**, sempre `grid: 24`, un colore, simmetrica. Archi a
  ventaglio di circa 90°, spessi **3** celle, con le estremità che piegano verso il punto; punto **arrotondato** 6×4 più vicino agli archi
  (prima archi da 2 quasi orizzontali e punto quadrato lontano). Scelto tra varianti generate e disegnate a mano, anteprima a 24/48/96 px
  su fondo scuro e chiaro (colore d'esempio, non la tavolozza vera). Minimale, colorato, ID, dati e Rules invariati.
- **Verifiche:** `npm run check` OK (**492/492**, build demo). Non osservata dentro l'app né sul telefono. Committato in `dece43d` e pubblicato (vedi «Stato corrente»).

## `SelectField`: rimossa la variante `narrow` — 17 novembre 2026 (notte)

- Su richiesta: `narrow` non si attivava mai (in `ExpenseFields` valeva `compact && fund && !fundBelow`, ma `ExpenseForm` passa `fundBelow`
  proprio su compact; `FundField` non lo riceveva da nessuno). Tolti da `SelectField` la prop `narrow`, `shortLabel` di `SelectOption`, la
  freccia piccola sovrapposta, `narrowValue`/`narrowArrow` e il `position: relative` del contenitore `inert` che serviva solo alla freccia;
  da `ExpenseFields` e `FundField` la prop e gli `shortLabel` «Nessuna»/«Nessuno» (le traduzioni restano: le usano le Categorie preferite,
  il Fondo preferito e gli abbonamenti). Resta il «…» per i valori lunghi, valido per ogni `SelectField`. AGENTS aggiornato.
- **Verifiche:** `npm run check` OK (typecheck, **489/489**, build demo). Chromium headless su `dist-demo`, Standard, archivio vuoto: Nuova
  spesa a 390 e 1280 px, Categoria a tutta larghezza con la freccia normale, nessun errore JS (Fondo non provato: nessun fondo). Committato, inviato e pubblicato su Hosting con `561968c`.

## Traduzioni inutilizzate rimosse da `en.ts` — 17 novembre 2026 (notte)

- Su richiesta: rimosse **70** chiavi di `src/i18n/en.ts` non usate in nessun punto del codice (ricerca su `src/`, `App.tsx`, `index.ts`,
  `public/sw.js` e `public/index.html`, compresi i testi prodotti dai template literal dei messaggi di dominio, tradotti per corrispondenza
  in `translate.ts`). Erano testi di funzioni tolte o riscritte: Templates, budget generale ed eccezioni del budget, vecchie note dei
  Fondi (saldo, movimenti, entrate previste), vecchi testi della Guida (con «3, 6 o 12 mesi»), «Nuova categoria» nel selettore, rinomina
  e icona delle categorie, cache «in memoria», giorni con/senza spese di Analisi, configurazione Firebase da `.env`, ecc. Test aggiornati:
  tolti «Confronto non disponibile» (`dashboardInsights.test.ts`) e il test «mostra e nascondi giorni» (`i18n.test.ts`), che verificavano
  solo traduzioni di testi non più mostrati. Nessun testo visibile cambia.
- **Verifiche:** `npm run check` OK (typecheck, **489/489**, build demo; il test del catalogo conferma che ogni `t("…")` nei `.tsx` ha
  ancora la sua traduzione). Inglese non osservato nel browser. Committato, inviato e pubblicato su Hosting con `561968c`.

## Barra di stato nera dopo la fotocamera — 17 novembre 2026 (notte)

- **Esito (dopo `f3a72f5`, ancora nera fino alla riapertura):** due correzioni dal `theme-color` (`dece43d`, `f3a72f5`) non sono servite;
  senza il telefono collegato non è stato possibile osservare cosa fa Chrome al ritorno. Su scelta dell'utente: **fotocamera nella pagina
  anche su smartphone** (`getUserMedia`, anteprima nel dialogo e «Scatta», come già su computer), quindi l'app non passa più all'attività
  della fotocamera di sistema. Il campo file con `capture` resta solo se il browser non ha `getUserMedia`; «Carica foto» invariato (non
  provato se anche la galleria lascia la barra nera). Codice dei due tentativi **rimosso**: `GlobalStyle.tsx`, `bootTheme.ts` e
  `tests/startup.test.ts` tornati come in `6aa7683`. Contro accettati: niente app Fotocamera (HDR, flash), permesso della fotocamera
  chiesto da Chrome alla prima volta. Le sezioni qui sotto descrivono i tentativi superati.


- **Seconda correzione (dopo la prova dell'utente su `dece43d`, ancora nera):** prova decisiva dell'utente: con la barra nera, cambiando
  tema la barra prende il nuovo colore; tornando al tema precedente torna **nera**; uscire e rientrare dall'app la ripara. Quindi la pagina
  comanda ancora la barra, ma Chrome non dipinge più **il valore esatto** del `theme-color` che la pagina aveva quando è passata alla
  fotocamera (nello screenshot in tema chiaro anche le icone della barra sono scure su nero: Chrome crede di mostrare il colore chiaro).
  Il primo tentativo falliva perché tornava proprio a quel valore. Ora `observeThemeColorReturn` (in `theme/bootTheme.ts`) ricorda il
  valore all'uscita (`visibilitychange` nascosta o `blur`) e, al ritorno (visibile, `focus`, `pageshow`), lo mette tra i valori evitati e
  riscrive il colore; `applyDocumentTheme` usa `themeColorFor`: il colore esatto oppure una variante a ±1…4 sul canale blu (invisibile)
  non evitata, anche dopo un cambio di tema. Al massimo gli ultimi 4 valori evitati (`avoidedLimit`): anche un normale cambio di app conta
  come uscita, senza danni. Sfondo della pagina sempre esatto. Rimossi `nudgedColor`, `refreshThemeColor`, `observePageReturn`.
- **Verifiche (seconda correzione):** `npm run check` OK (**492/492**, test di `startup.test.ts` riscritti). Chromium headless su
  `dist-demo` 390×844, Standard: caricamento `#F5FBF5` (esatto), dopo blur/focus `#F5FBF4`, poi `#F5FBF6`; sfondo invariato, un solo meta,
  nessun errore JS. Committato in `f3a72f5` e pubblicato (vedi «Stato corrente»). **Da verificare sul telefono.**


- Su richiesta (screenshot dal telefono, app installata, tema scuro): dopo aver aperto e chiuso la fotocamera di sistema da
  «Scansiona scontrino» la barra di stato in alto restava **nera** invece del colore della pagina. Causa probabile (non riprodotta su
  dispositivo): al ritorno dall'attività della fotocamera Chrome Android perde il colore della barra, mentre il meta `theme-color` della
  pagina resta uguale, quindi nessun nuovo valore arriva al browser. Correzione: `refreshThemeColor` in `theme/bootTheme.ts` scrive un
  colore a un passo di distanza (`nudgedColor`, canale blu −1, invisibile) e dopo 50 ms quello vero: due cambi reali che ridipingono la
  barra. `GlobalStyle` lo esegue al ritorno della pagina (`observePageReturn`: `visibilitychange` visibile, `focus`, `pageshow`), subito e
  di nuovo dopo 400 ms; un tema cambiato nel frattempo non viene sovrascritto. Vale per ogni ritorno da un'altra app, non solo la fotocamera.
- **Verifiche:** `npm run check` OK (typecheck, **492/492**, build demo; due test nuovi in `tests/startup.test.ts`). **Da verificare sul
  telefono** dopo la pubblicazione (il difetto non si riproduce in Chromium desktop). Committato in `dece43d` e pubblicato (vedi «Stato corrente»).

## Scansione: nessun messaggio dopo «Usa questi dati» — 17 novembre 2026 (notte)

- Su richiesta: quando la revisione dello scontrino compila i campi di Nuova spesa non compare più lo snackbar «Dati dello scontrino
  inseriti: controlla e premi Salva.» (`ExpenseForm`: `onApply={update}`); traduzione rimossa da `en.ts`. Gli altri messaggi (spesa salvata,
  ecc.) restano. **Verifiche:** `npm run check` OK (typecheck, **490/490**, build demo); Chromium 1280 px, Standard, scontrino sintetico:
  «Usa questi dati» chiude il dialogo, Importo «5,00» nel modulo, nessun messaggio, nessun errore JS. Committato e pubblicato (vedi «Stato corrente»).

## Icona «internet» pixel, terzo disegno — 17 novembre 2026 (notte)

- Su richiesta (riferimento: la versione con due archi e punto, «linee più definite»): solo nel set **pixel**, sempre ad alta
  definizione (`grid: 24`), **tre elementi**: due archi concentrici spessi 2 celle con gradini puliti (circa 3 celle di spazio) e un punto
  **quadrato 4×4** (prima due archi spessi 3 e punto arrotondato). Scartate due prove intermedie: tre archi più il punto («voglio solo tre
  linee») e tre archi senza punto («non mi sembra l'icona del wifi»). Un colore, simmetrica: i test esistenti passano senza modifiche. Minimale,
  colorato, ID, dati e Rules invariati.
- **Verifiche:** anteprima prima/dopo a 24/48/96 px su scuro e chiaro; nell'app (Chromium 1280 px, stile pixel, selettore icone di Modifica
  categoria) in tema scuro e chiaro con la tavolozza vera; `npm run check` OK (typecheck, **490/490**, build demo). Committato e pubblicato (vedi «Stato corrente»).

## Barra di scorrimento dentro il pannello desktop — 17 novembre 2026 (notte)

- Su richiesta (screenshot di Nuova spesa su desktop): il pannello era la `ScrollView` stessa con raggio 28; la barra di scorrimento del
  browser non segue il raggio e correva dritta per tutta l'altezza, con le frecce sopra gli angoli arrotondati, fuori dalla card. Ora in
  `AppShell` il pannello è una `View` arrotondata che ritaglia, e la `ScrollView` interna ha 28 di margine sopra e sotto (`scrollInset`,
  solo con il pannello desktop), tolti dal padding verticale del contenuto (32 → 4): a scorrimento fermo la pagina è identica.
  Effetto voluto: scorrendo, il contenuto sparisce 28 px prima del bordo superiore/inferiore della card (come nei dialoghi).
- **Verifiche:** `npm run check` OK (typecheck, **490/490**, build demo). Chromium 1280×640, Standard, scuro: card 76–608, scroller 104–580, barra larga 10 interamente
  sul tratto dritto; titolo a 111 come prima, «Salva» a fine scorrimento a 32 dal fondo della card come prima; nessun errore JS.
  Smartphone e tablet invariati (nessun pannello). Committato e pubblicato (vedi «Stato corrente»).

## Messaggi più brevi, cache offline su disco cancellata all'uscita — 17 novembre 2026 (notte)

- Su richiesta (screenshot dello snackbar «Dati dello scontrino inseriti…»): i messaggi temporanei durano **3 s** invece di 5
  (`SnackbarHost`); «Chiudi» resta.
- Su richiesta («opzione 2»): **cache Firestore su disco attiva** nella build di produzione (`EXPO_PUBLIC_FIRESTORE_CACHE=persistent`
  aggiunta a `.env.production.local`, file personale ignorato da Git) e **cancellata a ogni «Esci»**: `signOutUser` attende le scritture
  pendenti, esce, ferma Firestore (`terminate`), cancella la cache (`clearIndexedDbPersistence`) e restituisce `true`; `useSession` toglie
  l'indizio di sessione e ricarica la pagina (un Firestore fermato non riparte). `switchFirebase` ricarica già da sé. Con un'altra scheda
  di Nummo aperta la cancellazione fallisce in silenzio e la cache resta fino a un'uscita successiva. README, `firebase-personale.md`,
  architettura e AGENTS aggiornati (prima dicevano che la cache restava dopo il logout).
- **Verifiche:** `npm run check` OK (typecheck, **490/490**, build demo). `test:emulator` **22/22** su porte dedicate 19099/18180 (config temporanea rimossa; la
  sessione hybrid dell'utente su 8180 non toccata). Prova nel browser con emulatori dedicati e una build demo con cache persistente
  (cancellata dopo): accesso del proprietario demo → database IndexedDB `firestore/[DEFAULT]/demo-nummo/main` con 6–7 documenti, ancora
  presenti dopo il ricaricamento; «Esci» → database cancellato, schermata di accesso, indizio di sessione assente; nuovo accesso → cache
  ricreata e «Sincronizzato»; nessun errore JS. **Non provati:** due schede aperte, scrittura offline che sopravvive alla chiusura (descritta
  in architettura come provata in Chromium in passato, non rifatta), Safari/iOS, produzione. Committato e pubblicato (vedi «Stato corrente»).

## Niente zoom con due dita, Esercente più vicino alla Descrizione — 17 novembre 2026 (notte)

- Su richiesta (zoom con due dita su smartphone): meta viewport con `maximum-scale=1, user-scalable=no` (Chrome Android), su touch
  `* { touch-action: pan-x pan-y }` in `GlobalStyle` (pillola e maniglie dei fogli restano `touch-action: none` in linea, che prevale) e
  `gesturestart`/`gesturechange` annullati (Safari iOS ignora `user-scalable=no`). Test in `tests/manifest.test.ts`. Chi ha attivato in
  Chrome «Forza attivazione zoom» (Accessibilità) può comunque ingrandire: è un'impostazione del browser. Compromesso di accessibilità
  (WCAG 1.4.4) accettato dall'utente; lo zoom da tastiera/rotella su desktop resta.
- Su richiesta (screenshot di «Controlla i dati letti»): la riga del contatore «n/100» sotto la Descrizione aggiungeva tutta la sua altezza
  allo spazio prima dell'Esercente; ora ne sovrappone 8 dp (`helperRow` `marginBottom: -8`). Vale per ogni `ExpenseFields` con testo nella
  Descrizione (Nuova spesa, Modifica spesa, revisione della scansione, registrazione della lista).
- **Verifiche:** `npm run check` OK (typecheck, **490/490**, build demo). Chromium 390×844 touch, Standard, «Spesa» nella Descrizione: Esercente da 422 a 414 (bordo
  della Descrizione a 372), Categoria di conseguenza da 488 a 480; meta viewport e `touch-action: pan-x pan-y` presenti nella build.
  Il blocco del pinch non è provabile in headless: **da verificare sul telefono** (Android e, se possibile, iPhone). Committato e pubblicato (vedi «Stato corrente»).

## Divisori in tutti i dialoghi scorrevoli — 17 novembre 2026 (notte)

- Su richiesta: i divisori del modulo del fondo valgono ora per **ogni** dialogo con area scorrevole. `AppDialog.ScrollArea` è un
  componente nostro (stesso layout dello `ScrollArea` di Paper: 24 ai lati, 24 sotto, cresce e si restringe) che trova nel DOM lo scroller
  interno (la `ScrollView`), lo osserva con `scroll` e `ResizeObserver` (scroller e contenuto) e colora il bordo superiore/inferiore
  (`outlineVariant`) solo dove il contenuto continua (`scrollEdges`); bordi sempre da 1, trasparenti altrimenti. Tolti gli
  `borderTopWidth/BottomWidth: 0` dei 12 dialoghi e il calcolo proprio di `FundEditor` (resta lo scorrimento ai campi rivelati).
  Dialoghi interessati: fondo, movimento, spesa (Modifica), categoria, stato e storico pagamenti degli abbonamenti, prodotti, dettagli
  del giorno in Analisi, registrazione della lista, scansione, calendario, conferme di eliminazione e cambio di modalità.
- **Verifiche:** `npm run check` OK (typecheck, **490/490**, build demo). Chromium headless su `dist-demo`, Standard, scuro, profili temporanei cancellati, nessun
  errore JS: Nuovo fondo 1280×800 e 390×844 come prima (nessun divisorio all'apertura, solo in fondo con Ricarica, entrambi a metà);
  calendario 390×844 nessun divisorio, 360×560 solo in fondo; Modifica categoria 390×844 nessuno, 360×560 in fondo e, scorrendo fino
  in fondo, solo in cima. Non provati: gli altri dialoghi uno per uno, tema chiaro, telefono reale. Committato e pubblicato (vedi «Stato corrente»).

## Scansione: tolte la nota sulla lettura locale e la sezione dei prodotti letti — 17 novembre 2026 (notte)

- Su richiesta (screenshot di «Controlla i dati letti»): in `ScanReceiptDialog` tolta la nota «Lo scontrino viene letto su questo
  dispositivo: la foto non viene inviata a nessuno.» (sia senza AI sia con «Standard» scelto) e l'intera sezione della revisione con
  «n prodotti letti», l'elenco dei prodotti, «Sconti sullo scontrino» e «Prodotti e sconti servono solo per il controllo…». Il dominio
  (`items`, `discountMinor`) li legge ancora, senza mostrarli né salvarli; traduzioni rimosse da `en.ts`. Guida invariata (la lettura
  sul dispositivo resta vera). Committato in `bd61713`, inviato e pubblicato su Hosting.
- **Verifiche:** `npm run check` OK (typecheck, **490/490**, build demo). Chromium headless su `dist-demo`, Standard, 1280 px scuro,
  scontrino sintetico disegnato su canvas (profilo temporaneo cancellato): nessuna nota prima della scansione; revisione con 5,00 €,
  12 nov 2026, «Supermercato Prova Srl», Alimentari e nessuna sezione dei prodotti; nessun errore JS. Non provati: smartphone, AI.

## Modulo del fondo leggibile, Fondo sotto la Categoria su smartphone — 17 novembre 2026 (notte)

Su richiesta (screenshot di «Modifica fondo» su desktop e smartphone e di Nuova spesa a 412 px). Committato in `c837817`, inviato e pubblicato su Hosting.

1. **Modulo del fondo (`FundEditor`).** Con Ricarica e Budget attivi il modulo è più alto della finestra: l'area scorrevole tagliava a metà
   «Importo del budget» senza alcun segnale (la barra di scorrimento dei dialoghi compare solo mentre si scorre), e sembrava un errore di
   impaginazione. Ora, come nei dialoghi scorrevoli Material 3, l'area ha un **divisorio** (`outlineVariant`) in cima e/o in fondo **solo**
   dove il contenuto continua (`scrollEdges` puro in `src/components/scrollEdges.ts`, bordi da 1 sempre presenti e trasparenti, quindi nessuno
   spostamento); attivando Ricarica o Budget i campi rivelati scorrono **per intero** in vista (`useRevealOnEnable`, `scrollIntoView` «nearest»,
   istantaneo con movimento ridotto). Primo tentativo con un ref oggetto: nullo all'effetto perché il `Portal` di Paper monta dopo, quindi
   ref a callback. Solo questo dialogo: gli altri con `ScrollArea` restano senza divisori.
2. **Nuova spesa su smartphone:** Categoria e Fondo di nuovo su **due righe** (il Fondo a tutta larghezza sotto la Categoria, senza
   `narrow`); da medium restano affiancati. Prop `besideCategory` → `fund` + `fundBelow`, tolta la costante `fundBeside`. Per non spingere
   «Salva» sotto la navigazione, su smartphone la **Descrizione** passa da 128 a 96 (tre righe). Modifica spesa e registrazione di una lista
   invariate.

- **Verifiche:** `npm run check` OK (typecheck, **490/490**, build demo; nuovo `tests/scrollEdges.test.ts`). Chromium headless su
  `dist-demo`, Standard, tema scuro, profili temporanei cancellati, nessun errore JS. Nuova spesa con un fondo, alla prima apertura senza
  scorrere: 412×893 (Pixel 8, app installata) «Salva» 677–733, navigazione da 802; 390×844 «Salva» 677–733, navigazione da 753 (20 px
  liberi; prima della modifica, con il Fondo sotto e la Descrizione a 128, sarebbe finito 12 px sotto la barra); 390×740 e 360×640 «Salva»
  intero solo scorrendo (a fine pagina sopra la barra); 1280 px Categoria e Fondo affiancati come prima. Nuovo fondo a 1280×800 e 390×844:
  all'apertura nessun divisorio (tutto entra); con Ricarica divisorio solo in fondo; con Budget il campo scorre a 630–686 / 674–730, dentro
  l'area (fino a 686 / 730), divisori in cima e in fondo.
3. **Archiviazione e backup (Avanzata):** la riga «Cache offline» mostra **«Non attiva»** (EN «Off», traduzione già esistente) invece
   di «Solo in memoria» quando la cache persistente non è abilitata; «Locale» invariato. Chiave «Solo in memoria» rimossa da `en.ts`.
- **Non provati:** telefono reale, tema chiaro, «Modifica fondo» su un fondo esistente con entrambi gli interruttori già attivi (stesso
  componente: divisorio in fondo all'apertura), lettori di schermo. `test:emulator` non necessario (Rules e `DataStore` invariati).

## Ritocchi mobile e scheda AI — 17 novembre 2026

Su richiesta (screenshot), sei punti:

1. **Barra inferiore su iPhone** (16 Pro Max): misurata in Chromium a 440×956 con UA iPhone e safe area emulata, la barra stava dentro la
   pagina, ma la pillola era a 4 px dai lati e a 12–22 px dal fondo: le sue estremità arrotondate superavano la curva degli angoli
   dello schermo (≈ 55–62 pt) e sembravano tagliate. Su iPhone ora sta a 12 px dai lati (`floatingBarSideSpace`, geometria in
   `pillInsideCorner`, test in `navIndicator.test.ts`); Android invariato. **Non verificato su un iPhone reale.**
2. **Scansiona scontrino:** «Scatta una foto» e «Scegli un’immagine» sempre sulla stessa riga; su smartphone metà riga ciascuno, compatti,
   con etichette brevi «Scatta foto» / «Carica foto» («Cambia foto» dopo la scelta), nome completo nell'etichetta accessibile; da medium
   invariati. A 390 px le etichette complete venivano troncate.
3. **Nuova spesa e Modifica spesa su smartphone:** Data a destra dell'Importo, metà riga ciascuno (prima in colonna).
   Poi, su richiesta (screenshot): su smartphone «Scansiona scontrino» è largo esattamente come l'Importo (stesse metà e stesso spazio
   della riga Importo/Data), padding compatto; sotto i 380 px di finestra l'etichetta è «Scansiona» (completa nell'etichetta accessibile).
   Misurato: bordi coincidenti a 440, 390 e 360 px, nessun troncamento; da medium invariato.
7. **Poi, su richiesta (screenshot):** tolto «Indica il modello da usare.» dalla scheda AI (l'avviso sull'indirizzo dell'API compatibile
   resta); titolo «Scansione predefinita» (`titleSmall` in grassetto, intestazione di livello 3) sopra la sua scelta; da medium
   **Categoria e Fondo sulla stessa riga**, a metà (`besideCategory` di `ExpenseFields`, solo in Nuova spesa; senza fondi la Categoria
   resta a tutta larghezza; su smartphone il Fondo resta sotto). Chromium 1280 px con `nummo-utente-medio.json` unito (profilo
   temporaneo cancellato): Categoria 280–742, Fondo 754–1216 alla stessa altezza; 390 px: titolo visibile, avviso assente; nessun errore JS.
8. **Poi, su richiesta:** «Dimentica la chiave» (e «Revoca il consenso») spostati sopra il titolo «Scansione predefinita», subito dopo
   il Modello; nel dialogo di scansione tolta la nota «La foto viene inviata a {servizio} con la tua chiave API.» (resta quella della
   scansione standard). Chromium 390 px: ordine Chiave, Modello, Dimentica la chiave, Scansione predefinita; nessun errore JS.
   Poi, su richiesta: 8 dp in più tra Modello e la riga «Dimentica la chiave» / «Revoca il consenso» (20 dp in tutto, prima 12).
9. **Elenco dei modelli ridotto** (screenshot del piano gratuito di Gemini): `curateGeminiModels` in `domain/receiptAi.ts` tiene solo
   `gemini-<versione>-flash-lite|flash|pro` stabili, le versioni più recenti (2 flash-lite, 2 flash, 1 pro) più i consigliati; senza famiglie
   note l'elenco resta intero. OpenAI: via snapshot datati, anteprime e `latest`. Test con l'elenco degli screenshot (38 nomi → 6:
   2.5-flash, 2.5-pro, 3.1-flash-lite, 3.5-flash-lite, 3.7-flash, 3.8-flash). `npm test` **489/489**. Non provato con l'API reale né nel browser.
10. **Annullato su richiesta:** «Speso nel mese» è tornato alle misure di prima (96 dp, riquadro 48, `headlineMedium`; `FundsPage.tsx` come in
    `f5411fb`). Prova scartata: **Fondi: «Speso nel mese» alle misure del «Totale» di Spese** (screenshot): altezza minima 80 (prima 96), riquadro
    dell'icona 44 (prima 48), raggio 20, margini 4/12, importo `headlineSmall` (prima `headlineMedium`). Chromium 390 px con
    `nummo-utente-medio.json`: entrambe 80 px, riquadro 44, importo 24 px; nota dei rinnovi previsti ancora dentro la scheda; nessun errore JS.
11. **«OK» del calendario più facile da toccare** (su richiesta): l'unico pulsante «OK» dell'app è in `DatePickerDialog` (`DateField.tsx`),
    usato da ogni campo data; era largo 37 dp (sotto i 48 di un bersaglio touch), ora `minWidth: 64` (minimo Material 3 dei pulsanti di
    testo). Chromium 390 e 1280 px: OK 64×48, Annulla 65×48; nessun errore JS.
12. **Categoria e Fondo sulla stessa riga anche su smartphone** (su richiesta, dopo `d66d3db`; poi in `1d21658`).
    A metà riga restavano circa 75 px per il valore e «Nessuna categoria» / «Nessun fondo» venivano tagliati di netto: su smartphone i
    due campi sono `SelectField` `narrow` (senza freccia, scelta vuota «Nessuna» / «Nessuno» tramite `shortLabel`; elenco e lettori di
    schermo con il nome completo) e ogni `SelectField` termina con «…» un valore troppo lungo (`textOverflow`). Chromium 440/390/360 px
    con `nummo-utente-medio.json`: campi affiancati, vuoti senza taglio; a 360 px nomi lunghi come «Medio · Ristoranti e bar» →
    «Medio · Ris…» (limite accettato del layout a metà riga); 1280 px invariato. `npm test` **489/489**.
    Poi, su richiesta: nei campi `narrow` una **freccia piccola** (16 dp, `onSurfaceVariant`, sovrapposta a 8 dp dal bordo e centrata sul
    riquadro) indica che il menu si apre; l'input ha `marginRight: 12` perché Paper riscrive il padding in un'unica proprietà inline e un
    `paddingRight`/`paddingEnd` nostro veniva ignorato. Chromium 390/360 px: freccia centrata, «…» prima della freccia.
13. **Icone ridisegnate** (su richiesta, screenshot): «piatto di pasta» solo nel set **colorato** (ciotola con piede e bordo, pasta con
    un'onda scura, due fili di vapore sottili al posto dei tre tratti spessi che si fondevano); «internet» solo nel set **pixel** (un colore,
    due archi pieni e il punto separati da righe vuote, punte che scendono ai lati; prima base e tinta mescolate). Minimale e altri set
    invariati, nessun cambio di ID, dati o Rules. Anteprima con la tavolozza vera (chiaro/scuro, 24/48/96 px) osservata; test delle icone
    (contrasti, corrispondenze) **489/489**.
14. **Tolto «Budget residuo del mese: …»** sotto il Fondo (su richiesta): in `FundField` resta solo «Budget del mese superato di …» in
    rosso quando il budget è già superato. Vale ovunque si usa `FundField` (Nuova spesa e conferma di registrazione di una lista).
    Poi, su richiesta, tolto anche «Budget del mese superato di …»: sotto il Fondo non c'è più nessuna riga (traduzioni rimosse).
15. **Icona «internet» pixel, secondo rifacimento** (su richiesta): sulla griglia 12 sembrava ancora a gradini; ora è ad **alta
    definizione** (`grid: 24`, come la moneta): due archi concentrici di un ventaglio di 90°, spessi 3 celle, e il punto, un solo colore,
    simmetrica. Test aggiornato (alta definizione per `coin` e `wifi`, simmetria, un colore). Anteprima chiaro/scuro 24/48/96 px osservata.
4. **Chiave API salvata:** prima era solo in memoria per scelta (AGENTS). Ora `nummo.receiptAi.keys.v1`, una per destinazione,
   validata alla lettura (`parseAiKeys`/`withAiKey` in `domain/receiptAi.ts`), cancellata da «Dimentica la chiave». Mai in Firestore,
   backup, log o URL. Decisione e rischio in `docs/architecture.md` («Chiave API salvata e modello a sola scelta»).
5. **Testi tolti dalla scheda «Analisi scontrini con AI»:** introduzione, nota sulla chiave, suggerimento del modello, nota della
   scansione predefinita, testo del consenso (entrambe le varianti di ciascuno), più «… scegline uno dall’elenco o scrivine il nome» e
   «Puoi comunque scrivere a mano…», diventati falsi. Traduzioni rimosse da `en.ts`.
6. **Modello a sola scelta:** `SelectField` con l'elenco del servizio (rimossi `ModelField.tsx` e `matchModels`); senza elenco il campo è
   disabilitato. Consigliato Gemini: `gemini-3.1-flash-lite` (poi `gemini-2.5-flash`), mostrato «(consigliato)» e preselezionato a campo vuoto.

- **Verifiche:** `npm run check` OK (typecheck, **489/489**, build demo); test nuovi per chiavi salvate e consigliato Gemini, test della
  geometria della barra. Chromium headless su `dist-demo`, Standard, UA iPhone, safe area 62/34 emulata, **Gemini finto** (fetch
  sostituito, nessuna chiave vera), profili temporanei cancellati: a 440, 390 e 360 px pillola a 12 px dai lati; Importo e Data sulla
  stessa riga; i due pulsanti del dialogo sulla stessa riga, senza troncamenti; chiave scritta → salvata in `nummo.receiptAi.keys.v1`,
  ritrovata dopo il ricaricamento; modello preselezionato `gemini-3.1-flash-lite`, foglio con «(consigliato)», nessun campo scrivibile
  nella scheda oltre alla chiave; nessun errore JS.
- **Non provati:** iPhone reale (angoli, Safari e app installata), importi lunghi a 360 px (campo Importo largo circa 106 px per il
  testo), tema scuro, inglese nel browser, Gemini reale. `test:emulator` non necessario (Rules e `DataStore` invariati).

## Scansione: esercente e scansione predefinita — 16 novembre 2026 (sera)

- Su richiesta (screenshot della revisione con «Spazio Conad» nella Descrizione). Nella revisione «Controlla i dati letti» c'è ora il
  campo **Esercente** (con i suggerimenti del modulo) e il nome del negozio va lì; la **Descrizione** proposta è il tipo di acquisto
  («Spesa», …: dal tipo di negozio con l'OCR, dal modello con l'AI, nuovo campo `description` del prompt), sempre «da controllare». Il nome
  letto dall'AI è mostrato come verrà salvato («SPAZIO CONAD» → «Spazio Conad»). «Usa questi dati» compila anche l'Esercente del modulo;
  l'esercente nuovo si crea solo con «Salva».
- Impostazioni → «Analisi scontrini con AI» → **«Scansione predefinita»** (Standard / Avanzata con AI), salvata in `nummo.receiptAi.v1`
  (`scan`): con l'AI configurata il dialogo si apre sul tipo scelto; l'altro resta selezionabile.
- File: `domain/receipt.ts` (`merchant`, `suggestDescription`, `receiptDescriptions`), `domain/receiptAi.ts` (`scan`, prompt),
  `ScanReceiptDialog.tsx`, `ReceiptAiCard.tsx`, `ExpenseForm.tsx`, `useAiModels.ts`, Guida e testi IT/EN, README, AGENTS,
  `docs/architecture.md`, `tests/receipt.test.ts`.
- **Verifiche:** `npm run check` OK (**488/488**, build demo; test esistenti estesi, nessun test nuovo). Chromium headless su `dist-demo`,
  Standard, 1280 px scuro, **Claude finto**: «Avanzata con AI» scelta nelle Impostazioni e salvata, dialogo aperto già su «Avanzata con
  AI», consenso, revisione con Descrizione «Spesa» ed Esercente «SPAZIO CONAD» (prima della resa in «Spazio Conad», poi coperta da test),
  descrizione già scritta conservata, Esercente arrivato nel modulo; nessun errore JS.
- **Non provati:** OCR su uno scontrino vero o sintetico dopo questa modifica (solo test di dominio), salvataggio della spesa con
  l'esercente letto nel browser, 390 px, AI reali (se il modello ignora `description` il campo resta vuoto), inglese nel browser.

## Elenco dei modelli AI nelle Impostazioni — 16 novembre 2026 (sera)

- Su richiesta (specifica incollata dall'utente). In «Analisi scontrini con AI» il campo **Modello** è un combobox con ricerca
  (`ModelField`, stesso schema di `MerchantField`: elenco nel flusso, frecce + Invio, Escape): 500 ms dopo l'ultima modifica della chiave
  (o dell'indirizzo, per l'API compatibile) `useAiModels` chiede l'elenco dei modelli al servizio. Indicatore di caricamento, numero dei
  modelli trovati, oppure errore chiaro con «Riprova»; il nome si può **sempre** scrivere a mano. Con il campo vuoto si preseleziona un
  modello consigliato se presente (`gpt-5-mini`/`gpt-4o-mini`, `gemini-2.5-flash`/`gemini-3.5-flash-lite`, `claude-haiku-4-5`/
  `claude-sonnet-4-6`, anche nell'edizione datata); un modello già scritto non viene sostituito. Cambiando servizio il modello si svuota
  (non spegnendo e riaccendendo l'AI). Ordine dei campi: Indirizzo, Chiave API, Modello.
- Richieste (`buildModelsRequest`/`readAiModels` in `domain/receiptAi.ts`, `listAiModels` in `services/receiptAi.ts`, timeout 15 s):
  OpenAI `GET /v1/models` filtrato sulle famiglie chat (`gpt-4…`, `gpt-5…`, `o1/o3/o4`, senza embedding, whisper, tts, dall-e, moderation,
  audio, realtime, image); Gemini `GET /v1beta/models?pageSize=1000`, solo `generateContent`, senza `models/`; Claude `GET /v1/models?limit=1000`
  con gli header per il browser; compatibile `<base>/models`, anche senza chiave, nessun filtro.
- **Scostamento voluto dalla specifica:** per Gemini la chiave va nell'header `x-goog-api-key`, non in `?key=`: la regola del progetto è
  «chiave mai in un URL» (come già per la scansione).
- File: `domain/receiptAi.ts`, `services/receiptAi.ts`, `features/receipts/ModelField.tsx` e `useAiModels.ts` (nuovi), `ReceiptAiCard.tsx`,
  `en.ts` (rimossa la chiave «Serve un modello che legga le immagini…»), `tests/receipt.test.ts`, AGENTS, `docs/architecture.md`.
- **Verifiche:** `npm run check` OK (typecheck, **488/488**, build demo); 4 test nuovi (richieste per servizio e chiave assente
  dall'indirizzo, filtri ed errori, consigliato e ricerca, rete assente/timeout/annullamento). Chromium headless su `dist-demo`, Standard,
  tema scuro, **provider finti** (fetch sostituito nella pagina, nessuna chiave vera, profili temporanei cancellati): 1280 px, OpenAI →
  caricamento, 9 modelli (esclusi whisper/embedding/dall-e/tts), `gpt-5-mini` preselezionato, ricerca «4o», frecce + Invio, testo a mano,
  chiave sbagliata → «Chiave API non valida o senza permessi.» con Riprova e modello conservato; Claude → `claude-haiku-4-5-20251001`;
  Gemini → `gemini-2.5-flash`; compatibile non raggiungibile → errore e modello scritto a mano; chiave assente da localStorage/
  sessionStorage; 390 px touch: elenco, scelta con tocco, focus che resta nel campo, nessun overflow; nessun errore JS.
- **Non provati:** chiamate reali ai quattro servizi (forma delle risposte e CORS veri: OpenAI, Gemini e Anthropic dichiarano di accettare
  chiamate dal browser, non verificato qui), telefono reale, screen reader, tema chiaro, Safari/Firefox. `test:emulator` non rieseguito
  per questa modifica (Rules e `DataStore` non toccati da essa).

## Esercenti in Nuova spesa — 16 novembre 2026 (sera)

- Su richiesta (specifica incollata dall'utente). Campo **Esercente** facoltativo dopo la Descrizione, in Nuova spesa e in Modifica spesa;
  suggerimenti mentre si scrive dagli esercenti già usati (frequenza e recenza calcolate dalle spese), scelta con tocco/clic o frecce + Invio,
  oppure testo libero. «amazon», «AMAZON», «  Amazon  » = un solo esercente «Amazon»; grafie miste («eBay») conservate. Nei dettagli della
  spesa in Spese compare la riga «Esercente». Decisioni e forma dei dati in `docs/architecture.md` («Esercenti in Nuova spesa»).
- File: `domain/merchant.ts` (nuovo), `expense.ts`, `contract.ts`, `backup.ts` (v10, CSV «Esercente»), `services/dataStore.ts`
  (`watchMerchants`, parametro `merchant` di `createExpense`/`updateExpense`, `merchants` nello snapshot e nell'importazione),
  `firestoreStore.ts`, `localStore.ts`, `localDatabase.ts` (passo 3), `features/expenses/MerchantField.tsx` e `useRemoteMerchants.ts`
  (nuovi), `ExpenseFields`/`ExpenseForm`/`ExpenseEditor`, `useRemoteExpenses`, `expenseStore`, `Workspace.tsx` (listener, ordinamento,
  backup di recupero senza esercenti persi), `ExpenseList.tsx`, `BackupActions.tsx`, icona `store` in `SvgIcon`, Guida IT/EN («Esercenti
  ricordati»), `en.ts`, `firestore.rules` + `public/firestore.rules`, README, AGENTS, `docs/testing/README.md`.
- **Migrazioni:** IndexedDB passo 3 (crea lo store `merchants`, nessun dato toccato); backup v10 con lettori v1–v9 invariati; Firestore:
  nessuna migrazione, le spese esistenti restano senza `merchant_id`. Rules modificate (pubblicate poi con `f5411fb`, vedi «Stato corrente»).
- **Verifiche:** `npm run check` OK (typecheck, **484/484**, build demo); nuovi `tests/merchant.test.ts` (11: normalizzazione, Amazon/amazon/
  AMAZON, spazi, nome mostrato, risoluzione, contratto, frequenza + recenza, suggerimenti, backup v10, piano d'importazione, CSV) e 3 test in
  `localStore.test.ts` (creazione con la spesa, nessun duplicato né rinomina, modifica/rimozione, esercente inesistente rifiutato, backup e
  ripristino, archivi separati, record corrotto); test esistenti aggiornati a v10, passo 3 e colonna CSV. `test:emulator` **22/22**: Rules
  (ID = chiave del nome, campi, doppi spazi, 60 caratteri, forma di `merchant_id`), creazione nel batch della spesa, seconda sessione e
  listener, modifica con nuovo esercente in transazione, rimozione con `deleteField`, nome esistente non riscritto, estranei e anonimi negati.
  Chromium headless su `dist-demo`, Standard, profili temporanei cancellati: 1280 px e 390 px touch, spesa senza esercente, «amazon» →
  «Amazon», «am» → suggerimento, frecce + Invio, clic sul suggerimento con il focus che resta nel campo, «  AMAZON  » senza scelta → stesso
  esercente, «eBay» conservato; IndexedDB con 2 esercenti e 6 spese corrette; a 1280 px anche dettagli con «Esercente», editor precompilato,
  rimozione (revisione 2, campo assente) e cambio con suggerimenti nel dialogo; nessun errore JS. Nota di prova: a 390 px lo snackbar
  «Spesa salvata.» copre per qualche secondo il pulsante Salva (comportamento preesistente, non legato agli esercenti).
- **Non provati:** Avanzata nel browser (serve pubblicare le Rules o riavviare il runner hybrid), telefono reale con tastiera virtuale,
  screen reader sul combobox, tema scuro, Safari/Firefox.

## Scansione dello scontrino: OCR locale e AI facoltativa — 16 novembre 2026

- Su richiesta (specifica incollata dall'utente). In Nuova spesa il pulsante tonale **«Scansiona scontrino»** apre
  `ScanReceiptDialog`: «Scatta una foto» (sempre: fotocamera di sistema su touch, anteprima dal vivo con «Scatta» su computer) / «Scegli un'immagine» → anteprima → «Scansiona» (annullabile)
  → «Controlla i dati letti» (foto accanto ai campi su desktop, sopra su smartphone; avviso «Da controllare» / «Non trovato»;
  «Sostituisci i dati già inseriti» solo se il modulo ha già valori diversi) → «Usa questi dati» compila importo, data,
  descrizione e categoria. Il salvataggio resta solo su «Salva».
- **OCR standard:** Tesseract.js 7 nel browser, italiano + inglese, file serviti da `/ocr/` (`npm run ocr:sync`, cartella
  generata e ignorata da Git, inclusa in `dev`, `dev:demo`, `build:demo`, `build:cloud`), cache di 1 giorno in `firebase.json`.
- **AI (BYOK):** scheda «Analisi scontrini con AI» in fondo alle Impostazioni (Non attiva / OpenAI / Google Gemini / Claude / API
  compatibile OpenAI, modello, indirizzo, chiave). Chiave solo in memoria; consenso prima del primo invio; ripiego «Usa la
  scansione standard» dopo un errore. Decisioni e limiti in `docs/architecture.md`, regole in AGENTS.
- Guida (IT/EN) con la voce «Scansione dello scontrino»; README aggiornato. Nessuna modifica a `DataStore`, Rules o backup.
- **Verifiche:** `npm run check` OK (typecheck, **470/470**, build demo); 17 test nuovi in `tests/receipt.test.ts` (importi e date
  italiane, totale contro subtotale/IVA/contanti/resto, valori mancanti, risposte AI valide e non valide, richieste ed errori dei
  provider, timeout/annullamento, nessuna registrazione automatica). Chromium headless su `dist-demo`, Standard, scontrino
  **sintetico disegnato su canvas** (profili temporanei cancellati): 1280 px, OCR in circa 1 s → 24,75 €, 12 nov 2026,
  «Supermercato Prova Srl», Alimentari; modulo compilato, 0 spese nell'archivio, nessuna richiesta esterna, nessun errore JS;
  file non valido → «Formato non supportato»; Annulla durante la lettura e nuova scansione; Escape chiude senza toccare il modulo.
  390 px touch con **provider finto** (fetch sostituito nella pagina): consenso prima di ogni invio, errore 429 → ripiego
  sull'OCR, risposta valida → revisione con prodotti e sconto, importo scritto a mano conservato, chiave assente da
  localStorage/sessionStorage, nessun overflow.
- Poi, su richiesta (screenshot): «Scatta una foto» è sempre accanto a «Scegli un'immagine», anche su computer (anteprima dal vivo
  con `getUserMedia`, pulsante «Scatta», flusso video fermato allo scatto, ad Annulla e alla chiusura; senza permesso o senza
  fotocamera un messaggio rimanda a «Scegli un'immagine»); aggiunto il servizio **Claude** (Messages API con `fetch` diretto,
  nessun SDK). `npm run check` OK (**470/470**); Chromium 1280 px con fotocamera finta: anteprima, Annulla (traccia `ended`),
  scatto → anteprima della foto, voce Claude nelle Impostazioni; nessun errore JS. Non provati: webcam vera, permesso negato
  nel browser, chiamata reale a Claude.
- **Non provati:** scontrini veri (foto storte, carta termica, sfocature), fotocamera su telefono reale, Safari/iOS/Firefox,
  HEIC, chiamate reali a OpenAI/Gemini/servizi compatibili (nessuna chiave usata: nomi dei modelli d'esempio non verificati),
  Avanzata, `build:cloud` e peso della pubblicazione su Hosting (+16 MB). `test:emulator` non rieseguito (Rules e `DataStore`
  invariati). Committato in `26b95e9`, inviato e pubblicato su Hosting.

## Menu e fogli: evidenziazione a tutta larghezza — 16 novembre 2026

- Su richiesta (screenshot del filtro Fondo; la prima prova con voci rientrate e arrotondate è stata scartata: «la selezione deve coprire
  interamente la parte selezionata»): `AnchoredMenu` senza padding verticale, voci a filo dei bordi e ritagliate dal menu arrotondato, quindi
  l'evidenziazione (hover, selezione) copre tutta la voce e prende gli angoli del menu su prima e ultima. `SelectField` senza rientro né raggio
  12 sulle voci (padding 16 come `MenuSelect`); `BottomSheet` con voci a tutta larghezza e titolo a 16 dp per allinearsi alle icone. Menu
  account già a filo, invariato.
- Verifiche: `npm run check` OK (**453/453**, build demo). Chromium headless, Standard, `nummo-utente-medio.json` (profilo temporaneo
  cancellato): 1280 px scuro, hover su prima/ultima voce di Fondo, Ordina, menu account e Categoria di Nuova spesa; 390 px chiaro, foglio
  Categoria con la voce scelta a tutta larghezza; nessun errore JS. Committato, inviato e pubblicato su Hosting (vedi «Stato corrente»).

## Fondi: «Speso nel mese» in evidenza — 16 novembre 2026

- Su richiesta (screenshot): la casella «Speso nel mese» («Spese previste» nei mesi futuri) diventa una scheda in evidenza come il «Totale»
  di Spese: sfondo `primaryContainer`, icona portafoglio su `primary`, etichetta in semigrassetto, importo `headlineMedium` in semigrassetto,
  nota dei rinnovi previsti sotto. Tolti gli stili `tiles`/`tile`, non più usati.
- Verifiche: `npm run check` OK (**453/453**, build demo). Chromium headless, Standard, `nummo-utente-medio.json` unito (profilo temporaneo
  cancellato): 1280 px scuro e 390 px chiaro, «Speso nel mese 1215,45 €» con «Altri 29,99 € di rinnovi previsti»; nessun errore JS.
  Committato, inviato e pubblicato su Hosting (vedi «Stato corrente»).

## Abbonamenti: posizione di «Storico dei pagamenti» — 16 novembre 2026

- Su richiesta (screenshot): su smartphone il pulsante tonale sta a destra, sotto Annulla/Pausa/Modifica (`alignSelf: 'flex-end'`);
  da medium in su è nella stessa riga delle azioni, all'estremo sinistro (`marginRight: 'auto'`), separato da Annulla abbonamento.
  `npm run check` OK (**453/453**, build demo). Non provato nel browser. Committato, inviato e pubblicato su Hosting (vedi «Stato corrente»).

## Riallineamento documenti, commit, push e Hosting — 16 novembre 2026 (sera)

- Su richiesta, dopo una verifica documenti/codice: Guida (IT/EN) senza la promessa di creare categorie «al volo» durante la spesa (dal
  15 novembre si creano solo in Categorie); `docs/testing/README.md` cita il client v9; nota di superamento sul riepilogo dei fondi in
  `docs/architecture.md`; «Stato corrente» e punto 1 delle «Prossime attività» aggiornati (Rules, verifiche, campo Template rimosso).
- Committato insieme al lavoro del 16 novembre ancora aperto (pagamenti eliminabili, ricerca per mese/anno, icone nel menu Categoria,
  «Chiudi» più grande, «Nuova lista» 52 dp, «Entrata»), inviato (`1dbb396`) e pubblicato con `npm run deploy:hosting` («Deploy complete!», sito 200). Rules pubblicate poi su richiesta (compilazione OK, «Deploy complete!»).

## Fondi: «Entrata» al posto di «Aggiunte» nel riepilogo — 16 novembre 2026

- Su richiesta: la prima riga del «Riepilogo del mese» si chiama «Entrata» (stessa parola del dialogo Aggiungi; EN «Income»); traduzione
  «Aggiunte» rimossa. `npm run check` OK. Nessun commit.

## Abbonamenti: storico dei pagamenti in un dialogo, pagamenti eliminabili — 16 novembre 2026

- Su richiesta: nei dettagli di un abbonamento lo storico non è più in riga; il pulsante tonale **«Storico dei pagamenti (n)»** apre
  `PaymentsDialog` (nome, numero, totale; elenco scorrevole; «Chiudi»). Ogni pagamento ha il cestino (`DeleteAction`, conferma «Eliminare il
  pagamento del …?»); serve la connessione sincronizzata come per gli stati. Tolti «Mostra tutti i pagamenti (n)» / «Mostra solo i più recenti».
- Modello dati (scelta dell'utente «togli un singolo pagamento»): campo facoltativo `skipped_payments` (numeri di occorrenza) in dominio,
  contratto, `dataOf`, editor (conservato finché è una serie), Firestore (stringa compatta, `deleteField`), locale (rimosso se assente),
  Rules, backup **v9**. Decisione in `docs/architecture.md`, regole in AGENTS. Limite: un'app non aggiornata (cache)
  ignora il campo e conta ancora il pagamento finché non si ricarica.
- Verifiche: `npm run check` OK (**453/453**, build demo); test nuovi `tests/skippedPayments.test.ts` (3), caso in `localStore.test.ts`; `test:emulator`
  **21/21** su porte dedicate (Auth 19099, Firestore 18180, config temporanea rimossa) con il caso nuovo e il caso peggiore del budget Rules
  esteso a 60 numeri. Chromium 1280 px con `nummo-utente-medio.json` (profilo temporaneo cancellato): «Spazio cloud» → «Storico dei pagamenti (6)»,
  eliminato il 20 ott 2026 → 5 pagamenti, 14,95 €; nessun errore JS. **Rules da ripubblicare** prima di usarlo in Avanzata (solo con
  autorizzazione). Nessun commit.

## Liste: «Nuova lista» leggermente più piccolo — 16 novembre 2026

- Su richiesta, su desktop e smartphone: 52 dp (prima 56) ed etichetta 15/600 (prima 16/600); resta più grande del pulsante standard (48). Chromium: 142×52 a 1280 px, 95×52 a 390 px, nessun errore JS; `npm run check` OK (**449/449**). Nessun commit.

## Spese: ricerca per mese/anno, icone nel menu Categoria, «Chiudi» più grande — 16 novembre 2026

- Su richiesta: la ricerca di Spese («Cerca per nome, mese o anno») trova anche per periodo nella lingua dell'interfaccia: nome del mese intero o
  breve e anno («ottobre», «ott 2026», «2026»), combinabili col nome («spesa ottobre»); ogni parola deve comparire nel nome o nel periodo
  (`searchAndSort(…, dateText)`, test nuovo in `history.test.ts`; senza `dateText` resta solo il nome). Effetto noto: una parola breve può trovare
  anche nomi che la contengono («ott» → «Prodotti»). Abbonamenti invariato.
- Menu «Categoria» di Spese con il glifo di ogni categoria (filtro per «Tutte le categorie»); il campo mostra l'icona della categoria scelta.
  **Correzione:** il menu misurava le voci senza la barra di scorrimento (10 px in Chromium) e troncava i nomi lunghi quando scorre; ora la
  larghezza misurata include la barra classica del browser (`scrollbarWidth()` in `MenuSelect`, 0 con barre sovrapposte).
- «Chiudi» dei dialoghi Prodotti acquistati e dettagli di Analisi: etichetta 16/600, larghezza minima 96.
- Verifiche: `npm run check` OK (**449/449**, build demo). Chromium 1280 px con `nummo-utente-medio.json` (profilo temporaneo cancellato): «ottobre» 29 spese,
  «2026» 187, «spesa ottobre» 9, «nov» 11; menu Categoria con icone e «Medio · Ristoranti e bar» intero (170/170 px); dialogo Prodotti con
  «Chiudi» più grande; nessun errore JS. Committato, inviato e pubblicato su Hosting (vedi «Stato corrente»).

## Liste: pulsante «Nuova lista» più grande anche su desktop — 16 novembre 2026

- Su richiesta: il pulsante del titolo di Liste è alto 56 dp con etichetta 16/600 anche da medium in su (prima solo su smartphone). Chromium 1280 px: 148×56. `npm run check` OK (**448/448**). Committato in `fd705f3`, inviato e pubblicato su Hosting.

## Analisi su desktop come su smartphone: Periodo e Grafico come menu — 16 novembre 2026

- Su richiesta: anche da medium in su la riga sotto «Fondo» ha «Periodo» e «Grafico» come due `MenuSelect` a metà riga (menu sotto il campo),
  al posto delle caselle (`ChoiceChips`); stesso codice per tutte le larghezze. Tolta la traduzione «Tipo di grafico», non più usata.
  Sostituisce la voce «Periodo e grafico a caselle su desktop» del 16 novembre.
- Verifiche: `npm run check` OK (**448/448**, build demo); Chromium con `nummo-test-casi-limite-2026-11-08.json` (profilo temporaneo cancellato):
  1280 px Fondo 926, Periodo e Grafico 457 ciascuno; 820 px 682 / 335 / 335; nessun overflow né errore JS. Committato in `fd705f3`, inviato e pubblicato su Hosting.

## Analisi su smartphone: Fondo da solo, poi Periodo e Grafico come menu — 16 novembre 2026

- Su richiesta: su smartphone la prima riga è solo «Fondo» (tutta larghezza); la seconda ha «Periodo» e **«Grafico»** affiancati a metà, entrambi
  `MenuSelect` con il foglio dal basso (Ciambella/Barre/Blocchi), al posto dei pulsanti a segmenti. Desktop invariato (caselle). Traduzione
  «Grafico». AGENTS aggiornato.
- Verifiche: `npm run check` OK (**448/448**, build demo); Chromium touch con `nummo-test-casi-limite-2026-11-08.json` (profilo temporaneo cancellato): a 390 px
  Fondo 366 px, Periodo e Grafico 177 px; a 360 px 336 / 162 / 162; foglio «Grafico» con le tre voci, scelta «Blocchi» applicata; nessun
  overflow né errore JS. Committato in `fd705f3`, inviato e pubblicato su Hosting.

## Filtro «Fondo»: icona anche su smartphone — 16 novembre 2026

- Su richiesta: su smartphone il campo «Fondo» (Spese e Analisi) mostra l'icona della voce scelta (portafoglio, cerchio tratteggiato o avatar
  del fondo), come da desktop. Nuova prop `iconOnPhones` di `MenuSelect`, usata solo da `FundFilter`; gli altri selettori su smartphone restano
  senza icona. In Analisi il campo è a metà riga: i nomi lunghi dei fondi si troncano un po' prima. `npm run check` OK (**448/448**, build demo); Chromium
  390 px touch (`nummo-utente-medio.json`, profilo temporaneo cancellato): Spese con «Medio · Auto» e il suo avatar, Analisi con il
  portafoglio e «Tutti i fondi» intero; nessun overflow né errore JS. Committato in `fd705f3`, inviato e pubblicato su Hosting.

## Fondi: una sola riga «Ricarica mensile», saldo iniziale di nuovo nel modulo — 16 novembre 2026

- Su richiesta: tolta la riga «Ricarica di … il giorno …» dal riepilogo e sostituita la voce «Ricariche mensili» con **«Ricarica mensile»**:
  la ricarica del mese, ricevuta o ancora attesa nel mese (prevista nei mesi futuri), + verde o 0,00. Traduzioni non più usate rimosse
  («Ricariche mensili», «Ricariche previste», «Ricarica di {p0} il giorno {p1}», «Ricarica sospesa»).
- **«Saldo iniziale (facoltativo)»** di nuovo nel modulo Nuovo/Modifica fondo, sopra «Ricarica mensile» (come prima: vuoto = 0, alla
  `start_date`); traduzioni ripristinate.
- Verifiche: `npm run check` OK (typecheck, **448/448**, build demo). Chromium 1280 px con `nummo-test-casi-limite-2026-11-08.json` (profilo
  temporaneo cancellato): «TEST Quotidiano» con «Ricarica mensile +500,00 €» (attesa il 31), modulo Nuovo fondo con Saldo iniziale, Ricarica
  mensile e Budget mensile; nessun errore JS. Committato in `f9c4d8f`, inviato e pubblicato su Hosting.

## Fondi: riepilogo con Abbonamenti, Spese e Spesa totale, righe sempre presenti — 16 novembre 2026

- Su richiesta: il «Riepilogo del mese» ha sempre le stesse sette righe, anche a zero (zero senza segno, nel colore attenuato): Aggiunte,
  Ricariche mensili (Ricariche previste nei mesi futuri), Trasferimenti ricevuti (+ verde), Trasferimenti inviati, **Abbonamenti**, **Spese**
  (− rosso) e **Spesa totale** (grassetto, ex «Speso in totale»; «Spesa totale prevista» nei mesi futuri). Abbonamenti + Spese = Spesa totale.
- Dominio: `FundEntry.recurring` sulle spese (pagamento di una serie) e `FundMonth.subscriptions/singles` (stessa base dello speso: effettivo,
  previsione nei mesi futuri); test nuovo in `funds.test.ts`. Traduzioni «Spesa totale», «Spesa totale prevista».
- **Nota:** nel mese corrente «Ricariche mensili» conta solo le ricariche già ricevute; quella ancora attesa nel mese (prima mostrata come
  «Ricariche previste») non compare finché non matura.
- Verifiche: `npm run check` OK (typecheck, **448/448**, build demo). Chromium 1280 px chiaro/scuro con `nummo-test-casi-limite-2026-11-08.json`
  (profilo temporaneo cancellato): «TEST Quotidiano» +123,45 / 0,00 / 0,00 / −50,00 / −12,99 / −111,92 / 124,91; gli altri fondi con tutte le
  righe; nessun errore JS. Committato in `f9c4d8f`, inviato e pubblicato su Hosting.

## Fondi: ricarica nel riepilogo, importi con segno e colore — 16 novembre 2026

- Su richiesta: la riga «Ricarica di … il giorno …» non è più sotto il nome del fondo ma apre il «Riepilogo del mese». Importi del riepilogo
  in semigrassetto: entrate con «+» in verde (Aggiunte, Ricariche mensili, Ricariche previste, Trasferimenti ricevuti), uscite con «−» in
  rosso (`error`: Trasferimenti inviati), «Speso in totale» in grassetto nel colore del testo, senza segno. **Scelta mia da confermare:** la
  richiesta diceva «− rosso per i trasferimenti»; ho messo il segno secondo la direzione, quindi i trasferimenti ricevuti sono «+» verdi.
- Nuovo colore semantico `positiveColors` (`palette.ts`, chiaro `#18692C`, scuro `#7DD992`), esposto come `colors.positive`/`positiveColor()`;
  test di contrasto ≥ 4,5:1 su tutte le superfici, accenti e temi in `theme.test.ts` (il primo verde, `#1E7B34`, si fermava a 4,35).
- Verifiche: `npm run check` OK (typecheck, **447/447**, build demo). Chromium 1280 px, chiaro e scuro, `nummo-test-casi-limite-2026-11-08.json`
  (profilo temporaneo cancellato): «TEST Quotidiano» con ricarica, +123,45 Aggiunte, +500,00 Ricariche previste, −50,00 Trasferimenti
  inviati, Speso in totale 124,91; nessun errore JS. Committato in `f9c4d8f`, inviato e pubblicato su Hosting.

## «Nessuna» con icona nelle Categorie preferite, più spazio dopo l'icona nei selettori — 16 novembre 2026

- Su richiesta: in Impostazioni → «Categorie preferite» la voce «Nessuna» (Nuova spesa, Nuove liste) ha il cerchio tratteggiato
  (`NoFundAvatar`), come «Nessuno» di «Fondo preferito». Nei campi `MenuSelect` (Fondo, Ordina, Categoria, Periodo) l'icona sta in uno slot di
  24 dp con 4 dp in più prima del testo (circa 14 px invece di 8); su smartphone l'icona non c'è e nulla cambia. `npm run check` OK
  (**446/446**, build demo); Chromium 1280 px (Spese e Impostazioni, profilo temporaneo cancellato), nessun errore JS. Committato in `f9c4d8f`, inviato e pubblicato su Hosting.

## Fondi: Aggiungi/Trasferisci e ricarica di nuovo, riepilogo a soli totali; icona del fondo nel filtro — 16 novembre 2026

- Su richiesta (sostituisce in parte la voce sotto): ripristinati come prima «Aggiungi»/«Trasferisci», `MovementDialog`, il «+» della scheda
  (solo fondi con dati di saldo) e «Ricarica mensile» nel modulo, con la riga della ricarica sulla scheda (senza «Senza ricarica»). Il saldo
  iniziale resta fuori dal modulo (si conserva quello salvato); nessuna cifra di saldo.
- Scheda espansa: «Riepilogo del mese» / «Nascondi riepilogo» con soli totali (Aggiunte, Trasferimenti ricevuti/inviati, Ricariche mensili,
  Ricariche previste se presenti, Speso in totale o Spese previste); tolto l'elenco delle spese del mese.
- Filtro «Fondo»: il campo mostra l'icona della voce scelta (avatar del fondo, cerchio tratteggiato per «Senza fondo») invece del
  portafoglio fisso (`MenuSelect`: icona della voce corrente quando c'è).
- Traduzioni ripristinate da `HEAD` (30) e nuove (Aggiunte, Nascondi riepilogo, Ricariche mensili, Speso in totale); test i18n estesi.
- Verifiche: `npm run check` OK (typecheck, **446/446**, build demo). Chromium 1280 px, Standard, `nummo-test-casi-limite-2026-11-08.json` importato (profilo
  temporaneo cancellato): Aggiungi/Trasferisci e «+» presenti, dialogo Trasferisci come prima, riepilogo con «Speso in totale», campo
  Fondo con l'avatar del fondo scelto; nessun errore JS. Non provati: salvataggio di un movimento e di una ricarica nel browser,
  smartphone. Committato in `f9c4d8f`, inviato e pubblicato su Hosting.

## Templates eliminati, Fondi senza saldo — 16 novembre 2026

- **Su richiesta (screenshot di «Saldo e movimenti»), dopo due scelte dell'utente:** Fondi «tutto saldo/ricariche fuori
  dall'interfaccia» e Templates «rimozione completa». Decisioni in `docs/architecture.md`.
- **Fondi:** un fondo è un gruppo di spese con budget facoltativo. Tolti «Saldo e movimenti», «Senza ricarica», il «+» (aggiungi denaro),
  «Aggiungi»/«Trasferisci», «Disponibile ora»/«Saldo a fine mese», saldo dei fondi archiviati, «Saldo iniziale» e «Ricarica mensile» dal
  modulo, «Saldo disponibile» sotto il campo Fondo di Nuova spesa; `MovementDialog.tsx` eliminato. Testi di archiviazione e assegnazione
  senza riferimenti al saldo. **Dati di saldo invariati** (dominio, `DataStore`, Rules, backup; `fundFromForm` li riscrive identici).
- **Templates:** eliminati `features/templates/`, `domain/template.ts`, metodi `DataStore` e implementazioni, voce di menu,
  `templatesRequest`, campo in Nuova spesa, `templatesEnabled`, icona `template`, prop `amountOptional` di `ExpenseFields`, voce della
  Guida, Rules `templates/{id}` (anche in `public/firestore.rules`). **Backup v8** senza `templates`; v7/v6 letti ignorandoli. Lo store
  IndexedDB `templates` resta nello schema, inutilizzato; i documenti Firestore restano, inaccessibili.
- 75 traduzioni non più usate rimosse; Guida (IT/EN), README, AGENTS aggiornati. Test: tolto `template.test.ts`, nuovi casi (backup v7 con
  template ignorato in `localStore.test.ts`; Rules che rifiutano `templates` nell'emulatore), versioni del backup 7 → 8 in tre test.
  Le fixture di `docs/testing/` restano v6/v7 (ancora leggibili).
- Verifiche: `npm run check` OK (typecheck, **446/446**, build demo). `test:emulator` **20/20** su porte dedicate (Auth 19099,
  Firestore 18180, config temporanea in radice rimossa). Chromium 1280 px, Standard, `nummo-utente-medio.json` importato (profilo
  temporaneo cancellato): Fondi senza saldo/ricarica/Aggiungi/Trasferisci/movimenti, modulo con solo nome, colore, icona e budget, menu
  account Impostazioni / Notifiche / Categorie / Archiviazione e backup, nessun campo Template in Nuova spesa. Gli errori Metro nel log
  riguardavano gli stati intermedi durante la rimozione dei file (build finale OK). **Per l'Avanzata vanno ripubblicate le Rules**
  (solo con autorizzazione). Committato in `f9c4d8f`, inviato e pubblicato su Hosting.

## Icone dei fondi nel filtro «Fondo», budget mensile generale rimosso — 16 novembre 2026

- **Filtro «Fondo»** (Spese e Analisi): ogni voce del menu ha la sua icona: «Tutti i fondi» il portafoglio, «Senza fondo» il cerchio
  tratteggiato (`NoFundAvatar`), ogni fondo il suo `FundAvatar` (colore e icona). `MenuOption` di `MenuSelect` ha ora un `icon`
  facoltativo (slot di 24 dp, 16 dp dal testo); gli altri `MenuSelect` (Ordina, Categoria, Periodo su smartphone) invariati.
- **Budget mensile generale rimosso dall'interfaccia** (su richiesta, decisione in `docs/architecture.md`): in Fondi niente card
  «Budget mensile» né pulsante «Budget»; `GeneralBudgetDialog.tsx` eliminato, listener tolto da `useRemoteFunds`, 6 traduzioni non più
  usate rimosse; README e AGENTS aggiornati. I budget dei singoli fondi restano. **Dati non toccati:** `settings/budget`, `DataStore`,
  Rules, dominio e `general_budget` del backup invariati (un budget già salvato resta nell'archivio e nei backup, solo non mostrato).
- Verifiche: `npm run check` OK (typecheck, **451/451**, build demo). Chromium con `nummo-utente-medio.json` (che contiene un
  `general_budget`; profilo temporaneo cancellato): menu Fondo con le icone a 1280 px e nel foglio a 390 px; Fondi senza card né
  pulsante del budget generale, budget dei fondi visibili; nessun errore JS. Committato in `4bf36e2`, inviato e pubblicato.

## «Nessuna categoria» in Nuova lista e Nuova spesa, pulsante «Nuova» più grande — 16 novembre 2026

- **Bug segnalato:** senza categoria preferita per le liste, Nuova lista proponeva la prima categoria del selettore. Ora
  `ListEditor` parte dalla categoria preferita se esiste, altrimenti da **«Nessuna categoria»** (lista salvata con
  `category_id: null`, già ammesso da dominio, Rules e backup); in Modifica lista parte dalla categoria della lista (nessuna se
  manca o è stata eliminata). «Nessuna categoria» è la prima voce del selettore, con l'icona tratteggiata di «Nessun fondo».
- **Nuova spesa** (e gli altri moduli con `ExpenseFields`: Modifica, Registra spesa, Templates): stessa prima voce e stessa
  icona; senza preferita il campo mostra «Nessuna categoria» invece di restare vuoto. Il salvataggio chiede ancora una categoria
  («Seleziona una categoria.»). Traduzione EN di «Nessuna categoria» corretta in «No category» (era «No categories», usata anche
  dallo stato vuoto).
- **Liste, smartphone:** il pulsante «Nuova» del titolo è alto 56 dp (come «Salva») con etichetta 16/600; desktop invariato.
- Verifiche: `npm run check` (vedi sotto); Chromium 390 px touch, Standard, archivio nuovo con le categorie predefinite e nessuna
  preferita (profilo temporaneo cancellato): pulsante 99×56, «Categoria predefinita: Nessuna categoria» in Nuova lista,
  «Categoria: Nessuna categoria» in Nuova spesa, nessun errore JS. Non provati: salvataggio di una lista senza categoria e
  registrazione successiva nel browser, desktop, Avanzata. `npm run check` OK (typecheck, **451/451**, build demo). Committato in `4bf36e2`, inviato e pubblicato.

## Spese: prodotti in un dialogo, card «Totale» — 16 novembre 2026

- Su richiesta (screenshot): nei dettagli di una spesa registrata da una lista i prodotti non sono più elencati in riga
  («• Latte • Pasta …»). Al loro posto il pulsante tonale **«Prodotti (n)»** (icona lista) apre `ProductsDialog`
  (`features/history/`, `AppDialog` come `TransactionDetails`): titolo «Prodotti acquistati», descrizione della spesa e
  numero di prodotti, elenco scorrevole con un segno di spunta per riga e separatori, «Chiudi» (Escape chiude). Senza prodotti
  spuntati resta il testo «Nessun prodotto spuntato». Su smartphone il pulsante sta a sinistra di «Modifica» sull'ultima riga.
- **Card «Totale»** sotto i filtri della vista Spese (scelta dell'utente: totale dei risultati): somma e numero di tutte le spese
  mostrate da Fondo, ricerca e Categoria, su tutti i mesi (non solo la pagina caricata); stesso aspetto della card «Prossimo
  mese» degli Abbonamenti (`primaryContainer`, riquadro con l'icona euro). Nascosta senza risultati; nessuna regione live
  (la ricerca la cambierebbe a ogni tasto).
- Traduzioni EN aggiunte. Nessuna modifica a dati, `DataStore`, Rules o backup.
- Verifiche: `npm run check` OK (typecheck, **451/451**, build demo). Chromium headless sul server di sviluppo (8081),
  Standard, `nummo-utente-medio.json` importato con «Sostituisci» in un profilo temporaneo poi cancellato: card «6540,09 € ·
  187 spese», dettagli di «Spesa grande del mese» con «Prodotti (9)» e «Modifica», dialogo con 9 prodotti, a 1280 e 390 px;
  nessun overflow né errore JS. Non provati: tema scuro, telefono reale, Avanzata. Committato in `536b31e`, inviato e pubblicato.

## Analisi: riga dei filtri alla misura normale — 16 novembre 2026

- Su richiesta (screenshot, «più piccola, coerente con gli input delle altre sezioni»): in Analisi Fondo e Periodo usano il
  `MenuSelect` normale (didascalia `labelSmall`, valore `bodyMedium`, icone 20, 50 dp, come Ordina e Categoria di Spese;
  `FundFilter large={false}`) e il tipo di grafico il `SegmentedButtons` normale (40 dp, `labelLarge`). Larghezze su desktop:
  Fondo 260, Periodo 200, tipo di grafico 320 dp; su smartphone invariate. La prop `prominent` di `SegmentedButtons`, usata
  solo qui, è stata rimossa. Il filtro «Fondo» di Spese resta `large` (predefinito di `FundFilter`). AGENTS aggiornato.
- Verifiche: `npm run check` OK (typecheck, **451/451**, build demo). Chromium headless sul server di sviluppo (8081), Standard,
  archivio vuoto, profilo temporaneo cancellato: Periodo 200×50 e tipo di grafico 320×40 a 1280 px, 366×50 e 366×40 a 390 px,
  nessun overflow né errore JS. Il campo Fondo non era visibile (nessun fondo nell'archivio di prova): stesso componente di
  Periodo. Committato in `536b31e` con le voci seguenti, inviato e pubblicato su Hosting il 16 novembre.
- Poi, su richiesta: **da desktop** (da medium in su) «Fondo» occupa da solo tutta la prima riga; sotto, Periodo (200 dp) a
  sinistra e il tipo di grafico (320 dp) a destra, 16 dp tra le righe come in Spese. Senza fondi la prima riga non c'è.
  Smartphone invariato (Fondo e Periodo a metà, poi il tipo di grafico). `npm run check` OK (**451/451**); Chromium con
  `nummo-utente-medio.json` (profilo temporaneo cancellato): Fondo 926 px a 1280 e 682 px a 820, Periodo e grafico sulla
  riga sotto; 390 px come prima; nessun overflow né errore JS.
- Poi, su richiesta, **solo da desktop** (da medium): Periodo e tipo di grafico non sono più un menu a tendina e pulsanti a segmenti
  ma due gruppi di `ChoiceChips` (filter chip M3 dell'app, una casella per alternativa, spunta sulla scelta), con didascalia
  «Periodo» / «Tipo di grafico»: Periodo a sinistra, grafico a destra (a capo sotto, a destra, se la pagina è stretta).
  Smartphone invariato (`MenuSelect` e `SegmentedButtons`). Nessuna nuova traduzione. `npm run check` OK; Chromium con
  `nummo-utente-medio.json`: a 1280 px una riga (Periodo 534 px, grafico 297 px), a 820 px il grafico va a capo a destra, 390 px
  invariato; nessun overflow né errore JS. Nota: la casella scelta si allarga della spunta, come in tutti i `ChoiceChips`.

## Riallineamento dei documenti — 16 novembre 2026

- Su richiesta, solo documentazione: «Stato corrente» riscritto (ultimo rilascio `cdd957f`, `db43c00` non pubblicato,
  rilasci del 15 novembre in ordine, Rules ultime con `ec150a1`), punto 1 di «Prossime attività» e sezione dei Templates
  (Rules già pubblicate) corretti; in AGENTS aggiunto `templates/{uuid}` all'elenco delle collezioni della riga
  `firestore.rules`. Nessuna modifica al codice. `npm run check` OK (typecheck 0 errori, **451/451**, `dist-demo`
  esportata). `test:emulator` non rieseguito (Rules e `DataStore` invariati). Committato in `1e0b923`, poi
  `npm run deploy:hosting` (progetto `nummo-6b6e2`, solo Hosting, «Deploy complete!», sito 200): pubblica `db43c00`.
  Rules e Worker non toccati.

## Analisi su smartphone: Fondo e Periodo uguali — 15 novembre 2026

- Su richiesta: su smartphone i due selettori dividono la riga a metà (flex 1 : 1, prima 1 : 1,2). Dopo la riduzione del padding dei
  campi `large` su smartphone, «Ultimi 12 mesi» entra intero anche a 360 px (Chromium, due campi da 162 px). `npm run check` OK.
  Committato in `db43c00`, inviato a `origin/main` e pubblicato su Hosting il 16 novembre (sito 200).

## Rilascio del 15 novembre (sera, seconda parte)

- Commit `cdd957f` (fuso orario e formato 24/12 ore delle notifiche, «Filtra per fondo» rimosso, colonne delle Impostazioni, ritocchi
  ai Templates, coltello delle posate) inviato a `origin/main`, poi `npm run deploy:hosting` (progetto `nummo-6b6e2`, solo Hosting,
  «Deploy complete!», sito 200). Rules e Worker `nummo-push` non toccati (`push-service/` invariato). Le sezioni qui sotto dicono
  «Nessun commit»: sono tutte comprese in `cdd957f`. Consegna reale con un fuso diverso da Roma e resa su telefono non verificate.

## Icona «posate»: coltello ridisegnato (minimale e colorato) — 15 novembre 2026

- Segnalato dall'utente (screenshot piccolo): il coltello non sembrava un coltello (nel colorato, tema scuro, una barra chiara con una
  punta appena accennata). `utensils` in `categoryGlyphs.ts` (minimale) e `categoryColorGlyphs.ts` (colorato): lama con dorso dritto e
  filo curvo, poi manico più stretto con fondo tondo; nel colorato lama in tinta, manico nel colore base e forchetta con la testa
  piena e il dente centrale. **Sprite pixel invariato** (il coltello è ancora una colonna di celle: da ridisegnare solo su richiesta).
  `npm run check` OK (**451/451**, contrasti compresi); anteprima con la tavolozza vera (chiaro/scuro, 96 e 24 px) osservata. Nessun commit.

## Templates: testo dell'interruttore e avviso in Nuova spesa — 15 novembre 2026

- Su richiesta: sotto «Usa i template», con l'interruttore spento, il testo è solo «In Nuova spesa non compare il campo Template.»
  (acceso resta «In Nuova spesa compare il campo Template.»). Con i template accesi **ma nessuno salvato** (il campo non può comparire),
  Nuova spesa mostra sotto Fondo «Il campo Template compare quando crei un template nella pagina Templates.»; con almeno un template
  c'è il campo stesso (questo reintroduce un avviso tolto il 15 novembre per i template vuoti: lettura della richiesta «se attivo avvisa
  l'utente sotto Fondo»). `npm run check` OK; Chromium 1280 px osservato, nessun errore JS. Committato, inviato e pubblicato su Hosting (vedi «Stato corrente»).
- Poi, su richiesta: il campo Template mostra «Nessun template» con la stessa icona tratteggiata di «Nessun fondo» (`NoFundAvatar`), sia nel
  campo chiuso (valore predefinito) sia nell'elenco. `npm run check` OK; Chromium 1280 px: campo chiuso e aperto con un template di prova
  osservati (profilo temporaneo), nessun errore JS.

## Impostazioni: tolto «Filtra per fondo», colonne riordinate — 15 novembre 2026

- Su richiesta: eliminati l'interruttore «Filtra per fondo» e tutta l'implementazione per nasconderlo (preferenza `showFundFilter`,
  controlli in `Dashboard` e `Workspace`, traduzioni, test). Il filtro «Fondo» di Spese e Analisi è ora sempre presente con almeno un
  fondo; un `showFundFilter` già salvato in `nummo.preferences.v1` viene ignorato (test). AGENTS e `docs/architecture.md` aggiornati.
- Poi, su richiesta: la riga sotto «Automatico» in «Fuso orario» ora dice solo «Fuso orario: Europe/Rome» (il fuso del dispositivo), al posto di
  «Gli orari delle notifiche seguono il fuso del dispositivo: …»; con «Scegli un fuso» resta il menu «Fuso».
- Impostazioni su desktop: colonna sinistra **Lingua, Carattere, Formato dell'ora, Fuso orario**; colonna destra **Tema, Colore**
  (su smartphone stesso ordine in una colonna). `npm run check` OK (**451/451**); Chromium 1280 px osservato (controllo a 390 px:
  nessun overflow), il filtro Fondo c'è ancora in Spese, nessun errore JS. Committato, inviato e pubblicato su Hosting (vedi «Stato corrente»).

## Fuso orario a scelta per le notifiche — 15 novembre 2026

- Su richiesta (dopo la discussione: automatico di base, manuale facoltativo): scheda **«Fuso orario»** in Impostazioni (colonna destra,
  sotto «Formato dell'ora»): «Automatico» (predefinito, mostra «Gli orari delle notifiche seguono il fuso del dispositivo: …») o «Scegli
  un fuso» con un menu «Fuso» di 52 fusi comuni (da ovest a est, «Tokyo (GMT+9)», ora legale compresa) più quello del dispositivo e
  quello salvato. `timeZone` in `nummo.preferences.v1` (`auto` o nome IANA validato, altro → `auto`); `domain/timeZones.ts`,
  `resolveTimeZone` in `pushSchedule.ts`, passato da `Workspace` a `useNotifications` → `usePushNotifications`. In Notifiche la
  nota nomina il fuso solo se scelto e diverso da quello del dispositivo: «Arrivano alle 9:00 (Tokyo).».
- Limiti: lista ridotta ai fusi comuni (non tutti i ~400, nessuna ricerca); chi viaggia con l'app chiusa riceve comunque gli orari già
  inviati (con la scelta manuale restano quelli del fuso scelto, ricalcolati alla prossima apertura). Nessuna modifica a Worker, Rules o dati.
- Verifiche: `npm run check` (OK, **451/451**), test nuovi in `timeZones.test.ts`; Chromium 1280 px: scheda, menu a scorrimento, scelta
  Tokyo salvata, nota in Notifiche, nessun errore JS. Consegna reale con fuso diverso da Roma non provata. Nessun commit.

## Orario delle notifiche: fuso del dispositivo e formato 24/12 ore — 15 novembre 2026

- Su richiesta: tolta la scritta «ora italiana» («Arrivano alle 9:00.»). **Decisione:** l'ora scelta vale ora sull'orologio del
  **fuso orario del dispositivo** (`deviceTimeZone()`, Roma se il browser non lo dice), non più su Roma: chi è a Londra e sceglie
  le 9:00 riceve alle 9:00 di Londra. `pushSchedule.ts`: `zoneInstant`/`nextAtHour(from, hour, zone)` (stessi risultati di prima
  con Roma, `romeInstant` resta come scorciatoia), `timeZone` facoltativo in `backupJob`/`summaryJob`/`renewalJob`, passato da
  `usePushNotifications`. Le date civili (periodi del riepilogo, date dei rinnovi, spese) restano di Roma. Nessuna modifica al
  Worker né ai dati: il servizio riceve solo gli istanti già calcolati; chi cambia fuso (viaggio) ottiene istanti diversi e il
  nuovo elenco viene inviato al primo avvio/ricalcolo (la firma contiene gli istanti). **Limite:** in viaggio con l'app chiusa gli
  orari restano quelli del fuso di prima fino alla prossima apertura.
- **Formato dell'ora** (preferenza utente): nuova scheda «Formato dell'ora» in Impostazioni (colonna destra, sotto Colore),
  «24 ore» (predefinito, `9:00`, `21:00`) o «12 ore (AM/PM)» (`9:00 AM`, `9:00 PM`); `timeFormat` in `nummo.preferences.v1`
  (`domain/timeFormat.ts`, `formatHour`), usato nell'orario delle notifiche (nota e menu «Ora»). Traduzioni EN. README, AGENTS e
  `docs/notifiche-push.md` aggiornati.
- Verifiche: `npm run check` OK (**448/448**: fuso Londra/New York/Roma in `pushSchedule.test.ts`, nuovo `timeFormat.test.ts`);
  Chromium 1280 px: scheda in Impostazioni, «Arrivano alle 9:00 AM.» e menu delle ore in 12 ore, nessun errore JS. **Non provati:**
  consegna reale con un fuso diverso da Roma, Avanzata. Nessun commit.

## Notifiche: nota sul riepilogo, spazio nell'orario — 15 novembre 2026

- Su richiesta: sotto «Attiva riepilogo spese» la riga di supporto «Un riepilogo delle tue spese del periodo appena concluso.»
  (traduzione EN aggiunta); nella scheda «Orario delle notifiche» spazio di 16 dp (prima 8) tra la domanda, i pulsanti a
  segmenti e la nota «Arrivano alle …» (`hourBlock`). `npm run check` OK (445/445); Chromium 1280 e 390 px osservato, nessun
  overflow né errore JS. Committato, inviato e pubblicato su Hosting (vedi «Stato corrente»).
- Poi, su richiesta: nella scheda «Riepilogo spese» tolta la scritta visibile «Frequenza del riepilogo» e i pulsanti a segmenti
  (Ogni settimana / 14 giorni / mese) occupano tutta la larghezza, sotto l'interruttore (`frequency(…, showLabel = false)`;
  il nome resta accessibile). «Frequenza del promemoria» del backup invariata. `npm run check` OK; Chromium 1280 px osservato.

## Filtri di Spese e Analisi riorganizzati — 15 novembre 2026

- **Rilascio:** commit `c0b418c` inviato a `origin/main`, poi `npm run deploy:hosting` (progetto `nummo-6b6e2`, solo Hosting, «Deploy complete!», sito 200). Rules non toccate. Resa su telefono non verificata.

- Su richiesta, solo layout (nessuna modifica a stato, dati, token o stili dei componenti condivisi).
  - **Spese:** il filtro «Fondo» è nella riga del titolo (`PageHeader` `action`, a destra; 220 dp, max 55 %), per entrambe le
    viste; sotto i segmenti Spese/Abbonamenti resta una sola barra: ricerca + «Ordina» e «Categoria» in un gruppo
    (`ExpenseList`). Su smartphone la ricerca occupa la riga e le due selezioni stanno affiancate sotto, a metà ciascuna.
  - **Analisi (rivisto subito dopo):** «Periodo» e «Fondo» sono due `MenuSelect` affiancati a sinistra (200 dp ciascuno; su
    smartphone metà riga ciascuno); il tipo di grafico è un `SegmentedButtons` (Ciambella/Barre/Blocchi) a destra, dove prima
    stava «Fondo» (320 dp; sotto i selettori, a destra, se la pagina è stretta, a tutta larghezza su smartphone), sempre
    visibile anche senza spese nel periodo. I chip del periodo scorrevoli e la prop `noWrap` di `ChoiceChips` sono stati
    rimossi (`ChoiceChips` invariato rispetto a prima). Traduzione «Grafico» rimossa.
  - **Tipo di grafico più rilevante, selettori invertiti** (su richiesta): `SegmentedButtons` ha la prop opzionale `prominent`
    (52 dp, etichetta 16/600, usata solo dal tipo di grafico in Analisi, 400 dp a destra); i due selettori ora sono **Fondo** a
    sinistra e **Periodo** accanto. Il predefinito di `SegmentedButtons` (40 dp) non cambia. Chromium a 1280, 768 e 390 px
    osservato, nessun overflow né errore JS.
  - **Ordine della riga invertito** (su richiesta): il tipo di grafico è a **sinistra** (400 dp), Fondo e Periodo insieme a **destra**
    (a capo sotto, sempre a destra, se la pagina è stretta; su smartphone il tipo di grafico è la prima riga, i due selettori
    la seconda). Chromium 1280, 768 e 390 px osservato, nessun overflow. Sostituisce l'ordine delle voci precedenti.
  - **Spese: «Fondo» sotto i segmenti** (su richiesta, sostituisce la collocazione nel titolo): il filtro è sotto
    Spese/Abbonamenti e occupa tutta la larghezza della sezione (`fundFilter: { alignSelf: 'stretch' }` in `Workspace`), sopra la
    barra di ricerca/ordina/categoria; il titolo torna senza azione. Il menu `matchFieldWidth` ha un tetto di 480 dp
    (`matchedMenuMax`), così un campo largo come la pagina non produce un menu largo come la pagina. Chromium 1280, 700 e
    390 px: campo 936 px e menu 480 px a 1280, nessun overflow.
  - **«Fondo» più grande, menu a tutta larghezza** (su richiesta; sostituisce il tetto di 480 dp): nuova prop `large` di
    `MenuSelect` (campo 58 dp, poi 50, didascalia `labelMedium`, valore `bodyLarge`, icone 24, padding 16), usata da «Fondo» (sempre, in
    Spese e Analisi) e da «Periodo» in Analisi, per tenerli alla stessa altezza; Ordina e Categoria restano a 50 dp. In Analisi
    Fondo 270 dp e Periodo 220 dp. Il menu di «Fondo» è largo quanto il campo senza tetto (936 px a 1280 in Spese). Chromium
    1280, 700 e 390 px osservato, nessun overflow.
  - **Ordine, testo del menu, campi più piccoli** (su richiesta): in Analisi di nuovo **Fondo e Periodo a sinistra**, tipo di
    grafico a destra (a capo sotto, a destra, se la pagina è stretta; su smartphone i selettori sono la prima riga). Testo
    delle voci del menu «Fondo» più grande: fino a 18 con spazio (campo largo, es. Spese), minimo 16 (prima 16 → 15), poi su
    due righe. Campi `large` a 54 dp (prima 58); Fondo 290 dp (poi allungato da 250) e Periodo 210 dp in Analisi. Sostituisce l'ordine e le misure
    delle voci precedenti. Chromium 1280, 768 e 390 px osservato, nessun overflow.
  - **Riga dei filtri di Analisi più piccola e coerente con le altre pagine** (su richiesta): campi `large` ora alti 50 dp come
    gli altri selettori (testo ancora più grande, icone 24); `SegmentedButtons` `prominent` 48 dp, etichetta 15/600 (prima 52 e
    16); larghezze Fondo 260, Periodo 220 (a 190 «Questo mese» si troncava) e tipo di grafico 360 dp. Sostituisce le misure
    precedenti (54/58 dp, 290/210/400). Chromium 1280, 768 e 390 px osservato.
  - **«Fondo» più lungo, testo coerente col resto** (su richiesta): le voci del menu «Fondo» ora usano 16 dp fissi, come i menu
    di `SelectField` (tolta la scala 16–18 e `rowChrome`; il nome lungo va su due righe), il valore del campo resta `bodyLarge`
    (16, come i campi di testo). Analisi: Fondo 300 dp, Periodo 220; su smartphone Fondo e Periodo dividono la riga 1 : 1,2
    (Periodo un po' più largo: «Ultimi 12 mesi» entra intero a 360 px; con 1 : 1,15 e 3 : 2 si troncava), con padding 12 e
    freccia 20 nei campi `large` su smartphone. Chromium 1280, 768, 390 e 360 px osservato, nessun errore JS.
  - **Ritocchi** (su richiesta): testo minimo delle voci del menu «Fondo» da 13 a 15 (più leggibile su desktop; il nome lungo va
    su due righe); su smartphone più spazio (20 dp, prima 12) tra la riga del tipo di grafico e i due selettori. Chromium
    1280 e 390 px osservato.
  - **Menu del filtro «Fondo»** (segnalato due volte con screenshot; **sostituisce** la prima soluzione, il campo allargato):
    nuova prop `matchFieldWidth` di `MenuSelect`, usata solo da `FundFilter`: da medium in su il menu è largo **esattamente
    quanto il campo** (240 dp in Analisi e nel titolo di Spese); le voci rimpiccioliscono il testo in blocco (16 → min 15) in
    base alla voce più lunga misurata, poi vanno su due righe. Gli altri `MenuSelect` (Ordina, Categoria, Periodo) mantengono
    max(campo, voce più lunga); su smartphone nulla cambia (foglio). Misurato in Chromium con un fondo «Demo · Conto
    quotidiano (archiviato)»: campo 240 px = menu 240 px a 1280 e 700 px; nome lungo su due righe. Fondo di prova creato nel
    profilo temporaneo, poi non conservato.
- Verifiche: `npm run check` OK (typecheck, **445/445**, build demo). Chromium headless (Standard, backup `nummo-utente-medio.json`
  importato in un profilo temporaneo, server di sviluppo 8081) a 1280, 768 e 390 px: Spese e Analisi osservate, nessun overflow
  orizzontale, nessun errore JS. **Non provati:** touch reale, Avanzata, 320 px e landscape.
  Committato, inviato e pubblicato su Hosting (vedi «Stato corrente»).

## Notifiche: immagine grande trasparente (cerchio grigio con «N») — 15 novembre 2026

- Dopo la pubblicazione di `f454d12` l'utente (Pixel, screenshot) vede, senza `icon`, un cerchio grigio con la «N» a destra:
  Chrome per Android genera quel segnaposto quando l'immagine grande manca (le altre app non lo mostrano). Correzione in
  `public/sw.js`: `icon` è un PNG 64×64 **completamente trasparente** in data URI (nessuna richiesta di rete, vale anche
  offline), uguale per tutti i tipi; `badge` (la piccola a sinistra) invariato. Test sul formato e sull'uguaglianza per tipo.
- `npm test` OK (439/439). **Non verificato su telefono** (il rendering delle notifiche Android non è osservabile qui): se
  Chrome mostrasse ancora qualcosa a destra, l'alternativa è installare Nummo come app (le notifiche della WebAPK non
  usano il segnaposto del sito). Committato in `e0c2850`, inviato a `origin/main` e pubblicato su Hosting (sito 200, `sw.js` con `blankIcon`); Worker non
  ripubblicato (`push-service/` invariato). **Verificato dall'utente sul telefono (Pixel, Chrome):** la notifica di prova è
  pulita, senza icona quadrata né cerchio grigio con la «N»; resta la piccola a sinistra. Non ancora verificati: consegna reale
  ad app chiusa del promemoria dei rinnovi e dell'orario scelto; filtro per fondo e stato con data in Avanzata.

## Templates: testi del form — 15 novembre 2026

- Introduzione della pagina ora: «Un template è una spesa già pronta, semplifica la gestione delle spese.»

- Su richiesta: etichetta visibile **«Importo (facoltativo)»** nel form dei template (prop `amountOptional` di `ExpenseFields`),
  elenco vuoto → «Nessun template.» (tolto «Creane uno qui sopra.»), pulsante **«Crea»** (era «Crea template»), grande come «Salva» di Nuova spesa per altezza ed etichetta (`controlHeight`, 16/600), a **destra** (larghezza minima 140), con 8 dp in più sopra per avere la stessa distanza che separa gli altri campi. `npm run
  check` OK. Nessun commit.

## Icone minimali ingrandite, niente messaggio sui template vuoti — 15 novembre 2026

- Su richiesta: il set **minimale** è ora ingrandito del 10 % come il colorato (`glyphZoom`/`zoomed` in `categoryIconSets.ts`,
  al posto di `colorfulZoom`; applicato alla forma risolta, i glifi in `categoryGlyphs.ts` restano invariati; il pixel resta
  a celle intere). Test aggiornati. In Nuova spesa, con i template accesi ma nessun template salvato, il campo semplicemente
  non compare (tolto «Nessun template: creane uno dal menu Templates.»). `npm run check` OK (445/445). Nessun commit.

## Templates: campi identici a Nuova spesa — 15 novembre 2026

- Su richiesta: il form di un template usa ora **gli stessi campi di Nuova spesa** (`ExpenseFields`: importo e data sulla stessa
  riga, descrizione, categoria, poi Fondo; stessa versione compatta su desktop), senza la ricorrenza; solo l'importo può
  restare vuoto (prop `amountOptional`, cambia solo il nome accessibile). Tolta dalla spiegazione la frase «Poi controlli e
  salvi.»; rimosse le traduzioni non più usate. `npm run check` OK (445/445); Chromium 1280 px osservato, nessun errore JS.
  Committato, inviato e pubblicato su Hosting (vedi «Stato corrente»).

## Icona dell'app più stondata, carrello semplificato — 15 novembre 2026

- Segnalato dall'utente (launcher desktop): l'icona risultava troppo squadrata. Causa: `icon-192.png`/`icon-512.png` erano
  quadrati **opachi** (RGB, nessun alpha), quindi i launcher li mostravano a spigoli vivi. Ora `icon.svg`, `icon-192.png` e
  `icon-512.png` hanno un fondo «squircle» di stondatura ampia (stile Material 3 Expressive) con angoli **trasparenti** (PNG
  RGBA resi con Chromium headless). `icon-maskable-512.png` e `apple-touch-icon.png` restano quadrati (li maschera il sistema).
  Dopo la pubblicazione, il launcher/WebAPK può tenere in cache la vecchia icona: potrebbe servire reinstallare l'app.
- **Carrello** ridisegnato solo in **minimale** e **colorato**: maniglia, cestino pieno e due ruote, senza doghe (pixel art
  invariata, su richiesta). Colorato con contorno nero come prima.
- Verifiche: anteprima in Chromium (chiaro/scuro) e test; non verificato su un launcher reale. Nessun commit.

## Templates di «Nuova spesa» — 15 novembre 2026

- Su richiesta: pagina **Templates** nel menu account (sotto Categorie, icona documento) con interruttore «Usa i template»
  (spento di base), breve introduzione, form «Nuovo template» (descrizione, importo **facoltativo**, data, categoria, fondo) ed
  elenco con modifica/elimina; in Nuova spesa, con l'interruttore acceso, compare il campo **Template** sotto Fondo (stesso
  `SelectField`): scegliendolo compila importo (se presente), data, descrizione, categoria e fondo, mai la ricorrenza.
- Architettura (decisione in `docs/architecture.md`): dati d'archivio in **entrambe** le modalità. `domain/template.ts`;
  `DataStore` + `firestoreStore` + `localStore`; Firestore `templates/{uuid}` con Rules (**da pubblicare**, copia in
  `public/firestore.rules` aggiornata); IndexedDB: store `templates`, passo 2 dello schema locale; backup **v7**
  (`templates`), importazione unione/sostituzione; `onQueuedWriteError` con più ascoltatori. Limite 100 template.
- Verifiche: `npm run typecheck`, `npm test` (nuovi: `template.test.ts`, template e backup in `localStore.test.ts`, schema,
  preferenze), `test:emulator` **20/20** su porte dedicate (Auth 19099, Firestore 18180, config temporanea rimossa; nuovo caso
  «template»: regole, scritture, modifica, eliminazione, backup). Chromium 412 px touch (Standard, archivio di prova,
  profilo temporaneo cancellato): voce di menu, interruttore, creazione, campo Template in Nuova spesa (importo, data,
  descrizione, categoria e fondo compilati), dialogo di modifica ed eliminazione con conferma; nessun errore JS.
  **Non provati:** Avanzata nel browser (solo emulatore/Rules), tablet/desktop, Safari. Le Rules necessarie sono state poi
  pubblicate con `ec150a1` (vedi «Stato corrente»).

## Orario delle notifiche a scelta — 15 novembre 2026

- Su richiesta: scheda **«Orario delle notifiche»** in Notifiche (Mattina 9:00 predefinito, Pranzo 13:00, Sera 19:00, «Altra» con
  menu delle ore 7–22; ora di Roma). `reminderHour` in `nummo.notifications.v1` (valori fuori 7–22 → 9); vale per backup,
  riepilogo e rinnovi (`nextAtHour`, `romeInstant`); sostituisce `daytime`/`quietHours` (fascia 9–21). Un backup in ritardo o
  rinviato aspetta la prossima occorrenza dell'ora scelta. Nessuna modifica al Worker né ai dati: il servizio riceve solo
  gli istanti già calcolati; cambiare l'ora rinvia gli orari al primo avvio/ricalcolo.
- Verifiche: `npm run typecheck` e `npm test` OK (**439/439**: ora scelta per i tre tipi, estremi e valori non validi);
  Chromium 412 px touch: scheda con «Altra» e menu «Ora», nessun errore JS. Consegna alle ore scelte non provata. Nessun commit.

## Notifiche: tolta l'icona quadrata a destra — 15 novembre 2026

- Segnalato dall'utente (Pixel, screenshot): l'icona dell'app compariva due volte, la seconda quadrata a destra del testo.
  Era l'opzione `icon` (`/icons/icon-192.png`) di `showNotification` in `public/sw.js`, che Android mostra come immagine
  grande. Tolta per **tutti** i tipi (backup, riepilogo, rinnovo, prova push, prova locale, generica: passano da un'unica
  funzione); resta `badge` e la piccola a sinistra. Test aggiornato. Da riprovare sul telefono dopo la pubblicazione
  (`sw.js` cambia: il browser lo aggiorna al prossimo avvio). Nessun commit.

## Prossimo mese, filtro per fondo, pausa/annullamento datati, promemoria dei rinnovi — 15 novembre 2026

- **«Prossimi rinnovi» → «Prossimo mese»** (card della vista Abbonamenti; etichetta accessibile e traduzione EN).
- **Filtro «Fondo»** in Spese (viste Spese e Abbonamenti, card compresa) e in Analisi (tutti, senza fondo, un fondo, anche
  archiviato); `FundFilter`, `filterByFund`/`effectiveFundFilter` in `history.ts`, `Occurrence.fund_id` facoltativo. Interruttore
  **«Filtra per fondo»** in Impostazioni → Funzionalità (`showFundFilter`, predefinito acceso); spento, il filtro scompare e
  vale «tutti». Nessun dato cambia.
- **Pausa/annullamento con data (soluzione 1):** `StatusDialog` («Da oggi» / «Da una data passata», anteprima dei pagamenti
  tolti, `paymentsRemoved`); `setStatus(changes, status, data)`; la riattivazione resta da oggi. Nessuna modifica a Rules,
  schema o backup (le Rules accettano già qualsiasi data in `status_changes`).
- **Promemoria dei rinnovi:** prima non esisteva nessuna notifica per gli abbonamenti. Nuovo tipo `renewal` (domain
  `renewalJob`, `push-service/service.ts`, `public/sw.js`, apertura su Spese → Abbonamenti), interruttore «Avvisa prima dei
  rinnovi» in Notifiche (card «Rinnovi degli abbonamenti», `renewalEnabled`, predefinito acceso). Alle 9:00 del giorno prima;
  il servizio tiene un solo promemoria alla volta (il successivo parte quando l'app rinvia gli orari); riceve solo la data.
  **Attenzione al deploy:** il Worker `nummo-push` pubblicato rifiuta il tipo `renewal` (e con esso tutto l'elenco degli
  orari): ripubblicare prima il Worker (`wrangler deploy --config push-service/wrangler.toml`, solo con autorizzazione), poi
  l'Hosting. Nessuna migrazione D1.
- **Notifiche su smartphone:** più spazio (20 invece di 12) tra «Frequenza del promemoria/riepilogo» e i pulsanti a segmenti.
- Verifiche: `npm run check` OK; test nuovi (stato datato, filtro per fondo, `renewalJob`, servizio push, service worker,
  preferenze, icone). Chromium 500 px touch su archivio di prova (Standard, `nummo-utente-medio.json`, profilo temporaneo
  cancellato): filtro e card «Prossimo mese» (830,87 € → 10,99 € con un fondo), filtro in Analisi, dialogo con anteprima
  («Verranno tolti 3 pagamenti (8,97 €)») e annullamento al 1 ago confermato («Annullato dal 1 ago 2026», card 4 rinnovi),
  interruttore che nasconde il filtro, pagina Notifiche con la nuova scheda; nessun errore JS. **Non provati:** Avanzata,
  consegna reale del promemoria (servono Worker ripubblicato e un dispositivo), tablet/desktop. Nessun commit.

## Icone: regalo viola/bianco, carrello ridisegnato, set colorato ingrandito, pizza pixel più piccola — 15 novembre 2026

- Su richiesta, dopo il riallineamento dei documenti (HANDOFF «Prossime attività» punti 0–1 aggiornati; nessuna altra
  incoerenza tra AGENTS e codice).
- **Regalo (`gift`):** nuova tinta `purple` in `iconPalette.ts` (base viola, tinta lavanda, dettagli `o` **bianchi in
  entrambi i temi**, base abbastanza chiara nel tema scuro per il bianco); disegno colorato e sprite pixel viola con nastro e
  fiocco bianchi. Le altre icone viola (`violet`: musica, film, tv, gamepad…) restano invariate.
- **Carrello (`cart`)** ridisegnato in tutte e tre le versioni: outline con tre doghe e ruote, colorato (cestino pieno, doghe
  chiare, contorno nero come richiesto, ruote chiare), pixel (maniglia, cestino con doghe, due ruote); stessa tinta `green`.
- **Set colorato ingrandito** del 10 % (`colorfulZoom` = 1,1 in `categoryIconSets.ts`, trasformazione attorno al centro
  applicata al disegno risolto; il pixel non viene mai scalato). **Pizza pixel** da 12×12 a 10×10 celle.
- Verifiche: `npm run typecheck` e `npm test` OK (**432/432** al momento di quella fase (poi 438/438), due test nuovi in `categoryIcons.test.ts`; contrasti della
  palette verificati anche per `purple`). Anteprima in Chromium headless (chiaro/scuro, 144 e 24 px) osservata; non verificate
  le dimensioni nelle liste reali dell'app, né `build:demo`. Nessun commit.

## Issue #4 e #5: riscontri dal Pixel 8, dissolvenza del segnaposto d'avvio — 15 novembre 2026

- **#4 (dal telefono dell'utente, screenshot):** app installata con barra di navigazione `#121212` in entrambi i temi, come
  previsto; nella scheda di Chrome la barra segue la pagina (edge-to-edge del browser, non disponibile alle app installate:
  `WebAppShortEdgesCutoutMode` con `enable_standalone` spento di default nel sorgente Chromium). Alternative discusse
  (togliere `theme_color`, colore chiaro, TWA, flag): nessuna scelta; issue ancora aperta, nessuna modifica.
- **#5 (video dell'utente, tema chiaro, Avanzata):** una sola splash, nessun ricaricamento, titolo fermo. Restano: dissolvenza
  di Chrome splash scura → pagina chiara con logo sovrapposto (~0,3 s, piattaforma; l'utente ha scelto di **lasciare la splash
  com'è**) e ~0,7 s di guscio con indicatore prima che il modulo comparisse di scatto.
- **Modifica (su richiesta):** `StartupCover` in `App.tsx` sostituisce i due montaggi condizionali del segnaposto sopra l'area di
  lavoro (Standard e Avanzata): compare subito, esce con dissolvenza di `motion.short` (150 ms, `usePresence` +
  `fadeTransition`), senza intercettare tocchi durante l'uscita; con movimento ridotto esce subito. L'attesa dei dati non cambia.
- Verifiche: `npm run check` OK (**430/430**, build demo). Chromium headless 412 px, CPU ×4, build demo in Standard (profilo
  temporaneo cancellato): copertura a opacità 1 → in uscita con `pointer-events: none` → rimossa dopo ~150 ms; con
  `prefers-reduced-motion` rimossa subito; nessun errore JS. **Non provato:** Avanzata nel browser, Pixel 8 (serve la
  pubblicazione e un nuovo video). Poi, su richiesta: commit `1889755`, push, `deploy:hosting` (sito 200), issue #4 e #5 commentate e chiuse.

## Impostazioni: rimosso «Mostra budget mensile», budget sempre visibili — 15 novembre 2026

- Su richiesta: eliminati l'interruttore «Mostra budget mensile» e tutta l'implementazione per nascondere i budget
  (preferenza `showGeneralBudget`, prop `showGeneralBudget`/`showBudget` di `FundsPage`, `FundCard`, `FundEditor`, budget
  residuo azzerato in `Workspace`). Ora sempre visibili: budget generale e «Imposta un budget mensile» in Fondi,
  misuratori sulle schede, «Budget mensile» in Nuovo/Modifica fondo, budget residuo sotto il campo Fondo. Un
  `showGeneralBudget` già salvato in `nummo.preferences.v1` viene ignorato (test). Traduzioni rimosse; AGENTS e
  `docs/architecture.md` (sezione del 12 novembre segnata come superata) aggiornati. `fundFromForm` accetta ancora un
  budget omesso (nessuna modifica), usato dai test.
- Verifiche: `npm run check` OK (**430/430**, build demo). Chromium 360 px touch con `showGeneralBudget: false` salvato
  (Standard, profilo temporaneo poi cancellato): «Imposta un budget mensile» presente in Fondi, interruttore «Budget
  mensile» in Nuovo fondo, in Impostazioni solo andamento, liste e fondi archiviati; nessun errore JS. Committato, inviato e pubblicato su Hosting (vedi «Stato corrente»).

## Impostazioni: «Mostra fondi archiviati»; tolta la nota del saldo iniziale — 15 novembre 2026

- Su richiesta: in Impostazioni → Funzionalità, sotto «Mostra liste archiviate», nuovo interruttore **«Mostra fondi
  archiviati»** («Nella pagina Fondi, i fondi che non usi più.»), preferenza `showArchivedFunds` in `nummo.preferences.v1`
  (predefinito acceso, solo booleani, come `showArchivedLists`). Spento, la pagina Fondi non offre «Fondi archiviati (n)»;
  nessun dato cambia. Tolta da Modifica fondo la nota «Saldo iniziale al … Correggerlo ricalcola tutti i saldi del fondo.»
  (traduzione rimossa). AGENTS aggiornato.
- Verifiche: `npm run check` OK (**430/430**, nuovo test in `preferences.test.ts`, caso in `i18n.test.ts`, build demo).
  Chromium 360 px touch (Standard, profilo temporaneo poi cancellato): nota assente in Modifica fondo; fondo archiviato →
  «Fondi archiviati (1)»; interruttore spento → voce assente e `showArchivedFunds: false` salvato; riacceso → voce di nuovo
  presente; nessun errore JS. Committato, inviato e pubblicato su Hosting (vedi «Stato corrente»).

## Modulo del fondo: niente «Tieni traccia del saldo», saldo iniziale facoltativo — 15 novembre 2026

- Su richiesta: tolto l'interruttore «Tieni traccia del saldo». Ordine del modulo: nome, colore, icona, **«Saldo iniziale
  (facoltativo)»** sempre visibile, poi gli interruttori **Ricarica mensile** e **Budget mensile** (quest'ultimo solo con
  «Mostra budget mensile»). Tolte le scritte «I soldi presenti oggi nel fondo.» e «Le modifiche valgono dalla prossima
  scadenza: gli accrediti già ricevuti non cambiano. Nei mesi più corti un giorno 29, 30 o 31 diventa l'ultimo del mese.»
  (restano le regole: ricarica da ora in poi, giorno limitato alla fine del mese). In Modifica resta la nota «Saldo
  iniziale al …». Il modulo invia sempre `balance` (vuoto = 0, ricarica spenta = nessuna da ora): un fondo con solo nome è
  un gruppo di spese, con saldo iniziale o ricarica ha il saldo (`hasBalanceData`). Svuotare il saldo iniziale lo riporta
  a 0; ricariche passate e movimenti restano. Rimossi `balanceLocked`, la prop `movements` di `FundEditor`, l'errore
  «Inserisci un saldo iniziale o attiva la ricarica mensile.» e le traduzioni non più usate. Nessuna modifica a Rules,
  schema, backup o `DataStore`. AGENTS, README, `docs/architecture.md` aggiornati.
- Verifiche: `npm run check` OK (**429/429**, test del modulo aggiornati, build demo). Chromium 360 px touch (Standard,
  profilo temporaneo poi cancellato): scritte assenti, ordine Saldo iniziale → Ricarica → Budget, due interruttori spenti;
  fondo con solo nome → nessun «Aggiungi»; fondo con saldo 500 → «Aggiungi» presente e 500,00 mostrato; screenshot con
  Ricarica accesa corretto; nessun errore JS. Non provati: Avanzata, modifica di un fondo con ricariche passate. Nessun commit.

## Nuova lista e Nuovo fondo: tastiera subito su smartphone — 15 novembre 2026

- Su richiesta: su touch-first i dialoghi **Nuova lista** (Liste) e **Nuovo fondo** (Fondi) danno il focus al campo del
  nome all'apertura, così la tastiera si apre subito. Solo questi due e solo in creazione: Modifica lista/fondo, prodotti,
  budget e ogni altro dialogo o foglio continuano a dare il focus all'overlay. Nuova prop `focusTextEntry` di `AppDialog`
  → `useFocusHandoff(…, textEntry)` → `initialFocusAllowed(element, touchFirst, textEntry)`. Nuovo fondo con archivio non
  pronto: il nome è `readonly`, quindi niente focus né tastiera (come prima). AGENTS «Overlay» aggiornato.
- Verifiche: `npm run check` OK (**429/429**, due asserzioni nuove in `viewport.test.ts`, build demo). Chromium headless
  360 px con emulazione touch (`hover: none`, `pointer: coarse`) sul server di sviluppo, Standard, profilo temporaneo poi
  cancellato, tocchi via CDP: Nuova lista → focus su «Nome della lista», Nuovo fondo → «Nome del fondo», «Imposta un
  budget mensile» → focus sul dialogo (nessun campo); nessun errore JS. La tastiera virtuale **non** è osservabile in
  headless: da confermare su telefono reale. Su Safari/iOS il focus arriva dopo l'animazione d'apertura, fuori dal gesto
  del tocco, e iOS di norma non apre la tastiera in quel caso. Nessun commit.

## Fondi: saldo facoltativo per fondo («Tieni traccia del saldo») — 15 novembre 2026

- Segnalato dall'utente: in un archivio importato mancavano Aggiungi/Trasferisci e nell'app non c'era modo di impostare
  saldo iniziale o ricarica automatica. Causa: dalla #7 erano offerti solo ai fondi con dati di saldo di versioni
  precedenti. Scelta dall'utente l'opzione 3 (decisione in `docs/architecture.md`).
- `FundEditor`: interruttore «Tieni traccia del saldo» con «Saldo iniziale» e «Ricarica mensile» (importo, giorno);
  bloccato acceso con ricariche o movimenti; acceso senza saldo né ricarica → «Inserisci un saldo iniziale o attiva la
  ricarica mensile.». `fundFromForm` accetta `balance` (omesso = dati invariati); nuovo `balanceLocked`. `setRecharge`:
  scadenza di questo mese già passata → dal mese dopo (prima l'accredito retroattivo veniva contato). `FundsPage`:
  Aggiungi con almeno un fondo attivo con saldo, Trasferisci con almeno due, `MovementDialog` solo su quei fondi.
  Nessuna modifica a Rules, schema, backup o `DataStore`. Guida, README, AGENTS ed EN aggiornati.
- Verifiche: `npm run check` OK (**429/429**, 2 test nuovi in `generalBudget.test.ts`, build demo). Chromium 1280 px
  (Standard, profilo temporaneo poi cancellato): errore con interruttore acceso e campi vuoti; fondo «Prova» 500 € +
  ricarica 100 € il giorno 1 creato, «Disponibile ora» 500 €, ricarica mostrata, Aggiungi presente e Trasferisci assente
  (un solo fondo con saldo, anche dopo un fondo semplice), in Modifica interruttore acceso e disabilitato; dialogo
  Aggiungi aperto; nessun errore JS. Non provati: Avanzata (stesse scritture `updateFund`/`createFund` già ammesse dalle
  Rules), smartphone, trasferimento effettivo. Nessun commit.

## Smartphone: niente selezione del testo con doppio tocco — 15 novembre 2026

- Segnalato dall'utente: su telefono un doppio tocco su una scritta la selezionava e Chrome apriva dal basso la ricerca
  Google della parola (Tocca per cercare). `GlobalStyle`: solo su dispositivi touch-first
  (`(hover: none) and (pointer: coarse)`) `user-select: none` e `-webkit-touch-callout: none` sul `body`; `input`,
  `textarea` e `contenteditable` restano selezionabili, come i valori da copiare con `Text selectable` (email nel menu
  account, valori di `StorageSection` e `FirebaseSetup`). Desktop invariato.
- Verifiche: Chromium headless con emulazione touch sul server di sviluppo (8081, profilo temporaneo poi cancellato):
  etichette con `user-select: none`, `input` con `text`; senza touch `auto` e il doppio clic seleziona ancora. Il doppio
  tocco sintetico via CDP non seleziona nemmeno senza la regola, quindi la ricerca di Chrome **non** è riprodotta: da
  confermare su telefono reale. `npm run check` OK (**427/427** con modifiche parallele non mie sul Firebase
  personale, build demo). Nessun commit.

## Avanzata: collegare il proprio Firebase dall'app (soluzione A) — 15 novembre 2026

- Su richiesta, dopo la discussione delle alternative (A configurazione nell'app, B un Firebase per tutti, C invariato):
  **A**, con proprietario **manuale guidato** (scelta dell'utente: Rules invariate, nessuna auto-nomina).
- **Implementato:** `services/customFirebase.ts` (parser del blocco `firebaseConfig` incollato, 4 chiavi validate,
  `nummo.firebaseConfig.v1`); `backendConfig.ts` → `activeFirebaseConfig`/`firebaseConfigProblems` (cloud: progetti reali;
  emulator: solo `demo-`; hybrid: mai); `firebase.ts` usa la configurazione attiva. `features/session/FirebaseSetup.tsx`:
  `FirebaseConnect` (4 passaggi della Console, indirizzo e regole con «Copia», campo di incolla, «Collega»/«Annulla»,
  «Torna al progetto di questo sito») e `OwnerSetup` («Ultimo passaggio»: UID con «Copia», `config/owner`, «Controlla di
  nuovo», «Cambia progetto Firebase», «Esci»); `firebaseConnection.ts` (`switchFirebase`: esce, salva, ricarica).
  Punti d'ingresso: link sotto «Accedi con Google», scheda in «Questo Nummo è privato», scheda «Configurazione Firebase
  mancante»; in «Archiviazione e backup» «Progetto collegato da te» e «Scollega progetto» (dialogo). `public/firestore.rules`
  copia identica (test). Testi di scelta modalità e Guida aggiornati; README, `docs/firebase-personale.md` (anche il vecchio
  «Spese → Dati»), `docs/architecture.md`, AGENTS. Traduzioni EN; tolte le due chiavi «Per chi ha installato…».
- **Verifiche:** `npm run check` OK (typecheck, **427/427** con `tests/customFirebase.test.ts`, build demo). E2E Chromium
  360 px touch su build demo dedicata (Auth 19099, Firestore 18180 senza `singleProjectMode`, config temporanea in radice
  rimossa, server statico 8099 fermato): link nella schermata di accesso, pagina, regole servite e copiate negli appunti,
  errori (testo non riconosciuto, `appId` non valido), salvataggio di sole 4 chiavi, ricaricamento con «Progetto Firebase
  collegato: demo-mio», accesso dal popup dell'emulatore, «Ultimo passaggio» con UID, «Controlla di nuovo» senza
  proprietario → resta, `config/owner` creato come amministratore dell'emulatore → area di lavoro, Archiviazione con
  «Progetto collegato da te», «Scollega» → chiave rimossa e accesso al progetto del sito. Nessun errore JS.
  **Non verificato:** progetto Firebase reale (dominio autorizzato, Regole pubblicate da Console), Safari/iOS (appunti),
  desktop. `test:emulator` non rieseguito (Rules invariate). Hosting non ripubblicato; nessun commit.
- Nel worktree ci sono modifiche **di un'altra sessione in parallelo**, lasciate intatte: `src/domain/funds.ts`,
  `features/funds/FundEditor.tsx`, `FundsPage.tsx`, `tests/generalBudget.test.ts`, parte di `src/i18n/en.ts` (saldo nel
  modulo del fondo, `balanceLocked`, ricarica mai nel passato) e `src/theme/GlobalStyle.tsx` (niente selezione del testo
  su touch). Un loro duplicato temporaneo in `en.ts` ha fatto fallire un typecheck, poi corretto da loro; ultimo stato
  complessivo: typecheck 0 errori, `npm test` **429/429**, `build:cloud` verificata (`dist/`, nessuna pubblicazione).

## Dettagli spesa su smartphone e anteprima dei Blocchi senza tocco — 15 novembre 2026

- **Spese → dettagli su smartphone** (segnalato: spazio inutilizzato). «Modifica» stava fra Categoria e Prodotti e, non
  entrando accanto a Data e Categoria, occupava una riga da solo. Ora su compact (`ExpenseList`) chiude l'ultima riga:
  accanto ai prodotti per le spese da lista, accanto ai campi (che vanno a capo nello spazio rimasto) per le altre.
  Desktop invariato (ordine Data, Categoria, Ripetizione, Prodotti, Modifica; una spesa non ha insieme prodotti e
  ripetizione). Chromium 360 px con touch: spesa da lista 9 prodotti → prodotti in colonna a sinistra, Modifica in basso a
  destra; spesa semplice → Data/Categoria a sinistra, Modifica a destra, nessuna riga vuota; 1280 px una riga (87 px).
- **Analisi → Blocchi: anteprima senza tocco** (segnalato: pannello con il blocco maggiore e «Seleziona il blocco…»
  senza averlo toccato). Causa: il tocco lascia il focus sulla tessera e il browser riemette `focus` quando finestra o
  scheda tornano attive; `onFocus` attivava l'anteprima. Ora l'anteprima da focus vale solo con `:focus-visible`
  (tastiera). Riprodotto in Chromium (tocco, ritocco, blur/focus) con il codice precedente; dopo la correzione il pannello
  resta sull'invito, mentre Tab mostra ancora l'anteprima. Nessun errore JS.
- Verifiche: `npm run check` OK (typecheck, **423/423**, build demo); `git diff --check` OK. Telefono reale non provato.
  Committato, inviato e pubblicato su Hosting (vedi «Stato corrente»).
- Poi, su richiesta: Notifiche → «Frequenza del promemoria/riepilogo» su pagina stretta, spazio tra etichetta e pulsanti
  a segmenti da 8 a 12 px (`rowGap` di `styles.frequency`); desktop invariato. `npm run check` OK; non osservato nel browser.

## Solo notifiche di sistema (fase 2), backup contato al download, ritocchi — 15 novembre 2026

- **Avvisi dentro l'app eliminati** su richiesta («voglio solo le notifiche mediante il sistema operativo»): rimossi
  `NotificationCards.tsx` e il suo montaggio, il controllo ogni 15 minuti, `dueNotifications`/`summaryDue` (con i test).
  Restano la pagina Notifiche (interruttori, frequenze, «Esporta backup»/«Ricordamelo tra 3 giorni» quando il promemoria
  è dovuto, riepilogo del periodo aperto da una notifica) e gli ascoltatori di ritorno in primo piano.
- **«Hai salvato il backup?» eliminato**: il download del backup completo (Notifiche o Archiviazione e backup) conta come
  backup (`recordBackup`, ex `confirmBackup`). Cambia la regola precedente «mai al solo avvio del download»: AGENTS,
  README, `docs/notifiche-push.md` (fase 2 segnata come eseguita), `docs/architecture.md`, testi «confermato» tolti da
  pagina, `sw.js` e Guida («Avvisi e promemoria» ora dice che gli avvisi arrivano come notifiche del dispositivo se attivate).
- Tolta poi, su richiesta, la nota «Può accedere solo il proprietario di questo Nummo.» sotto «Accedi con Google».
  Schermata di accesso resa omogenea: i due pulsanti in un solo gruppo (niente Card attorno ad «Accedi con Google»),
  stessa larghezza e altezza 48, spazio 12 tra loro; verificata in Chromium a 1280 px (480×48 e 478×48, nessun errore JS).
- Spese → dettagli di una spesa singola più compatti (`ExpenseList`): campi larghi quanto il testo, affiancati (spazio 32),
  «Modifica» spinto a destra sulla stessa riga quando c'è spazio, altrimenti a capo; prodotti e ripetizione restano a tutta
  riga. Chromium (Standard, spesa di prova in profilo temporaneo poi cancellato): dettagli alti 75 px su una riga sia a 1280
  sia a 412 px, nessun errore JS. Abbonamenti (`SubscriptionList`) invariati.
  Poi, per le spese da lista: «Prodotti acquistati» occupa lo spazio rimasto sulla riga (non più tutta la riga), così su
  desktop Data, Categoria, Prodotti e «Modifica» stanno su una riga (75 px); su smartphone «Modifica» sale accanto a Data e
  Categoria e i prodotti vanno sotto (127 px, prima 179). Verificato in Chromium con una lista di 6 prodotti registrata in
  un profilo temporaneo (Standard), nessun errore JS.
- **Creazione di categorie dai moduli abbandonata** su richiesta: tolta la voce «Nuova categoria» in fondo al selettore e il
  pulsante «Crea categoria» dello stato vuoto in Nuova spesa, Nuova/Modifica lista e Registra spesa (Liste). Rimossi
  `CategoryCreation`, la prop `action` di `SelectField` (non più usata), le props `onCreateCategory`/`canCreateCategory`/
  `categoryError` di `ExpenseForm`, `onAddCategory` di `ExpenseFields`, `categoryCreation`/`notify` dei dialoghi di Liste.
  Senza categorie lo stato vuoto dice «Serve almeno una categoria per salvare la spesa: creala nella pagina Categorie.».
  Le categorie si creano solo nella pagina Categorie (invariata, `CategoryEditor` resta per la modifica). `npm run check`
  OK (422/422, build demo); non verificato nel browser.
- Abbonamenti (`SubscriptionList`): «Metti in pausa» / «Riattiva» spostati al centro, tra «Annulla abbonamento» e
  «Modifica» (per un abbonamento annullato: Riattiva, Modifica). Stili e etichette brevi su smartphone invariati.
  `npm run check` OK; non verificato nel browser.
- Fondo preferito: nuova sezione «Fondo preferito» nelle Impostazioni (`funds/PreferredFundCard.tsx`, sotto «Categorie
  preferite», solo con almeno un fondo attivo; selettore «Nuova spesa» con «Nessuno» + fondi attivi), stessa chiave
  `nummo.defaultFund.v1.<uid>`. Tolto dalle schede di Fondi il pulsante «Usa come predefinito»/«Togli come predefinito»;
  il segno sulla scheda ora dice «Preferito». Archiviare il fondo preferito lo toglie ancora come prima. Traduzioni non
  più usate rimosse. `npm run check` OK (422/422). Chromium (Standard, profilo temporaneo): fondo «Risparmi» creato,
  pulsante assente, sezione presente con «Nessuno»/«Risparmi», scelta salvata per `local`, badge in Fondi, Nuova spesa
  propone «Risparmi»; nessun errore JS.
- Fondi: tolta dalla scheda del fondo la nota «Un fondo con movimenti o spese collegate non si può eliminare: archivialo…»
  (resta l'assenza di «Elimina» per i fondi in uso). Nuova icona `NoFundAvatar` (`FundAvatar.tsx`: cerchio tratteggiato
  `outline` con trattino) per «Nessun fondo» nel campo Fondo e per «Nessuno» in «Fondo preferito». `npm run check` OK;
  Chromium: campo Fondo di Nuova spesa con l'icona accanto a «Nessun fondo», nessun errore JS.
- Descrizione della spesa (`ExpenseFields`: Nuova spesa, Modifica, Registra spesa): la scrittura e l'incolla si fermano a
  100 caratteri (`clipToLength` in `domain/policy.ts`, conteggio per code point come il contatore; emoji = 1). Test in
  `expense.test.ts` (**423/423**). Chromium: 200 + 5 caratteri inseriti → campo a 100, contatore «100/100», nessun
  messaggio d'errore. Altri campi con limite (nomi di lista, prodotto, fondo, categoria) invariati.
- Notifiche: tolto il testo di supporto «Totale, numero di spese e categoria principale del periodo concluso. Abbonamenti
  esclusi.» sotto «Attiva riepilogo spese».
- Notifiche, «Frequenza del promemoria/riepilogo»: riga omogenea all'interruttore sopra (stesso testo `bodyLarge`, padding
  e altezza minima 56), scelte a destra su desktop; su smartphone sotto l'etichetta con etichette brevi «Settimana»,
  «14 giorni», «Mese» su una riga (nome accessibile completo: nuovo campo facoltativo `accessibilityLabel` di
  `ChoiceChips`). Chromium 1280 e 412 px osservati, nessun errore JS. **Superato subito dopo:** a 360 px le etichette
  brevi andavano ancora a capo; la frequenza usa ora `SegmentedButtons` (una riga, 40 dp), larghi 420 a destra
  dell'etichetta su pagina larga, a tutta larghezza sotto l'etichetta sotto i 640 px di pagina **misurata** (non la
  classe di finestra), con etichette brevi e nome accessibile completo. `ChoiceChips` riportato com'era.
  Chromium: 360 px con emulazione touch e 1280 px osservati, una riga, nessun errore JS.
- Impostazioni: ordine ora **Lingua, Carattere, Tema** (sinistra) e Colore (destra), uguale su smartphone; verificato a
  1280 e 412 px.
- Barra inferiore che «sparisce e riappare» toccando un campo (segnalata in emulazione desktop): misurata con emulazione
  touch a 360 px, nascosta al tocco e di nuovo visibile a 800 ms. È il comportamento previsto: senza tastiera virtuale
  (emulazione desktop, tastiera fisica) l'anticipo scade dopo 800 ms e la barra torna; su telefono la tastiera riduce il
  viewport e la barra resta nascosta finché è aperta. Nessuna modifica; da confermare su telefono reale.
- Categorie: la conferma di eliminazione mostra ora «L’operazione non può essere annullata.» (traduzione già presente).
- Altri ritocchi richiesti: Impostazioni nell'ordine Tema, Lingua, Carattere (sinistra) e Colore (destra), uguale su
  smartphone; «Fatto» un po' più piccolo (48 dp, etichetta 16); tolta da «Questo Nummo è privato» la riga con l'UID
  per chi installa; in Aggiungi/Trasferisci dei Fondi il segmento «Giroconto» diventa **«Spostamento»** (EN «Transfer»).
- Verifiche: `npm run check` OK (typecheck, **422/422**, build demo); `git diff --check` OK. Chromium headless (Standard):
  1280 e 412 px ordine Tema, Lingua, Carattere, Colore; «Fatto» 111×48; nessun errore JS. Non provati nel browser: pagina
  Notifiche senza avvisi, download che aggiorna «Ultimo backup», dialogo dei movimenti. Hosting non ripubblicato
  (`sw.js` cambiato: i testi nuovi arrivano dopo la pubblicazione). Nessun commit.

## Impostazioni riordinate, «Fatto» più evidente, budget nascosti ovunque, liste archiviate — 15 novembre 2026

- Su richiesta:
  - Impostazioni: ordine Tema, Carattere, Lingua (colonna sinistra su desktop), poi Colore (colonna destra); su smartphone
    stessa sequenza in una colonna.
  - «Fatto» delle pagine del menu account: nuovo `components/DoneButton.tsx`, pillola `contained-tonal` alta 52 con
    etichetta 17/600 (prima pulsante di testo); usato da `SettingsPage` e dall'intestazione di Categorie, Notifiche,
    Archiviazione e backup (`Workspace.tsx`).
  - Notifiche: tolti «Restano gli avvisi dentro Nummo.» (due stati delle notifiche di sistema), «Ricevi un riepilogo
    periodico delle tue spese.» e «(consigliato)» dalla frequenza settimanale.
  - Spese → dettagli di una spesa da lista: prodotti uno dopo l'altro senza larghezza minima di 140 px (spazio 12).
  - Funzionalità: nuovo interruttore «Mostra liste archiviate» (`showArchivedLists` in `nummo.preferences.v1`,
    predefinito acceso); spento, la pagina Liste non offre più «Liste archiviate (n)». Nessun dato cambia.
  - **Soluzione A** sui budget: con «Mostra budget mensile» spento sono nascosti anche i misuratori «Budget di …» sulle
    schede dei fondi e «Budget residuo del mese» / «Budget del mese superato» sotto il campo Fondo (Nuova spesa, modifica,
    registrazione lista). I piani restano salvati; testo dell'interruttore aggiornato.
- Domande poste all'utente (la prima risolta nella sezione sopra: avvisi eliminati), **senza modifiche**: eliminare gli avvisi dentro Nummo (`NotificationCards`, ancora attivi
  quando le notifiche di sistema non sono attive, più «Hai salvato il backup?» dopo ogni download); promemoria backup in
  Avanzata (oggi solo Standard per scelta, AGENTS «Notifiche»).
- Verifiche: `npm run check` OK (typecheck, **423/423**, build demo). Chromium headless sul server di sviluppo
  (Standard): 1280 px Tema/Carattere/Lingua a x 280, Colore a x 759; 412 px ordine Tema, Carattere, Lingua, Colore;
  «Fatto» 125×52; quattro interruttori in Funzionalità compreso «Mostra liste archiviate»; nessun errore JS. Non provati
  nel browser: Liste con interruttore spento, budget nascosti in Fondi e sotto il campo Fondo, dettagli prodotti.
  Committato, inviato e pubblicato su Hosting (vedi «Stato corrente»).

## Categorie preferite, barre di scorrimento dei dialoghi, Impostazioni e Analisi — 15 novembre 2026

- Su richiesta:
  - Tolta in Modifica serie la nota «Il fondo vale per tutti i pagamenti della serie, anche quelli già effettuati.»
    (`ExpenseEditor`); comportamento invariato.
  - Nei dialoghi e nei fogli la barra di scorrimento compare solo mentre si scorre e scompare ~0,9 s dopo:
    `observeScrolling` (`src/theme/viewport.ts`, attributo `data-scrolling` sull'elemento scorso) e due regole CSS in
    `GlobalStyle` limitate a `[role=dialog]`. Nessuna `transition` CSS (una regola su tutti gli elementi sovrascriverebbe
    quelle di RN Web). Le pagine conservano la barra sottile sempre visibile.
  - Impostazioni: nuova sezione **«Categorie preferite»** sotto Funzionalità, con due selettori «Nuova spesa» e «Nuove
    liste» (prima voce «Nessuna»). Visibile solo con un archivio aperto (le categorie vengono dal workspace tramite il
    nuovo argomento `archiveSections` di `renderSettings`), non nella scelta modalità né da disconnessi. Salvata per
    archivio in `nummo.preferredCategories.v1.<uid>` (solo ID, validati in lettura). Nuova spesa parte dalla preferita
    finché la bozza non ne ha una propria (anche dopo ogni salvataggio); Nuova/Modifica lista: categoria della lista, poi
    preferita, poi la prima. Una categoria eliminata viene ignorata.
  - Analisi: rimosso il periodo «Ultimi 6 mesi» (`periods` in `domain/history.ts`); una scelta salvata torna al periodo
    predefinito (Questo mese).
  - Impostazioni su desktop: colonne di nuovo **Lingua/Tema a sinistra, Colore/Carattere a destra** (stesso ordine del DOM
    anche su smartphone).
- Discusso, senza modifiche: cosa fare dei budget dei fondi quando «Mostra budget mensile» è spento (oggi restano visibili
  i misuratori sulle schede dei fondi e il «Budget residuo del mese» sotto il campo Fondo).
- Verifiche: `npm run check` OK (typecheck, **422/422** test, build demo; nuovi `preferredCategories` 2, caso in
  `viewport`, preferenze con «half-year» → predefinito). Chromium headless/CDP sul server di sviluppo (Standard, profilo
  temporaneo): Impostazioni a 1280 px con Lingua (x 280) e Tema a sinistra, Colore (x 759) e Carattere a destra, «Categorie
  preferite» sotto Funzionalità, opzioni «Nessuna» + 5 predefinite; scelta «Trasporti» salvata per `local` e mostrata in
  Nuova spesa; «Ultimi 6 mesi» assente; Nuovo fondo a 1280×420: `scrollbar-color` trasparente a riposo, colore
  `outline` durante lo scorrimento, di nuovo trasparente dopo la pausa; nessun errore JS. Non provati: Liste nel browser,
  Avanzata, smartphone reali (sugli overlay Android/iOS le barre sono già a scomparsa). Nessun commit.

## Avanzata: schermata «Questo Nummo è privato» per account non autorizzati; `TODO.md` — 15 novembre 2026

- Segnalato dall'utente: accedendo in Avanzata con un account Google diverso dal proprietario compariva l'area di lavoro
  con «Dati non disponibili» e «Accesso negato: verifica UID del proprietario e regole Firestore del progetto.».
  Discussa la situazione (BYOF: il sito pubblicato usa il progetto del proprietario) e scelta la soluzione «a».
- **Implementato:** `src/services/ownerAccess.ts` (`checkOwnerAccess`: una lettura dal server di `config/owner` dopo
  l'accesso; `permission-denied` → `denied`, offline o altri errori → `unknown`, che non blocca). In `AdvancedRoot`
  (`App.tsx`) il controllo parte insieme all'area di lavoro, senza ritardarne l'avvio; se rifiutato l'area di lavoro
  viene smontata (listener fermati) e compare `AccessDenied` (`src/features/session/`): «Questo Nummo è privato»,
  account usato, «Usa la modalità Standard» (esce e passa a Standard) ed «Esci», più una riga con l'UID per chi ha
  installato la propria copia. Lo stesso schermo vale per il proprietario finché `config/owner` o le Rules mancano.
  Testi: scelta della modalità («Per chi ha installato la propria copia di Nummo con Firebase…»), nota sotto «Accedi
  con Google» («Può accedere solo il proprietario di questo Nummo.»), voce Avanzata della Guida. Traduzioni EN.
  Nessuna modifica a Rules, `DataStore` o dati.
- **`TODO.md`** nuovo in radice (citato in AGENTS): link di precompilazione di Nuova spesa, soluzione «c» (un unico
  Firebase per tutti, con le decisioni di prodotto da prendere), open banking e import estratto conto solo valutati.
- **Verifiche:** `npm run check` OK (typecheck, **419/419** test, build demo); `test:emulator` su porte dedicate
  (Auth 19099, Firestore 18180, config temporanea in radice rimossa) **19/19**, nuovo caso: proprietario `owner`,
  estraneo e anonimo `denied`. **Non verificato nel browser** (schermata, pulsanti, cambio a Standard) né in cloud con un
  secondo account reale. Hosting non ripubblicato; nessun commit.

## Fondi: note di aiuto rimosse, esempio «Es. Risparmi» — 15 novembre 2026

- Su richiesta, tolte quattro scritte: in `FundEditor` «Vale dal mese corrente: i mesi passati restano come sono.» (modifica
  del budget) e «Saldo iniziale e ricariche di una versione precedente restano conservati.»; in `MovementDialog` le note di
  Trasferisci («Un trasferimento sposta denaro…») e Aggiungi («Un'entrata aggiunge denaro…»). Comportamento invariato: i
  dati di saldo restano riscritti da `fundFromForm` e il budget vale ancora dal mese corrente. Senza la nota sul saldo, la
  sezione budget compare solo con `showBudget` (prima anche per i fondi con saldo, pur vuota). Resta la nota sulle eccezioni.
- Segnaposto del nome del fondo: «Es. Vacanze» → «Es. Risparmi» (EN «E.g. Savings»); traduzioni non più usate rimosse.
- `npm run check` OK (418/418, build demo). Resa nel browser non verificata; nessun commit.

## Dialoghi: niente tastiera automatica su touch; riallineamento documenti — 15 novembre 2026

- Segnalato dall'utente su Android (screenshot di «Modifica spesa» in Spese): all'apertura di un dialogo la tastiera
  virtuale copriva metà del pannello. Causa: `useFocusHandoff` (`Overlay.tsx`, usato da `AppDialog`, `AnchoredMenu`,
  `BottomSheet`) dava il focus al primo elemento, anche a un campo di testo (Importo); in più `autoFocus` espliciti in
  Nuova/Modifica lista e Modifica prodotto (`ListDialogs.tsx`).
- Correzione: nuova regola pura `initialFocusAllowed` (`src/theme/viewport.ts`): su dispositivi touch-first
  (`(hover: none) and (pointer: coarse)`) un campo scrivibile non riceve mai il focus all'apertura; lo prende il
  contenitore dell'overlay (`tabindex="-1"`, senza contorno), così il focus lascia la pagina sotto, Tab raggiunge il
  campo ed Escape chiude. Sul desktop invariato (focus sul primo campo); voci di menu e pulsanti invariati. Tolti gli
  `autoFocus` di `ListDialogs.tsx` (sul desktop il focus al primo campo resta dato da `useFocusHandoff`). Test in
  `tests/viewport.test.ts`.
- Documenti: questa sezione di stato, sezioni del 15 novembre marcate come committate, ordine cronologico, nota
  superata sulla Guida, versioni dei backup di prova, `docs/testing/README.md` («Archiviazione e backup»), traduzione
  orfana «Dalla pagina Importa ed esporta…» rimossa da `en.ts`, regola della Guida in AGENTS precisata sulle notifiche.
- Verifiche: `npm run check` OK (typecheck, **418/418** test, build demo); `git diff --check` OK. Chromium headless/CDP
  sul server di sviluppo dell'utente (8081, Standard, profilo temporaneo, 412 px), Liste → «Nuova»: con emulazione touch
  (`hover: none`/`pointer: coarse` veri, tocchi CDP) focus sul contenitore del dialogo (`DIV tabindex=-1`), nessun campo
  attivo; senza touch focus sul campo «Nome della lista»; Escape chiude in entrambi i casi. Modifica spesa non provata
  nel browser (stesso `AppDialog`). **Non provato su telefono reale** (tastiera virtuale vera). Nessun commit.

## Console: «Blocked aria-hidden» sul pulsante «Nuova spesa» — 15 novembre 2026

- Avviso di Chrome segnalato dall'utente: premendo il pulsante tondo della barra mobile si apre Nuova e lo slot del
  pulsante si chiude con `aria-hidden` mentre il pulsante ha ancora il focus. `AppShell.tsx`: lo slot nascosto usa ora
  `inert` (come la barra), che toglie anche il focus.
- Chromium headless sul server di sviluppo (Standard, 412 px), pressione reale dopo Spese: prima della correzione a 60 ms il
  focus era su un `BUTTON` dentro un antenato `aria-hidden="true"` (condizione dell'avviso); dopo, focus su `BODY` e nessun
  antenato nascosto. L'avviso in sé non arriva via CDP: verificata la condizione, non il testo. `npm run check` OK.
  Committato in `336ca60` e inviato a `origin/main`; Hosting non ripubblicato.

## Console: `<button>` annidato anche in SelectField — 15 novembre 2026

- Dopo il ricaricamento l'utente vedeva ancora l'avviso, ora sulla freccia a destra di `SelectField` (Categoria): la
  correzione di `f77f42a` copriva solo `leadingIcon`. Nuovo `decorativeIcon` in `FieldIcon.tsx` (IconButton Paper con
  `role="presentation"`, fuori da Tab e accessibilità), usato da `leadingIcon`, dalle due icone di `SelectField` (senza
  focus del campo) e dall'icona della nuova categoria in `CategorySettings`. Le icone «Cancella ricerca» restano pulsanti veri
  (non sono dentro un altro pulsante).
- Verifica in Chromium headless (profilo temporaneo, server di sviluppo 8081, Standard, 412 px): 0 `button button`,
  adornamenti resi come `DIV`, console con i soli avvisi React DevTools e `useNativeDriver`. `npm run check` OK (417/417).
  Committato in `336ca60` e inviato a `origin/main`; Hosting non ripubblicato.

## Impostazioni: due colonne su desktop, Colore e Carattere a sinistra — 14 novembre 2026

- Su richiesta: `SettingsPage` su pagina larga (da 2 × 360 + 32 = 752 px effettivi, prima 872) mostra due colonne
  indipendenti, poi invertite su richiesta: Colore e Carattere a sinistra, Lingua e Tema a destra (ordine del DOM
  scambiato solo su pagina larga, così focus da tastiera e lettura seguono la vista); Stile delle icone e Funzionalità
  seguono a tutta larghezza. Su smartphone ordine invariato, una colonna. AGENTS aggiornato.
- `npm run check` OK (416/416, build demo). Chromium headless sulla build demo (schermata di scelta → Impostazioni):
  screenshot 1280 scuro (due colonne) e 412 (una colonna) osservati, nessun overflow orizzontale a 1280/1024/412.
  Con drawer/rail del workspace non provato nel browser; nessun commit.

## Commit, push e pubblicazione Hosting — 14 novembre 2026

- Su richiesta esplicita dell'utente (incluse le modifiche di un'altra sessione presenti nel working tree): commit
  `f77f42a`, push su `origin/main`, `npm run deploy:hosting` sul progetto `nummo-6b6e2` (sito live, solo Hosting) riuscito
  verso le 18:41 UTC; pagina principale risponde 200. Rules **non** pubblicate. Resa sui dispositivi non verificata.

## Console di Chrome: ciclo di import e `<button>` annidato — 14 novembre 2026

- Analizzati i messaggi della console in sviluppo segnalati dall'utente. Corretti:
  - **Require cycle `trial.ts ↔ expense.ts`**: `isValidDate` spostata in `domain/policy.ts` (accanto a `todayInRome`),
    riesportata da `expense.ts` per gli import esistenti; `trial.ts` importa da `policy.ts`. Controllo con script: nessun
    altro ciclo di import a runtime in `src/`.
  - **`<button>` dentro `<button>`** in `DateField` (e potenzialmente negli altri campi-azione): l'icona decorativa
    `leadingIcon` (`FieldIcon.tsx`) è un `IconButton` Paper; ora ha `role="presentation"`, così RN Web la rende come `<div>`
    (resta fuori da Tab e albero di accessibilità; un clic continua a dare il focus al campo).
- Non da correggere nel codice: avviso React DevTools; `useNativeDriver` di Paper senza modulo nativo (fallback JS normale
  sul web); `ERR_BLOCKED_BY_CLIENT` sulla chiusura del canale Listen verso l'emulatore 8180 (estensione di blocco nel
  browser); `UnableToResolveError` per `react-native-paper`/`hyphenate-style-name`: `node_modules` reinstallato alle 18:36
  mentre Metro era attivo; dipendenze presenti (`npm ls` OK), lockfile invariato, runner riavviato con `--clear` alle 19:25.
- `npm run check` OK (417/417, build demo). Assenza dei messaggi nella console **non verificata nel browser**. Nessun commit.

## Navigazione mobile: barra sparita scorrendo il modulo — 14 novembre 2026

- Segnalato dall'utente su iPhone (Nuova spesa, sezione ricorrente): scorrendo verso il basso la barra inferiore spariva,
  lasciando il proprio spazio vuoto. Causa: il `pointerdown` touch su un campo scrivibile anticipa la tastiera
  (`opacity: 0` con spazio riservato, scadenza 800 ms); se il dito parte su un campo e il gesto diventa uno scorrimento la
  tastiera non arriva, ma la barra restava nascosta, e con un modulo pieno di campi spariva a ogni scorrimento.
- Correzione in `observeVirtualKeyboard` (`src/theme/viewport.ts`): `pointercancel` o `scroll` (in cattura) mentre
  l'anticipo è in corso e nessun campo di testo ha il focus annullano subito l'anticipo. Un tocco vero (focus sul campo,
  poi scorrimento per mostrarlo) resta nascosto come prima. Nuovo test in `tests/viewport.test.ts`.
- Verificato solo con test unitari e `npm run check`; **non provato su iPhone/Android reali**. Nessun commit.

## Accesso: «Usa Nummo senza account» come pulsante con contorno — 14 novembre 2026

- Su richiesta: nella schermata di accesso (Avanzata, disconnessi) il collegamento testuale diventa un pulsante
  `outlined` a tutta larghezza sotto «Accedi con Google», stessa altezza minima (48), etichetta centrata (`SignIn.tsx`).
- `npm run check` OK (416/416, build demo). Resa nel browser non verificata; nessun commit.

## Spese singole: Elimina spostato in Modifica — 14 novembre 2026

- Su richiesta: nei dettagli di una spesa singola (`ExpenseList`) resta solo «Modifica»; «Elimina» è ora nel dialogo
  «Modifica spesa» (`ExpenseEditor`), a sinistra di Annulla/Salva come già per le serie, con la stessa conferma
  (`DeleteAction`, nota sulla lista collegata che torna attiva). Tolti `renderDelete` da `ExpenseList` e
  `renderExpenseDelete` da `Workspace`. Supera la sezione «Azioni nei dettagli delle spese singole» del 12 novembre.
- `npm run check` OK (416/416, build demo). Resa nel browser non verificata; nessun commit.

## Liste: categoria predefinita sempre scelta — 14 novembre 2026

- Su richiesta: in Nuova/Modifica lista (`ListEditor`) tolta la voce «Nessuna categoria predefinita»; il selettore propone
  la categoria della lista se esiste ancora, altrimenti la prima dell'elenco (calcolata al render: vale anche se le
  categorie arrivano dopo l'apertura). Senza alcuna categoria la lista si salva ancora senza (`category_id` null resta
  ammesso da dominio, Rules e backup; liste esistenti invariate finché non si salvano). Traduzione non più usata rimossa.
- `npm run check` OK (416/416, build demo). Resa nel browser non verificata; nessun commit.

## Notifiche: rimosso l'interruttore generale — 14 novembre 2026

- Su richiesta: eliminata la scheda «Notifiche generali» («Attiva notifiche») dalla pagina Notifiche. Con le notifiche di
  sistema attive gli avvisi arrivano ad app aperta e chiusa; restano gli interruttori di Promemoria backup e Riepilogo spese.
- `enabled` tolto da `NotificationPreferences`; un vecchio `enabled: false` salvato spegne in lettura backup e riepilogo
  (nessun avviso riparte da solo). Traduzioni non più usate rimosse, README/AGENTS aggiornati.
- `npm run check` OK (416/416, build demo). Non pubblicato né committato; nel working tree restano anche
  `Button.tsx`/`SubscriptionList.tsx` di un'altra sessione.

## Notifiche di sistema Web Push, fase 1 — 14 novembre 2026

- **Implementato** (dettagli, configurazione e fase 2 in `docs/notifiche-push.md`, decisione in `docs/architecture.md`):
  `push-service/` (servizio di invio con sola WebCrypto: Cloudflare Workers + D1 o Node + `node:sqlite`), `public/sw.js`
  (solo notifiche, nessuna cache), `domain/pushSchedule.ts` (orari calcolati sul dispositivo), `services/pushNotifications.ts`,
  `usePushNotifications`, scheda «Notifiche di sistema» in Notifiche (attiva, prova locale, «Prova con Nummo chiusa»,
  disattiva, stati non supportato / iPhone senza Home / non configurato / bloccato), riepilogo del periodo e azioni del
  promemoria backup nella pagina aperta dalla notifica, badge `public/icons/badge-96.png`, variabili
  `EXPO_PUBLIC_NUMMO_PUSH_URL`/`_KEY` in `envPolicy`, script `push:local`/`push:keys`, testo della Guida «Avvisi e promemoria».
  Nessuna dipendenza nuova. Avvisi in-app **conservati** come ripiego e spenti nel browser con push attivo.
- **Verifiche.** `npm run check` OK: typecheck, **416/416** test (nuovi `webPush` 3 con vettore RFC 8291, `pushService` 7,
  `pushSchedule` 4, `serviceWorker` 3, `envPolicy` esteso), build demo; `git diff --check` OK. Prova reale su questo
  computer: Chromium 156 headless, build demo Standard con push verso `push-service/local.ts`: **23/23**, compresa una
  **push vera ricevuta tramite il servizio di Google e mostrata con nessuna pagina di Nummo aperta** (~30 s). Screenshot
  412 px della pagina osservato, nessun overflow. Processi di prova arrestati; hybrid dell'utente non toccato.
- **Non verificato:** clic reale sulla notifica del sistema (solo sandbox), Firefox, Safari, Android, iOS (solo da Home),
  Windows/macOS, Avanzata nel browser, Cloudflare reale (nessun deploy né risorsa creata). Chiavi VAPID di prova in
  `push-service/.local/` (ignorata), da non usare in produzione.
- **Preparazione produzione (14 novembre, su richiesta, senza deploy):** D1 remoto `nummo-push` creato (regione EEUR) e
  schema di `service.ts` applicato con `d1 execute --remote` (tabelle `subscriptions`, `jobs`, `sent`, indice `jobs_due`);
  `push-service/wrangler.toml` (ignorato) con `database_id`, chiave VAPID pubblica di produzione, `VAPID_SUBJECT` mailto e
  origini `web.app`/`firebaseapp.com`; in `.env.production.local` `EXPO_PUBLIC_NUMMO_PUSH_KEY` (VAPID pubblica) e
  URL `https://nummo-push.artemis-nord.workers.dev`. Chiavi VAPID rigenerate dall'utente (la prima coppia era finita in chat);
  segreto `VAPID_PRIVATE_KEY` e deploy del Worker eseguiti dall'utente. Hosting non pubblicato.
- **Incidente 14 novembre (risolto):** `npx wrangler` lanciato in `push-service/` gira dalla radice del pacchetto: senza config
  ha generato `wrangler.jsonc` e pubblicato `dist/` come Worker `nummo`. L'utente l'ha eliminato con i file generati e ha
  pubblicato `nummo-push` con `--config push-service/wrangler.toml` (template ora con `workers_dev = true`, guida corretta).
- **Verificato in remoto (17:23 UTC):** solo il Worker `nummo-push`; `/v1/health` 200 con la chiave pubblica nuova; preflight
  CORS 204 da `web.app`, 403 da origine estranea; cron ogni minuto; binding `DB`, `VAPID_*`, `ALLOWED_ORIGINS`. Non verificati:
  corrispondenza della chiave privata (solo con una push reale) e consegna sui dispositivi.
- **Pubblicazione (14 novembre, dall'utente):** `deploy:hosting` eseguito; l'utente riferisce che tutto funziona, compresa
  «Prova con Nummo chiusa» (dispositivi e browser non specificati, non verificati da questa sessione).
  Brave: funziona dopo «Use Google services for push messaging» + riavvio (riferito dall'utente; nota in `docs/notifiche-push.md`).
- **Prossimo passo possibile, solo su richiesta:**
  fase 2 (rimozione di `NotificationCards`, del controllo ogni 15 minuti e spostamento di «Hai salvato il backup?»).
- Durante il lavoro un'altra sessione ha modificato Guida, Archiviazione e backup, modulo spesa e documenti: modifiche
  conservate e incluse nei controlli sopra. Nessun commit, push o deploy.

## Nuova spesa: senza divisori, Salva a destra su desktop — 14 novembre 2026

- `RepeatField`: tolti i divisori tra frequenza, Prova gratuita e Prezzo promozionale (spazio tra i gruppi allineato a quello tra campo Fondo e «Ricorrente»: `blockGap` in `ExpenseForm`, 24 dp su smartphone, 16 su desktop, più il margine interno delle righe con interruttore; vale anche per Salva).
  `ExpenseForm`: su expanded Salva era stato allineato a destra, poi (su richiesta) di nuovo a tutta larghezza come su smartphone/medium.
- `npm run check` OK. Resa nel browser non verificata.

## Pagina «Cos'è Nummo» riscritta — 14 novembre 2026

- `Guide.tsx` sostituita con il testo fornito dall'utente: introduzione, «Le funzioni principali» (cinque voci), «Dove sono i
  tuoi dati (Privacy e Backup)» con modalità Standard/Avanzata e nota sugli archivi separati, «Avvisi e promemoria». Rimosse le
  sezioni di dettaglio (categorie, liste, abbonamenti, fondi, esportazione, notifiche): la pagina è ora una presentazione.
  Traduzioni EN aggiunte, 43 chiavi non più usate rimosse. In AGENTS.md la regola per aggiornare la pagina (chiara, semplice, per un utente medio).
- Ritocchi al testo fornito: la nota sul cambio modalità cita «Archiviazione e backup» (non più Impostazioni) e gli avvisi dicono
  che non arrivano notifiche ad app chiusa e che il promemoria backup vale in Standard (il testo originale parlava di «notifiche
  invasive» e di backup per entrambe le modalità, non vero oggi).
  Superato dalla fase Web Push dello stesso giorno: oggi la Guida dice che, con le notifiche di sistema attivate dalla
  pagina Notifiche, gli avvisi arrivano anche ad app chiusa.
- `npm run check` OK (413/413, build demo). Resa nel browser non verificata.

## Archiviazione e backup: sezione spostata dalle Impostazioni — 14 novembre 2026

- Su richiesta la sezione «Archiviazione e backup» (dove sono i dati, protezione locale in Standard, progetto/account/cache
  in Avanzata, «Cambia modalità») passa dalle Impostazioni alla testa della pagina, ora rinominata **«Archiviazione e backup»**
  (prima «Importa ed esporta»; voce di menu, titolo, Guida, README, AGENTS). Icona del menu: nuovo glifo `database`.
  Tutte le azioni di backup (CSV, JSON, importa, unisci/sostituisci) invariate. Rimosso dalla sezione il pulsante «Importa ed
  esporta file» (ora puntava alla pagina stessa). `SettingsPage` non riceve più `storage`; `storage` è una prop di `DataWorkspace`.
- Conseguenza: da disconnessi in Avanzata le Impostazioni non mostrano più progetto Firebase né «Cambia modalità»
  (resta «Usa Nummo senza account» nella schermata di accesso).
- `npm run check` OK (413/413, typecheck, build demo). Resa nel browser **non verificata**.

## Riallineamento documentale dopo la rimozione di Drive — 14 novembre 2026

- `docs/architecture.md`, «Flusso attivo»: diagramma e testo descrivono ora le due modalità (IndexedDB in Standard,
  Firestore in Avanzata, una sola fonte di verità per modalità, Firebase solo in Avanzata) e `DataWorkspace`/`DataStore`
  al posto del solo `RemoteWorkspace`/Firestore.
- HANDOFF: «Stato corrente» riportato in apertura ed elencate tutte le modifiche locali di fasi distinte; la vecchia
  sezione del 12–13 novembre rinominata «Storico» con nota di superamento.
- `docs/testing/` ridotto dall'utente a due backup (casi limite v5, utente medio v6). I tre file usati dai test
  (spese standard, prove gratuite, cambio di frequenza) spostati in `tests/fixtures/` con contenuto invariato;
  `trial.test.ts`/`frequency.test.ts`, README di `docs/testing/`, architettura e AGENTS aggiornati.

## Abbonamenti: testo dello stato vuoto — 14 novembre 2026

- Rimossa su richiesta la frase «Per aggiungerne uno, crea una spesa che si ripete.»;
  resta «Nessun abbonamento.». Traduzione inglese allineata.
- `npm run check` OK (399/399, typecheck e build demo); diff check OK.
  Nessuna nuova verifica browser, commit o deploy; modifiche concorrenti conservate.

## Menu account: maggiore larghezza — 14 novembre 2026

- Larghezza minima del pannello `AccountMenu` a 232 dp (poi 264 dp il 14 novembre, per «Archiviazione e backup») (prima circa 202 dp in Standard), per dare più spazio
  dopo «Importa ed esporta», mantenendo l'hover a filo del contorno.
- `npm run check` OK (399/399, typecheck e build demo), diff check OK. Chromium demo Standard a 320/1280 px
  chiaro/scuro: pannello 232 px, voci a tutta larghezza; screenshot 320 scuro osservato, nessun errore JS.
  Processi propri arrestati; nessun test dispositivo reale, commit o deploy.

## Menu account: hover allineato al pannello — 14 novembre 2026

- `AccountMenu`: rimosso il margine laterale delle voci, il loro raggio indipendente e il padding verticale
  del pannello. Hover/ripple a tutta larghezza, ritagliati dagli angoli esterni del menu anche sull'ultima voce.
- `npm run check` OK (399/399, typecheck e build demo); `git diff --check` OK.
  Chromium su build demo in Standard, profilo temporaneo e HTTPS esterno bloccato: 320/1280 px, chiaro/scuro,
  larghezza delle voci identica al pannello e ultima voce a filo fondo; screenshot hover scuro osservato,
  nessun errore JS. Percorso Avanzata/Esci e dispositivi reali non provati. Processi propri arrestati.
  Modifiche concorrenti conservate; nessun commit o deploy.

## Fondi: Budget come ultima azione — 14 novembre 2026

- Su richiesta, ordine delle azioni in `FundsPage`: Nuovo fondo, Aggiungi, Trasferisci, Budget.
  Condizioni di visibilità, stile e comportamento invariati, su tutte le dimensioni.
- `npm run check` OK (typecheck, test e build demo); `git diff --check` OK.
  Nessuna nuova verifica browser; modifiche concorrenti conservate. Nessun commit o deploy.

## Rimozione di Google Drive, protezione locale e notifiche in-app — 14 novembre 2026

- **Google Drive rimosso del tutto:** eliminati `services/googleAuth.ts`, `services/googleDrive.ts`,
  `domain/driveBackup.ts`, `features/storage/useDriveBackup.ts`, `tests/driveBackup.test.ts` (12 test), la UI in
  `StorageSection` (collega/scollega, backup manuale/automatico, ripristino da Drive) e l'avviso «backup automatico in
  attesa» in `App.tsx`; `EXPO_PUBLIC_GOOGLE_CLIENT_ID` tolta da `envPolicy` (ora rifiutata come variabile sconosciuta;
  assente in `.env.local` e `.env.production.local`, controllato solo il nome), `.env.example`, README, Guida, testi
  della scelta modalità e traduzioni EN. Nessuna dipendenza npm era dedicata a Drive. Invariati login Google, Firebase
  Auth, BYOF, formato del backup (v6), importazione/esportazione/ripristino JSON (ripristino verificato nel browser).
- **Protezione locale:** `services/storageProtection.ts` + `features/storage/useStorageProtection.ts` (Standard): stato da
  `persisted()`, richiesta `persist()` solo con archivio non vuoto (subito o dopo la prima modifica), al massimo ogni 30
  giorni, tentativo registrato prima di chiedere (`nummo.storageProtection.v1`); errori e API mancanti = «Protezione non
  disponibile», app invariata. In Impostazioni → Archiviazione e backup: «Archivio locale protetto», «Protezione
  aggiuntiva non attiva», «Protezione non disponibile», con icona scudo e testo semplice. Tolta la vecchia chiamata
  `persist()` a ogni avvio. Scritture IndexedDB con durabilità `strict`; un listener che lancia dopo il commit non fa più
  apparire fallito un salvataggio riuscito; errore di apertura di una transazione di scrittura ora riporta il messaggio
  di salvataggio fallito (prima quello di lettura).
- **Notifiche in-app:** voce «Notifiche» (campana) nel menu account sotto Impostazioni, in entrambe le modalità; pagina
  con Notifiche generali, Promemoria backup (solo Standard) e Riepilogo spese, interruttori e frequenze (settimana
  consigliata, 14 giorni, mese); predefiniti tutti attivi e settimanali. Avvisi `NotificationCards` sopra le pagine
  (non in Impostazioni/Notifiche): promemoria con «Esporta backup» (export JSON esistente) e «Ricordamelo dopo» (3
  giorni); dopo ogni download del backup completo (anche da Importa ed esporta) «Hai salvato il backup?» → solo «Sì, è
  salvato» aggiorna la data; riepilogo con intervallo, totale, numero, categoria principale, «Abbonamenti esclusi»,
  «Chiudi». Regole in `domain/notifications.ts`; decisione in `docs/architecture.md`.
- **Test:** nuovi `tests/notifications.test.ts` (8), `tests/storageProtection.test.ts` (4), caso in `localStore.test.ts`
  (scrittura fallita / listener in errore), caso i18n (testi nuovi, nessun «Google Drive» nel catalogo), `envPolicy`
  aggiornato. Totale 397 − 12 + 14 = **399/399**.
- **Browser:** Chromium headless/CDP, build demo in Standard, rete HTTPS bloccata, profilo temporaneo, backup TEST
  `docs/testing/nummo-utente-medio.json` importato con «Sostituisci tutti i dati»: **43/43**. Primo avvio senza avvisi;
  ordine del menu Impostazioni/Notifiche/Categorie/Importa ed esporta; con stato di avvio retrodatato di 40 giorni
  compaiono promemoria e riepilogo (2–8 nov: 305,15 € in 7 spese, Alimentari 129,92 €, uguale al calcolo indipendente
  sul file, 9 serie escluse); rinvio di 3,000 giorni; chiusura e ricarica senza duplicati; download dal promemoria senza
  aggiornare la data finché non si conferma, poi data aggiornata; predefiniti, generale spento con altri controlli
  disabilitati e scelte conservate, persistenza dopo ricarica, riattivazione con date inizializzate; Impostazioni con un
  solo stato di protezione coerente con `persisted()` (headless: «Protezione aggiuntiva non attiva»), nessun «Drive» né
  nome tecnico; 412 IT chiaro, 320 EN scuro, 820 EN chiaro, 1280 IT scuro senza overflow; nessun errore JS. Screenshot
  osservati (412 avvisi/pagina/Impostazioni, 320 EN scuro). Probe e risultati nello scratchpad della sessione
  (temporanei).
- **Non verificato:** modalità Avanzata nel browser (notifiche, riepilogo, assenza del promemoria: solo test di dominio
  e typecheck); comportamento reale di `persist()` su Firefox (richiesta all'utente), Safari/iOS, Chrome Android e app
  installata; telefoni reali; screen reader; movimento ridotto. Nessun commit.
- **Google Cloud non più necessario per Nummo** (nessuna modifica fatta, solo da valutare a mano): Google Drive API
  abilitata per Nummo, il client OAuth «Applicazione web» creato per Drive e l'ambito `drive.appdata` nella schermata di
  consenso. Mai configurati secondo i registri; il client OAuth usato da Firebase Auth per il login Google va
  **mantenuto**.

## Nuova spesa: sezione ricorrente riorganizzata — 14 novembre 2026

- Tre gruppi in `RepeatField` (ora contenitore, `role="group"` «Pagamento ricorrente»): Ricorrente + frequenza, poi Prova
  gratuita e Prezzo promozionale passati come figli, separati da divisori `outlineVariant` con rientro di 16 px. Tutti i
  controlli sono allineati alle etichette degli interruttori (prima il campo Primo pagamento non era rientrato). Spazi tra
  i gruppi ridotti (da 24 a 8 + divisore).
- Visualizzazione progressiva: spento «Ricorrente» non mostra nulla; acceso mostra frequenza e i due interruttori (Prezzo
  promozionale ora visibile anche prima di scegliere la frequenza: il riepilogo compare solo dopo). Nuovo componente
  `components/Disclosure.tsx`: apertura con dissolvenza e scorrimento di 4 px, chiusura con dissolvenza breve
  (`usePresence`, solo opacity/transform, `inert` durante l'uscita, immediato con movimento ridotto).
- Prezzo promozionale: «Importo successivo» con icona euro come l'importo principale; «Dopo quanti rinnovi» diventa
  **«Rinnovi a prezzo promozionale»**, etichetta accanto a un contatore compatto − [n] + in una pillola da 50 px (bersagli
  48 px, numero ancora digitabile, rotellina conservata, bordo errore/focus). Affiancati da circa 500 px; su telefono
  impilati, a 320 px il contatore va sotto l'etichetta. Tolto il segnaposto; nome accessibile = etichetta visibile.
  Su richiesta, attivando Prezzo promozionale il contatore parte da **1** (minimo) se vuoto o a 0, e lasciando il
  campo vuoto o a 0 torna a 1 (prima partiva vuoto e il salvataggio dava errore). Un valore già impostato resta.
- Invariati: calcoli, validazione (messaggi compresi), salvataggio, dialogo di modifica (`TrialField existing`, `PriceChangeField`,
  `FrequencyField`). Traduzioni EN aggiornate, rimosse le due chiavi non più usate; nuovo caso in `tests/i18n.test.ts`.
- Verifiche: `npm run check` OK (typecheck, test, build demo), poi `npm test` **397/397**. Chromium headless/CDP sulla build
  demo in Standard, HTTPS esterno bloccato: 360 IT chiaro e 1280 IT chiaro (tutte le opzioni attive, confronto prima/dopo),
  320 e 360 EN scuro con errori di validazione, spegnimento/riaccensione di Ricorrente; nessun overflow orizzontale né errore JS.
  Non provati: telefono reale, movimento ridotto nel browser, dialogo di modifica nel browser. Integrata poi nel commit `7132480`.

## Riallineamento documenti e logo — 14 novembre 2026

- HANDOFF (stato Git a `6956a56`, produzione/Rules non pubblicate, prossime attività) e AGENTS (fonti storiche
  `IMPLEMENTATION_PLAN.md`/`docs/progress.md`, documenti della sola Avanzata, percorso `src/theme/viewport.ts`) allineati al codice.
- Su conferma eliminato il file `logo` nella radice: doppione identico di `docs/design/logo-concepts/hybrids-10/01-arco-light.svg`,
  non usato dall'app. Logo adottato «Arco» annotato in AGENTS e nel README dei concept (icone in `public/icons/`).
- `npm run check` OK su `6956a56` (396/396) prima di queste modifiche solo documentali. Integrate poi nel commit `57dba1f`
  (presente su `origin/main`).

## Icone: sprite pixel ridisegnati, chiave, divano ritirato — 14 novembre 2026

- Commit `ed21a87` (fasi precedenti del 14 novembre) pubblicato su `origin/main`; questa fase è nel commit «feat: pixel icon redesign, key icon,
  retired sofa» con push (Rules non pubblicate).
- **Sprite pixel ridisegnati con più dettaglio:** `wifi` (archi doppi con riflesso e punto tondo), `pizza` (crosta,
  formaggio, salamini arancioni asimmetrici: con salamini scuri sembrava un teschio), `coin` (primo sprite ad alta definizione: griglia
  24×24, una cella per pixel a 24 px, contorni spessi due celle; faccia dorata, bordo chiaro, € bianco centrato con due barre;
  su 12×12 il € non era leggibile né centrabile), `cash` (una sola banconota con medaglione e angoli), `house` (camino, finestra, porta), `bulb` (raggi, riflesso,
  filamento, attacco filettato). Stessi ID e tinte; minimale e colorato invariati.
- **Nuova tinta `gold`** (`iconPalette.ts`) per la moneta, nel pixel e nel colorato: amber più profondo con dettagli
  bianchi in entrambi i temi (come `popcorn`). Con `amber` il bianco non raggiungeva 3:1 sulla base nel tema scuro.
- **Nuova icona `key` (chiave)** nei tre stili (tinta amber), etichetta IT/EN, Rules (due elenchi `icon in [...]`).
- **`sofa` (divano) ritirata:** non più nel selettore, ma ancora valida per decoder, backup e Rules e disegnata nei tre
  stili, così le categorie esistenti che la usano restano leggibili. `IconPicker` la mostra solo sulla categoria che
  la usa (se la si toglie, sparisce). Convenzione in AGENTS.md, decisione in `docs/architecture.md`.
- **Da fare in Avanzata:** le Rules **pubblicate** non conoscono `key`. Finché non si pubblicano le Rules (operazione
  separata da autorizzare), salvare in cloud una categoria con la chiave viene rifiutato. Standard non ne è toccata.
- Verifiche: `npm run check` OK anche dopo il ritocco di moneta e banconota, **396/396** test (nuovo: alta definizione
  solo per la moneta, € centrato e bianco) (nuovi: chiave nei tre stili; divano ritirato ma valido). Suite
  emulatori SDK/Rules **18/18** su porte dedicate (Auth 44199, Firestore 44380, hub 44400; config temporanea rimossa;
  hybrid dell'utente su 8180 non toccato), con categoria salvata con `key` e con `sofa`. Sprite osservati a 24 px e
  ingranditi, tema chiaro e scuro; nessuna prova nell'app su dispositivo.

## Blocchi: anteprima dopo deselezione, Pausa e «Nuova» — 14 novembre 2026

- **Bug Analisi → Blocchi (touch):** dopo «Mostra transazioni» e «Chiudi», ritoccare il blocco lo deselezionava, ma il
  pannello restava in anteprima («Seleziona il blocco…»). Il tocco dà il focus al blocco, e il focus attivava l'anteprima
  pensata per mouse e tastiera. Ora la pressione azzera l'anteprima (`BlockChart.tsx`). Riprodotto con tocchi CDP a 360 px
  prima della correzione; dopo la correzione, in entrambi gli scenari (tocco/ritocco, e tocco → transazioni → Chiudi →
  ritocco) il pannello torna all'invito. Su desktop, dopo un clic che deseleziona, l'anteprima ricompare solo rientrando
  col puntatore.
- **Spaziature condivise:** ora sono `compactIconPadding` in `components/Button.tsx` (`roomy`/`snug`, più le varianti
  `*Narrow` per glifi stretti), usate da `SubscriptionList` e `ListsPage`. Pausa misurata circa 22 / 9 / 22 px
  (prima 22 / 11 / 19,6).
- **Liste:** `+ Nuova` su compact usa `roomy`: 94 px invece di 84, circa 16 / 9 / 16 px. Desktop invariato. A 320 e 360 px
  il titolo va su due righe. Nessun overflow, nessun errore JS.
- `npm run check` OK (393/393). Nessun telefono reale.

## Pulsanti degli abbonamenti bilanciati su smartphone — 14 novembre 2026

- Diagnosi con misura dei pixel (Chromium, scala 3): icone e testo erano già centrati in verticale (scarto ≤0,3 px).
  Lo squilibrio era orizzontale: i pulsanti compatti di Paper hanno 8 px per lato, ma l'icona da 18 px ha margini propri,
  quindi Annulla e Modifica avevano circa 12 px a sinistra e 8,7 a destra, e Riattiva 17 a sinistra e 12,7 a destra.
- `SubscriptionList.tsx`, solo su compact: spaziature bilanciate per Annulla, Modifica e Pausa/Riattiva. Da 380 px:
  pulsanti più ampi, con circa 16 px ai lati e 8–10 tra icona e testo (+10 px di larghezza ciascuno). Tra 360 e 379 px:
  larghezza invariata, con circa 12 / 8 / 12 px. Sotto 360 px: Annulla e Modifica senza icona, testo con 12 px per lato
  (prima 8). Desktop/medium, ordine, etichette, conferme e operazioni invariati.
- Verifica: Chromium headless/CDP sulla build demo in Standard, backup TEST `docs/testing/nummo-utente-medio.json` importato
  dall'interfaccia, abbonamenti in pausa (Netflix) e attivo (Spotify) a 320/360/375/393/412 px IT. Tre pulsanti sempre
  su una riga, alti 48 px, nessun errore JS; ritaglio a 393 px osservato. Resta un leggero eccesso a sinistra su Pausa
  (circa 2,5 px), dovuto al glifo stretto. `npm run check` OK (393/393). Nessun telefono reale né verifica in EN.

## Liste: «Nuova lista» nella riga del titolo — 14 novembre 2026

- Panoramica di Liste: il pulsante pieno `+ Nuova lista` (`+ Nuova` su compact, padding compatto) passa nell'`action` di
  `PageHeader`, a destra del titolo, come «Fatto» in Impostazioni. Il titolo va a capo prima che il pulsante si restringa.
  Distanza titolo → liste ridotta da `sectionGap` (32) a `lg` (16); prima c'erano una riga a sé per il pulsante e due spazi
  di sezione. Stato vuoto con «Crea la prima lista», dettaglio lista, dialoghi e FAB della navigazione invariati.
- `npx tsc --noEmit` OK, build demo OK. Chromium headless/CDP sulla build demo in Standard, profilo temporaneo, due liste
  TEST create dal pulsante, HTTPS esterno bloccato: 320/360/412/820/1280 px IT ed EN, pulsante sulla riga del titolo
  allineato a destra (bersaglio 48 px), nessun overflow orizzontale, nessun errore JS; screenshot 320 scuro e 1280 scuro
  osservati. A 320 px «Liste della spesa» va su due righe accanto a `+ Nuova` (atteso). Nessun telefono reale.

## Contorno delle azioni distruttive nelle spese — 13 novembre 2026

- «Annulla abbonamento» ora outlined, con testo/icona rossi; stesso contorno di Modifica/Pausa.
  «Elimina» nei dettagli delle spese singole outlined tramite prop facoltativa `DeleteAction.mode`;
  altri usi del componente invariati. Ordine e conferme conservati.
- `npm run check` OK: typecheck, 393/393 test e build demo; `git diff --check` OK.
  Chromium con soli dati TEST Standard a 320/360 px IT/EN: ordine, una riga, bersagli ≥48×48,
  nessun overflow o errore JS; screenshot 320 scuro osservato. Server/Chromium propri arrestati.
  Nessun test su telefono reale, commit o pubblicazione.

## Avatar utente pieno — 13 novembre 2026

- Su richiesta glifo utente pieno, testa separata dal busto da uno spazio di 1,5 unità SVG.
  `SvgIcon` espone il colore del tema anche a `currentColor` per i riempimenti.
- `npm run check` OK: typecheck, 393/393 test e build demo; `git diff --check` OK.
  Nessuna nuova verifica browser, commit o pubblicazione.

## Icona utente come ripiego dell'avatar — 13 novembre 2026

- AccountMenu mostra l'icona utente classica quando non c'è un account (Standard), manca la foto,
  è in caricamento o fallisce. Sostituiti i tre puntini e l'iniziale; la foto disponibile resta sovrapposta.
  Nuovo glifo UI `iconShapes.user`, nessuna modifica alle azioni del menu.
- `npm run check` OK: typecheck, 393/393 test e build demo; `git diff --check` OK.
  Nessuna nuova verifica browser o su dispositivo, nessun commit o pubblicazione.

## Ordine delle azioni e pulsanti di stato mobile — 13 novembre 2026

- Spese singole: Elimina prima di Modifica, gruppo a destra. Abbonamenti: Annulla abbonamento,
  Modifica, Pausa/Riattiva. Nessuna modifica a conferme, dati o operazioni.
- Su compact Pausa/Riattiva più larghi (almeno 96 px di bersaglio e padding laterale aggiuntivo).
  Sotto 360 px tolte le icone decorative di Annulla e Modifica per mantenere una sola riga;
  Modifica conserva almeno 48×48 px anche con l'etichetta EN «Edit».
- `npm run check` OK sull'albero condiviso: typecheck, 393/393 test e build demo; `git diff --check` OK.
  Chromium/CDP, profilo temporaneo e tre record TEST in IndexedDB Standard, HTTPS esterno bloccato:
  ordine Elimina/Modifica e Annulla/Modifica/stato, riga unica, larghezze e nessun overflow a
  320/360/412/1280 px IT/EN. Dopo il ritocco finale di Edit ripetuti 320 px IT/EN con bersagli ≥48×48;
  screenshot 320 scuro osservato, nessun errore JS. Risultati in `/tmp/nummo-actions-order-browser*`.
  Server/Chromium propri arrestati; nessun dato personale o cloud, telefono reale non verificato.
  Nessun commit o pubblicazione; modifiche concorrenti conservate.

## Storico — modalità Standard (IndexedDB + Google Drive) e Avanzata (Firebase BYOF), 12–13 novembre 2026

> Superato: Google Drive è stato rimosso il 14 novembre; lo stato attuale è nello «Stato corrente» in apertura.

Implementazione integrata nel commit `73034ba` (push su `origin/main`; Hosting non pubblicato). Decisione e limiti in `docs/architecture.md` (prima sezione),
uso e configurazione nel README, convenzioni in AGENTS.md. Le sezioni sotto restano cronologia.

- **Cosa c'è.** Schermata di scelta prima di ogni accesso (`ModeChoice`): Standard (consigliata) apre subito l'app senza
  account; Avanzata porta al flusso BYOF esistente (login, guida, configurazione mancante). Scelta in `nummo.storageMode.v1`,
  ripristinata all'avvio; un browser con indizio di sessione Firebase e nessuna scelta resta in Avanzata. Cambio da
  Impostazioni → «Archiviazione e backup» con avviso sugli archivi separati; dalla schermata di accesso «Usa Nummo senza
  account». Nessuna copia, migrazione o cancellazione tra le modalità.
- **Persistenza.** Contratto `DataStore` (`src/services/dataStore.ts`) con `firestoreStore.ts` (invariato nel comportamento:
  solo tipo di ritorno, `kind` e spostamento di `listRecords`) e il nuovo `localStore.ts` su `localDatabase.ts` (IndexedDB
  `nummo-local`, schema versione 1, migrazioni a passi). Hook, pagine e `BackupActions` usano il contratto; `RemoteWorkspace`
  è ora un involucro di `DataWorkspace`. In Standard: nessun esito «incerto», stato «Sul dispositivo», «online» sempre vero,
  Firebase non inizializzato.
- **Google Drive.** `googleAuth.ts` (Google Identity Services, token solo in memoria, accesso solo da un gesto),
  `googleDrive.ts` (REST su `appDataFolder`, ambito `drive.appdata`), `useDriveBackup` e `StorageSection`: collega/scollega,
  backup manuale, backup automatico (giorno/settimana/mese), ultimo backup, ripristino con elenco, data, contenuto, avviso
  e conferma; copia di sicurezza scaricata prima; sostituzione in un'unica transazione locale. Un file per backup, cinque
  conservati; l'automatico non carica archivi vuoti. Senza `EXPO_PUBLIC_GOOGLE_CLIENT_ID` la sezione mostra «Non
  disponibile» e resta il backup su file. `envPolicy` ammette la variabile e rifiuta valori che non siano un ID client web.
- **Verifiche eseguite.** `npm run check` OK: typecheck, **393/393** test (nuovi: `tests/localStore.test.ts` 12,
  `tests/driveBackup.test.ts` 12, caso in `envPolicy`), build demo; `git diff --check` OK. Suite SDK/Rules demo **18/18** su
  porte dedicate (Auth 44199, Firestore 44380, hub 44400; config temporanea in radice rimossa, emulatori arrestati; hybrid
  dell'utente su 8180 e `.nummo-hybrid-18290.json` non toccati). `test:hybrid` non rieseguito (runner non modificato).
- **Chromium headless/CDP su build demo, rete HTTPS esterna bloccata, IndexedDB reale** — 32/32 controlli in ciascuna di
  quattro esecuzioni (412×915 IT chiaro, 320×740 IT scuro, 820×1000 EN chiaro, 1280×900 EN scuro): scelta mostrata senza
  database né modalità salvata; Standard apre l'app senza accesso; schema v1 con 8 store; cinque categorie predefinite;
  spesa creata dal modulo e presente in IndexedDB; ricarica → stessa modalità e stessi dati; Analisi/Fondi/Liste senza
  overflow; sezione Impostazioni; esportazione JSON dal dispositivo; avviso e cambio verso Avanzata (schermata di accesso),
  archivio locale intatto, ritorno a Standard con i dati; nessun errore JavaScript. Screenshot osservati.
- **Flusso Drive con Google SIMULATO nella pagina** (script di identità e REST sostituiti da uno stub; build di prova con ID
  client segnaposto, mai pubblicata): 29/29 a 412×915 — nessun accesso chiesto prima del tocco, solo ambito `drive.appdata`,
  nessun token in localStorage/sessionStorage, backup manuale, automatico in attesa dopo la ricarica e ripreso con un tocco,
  automatico eseguito da solo con accesso valido, ripristino con riepilogo e conferma, copia di sicurezza, autorizzazione
  scaduta, rete assente, conservazione di cinque file, scollegamento con revoca. **Questo prova la logica dell'app, non
  l'integrazione con Google.** Probe e risultati nello scratchpad della sessione (temporanei).
- **NON verificato.** Google OAuth e Drive reali (nessun client OAuth configurato: finestra di consenso, origini
  autorizzate, comportamento del popup su mobile e nell'app installata, quote e codici d'errore reali); accesso Google e
  dati reali in Avanzata dopo la modifica (solo emulatori); telefoni reali, Safari/iOS (IndexedDB, eliminazione dei dati
  dopo inattività, `navigator.storage.persist`), Firefox; due schede reali contemporanee (coperto solo dai test con canale
  simulato); archivi grandi; screen reader.
- **Configurazione manuale ancora necessaria** (README, «Configurare Google OAuth e Drive»): abilitare Google Drive API,
  schermata di consenso con il solo ambito `drive.appdata`, client OAuth «Applicazione web» con le origini del sito,
  `EXPO_PUBLIC_GOOGLE_CLIENT_ID` in `.env.production.local`/`.env.local`, eventuale passaggio in produzione dell'app OAuth.
- **Limiti e punti aperti.** Token di circa un'ora senza rinnovo silenzioso: il backup automatico non gira ad app chiusa
  e dopo una ricarica attende un tocco (avviso nell'app). `build:cloud` richiede ancora le quattro variabili Firebase: non
  esiste una build solo Standard. Nessun service worker: avvio a freddo senza rete non garantito. In Standard chiunque usi
  il browser vede i dati (nessun blocco). L'elenco dei backup nel ripristino mostra data e ora al minuto: due backup nello
  stesso minuto hanno la stessa etichetta. Testi in italiano rimasti generici in Standard («verifica connessione» per le
  categorie predefinite non aggiunte). La Guida pubblica è aggiornata alle due modalità; `docs/firebase-personale.md` e
  `docs/migrazione-byof.md` descrivono solo l'Avanzata.
- **Working tree (allora).** Erano presenti anche modifiche di altre sessioni (fondi, editor, preferenze, test del budget),
  conservate e incluse nel `npm run check` sopra; sono state poi integrate in `73034ba`.

## Azioni degli abbonamenti a destra — 12 novembre 2026

- Su richiesta allineati a destra i pulsanti nei dettagli di SubscriptionList (`justifyContent: flex-end`);
  ordine, etichette, comportamento e adattamento mobile invariati.
- `git diff --check` OK; `npm run check` tentato, bloccato dall'errore di sintassi concorrente in
  `src/i18n/en.ts:749` (virgola attesa). Nessuna verifica browser, commit o pubblicazione.

## Azioni nei dettagli delle spese singole — 12 novembre 2026

- «Modifica» allineato a destra, con «Elimina» al fianco nei dettagli di ExpenseList. Eliminazione tramite
  DeleteAction: conserva il record/revisione visti all'apertura della conferma e l'avviso di riattivazione della
  lista collegata. Rimossa l'azione dal modulo Modifica spesa; Modifica serie conserva l'eliminazione della serie.
- Nessuna modifica a servizi/Rules. Guida già coerente (modifica/elimina dai dettagli). `git diff --check` OK.
  `npm run check` tentato, fermo al typecheck per errore di sintassi concorrente in `src/i18n/en.ts:749`
  (virgola attesa). Nessuna verifica browser, commit o pubblicazione; lavoro concorrente conservato.

## Preferenza budget estesa ai moduli fondo — 12 novembre 2026

- «Mostra budget mensile» nasconde ora anche la sezione Budget mensile in Nuovo/Modifica fondo.
  I controlli nascosti non vengono validati; `fundFromForm` con budget omesso conserva esattamente piano,
  variazioni future ed eccezioni. Nuovi fondi senza budget; riattivando la preferenza tornano i controlli.
  Indicatori dei budget esistenti sui singoli fondi invariati. Descrizione, Guida, IT/EN e convenzioni aggiornate.
- Regressione conservazione dati e creazione senza budget: suite dedicata `generalBudget.test.ts` 13/13.
  Typecheck e build demo separata OK, `git diff --check` OK. `npm run check` eseguito sull'albero condiviso:
  typecheck OK, test 380/381; il catalogo i18n fallisce su «Menu» in `AccountMenu.tsx`, modificato dal lavoro
  concorrente sull'archiviazione, non da questa fase. Il primo tentativo si era fermato su `iconShapes.cloud`
  in StorageSection, errore concorrente non più presente al controllo finale. Nessun check completo verde.
- Modifiche concorrenti ai servizi/archiviazione conservate. Nessuna verifica browser o emulatori,
  nessun commit/deploy né accesso a dati personali.

## Titolo Impostazioni «Funzionalità» — 12 novembre 2026

- Su richiesta «Grafici e budget» rinominato «Funzionalità» (EN «Features»); riferimento nella Guida,
  traduzioni e caso i18n allineati. Solo testi, comportamento invariato.
- `npm run check` OK: typecheck, 368/368 test e build demo; `git diff --check` OK.
  Nessuna nuova verifica browser, commit o pubblicazione.

## Rimozione testi di supporto e commit/push autorizzati — 12 novembre 2026

- Su richiesta rimossi il testo esplicativo sotto Primo pagamento durante la prova e la nota per Nessun fondo,
  da tutti i moduli che riusano TrialField/FundField, con le relative traduzioni EN. Conservati errori, informazioni
  del fondo selezionato e avviso della prova terminata; nessuna modifica a calcoli, dati o Rules.
- Commit e push richiesti anche per le correzioni e il riallineamento documentale della fase precedente sotto.
  Nessuna pubblicazione Hosting/Rules; il precedente «senza commit/push» descrive lo stato prima di questa richiesta.
- `npm run check` OK sull'intero albero finale: typecheck, 368/368 test e build demo; `git diff --check` OK.
  Nessuna nuova verifica browser per la sola rimozione di testo; suite SDK/Rules 18/18 della fase precedente.

## Stato corrente — revisione Liste e controllo generale, 12 novembre 2026

- Base Git verificata: `main` a `61c8b62`, inizialmente pulito e allineato al riferimento locale `origin/main`
  (nessun fetch). Le correzioni sotto sono locali, senza commit, push o pubblicazione. Le sezioni datate conservano
  la cronologia: titoli «Stato corrente»/«Fase attuale» più vecchi non descrivono questo checkout.
- **Liste, bug riprodotto e corretto:** su Chromium touch 320×740, scorrendo al totale, la scomparsa della barra
  durante `pointerdown` aumentava lo spazio dello scroller e riduceva `scrollTop`; al rilascio veniva spuntato
  Detersivo al posto di mettere a fuoco Totale spesa. In `AppShell` la barra ora è invisibile e `inert` ma conserva
  lo spazio finché `observeVirtualKeyboard` non conferma la tastiera. Lo scroll del campo attivo attende la stessa
  conferma. Regressioni dell'osservatore estese a conferma/fallback/chiusura; nessuna modifica a dati o Rules.
- **Totale nella conferma:** riprodotto un dialogo Registra spesa con importo vuoto nonostante `12,50` appena
  digitato. Ora riceve la bozza corrente, senza attendere la scrittura accodata/listener. `ListDetail` ha key ID:
  duplicare/aprire un'altra lista non trasferisce testo, errori o editor del dettaglio precedente.
- **Overlay:** `AppDialog` espone il ruolo dialog, usa Escape in cattura (funziona anche dai TextInput RN Web),
  passa il focus al primo controllo e lo restituisce senza scroll. Pila delle aperture: Escape chiude solo il livello
  superiore, rispettando dismissable e blocchi durante il salvataggio. Tolto il gestore Escape/focus duplicato di
  DeleteDialog; prima azione della conferma resta Annulla. **Rail medium** ora scorre nelle finestre basse.
- **Controllo browser:** Chromium/CDP, build demo con Auth 48199/Firestore 48380/Hub 48417 dedicati, rete HTTPS
  esterna bloccata. Totale fermo tra touchStart/touchEnd, focus corretto e checkbox invariate; bozza del totale nella
  conferma ed Escape: 320×740 IT scuro, 360×800 IT chiaro, 412×915 IT scuro, 600×800 EN chiaro, 820×1000 IT chiaro,
  1280×900 EN scuro. Dialoghi annidati (prodotto/eliminazione), Annulla a fuoco, selettore Categoria sopra Registra,
  Escape dal testo, tastiera simulata 740→430→740: passati. Liste raggiungibile nella rail a 600×360, 820×360 e 956×440.
  Controllo delle quattro destinazioni con fixture standard popolata a 320/412/600/820/1280: nessun overflow orizzontale
  né archivio invalido. Creazione lista/prodotto e duplicazione via UI: prodotto copiato, bozze ed errori non trasferiti;
  nessuna eccezione JavaScript raccolta. Screenshot demo osservati; probe e risultati in `/tmp/nummo-ui-*` (temporanei).
- **Verifiche:** `npm run check` OK (typecheck, 368/368 test, build demo); suite SDK/Rules demo 18/18 sulle porte
  dedicate (`AUTH_PORT=48199 FIRESTORE_PORT=48380 node tests/emulator/firestore.e2e.ts`, con emulatori già avviati).
  La suite copre CRUD/conflitti/offline/import e registrazione lista unica con ripristino all'eliminazione della spesa.
  Emulatori e Chromium propri arrestati, config/seed temporanei rimossi dalla radice.
  Nessun dato personale né servizio hybrid preesistente modificato. Nessun test su telefono/Safari/PWA reale.
- **Documentazione riallineata:** README (Analisi, Fondi, Liste, backup dal menu account, stato dei rilasci), AGENTS
  (872 px per le due colonne, spazio durante l'anticipo tastiera e rail scorrevole), architettura (decisioni correnti
  e sezioni storiche esplicite), guida fixture (v5 storici, lettore v6). Catalogo attuale 39 icone; fixture JSON cinque.
- **Produzione:** ultimo rilascio documentato Hosting `e2eee92` del 12 novembre 00:03 Europe/Rome; le rimozioni
  successive di icone/Rules e queste correzioni non risultano pubblicate nel registro. Stato cloud e issue non
  interrogati in questa revisione. Prima di pubblicare resta il controllo autorizzato degli ID icona rimossi nei dati.
- **Restano:** prove dispositivi reali; prossimi rinnovi (una riga per serie, totale di tutte le occorrenze nella
  finestra); incidente del seed nel progetto demo dell'emulatore hybrid utente (nota storica sotto, non intervenuti).
  Il controllo generale non certifica tutti i flussi né assenza di ulteriori bug; nessun audit dipendenze/clone pulito.

## Impostazioni: sezione «Analisi» rinominata «Grafici e budget» — 12 novembre 2026

- Il riquadro sotto «Stile delle icone» contiene ora andamento (Analisi) e budget generale (Fondi): titolo «Grafici e budget»
  (EN «Charts and budget»), frase della Guida e traduzione allineate, caso i18n esteso. Le voci sotto che citano la sezione
  «Analisi» delle Impostazioni si riferiscono a questo riquadro.

## Righe di Spese: freccia di apertura più grande e distanziata — 12 novembre 2026

- Su richiesta: chevron di `ListRow` (righe espandibili, Spese e Pagamenti ricorrenti) da 20 a 24 dp e 12 dp dall'importo
  (gap `xs` + `marginLeft: spacing.sm`, prima 4). Solo `ListRow.tsx`. `npm run check` OK (368/368, build demo), diff check
  OK. Resa nel browser non ricontrollata (servono spese); file di probe `.nummo-hover-*` nella radice di un'altra sessione, non toccati.

## Impostazioni → Analisi: interruttore «Mostra budget mensile» — 12 novembre 2026

- Su richiesta, scelta «strada A» dopo analisi dei rischi: preferenza locale `showGeneralBudget` (predefinita `true`) in
  `nummo.preferences.v1`, `SwitchRow` sotto «Mostra andamento nel tempo» con testo di supporto. Spenta nasconde in Fondi
  solo la scheda del budget generale e «Imposta un budget mensile»; budget dei fondi invariati. Nessuna scrittura né
  cancellazione: `settings/budget`, Rules e backup invariati. Limiti noti: non sincronizzata tra dispositivi; il budget
  nascosto resta nei dati e nei backup. Guida, EN, AGENTS.md aggiornati; test in `preferences.test.ts` e `i18n.test.ts`.
- `npm run check` OK (**368/368**, build demo), diff check OK. Chromium su build demo da disconnessi (nessun emulatore,
  rete esterna bloccata): aggiunto poi anche il testo di supporto di «Mostra andamento nel tempo» («Nella pagina Analisi, il grafico
  delle spese giorno per giorno.», EN incluso). 412×915 scuro IT e 1280×900 chiaro EN, interruttore acceso di base, al tocco spento e salvato
  `false`, nessun overflow/errore JS. **Pagina Fondi con budget nascosto non vista nel browser** (servono dati): solo codice.

## Sprite pixel `coffee` leggibile nel tema scuro — 12 novembre 2026

- Segnalazione (miniatura su sfondo scuro): la tazza appariva come un rettangolo ambra. Causa: manico, bordo e piattino
  solo in `i`, scuro nel tema scuro. Ridisegnato su 12×12: vapore in due volute staccate dalla tazza, bordo `i`,
  crema `t`, corpo `b`, manico ad anello e piattino in `b` (visibili in entrambi i temi), riga `i` di separazione.
- Solo `categoryPixelGlyphs.ts`; stessi ID e tinta `amber`, altri stili invariati, nessuna modifica a Rules o dati.
  `npm run check` OK (366/366, build demo), diff check OK. Anteprima Chromium statica prima/dopo a 24/48/96 px chiaro
  e scuro (scratchpad della sessione); non vista nell'app né su telefono.

## iPhone: barra di navigazione mobile più in basso — 12 novembre 2026

- Segnalazione con screenshot da iPhone 16 Pro Max (app installata, build precedente con «Dashboard»): troppo spazio
  sotto la pillola. Causa: `paddingBottom = spacing.md + insets.bottom` = 12 + 34 = 46 pt, mentre su iPhone l'indicatore
  home sta già dentro la safe area. Ora `floatingBarBottomSpace(inset, gap, iPhone)` (`navIndicator.ts`, puro):
  su iPhone con safe area `max(gap, inset − gap)` = **22 pt** (24 pt più in basso, ~9 pt sopra l'indicatore home);
  altrove invariato. `isIPhone(userAgent)` riconosce solo iPhone/iPod: iPad, Android, desktop invariati. `barHeight`
  (offset snackbar) usa lo stesso valore. Test in `tests/navIndicator.test.ts`.
- `npm run check` OK (**366/366**, build demo); `git diff --check` OK. Chromium/CDP su build demo con emulatori
  dedicati (Auth 47299, Firestore 47480, hub 47400, config temporanea in radice poi rimossa; seed con `FIRESTORE_PORT`
  esplicito), UA iPhone, 440×956 DPR 3, safe area 59/34 via `Emulation.setSafeAreaInsetsOverride`: spazio sotto la
  pillola 22 pt su Spese/Analisi/Fondi/Liste/Nuova, chiaro e scuro; con UA Android 46 pt (prima). Nessun overflow
  orizzontale né errore JS; testata sotto la Dynamic Island (banner 0–123 pt). **Non provato su iPhone reale.**
- **Trovato, non corretto:** iPhone in orizzontale (956×440, classe medium) mostra la rail, che non scorre: «Liste»
  esce sotto il bordo e non è raggiungibile. Vale per ogni finestra medium bassa, non solo iPhone.
- Lo screenshot mostrava anche «Accesso negato» (UID non proprietario o Rules): non indagato, build vecchia.

## Selettori a segmenti su una riga, Analisi su tablet, pulsanti Fondi — 12 novembre 2026

- `SegmentedButtons`: mai a capo (`numberOfLines={1}`, altezza 40). Larghezza naturale dell'etichetta misurata da un
  clone nascosto nowrap; spunta mostrata solo se entra (gap + 18 dp); se un'etichetta non entra nemmeno senza spunta,
  padding 8 dp a **tutti** i segmenti (con `flex: 1` il padding si somma alla larghezza: ridurlo a uno solo lo restringe).
  `Segment.accessibilityLabel` facoltativo per il nome completo.
- Etichette brevi su ogni dimensione (scelta dell'utente): vista Spese «Spese | Abbonamenti» (nome accessibile «Pagamenti
  ricorrenti»), ricorrenza «Settimana | Mese | Anno» (nome «Settimanale»…; i testi descrittivi restano «Mensile»…),
  tipo di movimento «Entrata | Giroconto» (nome «Trasferimento»). Guida (due paragrafi) e EN aggiornati, test i18n esteso.
- Analisi: menu a tendina Periodo/Grafico anche su medium (chip solo da expanded); indicazione sotto la ciambella con
  `marginTop` 16 (24 dp dal grafico invece di 8) su smartphone e tablet.
- Fondi: etichette visibili «Nuovo fondo · Budget · Aggiungi · Trasferisci» (nomi accessibili completi «Imposta un budget
  mensile», «Aggiungi denaro»); su medium pulsanti `compact` e gap 4: una riga da 600 dp. Smartphone: colonna invariata.
  Modifiche concorrenti in `FundsPage` (`showGeneralBudget`) e preferenze conservate.
- Chromium/CDP su build demo con emulatori dedicati (47199/47380, config/probe rimossi), dati fittizi (spese, un
  abbonamento, due fondi con saldo): 320/360/412/600/700/1280 IT e 320/600 EN — tutti i selettori alti 40, nessun testo
  a capo o troncato, segmenti di uguale larghezza, spunta presente dove c'è spazio, Fondi su una riga da 600, menu su
  tablet, nessun overflow né errore JS. `npm run check` OK (**368/368**, build demo). Nessun commit/deploy.

## Azioni dell'abbonamento su una riga da smartphone — 12 novembre 2026

- `SubscriptionList`, classe compact: etichette visibili brevi «Pausa» (nuova, EN «Pause») e «Annulla» (esistente),
  nome accessibile completo «Metti in pausa»/«Annulla abbonamento»; sotto 360 dp l'azione testuale rossa «Annulla»
  perde l'icona (altrimenti a 320 dp IT andava a capo per ~7 px). Riga centrata verticalmente. Da medium invariato.
- Misurato in Chromium/CDP (build demo, emulatori dedicati 47199/47380, config/probe rimossi): una sola riga a
  320/360/393/412 IT e 320/412 EN, nessun overflow/errore JS. `npm run check` OK (366/366, build demo).
- **Proposte, non implementate:** il selettore «Spese | Pagamenti ricorrenti» va a capo a 320 dp (altezza 56 invece di 38;
  intero da 360 dp). Opzioni presentate all'utente: etichette brevi su compact, niente spunta su compact, schede M3.

## Divisore dei dettagli allineato allo strato di hover — 12 novembre 2026

- Righe `outlined` aperte (Spese e Pagamenti ricorrenti): il divisore superiore dei dettagli era rientrato di 12 dp per
  lato e 8 dp sotto lo strato di hover. Ora il contenitore dei figli in `ListRow` non ha gap né padding laterale, e
  `details` di `ExpenseList`/`SubscriptionList` ha `paddingHorizontal: spacing.md`: il divisore inizia dove finisce lo
  strato, con la stessa larghezza (interno del bordo).
- `npm run check` OK (**366/366**, incluso un test concorrente su `navIndicator`; build demo), `git diff --check` OK.
  Chromium/CDP su build demo con emulatori dedicati (47199/47380, config e probe rimossi): 412 chiaro e 1280 scuro,
  spesa e abbonamento aperti → scarto verticale 0, sinistra/destra 0, contenuti rientrati 12 dp, nessun overflow/errore.
  Modifiche concorrenti ad `AppShell`/`navIndicator` non toccate. Nessun commit/deploy.
- **Domanda aperta (Prossimi rinnovi):** l'utente chiede di includere «i pagamenti di questo mese non ancora avvenuti».
  Dal codice la card elenca già il prossimo rinnovo attivo di ogni serie entro 30 giorni e il totale coincide con la
  somma delle righe; un rinnovo con data odierna conta come già pagato. Caso mancante non ancora chiarito con l'utente.

## Freccia di espansione nelle righe e indicazione ciambella sotto il grafico su mobile — 12 novembre 2026

- `ListRow`: le righe espandibili (`onPress` + `expanded`) mostrano dopo l'importo una piccola freccia 20 dp
  `onSurfaceVariant` (giù chiusa, su aperta, come gli altri elementi a scomparsa), `aria-hidden`: lo stato resta
  annunciato da `aria-expanded`. Vale per Spese e Pagamenti ricorrenti; nessun nuovo testo.
- `Dashboard`: con la legenda sotto la ciambella (`!chartSideBySide`, smartphone) l'indicazione «Tocca una sezione…» è
  subito sotto il grafico, centrata, prima della legenda; con legenda affiancata resta sotto l'intero blocco come prima.
  Sempre solo senza selezione.
- `npm run check` OK (365/365, build demo), `git diff --check` OK. Chromium/CDP su build demo con emulatori dedicati
  (47199/47380, config e probe temporanei nella radice rimossi), 3 spese fittizie in 2 categorie: 412×915 chiaro e 1280×900
  scuro — frecce presenti e nascoste ai lettori, apertura riga ok, indicazione sopra la legenda su mobile (osservato da
  screenshot), nessun overflow né errore JS. Non provati telefono reale né screen reader. Nessun commit/deploy.

## Hover delle righe di Spese allineato al contorno — 12 novembre 2026

- Segnalazione: in Spese lo strato di hover della riga era più piccolo del contorno. Causa in `ListRow` (`outlined`):
  il padding (md orizzontale, xs verticale) stava sul contenitore bordato, quindi il pulsante interno e il suo strato
  restavano rientrati. Ora il padding è dentro l'area premibile (e in un contenitore per i dettagli): lo strato riempie
  l'interno del bordo con raggio `radius.control − 1`; con i dettagli aperti gli angoli inferiori sono a 0
  (`StateLayerPressable.bottomRadius`, nuova prop facoltativa). Altezza minima compensata: riga invariata (62 px).
  Vale anche per `SubscriptionList` (stessa riga). Righe non `outlined` (Categorie) invariate.
- `npm run check` OK (365/365, build demo). Chromium/CDP su build demo con emulatori dedicati (Auth 47199, Firestore
  47380, config temporanea e probe nella radice poi rimossi), 3 spese fittizie: 1280×900 scuro e 412×915 chiaro, hover
  col mouse emulato → strato a 1 px dal bordo su tutti i lati, raggi 19/19 chiusa e 19/0 aperta, nessun overflow né
  errore JS. Non provati mouse reale, touch, focus da tastiera visivo.
- **Incidente da risolvere con l'utente:** al primo tentativo `seed-demo.ts` è partito senza `FIRESTORE_PORT` e ha scritto
  `config/owner` (`uid: demo-owner`) nel progetto **`demo-nummo`** dell'emulatore hybrid dell'utente su 8180 (12 nov
  19:22:29 UTC). Dati di `nummo-6b6e2` non toccati. La cancellazione è stata negata dai permessi: documento ancora
  presente; sparisce al riavvio se l'export di uscita include solo `nummo-6b6e2` (non verificato).

## Preparazione commit e push autorizzati — 12 novembre 2026

- Inclusi i ritocchi locali a sprite `sofa`/`coin`, riordino Impostazioni e pulsante Ripristina outlined,
  indicazioni IT/EN sotto Barre/Ciambella con spaziatura e scomparsa alla selezione della ciambella,
  regressioni i18n e note di consegna. Nessuna nuova modifica a servizi o Rules in questo commit.
- `npm run check` ripetuto sull’intero albero: OK (typecheck, 365/365 test, build demo); diff check OK.
  Nessuna pubblicazione Hosting/Rules. Esito commit e sincronizzazione riportato nella risposta della sessione.

## Sprite pixel `sofa` e `coin` ridisegnati — 12 novembre 2026

- Segnalazione dell'utente: due icone pixel incomprensibili. Quella blu era `sofa` (scambiata per un'auto; `car` resta
  rimossa, scelta confermata): ora due cuscini di schienale arrotondati, braccioli imbottiti in `b`, seduta chiara, piedini.
  Scartate le varianti con riquadri chiari quadrati, che sembrano finestrini di un veicolo. `coin` (pila di monete letta
  come un rettangolo) torna a una moneta tonda: contorno, bordo `b`, faccia `t`, € pieno in `i` (scuro in entrambi i temi).
- Solo `categoryPixelGlyphs.ts`; stessi ID, tinte, stili minimale/colorato invariati, nessuna modifica a Rules o dati.
  `npm run check` OK (365/365, build demo), `git diff --check` OK. Anteprima Chromium statica a 24/72 px chiaro/scuro
  nello scratchpad della sessione; nessun collaudo in app o su telefono. Modifiche concorrenti (Analisi, Impostazioni,
  traduzioni, test i18n) non toccate. Nessun commit/deploy.

## Analisi: indicazioni sotto Barre e Ciambella — 12 novembre 2026

- Indicazione Barre distanziata ulteriormente dall’elenco con 12 dp aggiuntivi sopra (`spacing.md`),
  su richiesta. `npm run check` OK (365/365, typecheck e build demo); diff check OK.
  Resa browser non ricontrollata; nessun deploy.
- Indicazione ciambella visibile solo senza una selezione (`active === null`): scompare al tocco di una
  sezione e ricompare deselezionandola o cambiando periodo. Hover invariato. `npm run check` OK (365/365,
  typecheck e build demo); diff check OK. Verifica dal codice, browser non ripetuto; nessun deploy.
- Ulteriore ritocco richiesto: 32 dp aggiuntivi sopra il testo della ciambella (`spacing.xxl`), oltre al gap
  del blocco, per distanziarlo maggiormente dal grafico/legenda. `npm run check` OK (365/365, typecheck,
  build demo); diff check OK. Nessuna verifica browser o pubblicazione in questa fase.
- Ritocco successivo: indicazione della ciambella spostata sotto l’intero blocco grafico/legenda (e dopo
  l’eventuale azione «Mostra transazioni»), anche su desktop. `npm run check` ripetuto: OK, 365/365,
  typecheck e build demo; diff check OK. Resa browser non ricontrollata, nessun deploy.
- Su richiesta: sotto le barre «Tocca una barra per vedere i dettagli della categoria.»; sotto la ciambella
  «Tocca una sezione per vedere i dettagli della categoria.». Testi `bodyMedium` nel colore secondario del testo,
  sempre visibili quando il relativo grafico è presente; traduzioni EN aggiunte e caso i18n esteso.
- `npm run check` OK: typecheck, 365/365 test e build demo; `git diff --check` OK. Resa browser non ricontrollata.
  Nessuna modifica a dati/servizi/Rules, nessun commit o deploy; modifiche locali preesistenti conservate.

## Ritocco pizza e nuovi sprite controller/borsa — 12 novembre 2026

- Su nuovi riferimenti dell'utente: pizza pixel ridotta da 12×12 a 10×10 celle (centrata sulla tela 12×12,
  circa 17% in meno per lato); ridisegnati `gamepad` (croce, pulsanti, impugnature) e `bag` (manici aperti,
  attacchi, pieghe laterali e fondo). Solo pixel, stessi ID e palette; altri stili invariati in questa fase.
- `npm run check` OK: typecheck, 365/365 test e build demo sull'albero condiviso; `git diff --check` OK.
  Anteprima statica Chromium osservata a 24/72 px chiaro/scuro (`/tmp/nummo-icons-refinement.png`),
  nessun collaudo app/telefono. Nessuna nuova modifica a servizi/Rules o dati; suite emulatori non ripetuta.
- Modifiche concorrenti conservate; nessun commit/deploy. La terza rimozione della richiesta precedente
  (rettangolo giallo) resta in attesa di identificazione, come documentato sotto.

## Icone: rimozioni e revisione pixel — 12 novembre 2026

- **Seconda passata (stesso giorno):** la terza immagine (rettangolo giallo) era lo sprite pixel di `beer` (boccale
  ambra su tema scuro), identificato confrontando il render degli sprite con l'immagine. `beer` rimosso da catalogo,
  tre stili, traduzione `birra` e due liste delle Rules; regressione estesa a stella/istruzione/birra. Nessun `beer`
  nelle fixture `docs/testing/` né in `emulator-data/` (solo conteggio, nessun contenuto letto). **Icone attuali: 39.**
- Ridisegnati da zero gli sprite pixel di `gamepad` (corpo con impugnature, croce in `i`, quattro tasti in `o`), `bag`
  (manico sopra una fascia in tinta e corpo svasato), `camera` (gobba del mirino, pulsante, obiettivo ad anelli
  concentrici, flash), `sofa` (ridisegnato di nuovo su richiesta: vista frontale con schienale, braccioli staccati da una tacca, seduta
  chiara, piedini) e `coin` (bordo, faccia
  chiara, simbolo € in `i`; poi, su richiesta, sostituita da una pila di monete vista di lato, perché a 24 px il simbolo
  si impastava). Stesse tinte, griglia ≤12×12, contorni non indispensabili sul tema scuro. Render
  Chromium chiaro/scuro a 24/48/96 px osservato (scratchpad della sessione): non è un collaudo su telefono reale.
- `npm run check` OK (365/365, build demo); suite SDK/Rules demo **18/18** su porte dedicate 48099/48280 con config
  temporanea nella radice, rimossa; emulatori/hybrid dell'utente (8180/8081/4000, PID runner 18290) non toccati.
- **Issue #11 e #16 chiuse** su richiesta (completed, 12 nov 19:02 UTC) con commento su soluzione, verifiche e limiti
  (modifiche locali, nessun commit/deploy). Restano aperte #14, #5, #4.
- Compatibilità: le Rules locali rifiutano ora anche `beer`. Prima di pubblicarle verificare che i dati di
  produzione non usino `star`, `graduation` o `beer`, altrimenti categorie/fondi diventano illeggibili.

- Richiesta dalle immagini: rimossi `star` (stella) e `graduation` (istruzione/tocco accademico) da catalogo,
  tre disegni, traduzioni e liste delle Rules. La terza immagine (rettangolo giallo) resta da identificare con
  l'utente (risolto sotto: `beer`). Icone dopo questa prima passata: 40.
- Ridisegnati solo gli sprite pixel `camera`, `sofa`, `pizza`, `bag` sulla griglia 12×12; nuovi dettagli di
  lente, cuscini/braccioli, crosta/condimento e manici/pieghe. `popcorn` colorato e pixel usa una palette dedicata
  rossa/bianca/gialla, con ruoli nei token e contrasti verificati per entrambi i temi. Nessuna dipendenza nuova.
- Fixture casi limite: `graduation` → `laptop`, `star` → `sparkles`; test fondo emulato usa `laptop`.
  Due regressioni per rimozioni in ogni stile e colori popcorn. Anteprima statica Chromium osservata a 24/72 px,
  chiaro/scuro (`/tmp/nummo-icons-final.png`): non è un collaudo UI o su telefono reale.
- `npm run check` OK (typecheck, 365/365 test e build demo); suite SDK/Rules demo 18/18 su porte dedicate
  47099/47280, emulatori arrestati e config temporanea rimossa. Primo tentativo bloccato da EPERM sandbox,
  riuscito fuori sandbox. Working tree condiviso con modifiche concorrenti a Impostazioni/SwitchRow,
  storico/prezzi/workspace/test: conservate, fuori da questo intervento.
- Compatibilità: record e backup con gli ID rimossi vengono rifiutati; nessun adapter o migrazione automatica,
  nessun dato personale letto/modificato. Rules solo locali, nessun commit o deploy.

## Stato all'11 novembre 2026 — storico, superato dal riepilogo in apertura

- **Produzione = `a479b7b`** (ultimo commit con codice; i successivi sono solo documenti). Rilascio del 10 novembre
  (Rules 01:20:40 UTC, Hosting 02:21 Europe/Rome) descritto in `IMPLEMENTATION_PLAN.md`: issue #6, #7, #9, #10, #12
  chiuse; aperte #11 (approvazione visiva sprite), #4 e #5 (prove Pixel 8). Backup di produzione del 10 novembre in
  `.firebase/backup-prod-20261110-021925/` (ignorata da Git).
- **Integrità del deploy verificata (11 novembre, sola lettura):** `index.html` live su `web.app` e `firebaseapp.com`
  identico alla build locale; bundle live `index-2460cefa….js` (HTTP 200) con SHA-256 `cddb2425…af36c6`, identico a quello
  di un `npm run build:cloud` rieseguito da HEAD (build riproducibile, nessun endpoint emulatore); manifest identico,
  fallback SPA attivo. Rules live (release 2026-11-10T01:20:40Z, letta via API con l'accesso della CLI) SHA-256
  `59e64d5b…078bb` = `firestore.rules`. Canale `anteprima` del 6 novembre ancora attivo fino al 13 novembre (scade da solo).
  Login, lettura e scrittura dei dati reali restano **non verificati** dall'agente.
- **Git:** su autorizzazione, `release/2026-11-10` unito in `main` (fast-forward) e pubblicato con push; nessun force push.
- **Dati hybrid promossi (11 novembre, autorizzato):** dopo il riavvio della macchina (11 nov 13:50) il Firestore Java
  orfano 41656 ed Expo 105884 non esistevano più, porte 8180/8081 libere; i dati in memoria sopravvivevano solo
  nell'export di recupero. Copia precedente di `emulator-data/` (export 8 nov, icona `bus`) spostata in
  `.firebase/promote-20261111-recovery-41530/previous/` con impronte `previous.sha256`/`promoted.sha256`; l'export
  `.firebase/recovery-20261110-orphan-41530/` (conservato) copiato in `emulator-data/`, identico byte per byte. Import
  verificato in un emulatore temporaneo (porta 43380, config rimossa): 1 config, 72 spese, 8 categorie, 8 nomi, 3 fondi,
  6 movimenti, 2 liste, 11 prodotti; nessuna icona `bus`, una `train`. Nessun contenuto stampato. Rimossi il lock
  obsoleto `.firebase/hybrid.lock` (PID 41530 non attivo) e le config `.nummo-hybrid-41530.json`/`-14940.json`.
  `npm run dev` ora riparte dai dati aggiornati; avvio interattivo non provato.
- **Sessione hybrid interrotta (12 novembre):** il runner PID 10861 (avvio 11 nov 14:16) è terminato col riavvio della
  macchina (12 nov 18:43) senza export: `.firebase/hybrid-cN5WrZ/` contiene solo `cli-config`. Le scritture locali fatte
  in quella sessione sono perse; `emulator-data/` resta l'export promosso (10 nov 00:57). Lock rinominato in
  `.firebase/hybrid.lock.stale-10861`, config `.nummo-hybrid-10861.json` spostata nella cartella di sessione.
- **Verifiche:** `npm run check` OK (typecheck, **363/363**, build demo) l'11 e il 12 novembre; `test:emulator` 18/18 e
  `test:hybrid` 9/9 del 10 novembre, non rieseguiti (nessuna modifica al codice).
- **Discrepanze note ancora aperte:** `AppDialog` non chiude con Escape (solo `AnchoredMenu`/`BottomSheet` usano
  `useEscape`), in contrasto con la convenzione Overlay di AGENTS.md. README (backup da «Spese → Dati», mancano Fondi/
  Liste/Importa ed esporta) e parti di `docs/architecture.md` sono storici. Traduzioni inutilizzate della vecchia Guida
  sui Fondi in `src/i18n/en.ts`. Questi riscontri sono storici: per numeri e problemi attuali vale il riepilogo in apertura.

## Issue #14 (spese programmate) chiusa senza implementazione — 12 novembre 2026

- Analizzata via `gh`, nessuna modifica al codice. Su decisione dell'utente chiusa come **not planned** (19:05:55 UTC)
  con commento di sintesi: limite «≤ oggi» in `DateField`, `validateExpenseForm`, `parseExpenseRequest` e Rules
  (`validDate`); `expandOccurrences` esclude già le singole future, ma `ExpenseList` le nasconderebbe. Riapribile.

## Impostazioni: sezione «Analisi» sotto lo stile delle icone, Ripristina outlined — 12 novembre 2026

- `SettingsPage.tsx`, ordine finale: Lingua, Tema, Colore, Carattere, Stile delle icone, **«Analisi»** (card a tutta
  larghezza con il solo `SwitchRow` «Mostra andamento nel tempo», componente e preferenza `dashboardTrend` invariati),
  poi «Ripristina predefiniti» fuori dalle card, come `Button` `outlined` (bordo 1 dp `outline` di Paper, testo
  `secondary`, `radius.pill`, icona `rotateCcw`, altezza 48 dp; hover/ripple di Paper, anello di focus globale).
  Su richiesta, scartato un primo tentativo con l'interruttore dentro la card delle icone e senza padding laterale
  (hover attaccato al testo, diverso dalle altre righe): `SwitchRow` è tornato identico a HEAD.
- `npm run check` OK (typecheck, **365/365**, inclusi test di un'altra sessione concorrente, build demo). Chromium
  headless su export demo privato nello scratchpad (da disconnessi, nessun dato): 412×915 chiaro IT, 320×740 scuro IT,
  1280×900 scuro EN e chiaro IT; ordine delle intestazioni e opzioni → switch → pulsante, un solo switch, nessun overflow
  orizzontale né errore JS. Hover col mouse emulato: un solo strato `onSurface` all'8% a tutta riga con il raggio del
  controllo. Non provati telefono reale, mouse reale, screen reader. Nessun commit.
- **«Prossimi rinnovi» (Spese → Pagamenti ricorrenti) limitato ai 30 giorni:** `upcomingRenewals(entries, today, until?)`
  esclude i rinnovi oltre `until` (incluso il giorno limite); `Workspace` passa `addDays(today, forecastDays)`, la stessa
  finestra del totale `soon`, che già escludeva i rinnovi lontani (prima elenco e conteggio includevano es. un annuale
  tra 11 mesi). Card nascosta se nessun rinnovo nella finestra. Limite noto: l'elenco mostra il prossimo rinnovo per serie,
  mentre il totale somma tutte le occorrenze (una serie settimanale conta 4–5 volte nel totale, una nell'elenco).
  Guida e traduzione EN aggiornate («prossimi 30 giorni»); nuovi assert in `tests/pricing.test.ts`.
  `npm run check` OK (**365/365**, inclusi test di un'altra sessione concorrente su icone/Rules, non toccata).
  Card dei rinnovi non vista nel browser (richiede dati): coperta solo dai test di dominio.

## Rilascio Hosting di `e2eee92` (#13 + #15) — 12 novembre 2026, 00:03 Europe/Rome

- Su autorizzazione: `feat/15-category-from-picker` unito in `main` (fast-forward `e7ade61..e2eee92`) e push; issue #15
  chiusa come completata (commento con soluzione, verifiche e limiti). `npm run check` OK sull'albero combinato (363/363).
- `npm run deploy:hosting` (prima `--dry-run`) su nummo-6b6e2, **solo Hosting**: le Rules non cambiano
  (`firestore.rules` SHA-256 `59e64d5b…078bb` = release live del 10 novembre). Pubblicati insieme #13 (navigazione,
  «Analisi») e #15. Live su `web.app` e `firebaseapp.com`: `index-11c4cc18….js` (HTTP 200, SHA-256 `d130a93e…`, uguale a
  `dist/`), nessun endpoint emulatore, `index.html` e manifest identici alla build; Chromium headless arriva ad
  «Accedi con Google». Precedente versione live: bundle `index-2460cefa….js` del 10 novembre (rollback dalla console).
- **Non verificati:** login, creazione di una categoria e spese sui dati reali, telefono/PWA. I client aperti vanno ricaricati.

## Issue #15: creare una categoria dal selettore di Nuova spesa — 11 novembre 2026

- Implementazione autorizzata dopo l'analisi: **solo nome e icona** (le categorie non hanno colore: resta quello automatico
  della palette) e **solo in Nuova spesa** (più lo stato senza categorie). Modifica spesa e conferma delle liste invariate
  (lì il pulsante dello stato vuoto porta ancora a Categorie). Issue aperta, nessun commento, commit o deploy.
- `useRemoteCategories.createCategory` restituisce l'ID creato (`null` se fallisce) ed è stabile (`useCallback`), per non
  rompere il `memo` del modulo. `CategoryEditor` ha due modalità (`record` assente = «Nuova categoria»), stessa
  validazione `categoryNameError`; la pagina Categorie lo usa ancora per la modifica. `SelectField` ha un'`action`
  facoltativa: ultima riga separata, con «+», che chiude il foglio/menu e poi apre il dialogo. `ExpenseForm` imposta
  `categoryId` solo dopo la conferma della transazione; la bozza non viene toccata. Offline la riga e il pulsante dello
  stato vuoto sono disattivati (salvataggio in transazione server). Nuovo errore «Crea prima una categoria.»,
  paragrafo nella Guida, traduzioni EN. Nessuna modifica a dati, servizi, Rules o backup.
- **Verifiche:** `npm run check` OK (typecheck, **363/363**, build demo) e `test:emulator` **18/18** (porte dedicate
  46099/46280, config rimossa). Chromium/CDP su build demo con emulatori dedicati (45099/45280), archivio vuoto:
  **26/26 controlli** in ciascuna esecuzione a 412×915 chiaro IT (foglio), 1280×900 scuro EN (menu) e 320×740 scuro IT.
  Coperti: creazione dallo stato vuoto e dalla riga in fondo al selettore, selezione automatica, bozza (importo e
  descrizione) conservata, Annulla senza effetti, nome duplicato (maiuscole diverse) e vuoto rifiutati, icona salvata
  e mostrata, spesa salvata sul server con l'ID della nuova categoria, riga disattivata offline, Escape sul selettore,
  nessun overflow né errore JS. Screenshot osservati in `/tmp/claude-1000/…/scratchpad/issue15-*`; probe conservato lì.
- **Osservato, preesistente:** a 320×740 la snackbar copre «Salva» per qualche secondo (vale per tutte le notifiche).
  Il dialogo non chiude con Escape (`AppDialog`, già noto). Non verificati telefono reale, tastiera virtuale, screen reader.
- Lavoro concorrente di un'altra sessione (#13: AppShell, StateLayerPressable, check-navigation, AGENTS, architettura)
  e `npm run dev` hybrid dell'utente (dalle 14:16) presenti e non toccati. La fixture dell'utente medio è stata rinominata
  in `docs/testing/nummo-utente-medio.json` (stessi dati, solo formattazione): link del README riallineato il 12 novembre.

## Chiusura issue #13 — 11 novembre 2026

- Su richiesta dell'utente, issue #13 chiusa come completata tramite `gh`; stato **CLOSED** riletto,
  chiusura **14:15:51 UTC**. Commento: https://github.com/alexiomagnus/Nummo/issues/13#issuecomment-6798198126.
- Correzione della navigazione e rinomina «Analisi» nel commit **`fa521d2`**, già su `origin/main`.
  `npm run check` passato prima di quel commit (363/363, typecheck e build demo), anche su copia isolata.
  Questa fase modifica solo il registro di consegna: controllato il diff, nessun nuovo test applicativo necessario.
- Nessun deploy Hosting né collaudo Realme/PWA o Safari iOS reale; questi limiti sono riportati nel commento.
  Modifiche concorrenti della issue #15 e fixture conservate ed escluse dal commit di chiusura.

## Rinomina Dashboard → Analisi — 11 novembre 2026

- Su richiesta: titolo e navigazione ora «Analisi» in italiano e «Analysis» in inglese. Allineati il titolo
  delle relative impostazioni e i riferimenti nella Guida; identificatore `dashboard`, preferenze e stato invariati.
- Aggiornati catalogo IT/EN, controllo di traduzione e selettori della regressione browser.
- `npm run check` OK (typecheck, **363/363**, build demo), sia sul working tree sia su copia isolata
  dei soli file preparati per il commit; `git diff --cached --check` e sintassi script OK.
  Commit/push autorizzati per questa rinomina e la correzione #13, escluso il lavoro concorrente #15 e le fixture.
  Nessun deployment o chiusura della issue.

## Issue #13: etichette della navigazione mobile — 11 novembre 2026

- Implementazione autorizzata dopo l'analisi; issue lasciata aperta, nessun commento, commit o deploy.
  Conservate le modifiche concorrenti a categorie/modulo/guida e le fixture locali preesistenti.
- Riprodotto su build precedente in Chromium: a 320 px, Dashboard attiva in Google Sans 11 px misura
  57,53 px contro uno slot di 51 px; la verifica della sola larghezza della pagina non lo rileva.
  Il controllo visivo ha trovato anche un secondo ritaglio: `overflow: hidden` del pulsante arrotondato
  taglia le lettere in basso pur quando il rettangolo del testo entra nello slot.
- `NavigationBar` usa la larghezza del proprio layout, il font scelto e la misura DOM delle etichette
  tradotte al peso 700; stessa variante Paper per tutti (`labelMedium` oppure `labelSmall` senza tracking).
  Riserva sempre il FAB nel calcolo, anche su Nuova spesa: nessun cambio tipografico durante la sua animazione.
  Margini laterali e distanza dal FAB 4 dp, gap slot 0: a 320 px gli slot con FAB diventano 59 px.
  Testo centrato/maxWidth 100%; contenuto del pulsante visibile agli angoli. `StateLayerPressable`
  dà allo strato di feedback il proprio raggio, conservando la forma arrotondata anche senza clipping del padre.
  Nessuna nuova dipendenza, testo UI, modifica a dati/servizi/Rules o disattivazione dello scaling del browser.
- `scripts/check-navigation.mjs --labels-only`: misure `Range` rispetto ai pulsanti, centratura, area di tocco
  almeno 48×48, variante uniforme e assenza del clipping del pulsante; screenshot anche a 320 px.
  **48/48** combinazioni su build finale: 320/360/379/380/390/412 px × Google Sans/system × IT/EN ×
  Nuova spesa/Dashboard attiva (FAB assente/presente). Zero errori JS. Confrontati i risultati: tipografia
  invariata nei **24** passaggi FAB assente/presente. Lo stesso controllo fallisce sulla build precedente.
- Regressione completa navigazione: 320×740 scuro e 412×915 chiaro con movimento ridotto; drag, inversione,
  ritorno, annullamento, tocchi, Invio/Spazio, cambi rapidi e drawer desktop passati. Nessun frame residuo
  del feedback o indicatore fuori dalla pillola, nessun overflow o errore JS. Screenshot 320 chiaro/scuro
  osservati: etichette intere. Risultati in `/tmp/nummo-issue13-final-{labels,gestures,reduced}`.
- **`npm run check` OK** (typecheck, **363/363**, build demo), sul working tree condiviso; `git diff --check`
  e sintassi dello script OK. Suite Rules non richiesta/ripetuta: intervento di presentazione.
  Emulatori demo propri Auth 49199/Firestore 49380/Hub 49417 arrestati, config `.nummo-issue13-review.json`
  rimossa; nessun dato personale/cloud toccato. AGENTS e architettura aggiornati per la nuova regola stabile.
- Restano da verificare Realme 14T/PWA reale, Safari iOS, impostazioni di ingrandimento del testo del dispositivo
  e screen reader. L'emulazione Chromium non certifica questi ambienti; patch non pubblicata.

## Rilascio: commit, push e Hosting — 9 novembre 2026, ~17:55 Europe/Rome

- Rules: file locale identico alla release pubblicata da Codex alle 16:45:38 UTC (SHA-256 `972fd97e…d6d4a`); nessuna
  modifica né ripubblicazione necessaria. Prima del commit, sul working tree completo (mio + Codex):
  `npm run check` **OK** (typecheck, **331/331**, build demo) e `test:emulator` **16/16** su porte dedicate
  (Auth 42099, Firestore 42280, Hub 42400; config temporanea rimossa). `git diff --check` OK, nessun segreto nel diff.
- Commit **`37407c3`** (prove gratuite #8, fogli dal basso #3, pulsanti «Modifica prodotto» #2, navigazione #1, documenti
  e fixture) e push su `origin/main`. Esclusa solo la config temporanea `.nummo-hybrid-41530.json` del runner attivo.
- `npm run deploy:hosting` (solo Hosting) su nummo-6b6e2, sito LIVE: il sito ora corrisponde a `37407c3`. Verifica HTTP:
  index.html live referenzia `index-338dc5fa….js` (HTTP 200), manifest `theme_color` `#121212`.
  Login, caricamento dati, CRUD cloud e resa su Pixel/PWA reale non verificati. I client già aperti vanno ricaricati:
  quelli vecchi rifiutano lo schema 2 delle prove gratuite.
- Igiene Git (10 novembre): `.nummo-hybrid-*.json` in `.gitignore`, `.nummo-hybrid-14940.json` tolto dall'indice con
  `git rm --cached` (file conservato su disco). Superato il punto 4 delle «Prossime attività» in fondo.
- **[Superato l'11 novembre, vedi «Stato corrente»]** **Firestore hybrid senza proprietario (10 novembre):** il runner PID 41530 (avvio 9 nov 15:07) è terminato senza export;
  il suo Firestore Java PID 41656 su 8180 è rimasto attivo, `.firebase/hybrid.lock` punta ancora a 41530 e resta
  `.nummo-hybrid-41530.json`. Un secondo `npm run dev` (runner PID 105831, avvio 16:33, Expo PID 105884 su 8081) lo ha
  riconosciuto e **riusato**: non lo possiede, quindi all'arresto non lo esporta né lo ferma. Processi non toccati.
- Export esplicito via endpoint dell'emulatore in **`.firebase/recovery-20261110-orphan-41530/`** (cartella nuova, con
  `firebase-export-metadata.json`; `emulator-data/` non sovrascritto). Validato importandolo in un emulatore temporaneo
  (porta 43280, poi arrestato, config rimossa): impronte SHA-256 dei 111 documenti del proprietario identiche ai dati in
  memoria (1 config, 72 spese, 8 categorie, 8 nomi, 3 fondi, 6 movimenti, 2 liste, 11 prodotti). Nessun contenuto stampato.
- Rispetto a `emulator-data/` (export 8 nov 22:17) differisce **un solo documento**: la categoria con icona `bus` → `train`,
  revisione 1 → 2 (9 nov 14:22 UTC). Il client attuale rifiuta `bus`: riavviare hybrid da `emulator-data/` riproporrebbe
  il blocco delle categorie. Da fare con autorizzazione, a sessione dev chiusa: nuovo export finale, promozione in
  `emulator-data/` conservando la copia precedente, poi arresto di Java 41656 e ripristino del lock.

## Rules pubblicate e issue #8 chiusa — 9 novembre 2026

- Su autorizzazione esplicita dell'utente: `firebase deploy --only firestore:rules --project nummo-6b6e2`
  tramite CLI locale. Compilazione e pubblicazione riuscite; **solo Rules**, nessun deploy Hosting o commit.
- Release `cloud.firestore` aggiornata **16:45:38.713737 UTC** (17:45 Europe/Rome), riletta via API:
  contenuto identico al file locale, SHA-256 `972fd97ed5c2b06358342fa14de48baddfbc4a78019b59037faf42af821d6d4a`.
  Progetto verificato nei soli PROJECT_ID dei file di configurazione; nessun segreto esposto né documento personale letto/scritto.
- Issue #8 chiusa tramite `gh` come completata, su richiesta; stato CLOSED riletto, chiusura **16:46:29 UTC**.
  Commento con implementazione, check 331/331, suite SDK/Rules 16/16 e limiti del collaudo.
- Il **client resta locale e non pubblicato**: per usare le prove dal sito pubblico occorre pubblicare il client
  aggiornato. Vecchi client incompatibili con schema 2; CRUD cloud e Pixel/PWA reale non verificati.
  La nota «Rilascio non eseguito» della fase di implementazione sotto è superata per le sole Rules.

## Issue #8: prova gratuita degli abbonamenti — 9 novembre 2026

- Implementazione autorizzata dopo lettura della issue tramite `gh`. Nessun commit, deploy, commento o chiusura
  della issue. Conservate le modifiche locali preesistenti e quelle concorrenti a overlay/geometria/menu.
- `trial.ts`: `expense_date` = inizio abbonamento, `first_payment_date` = primo addebito e origine del calendario
  pagato. Importi sempre positivi. Fino al giorno prima non esiste alcuna occorrenza economica, al primo giorno
  si applica il costo; numerazione prezzi da 0 su questo calendario. Storico, previsioni, riepiloghi, Dashboard,
  fondi e CSV riusano la stessa proiezione. Nessun cron o pagamento scritto automaticamente.
- La condizione «In prova gratuita» è calcolata, non un nuovo stato persistente. Pause e annullamenti rispettano
  anche il primo pagamento differito; cambi di oggi validi dai giorni successivi. Annullare il giorno del primo
  addebito non lo cancella retroattivamente. Riattivazione senza recupero dei pagamenti saltati.
- Modulo: opzione solo se Ricorrente, prima data precompilata a un mese dall'inizio, modificabile dal calendario
  (date valide successive all'inizio, massimo 2099-12-31). Editor: prima data e prezzo base modificabili finché
  la prima data resta futura; dopo non si spostano calendario o pagamenti maturati, il prezzo cambia per i rinnovi
  futuri. Una prova salvata non si rimuove né si aggiunge retroattivamente a una serie ordinaria. DateField ha
  limiti/etichetta opzionali; date ordinarie ancora limitate a oggi. Testi IT/EN e Guida aggiornati.
- Compatibilità: **schema documento 2 solo per prove**, legacy 1 invariato, nessuna migrazione automatica.
  I client precedenti rifiutano lo schema 2 (blocco esplicito dell'archivio), evitando spese inesistenti:
  occorre aggiornare il client prima di usare dati con prove. `price_changes` schema 2 compatto in Firestore,
  array nel dominio e nel JSON; schema 1 conserva gli array Firestore. Nuovo backup **v5**, lettori v1–v4
  mantenuti, prima data inclusa nei confronti import. Fixture esistenti aggiornate e nuovo file TEST delle prove.
- Rules: validazione schema/data/costo e protezione del calendario dopo la prima scadenza. I tentativi iniziali
  con tutti i prezzi come array superavano il budget di 1000 espressioni in aggiornamento: risolto con prezzi
  compatti nello schema 2 e valutazioni legacy equivalenti meno ripetitive. Verificati campi obbligatori mancanti,
  chiavi extra, prezzi/stati malformati, massimo otto prezzi + otto stati + fondo, sia legacy sia prova, in creazione
  e aggiornamento; modifica futura della prima data e del prezzo nel caso massimo accettata.
- **Verifiche finali:** `npm run check` OK (typecheck, **331/331**, build demo); `test:emulator` **16/16** su
  Auth 46199, Firestore 46380, Hub 46417, websocket 46419. Anche CRUD prova, date future/impossibili, downgrade,
  storico protetto, export/ripristino v5 e importazione identica ripetuta (revisione invariata). Nessun cloud.
  Log `/tmp/nummo-trial-check.log`, `/tmp/nummo-trial-emulator-final.log`; `git diff --check` OK.
- **Browser Chromium/CDP**, export demo `/tmp/nummo-trial-web` con endpoint espliciti e dotenv disattivato:
  412×915 chiaro e 320×740 scuro, importo zero rifiutato, prova assente nelle spese ordinarie, scelta del primo
  pagamento futuro nel calendario, creazione via UI e rilettura server (schema/costo/data/prezzi), riepilogo con
  stato in prova/zero pagamenti/zero totale, modifica del costo e annullamento durante la prova senza pagamenti.
  A 320 px IT→EN→IT, preferenza persistita e bozza conservata; nessun overflow o errore JS. Screenshot osservati
  in `/tmp/nummo-trial-browser-results` e `/tmp/nummo-trial-browser-320-results`; probe omonimi in `/tmp/`.
  Il selettore di test iniziale e l'attesa di role=dialog sono stati corretti nel solo probe (AppDialog usa aria-modal).
- Emulatori demo propri arrestati regolarmente; config `.nummo-trial-review.json` rimossa. Hybrid personale e dati
  originali non toccati. Restano non verificati Pixel/PWA reale, screen reader, tastiera virtuale reale e cloud.
  **Rilascio non eseguito:** le nuove Rules sono necessarie prima di poter salvare prove in produzione;
  pubblicazione Rules e Hosting richiedono autorizzazione separata. I vecchi client aperti vanno aggiornati.

## Issue #3: chiusura del foglio Categoria con swipe — 9 novembre 2026

- Causa dimostrata: `useSheetDrag` (`Overlay.tsx`) esisteva ma non si collegava mai. Il `Portal` Paper monta i figli
  in un commit successivo, quindi l'effetto (dipendente solo da `mounted`) trovava i ref vuoti. In Chromium prima della
  correzione: testata con `touch-action: auto`, foglio fermo dopo 260 px da maniglia e lista. Riguardava tutti i
  `BottomSheet` (`SelectField` e `MenuSelect`).
- Correzione in `Overlay.tsx`: nodi da ref a callback in stato; `Scrim` accetta `ref`. Testata con pointer event
  (touch/mouse); lista con eventi touch e `touchmove` non passivo; il gesto passa al foglio solo se parte con la lista
  in cima, verso il basso oltre 8 px e in prevalenza verticale. `overscroll-behavior: contain`, click dopo il
  trascinamento soppresso, scrim che schiarisce con la distanza, uscita dalla posizione raggiunta. In
  `menuGeometry.ts`: `sheetGestureOwner`, `recentVelocity` (ultimi 100 ms); `sheetDragOutcome` ora riceve la velocità.
  Aggiornati AGENTS.md (riga Overlay) e docs/architecture.md. Nessun nuovo testo UI, dato, servizio o Rules.
- `npm run check` **OK** (typecheck, **330/330**, build demo) sul working tree condiviso con l'altra sessione; durante
  la fase il typecheck/test dell'albero è stato temporaneamente rosso per il suo lavoro in corso (`trial`, backup).
- Chromium headless/CDP, touch emulato, build demo con emulatori dedicati (Auth 41099, Firestore 41280, Hub 41400;
  config temporanea rimossa, emulatori arrestati; hybrid utente su 8180 non toccato), 16 categorie TEST aggiunte
  nell'emulatore. 412×915 chiaro IT e 320×740 scuro EN, **22/22 controlli**: maniglia 40 px lenta → ritorno; 260 px →
  chiusura con foglio che segue il dito e scrim < 1; swipe rapido 50 px → chiusura; lista in cima 260 px → chiusura
  senza selezionare; swipe in su → la lista scorre; lista già scorsa + swipe in giù → scorre, non chiude; scrim,
  Escape e tocco su una voce invariati; mouse sulla maniglia → chiusura; movimento ridotto → chiusura immediata.
  Anche «Ordina» in Spese (`MenuSelect`) si chiude dalla maniglia. Nessun errore JS.
- Non verificati: telefono reale Android/iOS (elastico e `scrollTop` negativo su Safari, pull-to-refresh di Chrome),
  screen reader, fluidità percepita. Issue non chiusa, nessun commit o deploy.

## Issue #2: pulsanti di «Modifica prodotto» — 9 novembre 2026

- Causa: `Dialog.Actions` di Paper rende compatti i figli diretti (niente larghezza minima, etichetta ±8 dp), quindi
  «Salva» pieno risultava più stretto di «Annulla» testuale. La correzione da 96 dp di `ListEditor` non copriva `ItemEditor`.
- `ListDialogs.tsx` (`ItemEditor`, solo questo): «Annulla» e «Salva» in un gruppo in riga allineato a destra, entrambi
  `compact` con `minWidth: layout.minTouch * 2` e `flexShrink: 1`; contenitore di «Elimina» da `flex: 1` (base 0) a
  `flexGrow: 1`, così la riga va a capo invece di comprimere «Elimina» sotto i pulsanti (rischio a 320 px con 96 dp).
  Mode, colori, testi, salvataggio ed eliminazione invariati; nessuna nuova traduzione.
- `npm run check` **OK** su Linux/Node 26.13.0 (typecheck, **321/321**, build demo 590 moduli), ripetuto sul working
  tree che contiene anche modifiche non committate di un'altra sessione (Workspace, AppShell, navigazione…), non toccate.
- Chromium headless (CDP) su build demo con emulatori dedicati (Auth 41099, Firestore 41280, Hub 41400, config
  temporanea rimossa, emulatori arrestati; hybrid utente PID 41530 su 8180 non toccato). Lista e prodotto creati dall'UI
  nell'emulatore. 320/360/412/1280 px, chiaro/scuro, IT/EN: Annulla e Salva 96×48 sulla stessa riga, nessuna
  sovrapposizione con «Elimina», dentro il dialogo, nessuno scroll orizzontale; a 320–360 px «Elimina» sopra e coppia
  sotto a destra. «Annulla» chiude, «Elimina» apre la conferma. Nessun errore JS. Non provato su telefono reale.
- **Rilevato, preesistente e fuori dalla issue:** `AppDialog` non gestisce Escape (solo `AnchoredMenu`/`BottomSheet`
  usano `useEscape`), mentre il commento di `Scrim` e AGENTS.md ne suggeriscono la chiusura da tastiera.
  Stesso difetto di larghezza possibile in `RegisterListDialog` e nel dialogo di assegnazione di `FundsPage`.
  Issue non chiusa, nessun commit o deploy.

## Scatti durante i cambi pagina — 9 novembre 2026

- Diagnosi su export demo locale, Chromium/CDP, 412×915, CPU 4×: 240 spese TEST generate, 8 categorie,
  fondi e liste dalla fixture standard. Nessun dato personale. Le pagine venivano rimontate a ogni ritorno;
  il cambio di sezione rieseguiva anche gli hook remoti e ricreava le props del modulo nascosto.
- Navigazione spostata in `WorkspaceNavigation` sotto gli hook remoti, con callback stabili e `startTransition`;
  memo per modulo e pagine principali, store visuale del modulo memorizzato. Spese/Dashboard/Fondi/Liste montano
  alla prima visita e sono conservate con `Activity` (DOM/stato mantenuti, effetti sospesi quando nascoste).
  Filtri, dettagli e mese selezionato ora restano tra le visite. Nessun precaricamento all'avvio, query,
  servizio, regola o schema cambiato; cambio UID smonta ancora tutto. Maggior memoria per le pagine visitate.
- Confronto indicativo (una sessione per versione, due ritorni per pagina, non un benchmark statistico).
  Tempo fino al commit della destinazione, in ms, **ritorni**:

  | Pagina | Prima | Dopo |
  | --- | --- | --- |
  | Spese | 619–814 | 145–155 |
  | Dashboard | 187–258 | 59–89 |
  | Fondi | 150–226 | 53–71 |
  | Liste | 88–101 | 44–62 |

  Massimo intervallo rAF tornando a Spese: 867–1050 → 200–300 ms: miglioramento, **restano frame lenti**.
  Prima apertura Spese: commit ~994 → ~1170 ms, massimo intervallo rAF ~1250 → ~500 ms. Il rendering concorrente
  distribuisce il lavoro ma non certifica una minore latenza della prima apertura, né 60 FPS. La molla JS della
  pillola e l'animazione di larghezza del FAB restano possibili fonti di scatti; non cambiate in questa fase.
  Nessuna equivalenza con le prestazioni del Pixel 8 reale.
- Misuratore opzionale in `scripts/check-navigation.mjs --measure`: tre giri, commit effettivo + 500 ms di
  assestamento, rAF e long task; esegue poi anche le regressioni della issue #1. Esempio:
  `node scripts/check-navigation.mjs /tmp/nummo-navigation-perf-after /tmp/nummo-navigation-perf-final-isolated --auth-port 49199 --measure`.
  Prima: `/tmp/nummo-navigation-perf-baseline-confirmed/performance.json`; dopo:
  `/tmp/nummo-navigation-perf-final-isolated/performance.json`. Build finale demo con endpoint espliciti
  49199/49380 e `EXPO_NO_DOTENV=1`; le misure rAF non sono FPS presentati dal compositor.
- Browser: identità DOM del campo ricerca e filtro conservati, pagina nascosta fuori layout, aggiornamento di
  una descrizione TEST mentre Spese è nascosta visibile al ritorno, cambio IT→EN e bozza 12,34 conservati;
  nessun errore JS (`/tmp/nummo-navigation-state-results`, probe `/tmp/nummo-navigation-state.mjs`).
  Regressione issue #1 passata a 412×915 chiaro e 320×740 scuro, incluso desktop, drag/cancel/tocchi/Invio/Spazio:
  zero frame residui del feedback e nessun overflow nel gesto registrato. Anche 412×915 scuro con movimento
  ridotto OK: pagina a opacità 1 in tutti i frame. Lo script ora attende la selezione effettiva (limite 5 s),
  senza presumere un commit entro 300 ms; la prima prova ridotta aveva superato quella vecchia attesa fissa.
- `npm run check` OK: typecheck, 321/321 test e build demo; sintassi script e diff check OK.
  Suite SDK/Rules non ripetuta (nessuna modifica ai percorsi di accesso dati). Nessun commit, deploy o intervento
  sulla issue. Pixel/PWA, screen reader e tastiera virtuale reali restano da verificare.
- Modifiche concorrenti comparse durante il lavoro in `ListDialogs.tsx` e config `.nummo-issue2-review.json`
  conservate, non modificate da questa fase; anche hybrid personale e suoi file preesistenti non toccati.
  Emulatori demo propri arrestati regolarmente; rimossa solo la config propria `.nummo-navigation-perf.json`.

## Issue #1 — flash del feedback al rilascio del drag — 9 novembre 2026

- **Chiusura autorizzata dall'utente:** issue #1 chiusa tramite `gh` come completata il 9 novembre 2026,
  16:18:50 UTC; stato CLOSED riletto. Commento con correzione, verifiche emulate e limiti: patch ancora locale,
  nessun commit/deploy né prova Pixel/PWA reale. Gli scatti durante i cambi pagina restano un problema distinto.

- **Riesame e completamento autorizzati:** conservata la patch locale, estesa la regressione a Invio dopo
  drag. Il confronto ha rilevato un secondo difetto: `swallowClick` intercettava anche il click da Invio.
  `keydown` ora azzera quel blocco per Invio/Spazio, oltre a ripristinare il feedback. Test CDP Invio con
  `text: '\r'` (necessario al pulsante nativo): build precedente resta su Spese, build aggiornata apre Dashboard.
- **Verifica corrente su Linux/Node 26.13.0:** export aggiornato `/tmp/nummo-issue1-verified`, Auth 49199,
  Firestore 49380, Hub 49417 (demo isolata). Script passato a 412×915 chiaro, 320×740 scuro e 412×915 scuro
  con movimento ridotto, più navigazione desktop in ogni esecuzione. Zero frame residui del feedback e zero frame
  dell'indicatore fuori dalla pillola nel gesto registrato; nessun overflow o errore JS. Movimento ridotto: pagina
  sempre opaca. Risultati `/tmp/nummo-issue1-verified-{light,dark,reduced}`. Sulla build precedente conservata
  `/tmp/nummo-issue1-before` il test fallisce come atteso con 5 frame residui (`/tmp/nummo-issue1-verified-before`).
  `npm run check` nuovamente OK (321/321, typecheck e build demo). Nessun collaudo Pixel/PWA reale,
  commit, deploy o intervento sulla issue. Le prove non certificano che il flash della pillola sia l'unico sintomo
  segnalato sul telefono; la conferma sul dispositivo resta necessaria.
  Emulatori dedicati arrestati regolarmente, config `.nummo-issue1-verify.json` rimossa; hybrid personale non toccato.

- Letta tramite `gh` la issue #1 (aperta, nessun commento). Riprodotto in Chromium headless/CDP, touch emulato,
  CPU 4×: dopo Spese → Fondi, lo strato premuto della voce Spese ricompare per 5 frame (~60 ms), anche disattivando
  solo in memoria l'animazione della pagina. Nessuna fuoriuscita dell'indicatore nel gesto misurato. Questo identifica
  un flash della pillola; la coincidenza con il sintomo del Pixel 8 resta da confermare sul dispositivo.
- `AppShell` conserva la soppressione del feedback premuto oltre il rilascio/annullamento del drag, fino alla
  successiva pressione pointer o Invio/Spazio. `StateLayerPressable.suppressPressed` azzera subito quel solo strato:
  non riappare mentre il Pressable di partenza sta ancora completando il rilascio. Hover e focus indipendenti;
  molla, indicatore e transizione della pagina invariati. Nessuna nuova dipendenza o modifica a modello dati/servizi/Rules.
- Aggiunto `scripts/check-navigation.mjs`: regressione browser con Chromium nel PATH, export demo e Auth/Firestore
  demo dedicati già avviati e inizializzati. Esempio della prova eseguita:
  `node scripts/check-navigation.mjs /tmp/nummo-issue1-after /tmp/nummo-issue1-412-light-final --auth-port 49199`.
  Build di prova con `EXPO_NO_DOTENV=1`, `EXPO_PUBLIC_NUMMO_BACKEND=emulator`, Auth 127.0.0.1:49199 e
  Firestore 127.0.0.1:49380, export in `/tmp/nummo-issue1-after`; non usare build cloud/hybrid con questo script.
  Opzioni `--vp 320x740`, `--theme dark`, `--reduced`; screenshot e frame JSON nella cartella di output.
- Il test rileva il difetto sulla build precedente (5 frame residui) e passa sulla corretta (0): direzione inversa,
  ritorno al punto iniziale, `pointercancel`, tocco con tremolio 4 px, feedback del tocco successivo e Spazio dopo
  drag, cambi rapidi e navigazione desktop 1280×900. Prove 412×915 chiaro, 320×740 scuro e 412×915 scuro con
  movimento ridotto; nessun overflow o errore JS. Ridotto movimento: pagina sempre a opacità 1.
- `npm run check` OK: typecheck, **321/321**, build demo; sintassi dello script e `git diff --check` OK.
  Il collaudo browser è separato da `npm run check`; nessuna prova su Pixel/PWA installata, tastiera virtuale
  reale, Safari o screen reader. Nessun commit, deploy, commento o chiusura della issue.
  Emulatori demo propri arrestati regolarmente; config `.nummo-issue1-review.json` rimossa. Hybrid personale
  su 8180 e relativo file temporaneo preesistente non modificati.

## Diagnosi archivio hybrid in sola lettura — 9 novembre 2026

- Verificato l'emulatore locale su 127.0.0.1:8180 con progetto/Hub coerenti e proprietario configurato.
  Il messaggio «Archivio non valido: esportazione e modifiche bloccate» è riprodotto dal decoder:
  1 delle 8 categorie è rifiutata perché conserva `icon: bus`, identificativo rimosso.
- Sulla sola copia in memoria, cambiare `icon` in `train` rende valido il record; nessun altro campo
  richiede correzioni. Validi tutti i record letti delle altre collezioni: 72 spese, 3 fondi,
  6 movimenti, 2 liste e 11 prodotti. Nessun contenuto personale o identificativo nei log.
- **Correzione successiva autorizzata:** aggiornata solo l'icona della categoria locale `bus` → `train`,
  revisione +1 e timestamp server, tramite commit atomico REST con precondizione `updateTime` dopo
  rilettura. Un primo tentativo con transazione REST è scaduto; prima della seconda modalità è stato
  verificato in lettura che la categoria conservasse `bus`, senza ripetizione cieca della scrittura.
  Rilette le categorie: **8/8 valide**, altri campi del documento e altre categorie invariati.
  Nessun accesso cloud, modifica applicativa o deploy; nessuna spesa modificata. Da confermare la
  scomparsa del messaggio nell'interfaccia. La correzione cloud documentata sotto riguarda un archivio separato.

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

## Fase storica — icona monocromatica (stato del 9 novembre)

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

## Fase storica — icone di categoria (stato del 9 novembre)

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

- **Superata dallo «Stato corrente»:** i punti seguenti sono storici (HEAD `b97758d`, 305 test, 9–10 novembre). Stato Git, ultimo
  commit di codice e numero dei test attuali sono nello «Stato corrente» in apertura (al 24 novembre: `1ad74ad`, 590/590).

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
- `.nummo-hybrid-*.json` è ora coperto da `.gitignore` e nessun file del genere è tracciato (verificato il 14 novembre).

## Funzionalità implementate (riscontro nel codice, riallineato il 21 novembre)

Riepilogo sintetico; il dettaglio stabile è in `AGENTS.md`.

- **Modalità:** Standard (IndexedDB sul dispositivo, protezione locale, backup manuale) e Avanzata (Firebase personale BYOF,
  collegabile dall'app); una sola fonte di verità per modalità.
- **Sessione (Avanzata):** login Google popup, logout dopo le scritture pendenti con cancellazione della cache su disco, isolamento
  per UID, «Questo Nummo è privato» per chi non è il proprietario, errori `auth/...` validati IT/EN; guida pubblica `#guida`.
- **Spese:** CRUD con UUID stabile, conferma server, revisioni e conflitti espliciti, bozza conservata tra sezioni; Esercente
  facoltativo con suggerimenti; scansione dello scontrino solo con AI BYOK (Claude, OpenAI, Google Gemini; spenta di base, OCR rimosso il 21 novembre) che
  propone soltanto; Templates facoltativi (pagina dal menu account, pulsante «Template» nella prima riga di Nuova spesa dal 21 novembre, `ee2fcdc`, Esercente facoltativo, limite 100). Pagina Spese a due
  viste: spese singole (ricerca, filtri, card «Totale», «Prodotti (n)») e abbonamenti (stati, prove gratuite, cambio di frequenza,
  fino a otto prezzi per numero di rinnovo, «Storico dei pagamenti» con eliminazione di un singolo pagamento). In Avanzata una nuova
  spesa offline libera il modulo ed è segnata «In attesa di invio» finché il server non la conferma (`1c83b54`).
- **Categorie:** pagina dal menu account; nomi unici; 64 ID icona validi (40 attive, 39 selezionabili; ritirate `sofa` e le 24
  storiche, queste ultime solo col contorno), tre stili (minimale, colorato, pixel); cinque predefinite su archivio vuoto,
  ripristinabili con «Ripristina le categorie predefinite» (solo quelle mancanti); una categoria usata da spese o abbonamenti non si elimina.
- **Fondi** (destinazione «Fondi»): facoltativi; nome, icona, colore, saldo iniziale, ricarica e budget mensili facoltativi; riepilogo
  del mese con sette totali, mai elenchi né saldi; Aggiungi/Trasferisci solo con dati di saldo; archiviazione; fondo preferito scelto in
  Impostazioni (per browser). Budget mensile generale **non più nell'interfaccia** dal 16 novembre (dati e backup compatibili).
- **Liste della spesa** (destinazione «Liste»): crea/rinomina/duplica/elimina, checklist con salvataggio automatico, «Registra spesa»
  in transazione (una spesa con `list_id`/`list_items`, lista archiviata); eliminare la spesa riattiva la lista. Fino a 500 prodotti per lista (100 fino al 22 novembre).
- **Analisi:** periodi mese, mese scorso, 3 e 12 mesi; Ciambella, Blocchi e Barre (quota sul totale; variazione rispetto al periodo
  precedente rimossa con `26c5b8d`), andamento giornaliero;
  filtro «Fondo».
- **Archiviazione e backup** (menu account, sotto Categorie): stato e cambio della modalità, in Avanzata passaggio dei dati tra le due
  modalità («Dal dispositivo a Firebase», «Da Firebase al dispositivo», solo unione), CSV di sola consultazione, JSON
  `nummo-backup` **v11** (con i template) unico ripristino (lettori storici), unione senza sovrascritture con nomi dei conflitti, sostituzione confermata
  (dal 22 novembre il dialogo propone di scaricare prima un backup completo, mai una copia automatica); «Elimina tutte le spese».
- **Notifiche:** solo di sistema via Web Push (servizio `push-service/`), promemoria backup (solo Standard), riepilogo spese, rinnovi;
  orario e fuso scelti dall'utente. Nell'app Android (dalla 0.3.0) le stesse notifiche come notifiche locali dell'app (`Reminders.kt`).
- **Shell/UI:** Material 3 adattiva, quattro destinazioni + «Nuova spesa», temi/tinte, IT/EN senza rimontare sessione o bozze,
  tastiera virtuale gestita, transizioni con riduzione movimento; dal 23 novembre dialoghi e dettagli come schermi cresciuti
  dall'elemento toccato (container transform, `ScreenLayer`), fogli dal basso su smartphone per i moduli brevi, schermi di dettaglio di
  spese, abbonamenti e fondi, cambio chiaro/scuro animato; vibrazione **solo nell'app Android** (dal 23 novembre, un solo effetto `tap` =
  HEAVY_CLICK dalla 0.3.2) nella barra mobile, in Analisi, sui segmenti Spese/Abbonamenti e della ricorrenza e su «Salva»/«Crea»;
  interruttore «Vibrazione» solo nell'app (nel browser né vibrazione né interruttore); pagina offline di Nummo dal service worker (nessun avvio offline).
- **Collaudo:** `docs/testing/` con cinque backup fittizi (template ed esercente v11 dal 23 novembre, casi limite dell'8 novembre, utente medio v6, pagamenti eliminati v9,
  esercenti v10) e guida ai risultati attesi; spese standard, prove gratuite e cambio di frequenza sono stati spostati in
  `tests/fixtures/` (solo test automatici, commit `302b24e`).

## Decisioni tecniche recenti (dettagli in `docs/architecture.md`)

- Ricariche dei fondi calcolate dal piano come le occorrenze, mai documenti: niente duplicati tra dispositivi né
  migrazioni automatiche; spese esistenti senza `fund_id` restano «Senza fondo».
- Liste e prodotti con scritture semplici «ultima vince» (uso offline in negozio tramite coda SDK); l'unica scrittura
  economica è la registrazione transazionale.
- Backup v4 aggiunge fondi, movimenti, liste; piani e `status_changes` stringhe compatte in Firestore per il budget
  di espressioni delle Rules, array nel backup.
- Pagina «Archiviazione e backup» (ex «Importa ed esporta») montata nascosta fuori pagina per conservare anteprima e operazioni in corso.

## Problemi aperti e limitazioni

- **Compatibilità icone (risolta il 20 novembre, `ad5aa73`):** le 24 ID eliminate prima del 14 novembre sono di nuovo valide e
  ritirate in dominio, decoder, backup e Rules. Resta solo, se si vuole, il controllo sui dati reali (produzione, archivi Standard nei
  browser, backup personali), mai eseguito.
- **Rules:** budget di 1000 espressioni stretto (rimisurare a ogni nuovo controllo sulle spese); non verificano
  esistenza di fondo/lista referenziati, unicità dei nomi di fondo (solo client), ordine/date degli stati.
- **Fondi:** eliminazione basata sui dati caricati (concorrenza → spese orfane, non perse); cambiare fondo a una serie
  sposta anche i pagamenti passati; fondo predefinito non sincronizzato tra browser.
- **Liste:** spunte simultanee su due dispositivi: prevale l'ultima; nomi non unici; lista archiviata non modificabile.
- **Backup/concorrenza:** nessuno snapshot globale né atomicità dell'intero ripristino; piano di sostituzione
  ricalcolato senza nuova anteprima. Client precedenti non leggono backup più recenti.
- **Guida/avvio:** in Avanzata `warmUpServices()` parte da `App.tsx` anche su `#guida` (in Standard non parte mai):
  assenza di traffico Firebase sulla guida non garantita.
- **UI mobile (diagnosi storiche non riverificate):** menu Categoria che allarga il viewport o copre la pillola, scroll
  annidato nei menu bassi, etichetta «Dashboard» (oggi «Analisi») troncata a 320 px, Nuova spesa in landscape aperta scorsa.
- Nessun avvio offline a freddo: `public/sw.js` serve le notifiche di sistema e, dal 21 novembre (`1c83b54`), solo la pagina offline di
  Nummo alle navigazioni fallite (cache `nummo-offline-v<n>` con `offline.html` e il font): mai l'app, il bundle o dati. Cache Firestore
  su disco attiva nella build pubblicata e cancellata a «Esci» (dal 17 novembre); collezioni caricate integralmente. Licenza assente; audit dipendenze non aggiornato. Nessun lint configurato.
- Richieste pregresse senza contesto sufficiente (scritta «minimale» senza testo, colori attivi mobile/rail): chiarire
  con l'utente prima di intervenire.
- **Documentazione storica:** riallineati README e riepiloghi dell'architettura il 12 novembre; le vecchie fasi restano
  conservate ed esplicitamente storiche. Per comportamento e verifiche attuali usare codice e riepilogo in apertura.

## Verifiche (storiche — esiti correnti nello «Stato corrente» in apertura)

**Revisione documentale precedente** sulla base `d5170ee`, prima della correzione focus/prestazioni, dipendenze già installate,
Node 26.13.0, npm 12.2.2, Java 21.0.13:

| Comando | Esito |
| --- | --- |
| `npm run check` | **OK**: typecheck, **303/303** test, export demo `dist-demo/` (435 moduli, bundle 2,4 MB). |
| `npm run check:env` | **OK**: policy dei file di sviluppo; non certifica servizi o credenziali. |
| `git diff --check` | **OK**. |
| `AUTH_PORT=39099 FIRESTORE_PORT=39280 npm run test:emulator -- --config .nummo-docs-review.json` | **15/15** (SDK/Rules, CRUD, conflitti, stati, fondi, liste, import v4). Porte dedicate anche per Hub/log/websocket, UI disattivata; config temporanea rimossa dopo la suite. |
| `npm run test:hybrid` | **8/8** (lifecycle runner, Firestore demo reale, Expo simulato). |
| Prova locale decoder/import con ID icona rimossi | **OK**: 45 icone attive allora (39 dal 12 novembre), 18 ID storici rifiutati da entrambi. Nessun dato personale letto. |

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

- **Pubblicazione (24 novembre):** tutto il codice fino a `a8f694f` è online su Hosting; Rules ultime quelle di `48361b9` (prodotti per
  lista fino a 500). Vedi «Stato corrente» e «Registro dei rilasci».

0. **Modalità Standard/Avanzata (aggiornato 15 novembre):** provare l'Avanzata con accesso e dati reali, comprese pagina
   Notifiche e riepilogo (finora solo test di dominio); Standard su Safari/iOS e Firefox (IndexedDB, cancellazione per
   inattività, richiesta di `navigator.storage.persist`), Chrome Android e app installata, due schede reali, archivi grandi.
   Commit, push, Hosting e Rules sono già pubblicati (vedi «Stato corrente»). Ancora da fare dall'elenco dell'11 novembre:
   collaudo sui dati reali e sul Pixel 8 (elenco storico in `IMPLEMENTATION_PLAN.md`, redatto il 10 novembre su `ab7a72a`).
   Già fatti: Escape in `AppDialog` e riallineamento README/architettura (12 novembre).

1. **Collaudo produzione e compatibilità:** le Rules sono state pubblicate il 16 novembre (allineate a `f9c4d8f`, allora senza `templates`, aggiunti il 21 novembre),
   poi la sera con `skipped_payments` (`1dbb396`), con gli esercenti (`f5411fb`), il 20 novembre con le 24 ID icona storiche
   (`ad5aa73`), il 21 novembre con i template (`817a2f1`) e il 22 novembre con l'importo massimo 999.999.999,99 € (`17632af`), i cambi di stato fino a 40 (`f57b1b9`), i limiti degli abbonamenti
   (`f4691aa`), i piani dei fondi fino a 120 voci (`17ebce0`) e i prodotti per lista fino a 500 (`48361b9`). Da verificare ricaricando l'app: caricamento, sincronizzazione, pagina
   Templates, spesa con esercente ed eliminazione di un pagamento. Per prove CRUD cloud
   serve autorizzazione. ID icona eliminati: chiuso (vedi «Problemi aperti»); resta facoltativa la verifica sui dati reali.
2. **Collaudo in demo** con i backup di `docs/testing/` (`npm run emulators`, `emulators:seed`, `dev:demo`):
   unione/conflitto/sostituzione dall'interfaccia (backup v5 casi limite e v6 utente medio), riepilogo ed esiti del ripristino,
   sospensione della ricarica (interruttore «Ricarica mensile» del modulo del fondo), dialoghi Fondi/Liste a 320 px e in landscape,
   CSV in foglio di calcolo reale. Le eccezioni di budget non si creano più dall'interfaccia: arrivano solo da un backup e
   `FundEditor` le conserva con l'avviso «Eccezioni programmate per singoli mesi…»; collaudarne lettura e conservazione, non la
   creazione. I file v9 (pagamenti eliminati) e v10 (esercenti) sono **già collaudati** dall'interfaccia (20–21 novembre: Standard
   e Avanzata nella demo a 1280×900, smartphone emulato 390×844). Il v6 utente medio è stato importato più volte dall'interfaccia
   per prove visive (unione e «Sostituisci»), ma per v5 casi limite e v6 non risulta registrato il collaudo completo dei passi del
   README; resta da provare anche il CSV in un foglio di calcolo reale.
3. **Collaudo dispositivi:** telefono reale (touch, tastiera virtuale, safe area, rotazione), screen reader, Tab/Invio
   su Blocchi e Ciambella, riduzione movimento; riprodurre i problemi UI mobile elencati sopra.
4. **Igiene Git:** `.nummo-hybrid-*.json` già ignorato e non tracciato (fatto il 10 novembre). Non ripulire `.firebase/`, lock, staging o `emulator-data/`
   senza ispezione. Nessun commit automatico.
5. **Avvio/guida:** misurare rete su `#guida`; procedura `docs/avvio-prestazioni.md` su dispositivo e rete lenta;
   popup dopo logout/scadenza, Safari/Firefox/Edge.
6. **Riproducibilità:** `npm ci` da clone pulito su Node LTS, audit aggiornato, scelta della licenza.
   Riallineare README e le altre sezioni superate di `docs/architecture.md` («Flusso attivo» fatto il 14 novembre) alle
   funzioni attuali, preservandone le decisioni valide.
   Unicità server dei nomi fondo, sincronizzazione del predefinito, paginazione e avvio offline dal service worker (che oggi
   serve solo notifiche e pagina offline) sono evoluzioni da valutare, non lavori pianificati né implementati.
