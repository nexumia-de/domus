// The store-backed notebook: read at startup, written through the store, never crashing.
import { validateModel } from '@culina/engine';
import { beforeEach, expect, test } from 'vitest';
import {
  addExamples,
  getComponent,
  getDish,
  isEmpty,
  listComponents,
  listDishes,
  listIngredients,
  notebook,
  removeRecord,
  saveRecord,
  startNotebook,
  storeProblem,
  subscribe,
  today,
} from '../src/notebook';
import { dishFormToRecord, dishProblems, newDishForm } from '../src/editor/dish-form';
import {
  ingredientFromForm,
  ingredientProblems,
  emptyIngredientForm,
  roleId,
} from '../src/editor/ingredient-form';
import { draftKey, dropDraft, keepDraft, loadDraft } from '../src/notebook';
import { openStore } from '../src/store';
import type { ComponentRecord } from '../src/records';
import { clockOf, freshFactory } from './store-helpers';
import { must } from './must';

const ID = 'u-3f1c2a52-8d1e-4b7a-9c01-5a1e0c0ffee2';
const record = (name: string, id = ID): ComponentRecord => ({
  id,
  name,
  lines: [{ ref: { kind: 'ingredient', id: 'salt' }, amount: { value: 5, unit: 'g' } }],
  version: { family: id, date: '2026-11-18' },
});
const NOW = '2026-11-18T08:00:00.000Z';

beforeEach(async () => {
  await startNotebook({ indexedDB: freshFactory(), now: () => NOW });
});

test('an empty store gives an empty notebook and no problem', () => {
  expect(isEmpty()).toBe(true);
  expect(storeProblem()).toBeUndefined();
  expect(listComponents()).toEqual([]);
  expect(today()).toBe('2026-11-18');
});

test('a saved record is in the cache, comes back after a restart, and is valid in the store', async () => {
  const factory = freshFactory();
  await startNotebook({ indexedDB: factory, now: () => NOW });
  const seen: number[] = [];
  const stop = subscribe(() => seen.push(1));
  expect((await saveRecord('components', record('Dough'))).ok).toBe(true);
  stop();
  expect(seen).toHaveLength(1);
  expect(getComponent(ID)?.name).toBe('Dough');
  await startNotebook({ indexedDB: factory, now: () => NOW });
  expect(getComponent(ID)?.name).toBe('Dough');
  expect(must(getComponent(ID)).lines).toHaveLength(1);
});

test('a record the store refuses is not shown', async () => {
  const done = await saveRecord('components', { ...record('x'), name: '' });
  expect(done.ok === false && done.error.code).toBe('invalid-record');
  expect(listComponents()).toEqual([]);
});

test('records are listed by name', async () => {
  await saveRecord('components', record('Sauce', 'u-00000000-0000-4000-8000-000000000001'));
  await saveRecord('components', record('apple purée', 'u-00000000-0000-4000-8000-000000000002'));
  await saveRecord('components', record('Dough', 'u-00000000-0000-4000-8000-000000000003'));
  expect(listComponents().map((c) => c.name)).toEqual(['apple purée', 'Dough', 'Sauce']);
});

test('delete is a tombstone and undo puts the kept record again', async () => {
  await saveRecord('components', record('Dough'));
  const removed = await removeRecord('components', ID);
  expect(removed.ok).toBe(true);
  expect(getComponent(ID)).toBeUndefined();
  const kept = must(removed.ok ? removed.removed : undefined);
  expect((await saveRecord('components', kept)).ok).toBe(true);
  expect(getComponent(ID)).toEqual(kept);
  expect((await removeRecord('components', 'u-none')).ok).toBe(false);
});

test('example data is written through the store, once, and is a valid notebook', async () => {
  expect((await addExamples()).ok).toBe(true);
  expect(listComponents().length).toBe(5);
  expect(listDishes().length).toBe(2);
  expect(getDish('example-vegetable-plate')?.name).toMatch(/^Example/);
  const before = listIngredients().length;
  expect((await addExamples()).ok).toBe(true);
  expect(listIngredients().length).toBe(before);
  expect(
    validateModel({
      ingredients: listIngredients(),
      components: listComponents(),
      dishes: listDishes(),
    }).findings,
  ).toEqual([]);
  expect(notebook().ingredientName('flour')).toBe('Flour');
  expect(isEmpty()).toBe(false);
});

