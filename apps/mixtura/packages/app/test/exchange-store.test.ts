/* eslint-disable @typescript-eslint/no-non-null-assertion -- fixtures are indexed at known positions */
import { expect, test } from 'vitest';
import {
  buildExport,
  countsOf,
  planImport,
  readSnapshot,
  total,
  type LocalStore,
  type Snapshot,
} from '../src/store';
import { openDatabase } from '../src/store/db';
import { freshFactory, openFresh, user } from './helpers';

const AT = '2026-11-17T09:30:00Z';
const clockAt = (iso: string) => () => iso;
const file = (snapshot: Snapshot = user) => buildExport(snapshot, { exportedAt: AT });

/** Puts the records in by hand; the store's own default place goes first, the data brings its places. */
async function fill(store: LocalStore, data: Snapshot = user): Promise<void> {
  for (const p of await store.places.list()) await store.places.delete(p.id);
  for (const r of data.ingredients) await store.ingredients.put(r);
  for (const r of data.templates) await store.templates.put(r);
  for (const r of data.specs) await store.specs.put(r);
  for (const r of data.places) await store.places.put(r);
  for (const r of data.stock) await store.stock.put(r);
  for (const r of data.affinities) await store.affinities.put(r);
}
const all = async (store: LocalStore): Promise<Snapshot> => ({
  ingredients: await store.ingredients.list(),
  templates: await store.templates.list(),
  specs: await store.specs.list(),
  places: await store.places.list(),
  stock: await store.stock.list(),
  affinities: await store.affinities.list(),
});

test('round trip: export, import into an empty store, export equals the original', async () => {
  const a = await openFresh();
  await fill(a);
  const exported = await a.exchange.exportData({ exportedAt: AT });
  const b = await openFresh();
  await b.exchange.importData(exported, 'replace');
  expect(await b.exchange.exportData({ exportedAt: AT })).toEqual(exported);
  expect(exported).toEqual(file());
});

test('merge into an empty store adds everything and keeps all spec versions', async () => {
  const store = await openFresh();
  const plan = await store.exchange.importData(file(), 'merge');
  expect(total(plan.added)).toBe(total(countsOf(user)));
  expect(total(plan.skipped) + total(plan.replaced) + total(plan.removed)).toBe(0);
  expect((await store.specs.list()).map((s) => s.version).sort()).toEqual([1, 2]);
});

test('merge keeps existing records, adds new ones, replaces a spec with a newer updatedAt', async () => {
  const store = await openFresh();
  const [v1, v2] = user.specs as [(typeof user.specs)[0], (typeof user.specs)[0]];
  await store.specs.put({ ...v1, name: 'Mine', updatedAt: '2026-01-01T00:00:00Z' });
  await store.ingredients.put({ ...user.ingredients[0]!, name: 'Local name' });
  const incoming = file({
    ...user,
    specs: [{ ...v1, name: 'Theirs', updatedAt: '2026-06-01T00:00:00Z' }, v2],
    ingredients: [{ ...user.ingredients[0]!, name: 'Other name' }],
  });
  const plan = await store.exchange.plan(incoming, 'merge');
  expect(plan.replaced.specs).toBe(1);
  expect(plan.added.specs).toBe(1);
  expect(plan.skipped.ingredients).toBe(1);
  await store.exchange.importData(incoming, 'merge');
  expect((await store.specs.get(v1.id))?.name).toBe('Theirs');
  expect((await store.ingredients.get(user.ingredients[0]!.id))?.name).toBe('Local name');
});

test('merge never replaces with an older spec and never takes over a version slot', () => {
  const [v1] = user.specs;
  const current = { ...user, specs: [{ ...v1!, updatedAt: '2026-06-01T00:00:00Z', name: 'New' }] };
  const older = { ...user, specs: [{ ...v1!, updatedAt: '2026-01-01T00:00:00Z', name: 'Old' }] };
  expect(planImport(current, older, 'merge').skipped.specs).toBe(1);
  const otherId = {
    ...user,
    specs: [{ ...v1!, id: 'u-bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' }],
  };
  const plan = planImport(current, otherId, 'merge');
  expect(plan.skipped.specs).toBe(1);
  expect(plan.writes.specs).toHaveLength(0);
});

