// The texts of the native app: German has every text English has, no more.
import { expect, test } from 'vitest';
import { textsDe, textsEn } from '../src/strings';

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
  expect(textsEn.cook.stepOf(2, 7)).toMatch(/2.*7/);
  expect(textsDe.cook.stepOf(2, 7)).toMatch(/2.*7/);
  expect(textsEn.stock.ticked('Milk')).toContain('Milk');
  expect(textsDe.stock.ticked('Milch')).toContain('Milch');
  expect(textsEn.dishes(1)).toBe('1 dish');
  expect(textsDe.dishes(12)).toBe('12 Gerichte');
});
