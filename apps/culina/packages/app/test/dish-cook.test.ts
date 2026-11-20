// A dish put together from components (docs/behaviour.md, "Assembly and cooking a dish"): its
// assembly steps use slots as a component's steps use lines, and cooking runs through the
// components in the order of the slots and then through the assembly. A component that is ready in
// stock is one step. The notebook here is built in memory.
import type { Technique } from '@culina/engine';
import { expect, test } from 'vitest';
import { dishCookView, dishStepLines } from '../src/components/steps-view';
import { newStepForm, type StepForm } from '../src/editor/component-form';
import {
  dishFormFromRecord,
  dishFormToRecord,
  dishProblems,
  newDishForm,
  type DishForm,
} from '../src/editor/dish-form';
import { buildNotebook } from '../src/notebook/build';
import type { ComponentRecord, DishRecord } from '../src/records';
import { must } from './must';

const ing = (id: string) => ({ kind: 'ingredient' as const, id });
const comp = (id: string) => ({ kind: 'component' as const, id });
const technique = (id: string, en: string): Technique => ({
  id,
  name: { en, de: en },
  watch: { en: `Watch ${en}.`, de: `Achte auf ${en}.` },
  why: { en: 'Because.', de: 'Darum.' },
  level: 'textbook',
  sources: [{ title: 'A book', place: 'p. 1', isbn: '9780000000002', sentence: 'It is so.' }],
});
const KNOWN = [technique('pan-fry', 'Pan-frying'), technique('boil', 'Boiling')];

const PATTY: ComponentRecord = {
  id: 'u-patty',
  name: 'Patties',
  lines: [
    { key: 'l1', ref: ing('beef'), amount: { value: 500, unit: 'g' } },
    { key: 'l2', ref: ing('onion'), amount: { value: 100, unit: 'g' } },
  ],
  steps: [
    { action: 'mix', uses: ['l1', 'l2'] },
    { technique: 'pan-fry', uses: ['l1'], time: { value: 8, unit: 'min' } },
  ],
  version: { family: 'u-patty', date: '2026-11-20' },
};
const MASH: ComponentRecord = {
  id: 'u-mash',
  name: 'Mash',
  lines: [{ key: 'l1', ref: ing('potato'), amount: { value: 800, unit: 'g' } }],
  steps: [
    { technique: 'boil', uses: ['l1'] },
    { action: 'mash', uses: ['l1'] },
  ],
  version: { family: 'u-mash', date: '2026-11-20' },
};
const nb = buildNotebook(
  [
    { id: 'beef', name: 'Beef' },
    { id: 'onion', name: 'Onion' },
    { id: 'potato', name: 'Potato' },
    { id: 'mayo', name: 'Mayonnaise' },
  ],
  [PATTY, MASH],
);
const PLATE: DishRecord = {
  id: 'u-plate',
  name: 'Patties with mash',
  portions: 2,
  slots: [
    { key: 's1', role: 'main', ref: comp('u-patty'), amount: { value: 150, unit: 'g' } },
    { key: 's2', role: 'starch', ref: comp('u-mash'), amount: { value: 200, unit: 'g' } },
    { role: 'sauce', ref: ing('mayo'), amount: { value: 20, unit: 'g' } },
  ],
  steps: [{ action: 'serve', uses: ['s1', 's2'], note: 'mayonnaise on the side' }],
  version: { family: 'u-plate', date: '2026-11-20' },
};
const options = { fromStock: (name: string): string => `From stock: ${name}` };
const cook = (dish = PLATE, ready: string[] = [], learned: string[] = []) =>
  dishCookView(nb, dish, dish.portions ?? 1, 'en', KNOWN, new Set(learned), {
    ...options,
    ready: (id) => ready.includes(id),
  });

test('the editor keeps the assembly steps of a dish and the keys of its slots', () => {
  const built = dishFormToRecord(dishFormFromRecord(PLATE), '2026-11-20');
  if (!built.ok) throw new Error(JSON.stringify(built.problems));
  expect(built.record.steps).toEqual(PLATE.steps);
  expect(built.record.slots.map((s) => s.key)).toEqual(['s1', 's2', undefined]);
});

test('an assembly step is stored by its word and the slots it uses', () => {
  const step = (over: Partial<StepForm>): StepForm => ({ ...newStepForm(), ...over });
  const form: DishForm = {
    ...newDishForm('u-new'),
    name: 'Plate',
    slots: [{ role: 'main', ref: comp('u-patty'), amount: '150', unit: 'g', key: 's1' }],
    steps: [step({ word: 'a:serve', uses: ['s1', 'gone'] }), step({})],
  };
  const built = dishFormToRecord(form, '2026-11-20');
  if (!built.ok) throw new Error(JSON.stringify(built.problems));
  // A slot that is no longer there is not used, and the empty step is left out.
  expect(built.record.steps).toEqual([{ action: 'serve', uses: ['s1'] }]);
  expect(dishProblems({ ...form, steps: [step({ uses: ['s1'] })] })).toEqual([
    { code: 'step', index: 0 },
  ]);
});

