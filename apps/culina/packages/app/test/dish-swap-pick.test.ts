// Alternatives per slot and the random pick (docs/behaviour.md, "Alternatives and the random
// pick"): the candidates of a role, the dish with a filling swapped as it is shown and cooked, the
// pick with fixed random numbers, and the prefill of the dish editor. The notebook here is built
// in memory, the stock is a list of ids and the random numbers are given: no store, no browser,
// no `Math.random`.
import { expect, test } from 'vitest';
import { dishCookView, dishStepLines } from '../src/components/steps-view';
import { alternativesFor, roleCandidates, withSwaps } from '../src/dishes/alternatives';
import { candidatesOf, pickFrom, roll, rollRole } from '../src/dishes/pick';
import { dishRaw } from '../src/dishes/raw';
import { clearSwaps, setSwap, swapsOf } from '../src/dishes/session';
import { slotRows } from '../src/dishes/slots';
import { dishFormToRecord } from '../src/editor/dish-form';
import { dishFormFromPick, setDishPrefill, takeDishPrefill } from '../src/editor/prefill';
import { asNextVersion } from '../src/editor/version-save';
import { buildNotebook } from '../src/notebook/build';
import type { ComponentRecord, DishRecord } from '../src/records';
import { must } from './must';

const ing = (id: string) => ({ kind: 'ingredient' as const, id });
const comp = (id: string) => ({ kind: 'component' as const, id });
const component = (
  id: string,
  name: string,
  role: string | undefined,
  ingredient: string,
  g: number,
  action: string,
  family = id,
): ComponentRecord => ({
  id,
  name,
  ...(role === undefined ? {} : { role }),
  lines: [{ key: 'l1', ref: ing(ingredient), amount: { value: g, unit: 'g' } }],
  yield: { amount: { value: g, unit: 'g' }, source: 'user' },
  steps: [{ action, uses: ['l1'] }],
  version: { family, date: '2026-11-20' },
});

const PATTY = component('u-patty', 'Patties', 'main', 'beef', 500, 'mix');
const MASH = component('u-mash', 'Mash', 'starch', 'potato', 800, 'mash');
const RICE = component('u-rice', 'Rice', 'starch', 'rice', 400, 'drain');
const FRIES = component('u-fries', 'Fries', 'starch', 'potato', 600, 'drain');
const GRAVY = component('u-gravy', 'Gravy', 'sauce', 'stock', 300, 'strain');
const PLAIN = component('u-plain', 'Dough', undefined, 'flour', 500, 'mix');
// A second version of the mash: the notebook holds both ids, both with the head's content.
const MASH_2: ComponentRecord = { ...MASH, id: 'u-mash-2' };
const nb = buildNotebook(
  [
    { id: 'beef', name: 'Beef' },
    { id: 'potato', name: 'Potato' },
    { id: 'rice', name: 'Rice grain' },
    { id: 'stock', name: 'Stock' },
    { id: 'flour', name: 'Flour' },
    { id: 'mayo', name: 'Mayonnaise' },
  ],
  [PATTY, MASH, MASH_2, RICE, FRIES, GRAVY, PLAIN],
);
const PLATE: DishRecord = {
  id: 'u-plate',
  name: 'Patties with mash',
  portions: 2,
  slots: [
    { key: 's1', role: 'main', ref: comp('u-patty'), amount: { value: 150, unit: 'g' } },
    { key: 's2', role: 'starch', ref: comp('u-mash-2'), amount: { value: 200, unit: 'g' } },
    { role: 'sauce', ref: ing('mayo'), amount: { value: 20, unit: 'g' } },
  ],
  steps: [{ action: 'serve', uses: ['s1', 's2'] }],
  version: { family: 'u-plate', date: '2026-11-20' },
};
const slot = (index: number) => must(PLATE.slots[index], `slot ${index}`);
const names = (list: readonly { name: string }[]): string[] => list.map((c) => c.name);

test('the candidates are the components that name a role, each family once, by name', () => {
  const all = roleCandidates(nb);
  expect(all.map((c) => [c.id, c.role])).toEqual([
    ['u-fries', 'starch'],
    ['u-gravy', 'sauce'],
    ['u-mash', 'starch'],
    ['u-patty', 'main'],
    ['u-rice', 'starch'],
  ]);
  // A component without a role is no candidate; the two version ids of the mash are one.
  expect(names(all)).not.toContain('Dough');
});

test('the alternatives of a slot are the other components of its role', () => {
  // The slot stores a version id of the mash: the mash itself is not its own alternative.
  expect(names(alternativesFor(nb, slot(1)))).toEqual(['Fries', 'Rice']);
  // The only component of its role has none, and a slot filled by an ingredient has none.
  expect(alternativesFor(nb, slot(0))).toEqual([]);
  expect(alternativesFor(nb, slot(2))).toEqual([]);
  // The role is the slot's, not the component's: a mash put in a sauce slot is offered sauces.
  expect(names(alternativesFor(nb, { role: 'sauce', ref: comp('u-mash') }))).toEqual(['Gravy']);
});

