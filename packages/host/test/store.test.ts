// One suite, run against every Store implementation.
import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, test } from 'vitest';
import { StoreBlocked, StoreOpenError, createIdbStore } from '../src/idb-store';
import { StoreFileError, createFileStore, createMemoryFiles } from '../src/file-store';
import { createMemoryStore } from '../src/memory-store';
import type { Store, StoredSpace } from '../src/store';
import { localChange, syncCollection } from '../src/cycle';
import { deriveSpace, newSecret } from '../src/space';

const sp = (id: string, extra: Partial<StoredSpace> = {}): StoredSpace => ({
  id,
  secret: 's'.repeat(43),
  storage: { type: 'webdav', address: 'https://dav.example/x' },
  ...extra,
});
const rec = (key: string, value: unknown, at = '2026-11-19T10:00:00.000Z') => ({
  key,
  updatedAt: at,
  value,
});

describe.each<[string, () => Store]>([
  ['memory', createMemoryStore],
  ['indexeddb', () => createIdbStore({ factory: new IDBFactory() })],
  ['files', () => createFileStore(createMemoryFiles())],
])('Store: %s', (_name, make) => {
  test('spaces: put, get, list, replace, remove', async () => {
    const s = make();
    expect(await s.listSpaces()).toEqual([]);
    expect(await s.getSpace('a')).toBeUndefined();
    await s.putSpace(
      sp('a', {
        name: 'Home',
        storage: { type: 'github', address: 'o/r', access: { token: 't' } },
      }),
    );
    await s.putSpace(sp('b'));
    expect((await s.getSpace('a'))?.storage.access).toEqual({ token: 't' });
    expect((await s.listSpaces()).map((x) => x.id).sort()).toEqual(['a', 'b']);
    await s.putSpace(sp('a', { name: 'Renamed' }));
    expect((await s.getSpace('a'))?.name).toBe('Renamed');
    expect((await s.getSpace('a'))?.storage.access).toBeUndefined();
    await s.removeSpace('a');
    expect(await s.getSpace('a')).toBeUndefined();
    expect((await s.listSpaces()).length).toBe(1);
  });

  test('an unknown collection is empty', async () => {
    expect(await make().readCollection('a', 'list')).toEqual({ records: [] });
  });

  test('write replaces the stored state, read gives it back', async () => {
    const s = make();
    await s.writeCollection('a', 'list', {
      records: [rec('x', { n: 1 })],
      syncedAt: '2026-11-19T10:00:00.000Z',
      etag: '"e1"',
    });
    await s.writeCollection('a', 'list', { records: [rec('y', 2)] });
    expect(await s.readCollection('a', 'list')).toEqual({ records: [rec('y', 2)] });
    expect(await s.readCollection('a', 'stock')).toEqual({ records: [] });
    expect(await s.readCollection('b', 'list')).toEqual({ records: [] });
  });

  test('what is read is a copy', async () => {
    const s = make();
    await s.writeCollection('a', 'list', { records: [rec('x', { n: 1 })] });
    const first = await s.readCollection('a', 'list');
    (first.records[0]?.value as { n: number }).n = 99;
    expect((await s.readCollection('a', 'list')).records[0]?.value).toEqual({ n: 1 });
  });

  test('changeRecords: read-modify-write, returns the new state', async () => {
    const s = make();
    const out = await s.changeRecords('a', 'list', (c) => ({
      ...c,
      records: [...c.records, rec('x', 1)],
    }));
    expect(out.records).toHaveLength(1);
    await s.changeRecords('a', 'list', (c) => ({ ...c, etag: '"e"' }));
    expect(await s.readCollection('a', 'list')).toEqual({ records: [rec('x', 1)], etag: '"e"' });
  });

  test('parallel changeRecords calls do not lose each other', async () => {
    const s = make();
    await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        s.changeRecords('a', 'list', (c) => ({ ...c, records: [...c.records, rec(`k${i}`, i)] })),
      ),
    );
    expect((await s.readCollection('a', 'list')).records).toHaveLength(10);
  });

  test('a throwing fn changes nothing and the error reaches the caller', async () => {
    const s = make();
    await s.writeCollection('a', 'list', { records: [rec('x', 1)] });
    await expect(
      s.changeRecords('a', 'list', () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    expect((await s.readCollection('a', 'list')).records).toHaveLength(1);
  });

  test('removeSpace removes its collections and only its own', async () => {
    const s = make();
    await s.putSpace(sp('a'));
    await s.putSpace(sp('ab'));
    await s.writeCollection('a', 'list', { records: [rec('x', 1)] });
    await s.writeCollection('a', 'stock', { records: [rec('x', 1)] });
    await s.writeCollection('ab', 'list', { records: [rec('y', 1)] });
    await s.removeSpace('a');
    expect(await s.readCollection('a', 'list')).toEqual({ records: [] });
    expect(await s.readCollection('a', 'stock')).toEqual({ records: [] });
    expect((await s.readCollection('ab', 'list')).records).toHaveLength(1);
  });
});

