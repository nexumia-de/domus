/* eslint-disable @typescript-eslint/no-non-null-assertion -- fixtures are indexed at known positions */
import { expect, test, vi } from 'vitest';
import { createPersistence } from '../src/store/persist';
import { keyValueRepo } from '../src/store/repo-settings';
import { openDatabase } from '../src/store/db';
import { freshFactory, openFresh, user } from './helpers';

const storage = (persisted: boolean, grant: boolean) => ({
  persisted: vi.fn(async () => persisted),
  persist: vi.fn(async () => grant),
});

async function setup(s: ReturnType<typeof storage> | undefined) {
  const db = await openDatabase({ factory: freshFactory() });
  return createPersistence(s, keyValueRepo(db, 'meta'));
}

test('a browser without the API reports unsupported and asks nothing', async () => {
  const p = await setup(undefined);
  expect(await p.status()).toBe('unsupported');
  expect(await p.requestOnce()).toBe('unsupported');
});

test('nothing is asked by reading the status', async () => {
  const s = storage(false, true);
  const p = await setup(s);
  expect(await p.status()).toBe('not-requested');
  expect(s.persist).not.toHaveBeenCalled();
});

test('the browser is asked once; a refusal is remembered', async () => {
  const s = storage(false, false);
  const p = await setup(s);
  expect(await p.requestOnce()).toBe('denied');
  expect(await p.requestOnce()).toBe('denied');
  expect(await p.status()).toBe('denied');
  expect(s.persist).toHaveBeenCalledTimes(1);
});

test('a grant and an already persistent origin report granted', async () => {
  expect(await (await setup(storage(false, true))).requestOnce()).toBe('granted');
  const s = storage(true, true);
  expect(await (await setup(s)).requestOnce()).toBe('granted');
  expect(s.persist).not.toHaveBeenCalled();
});

test('an API that throws changes nothing', async () => {
  const s = {
    persisted: vi.fn(async () => false),
    persist: vi.fn(async () => {
      throw new Error('no');
    }),
  };
  const p = await setup(s);
  expect(await p.requestOnce()).toBe('not-requested');
});

test('the request follows the first entity write, not opening and not settings', async () => {
  const s = storage(false, true);
  const answers: string[] = [];
  const store = await openFresh({ storage: s, onPersist: (state) => answers.push(state) });
  await store.settings.set('theme', 'dark');
  expect(s.persist).not.toHaveBeenCalled();
  await store.ingredients.put(user.ingredients[0]!);
  await store.ingredients.put(user.ingredients[1]!);
  await vi.waitFor(() => expect(answers).toEqual(['granted']));
  expect(s.persist).toHaveBeenCalledTimes(1);
  store.close();
});

test('a refused write does not ask', async () => {
  const s = storage(false, true);
  const store = await openFresh({ storage: s });
  await store.ingredients
    .put({ ...user.ingredients[0]!, level: 'x' } as never)
    .catch(() => undefined);
  expect(s.persist).not.toHaveBeenCalled();
  store.close();
});
