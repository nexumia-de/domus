import { expect, test } from 'vitest';
import { base64ToBytes, bytesToBase64 } from '../src/sync/base64';

test('matches Buffer for every length from 0 to 40', () => {
  for (let n = 0; n <= 40; n++) {
    const bytes = Uint8Array.from({ length: n }, (_, i) => (i * 37 + 11) & 255);
    const text = bytesToBase64(bytes);
    expect(text).toBe(Buffer.from(bytes).toString('base64'));
    expect(base64ToBytes(text)).toEqual(bytes);
  }
});

test('all byte values survive', () => {
  const bytes = Uint8Array.from({ length: 256 }, (_, i) => i);
  expect(base64ToBytes(bytesToBase64(bytes))).toEqual(bytes);
});

test('known values', () => {
  expect(bytesToBase64(new TextEncoder().encode('Man'))).toBe('TWFu');
  expect(bytesToBase64(new TextEncoder().encode('Ma'))).toBe('TWE=');
  expect(bytesToBase64(new TextEncoder().encode('M'))).toBe('TQ==');
});

test('malformed text is rejected', () => {
  for (const bad of ['abc', 'TQ=', 'T===', 'T*==', 'TQ==TQ==', '=TWFu', 'TWFu ']) {
    expect(base64ToBytes(bad), bad).toBeUndefined();
  }
});
