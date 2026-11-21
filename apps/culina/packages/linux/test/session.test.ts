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

/** A value that the test knows is there. */
const must = <T>(value: T | undefined): T => {
  if (value === undefined) throw new Error('expected a value');
  return value;
};

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
  expect(
    session
      .state()
      .stock.map((item) => item.ref.id)
      .sort(),
  ).toEqual([BUTTER, EGG, FLOUR, MILK, SALT].sort());
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
  const records = (await store.readCollection(must(space).id, STOCK)).records;
  expect(records.find((r) => r.key === EGG)?.value).toEqual({ present: true });
  session.stop();
});

test('an untick keeps other apps fields, Undo brings the tick back, and a thing the catalogue does not know is left alone', async () => {
  const { session, store } = await make();
  await session.load();
  const [space] = await ensureSpace(store, 'Home');
  const { localChange } = await import('@nexumia-de/hospes');
  await localChange(
    store,
    must(space).id,
    STOCK,
    () => '2026-11-21T08:00:00.000Z',
    () => ({
      put: [
        { key: MILK, value: { present: true, shelf: 'door' } },
        { key: 'gin', value: { present: true } },
      ],
    }),
  );
  await session.load();
  expect(session.state().stock.map((item) => item.ref.id)).toEqual([MILK]);

  const undo = await session.untick(MILK);
  expect(undo).toBeDefined();
  let records = (await store.readCollection(must(space).id, STOCK)).records;
  expect(records.find((r) => r.key === MILK)?.value).toEqual({ present: false, shelf: 'door' });
  expect(records.find((r) => r.key === 'gin')?.value).toEqual({ present: true });
  expect(session.state().stock).toHaveLength(0);
  // Unticking what is not there does nothing.
  expect(await session.untick(MILK)).toBeUndefined();

  expect(await session.restore(must(undo))).toBe(true);
  records = (await store.readCollection(must(space).id, STOCK)).records;
  expect(records.find((r) => r.key === MILK)?.value).toEqual({ present: true, shelf: 'door' });
  expect(session.state().stock).toHaveLength(1);
  // A key outside the catalogue cannot be ticked.
  expect(await session.tick('gin')).toBe(false);
  session.stop();
});

test('the choice of space and the filters are kept in the preferences', async () => {
  const { session, kept } = await make();
  await session.load();
  const only = must(session.state().space).id;
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
  const noodles = must(classics().find((c) => c.id === 'egg-noodles'));
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

test('every dish is an entry of the web app, and the one filter narrows the list', async () => {
  const { session } = await make();
  await session.load();
  const all = session.entries();
  expect(all).toHaveLength(classics().length);
  expect(all.every((entry) => entry.origin === 'shipped')).toBe(true);
  // What is offered comes from the dishes: the four countries in their order, courses, characters.
  const offered = session.offered();
  expect(offered.origins).toEqual(['shipped']);
  expect(offered.cuisines).toEqual(['de', 'it', 'fr', 'es']);
  expect(offered.courses.length).toBeGreaterThan(1);
  expect(offered.characters.length).toBeGreaterThan(0);
  // Each choice keeps only what passes it, and the choices combine.
  const italian = session.dishes({ cuisine: 'it' });
  expect(italian.length).toBeGreaterThan(0);
  expect(italian.length).toBeLessThan(all.length);
  expect(italian.every((entry) => entry.cuisine === 'it')).toBe(true);
  const free = session.dishes({ cuisine: 'it', meatFree: true });
  expect(free.every((entry) => entry.cuisine === 'it' && entry.meatFree === true)).toBe(true);
  expect(free.length).toBeLessThan(italian.length);
  const character = must(offered.characters[0]);
  expect(session.dishes({ character }).every((e) => e.characters.includes(character))).toBe(true);
  const course = must(offered.courses[0]);
  expect(session.dishes({ course }).every((e) => e.course === course)).toBe(true);
  expect(session.dishes({ completeOnly: true }).every((e) => e.complete)).toBe(true);
  expect(session.dishes({})).toHaveLength(all.length);
  session.stop();
});

test('the dish filter is kept under the web app key, and a change tells the pages', async () => {
  const { session, kept } = await make();
  let told = 0;
  session.subscribe(() => told++);
  expect(session.dishFilter()).toEqual({});
  session.setDishFilter({ cuisine: 'fr', meatFree: true });
  expect(PREFS.dishes).toBe('culina.dishes');
  expect(kept.get('culina.dishes')).toBe('{"cuisine":"fr","meatFree":true}');
  expect(session.dishFilter()).toEqual({ cuisine: 'fr', meatFree: true });
  expect(told).toBe(1);
  // What cannot be read is the empty filter.
  kept.set(PREFS.dishes, 'not json');
  expect(session.dishFilter()).toEqual({});
  session.stop();
});

test('the same filter narrows what the stock allows, the nearest dishes too', async () => {
  const { session } = await make();
  await session.load();
  for (const id of [EGG, MILK, FLOUR, SALT, BUTTER]) await session.tick(id);
  const wide = session.cookable({ lacking: 3 });
  expect(wide.ok && wide.shown.some((row) => row.id === 'egg-noodles')).toBe(true);
  const noodles = must(session.entries().find((e) => e.id === 'egg-noodles'));
  const elsewhere = must(session.offered().cuisines.find((c) => c !== noodles.cuisine));
  const narrowed = session.cookable({ lacking: 3 }, { cuisine: elsewhere });
  expect(narrowed.ok).toBe(true);
  if (!narrowed.ok) return;
  const ofCuisine = new Set(session.dishes({ cuisine: elsewhere }).map((e) => e.id));
  expect(narrowed.shown.length + narrowed.nearest.length).toBeGreaterThan(0);
  expect([...narrowed.shown, ...narrowed.nearest].every((row) => ofCuisine.has(row.id))).toBe(true);
  expect(narrowed.shown.some((row) => row.id === 'egg-noodles')).toBe(false);
  // An older kept country choice of the finder does not narrow: only how much may lack is used.
  const old = session.cookable({ lacking: 3, country: elsewhere as 'de' });
  expect(old.ok && old.shown.some((row) => row.id === 'egg-noodles')).toBe(true);
  // A filter nothing passes gives an empty list, not a failure.
  const nothing = session.cookable({ lacking: 3 }, { cuisine: 'xx' });
  expect(nothing.ok && nothing.shown.length + nothing.nearest.length).toBe(0);
  session.stop();
});
