import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import ts from 'typescript';
import { english } from '../src/i18n/en.ts';
import { formatCivilDate, formatCurrency, translate } from '../src/i18n/translate.ts';
import { seriesLabel } from '../src/features/dashboard/seriesLabel.ts';
import { otherCategoriesKey, uncategorizedKey, periodLabels, sortLabels } from '../src/domain/history.ts';
import { categoryIconLabels, defaultCategories, categoryNameError } from '../src/domain/category.ts';
import { iconStyleText } from '../src/components/categoryIconSets.ts';
import { recurrenceLabels } from '../src/domain/recurrence.ts';
import { statusLabels } from '../src/domain/subscription.ts';
import { newDraft, validateDraft } from '../src/domain/expense.ts';
import { parseBackup } from '../src/domain/backup.ts';

const t = (text: string) => translate('en', text);

test('lingue: testo italiano, inglese, parametri e fallback senza alterare i dati', () => {
  assert.equal(translate('it', 'Modifica {p0}', { p0: 'Caffè {nome}' }), 'Modifica Caffè {nome}');
  assert.equal(translate('en', 'Modifica {p0}', { p0: 'Spesa' }), 'Edit Spesa');
  assert.equal(t(' Oggi · '), ' Today · ');
  assert.equal(t('Una frase sconosciuta'), 'Una frase sconosciuta');
  assert.equal(t('constructor'), 'constructor');
  assert.equal(t('__proto__'), '__proto__');
  assert.equal(translate('it', 'Analisi'), 'Analisi');
  assert.equal(translate('en', 'Analisi'), 'Analysis');
  assert.equal(t('Mostra altre spese'), 'Show more expenses');
  assert.equal(t('In prova gratuita'), 'On free trial');
  assert.equal(translate('en', 'Primo pagamento {p0}', { p0: '9 Dec 2026' }), 'First payment 9 Dec 2026');
  assert.equal(translate('it', 'Prova gratuita'), 'Prova gratuita');
  assert.equal(t('Ripristina predefiniti'), 'Restore defaults');
  assert.equal(translate('it', 'Ripristina predefiniti'), 'Ripristina predefiniti');
  assert.equal(translate('en', 'Mostrate {p0} di {p1} spese', { p0: 50, p1: 240 }), 'Showing 50 of 240 expenses');
});

test('errori dominio: validazione e CSV tradotti nel punto di presentazione', () => {
  const validation = validateDraft(newDraft(), []);
  assert.equal(validation.ok, false);
  if (!validation.ok) {
    assert.equal(t(validation.errors.amount!), 'Enter an amount.');
    assert.equal(t(validation.errors.description!), 'Enter a description.');
  }
  assert.equal(t(categoryNameError('', [])!), 'Enter a category name.');
  assert.throws(() => parseBackup({ format: 'other' }), (error: unknown) => {
    assert.equal(error instanceof Error && t(error.message), 'Unrecognised backup format.');
    return true;
  });
  assert.throws(() => parseBackup({ format: 'nummo-backup', version: 99 }), (error: unknown) => {
    assert.match(error instanceof Error ? t(error.message) : '', /newer version of Nummo/);
    return true;
  });
  // Import outcomes stay short: one sentence, no appended technical detail.
  assert.equal(t('Importazione bloccata: 2 elementi diversi dai dati salvati. Nessuna modifica.'), 'Import blocked: 2 items differ from your saved data. Nothing changed.');
  assert.equal(t('Importazione interrotta: riprova con lo stesso file, nulla verrà duplicato.'), 'Import interrupted: try again with the same file, nothing will be duplicated.');
  assert.equal(t('Importazione completata.'), 'Import completed.');
  assert.equal(t('Da aggiungere: 89 spese · 15 categorie'), 'To add: 89 spese · 15 categorie');
});

test('date e importi: lingua di visualizzazione, valuta e data civile invariate', () => {
  assert.equal(formatCurrency(1234567, 'it').replace(/\s/g, ' '), '12.345,67 €');
  assert.equal(formatCurrency(1234567, 'en'), '€12,345.67');
  assert.equal(formatCivilDate('2026-11-08', 'it'), '8 nov 2026');
  assert.equal(formatCivilDate('2026-11-08', 'en'), '8 Nov 2026');
  assert.equal(formatCivilDate('2026-01-01', 'en', { month: 'long', year: 'numeric', timeZone: 'America/Los_Angeles' }), 'January 2026');
});

test('grafici: tradurre solo aggregati sintetici, mai categorie dell’utente', () => {
  assert.equal(seriesLabel({ key: uncategorizedKey, label: 'Senza categoria' }, t), 'Uncategorised');
  assert.equal(seriesLabel({ key: otherCategoriesKey, label: 'Altre categorie' }, t), 'Other categories');
  assert.equal(seriesLabel({ key: 'user-category', label: 'Senza categoria' }, t), 'Senza categoria');
  assert.equal(seriesLabel({ key: 'user-category', label: 'Spesa' }, t), 'Spesa');
  assert.equal(seriesLabel({ key: 'user-category', label: 'Altre categorie' }, t), 'Altre categorie');
  assert.equal(t('Mostra dettaglio di Altre ({p0})').includes('Other'), true);
  for (const [it, en] of [['Ciambella', 'Donut'], ['Blocchi', 'Blocks'], ['Barre', 'Bars'],
    ['Tocca una barra per vedere i dettagli della categoria.', 'Tap a bar to see the category details.'],
    ['Tocca una sezione per vedere i dettagli della categoria.', 'Tap a segment to see the category details.']] as const) {
    assert.equal(translate('it', it), it);
    assert.equal(translate('en', it), en);
  }
  assert.equal(translate('en', 'Mostra dettaglio di Altre ({p0})', { p0: 23 }), 'Show Other category details (23)');
});

