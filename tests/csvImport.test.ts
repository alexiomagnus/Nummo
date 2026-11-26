import assert from 'node:assert/strict';
import { test } from 'node:test';
import { csvToImport, csvAmountMinor, csvDate, readCsvTable } from '../src/domain/csvImport.ts';
import { exportCsv, parseBackup, makeBackup, planImport } from '../src/domain/backup.ts';
import type { ExpenseRecord } from '../src/domain/contract.ts';

const none = { categories: [], funds: [], merchants: [] };
const today = '2026-11-27';
const head = 'Data;Descrizione;Categoria;Importo;Valuta;Ricorrenza;Fondo;Esercente\r\n';

test('CSV import: amounts and dates in the usual spreadsheet forms', () => {
  assert.equal(csvAmountMinor('12,50'), 1250);
  assert.equal(csvAmountMinor('1.234,56'), 123456);
  assert.equal(csvAmountMinor('1234.5'), 123450);
  assert.equal(csvAmountMinor('€ 3'), 300);
  assert.equal(csvAmountMinor('-3,00'), null);
  assert.equal(csvAmountMinor('0'), null);
  assert.equal(csvDate('2026-02-28'), '2026-02-28');
  assert.equal(csvDate('5/3/2026'), '2026-03-05');
  assert.equal(csvDate('2026-02-30'), null);
});

test('CSV import: quoted cells, BOM, formula apostrophe, other separators', () => {
  assert.deepEqual(readCsvTable('﻿a;b\r\n"x;y";"he said ""hi"""\r\n'), [['a', 'b'], ['x;y', 'he said "hi"']]);
  assert.deepEqual(readCsvTable('a,b\n1,2'), [['a', 'b'], ['1', '2']]);
  const r = csvToImport(`${head}2026-01-05;"'=1+1";;"3,00";EUR;;;\r\n`, none, today);
  assert.equal(r.data.expenses[0]!.description, '=1+1');
});

test('CSV import: categories and merchants by name, unknown funds left out, bad rows skipped with the line', () => {
  const cats = [{ id: '22222222-2222-4222-8222-222222222222', label: 'Alimentari', icon: null }];
  const text = head + [
    '2026-01-05;Spesa;alimentari;"10,00";EUR;;Casa;coop italia',
    '2026-01-06;Cinema;Svago;"8,00";EUR;;;',
    'ieri;Rotta;;"1,00";EUR;;;',
    '2026-01-07;Dollari;;"1,00";USD;;;',
    '2030-01-01;Futura;;"1,00";EUR;;;',
    '2026-01-08;Zero;;"0";EUR;;;',
  ].join('\r\n');
  const r = csvToImport(text, { categories: cats, funds: [], merchants: [] }, today);
  assert.equal(r.data.expenses.length, 2);
  assert.equal(r.data.expenses[0]!.category_id, cats[0]!.id);
  assert.equal(r.data.categories.length, 1);
  assert.equal(r.data.categories[0]!.label, 'Svago');
  assert.deepEqual(r.unknownFunds, ['Casa']);
  assert.equal(r.data.expenses[0]!.fund_id, null);
  assert.equal(r.data.merchants![0]!.name, 'Coop Italia');
  assert.deepEqual(r.skipped.map((s) => s.line), [4, 5, 6, 7]);
  assert.throws(() => csvToImport('Foo;Bar\r\n1;2', none, today), /colonne/);
});

test('CSV import: same file twice adds nothing; identical rows stay two expenses; export → import round trip', () => {
  const text = head + '2026-01-05;Caffè;;"1,20";EUR;;;Bar\r\n2026-01-05;Caffè;;"1,20";EUR;;;Bar\r\n';
  const first = csvToImport(text, none, today);
  assert.equal(first.data.expenses.length, 2);
  const again = csvToImport(text, none, today);
  assert.deepEqual(again.data.expenses.map((e) => e.id), first.data.expenses.map((e) => e.id));
  const plan = planImport(first.data, { expenses: first.data.expenses, categories: [], merchants: first.data.merchants }, 'merge');
  assert.equal(plan.addExpenses.length, 0);
  assert.equal(plan.conflicts.length, 0);
  // The exported CSV is read back; the data also passes the backup validation.
  const exported = exportCsv(first.data.expenses as ExpenseRecord[], [], today, [], first.data.merchants);
  const back = csvToImport(exported, { categories: [], funds: [], merchants: first.data.merchants! }, today);
  assert.deepEqual(back.data.expenses.map((e) => e.id), first.data.expenses.map((e) => e.id));
  parseBackup(JSON.parse(makeBackup(back.data)));
});
