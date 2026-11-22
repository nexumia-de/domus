// Shared by the tests: the shared database in memory, a clock that moves one
// millisecond per reading, ids that count, and a storage in memory with
// versions, as the adapters give them.
import {
  createMemoryStore,
  deriveSpace,
  newSecret,
  type CollectionSyncOptions,
  type Store,
  type StoredSpace,
} from '@nexumia-de/hospes';
import type { ListDeps } from '../src/list/actions';
import { prefsOn, type Prefs } from '../src/prefs';

export type Adapter = ReturnType<CollectionSyncOptions['adapter']>;

let tick = 0;
/** An injected clock: every reading is one millisecond later, on every "device". */
export const now = (): string => new Date(Date.UTC(2026, 10, 20, 9, 0, 0, tick++)).toISOString();

export function deps(store: Store = createMemoryStore(), prefix = 'e'): ListDeps {
  let n = 0;
  return { store, now, newId: () => `${prefix}${++n}` };
}

export const DEVICE = { type: 'device', address: '' };

export async function putSpace(
  store: Store,
  id: string,
  name: string,
  storage = DEVICE,
): Promise<string> {
  await store.putSpace({ id, secret: `secret-${id}`, name, storage });
  return id;
}

/** A space with a real secret, as the Household app makes one for a storage. */
export async function sharedSpace(name = 'Household'): Promise<StoredSpace> {
  const secret = newSecret();
  const { id } = await deriveSpace(secret);
  return { id, secret, name, storage: { type: 'github', address: 'me/store' } };
}

/** A storage in memory; `down` makes it unreachable. */
export function fakeStorage() {
  const files = new Map<string, { body: string; etag: string }>();
  const state = { down: false, reads: 0, writes: 0 };
  let version = 0;
  const adapter: Adapter = {
    read: (path) => {
      state.reads += 1;
      if (state.down) return Promise.resolve({ ok: false, failure: 'unreachable' });
      const file = files.get(path);
      return Promise.resolve(
        file ? { ok: true, missing: false, ...file } : { ok: true, missing: true },
      );
    },
    write: (path, body, ifMatch) => {
      state.writes += 1;
      if (state.down) return Promise.resolve({ ok: false, failure: 'unreachable' });
      const file = files.get(path);
      if ((file?.etag ?? null) !== ifMatch)
        return Promise.resolve({ ok: false, failure: 'conflict' });
      const etag = `v${++version}`;
      files.set(path, { body, etag });
      return Promise.resolve({ ok: true, etag });
    },
  };
  return { adapter, state, files };
}

/** Prefs in memory. */
export function memoryPrefs(initial: Record<string, string> = {}): Prefs {
  const values = new Map(Object.entries(initial));
  return prefsOn({
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => void values.set(key, value),
  });
}

/** Timers that never fire by themselves: a test asks for cycles itself. */
export const noTimers = { setTimer: () => 0, clearTimer: () => undefined };
export const settle = (): Promise<void> => new Promise((r) => setTimeout(r, 30));
