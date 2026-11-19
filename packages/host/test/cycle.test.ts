// The sync cycle against the memory store and a fake adapter that honours
// ifMatch, can be told to fail and can run code in the middle of a write.
import type { AdapterFailure, ReadResult, StorageAdapter, WriteResult } from '@nexumia-de/materia';
import { describe, expect, test } from 'vitest';
import {
  BadClock,
  collectionPath,
  localChange,
  syncCollection,
  type CycleResult,
} from '../src/cycle';
import { createMemoryStore } from '../src/memory-store';
import { sealCollection } from '../src/seal';
import { deriveSpace, newSecret, type Space } from '../src/space';
import type { Store } from '../src/store';

const space = await deriveSpace(newSecret());
const PATH = collectionPath(space.id, 'list');
const T0 = Date.parse('2026-01-01T00:00:00.000Z');
const day = (n: number, ms = 0): string => new Date(T0 + n * 86_400_000 + ms).toISOString();

interface FakeAdapter extends StorageAdapter {
  files: Map<string, { body: string; etag: string }>;
  writes: number;
  reads: number;
  failRead?: { failure: AdapterFailure; detail?: string };
  failWrite?: { failure: AdapterFailure; detail?: string };
  alwaysConflict: boolean;
  /** Runs before a write is applied (the "something happens meanwhile" hook). */
  beforeWrite?: (n: number) => Promise<void> | void;
}
function fakeAdapter(): FakeAdapter {
  let version = 0;
  const a: FakeAdapter = {
    files: new Map(),
    writes: 0,
    reads: 0,
    alwaysConflict: false,
    read(path): Promise<ReadResult> {
      a.reads++;
      if (a.failRead) return Promise.resolve({ ok: false, ...a.failRead });
      const f = a.files.get(path);
      return Promise.resolve(
        f ? { ok: true, missing: false, body: f.body, etag: f.etag } : { ok: true, missing: true },
      );
    },
    async write(path, body, ifMatch): Promise<WriteResult> {
      a.writes++;
      await a.beforeWrite?.(a.writes);
      if (a.failWrite) return { ok: false, ...a.failWrite };
      const f = a.files.get(path);
      const conflict =
        a.alwaysConflict ||
        (ifMatch === null && f !== undefined) ||
        (typeof ifMatch === 'string' && f?.etag !== ifMatch);
      if (conflict) return { ok: false, failure: 'conflict' };
      const etag = `"v${++version}"`;
      a.files.set(path, { body, etag });
      return { ok: true, etag };
    },
  };
  return a;
}

/** One device: its own store and clock, a shared adapter and space. */
function device(adapter: StorageAdapter, clock = { at: day(0) }, sp: Space = space) {
  const store: Store = createMemoryStore();
  const now = (): string => clock.at;
  return {
    store,
    clock,
    sync: (extra: { attempts?: number } = {}): Promise<CycleResult> =>
      syncCollection({ space: sp, collection: 'list', adapter, store, now, ...extra }),
    put: (key: string, value: unknown) =>
      localChange(store, sp.id, 'list', now, () => ({ put: [{ key, value }] })),
    remove: (key: string) => localChange(store, sp.id, 'list', now, () => ({ remove: [key] })),
    live: async () =>
      Object.fromEntries(
        (await store.readCollection(sp.id, 'list')).records
          .filter((r) => !r.deleted)
          .map((r) => [r.key, r.value]),
      ),
  };
}

