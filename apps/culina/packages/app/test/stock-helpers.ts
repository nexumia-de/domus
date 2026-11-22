// Helpers of the stock tests: a storage in memory with etags (a stand-in for WebDAV or GitHub),
// prefs in memory, and the notebook started on a shared database in memory. What they do not
// prove: no real storage, no real IndexedDB for the shared database, an injected clock.
import type { CollectionState, Store as SharedStore, adapterFor } from '@nexumia-de/hospes';
import { createMemoryStore } from '@nexumia-de/hospes';
import { addExamples, startNotebook } from '../src/notebook';
import type { KeyValueStore } from '../src/prefs';
import { freshFactory } from './store-helpers';

/** A storage adapter, as the host package's `adapterFor` gives one. */
type Adapter = ReturnType<typeof adapterFor>;

/** A storage in memory: files with etags, a write needs the etag it read (or none for a new file). */
export function memoryStorage() {
  const files = new Map<string, { body: string; etag: string }>();
  let version = 0;
  const adapter: Adapter = {
    read: (path) => {
      const file = files.get(path);
      return Promise.resolve(
        file ? { ok: true, missing: false, ...file } : { ok: true, missing: true },
      );
    },
    write: (path, body, ifMatch) => {
      const file = files.get(path);
      if (ifMatch !== undefined && (file?.etag ?? null) !== ifMatch) {
        return Promise.resolve({ ok: false, failure: 'conflict' });
      }
      const etag = `e${++version}`;
      files.set(path, { body, etag });
      return Promise.resolve({ ok: true, etag });
    },
  };
  return { adapter, files };
}

/** Prefs in memory, as localStorage would keep them. */
export const memoryPrefs = (initial: Record<string, string> = {}): KeyValueStore => {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => void values.set(key, value),
  };
};

/** Timers that never fire by themselves. */
export const noTimers = { setTimer: () => 0, clearTimer: () => undefined };

export const NOW = '2026-11-18T08:00:00.000Z';

/**
 * The notebook with the examples, its stock in `shared` (a new memory store by default).
 * `factory` is Culina's own database, so a test can start twice on the same data.
 */
export async function startWithStock(
  options: {
    shared?: SharedStore;
    prefs?: KeyValueStore;
    factory?: IDBFactory;
    now?: () => string;
    examples?: boolean;
  } = {},
) {
  const shared = options.shared ?? createMemoryStore();
  const factory = options.factory ?? freshFactory();
  await startNotebook({
    indexedDB: factory,
    now: options.now ?? (() => NOW),
    shared,
    prefs: options.prefs ?? memoryPrefs(),
    sync: noTimers,
  });
  if (options.examples !== false) await addExamples();
  return { shared, factory };
}

/** The records of the collection `stock` of a space, live ones only, as key and value. */
export const liveStock = async (
  shared: SharedStore,
  spaceId: string,
): Promise<Record<string, unknown>> => {
  const state: CollectionState = await shared.readCollection(spaceId, 'stock');
  return Object.fromEntries(
    state.records.filter((r) => r.deleted !== true).map((r) => [r.key, r.value]),
  );
};
