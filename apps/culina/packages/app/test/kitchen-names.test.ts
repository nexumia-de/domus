// The kitchen names (tools/catalogue/kitchen-names.json): the name a cook writes, shown in place
// of the catalogue's own where the entry has one. On the shipped catalogue and recipes.
// Not proved: that a cook would choose each name; they were written by one model and read by another.
import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import type { Classic } from '@culina/engine';
import { CLASSICS } from '../src/classics/index';
import type { IngredientRecord } from '../src/records';
import { displayName, matchesAnyName } from '../src/shared/names';
import { must } from './must';

const read = (path: string): unknown =>
  JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const catalogue = (read('../data/ingredient-catalogue.json') as { ingredients: IngredientRecord[] })
  .ingredients;
const byId = new Map(catalogue.map((r) => [r.id, r]));
const kitchen = (
  read('../../../tools/catalogue/kitchen-names.json') as {
    names: Record<string, { en: string; de: string }>;
  }
).names;

test('the kitchen name is shown in both languages; the catalogue name stays the entry name', () => {
  const water = must(byId.get('fdc-173647'));
  expect(water.name).toBe('Beverages, water, tap, drinking');
  expect(displayName(water, 'en')).toBe('Water');
  expect(displayName(water, 'de')).toBe('Wasser');
  const oil = must(byId.get('fdc-171413'));
  expect(displayName(oil, 'en')).toBe('Olive oil');
});

test('control: an entry without a kitchen name shows the catalogue name, in German the German one', () => {
  const plain = must(catalogue.find((r) => r['x-kitchen'] === undefined && r.names?.['de']));
  expect(displayName(plain, 'en')).toBe(plain.name);
  expect(displayName(plain, 'de')).toBe(plain.names?.['de']?.name);
});

test('a search finds an entry by its kitchen name and still by its catalogue name', () => {
  const oil = must(byId.get('fdc-171413'));
  expect(matchesAnyName(oil, 'olive oil')).toBe(true);
  expect(matchesAnyName(oil, 'Oil, olive')).toBe(true);
  expect(matchesAnyName(oil, 'Olivenöl')).toBe(true);
});

test('the shipped file carries exactly the names of the overlay', () => {
  const inFile = Object.fromEntries(
    catalogue.flatMap((r) => (r['x-kitchen'] === undefined ? [] : [[r.id, r['x-kitchen']]])),
  );
  expect(inFile).toEqual(kitchen);
});

test('no two entries share a kitchen name in a language, and none is empty or long', () => {
  for (const lang of ['en', 'de'] as const) {
    const names = Object.values(kitchen).map((n) => n[lang]);
    expect(new Set(names).size, lang).toBe(names.length);
    for (const name of names) {
      expect(name.trim(), name).toBe(name);
      expect(name.length, name).toBeGreaterThan(0);
      expect(name.length, name).toBeLessThanOrEqual(40);
    }
  }
});

test('every ingredient a shipped recipe names has a kitchen name', () => {
  const refs = (c: Classic): string[] =>
    [...(c.components ?? []).flatMap((k) => k.lines), ...c.slots].flatMap((l) =>
      l.ref?.kind === 'ingredient' ? [l.ref.id] : [],
    );
  const missing = [...new Set(CLASSICS.flatMap(refs))].filter((id) => kitchen[id] === undefined);
  expect(missing).toEqual([]);
});
