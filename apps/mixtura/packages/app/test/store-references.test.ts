/* eslint-disable @typescript-eslint/no-non-null-assertion -- fixtures are indexed at known positions */
// Deleting a user entity that others reference is refused with a typed
// `referenced` error that names the referrers (docs/store.md#references).
import { expect, test } from 'vitest';
import { newUserId, StoreError, type LocalStore } from '../src/store';
import { openFresh, user } from './helpers';

const [gin, preparedSyrup] = [user.ingredients[0]!, user.ingredients[1]!];
const [syrupSpec, sour] = [user.specs[0]!, user.specs[1]!];

async function filled(): Promise<LocalStore> {
  const store = await openFresh();
  for (const i of user.ingredients) await store.ingredients.put(i);
  for (const s of user.specs) await store.specs.put(s);
  for (const a of user.affinities) await store.affinities.put(a);
  return store;
}

const refusal = async (work: Promise<unknown>): Promise<StoreError> => {
  const error = await work.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(StoreError);
  expect((error as StoreError).kind).toBe('referenced');
  return error as StoreError;
};

test('an ingredient used by a drink is refused, naming the drink', async () => {
  const store = await filled();
  const error = await refusal(store.ingredients.delete(gin.id));
  expect(error.details).toContain(sour.name);
  expect(error.referrers).toContainEqual({ kind: 'drink', id: sour.lineageId, name: sour.name });
  expect(error.message).toContain(sour.name as string);
  expect(await store.ingredients.get(gin.id)).toBeDefined();
  store.close();
});

test('a prepared ingredient used by a drink is refused', async () => {
  const store = await filled();
  const error = await refusal(store.ingredients.delete(preparedSyrup.id));
  expect(error.referrers.map((r) => r.kind)).toEqual(['drink']);
  store.close();
});

test('the recipe of a prepared ingredient is refused, naming the ingredient', async () => {
  const store = await filled();
  const error = await refusal(store.specs.delete(syrupSpec.id));
  expect(error.referrers).toContainEqual({
    kind: 'prepared',
    id: preparedSyrup.id,
    name: preparedSyrup.name,
  });
  const lineage = await refusal(store.specs.deleteLineage(syrupSpec.lineageId));
  expect(lineage.referrers[0]?.kind).toBe('prepared');
  expect(await store.specs.get(syrupSpec.id)).toBeDefined();
  store.close();
});

test('a drink with riffs is refused; its own versions are not riffs', async () => {
  const store = await filled();
  const riffId = newUserId();
  await store.specs.put({
    ...sour,
    id: riffId,
    lineageId: riffId,
    name: 'Sour riff',
    parentId: sour.id,
  });
  const error = await refusal(store.specs.deleteLineage(sour.lineageId));
  expect(error.referrers).toEqual([{ kind: 'riff', id: riffId, name: 'Sour riff' }]);
  const v2 = newUserId();
  await store.specs.put({
    ...sour,
    id: v2,
    version: (sour.version as number) + 1,
    parentId: sour.id,
  });
  await store.specs.deleteLineage(riffId);
  await store.specs.deleteLineage(sour.lineageId);
  expect(await store.specs.versionsOf(sour.lineageId)).toEqual([]);
  store.close();
});

test('a child ingredient and an affinity are references too', async () => {
  const store = await filled();
  const childId = newUserId();
  await store.ingredients.put({
    ...gin,
    id: childId,
    name: 'Child',
    parentId: gin.id,
    level: 'product',
  });
  const error = await refusal(store.ingredients.delete(gin.id));
  expect(error.referrers.map((r) => r.kind)).toContain('ingredient');
  store.close();
  const withAffinity = await openFresh();
  await withAffinity.ingredients.put(gin);
  const affinity = {
    ...user.affinities[0]!,
    ingredients: [gin.id, 'lemon-juice'] as [string, string],
  };
  await withAffinity.affinities.put(affinity);
  expect((await refusal(withAffinity.ingredients.delete(gin.id))).referrers[0]?.kind).toBe(
    'affinity',
  );
  withAffinity.close();
});

test('once nothing uses them, everything can be deleted, in the right order', async () => {
  const store = await filled();
  await store.affinities.delete(user.affinities[0]!.id);
  await store.specs.deleteLineage(sour.lineageId);
  await store.ingredients.delete(gin.id);
  await store.ingredients.delete(preparedSyrup.id);
  await store.specs.deleteLineage(syrupSpec.lineageId);
  expect(await store.specs.list()).toEqual([]);
  expect(await store.ingredients.list()).toEqual([]);
  store.close();
});

test('a refused delete changes nothing and does not count as a change', async () => {
  const store = await filled();
  const before = (await store.backup.load()).changesSinceExport;
  await refusal(store.ingredients.delete(gin.id));
  expect((await store.backup.load()).changesSinceExport).toBe(before);
  await store.specs.deleteLineage(sour.lineageId);
  expect((await store.backup.load()).changesSinceExport).toBe(before + 1);
  store.close();
});

test('drafts are kept apart: read, write, replace and delete, not counted as changes', async () => {
  const store = await openFresh();
  expect(await store.drafts.get('draft/new')).toBeUndefined();
  await store.drafts.put('draft/new', { version: 1, draft: { name: 'x' } });
  await store.drafts.put('draft/new', { version: 1, draft: { name: 'y' } });
  expect(await store.drafts.get('draft/new')).toEqual({ version: 1, draft: { name: 'y' } });
  await store.drafts.delete('draft/new');
  expect(await store.drafts.get('draft/new')).toBeUndefined();
  expect((await store.backup.load()).changesSinceExport).toBe(0);
  store.close();
});
