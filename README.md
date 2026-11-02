# Nummus

Web app per registrare spese personali in Google Sheets. **Fase 1: base locale**,
non ancora utilizzabile per registrare spese reali. Google login, backend e Sheets
saranno integrati nella prova tecnica successiva.

## Avvio

Usare Node LTS compatibile con `package.json` (22.18+ oppure 24.3+; supportato anche 26).

```sh
npm ci
npm run dev
```

Aprire l'indirizzo localhost stampato da Expo. Nella sezione **Categorie**, creare
le proprie categorie: saranno disponibili in **Nuova spesa** e conservate nello
stesso browser, anche dopo una ricarica. Non esistono categorie predefinite.

La data viene assegnata automaticamente nel fuso di Roma; **Modifica data** mostra
il campo per scegliere una data diversa. Gli errori vengono indicati all'uscita
dai campi; il controllo completo sarà eseguito dal flusso di salvataggio.
**Salva spesa** rimane disabilitato finché Google e Sheets non sono collegati.
La bozza spesa è solo in memoria; le categorie persistono nel browser, senza
sincronizzazione o associazione a un account. Il tema si cambia con l'icona sole/luna.

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
