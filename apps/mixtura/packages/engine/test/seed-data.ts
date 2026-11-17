// Loads the committed seed files and the curated file for the tests.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildTree, type Ingredient } from '../src/index';

export const engineRoot = fileURLToPath(new URL('../', import.meta.url));
export const read = <T = any>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T; // eslint-disable-line @typescript-eslint/no-explicit-any
export const seedDir = `${engineRoot}data/seed/`;
export const seed = {
  ingredients: read<{ attribution: unknown; ingredients: Ingredient[] }>(
    `${seedDir}ingredients.json`,
  ),
  specs: read<{ attribution: unknown; specs: SeedSpec[] }>(`${seedDir}specs.json`),
  vocabulary: read(`${seedDir}vocabulary.json`),
};
export const curated = read(`${engineRoot}data/ingredient-properties.json`);

export interface SeedSpec {
  id: string;
  parentId?: string;
  templateId?: string;
  method?: string;
  glass?: string;
  lines: {
    ingredientId: string;
    amount: number;
    unit: string;
    optional?: boolean;
    substitutes?: { ingredientId: string }[];
  }[];
}

export function seedTree(list: readonly Ingredient[] = seed.ingredients.ingredients) {
  const built = buildTree(list);
  if (!built.ok) throw new Error(built.errors.map((e) => e.message).join('; '));
  return built.tree;
}
