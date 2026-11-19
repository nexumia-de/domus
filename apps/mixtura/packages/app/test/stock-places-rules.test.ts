// The place rules (selection fallbacks, names), the row place names and
// per-place blocks, and removing a place with Undo restoring its records.
import { expect, test } from 'vitest';
import { initialState } from '../src/app-state';
import { type AppData } from '../src/data';
import { createStore } from '../src/state';
import { combinePlaces } from '../src/stock/combine';
import { addPlace, removePlace, tickPlace, chooseEntry } from '../src/stock/places-actions';
import * as rules from '../src/stock/places-rules';
import { placeBlocks, presentAt } from '../src/stock/places-view';
import { changeStock, stockState, stockWrites, withPresent } from '../src/stock/state';
import type { Place, StockRecord } from '../src/store';
import { openFresh } from './helpers';

const AT = '2026-11-18T09:00:00Z';
const place = (id: string, name: string): Place => ({ id, name, updatedAt: AT });
const live = (placeId: string, ingredientId: string, present: boolean, more = {}): StockRecord => ({
  placeId,
  ingredientId,
  updatedAt: AT,
  present,
  ...more,
});
const sel = (ticked: string[], entry: string): rules.Selection => ({
  places: [place('b', 'Parents'), place('a', 'Home'), place('c', 'Cabin')],
  ticked,
  entry,
});

test('places are sorted by name, ticked follow that order and the entry place counts', () => {
  const t = rules.tidy(sel(['b', 'zz'], 'c'));
  expect(t.places.map((p) => p.name)).toEqual(['Cabin', 'Home', 'Parents']);
  expect(t.ticked).toEqual(['c', 'b']);
  expect(t.entry).toBe('c');
  expect(rules.tidy(sel([], 'gone'))).toMatchObject({ ticked: ['c'], entry: 'c' });
});

