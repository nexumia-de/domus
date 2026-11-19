/* eslint-disable @typescript-eslint/no-non-null-assertion -- fixtures are indexed at known positions */
// The device-local sync configuration: storages and bindings (migration 5,
// repositories, schemas) and the guarantee that none of it, and no credential,
// ever reaches the export file or its snapshot.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import { openDatabase } from '../src/store/db';
import { migrations } from '../src/store/migrations';
import { SCHEMA_VERSION, stores } from '../src/store/schema';
import {
  newUserId,
  openLocalStore,
  readSnapshot,
  StoreError,
  type Binding,
  type Storage,
} from '../src/store';
import { exportProblems } from '../src/store/validate';
import { freshFactory, openFresh, user } from './helpers';

const storage = (patch: Partial<Storage> = {}): Storage => ({
  id: newUserId(),
  label: 'My server',
  type: 'webdav',
  baseUrl: 'https://dav.example/files/me',
  username: 'alice-dav-user',
  password: 'hunter2-secret',
  ...patch,
});
const binding = (storageId: string, patch: Partial<Binding> = {}): Binding => ({
  unitKind: 'place',
  unitId: newUserId(),
  storageId,
  folder: 'mixtura/flat',
  passphrase: 'ABCD-EFGH-secret-passphrase',
  ...patch,
});

test('the schema version is 5 and a fresh database has the two device-local stores', async () => {
  expect(SCHEMA_VERSION).toBe(5);
  const db = await openDatabase({ factory: freshFactory() });
  expect([...db.objectStoreNames]).toEqual(expect.arrayContaining(['storages', 'bindings']));
  const tx = db.transaction(['storages', 'bindings']);
  expect(tx.objectStore('storages').keyPath).toBe('id');
  expect(tx.objectStore('bindings').keyPath).toEqual(['unitKind', 'unitId']);
  expect([...tx.objectStore('bindings').indexNames]).toEqual(['storageId']);
  expect(stores.map((s) => s.name)).toEqual(expect.arrayContaining(['storages', 'bindings']));
  db.close();
});

test('migration 5: a version 4 database keeps its data and gets empty storages and bindings', async () => {
  const factory = freshFactory();
  const old = await openDatabase({
    factory,
    version: 4,
    migrations: migrations.filter((m) => m.version <= 4),
  });
  expect([...old.objectStoreNames]).not.toContain('storages');
  const tx = old.transaction('ingredients', 'readwrite');
  tx.objectStore('ingredients').put(user.ingredients[0]);
  await new Promise((done) => (tx.oncomplete = done));
  old.close();
  const store = await openLocalStore({ factory, storage: undefined });
  expect(await store.ingredients.list()).toEqual([user.ingredients[0]]);
  expect((await store.places.list()).length).toBe(1);
  expect(await store.storages.list()).toEqual([]);
  expect(await store.bindings.list()).toEqual([]);
  store.close();
});

test('storages and bindings: create, read, update, list and delete', async () => {
  const store = await openFresh();
  const s = storage();
  await store.storages.put(s);
  expect(await store.storages.get(s.id)).toEqual(s);
  await store.storages.put({ ...s, label: 'Renamed' });
  expect((await store.storages.get(s.id))?.label).toBe('Renamed');
  const b = binding(s.id);
  await store.bindings.put(b);
  expect(await store.bindings.get(['place', b.unitId])).toEqual(b);
  const synced = { ...b, etag: '"abc"', lastSyncAt: '2026-11-18T09:00:00Z', lastError: 'x' };
  await store.bindings.put(synced);
  expect(await store.bindings.list()).toEqual([synced]);
  expect(await store.bindings.listBy('storageId', s.id)).toEqual([synced]);
  await store.bindings.delete(['place', b.unitId]);
  await store.storages.delete(s.id);
  expect(await store.storages.list()).toEqual([]);
  store.close();
});

