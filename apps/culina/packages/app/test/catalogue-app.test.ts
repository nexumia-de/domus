// The app side of the catalogue: reading the file, loading it once, and copying an entry into
// the notebook through the ordinary save path.
import { beforeEach, expect, test } from 'vitest';
import { adoptEntry } from '../src/catalogue/adopt';
import { loadCatalogue, readCatalogue, resetCatalogue, type Fetcher } from '../src/catalogue/load';
import { getIngredient, listIngredients, startNotebook } from '../src/notebook';
import type { IngredientRecord } from '../src/records';
import { freshFactory } from './store-helpers';
import { must } from './must';

const entry = (id: string, name: string): IngredientRecord => ({
  id,
  name,
  densityGPerMl: {
    value: 0.575,
    source: 'USDA FoodData Central, FDC ID 1, portion: 1 cup = 136 g',
  },
});
const file = (...ingredients: unknown[]) => ({
  format: 'culina-ingredient-catalogue',
  formatVersion: 1,
  ingredients,
});
const answer =
  (body: unknown, ok = true): Fetcher =>
  async () => ({ ok, json: async () => body });

beforeEach(async () => {
  resetCatalogue();
  await startNotebook({ indexedDB: freshFactory(), now: () => '2026-11-18T08:00:00.000Z' });
});

test('readCatalogue keeps valid entries sorted by name and refuses other files', () => {
  const bad = { id: 'Not A Slug', name: 'Bad' };
  const read = readCatalogue(file(entry('fdc-2', 'Water'), bad, entry('fdc-1', 'Garlic')));
  expect(read?.map((e) => e.name)).toEqual(['Garlic', 'Water']);
  expect(readCatalogue({ ...file(), formatVersion: 2 })).toBeUndefined();
  expect(readCatalogue({ ...file(), format: 'culina-export' })).toBeUndefined();
  expect(readCatalogue(null)).toBeUndefined();
  expect(
    readCatalogue({ format: 'culina-ingredient-catalogue', formatVersion: 1 }),
  ).toBeUndefined();
});

test('loadCatalogue fetches catalogue.json once and shares the result', async () => {
  const urls: string[] = [];
  const fetcher: Fetcher = async (url) => {
    urls.push(url);
    return { ok: true, json: async () => file(entry('fdc-1', 'Garlic')) };
  };
  const [first, second] = await Promise.all([loadCatalogue(fetcher), loadCatalogue(fetcher)]);
  expect(first).toBe(second);
  expect(await loadCatalogue(fetcher)).toBe(first);
  expect(urls).toEqual(['catalogue.json']);
});

test('a load that does not work gives undefined and is tried again later', async () => {
  expect(await loadCatalogue(answer({}, false))).toBeUndefined();
  expect(await loadCatalogue(answer('nonsense'))).toBeUndefined();
  const refused: Fetcher = async () => {
    throw new Error('offline');
  };
  expect(await loadCatalogue(refused)).toBeUndefined();
  expect(await loadCatalogue(answer(file(entry('fdc-1', 'Garlic'))))).toHaveLength(1);
});

test('adoptEntry stores the entry unchanged and does not overwrite it the second time', async () => {
  const garlic = entry('fdc-1', 'Garlic');
  const done = await adoptEntry(garlic);
  expect(done).toEqual({ ok: true, ref: { kind: 'ingredient', id: 'fdc-1' } });
  expect(getIngredient('fdc-1')).toEqual(garlic);
  // The user changes it; choosing the entry again keeps the change.
  const changed = { ...garlic, name: 'My garlic' };
  await import('../src/notebook').then((n) => n.saveRecord('ingredients', changed));
  await adoptEntry(garlic);
  expect(must(listIngredients()[0]).name).toBe('My garlic');
  expect(listIngredients()).toHaveLength(1);
});

test('adoptEntry reports a record the store refuses', async () => {
  const done = await adoptEntry({ id: 'Not A Slug', name: 'Bad' });
  expect(done.ok).toBe(false);
});
