// Runs every vector in vectors/stock against the engine (docs/vectors.md): remaining days of
// an item, use-by suggestions from a recorded shelf life, and using up part of an amount.
import { describe, expect, test } from 'vitest';
import { stockExpiry, useAmount, useBySuggestions } from '../src/index';
import type { Amount, IngredientFacts, ShelfLifeEntry, StockItem } from '../src/index';
import { expectError, loadVectors } from './vector-files';
import type { Vector } from './vector-files';

const vectors = loadVectors('stock');

function run(vector: Vector): void {
  const i = vector.inputs;
  const shelfLife = i.shelfLife as ShelfLifeEntry[] | undefined;
  let result: { ok: boolean; error?: { code: string } };
  if (i.kind === 'stock_expiry') {
    const options = i.soonDays === undefined ? {} : { soonDays: i.soonDays as number };
    result = stockExpiry(i.item as StockItem, i.today as string, shelfLife, options);
  } else if (i.kind === 'stock_suggest') {
    result = useBySuggestions(i.item as StockItem, shelfLife);
  } else if (i.kind === 'stock_use') {
    result = useAmount(i.stock as Amount, i.used as Amount, i.facts as IngredientFacts);
  } else throw new Error(`${vector.id}: unknown vector kind ${i.kind}`);
  if (vector.error_code !== undefined) return expectError(result, vector);
  expect(result, vector.id).toEqual(vector.expected);
}

describe('stock vectors', () => {
  test.each(vectors.map((v) => [v.id, v] as const))('%s', (_id, vector) => run(vector));

  test('the cases the issue names are covered: future, today, past, no use-by, presence only', () => {
    const ids = vectors.map((v) => v.id);
    for (const id of [
      'expiry-future',
      'expiry-today',
      'expiry-past',
      'expiry-no-use-by-with-amount',
      'expiry-no-use-by-presence-only',
    ]) {
      expect(ids, id).toContain(id);
    }
  });

  test('every item of a vector is valid against the stock schema', async () => {
    const { stockValidator } = await import('./validators');
    for (const v of vectors) {
      const item = v.inputs.item as StockItem | undefined;
      if (item === undefined) continue;
      expect(stockValidator(item), `${v.id}: ${JSON.stringify(stockValidator.errors)}`).toBe(true);
    }
  });
});
