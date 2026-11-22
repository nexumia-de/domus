// The Store port on plain files, for a host without IndexedDB (a native app):
// one file with the spaces and one per collection of a space, each written
// whole. What a file is and where it lies is the caller's: a `Files` port
// with synchronous read, write and remove. See docs/spaces.md#local-data.
import { type CollectionState, type Store, type StoredSpace, emptyState } from './store';

/**
 * Text files by name. Synchronous, so a read-modify-write of one file cannot be
 * interleaved inside one process; `write` must replace the file atomically
 * (write beside it and rename), so a crash leaves the old or the new content.
 */
export interface Files {
  /** The content, or null when there is no such file. */
  read(name: string): string | null;
  write(name: string, text: string): void;
  /** Removing a file that is not there is no error. */
  remove(name: string): void;
  /** The names of all files. */
  list(): string[];
}

/** A file's content is not what this store wrote. */
export class StoreFileError extends Error {
  constructor(name: string) {
    super(`The local file ${name} could not be read`);
    this.name = 'StoreFileError';
  }
}

const SPACES = 'spaces.json';
// Space ids are hex and collection names are the apps' own words; anything else in a name
// is encoded, so a name can never leave the folder.
const safe = (part: string): string => encodeURIComponent(part).replaceAll('.', '%2E');
const collectionFile = (space: string, name: string): string => `${safe(space)}.${safe(name)}.json`;

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/**
 * A store on `files`. One process owns the folder: two processes writing the same folder
 * can lose each other's changes (a native app is single-instance).
 */
export function createFileStore(files: Files): Store {
  function parse<T>(name: string, fallback: T): T {
    const text = files.read(name);
    if (text === null) return fallback;
    try {
      return JSON.parse(text) as T;
    } catch {
      // Never treated as empty: writing over a file that cannot be read would lose it.
      throw new StoreFileError(name);
    }
  }
  const spaces = (): StoredSpace[] => {
    const list = parse<unknown>(SPACES, []);
    if (!Array.isArray(list)) throw new StoreFileError(SPACES);
    return list as StoredSpace[];
  };
  const read = (space: string, name: string): CollectionState => {
    const file = collectionFile(space, name);
    const state = parse<CollectionState | null>(file, null);
    if (state === null) return emptyState();
    if (typeof state !== 'object' || !Array.isArray(state.records)) throw new StoreFileError(file);
    return state;
  };
  const write = (space: string, name: string, state: CollectionState): void =>
    files.write(collectionFile(space, name), JSON.stringify(state));
  // Every method does its work in one synchronous step and reports a failure as a rejection.
  const attempt = <T>(work: () => T): Promise<T> => {
    try {
      return Promise.resolve(work());
    } catch (error) {
      return Promise.reject(error instanceof Error ? error : new Error(String(error)));
    }
  };

  return {
    listSpaces: () => attempt(spaces),
    getSpace: (id) => attempt(() => spaces().find((space) => space.id === id)),
    putSpace: (space) =>
      attempt(() => {
        const others = spaces().filter((other) => other.id !== space.id);
        files.write(SPACES, JSON.stringify([...others, clone(space)]));
      }),
    removeSpace: (id) =>
      attempt(() => {
        files.write(SPACES, JSON.stringify(spaces().filter((space) => space.id !== id)));
        const prefix = `${safe(id)}.`;
        for (const name of files.list()) {
          if (name !== SPACES && name.startsWith(prefix)) files.remove(name);
        }
      }),
    readCollection: (space, name) => attempt(() => read(space, name)),
    writeCollection: (space, name, state) => attempt(() => write(space, name, state)),
    changeRecords: (space, name, fn) =>
      attempt(() => {
        const next = fn(read(space, name));
        write(space, name, next);
        return clone(next);
      }),
  };
}

/** Files in memory, for tests. */
export function createMemoryFiles(): Files & { all: Map<string, string> } {
  const all = new Map<string, string>();
  return {
    all,
    read: (name) => all.get(name) ?? null,
    write: (name, text) => void all.set(name, text),
    remove: (name) => void all.delete(name),
    list: () => [...all.keys()],
  };
}
