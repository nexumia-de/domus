// The usual member of a parent (docs/ingredient-catalogue.md#usual-member): the generator's rule on
// synthetic rows, and the shipped file against usual.json. The choice of member is a judgement of
// the project; what is tested is that it is applied as stated, not that it is the right one.
import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { USUAL, type CatalogueRow } from '../../../tools/catalogue/build.mjs';
import { applyUsual } from '../../../tools/catalogue/usual.mjs';

const shipped = (
  JSON.parse(
    readFileSync(new URL('../data/ingredient-catalogue.json', import.meta.url), 'utf8'),
  ) as { ingredients: CatalogueRow[] }
).ingredients;
const byId = new Map(shipped.map((r) => [r.id, r]));

const row = (id: number, name: string, parentId: string, kcal: number): CatalogueRow => ({
  id: `fdc-${id}`,
  name,
  parentId,
  'x-nutrition': { per100g: { kcal } },
  'x-fdc': { id, description: `${name}, raw` },
});
const group: CatalogueRow = { id: 'fdc-group-egg', name: 'Egg', 'x-group': { rows: 2 } };
const rows = [
  group,
  row(1, 'Egg, fresh', 'fdc-group-egg', 143),
  row(2, 'Egg, dried', 'fdc-group-egg', 592),
];

describe('the rule', () => {
  test('a named parent gains x-group.usual with the member, the reason and the range', () => {
    const out = applyUsual(rows, { groups: [{ group: 'fdc-group-egg', usual: 1, why: 'fresh' }] });
    expect(out[0]?.['x-group']).toEqual({
      rows: 2,
      usual: {
        id: 'fdc-1',
        source:
          'Judgement of the project, tools/catalogue/usual.json (2026-11-21): FDC ID 1 (Egg, fresh, raw): fresh. The 2 food rows below range from 143 to 592 kcal per 100 g.',
      },
    });
    // Nothing else changes: the rows and every other field stay as they were.
    expect(out.slice(1)).toEqual(rows.slice(1));
  });
  test('a member that is not below the parent, or a parent that is none, is refused', () => {
    const other = row(3, 'Butter', 'fdc-group-butter', 717);
    expect(() =>
      applyUsual([...rows, other], { groups: [{ group: 'fdc-group-egg', usual: 3, why: 'x' }] }),
    ).toThrow(/not below/);
    expect(() => applyUsual(rows, { groups: [{ group: 'fdc-1', usual: 1, why: 'x' }] })).toThrow(
      /not a parent/,
    );
  });
});

describe('the shipped file', () => {
  test('every parent of usual.json carries its usual member, and no other parent has one', () => {
    const withUsual = shipped.filter((r) => r['x-group']?.usual !== undefined).map((r) => r.id);
    expect(withUsual.sort()).toEqual(USUAL.groups.map((g) => g.group).sort());
    for (const { group: id, usual } of USUAL.groups) {
      const member = byId.get(`fdc-${usual}`);
      expect(member?.['x-fdc']?.id, id).toBe(usual);
      expect(byId.get(id)?.['x-group']?.usual?.id).toBe(`fdc-${usual}`);
      expect(byId.get(id)?.['x-group']?.usual?.source).toMatch(/^Judgement of the project/);
      // The member is below the parent.
      let at = member?.parentId;
      while (at !== undefined && at !== id) at = byId.get(at)?.parentId;
      expect(at, id).toBe(id);
    }
  });
  test('a usual member adds no number to the parent row itself', () => {
    // The parent's own density, unit weight and nutrition are only those the agreement rule gives;
    // the usual member's are read through x-group.usual, so they never pass to the other rows.
    const egg = byId.get('fdc-group-egg-whole');
    expect(egg?.unitWeightG).toBeUndefined();
    expect(egg?.['x-nutrition']).toBeUndefined();
  });
});
