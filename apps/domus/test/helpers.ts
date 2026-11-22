// A fake storage shared by several simulated devices, and the dependencies of one device.
import {
  UnknownStorage,
  createMemoryStore,
  isDeviceOnly,
  type FindRepositoriesResult,
  type GithubConnectionResult,
  type Store,
} from '@nexumia-de/hospes';
import type { ReadResult, StorageAdapter, WriteResult } from '@nexumia-de/materia';
import type { Deps } from '../src/logic/actions';

export interface Remote {
  files: Map<string, { body: string; etag: string }>;
  /** A failure every read returns, or undefined. */
  failRead: { failure: 'unauthorised' | 'server' | 'blocked'; detail?: string } | undefined;
  adapter: StorageAdapter;
  writes: number;
  reads: number;
}

export function createRemote(): Remote {
  let counter = 0;
  const remote: Remote = {
    files: new Map(),
    failRead: undefined,
    writes: 0,
    reads: 0,
    adapter: {
      read(path): Promise<ReadResult> {
        remote.reads += 1;
        if (remote.failRead) return Promise.resolve({ ok: false, ...remote.failRead });
        const file = remote.files.get(path);
        return Promise.resolve(
          file
            ? { ok: true, missing: false, body: file.body, etag: file.etag }
            : { ok: true, missing: true },
        );
      },
      write(path, body, ifMatch): Promise<WriteResult> {
        const file = remote.files.get(path);
        if (ifMatch === null && file) return Promise.resolve({ ok: false, failure: 'conflict' });
        if (typeof ifMatch === 'string' && file?.etag !== ifMatch)
          return Promise.resolve({ ok: false, failure: 'conflict' });
        counter += 1;
        remote.writes += 1;
        const etag = `e${counter}`;
        remote.files.set(path, { body, etag });
        return Promise.resolve({ ok: true, etag });
      },
    },
  };
  return remote;
}

export interface Device {
  deps: Deps;
  store: Store;
  tick: () => void;
  github: {
    find: FindRepositoriesResult;
    test: GithubConnectionResult;
    tested: { repository: string; token: string }[];
  };
}

/** One device: its own memory store and clock, the shared remote. */
export function createDevice(remote: Remote, startAt = Date.UTC(2026, 10, 19, 12, 0, 0)): Device {
  const store = createMemoryStore();
  let at = startAt;
  const github: Device['github'] = {
    find: { ok: true, repositories: [], more: false },
    test: { state: 'reachable', private: true, canWrite: true, empty: false },
    tested: [],
  };
  return {
    store,
    github,
    tick: () => {
      at += 60_000;
    },
    deps: {
      store,
      now: () => {
        at += 1000;
        return new Date(at).toISOString();
      },
      // As the host's `adapterFor`: a space on this device only has no adapter.
      adapter: (storage) => {
        if (isDeviceOnly({ storage })) throw new UnknownStorage(storage.type);
        return remote.adapter;
      },
      findRepositories: () => Promise.resolve(github.find),
      testGithub: (repository, token) => {
        github.tested.push({ repository, token });
        return Promise.resolve(github.test);
      },
    },
  };
}
