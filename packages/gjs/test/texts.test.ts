// The shared texts: both languages have every key, and the words around a count read right.
import { expect, test } from 'vitest';
import { sharedDe, sharedEn } from '../src/texts';

const keys = (value: unknown, prefix = ''): string[] =>
  typeof value === 'object' && value !== null
    ? Object.entries(value).flatMap(([key, inner]) => keys(inner, `${prefix}${key}.`))
    : [prefix];

test('English and German have the same keys', () => {
  expect(keys(sharedDe)).toEqual(keys(sharedEn));
});

test('the functions take the same arguments in both languages', () => {
  expect(sharedEn.join.joined('Home')).toBe('Joined Home.');
  expect(sharedDe.join.joined('Zuhause')).toBe('Zuhause beigetreten.');
  expect(sharedEn.status.minutes(5)).toBe('5 min ago');
  expect(sharedDe.status.minutes(5)).toBe('vor 5 Min.');
});
