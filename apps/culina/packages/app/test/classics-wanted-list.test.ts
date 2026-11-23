// The reviewed list of what the shipped classics still name as `wanted`, with the number of lines of
// each. A line not matched to the catalogue must be added here by a reviewer: an unlisted name, or a
// listed one that was matched since, fails the test. Why they stay: docs/ingredient-catalogue.md.
import { describe, expect, test } from 'vitest';
import { listWanted } from './classics-wanted';

const ALLOWED: readonly (readonly [string, number])[] = [
  ['Beef bone', 1],
  ['Beef bones', 1],
  ['Beef extract', 1],
  ['Boiled meat (lesso)', 1],
  ['Bouquet garni', 1],
  ['Carnesecca (dry-cured pork)', 2],
  ['Cheese (cacio)', 2],
  ['Chicken blood', 1],
  ['Chocolate', 1],
  ['Cold water', 1],
  ['Fatty ham (prosciutto grasso)', 1],
  ['Fine herbs', 1],
  ['Fresh berries', 1],
  ['Fresh berries, sugared', 1],
  ['Fruit brandy (acquavite)', 1],
  ['Herring milt', 1],
  ['Ice-cold water', 1],
  ['Juniper berries', 2],
  ['Kidney suet', 1],
  ['Meat broth', 2],
  ['Meat stock', 1],
  ['Orange-flower water', 2],
  ['Shelled fresh beans', 1],
  ['Soup vegetables', 1],
  ['Tarragon', 1],
  ['Water', 40],
  ['Water (the cooking water of the peas)', 1],
  ['Water, cold', 1],
];

describe('the wanted allow-list', () => {
  test('names exactly the wanted lines of the shipped classics', () => {
    const found = new Map<string, number>();
    for (const w of listWanted()) found.set(w.wanted.en, (found.get(w.wanted.en) ?? 0) + 1);
    expect([...found.entries()].sort()).toEqual([...ALLOWED].map(([n, c]) => [n, c]).sort());
  });
});
