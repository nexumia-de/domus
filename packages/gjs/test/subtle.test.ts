// The Web Crypto subset against Node's real Web Crypto: the same derivations,
// and files sealed by one opened by the other, through the host package's own
// code. Proves the bytes; does not prove GJS (scripts/smoke.js runs there).
import { webcrypto } from 'node:crypto';
import { afterEach, expect, test } from 'vitest';
import { deriveSpace, openCollection, sealCollection } from '@nexumia-de/hospes';
import { installWebPlatform, subtle } from '../src/subtle';

const real = globalThis.crypto;
/** Runs `work` with `crypto` replaced, as the host package sees it in GJS. */
async function withSubset<T>(work: () => Promise<T>): Promise<T> {
  Object.defineProperty(globalThis, 'crypto', {
    value: { subtle, getRandomValues: (a: Uint8Array) => webcrypto.getRandomValues(a) },
    configurable: true,
  });
  try {
    return await work();
  } finally {
    Object.defineProperty(globalThis, 'crypto', { value: real, configurable: true });
  }
}
afterEach(() => Object.defineProperty(globalThis, 'crypto', { value: real, configurable: true }));

// The fixed vector of packages/host/docs/spaces.md: the secret is the bytes 0 to 31.
const SECRET = 'AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8';
const document = {
  format: 'materia-collection' as const,
  version: 1 as const,
  space: 'cfa6a5e7daf2bdd14b468c61b095f608',
  collection: 'list',
  records: [{ key: 'e1', updatedAt: '2026-11-20T09:00:00.000Z', value: { name: 'Äpfel' } }],
};

test('the subset derives the id and the access token of the fixed vector', async () => {
  const space = await withSubset(() => deriveSpace(SECRET));
  expect(space.id).toBe('cfa6a5e7daf2bdd14b468c61b095f608');
  expect(space.access).toBe('AByoHAamt55eSMz4zBip8hfzUNKn62X_FjoT3lQdwRk');
});

test('a file sealed with the subset opens in a browser, and the other way round', async () => {
  const browser = await deriveSpace(SECRET);
  const { native, sealed } = await withSubset(async () => {
    const native = await deriveSpace(SECRET);
    return { native, sealed: await sealCollection(native, document) };
  });
  expect(await openCollection(browser, 'list', sealed)).toMatchObject({ ok: true, document });

  const fromBrowser = await sealCollection(browser, document);
  const opened = await withSubset(() => openCollection(native, 'list', fromBrowser));
  expect(opened).toMatchObject({ ok: true, document });
});

test('a changed file, another collection and another secret fail as wrong-key', async () => {
  await withSubset(async () => {
    const space = await deriveSpace(SECRET);
    const other = await deriveSpace(SECRET.replace('AAEC', 'BAEC'));
    const sealed = await sealCollection(space, document);
    expect(await openCollection(other, 'list', sealed)).toMatchObject({
      ok: false,
      error: 'wrong-key',
    });
    expect(await openCollection(space, 'stock', sealed)).toMatchObject({ ok: false });
    const frame = JSON.parse(sealed) as { data: string };
    const flipped = frame.data.startsWith('A')
      ? `B${frame.data.slice(1)}`
      : `A${frame.data.slice(1)}`;
    expect(
      await openCollection(space, 'list', JSON.stringify({ ...frame, data: flipped })),
    ).toMatchObject({ ok: false, error: 'wrong-key' });
  });
});

test('what the subset does not have is refused, not guessed', async () => {
  await expect(subtle.importKey('jwk', new Uint8Array(32), 'HKDF')).rejects.toThrow(
    /Not supported/,
  );
  await expect(subtle.importKey('raw', new Uint8Array(32), 'PBKDF2')).rejects.toThrow();
  const key = await subtle.importKey('raw', new Uint8Array(32), 'HKDF');
  const params = {
    name: 'HKDF',
    hash: 'SHA-512',
    salt: new Uint8Array(0),
    info: new Uint8Array(0),
  };
  await expect(subtle.deriveBits(params, key, 128)).rejects.toThrow(/Not supported/);
});

test('installing fills only what is missing, and gives version 4 ids from the random source', () => {
  const scope = globalThis as Record<string, unknown>;
  Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true });
  const clone = scope['structuredClone'];
  let n = 0;
  installWebPlatform((length) => Uint8Array.from({ length }, () => n++ & 0xff));
  const installed = scope['crypto'] as Crypto;
  expect(installed.randomUUID()).toBe('00010203-0405-4607-8809-0a0b0c0d0e0f');
  expect([...installed.getRandomValues(new Uint8Array(3))]).toEqual([16, 17, 18]);
  expect(scope['structuredClone']).toBe(clone);
});
