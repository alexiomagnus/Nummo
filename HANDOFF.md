# HANDOFF — Nummo BYOF

Aggiornamento: **7 novembre 2026**. Dopo la revisione documentale, implementate le tre
richieste UI/importazione descritte sotto; modifiche ancora non committate. Nessun intervento cloud.
Base: `main`, **`738b68b`** (6 nov), «feat(ui): enhance SelectField component with dynamic
menu height and scroll functionality». Il riferimento locale `origin/main` coincide;
nessun fetch eseguito. Working tree inizialmente pulito.

## Stato implementato

Gestionale personale **solo web**, Expo/RN Web e Material 3, con Google Auth e accesso
diretto al Firestore dell'utente (BYOF). Nessun backend centrale, Sheets o Functions
nel percorso attivo. Architettura, convenzioni e comandi completi: `AGENTS.md`;
configurazione di una nuova installazione: `docs/firebase-personale.md` e `README.md`.

- Inserimento, ricerca/filtri/ordinamento, modifica ed eliminazione delle spese;
  categorie condivise tra sessioni, rinomina, icone e unicità dei nomi. Le 4 categorie
  predefinite richiedono un'azione esplicita; l'elenco proposto di 12 non è implementato.
  Il modulo richiede categoria; dominio e archivio ammettono riferimenti null/orfani.
- Ricorrenze settimanali/mensili/annuali, prezzi promozionali e variazioni dal prossimo
  rinnovo, una tantum o per tutti i futuri, senza riscrivere gli importi maturati.
  Storico/dashboard calcolano occorrenze fino a oggi; «Prossimi rinnovi» mostra previsioni
  separate dai totali. Nessun addebito automatico.
- Listener Firestore, coda/retry SDK, stato cache/pending/connessione distinto e conflitti
  per revisione. Conferma di inserimento dopo lettura server con ID/payload corrispondenti.
  Cache in memoria, disco opt-in; logout attende i pending (timeout 5 s mantiene la sessione).
  Cambio UID smonta listener, bozze e stato; recupero dei pending rifiutati osservati in memoria.
- Spese → «Dati»: export CSV protetto da formule e JSON da server; importazione CSV/JSON di Nummo
  esplicita con anteprima/preflight, ID conservati e ripresa per gruppi senza sovrascritture.
- UI adattiva: barra mobile flottante con 3 destinazioni e azione «Nuova spesa» animata,
  rail/tablet e drawer/desktop; modulo M3 e campi condivisi con l'editor; 47 glifi categoria (11 rimosse il 7 nov: Rules locali aggiornate, non ancora pubblicate).
  Impostazioni di tema, 6 tinte, monocolore/palette e font locale Google Sans o Sistema.
- Guida statica pubblica da accesso (`#guida`, ricarica/Indietro); manifest, icone e
  configurazione Hosting presenti, senza service worker. Non è un servizio aperto alle registrazioni.

## Modifiche recenti e attività in corso

| Commit (6 nov) | Risultato presente nel codice |
| --- | --- |
| `738b68b` | `SelectField`: altezza del menu misurata rispetto alla finestra, limite e scorrimento interno. |
| `baa352e` | Anello di focus interno alle voci menu; tolta la riga numero/totale da Spese, stato vuoto «Nessuna spesa.». |
| `755a439` | Icone `utensils`, `heartpulse`, `cloud`, `ellipsis` aggiunte a dominio, glifi e Rules. |
| `02d6bda`, `9ed57e8` | Navigazione mobile flottante/animata, gestione focus e movimento ridotto. |
| `6bccaf9`, `f70df6b` | Safe area/theme-color, forme e modulo M3; accesso/guida senza pannello. |
| `3517b27`, `6f4d42b`, `afc6ebf` | Preparazione BYOF distribuibile, guida introduttiva, Hosting/manifest/icone. |

