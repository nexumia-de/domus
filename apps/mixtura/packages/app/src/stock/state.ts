// The stock records in memory: read once from the local store, changed
// at once on a toggle (the screen never waits for the disk) and written
// behind it in order. A write that fails puts the old records back and
// says so. Records are kept per place; the screens read the combined view of
// the ticked places and write to the entry place. Docs:
// docs/screens-stock-settings.md#as-built.

import { type AppState } from '../app-state';
import { type AppData } from '../data';
import { type Store } from '../state';
import { toStoreError, type LocalStore, type StockFields, type StockRecord } from '../store';
import { strings } from '../strings';
import { showToast } from '../toast';
import { nowInstant } from '../today';
import { combinePlaces, type RecordsByPlace } from './combine';
import { tidy, type Selection } from './places-rules';
import { presentAt } from './places-view';
import { placeWritten } from './written';

/** The combined stock of the ticked places: one live record per ingredient. */
export type StockRecords = ReadonlyMap<string, StockFields>;

export type StockState =
  | { kind: 'loading' }
  /** `writable` is false in read-only mode (the store failed): marks would not be kept. */
  | {
      kind: 'ready';
      records: StockRecords;
      /** The live records of the entry place alone: what a mark in the combined view changes. */
      entryRecords: StockRecords;
      /** For every ingredient present in a ticked place, those places' names; empty with one ticked place. */
      presentAt: ReadonlyMap<string, readonly string[]>;
      selection: Selection;
      byPlace: RecordsByPlace;
      writable: boolean;
    };

export interface StockContext {
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
  /** The place the change is for; the entry place when absent. */
  placeId?: string;
}

/** The records and places in memory; `state` is derived from them by `refresh`. */
export interface Cache {
  local: LocalStore;
  epoch: number;
  state: StockState;
  /** Every place's records, tombstones included. */
  byPlace: Map<string, Map<string, StockRecord>>;
  selection: Selection;
}

let epoch = 0;
let cache: Cache | undefined;
/** Writes run one after the other, so a quick Undo cannot overtake the mark it undoes. */
let queue: Promise<void> = Promise.resolve();

const bump = (app: Store<AppState>): void => app.set({ stockRev: app.get().stockRev + 1 });
const NO_PLACES: Selection = { places: [], ticked: [], entry: '' };

/** The stored records changed behind the screen's back (import, undo of an import): read them again. */
export function invalidateStock(app: Store<AppState>): void {
  epoch += 1;
  bump(app);
}

/** Runs a write after the ones started before it; a failure is the task's to handle. */
export function enqueueWrite(task: () => Promise<void>): void {
  queue = queue.then(task);
}

/** The state derived from the places and records of the cache. */
function derive(entry: Cache): StockState {
  const { byPlace, selection } = entry;
  return {
    kind: 'ready',
    records: combinePlaces(byPlace, selection.ticked),
    entryRecords: combinePlaces(byPlace, [selection.entry]),
    presentAt: presentAt(byPlace, selection.ticked, selection.places),
    selection,
    byPlace,
    writable: selection.entry !== '',
  };
}

/** Recomputes the state after the cache changed and redraws every screen. */
export function refresh(entry: Cache, app: Store<AppState>): void {
  if (entry.state.kind !== 'ready') return;
  entry.state = derive(entry);
  if (cache === entry) bump(app);
}

/** The cache of the current store once it is read, for the place actions; undefined before. */
export function readyCache(context: StockContext): Cache | undefined {
  const current = stockState(context);
  return cache?.state === current && current.kind === 'ready' && current.writable
    ? cache
    : undefined;
}

/** The records, `loading` until the first read finished; the finished read redraws. */
export function stockState({ state, store, data }: StockContext): StockState {
  if (state.seed.kind === 'loading' || state.storage.kind === 'opening') return { kind: 'loading' };
  const local = data.local();
  if (!local) {
    return {
      kind: 'ready',
      records: new Map(),
      entryRecords: new Map(),
      presentAt: new Map(),
      selection: NO_PLACES,
      byPlace: new Map(),
      writable: false,
    };
  }
  if (cache?.local === local && cache.epoch === epoch) return cache.state;
  const entry: Cache = {
    local,
    epoch,
    state: { kind: 'loading' },
    byPlace: new Map(),
    selection: NO_PLACES,
  };
  cache = entry;
  Promise.all([local.stock.list(), local.placeSelection()]).then(
    ([list, selection]) => {
      for (const record of list) {
        const place = entry.byPlace.get(record.placeId) ?? new Map<string, StockRecord>();
        place.set(record.ingredientId, record);
        entry.byPlace.set(record.placeId, place);
      }
      entry.selection = tidy(selection);
      finish(entry);
    },
    () => finish(entry),
  );
  function finish(target: Cache): void {
    target.state = derive(target);
    if (cache === target) bump(store);
  }
  return entry.state;
}

/** Puts records into their places' maps of the cache and refreshes the derived view. */
function setRecords(
  entry: Cache,
  records: readonly { placeId: string; id: string; record: StockRecord | undefined }[],
): void {
  for (const { placeId, id, record } of records) {
    const place = entry.byPlace.get(placeId) ?? new Map<string, StockRecord>();
    if (record) place.set(id, record);
    else place.delete(id);
    entry.byPlace.set(placeId, place);
  }
  if (entry.state.kind === 'ready') entry.state = derive(entry);
}

/** Replaces all records of one place in the cache (place removed or restored). */
export function setPlaceRecords(
  entry: Cache,
  placeId: string,
  records: Map<string, StockRecord> | null,
): void {
  if (records) entry.byPlace.set(placeId, records);
  else entry.byPlace.delete(placeId);
}

/** The record a change stores: the fields for the place, stamped, or a tombstone. */
function recordOf(placeId: string, { id, next }: StockChange, at: string): StockRecord {
  const base = { placeId, ingredientId: id, updatedAt: at };
  return next ? { ...next, ...base } : { ...base, deleted: true };
}

/**
 * Applies changes to the records at once and writes them behind. A change names its place or goes
 * to the entry place. Returns the changes that undo them (the records as they were).
 */
export function changeStock(context: StockContext, changes: readonly StockChange[]): StockChange[] {
  const current = stockState(context);
  const entry = cache;
  if (current.kind !== 'ready' || !current.writable || !entry || changes.length === 0) return [];
  const where = (c: StockChange): string => c.placeId ?? entry.selection.entry;
  // What the places held before: Undo puts it back, a failed write restores it exactly.
  const before = changes.map((c) => ({
    placeId: where(c),
    id: c.id,
    record: entry.byPlace.get(where(c))?.get(c.id),
  }));
  const undo = before.map(({ placeId, id, record }) => ({
    id,
    placeId,
    next: record && !('deleted' in record) ? record : null,
  }));
  const at = (context.now ?? nowInstant)();
  const records = changes.map((c) => recordOf(where(c), c, at));
  setRecords(
    entry,
    records.map((record) => ({ placeId: record.placeId, id: record.ingredientId, record })),
  );
  bump(context.store);
  const local = entry.local;
  enqueueWrite(async () => {
    try {
      for (const record of records) await local.stock.put(record);
      for (const placeId of new Set(records.map((r) => r.placeId))) placeWritten(placeId);
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
