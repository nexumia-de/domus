// The one cached accessor for the dish entries: a second call derives nothing again, and a load of
// the shipped content or of the catalogue names, or a change of the notebook, drops what it
// depends on. On the fictional example dishes and an in-memory notebook cache (no store, no
// browser); the timing gain itself is not measured here.
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { derivations, dishEntries, dishEntriesByKey } from '../src/browse/entries';
import { resetCatalogue } from '../src/catalogue/load';
import { loadContent, resetContent } from '../src/classics/content';
import { loadNames } from '../src/classics/names';
import { reset, state } from '../src/notebook/state';
import type { DishRecord } from '../src/records';
import { EXAMPLE_CLASSICS } from './classics-fixture';

const content = (classics = EXAMPLE_CLASSICS) => ({
  ok: true,
  json: () =>
    Promise.resolve({ format: 'culina-classics', formatVersion: 1, classics, techniques: [] }),
});

const dish = (id: string): DishRecord =>
  ({ id, name: id, slots: [], version: { family: id, date: '2026-11-01' } }) as DishRecord;

beforeEach(async () => {
  reset();
  resetContent();
  await loadContent(() => Promise.resolve(content()));
});
afterEach(() => {
  reset();
  resetContent();
  resetCatalogue();
  vi.unstubAllGlobals();
});

const counts = () => ({ ...derivations });

test('a second call derives nothing again and hands out the same entries', () => {
  const first = dishEntries();
  const before = counts();
  const second = dishEntries();
  expect(second).toBe(first);
  expect(dishEntriesByKey().get(`shipped:${EXAMPLE_CLASSICS[0]?.id}`)?.origin).toBe('shipped');
  expect(counts()).toEqual(before);
});

test('a load of the shipped content drops the shipped entries, not the own ones', async () => {
  state.dishes = [dish('mine')];
  dishEntries();
  const before = counts();
  await loadContent(() => Promise.resolve(content(EXAMPLE_CLASSICS.slice(0, 1))));
  const after = dishEntries();
  expect(after.map((e) => e.key)).toEqual(['own:mine', `shipped:${EXAMPLE_CLASSICS[0]?.id}`]);
  expect(counts()).toEqual({ own: before.own, shipped: before.shipped + 1 });
});

test('a change of the notebook drops the own entries, and the shipped ones (their lookup)', () => {
  dishEntries();
  const before = counts();
  state.dishes = [dish('new')];
  expect(dishEntries().some((e) => e.key === 'own:new')).toBe(true);
  expect(counts().own).toBe(before.own + 1);
  // The notebook's ingredients come first in the lookup of a shipped dish's ingredient.
  state.ingredients = [...state.ingredients];
  dishEntries();
  expect(counts()).toEqual({ own: before.own + 2, shipped: before.shipped + 1 });
});

test('a load of the catalogue names drops both halves once', async () => {
  dishEntries();
  const before = counts();
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            format: 'culina-ingredient-catalogue',
            formatVersion: 1,
            ingredients: [{ id: 'fdc-173410', name: 'Butter, salted' }],
          }),
      }),
    ),
  );
  await loadNames();
  dishEntries();
  dishEntries();
  expect(counts()).toEqual({ own: before.own + 1, shipped: before.shipped + 1 });
});