**Fase corrente (7 nov, non committata):** icona sincronizzazione 24 px mobile e 22 px
tablet/desktop (ulteriore ingrandimento richiesto dall'utente); selettore dashboard con «Mese scorso» (mese solare precedente,
dettaglio giornaliero completo) e «Ultimi 3 mesi» (mese corrente e due precedenti).
Avvio PWA (diagnosi del video Pixel 8 e correzione UI): il modulo mostrava «Nessuna
categoria» prima della lettura e Paper rendeva trasparenti i contorni disabilitati in scuro.
`ExpenseForm` distingue caricamento/errore/dati pronti; campo Categoria con ingombro stabile
e «Caricamento…» durante la lettura, «Dati non disponibili» con l'errore esplicito se fallisce.
Importo/descrizione in sola lettura e DateField/SelectField con trigger disabilitato mantengono
i bordi; modulo/bozza non rimontati, nessuna attesa server aggiunta per la cache valida.
Gli errori categorie arrivano anche al modulo. Cache iniziale vuota distinta dall'archivio
server vuoto; cache con categorie utilizzabile subito. Test di regressione per questa sequenza.
Non modificati splash/manifest, ancora statici.
`npm run check` OK (149 test, typecheck, build demo); nuovo avvio su Pixel 8 e rete lenta
ancora da verificare, nessun deployment effettuato.
Menu lunghi su smartphone: `MenuSelect` aveva un `maxHeight` senza scorrimento delle
righe personalizzate, che uscivano dalla superficie. Aggiunto `ScrollView` interno,
contenimento dei bordi e limiti di altezza/larghezza basati su finestra e safe area.
La correzione copre Categoria/Ordina in Spese e Periodo/Grafico in Dashboard.
`SelectField` (categoria in Nuova/Modifica spesa) aveva già lo scorrimento: aggiunti
contenimento e limiti aggiornati al ridimensionamento. Audit sorgenti: menu Account
e azioni spesa hanno contenuto fisso breve e non il `maxHeight` che causava questo difetto.
`npm run check` OK (148 test, typecheck, build demo). Verifica visiva/touch non eseguita:
il collegamento al browser CUA non è disponibile in questa sessione; riprovare sul telefono
menu lunghi, scorrimento fino all'ultima voce, selezione, finestre basse e rotazione.
Dettaglio giornaliero della dashboard: sostituita la lunga tabella con una griglia
adattiva (fino a 7 colonne, larghezza minima indicativa 144 px), tutti i giorni visibili,
totali leggibili, oggi evidenziato e giorni futuri con trattino; periodi plurimensili
conservano la tabella. `npm run check` OK (148 test, typecheck, build demo);
resa visiva della griglia nel browser/dispositivi ancora da verificare.
Cambio sezione in `AppShell`: ingresso con dissolvenza e lieve movimento verticale (250 ms,
token `motion`), senza rimontare il contenitore/bozza; interruzione e pulizia dell'animazione
ai cambi rapidi, passaggio immediato con movimento ridotto. `npm run check` OK
(148 test, typecheck, build demo); resa visiva e cambi rapidi nel browser ancora da provare.
Importazione CSV/JSON dallo stesso selettore, con anteprima e conferma; il CSV nuovo
conserva serie, prezzi e categorie utilizzate, senza creare una spesa per rinnovo.
Pulsanti di esportazione etichettati «CSV» e «JSON» (rimossa la parola «Backup»);
testo introduttivo ridotto a «Esporta o importa file.» su richiesta dell'utente.
`npm run check` rieseguito dopo il ritocco: typecheck, 148 test e build demo OK.
CSV precedenti con ricorrenze/testi protetti ambigui rifiutati: usare JSON o nuovo export.
Nessun formato CSV esterno generico o mappatura colonne. Restano i collaudi sotto elencati.
La distribuzione resta da completare: licenza assente e procedura da clone pulito non provata.
Gli studi in `docs/design/logo-concepts/` sono separati dal logo SVG già usato dall'app;
nessuna sostituzione da fare senza scelta/richiesta dell'utente.

## Decisioni tecniche da conservare

- BYOF sostituisce Sheets/backend callable: Firestore è l'unica fonte di verità, con
  Rules proprietario (`config/owner`) e provider Google. Specifica originale `recap.md`
  storica e immutabile; motivazioni in `docs/architecture.md` e `docs/migrazione-byof.md`.
- Modalità emulator/hybrid/cloud scelte dagli script npm, nessun default valido.
  La build cloud ignora i dotenv di Expo, valida produzione/shell e scansiona il bundle:
  evita che `.env.local` mescoli progetto reale ed endpoint locali. `check` genera solo demo.
- Backup legge collezioni separate; importazione atomica solo per gruppo (8 categorie
  o 200 spese), perché le Rules limitano gli accessi. Fermare modifiche concorrenti
  durante export; ripetere lo stesso JSON per riprendere un'importazione interrotta.
- Prezzi indicizzati per numero di rinnovo, non per data, con massimo 8 variazioni
  (limite di valutazione delle Rules). Nell'editor l'indice resta relativo alla data originale.
- Nessun service worker: cache dati e disponibilità offline del bundle sono distinte.
  Hosting e Rules hanno pubblicazioni separate; nessun deploy implicito nei controlli.
- Backend legacy recuperabile da `fe759d5`; adapter localStorage rimossi il 5 nov,
  recuperabili da `e2b84d3`. Nessuna migrazione dei vecchi dati browser nella UI corrente.

## Verifiche e stato delle pubblicazioni

**Eseguite in questa fase (7 nov, base `738b68b`):** Node **26.13.0**, npm **12.2.2**,
Java **21.0.13**; dipendenze già presenti.

| Verifica | Esito |
| --- | --- |
| `npm run check` | OK: typecheck, **148/148** test app e build demo in `dist-demo/`. |
| `npm run check:env` | OK sulla configurazione di sviluppo presente; valori personali non riportati. |
| `npm run test:emulator` | OK: **11/11** (10 sottotest + contenitore), SDK/Rules su `demo-nummo`, inclusa reimportazione CSV di una serie senza duplicati. Primo avvio bloccato da `EPERM` della sandbox; rieseguito con autorizzazione fuori sandbox. Emulatori arrestati dalla CLI; `PERMISSION_DENIED` attesi nei casi negativi. |