test('a storage that still has bindings is not removed; it is after the bindings are', async () => {
  const store = await openFresh();
  const s = storage();
  const other = storage();
  await store.storages.put(s);
  await store.storages.put(other);
  const b = binding(s.id);
  await store.bindings.put(b);
  const refused = await store.storages.delete(s.id).catch((e: unknown) => e);
  expect(refused).toBeInstanceOf(StoreError);
  expect(refused).toMatchObject({ kind: 'in-use', details: [`place ${b.unitId}`] });
  expect(await store.storages.get(s.id)).toEqual(s);
  await store.storages.delete(other.id);
  await store.bindings.delete(['place', b.unitId]);
  await store.storages.delete(s.id);
  expect(await store.storages.get(s.id)).toBeUndefined();
  store.close();
});

test('records are checked against their schemas and the id rule', async () => {
  const store = await openFresh();
  const s = storage();
  const bad = [
    () => store.storages.put({ ...s, type: 'ftp' } as unknown as Storage),
    () => store.storages.put({ ...s, label: '' }),
    () => store.storages.put({ ...s, baseUrl: 'dav.example' }),
    () => store.storages.put({ ...s, extra: 1 } as unknown as Storage),
    () => store.storages.put({ ...s, id: 'seed-like-id' }),
    () => store.bindings.put({ ...binding(s.id), unitKind: 'library' } as unknown as Binding),
    () => store.bindings.put({ ...binding(s.id), passphrase: '' }),
    () => store.bindings.put({ ...binding(s.id), folder: '' }),
    () => store.bindings.put({ ...binding(s.id), lastSyncAt: 'yesterday' }),
    () => store.bindings.put({ ...binding(s.id), unitId: 'home' }),
    () => store.bindings.put({ ...binding('plain'), storageId: 'plain' }),
  ];
  for (const attempt of bad) {
    expect(await attempt().catch((e: unknown) => e)).toMatchObject({ kind: 'invalid' });
  }
  expect(await store.storages.list()).toEqual([]);
  expect(await store.bindings.list()).toEqual([]);
  store.close();
});

test('device-local writes are not entity changes: no backup count', async () => {
  const store = await openFresh();
  const s = storage();
  await store.storages.put(s);
  await store.bindings.put(binding(s.id));
  await new Promise((done) => setTimeout(done, 20));
  expect((await store.backup.load()).changesSinceExport).toBe(0);
  await store.ingredients.put(user.ingredients[0]!);
  await new Promise((done) => setTimeout(done, 20));
  expect((await store.backup.load()).changesSinceExport).toBe(1);
  store.close();
});

test('the export file and the export snapshot never hold a storage, a binding or a credential', async () => {
  const factory = freshFactory();
  const store = await openLocalStore({ factory, storage: undefined });
  const s = storage();
  const b = binding(s.id);
  await store.storages.put(s);
  await store.bindings.put(b);
  await store.ingredients.put(user.ingredients[0]!);
  const file = await store.exchange.exportData({ exportedAt: '2026-11-18T10:00:00Z' });
  const text = JSON.stringify(file);
  for (const secret of [s.password, s.username, s.baseUrl, s.label, b.passphrase, b.folder, s.id]) {
    expect(text).not.toContain(secret);
  }
  expect(Object.keys(file)).not.toEqual(expect.arrayContaining(['storages']));
  expect(Object.keys(file)).not.toEqual(expect.arrayContaining(['bindings']));
  const db = await openDatabase({ factory });
  const snapshot = await readSnapshot(db);
  expect(JSON.stringify(snapshot)).not.toContain(s.password);
  expect(JSON.stringify(snapshot)).not.toContain(b.passphrase);
  expect(Object.keys(snapshot)).not.toContain('storages');
  expect(Object.keys(snapshot)).not.toContain('bindings');
  db.close();
  store.close();
});

test('the export schema does not know them: a file that carries them is refused', () => {
  const schema = readFileSync(
    fileURLToPath(new URL('../../engine/schemas/export.schema.json', import.meta.url)),
    'utf8',
  );
  expect(schema).not.toMatch(/storage|binding|passphrase|password/i);
  const file = {
    app: 'mixtura',
    formatVersion: 2,
    exportedAt: '2026-11-18T10:00:00Z',
    ingredients: [],
    templates: [],
    specs: [],
    places: [],
    stock: [],
    affinities: [],
  };
  expect(exportProblems(file)).toEqual([]);
  expect(exportProblems({ ...file, storages: [storage()] }).length).toBeGreaterThan(0);
  expect(exportProblems({ ...file, bindings: [] }).length).toBeGreaterThan(0);
});
