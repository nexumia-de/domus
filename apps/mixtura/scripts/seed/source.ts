// Reads a local checkout of the Bar Assistant data (docs/seed-data.md). The
// checkout is untrusted data: it is only parsed as JSON, never executed.
// A record with a field the converter does not know fails the run.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface SourceSubstitute {
  _id: string;
  name: string;
  amount: number | null;
  units: string | null;
  amount_max: number | null;
}

export interface SourceLine {
  _id: string;
  name: string;
  sort: number;
  amount: number;
  units: string;
  optional: boolean;
  is_specified: boolean;
  amount_max: number | null;
  note: string | null;
  substitutes: SourceSubstitute[];
}

export interface SourceCocktail {
  _id: string;
  name: string;
  tags: string[];
  glass: string | null;
  method: string | null;
  parent_cocktail_id: string | null;
  ingredients: SourceLine[];
}

export interface SourceIngredient {
  _id: string;
  _parent_id: string | null;
  name: string;
  strength: number;
  sugar_g_per_ml: number;
  ingredient_parts: unknown[];
}

export interface SourceMethod {
  name: string;
  dilution_percentage: number;
}

export interface SourceData {
  cocktails: SourceCocktail[];
  ingredients: SourceIngredient[];
  glasses: string[];
  methods: SourceMethod[];
}

const COCKTAIL_FIELDS = [
  '_id',
  'name',
  'instructions',
  'created_at',
  'updated_at',
  'description',
  'source',
  'garnish',
  'abv',
  'tags',
  'glass',
  'method',
  'utensils',
  'parent_cocktail_id',
  'year',
  'author',
  'images',
  'ingredients',
];
const LINE_FIELDS = [
  '_id',
  'name',
  'sort',
  'amount',
  'units',
  'optional',
  'is_specified',
  'amount_max',
  'note',
  'substitutes',
];
const SUBSTITUTE_FIELDS = ['_id', 'name', 'amount', 'units', 'amount_max'];
const INGREDIENT_FIELDS = [
  '_id',
  '_parent_id',
  'name',
  'strength',
  'description',
  'origin',
  'color',
  'category',
  'created_at',
  'updated_at',
  'images',
  'ingredient_parts',
  'prices',
  'calculator_id',
  'sugar_g_per_ml',
  'acidity',
  'distillery',
  'units',
];

type Rec = Record<string, unknown>;

function noUnknown(where: string, rec: Rec, known: readonly string[]): void {
  for (const key of Object.keys(rec)) {
    if (!known.includes(key)) throw new Error(`${where}: unknown field "${key}"`);
  }
}

const readJson = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8'));

function folders(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}

function record(path: string, id: string, known: readonly string[]): Rec {
  const rec = readJson(path) as Rec;
  noUnknown(path, rec, known);
  if (rec._id !== id)
    throw new Error(`${path}: _id "${String(rec._id)}" differs from the folder name`);
  return rec;
}

/** `root` is the checkout (the folder that holds `data/`). */
export function readSource(root: string): SourceData {
  const data = join(root, 'data');
  const ingredients = folders(join(data, 'ingredients')).map((id) => {
    const r = record(join(data, 'ingredients', id, 'data.json'), id, INGREDIENT_FIELDS);
    for (const part of r.ingredient_parts as Rec[])
      noUnknown(`${id} part`, part, INGREDIENT_FIELDS);
    return r as unknown as SourceIngredient;
  });
  const cocktails = folders(join(data, 'cocktails')).map((id) => {
    const r = record(join(data, 'cocktails', id, 'data.json'), id, COCKTAIL_FIELDS);
    for (const line of r.ingredients as Rec[]) {
      noUnknown(`${id} line`, line, LINE_FIELDS);
      for (const s of line.substitutes as Rec[])
        noUnknown(`${id} substitute`, s, SUBSTITUTE_FIELDS);
    }
    return r as unknown as SourceCocktail;
  });
  const glasses = (readJson(join(data, 'base_glasses.json')) as { name: string }[]).map(
    (g) => g.name,
  );
  const methods = readJson(join(data, 'base_methods.json')) as SourceMethod[];
  return { cocktails, ingredients, glasses, methods };
}
