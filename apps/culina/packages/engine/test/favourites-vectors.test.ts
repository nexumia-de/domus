// Runs every vector in vectors/favourites against the engine (docs/vectors.md): the record of a
// favourite and the dishes the records mark, per origin.
import { describe, expect, test } from 'vitest';
import { favouriteDishes, favouriteRecord } from '../src/index';
import type { FavouriteOrigin, FavouriteRecord } from '../src/index';
import { loadVectors } from './vector-files';

describe('favourites vectors', () => {
  for (const vector of loadVectors('favourites')) {
    test(vector.id, () => {
      const i = vector.inputs;
      switch (i.kind) {
        case 'favourite_record':
          return expect(favouriteRecord(i.origin as FavouriteOrigin, i.dish as string)).toEqual(
            vector.expected,
          );
        case 'favourite_dishes': {
          const marked = favouriteDishes(i.records as FavouriteRecord[]);
          return expect({
            own: [...marked.own].sort(),
            shipped: [...marked.shipped].sort(),
          }).toEqual(vector.expected);
        }
        default:
          throw new Error(`${vector.id}: unknown kind ${String(i.kind)}`);
      }
    });
  }
});
