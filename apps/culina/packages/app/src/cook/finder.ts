// The finder's one question: given the notebook, the shipped classics, the finder's two choices,
// the dish filter and optionally one ingredient to start from, what to show. The engine judges
// own candidates (`makeable`) and classics (`classicsMakeable`); ./one-list.ts merges them by the
// engine's ranking and only drops entries. No arithmetic and no rule here.
import { makeable, usesIngredient } from '@culina/engine';
import type { Classic, ClassicCandidate, Lang, MakeableCandidate } from '@culina/engine';
import type { DishEntry } from '../browse/entry';
import type { DishFilter } from '../browse/filter';
import type { CookFilters } from '../prefs';
import type { IngredientRecord } from '../records';
import { classicsWithin, WIDE } from './classic-finder';
import { classicLookup } from './classic-rows';
import { cookInput } from './input';
import type { CookSource } from './input';
import { lookupOf } from './lookup';
import type { Lookup } from './lookup';
import { offersFor } from './offers';
import { isNarrowed, nearestOf, oneList, rolesOf, useUpWithin } from './one-list';
import type { AnyCandidate, Narrowing, UseUpWithin } from './one-list';
import { keyOf } from './rows';

/** The shipped side of the question; absent: own records only, every dish filter empty. */
export interface Shipped {
  classics: readonly Classic[];
  /** The shipped catalogue, which completes the ingredient tree for the classics. */
  catalogue: ReadonlyMap<string, IngredientRecord>;
  lang: Lang;
}

export interface FindOptions {
  /** The one dish filter; default: nothing chosen. */
  filter?: DishFilter;
  /** The entries of the dishes by key (`own:<id>`, `shipped:<id>`), for the dish filter. */
  entries?: ReadonlyMap<string, DishEntry>;
  /** Set on #/cook/<id>/with: only own components and dishes that use that ingredient. */
  ingredientId?: string;
  shipped?: Shipped;
}

export type Found =
  | { ok: false }
  | {
      ok: true;
      /** Names of the notebook; `classicLook` adds the catalogue's for the classics. */
      look: Lookup;
      classicLook: Lookup;
      /** Own candidates within the threshold, before any narrowing. */
      within: MakeableCandidate[];
      /** Classics within the threshold, before any narrowing (none on the "uses" view). */
      classicsWithin: ClassicCandidate[];
      /** Own dishes and classics in the one ranking, narrowed. */
      dishes: AnyCandidate[];
      /** Own components and ratio cards, narrowed (none while the dish filter hides them). */
      parts: MakeableCandidate[];
      /** The roles of everything within the threshold, sorted. */
      roles: string[];
      /** When nothing is shown: the nearest under the same narrowing, fewest lacking first. */
      nearest: AnyCandidate[];
      /** Stock items with a use-by, nearest first, with what in view uses each. */
      useUpFirst: UseUpWithin[];
      /** Names in stock for a role (for the open roles of an own dish). */
      offers(role: string): string[];
      /** True when a role, an ingredient or the dish filter narrows the list. */
      narrowed: boolean;
      /** True when something is ticked, and when the notebook has a component or a dish. */
      hasStock: boolean;
      hasRecipes: boolean;
    };

/** Records and ids the engine sees for the classics: none on the "uses" view. */
const classicsAt = (
  source: CookSource,
  today: string,
  maxMissing: number,
  options: FindOptions,
): { candidates: ClassicCandidate[]; ingredients?: ReadonlyMap<string, IngredientRecord> } => {
  const s = options.shipped;
  if (s === undefined || options.ingredientId !== undefined || s.classics.length === 0)
    return { candidates: [] };
  const found = classicsWithin(s.classics, source, s.catalogue, today, maxMissing, s.lang);
  // A classic that does not derive is the content's problem, not the notebook's: the own list stays.
  return found.ok ? found : { candidates: [] };
};

export const find = (
  source: CookSource,
  today: string,
  filters: CookFilters,
  options: FindOptions = {},
): Found => {
  const input = cookInput(source, today, { maxMissing: filters.lacking });
  const result = makeable(input);
  if (!result.ok) return { ok: false };
  let uses: Set<string> | undefined;
  if (options.ingredientId !== undefined) {
    const found = usesIngredient(input, options.ingredientId);
    if (!found.ok) return { ok: false };
    uses = new Set(found.records.map(keyOf));
  }
  const narrowing: Narrowing = {
    filter: options.filter ?? {},
    ...(filters.role === undefined ? {} : { role: filters.role }),
    ...(uses === undefined ? {} : { uses }),
  };
  const entries = options.entries ?? new Map<string, DishEntry>();
  const shipped = classicsAt(source, today, filters.lacking, options);
  const list = oneList(result.candidates, shipped.candidates, entries, narrowing);
  let nearest: AnyCandidate[] = [];
  if (list.dishes.length + list.parts.length === 0) {
    const wide = makeable(cookInput(source, today, { maxMissing: WIDE }));
    const wideClassics = classicsAt(source, today, WIDE, options);
    if (wide.ok) nearest = nearestOf(wide.candidates, wideClassics.candidates, entries, narrowing);
  }
  const look = lookupOf(source);
  const lang = options.shipped?.lang ?? 'en';
  return {
    ok: true,
    look,
    classicLook: classicLookup(shipped.ingredients ?? new Map(), look, lang),
    within: result.candidates,
    classicsWithin: shipped.candidates,
    dishes: list.dishes,
    parts: list.parts,
    roles: rolesOf([...result.candidates, ...shipped.candidates]),
    nearest,
    useUpFirst: useUpWithin(result.useUpFirst, [...list.dishes, ...list.parts]),
    offers: offersFor(input, look),
    narrowed: isNarrowed(narrowing),
    hasStock: source.stock.length > 0,
    hasRecipes: source.components.length + source.dishes.length > 0,
  };
};
