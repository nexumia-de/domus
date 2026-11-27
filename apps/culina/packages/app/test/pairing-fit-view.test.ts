// The fit of every candidate with what is in the pan, as the app names it (`fitView`). The pairing
// data and the table of pairs are constructed; the shipped files are in pairing-fit-data.test.ts.
import { expect, test } from 'vitest';
import { affinityTable } from '../src/pairing/affinity';
import { preparePairings } from '../src/pairing/load';
import { fitView } from '../src/pairing/view';

const range = (from: number, to: number): number[] =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i);
const loaded = preparePairings(
  {
    entities: [
      { id: 1, alias: 'tomato', name: 'Tomato', category: 'vegetable', molecules: range(1, 20) },
      { id: 2, alias: 'basil', name: 'Basil', category: 'herb', molecules: range(8, 27) },
      { id: 3, alias: 'cheese', name: 'Cheese', category: 'dairy', molecules: range(30, 49) },
      { id: 4, alias: 'apple', name: 'Apple', category: 'fruit', molecules: range(40, 59) },
      { id: 5, alias: 'rice', name: 'Rice', category: 'cereal', molecules: range(60, 79) },
    ],
    molecules: {},
  },
  new Map([
    ['fdc-group-tomatoes', 1],
    ['fdc-1', 1],
    ['fdc-2', 2],
    ['fdc-3', 3],
    ['fdc-4', 4],
    ['fdc-5', 5],
  ]),
);
// fdc-1 and fdc-1b are tomatoes of one group; own-1 is the cook's own under fdc-1; fdc-oil has no
// link and no parent.
const parents: Record<string, string> = {
  'fdc-1': 'fdc-group-tomatoes',
  'fdc-1b': 'fdc-group-tomatoes',
  'own-1': 'fdc-1',
};
const names = {
  parentOf: (id: string) => parents[id],
  nameOf: (id: string) => `name of ${id}`,
};
const table = affinityTable({ 'fdc-group-tomatoes': ['fdc-oil', 'fdc-2'] });
const candidates = [
  'fdc-oil',
  'fdc-5',
  'fdc-group-tomatoes',
  'own-1',
  'fdc-1b',
  'fdc-4',
  'fdc-3',
  'fdc-2',
  'fdc-1',
];

test('every candidate gets a band; what the data cannot say comes last as none', () => {
  const view = fitView(
    [{ ingredient: 'fdc-1', name: 'My tomatoes' }],
    candidates,
    loaded,
    names,
    table,
  );
  expect(view.known).toBe(true);
  expect(view.rows).toEqual([
    {
      ingredient: 'fdc-2',
      name: 'name of fdc-2',
      band: 'strong',
      with: ['My tomatoes'],
      proven: ['My tomatoes'],
    },
    // A sibling of the pan's tomato is kept; it is measured against nothing else and scores 0.
    { ingredient: 'fdc-1b', name: 'name of fdc-1b', band: 'little', with: [], proven: [] },
    { ingredient: 'fdc-3', name: 'name of fdc-3', band: 'little', with: [], proven: [] },
    { ingredient: 'fdc-4', name: 'name of fdc-4', band: 'little', with: [], proven: [] },
    // No link; and rice, which shares no molecules with anything, has no usual to measure by.
    {
      ingredient: 'fdc-oil',
      name: 'name of fdc-oil',
      band: 'none',
      with: [],
      proven: ['My tomatoes'],
    },
    { ingredient: 'fdc-5', name: 'name of fdc-5', band: 'none', with: [], proven: [] },
  ]);
});

test('what is in the pan, as itself, as its group or as a member, is not offered', () => {
  const offered = fitView(
    [{ ingredient: 'fdc-1', name: 'My tomatoes' }],
    candidates,
    loaded,
    names,
    table,
  ).rows.map((row) => row.ingredient);
  for (const id of ['fdc-1', 'fdc-group-tomatoes', 'own-1']) expect(offered).not.toContain(id);
});

test('two lines of one ingredient count once, named by the first', () => {
  const view = fitView(
    [
      { ingredient: 'fdc-2', name: 'Basil' },
      { ingredient: 'fdc-2', name: 'More basil' },
    ],
    ['fdc-1'],
    loaded,
    names,
    table,
  );
  expect(view.rows).toEqual([
    {
      ingredient: 'fdc-1',
      name: 'name of fdc-1',
      band: 'strong',
      with: ['Basil'],
      proven: ['Basil'],
    },
  ]);
});

test('a pan the data does not know gives none for all, the proven mark through the group', () => {
  const view = fitView([{ ingredient: 'fdc-oil', name: 'Oil' }], candidates, loaded, names, table);
  expect(view.known).toBe(false);
  expect(view.rows.every((row) => row.band === 'none' && row.with.length === 0)).toBe(true);
  expect(view.rows.map((row) => row.ingredient)).toEqual(candidates.filter((c) => c !== 'fdc-oil'));
  const proven = view.rows.filter((row) => row.proven.length > 0).map((row) => row.ingredient);
  expect(proven).toEqual(['fdc-group-tomatoes', 'own-1', 'fdc-1b', 'fdc-1']);
});
