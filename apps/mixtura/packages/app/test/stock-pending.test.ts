// A stock change the page did not live to write: the note left at the moment of the change, and
// the next page that writes it (src/stock/pending.ts, packages/host/docs/sync-orderings.md).
// What these tests do not prove: the storages are fakes in memory, "the page goes away" is a
// store that never runs its callback and a fresh copy of the module, and no real IndexedDB,
// localStorage or unload takes part. e2e/spec-stock.mjs marks and reloads in a browser, where the
// loss shows only now and then (under load).
import { expect, test, vi } from 'vitest';
import { initialState } from '../src/app-state';
import { createStore } from '../src/state';
import {
  OTHER_TAB_WAIT_MS,
  PENDING_PREFIX,
  pendingStore,
  type KeyValue,
} from '../src/stock/pending';
import type { LocalStore } from '../src/store';
import type { Store as SharedStore } from '@nexumia-de/hospes';
import { openFresh, putSpace, sharedStore, stockData, storedStock } from './helpers';

type State = typeof import('../src/stock/state');
type Context = Parameters<State['stockState']>[0];

function memory(): KeyValue & { keys(): string[] } {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    key: (i) => [...map.keys()][i] ?? null,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
    keys: () => [...map.keys()].filter((k) => k.startsWith(PENDING_PREFIX)),
  };
}

/** A page: its own copy of the stock state (as after a load), reading until the stock is there. */
async function page(local: LocalStore, shared: SharedStore, pending: Context['pending']) {
  vi.resetModules();
  const state: State = await import('../src/stock/state');
  const store = createStore({
    ...initialState('#/stock', { theme: 'system', units: 'metric' }),
    seed: { kind: 'ready' as const },
    storage: { kind: 'ready' as const },
  });
  const ctx: Context = {
    get state() {
      return store.get();
    },
    store,
    data: stockData(local, shared),
    pending,
  };
  state.stockState(ctx);
  await new Promise((r) => setTimeout(r, 20));
  const ready = () => {
    const s = state.stockState(ctx);
    if (s.kind !== 'ready') throw new Error('stock not loaded');
    return s;
  };
  const mark = (present = true) =>
    state.changeStock(ctx, [
      { id: 'gin', next: state.withPresent(ready().entryRecords, 'gin', present) },
    ]);
  return { state, ctx, ready, mark };
}

/** A store on a page that goes away: from `leave()` on, a change is asked for and never made. */
function leaving(inner: SharedStore) {
  let gone = false;
  const store: SharedStore = {
    ...inner,
    changeRecords: (space, name, fn) =>
      gone ? new Promise(() => undefined) : inner.changeRecords(space, name, fn),
  };
  return { store, leave: () => void (gone = true) };
}

test('a mark the page did not live to write is written by the next page, from the note left with the change', async () => {
  const inner = sharedStore();
  const local = await openFresh();
  const shared = memory();
  const tab = memory();
  const first = leaving(inner);
  const one = await page(local, first.store, pendingStore(shared, tab));
  const entry = one.ready().selection.entry;
  first.leave();
  one.mark();
  // In the same task as the change, before anything is awaited.
  expect(shared.keys()).toHaveLength(1);
  await new Promise((r) => setTimeout(r, 20));
  expect(await storedStock(inner, entry, 'gin')).toBeUndefined();

  // The reload: the same tab, a new page.
  const two = await page(local, inner, pendingStore(shared, tab));
  expect(await storedStock(inner, entry, 'gin')).toMatchObject({ value: { present: true } });
  expect(two.ready().records.get('gin')).toMatchObject({ present: true });
  expect(shared.keys()).toHaveLength(0);
});

test('control: without notes the same mark is lost, which is what the note is for', async () => {
  const inner = sharedStore();
  const local = await openFresh();
  const first = leaving(inner);
  const one = await page(local, first.store, null);
  const entry = one.ready().selection.entry;
  first.leave();
  one.mark();
  await new Promise((r) => setTimeout(r, 20));
  const two = await page(local, inner, null);
  expect(await storedStock(inner, entry, 'gin')).toBeUndefined();
  expect(two.ready().records.has('gin')).toBe(false);
});

