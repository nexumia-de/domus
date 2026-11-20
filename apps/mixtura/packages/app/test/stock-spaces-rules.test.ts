// The space rules (ticking, the entry space), the row space names and
// per-space blocks, and the actions that keep the choice as a device setting.
import { expect, test } from 'vitest';
import { initialState } from '../src/app-state';
import { createStore } from '../src/state';
import { combineSpaces } from '../src/stock/combine';
import { tickSpace, chooseEntry } from '../src/stock/spaces-actions';
import * as rules from '../src/stock/spaces-rules';
import { spaceBlocks, presentAt } from '../src/stock/spaces-view';
import { changeStock, stockState, stockWrites, withPresent } from '../src/stock/state';
import type { Space, StockRecord } from '../src/store';
import type { Store as SharedStore } from '@nexumia-de/hospes';
import { openFresh, putSpace, seedStock, sharedStore, stockData, storedStock } from './helpers';

const AT = '2026-11-18T09:00:00Z';
const space = (id: string, name: string): Space => ({ id, name, deviceOnly: false });
const live = (spaceId: string, ingredientId: string, present: boolean, more = {}): StockRecord => ({
  spaceId,
  ingredientId,
  updatedAt: AT,
  present,
  ...more,
});
const sel = (ticked: string[], entry: string): rules.Selection => ({
  spaces: [space('b', 'Parents'), space('a', 'Home'), space('c', 'Cabin')],
  ticked,
  entry,
});

test('spaces are sorted by name, ticked follow that order and the entry space counts', () => {
  const t = rules.tidy(sel(['b', 'zz'], 'c'));
  expect(t.spaces.map((p) => p.name)).toEqual(['Cabin', 'Home', 'Parents']);
  expect(t.ticked).toEqual(['c', 'b']);
  expect(t.entry).toBe('c');
  expect(rules.tidy(sel([], 'gone'))).toMatchObject({ ticked: ['c'], entry: 'c' });
});

test('ticking: the last counting space and the entry space cannot be unticked', () => {
  const one = rules.tidy(sel(['a'], 'a'));
  expect(rules.toggleTicked(one, 'a')).toEqual({ ok: false, reason: 'last-counting' });
  const two = rules.toggleTicked(one, 'b');
  expect(two.ok && two.selection.ticked).toEqual(['a', 'b']);
  const both = rules.tidy(sel(['a', 'b'], 'a'));
  expect(rules.toggleTicked(both, 'a')).toMatchObject({
    ok: false,
    reason: 'entry-counting',
    name: 'Home',
  });
  const off = rules.toggleTicked(both, 'b');
  expect(off.ok && off.selection.ticked).toEqual(['a']);
});

test('choosing the entry space ticks it', () => {
  const next = rules.setEntry(rules.tidy(sel(['a'], 'a')), 'c');
  expect(next).toMatchObject({ entry: 'c', ticked: ['c', 'a'] });
});

test('the names of the counting spaces for the line', () => {
  expect(rules.countingNames(rules.tidy(sel(['b', 'a'], 'a')))).toEqual(['Home', 'Parents']);
});

const by = (...records: StockRecord[]) => {
  const out = new Map<string, Map<string, StockRecord>>();
  for (const r of records) {
    const p = out.get(r.spaceId) ?? new Map<string, StockRecord>();
    p.set(r.ingredientId, r);
    out.set(r.spaceId, p);
  }
  return out;
};
const spaces = [space('a', 'Home'), space('b', 'Parents'), space('c', 'Cabin')];

test('row space names: only ticked spaces with the ingredient present, none for one space', () => {
  const data = by(
    live('a', 'gin', true),
    live('b', 'gin', true),
    live('b', 'rum', false),
    live('c', 'lime', true),
    { spaceId: 'a', ingredientId: 'rum', updatedAt: AT, deleted: true },
  );
  const names = presentAt(data, ['a', 'b'], spaces);
  expect(names.get('gin')).toEqual(['Home', 'Parents']);
  expect(names.has('rum')).toBe(false);
  expect(names.has('lime')).toBe(false);
  expect(presentAt(data, ['a'], spaces).size).toBe(0);
});

