/* eslint-disable @typescript-eslint/no-non-null-assertion -- bytes and matches are indexed at known positions */
import { expect, test } from 'vitest';
import { generatePassphrase, normalisePassphrase } from '../src/sync/passphrase';

const FORM = /^[0-9A-HJKMNP-TV-Z]{4}(-[0-9A-HJKMNP-TV-Z]{4}){4}$/;

test('the generated form is 5 groups of 4 Crockford characters', () => {
  for (let i = 0; i < 50; i++) expect(generatePassphrase()).toMatch(FORM);
  expect(generatePassphrase()).not.toBe(generatePassphrase());
});

test('every byte maps to a character; the low 5 bits give each of the 32 exactly 8 bytes', () => {
  const seen = new Map<string, number>();
  for (let v = 0; v < 256; v++) {
    const text = generatePassphrase((a) => a.fill(v));
    const c = text[0]!;
    seen.set(c, (seen.get(c) ?? 0) + 1);
  }
  expect(seen.size).toBe(32);
  expect([...seen.values()].every((n) => n === 8)).toBe(true);
});

test('the random source is read once, 20 bytes, and its bytes are used in order', () => {
  let calls = 0;
  const text = generatePassphrase((a) => {
    calls++;
    expect(a.length).toBe(20);
    a.forEach((_, i) => (a[i] = i));
    return a;
  });
  expect(calls).toBe(1);
  expect(text).toBe('0123-4567-89AB-CDEF-GHJK');
});

test('look-alikes, case and spaces are normalised for the generated form', () => {
  expect(normalisePassphrase('  7k3m-9qxa-bo1d-ef4g-h5jk\n')).toBe('7K3M-9QXA-B01D-EF4G-H5JK');
  expect(normalisePassphrase('OIOL-0101-0101-0101-0101')).toBe('0101-0101-0101-0101-0101');
});

test('any other text is used exactly as typed', () => {
  for (const own of [
    ' my own phrase ',
    'Hello Olive',
    '7K3M9QXABCDEFGHJKMNP',
    '7K3M-9QXA-BCDE',
    'UUUU-UUUU-UUUU-UUUU-UUUU',
  ]) {
    expect(normalisePassphrase(own)).toBe(own);
  }
});

test('a generated passphrase is stable under normalisation', () => {
  for (let i = 0; i < 20; i++) {
    const p = generatePassphrase();
    expect(normalisePassphrase(p)).toBe(p);
  }
});
