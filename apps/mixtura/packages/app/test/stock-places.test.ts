// Stock per place: the combined view of the ticked places, the selection of
// places from the device setting, and changes going to the entry place.
import { expect, test } from 'vitest';
import { initialState } from '../src/app-state';
import { type AppData } from '../src/data';
import { createStore } from '../src/state';
import { combinePlaces } from '../src/stock/combine';
import { changeStock, stockState, stockWrites, withPresent } from '../src/stock/state';
import { resolveSelection, type Place, type StockRecord } from '../src/store';
import { openFresh } from './helpers';

const AT = '2026-11-18T09:00:00Z';
const live = (
  placeId: string,
  ingredientId: string,
  present: boolean,
  note?: string,
): StockRecord => ({
  placeId,
  ingredientId,
  updatedAt: AT,
  present,
  ...(note && { note }),
});
const gone = (placeId: string, ingredientId: string): StockRecord => ({
  placeId,
  ingredientId,
  updatedAt: AT,
  deleted: true,
});
const by = (...records: StockRecord[]) => {
  const out = new Map<string, Map<string, StockRecord>>();
  for (const r of records) {
    const place = out.get(r.placeId) ?? new Map<string, StockRecord>();
    place.set(r.ingredientId, r);
    out.set(r.placeId, place);
  }
  return out;
};

test('one ticked place: its live records, tombstones left out', () => {
  const view = combinePlaces(
    by(live('a', 'gin', true), gone('a', 'rum'), live('b', 'lime', true)),
    ['a'],
  );
  expect([...view.keys()]).toEqual(['gin']);
});

test('several places: present anywhere is present, from the first ticked place that has it present', () => {
  const view = combinePlaces(
    by(
      live('a', 'gin', false, 'out at a'),
      live('b', 'gin', true, 'at b'),
      live('c', 'gin', true, 'at c'),
      live('a', 'rum', false, 'rum a'),
      live('b', 'rum', false, 'rum b'),
      gone('a', 'lime'),
      live('b', 'lime', true),
    ),
    ['a', 'b', 'c'],
  );
  expect(view.get('gin')).toMatchObject({ present: true, note: 'at b' });
  // Nowhere present: the first place with a record.
  expect(view.get('rum')).toMatchObject({ present: false, note: 'rum a' });
  // A tombstone in one place does not hide a live record in another.
  expect(view.get('lime')).toMatchObject({ present: true });
});

test('places that are not ticked do not count, and the order of ticked decides', () => {
  const data = by(live('a', 'gin', true, 'a'), live('b', 'gin', true, 'b'), live('c', 'rum', true));
  expect(combinePlaces(data, ['b', 'a']).get('gin')).toMatchObject({ note: 'b' });
  expect(combinePlaces(data, ['a', 'b']).has('rum')).toBe(false);
  expect(combinePlaces(data, []).size).toBe(0);
});

const place = (id: string): Place => ({ id, name: id, updatedAt: AT });

test('the selection drops places that are gone and falls back to the first place', () => {
  const places = [place('a'), place('b')];
  expect(resolveSelection(places, { ticked: ['b', 'x', 'b'], entry: 'b' })).toEqual({
    places,
    ticked: ['b'],
    entry: 'b',
  });
  expect(resolveSelection(places, { ticked: [], entry: '' })).toMatchObject({
    ticked: ['a'],
    entry: 'a',
  });
  expect(resolveSelection(places, { ticked: ['a', 'b'], entry: 'gone' })).toMatchObject({
    ticked: ['a', 'b'],
    entry: 'a',
  });
  expect(resolveSelection([], { ticked: ['a'], entry: 'a' })).toMatchObject({
    ticked: [],
    entry: '',
  });
});

test('with two ticked places the screens see both, and a change goes to the entry place only', async () => {
  const local = await openFresh();
  const home = (await local.placeSelection()).entry;
  const cabin = 'u-00000000-0000-4000-8000-0000000000cb';
  await local.places.put({ id: cabin, name: 'Cabin', updatedAt: AT });
  await local.stock.put(live(cabin, 'rum', true) as never);
  await local.stock.put(live(home, 'gin', true) as never);
  await local.settings.set('places', { ticked: [home, cabin], entry: home });
  const store = createStore({
    ...initialState('#/stock', { theme: 'system', units: 'metric' }),
    seed: { kind: 'ready' as const },
    storage: { kind: 'ready' as const },
  });
  const ctx = {
    get state() {
      return store.get();
    },
    store,
    data: { local: () => local } as unknown as AppData,
    now: () => AT,
  };
  stockState(ctx);
  await new Promise((r) => setTimeout(r, 20));
  const records = () => {
    const s = stockState(ctx);
    if (s.kind !== 'ready') throw new Error('not loaded');
    return s.records;
  };
  expect([...records().keys()].sort()).toEqual(['gin', 'rum']);
  const undo = changeStock(ctx, [{ id: 'rum', next: withPresent(records(), 'rum', false) }]);
  await stockWrites();
  // Written to home, where rum had no record; the cabin's record is untouched.
  expect(await local.stock.get([home, 'rum'])).toMatchObject({ present: false, placeId: home });
  expect(await local.stock.get([cabin, 'rum'])).toMatchObject({ present: true });
  // Present at the cabin still counts: the combined view says present.
  expect(records().get('rum')).toMatchObject({ present: true });
  changeStock(ctx, undo);
  await stockWrites();
  expect(await local.stock.get([home, 'rum'])).toMatchObject({ deleted: true });
  local.close();
});