test('control: a write that finishes takes its note away, and a later page writes nothing twice', async () => {
  const inner = sharedStore();
  const local = await openFresh();
  const shared = memory();
  const tab = memory();
  const one = await page(local, inner, pendingStore(shared, tab));
  const entry = one.ready().selection.entry;
  one.mark();
  expect(shared.keys()).toHaveLength(1);
  await one.state.stockWrites();
  expect(shared.keys()).toHaveLength(0);
  const stamp = (await storedStock(inner, entry, 'gin'))?.updatedAt;
  await page(local, inner, pendingStore(shared, tab));
  expect((await storedStock(inner, entry, 'gin'))?.updatedAt).toBe(stamp);
});

test('a mark, its Undo and a new mark, none of them written, end as the mark: the notes are written in the order of the changes', async () => {
  const inner = sharedStore();
  const local = await openFresh();
  const shared = memory();
  const tab = memory();
  const first = leaving(inner);
  const one = await page(local, first.store, pendingStore(shared, tab));
  const entry = one.ready().selection.entry;
  first.leave();
  const undo = one.mark();
  one.state.changeStock(one.ctx, undo);
  one.mark();
  expect(shared.keys()).toHaveLength(3);
  await page(local, inner, pendingStore(shared, tab));
  expect(await storedStock(inner, entry, 'gin')).toMatchObject({ value: { present: true } });

  // And the other way round: mark, then Undo, ends as a removal.
  const second = leaving(inner);
  const three = await page(local, second.store, pendingStore(shared, tab));
  second.leave();
  three.state.changeStock(three.ctx, [{ id: 'gin', next: null }]);
  await page(local, inner, pendingStore(shared, tab));
  expect(await storedStock(inner, entry, 'gin')).toMatchObject({ key: 'gin', deleted: true });
});

test("another tab's note is left alone while that tab may still be writing, and written once it is old", async () => {
  const inner = sharedStore();
  const local = await openFresh();
  const shared = memory();
  let clock = 1_000_000;
  const first = leaving(inner);
  const one = await page(
    local,
    first.store,
    pendingStore(shared, memory(), () => clock),
  );
  const entry = one.ready().selection.entry;
  first.leave();
  one.mark();

  const otherTab = memory();
  clock += OTHER_TAB_WAIT_MS - 1;
  await page(
    local,
    inner,
    pendingStore(shared, otherTab, () => clock),
  );
  expect(await storedStock(inner, entry, 'gin')).toBeUndefined();
  expect(shared.keys()).toHaveLength(1);

  clock += 1;
  await page(
    local,
    inner,
    pendingStore(shared, otherTab, () => clock),
  );
  expect(await storedStock(inner, entry, 'gin')).toMatchObject({ value: { present: true } });
  expect(shared.keys()).toHaveLength(0);
});

test('a note for a space that is gone is dropped and writes nothing', async () => {
  const inner = sharedStore();
  const local = await openFresh();
  const shared = memory();
  const tab = memory();
  await putSpace(inner, 'flat', 'Flat');
  await putSpace(inner, 'cabin', 'Cabin');
  const first = leaving(inner);
  const one = await page(local, first.store, pendingStore(shared, tab));
  first.leave();
  one.state.changeStock(one.ctx, [
    { id: 'gin', next: { ingredientId: 'gin', present: true }, spaceId: 'cabin' },
  ]);
  expect(shared.keys()).toHaveLength(1);
  await inner.removeSpace('cabin');
  await page(local, inner, pendingStore(shared, tab));
  expect(shared.keys()).toHaveLength(0);
  expect((await inner.readCollection('cabin', 'stock')).records).toEqual([]);
});

test('a note nobody can read is taken away; storage that refuses notes nothing and breaks nothing', async () => {
  const shared = memory();
  shared.setItem(`${PENDING_PREFIX}x`, '{"tab":1}');
  const store = pendingStore(shared, memory());
  expect(store.due()).toEqual([]);
  expect(shared.keys()).toHaveLength(0);

  const refusing: KeyValue = {
    length: 0,
    key: () => null,
    getItem: () => null,
    setItem: () => {
      throw new Error('full');
    },
    removeItem: () => undefined,
  };
  const none = pendingStore(refusing, refusing);
  expect(none.add([])).toBe('');
  expect(none.due()).toEqual([]);
  none.remove('');

  const inner = sharedStore();
  const one = await page(await openFresh(), inner, none);
  const entry = one.ready().selection.entry;
  one.mark();
  await one.state.stockWrites();
  expect(await storedStock(inner, entry, 'gin')).toMatchObject({ value: { present: true } });
});
