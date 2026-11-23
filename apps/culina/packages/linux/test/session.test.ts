// The session on the real shipped content (the web app's classics.json assembled from the data
// folders) and the ingredient catalogue, with the shared database in memory: what the stock
// allows among the classics (Cook's switch and order), ticking and unticking, the shown space,
// and that a tick reaches the collection `stock` the way the web app writes it. Proves the logic;
// does not prove GJS or the screens.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import { createMemoryStore, ensureSpace } from '@nexumia-de/hospes';
import {
  classics,
  dishView,
  portionsOf,
  readyKeysOf,
  setPortions,
  STOCK,
  useUpFrom,
  useUpNote,
} from '@culina/app/core';
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
  // "Only with what I have" with nothing ticked keeps nothing and says so.
  const cook = session.cookView({}, { have: true, order: 'name' });
  expect(cook.noStock).toBe(true);
  expect(cook.rows).toHaveLength(0);
  expect(session.cookView({}, { have: false, order: 'name' }).noStock).toBe(false);
  session.stop();
});

test('Only with what I have keeps the dishes the finder finds complete, as readyKeysOf asks it', async () => {
  const { session } = await make();
  await session.load();
  for (const id of [EGG, MILK, FLOUR, SALT, BUTTER]) expect(await session.tick(id)).toBe(true);
  expect(
    session
      .state()
      .stock.map((item) => item.ref.id)
      .sort(),
  ).toEqual([BUTTER, EGG, FLOUR, MILK, SALT].sort());
  const all = session.cookView({}, { have: false, order: 'name' });
  const ready = session.cookView({}, { have: true, order: 'name' });
  expect(all.rows).toHaveLength(classics().length);
  expect(ready.noStock).toBe(false);
  expect(ready.rows.length).toBeGreaterThan(0);
  expect(ready.rows.length).toBeLessThan(all.rows.length);
  // The same answer as the web app's function on the same stock; nothing is judged here.
  const keys = readyKeysOf(
    { ingredients: [], components: [], dishes: [], stock: session.state().stock },
    '2026-11-21',
    { classics: classics(), catalogue: session.catalogue(), lang: 'en' },
  );
  expect(ready.rows.map((row) => row.entry.key).sort()).toEqual([...keys].sort());
  expect(ready.rows.some((row) => row.entry.id === 'egg-noodles')).toBe(true);
  // By name, in the content language, as the web app's list.
  const names = all.rows.map((row) => row.entry.name);
  expect(names).toEqual(
    [...names].sort(new Intl.Collator('en', { sensitivity: 'base', numeric: true }).compare),
  );
  // The dish filter narrows as well.
  const noodles = must(session.entries().find((e) => e.id === 'egg-noodles'));
  const elsewhere = must(session.offered().cuisines.find((c) => c !== noodles.cuisine));
  const narrowed = session.cookView({ cuisine: elsewhere }, { have: true, order: 'name' });
  expect(narrowed.rows.every((row) => row.entry.cuisine === elsewhere)).toBe(true);
  expect(narrowed.rows.every((row) => keys.has(row.entry.key))).toBe(true);
  session.stop();
});

