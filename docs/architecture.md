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
| EUR, 2 decimali, Europe/Rome, massimo 99.999,99 €, nota 500 caratteri | Confermati dall'utente |
| Date dal 2000-01-01 a oggi; nessuna data futura | Confermato dall'utente |
| Categorie create dall’utente, senza elenco predefinito | Nuova richiesta; sostituisce le sei categorie iniziali |
| Nome applicazione: Nummus | Confermato dall’utente; il foglio resta «Registro spese» |
| Firebase Hosting, budget, deployment e palette | Non confermati |
| Archivio tecnico, protocollo di scrittura/recupero, persistenza sessione | Da progettare e confermare prima dell'implementazione definitiva |

Le categorie hanno ID UUID stabili e nomi scelti dall'utente. Per questa fase,
`localStorage` conserva solo le categorie (`nummus.categories.v1`), non le spese o
credenziali. La lista viene condivisa dalle due sezioni senza smontare il modulo,
così cambiare sezione non perde la bozza. I nomi sono normalizzati per spazi e
Unicode, unici senza distinzione maiuscole/minuscole e limitati a 40 caratteri.
Quest'ultimo limite è una scelta implementativa modificabile, non un nuovo vincolo
funzionale concordato. Nessuna modifica o eliminazione delle categorie in questa fase.

Questo adapter è temporaneo e non è un archivio per utenti autenticati. Prima del
login, progettare categorie autorizzate lato backend, isolamento per UID e migrazione
esplicita delle categorie del browser: non associarle automaticamente a chi accede.
La cancellazione dei dati del browser perde le categorie; non c'è sincronizzazione
tra dispositivi. Gli aggiornamenti di altre schede vengono riletti, ma localStorage
non garantisce atomicità tra creazioni simultanee: risolvere nel backend prima del MVP.
Dati corrotti o storage negato non devono produrre conferme né sovrascrivere l'archivio.

La data non è visibile all'apertura: una data vuota nella bozza significa «oggi in
Europe/Rome» alla validazione, evitando date obsolete se cambia il giorno. Il campo
compare con «Modifica data»; «Usa data automatica» ripristina il comportamento iniziale.
Rimosso il comando «Verifica dati»: la funzione pura resta per controlli al blur e
futuro invio. Il salvataggio resta disabilitato e non viene simulato.

La lunghezza delle note si misura in punti di codice Unicode (non byte).
Si accettano virgola o punto decimale, senza separatori delle migliaia.

## Fase 1 implementata

Il frontend usa Expo SDK 58 e versioni React/React Native allineate al template
ufficiale, con Paper 5. Il lockfile fissa l'albero installato. La UI usa stato React
locale, senza router né store globale, con due sezioni: Nuova spesa e Categorie.

`src/domain` contiene funzioni pure indipendenti da Expo e Firebase. Il futuro
backend potrà riusare le regole, ma dovrà anche validare a runtime struttura,
tipi, UUID e campi consentiti di ogni richiesta non fidata. I tipi TypeScript
non costituiscono validazione di rete. `validateDraft` valida il modulo locale.

Il reducer degli invii costituisce una base testata, **non è collegato al modulo**:
il pulsante di salvataggio è disabilitato. Nessun ID viene creato prima di un
invio reale e nessuna conferma di persistenza viene simulata. Le note restano testo;
l'adapter Sheets dovrà usare `valueInputOption: RAW` e testare l'assenza di formule.

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
