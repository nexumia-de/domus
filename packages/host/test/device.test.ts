// A space on this device only, and the one made when a device has none.
import { expect, test } from 'vitest';
import { DEVICE_ONLY, ensureSpace, isDeviceOnly } from '../src/device';
import { createMemoryStore } from '../src/memory-store';
import { deriveSpace } from '../src/space';
import { UnknownStorage, adapterFor } from '../src/storage';

const bytes = (n: number): Uint8Array => Uint8Array.from({ length: n }, (_, i) => i);

test('a device without a space gets one that is on this device only', async () => {
  const store = createMemoryStore();
  const spaces = await ensureSpace(store, 'Home', bytes);
  expect(spaces).toHaveLength(1);
  const [space] = spaces;
  if (!space) throw new Error('a space expected');
  expect(space.name).toBe('Home');
  expect(space.storage).toEqual({ type: DEVICE_ONLY, address: '' });
  expect(isDeviceOnly(space)).toBe(true);
  expect(space.id).toBe((await deriveSpace(space.secret)).id);
  expect(await store.listSpaces()).toEqual(spaces);
});

test('a device with a space keeps it and gets no second one', async () => {
  const store = createMemoryStore();
  const first = { id: 'a', secret: 's', storage: { type: 'github', address: 'me/store' } };
  await store.putSpace(first);
  expect(await ensureSpace(store, 'Home')).toEqual([first]);
  expect(isDeviceOnly(first)).toBe(false);
});

test('two calls at once make one space', async () => {
  const store = createMemoryStore();
  const [a, b] = await Promise.all([ensureSpace(store, 'Home'), ensureSpace(store, 'Home')]);
  expect(a).toEqual(b);
  expect(await store.listSpaces()).toHaveLength(1);
});

test('no adapter exists for a space without a storage', () => {
  expect(() => adapterFor({ type: DEVICE_ONLY, address: '' })).toThrow(UnknownStorage);
});
