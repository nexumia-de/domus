import { expect, test } from 'vitest';
import type { Ingredient } from '../src/store';
import { user } from './helpers';
import { createFakeStorage } from './helpers/fake-adapter';
import {
  byId,
  createClient,
  FAST_CIPHER,
  gone,
  instant,
  live,
  PASS,
  PATH,
  PLACE_NAME,
} from './helpers/sync-client';

const custom = user.ingredients[0] as Ingredient;

test('different ingredients changed offline: after A, B, A all three hold the same rows', async () => {
  const storage = createFakeStorage();
  const a = createClient(storage, { rows: [live('gin', 1), live('rum', 2)] });
  const b = createClient(storage, { rows: [live('lime', 3)] });
  const first = await a.sync();
  expect(first).toMatchObject({ kind: 'ok', wrote: true });
  await b.sync();
  await a.sync();
  expect(Object.keys(byId(a.rows))).toEqual(['gin', 'lime', 'rum']);
  expect(byId(b.rows)).toEqual(byId(a.rows));
  const reader = createClient(storage);
  await reader.sync();
  expect(byId(reader.rows)).toEqual(byId(a.rows));
});

test('the same ingredient on both: the later updatedAt wins on both', async () => {
  const storage = createFakeStorage();
  const a = createClient(storage, { rows: [live('gin', 5, true)] });
  const b = createClient(storage, { rows: [live('gin', 8, false)] });
  await a.sync();
  await b.sync();
  await a.sync();
  expect(byId(a.rows).gin).toMatchObject({ present: false, updatedAt: instant(8) });
  expect(byId(b.rows)).toEqual(byId(a.rows));
});

test('removed on A, changed later on B: B wins; removed later on A: the removal wins', async () => {
  for (const [removeAt, changeAt, removed] of [
    [3, 6, false],
    [6, 3, true],
  ] as const) {
    const storage = createFakeStorage();
    const a = createClient(storage, { rows: [gone('gin', removeAt)] });
    const b = createClient(storage, { rows: [live('gin', changeAt)] });
    await a.sync();
    await b.sync();
    await a.sync();
    expect('deleted' in (byId(a.rows).gin ?? {})).toBe(removed);
    expect(byId(b.rows)).toEqual(byId(a.rows));
  }
});

test('a conflict on write is retried and converges in the same call', async () => {
  const storage = createFakeStorage();
  const a = createClient(storage, { rows: [live('gin', 1)] });
  const b = createClient(storage, { rows: [live('rum', 2)] });
  await a.sync();
  a.change(live('lime', 4));
  let injected = false;
  storage.beforeWrite = async () => {
    if (injected) return;
    injected = true;
    await b.sync();
  };
  const outcome = await a.sync();
  expect(outcome).toMatchObject({ kind: 'ok', wrote: true, changedLocal: true });
  expect(Object.keys(byId(a.rows))).toEqual(['gin', 'lime', 'rum']);
  storage.beforeWrite = undefined;
  await b.sync();
  expect(byId(b.rows)).toEqual(byId(a.rows));
});

test('attempts exhausted: gave-up, nothing applied', async () => {
  const storage = createFakeStorage();
  const a = createClient(storage, { rows: [live('gin', 1)] });
  await a.sync();
  a.change(live('lime', 4));
  const before = structuredClone(a.rows);
  storage.beforeWrite = (path) => storage.put(path, storage.body(path) as string);
  const outcome = await a.sync({ maxAttempts: 3 });
  expect(outcome).toEqual({ kind: 'failed', reason: 'gave-up' });
  expect(a.rows).toEqual(before);
});

test('an adapter failure is reported as it is and nothing is written', async () => {
  for (const failure of [
    'unauthorised',
    'not-found',
    'unreachable',
    'blocked',
    'server',
  ] as const) {
    const storage = createFakeStorage();
    const a = createClient(storage, { rows: [live('gin', 1)] });
    storage.failNext('read', 1, failure);
    expect(await a.sync()).toMatchObject({ kind: 'failed', reason: failure });
    storage.failNext('write', 1, failure);
    expect(await a.sync()).toMatchObject({ kind: 'failed', reason: failure });
    expect(storage.files.size).toBe(0);
  }
});

test('an adapter that throws is a failure, not an exception', async () => {
  const outcome = await (
    await import('../src/sync')
  ).syncPlace({
    place: { id: 'u-1', name: 'x', updatedAt: instant(0) },
    rows: [],
    ingredients: [],
    adapter: {
      read: () => Promise.reject(new Error('boom')),
      write: () => Promise.reject(new Error('boom')),
    },
    cipher: FAST_CIPHER,
    path: PATH,
    passphrase: PASS,
  });
  expect(outcome).toMatchObject({ kind: 'failed', reason: 'unreachable', detail: 'boom' });
});

