# TODO — Nummo

Idee e lavori concordati con l'utente, non ancora implementati. Lo stato del lavoro fatto è in `HANDOFF.md`;
ogni voce si implementa solo su richiesta, una alla volta.

## Da fare

### Link di precompilazione di «Nuova spesa» (proposto il 15 novembre 2026)

- Un indirizzo come `https://…/#nuova?importo=12,50&descrizione=Bar` apre Nuova spesa con i campi già compilati;
  l'utente controlla e preme **Salva**. Mai salvataggi automatici.
- Uso tipico: un'automazione del telefono dopo un pagamento (iPhone: Comandi rapidi, automazione «Transazione» di
  Wallet; Android: Tasker/MacroDroid sulla notifica della banca) apre il link con importo ed esercente.
- Da definire: parametri ammessi (importo, descrizione, data, categoria per nome?), validazione con le regole del
  modulo, comportamento se c'è già una bozza, modalità Standard e Avanzata, pulizia dell'indirizzo dopo la lettura,
  guida breve per configurare l'automazione.
- Nessun dato passa da server o servizi esterni.

### Un unico Firebase per tutti gli utenti — soluzione «c» (proposta il 15 novembre 2026)

- Oggi l'Avanzata è BYOF: chi apre il sito pubblicato entra nel progetto del proprietario e, se non è il proprietario,
  vede la schermata «Questo Nummo è privato». Con la soluzione «c» chiunque accede con Google e ha il proprio spazio
  nello stesso progetto.
- Tecnicamente piccola: i dati sono già in `users/{uid}`; le Rules passerebbero da «solo l'UID in `config/owner`» a
  «ognuno solo il proprio `uid`» (ripensare `config/owner`, nomi categoria, budget, test emulatori).
- Prima della scelta tecnica, decisioni di prodotto: si diventa responsabili dei dati altrui (privacy/GDPR,
  informativa, cancellazione account ed esportazione), quote e costi Firebase con molti utenti, abusi e limiti,
  registrazioni aperte o su invito (oggi la Guida non deve presentare l'app come aperta a registrazioni), rapporto con
  la decisione BYOF del 2 novembre (`docs/architecture.md`) da aggiornare.
- Pubblicazione delle Rules sempre separata e autorizzata.

## Valutati, non pianificati

- **Collegamento diretto alla banca (open banking PSD2):** richiede un aggregatore autorizzato, un backend per le chiavi,
  rinnovo del consenso periodico, gestione dei duplicati e della privacy. Complessità alta per un uso personale.
- **Importazione dell'estratto conto (CSV/OFX/CAMT)** con anteprima e controllo dei duplicati: oggi escluso dalle
  convenzioni («Nessun import CSV»), richiede una decisione esplicita.
