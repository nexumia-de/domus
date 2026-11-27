// The favourite mark through the notebook (docs/behaviour.md#favourites): one record per dish, own
// (by family) or shipped (by id), set and taken back, kept for the dish and not its version, deleted
// and brought back with its own dish, read again at the next start, shown on the dish entries.
// What it does not prove: fake-indexeddb and an injected clock, not a browser's storage; the toggle
// on screen (e2e/dish-favourite.mjs).
import { describe, expect, test } from 'vitest';
import { favouriteId } from '@culina/engine';
import { dishEntries } from '../src/browse/entries';
import { asNextVersion } from '../src/editor/version-save';
import {
  getDish,
  headOfFamily,
  isFavourite,
  markedDishes,
  newId,
  onFavouriteChange,
  removeFamily,
  restoreFamily,
  saveRecord,
  setFavourite,
  today,
} from '../src/notebook';
import { state } from '../src/notebook/state';
import type { Store } from '../src/store';
import { startWithStock } from './stock-helpers';
import { must } from './must';

const DISH = 'example-vegetable-plate';
const OTHER = 'example-flat-dough-with-sauce';
const SHIPPED = 'risotto';

const rowsOf = async (key: string) => {
  const listed = await must(state.store).listRows('favourites');
  if (!listed.ok) throw new Error(listed.error.code);
  return listed.rows.filter((r) => r.key === key);
};
const refusing = (real: Store, fn: 'put' | 'remove'): Store =>
  ({
    ...real,
    [fn]: () => Promise.resolve({ ok: false, error: { code: 'quota-exceeded' } }),
  }) as Store;

describe('marking a dish', () => {
  test('an own dish is marked by its family, and only that dish', async () => {
    await startWithStock();
    expect(isFavourite('own', DISH)).toBe(false);
    expect(await setFavourite('own', DISH, true)).toEqual({ ok: true, favourite: true });
    expect(isFavourite('own', DISH)).toBe(true);
    expect(state.favourites).toEqual([{ id: favouriteId('own', DISH), origin: 'own', dish: DISH }]);
    // Control: the other dish and a shipped dish of the same id are not marked.
    expect(isFavourite('own', OTHER)).toBe(false);
    expect(isFavourite('shipped', DISH)).toBe(false);
  });

  test('a shipped dish is marked by its id; the two origins are two marks', async () => {
    await startWithStock();
    await setFavourite('shipped', SHIPPED, true);
    expect(isFavourite('shipped', SHIPPED)).toBe(true);
    expect(isFavourite('own', SHIPPED)).toBe(false);
    // The same id in both origins (an example dish is stored with a slug, as a shipped one is).
    await setFavourite('own', DISH, true);
    await setFavourite('shipped', DISH, true);
    expect(state.favourites.map((f) => f.id).sort()).toEqual(
      [
        favouriteId('own', DISH),
        favouriteId('shipped', DISH),
        favouriteId('shipped', SHIPPED),
      ].sort(),
    );
    await setFavourite('shipped', DISH, false);
    expect(isFavourite('own', DISH)).toBe(true);
    expect(isFavourite('shipped', DISH)).toBe(false);
  });

  test('taking the mark back leaves a tombstone, and marking again revives the same row', async () => {
    await startWithStock();
    await setFavourite('own', DISH, true);
    expect(await setFavourite('own', DISH, false)).toEqual({ ok: true, favourite: false });
    expect(isFavourite('own', DISH)).toBe(false);
    expect((await rowsOf(favouriteId('own', DISH))).map((r) => r.deleted)).toEqual([true]);
    await setFavourite('own', DISH, true);
    const rows = await rowsOf(favouriteId('own', DISH));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.deleted).not.toBe(true);
  });

  test('marking a marked dish and taking back a mark that is not there write nothing', async () => {
    const clock = { now: '2026-11-27T08:00:00.000Z' };
    await startWithStock({ now: () => clock.now });
    await setFavourite('own', DISH, true);
    const first = await rowsOf(favouriteId('own', DISH));
    clock.now = '2026-11-27T09:00:00.000Z';
    expect(await setFavourite('own', DISH, true)).toEqual({ ok: true, favourite: true });
    expect(await rowsOf(favouriteId('own', DISH))).toEqual(first);
    expect(await setFavourite('own', OTHER, false)).toEqual({ ok: true, favourite: false });
    expect(await rowsOf(favouriteId('own', OTHER))).toEqual([]);
  });

  test('belongs to the dish, not the version: a new version keeps it, an old version id finds it', async () => {
    await startWithStock();
    const first = must(getDish(DISH));
    await setFavourite('own', DISH, true);
    const second = asNextVersion(first, false, { change: 'more salt' }, newId(), today());
    must(await saveRecord('dishes', second).then((r) => (r.ok ? r : undefined)));
    expect(headOfFamily('dishes', DISH)?.id).toBe(second.id);
    expect(isFavourite('own', second.id)).toBe(true);
    expect(isFavourite('own', DISH)).toBe(true);
    expect(state.favourites).toHaveLength(1);
  });

  test('is read again at the next start', async () => {
    const { factory } = await startWithStock();
    await setFavourite('own', DISH, true);
    await setFavourite('shipped', SHIPPED, true);
    await startWithStock({ factory, examples: false });
    expect(isFavourite('own', DISH)).toBe(true);
    expect(isFavourite('shipped', SHIPPED)).toBe(true);
  });

  test('tells a listener, once, when a mark is set or taken back, and not when nothing changed', async () => {
    await startWithStock();
    const heard: string[] = [];
    const stop = onFavouriteChange((origin, dish) => heard.push(`${origin}:${dish}`));
    await setFavourite('own', DISH, true);
    await setFavourite('own', DISH, true);
    await setFavourite('own', DISH, false);
    stop();
    await setFavourite('own', DISH, true);
    expect(heard).toEqual([`own:${DISH}`, `own:${DISH}`]);
  });
});

