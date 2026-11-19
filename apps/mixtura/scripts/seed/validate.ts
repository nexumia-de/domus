// The converter's output must validate against the JSON Schemas of the
// engine package and be consistent: a tree without cycles, specs that
// resolve to ingredients. Any problem throws.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import { buildTree, type Ingredient } from '../../packages/engine/src/index';
import type { SeedSpec } from './specs';

export function validateSeed(
  schemasDir: string,
  ingredients: readonly Ingredient[],
  specs: readonly SeedSpec[],
): void {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  for (const f of readdirSync(schemasDir).filter((n) => n.endsWith('.schema.json'))) {
    ajv.addSchema(JSON.parse(readFileSync(join(schemasDir, f), 'utf8')));
  }
  const problems: string[] = [];
  const check = (urn: string, items: readonly { id: string }[]) => {
    const fn = ajv.getSchema(urn);
    if (!fn) throw new Error(`schema ${urn} not found`);
    for (const item of items) {
      if (!fn(item)) problems.push(`${item.id}: ${ajv.errorsText(fn.errors)}`);
    }
  };
  check('urn:mixtura:ingredient', ingredients);
  check('urn:mixtura:spec', specs);
  const built = buildTree(ingredients);
  if (!built.ok) problems.push(...built.errors.map((e) => e.message));
  const ids = new Set(ingredients.map((i) => i.id));
  const specIds = new Set(specs.map((s) => s.id));
  for (const s of specs) {
    if (s.parentId !== undefined && !specIds.has(s.parentId))
      problems.push(`${s.id}: parent ${s.parentId} missing`);
    for (const l of s.lines) {
      for (const id of [l.ingredientId, ...(l.substitutes ?? []).map((x) => x.ingredientId)]) {
        if (!ids.has(id)) problems.push(`${s.id}: ingredient ${id} missing`);
      }
    }
  }
  if (problems.length > 0) {
    throw new Error(`seed output is invalid:\n${problems.slice(0, 20).join('\n')}`);
  }
}
