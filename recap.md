# Specifica sintetica — Web app per le spese personali

**Versione:** 0.4  
**Aggiornamento:** 2 novembre 2026  
**Stato:** progetto da realizzare; specifica per esseri umani e AI.  
**Nome:** da definire; il file Google Sheets è denominato «Registro spese».

Questa versione sostituisce l’impostazione Flutter delle versioni precedenti. La piattaforma scelta è una web app installabile (PWA), con UI React Native adattata al web. Il backend descritto è una **raccomandazione progettuale**, non un servizio già configurato o una decisione definitiva dell’utente.

## 1. Scopo e contesto

Registrare una spesa personale dal telefono con pochi gesti, mantenendo Google Sheets come archivio consultabile. La nuova interfaccia sostituisce il percorso quotidiano attraverso Google Forms: il Form non fa parte del flusso principale.

La web app si apre da un link oppure dall’icona nella schermata iniziale, dove l’installazione è supportata. Android è il primo ambiente di collaudo; la stessa versione web deve essere utilizzabile anche su iPhone e computer. Eventuali app native Android/iOS costituiscono un’evoluzione separata, non un requisito del MVP.

La priorità è l’inserimento manuale rapido e affidabile. Riepiloghi automatici, dashboard, abbonamenti e scansione degli scontrini arriveranno dopo. L’importazione delle spese Google Pay resta soltanto un’ipotesi da verificare.

## 2. UI, stack e stato dell’app

