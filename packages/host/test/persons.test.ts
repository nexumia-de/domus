// The persons of a space and who uses this device (docs/persons.md).
import { expect, test } from 'vitest';
import { createMemoryStore } from '../src/memory-store';
import {
  addPerson,
  devicePerson,
  ensureDevicePerson,
  personsOf,
  readPersons,
  renamePerson,
  setDevicePerson,
} from '../src/persons';
import { SPACE_COLLECTION } from '../src/space-setup';

let tick = 0;
const now = (): string => new Date(Date.UTC(2026, 10, 27, 12, 0, tick++)).toISOString();
const random = (n: number): Uint8Array => Uint8Array.from({ length: n }, (_, i) => i + tick);

async function setup() {
  const store = createMemoryStore();
  await store.putSpace({ id: 's', secret: 'x', storage: { type: 'device', address: '' } });
  return store;
}

test('a person is a record of the space collection, the device keeps who it is', async () => {
  const store = await setup();
  const anna = await addPerson('s', '  Anna ', { store, now, random });
  expect(anna?.name).toBe('Anna');
  const { records } = await store.readCollection('s', SPACE_COLLECTION);
  expect(records.map((r) => r.key)).toEqual([`person:${anna?.id}`]);
  expect((await store.getSpace('s'))?.personId).toBe(anna?.id);
  expect(await devicePerson(store, 's')).toEqual(anna);
});

test('adding without asDevice leaves the device as it was; persons sort by name', async () => {
  const store = await setup();
  const ben = await addPerson('s', 'Ben', { store, now, random });
  await addPerson('s', 'Anna', { store, now, random }, false);
  expect((await devicePerson(store, 's'))?.id).toBe(ben?.id);
  expect((await readPersons(store, 's')).map((p) => p.name)).toEqual(['Anna', 'Ben']);
});

test('an empty or too long name is refused', async () => {
  const store = await setup();
  expect(await addPerson('s', '  ', { store, now, random })).toBeUndefined();
  expect(await addPerson('s', 'x'.repeat(61), { store, now, random })).toBeUndefined();
  expect(await readPersons(store, 's')).toEqual([]);
});

test('rename keeps the id; a removed person is no longer the device', async () => {
  const store = await setup();
  const anna = await addPerson('s', 'Anna', { store, now, random });
  if (!anna) throw new Error('person expected');
  expect(await renamePerson('s', anna.id, 'Anna B.', { store, now })).toBe(true);
  expect(await devicePerson(store, 's')).toEqual({ id: anna.id, name: 'Anna B.' });
  await setDevicePerson(store, 's', 'gone');
  expect(await devicePerson(store, 's')).toBeUndefined();
  await setDevicePerson(store, 's', undefined);
  expect((await store.getSpace('s'))?.personId).toBeUndefined();
});

test('ensureDevicePerson makes one person once', async () => {
  const store = await setup();
  const me = await ensureDevicePerson('s', 'Me', { store, now, random });
  expect(await ensureDevicePerson('s', 'Me', { store, now, random })).toEqual(me);
  expect(await readPersons(store, 's')).toHaveLength(1);
});

test('records that are no persons or carry a foreign value are skipped', () => {
  const at = '2026-11-27T12:00:00.000Z';
  expect(
    personsOf([
      { key: 'name', updatedAt: at, value: 'Home' },
      { key: 'person:a', updatedAt: at, value: { name: 3 } },
      { key: 'person:b', updatedAt: at, deleted: true },
      { key: 'person:c', updatedAt: at, value: { name: 'Cleo', extra: 1 } },
    ]),
  ).toEqual([{ id: 'c', name: 'Cleo' }]);
});