test('a server that keeps the ETag within one tick: both write at once, one more round loses nothing', async () => {
  const storage = createFakeStorage({ keepEtagInTick: true });
  const a = createClient(storage, { rows: [live('gin', 1)] });
  const b = createClient(storage, { rows: [live('rum', 2)] });
  await a.sync();
  b.change(live('lime', 5));
  a.change(live('mint', 6));
  // B syncs between A's read and A's write; its write keeps the ETag A holds.
  let injected = false;
  storage.beforeWrite = async () => {
    if (injected) return;
    injected = true;
    await b.sync();
  };
  const outcome = await a.sync();
  storage.beforeWrite = undefined;
  expect(outcome).toMatchObject({ kind: 'ok', wrote: true });
  // A's write replaced B's: the file lacks B's records until B syncs again.
  await b.sync();
  await a.sync();
  await b.sync();
  expect(Object.keys(byId(a.rows))).toEqual(['gin', 'lime', 'mint', 'rum']);
  expect(byId(b.rows)).toEqual(byId(a.rows));
  const reader = createClient(storage);
  await reader.sync();
  expect(byId(reader.rows)).toEqual(byId(a.rows));
});

test('wrong passphrase, garbage, a newer document and another place never write', async () => {
  const storage = createFakeStorage();
  const a = createClient(storage, { rows: [live('gin', 1)] });
  await a.sync();
  const original = storage.body(PATH);

  const wrong = createClient(storage, { rows: [live('rum', 2)], passphrase: 'not the passphrase' });
  expect(await wrong.sync()).toEqual({ kind: 'failed', reason: 'wrong-passphrase' });

  const other = createClient(storage, {
    rows: [live('rum', 2)],
    placeId: 'u-9b8a7c6d-5e4f-4a3b-9c2d-1e0f9a8b7c6d',
  });
  expect(await other.sync()).toEqual({ kind: 'failed', reason: 'other-place' });

  const newer = await FAST_CIPHER.seal(
    JSON.stringify({ format: 'materia-place', version: 2 }),
    PASS,
  );
  const { buildEnvelope } = await import('@mixtura/engine');
  expect(storage.body(PATH)).toBe(original);

  const garbage = createFakeStorage();
  garbage.put(PATH, 'this is not a sync file');
  const g = createClient(garbage, { rows: [live('rum', 2)] });
  expect(await g.sync()).toMatchObject({
    kind: 'failed',
    reason: 'unsupported-file',
    code: 'not-json',
  });
  expect(garbage.body(PATH)).toBe('this is not a sync file');
  expect(garbage.writes).toBe(0);

  const future = createFakeStorage();
  future.put(PATH, buildEnvelope(newer));
  const f = createClient(future, { rows: [live('rum', 2)] });
  expect(await f.sync()).toMatchObject({ kind: 'failed', reason: 'unsupported-file' });
  expect(future.writes).toBe(0);
  expect(storage.writes).toBe(1);
  expect(storage.body(PATH)).toBe(original);
});

test('the stored file shows neither the place name nor any ingredient id', async () => {
  const storage = createFakeStorage();
  const a = createClient(storage, {
    rows: [live('gin', 1), live(custom.id, 2)],
    ingredients: [custom],
  });
  await a.sync();
  const body = storage.body(PATH) as string;
  expect(body).not.toContain(PLACE_NAME);
  expect(body).not.toContain('gin');
  expect(body).not.toContain(custom.id);
  expect(body).not.toContain(custom.name);
});

test('a custom ingredient travels with the stock; a seed ingredient is not embedded', async () => {
  const storage = createFakeStorage();
  const a = createClient(storage, {
    rows: [live(custom.id, 2), live('gin', 3)],
    ingredients: [custom, { id: 'gin', name: 'Gin' } as Ingredient],
  });
  await a.sync();
  const b = createClient(storage);
  const outcome = await b.sync();
  expect(outcome.kind === 'ok' && outcome.entities).toEqual([custom]);
  expect(b.ingredients).toEqual([custom]);
  // The file holds exactly the custom one: read it back through the cycle's own parts.
  const { readPlaceFile } = await import('../src/sync/file');
  const read = await readPlaceFile(storage.adapter(), FAST_CIPHER, PATH, PASS);
  expect(read.ok && !read.missing && read.document.entities.map((e) => e.key)).toEqual([custom.id]);
});

test('a second cycle with nothing new writes nothing and reports the etag', async () => {
  const storage = createFakeStorage();
  const a = createClient(storage, { rows: [live('gin', 1)] });
  await a.sync();
  const writes = storage.writes;
  const outcome = await a.sync();
  expect(outcome).toMatchObject({ kind: 'ok', wrote: false, changedLocal: false });
  expect(storage.writes).toBe(writes);
  expect(outcome.kind === 'ok' && outcome.etag).toBe(storage.files.get(PATH)?.etag);
});