test('blocks: one per ticked space with its own state', () => {
  const data = by(live('a', 'gin', true, { openedOn: '2026-11-01' }), live('b', 'gin', false), {
    spaceId: 'c',
    ingredientId: 'gin',
    updatedAt: AT,
    deleted: true,
  });
  const blocks = spaceBlocks(data, ['a', 'b', 'c'], spaces, 'gin');
  expect(blocks.map((b) => [b.name, b.state])).toEqual([
    ['Home', 'in'],
    ['Parents', 'out'],
    ['Cabin', 'untracked'],
  ]);
  expect(blocks[0]?.record?.openedOn).toBe('2026-11-01');
});

test('the combined record is the one with the newest batch, so a fresh one is not hidden', () => {
  const view = combineSpaces(
    by(
      live('a', 'cordial', true, { openedOn: '2026-10-01' }),
      live('b', 'cordial', true, { openedOn: '2026-11-10' }),
    ),
    ['a', 'b'],
  );
  expect(view.get('cordial')?.openedOn).toBe('2026-11-10');
});

async function loaded(local: Awaited<ReturnType<typeof openFresh>>, shared: SharedStore) {
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
  return ctx;
}

test('ticking and the entry space are kept as the device setting; refusals change nothing', async () => {
  const local = await openFresh();
  const shared = sharedStore();
  const home = await putSpace(shared, 'aa', 'Home');
  const cabin = await putSpace(shared, 'cc', 'Cabin');
  await seedStock(shared, home, [{ key: 'gin', value: { present: true } }]);
  await local.settings.set('spaces', { ticked: [home], entry: home, known: [home, cabin] });
  const ctx = await loaded(local, shared);
  expect(tickSpace(ctx, home)).toMatchObject({ reason: 'last-counting' });
  expect(tickSpace(ctx, cabin)).toBeNull();
  chooseEntry(ctx, cabin);
  expect(tickSpace(ctx, cabin)).toMatchObject({ reason: 'entry-counting', name: 'Cabin' });
  await stockWrites();
  expect((await local.settings.load()).spaces).toEqual({
    ticked: [cabin, home],
    entry: cabin,
    known: [cabin, home],
  });
  local.close();
});

test('a change names its space: another space changes, the entry space stays as it was, Undo goes back there', async () => {
  const local = await openFresh();
  const shared = sharedStore();
  const home = await putSpace(shared, 'aa', 'Home');
  const cabin = await putSpace(shared, 'cc', 'Cabin');
  await seedStock(shared, cabin, [{ key: 'rum', value: { present: true } }]);
  await seedStock(shared, home, [{ key: 'gin', value: { present: true } }]);
  await local.settings.set('spaces', { ticked: [home, cabin], entry: home, known: [home, cabin] });
  const ctx = await loaded(local, shared);
  const undo = changeStock(ctx, [
    { id: 'rum', spaceId: cabin, next: { ingredientId: 'rum', present: false } },
  ]);
  await stockWrites();
  expect(await storedStock(shared, cabin, 'rum')).toMatchObject({ value: { present: false } });
  expect(await storedStock(shared, home, 'rum')).toBeUndefined();
  expect(undo).toMatchObject([{ id: 'rum', spaceId: cabin, next: { present: true } }]);
  // Marking in the entry space an ingredient only the other space has keeps the other space's record.
  changeStock(ctx, undo);
  const s = stockState(ctx);
  if (s.kind !== 'ready') throw new Error('not loaded');
  expect(s.entryRecords.has('rum')).toBe(false);
  changeStock(ctx, [{ id: 'rum', next: withPresent(s.entryRecords, 'rum', true) }]);
  await stockWrites();
  expect(await storedStock(shared, home, 'rum')).toMatchObject({ value: { present: true } });
  expect(await storedStock(shared, cabin, 'rum')).toMatchObject({ value: { present: true } });
  local.close();
});