test('catalogo: parametri corrispondenti, opzioni e testi statici UI coperti', () => {
  const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
  for (const [source, target] of Object.entries(english)) {
    assert.ok(target.trim(), source);
    assert.deepEqual(placeholders(source), placeholders(target), source);
  }
  for (const label of [...Object.values(periodLabels), ...Object.values(sortLabels), ...Object.values(recurrenceLabels), ...Object.values(statusLabels),
    ...Object.values(categoryIconLabels), ...Object.values(iconStyleText).map((text) => text.label), ...defaultCategories.map((category) => category.label)]) {
    assert.ok(Object.hasOwn(english, label), `Traduzione mancante: ${label}`);
  }
  const files = (directory: string): string[] => readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? files(join(directory, entry.name)) : entry.name.endsWith('.tsx') ? [join(directory, entry.name)] : []);
  for (const file of ['App.tsx', ...files('src')]) {
    const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const visit = (node: ts.Node) => {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 't') {
        const key = node.arguments[0];
        if (key && ts.isStringLiteral(key)) assert.ok(Object.hasOwn(english, key.text.trim()), `${file}: ${key.text}`);
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
});

test('abbonamenti: stati e azioni tradotti, nomi delle serie mai tradotti', () => {
  for (const [it, en] of [['Attivo', 'Active'], ['In pausa', 'Paused'], ['Annullato', 'Cancelled'], ['Pagamenti ricorrenti', 'Recurring payments'], ['Abbonamenti', 'Subscriptions'], ['Settimana', 'Week'], ['Anno', 'Year'], ['Giroconto', 'Transfer'], ['Budget', 'Budget'],
    ['Metti in pausa', 'Pause'], ['Pausa', 'Pause'], ['Riattiva', 'Resume'], ['Annulla abbonamento', 'Cancel subscription']] as const) {
    assert.equal(translate('it', it), it);
    assert.equal(translate('en', it), en);
  }
  assert.equal(translate('en', 'In pausa dal {p0}', { p0: '10 Feb 2026' }), 'Paused since 10 Feb 2026');
  assert.equal(translate('en', 'Mostra tutti i pagamenti ({p0})', { p0: 30 }), 'Show all payments (30)');
});

test('dashboard: mostra e nascondi giorni tradotti in entrambe le lingue', () => {
  for (const [it, en] of [['Mostra giorni con spese', 'Show days with expenses'], ['Nascondi giorni con spese', 'Hide days with expenses']] as const) {
    assert.equal(translate('it', it), it);
    assert.equal(translate('en', it), en);
  }
});

test('ripristino: conflitto spiegato con titolo e conteggio essenziali', () => {
  assert.equal(translate('it', 'Impossibile unire il backup'), 'Impossibile unire il backup');
  assert.equal(translate('en', 'Impossibile unire il backup'), 'Cannot merge backup');
  assert.equal(translate('it', '{p0} elementi sono diversi dai dati salvati.', { p0: 2 }), '2 elementi sono diversi dai dati salvati.');
  assert.equal(translate('en', '{p0} elementi sono diversi dai dati salvati.', { p0: 2 }), '2 items differ from your saved data.');
});

test('impostazioni: interruttore del budget mensile tradotto in entrambe le lingue', () => {
  for (const [it, en] of [['Funzionalità', 'Features'], ['Mostra budget mensile', 'Show monthly budget'], ['Nella pagina Analisi, il grafico delle spese giorno per giorno.', 'On the Analysis page, a chart of spending day by day.'], ['Mostra il budget generale e i controlli del budget dei fondi. I budget nascosti restano salvati.', 'Show the general budget and fund budget controls. Hidden budgets stay saved.']] as const) {
    assert.equal(translate('it', it), it);
    assert.equal(translate('en', it), en);
  }
});

test('nuova spesa: etichette della sezione ricorrente tradotte, vecchia etichetta dei rinnovi rimossa', () => {
  for (const [it, en] of [['Pagamento ricorrente', 'Recurring payment'], ['Rinnovi a prezzo promozionale', 'Renewals at promotional price'], ['Prezzo promozionale', 'Promotional price'], ['Prova gratuita', 'Free trial']] as const) {
    assert.equal(translate('it', it), it);
    assert.equal(translate('en', it), en);
  }
  assert.ok(!Object.hasOwn(english, 'Dopo quanti rinnovi'));
});

test('notifiche e protezione: testi della pagina, degli avvisi e dello stato tradotti in entrambe le lingue', () => {
  for (const [it, en] of [['Notifiche', 'Notifications'], ['Attiva notifiche', 'Turn on notifications'], ['Promemoria backup', 'Backup reminder'],
    ['Riepilogo spese', 'Spending summary'], ['Ricordamelo dopo', 'Remind me later'], ['Ogni settimana (consigliato)', 'Every week (recommended)'],
    ['Ogni 14 giorni', 'Every 14 days'], ['Archivio locale protetto', 'Local archive protected'], ['Protezione aggiuntiva non attiva', 'Extra protection not active'],
    ['Protezione non disponibile', 'Protection not available']] as const) {
    assert.equal(translate('it', it), it);
    assert.equal(translate('en', it), en);
  }
  assert.equal(translate('en', '{p0} in {p1} spese', { p0: '€12.50', p1: 3 }), '€12.50 in 3 expenses');
  // Il backup su Google Drive è stato rimosso: nessun testo residuo nel catalogo.
  assert.equal(Object.keys(english).some((key) => key.includes('Google Drive')), false);
});