test('a dish without assembly stores none, and an older draft still saves', () => {
  const { steps: _steps, ...older } = dishFormFromRecord({ ...PLATE, steps: [] });
  void _steps;
  const built = dishFormToRecord(older, '2026-11-20');
  expect(built.ok && 'steps' in built.record).toBe(false);
});

test('cooking a dish: its components in the order of the slots, then the assembly', () => {
  const steps = cook();
  expect(steps.map((s) => [s.number, s.component, s.text])).toEqual([
    [1, 'Patties', 'Mix'],
    [2, 'Patties', 'Pan-frying'],
    [3, 'Mash', 'Boiling'],
    [4, 'Mash', 'Mash'],
    [5, 'Patties with mash', 'Serve · mayonnaise on the side'],
  ]);
  // The note of a skill shows at its first step in the whole dish.
  expect(steps.map((s) => s.note)).toEqual([false, true, true, false, false]);
  expect(cook(PLATE, [], ['boil']).map((s) => s.note)).toEqual([false, true, false, false, false]);
});

test('the amounts of a component are those the dish needs for its portions', () => {
  const steps = cook();
  // 150 g per portion, 2 portions: 300 g of patties; one run is 600 g of lines, so half a run.
  expect(must(steps[0]).lines.map((l) => [l.name, l.amount])).toEqual([
    ['Beef', '250 g'],
    ['Onion', '50 g'],
  ]);
  // 200 g of mash per portion: 400 g of a run of 800 g.
  expect(must(steps[2]).lines.map((l) => l.amount)).toEqual(['400 g']);
  // With a recorded yield the run is counted by what comes out: 300 g of 400 g.
  const yielding = buildNotebook(
    [
      { id: 'beef', name: 'Beef' },
      { id: 'onion', name: 'Onion' },
      { id: 'potato', name: 'Potato' },
    ],
    [{ ...PATTY, yield: { amount: { value: 400, unit: 'g' }, source: 'user' } }, MASH],
  );
  const scaled = dishCookView(yielding, PLATE, 2, 'en', KNOWN, new Set(), options);
  expect(must(scaled[0]).lines.map((l) => l.amount)).toEqual(['375 g', '75 g']);
  // A slot without an amount leaves the component as it is written.
  const loose: DishRecord = {
    ...PLATE,
    slots: [{ key: 's1', role: 'main', ref: comp('u-patty') }],
    steps: [],
  };
  expect(must(cook(loose)[0]).lines.map((l) => l.amount)).toEqual(['500 g', '100 g']);
});

test('an assembly step shows the slots it uses with their amounts for the portions', () => {
  const last = must(cook().at(-1));
  expect(last.lines.map((l) => [l.name, l.amount])).toEqual([
    ['Patties', '300 g'],
    ['Mash', '400 g'],
  ]);
});

test('a component that is ready in stock is one step, and its skill is not taught there', () => {
  const steps = cook(PLATE, ['u-mash']);
  expect(steps.map((s) => [s.component, s.text])).toEqual([
    ['Patties', 'Mix'],
    ['Patties', 'Pan-frying'],
    ['Mash', 'From stock: Mash'],
    ['Patties with mash', 'Serve · mayonnaise on the side'],
  ]);
  expect(steps.map((s) => s.note)).toEqual([false, true, false, false]);
  expect(must(steps[2]).lines).toEqual([]);
});

test('a component that fills two slots is made once, for both', () => {
  const twice: DishRecord = {
    ...PLATE,
    slots: [
      { key: 's1', role: 'main', ref: comp('u-patty'), amount: { value: 100, unit: 'g' } },
      { key: 's2', role: 'garnish', ref: comp('u-patty'), amount: { value: 50, unit: 'g' } },
    ],
    steps: [],
  };
  const steps = cook(twice);
  expect(steps.map((s) => s.text)).toEqual(['Mix', 'Pan-frying']);
  // 150 g per portion in all, 2 portions: half a run again.
  expect(must(steps[0]).lines.map((l) => l.amount)).toEqual(['250 g', '50 g']);
});

test('a dish of ingredients only, or of components without steps, has nothing to cook', () => {
  const plain: DishRecord = {
    ...PLATE,
    slots: [{ role: 'sauce', ref: ing('mayo') }],
    steps: [],
  };
  expect(cook(plain)).toEqual([]);
});

test('the dish lists its assembly, one line per step', () => {
  expect(dishStepLines(nb, PLATE, 'en', KNOWN)).toEqual([
    'Serve: Patties, Mash · mayonnaise on the side',
  ]);
  expect(dishStepLines(nb, { ...PLATE, steps: [] }, 'en', KNOWN)).toEqual([]);
});
