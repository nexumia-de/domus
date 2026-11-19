/* eslint-disable @typescript-eslint/no-non-null-assertion -- bytes and matches are indexed at known positions */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildEnvelope, parseEnvelope, type Envelope } from '@mixtura/engine';
import { expect, test, vi } from 'vitest';
import { base64ToBytes, bytesToBase64 } from '../src/sync/base64';
import { createCipher } from '../src/sync/cipher';
import { UnsupportedEnvelope, WrongPassphrase } from '../src/sync/errors';

const FAST = { iterations: 1000, minIterations: 1000 };
const PASS = '7K3M-9QXA-B2CD-EF4G-H5JK';
const TEXT = '{"place":"Küche ☕","stock":[1,2,3]}';
const cipher = createCipher(FAST);

const clone = (e: Envelope): Envelope => JSON.parse(JSON.stringify(e)) as Envelope;
const flip = (b64: string): string => {
  const bytes = base64ToBytes(b64)!;
  bytes[0] = bytes[0]! ^ 1;
  return bytesToBase64(bytes);
};

test('round trip, including non-ASCII and empty text', async () => {
  for (const text of [TEXT, '', 'x'.repeat(100_000)]) {
    expect(await cipher.open(await cipher.seal(text, PASS), PASS)).toBe(text);
  }
});

test('the sealed envelope passes materia parseEnvelope(buildEnvelope(e))', async () => {
  const e = await cipher.seal(TEXT, PASS);
  const parsed = parseEnvelope(buildEnvelope(e));
  expect(parsed.ok).toBe(true);
  expect(parsed.ok && parsed.envelope).toEqual(e);
  expect(e.kdf).toMatchObject({ name: 'PBKDF2', hash: 'SHA-256', iterations: 1000 });
  expect(e.cipher.name).toBe('AES-GCM');
  expect(base64ToBytes(e.kdf.salt)).toHaveLength(16);
  expect(base64ToBytes(e.cipher.nonce)).toHaveLength(12);
});

test('a wrong passphrase throws WrongPassphrase', async () => {
  const e = await cipher.seal(TEXT, PASS);
  await expect(cipher.open(e, 'something else')).rejects.toBeInstanceOf(WrongPassphrase);
  await expect(cipher.open(e, '')).rejects.toBeInstanceOf(WrongPassphrase);
});

test('each tampered field fails', async () => {
  const e = await cipher.seal(TEXT, PASS);
  const cases: [string, (x: Envelope) => void, unknown][] = [
    ['data', (x) => (x.data = flip(x.data)), WrongPassphrase],
    [
      'data truncated',
      (x) => (x.data = bytesToBase64(base64ToBytes(x.data)!.slice(0, 5))),
      WrongPassphrase,
    ],
    ['nonce', (x) => (x.cipher.nonce = flip(x.cipher.nonce)), WrongPassphrase],
    ['salt', (x) => (x.kdf.salt = flip(x.kdf.salt)), WrongPassphrase],
    ['iterations', (x) => (x.kdf.iterations += 1), WrongPassphrase],
    ['format', (x) => ((x as { format: string }).format = 'materia-other'), WrongPassphrase],
    ['version', (x) => ((x as { version: number }).version = 2), WrongPassphrase],
    ['data not base64', (x) => (x.data = '***'), WrongPassphrase],
  ];
  for (const [name, change, error] of cases) {
    const t = clone(e);
    change(t);
    await expect(cipher.open(t, PASS), name).rejects.toBeInstanceOf(error as typeof Error);
  }
});

test('previous: the salt and iterations are reused, the nonce never', async () => {
  const first = await cipher.seal(TEXT, PASS);
  const second = await cipher.seal('other', PASS, first);
  expect(second.kdf).toEqual(first.kdf);
  expect(second.cipher.nonce).not.toBe(first.cipher.nonce);
  expect(await cipher.open(second, PASS)).toBe('other');
});

test('previous with another scheme is not reused', async () => {
  const first = await cipher.seal(TEXT, PASS);
  const foreign = clone(first);
  foreign.kdf.name = 'Argon2id';
  const next = await cipher.seal(TEXT, PASS, foreign);
  expect(next.kdf.name).toBe('PBKDF2');
  expect(next.kdf.salt).not.toBe(first.kdf.salt);
});

test('two seals of the same text differ in salt, nonce and data', async () => {
  const a = await cipher.seal(TEXT, PASS);
  const b = await cipher.seal(TEXT, PASS);
  expect(a.kdf.salt).not.toBe(b.kdf.salt);
  expect(a.cipher.nonce).not.toBe(b.cipher.nonce);
  expect(a.data).not.toBe(b.data);
});

test('unsupported names, sizes and iteration counts throw UnsupportedEnvelope', async () => {
  const e = await cipher.seal(TEXT, PASS);
  const cases: [string, (x: Envelope) => void][] = [
    ['kdf name', (x) => (x.kdf.name = 'scrypt')],
    ['kdf hash', (x) => (x.kdf.hash = 'SHA-1')],
    ['cipher name', (x) => (x.cipher.name = 'AES-CBC')],
    ['iterations too low', (x) => (x.kdf.iterations = 999)],
    ['iterations too high', (x) => (x.kdf.iterations = 10_000_001)],
    ['iterations fractional', (x) => (x.kdf.iterations = 1000.5)],
    ['salt length', (x) => (x.kdf.salt = bytesToBase64(new Uint8Array(8)))],
    ['nonce length', (x) => (x.cipher.nonce = bytesToBase64(new Uint8Array(16)))],
    ['salt not base64', (x) => (x.kdf.salt = '!!')],
  ];
  for (const [name, change] of cases) {
    const t = clone(e);
    change(t);
    await expect(cipher.open(t, PASS), name).rejects.toBeInstanceOf(UnsupportedEnvelope);
  }
});

test('the default minimum is 100,000 iterations', async () => {
  const e = await cipher.seal(TEXT, PASS);
  e.kdf.iterations = 99_999;
  await expect(createCipher().open(e, PASS)).rejects.toBeInstanceOf(UnsupportedEnvelope);
});

test('derived keys are cached per passphrase, salt and iterations', async () => {
  const derive = vi.spyOn(crypto.subtle, 'deriveKey');
  const c = createCipher(FAST);
  const e = await c.seal(TEXT, PASS);
  await c.open(e, PASS);
  await c.seal('again', PASS, e);
  expect(derive).toHaveBeenCalledTimes(1);
  await c.open(e, 'other').catch(() => undefined);
  expect(derive).toHaveBeenCalledTimes(2);
  derive.mockRestore();
});

test('fixed vector: an envelope made with 600,000 iterations still opens', async () => {
  const text = readFileSync(
    fileURLToPath(new URL('./fixtures/sync-envelope.json', import.meta.url)),
    'utf8',
  );
  const parsed = parseEnvelope(text);
  if (!parsed.ok) throw new Error(parsed.error);
  expect(parsed.envelope.kdf.iterations).toBe(600_000);
  expect(await createCipher().open(parsed.envelope, PASS)).toBe(TEXT);
}, 30_000);