test('a swap changes the filling and nothing else; without a swap the dish itself comes back', () => {
  expect(withSwaps(nb, PLATE, new Map()).dish).toBe(PLATE);
  const { dish, swapped } = withSwaps(nb, PLATE, new Map([[1, 'u-rice']]));
  expect(swapped).toEqual([{ index: 1, from: 'Mash', to: 'Rice' }]);
  expect(dish.slots[1]).toEqual({ ...slot(1), ref: comp('u-rice') });
  expect(dish.slots[0]).toBe(slot(0));
  expect({ ...dish, slots: PLATE.slots }).toEqual(PLATE);
  // The stored dish is untouched.
  expect(slot(1).ref.id).toBe('u-mash-2');
});

test('a swap that cannot be is left out', () => {
  const none = (swaps: [number, string][]) => withSwaps(nb, PLATE, new Map(swaps));
  // The stored filling in another version id, a component that is gone, an ingredient slot, no slot.
  expect(none([[1, 'u-mash']]).dish).toBe(PLATE);
  expect(none([[1, 'u-gone']]).dish).toBe(PLATE);
  expect(none([[2, 'u-gravy']]).dish).toBe(PLATE);
  expect(none([[7, 'u-rice']]).dish).toBe(PLATE);
});

test('the swapped dish is what is shown: amounts and raw ingredients', () => {
  const { dish } = withSwaps(nb, PLATE, new Map([[1, 'u-rice']]));
  const rows = slotRows(nb, dish, 2);
  expect(rows.map((r) => [r.name, r.totalG])).toEqual([
    ['Patties', 300],
    ['Rice', 400],
    ['Mayonnaise', 40],
  ]);
  const raw = dishRaw(nb, rows);
  expect(raw.rows.map((r) => r.name)).toContain('Rice grain');
  expect(raw.rows.map((r) => r.name)).not.toContain('Potato');
  // Control: the stored dish has the potato and no rice.
  const stored = dishRaw(nb, slotRows(nb, PLATE, 2));
  expect(stored.rows.map((r) => r.name)).toContain('Potato');
  expect(stored.rows.map((r) => r.name)).not.toContain('Rice grain');
});

const cook = (dish: DishRecord, ready: string[] = []) =>
  dishCookView(nb, dish, dish.portions ?? 1, 'en', [], new Set(), {
    fromStock: (name) => `From stock: ${name}`,
    ready: (id) => ready.includes(id),
  });

test('the swapped dish is what is cooked: the steps of the new filling, then the assembly', () => {
  const { dish } = withSwaps(nb, PLATE, new Map([[1, 'u-rice']]));
  const steps = cook(dish);
  expect(steps.map((s) => [s.component, s.text])).toEqual([
    ['Patties', 'Mix'],
    ['Rice', 'Drain'],
    ['Patties with mash', 'Serve'],
  ]);
  // 200 g per portion, 2 portions: one run of the rice (400 g).
  expect(steps[1]?.lines.map((l) => [l.name, l.amount])).toEqual([['Rice grain', '400 g']]);
  // The assembly keeps using the slot by its key, now with the new filling.
  expect(steps[2]?.lines.map((l) => l.name)).toEqual(['Patties', 'Rice']);
  expect(dishStepLines(nb, dish, 'en', [])).toEqual(['Serve: Patties, Rice']);
  // Control: the stored dish cooks the mash.
  expect(cook(PLATE).map((s) => s.component)).toEqual(['Patties', 'Mash', 'Patties with mash']);
  // A swapped-in component that is ready in stock is one step.
  expect(cook(dish, ['u-rice'])[1]?.text).toBe('From stock: Rice');
});

test('the session keeps the swaps of a dish in memory until they are cleared', () => {
  expect(swapsOf('u-plate').size).toBe(0);
  setSwap('u-plate', 1, 'u-rice');
  setSwap('u-plate', 1, 'u-fries');
  expect([...swapsOf('u-plate')]).toEqual([[1, 'u-fries']]);
  expect(swapsOf('u-other').size).toBe(0);
  expect(withSwaps(nb, PLATE, swapsOf('u-plate')).swapped).toEqual([
    { index: 1, from: 'Mash', to: 'Fries' },
  ]);
  clearSwaps('u-plate');
  expect(swapsOf('u-plate').size).toBe(0);
});

test('"Keep as my version" stores the swapped dish as the next version of the family', () => {
  const { dish } = withSwaps(nb, PLATE, new Map([[1, 'u-rice']]));
  const next = asNextVersion(
    dish,
    false,
    { change: 'Rice in place of Mash' },
    'u-new',
    '2026-11-21',
  );
  expect(next.id).toBe('u-new');
  expect(next.version).toEqual({
    family: 'u-plate',
    parent: 'u-plate',
    date: '2026-11-21',
    change: 'Rice in place of Mash',
  });
  expect(next.slots.map((s) => s.ref.id)).toEqual(['u-patty', 'u-rice', 'mayo']);
  expect(next.steps).toEqual(PLATE.steps);
});