test('ticking: the last counting place and the entry place cannot be unticked', () => {
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

test('choosing the entry place ticks it', () => {
  const next = rules.setEntry(rules.tidy(sel(['a'], 'a')), 'c');
  expect(next).toMatchObject({ entry: 'c', ticked: ['c', 'a'] });
});

test('names: trimmed, not empty, not taken by another place', () => {
  const s = rules.tidy(sel(['a'], 'a'));
  expect(rules.checkName(s, '   ')).toEqual({ ok: false, reason: 'empty-name' });
  expect(rules.checkName(s, ' cabin ')).toMatchObject({ ok: false, reason: 'name-taken' });
  expect(rules.checkName(s, 'cabin', 'c')).toEqual({ ok: true, name: 'cabin' });
  expect(rules.checkName(s, '  Boat   house ')).toEqual({ ok: true, name: 'Boat house' });
});

test('adding ticks the new place; renaming stamps it', () => {
  const s = rules.tidy(sel(['a'], 'a'));
  const added = rules.addPlace(s, place('d', 'Boat'));
  expect(added.ticked).toEqual(['d', 'a']);
  const renamed = rules.renamePlace(added, 'd', 'Yacht', '2026-12-01T00:00:00Z');
  expect(renamed.places.find((p) => p.id === 'd')).toEqual({
    id: 'd',
    name: 'Yacht',
    updatedAt: '2026-12-01T00:00:00Z',
  });
});

test('removing: entry falls back to the first remaining counting place, counting to the first place', () => {
  const s = rules.tidy(sel(['a', 'b'], 'a'));
  const r = rules.removePlace(s, 'a');
  expect(r.ok && r.selection).toMatchObject({ ticked: ['b'], entry: 'b' });
  // Only the removed place counted: the first remaining place counts and gets the entries.
  const lone = rules.removePlace(rules.tidy(sel(['b'], 'b')), 'b');
  expect(lone.ok && lone.selection).toMatchObject({ ticked: ['c'], entry: 'c' });
  // Removing a place that does not count changes nothing else.
  const other = rules.removePlace(rules.tidy(sel(['a'], 'a')), 'c');
  expect(other.ok && other.selection).toMatchObject({ ticked: ['a'], entry: 'a' });
  const last = rules.tidy({ places: [place('a', 'Home')], ticked: ['a'], entry: 'a' });
  expect(rules.removePlace(last, 'a')).toEqual({ ok: false, reason: 'last-place' });
});

test('the names of the counting places for the line', () => {
  expect(rules.countingNames(rules.tidy(sel(['b', 'a'], 'a')))).toEqual(['Home', 'Parents']);
});

const by = (...records: StockRecord[]) => {
  const out = new Map<string, Map<string, StockRecord>>();
  for (const r of records) {
    const p = out.get(r.placeId) ?? new Map<string, StockRecord>();
    p.set(r.ingredientId, r);
    out.set(r.placeId, p);
  }
  return out;
};
const places = [place('a', 'Home'), place('b', 'Parents'), place('c', 'Cabin')];

test('row place names: only ticked places with the ingredient present, none for one place', () => {
  const data = by(
    live('a', 'gin', true),
    live('b', 'gin', true),
    live('b', 'rum', false),
    live('c', 'lime', true),
    { placeId: 'a', ingredientId: 'rum', updatedAt: AT, deleted: true },
  );
  const names = presentAt(data, ['a', 'b'], places);
  expect(names.get('gin')).toEqual(['Home', 'Parents']);
  expect(names.has('rum')).toBe(false);
  expect(names.has('lime')).toBe(false);
  expect(presentAt(data, ['a'], places).size).toBe(0);
});

test('blocks: one per ticked place with its own state', () => {
  const data = by(live('a', 'gin', true, { openedOn: '2026-11-01' }), live('b', 'gin', false), {
    placeId: 'c',
    ingredientId: 'gin',
    updatedAt: AT,
    deleted: true,
  });
  const blocks = placeBlocks(data, ['a', 'b', 'c'], places, 'gin');
  expect(blocks.map((b) => [b.name, b.state])).toEqual([
    ['Home', 'in'],
    ['Parents', 'out'],
    ['Cabin', 'untracked'],
  ]);
  expect(blocks[0]?.record?.openedOn).toBe('2026-11-01');
});

test('the combined record is the one with the newest batch, so a fresh one is not hidden', () => {
  const view = combinePlaces(
    by(
      live('a', 'cordial', true, { openedOn: '2026-10-01' }),
      live('b', 'cordial', true, { openedOn: '2026-11-10' }),
    ),
    ['a', 'b'],
  );
  expect(view.get('cordial')?.openedOn).toBe('2026-11-10');
});

test('removing a place deletes it and its records; Undo restores them exactly', async () => {
  const local = await openFresh();
  const home = (await local.placeSelection()).entry;
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
  expect(addPlace(ctx, '  ')).toMatchObject({ reason: 'empty-name' });
  expect(addPlace(ctx, 'Cabin')).toBeNull();
  await stockWrites();
  const cabin = (await local.places.list()).find((p) => p.name === 'Cabin');
  if (!cabin) throw new Error('place not stored');
  const rows: StockRecord[] = [
    live(cabin.id, 'rum', true, { openedOn: '2026-11-01', note: 'x' }),
    live(cabin.id, 'gin', false),
    { placeId: cabin.id, ingredientId: 'lime', updatedAt: AT, deleted: true },
  ];
  for (const r of rows) await local.stock.put(r);
  await local.settings.set('places', { ticked: [home, cabin.id], entry: cabin.id });
  // Read again from the store so the cache holds the rows.
  const { invalidateStock } = await import('../src/stock/state');
  invalidateStock(store);
  stockState(ctx);
  await new Promise((r) => setTimeout(r, 20));

  expect(tickPlace(ctx, cabin.id)).toMatchObject({ reason: 'entry-counting' });
  expect(removePlace(ctx, cabin.id)).toBeNull();
  await stockWrites();
  expect((await local.places.list()).map((p) => p.id)).toEqual([home]);
  expect(await local.stock.list()).toEqual([]);
  expect(await local.placeSelection()).toMatchObject({ ticked: [home], entry: home });

  store.get().toast?.undo?.();
  await stockWrites();
  expect((await local.places.list()).map((p) => p.name).sort()).toEqual(['Cabin', 'Home']);
  const back = (await local.stock.list()).sort((x, y) =>
    x.ingredientId.localeCompare(y.ingredientId),
  );
  expect(back).toEqual([...rows].sort((x, y) => x.ingredientId.localeCompare(y.ingredientId)));
  expect(await local.placeSelection()).toMatchObject({
    ticked: expect.arrayContaining([home, cabin.id]),
    entry: cabin.id,
  });

  // The last place cannot be removed.
  chooseEntry(ctx, home);
  expect(removePlace(ctx, cabin.id)).toBeNull();
  await stockWrites();
  expect(removePlace(ctx, home)).toMatchObject({ reason: 'last-place' });
  local.close();
});

test('a change names its place: another place changes, the entry place stays as it was, Undo goes back there', async () => {
  const local = await openFresh();
  const home = (await local.placeSelection()).entry;
  const cabin = 'u-00000000-0000-4000-8000-0000000000cc';
  await local.places.put(place(cabin, 'Cabin'));
  await local.stock.put(live(cabin, 'rum', true));
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
  const undo = changeStock(ctx, [
    { id: 'rum', placeId: cabin, next: { ingredientId: 'rum', present: false } },
  ]);
  await stockWrites();
  expect(await local.stock.get([cabin, 'rum'])).toMatchObject({ present: false });
  expect(await local.stock.get([home, 'rum'])).toBeUndefined();
  expect(undo).toMatchObject([{ id: 'rum', placeId: cabin, next: { present: true } }]);
  // Marking in the entry place an ingredient only the other place has keeps the other place's record.
  changeStock(ctx, undo);
  const s = stockState(ctx);
  if (s.kind !== 'ready') throw new Error('not loaded');
  expect(s.entryRecords.has('rum')).toBe(false);
  changeStock(ctx, [{ id: 'rum', next: withPresent(s.entryRecords, 'rum', true) }]);
  await stockWrites();
  expect(await local.stock.get([home, 'rum'])).toMatchObject({ present: true });
  expect(await local.stock.get([cabin, 'rum'])).toMatchObject({ present: true });
  local.close();
});
