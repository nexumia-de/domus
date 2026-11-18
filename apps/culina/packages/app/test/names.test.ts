// The shared name predicate: every name of a record, folded matching, the name found through.
import { describe, expect, test } from 'vitest';
import {
  fold,
  foundThrough,
  matchesAnyName,
  matchingNames,
  searchableNames,
  startsWithAnyName,
} from '../src/shared/names';

const buttermilk = {
  name: 'Milk, buttermilk, fluid',
  names: { de: { name: 'Buttermilch', aliases: ['Sauermilch', 'Kärnemilch'], source: 'x' } },
};
const plain = { name: 'Garlic' };

describe('shared name predicate', () => {
  test('fold: lower case, accents and umlauts dropped, sharp s as ss', () => {
    expect(fold('  Käse ')).toBe('kase');
    expect(fold('Straße')).toBe('strasse');
    expect(fold('Crème')).toBe('creme');
  });
  test('every name of a record: English first, then each language name and its aliases', () => {
    expect(searchableNames(buttermilk).map((n) => `${n.lang}:${n.name}`)).toEqual([
      'en:Milk, buttermilk, fluid',
      'de:Buttermilch',
      'de:Sauermilch',
      'de:Kärnemilch',
    ]);
    expect(searchableNames(plain)).toEqual([{ lang: 'en', name: 'Garlic' }]);
  });
  test('matches the English name, the German name and an alias, not an empty text', () => {
    expect(matchesAnyName(buttermilk, 'buttermilk')).toBe(true);
    expect(matchesAnyName(buttermilk, 'buttermilch')).toBe(true);
    expect(matchesAnyName(buttermilk, 'sauer')).toBe(true);
    expect(matchesAnyName(buttermilk, 'kärne')).toBe(true);
    expect(matchesAnyName(buttermilk, 'karne')).toBe(true);
    expect(matchesAnyName(buttermilk, 'garlic')).toBe(false);
    expect(matchesAnyName(buttermilk, '  ')).toBe(false);
    expect(matchesAnyName(plain, 'GARL')).toBe(true);
  });
  test('starts with: any name', () => {
    expect(startsWithAnyName(buttermilk, 'butter')).toBe(true);
    expect(startsWithAnyName(buttermilk, 'milk')).toBe(true);
    expect(startsWithAnyName(buttermilk, 'milch')).toBe(false);
    expect(matchingNames(buttermilk, 'milch').map((n) => n.name)).toEqual([
      'Buttermilch',
      'Sauermilch',
      'Kärnemilch',
    ]);
  });
  test('found through: the other-language name, only when the English name does not match', () => {
    expect(foundThrough(buttermilk, 'buttermilch')).toEqual({ lang: 'de', name: 'Buttermilch' });
    expect(foundThrough(buttermilk, 'kärne')).toEqual({ lang: 'de', name: 'Kärnemilch' });
    expect(foundThrough(buttermilk, 'butter')).toBeUndefined();
    expect(foundThrough(plain, 'garlic')).toBeUndefined();
    expect(foundThrough(plain, 'x')).toBeUndefined();
  });
});