describe('syncCollection', () => {
  test('the first cycle writes; the second finds nothing to do', async () => {
    const adapter = fakeAdapter();
    const a = device(adapter);
    await a.put('milk', 1);
    const first = await a.sync();
    expect(first).toEqual({
      ok: true,
      changed: false,
      wrote: true,
      expired: [],
      pruned: [],
      rejected: [],
      pending: false,
    });
    const state = await a.store.readCollection(space.id, 'list');
    expect(state.syncedAt).toBe(day(0));
    expect(state.etag).toBe(adapter.files.get(PATH)?.etag);
    const second = await a.sync();
    expect(second).toMatchObject({ ok: true, wrote: false, changed: false });
    expect(adapter.writes).toBe(1);
  });

  test('the file in the storage is ciphertext at <space id>/<collection>.json', async () => {
    const adapter = fakeAdapter();
    const a = device(adapter);
    await a.put('milk', 'Vollmilch');
    await a.sync();
    expect([...adapter.files.keys()]).toEqual([`${space.id}/list.json`]);
    expect(adapter.files.get(PATH)?.body).not.toContain('Vollmilch');
  });

  test('two devices converge after each made a change', async () => {
    const adapter = fakeAdapter();
    const a = device(adapter);
    const b = device(adapter, { at: day(0, 5000) });
    await a.put('milk', 1);
    await b.put('eggs', 2);
    await a.sync();
    const rb = await b.sync();
    expect(rb).toMatchObject({ ok: true, changed: true, wrote: true });
    await a.sync();
    expect(await a.live()).toEqual({ milk: 1, eggs: 2 });
    expect(await b.live()).toEqual({ milk: 1, eggs: 2 });
  });

  test('a removal on one device removes on the other', async () => {
    const adapter = fakeAdapter();
    const a = device(adapter);
    const b = device(adapter, { at: day(1) });
    await a.put('milk', 1);
    await a.put('eggs', 2);
    await a.sync();
    await b.sync();
    await b.remove('milk');
    await b.sync();
    await a.sync();
    expect(await a.live()).toEqual({ eggs: 2 });
  });

  test('a conflict on write starts over and converges', async () => {
    const adapter = fakeAdapter();
    const a = device(adapter);
    const b = device(adapter, { at: day(0, 5000) });
    await a.put('milk', 1);
    await a.sync();
    await b.sync();
    await a.put('bread', 3);
    await b.put('eggs', 2);
    // While A writes, B gets there first.
    adapter.beforeWrite = async (n) => {
      adapter.beforeWrite = undefined;
      expect(n).toBe(adapter.writes);
      await b.sync();
    };
    const result = await a.sync();
    expect(result).toMatchObject({ ok: true, wrote: true });
    await b.sync();
    expect(await a.live()).toEqual({ milk: 1, bread: 3, eggs: 2 });
    expect(await b.live()).toEqual({ milk: 1, bread: 3, eggs: 2 });
  });

  test('a conflict every time gives conflict after the attempts and stores nothing', async () => {
    const adapter = fakeAdapter();
    const a = device(adapter);
    await a.put('milk', 1);
    adapter.alwaysConflict = true;
    const before = await a.store.readCollection(space.id, 'list');
    expect(await a.sync({ attempts: 3 })).toEqual({ ok: false, failure: 'conflict' });
    expect(adapter.writes).toBe(3);
    expect(adapter.reads).toBe(3);
    expect(await a.store.readCollection(space.id, 'list')).toEqual(before);
  });

  test('an unreadable remote file is not overwritten', async () => {
    const adapter = fakeAdapter();
    const a = device(adapter);
    await a.put('milk', 1);
    const other = await deriveSpace(newSecret());
    const foreign = await sealCollection(other, {
      format: 'materia-collection',
      version: 1,
      space: other.id,
      collection: 'list',
      records: [],
    });
    for (const [body, failure] of [
      [foreign, 'wrong-key'],
      ['plain garbage', 'not-sealed'],
    ] as const) {
      adapter.files.set(PATH, { body, etag: '"x"' });
      const writes = adapter.writes;
      expect(await a.sync()).toMatchObject({ ok: false, failure });
      expect(adapter.writes).toBe(writes);
      expect(adapter.files.get(PATH)?.body).toBe(body);
      expect((await a.store.readCollection(space.id, 'list')).syncedAt).toBeUndefined();
    }
  });

  test('a file of another collection put in its place is wrong-key, not overwritten', async () => {
    const adapter = fakeAdapter();
    const a = device(adapter);
    const stockText = await sealCollection(space, {
      format: 'materia-collection',
      version: 1,
      space: space.id,
      collection: 'stock',
      records: [],
    });
    adapter.files.set(PATH, { body: stockText, etag: '"x"' });
    expect(await a.sync()).toMatchObject({ ok: false, failure: 'wrong-key' });
    expect(adapter.writes).toBe(0);
  });

  test('a change made during a cycle is not lost and gives pending', async () => {
    const adapter = fakeAdapter();
    const a = device(adapter);
    await a.put('milk', 1);
    adapter.beforeWrite = async () => {
      adapter.beforeWrite = undefined;
      a.clock.at = day(0, 1000);
      await a.put('eggs', 2); // the user, while the write is on its way
      await a.remove('milk');
    };
    const result = await a.sync();
    expect(result).toMatchObject({ ok: true, wrote: true, pending: true });
    expect(await a.live()).toEqual({ eggs: 2 });
    expect((await a.store.readCollection(space.id, 'list')).syncedAt).toBe(day(0));
    // The next cycle carries both changes to the file and is not pending.
    a.clock.at = day(0, 2000);
    expect(await a.sync()).toMatchObject({ ok: true, wrote: true, pending: false });
    const b = device(adapter, { at: day(0, 3000) });
    await b.sync();
    expect(await b.live()).toEqual({ eggs: 2 });
  });

  test('a device away longer than the horizon drops what was removed meanwhile, keeps what it edited', async () => {
    const adapter = fakeAdapter();
    const a = device(adapter, { at: day(0) });
    const b = device(adapter, { at: day(1) });
    await a.put('x', 'removed elsewhere');
    await a.put('y', 'edited here');
    await a.put('z', 'untouched');
    await a.sync();
    await b.sync();
    await b.remove('x');
    await b.sync();
    b.clock.at = day(100); // the marker is now older than 90 days and goes
    const pruning = await b.sync();
    expect(pruning).toMatchObject({ ok: true, pruned: ['x'] });
    a.clock.at = day(50);
    await a.put('y', 'edited while away');
    a.clock.at = day(120);
    const result = await a.sync();
    expect(result).toMatchObject({ ok: true, expired: ['x'], changed: true });
    expect(await a.live()).toEqual({ y: 'edited while away', z: 'untouched' });
  });

  test('adapter failures are returned unchanged', async () => {
    const adapter = fakeAdapter();
    const a = device(adapter);
    await a.put('milk', 1);
    adapter.failRead = { failure: 'unreachable', detail: 'offline' };
    expect(await a.sync()).toEqual({ ok: false, failure: 'unreachable', detail: 'offline' });
    adapter.failRead = undefined;
    adapter.failWrite = { failure: 'unauthorised' };
    expect(await a.sync()).toEqual({ ok: false, failure: 'unauthorised' });
    expect((await a.store.readCollection(space.id, 'list')).syncedAt).toBeUndefined();
    adapter.failWrite = undefined;
    adapter.failRead = { failure: 'blocked' };
    expect(await a.sync()).toEqual({ ok: false, failure: 'blocked' });
  });

  test('a bad clock is bad-now', async () => {
    const a = device(fakeAdapter(), { at: 'yesterday' });
    expect(await a.sync()).toEqual({ ok: false, failure: 'bad-now' });
  });

  test('a file of another space inside a valid seal is other-space', async () => {
    const adapter = fakeAdapter();
    const a = device(adapter);
    adapter.files.set(PATH, {
      etag: '"x"',
      body: await sealCollection(space, {
        format: 'materia-collection',
        version: 1,
        space: 'other',
        collection: 'list',
        records: [],
      }),
    });
    expect(await a.sync()).toMatchObject({ ok: false, failure: 'other-space' });
  });
});

