import assert from 'node:assert/strict';
import test from 'node:test';
import { makeBackup, parseBackup, planImport } from '../src/domain/backup.ts';
import { sameTemplate, sortTemplates, parseTemplate, templateFields, validateTemplateDraft, draftOfTemplate, newTemplateDraft, templateOptionalFields, type TemplateRecord } from '../src/domain/template.ts';
import { parseSyncedTemplate } from '../src/domain/firestore.ts';

const cat = '11111111-1111-4111-8111-111111111111';
const fund = '22222222-2222-4222-8222-222222222222';
const categories = [{ id: cat, label: 'Alimentari', icon: 'cart' as const }];
const now = new Date('2026-11-15T10:00:00Z');
const ok = { description: 'Caffè', amount: '1,80', date: '2026-11-10', categoryId: cat, fundId: '', merchant: '' };
const record = (over: Partial<TemplateRecord> = {}): TemplateRecord => ({ id: '33333333-3333-4333-8333-333333333333', description: 'Caffè', amount_minor: null,
  date: '2026-11-10', category_id: cat, fund_id: null, merchant: null, created_at: '2026-11-11T10:00:00.000Z', ...over });

test('template: importo, descrizione, data e categoria obbligatori (importo dal 21 novembre); i template senza importo si leggono ancora', () => {
  const result = validateTemplateDraft(ok, categories, [], { fundChosen: false, now });
  assert.deepEqual(result, { ok: true, data: { description: 'Caffè', amount_minor: 180, date: '2026-11-10', category_id: cat, fund_id: null, merchant: null } });
  const noAmount = validateTemplateDraft({ ...ok, amount: ' ' }, categories, [], { fundChosen: false, now });
  assert.ok(!noAmount.ok && noAmount.errors.amount === 'Inserisci l’importo.');
  // Saved before 21 November without an amount: still valid when read; editing it asks for one.
  assert.equal(parseTemplate(record())?.amount_minor, null);
  assert.ok(!validateTemplateDraft(draftOfTemplate(record()), categories, [], { fundChosen: false, now }).ok);
  const empty = validateTemplateDraft({ ...ok, description: ' ', categoryId: '', date: '' }, categories, [], { fundChosen: false, now });
  assert.ok(!empty.ok && empty.errors.description && empty.errors.categoryId && empty.errors.date && !empty.errors.amount);
  const bad = validateTemplateDraft({ ...ok, amount: 'abc', date: '2026-12-01', description: 'x'.repeat(101) }, categories, [], { fundChosen: false, now });
  assert.ok(!bad.ok && bad.errors.amount && bad.errors.date && bad.errors.description);
  assert.ok(!validateTemplateDraft({ ...ok, categoryId: '44444444-4444-4444-8444-444444444444' }, categories, [], { fundChosen: false, now }).ok, 'categoria inesistente');
});

test('template: Esercente facoltativo, solo un nome (spazi normalizzati, al massimo 60 caratteri)', () => {
  const named = validateTemplateDraft({ ...ok, merchant: '  Bar   Roma ' }, categories, [], { fundChosen: false, now });
  assert.ok(named.ok && named.data.merchant === 'Bar Roma');
  const long = validateTemplateDraft({ ...ok, merchant: 'x'.repeat(61) }, categories, [], { fundChosen: false, now });
  assert.ok(!long.ok && long.errors.merchant);
  // Saved before the reintroduction (no field): read as no merchant; a stored name must be already normalised.
  const { merchant: _none, ...older } = record();
  assert.deepEqual(parseTemplate(older), record());
  assert.equal(parseTemplate({ ...record(), merchant: ' Bar' }), null);
  assert.equal(parseTemplate({ ...record(), merchant: '' }), null);
  assert.equal(parseTemplate({ ...record(), merchant: 'x'.repeat(61) }), null);
  assert.equal(parseTemplate(record({ merchant: 'Bar Roma' }))?.merchant, 'Bar Roma');
  assert.ok(!sameTemplate(record(), record({ merchant: 'Bar Roma' })));
});

test('template: con dei fondi il fondo va scelto (anche «Nessun fondo»), come in Nuova spesa', () => {
  const funds = [{ id: fund }];
  const missing = validateTemplateDraft(ok, categories, funds, { fundChosen: false, now });
  assert.ok(!missing.ok && missing.errors.fundId);
  const none = validateTemplateDraft(ok, categories, funds, { fundChosen: true, now });
  assert.ok(none.ok && none.data.fund_id === null);
  const picked = validateTemplateDraft({ ...ok, fundId: fund }, categories, funds, { fundChosen: true, now });
  assert.ok(picked.ok && picked.data.fund_id === fund);
  assert.ok(!validateTemplateDraft({ ...ok, fundId: '55555555-5555-4555-8555-555555555555' }, categories, funds, { fundChosen: true, now }).ok, 'fondo inesistente');
});

