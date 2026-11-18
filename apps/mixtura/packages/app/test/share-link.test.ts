// The share link coding: round trip, unicode, the length limit, every way a
// payload can be refused, and the cap on the decompressed size.
import { expect, test } from 'vitest';
import { MAX_FILE_BYTES } from '../src/store';
import {
  decodePayload,
  encodePayload,
  LINK_VERSION,
  makeLink,
  MAX_LINK_LENGTH,
} from '../src/share/link';

const ADDRESS = 'https://drinks.example/app/';

/** Deterministic text that deflate cannot shrink much. */
const noise = (n: number): string => {
  let x = 12345;
  let out = '';
  for (let i = 0; i < n; i++) {
    x = (x * 1103515245 + 12345) & 0x7fffffff;
    out += String.fromCharCode(97 + (x % 26));
  }
  return out;
};

test('a text survives encoding and decoding', async () => {
  const text = JSON.stringify({ app: 'mixtura', specs: [{ name: 'Old Fashioned' }] });
  const payload = await encodePayload(text);
  expect(payload.startsWith(`${LINK_VERSION}.`)).toBe(true);
  expect(payload).toMatch(/^1\.[A-Za-z0-9_-]+$/);
  expect(await decodePayload(payload)).toEqual({ ok: true, text });
});

test('unicode names, emoji and quotes survive', async () => {
  const text = JSON.stringify({ name: 'Zitronen-Süßes "Äpfel" 柠檬 🍋 ñ\u0000 ' });
  expect(await decodePayload(await encodePayload(text))).toEqual({ ok: true, text });
});

test('the link is the address, #/share/ and the payload', async () => {
  const link = await makeLink('{"a":1}', ADDRESS);
  if (!link.ok) throw new Error('expected a link');
  expect(link.url.startsWith(`${ADDRESS}#/share/1.`)).toBe(true);
});

test('a link longer than the limit is refused, one at the limit is made', async () => {
  const big = await makeLink(noise(20000), ADDRESS);
  expect(big.ok).toBe(false);
  if (!big.ok) {
    expect(big.reason).toBe('too-long');
    expect(big.length).toBeGreaterThan(MAX_LINK_LENGTH);
  }
  const small = await makeLink(noise(3000), ADDRESS);
  expect(small.ok).toBe(true);
  if (small.ok) expect(small.url.length).toBeLessThanOrEqual(MAX_LINK_LENGTH);
});

test.each([
  ['empty', '', 'damaged'],
  ['no version', 'abcd', 'damaged'],
  ['no payload after the version', '1.', 'damaged'],
  ['wrong alphabet', '1.ab+/=cd', 'damaged'],
  ['impossible length', '1.abcde', 'damaged'],
  ['not deflate', '1.AAAAAAAAAAAA', 'damaged'],
  ['unknown version', '2.abcd', 'version'],
  ['version without a number', 'x.abcd', 'version'],
])('%s is refused as %s', async (_name, payload, reason) => {
  expect(await decodePayload(payload)).toEqual({ ok: false, reason });
});

test('a truncated payload is damaged or reads as broken text, never a throw', async () => {
  const payload = await encodePayload(JSON.stringify({ items: noise(2000) }));
  const cut = payload.slice(0, Math.floor(payload.length / 2));
  const result = await decodePayload(cut);
  if (result.ok) expect(() => JSON.parse(result.text)).toThrow();
  else expect(result.reason).toBe('damaged');
});

test('text that is not UTF-8 is damaged', async () => {
  const raw = new Blob([new Uint8Array([0xff, 0xfe, 0xfd])])
    .stream()
    .pipeThrough(new CompressionStream('deflate-raw'));
  const bytes = new Uint8Array(await new Response(raw).arrayBuffer());
  const payload = `1.${Buffer.from(bytes).toString('base64url')}`;
  expect(await decodePayload(payload)).toEqual({ ok: false, reason: 'damaged' });
});

test('a small payload that inflates past the limit is refused while reading', async () => {
  // 12 MB of one letter packs to about 12 kB: a decompression bomb for the 10 MB limit.
  const bomb = await encodePayload('a'.repeat(MAX_FILE_BYTES + 2 * 1024 * 1024));
  expect(bomb.length).toBeLessThan(40_000);
  expect(await decodePayload(bomb)).toEqual({ ok: false, reason: 'too-large' });
});

test('the limit is a parameter and exact', async () => {
  const payload = await encodePayload('x'.repeat(100));
  expect(await decodePayload(payload, 100)).toEqual({ ok: true, text: 'x'.repeat(100) });
  expect(await decodePayload(payload, 99)).toEqual({ ok: false, reason: 'too-large' });
});
