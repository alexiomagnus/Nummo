import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { exportCsv, makeBackup, parseBackup, planImport } from '../src/domain/backup.ts';
import { expandOccurrences, subscriptionSummary } from '../src/domain/history.ts';
import { fundMonth } from '../src/domain/funds.ts';
import { rankMerchants, suggestMerchants } from '../src/domain/merchant.ts';
import { sortTemplates } from '../src/domain/template.ts';

// The v9/v10/v11 testing backups of docs/testing: the figures written in docs/testing/README.md, computed on 20 November 2026
// (v9, v10) and 23 November 2026 (v11).
const today = '2026-11-20';
const text = (name: string) => readFileSync(new URL(`../docs/testing/${name}`, import.meta.url), 'utf8');
const sum = (items: readonly { amount_minor: number }[]) => items.reduce((total, item) => total + item.amount_minor, 0);

test('collaudo v9: pagamenti eliminati, valori del README', () => {
  const raw = text('nummo-pagamenti-eliminati-v9.json');
  const file = JSON.parse(raw);
  assert.equal(file.version, 9);
  assert.ok(!('merchants' in file));
  const data = parseBackup(file);
  // Same records as a current export (only the version number differs).
  assert.equal(makeBackup(data, new Date(file.exported_at)).replace('"version": 12,', '"version": 9,') + '\n', raw);
  const summary = (description: string) => subscriptionSummary(data.expenses.find((e) => e.description === description)!, today);
  const expected: Record<string, [number, number, string | undefined]> = {
    'V9 Streaming': [10, 12990, '2026-12-15'], 'V9 Palestra': [7, 27300, undefined], 'V9 Telefono': [6, 6594, '2026-12-05'],
    'V9 Spazio cloud': [8, 2392, '2027-10-10'], 'V9 Lavanderia': [45, 22500, '2026-11-27'], 'V9 Assicurazione casa': [2, 36000, '2027-03-01'],
    'V9 Rivista': [0, 0, '2026-12-05'], 'V9 Musica': [2, 2198, '2026-12-01'],
  };
  for (const [description, [payments, total, next]] of Object.entries(expected)) {
    const s = summary(description);
    assert.deepEqual([s.payments.length, s.total, s.next?.date], [payments, total, next], description);
  }
  assert.equal(data.expenses.find((e) => e.description === 'V9 Lavanderia')?.skipped_payments?.length, 60);
  // Later payments keep their own price: the 11,99 € from occurrence 4 on, even if 3 and 4 were removed.
  assert.deepEqual(summary('V9 Telefono').payments.map((p) => p.amount_minor), [1199, 1199, 1199, 999, 999, 999]);
  const all = expandOccurrences(data.expenses, today);
  assert.deepEqual([all.length, sum(all)], [81, 112474]);
  const fund = data.funds[0]!.id;
  const months = ['2026-07', '2026-08', '2026-09', '2026-10', '2026-11'].map((month) => fundMonth(data, fund, month, today)!);
  assert.deepEqual(months.map((m) => [m.spent, m.state]), [[5199, 'near'], [3900, 'ok'], [2498, 'ok'], [7497, 'over'], [6097, 'over']]);
  assert.deepEqual([months[4]!.subscriptions, months[4]!.singles], [3597, 2500]);
  const plan = planImport(data, { expenses: [], categories: [] }, 'merge');
  assert.deepEqual([plan.addExpenses.length, plan.addCategories.length, plan.addFunds.length, plan.conflicts.length], [9, 3, 1, 0]);
});

test('collaudo v10: esercenti, valori del README', () => {
  const raw = text('nummo-esercenti-v10.json');
  const file = JSON.parse(raw);
  assert.equal(file.version, 10);
  const data = parseBackup(file);
  // Same records as a current export (only the version number differs: v11 adds templates, none here).
  assert.equal(makeBackup(data, new Date(file.exported_at)).replace('"version": 12,', '"version": 10,') + '\n', raw);
  const merchants = data.merchants ?? [];
  assert.equal(merchants.length, 12);
  const ranked = rankMerchants(merchants, data.expenses, today);
  assert.deepEqual(ranked.slice(0, 3).map((m) => [m.name, m.uses]), [['Bar da Mario', 4], ['Coop', 3], ['Esselunga', 10]]);
  assert.deepEqual([ranked.at(-1)?.name, ranked.at(-1)?.uses], ['Libreria Rossi', 0]);
  const names = (typed: string) => suggestMerchants(ranked, typed).map((m) => m.name);
  assert.deepEqual(names('e'), ['Esselunga', 'Ferramenta e Colorificio dei Fratelli Bianchi di San Giorgio', 'eBay']);
  assert.deepEqual(names('caffe'), ['Caffè Centrale']);
  assert.deepEqual(names('ESSELUNGA'), []);
  assert.deepEqual(merchants.filter((m) => /%/u.test(m.id)).map((m) => m.id), ['m-a%2Fb ottica', 'm-outlet 30%25']);
  const all = expandOccurrences(data.expenses, today);
  assert.deepEqual([all.length, sum(all)], [31, 118909]);
  const netflix = subscriptionSummary(data.expenses.find((e) => e.description === 'V10 Netflix')!, today);
  assert.deepEqual([netflix.payments.length, netflix.total], [5, 6995]);
  const csv = exportCsv(data.expenses, data.categories, today, [], merchants).split('\r\n');
  assert.ok(csv.includes('2026-11-15;"V10 Pizza d\'asporto";"V10 · Ristoranti e bar";23,50;EUR;"";"";"Pizzeria ""Da Gino""; Centro"'));
  // A saved «Ebay» is the same merchant: merge keeps its spelling, replace takes the file's and removes the others.
  const saved = { expenses: [], categories: [], merchants: [{ id: 'm-ebay', name: 'Ebay' }, { id: 'm-tabaccheria', name: 'Tabaccheria' }] };
  const merge = planImport(data, saved, 'merge');
  assert.deepEqual([merge.addMerchants.length, merge.sameMerchants, merge.conflicts.length, merge.removeMerchantIds], [11, 1, 0, []]);
  const replace = planImport(data, saved, 'replace');
  assert.ok(replace.addMerchants.some((m) => m.name === 'eBay'));
  assert.deepEqual(replace.removeMerchantIds, ['m-tabaccheria']);
});

