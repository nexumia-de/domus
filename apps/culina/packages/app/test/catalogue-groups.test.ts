// The catalogue tree: the grouping rule on fixture excerpts and on synthetic names, the parents'
// numbers, the yields from refuse, reproducibility, and the shipped file as a valid ingredient tree.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildTree, validateModel } from '@culina/engine';
import { describe, expect, test } from 'vitest';
import { buildCatalogue, serialise, type CatalogueRow } from '../../../tools/catalogue/build.mjs';
import type { Food } from '../../../tools/catalogue/derive.mjs';
import { AGREEMENT, groupIdOf, groupRows } from '../../../tools/catalogue/group.mjs';
import { deriveYields, readRefuse } from '../../../tools/catalogue/yields.mjs';
import { must } from './must';

const url = (path: string): URL => new URL(path, import.meta.url);
const text = (path: string, encoding: 'utf8' | 'latin1' = 'utf8'): string =>
  readFileSync(fileURLToPath(url(path)), encoding);
const foods = (
  JSON.parse(text('./fixtures/catalogue/sr-legacy-groups-excerpt.json')) as {
    SRLegacyFoods: Food[];
  }
).SRLegacyFoods;
const refuse = readRefuse(text('./fixtures/catalogue/food-des-excerpt.txt', 'latin1'));
const rows = buildCatalogue(foods, '2018-04', refuse);
const byId = (id: string): CatalogueRow => must(rows.find((r) => r.id === id));
const byName = (name: string): CatalogueRow => must(rows.find((r) => r.name === name));

/** A food row for the grouping rule: a name and optionally a density. */
const food = (id: number, name: string, density?: number): CatalogueRow => ({
  id: `fdc-${id}`,
  name,
  ...(density === undefined ? {} : { densityGPerMl: { value: density, source: 's' } }),
  'x-fdc': { id, description: name },
});

describe('the grouping rule on the fixture excerpt', () => {
  test('variants of one food get a parent named by their shared leading segments', () => {
    expect(byName('Butter')).toMatchObject({ id: 'fdc-group-butter', 'x-group': { rows: 3 } });
    for (const id of ['fdc-173410', 'fdc-173411', 'fdc-173430']) {
      expect(byId(id).parentId).toBe('fdc-group-butter');
    }
    expect(byName('Pears').parentId).toBeUndefined();
  });
  test('the parent is as deep as the shared segments go; levels are not skipped', () => {
    const flour = byName('Wheat flour, white, all-purpose');
    expect(flour['x-group']).toEqual({ rows: 3, category: 'Cereal Grains and Pasta' });
    expect(byId('fdc-168894').parentId).toBe(flour.id);
    // "Wheat flour" and "Wheat flour, white" have a single child each and are not made.
    expect(rows.some((r) => r.name === 'Wheat flour' || r.name === 'Wheat flour, white')).toBe(
      false,
    );
    expect(flour.parentId).toBeUndefined();
  });
  test('a food that stands alone gets no parent, however long its name', () => {
    for (const id of ['fdc-169230', 'fdc-170163', 'fdc-170918', 'fdc-171028', 'fdc-171688']) {
      expect(byId(id).parentId, id).toBeUndefined();
    }
    expect(rows.some((r) => r.name === 'Nuts' || r.name === 'Oil' || r.name === 'Spices')).toBe(
      false,
    );
  });
  test('a row whose own name is the shared run is the parent, no second entry is made', () => {
    expect(byId('fdc-169977').parentId).toBe('fdc-169975');
    expect(rows.filter((r) => r.name === 'Cabbage')).toHaveLength(1);
  });
  test('the result is sorted by id and the same for any input order', () => {
    const ids = rows.map((r) => r.id);
    expect(ids).toEqual([...ids].sort());
    const shuffled = buildCatalogue([...foods].reverse(), '2018-04', refuse);
    expect(serialise({ ingredients: shuffled })).toBe(serialise({ ingredients: rows }));
  });
});

