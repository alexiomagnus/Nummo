# Avanzamento

Aggiornamento: 2 novembre 2026.

## Piano incrementale

1. **Base locale**: progetto avviabile, modulo Material 3, validazione secondo
   regole confermate, stati invio testati, typecheck ed export web.
2. **Prova tecnica**: ambiente di test separato, Google login, UID autorizzato,
   scrittura Sheets e protocollo di idempotenza/recupero. Accettazione: una sola
   riga per ID anche con concorrenza, risposta persa e crash dopo scrittura.
3. **MVP PWA**: collegamento modulo/backend, operazioni pendenti recuperabili,
   sessione/logout/cambio account, manifest/icone/aggiornamenti e collaudo dispositivi.
4. **Passaggio operativo**: inventario del vecchio registro, copia di sicurezza,
   scelta archivio/migrazione, verifica del ripristino e autorizzazione al deployment.

Dashboard, OCR, ricorrenze, Google Pay e app native restano fuori dal lavoro attuale.

## Completato nella fase 1

- Letta integralmente la specifica; nessun codice o AGENTS preesistente trovato.
- Raccolte conferme su stack, uso personale, accesso al registro, backend e dati.
- Creato progetto Expo/TypeScript strict con lockfile e componenti Paper.
- Modulo con importo, categorie rapide, data Roma, nota e tema chiaro/scuro.
- Validazione locale senza arrotondamenti e senza date impossibili/future.
- Stati invio separati: bozza, invio, conferma, esito incerto, rifiuto definitivo.
- Test su retry immutabile, doppio invio, conferma errata e correzione dopo rifiuto.
- Creati `AGENTS.md`, README e documentazione architetturale.

Il modulo è un'anteprima locale: non implementa login né salvataggio. Il reducer
non è ancora integrato con UI, rete o storage. Nessun servizio attivato/deployment.

## Verifiche della prima iterazione

- `npm run check`: typecheck, **42 test passati**, export web riuscito.
- Browser integrato desktop: caricamento dell'export, errori sui campi obbligatori,
  selezione categoria, importo con 3 decimali rifiutato, dati validi e avviso di
  mancato salvataggio; pulsante Salva disabilitato. Tema chiaro e scuro provati.
- Layout compatto e desktop: nessun overflow orizzontale; larghezze CSS effettive
  misurate 300 e 984 px (il browser integrato scala il viewport richiesto).
- Console: nessun errore JS osservato; un warning Paper/Animated sul fallback
  da animazioni native ad animazioni JavaScript nel browser, non bloccante.
- `npm audit`: 11 segnalazioni moderate, 0 alte/critiche. Non risolte mediante
  downgrade forzato; dettaglio e vincoli in `architecture.md`.
- Ambiente verificato: Linux, Node 26.13.0, npm 12.2.1, browser integrato Codex.
  Non certificata una specifica versione di Chrome/Safari né Node LTS.

**Non verificati/non implementati:** login Google, permessi del registro, scrittura
reale, concorrenza backend, persistenza/recupero dopo riapertura, logout/cambio
account, installazione e aggiornamento PWA, telefoni reali, screen reader e zoom
testuale. I test del reducer non dimostrano idempotenza delle scritture su Sheets.

## Problemi aperti e prossimi passi

- Definire e approvare protocollo di coordinamento/recupero: proposta in architecture.md.
- Identificare progetto Firebase di test, proprietario e UID ammesso, registro di
  prova e identità di servizio. Non chiedere di incollare credenziali in chat.
- Concordare persistenza sessione e dati di invii pendenti; bozza non inviata resta
  in memoria in questa fase. Recupero dopo chiusura non ancora implementato.
- Valutare 11 segnalazioni moderate nella catena build Expo (`glob`, `minimatch`).
- Confermare browser/dispositivi e relative versioni: Android Chrome, iPhone Safari,
  desktop Chrome proposti; verificare anche avvio da schermata iniziale.
- Nome confermato: Nummus. Palette provvisoria. Hosting, budget, backup e migrazione da definire.
- La directory `.git` disponibile non è un repository Git valido; nessun commit
  o modifica alla configurazione Git è stato eseguito.

## Revisione UI richiesta dall'utente — 2 novembre 2026

- Nome Nummus in intestazione, titolo HTML, configurazione Expo e package metadata.
  Il nome del registro Sheets resta invariato.
- Cambio tema con icona sole/luna e nome accessibile, senza testo visibile.
- Sezione Categorie per creare nomi personali; nessun elenco predefinito.
  Stessa lista nel modulo e nella validazione. Duplicati e nomi vuoti rifiutati.
- Categorie persistite nel browser; storage negato/corrotto gestito senza falso
  successo. Integrazione per account e backend ancora da realizzare.
- Data automatica nascosta, con campo apribile su richiesta e ritorno alla data
  automatica. Data risolta a ogni validazione per gestire il cambio giorno.
- Eliminati banner e testi di anteprima, comando Verifica dati e conferma di validità.
  Validazione sui campi al blur; futuro controllo completo all'invio.
- Salva spesa disabilitato finché Google Sheets non è collegato; nessun falso salvataggio.

Verifiche della revisione:
- `npm run check`: typecheck, **52 test superati** e build web riuscita.
- Browser: assenza di data iniziale, testi di anteprima e comando Verifica dati;
  icona tema e titolo Nummus; lista categorie inizialmente vuota.
- Creazione di «Libri», rifiuto di nome vuoto e duplicato « libri », disponibilità
  immediata nel modulo e persistenza dopo ricarica verificati nel browser.
- Bozza conservata cambiando sezione; data manuale impossibile rifiutata al blur;
  ritorno alla data automatica nasconde il campo e rimuove l'errore.
- Nessun errore JavaScript osservato in console. Nessun servizio o deployment.
- Restano i limiti della prima fase: nessun collaudo su telefoni reali o scrittura Sheets.
