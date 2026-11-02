# Nummo

Web app per registrare spese personali in Google Sheets. **Versione locale**: le spese
si salvano solo nel browser. Google login, backend e Sheets saranno integrati nella
prova tecnica successiva.

## Avvio

Usare Node LTS compatibile con `package.json` (22.18+ oppure 24.3+; supportato anche 26).

```sh
npm ci
npm run dev
```

Aprire l'indirizzo localhost stampato da Expo. Le sezioni sono:

- **Nuova**: importo, nome dell'acquisto, categoria facoltativa e, se serve,
  «Ripeti questa spesa» (settimanale, mensile o annuale). La data è sempre oggi (Roma).
- **Spese**: elenco ricercabile per nome e ordinabile per data o importo; le spese
  ricorrenti compaiono a ogni scadenza fino a oggi.
- **Dashboard**: ciambella, andamento o barre impilate, per mese corrente, 6 o 12 mesi.
- **Categorie**: al primo avvio Spesa, Ristorazione, Uscita e Shopping, con icone
  pixel art; si possono aggiungere, rinominare, eliminare e cambiare icona.

Spese e categorie sono salvate **solo in questo browser** (`localStorage`): Google
Sheets non è ancora collegato, non c'è sincronizzazione e cancellare i dati del sito
le elimina. Il tema si cambia con l'icona sole/luna.

```sh
npm run typecheck
npm test
npm run build
# Oppure tutti insieme, con arresto al primo errore:
npm run check
```

L'export web è in `dist/`. Non è ancora una PWA installabile: manifest, icone,
HTTPS e ciclo di aggiornamento appartengono alla fase 3. Nessun service worker
o cache dei dati privati è configurato.

Il runner Node esegue i test nello stesso processo (`--experimental-test-isolation=none`):
in questo ambiente il runner con subprocessi riportava solo i file senza dettaglio
dei casi. Non sono necessarie librerie di test aggiuntive.

## Documentazione

- [Specifica originale v0.4](recap.md)
- [Decisioni e confini architetturali](docs/architecture.md)
- [Piano, avanzamento e verifiche](docs/progress.md)
- [Istruzioni per gli agenti](AGENTS.md)

Non sono presenti credenziali o configurazioni di servizi reali. Non abilitare
fatturazione e non effettuare deployment senza autorizzazione.
