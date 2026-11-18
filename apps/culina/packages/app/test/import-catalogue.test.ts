// Importing against the shipped catalogue: the candidate list and its order, the exact match in the
// notebook beating the catalogue's, the origin of a proposal, and saving adopts only what was chosen.
import { beforeEach, expect, test } from 'vitest';
import { candidateIngredients } from '../src/exchange/candidates';
import { buildCookModel, choose, createForUnset } from '../src/exchange/cook-model';
import { saveCookImport } from '../src/exchange/cook-save';
import {
  getIngredient,
  listComponents,
  listIngredients,
  saveRecord,
  startNotebook,
} from '../src/notebook';
import type { IngredientRecord } from '../src/records';
import { freshFactory } from './store-helpers';
import { must } from './must';

const entry = (id: string, name: string, parentId?: string): IngredientRecord => ({
  id,
  name,
  ...(parentId === undefined ? {} : { parentId }),
});
const CATALOGUE = [
  entry('fdc-group-butter', 'Butter'),
  entry('fdc-1', 'Butter, salted', 'fdc-group-butter'),
  entry('fdc-group-flour', 'Wheat flour'),
  entry('fdc-2', 'Wheat flour, white, bread', 'fdc-group-flour'),
  entry('fdc-3', 'Flour'),
];
const BY_ID = new Map(CATALOGUE.map((e) => [e.id, e]));
const FILE = 'Mix @butter{100%g}, @wheat flour{200%g} and @saffron{1%pinch}.\n';

beforeEach(async () => {
  await startNotebook({ indexedDB: freshFactory(), now: () => '2026-11-18T08:00:00.000Z' });
});

const model = () =>
  buildCookModel(FILE, 'bread.cook', {
    ingredients: candidateIngredients(CATALOGUE),
    components: [],
  });

test('candidates: the notebook first, then the catalogue, an adopted entry listed once', async () => {
  expect(candidateIngredients(CATALOGUE).map((c) => [c.id, c.origin])).toEqual(
    CATALOGUE.map((e) => [e.id, 'catalogue']),
  );
  must(await saveRecord('ingredients', entry('mine', 'My salt')));
  must(await saveRecord('ingredients', CATALOGUE[0] as IngredientRecord));
  const list = candidateIngredients(CATALOGUE);
  expect(list.map((c) => [c.id, c.origin])).toEqual([
    ...listIngredients().map((i) => [i.id, 'notebook']),
    ...CATALOGUE.slice(1).map((e) => [e.id, 'catalogue']),
  ]);
  expect(list.find((c) => c.id === 'fdc-1')?.parentId).toBe('fdc-group-butter');
});

test('an exact name in the notebook wins over the catalogue, and the origin is carried', async () => {
  must(await saveRecord('ingredients', entry('butter', 'Butter')));
  const rows = model().rows;
  const butter = rows.find((r) => r.label === 'butter');
  expect(butter?.choice).toEqual({
    type: 'existing',
    target: { kind: 'ingredient', id: 'butter' },
  });
  expect(butter?.options.map((o) => [o.name, o.origin])).toEqual([
    ['Butter', 'notebook'],
    ['Butter', 'catalogue'],
    ['Butter, salted', 'catalogue'],
  ]);
  const wheat = rows.find((r) => r.label === 'wheat flour');
  expect(wheat?.choice).toEqual({
    type: 'existing',
    target: { kind: 'ingredient', id: 'fdc-group-flour' },
  });
  expect(wheat?.options[0]?.origin).toBe('catalogue');
  expect(rows.find((r) => r.label === 'saffron')?.choice).toEqual({ type: 'unset' });
});

test('saving adopts the chosen entries with their parent chain and nothing else', async () => {
  const m = model();
  choose(
    m,
    'butter',
    { type: 'existing', target: { kind: 'ingredient', id: 'fdc-1' } },
    () => ({}),
  );
  createForUnset(m);
  expect(listIngredients()).toHaveLength(0);
  const done = await saveCookImport({ model: m, name: 'Dough', catalogue: BY_ID });
  if (!done.ok) throw new Error(done.error.code);
  const ids = listIngredients().map((i) => i.id);
  expect(ids).toContain('fdc-group-butter');
  expect(ids).toContain('fdc-1');
  expect(ids).toContain('fdc-group-flour');
  expect(ids).not.toContain('fdc-2');
  expect(ids).not.toContain('fdc-3');
  expect(getIngredient('fdc-1')?.parentId).toBe('fdc-group-butter');
  const lines = listComponents()
    .find((c) => c.id === done.id)
    ?.lines.map((l) => l.ref.id);
  expect(lines?.slice(0, 2)).toEqual(['fdc-1', 'fdc-group-flour']);
  expect(listIngredients()).toHaveLength(4);
});

test('a class chosen from the catalogue for a new ingredient is adopted with its chain', async () => {
  const m = model();
  createForUnset(m);
  choose(m, 'saffron', { type: 'new', parentId: 'fdc-1' }, () => ({}));
  must(await saveCookImport({ model: m, name: 'Dough', catalogue: BY_ID }));
  expect(getIngredient('fdc-1')?.parentId).toBe('fdc-group-butter');
  expect(listIngredients().find((i) => i.name === 'saffron')?.parentId).toBe('fdc-1');
});
