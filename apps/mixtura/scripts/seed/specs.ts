// Cocktail records to Mixtura specs (docs/seed-data.md, Mapping, Spec).
// Only names, tags, ingredients, amounts, units, method and glass are
// taken over: instructions, descriptions, garnish text, line notes, images
// and source links are not shipped (owner decision, docs/seed-data.md).
import {
  matchSpec,
  ROOT_TEMPLATES,
  type IngredientTree,
  type MatchLine,
} from '../../packages/engine/src/index';
import type { Pin } from './attribution';
import { sourceOf } from './attribution';
import type { SourceCocktail } from './source';
import { mapUnit } from './units';

export interface SeedLine {
  ingredientId: string;
  amount: number;
  amountMax?: number;
  unit: string;
  optional?: boolean;
  substitutes?: { ingredientId: string; amount?: number; unit?: string }[];
}

export interface SeedSpec {
  id: string;
  lineageId: string;
  version: 1;
  parentId?: string;
  name: string;
  templateId?: string;
  lines: SeedLine[];
  method?: string;
  glass?: string;
  tags?: string[];
  status: 'draft';
  source: ReturnType<typeof sourceOf>;
}

export const slug = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export type Converted = { ok: true; spec: SeedSpec } | { ok: false; reasons: string[] };

export function convertCocktail(
  c: SourceCocktail,
  ingredientIds: ReadonlySet<string>,
  pin: Pin,
): Converted {
  const reasons: string[] = [];
  const lines: SeedLine[] = [];
  const ordered = c.ingredients
    .map((l, i) => ({ l, i }))
    .sort((a, b) => a.l.sort - b.l.sort || a.i - b.i);
  for (const { l } of ordered) {
    if (!ingredientIds.has(l._id)) throw new Error(`${c._id}: ingredient ${l._id} does not exist`);
    const unit = mapUnit(l.units, l._id);
    if (!unit.ok) reasons.push(unit.reason);
    if (!(l.amount > 0)) reasons.push('amount of 0');
    if (l.amount_max !== null && !(l.amount_max > l.amount))
      reasons.push('amount range not above the amount');
    if (!unit.ok || !(l.amount > 0)) continue;
    const line: SeedLine = { ingredientId: l._id, amount: l.amount, unit: unit.unit };
    if (l.amount_max !== null && l.amount_max > l.amount) line.amountMax = l.amount_max;
    if (l.optional) line.optional = true;
    const subs = l.substitutes.flatMap((s) => {
      if (!ingredientIds.has(s._id))
        throw new Error(`${c._id}: substitute ${s._id} does not exist`);
      if (s.amount === null) return [{ ingredientId: s._id }];
      const u = s.units === null ? undefined : mapUnit(s.units, s._id);
      return u?.ok && s.amount > 0
        ? [{ ingredientId: s._id, amount: s.amount, unit: u.unit }]
        : [{ ingredientId: s._id }];
    });
    if (subs.length > 0) line.substitutes = subs;
    lines.push(line);
  }
  if (lines.length === 0 && reasons.length === 0) reasons.push('no lines');
  if (reasons.length > 0) return { ok: false, reasons: [...new Set(reasons)] };
  const tags = [...new Set(c.tags)].sort();
  return {
    ok: true,
    spec: {
      id: c._id,
      lineageId: c._id,
      version: 1,
      name: c.name,
      lines,
      ...(c.method ? { method: slug(c.method) } : {}),
      ...(c.glass ? { glass: slug(c.glass) } : {}),
      ...(tags.length > 0 ? { tags } : {}),
      status: 'draft',
      source: sourceOf(pin),
    },
  };
}

/** Optional lines do not take part: the drink works without them. */
export const matchLines = (spec: SeedSpec): MatchLine[] =>
  spec.lines
    .filter((l) => !l.optional)
    .map((l) => ({
      ingredientId: l.ingredientId,
      amount: l.amount,
      ...(l.amountMax !== undefined ? { amountMax: l.amountMax } : {}),
      unit: l.unit,
    }));

/** The suggested template, or undefined when no template fits. */
export function templateFor(tree: IngredientTree, spec: SeedSpec): string | undefined {
  const result = matchSpec(tree, ROOT_TEMPLATES, { lines: matchLines(spec) });
  return result.chosen?.templateId;
}
