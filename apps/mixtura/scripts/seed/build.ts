// Source data to the seed files and a report. Pure apart from reading the
// curated file and the source through the callers: no network, no clock.
import {
  buildTree,
  computeBalance,
  resolveProperty,
  type Ingredient,
  type IngredientTree,
} from '../../packages/engine/src/index';
import { attributionOf, sourceOf, type Pin } from './attribution';
import { place } from './levels';
import { deriveProperties } from './properties';
import { applyRoles, type RoleEntry } from './roles';
import type { SourceData } from './source';
import { convertCocktail, matchLines, slug, templateFor, type SeedSpec } from './specs';
import { serializeFile } from './stable-json';
import { substitutionClasses } from './substitution';
import { validateSeed } from './validate';

export interface Curated {
  roles: Record<string, RoleEntry>;
}

export interface Report {
  pin: Pin;
  counts: Record<string, number>;
  skipped: { id: string; reasons: string[] }[];
  skippedByReason: Record<string, number>;
  reparented: { id: string; was: string; now?: string }[];
  unclassified: Record<string, string>;
  abvOmitted: string[];
  sugarOmitted: string[];
  templates: Record<string, number>;
  balance: Record<string, number>;
  /** Share of lines whose ingredient lacks the property, per property, in percent. */
  missingLineShare: Record<string, number>;
}

export interface SeedBuild {
  files: Record<string, string>;
  report: Report;
  ingredients: Ingredient[];
  specs: SeedSpec[];
  tree: IngredientTree;
}

const byId = <T extends { id: string }>(a: T, b: T) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

function buildIngredients(src: SourceData, pin: Pin, curated: Curated) {
  const placement = place(src.ingredients);
  const parentOf = (id: string) => placement.get(id)?.parentId;
  const ancestorsOf = (id: string): string[] => {
    const out: string[] = [];
    for (let c: string | undefined = id; c !== undefined; c = parentOf(c)) out.push(c);
    return out;
  };
  const ids = src.ingredients.map((i) => i._id);
  const roles = applyRoles(ids, parentOf, curated.roles);
  const classes = substitutionClasses(src.cocktails);
  const abvOmitted: string[] = [];
  const sugarOmitted: string[] = [];
  const list: Ingredient[] = src.ingredients.map((i) => {
    const p = placement.get(i._id) as NonNullable<ReturnType<typeof placement.get>>;
    const derived = deriveProperties(i, ancestorsOf(i._id));
    if (derived.abvOmitted) abvOmitted.push(i._id);
    if (derived.sugarOmitted) sugarOmitted.push(i._id);
    const role = roles.own.get(i._id);
    const substitutionClass = classes.get(i._id);
    const assumed = [
      ...(role ? ['role'] : []),
      ...(substitutionClass ? ['substitutionClass'] : []),
    ];
    return {
      id: i._id,
      name: i.name,
      level: p.level,
      ...(p.parentId ? { parentId: p.parentId } : {}),
      ...(role ? { role } : {}),
      ...derived.props,
      ...(substitutionClass ? { substitutionClass } : {}),
      ...(assumed.length > 0 ? { assumed } : {}),
      source: sourceOf(pin),
    } as Ingredient;
  });
  list.sort(byId);
  const reparented = [...placement]
    .flatMap(([id, p]) =>
      p.droppedParentId ? [{ id, was: p.droppedParentId, now: p.parentId }] : [],
    )
    .sort((a, b) => (a.id < b.id ? -1 : 1));
  return {
    list,
    roles,
    reparented,
    abvOmitted: abvOmitted.sort(),
    sugarOmitted: sugarOmitted.sort(),
    classes,
  };
}

const count = (map: Record<string, number>, key: string) => {
  map[key] = (map[key] ?? 0) + 1;
};
const pct = (n: number, d: number) => (d === 0 ? 0 : Math.round((1000 * n) / d) / 10);

