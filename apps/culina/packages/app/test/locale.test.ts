import { expect, test } from 'vitest';
import { formatMass, formatNumber } from '../src/shared/mass';
import { displayName } from '../src/shared/names';
import { withDecimalMark } from '../src/shared/locale';
import { parseEntry } from '../src/shared/parse';

test('German shows a decimal comma, English a point', () => {
  expect(formatNumber(2.5, 2, 'de')).toBe('2,5');
  expect(formatNumber(2.5, 2, 'en')).toBe('2.5');
  expect(formatNumber(1200, 2, 'de')).toBe('1200');
  expect(formatMass(7.25, 'g', 'de')).toBe('7,3 g');
  expect(formatMass(7.25, 'g', 'en')).toBe('7.3 g');
  expect(formatMass(1500, 'kg', 'de')).toBe('1,5 kg');
  expect(withDecimalMark('Version 1.2 of 3', 'en')).toBe('Version 1.2 of 3');
});

test('the comma is read on input in both languages', () => {
  expect(parseEntry('2,5')).toEqual({ kind: 'ok', value: 2.5 });
  expect(parseEntry('2.5')).toEqual({ kind: 'ok', value: 2.5 });
});

test('a name follows the setting: German where the record has one, else the canonical name', () => {
  const cheese = { name: 'Cheese', names: { de: { name: 'Käse' } } };
  expect(displayName(cheese, 'de')).toBe('Käse');
  expect(displayName(cheese, 'en')).toBe('Cheese');
  expect(displayName({ name: 'Salt' }, 'de')).toBe('Salt');
});
