// The browse model: the catalog read into plain, synchronous structures the
// screens draw from. It is built once per catalog (load.ts) and holds no
// balance figures at first: those are computed per drink the first time a
// row, a filter or the spec screen asks (docs/screens-browse.md#drinks-list).

import {
  ancestors,
  buildTree,
  computeBalance,
  getIngredient,
  lineRole,
  type BalanceResult,
  type IngredientTree,
} from '@mixtura/engine';
import { normalise } from './normalise';
import type { Ingredient, SpecData, Template } from './types';

export interface Vocabulary {
  methods: { id: string; name: string }[];
  glasses: { id: string; name: string }[];
}

export interface ModelInput {
  ingredients: readonly Ingredient[];
  templates: readonly { value: Template; origin: 'seed' | 'user' }[];
  /** All specs, every version, with where each comes from. */
  specs: readonly { value: SpecData; origin: 'seed' | 'user' }[];
  vocabulary: Vocabulary;
  attribution?: { notice: string };
  seedVersion: string;
}

export interface Drink {
  spec: SpecData;
  origin: 'seed' | 'user';
  /** Normalised name, ingredient names and tags, for search. */
  search: string;
}

export interface Option {
  id: string;
  name: string;
  count: number;
}

export interface BrowseModel {
  tree: IngredientTree;
  templates: readonly Template[];
  templateById: ReadonlyMap<string, Template>;
  /** Ids of the user's own templates. */
  userTemplateIds: ReadonlySet<string>;
  /** The newest version of each lineage, retired ones left out, sorted by name. */
  drinks: readonly Drink[];
  /** Every spec by its id (versions, prepared ingredients' specs). */
  specById: ReadonlyMap<string, SpecData>;
  byLineage: ReadonlyMap<string, Drink>;
  vocabulary: Vocabulary;
  attribution?: { notice: string };
  seedVersion: string;
  ingredientName(id: string): string | undefined;
  /** The balance of a drink, computed on first use and kept. */
  balanceOf(spec: SpecData): BalanceResult;
  /** ABV after dilution in percent, or undefined when it is not known. */
  abvOf(spec: SpecData): number | undefined;
  /** Ids of the ingredients of a drink's base-role lines. */
  baseIngredientsOf(spec: SpecData): readonly string[];
  /** Methods in use with their number of drinks, most used first. */
  methodOptions(): readonly Option[];
  /** Base families in use (by tree ancestor) with their number of drinks. */
  baseOptions(): readonly Option[];
  /** Number of drinks that follow each template. */
  templateCounts(): ReadonlyMap<string, number>;
  /** Number of drinks without an ABV figure after dilution. */
  withoutAbv(): number;
}

export type ModelResult = { ok: true; model: BrowseModel } | { ok: false; reason: string };

const byName = (a: { name: string }, b: { name: string }): number =>
  a.name.localeCompare(b.name, 'en', { sensitivity: 'base' });

/** The newest version of each lineage that is not retired. */
export function newestVersions<T extends { spec: SpecData }>(all: readonly T[]): T[] {
  const newest = new Map<string, T>();
  for (const entry of all) {
    const known = newest.get(entry.spec.lineageId);
    if (!known || entry.spec.version > known.spec.version) newest.set(entry.spec.lineageId, entry);
  }
  return [...newest.values()].filter((e) => e.spec.status !== 'retired');
}

/** The family a base ingredient belongs to: its ancestor just below the root category. */
export function familyOf(tree: IngredientTree, id: string): string {
  const chain = [id, ...(ancestors(tree, id) ?? [])];
  return chain.length > 1 ? (chain[chain.length - 2] as string) : id;
}

function tally(ids: Iterable<string>, name: (id: string) => string): Option[] {
  const counts = new Map<string, number>();
  for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
  return [...counts]
    .map(([id, count]) => ({ id, name: name(id), count }))
    .sort((a, b) => b.count - a.count || byName(a, b));
}

export function buildModel(input: ModelInput): ModelResult {
  const built = buildTree([...input.ingredients]);
  if (!built.ok) {
    return { ok: false, reason: built.errors[0]?.message ?? 'the ingredient tree is invalid' };
  }
  const tree = built.tree;
  const ingredientName = (id: string): string | undefined => getIngredient(tree, id)?.name;

  const specById = new Map(input.specs.map((s) => [s.value.id, s.value]));
  const drinks: Drink[] = newestVersions(
    input.specs.map((s) => ({ spec: s.value, origin: s.origin })),
  )
    .map(({ spec, origin }) => {
      const words = [spec.name, ...(spec.tags ?? [])];
      for (const line of spec.lines) {
        for (const id of [
          line.ingredientId,
          ...(line.substitutes ?? []).map((s) => s.ingredientId),
        ]) {
          const name = ingredientName(id);
          if (name) words.push(name);
        }
      }
      return { spec, origin, search: normalise(words.join(' | ')) };
    })
    .sort((a, b) => byName(a.spec, b.spec));

  const balances = new Map<string, BalanceResult>();
  const bases = new Map<string, readonly string[]>();
  const cached: {
    methods?: Option[];
    bases?: Option[];
    templates?: Map<string, number>;
    noAbv?: number;
  } = {};

  const model: BrowseModel = {
    tree,
    templates: input.templates.map((t) => t.value),
    templateById: new Map(input.templates.map((t) => [t.value.id, t.value])),
    userTemplateIds: new Set(
      input.templates.filter((t) => t.origin === 'user').map((t) => t.value.id),
    ),
    drinks,
    specById,
    byLineage: new Map(drinks.map((d) => [d.spec.lineageId, d])),
    vocabulary: input.vocabulary,
    attribution: input.attribution,
    seedVersion: input.seedVersion,
    ingredientName,
    balanceOf(spec) {
      let result = balances.get(spec.id);
      if (!result) {
        result = computeBalance(tree, { method: spec.method, lines: spec.lines });
        balances.set(spec.id, result);
      }
      return result;
    },
    abvOf(spec) {
      const result = model.balanceOf(spec);
      const abv = result.ok ? result.value.after?.abvPct : undefined;
      return abv?.known ? abv.value : undefined;
    },
    baseIngredientsOf(spec) {
      let ids = bases.get(spec.id);
      if (!ids) {
        ids = spec.lines
          .filter((line) => {
            const role = lineRole(tree, line);
            return 'role' in role && role.role === 'base';
          })
          .map((line) => line.ingredientId);
        bases.set(spec.id, ids);
      }
      return ids;
    },
    methodOptions() {
      cached.methods ??= tally(
        drinks.flatMap((d) => (d.spec.method ? [d.spec.method] : [])),
        (id) => input.vocabulary.methods.find((m) => m.id === id)?.name ?? id,
      );
      return cached.methods;
    },
    baseOptions() {
      cached.bases ??= tally(
        drinks.flatMap((d) => [
          ...new Set(model.baseIngredientsOf(d.spec).map((id) => familyOf(tree, id))),
        ]),
        (id) => ingredientName(id) ?? id,
      );
      return cached.bases;
    },
    templateCounts() {
      if (!cached.templates) {
        cached.templates = new Map();
        for (const d of drinks) {
          const id = d.spec.templateId;
          if (id) cached.templates.set(id, (cached.templates.get(id) ?? 0) + 1);
        }
      }
      return cached.templates;
    },
    withoutAbv() {
      cached.noAbv ??= drinks.filter((d) => model.abvOf(d.spec) === undefined).length;
      return cached.noAbv;
    },
  };
  return { ok: true, model };
}
