// The raw meat, poultry, fish and shellfish named in tools/catalogue/extras.json: each is a row of
// the shipped file with USDA's own food category, so that "with meat" and "with fish" can be read
// from the category and not from a word list. Proves the shipped file against the named list only;
// it does not prove the USDA numbers (the generator reads those from the dataset).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

const read = (url: string): unknown =>
  JSON.parse(readFileSync(fileURLToPath(new URL(url, import.meta.url)), 'utf8'));

interface Row {
  id: string;
  name: string;
  parentId?: string;
  'x-fdc'?: { id: number; description: string; category: string };
  'x-group'?: { category?: string };
}
const rows = (read('../data/ingredient-catalogue.json') as { ingredients: Row[] }).ingredients;
const byFdc = new Map(rows.flatMap((r) => (r['x-fdc'] ? [[r['x-fdc'].id, r] as const] : [])));

const CATEGORIES = [
  'Beef Products',
  'Pork Products',
  'Poultry Products',
  'Finfish and Shellfish Products',
  'Lamb, Veal, and Game Products',
  'Sausages and Luncheon Meats',
];
const named = (read('../../../tools/catalogue/extras.json') as { foods: { id: number }[] }).foods
  .map((f) => f.id)
  .filter((id) => CATEGORIES.includes(byFdc.get(id)?.['x-fdc']?.category ?? ''));

describe('named meat, poultry, fish and shellfish', () => {
  test('there are 28, all raw or unprepared, in all six categories', () => {
    expect(named).toHaveLength(28);
    const cats = new Set(named.map((id) => byFdc.get(id)?.['x-fdc']?.category));
    expect([...cats].sort()).toEqual([...CATEGORIES].sort());
    for (const id of named) {
      expect(byFdc.get(id)?.['x-fdc']?.description).toMatch(/\braw\b|unprepared|unheated/);
    }
  });

  test('no other row of the file is in these categories', () => {
    const inCategory = rows.filter((r) => CATEGORIES.includes(r['x-fdc']?.category ?? ''));
    expect(inCategory).toHaveLength(named.length);
  });

  test('a parent takes the category only when all rows below agree', () => {
    for (const r of rows.filter((x) => x.id.startsWith('fdc-group'))) {
      const below = rows.filter((c) => c.parentId === r.id && c['x-fdc']);
      const cats = new Set(below.map((c) => c['x-fdc']?.category));
      if (r['x-group']?.category !== undefined && below.length > 0 && cats.size === 1) {
        expect(r['x-group'].category).toBe([...cats][0]);
      }
    }
  });
});
