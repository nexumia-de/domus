/* eslint-disable @typescript-eslint/no-non-null-assertion -- fixtures are indexed at known positions */
import { expect, test } from 'vitest';
import { openDatabase } from '../src/store/db';
import { SCHEMA_VERSION, stores } from '../src/store/schema';
import { createCatalog, newUserId, overlay, StoreError, toStoreError } from '../src/store';
import { freshFactory, openFresh, seed, user } from './helpers';

const [syrup, gin] = [user.ingredients[1]!, user.ingredients[0]!];
const [syrupSpec, sour] = [user.specs[0]!, user.specs[1]!];

test('a fresh database has exactly the stores and indexes of schema.ts', async () => {
  const db = await openDatabase({ factory: freshFactory() });
  expect(db.version).toBe(SCHEMA_VERSION);
  expect([...db.objectStoreNames].sort()).toEqual(stores.map((s) => s.name).sort());
  const tx = db.transaction([...db.objectStoreNames]);
  for (const def of stores) {
    const store = tx.objectStore(def.name);
    expect(store.keyPath).toBe(def.keyPath);
    expect([...store.indexNames].sort()).toEqual(def.indexes.map((i) => i.name).sort());
    for (const index of def.indexes) {
      expect(store.index(index.name).keyPath).toEqual(index.keyPath);
      expect(store.index(index.name).unique).toBe(index.unique === true);
    }
  }
  db.close();
});

test('create, read, update and delete for every entity', async () => {
  const store = await openFresh();
  const cases = [
    [store.ingredients, gin, (v: typeof gin) => ({ ...v, name: 'Renamed' }), gin.id],
    [
      store.templates,
      user.templates[0]!,
      (v: object) => ({ ...v, name: 'Renamed' }),
      user.templates[0]!.id,
    ],
    [store.specs, sour, (v: object) => ({ ...v, name: 'Renamed' }), sour.id],
    [
      store.affinities,
      user.affinities[0]!,
      (v: object) => ({ ...v, notes: 'n' }),
      user.affinities[0]!.id,
    ],
    [
      store.stock,
      user.stock[1]!,
      (v: object) => ({ ...v, present: true }),
      user.stock[1]!.ingredientId,
    ],
  ] as const;
  for (const [repo, value, change, key] of cases) {
    const r = repo as unknown as {
      put(v: unknown): Promise<void>;
      get(k: string): Promise<unknown>;
      list(): Promise<unknown[]>;
      delete(k: string): Promise<void>;
    };
    expect(await r.get(key)).toBeUndefined();
    await r.put(value);
    expect(await r.get(key)).toEqual(value);
    await r.put(change(value as never));
    expect(await r.list()).toEqual([change(value as never)]);
    await r.delete(key);
    expect(await r.list()).toEqual([]);
  }
  store.close();
});

test('versions of a lineage come back oldest first', async () => {
  const store = await openFresh();
  const lineageId = newUserId();
  const make = (version: number) => ({ ...sour, id: newUserId(), lineageId, version });
  for (const version of [3, 1, 2]) await store.specs.put(make(version));
  await store.specs.put(syrupSpec);
  expect((await store.specs.versionsOf(lineageId)).map((s) => s.version)).toEqual([1, 2, 3]);
  // The pair (lineage, version) is unique.
  await expect(store.specs.put(make(2))).rejects.toMatchObject({ kind: 'failed' });
  store.close();
});

test('an invalid record is refused with a typed error and nothing is written', async () => {
  const store = await openFresh();
  const broken = { ...gin, level: 'galaxy', abv: 140 } as never;
  const error = await store.ingredients.put(broken).catch((e: unknown) => e);
  expect(error).toBeInstanceOf(StoreError);
  expect(error).toMatchObject({ kind: 'invalid' });
  expect((error as StoreError).details.length).toBeGreaterThan(1);
  expect(await store.ingredients.list()).toEqual([]);
  await expect(
    store.stock.put({ ingredientId: 'x', present: 'yes' } as never),
  ).rejects.toMatchObject({ kind: 'invalid' });
  store.close();
});

test('user entities need a user id; stock may use a seed id', async () => {
  const store = await openFresh();
  await expect(store.ingredients.put({ ...gin, id: 'lemon-juice' })).rejects.toMatchObject({
    kind: 'invalid',
  });
  await expect(store.specs.put({ ...sour, lineageId: 'daiquiri' })).rejects.toMatchObject({
    kind: 'invalid',
  });
  await store.stock.put({ ingredientId: 'lime-juice', present: true });
  store.close();
});

test('seed entities are never present in the user stores', async () => {
  const factory = freshFactory();
  const store = await openFresh({ factory });
  const catalog = createCatalog(seed, store);
  expect((await catalog.ingredients.list()).length).toBe(seed.ingredients.length);
  expect((await catalog.specs.list()).length).toBe(2);
  await store.ingredients.put(gin);
  expect((await catalog.ingredients.list()).length).toBe(seed.ingredients.length + 1);
  // Reading and overlaying wrote nothing: only the one user ingredient is stored.
  expect((await store.ingredients.list()).map((i) => i.id)).toEqual([gin.id]);
  expect(await store.specs.list()).toEqual([]);
  expect(await store.stock.list()).toEqual([]);
  store.close();
});

test('overlay: user entities are added, seed entities win and clashes are reported', async () => {
  const merged = overlay(seed.ingredients, [{ ...gin, id: 'gin' }, syrup]);
  expect(merged.shadowed).toEqual(['gin']);
  expect(merged.entries.find((e) => e.value.id === 'gin')?.origin).toBe('seed');
  expect(merged.entries.find((e) => e.value.id === syrup.id)?.origin).toBe('user');
  const store = await openFresh();
  await store.ingredients.put(syrup);
  const catalog = createCatalog(seed, store);
  expect((await catalog.ingredients.get('rum'))?.origin).toBe('seed');
  expect((await catalog.ingredients.get(syrup.id))?.origin).toBe('user');
  expect(await catalog.ingredients.get('nothing')).toBeUndefined();
  store.close();
});

test('without a store the catalog is the seed alone', async () => {
  const catalog = createCatalog(seed, null);
  expect((await catalog.specs.list()).map((e) => e.origin)).toEqual(['seed', 'seed']);
  expect(await catalog.specs.shadowed()).toEqual([]);
});

test('settings default, save and load', async () => {
  const store = await openFresh();
  expect(await store.settings.load()).toEqual({
    theme: 'system',
    units: 'metric',
    alcoholWithout: 'below-0.5',
    alcoholLow: 'up-to-10',
    backup: { changesSinceExport: 0 },
  });
  await store.settings.set('theme', 'dark');
  await store.settings.set('alcoholLow', 'up-to-15');
  await store.settings.set('alcoholWithout', 'no-such-preset');
  await store.settings.set('backup', {
    changesSinceExport: 3,
    lastExportAt: '2026-11-17T09:30:00Z',
  });
  expect(await store.settings.load()).toEqual({
    theme: 'dark',
    units: 'metric',
    alcoholWithout: 'below-0.5',
    alcoholLow: 'up-to-15',
    backup: { changesSinceExport: 3, lastExportAt: '2026-11-17T09:30:00Z' },
  });
  store.close();
});

test('IndexedDB errors map to typed errors', () => {
  const named = (name: string) => toStoreError(Object.assign(new Error('x'), { name })).kind;
  expect(named('QuotaExceededError')).toBe('quota');
  expect(named('VersionError')).toBe('too-new');
  expect(named('SecurityError')).toBe('unavailable');
  expect(named('DataError')).toBe('failed');
});
