# Architettura e decisioni

Aggiornamento: 2 novembre 2026. Specifica di riferimento: `recap.md` v0.4,
letta integralmente e mantenuta invariata.

## Requisiti e conferme

| Aspetto | Stato |
| --- | --- |
| Web app installabile, React Native, Google obbligatorio, Sheets, Material You | Requisiti della specifica |
| TypeScript + Expo + React Native Web + React Native Paper | Confermati dall'utente in questa sessione |
| Uso personale, registro predisposto condiviso con identità di servizio | Confermato dall'utente |
| Firebase Authentication + Cloud Functions | Confermati come direzione del backend; servizi non configurati |
| EUR, 2 decimali, Europe/Rome, massimo 99.999,99 € | Confermati dall'utente |
| Nota rimossa; «nome dell'acquisto» dopo l'importo | Richiesta utente; obbligatorietà e limite 100 scelti dall'agente |
| Categoria facoltativa; icona pixel art facoltativa per categoria | Richiesta utente (prima emoji, sostituite) |
| Date dal 2000-01-01 a oggi; nessuna data futura | Confermato dall'utente |
| Categorie dell’utente rinominabili ed eliminabili; predefinite con icona: Spesa, Ristorazione, Uscita, Shopping | Richiesta utente 2/11/2026; nessuna migrazione dei browser con le predefinite precedenti |
| Nome applicazione: Nummo (prima Nummus) | Richiesta utente; il foglio resta «Registro spese» |
| Ricorrenza come attributo della spesa nella home (settimanale/mensile/annuale) | Richiesta utente; sostituisce la sezione «Ricorrenti» separata |
| Salvataggio locale delle spese, elenco ricercabile/ordinabile, dashboard con 3 grafici | Richiesta utente; anticipa funzioni post-MVP. Archivio locale scelto dall'agente |
| Data spesa sempre automatica, nessuna modifica dalla UI | Richiesta utente (rimossa «Modifica data») |
| Firebase Hosting, budget, deployment e palette | Non confermati |
| Archivio tecnico, protocollo di scrittura/recupero, persistenza sessione | Da progettare e confermare prima dell'implementazione definitiva |

## Archivio locale temporaneo

`localStorage` conserva categorie (`nummo.categories.v1`, con lettura di ripiego della
chiave `nummus.categories.v1` del nome precedente) e spese (`nummo.expenses.v1`), mai
credenziali. Ogni adapter in `src/services/` valida tutto ciò che legge, rilegge prima
di scrivere e non sovrascrive un archivio illeggibile; storage negato o corrotto non
produce conferme. La chiave `nummo.recurring.v1` della sezione Ricorrenti rimossa non è
più letta né cancellata (quegli elementi non avevano data di inizio).

Le spese salvate localmente esistono perché elenco e dashboard richiedono dati prima
del backend. Non sono una conferma su Sheets e l'interfaccia lo dichiara. Restano per
browser, senza sincronizzazione, e `localStorage` non è atomico tra schede. Al
collegamento con il backend: migrazione **esplicita** dei dati del browser, mai
associazione automatica a chi accede; il record locale (`id` UUID, `created_at`) è già
compatibile con `expense_id` e con il payload previsto.

