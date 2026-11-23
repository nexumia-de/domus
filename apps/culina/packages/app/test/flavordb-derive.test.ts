// The pairing data as tools/flavordb derives it from FlavorDB's entity documents. The two
// fixtures are real entities read on 2026-11-23, with each molecule cut down to six fields
// (tools/flavordb/fixtures/README.md). Not proven: the full documents, the hundreds of entities
// nobody fetched yet, and the fetch itself, which needs the network.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import { pairingsFor } from '@culina/engine';
import {
  deriveDataset,
  deriveEntity,
  flavourWords,
  FORMAT,
  LICENCE,
  synonymsOf,
} from '../../../tools/flavordb/derive.mjs';

const fixture = (id: number): Record<string, unknown> =>
  JSON.parse(
    readFileSync(
      fileURLToPath(new URL(`../../../tools/flavordb/fixtures/${id}.json`, import.meta.url)),
      'utf8',
    ),
  ) as Record<string, unknown>;

test('an entity keeps its id, names, category and the PubChem ids of its molecules, ascending', () => {
  const result = deriveEntity(fixture(300));
  expect(result.entity).toEqual({
    id: 300,
    alias: 'allium',
    name: 'Allium',
    category: 'plant',
    molecules: [8163, 11617, 12377, 13367, 16590, 61926, 62434, 75552],
    synonyms: ['Allium Caucas'],
  });
  expect(new Map(result.molecules).get(16590)).toEqual({
    name: 'Diallyl Disulfide',
    flavours: ['alliaceous', 'garlic', 'metallic', 'onion'],
  });
});

test('flavour words are split at "@", lower case, sorted and once each; a synonym equal to the name is left out', () => {
  expect(flavourWords('Roast@peanut butter@roast@ @Green')).toEqual([
    'green',
    'peanut butter',
    'roast',
  ]);
  expect(flavourWords(null)).toEqual([]);
  expect(synonymsOf(fixture(1))).toEqual([]);
});

test('the file names its source, licence and what was changed, and is the same for the same documents in any order', () => {
  const a = deriveDataset([fixture(300), fixture(1)], { fetched: '2026-11-23' });
  const b = deriveDataset([fixture(1), fixture(300)], { fetched: '2026-11-23' });
  expect(JSON.stringify(a.data)).toBe(JSON.stringify(b.data));
  expect(a.problems).toEqual([]);
  expect(a.data.format).toBe(FORMAT);
  expect(a.data.dataset).toMatchObject({
    name: 'FlavorDB',
    licence: LICENCE,
    fetched: '2026-11-23',
  });
  expect(a.data.dataset.citation).toContain('gkx957');
  expect(a.data.entities.map((e) => e.id)).toEqual([1, 300]);
  expect(Object.keys(a.data.molecules)).toHaveLength(14);
  // The engine reads what the tool writes: these two share nothing.
  expect(pairingsFor(1, a.data, { minShared: 1, minMolecules: 1 })).toEqual([]);
});

test('a document that is no entity is named and left out; an entity given twice is kept once', () => {
  const { data, problems } = deriveDataset(
    [
      fixture(1),
      { entity_id: 7, broken: true },
      fixture(1),
      { entity_id: 8, entity_alias_readable: 'X', molecules: [{}] },
    ],
    { fetched: '2026-11-23' },
  );
  expect(data.entities.map((e) => e.id)).toEqual([1]);
  expect(problems).toEqual([
    'entity 1: twice',
    'entity 7: no name',
    'entity 8: a molecule without pubchem_id',
  ]);
});