React Native è un **framework**, non un linguaggio. La combinazione consigliata per rispettare la scelta dell’utente è **TypeScript + React Native + Expo + React Native Web**. Quest’ultimo rende i componenti compatibili con il browser; una futura versione nativa potrà riutilizzare parte del codice, con adattamenti e test specifici. [Expo per il web](https://docs.expo.dev/workflow/web/).

| Elemento | Scelta o proposta | Stato |
| --- | --- | --- |
| Piattaforma | Web app installabile, ottimizzata per telefono | Confermato |
| Framework UI | React Native, usando React Native Web | React Native richiesto; adattamento web proposto |
| Linguaggio e strumenti | TypeScript, Expo | Consigliati |
| Grafica | Material You / Material 3 | Direzione confermata |
| Componenti UI | React Native Paper | Consigliato; verificare versioni e accessibilità web |
| Login | Account Google obbligatorio | Confermato |
| Gestione identità | Firebase Authentication | Consigliato |
| Backend | Cloud Functions for Firebase, TypeScript su Node.js | Consigliato in sostituzione di Apps Script |
| Archivio delle spese | Google Sheets, tramite Sheets API dal backend | Sheets confermato; integrazione proposta |
| Pubblicazione web | Firebase Hosting per l’esportazione web | Consigliato |

**Grafica:** superfici essenziali, forme morbide, importo evidente, categorie rapide, tema chiaro/scuro e palette Material 3. React Native Paper supporta Material You e React Native Web. Non si presume di poter recuperare dal browser i colori dello sfondo Android. [React Native Paper](https://oss.callstack.com/react-native-paper/).

**Stato:** per il MVP bastano gli strumenti React: `useState`/`useReducer` per modulo e invio, Context per esporre la sessione e un servizio separato per le chiamate backend. Non introdurre uno store globale complesso senza necessità. L’invio parte da un’azione esplicita, mai dalla semplice ricostruzione dell’interfaccia. Logout e cambio account devono azzerare i dati dell’utente precedente.

**PWA:** configurare manifest, icone, HTTPS e comportamento di apertura; Expo non rende automaticamente completo il supporto PWA. Se si usa un service worker, progettare aggiornamenti e cache senza memorizzare indiscriminatamente risposte private. Installazione e login vanno verificati sia nel browser sia dalla schermata iniziale. [Guida Expo PWA](https://docs.expo.dev/guides/progressive-web-apps/).

## 3. Backend consigliato e architettura

```text
Web app — Expo + React Native Web + TypeScript
    │ accesso Google tramite Firebase Authentication
    │ chiamata HTTPS con sessione verificabile
    ▼
Cloud Functions for Firebase
    │ autorizzazione al registro, validazione e controllo duplicati
    ▼
Google Sheets API → Registro spese
    │ esito della scrittura
    └──────────────────────────────→ Conferma nella web app
```

**Raccomandazione:** Firebase Authentication + Cloud Functions. Questa combinazione separa interfaccia, identità e logica di salvataggio, e permette di aggiungere elaborazione scontrini o automazioni senza dipendere dal telefono acceso.

Per il MVP sono consigliate funzioni HTTPS callable: l’SDK include il token Firebase quando presente e il servizio ne verifica la validità. Il codice deve comunque respingere chiamate senza autenticazione e controllare l’autorizzazione al registro. [Funzioni callable](https://firebase.google.com/docs/functions/callable).

Apps Script non è richiesto nell’architettura proposta. Sheets resta l’archivio delle spese; un database aggiuntivo non è scelto come archivio principale. Potrebbe servire un piccolo archivio tecnico per coordinamento, configurazioni o operazioni: la necessità va valutata nella prova di affidabilità.

**Costi:** il deployment delle Cloud Functions richiede il piano Blaze con fatturazione abilitata. Non promettere un servizio sempre gratuito; valutare utilizzo previsto, limiti e avvisi di spesa prima della pubblicazione. [Requisiti di deployment](https://firebase.google.com/docs/functions/get-started).

## 4. Esperienza utente e MVP

### Percorso principale

1. Aprire la web app, eventualmente aggiungerla alla schermata iniziale.
2. Accedere con il proprio account Google e completare il collegamento autorizzato al registro.
3. Inserire importo e categoria; la data odierna è precompilata, la nota facoltativa.
4. Toccare «Salva» e visualizzare l’invio in corso.
5. Ricevere conferma solo dopo il salvataggio verificato nel foglio.

Interfaccia utilizzabile con una mano, tastiera numerica, separatore decimale italiano, testo ingrandibile e messaggi chiari. Obiettivo proposto: circa 10 secondi per compilare una spesa ordinaria, esclusi accesso iniziale e rete.

### Dentro il MVP

- Login Google, ripristino della sessione e logout.
- Modulo essenziale e validazione sia nel client sia nel backend.
- Scrittura nel registro autorizzato, conferma ed errori comprensibili.
- Dati del modulo mantenuti durante un errore di invio e nuovo tentativo senza duplicati.
- Esperienza web responsive e installazione PWA collaudata sui dispositivi previsti.

### Fuori dal MVP

Dashboard, riepiloghi automatici, ricorrenze, OCR degli scontrini, importazioni Google Pay, gestione condivisa, modifica/eliminazione e storico completo nell’app, distribuzione negli store e sincronizzazione offline completa.

Senza rete non dichiarare mai una spesa salvata su Sheets. La persistenza della bozza dopo la chiusura e un’eventuale coda offline restano da definire.

**Stati dell’invio:** distinguere bozza modificabile, invio in corso, salvataggio confermato, esito da verificare ed errore definitivo. Durante l’invio o con esito incerto, bloccare modifiche e nuovi invii della stessa spesa; consentire verifica o ritentativo con gli stessi `expense_id` e dati. Un timeout non è un errore definitivo. Rendere nuovamente modificabile il modulo soltanto dopo un rifiuto che escluda la scrittura; la richiesta corretta avrà un nuovo identificativo. Dopo la conferma, una nuova spesa riceve un nuovo identificativo.

Il recupero di un invio già avviato deve funzionare anche dopo chiusura o aggiornamento della PWA: definire come recuperare identificativo, dati ed esito per l’utente autenticato. Questo requisito è distinto dalla persistenza delle bozze mai inviate e dalla coda offline.

## 5. Modello dati iniziale — proposta

Una riga per spesa; nomi e mapping da confrontare con il vecchio registro.

| Campo | Contenuto |
| --- | --- |
| `expense_id` | UUID generato una volta e riutilizzato nei tentativi successivi |
| `expense_date` | Data della spesa, `YYYY-MM-DD` |
| `amount_minor` | Importo intero positivo nell’unità minima della valuta |
| `currency` | Codice valuta; EUR proposto, da confermare |
| `category_id` | Categoria da elenco da concordare |
| `note` | Testo facoltativo con lunghezza massima |
| `created_at` | Timestamp UTC assegnato dal backend |
| `source` | Provenienza, per esempio `web_app` o `legacy_form` |
| `legacy_ref` | Solo per dati migrati: riferimento univoco a copia sorgente, scheda e riga originale |
| `schema_version` | Versione dello schema |

Evitare calcoli monetari in virgola mobile; distinguere data della spesa e momento di registrazione. Scrivere le note come testo, non come formule. L’identità e l’associazione al registro derivano dal backend, non da un proprietario dichiarato liberamente dal client. Rimborsi, valute multiple e metodi di pagamento restano aperti.

**Regole da fissare prima della prova tecnica:** valuta e relativo numero di decimali; importo massimo; lunghezza massima della nota; elenco degli identificativi di categoria; intervallo di date ammesso e trattamento delle date future. Client e backend devono applicare le stesse regole, con il backend come controllo definitivo. Rifiutare importi con decimali eccedenti, senza arrotondamenti impliciti, e date inesistenti. EUR e fuso `Europe/Rome` per la data precompilata sono proposti, da confermare; `created_at` resta in UTC.

## 6. Sicurezza e affidabilità

**Login Google e accesso a Sheets sono autorizzazioni distinte.** La sessione Firebase identifica l’utente ma non concede automaticamente accesso ai suoi file Google.

Prima dell’implementazione definitiva scegliere tra:

- **Registro personale predisposto:** condividere esplicitamente il solo foglio necessario con l’identità di servizio del backend e limitare gli utenti ammessi.
- **Registro collegato da ogni utente:** progettare consenso OAuth, selezione del file, permessi minimi e gestione server delle eventuali credenziali per accesso continuativo. Valutare `drive.file` dove applicabile. [Permessi Sheets API](https://developers.google.com/workspace/sheets/api/scopes).

Queste opzioni non sono ancora approvate. Il client non deve poter indicare arbitrariamente un foglio da modificare.

Prima della prova tecnica, scegliere uso personale o più utenti e documentare proprietario del registro, utenti ammessi e associazione tra identità autenticata e registro autorizzato. Implementare nella prova una sola delle due modalità di accesso, scelta esplicitamente.

Per la sessione web, usare il Firebase Web SDK e scegliere esplicitamente la persistenza, senza salvare manualmente password o copie dei token. La memoria del browser non equivale al Keychain di un’app nativa: proteggere l’interfaccia da script non autorizzati e non esporre credenziali di servizio o segreti OAuth nel codice distribuito. Logout, scadenze e revoche vanno collaudati. [Persistenza Firebase Auth](https://firebase.google.com/docs/auth/web/auth-state-persistence).

Il backend valida importi, date e categorie; limita gli abusi ed evita dati personali e token nei log. Prevedere backup del foglio e un ambiente di prova separato.

**Duplicati:** controllare `expense_id` anche quando la prima risposta è andata persa. Lo stesso identificativo con dati differenti deve produrre un conflitto. Una semplice ricerca seguita da append non garantisce protezione da richieste concorrenti: coordinamento delle scritture e recupero dopo interruzioni sono da progettare e verificare prima del rilascio.

La prova deve coprire una scrittura riuscita in Sheets seguita dall’interruzione del backend prima della conferma. Il recupero deve riconoscere la spesa già presente e restituirne l’esito senza aggiungere righe. Un eventuale archivio tecnico non rende automaticamente atomiche le operazioni con Sheets: documentare coordinamento, stato delle operazioni e riconciliazione degli esiti incerti. La conferma applicativa deve identificare la spesa salvata con `expense_id`; il solo successo HTTP non basta.

### Criteri di accettazione

- Una richiesta valida produce una sola spesa con valori corretti.
- Utenti non autenticati o non autorizzati non leggono né modificano il registro.
- Doppio tocco, richieste concorrenti e nuovi tentativi non duplicano la spesa.
- Timeout e perdita della risposta non causano false conferme o perdita silenziosa dei dati.
- Login, logout, cambio account e aggiornamento della PWA funzionano sui browser concordati.
- Il percorso quotidiano non richiede di aprire Google Forms o Sheets.

**Collaudo:** concordare una matrice con dispositivo, sistema operativo, browser e versioni effettivamente testate. Base proposta: Chrome su Android, Safari su iPhone e Chrome su computer; sui telefoni provare anche l’apertura dalla schermata iniziale dove supportata. Eseguire i casi sopra includendo perdita della risposta dopo la scrittura, interruzione del backend, chiusura durante l’invio e aggiornamento con un esito ancora incerto. Per ogni caso registrare esito nell’interfaccia e numero di righe per `expense_id`: una sola per una spesa salvata. Al cambio account, nessun dato dell’account precedente deve restare visibile.

Prima del passaggio operativo, definire frequenza e conservazione dei backup e verificare il ripristino su una copia separata, confrontando conteggi, importi e date.

## 7. Vecchio registro Google Forms

Non cancellare lo storico. Prima del passaggio: inventariare colonne, formule e categorie; creare una copia; decidere se mantenere le risposte in archivio o importarle nella tabella normalizzata.

Una migrazione deve conservare provenienza e riferimento alla riga originale, poter essere ripetuta senza duplicati e verificare conteggi, totali e date. Non inventare dati mancanti. Definire quando chiudere il Form; se resta temporaneamente attivo, evitare il doppio conteggio delle stesse spese.

Usare `legacy_ref` per riconoscere le righe già importate, riferendosi a una copia sorgente conservata senza riordinamenti o modifiche. Una seconda esecuzione sulla stessa copia non deve aggiungere spese già migrate.

## 8. Roadmap

| Fase | Risultato |
| --- | --- |
| Prova tecnica | Login web, autorizzazione al foglio, scrittura e gestione affidabile dei tentativi |
| MVP | Inserimento manuale rapido in una PWA Material You |
| Passaggio dal Form | Storico preservato o migrato e nuova modalità operativa |
| Riepiloghi e dashboard | Totali settimanali/mensili automatici, senza preparazione manuale periodica |
| Ricorrenze | Abbonamenti e spese periodiche, distinguendo previsioni e addebiti effettivi |
| Scontrini | Foto o caricamento → estrazione di totale/data/esercente → conferma → salvataggio |
| Google Pay, esplorazione | Verificare una fonte autorizzata delle transazioni prima di promettere importazioni |

La scansione degli scontrini è compatibile con una web app: prevedere fotocamera o caricamento immagine e un servizio di riconoscimento da scegliere. Verificare scontrini italiani, costi, accuratezza e conservazione delle immagini; inizialmente richiedere conferma dei dati estratti.

Google Pay rimane un’ipotesi: la sua API di checkout non dimostra l’accessibilità dello storico personale. Login Google e presenza di una PWA o app nativa non bastano. Qualunque importazione futura dovrà riconciliare doppioni, rimborsi e spese inserite a mano. [Google Pay API](https://developers.google.com/pay/api/web/overview).

## 9. Decisioni e questioni aperte

**Confermato:** web app, UI React Native, accesso Google obbligatorio, archivio Sheets, estetica Material You, niente Forms nel flusso principale, priorità all’inserimento manuale.

**Consigliato:** TypeScript, Expo/React Native Web, React Native Paper, Firebase Authentication, Cloud Functions e Firebase Hosting. Flutter, Dart e Riverpod non fanno parte del nuovo stack; Apps Script è sostituito nella proposta backend.

**Da definire:** conferma del backend e del budget; uso personale o più utenti; proprietà e autorizzazione del foglio; categorie, valuta e fuso; migrazione; persistenza della sessione e delle bozze; coordinamento delle scritture; browser supportati; nome e palette; servizio OCR e reale fattibilità Google Pay.

Per proseguire, fissare prima modalità di accesso al registro, regole dei dati e protocollo di recupero degli invii incerti; quindi realizzare la prova completa **login Google → richiesta autorizzata → scrittura unica in Sheets → conferma nella PWA**, inclusi concorrenza e interruzioni. Le funzioni future non devono ampliare il MVP prima che questo percorso sia verificato.
