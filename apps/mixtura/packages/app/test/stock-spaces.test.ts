// Stock in spaces: the combined view of the ticked spaces, the selection of
// spaces from the device setting, and changes going to the entry space.
import { expect, test } from 'vitest';
import { initialState } from '../src/app-state';
import { createStore } from '../src/state';
import { combineSpaces } from '../src/stock/combine';
import { resolveSelection } from '../src/stock/spaces-rules';
import { changeStock, stockState, stockWrites, withPresent } from '../src/stock/state';
import type { Space, StockRecord } from '../src/store';
import { openFresh, putSpace, seedStock, sharedStore, stockData, storedStock } from './helpers';

const AT = '2026-11-18T09:00:00.000Z';
const live = (
  spaceId: string,
  ingredientId: string,
  present: boolean,
  note?: string,
): StockRecord => ({
  spaceId,
  ingredientId,
  updatedAt: AT,
  present,
  ...(note && { note }),
});
const gone = (spaceId: string, ingredientId: string): StockRecord => ({
  spaceId,
  ingredientId,
  updatedAt: AT,
  deleted: true,
});
const by = (...records: StockRecord[]) => {
  const out = new Map<string, Map<string, StockRecord>>();
  for (const r of records) {
    const space = out.get(r.spaceId) ?? new Map<string, StockRecord>();
    space.set(r.ingredientId, r);
    out.set(r.spaceId, space);
  }
  return out;
};

test('one ticked space: its live records, tombstones left out', () => {
  const view = combineSpaces(
    by(live('a', 'gin', true), gone('a', 'rum'), live('b', 'lime', true)),
    ['a'],
  );
  expect([...view.keys()]).toEqual(['gin']);
});

test('several spaces: present anywhere is present, from the first ticked space that has it present', () => {
  const view = combineSpaces(
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
  // Nowhere present: the first space with a record.
  expect(view.get('rum')).toMatchObject({ present: false, note: 'rum a' });
  // A removal marker in one space does not hide a live record in another.
  expect(view.get('lime')).toMatchObject({ present: true });
});

test('spaces that are not ticked do not count, and the order of ticked decides', () => {
  const data = by(live('a', 'gin', true, 'a'), live('b', 'gin', true, 'b'), live('c', 'rum', true));
  expect(combineSpaces(data, ['b', 'a']).get('gin')).toMatchObject({ note: 'b' });
  expect(combineSpaces(data, ['a', 'b']).has('rum')).toBe(false);
  expect(combineSpaces(data, []).size).toBe(0);
});

const space = (id: string, deviceOnly = false): Space => ({ id, name: id, deviceOnly });
const none = (): boolean => false;

test('the selection drops spaces that are gone and falls back to the first space', () => {
  const spaces = [space('a'), space('b')];
  const known = ['a', 'b'];
  expect(resolveSelection(spaces, { ticked: ['b', 'x'], entry: 'b', known }, none)).toEqual({
    selection: { spaces, ticked: ['b'], entry: 'b' },
    setting: { ticked: ['b'], entry: 'b', known },
  });
  expect(
    resolveSelection(spaces, { ticked: ['a', 'b'], entry: 'gone', known }, none).selection,
  ).toMatchObject({ ticked: ['a', 'b'], entry: 'a' });
  expect(resolveSelection([], { ticked: ['a'], entry: 'a', known }, none).selection).toMatchObject({
    ticked: [],
    entry: '',
  });
});

test('a first start: the only space counts and takes the entries', () => {
  const r = resolveSelection([space('home', true)], { ticked: [], entry: '', known: [] }, none);
  expect(r.selection).toMatchObject({ ticked: ['home'], entry: 'home' });
  expect(r.setting.known).toEqual(['home']);
});

test('a space that is new on the device counts at once; the entry space stays when it holds stock', () => {
  const spaces = [space('home', true), space('household')];
  const setting = { ticked: ['home'], entry: 'home', known: ['home'] };
  const r = resolveSelection(spaces, setting, (id) => id === 'home');
  expect(r.selection).toMatchObject({ ticked: ['home', 'household'], entry: 'home' });
  expect(r.setting.known).toEqual(['home', 'household']);
});

test('an empty space on this device gives way to a shared space that arrives', () => {
  const spaces = [space('home', true), space('household')];
  const setting = { ticked: ['home'], entry: 'home', known: ['home'] };
  expect(resolveSelection(spaces, setting, none).selection).toMatchObject({
    ticked: ['household'],
    entry: 'household',
  });
  // A second space on this device only is no reason to move.
  const local = [space('home', true), space('other', true)];
  expect(resolveSelection(local, setting, none).selection).toMatchObject({
    ticked: ['home', 'other'],
    entry: 'home',
  });
  // Seen before and unticked by the person: it stays unticked.
  const seen = { ticked: ['home'], entry: 'home', known: ['home', 'household'] };
  expect(resolveSelection(spaces, seen, none).selection).toMatchObject({
    ticked: ['home'],
    entry: 'home',
  });
});

test('with two ticked spaces the screens see both, and a change goes to the entry space only', async () => {
  const local = await openFresh();
  const shared = sharedStore();
  const home = await putSpace(shared, 'aa', 'Home');
  const cabin = await putSpace(shared, 'cc', 'Cabin');
  await seedStock(shared, cabin, [{ key: 'rum', value: { present: true } }]);
  await seedStock(shared, home, [{ key: 'gin', value: { present: true } }]);
  await local.settings.set('spaces', { ticked: [home, cabin], entry: home, known: [home, cabin] });
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
    data: stockData(local, shared),
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
  expect(await storedStock(shared, home, 'rum')).toMatchObject({ value: { present: false } });
  expect(await storedStock(shared, cabin, 'rum')).toMatchObject({ value: { present: true } });
  // Present at the cabin still counts: the combined view says present.
  expect(records().get('rum')).toMatchObject({ present: true });
  changeStock(ctx, undo);
  await stockWrites();
  expect(await storedStock(shared, home, 'rum')).toMatchObject({ deleted: true });
  local.close();
});