describe('the grouping rule on synthetic names', () => {
  const group = (...names: string[]) => groupRows(names.map((n, i) => food(i + 1, n)));
  const parentOf = (all: CatalogueRow[], name: string) =>
    all.find((r) => r.id === all.find((x) => x.name === name)?.parentId)?.name;

  test('a category word is a parent like any other leading segment', () => {
    const all = group('Spices, caraway seed', 'Spices, cumin seed', 'Spices, salt');
    expect(all.map((r) => r.name).sort()).toEqual([
      'Spices',
      'Spices, caraway seed',
      'Spices, cumin seed',
      'Spices, salt',
    ]);
    expect(parentOf(all, 'Spices, cumin seed')).toBe('Spices');
  });
  test('levels arise where two or more names share a longer run', () => {
    const all = group('Milk, a, x', 'Milk, a, y', 'Milk, b, x', 'Milk, b, y', 'Milk, c');
    expect(parentOf(all, 'Milk, a')).toBe('Milk');
    expect(parentOf(all, 'Milk, a, x')).toBe('Milk, a');
    expect(parentOf(all, 'Milk, c')).toBe('Milk');
    expect(all.filter((r) => r['x-group']).map((r) => r.name)).toEqual([
      'Milk',
      'Milk, a',
      'Milk, b',
    ]);
  });
  test('a parent with one child is left out and the child moves up', () => {
    const all = group('Oil, olive, a', 'Oil, olive, b', 'Oil, palm');
    expect(parentOf(all, 'Oil, olive, a')).toBe('Oil, olive');
    expect(parentOf(all, 'Oil, olive')).toBe('Oil');
    const chain = group('Rice, white, long', 'Rice, white, short');
    expect(chain.map((r) => r.name)).toContain('Rice, white');
    expect(chain.map((r) => r.name)).not.toContain('Rice');
  });
  test('segments are compared whole and exactly: "Wheat" is not a parent of "Wheat flour"', () => {
    const all = group(
      'Wheat flour, a',
      'Wheat flour, b',
      'Wheat, hard',
      'Cheese, Brie',
      'Cheese, brie',
    );
    expect(all.map((r) => r.name)).toContain('Wheat flour');
    expect(all.map((r) => r.name)).not.toContain('Wheat');
    expect(all.map((r) => r.name)).toContain('Cheese');
  });
  test('ids come from the name: lower-case ASCII slug, stable, short enough', () => {
    expect(groupIdOf('Wheat flour, white, all-purpose')).toBe(
      'fdc-group-wheat-flour-white-all-purpose',
    );
    expect(groupIdOf('Milk, whole, 3.25% milkfat')).toBe('fdc-group-milk-whole-3-25-milkfat');
    expect(groupIdOf('Crème, brûlée')).toBe('fdc-group-creme-brulee');
    const long = groupIdOf(`Name, ${'segment, '.repeat(20)}end`);
    expect(long.length).toBeLessThanOrEqual(80);
    expect(long).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(groupIdOf(`Name, ${'segment, '.repeat(20)}end`)).toBe(long);
    expect(groupIdOf(`Name, ${'segment, '.repeat(20)}other`)).not.toBe(long);
  });
});

describe("a parent's numbers", () => {
  const withValues = (...values: (number | undefined)[]) =>
    groupRows(values.map((v, i) => food(i + 1, `Flour, kind ${i}`, v))).find((r) => r['x-group']);

  test('every row below has a density and they agree within the tolerance: the median, sourced', () => {
    const parent = must(withValues(0.5, 0.52, 0.51));
    expect(parent.densityGPerMl?.value).toBe(0.51);
    expect(parent.densityGPerMl?.source).toContain('all 3 rows below');
    expect(parent.densityGPerMl?.source).toContain('FDC IDs 1, 2, 3');
    expect(parent.densityGPerMl?.source).toContain(`at most ${AGREEMENT}`);
  });
  test('the median of an even number is the mean of the middle two, to three decimals', () => {
    expect(must(withValues(0.5, 0.51)).densityGPerMl?.value).toBe(0.505);
  });
  test('rows that disagree, or a single value, give the parent no number', () => {
    expect(must(withValues(0.5, 0.6)).densityGPerMl).toBeUndefined();
    expect(must(withValues(0.5, 0.5 * AGREEMENT + 0.001)).densityGPerMl).toBeUndefined();
    expect(must(withValues(0.5, 0.5 * AGREEMENT)).densityGPerMl).toBeDefined();
    expect(must(withValues(0.5, undefined)).densityGPerMl).toBeUndefined();
    // A row without a value would inherit the parent's, so one missing value is enough.
    expect(must(withValues(0.5, 0.51, undefined)).densityGPerMl).toBeUndefined();
  });
  test('the fixture: whole-milk variants and pears agree, the flour has no unit weight', () => {
    expect(byName('Milk, whole, 3.25% milkfat').densityGPerMl?.value).toBe(1.031);
    expect(byName('Pears').unitWeightG?.value).toBe(178);
    expect(byName('Pears').unitWeightG?.source).toContain('FDC IDs 167776, 167778');
    expect(byName('Wheat flour, white, all-purpose').unitWeightG).toBeUndefined();
    expect(byName('Butter').densityGPerMl).toBeUndefined();
  });
  test('a parent takes numbers from the rows below it at every level, not from its children only', () => {
    const all = groupRows([
      food(1, 'Milk, a, x', 1.0),
      food(2, 'Milk, a, y', 1.0),
      food(3, 'Milk, b, x', 1.5),
      food(4, 'Milk, b, y', 1.5),
    ]);
    const byN = (n: string) => must(all.find((r) => r.name === n));
    expect(byN('Milk, a').densityGPerMl?.value).toBe(1);
    expect(byN('Milk, b').densityGPerMl?.value).toBe(1.5);
    expect(byN('Milk').densityGPerMl).toBeUndefined();
  });
});

