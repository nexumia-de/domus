// An in-memory storage with etags for the sync tests, and adapters on it.
// Options: keep the ETag of a write in the tick of the previous write (as
// Nextcloud does within one second), fail the next calls, run code between a
// client's read and its write.
import type { AdapterFailure, ReadResult, StorageAdapter, WriteResult } from '@mixtura/engine';

interface File {
  body: string;
  etag: string;
  tick: number;
}

export interface FakeStorage {
  files: Map<string, File>;
  /** Time as the server sees it; the ETag is kept for writes in the tick of the last write. */
  tick: number;
  keepEtagInTick: boolean;
  /** Fail the next `count` calls of `op` (`any` for both) with `failure`. */
  failNext(op: 'read' | 'write' | 'any', count: number, failure: AdapterFailure): void;
  /** Runs before the check of every write (after the client's read): a concurrent writer. */
  beforeWrite?: ((path: string) => void | Promise<void>) | undefined;
  /** Replaces a file as another client would, bypassing every option. */
  put(path: string, body: string): void;
  body(path: string): string | undefined;
  /** An adapter; all adapters of one storage share its files and options. */
  adapter(): StorageAdapter;
  reads: number;
  writes: number;
}

export function createFakeStorage(options: { keepEtagInTick?: boolean } = {}): FakeStorage {
  let counter = 0;
  const failures: { op: string; count: number; failure: AdapterFailure }[] = [];
  const takeFailure = (op: 'read' | 'write'): AdapterFailure | undefined => {
    const hit = failures.find((f) => f.count > 0 && (f.op === op || f.op === 'any'));
    if (!hit) return undefined;
    hit.count -= 1;
    return hit.failure;
  };
  const storage: FakeStorage = {
    files: new Map(),
    tick: 0,
    keepEtagInTick: options.keepEtagInTick ?? false,
    reads: 0,
    writes: 0,
    failNext: (op, count, failure) => void failures.push({ op, count, failure }),
    put(path, body) {
      const old = storage.files.get(path);
      const keep = storage.keepEtagInTick && old !== undefined && old.tick === storage.tick;
      storage.files.set(path, {
        body,
        etag: keep ? old.etag : `e${++counter}`,
        tick: storage.tick,
      });
    },
    body: (path) => storage.files.get(path)?.body,
    adapter: () => ({
      async read(path): Promise<ReadResult> {
        storage.reads += 1;
        const failure = takeFailure('read');
        if (failure) return { ok: false, failure };
        const file = storage.files.get(path);
        return file
          ? { ok: true, missing: false, body: file.body, etag: file.etag }
          : { ok: true, missing: true };
      },
      async write(path, body, ifMatch): Promise<WriteResult> {
        const failure = takeFailure('write');
        if (failure) return { ok: false, failure };
        const hook = storage.beforeWrite;
        if (hook) await hook(path);
        const file = storage.files.get(path);
        if (ifMatch === null && file) return { ok: false, failure: 'conflict' };
        if (typeof ifMatch === 'string' && file?.etag !== ifMatch)
          return { ok: false, failure: 'conflict' };
        storage.writes += 1;
        storage.put(path, body);
        return { ok: true, etag: storage.files.get(path)?.etag as string };
      },
    }),
  };
  return storage;
}
