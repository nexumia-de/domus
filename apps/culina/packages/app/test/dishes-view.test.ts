import { expandComponent, toGrams } from '@culina/engine';
import { expect, test } from 'vitest';
import { getDish, notebook } from '../src/demo';
import { DISH_ROLES, inviteText, openRoles } from '../src/dishes/roles';
import { dishRaw } from '../src/dishes/raw';
import { openRows, slotRows } from '../src/dishes/slots';
import type { DishRecord } from '../src/records';
import { notebookOf, readComponentVector } from './component-vectors';
import { must } from './must';

const dish = (id: string): DishRecord => must(getDish(id), id);

test('slots keep the stored order; amounts per portion and totals follow the portions', () => {
  const nb = notebook();
  const d = dish('example-flat-dough-with-sauce');
  const rows = slotRows(nb, d, 4);
  expect(rows.map((r) => r.role)).toEqual(d.slots.map((s) => s.role));
  expect(rows.map((r) => r.roleLabel)).toEqual(['Main element', 'Starch', 'Sauce', 'Garnish']);
  expect(rows.map((r) => r.perPortionG)).toEqual([100, 120, 80, 2]);
  expect(rows.map((r) => r.totalG)).toEqual([400, 480, 320, 8]);
  expect(slotRows(nb, d, 1).map((r) => r.totalG)).toEqual([100, 120, 80, 2]);
  expect(rows.map((r) => r.linked)).toEqual([true, true, true, false]);
  expect(rows[3]?.name).toBe('Parsley');
});

test('a role the dish does not fill is an invitation, in the fixed role order', () => {
  expect(openRoles([])).toEqual([...DISH_ROLES]);
  expect(openRoles(['main', 'starch', 'sauce', 'garnish'])).toEqual(['crunch', 'acid']);
  const plate = dish('example-vegetable-plate');
  expect(openRows(plate)).toEqual([{ role: 'crunch', text: 'Open: add a crunch' }]);
  expect(inviteText('acid')).toBe('Open: add an acid');
  expect(inviteText('weird')).toBe('Open: add a weird');
});

test('the raw list of a dish is the sum of the engine expansions of its slots', () => {
  const nb = notebook();
  const d = dish('example-flat-dough-with-sauce');
  const portions = 6;
  const raw = dishRaw(nb, slotRows(nb, d, portions));
  const expected = new Map<string, number>();
  const add = (id: string, state: string | undefined, g: number) => {
    const key = `${id}/${state}`;
    expected.set(key, (expected.get(key) ?? 0) + g);
  };
  for (const slot of d.slots) {
    const grams =
      must(toGrams(slot.amount ?? { value: 0, unit: 'g' }).ok ? slot.amount?.value : undefined) *
      portions;
    if (slot.ref.kind === 'ingredient') add(slot.ref.id, undefined, grams);
    else {
      const result = expandComponent(nb.components, slot.ref.id, nb.facts, { outputG: grams });
      expect(result.ok).toBe(true);
      if (result.ok) for (const r of result.raw) add(r.ingredientId, r.state, r.g);
    }
  }
  expect(raw.skipped).toEqual([]);
  expect(raw.rows.length).toBe(expected.size);
  for (const row of raw.rows) {
    expect(row.g, row.name).toBeCloseTo(expected.get(`${row.ingredientId}/${row.state}`) ?? NaN, 9);
  }
  expect(raw.rawG).toBeCloseTo(
    [...expected.values()].reduce((a, b) => a + b, 0),
    9,
  );
  expect(raw.unmeasured).toEqual([{ name: 'Salt', where: 'Example: Pan sauce with a stock base' }]);
});