describe('yields from the refuse percentage', () => {
  test('yield % is 100 minus refuse %, state raw, source naming file, NDB number, FDC id and text', () => {
    const garlic = byId('fdc-169230');
    expect(garlic.yields).toEqual([
      {
        state: 'raw',
        percent: 87,
        source: expect.stringContaining('FOOD_DES.txt, NDB_No 11215 (FDC ID 169230): Refuse 13 %'),
      },
    ]);
    expect(garlic.yields?.[0]?.source).toContain('Ref_desc "Knob and skin"');
    expect(byId('fdc-169975').yields?.[0]?.percent).toBe(80);
  });
  test('a description in parentheses still joins; a zero or missing refuse gives no yield', () => {
    expect(byId('fdc-171688').yields?.[0]?.percent).toBe(90);
    expect(byId('fdc-173410').yields).toBeUndefined();
    expect(byId('fdc-171028').yields).toBeUndefined();
  });
  test('a food whose description differs from SR28 gets no yield', () => {
    const garlic = must(foods.find((f) => f.fdcId === 169230));
    expect(deriveYields({ ...garlic, description: 'Garlic, cooked' }, refuse)).toBeUndefined();
    expect(deriveYields({ ...garlic, ndbNumber: 99999 }, refuse)).toBeUndefined();
    expect(deriveYields(garlic, new Map())).toBeUndefined();
  });
  test('parents carry no yields', () => {
    for (const row of rows.filter((r) => r['x-group'])) expect(row.yields).toBeUndefined();
  });
});

describe('the shipped file is a valid ingredient tree', () => {
  const shipped = JSON.parse(text('../data/ingredient-catalogue.json')) as {
    ingredients: CatalogueRow[];
  };
  const all = shipped.ingredients;
  const ids = new Map(all.map((r) => [r.id, r]));

  test('validateModel finds no cycle and no unknown parent', () => {
    const result = validateModel({ ingredients: all });
    expect(result.findings.filter((f) => ['cycle', 'unknown-parent'].includes(f.code))).toEqual([]);
    expect(result.ok).toBe(true);
  });
  test('buildTree accepts it and every parent link leads to a root', () => {
    const tree = buildTree(
      all.map((r) => ({
        id: r.id,
        name: r.name,
        level: 'type' as const,
        ...(r.parentId === undefined ? {} : { parentId: r.parentId }),
      })),
    );
    expect(tree.ok).toBe(true);
    for (const row of all) {
      let steps = 0;
      for (let at: CatalogueRow | undefined = row; at?.parentId !== undefined; steps++) {
        at = ids.get(at.parentId);
        expect(steps).toBeLessThan(10);
      }
    }
  });
  test('a parent has at least two children and rows below it, and every row is a name extension', () => {
    const children = new Map<string, CatalogueRow[]>();
    for (const row of all) {
      if (row.parentId === undefined) continue;
      children.set(row.parentId, [...(children.get(row.parentId) ?? []), row]);
      const parent = must(ids.get(row.parentId));
      expect(row.name.startsWith(`${parent.name}, `), `${row.name} under ${parent.name}`).toBe(
        true,
      );
    }
    for (const row of all.filter((r) => r['x-group'] !== undefined)) {
      expect(children.get(row.id)?.length ?? 0, row.name).toBeGreaterThanOrEqual(2);
      expect(row.id).toBe(groupIdOf(row.name));
    }
  });
  test('every parent number follows the rule: agreeing rows below, more than one, sourced by FDC ids', () => {
    const below = (id: string): CatalogueRow[] =>
      all.filter((r) => r.parentId === id).flatMap((r) => [r, ...below(r.id)]);
    for (const parent of all.filter((r) => r['x-group'] !== undefined)) {
      const rowsBelow = below(parent.id).filter((r) => r['x-fdc'] !== undefined);
      expect(parent['x-group']?.rows, parent.name).toBe(rowsBelow.length);
      for (const field of ['densityGPerMl', 'unitWeightG'] as const) {
        const have = rowsBelow.filter((r) => r[field] !== undefined);
        const values = have.map((r) => must(r[field]).value);
        const agree =
          have.length >= 2 &&
          have.length === rowsBelow.length &&
          Math.max(...values) / Math.min(...values) <= AGREEMENT;
        const number = parent[field];
        if (number === undefined) continue;
        expect(agree, `${parent.name} ${field}`).toBe(true);
        expect(number.value).toBeGreaterThanOrEqual(Math.min(...values));
        expect(number.value).toBeLessThanOrEqual(Math.max(...values));
        for (const row of have) expect(number.source).toContain(String(row['x-fdc']?.id));
      }
    }
  });
  test('yields are 100 minus the refuse percentage named in their source', () => {
    const withYields = all.filter((r) => r.yields !== undefined);
    expect(withYields.length).toBeGreaterThan(100);
    for (const row of withYields) {
      const entry = must(row.yields?.[0]);
      const percent = Number(/Refuse (\d+) %/.exec(entry.source)?.[1]);
      expect(entry.percent, row.id).toBe(100 - percent);
      expect(entry.source, row.id).toContain(`FDC ID ${row['x-fdc']?.id}`);
    }
  });
});
