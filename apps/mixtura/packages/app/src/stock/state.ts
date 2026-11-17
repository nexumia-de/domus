// The stock records in memory: read once from the local store, changed
// at once on a toggle (the screen never waits for the disk) and written
// behind it in order. A write that fails puts the old records back and
// says so. Docs: docs/screens-stock-settings.md#as-built.

import { type AppState } from '../app-state';
import { type AppData } from '../data';
import { type Store } from '../state';
import { toStoreError, type LocalStore, type Stock } from '../store';
import { strings } from '../strings';
import { showToast } from '../toast';

export type StockRecords = ReadonlyMap<string, Stock>;

export type StockState =
  | { kind: 'loading' }
  /** `writable` is false in read-only mode (the store failed): marks would not be kept. */
  | { kind: 'ready'; records: StockRecords; writable: boolean };

interface Context {
  state: AppState;
  store: Store<AppState>;
  data: AppData;
}

/** One change: the record to put, or null to delete it (back to "not tracked"). */
export interface StockChange {
  id: string;
  next: Stock | null;
}

interface Cache {
  local: LocalStore;
  epoch: number;
  state: StockState;
}

let epoch = 0;
let cache: Cache | undefined;
/** Writes run one after the other, so a quick Undo cannot overtake the mark it undoes. */
let queue: Promise<void> = Promise.resolve();

const bump = (app: Store<AppState>): void => app.set({ stockRev: app.get().stockRev + 1 });

/** The stored records changed behind the screen's back (import, undo of an import): read them again. */
export function invalidateStock(app: Store<AppState>): void {
  epoch += 1;
  bump(app);
}

/** The records, `loading` until the first read finished; the finished read redraws. */
export function stockState({ state, store, data }: Context): StockState {
  if (state.seed.kind === 'loading' || state.storage.kind === 'opening') return { kind: 'loading' };
  const local = data.local();
  if (!local) return { kind: 'ready', records: new Map(), writable: false };
  if (cache?.local === local && cache.epoch === epoch) return cache.state;
  const entry: Cache = { local, epoch, state: { kind: 'loading' } };
  cache = entry;
  local.stock.list().then(
    (list) => finish(entry, new Map(list.map((r) => [r.ingredientId, r]))),
    () => finish(entry, new Map()),
  );
  function finish(target: Cache, records: StockRecords): void {
    target.state = { kind: 'ready', records, writable: true };
    if (cache === target) bump(store);
  }
  return entry.state;
}

function applyToRecords(records: StockRecords, changes: readonly StockChange[]): StockRecords {
  const next = new Map(records);
  for (const { id, next: record } of changes) {
    if (record) next.set(id, record);
    else next.delete(id);
  }
  return next;
}

/**
 * Applies changes to the records at once and writes them behind. Returns
 * the change that undoes them (the records as they were).
 */
export function changeStock(context: Context, changes: readonly StockChange[]): StockChange[] {
  const current = stockState(context);
  const entry = cache;
  if (current.kind !== 'ready' || !current.writable || !entry || changes.length === 0) return [];
  const undo = changes.map(({ id }) => ({ id, next: current.records.get(id) ?? null }));
  entry.state = { ...current, records: applyToRecords(current.records, changes) };
  bump(context.store);
  const local = entry.local;
  queue = queue.then(async () => {
    try {
      for (const { id, next } of changes) {
        if (next) await local.stock.put(next);
        else await local.stock.delete(id);
      }
    } catch (error) {
      // Put the old records back, unless the screen has moved on to other data.
      if (cache === entry && entry.state.kind === 'ready') {
        entry.state = { ...entry.state, records: applyToRecords(entry.state.records, undo) };
        bump(context.store);
      }
      showToast(context.store, `${strings.data.notSaved}. ${toStoreError(error).message}`);
    }
  });
  return undo;
}

/** Waits for the writes started so far; for tests. */
export const stockWrites = (): Promise<void> => queue;

/** The record that marks an ingredient in stock or out, keeping its other fields. */
export function withPresent(records: StockRecords, id: string, present: boolean): Stock {
  return { ...records.get(id), ingredientId: id, present };
}

/** Number of records that say "in stock" for ingredients the tree knows. */
export function presentIds(records: StockRecords): string[] {
  return [...records.values()].filter((r) => r.present).map((r) => r.ingredientId);
}
