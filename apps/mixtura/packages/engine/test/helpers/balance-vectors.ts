// Loads every balance vector as a ready-to-run case: the five self-contained
// vectors in vectors/ are adapted to a tree and a spec, the ones in
// vectors/balance/ are read as they are.
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  buildTree,
  type BalanceOptions,
  type BalanceSpec,
  type BalanceResult,
  type Figure,
  type Ingredient,
  type IngredientTree,
  type PreparedSpec,
} from '../../src/index';

const root = fileURLToPath(new URL('../../vectors/', import.meta.url));
const read = (path: string) => JSON.parse(readFileSync(`${root}${path}`, 'utf8'));

export type Expected = Record<string, number | null | { unknown: string[] }>;

export interface Flags {
  diluted?: boolean;
  dilution_unavailable?: string;
  estimated?: boolean;
  estimated_ids?: string[];
  excluded_ids?: string[];
  dilution?: Record<string, unknown>;
}

export interface BalanceCase {
  id: string;
  file: string;
  tree: IngredientTree;
  spec: BalanceSpec;
  options: BalanceOptions;
  figures: Expected;
  flags: Flags;
  tolerance: number;
}

export const newFiles = readdirSync(`${root}balance`).filter(
  (f) => f.endsWith('.json') && !f.includes('schema'),
);
export const legacyFiles = readdirSync(root).filter((f) => /^balance-.*\.json$/.test(f));

function treeOf(ingredients: Ingredient[]): IngredientTree {
  const built = buildTree(ingredients);
  if (!built.ok) throw new Error(built.errors.map((e) => e.message).join('; '));
  return built.tree;
}

function camelTable(table: Record<string, unknown>[]) {
  return table.map((m) => ({
    id: m.id as string,
    fractionLow: m.fraction_low as number,
    fractionDefault: m.fraction_default as number,
    fractionHigh: m.fraction_high as number,
    evidence: m.evidence as 'derived' | 'secondary' | 'assumption',
  }));
}

function fromNew(file: string): BalanceCase {
  const v = read(`balance/${file}`);
  const o = v.options ?? {};
  const options: BalanceOptions = {
    specs: new Map(Object.entries((v.specs ?? {}) as Record<string, PreparedSpec>)),
    unitOverrides: o.unit_overrides,
    dilution: o.dilution && {
      fraction: o.dilution.fraction,
      bound: o.dilution.bound,
      table: o.dilution.table && camelTable(o.dilution.table),
    },
  };
  return {
    id: v.id,
    file,
    tree: treeOf(v.ingredients),
    spec: v.spec,
    options,
    figures: v.expected.figures,
    flags: v.expected.flags,
    tolerance: v.tolerance,
  };
}

function fromLegacy(file: string): BalanceCase {
  const v = read(file);
  const ingredients: Ingredient[] = [];
  const lines: BalanceSpec['lines'][number][] = [];
  for (const [i, l] of (v.inputs.lines as Record<string, number | string>[]).entries()) {
    const id = `line-${i}`;
    const solid = l.sugar_g !== undefined && l.ml === 0;
    ingredients.push({
      id,
      name: String(l.name),
      level: 'product',
      abv: l.abv_pct as number,
      sugar: solid ? 100 : (l.sugar_g_per_100ml as number),
      acid: l.acid_pct as number,
    });
    lines.push(
      solid
        ? { ingredientId: id, amount: l.sugar_g as number, unit: 'g' }
        : { ingredientId: id, amount: l.ml as number, unit: 'ml' },
    );
  }
  return {
    id: v.id,
    file,
    tree: treeOf(ingredients),
    spec: { method: v.inputs.method, lines },
    options: { dilution: { fraction: v.inputs.dilution_fraction } },
    figures: v.expected,
    flags: {},
    tolerance: v.tolerance,
  };
}

export const cases: BalanceCase[] = [...legacyFiles.map(fromLegacy), ...newFiles.map(fromNew)];

const fig = (
  f: Figure<number | null> | undefined,
): number | null | { unknown: string[] } | undefined =>
  f === undefined ? undefined : f.known ? f.value : { unknown: f.missingIds };

/** The result under the names the vector files use. */
export function flatten(r: Extract<BalanceResult, { ok: true }>): Expected {
  const { before, after } = r.value;
  const all = {
    volume_before_ml: before.volumeMl,
    ethanol_ml: fig(before.ethanolMl),
    abv_before_pct: fig(before.abvPct),
    sugar_g: fig(before.sugarG),
    acid_g: fig(before.acidG),
    sugar_before_g_per_100ml: fig(before.sugarPer100Ml),
    acid_before_pct: fig(before.acidPct),
    volume_after_ml: after?.volumeMl,
    water_ml: after?.waterMl,
    abv_after_pct: fig(after?.abvPct),
    sugar_g_per_100ml: fig(after?.sugarPer100Ml),
    acid_pct: fig(after?.acidPct),
    sugar_acid_ratio: fig(r.value.sugarAcidRatio),
    uk_units: fig(r.value.ukUnits),
  };
  return Object.fromEntries(Object.entries(all).filter(([, v]) => v !== undefined)) as Expected;
}
