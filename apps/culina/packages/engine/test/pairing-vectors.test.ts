// Runs every vector in vectors/pairing against the public entry (docs/vectors.md): pairings from
// shared flavour molecules, their order and their limits, and the fit of every candidate in
// bands. The vectors are constructed; what the real data gives is not asserted here.
import { describe, expect, test } from 'vitest';
import {
  bandOf,
  entityByName,
  pairingFit,
  pairingsFor,
  pairingsForDish,
  sharedMolecules,
} from '../src/index';
import type { FitItem, FitOptions, PairingData, PairingOptions } from '../src/index';
import { loadVectors } from './vector-files';

describe('pairing vectors', () => {
  for (const vector of loadVectors('pairing')) {
    test(vector.id, () => {
      const i = vector.inputs;
      switch (i.kind) {
        case 'pairings':
          return expect(
            pairingsFor(
              i.entity_id as number,
              i.data as PairingData,
              (i.options ?? {}) as PairingOptions,
            ),
          ).toEqual(vector.expected?.pairings);
        case 'dish_pairings':
          return expect(
            pairingsForDish(
              i.entity_ids as number[],
              i.data as PairingData,
              (i.options ?? {}) as PairingOptions,
              i.candidates === undefined ? undefined : new Set(i.candidates as number[]),
            ),
          ).toEqual(vector.expected?.pairings);
        case 'pairing_fit': {
          const pairs = (i.proven ?? []) as [string, string][];
          const proven = (candidate: string, inPan: string): boolean =>
            pairs.some(
              ([x, y]) => (x === candidate && y === inPan) || (x === inPan && y === candidate),
            );
          return expect(
            pairingFit(i.pan as FitItem[], i.candidates as FitItem[], i.data as PairingData, {
              ...((i.options ?? {}) as FitOptions),
              proven,
            }),
          ).toEqual(vector.expected?.fits);
        }
        case 'fit_bands':
          return expect((i.scores as number[]).map(bandOf)).toEqual(vector.expected?.bands);
        case 'shared_molecules':
          return expect(sharedMolecules(i.a as number[], i.b as number[])).toEqual(
            vector.expected?.shared,
          );
        default:
          throw new Error(`unknown kind ${i.kind}`);
      }
    });
  }
});

describe('entityByName', () => {
  const data: PairingData = {
    entities: [
      { id: 1, alias: 'tomato', name: 'Tomato', category: 'vegetable', molecules: [] },
      {
        id: 2,
        alias: 'bread-wheaten',
        name: 'Wheaten Bread',
        category: 'bakery',
        molecules: [],
        synonyms: ['Soda scones', 'Soda farls'],
      },
      {
        id: 3,
        alias: 'cherry-tomato',
        name: 'Cherry Tomato',
        category: 'vegetable',
        molecules: [],
      },
      {
        id: 4,
        alias: 'soda',
        name: 'Soda',
        category: 'beverage',
        molecules: [],
        synonyms: ['Tomato'],
      },
    ],
    molecules: {},
  };
  test('finds by name, alias or synonym, without case', () => {
    expect(entityByName(' wheaten bread ', data)?.id).toBe(2);
    expect(entityByName('bread-wheaten', data)?.id).toBe(2);
    expect(entityByName('SODA FARLS', data)?.id).toBe(2);
  });
  test('a text that names two entities, or none, finds nothing', () => {
    expect(entityByName('tomato', data)).toBeUndefined();
    expect(entityByName('basil', data)).toBeUndefined();
    expect(entityByName('', data)).toBeUndefined();
  });
});