test('collaudo v11: template ed esercente, valori del README', () => {
  const raw = text('nummo-template-v11.json');
  const file = JSON.parse(raw);
  assert.equal(file.version, 11);
  const data = parseBackup(file);
  // Same records as a current export (only the version number differs, v12 since 26 November).
  assert.equal(makeBackup(data, new Date(file.exported_at)).replace('"version": 12,', '"version": 11,') + '\n', raw);
  const templates = data.templates ?? [];
  assert.equal(templates.length, 9);
  const byName = (description: string) => templates.find((x) => x.description === description)!;
  assert.equal(byName('V11 Spesa settimanale').merchant, 'lidl');
  assert.equal(byName('V11 Pizza d\'asporto').merchant, 'Pizzeria Nuova Napoli');
  assert.ok(!(data.merchants ?? []).some((m) => m.name === 'Pizzeria Nuova Napoli'));
  assert.equal(Array.from(byName('V11 Mobili su misura').merchant ?? '').length, 60);
  assert.equal(byName('V11 Mobili su misura').amount_minor, 99_999_999_999);
  assert.equal(byName('V11 Vecchio template senza importo').amount_minor, null);
  assert.ok(data.funds.find((f) => f.id === byName('V11 Weekend al lago').fund_id)?.archived);
  assert.ok(!data.categories.some((c) => c.id === byName('V11 Categoria che non esiste più').category_id));
  assert.deepEqual(templates.filter((x) => x.merchant === null).length, 4);
  assert.equal(sortTemplates(templates)[0]?.description, 'V11 Caffè e cornetto "al banco"; colazione');
  const v11Today = '2026-11-23';
  const ranked = rankMerchants(data.merchants ?? [], data.expenses, v11Today);
  assert.deepEqual(ranked.map((m) => [m.name, m.uses]), [['Lidl', 3], ['Forno Bianchi', 2], ['Trattoria La Pergola', 1], ['Q8', 1],
    ['Falegnameria e Restauro dei Mobili Antichi di Esposito Figli', 1]]);
  const all = expandOccurrences(data.expenses, v11Today);
  assert.deepEqual([all.length, sum(all)], [8, 147225]);
  assert.equal(fundMonth(data, data.funds.find((f) => !f.archived)!.id, '2026-11', v11Today)?.spent, 10395);
  const plan = planImport(data, { expenses: [], categories: [] }, 'merge');
  assert.deepEqual([plan.addExpenses.length, plan.addCategories.length, plan.addFunds.length, plan.addMerchants.length, plan.addTemplates.length,
    plan.conflicts.length], [8, 4, 2, 5, 9, 0]);
  assert.equal(planImport(data, data, 'merge').sameTemplates, 9);
  // A template changed in the archive is a conflict, never overwritten by a merge.
  const changed = { ...data, templates: templates.map((x) => x.description === 'V11 Pane' ? { ...x, amount_minor: 260 } : x) };
  assert.deepEqual(planImport(data, changed, 'merge').conflicts.map((c) => [c.kind, c.label]), [['template', 'V11 Pane']]);
  // Merged onto the v10 file: no conflicts, its merchants are all new.
  const v10 = parseBackup(JSON.parse(text('nummo-esercenti-v10.json')));
  const onto = planImport(data, v10, 'merge');
  assert.deepEqual([onto.addMerchants.length, onto.conflicts.length], [5, 0]);
  // The same file declared v10 is refused: a merchant in templates needs v11.
  assert.throws(() => parseBackup({ ...file, version: 10 }), /versione 11/u);
});
