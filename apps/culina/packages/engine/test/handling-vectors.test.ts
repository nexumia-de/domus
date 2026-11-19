// Runs every vector in vectors/handling against the engine (docs/vectors.md): handling rule
// validation and which rules show for the ingredients of a dish.
import { describe, expect, test } from 'vitest';
import { handlingRules, validateHandlingRule, validateHandlingRules } from '../src/index';
import type { HandlingRule, TreeNode } from '../src/index';
import { expectValidation } from './content-vectors';
import { expectError, loadVectors } from './vector-files';
import type { Vector } from './vector-files';

const ids = (list: unknown): ReadonlySet<string> | undefined =>
  list === undefined ? undefined : new Set(list as string[]);

function context(i: Vector['inputs']): {
  techniqueIds?: ReadonlySet<string>;
  ingredientIds?: ReadonlySet<string>;
} {
  const out: { techniqueIds?: ReadonlySet<string>; ingredientIds?: ReadonlySet<string> } = {};
  const techniqueIds = ids(i.technique_ids);
  const ingredientIds = ids(i.ingredient_ids);
  if (techniqueIds !== undefined) out.techniqueIds = techniqueIds;
  if (ingredientIds !== undefined) out.ingredientIds = ingredientIds;
  return out;
}

function show(vector: Vector): void {
  const i = vector.inputs as unknown as {
    ingredients: string[];
    rules: HandlingRule[];
    tree: TreeNode[];
    learned: string[];
    used?: string[];
  };
  const options = i.used === undefined ? {} : { used: new Set(i.used) };
  const result = handlingRules(i.ingredients, i.rules, i.tree, new Set(i.learned), options);
  if (vector.error_code !== undefined) return expectError(result, vector);
  if (!result.ok) throw new Error(`${vector.id}: ${result.error.code}`);
  const e = vector.expected as { rules: { rule: string; ingredient: string }[] };
  expect(result.rules.map((r) => ({ rule: r.rule.id, ingredient: r.ingredient }))).toEqual(e.rules);
}

describe('handling vectors', () => {
  for (const vector of loadVectors('handling')) {
    test(vector.id, () => {
      const i = vector.inputs;
      switch (i.kind) {
        case 'handling_validate':
          return expectValidation(validateHandlingRule(i.rule as HandlingRule, context(i)), vector);
        case 'handling_list_validate':
          return expectValidation(
            validateHandlingRules(i.rules as HandlingRule[], context(i)),
            vector,
          );
        case 'handling_show':
          return show(vector);
        default:
          throw new Error(`${vector.id}: unknown kind ${i.kind}`);
      }
    });
  }
});
