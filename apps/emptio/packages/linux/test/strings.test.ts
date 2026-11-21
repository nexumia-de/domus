// The texts only the native app has: German has every text English has, no more.
import { expect, test } from 'vitest';
import { nativeDe, nativeEn } from '../src/strings';

const shape = (value: unknown): unknown =>
  typeof value === 'function'
    ? 'function'
    : value !== null && typeof value === 'object'
      ? Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, shape(inner)]))
      : 'text';

test('German and English have the same texts', () => {
  expect(shape(nativeDe)).toEqual(shape(nativeEn));
});

test('no text is empty', () => {
  const empty = (value: unknown): boolean =>
    typeof value === 'string'
      ? value.trim() === ''
      : value !== null && typeof value === 'object' && Object.values(value).some(empty);
  expect(empty(nativeEn)).toBe(false);
  expect(empty(nativeDe)).toBe(false);
});