**Prove storiche registrate nel precedente HANDOFF/Git, non ripetute qui:**

- 2 nov: Chromium con emulatori, CRUD, estraneo/logout, due schede, offline/reload,
  riconnessione, recupero rifiuti, export/import UI. Non prova del cloud reale.
- 6 nov: Chromium headless con dati finti per modulo M3, menu/data/promo e barra mobile
  chiara/scura; animazione anche con cambi rapidi. Guida: link diretto, reload, Indietro,
  tastiera e tema a 390 px. Meta `theme-color` seguiva lo schema OS nella build demo.
- 6 nov: `deploy:hosting -- --dry-run` riuscito con configurazione reale (build cloud,
  nessuna pubblicazione); emulatore Hosting con fallback, manifest, icone e header cache verificati.
- Commit **`a30a988`**: registra Rules pubblicate il **6 nov, 15:45 UTC** nel progetto
  personale allora configurato, confrontate con il file locale. Non verificati qui
  release attuale, documento proprietario o salvataggio cloud con le nuove icone.
  Nessun deploy Hosting risulta registrato nelle fonti esaminate; stato remoto non interrogato.

**Non eseguiti in questa fase:** `npm ci` (nessuna reinstallazione), avvio interattivo
`dev`/`dev:hybrid`, build/preview cloud, dry-run/deploy, browser/dispositivi e `npm audit`.
Non c'è lint configurato. Le nuove dimensioni/periodi e il selettore file non sono stati provati nel browser.
Le prove correnti non validano installazione da clone pulito,
Node LTS, OAuth reale o UI. Il login Google con Firestore emulato era stato dichiarato
riuscito dall'utente nel precedente handoff, senza ripetizione da parte dell'agente.

## Problemi aperti e limiti

- Dashboard (7 nov): palette a 12 slot validati (adjacent, chiaro/scuro) e «Media» rimossa; oltre la 12ª categoria
  della lista le spese confluiscono ancora in «Altre categorie». Resa visiva su dati reali non collaudata.
- Nuovo scorrimento/posizionamento `SelectField` e focus menu non collaudati visivamente
  su HEAD; da provare molti elementi, finestre basse, tastiera virtuale e modale Modifica.
  Mancano anche prove complete di impostazioni, piano prezzi e grafici su dati reali.
- Mobile usa `primaryContainer` per la destinazione attiva; rail/drawer usano
  `secondaryContainer`. Coerenza cromatica da decidere, soprattutto in modalità Palette.
- Pixel 8/PWA reale, Android/iOS, Safari/Firefox/Edge, safe area non nulle, movimento ridotto,
  screen reader e flusso completo da tastiera non collaudati. Il manifest ha colori statici;
  `theme-color` segue il tema a runtime, effetto sulle barre Android da verificare sul dispositivo.
- Nessuna garanzia di avvio offline a freddo; crash browser, storage negato/private browsing,
  scadenza/revoca token non collaudati. Copie di recupero solo in memoria e per pending osservati;
  cache persistente può restare sul disco dopo logout.
- Letture di collezioni intere, export non atomico tra collezioni, import UI massimo 5 MB.
  Non disponibili correzioni del prezzo già maturato o aggiunta di variazioni programmate nell'editor.
- Audit storico: 29 segnalazioni (25 moderate, 4 alte, catena `@grpc/grpc-js`);
  **conteggio non aggiornato**, nessun fix forzato. Contrasti dei token testati,
  palette grafici e accessibilità dell'intera UI ancora da rivalidare.

## Prossimi passi, in ordine

1. **Collaudo UI locale** su emulatori demo, mobile 412×915 e desktop: menu categoria con
   liste lunghe/viewport basso, editor, prezzi, impostazioni, Tab/focus, snackbar e navigazione.
   Procedura: `npm run emulators`, poi `npm run emulators:seed` e `npm run dev`.
   Preservare eventuali emulatori/dati dell'utente; porte alternative come in `AGENTS.md`.
2. **Collaudo cloud e dispositivi, con autorizzazione**: verificare configurazione Auth,
   domini autorizzati, proprietario e Rules attualmente pubblicate; provare prima categoria
   con nuova icona, poi CRUD, secondo account negato, reload/seconda sessione e backup/import.
   Build/preview locale, eventuale Hosting anteprima e solo dopo live secondo la guida;
   OAuth e installazione su Android/iOS reali. Non ripubblicare Rules già corrette alla cieca.
3. **Preparazione alla distribuzione**: scegliere la licenza; provare `npm ci` e l'intera
   guida da clone pulito/progetto nuovo (risorse reali solo autorizzate), anche su Node LTS.
4. **Manutenzione dedicata**: aggiornare audit e dipendenze compatibili senza `--force`;
   decidere uniformità navigazione. Paginazione/backup più robusto e service worker solo
   se richiesti da volume dati o requisito offline.

Dopo modifiche applicative: `npm run check`; per accesso dati/Rules anche
`npm run test:emulator`. Registrare qui risultati, ambiente e limiti effettivi.
