// One run of a component, read the same by every part of a dish's page (docs/behaviour.md,
// Dishes): the ingredients and the cook screen (`dishParts`) and "What goes in, all the way down"
// and the nutrition (`dishRaw`) divide a slot's grams by one run of the component as the engine
// weighs it (`runWeight`); that run includes one run of a component it names without an amount,
// and it is not known when a line of it, at any depth, cannot be weighed. Then no reader scales
// the component: the page shows it as written, one run, and says why; the total list does not add
// it up and says why. Found by two reviews on 2026-11-24. Invented ingredients and components; not
// proved here: the screen itself (the note is drawn by `ingredientsBlock`).
import { expect, test } from 'vitest';
import { dishCookView, dishParts } from '../src/components/steps-view';
import { dishRaw } from '../src/dishes/raw';
import { slotRows } from '../src/dishes/slots';
import { buildNotebook } from '../src/notebook/build';
import type { ComponentRecord, DishRecord, IngredientRecord } from '../src/records';
import { formatMass } from '../src/shared/mass';

const version = { family: 'f', date: '2026-11-24' };
const g = (value: number) => ({ value, unit: 'g' as const });
const ing = (id: string, amount: { value: number; unit: 'g' | 'ml' }) => ({
  ref: { kind: 'ingredient' as const, id },
  amount,
});
const bechamel: ComponentRecord = {
  id: 'bechamel',
  name: 'Béchamel',
  lines: [ing('butter', g(40)), ing('flour', g(40)), ing('milk', { value: 500, unit: 'ml' })],
  steps: [{ technique: 'roux' }],
  version,
};
const macaroni: ComponentRecord = {
  id: 'macaroni',
  name: 'Macaroni cheese',
  lines: [
    ing('pasta', g(250)),
    ing('cheddar', g(150)),
    { ref: { kind: 'component', id: 'bechamel' } },
  ],
  steps: [{ technique: 'bake' }],
  version,
};
const milk = {
  id: 'milk',
  name: 'Milk',
  densityGPerMl: { value: 1.03, source: 'test' },
} as unknown as IngredientRecord;
/** The milk without a density (as in a notebook that has none), and with one. */
const unweighed = buildNotebook([], [bechamel, macaroni]);
const weighed = buildNotebook([milk], [bechamel, macaroni]);
const dish: DishRecord = {
  id: 'd',
  name: 'Macaroni cheese for two',
  portions: 2,
  slots: [{ role: 'main', ref: { kind: 'component', id: 'macaroni' }, amount: g(400) }],
  version,
};
const options = { fromStock: (name: string) => name };
const amountOf = (lines: readonly { name: string; amount?: string }[], name: string) =>
  lines.find((l) => l.name === name)?.amount;
const NOTE =
  'Béchamel cannot be scaled: milk has no weight here. Weigh its output, or give milk a weight. For one run as written.';

test('the milk weighed: the ingredients, the cook screen and the total list say 201 g of pasta', () => {
  const parts = dishParts(weighed, dish, 2, options);
  const raw = dishRaw(weighed, slotRows(weighed, dish, 2));
  const rawOf = (id: string) => raw.rows.find((r) => r.ingredientId === id)?.g;
  // 800 g of macaroni cheese over one run of 995 g (400 g and the béchamel's 595 g).
  expect(rawOf('pasta')).toBeCloseTo((800 / 995) * 250, 6);
  expect(rawOf('cheddar')).toBeCloseTo((800 / 995) * 150, 6);
  const mac = parts.find((p) => p.componentId === 'macaroni');
  expect(amountOf(mac?.lines ?? [], 'pasta')).toBe(formatMass((800 / 995) * 250, 'g'));
  expect(amountOf(mac?.lines ?? [], 'pasta')).toBe('201 g');
  expect(amountOf(mac?.lines ?? [], 'cheddar')).toBe('121 g');
  expect(mac?.note).toBeUndefined();
  const sauce = parts.find((p) => p.componentId === 'bechamel');
  expect(sauce?.steps).toEqual([{ technique: 'roux' }]);
});

test('the milk without a density: no reader scales it, and each says why', () => {
  const parts = dishParts(unweighed, dish, 2, options);
  const mac = parts.find((p) => p.componentId === 'macaroni');
  const sauce = parts.find((p) => p.componentId === 'bechamel');
  // As written, one run, with the reason under the heading.
  expect(amountOf(mac?.lines ?? [], 'pasta')).toBe('250 g');
  expect(amountOf(sauce?.lines ?? [], 'butter')).toBe('40 g');
  expect(mac?.note).toBe(NOTE);
  expect(sauce?.note).toBe(NOTE);
  // The cook screen says it at every step of both, where the amounts are read.
  const steps = dishCookView(unweighed, dish, 2, 'en', [], new Set(), options);
  expect(steps.filter((s) => s.amountsNote === NOTE).map((s) => s.component)).toEqual([
    'Béchamel',
    'Macaroni cheese',
  ]);
  // The total list adds nothing of it up and lists it with the same words.
  const raw = dishRaw(unweighed, slotRows(unweighed, dish, 2));
  expect(raw.rows).toEqual([]);
  expect(raw.skipped).toEqual([
    {
      name: 'Macaroni cheese',
      why: 'Béchamel cannot be scaled: milk has no weight here. Weigh its output, or give milk a weight.',
    },
  ]);
});

// The same component as a slot and named under an earlier slot: its runs add up, in either order.
test('a béchamel that is a slot and in the macaroni cheese is two runs, whatever the order', () => {
  const plain = (slots: DishRecord['slots']): DishRecord => ({ ...dish, slots });
  const mac = { role: 'main', ref: { kind: 'component' as const, id: 'macaroni' } };
  const sauce = { role: 'sauce', ref: { kind: 'component' as const, id: 'bechamel' } };
  for (const slots of [
    [mac, sauce],
    [sauce, mac],
  ]) {
    const both = plain(slots);
    const parts = dishParts(weighed, both, 2, options);
    const milkOnPage = amountOf(
      parts.find((p) => p.componentId === 'bechamel')?.lines ?? [],
      'Milk',
    );
    const raw = dishRaw(weighed, slotRows(weighed, both, 2));
    expect(raw.rows.find((r) => r.ingredientId === 'milk')?.g).toBeCloseTo(1030, 6);
    expect(milkOnPage).toBe(formatMass(1030, 'g'));
  }
});

// Control: ready in stock, the macaroni cheese is not made, nor its béchamel.
test('a component ready in stock is one step, and what is below it is not made', () => {
  const parts = dishParts(weighed, dish, 2, { ...options, ready: (id) => id === 'macaroni' });
  expect(parts.map((p) => p.componentId)).toEqual(['macaroni', undefined]);
});
