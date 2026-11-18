// Properties of the finder that no single vector shows: a substitute never changes the amount a
// line needs, and the result does not depend on the order of the stock.
import { expect, test } from 'vitest';
import { makeable } from '../src/index';
import type { MakeableInput, MakeableStockItem } from '../src/index';

const base: MakeableInput = {
  today: '2026-11-18',
  ingredients: [
    { id: 'fat' },
    { id: 'ghee', parentId: 'fat' },
    { id: 'oil', parentId: 'fat' },
    { id: 'flour' },
  ],
  components: [
    {
      id: 'c',
      name: 'C',
      version: { family: 'c', date: '2026-11-01' },
      lines: [
        { ref: { kind: 'ingredient', id: 'ghee' }, amount: { value: 30, unit: 'g' } },
        { ref: { kind: 'ingredient', id: 'flour' }, amount: { value: 100, unit: 'g' } },
      ],
    },
  ],
  stock: [],
  options: { maxMissing: 1 },
};

const item = (id: string, ingredient: string, grams?: number): MakeableStockItem => ({
  id,
  ref: { kind: 'ingredient', id: ingredient },
  ...(grams === undefined ? {} : { amount: { value: grams, unit: 'g' as const } }),
});

test.each([5, 30, 30.5, 1000, undefined])(
  'a substitute in stock (%s g) never changes the needed amount',
  (grams) => {
    const result = makeable({ ...base, stock: [item('a', 'oil', grams), item('b', 'flour', 500)] });
    if (!result.ok) throw new Error(result.error.code);
    const line = result.candidates[0]?.lines[0];
    expect(line?.substitution?.substitute).toBe('oil');
    expect(line?.need).toEqual({ value: 30, unit: 'g' });
  },
);

test('the substituted line needs the same amount as without a substitute', () => {
  const needOf = (stock: MakeableStockItem[]) => {
    const r = makeable({ ...base, stock });
    if (!r.ok) throw new Error(r.error.code);
    return r.candidates[0]?.lines[0]?.need;
  };
  const flour = item('b', 'flour', 500);
  expect(needOf([item('a', 'oil', 500), flour])).toEqual(needOf([item('a', 'ghee', 500), flour]));
});

test('the order of the stock does not change the result', () => {
  const stock = [
    item('a', 'oil', 40),
    item('b', 'flour', 500),
    { ...item('c', 'oil', 40), useBy: '2026-11-20' },
  ];
  const forward = makeable({ ...base, stock });
  const backward = makeable({ ...base, stock: [...stock].reverse() });
  expect(backward).toEqual(forward);
});
