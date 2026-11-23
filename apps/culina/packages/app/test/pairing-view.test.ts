// The "Goes with" section's data: reading the two shipped files and the view of a dish. The
// pairing data here is constructed (three ingredients of different families that share
// molecules); the real files are checked in flavordb-data.test.ts.
import { expect, test } from 'vitest';
import {
  LINKS_FORMAT,
  PAIRINGS_FORMAT,
  loadPairings,
  preparePairings,
  readLinks,
  readPairings,
  resetPairings,
} from '../src/pairing/load';
import { entityOf, namedBy, pairingView } from '../src/pairing/view';

const range = (from: number, to: number): number[] =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i);
const pairings = {
  format: PAIRINGS_FORMAT,
  formatVersion: 1,
  entities: [
    { id: 1, alias: 'tomato', name: 'Tomato', category: 'vegetable', molecules: range(1, 20) },
    { id: 2, alias: 'basil', name: 'Basil', category: 'herb', molecules: range(8, 27) },
    { id: 3, alias: 'cheese', name: 'Cheese', category: 'dairy', molecules: range(30, 49) },
    { id: 4, alias: 'apple', name: 'Apple', category: 'fruit', molecules: range(40, 59) },
    { id: 5, alias: 'rice', name: 'Rice', category: 'cereal', molecules: range(60, 79) },
  ],
  molecules: {},
};
const linkFile = {
  format: LINKS_FORMAT,
  formatVersion: 1,
  links: {
    'fdc-1': 1,
    'fdc-group-tomatoes': 1,
    'fdc-2': 2,
    'fdc-3': 3,
    'fdc-4': 4,
    'fdc-5': 5,
  },
};
const loaded = () => {
  const data = readPairings(pairings);
  const links = readLinks(linkFile);
  if (!data || !links) throw new Error('fixture');
  return preparePairings(data, links);
};
const parents: Record<string, string> = { 'fdc-1': 'fdc-group-tomatoes', 'own-1': 'fdc-1' };
const names = {
  parentOf: (id: string) => parents[id],
  nameOf: (id: string) => `name of ${id}`,
};

test('a file of another format, or with a link that is no number, is not read', () => {
  expect(readPairings({ ...pairings, format: 'x' })).toBeUndefined();
  expect(readPairings({ ...pairings, entities: [{ id: 'a' }] })).toBeUndefined();
  expect(readLinks({ ...linkFile, formatVersion: 2 })).toBeUndefined();
  expect(readLinks({ ...linkFile, links: { a: 'b' } })).toBeUndefined();
  expect(readLinks(linkFile)?.get('fdc-2')).toBe(2);
});

test('an ingredient stands for the entity of its own link, else of its nearest ancestor', () => {
  const l = loaded();
  expect(entityOf('fdc-2', l, names.parentOf)).toBe(2);
  expect(entityOf('own-1', l, names.parentOf)).toBe(1);
  expect(entityOf('own-9', l, names.parentOf)).toBeUndefined();
});

test('an entity is named by a group before a single food', () => {
  expect(namedBy(loaded()).get(1)).toBe('fdc-group-tomatoes');
});

test('the view offers what stands out with the dish and names the lines it goes with', () => {
  const view = pairingView(
    [
      { ingredient: 'own-1', name: 'My tomatoes' },
      { ingredient: 'fdc-9', name: 'Unknown' },
    ],
    loaded(),
    names,
  );
  expect(view).toEqual({
    kind: 'rows',
    rows: [{ ingredient: 'fdc-2', name: 'name of fdc-2', with: ['My tomatoes'] }],
  });
});

test('a dish the data does not know is "unknown"; one with nothing standing out is "none"', () => {
  expect(pairingView([{ ingredient: 'fdc-9', name: 'x' }], loaded(), names)).toEqual({
    kind: 'unknown',
  });
  expect(pairingView([{ ingredient: 'fdc-5', name: 'Rice' }], loaded(), names)).toEqual({
    kind: 'none',
  });
});

test('the files are fetched once; a load that failed is tried again', async () => {
  resetPairings();
  const calls: string[] = [];
  const failing = (url: string) => {
    calls.push(url);
    return Promise.resolve({ ok: false, json: () => Promise.resolve(undefined) });
  };
  expect(await loadPairings(failing)).toBeUndefined();
  const working = (url: string) => {
    calls.push(url);
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(url === 'pairings.json' ? pairings : linkFile),
    });
  };
  const first = await loadPairings(working);
  expect(first?.candidates.size).toBe(5);
  expect(await loadPairings(working)).toBe(first);
  expect(calls).toEqual([
    'pairings.json',
    'pairing-links.json',
    'pairings.json',
    'pairing-links.json',
  ]);
  resetPairings();
});
