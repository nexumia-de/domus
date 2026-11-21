// The finder's question for the shipped classics: what the stock allows for each, judged by the
// engine's `classicsMakeable` (the same finder as for the notebook's own dishes, on the derived
// dish). The ingredient tree is the notebook's, completed by the shipped catalogue, so that a line
// naming a group ("Milk") is met by stock of a member that the notebook has not copied the group
// of. No rule and no arithmetic here. The web app merges the result with its own dishes
// (./one-list.ts); `findClassics` with its own country and meat filters serves the native Linux app.
import { classicsMakeable } from '@culina/engine';
import type { Classic, ClassicCandidate, Lang } from '@culina/engine';
import type { IngredientRecord } from '../records';
import type { ClassicFinderFilters } from '../prefs';
import { cookInput } from './input';
import type { CookSource } from './input';

/** The most lines a classic may lack when the screen looks for the nearest ones. */
export const WIDE = 1000;
/** How many of the nearest to name when nothing matches. */
const NEAREST = 3;

export type FoundClassics =
  | { ok: false }
  | {
      ok: true;
      /** What is shown, in the engine's order. */
      shown: ClassicCandidate[];
      /** When `shown` is empty: the nearest that pass the other filters, fewest lacking first. */
      nearest: ClassicCandidate[];
      /** Classics that pass the country and meat filters, before the number that may lack. */
      matching: number;
      /** Ingredient names for the rows: notebook first, then catalogue. */
      ingredients: ReadonlyMap<string, IngredientRecord>;
    };

/** The notebook's ingredients and, for the ids it does not have, the catalogue's. */
export const withCatalogue = (
  notebook: readonly IngredientRecord[],
  catalogue: ReadonlyMap<string, IngredientRecord>,
): IngredientRecord[] => {
  const own = new Set(notebook.map((i) => i.id));
  return [...notebook, ...[...catalogue.values()].filter((c) => !own.has(c.id))];
};

export type ClassicsWithin =
  | { ok: false }
  | {
      ok: true;
      /** The engine's candidates, in its order. */
      candidates: ClassicCandidate[];
      /** Ingredient names for the rows: notebook first, then catalogue. */
      ingredients: ReadonlyMap<string, IngredientRecord>;
    };

/** Every classic the stock allows with at most `maxMissing` lines lacking, as the engine says. */
export const classicsWithin = (
  classics: readonly Classic[],
  source: CookSource,
  catalogue: ReadonlyMap<string, IngredientRecord>,
  today: string,
  maxMissing: number,
  lang: Lang,
): ClassicsWithin => {
  const ingredients = withCatalogue(source.ingredients, catalogue);
  const base = cookInput({ ...source, ingredients }, today);
  const found = classicsMakeable({
    ingredients: base.ingredients,
    stock: base.stock,
    today: base.today,
    ...(base.facts === undefined ? {} : { facts: base.facts }),
    ...(base.parts === undefined ? {} : { parts: base.parts }),
    classics,
    lang,
    options: { maxMissing },
  });
  if (!found.ok) return { ok: false };
  return {
    ok: true,
    candidates: found.candidates,
    ingredients: new Map(ingredients.map((i) => [i.id, i])),
  };
};

const passes = (c: ClassicCandidate, filters: ClassicFinderFilters): boolean =>
  (filters.country === undefined || c.country === filters.country) &&
  (filters.meatFree !== true || c.vegetarian) &&
  (filters.role === undefined || c.roles.includes(filters.role));

export const findClassics = (
  classics: readonly Classic[],
  source: CookSource,
  catalogue: ReadonlyMap<string, IngredientRecord>,
  today: string,
  filters: ClassicFinderFilters,
  lang: Lang,
): FoundClassics => {
  const within = classicsWithin(classics, source, catalogue, today, filters.lacking, lang);
  if (!within.ok) return { ok: false };
  const shown = within.candidates.filter((c) => passes(c, filters));
  let nearest: ClassicCandidate[] = [];
  if (shown.length === 0) {
    const wide = classicsWithin(classics, source, catalogue, today, WIDE, lang);
    if (wide.ok) {
      // A stable sort: classics that lack the same number keep the engine's order.
      nearest = wide.candidates
        .filter((c) => passes(c, filters))
        .sort((a, b) => a.lacking - b.lacking)
        .slice(0, NEAREST);
    }
  }
  const matching = classics.filter(
    (c) =>
      (filters.country === undefined || c.country === filters.country) &&
      (filters.meatFree !== true || c.vegetarian),
  ).length;
  return { ok: true, shown, nearest, matching, ingredients: within.ingredients };
};
