// The stock records in memory: read once from the local store, changed
// at once on a toggle (the screen never waits for the disk) and written
// behind it in order. A write that fails puts the old records back and
// says so. Records are kept per place; the screens read the combined view of
// the ticked places and write to the entry place. Docs:
// docs/screens-stock-settings.md#as-built.

import { type AppState } from '../app-state';
import { type AppData } from '../data';
import { type Store } from '../state';
import {
  toStoreError,
  type LocalStore,
  type Stock,
  type StockFields,
  type StockRecord,
} from '../store';
import { strings } from '../strings';
import { showToast } from '../toast';
import { nowInstant } from '../today';
import { combinePlaces } from './combine';

/** The combined stock of the ticked places: one live record per ingredient. */
export type StockRecords = ReadonlyMap<string, StockFields>;

export type StockState =
  | { kind: 'loading' }
  /** `writable` is false in read-only mode (the store failed): marks would not be kept. */
  | { kind: 'ready'; records: StockRecords; writable: boolean };

interface Context {
  state: AppState;
  store: Store<AppState>;
  data: AppData;
  /** The instant for `updatedAt` of a change; the app's clock unless a test passes one. */
  now?: () => string;
}

/** One change: what to put, or null to remove the record (back to "not tracked"). */
export interface StockChange {
  id: string;
  next: StockFields | null;
}

interface Cache {
  local: LocalStore;
  epoch: number;
  state: StockState;
  /** Every place's records, tombstones included; `state.records` is derived from them. */
  byPlace: Map<string, Map<string, StockRecord>>;
  ticked: string[];
  /** The place changes are written to; empty when the store has none (nothing can be written). */
  entry: string;
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
  const entry: Cache = {
    local,
    epoch,
    state: { kind: 'loading' },
    byPlace: new Map(),
    ticked: [],
    entry: '',
  };
  cache = entry;
  Promise.all([local.stock.list(), local.placeSelection()]).then(
    ([list, selection]) => {
      for (const record of list) {
        const place = entry.byPlace.get(record.placeId) ?? new Map<string, StockRecord>();
        place.set(record.ingredientId, record);
        entry.byPlace.set(record.placeId, place);
      }
      entry.ticked = selection.ticked;
      entry.entry = selection.entry;
      finish(entry);
    },
    () => finish(entry),
  );
  function finish(target: Cache): void {
    target.state = {
      kind: 'ready',
      records: combinePlaces(target.byPlace, target.ticked),
      writable: target.entry !== '',
    };
    if (cache === target) bump(store);
  }
  return entry.state;
}

/** Puts records into the entry place's map of the cache and refreshes the combined view. */
function setRecords(entry: Cache, records: ReadonlyMap<string, StockRecord | undefined>): void {
  const place = entry.byPlace.get(entry.entry) ?? new Map<string, StockRecord>();
  for (const [id, record] of records) {
    if (record) place.set(id, record);
    else place.delete(id);
  }
  entry.byPlace.set(entry.entry, place);
  if (entry.state.kind === 'ready') {
    entry.state = { ...entry.state, records: combinePlaces(entry.byPlace, entry.ticked) };
  }
}

/** The record a change stores: the fields for the entry place, stamped, or a tombstone. */
function recordOf(entry: Cache, { id, next }: StockChange, at: string): StockRecord {
  const base = { placeId: entry.entry, ingredientId: id, updatedAt: at };
  return next ? { ...next, ...base } : { ...base, deleted: true };
}

/**
 * Applies changes to the records at once and writes them behind. Returns
 * the change that undoes them (the records as they were).
 */
export function changeStock(context: Context, changes: readonly StockChange[]): StockChange[] {
  const current = stockState(context);
  const entry = cache;
  if (current.kind !== 'ready' || !current.writable || !entry || changes.length === 0) return [];
  // What the entry place held before: Undo puts it back, a failed write restores it exactly.
  const before = new Map(
    changes.map(({ id }) => [id, entry.byPlace.get(entry.entry)?.get(id)] as const),
  );
  const undo = changes.map(({ id }) => {
    const old = before.get(id);
    return { id, next: old && !('deleted' in old) ? old : null };
  });
  const at = (context.now ?? nowInstant)();
  const records = changes.map((change) => recordOf(entry, change, at));
  setRecords(entry, new Map(records.map((r) => [r.ingredientId, r])));
  bump(context.store);
  const local = entry.local;
  queue = queue.then(async () => {
    try {
      for (const record of records) await local.stock.put(record);
    } catch (error) {
      // Put the old records back, unless the screen has moved on to other data.
      if (cache === entry) {
        setRecords(entry, before);
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
export function withPresent(records: StockRecords, id: string, present: boolean): StockFields {
  return { ...records.get(id), ingredientId: id, present };
}

/** Number of records that say "in stock" for ingredients the tree knows. */
export function presentIds(records: StockRecords): string[] {
  return [...records.values()].filter((r) => r.present).map((r) => r.ingredientId);
}
