// The stock records in memory: read once from the local store, changed
// at once on a toggle (the screen never waits for the disk) and written
// behind it in order. A write that fails puts the old records back and
// says so. The records are the collection `stock` of every space on the
// device (source.ts); the screens read the combined view of the ticked spaces
// and write to the entry space. Docs: docs/screens-stock-settings.md#as-built.

import { type AppState } from '../app-state';
import { type AppData } from '../data';
import { type Store } from '../state';
import { toStoreError, type LocalStore, type StockFields, type StockRecord } from '../store';
import { strings } from '../strings';
import { say } from '../shell/frame';
import { nowInstant } from '../today';
import { combineSpaces, type RecordsBySpace } from './combine';
import { resolveSelection, sameSetting, type Selection } from './spaces-rules';
import { loadStock, writeStock } from './source';
import { presentIds, withPresent, type StockRecords } from './marks';
import { presentAt } from './spaces-view';
import { spaceWritten } from './written';

export type StockState =
  | { kind: 'loading' }
  /** `writable` is false in read-only mode (the store failed): marks would not be kept. */
  | {
      kind: 'ready';
      records: StockRecords;
      /** The live records of the entry space alone: what a mark in the combined view changes. */
      entryRecords: StockRecords;
      /** For every ingredient present in a ticked space, those spaces' names; empty with one ticked space. */
      presentAt: ReadonlyMap<string, readonly string[]>;
      selection: Selection;
      bySpace: RecordsBySpace;
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
  /** The space the change is for; the entry space when absent. */
  spaceId?: string;
}

/** The records and spaces in memory; `state` is derived from them by `refresh`. */
export interface Cache {
  local: LocalStore;
  epoch: number;
  state: StockState;
  /** Every space's records, tombstones included. */
  bySpace: Map<string, Map<string, StockRecord>>;
  selection: Selection;
}

let epoch = 0;
let cache: Cache | undefined;
/** Every write that is under way; settles when all of them have. */
let queue: Promise<void> = Promise.resolve();

const bump = (app: Store<AppState>): void => app.set({ stockRev: app.get().stockRev + 1 });
const NO_SPACES: Selection = { spaces: [], ticked: [], entry: '' };

/** The stored records changed behind the screen's back (import, undo of an import): read them again. */
export function invalidateStock(app: Store<AppState>): void {
  epoch += 1;
  bump(app);
}

/**
 * Starts a write now and tracks it; a failure is the task's to handle. A write does not wait for
 * the ones before it: the store creates its transactions in the order they are asked for, so a
 * quick Undo cannot overtake the mark it undoes, and a page that reloads at once has every write
 * asked for already in the store. Waiting for the earlier write first lost the last mark of a
 * mark, Undo, mark in quick succession (packages/host/docs/sync-orderings.md).
 */
export function enqueueWrite(task: () => Promise<void>): void {
  const run = task().catch(() => undefined);
  queue = Promise.all([queue, run]).then(() => undefined);
}

/** The state derived from the spaces and records of the cache. */
function derive(entry: Cache): StockState {
  const { bySpace, selection } = entry;
  return {
    kind: 'ready',
    records: combineSpaces(bySpace, selection.ticked),
    entryRecords: combineSpaces(bySpace, [selection.entry]),
    presentAt: presentAt(bySpace, selection.ticked, selection.spaces),
    selection,
    bySpace,
    writable: selection.entry !== '',
  };
}

/** Recomputes the state after the cache changed and redraws every screen. */
export function refresh(entry: Cache, app: Store<AppState>): void {
  if (entry.state.kind !== 'ready') return;
  entry.state = derive(entry);
  if (cache === entry) bump(app);
}