test('three levels down: the dish total follows the nested yield rule', () => {
  const nb = notebook();
  // 60 g of sauce per portion, 2 portions: 120 g of a sauce that yields 400 g takes 0.3 of it;
  // the sauce holds 300 g of stock that yields 1000 g, which holds 200 g of base that yields 360 g.
  const plate = dish('example-vegetable-plate');
  const raw = dishRaw(nb, slotRows(nb, plate, 2));
  const celery = raw.rows.find((r) => r.ingredientId === 'celery');
  const fromSauce = ((120 / 400) * 300) / 1000; // part of the stock made from base
  const baseFromStock = fromSauce * 200; // g of base inside the sauce
  const mainBase = 300; // g of base in the main slot (150 g x 2)
  const baseRun = 360; // output of one run of the base: celery 100 g
  expect(celery?.g).toBeCloseTo(((baseFromStock + mainBase) / baseRun) * 100, 9);
});

test('a component without an output weight is taken as weighing its input, and named', () => {
  const nb = notebook();
  const plate = dish('example-vegetable-plate');
  const rows = slotRows(nb, plate, 3);
  const raw = dishRaw(nb, rows);
  expect(raw.skipped).toEqual([]);
  expect(raw.unweighed).toEqual(['Example: Herb oil']);
  // the slot itself still shows its amount per portion and total
  expect(rows.at(-1)?.perPortionG).toBe(10);
  expect(rows.at(-1)?.totalG).toBe(30);
  expect(raw.rows.find((r) => r.ingredientId === 'lemon-juice')?.g).toBeCloseTo(15, 9);
  // 30 g of an oil whose run is 100 g oil + 20 g parsley (120 g in): a quarter of a run.
  expect(raw.rows.find((r) => r.ingredientId === 'parsley')?.g).toBeCloseTo(5, 9);
  expect(raw.unmeasured.map((u) => u.name)).toContain('Salt');
});

test('a slot with a unit that needs a density, a missing component or no amount never throws', () => {
  const nb = notebookOf(
    readComponentVector('expand-fractional-sub-component').inputs.components ?? [],
  );
  const odd: DishRecord = {
    id: 'odd',
    name: 'Odd',
    version: { family: 'odd', date: '2026-11-18' },
    slots: [
      { role: 'main', ref: { kind: 'ingredient', id: 'oil' }, amount: { value: 100, unit: 'ml' } },
      { role: 'sauce', ref: { kind: 'component', id: 'gone' }, amount: { value: 5, unit: 'g' } },
      { role: 'acid', ref: { kind: 'component', id: 'sauce' } },
      {
        role: 'crunch',
        ref: { kind: 'component', id: 'sauce' },
        amount: { value: 2, unit: 'count' },
      },
      {
        role: 'garnish',
        ref: { kind: 'component', id: 'sauce' },
        amount: { value: 80, unit: 'g' },
      },
    ],
  };
  const rows = slotRows(nb, odd, 2);
  expect(rows[0]?.problem).toMatch(/needs a density/);
  expect(rows[1]?.problem).toMatch(/not in the notebook/);
  // A component slot without an amount, in a dish that stores no portions, is not added up: how
  // many portions one run makes is not known, and nothing is guessed.
  expect(rows[2]?.problem).toMatch(/no amount set/);
  expect(rows[2]?.runs).toBeUndefined();
  expect(rows[3]?.problem).toMatch(/needs an amount by weight/);
  const raw = dishRaw(nb, rows);
  expect(raw.skipped.length).toBe(4);
  // the one slot that can be added up is: 160 g of a sauce that yields 800 g, a fifth of its recipe
  expect(raw.rows.find((r) => r.ingredientId === 'tomato')?.g).toBeCloseTo(140, 9);
  // The same dish for 2 stored portions: that slot is one run for the 2 (since 2026-11-24), shown at
  // 4 portions two runs of 700 g of tomato.
  const stored = slotRows(nb, { ...odd, portions: 2 }, 4);
  expect(stored[2]?.problem).toBeUndefined();
  expect(stored[2]?.runs).toBe(2);
  const four = dishRaw(nb, stored);
  expect(four.skipped.length).toBe(3);
  expect(four.rows.find((r) => r.ingredientId === 'tomato')?.g).toBeCloseTo(280 + 2 * 700, 9);
});
