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
import { recurrenceLabels } from '../src/domain/recurrence.ts';
import { newDraft, validateDraft } from '../src/domain/expense.ts';
import { parseCsvImport } from '../src/domain/backup.ts';

const t = (text: string) => translate('en', text);

test('lingue: testo italiano, inglese, parametri e fallback senza alterare i dati', () => {
  assert.equal(translate('it', 'Modifica {p0}', { p0: 'Caffè {nome}' }), 'Modifica Caffè {nome}');
  assert.equal(translate('en', 'Modifica {p0}', { p0: 'Spesa' }), 'Edit Spesa');
  assert.equal(t(' Oggi · '), ' Today · ');
  assert.equal(t('Una frase sconosciuta'), 'Una frase sconosciuta');
  assert.equal(t('constructor'), 'constructor');
  assert.equal(t('__proto__'), '__proto__');
});

test('errori dominio: validazione e CSV tradotti nel punto di presentazione', () => {
  const validation = validateDraft(newDraft(), []);
  assert.equal(validation.ok, false);
  if (!validation.ok) {
    assert.equal(t(validation.errors.amount!), 'Enter an amount.');
    assert.equal(t(validation.errors.description!), 'Enter a description.');
  }
  assert.equal(t(categoryNameError('', [])!), 'Enter a category name.');
  assert.throws(() => parseCsvImport('not,a,nummo,csv'), (error: unknown) => {
    assert.equal(error instanceof Error && t(error.message), 'Unrecognised CSV format. Use a CSV exported by Nummo.');
    return true;
  });
  assert.equal(t('Riga CSV 7: Usa al massimo 150 caratteri.'), 'CSV row 7: Use no more than 150 characters.');
  assert.equal(t('Il file contiene 11 categorie. Puoi creare al massimo 10 categorie.'), 'The file contains 11 categories. You can create up to 10 categories.');
  assert.equal(t('Importazione interrotta: alcuni gruppi potrebbero essere già confermati. Originali intatti; ripeti lo stesso backup dopo aver risolto il problema. Spesa non valida.'),
    'Import interrupted: some batches may already have been confirmed. Originals are intact; import the same backup again after resolving the issue. Invalid expense.');
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
});

test('catalogo: parametri corrispondenti, opzioni e testi statici UI coperti', () => {
  const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
  for (const [source, target] of Object.entries(english)) {
    assert.ok(target.trim(), source);
    assert.deepEqual(placeholders(source), placeholders(target), source);
  }
  for (const label of [...Object.values(periodLabels), ...Object.values(sortLabels), ...Object.values(recurrenceLabels),
    ...Object.values(categoryIconLabels), ...defaultCategories.map((category) => category.label)]) {
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
