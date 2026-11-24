# TODO — Nummo

Idee e lavori concordati con l'utente, non ancora implementati. Lo stato del lavoro fatto è in `HANDOFF.md`;
ogni voce si implementa solo su richiesta, una alla volta.

## Da fare

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