describe('localChange', () => {
  test('stamps are later than everything in the collection, even with a clock in the past', async () => {
    const store = createMemoryStore();
    let at = day(10);
    const now = (): string => at;
    const s1 = await localChange(store, 'sp', 'list', now, () => ({
      put: [{ key: 'a', value: 1 }],
    }));
    expect(s1).toBe(day(10));
    at = day(1); // the clock went back
    const s2 = await localChange(store, 'sp', 'list', now, () => ({
      put: [{ key: 'a', value: 2 }],
    }));
    const s3 = await localChange(store, 'sp', 'list', now, () => ({ remove: ['a'] }));
    expect(Date.parse(s2)).toBeGreaterThan(Date.parse(s1));
    expect(Date.parse(s3)).toBeGreaterThan(Date.parse(s2));
    expect((await store.readCollection('sp', 'list')).records).toEqual([
      { key: 'a', updatedAt: s3, deleted: true },
    ]);
  });

  test('removing makes tombstones; an absent or already removed key is skipped; put wins over remove', async () => {
    const store = createMemoryStore();
    const now = (): string => day(0);
    await localChange(store, 'sp', 'list', now, () => ({
      put: [
        { key: 'a', value: 1 },
        { key: 'b', value: 2 },
      ],
    }));
    await localChange(store, 'sp', 'list', now, () => ({ remove: ['a', 'nope'] }));
    const afterFirst = (await store.readCollection('sp', 'list')).records.map((r) => r.key).sort();
    expect(afterFirst).toEqual(['a', 'b']);
    const t = (await store.readCollection('sp', 'list')).records.find((r) => r.key === 'a');
    await localChange(store, 'sp', 'list', now, () => ({ remove: ['a'] }));
    expect((await store.readCollection('sp', 'list')).records.find((r) => r.key === 'a')).toEqual(
      t,
    );
    await localChange(store, 'sp', 'list', now, () => ({
      put: [{ key: 'b', value: 3 }],
      remove: ['b'],
    }));
    expect(
      (await store.readCollection('sp', 'list')).records.find((r) => r.key === 'b')?.value,
    ).toBe(3);
  });

  test('edit sees the current records; syncedAt and etag are kept', async () => {
    const store = createMemoryStore();
    await store.writeCollection('sp', 'list', { records: [], syncedAt: day(0), etag: '"e"' });
    let seen = -1;
    await localChange(
      store,
      'sp',
      'list',
      () => day(1),
      (records) => {
        seen = records.length;
        return { put: [{ key: 'k', value: 1 }] };
      },
    );
    expect(seen).toBe(0);
    expect(await store.readCollection('sp', 'list')).toMatchObject({
      syncedAt: day(0),
      etag: '"e"',
    });
  });

  test('an unreadable clock throws BadClock and changes nothing', async () => {
    const store = createMemoryStore();
    await expect(
      localChange(
        store,
        'sp',
        'list',
        () => 'nope',
        () => ({ put: [{ key: 'k', value: 1 }] }),
      ),
    ).rejects.toBeInstanceOf(BadClock);
    expect((await store.readCollection('sp', 'list')).records).toEqual([]);
  });
});