test('Use up first puts the dishes that use a dated item first, from a use-by the web app wrote', async () => {
  const { session, store } = await make();
  await session.load();
  // Without a date the order places nothing, and the note says no item is dated.
  for (const id of [EGG, MILK, FLOUR, SALT, BUTTER]) await session.tick(id);
  const undated = session.cookView({}, { have: false, order: 'use-up' });
  expect(undated.useUp?.ok).toBe(true);
  expect(undated.useUp?.anyDated).toBe(false);
  expect(undated.useUp?.marks.size).toBe(0);
  expect(useUpNote(undated.useUp)).toBe('no-dates');
  // The web app writes a date as `bestBefore` on the record (the native app writes none).
  const [space] = await ensureSpace(store, 'Home');
  const { localChange } = await import('@nexumia-de/hospes');
  await localChange(
    store,
    must(space).id,
    STOCK,
    () => '2026-11-21T08:00:00.000Z',
    () => ({ put: [{ key: MILK, value: { present: true, bestBefore: '2026-11-22' } }] }),
  );
  await session.load();
  const dated = session.cookView({}, { have: false, order: 'use-up' });
  const marks = must(dated.useUp).marks;
  expect(dated.useUp?.anyDated).toBe(true);
  expect(marks.size).toBeGreaterThan(0);
  expect(useUpNote(dated.useUp)).toBeUndefined();
  // The marked dishes come first, in the engine's rank, every one with the milk and one day left.
  const first = dated.rows.slice(0, marks.size);
  expect(first.map((row) => marks.get(row.entry.key)?.rank)).toEqual(
    [...marks.keys()].map((_, n) => n),
  );
  expect(
    first.every((row) => row.meta.useUp?.itemId === MILK && row.meta.useUp.daysLeft === 1),
  ).toBe(true);
  expect(dated.rows.slice(marks.size).every((row) => row.meta.useUp === undefined)).toBe(true);
  expect(must(dated.useUp).itemName(MILK)).not.toBe(MILK);
  // The same marks as the web app's function on the same stock.
  const web = useUpFrom(
    { ingredients: [], components: [], dishes: [], stock: session.state().stock },
    '2026-11-21',
    new Map(session.entries().map((e) => [e.key, e])),
    { classics: classics(), catalogue: session.catalogue(), lang: 'en' },
  );
  expect([...marks.entries()]).toEqual([...web.marks.entries()]);
  // Both choices together: only complete dishes, the dated ones first.
  const both = session.cookView({}, { have: true, order: 'use-up' });
  const ready = new Set(
    session.cookView({}, { have: true, order: 'name' }).rows.map((r) => r.entry.key),
  );
  expect(both.rows.map((r) => r.entry.key).sort()).toEqual([...ready].sort());
  session.stop();
});

test("the same stock on the next day gives the next day's order: the answers are kept per day", async () => {
  let day = '2026-11-21';
  const { session, store } = await make({ today: () => day });
  await session.load();
  const [space] = await ensureSpace(store, 'Home');
  const { localChange } = await import('@nexumia-de/hospes');
  await localChange(
    store,
    must(space).id,
    STOCK,
    () => '2026-11-21T08:00:00.000Z',
    () => ({ put: [{ key: MILK, value: { present: true, bestBefore: '2026-11-22' } }] }),
  );
  await session.load();
  const list = { have: false, order: 'use-up' } as const;
  const stock = session.state().stock;
  const days = (): number[] =>
    session
      .cookView({}, list)
      .rows.flatMap((row) => (row.meta.useUp === undefined ? [] : [row.meta.useUp.daysLeft]));
  expect(days().length).toBeGreaterThan(0);
  expect(days().every((d) => d === 1)).toBe(true);
  // No record changed, only the day: the stock list is the same one, the answer is the next day's.
  day = '2026-11-22';
  expect(session.state().stock).toBe(stock);
  expect(days().length).toBeGreaterThan(0);
  expect(days().every((d) => d === 0)).toBe(true);
  session.stop();
});

test('the choices of Cook are kept under the web app key, and a change tells the pages', async () => {
  const { session, kept } = await make();
  let told = 0;
  session.subscribe(() => told++);
  expect(session.cookList()).toEqual({ have: false, order: 'name' });
  session.setCookList({ have: true, order: 'use-up' });
  expect(PREFS.cookList).toBe('culina.cookList');
  expect(kept.get('culina.cookList')).toBe('{"have":true,"order":"use-up"}');
  expect(session.cookList()).toEqual({ have: true, order: 'use-up' });
  expect(told).toBe(1);
  // Anything unreadable falls back field by field.
  kept.set(PREFS.cookList, '{"have":true,"order":"sideways"}');
  expect(session.cookList()).toEqual({ have: true, order: 'name' });
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

test('the choice of space is kept in the preferences', async () => {
  const { session, kept } = await make();
  await session.load();
  const only = must(session.state().space).id;
  await session.choose(only);
  expect(kept.get(PREFS.space)).toBe(only);
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
