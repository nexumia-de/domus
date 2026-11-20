// The sealed file of a space: round trip and every way it fails to open.
import { buildSealed, parseSealed, type CollectionDocument } from '@nexumia-de/materia';
import { expect, test } from 'vitest';
import { base64ToBytes, bytesToBase64 } from '../src/base64';
import { openCollection, sealCollection } from '../src/seal';
import { deriveSpace, newSecret } from '../src/space';

const space = await deriveSpace(newSecret());
const doc = (collection = 'list', s = space.id): CollectionDocument => ({
  format: 'materia-collection',
  version: 1,
  space: s,
  collection,
  records: [
    { key: 'eggs', updatedAt: '2026-11-19T10:00:01.000Z', deleted: true },
    { key: 'milk', updatedAt: '2026-11-19T10:00:00.000Z', value: { name: 'Milch', n: 2 } },
  ],
  prunedBefore: '2026-08-01T00:00:00.000Z',
});
const edit = (
  text: string,
  f: (s: ReturnType<typeof parseSealed> & { ok: true }) => void,
): string => {
  const p = parseSealed(text);
  if (!p.ok) throw new Error('setup');
  f(p as never);
  return buildSealed(p.sealed);
};

test('round trip', async () => {
  const text = await sealCollection(space, doc());
  const opened = await openCollection(space, 'list', text);
  expect(opened).toEqual({ ok: true, document: doc() });
  const sealed = parseSealed(text);
  expect(sealed.ok && sealed.sealed.cipher.name).toBe('AES-256-GCM');
  expect(text).not.toContain('Milch');
});

test('two seals of one document differ (fresh nonce) and both open', async () => {
  const a = await sealCollection(space, doc());
  const b = await sealCollection(space, doc());
  expect(a).not.toBe(b);
  expect((await openCollection(space, 'list', a)).ok).toBe(true);
  expect((await openCollection(space, 'list', b)).ok).toBe(true);
});

test('the nonce comes from the injected randomness and is 12 bytes', async () => {
  const text = await sealCollection(space, doc(), (n) => new Uint8Array(n).fill(9));
  const sealed = parseSealed(text);
  expect(sealed.ok && base64ToBytes(sealed.sealed.cipher.nonce)).toEqual(
    new Uint8Array(12).fill(9),
  );
});

test('a file sealed for list does not open as stock', async () => {
  const text = await sealCollection(space, doc());
  expect(await openCollection(space, 'stock', text)).toEqual({ ok: false, error: 'wrong-key' });
});

test("another space's key does not open it", async () => {
  const other = await deriveSpace(newSecret());
  const text = await sealCollection(space, doc());
  expect(await openCollection(other, 'list', text)).toEqual({ ok: false, error: 'wrong-key' });
});

test('a flipped ciphertext byte or nonce byte is wrong-key', async () => {
  const text = await sealCollection(space, doc());
  const flip = (b64: string): string => {
    const bytes = base64ToBytes(b64) as Uint8Array;
    bytes[0] = (bytes[0] ?? 0) ^ 1;
    return bytesToBase64(bytes);
  };
  const data = edit(text, (p) => (p.sealed.data = flip(p.sealed.data)));
  const nonce = edit(text, (p) => (p.sealed.cipher.nonce = flip(p.sealed.cipher.nonce)));
  expect(await openCollection(space, 'list', data)).toEqual({ ok: false, error: 'wrong-key' });
  expect(await openCollection(space, 'list', nonce)).toEqual({ ok: false, error: 'wrong-key' });
});

test('frame problems are not-sealed with the parse error as detail', async () => {
  expect(await openCollection(space, 'list', 'nope')).toEqual({
    ok: false,
    error: 'not-sealed',
    detail: 'not-json',
  });
  expect(await openCollection(space, 'list', '{"a":1}')).toEqual({
    ok: false,
    error: 'not-sealed',
    detail: 'not-an-envelope',
  });
});

test('a version 1 envelope is not-sealed', async () => {
  const v1 = JSON.stringify({
    format: 'materia-sync',
    version: 1,
    kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: 600000, salt: 'AAAAAAAAAAAAAAAAAAAAAA==' },
    cipher: { name: 'AES-GCM', nonce: 'AAAAAAAAAAAAAAAA' },
    data: 'AAAA',
  });
  expect(await openCollection(space, 'list', v1)).toEqual({
    ok: false,
    error: 'not-sealed',
    detail: 'invalid',
  });
});

test('a newer version is newer-version', async () => {
  const text = JSON.stringify({ ...JSON.parse(await sealCollection(space, doc())), version: 3 });
  expect(await openCollection(space, 'list', text)).toEqual({ ok: false, error: 'newer-version' });
});

test('an unknown cipher or a short nonce is not-sealed', async () => {
  const text = await sealCollection(space, doc());
  const cipher = edit(text, (p) => (p.sealed.cipher.name = 'ROT13'));
  const nonce = edit(text, (p) => (p.sealed.cipher.nonce = 'AAAA'));
  expect((await openCollection(space, 'list', cipher)).ok).toBe(false);
  expect(await openCollection(space, 'list', nonce)).toMatchObject({ error: 'not-sealed' });
});

/** Seals arbitrary plain text with the right key and additional data. */
async function sealRaw(plain: string, collection = 'list'): Promise<string> {
  const nonce = new Uint8Array(12).fill(1);
  const data = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: nonce,
      additionalData: new TextEncoder().encode(`materia-sync/2/${space.id}/${collection}`),
    },
    space.key,
    new TextEncoder().encode(plain),
  );
  return buildSealed({
    format: 'materia-sync',
    version: 2,
    cipher: { name: 'AES-256-GCM', nonce: bytesToBase64(nonce) },
    data: bytesToBase64(new Uint8Array(data)),
  });
}

test('decrypted but not a collection document is bad-document with detail', async () => {
  expect(await openCollection(space, 'list', await sealRaw('[1]'))).toEqual({
    ok: false,
    error: 'bad-document',
    detail: 'not-a-collection',
  });
  expect(await openCollection(space, 'list', await sealRaw('oops'))).toMatchObject({
    error: 'bad-document',
    detail: 'not-json',
  });
});

test('a document of another space or collection inside a valid seal is refused', async () => {
  const otherSpace = await sealRaw(JSON.stringify(doc('list', 'ffff')));
  expect(await openCollection(space, 'list', otherSpace)).toEqual({
    ok: false,
    error: 'other-space',
  });
  const otherColl = await sealRaw(JSON.stringify(doc('stock')));
  expect(await openCollection(space, 'list', otherColl)).toEqual({
    ok: false,
    error: 'other-collection',
  });
});

test('a bad collection name throws on seal (a programming error, not a bad file)', async () => {
  await expect(sealCollection(space, doc('Bad Name'))).rejects.toThrow();
});