test('replace makes the data equal the file and removes the rest', async () => {
  const store = await openFresh();
  await fill(store);
  const small = file({ ...user, specs: [user.specs[0]!], stock: [], affinities: [] });
  const plan = await store.exchange.importData(small, 'replace');
  expect(plan.removed.specs).toBe(1);
  // Two live records and a tombstone: a tombstone is a record like the others.
  expect(plan.removed.stock).toBe(3);
  expect(plan.skipped.ingredients).toBe(2);
  const now = await all(store);
  expect(now.specs).toHaveLength(1);
  expect(now.stock).toHaveLength(0);
});

test('undo puts the data back exactly, once', async () => {
  const store = await openFresh();
  await fill(store);
  const before = await all(store);
  await store.exchange.importData(file(buildEmpty()), 'replace');
  expect((await all(store)).specs).toHaveLength(0);
  expect(await store.exchange.importBackup()).toBeDefined();
  await store.exchange.undoImport();
  expect(await all(store)).toEqual(before);
  expect(await store.exchange.importBackup()).toBeUndefined();
  await expect(store.exchange.undoImport()).rejects.toThrow(/no import/i);
});

const buildEmpty = (): Snapshot => ({
  ingredients: [],
  templates: [],
  specs: [],
  places: [],
  stock: [],
  affinities: [],
});

test('a failing import changes nothing: one transaction, no backup written', async () => {
  const store = await openFresh();
  await fill(store, { ...buildEmpty(), stock: user.stock });
  const before = await all(store);
  // A spec without the required fields makes the put throw inside the transaction.
  const broken = file({ ...buildEmpty(), stock: [], ingredients: [user.ingredients[0]!] });
  (broken.ingredients as unknown[]).push({ notAKey: true });
  await expect(store.exchange.importData(broken, 'replace')).rejects.toBeDefined();
  expect(await all(store)).toEqual(before);
  expect(await store.exchange.importBackup()).toBeUndefined();
});

test('the data survives closing and reopening the database', async () => {
  const factory = freshFactory();
  const db = await openDatabase({ factory });
  db.close();
  const { openLocalStore } = await import('../src/store');
  const a = await openLocalStore({ factory, storage: undefined });
  await a.exchange.importData(file(), 'replace');
  a.close();
  const b = await openLocalStore({ factory, storage: undefined });
  expect(countsOf(await readSnapshot(await openDatabase({ factory })))).toEqual(countsOf(user));
  b.close();
});

test('the change counter counts committed writes and deletes, not settings or reads', async () => {
  const seen: number[] = [];
  const store = await openFresh({
    clock: clockAt('2026-11-01T00:00:00Z'),
    onBackup: (b) => seen.push(b.changesSinceExport),
  });
  await store.settings.set('theme', 'dark');
  await store.ingredients.list();
  expect((await store.backup.load()).changesSinceExport).toBe(0);
  await store.ingredients.put(user.ingredients[0]!);
  await store.stock.put(user.stock[1]!);
  await store.ingredients.delete(user.ingredients[0]!.id);
  await store.backup.recordChange().catch(() => undefined);
  const b = await store.backup.load();
  expect(b.changesSinceExport).toBe(4);
  expect(b.firstChangeAt).toBe('2026-11-01T00:00:00Z');
  expect(seen.at(-1)).toBe(4);
});

test('rejected writes are not counted; an import counts what it changed; export resets', async () => {
  const store = await openFresh({ clock: clockAt('2026-11-01T00:00:00Z') });
  await expect(store.ingredients.put({ id: 'lemon' } as never)).rejects.toBeDefined();
  expect((await store.backup.load()).changesSinceExport).toBe(0);
  await store.exchange.importData(file(), 'merge');
  expect((await store.backup.load()).changesSinceExport).toBe(total(countsOf(user)));
  await store.backup.markExported('2026-11-02T00:00:00Z');
  expect(await store.backup.load()).toEqual({
    changesSinceExport: 0,
    lastExportAt: '2026-11-02T00:00:00Z',
  });
  await store.backup.dismiss();
  expect((await store.backup.load()).dismissedAt).toBe('2026-11-01T00:00:00Z');
  await store.ingredients.put(user.ingredients[1]!);
  const b = await store.backup.load();
  expect(b.changesSinceExport).toBe(1);
  expect(b.lastExportAt).toBe('2026-11-02T00:00:00Z');
});
