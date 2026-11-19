// The shipped substitutes against the catalogue, and the finder with them: the ids of every
// substitute are in the catalogue, and a real one lets the finder count a line as covered.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { SUBSTITUTES, makeable, substituteEffects, validateSubstitutes } from '@culina/engine';
import type { MakeableInput } from '@culina/engine';

const catalogue = JSON.parse(
  readFileSync(
    fileURLToPath(new URL('../data/ingredient-catalogue.json', import.meta.url)),
    'utf8',
  ),
) as { ingredients: { id: string; parentId?: string }[] };
const ids = new Set(catalogue.ingredients.map((i) => i.id));

describe('the shipped substitutes', () => {
  test('there are some, and every from and to is a catalogue ingredient or group', () => {
    expect(SUBSTITUTES.length).toBeGreaterThan(0);
    const result = validateSubstitutes(SUBSTITUTES, { ingredientIds: ids });
    expect(result, JSON.stringify(result)).toEqual({ ok: true });
  });

  test('flour to cornstarch applies to a flour of the catalogue, through its groups', () => {
    const found = substituteEffects('fdc-168894', catalogue.ingredients, SUBSTITUTES);
    expect(found.map((s) => s.id)).toContain('flour-to-cornstarch');
  });
});

describe('the finder with the shipped substitutes', () => {
  const input = (stock: string): MakeableInput => ({
    ingredients: catalogue.ingredients,
    components: [
      {
        id: 'sauce',
        name: 'Sauce',
        lines: [
          { ref: { kind: 'ingredient', id: 'fdc-168894' }, amount: { value: 100, unit: 'g' } },
        ],
        version: { family: 'sauce', date: '2026-11-01' },
      },
    ],
    stock: [{ id: 's1', ref: { kind: 'ingredient', id: stock }, amount: { value: 60, unit: 'g' } }],
    substitutes: SUBSTITUTES,
    today: '2026-11-19',
  });

  test('a line of flour is covered by half the amount of cornstarch, and the report says which', () => {
    const result = makeable(input('fdc-169698'));
    if (!result.ok) throw new Error(result.error.code);
    expect(result.candidates[0]).toMatchObject({
      complete: true,
      substitutions: [
        {
          asked: 'fdc-168894',
          substitute: 'fdc-169698',
          effect: 'flour-to-cornstarch',
          factor: 0.5,
        },
      ],
    });
  });

  test('without the substitutes the same stock does not cover the line', () => {
    const bare: MakeableInput = { ...input('fdc-169698'), options: { maxMissing: 1 } };
    delete bare.substitutes;
    const result = makeable(bare);
    if (!result.ok) throw new Error(result.error.code);
    // No line of the sauce is covered, so it is not a candidate at all.
    expect(result.candidates).toEqual([]);
  });
});
