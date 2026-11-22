// The texts of the native app: German has every text English has, no more, and the
// helper that joins ingredient names does not depend on a language.
import { expect, test } from 'vitest';
import { joinNames, textsDe, textsEn } from '../src/strings';

const shape = (value: unknown): unknown =>
  typeof value === 'function'
    ? 'function'
    : value !== null && typeof value === 'object'
      ? Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, shape(inner)]))
      : 'text';

test('German and English have the same texts', () => {
  expect(shape(textsDe)).toEqual(shape(textsEn));
});

test('no text is empty', () => {
  const empty = (value: unknown): boolean =>
    typeof value === 'string'
      ? value.trim() === ''
      : value !== null && typeof value === 'object' && Object.values(value).some(empty);
  expect(empty(textsEn)).toBe(false);
  expect(empty(textsDe)).toBe(false);
});

test('texts with a number or a name give the same placeholders in both languages', () => {
  expect(textsEn.drinks.tagMissingMany(3)).toContain('3');
  expect(textsDe.drinks.tagMissingMany(3)).toContain('3');
  expect(textsEn.drinks.tagMissingOne('Gin')).toContain('Gin');
  expect(textsDe.drinks.tagMissingOne('Gin')).toContain('Gin');
  expect(textsEn.bottles.count(2, 5)).toMatch(/2.*5/);
  expect(textsDe.bottles.count(2, 5)).toMatch(/2.*5/);
});

test('names are joined and the rest is counted', () => {
  expect(joinNames(['Gin', 'Campari'])).toBe('Gin, Campari');
  expect(joinNames(['a', 'b', 'c', 'd'])).toBe('a, b, c, d');
  expect(joinNames(['a', 'b', 'c', 'd', 'e', 'f'])).toBe('a, b, c, d +2');
  expect(joinNames([])).toBe('');
});

test('the status words answer every failure code of a sync cycle in both languages', () => {
  for (const code of ['unauthorised', 'not-found', 'unreachable', 'blocked', 'conflict', 'other']) {
    expect(textsEn.status.failures).toHaveProperty(code);
    expect(textsDe.status.failures).toHaveProperty(code);
  }
});
