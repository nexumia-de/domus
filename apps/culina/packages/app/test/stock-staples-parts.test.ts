// What the stock route offers, on the real shipped catalogue: the picker's first entry for each
// German word a tester typed (the entry whose name is the word itself, before names that only start
// with it), the staples, and the parts table.
import { expect, test } from 'vitest';
import { catalogueTree, rankFound, searchTree } from '../src/catalogue/tree';
import { PART_TABLE } from '../src/cook/parts';
import { missingStaples, STAPLES } from '../src/stock/staples';
import { byId, entries, SALT_AND_PEPPER, TICKED } from './everyday-stock.helpers';

const roots = catalogueTree(entries);
const firstOffered = (word: string): string | undefined =>
  rankFound(
    searchTree(roots, word, () => true),
    word,
  )[0]?.entry.id;

test('the picker offers first the entry whose name is the search word', () => {
  // Before 2026-11-21 "Kartoffel" offered potato flour and "Tomaten" the canned tomato products.
  expect(TICKED.map(([word]) => [word, firstOffered(word)])).toEqual(TICKED);
});

test('a name that only starts with the word stays below one that is the word', () => {
  const found = rankFound(
    searchTree(roots, 'Kartoffel', () => true),
    'Kartoffel',
  );
  expect(found.map((f) => f.entry.id).slice(0, 2)).toEqual(['fdc-170028', 'fdc-168446']);
});

test('the staples are salt and black pepper of the catalogue, offered until ticked', () => {
  expect(STAPLES.map((s) => s.id)).toEqual(SALT_AND_PEPPER);
  for (const s of STAPLES) expect(byId.has(s.id), s.id).toBe(true);
  expect(missingStaples([]).map((s) => s.id)).toEqual(SALT_AND_PEPPER);
  const salt = { id: 'x', ref: { kind: 'ingredient' as const, id: 'fdc-173468' } };
  expect(missingStaples([salt]).map((s) => s.id)).toEqual(['fdc-170931']);
});

test('the parts table names catalogue entries and states a basis', () => {
  expect(PART_TABLE.length).toBeGreaterThan(0);
  for (const entry of PART_TABLE) {
    expect(byId.has(entry.whole), entry.whole).toBe(true);
    for (const part of entry.parts) expect(byId.has(part), part).toBe(true);
    expect(entry.basis.length).toBeGreaterThan(20);
  }
});
