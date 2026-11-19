import { expect, test } from 'vitest';
import { movePlace } from '../src/sync';
import { readPlaceFile } from '../src/sync/file';
import { createFakeStorage } from './helpers/fake-adapter';
import { byId, createClient, FAST_CIPHER, instant, live, PASS, PATH } from './helpers/sync-client';

const AT = instant(30);

function setup() {
  const oldStorage = createFakeStorage();
  const newStorage = createFakeStorage();
  const a = createClient(oldStorage, { rows: [live('gin', 1)] });
  const b = createClient(oldStorage, { rows: [live('rum', 2)] });
  const move = (client = a, to = newStorage) =>
    movePlace({
      place: client.place,
      rows: client.rows,
      ingredients: client.ingredients,
      from: { adapter: oldStorage.adapter(), path: PATH, passphrase: PASS },
      to: { adapter: to.adapter(), path: PATH, passphrase: PASS },
      cipher: FAST_CIPHER,
      at: AT,
    });
  return { oldStorage, newStorage, a, b, move };
}

test('after the move both clients end on the new file; the old one carries the marker', async () => {
  const { oldStorage, newStorage, a, b, move } = setup();
  await a.sync();
  await b.sync();
  a.change(live('lime', 5));
  b.change(live('mint', 6)); // offline change of B, not in the old file
  const outcome = await move();
  expect(outcome).toMatchObject({ kind: 'ok', marked: true, wrote: true });
  if (outcome.kind !== 'ok') return;
  a.rows = outcome.rows;

  const old = await readPlaceFile(oldStorage.adapter(), FAST_CIPHER, PATH, PASS);
  expect(old.ok && !old.missing && old.document.moved).toEqual({ at: AT });
  expect(old.ok && !old.missing && old.document.records.map((r) => r.key)).toEqual([
    'gin',
    'lime',
    'rum',
  ]);

  // B syncs the old file: told it moved, with nothing of its own lost.
  const told = await b.sync();
  expect(told).toMatchObject({ kind: 'moved', moved: { at: AT } });
  expect(oldStorage.writes).toBe(3);
  // B follows: its binding now points to the new storage.
  const follower = createClient(newStorage, {
    rows: told.kind === 'moved' ? [...told.rows, live('mint', 6)] : [],
  });
  await follower.sync();
  const onNew = createClient(newStorage);
  await onNew.sync();
  expect(Object.keys(byId(onNew.rows))).toEqual(['gin', 'lime', 'mint', 'rum']);
  expect(byId(follower.rows)).toEqual(byId(onNew.rows));
});

test('a file already at the new place is merged, not overwritten', async () => {
  const { newStorage, a, move } = setup();
  await a.sync();
  const c = createClient(newStorage, { rows: [live('mint', 7)] });
  await c.sync();
  const outcome = await move();
  expect(outcome.kind === 'ok' && Object.keys(byId(outcome.rows))).toEqual(['gin', 'mint']);
  await c.sync();
  expect(Object.keys(byId(c.rows))).toEqual(['gin', 'mint']);
});

test('records the old file holds and the device lacks are not lost', async () => {
  const { newStorage, a, b, move } = setup();
  await a.sync();
  await b.sync(); // old file: gin, rum
  const outcome = await move(createClient(newStorage, { rows: [live('lime', 5)] }));
  expect(outcome.kind === 'ok' && Object.keys(byId(outcome.rows))).toEqual(['gin', 'lime', 'rum']);
});

test('a failing write to the new place leaves the old file untouched', async () => {
  const { oldStorage, newStorage, a, move } = setup();
  await a.sync();
  const before = oldStorage.body(PATH);
  const writes = oldStorage.writes;
  newStorage.failNext('write', 1, 'server');
  expect(await move()).toEqual({ kind: 'failed', reason: 'server', stage: 'new' });
  expect(oldStorage.body(PATH)).toBe(before);
  expect(oldStorage.writes).toBe(writes);
});

test('a failure reading the old place stops before anything is written', async () => {
  const { oldStorage, newStorage, a, move } = setup();
  await a.sync();
  oldStorage.failNext('read', 1, 'unreachable');
  expect(await move()).toMatchObject({ kind: 'failed', reason: 'unreachable', stage: 'old' });
  expect(newStorage.files.size).toBe(0);
});

test('a failing marker write leaves the move done and says so', async () => {
  const { oldStorage, newStorage, a } = setup();
  await a.sync();
  const real = oldStorage.adapter();
  oldStorage.beforeWrite = undefined;
  const outcome = await movePlace({
    place: a.place,
    rows: a.rows,
    ingredients: [],
    from: {
      adapter: { read: real.read, write: () => Promise.resolve({ ok: false, failure: 'server' }) },
      path: PATH,
      passphrase: PASS,
    },
    to: { adapter: newStorage.adapter(), path: PATH, passphrase: PASS },
    cipher: FAST_CIPHER,
    at: AT,
  });
  expect(outcome).toMatchObject({ kind: 'ok', marked: false });
  expect(newStorage.files.has(PATH)).toBe(true);
});