const ALL = roleCandidates(nb);
const free = { onlyStock: false, inStock: () => false };
const numbers = (...list: number[]) => {
  const left = [...list];
  return (): number => must(left.shift(), 'a random number');
};

test('a number from 0 to 1 picks one of the list in equal shares', () => {
  const starch = candidatesOf('starch', ALL, free);
  expect(names(starch)).toEqual(['Fries', 'Mash', 'Rice']);
  expect(pickFrom(starch, 0)?.name).toBe('Fries');
  expect(pickFrom(starch, 0.33)?.name).toBe('Fries');
  expect(pickFrom(starch, 0.34)?.name).toBe('Mash');
  expect(pickFrom(starch, 0.67)?.name).toBe('Rice');
  expect(pickFrom(starch, 0.999999)?.name).toBe('Rice');
  // A number outside the range still gives one of the list.
  expect(pickFrom(starch, 1)?.name).toBe('Rice');
  expect(pickFrom(starch, -1)?.name).toBe('Fries');
  expect(pickFrom(starch, Number.NaN)?.name).toBe('Fries');
  expect(pickFrom([], 0.5)).toBeUndefined();
});

test('the roll picks one component per role, in the order of the roles', () => {
  const picks = roll(['main', 'starch', 'sauce'], ALL, free, numbers(0.9, 0.5, 0));
  expect(picks.map((p) => [p.role, p.choice?.name, p.of])).toEqual([
    ['main', 'Patties', 1],
    ['starch', 'Mash', 3],
    ['sauce', 'Gravy', 1],
  ]);
  // Other numbers, another starch; the roles with one candidate stay.
  expect(
    roll(['main', 'starch', 'sauce'], ALL, free, numbers(0, 0.99, 0)).map((p) => p.choice?.name),
  ).toEqual(['Patties', 'Rice', 'Gravy']);
});

test('a role with no candidate is empty and takes no random number', () => {
  // Two numbers for three roles: the crunch in the middle takes none.
  const picks = roll(['main', 'crunch', 'starch'], ALL, free, numbers(0, 0));
  expect(picks.map((p) => [p.role, p.choice?.name, p.of])).toEqual([
    ['main', 'Patties', 1],
    ['crunch', undefined, 0],
    ['starch', 'Fries', 3],
  ]);
  expect(picks[1]).toEqual({ role: 'crunch', of: 0 });
});

test('only from stock: a component counts when it is in stock', () => {
  const stocked = { onlyStock: true, inStock: (id: string) => ['u-rice', 'u-gravy'].includes(id) };
  const picks = roll(['main', 'starch', 'sauce'], ALL, stocked, numbers(0, 0));
  expect(picks.map((p) => [p.role, p.choice?.name, p.of])).toEqual([
    ['main', undefined, 0],
    ['starch', 'Rice', 1],
    ['sauce', 'Gravy', 1],
  ]);
  // Control: the same numbers without the option pick from all three starches.
  expect(roll(['starch'], ALL, { ...stocked, onlyStock: false }, numbers(0))[0]?.choice?.name).toBe(
    'Fries',
  );
});

test('rolling one role again gives another component when there is one', () => {
  // Without `not` the number 0 would give the fries again.
  expect(rollRole('starch', ALL, free, numbers(0), 'u-fries').choice?.name).toBe('Mash');
  expect(rollRole('starch', ALL, free, numbers(0.99), 'u-fries').choice?.name).toBe('Rice');
  expect(rollRole('starch', ALL, free, numbers(0)).choice?.name).toBe('Fries');
  // The only one of its role stays.
  expect(rollRole('main', ALL, free, numbers(0.5), 'u-patty').choice?.name).toBe('Patties');
});

test('"Make it a dish" hands the picks to the dish editor once, as slots without amounts', () => {
  expect(takeDishPrefill()).toBeUndefined();
  setDishPrefill({
    slots: [
      { role: 'main', componentId: 'u-patty' },
      { role: 'starch', componentId: 'u-rice' },
    ],
  });
  const prefill = must(takeDishPrefill(), 'prefill');
  expect(takeDishPrefill()).toBeUndefined();
  const form = dishFormFromPick(prefill, 'u-new');
  expect(form.isNew).toBe(true);
  expect(form.name).toBe('');
  expect(form.slots).toEqual([
    { role: 'main', ref: comp('u-patty'), amount: '', unit: 'g' },
    { role: 'starch', ref: comp('u-rice'), amount: '', unit: 'g' },
  ]);
  // The form needs only a name to be a dish.
  const unnamed = dishFormToRecord(form, '2026-11-20');
  expect(unnamed.ok ? [] : unnamed.problems).toEqual([{ code: 'name' }]);
  const saved = dishFormToRecord({ ...form, name: 'Thrown together' }, '2026-11-20');
  expect(saved.ok && saved.record.slots).toEqual([
    { role: 'main', ref: comp('u-patty') },
    { role: 'starch', ref: comp('u-rice') },
  ]);
});