test('a store that cannot open leaves the empty read-only notebook and says why', async () => {
  const closed = {
    open: () => {
      throw new DOMException('no', 'SecurityError');
    },
  } as unknown as IDBFactory;
  await startNotebook({ indexedDB: closed });
  expect(storeProblem()).toBe('unavailable');
  expect(listComponents()).toEqual([]);
  const done = await saveRecord('components', record('x'));
  expect(done.ok === false && done.error.code).toBe('unavailable');
});

test('a store from a newer app is refused, never crashes', async () => {
  const factory = freshFactory();
  const first = await openStore({ now: clockOf(NOW), indexedDB: factory });
  if (!first.ok) throw new Error('open');
  first.store.close();
  await new Promise<void>((resolve) => {
    const open = factory.open('culina', 3);
    open.onsuccess = () => {
      const tx = open.result.transaction('meta', 'readwrite');
      tx.objectStore('meta').put({ key: 'schemaVersion', value: 99 });
      tx.oncomplete = () => {
        open.result.close();
        resolve();
      };
    };
  });
  await startNotebook({ indexedDB: factory });
  expect(storeProblem()).toBe('newer-schema');
  expect(listComponents()).toEqual([]);
});

test('drafts go through the store and are gone after dropping', async () => {
  const key = draftKey('component', undefined);
  expect(key).toBe('component:new');
  await keepDraft(key, { name: 'half' });
  expect(await loadDraft(key)).toEqual({ name: 'half' });
  await dropDraft(key);
  expect(await loadDraft(key)).toBeUndefined();
});

test('the dish form: a stored slot always has a filling; portions are whole numbers', () => {
  const form = newDishForm('u-9');
  form.name = 'Plate';
  form.slots = [{ role: 'main', amount: '100', unit: 'g' }];
  expect(dishProblems(form)).toEqual([{ code: 'filling', index: 0 }]);
  form.slots = [{ role: 'main', ref: { kind: 'component', id: 'a' }, amount: '100', unit: 'g' }];
  form.portions = '2.5';
  expect(dishProblems(form)).toEqual([{ code: 'portions' }]);
  form.portions = '4';
  const done = dishFormToRecord(form, '2026-11-18');
  const r = must(done.ok ? done.record : undefined);
  expect(r.portions).toBe(4);
  expect(r.slots[0]).toEqual({
    role: 'main',
    ref: { kind: 'component', id: 'a' },
    amount: { value: 100, unit: 'g' },
  });
  expect(r.version).toEqual({ family: 'u-9', date: '2026-11-18' });
});

test('a new ingredient: role as an id, yield and shelf life as the user entered, source user', () => {
  const form = {
    ...emptyIngredientForm('Fresh herb'),
    role: 'Fresh Herb',
    yieldPercent: '60',
    shelfDays: '5',
    shelfStorage: 'fridge' as const,
  };
  expect(roleId('Fresh Herb')).toBe('fresh-herb');
  expect(roleId('!!')).toBe('');
  expect(ingredientProblems(form)).toEqual([]);
  expect(ingredientFromForm(form, 'u-1')).toEqual({
    id: 'u-1',
    name: 'Fresh herb',
    roles: ['fresh-herb'],
    yields: [{ state: 'raw', percent: 60, source: 'user' }],
    shelfLife: [{ state: 'raw', storage: 'fridge', days: 5, source: 'user' }],
  });
  expect(ingredientProblems({ ...form, name: ' ', yieldPercent: '-1', shelfDays: '1.5' })).toEqual([
    'name',
    'yield',
    'shelf',
  ]);
});

test('an ingredient made inline is stored and found by the picker lists', async () => {
  const made = ingredientFromForm(emptyIngredientForm('Rye flour'), ID);
  expect((await saveRecord('ingredients', must(made))).ok).toBe(true);
  expect(listIngredients().map((i) => i.name)).toEqual(['Rye flour']);
});