describe('what is not written', () => {
  test('a store that refuses the write keeps the mark as it was and says why', async () => {
    await startWithStock();
    const real = must(state.store);
    state.store = refusing(real, 'put');
    const on = await setFavourite('own', DISH, true);
    expect(on.ok === false && on.error.code).toBe('quota-exceeded');
    expect(isFavourite('own', DISH)).toBe(false);
    state.store = real;
    await setFavourite('own', DISH, true);
    state.store = refusing(real, 'remove');
    const off = await setFavourite('own', DISH, false);
    expect(off.ok === false && off.error.code).toBe('quota-exceeded');
    expect(isFavourite('own', DISH)).toBe(true);
    state.store = real;
  });

  test('with no store nothing is kept, and an id that is no own dish is refused', async () => {
    await startWithStock();
    expect((await setFavourite('own', 'example-no-such-dish', true)).ok).toBe(false);
    const real = state.store;
    state.store = undefined;
    const done = await setFavourite('own', DISH, true);
    expect(done.ok === false && done.error.code).toBe('unavailable');
    expect(isFavourite('own', DISH)).toBe(false);
    state.store = real;
  });

  test('a dish another tab deleted meanwhile gets no mark', async () => {
    await startWithStock();
    expect((await must(state.store).remove('dishes', DISH)).ok).toBe(true);
    const done = await setFavourite('own', DISH, true);
    expect(done.ok === false && done.error.code).toBe('not-found');
    expect(await rowsOf(favouriteId('own', DISH))).toEqual([]);
    expect((await setFavourite('own', OTHER, true)).ok).toBe(true);
  });

  test('a record with a stray id, or of a family with no dish, marks nothing', async () => {
    await startWithStock();
    state.favourites = [
      { id: favouriteId('own', OTHER), origin: 'own', dish: DISH },
      { id: favouriteId('own', 'u-gone'), origin: 'own', dish: 'u-gone' },
    ];
    expect(isFavourite('own', DISH)).toBe(false);
    expect([...markedDishes().own]).toEqual([]);
  });
});

describe('deleting an own dish', () => {
  test('takes its mark; Undo brings both back', async () => {
    await startWithStock();
    await setFavourite('own', DISH, true);
    const removed = await removeFamily('dishes', DISH);
    if (!removed.ok) throw new Error(removed.error.code);
    expect(removed.removed.favourite?.dish).toBe(DISH);
    expect(isFavourite('own', DISH)).toBe(false);
    expect((await restoreFamily(removed.removed)).ok).toBe(true);
    expect(isFavourite('own', DISH)).toBe(true);
  });

  test('control: a dish never marked brings back no mark; the mark of another stays', async () => {
    await startWithStock();
    await setFavourite('own', DISH, true);
    const removed = await removeFamily('dishes', OTHER);
    if (!removed.ok) throw new Error(removed.error.code);
    expect(removed.removed.favourite).toBeUndefined();
    expect((await restoreFamily(removed.removed)).ok).toBe(true);
    expect(isFavourite('own', OTHER)).toBe(false);
    expect(isFavourite('own', DISH)).toBe(true);
  });

  test('a delete that fails at the mark puts the dish back and keeps the mark', async () => {
    await startWithStock();
    await setFavourite('own', DISH, true);
    const real = must(state.store);
    // The versions are removed first; the store then refuses the removal of the mark.
    state.store = {
      ...real,
      remove: (kind: Parameters<Store['remove']>[0], id: string) =>
        kind === 'favourites'
          ? Promise.resolve({ ok: false, error: { code: 'quota-exceeded' } })
          : real.remove(kind, id),
    } as Store;
    const done = await removeFamily('dishes', DISH);
    expect(done.ok === false && done.error.code).toBe('quota-exceeded');
    state.store = real;
    expect(getDish(DISH)).toBeDefined();
    expect(isFavourite('own', DISH)).toBe(true);
    expect((await real.get('dishes', DISH)).ok).toBe(true);
  });

  test('the mark of a shipped dish is not touched by deleting an own dish of the same id', async () => {
    await startWithStock();
    await setFavourite('shipped', DISH, true);
    await setFavourite('own', DISH, true);
    const removed = await removeFamily('dishes', DISH);
    if (!removed.ok) throw new Error(removed.error.code);
    expect(isFavourite('shipped', DISH)).toBe(true);
    expect(isFavourite('own', DISH)).toBe(false);
  });
});

describe('the dish entries', () => {
  test('carry the mark of an own dish, and a mark made or taken back shows at once', async () => {
    await startWithStock();
    const marked = () =>
      dishEntries()
        .filter((e) => e.favourite === true)
        .map((e) => e.key)
        .sort();
    expect(marked()).toEqual([]);
    await setFavourite('own', DISH, true);
    expect(marked()).toEqual([`own:${DISH}`]);
    await setFavourite('own', DISH, false);
    expect(marked()).toEqual([]);
  });
});
