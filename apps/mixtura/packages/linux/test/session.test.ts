// The session on the real built-in data (the web app's seed assembled from the engine's
// files) and the shared database in memory: what the stock allows, marking, the choice of
// the shown space, and that a mark reaches the collection `stock` the way the web app
// writes it. Proves the logic; does not prove GJS or the screens.
import { expect, test } from 'vitest';
import { createMemoryStore } from '@nexumia-de/hospes';
import { STOCK_COLLECTION } from '@mixtura/app/core';
import { assembleSeed } from '@mixtura/app/seed-assemble.mjs';
import { PREFS, createSession, type SessionOptions } from '../src/session';

const seed = assembleSeed();
const noStorage = (() => {
  throw new Error('no storage in this test');
}) as unknown as SessionOptions['adapter'];

function make(extra: Partial<SessionOptions> = {}) {
  const store = createMemoryStore();
  const kept = new Map<string, string>();
  let tick = 0;
  const session = createSession({
    store,
    seed,
    now: () => new Date(Date.UTC(2026, 10, 21, 9, 0, tick++)).toISOString(),
    prefs: {
      get: (key) => kept.get(key) ?? null,
      set: (key, value) => (kept.set(key, value), true),
    },
    names: { home: 'Home', unnamed: 'Unnamed' },
    adapter: noStorage,
    setTimer: () => 0,
    clearTimer: () => undefined,
    ...extra,
  });
  return { session, store, kept };
}

test('a new device gets one space on this device only and no stock', async () => {
  const { session } = make();
  await session.load();
  const state = session.state();
  expect(state.phase).toBe('ready');
  expect(state.spaces).toHaveLength(1);
  expect(state.space?.name).toBe('Home');
  expect(state.space?.deviceOnly).toBe(true);
  expect(state.records.size).toBe(0);
  expect(session.model()?.drinks.length).toBeGreaterThan(300);
  session.stop();
});

test('marking bottles makes drinks makeable, and marking them out takes that back', async () => {
  const { session } = make();
  await session.load();
  const model = session.model();
  expect(model).not.toBeNull();
  const before = session.state().derived?.counts.makeable ?? 0;
  expect(before).toBe(0);
  const done = await session.mark(
    ['gin', 'dry-vermouth', 'sweet-vermouth', 'campari', 'lemon-juice', 'simple-syrup'],
    true,
  );
  expect(done).toHaveLength(6);
  const derived = session.state().derived;
  expect(derived?.counts.makeable).toBeGreaterThan(0);
  // Negroni: gin, Campari and sweet vermouth in equal parts.
  const negroni = model?.drinks.find((d) => d.spec.name === 'Negroni');
  expect(negroni).toBeDefined();
  expect(derived?.states.get(negroni?.spec.id ?? '')?.kind).toBe('makeable');
  await session.mark(['campari'], false);
  expect(session.state().derived?.states.get(negroni?.spec.id ?? '')?.kind).toBe('one');
  session.stop();
});

test('a mark that is already set changes nothing and writes nothing', async () => {
  const { session, store } = make();
  await session.load();
  await session.mark(['gin'], true);
  const space = session.state().space?.id ?? '';
  const first = (await store.readCollection(space, STOCK_COLLECTION)).records;
  expect(await session.mark(['gin'], true)).toEqual([]);
  expect(await session.mark(['vodka'], false)).toEqual([]);
  expect((await store.readCollection(space, STOCK_COLLECTION)).records).toEqual(first);
  session.stop();
});

test('the record is the one the web app writes: a stock value under the ingredient id', async () => {
  const { session, store } = make();
  await session.load();
  await session.mark(['gin'], true);
  const space = session.state().space?.id ?? '';
  const [record] = (await store.readCollection(space, STOCK_COLLECTION)).records;
  expect(record?.key).toBe('gin');
  expect(record?.deleted).not.toBe(true);
  expect(record?.value).toEqual({ present: true });
  session.stop();
});

test('a field another app wrote into the record survives a mark', async () => {
  const { session, store } = make();
  await session.load();
  const space = session.state().space?.id ?? '';
  await store.writeCollection(space, STOCK_COLLECTION, {
    records: [
      {
        key: 'gin',
        updatedAt: '2026-11-20T09:00:00.000Z',
        value: { present: false, culinaNote: 'kept' },
      },
    ],
  });
  await session.load();
  await session.mark(['gin'], true);
  const [record] = (await store.readCollection(space, STOCK_COLLECTION)).records;
  expect(record?.value).toEqual({ present: true, culinaNote: 'kept' });
  session.stop();
});

test('the shown space is the chosen one, and a listener hears every change', async () => {
  const { session, store, kept } = make();
  await session.load();
  const [home] = session.state().spaces;
  await store.putSpace({
    id: 'b'.repeat(32),
    secret: 'AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8',
    name: 'Parents',
    storage: { type: 'github', address: 'me/household', access: { token: 't' } },
  });
  let heard = 0;
  session.subscribe(() => (heard += 1));
  await session.load();
  expect(session.state().spaces).toHaveLength(2);
  // Nothing is marked anywhere: the first shared space is shown.
  expect(session.state().space?.name).toBe('Parents');
  await session.choose(home?.id ?? '');
  expect(kept.get(PREFS.space)).toBe(home?.id);
  expect(session.state().space?.id).toBe(home?.id);
  expect(heard).toBeGreaterThan(1);
  session.stop();
});

test('damaged built-in data says so and still lets the app run', async () => {
  const { session } = make({ seed: { seedVersion: 'x' } });
  await session.load();
  expect(session.model()).toBeNull();
  expect(session.state().phase).toBe('no-seed');
  session.stop();
});

test('a storage the app cannot use never breaks marking', async () => {
  const adapter = (() => ({})) as unknown as SessionOptions['adapter'];
  const { session } = make({ adapter });
  await session.load();
  expect(await session.mark(['gin'], true)).toEqual(['gin']);
  session.stop();
});
