// An in-memory Store for tests and for the apps' unit tests. It copies what
// it takes and gives, so a caller cannot change stored state by accident.
import { copyState, emptyState, type CollectionState, type Store, type StoredSpace } from './store';

/** A new, empty in-memory store. */
export function createMemoryStore(): Store {
  const spaces = new Map<string, StoredSpace>();
  const collections = new Map<string, CollectionState>();
  const key = (space: string, name: string): string => JSON.stringify([space, name]);
  const read = (space: string, name: string): CollectionState => {
    const hit = collections.get(key(space, name));
    return hit ? copyState(hit) : emptyState();
  };
  const write = (space: string, name: string, state: CollectionState): void => {
    collections.set(key(space, name), copyState(state));
  };
  return {
    listSpaces: () => Promise.resolve([...spaces.values()].map((s) => structuredClone(s))),
    getSpace: (id) => {
      const s = spaces.get(id);
      return Promise.resolve(s ? structuredClone(s) : undefined);
    },
    putSpace: (space) => {
      spaces.set(space.id, structuredClone(space));
      return Promise.resolve();
    },
    removeSpace: (id) => {
      spaces.delete(id);
      for (const k of [...collections.keys()]) {
        if ((JSON.parse(k) as [string, string])[0] === id) collections.delete(k);
      }
      return Promise.resolve();
    },
    readCollection: (space, name) => Promise.resolve(read(space, name)),
    writeCollection: (space, name, state) => {
      write(space, name, state);
      return Promise.resolve();
    },
    changeRecords: async (space, name, fn) => {
      const next = fn(read(space, name));
      write(space, name, next);
      return copyState(next);
    },
  };
}
