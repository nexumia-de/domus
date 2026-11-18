// The catalogue tree on the app side: roots and children, the parent chain, the search that shows
// a matched variant under its parents, the short name, and adopting a variant with its chain.
import { beforeEach, describe, expect, test } from 'vitest';
import { adoptEntry } from '../src/catalogue/adopt';
import { resetCatalogue } from '../src/catalogue/load';
import { catalogueTree, chainOf, searchTree, shortName } from '../src/catalogue/tree';
import { getIngredient, listIngredients, saveRecord, startNotebook } from '../src/notebook';
import type { IngredientRecord } from '../src/records';
import { freshFactory } from './store-helpers';
import { must } from './must';

const entry = (id: string, name: string, parentId?: string): IngredientRecord => ({
  id,
  name,
  ...(parentId === undefined ? {} : { parentId }),
  densityGPerMl: { value: 0.5, source: 'USDA FoodData Central, FDC ID 1, portion: 1 cup = 118 g' },
});
const flour = entry('g-flour', 'Wheat flour');
const white = entry('g-white', 'Wheat flour, white', 'g-flour');
const bread = entry('f-bread', 'Wheat flour, white, bread', 'g-white');
const plain = entry('f-plain', 'Wheat flour, white, plain', 'g-white');
const whole = entry('f-whole', 'Wheat flour, whole-grain', 'g-flour');
const garlic = entry('f-garlic', 'Garlic');
const all = [flour, white, bread, plain, whole, garlic];
const byId = new Map(all.map((e) => [e.id, e]));
const free = () => true;

describe('the tree', () => {
  test('roots hold their children in file order; an unknown or own parent makes a root', () => {
    const roots = catalogueTree([
      ...all,
      entry('f-lost', 'Lost', 'nowhere'),
      entry('f-self', 'Self', 'f-self'),
    ]);
    expect(roots.map((r) => r.entry.id)).toEqual(['g-flour', 'f-garlic', 'f-lost', 'f-self']);
    expect(must(roots[0]).children.map((c) => c.entry.id)).toEqual(['g-white', 'f-whole']);
    expect(must(must(roots[0]).children[0]).children.map((c) => c.entry.id)).toEqual([
      'f-bread',
      'f-plain',
    ]);
  });
  test('the chain is the entries above, root first; a loop or a gap ends it', () => {
    expect(chainOf(bread, byId).map((e) => e.id)).toEqual(['g-flour', 'g-white']);
    expect(chainOf(flour, byId)).toEqual([]);
    const a = entry('a', 'A', 'b');
    const b = entry('b', 'B', 'a');
    expect(chainOf(a, new Map([a, b].map((e) => [e.id, e]))).map((e) => e.id)).toEqual(['b']);
    expect(chainOf(entry('x', 'X', 'gone'), byId)).toEqual([]);
  });
  test('the short name drops the parent name in front, else it is the whole name', () => {
    expect(shortName(bread, white)).toBe('bread');
    expect(shortName(white, flour)).toBe('white');
    expect(shortName(bread, undefined)).toBe('Wheat flour, white, bread');
    expect(shortName(entry('x', 'Other, thing'), flour)).toBe('Other, thing');
  });
});

describe('the search', () => {
  const roots = catalogueTree(all);
  test('a matched variant is shown under the parents that lead to it, which are not hits', () => {
    const found = searchTree(roots, 'white, bread', free);
    expect(found).toHaveLength(1);
    const top = must(found[0]);
    expect(top).toMatchObject({ hit: false, below: 2 });
    expect(must(top.children[0])).toMatchObject({ hit: false, below: 1 });
    expect(must(must(top.children[0]).children[0])).toMatchObject({ hit: true, below: 0 });
    expect(top.entry.id).toBe('g-flour');
  });
  test('a parent that matches is a hit and brings its matching variants', () => {
    const top = must(searchTree(roots, 'wheat FLOUR', free)[0]);
    expect(top).toMatchObject({ hit: true, below: 4 });
  });
  test('entries in the notebook are no hits but stay as the way to their variants', () => {
    const found = searchTree(roots, 'wheat flour', (e) => e.id !== 'g-flour');
    expect(must(found[0])).toMatchObject({ hit: false, below: 4 });
    expect(searchTree(roots, 'garlic', (e) => e.id !== 'f-garlic')).toEqual([]);
  });
  test('an empty text and a text nothing has give nothing', () => {
    expect(searchTree(roots, '  ', free)).toEqual([]);
    expect(searchTree(roots, 'zzz', free)).toEqual([]);
  });
});

describe('adopting with the chain', () => {
  beforeEach(async () => {
    resetCatalogue();
    await startNotebook({ indexedDB: freshFactory(), now: () => '2026-11-18T08:00:00.000Z' });
  });
  const ids = () =>
    listIngredients()
      .map((r) => r.id)
      .sort();

  test('a variant stores its parents and itself, unchanged, root first', async () => {
    const done = await adoptEntry(bread, byId);
    expect(done).toEqual({ ok: true, ref: { kind: 'ingredient', id: 'f-bread' } });
    expect(ids()).toEqual(['f-bread', 'g-flour', 'g-white']);
    expect(getIngredient('g-white')).toEqual(white);
    expect(getIngredient('f-bread')?.parentId).toBe('g-white');
  });
  test('a parent stores just its own chain', async () => {
    await adoptEntry(white, byId);
    expect(ids()).toEqual(['g-flour', 'g-white']);
  });
  test("only what is not there yet is written; the user's change to a parent stays", async () => {
    await adoptEntry(white, byId);
    await saveRecord('ingredients', { ...white, name: 'My white flour' });
    await adoptEntry(plain, byId);
    expect(ids()).toEqual(['f-plain', 'g-flour', 'g-white']);
    expect(getIngredient('g-white')?.name).toBe('My white flour');
  });
  test('a food without parents stores itself; without the catalogue map no chain is written', async () => {
    await adoptEntry(garlic, byId);
    await adoptEntry(whole);
    expect(ids()).toEqual(['f-garlic', 'f-whole']);
  });
  test('a record the store refuses stops the chain and is reported', async () => {
    const bad = { ...flour, id: 'Not A Slug' };
    const child = entry('f-child', 'Bad, child', 'Not A Slug');
    const done = await adoptEntry(child, new Map([bad, child].map((e) => [e.id, e])));
    expect(done.ok).toBe(false);
    expect(ids()).toEqual([]);
  });
});