/** The cache of the current store once it is read, for the space actions; undefined before. */
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
      selection: NO_SPACES,
      bySpace: new Map(),
      writable: false,
    };
  }
  if (cache?.local === local && cache.epoch === epoch) return cache.state;
  const entry: Cache = {
    local,
    epoch,
    state: { kind: 'loading' },
    bySpace: new Map(),
    selection: NO_SPACES,
  };
  cache = entry;
  const names = { home: strings.spaces.home, unnamed: strings.spaces.unnamed };
  // After the writes that are under way: a read that overtook a mark would show the stock
  // without it, and nothing would read again.
  queue
    .then(() => Promise.all([loadStock(data.shared, names), local.settings.load()]))
    .then(
      ([{ spaces, rows }, settings]) => {
        for (const record of rows) {
          const space = entry.bySpace.get(record.spaceId) ?? new Map<string, StockRecord>();
          space.set(record.ingredientId, record);
          entry.bySpace.set(record.spaceId, space);
        }
        const hasStock = (id: string): boolean =>
          [...(entry.bySpace.get(id)?.values() ?? [])].some((r) => !('deleted' in r));
        const resolved = resolveSelection(spaces, settings.spaces, hasStock);
        entry.selection = resolved.selection;
        // A space that is new on this device, or gone: keep what was decided about it.
        if (!sameSetting(resolved.setting, settings.spaces)) {
          void local.settings.set('spaces', resolved.setting).catch(() => undefined);
        }
        finish(entry);
        void data.sync.refresh();
      },
      () => finish(entry),
    );
  function finish(target: Cache): void {
    target.state = derive(target);
    if (cache === target) bump(store);
  }
  return entry.state;
}

/** Puts records into their spaces' maps of the cache and refreshes the derived view. */
function setRecords(
  entry: Cache,
  records: readonly { spaceId: string; id: string; record: StockRecord | undefined }[],
): void {
  for (const { spaceId, id, record } of records) {
    const space = entry.bySpace.get(spaceId) ?? new Map<string, StockRecord>();
    if (record) space.set(id, record);
    else space.delete(id);
    entry.bySpace.set(spaceId, space);
  }
  if (entry.state.kind === 'ready') entry.state = derive(entry);
}

/** The record a change stores: the fields for the space, stamped, or a tombstone. */
function recordOf(spaceId: string, { id, next }: StockChange, at: string): StockRecord {
  const base = { spaceId, ingredientId: id, updatedAt: at };
  return next ? { ...next, ...base } : { ...base, deleted: true };
}

/**
 * Applies changes to the records at once and writes them behind. A change names its space or goes
 * to the entry space. Returns the changes that undo them (the records as they were).
 */
export function changeStock(context: StockContext, changes: readonly StockChange[]): StockChange[] {
  const current = stockState(context);
  const entry = cache;
  if (current.kind !== 'ready' || !current.writable || !entry || changes.length === 0) return [];
  const where = (c: StockChange): string => c.spaceId ?? entry.selection.entry;
  // What the spaces held before: Undo puts it back, a failed write restores it exactly.
  const before = changes.map((c) => ({
    spaceId: where(c),
    id: c.id,
    record: entry.bySpace.get(where(c))?.get(c.id),
  }));
  const undo = before.map(({ spaceId, id, record }) => ({
    id,
    spaceId,
    next: record && !('deleted' in record) ? record : null,
  }));
  const at = (context.now ?? nowInstant)();
  const records = changes.map((c) => recordOf(where(c), c, at));
  setRecords(
    entry,
    records.map((record) => ({ spaceId: record.spaceId, id: record.ingredientId, record })),
  );
  bump(context.store);
  const shared = context.data.shared;
  enqueueWrite(async () => {
    try {
      await writeStock(shared, records, context.now ?? nowInstant);
      for (const spaceId of new Set(records.map((r) => r.spaceId))) spaceWritten(spaceId);
      // Stock is the user's data too: the first mark asks the browser to keep the storage,
      // as the first write of a drink does (docs/store.md#persistent-storage).
      void entry.local.persistence
        .requestOnce()
        .then((persistence) => context.store.set({ persistence }))
        .catch(() => undefined);
    } catch (error) {
      // Put the old records back, unless the screen has moved on to other data.
      if (cache === entry) {
        setRecords(entry, before);
        bump(context.store);
      }
      say(`${strings.data.notSaved}. ${toStoreError(error).message}`);
    }
  });
  return undo;
}

/** Waits for the writes started so far; for tests. */
export const stockWrites = (): Promise<void> => queue;

export { presentIds, withPresent, type StockRecords };