export function buildSeed(
  src: SourceData,
  pin: Pin,
  curated: Curated,
  schemasDir: string,
  licenceFile?: string,
): SeedBuild {
  const ing = buildIngredients(src, pin, curated);
  const built = buildTree(ing.list);
  if (!built.ok) throw new Error(built.errors.map((e) => e.message).join('\n'));
  const tree = built.tree;
  const ingredientIds = new Set(ing.list.map((i) => i.id));

  const specs: SeedSpec[] = [];
  const skipped: Report['skipped'] = [];
  const skippedByReason: Record<string, number> = {};
  for (const c of src.cocktails) {
    const r = convertCocktail(c, ingredientIds, pin);
    if (r.ok) specs.push(r.spec);
    else {
      skipped.push({ id: c._id, reasons: r.reasons });
      for (const reason of r.reasons) count(skippedByReason, reason);
    }
  }
  const specIds = new Set(specs.map((s) => s.id));
  for (const c of src.cocktails) {
    const spec = specs.find((s) => s.id === c._id);
    if (spec && c.parent_cocktail_id && specIds.has(c.parent_cocktail_id))
      spec.parentId = c.parent_cocktail_id;
  }
  const methodIds = new Set(src.methods.map((m) => slug(m.name)));
  const glassIds = new Set(src.glasses.map((g) => slug(g)));
  const templates: Record<string, number> = {};
  const balance: Record<string, number> = {};
  const lineMissing: Record<string, number> = { role: 0, abv: 0, sugar: 0, acid: 0 };
  let lineTotal = 0;
  for (const spec of specs) {
    if (spec.method && !methodIds.has(spec.method))
      throw new Error(`${spec.id}: unknown method ${spec.method}`);
    if (spec.glass && !glassIds.has(spec.glass))
      throw new Error(`${spec.id}: unknown glass ${spec.glass}`);
    const template = templateFor(tree, spec);
    if (template) spec.templateId = template;
    count(templates, template ?? 'none');
    const lines = matchLines(spec);
    for (const l of lines) {
      lineTotal++;
      for (const p of ['role', 'abv', 'sugar', 'acid'] as const) {
        if (resolveProperty(tree, l.ingredientId, p).value === undefined)
          lineMissing[p] = (lineMissing[p] ?? 0) + 1;
      }
    }
    const result = computeBalance(tree, {
      ...(spec.method ? { method: spec.method } : {}),
      lines: lines.map((l) => ({
        ingredientId: l.ingredientId,
        amount: l.amountMax === undefined ? l.amount : (l.amount + l.amountMax) / 2,
        unit: l.unit,
      })),
    });
    if (!result.ok) {
      count(balance, 'error');
      continue;
    }
    const b = result.value;
    if (!b.after) count(balance, 'no dilution (no or unknown method)');
    if (b.excluded.length > 0) count(balance, 'specs with a line not counted in the figures');
    for (const e of b.excluded) count(balance, `lines not counted: ${e.reason}`);
    const f = b.after ?? b.before;
    for (const k of ['abvPct', 'sugarPer100Ml', 'acidPct'] as const) {
      if ((f as unknown as Record<string, { known: boolean }>)[k]?.known)
        count(balance, `${k} known`);
    }
    const all = ['abvPct', 'sugarPer100Ml', 'acidPct'].every(
      (k) => (f as unknown as Record<string, { known: boolean }>)[k]?.known,
    );
    if (all && b.after) count(balance, 'complete');
  }
  specs.sort(byId);

  const attribution = attributionOf(pin);
  const files: Record<string, string> = {
    'ingredients.json': serializeFile('ingredients', attribution, ing.list),
    'specs.json': serializeFile('specs', attribution, specs),
    'vocabulary.json': `{\n"attribution":${JSON.stringify(attribution)},\n"glasses":${JSON.stringify(
      [...glassIds].sort().map((id) => ({ id, name: src.glasses.find((g) => slug(g) === id) })),
    )},\n"methods":${JSON.stringify(
      [...methodIds]
        .sort()
        .map((id) => ({ id, name: src.methods.find((m) => slug(m.name) === id)?.name })),
    )}\n}\n`,
  };
  if (licenceFile !== undefined) files['LICENSE-bar-assistant.txt'] = licenceFile;
  validateSeed(schemasDir, ing.list, specs);

  const report: Report = {
    pin,
    counts: {
      ingredients: ing.list.length,
      specs: specs.length,
      specsSkipped: skipped.length,
      cocktailsRead: src.cocktails.length,
      ingredientsWithRole: ing.roles.own.size,
      ingredientsUnclassified: ing.roles.unclassified.size,
      substitutionClassMembers: ing.classes.size,
      substitutionClasses: new Set(ing.classes.values()).size,
      withPreparedParts: src.ingredients.filter((i) => i.ingredient_parts.length > 0).length,
      lines: lineTotal,
    },
    skipped: skipped.sort((a, b) => (a.id < b.id ? -1 : 1)),
    skippedByReason,
    reparented: ing.reparented,
    unclassified: Object.fromEntries([...ing.roles.unclassified].sort()),
    abvOmitted: ing.abvOmitted,
    sugarOmitted: ing.sugarOmitted,
    templates,
    balance,
    missingLineShare: Object.fromEntries(
      Object.entries(lineMissing).map(([k, v]) => [k, pct(v, lineTotal)]),
    ),
  };
  return { files, report, ingredients: ing.list, specs, tree };
}
