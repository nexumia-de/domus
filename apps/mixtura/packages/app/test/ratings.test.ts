// Ratings in the collection `ratings` of a space, and the rating filter (docs/ratings.md).
import { expect, test } from 'vitest';
import { likedByAll, ratingKey, ratingsOf } from '../src/ratings/source';

const at = '2026-11-27T12:00:00.000Z';

test('a record per person and drink; deleted, foreign and malformed records are skipped', () => {
  const byPerson = ratingsOf([
    { key: ratingKey('anna', 'negroni'), updatedAt: at, value: { rating: 'favourite' } },
    { key: ratingKey('anna', 'seed/with-slash'), updatedAt: at, value: { rating: 'good', x: 1 } },
    { key: ratingKey('ben', 'negroni'), updatedAt: at, value: { rating: 'not-for-me' } },
    { key: ratingKey('ben', 'daiquiri'), updatedAt: at, deleted: true },
    { key: 'cleo/sour', updatedAt: at, value: { rating: 'great' } },
    { key: 'noslash', updatedAt: at, value: { rating: 'good' } },
    { key: 'dan/', updatedAt: at, value: { rating: 'good' } },
  ]);
  expect([...byPerson.keys()]).toEqual(['anna', 'ben']);
  expect(byPerson.get('anna')?.get('seed/with-slash')).toBe('good');
  expect(byPerson.get('ben')?.get('negroni')).toBe('not-for-me');
  expect(byPerson.get('ben')?.has('daiquiri')).toBe(false);
});

test('liked by all needs two persons who both rated it good or favourite', () => {
  const byPerson = ratingsOf([
    { key: 'a/x', updatedAt: at, value: { rating: 'favourite' } },
    { key: 'b/x', updatedAt: at, value: { rating: 'good' } },
    { key: 'a/y', updatedAt: at, value: { rating: 'good' } },
    { key: 'b/y', updatedAt: at, value: { rating: 'not-for-me' } },
    { key: 'a/z', updatedAt: at, value: { rating: 'good' } },
  ]);
  expect(likedByAll('x', ['a', 'b'], byPerson)).toBe(true);
  expect(likedByAll('y', ['a', 'b'], byPerson)).toBe(false);
  expect(likedByAll('z', ['a', 'b'], byPerson)).toBe(false);
  expect(likedByAll('x', ['a'], byPerson)).toBe(false);
});
