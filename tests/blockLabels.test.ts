import assert from 'node:assert/strict';
import { test } from 'node:test';
import { blockLabelPlan, blockLabelColors, type TextMeasure } from '../src/features/dashboard/blockLabels.ts';
import { blockLayout, blockTileBounds } from '../src/features/dashboard/categoryPresentation.ts';
import { breakdown, expandOccurrences, type ExpenseEntry } from '../src/domain/history.ts';

// Controlled font metrics: geometry tests must not depend on the fonts installed on the CI host.
const measure: TextMeasure = (text, size) => Array.from(text).length * size * 0.55;
const text = { name: 'Alimentari', amount: '€123,45', percent: '5%' };

test('etichette: grandi complete, medie nome/importo, basse almeno il nome, minuscole senza testo', () => {
  const large = blockLabelPlan(240, 180, text, measure);
  assert.deepEqual(large.name, ['Alimentari']);
  assert.ok(large.amount && large.percent);
  const medium = blockLabelPlan(150, 56, text, measure);
  assert.deepEqual(medium.name, ['Alimentari']);
  assert.ok(medium.amount);
  assert.equal(medium.percent, false);
  const short = blockLabelPlan(140, 28, text, measure);
  assert.deepEqual(short.name, ['Alimentari']);
  assert.equal(short.amount, false);
  assert.equal(short.percent, false);
  const tiny = blockLabelPlan(18, 80, text, measure);
  assert.deepEqual(tiny.name, []);
  assert.equal(tiny.amount, false);
  assert.equal(tiny.percent, false);
});

test('etichette: nome intero su più righe, nessun testo quando il nome non entra (la legenda lo mostra)', () => {
  const narrow = blockLabelPlan(40, 60, text, measure);
  assert.ok(narrow.name.length >= 2);
  assert.equal(narrow.name.join(''), 'Alimentari');
  const iconOnly = blockLabelPlan(40, 40, { ...text, name: 'Categoria con un nome molto lungo' }, measure);
  assert.deepEqual(iconOnly.name, []);
  assert.equal(iconOnly.usedHeight, 0);
});

test('etichette: il testo si rimpicciolisce prima di spezzare una parola (mobile: Tecnologia, Alimentari)', () => {
  // 412 px phone, narrow tiles: the name stays on one line at a smaller size instead of "Tecnolog/ia".
  for (const name of ['Tecnologia', 'Alimentari']) {
    const plan = blockLabelPlan(66, 60, { ...text, name }, measure);
    assert.deepEqual(plan.name, [name]);
    assert.ok(plan.fontSize < 14 && plan.fontSize >= 10);
  }
  // Roomy tiles keep the regular size.
  assert.equal(blockLabelPlan(240, 180, text, measure).fontSize, 14);
});

test('etichette: stessa percentuale, geometrie diverse e misura del testo effettiva', () => {
  assert.notDeepEqual(blockLabelPlan(200, 160, text, measure), blockLabelPlan(120, 28, text, measure));
  // A wider actual font changes the choice; no category percentage thresholds or character-count heuristic.
  const wide: TextMeasure = (value, size, weight) => measure(value, size, weight) * 2;
  assert.notDeepEqual(blockLabelPlan(100, 40, text, measure), blockLabelPlan(100, 40, text, wide));
  assert.deepEqual(blockLabelPlan(120, 28, { ...text, percent: '90%' }, measure).name, ['Alimentari']);
});

test('etichette: ogni riga e gruppo rientra nello spazio utile, senza caratteri persi', () => {
  for (const width of [0, 12, 28, 40, 64, 96, 120, 200, 320]) for (const height of [0, 14, 28, 40, 60, 96, 140, 240]) {
    for (const name of ['Alimentari', 'Categoria dal nome molto lungo', 'Caffè e tè', '👨‍👩‍👧‍👦 Famiglia']) {
      const value = { ...text, name };
      const plan = blockLabelPlan(width, height, value, measure);
      if (plan.name.length) {
        assert.equal(plan.name.join('').replace(/\s/gu, ''), name.replace(/\s/gu, ''));
        for (const line of plan.name) assert.ok(measure(line, plan.fontSize, '600') <= width - 2 * plan.padding);
      }
      if (plan.amount) assert.ok(measure(text.amount, plan.fontSize, '400') <= width - 2 * plan.padding);
      if (plan.percent) assert.ok(measure(text.percent, plan.fontSize, '400') <= width - 2 * plan.padding);
      if (plan.usedHeight) assert.ok(plan.usedHeight + 2 * plan.padding <= height);
    }
  }
});

test('etichette: caso Alimentari 5%, mobile e desktop senza cambiare le aree della treemap', () => {
  const categories = [{ id: 'main', label: 'Casa', icon: null }, { id: 'food', label: 'Alimentari', icon: null }];
  const entries: ExpenseEntry[] = categories.map((category, index) => ({ id: category.id, amount_minor: index ? 500 : 9500,
    description: category.label, category_id: category.id, expense_date: '2026-11-08', recurrence: null, created_at: '2026-11-08T10:00:00Z' }));
  const source = breakdown(expandOccurrences(entries, '2026-11-08'), categories, 'month', '2026-11-08');
  for (const width of [280, 320, 412, 768, 1200]) {
    const layout = blockLayout(source.series, width);
    const food = layout.tiles.find((tile) => tile.item.key === 'food')!;
    assert.ok(Math.abs(food.w * food.h / (width * layout.height) - 0.05) < 1e-9);
    const bounds = blockTileBounds(food);
    const plan = blockLabelPlan(bounds.w, bounds.h, text, measure);
    if (plan.name.length) assert.equal(plan.name.join('').replace(/\s/gu, ''), 'Alimentari');
    assert.equal(source.total, 10000);
  }
});

test('blocchi: testo bianco nel tema scuro, colore onSurface nel tema chiaro', () => {
  assert.equal(blockLabelColors(true, '#DEE4DD').ink, '#FFFFFF');
  assert.equal(blockLabelColors(false, '#171D19').ink, '#171D19');
  assert.equal(blockLabelColors(false, '#211A14').ink, '#211A14');
});
