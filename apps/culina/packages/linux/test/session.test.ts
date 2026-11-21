// The session on the real shipped content (the web app's classics.json assembled from the data
// folders) and the ingredient catalogue, with the shared database in memory: what the stock
// allows among the classics, ticking and unticking, the shown space, and that a tick reaches the
// collection `stock` the way the web app writes it. Proves the logic; does not prove GJS or the
// screens.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import { createMemoryStore, ensureSpace } from '@nexumia-de/hospes';
import { classics, dishView, portionsOf, setPortions, STOCK } from '@culina/app/core';
import { shippedContent } from '@culina/app/make-classics.mjs';
import { PREFS, createSession, type SessionOptions } from '../src/session';

const content = shippedContent();
const catalogue = JSON.parse(
  readFileSync(fileURLToPath(import.meta.resolve('@culina/app/catalogue.json')), 'utf8'),
) as unknown;
const noStorage = (() => {
  throw new Error('no storage in this test');
}) as unknown as SessionOptions['adapter'];

async function make(extra: Partial<SessionOptions> = {}) {
  const store = createMemoryStore();
  const kept = new Map<string, string>();
  let tick = 0;
  const session = createSession({
    store,
    content,
    catalogue,
    lang: 'en',
    today: () => '2026-11-21',
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
  expect(await session.open()).toBe(true);
  return { session, store, kept };
}

const EGG = 'fdc-group-egg-whole';
const MILK = 'fdc-group-milk';
const FLOUR = 'fdc-group-wheat-flour';
const SALT = 'fdc-173468';
const BUTTER = 'fdc-group-butter';

test('the content is the shipped one: every classic and every catalogue entry', async () => {
  const { session } = await make();
  expect(classics().length).toBe(content.classics.length);
  expect(classics().length).toBeGreaterThan(40);
  expect(session.catalogue().size).toBe(
    (catalogue as { ingredients: unknown[] }).ingredients.length,
  );
  expect(session.catalogue().get(EGG)?.names?.['de']?.name).toBeTruthy();
  session.stop();
});

test('a new device gets one space on this device only and no stock; nothing is judged against it', async () => {
  const { session } = await make();
  await session.load();
  const state = session.state();
  expect(state.phase).toBe('ready');
  expect(state.spaces).toHaveLength(1);
  expect(state.space?.name).toBe('Home');
  expect(state.space?.deviceOnly).toBe(true);
  expect(state.stock).toHaveLength(0);
  const found = session.cookable(session.filters());
  expect(found.ok && found.hasStock).toBe(false);
  expect(found.ok && found.shown.length).toBe(0);
  session.stop();
});

test('ticking ingredients makes classics cookable, and the engine names what is lacking', async () => {
  const { session } = await make();
  await session.load();
  for (const id of [EGG, MILK, FLOUR, SALT, BUTTER]) expect(await session.tick(id)).toBe(true);
  expect(session.state().stock.map((item) => item.ref.id).sort()).toEqual(
    [BUTTER, EGG, FLOUR, MILK, SALT].sort(),
  );
  const found = session.cookable({ lacking: 2 });
  expect(found.ok).toBe(true);
  if (!found.ok) return;
  expect(found.hasStock).toBe(true);
  const noodles = found.shown.find((row) => row.id === 'egg-noodles');
  expect(noodles?.lacking).toBe(0);
  expect(noodles?.complete).toBe(true);
  // Every shown row lacks at most what the filter says; nothing is re-judged here.
  expect(found.shown.every((row) => row.lacking <= 2)).toBe(true);
  const strict = session.cookable({ lacking: 0 });
  expect(strict.ok && strict.shown.every((row) => row.complete)).toBe(true);
  expect(strict.ok && strict.shown.some((row) => row.id === 'egg-noodles')).toBe(true);
  session.stop();
});

test('a tick is a record of the collection stock as the web app writes it', async () => {
  const { session, store } = await make();
  await session.load();
  await session.tick(EGG);
  const [space] = await ensureSpace(store, 'Home');
  const records = (await store.readCollection(space!.id, STOCK)).records;
  expect(records.find((r) => r.key === EGG)?.value).toEqual({ present: true });
  session.stop();
});

test('an untick keeps other apps fields, Undo brings the tick back, and a thing the catalogue does not know is left alone', async () => {
  const { session, store } = await make();
  await session.load();
  const [space] = await ensureSpace(store, 'Home');
  const { localChange } = await import('@nexumia-de/hospes');
  await localChange(store, space!.id, STOCK, () => '2026-11-21T08:00:00.000Z', () => ({
    put: [
      { key: MILK, value: { present: true, shelf: 'door' } },
      { key: 'gin', value: { present: true } },
    ],
  }));
  await session.load();
  expect(session.state().stock.map((item) => item.ref.id)).toEqual([MILK]);

  const undo = await session.untick(MILK);
  expect(undo).toBeDefined();
  let records = (await store.readCollection(space!.id, STOCK)).records;
  expect(records.find((r) => r.key === MILK)?.value).toEqual({ present: false, shelf: 'door' });
  expect(records.find((r) => r.key === 'gin')?.value).toEqual({ present: true });
  expect(session.state().stock).toHaveLength(0);
  // Unticking what is not there does nothing.
  expect(await session.untick(MILK)).toBeUndefined();

  expect(await session.restore(undo!)).toBe(true);
  records = (await store.readCollection(space!.id, STOCK)).records;
  expect(records.find((r) => r.key === MILK)?.value).toEqual({ present: true, shelf: 'door' });
  expect(session.state().stock).toHaveLength(1);
  // A key outside the catalogue cannot be ticked.
  expect(await session.tick('gin')).toBe(false);
  session.stop();
});

test('the choice of space and the filters are kept in the preferences', async () => {
  const { session, kept } = await make();
  await session.load();
  const only = session.state().space!.id;
  await session.choose(only);
  expect(kept.get(PREFS.space)).toBe(only);
  session.setFilters({ lacking: 3, country: 'it', meatFree: true });
  expect(session.filters()).toEqual({ lacking: 3, country: 'it', meatFree: true });
  session.setFilters({ lacking: 0 });
  expect(session.filters()).toEqual({ lacking: 0 });
  session.stop();
});

test('the dish view takes its amounts from the engine: more portions, bigger amounts, German names', async () => {
  await make();
  const noodles = classics().find((c) => c.id === 'egg-noodles')!;
  const name = (id: string): string => id;
  const two = dishView(noodles, 2, 'en', name);
  const four = dishView(noodles, 4, 'en', name);
  expect(two.ok && four.ok).toBe(true);
  if (!two.ok || !four.ok) return;
  const amounts = (view: typeof two.view): (string | undefined)[] =>
    view.components.flatMap((c) => c.lines.map((l) => l.amount));
  expect(amounts(two.view).some((a) => a !== undefined)).toBe(true);
  expect(amounts(four.view)).not.toEqual(amounts(two.view));
  const german = dishView(noodles, 2, 'de', name);
  expect(german.ok && german.view.name).not.toBe(two.view.name);
  expect(dishView(noodles, 0, 'en', name).ok).toBe(false);
  expect(portionsOf(noodles.id)).toBe(2);
  setPortions(noodles.id, 5);
  expect(portionsOf(noodles.id)).toBe(5);
});