test('template: lettura di dati non fidati, bozza di modifica, uguaglianza e ordine', () => {
  assert.deepEqual(parseTemplate(record()), record());
  for (const bad of [{ description: '' }, { description: ' Caffè' }, { amount_minor: 0 }, { amount_minor: 1.5 }, { date: '2026-02-30' }, { date: '1999-12-31' },
    { category_id: 'x' }, { fund_id: 'x' }, { created_at: 'ieri' }, { id: 'x' }]) assert.equal(parseTemplate({ ...record(), ...bad }), null, JSON.stringify(bad));
  assert.equal(parseSyncedTemplate({ ...record(), updated_at: '2026-11-12T10:00:00.000Z' })?.updated_at, '2026-11-12T10:00:00.000Z');
  assert.equal(parseSyncedTemplate({ ...record(), updated_at: 'no' }), null);
  assert.deepEqual(draftOfTemplate(record({ amount_minor: 1250, fund_id: fund, merchant: 'Bar Roma' })), { description: 'Caffè', amount: '12,50', date: '2026-11-10', categoryId: cat, fundId: fund, merchant: 'Bar Roma' });
  assert.equal(newTemplateDraft('2026-11-15').date, '2026-11-15');
  assert.ok(sameTemplate(record(), record()) && !sameTemplate(record(), record({ amount_minor: 5 })));
  assert.deepEqual(Object.keys(templateFields(record())), ['description', 'amount_minor', 'date', 'category_id', 'fund_id', 'merchant']);
  assert.deepEqual(sortTemplates([record({ id: 'b', description: 'Zeta' }), record({ id: 'a', description: 'Alfa' })]).map((x) => x.id), ['a', 'b']);
});

test('template: backup v11 con round trip, piano di importazione e file precedenti senza template', () => {
  const t1 = record(); const t2 = record({ id: '66666666-6666-4666-8666-666666666666', description: 'Abbonamento sala', amount_minor: 3000, fund_id: fund });
  const file = JSON.parse(makeBackup({ expenses: [], categories, templates: [t1, t2] }, now));
  assert.equal(file.version, 11);
  assert.deepEqual(file.templates.map((x: { description: string }) => x.description), ['Abbonamento sala', 'Caffè']);
  const restored = parseBackup(file);
  assert.deepEqual(restored.templates, [t2, t1]);
  assert.equal('templates' in JSON.parse(makeBackup({ expenses: [], categories }, now)), false, 'nessuna chiave senza template');
  assert.throws(() => parseBackup({ ...file, templates: [t1, t1] }), /Template nel backup/);
  assert.throws(() => parseBackup({ ...file, templates: [{ ...t1, date: '2099-01-01' }] }), /Template nel backup/);
  assert.throws(() => parseBackup({ ...file, templates: 'x' }), /Template nel backup/);
  const data = { expenses: [], categories, templates: [t1, t2] };
  const merge = planImport(data, { expenses: [], categories, templates: [t1] }, 'merge');
  assert.deepEqual([merge.addTemplates.length, merge.sameTemplates, merge.conflicts.length], [1, 1, 0]);
  const conflict = planImport(data, { expenses: [], categories, templates: [{ ...t1, amount_minor: 9 }] }, 'merge');
  assert.deepEqual(conflict.conflicts.map((c) => c.kind), ['template']);
  const replace = planImport({ expenses: [], categories, templates: [t2] }, { expenses: [], categories, templates: [t1, t2] }, 'replace');
  assert.deepEqual([replace.removeTemplateIds, replace.sameTemplates], [[t1.id], 1]);
});

test('template dopo template: importo ed esercente lasciati dal precedente si tolgono, quelli scritti a mano restano', () => {
  const base = { date: '2026-11-01', category_id: 'c', fund_id: null };
  const fuel = { ...base, description: 'Pieno', amount_minor: 5000, merchant: 'Q8' };
  const coffee = { ...base, description: 'Caffè', amount_minor: 120, merchant: null };
  const old = { ...base, description: 'Vecchio', amount_minor: null, merchant: null };
  // From an empty form: the template fills both and remembers them.
  const first = templateOptionalFields(fuel, { amount: '', merchant: '' }, {});
  assert.deepEqual(first, { patch: { amount: '50,00', merchant: 'Q8' }, fill: { amount: '50,00', merchant: 'Q8' } });
  // «Pieno» then «Caffè»: the coffee gets its amount and no longer Q8.
  assert.deepEqual(templateOptionalFields(coffee, { amount: '50,00', merchant: 'Q8' }, first.fill),
    { patch: { amount: '1,20', merchant: '' }, fill: { amount: '1,20' } });
  // A template without amount (saved before 21 November) takes back the previous template's amount too.
  assert.deepEqual(templateOptionalFields(old, { amount: '50,00', merchant: 'Q8' }, first.fill).patch, { amount: '', merchant: '' });
  // Values changed by hand after the first template stay.
  assert.deepEqual(templateOptionalFields(old, { amount: '48,30', merchant: 'Eni' }, first.fill), { patch: {}, fill: {} });
  // Values typed before any template stay as well.
  assert.deepEqual(templateOptionalFields(coffee, { amount: '3,00', merchant: 'Bar Roma' }, {}), { patch: { amount: '1,20' }, fill: { amount: '1,20' } });
  assert.deepEqual(templateOptionalFields(old, { amount: '3,00', merchant: 'Bar Roma' }, {}), { patch: {}, fill: {} });
});
