// The session on the real shipped content (the web app's classics.json assembled from the data
// folders) and the ingredient catalogue, with the shared database in memory: what the stock
// allows among the classics (Cook's switch and order), ticking and unticking, the shown space,
// and that a tick reaches the collection `stock` the way the web app writes it. Proves the logic;
// does not prove GJS or the screens.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import { COUNTRY_CODES } from '@culina/engine';
import { createMemoryStore, ensureSpace } from '@nexumia-de/hospes';
import {
  classics,
  cookView,
  dishClassics,
  dishView,
  GROUP_COURSES,
  resetChoices,
  setStep,
  stepOf,
  techniques,
  portionsOf,
  readyKeysOf,
  setPortions,
  STOCK,
  stringsEn,
  useUpFrom,
  useUpNote,
  type DishEntry,
} from '@culina/app/core';
import { shippedContent } from '@culina/app/make-classics.mjs';
import { rowLine } from '../src/dish-choices';
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
/**
 * Every ingredient of the set meal with the omelette in the salmon's place (rice, omelette,
 * cucumber salad, teriyaki sauce): the eggs (fdc-171287) are in it, the salmon (fdc-173686) not.
 */
const OMELETTE_MEAL = [
  'fdc-168931',
  'fdc-173647',
  'fdc-171287',
  'fdc-169655',
  'fdc-167723',
  'fdc-174277',
  'fdc-173468',
  'fdc-172336',
  'fdc-169225',
  'fdc-172237',
  'fdc-170150',
];

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
  // A base that is a sauce is a part, not a dish: it is on no dish list.
  expect(all.rows).toHaveLength(dishClassics().length);
  expect(all.rows.some((row) => row.entry.key === 'shipped:alioli')).toBe(false);
  expect(ready.noStock).toBe(false);
  expect(ready.rows.length).toBeGreaterThan(0);
  expect(ready.rows.length).toBeLessThan(all.rows.length);
  // The same answer as the web app's function on the same stock; nothing is judged here.
  const keys = readyKeysOf(
    { ingredients: [], components: [], dishes: [], stock: session.state().stock },
    '2026-11-21',
    { classics: dishClassics(), catalogue: session.catalogue(), lang: 'en' },
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
    { classics: dishClassics(), catalogue: session.catalogue(), lang: 'en' },
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

test('the web app\'s order "Not cooked for long" is read as by name: no own dishes here', async () => {
  const { session, kept } = await make();
  kept.set(PREFS.cookList, '{"have":false,"order":"not-cooked"}');
  expect(session.cookList()).toEqual({ have: false, order: 'name' });
  // Control: "Use up first" is kept as it is.
  kept.set(PREFS.cookList, '{"have":false,"order":"use-up"}');
  expect(session.cookList()).toEqual({ have: false, order: 'use-up' });
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
  expect(all).toHaveLength(dishClassics().length);
  // 27 shipped files are sauce bases, which are parts and no dishes.
  expect(dishClassics().length).toBe(classics().length - 27);
  expect(all.every((entry) => entry.origin === 'shipped')).toBe(true);
  // What is offered comes from the dishes: the countries in the app's order, courses, characters.
  const offered = session.offered();
  expect(offered.origins).toEqual(['shipped']);
  expect(offered.cuisines).toEqual([...COUNTRY_CODES]);
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

// A frame with a choice of filling (classic-format.md, "A frame"). The names are the content's
// English ones. Proves what the dish page and the cook page are given; does not prove the combo
// row on screen (no GTK here), and the choice is the web app's module state, shared by the tests
// of this file and reset by each.
const namesOf = (classic: Parameters<typeof dishView>[0]) => {
  const shown = dishView(classic, 2, 'en', (id) => id);
  if (!shown.ok) throw new Error('no dish view');
  const steps = cookView(classic, 2, 'en', (id) => id, techniques(), new Set());
  return {
    parts: shown.view.components.map((c) => c.name),
    meatFree: shown.view.vegetarian,
    frameParts: (shown.view.frameParts ?? []).map((part) => part.name),
    stepParts: [...new Set((steps.ok ? steps.steps : []).map((step) => step.component))],
  };
};

test('a frame is shown as it is cooked: the alternative of a slot is not among its parts or steps', async () => {
  resetChoices();
  const { session } = await make();
  // How the dish page read a frame before (the full base): the alternative stood among the parts
  // and its steps among the method. This half passes before and after; it shows the defect.
  const full = namesOf(must(classics().find((c) => c.id === 'burrito')));
  expect(full.parts).toContain('Guacamole');
  expect(full.stepParts).toContain('Guacamole');
  // The dish the pages are given now: the sauce in the dish, not its alternative.
  const shown = namesOf(must(session.dish('burrito')));
  expect(shown.parts).toContain('Lime sour cream');
  expect(shown.parts).not.toContain('Guacamole');
  expect(shown.stepParts).not.toContain('Guacamole');
  expect(shown.frameParts).not.toContain('Guacamole');
  // The same dish as Cook's list has it (dishClassics drops the alternatives too).
  expect(shown.parts).toEqual(namesOf(must(dishClassics().find((c) => c.id === 'burrito'))).parts);
  // Control: a dish without alternatives is the shipped one, unchanged.
  const plain = must(classics().find((c) => c.id === 'chana-masala'));
  expect(session.dish('chana-masala')).toEqual(plain);
  expect(session.fillings('chana-masala')).toEqual([]);
  expect(session.dish('no-such-dish')).toBeUndefined();
  expect(session.fillings('no-such-dish')).toEqual([]);
  session.stop();
});

test('a slot with alternatives offers its recipes, and a choice changes the dish, its steps and the meat line', async () => {
  resetChoices();
  const { session } = await make();
  try {
    const [choice, ...rest] = session.fillings('teishoku');
    expect(rest).toEqual([]);
    expect(must(choice).role).toBe('main');
    // The one in the dish first, selected.
    expect(must(choice).current).toBe('sake-no-shioyaki-salmon');
    expect(must(choice).options.map((o) => o.id)).toEqual([
      'sake-no-shioyaki-salmon',
      'tamagoyaki-omelette',
    ]);
    const before = namesOf(must(session.dish('teishoku')));
    expect(before.meatFree).toBe(false);
    const salmon = must(must(choice).options[0]).name;
    const omelette = must(must(choice).options[1]).name;
    expect(before.parts).toContain(salmon);
    expect(before.parts).not.toContain(omelette);

    // Cooking had reached step 3; a choice starts it again at the first step (another method).
    setStep('teishoku', 3);
    expect(session.chooseFilling('teishoku', must(choice).slotIndex, 'tamagoyaki-omelette')).toBe(
      true,
    );
    expect(stepOf('teishoku')).toBe(0);
    const after = namesOf(must(session.dish('teishoku')));
    expect(after.parts).toContain(omelette);
    expect(after.parts).not.toContain(salmon);
    expect(after.stepParts).toContain(omelette);
    expect(after.stepParts).not.toContain(salmon);
    expect(after.frameParts).toContain(omelette);
    // "Without meat and fish" follows the parts in the dish.
    expect(after.meatFree).toBe(true);
    // Asked again, the chosen recipe is the current one and comes first, as on the web; the page
    // keeps the model it made when it opened, so its rows do not move.
    expect(must(session.fillings('teishoku')[0]).current).toBe('tamagoyaki-omelette');
    expect(must(session.fillings('teishoku')[0]).options.map((o) => o.id)).toEqual([
      'tamagoyaki-omelette',
      'sake-no-shioyaki-salmon',
    ]);
    // An id that is no recipe of the slot changes nothing, the choice and the step included.
    setStep('teishoku', 2);
    expect(session.chooseFilling('teishoku', must(choice).slotIndex, 'not-a-recipe')).toBe(false);
    expect(namesOf(must(session.dish('teishoku'))).parts).toEqual(after.parts);
    expect(stepOf('teishoku')).toBe(2);
    // An unknown dish changes nothing.
    expect(session.chooseFilling('no-such-dish', 0, 'x')).toBe(false);
    // Control: another frame keeps its own filling.
    expect(must(session.fillings('burrito')[0]).current).toBe('crema-de-limon-sauce');
  } finally {
    resetChoices();
    session.stop();
  }
});

test("a choice of filling reaches Cook's list: the row's line, the filter and Only with what I have judge the frame as chosen", async () => {
  // On the real content and catalogue; the stock is ticked through the session. Not proved: the
  // GTK pages (the list page draws again when told; nobody looked at it on a screen).
  resetChoices();
  const { session } = await make();
  try {
    await session.load();
    const meal = (): DishEntry => must(session.entries().find((e) => e.id === 'teishoku'));
    const line = (): string => {
      const row = session
        .cookView({}, { have: false, order: 'use-up' })
        .rows.find((r) => r.entry.id === 'teishoku');
      return rowLine(stringsEn, must(row));
    };
    const tacos = must(session.entries().find((e) => e.id === 'tacos'));
    const plain = must(session.entries().find((e) => e.id === 'chana-masala'));
    expect(meal().meatFree).toBe(false);
    expect(line()).toContain('With meat or fish');
    expect(session.dishes({ meatFree: true }).some((e) => e.id === 'teishoku')).toBe(false);
    // The stock of the set meal with the omelette: eggs, no salmon.
    for (const id of OMELETTE_MEAL) expect(await session.tick(id)).toBe(true);
    const ready = (): boolean =>
      session
        .cookView({}, { have: true, order: 'name' })
        .rows.some((row) => row.entry.id === 'teishoku');
    expect(ready()).toBe(false);

    let told = 0;
    const off = session.subscribe(() => told++);
    const at = must(session.fillings('teishoku')[0]).slotIndex;
    expect(session.chooseFilling('teishoku', at, 'tamagoyaki-omelette')).toBe(true);
    off();
    // The pages that show the list are told, so it draws again.
    expect(told).toBe(1);
    expect(meal().meatFree).toBe(true);
    expect(line()).toContain('Without meat and fish');
    expect(session.dishes({ meatFree: true }).some((e) => e.id === 'teishoku')).toBe(true);
    expect(ready()).toBe(true);
    // Controls: another frame and an unrelated dish keep their entry objects.
    expect(session.entries().find((e) => e.id === 'tacos')).toBe(tacos);
    expect(session.entries().find((e) => e.id === 'chana-masala')).toBe(plain);

    // The shipped filling again: as shipped.
    expect(session.chooseFilling('teishoku', at, 'sake-no-shioyaki-salmon')).toBe(true);
    expect(meal().meatFree).toBe(false);
    expect(line()).toContain('With meat or fish');
    expect(ready()).toBe(false);
  } finally {
    resetChoices();
    session.stop();
  }
});

test("Cook's list by name stands in the web app's groups, the frames first; Use up first and one group left are flat", async () => {
  const { session } = await make();
  const view = session.cookView({}, { have: false, order: 'name' });
  const groups = must(view.groups);
  const ids = groups.map((group) => group.id);
  expect(ids[0]).toBe('frames');
  // The courses in the web app's order, the empty ones left out.
  expect(ids.slice(1)).toEqual(GROUP_COURSES.filter((course) => ids.includes(course)));
  expect(groups.flatMap((group) => group.rows).length).toBe(view.rows.length);
  expect(must(groups[0]).rows.every((row) => row.entry.frame === true)).toBe(true);
  expect(must(groups[0]).rows.length).toBe(13);
  // In a course's group the row no longer carries its course (the heading says it); a frame does.
  expect(must(groups[1]).rows.every((row) => row.meta.course === undefined)).toBe(true);
  expect(must(groups[0]).rows.every((row) => row.meta.course !== undefined)).toBe(true);
  // "Main course" leaves two groups: the frames and the main courses.
  const main = session.cookView({ course: 'main' }, { have: false, order: 'name' });
  expect(must(main.groups).map((group) => group.id)).toEqual(['frames', 'main']);
  // "Soup" leaves two as well: the soup frame stays among the frames.
  const soup = session.cookView({ course: 'soup' }, { have: false, order: 'name' });
  expect(must(soup.groups).map((group) => group.id)).toEqual(['frames', 'soup']);
  // Control: "Dessert" leaves one group, so the list is flat.
  const dessert = session.cookView({ course: 'dessert' }, { have: false, order: 'name' });
  expect(dessert.rows.length).toBeGreaterThan(0);
  expect(dessert.groups).toBeUndefined();
  // "Use up first" is one list in its own order.
  expect(session.cookView({}, { have: false, order: 'use-up' }).groups).toBeUndefined();
  session.stop();
});
