// Key derivation: fixed vectors, cross-checked against Node's hkdfSync so
// the expected values are not just this code's output repeated.
import { createDecipheriv, hkdfSync } from 'node:crypto';
import { expect, test } from 'vitest';
import { BadSecret, SPACE_LABELS, deriveSpace, newSecret } from '../src/space';

const SECRET = 'AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8'; // bytes 0..31
const ID = 'cfa6a5e7daf2bdd14b468c61b095f608';
const ACCESS = 'AByoHAamt55eSMz4zBip8hfzUNKn62X_FjoT3lQdwRk';
const hkdf = (label: string, length: number): Buffer =>
  Buffer.from(hkdfSync('sha256', Buffer.from(SECRET, 'base64url'), Buffer.alloc(0), label, length));

test('a fixed secret gives a fixed id and access token', async () => {
  const space = await deriveSpace(SECRET);
  expect(space.id).toBe(ID);
  expect(space.access).toBe(ACCESS);
});

test('id and access token agree with node:crypto hkdfSync', async () => {
  const space = await deriveSpace(SECRET);
  expect(space.id).toBe(hkdf(SPACE_LABELS.id, 16).toString('hex'));
  expect(space.access).toBe(hkdf(SPACE_LABELS.access, 32).toString('base64url'));
});

test('the content key is the HKDF output of its label (decrypts with node:crypto)', async () => {
  const space = await deriveSpace(SECRET);
  const iv = new Uint8Array(12).fill(7);
  const sealed = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, space.key, new TextEncoder().encode('hi')),
  );
  const d = createDecipheriv('aes-256-gcm', hkdf(SPACE_LABELS.content, 32), iv);
  d.setAuthTag(Buffer.from(sealed.slice(sealed.length - 16)));
  const plain = Buffer.concat([d.update(sealed.slice(0, sealed.length - 16)), d.final()]);
  expect(plain.toString()).toBe('hi');
});

test('the three labels give three different outputs', async () => {
  const [a, b, c] = [SPACE_LABELS.id, SPACE_LABELS.content, SPACE_LABELS.access].map((l) =>
    hkdf(l, 32).toString('hex'),
  );
  expect(new Set([a, b, c]).size).toBe(3);
  const space = await deriveSpace(SECRET);
  expect(space.id).toHaveLength(32);
  expect(space.id).toMatch(/^[0-9a-f]{32}$/);
  expect(space.access).toMatch(/^[A-Za-z0-9_-]{43}$/);
});

test('the key is AES-256-GCM and cannot be exported', async () => {
  const { key } = await deriveSpace(SECRET);
  expect(key.extractable).toBe(false);
  expect(key.algorithm).toEqual({ name: 'AES-GCM', length: 256 });
  await expect(crypto.subtle.exportKey('raw', key)).rejects.toThrow();
});

test('another secret gives another id, key and token', async () => {
  const other = await deriveSpace(newSecret());
  expect(other.id).not.toBe(ID);
  expect(other.access).not.toBe(ACCESS);
});

test('newSecret: 43 base64url characters from 32 random bytes, injectable', () => {
  expect(newSecret()).toMatch(/^[A-Za-z0-9_-]{43}$/);
  expect(newSecret()).not.toBe(newSecret());
  let asked = 0;
  const secret = newSecret((n) => {
    asked = n;
    return Uint8Array.from({ length: n }, (_, i) => i);
  });
  expect(asked).toBe(32);
  expect(secret).toBe(SECRET);
});

test.each([
  ['too short', 'abc'],
  ['empty', ''],
  ['44 characters', SECRET + 'A'],
  ['padding', SECRET.slice(0, 42) + '='],
  ['standard alphabet', SECRET.replace('_', '/').replace('A', '+') + ''],
  ['spaces', ' ' + SECRET.slice(1)],
])('a bad secret (%s) is BadSecret', async (_n, secret) => {
  await expect(deriveSpace(secret)).rejects.toBeInstanceOf(BadSecret);
});
