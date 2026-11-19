// What the stock allows, from the engine, for the screens: one state per
// drink (makeable, makeable with a substitute, missing one) and the unlock
// ranking. Nothing is stored. Results are kept per browse model and per
// records object, so a redraw without a stock change costs nothing and a
// change costs one engine run (about 10 ms makeable, 30 ms ranking on the
// seed, docs/makeable.md#performance).

import {
  ancestors,
  buildStockIndex,
  makeableSpecs,
  missingOne,
  unlockRanking,
  type StockIndex,
  type SpecStatus,
  type StockMode,
  type UnlockResult,
} from '@mixtura/engine';
import type { BrowseModel } from '../screens/browse/model';
import type { StockRecords } from './state';

export type Availability =
  | { kind: 'makeable' }
  | { kind: 'substitute' }
  | { kind: 'one'; missing: string }
  /** Two or more ingredients missing: only the tag "Missing 3" shows it, no filter and no count. */
  | { kind: 'several'; count: number };

export interface Derived {
  /** By spec id; empty while nothing is in stock. The three states and "several missing" are listed. */
  states: ReadonlyMap<string, Availability>;
  /** Drinks of the list in each state. */
  counts: { makeable: number; substitute: number; one: number };
}

interface PerModel {
  index: StockIndex;
  derived: WeakMap<StockRecords, Derived>;
  rankings: WeakMap<StockRecords, Record<string, UnlockResult>>;
}

const models = new WeakMap<BrowseModel, PerModel>();
const drinkCountsByModel = new WeakMap<BrowseModel, ReadonlyMap<string, number>>();

/** The stock index of a model: its tree and specs (also what the ranking worker is sent). */
export function indexOf(model: BrowseModel): StockIndex {
  return perModel(model).index;
}

function perModel(model: BrowseModel): PerModel {
  let found = models.get(model);
  if (!found) {
    // The drinks of the list plus the recipes of prepared ingredients.
    const specs = new Map(model.drinks.map((d) => [d.spec.id, d.spec]));
    for (const entry of model.tree.byId.values()) {
      const id = entry.prepared?.specId;
      const recipe = id ? model.specById.get(id) : undefined;
      if (recipe) specs.set(recipe.id, recipe);
    }
    found = {
      index: buildStockIndex(model.tree, [...specs.values()]),
      derived: new WeakMap(),
      rankings: new WeakMap(),
    };
    models.set(model, found);
  }
  return found;
}

const entriesOf = (records: StockRecords): { ingredientId: string; present: boolean }[] =>
  [...records.values()].map((r) => ({ ingredientId: r.ingredientId, present: r.present }));

/** True when at least one record says "in stock" for an ingredient of the tree. */
export function hasStock(model: BrowseModel, records: StockRecords): boolean {
  for (const r of records.values())
    if (r.present && model.tree.byId.has(r.ingredientId)) return true;
  return false;
}

export function deriveStock(model: BrowseModel, records: StockRecords): Derived {
  const mine = perModel(model);
  const known = mine.derived.get(records);
  if (known) return known;
  const states = new Map<string, Availability>();
  const counts = { makeable: 0, substitute: 0, one: 0 };
  if (hasStock(model, records)) {
    const entries = entriesOf(records);
    const strict = makeableSpecs(mine.index, entries, { mode: 'strict' });
    const loose = makeableSpecs(mine.index, entries, { mode: 'with-substitutes' });
    const looseStatus = new Map(loose.specs.map((s) => [s.specId, s.status]));
    const one = new Map(missingOne(mine.index, strict).map((m) => [m.specId, m.missing]));
    for (const result of strict.specs) {
      const id = result.specId;
      if (result.status === 'makeable') states.set(id, { kind: 'makeable' });
      else if (looseStatus.get(id) === 'makeable-with-substitution') {
        states.set(id, { kind: 'substitute' });
      } else {
        const missing = one.get(id);
        if (missing !== undefined) states.set(id, { kind: 'one', missing });
        else if (result.status === 'missing' && result.missing.length > 1) {
          states.set(id, { kind: 'several', count: result.missing.length });
        }
      }
    }
    for (const drink of model.drinks) {
      const state = states.get(drink.spec.id);
      if (!state) continue;
      if (state.kind === 'makeable') counts.makeable += 1;
      else if (state.kind === 'substitute') counts.substitute += 1;
      else if (state.kind === 'one') counts.one += 1;
    }
  }
  const derived: Derived = { states, counts };
  mine.derived.set(records, derived);
  return derived;
}

/** The unlock ranking in a mode; retired drinks are left out (the engine's default). */
export function rankStock(
  model: BrowseModel,
  records: StockRecords,
  mode: StockMode,
  excludeStatuses: readonly SpecStatus[] = ['retired'],
): UnlockResult {
  const mine = perModel(model);
  let byMode = mine.rankings.get(records);
  if (!byMode) {
    byMode = {};
    mine.rankings.set(records, byMode);
  }
  const key = rankKey(mode, excludeStatuses);
  byMode[key] ??= unlockRanking(mine.index, entriesOf(records), { mode, excludeStatuses });
  return byMode[key];
}

/** What a ranking depends on besides the stock: the mode and the statuses left out. */
export const rankKey = (mode: StockMode, excludeStatuses: readonly SpecStatus[]): string =>
  `${mode}|${[...excludeStatuses].sort().join(',')}`;

/**
 * For each ingredient the number of drinks of the list that name it or
 * something below it on a line: "In 14 drinks".
 */
export function drinkCounts(model: BrowseModel): ReadonlyMap<string, number> {
  let counts = drinkCountsByModel.get(model);
  if (!counts) {
    const map = new Map<string, number>();
    for (const drink of model.drinks) {
      const seen = new Set<string>();
      for (const line of drink.spec.lines) {
        if (!model.tree.byId.has(line.ingredientId)) continue;
        seen.add(line.ingredientId);
        for (const a of ancestors(model.tree, line.ingredientId) ?? []) seen.add(a);
      }
      for (const id of seen) map.set(id, (map.get(id) ?? 0) + 1);
    }
    counts = map;
    drinkCountsByModel.set(model, counts);
  }
  return counts;
}