describe('IndexedDB store', () => {
  test('the database is named domus, version 1, with the two stores', async () => {
    const factory = new IDBFactory();
    const s = createIdbStore({ factory });
    await s.putSpace(sp('a'));
    s.close();
    const dbs = await factory.databases();
    expect(dbs).toEqual([{ name: 'domus', version: 1 }]);
    const db = await new Promise<IDBDatabase>((res) => {
      const r = factory.open('domus');
      r.onsuccess = () => res(r.result);
    });
    expect([...db.objectStoreNames].sort()).toEqual(['collections', 'spaces']);
    db.close();
  });

  test('two store objects on one factory share the data (as two apps do)', async () => {
    const factory = new IDBFactory();
    const a = createIdbStore({ factory });
    const b = createIdbStore({ factory });
    await a.putSpace(sp('a'));
    expect(await b.getSpace('a')).toBeDefined();
  });

  test('an open error is a rejected StoreOpenError, and the next call tries again', async () => {
    const real = new IDBFactory();
    let fail = true;
    const factory = {
      open: (n: string, v?: number) => {
        if (fail) throw new Error('private mode');
        return real.open(n, v);
      },
    } as unknown as IDBFactory;
    const s = createIdbStore({ factory });
    await expect(s.listSpaces()).rejects.toBeInstanceOf(StoreOpenError);
    fail = false;
    expect(await s.listSpaces()).toEqual([]);
  });

  test('a blocked upgrade is a rejected StoreBlocked', async () => {
    // fake-indexeddb cannot produce a block at version 1; a factory that
    // fires the event stands in for another tab holding an older version.
    const factory = {
      open: () => {
        const req = {} as IDBOpenDBRequest;
        queueMicrotask(() => (req.onblocked as () => void)());
        return req;
      },
    } as unknown as IDBFactory;
    await expect(createIdbStore({ factory }).listSpaces()).rejects.toBeInstanceOf(StoreBlocked);
  });
});

describe('file store', () => {
  test('one file for the spaces and one per collection, named so that nothing leaves the folder', async () => {
    const files = createMemoryFiles();
    const s = createFileStore(files);
    await s.putSpace(sp('abc'));
    await s.writeCollection('abc', 'list', { records: [rec('k', 1)] });
    await s.writeCollection('abc', '../../etc/x.y', { records: [] });
    expect([...files.all.keys()].sort()).toEqual([
      'abc.%2E%2E%2F%2E%2E%2Fetc%2Fx%2Ey.json',
      'abc.list.json',
      'spaces.json',
    ]);
  });

  test('two stores on the same files share the data (a restart of the app)', async () => {
    const files = createMemoryFiles();
    const first = createFileStore(files);
    await first.putSpace(sp('a', { name: 'Home' }));
    await first.writeCollection('a', 'list', { records: [rec('k', 1)], syncedAt: 't', etag: 'e' });
    const second = createFileStore(files);
    expect((await second.getSpace('a'))?.name).toBe('Home');
    expect(await second.readCollection('a', 'list')).toEqual({
      records: [rec('k', 1)],
      syncedAt: 't',
      etag: 'e',
    });
  });

  test('removing a space leaves the files of a space whose id starts the same', async () => {
    const files = createMemoryFiles();
    const s = createFileStore(files);
    await s.putSpace(sp('a'));
    await s.putSpace(sp('ab'));
    await s.writeCollection('a', 'list', { records: [rec('k', 1)] });
    await s.writeCollection('ab', 'list', { records: [rec('k', 2)] });
    await s.removeSpace('a');
    expect([...files.all.keys()].sort()).toEqual(['ab.list.json', 'spaces.json']);
  });

  test('a write for a space this store removed is dropped, until the space is put again', async () => {
    const files = createMemoryFiles();
    const s = createFileStore(files);
    await s.putSpace(sp('a'));
    await s.writeCollection('a', 'list', { records: [rec('k', 1)] });
    await s.removeSpace('a');
    // What a cycle or an action that was running at the leave does afterwards.
    await s.writeCollection('a', 'list', { records: [rec('k', 2)] });
    const returned = await s.changeRecords('a', 'stock', () => ({ records: [rec('m', 3)] }));
    expect(returned.records).toEqual([rec('m', 3)]);
    expect([...files.all.keys()]).toEqual(['spaces.json']);
    // Joined again (the same secret gives the same id): it is written again.
    await s.putSpace(sp('a'));
    await s.writeCollection('a', 'list', { records: [rec('k', 4)] });
    expect([...files.all.keys()].sort()).toEqual(['a.list.json', 'spaces.json']);
  });

  test('a space left while its cycle writes to the storage leaves no file behind', async () => {
    const files = createMemoryFiles();
    const s = createFileStore(files);
    const secret = newSecret();
    const space = await deriveSpace(secret);
    await s.putSpace({ id: space.id, secret, storage: sp('x').storage });
    const now = (): string => '2026-11-22T10:00:00.000Z';
    await localChange(s, space.id, 'list', now, () => ({ put: [{ key: 'k', value: 1 }] }));
    const result = await syncCollection({
      space,
      collection: 'list',
      store: s,
      now,
      adapter: {
        read: () => Promise.resolve({ ok: true, missing: true }),
        async write() {
          // The person leaves the space while the cycle waits for the storage.
          await s.removeSpace(space.id);
          return { ok: true, etag: '"1"' };
        },
      },
    });
    expect(result.ok).toBe(true);
    expect([...files.all.keys()]).toEqual(['spaces.json']);
    expect(await s.listSpaces()).toEqual([]);
  });

  test('a file that cannot be read is an error and is never written over', async () => {
    const files = createMemoryFiles();
    const s = createFileStore(files);
    files.write('spaces.json', '{ half a fi');
    files.write('a.list.json', '"not a state"');
    await expect(s.listSpaces()).rejects.toBeInstanceOf(StoreFileError);
    await expect(s.putSpace(sp('a'))).rejects.toBeInstanceOf(StoreFileError);
    await expect(s.readCollection('a', 'list')).rejects.toBeInstanceOf(StoreFileError);
    await expect(s.changeRecords('a', 'list', (c) => c)).rejects.toBeInstanceOf(StoreFileError);
    expect(files.all.get('spaces.json')).toBe('{ half a fi');
    expect(files.all.get('a.list.json')).toBe('"not a state"');
  });
});