Categorie: ID UUID stabili, nomi normalizzati per spazi e Unicode, unici senza distinzione
maiuscole/minuscole, max 40 caratteri. La rinomina conserva ID e icona (le spese puntano
all'ID). Le predefinite sono scritte solo se nessuna chiave esiste: eliminarle tutte non le
ripristina, e un browser con predefinite precedenti non viene modificato. Eliminare una categoria non modifica le spese:
quelle che la citavano appaiono senza categoria; se era selezionata nel modulo viene
deselezionata, ma un `category_id` indicato e inesistente è rifiutato dalla validazione.
Le icone sono ID di sprite pixel art propri: in lettura un ID sconosciuto diventa `null`,
in scrittura è rifiutato. Campi assenti in dati più vecchi valgono `null`. Gli sprite sono
disegnati in una tela 14×14 (1 px di margine); nel tema scuro quel margine ospita un alone
chiaro attorno ai pixel pieni, così il contorno scuro resta leggibile senza ricolorare lo sprite.

Nome dell'acquisto (`description`): obbligatorio, normalizzato, max 100 caratteri, scritto
come testo. I limiti 40/100 sono scelte implementative, non vincoli concordati.

La data non è visibile né modificabile: viene risolta come «oggi in Europe/Rome» al
salvataggio. Il dominio accetta ancora date esplicite (2000-01-01…oggi).

### Ricorrenze

Una spesa con `recurrence` è una serie che inizia a `expense_date`. Le occorrenze non
vengono salvate ma calcolate (`src/domain/recurrence.ts`, `history.ts`) fino a oggi:
settimanale ogni 7 giorni, mensile e annuale allo stesso giorno, ridotto all'ultimo
giorno dei mesi più corti (31 → 30/28, 29 febbraio → 28). Le scadenze future non sono
spese. Eliminare una spesa ricorrente elimina la serie, incluse le occorrenze passate;
interruzione e modifica non esistono ancora. Con il backend andrà deciso se le
occorrenze diventano righe reali nel foglio (richiede un processo pianificato e
idempotenza per occorrenza) o restano calcolate.

### Dashboard e grafici

Funzioni pure in `src/domain/history.ts` (occorrenze, ricerca senza accenti, ordinamenti,
periodi, aggregazione); disegno in `src/features/dashboard/charts.tsx` con SVG inline
(app solo web; un'app nativa richiederebbe `react-native-svg`). Specifiche dalla skill
dataviz: palette categoriale di riferimento in ordine fisso (validata con il suo script
su superfici `#F7F2F9` chiara e `#1F2421` scura: chiaro con 4 colori < 3:1, quindi
legenda e tabella obbligatorie), colore legato alla posizione della categoria
nell'elenco e non alla classifica, 7 categorie con nome + «Altre categorie», «Senza
categoria» in grigio neutro; linee 2 px, area al 10%, barre ≤ 24 px con angoli
superiori di 4 px e 2 px di stacco, griglia sottile; dettaglio a hover/tocco.

### Archivio definitivo delle categorie — raccomandazione, non decisa

Proposta: scheda «Categorie» nello stesso file «Registro spese» (colonne `category_id`,
`label`, `icon`, `archived_at`), letta e scritta solo dalle Cloud Functions con
l'identità di servizio. Motivi: la specifica vuole Sheets come archivio senza database
principale aggiuntivo; uso personale con un solo registro; categorie visibili e
salvabili col backup del foglio. Le spese salvano `category_id`; eliminare una
categoria la **archivia** (nascosta nella UI) invece di cancellarla, così le righe
storiche restano interpretabili. Alternativa: Firestore per UID, da preferire se la
prova tecnica introduce comunque un archivio tecnico per l'idempotenza (transazioni,
cache offline, nessun limite di quota Sheets). `localStorage` resterebbe solo come cache.

## Frontend

Expo SDK 58 e versioni React/React Native allineate al template ufficiale, con Paper 5.
Il lockfile fissa l'albero installato. Stato React locale, senza router né store
globale; quattro sezioni (Nuova, Spese, Dashboard, Categorie). Il modulo resta montato
per non perdere la bozza al cambio sezione.

`src/domain` contiene funzioni pure indipendenti da Expo e Firebase. Il futuro
backend potrà riusare le regole, ma dovrà anche validare a runtime struttura,
tipi, UUID e campi consentiti di ogni richiesta non fidata. I tipi TypeScript
non costituiscono validazione di rete.

Il reducer degli invii (`submission.ts`) è una base testata per il backend, **non
collegata**: oggi il salvataggio è locale e sincrono. L'adapter Sheets dovrà usare
`valueInputOption: RAW` e testare l'assenza di formule.

## Prossima prova tecnica: confini obbligatori

- Firebase Web SDK per login Google; persistenza da scegliere esplicitamente.
- Callable autenticata con autorizzazione del singolo UID sul registro configurato
  lato server. Il client non passa un ID di foglio né un proprietario.
- Backend assegna `created_at` in UTC, valida il payload e restituisce ID della
  spesa e conferma applicativa solo dopo la scrittura verificata.
- Stesso ID e dati diversi devono produrre conflitto. Doppio tocco, concorrenza,
  perdita risposta e crash dopo scrittura devono lasciare una sola riga.
- Logout/cambio account svuotano la UI e impediscono di mostrare o elaborare
  operazioni appartenenti all'account precedente.

### Proposta di recupero da valutare, non implementata

Prima della prima chiamata, salvare localmente un'operazione pendente minima,
associata all'UID, con ID e payload immutabile. Se la persistenza fallisce, non
inviare. Al ripristino della sessione riconciliare solo le operazioni dello stesso
utente con il backend, mantenendo i campi bloccati fino a un esito certo.
Non salvare copie dei token. Precisare conservazione, logout, storage negato,
aggiornamento dell'app e richieste provenienti da più schede.

Il protocollo backend va dimostrato prima di adottarlo. Una possibilità da studiare
è assegnare in modo transazionale una riga stabile a ciascuna operazione in un
archivio tecnico e ritentare una scrittura sulla stessa riga, invece di append.
Richiede proteggere la tabella da riordini/inserimenti manuali e definire recupero,
payload hash e associazione registro/utente. È una proposta con costi e vincoli,
**non una scelta approvata né una garanzia di atomicità Sheets/database**.
Un lock con scadenza da solo non risolve una scrittura ancora in volo.

## Dipendenze e sicurezza

Niente Firebase/Google SDK nella prima fase: non servono al modulo locale. Niente
segreti né `.env` reali. Firebase Hosting e un eventuale archivio tecnico richiedono
decisioni separate. Le Cloud Functions richiedono un piano con fatturazione per
il deployment; nessuna attivazione è stata eseguita.

L'audit iniziale segnala 11 dipendenze con severità moderata nella catena degli
strumenti Expo, originate da `glob` e `minimatch`. Nessuna segnalazione alta o critica.
Non applicare `npm audit fix --force`: il suggerimento attuale retrocede Expo alla
51. Valutare aggiornamenti upstream o override solo con compatibilità verificata.
Questa analisi dell'albero non equivale a un audit di sicurezza completo.

## Fonti tecniche consultate

- [Expo: creazione progetto](https://docs.expo.dev/get-started/create-a-project/)
- [Expo per il web](https://docs.expo.dev/workflow/web/)
- [Configurazione PWA](https://docs.expo.dev/guides/progressive-web-apps/)
- [React Native Paper](https://oss.callstack.com/react-native-paper/)

Versioni controllate anche sui metadati npm e con `expo install`.
