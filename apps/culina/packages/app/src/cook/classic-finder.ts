// The finder's question for the shipped classics: what the stock allows for each, judged by the
// engine's `classicsMakeable` (the same finder as for the notebook's own dishes, on the derived
// dish). The filters only drop entries; the order is the engine's. The ingredient tree is the
// notebook's, completed by the shipped catalogue, so that a line naming a group ("Milk") is met by
// stock of a member that the notebook has not copied the group of. No rule and no arithmetic here.
import { classicsMakeable } from '@culina/engine';
import type { Classic, ClassicCandidate, Lang } from '@culina/engine';
import type { IngredientRecord } from '../records';
import type { CookFilters } from '../prefs';
import { cookInput } from './input';
import type { CookSource } from './input';

/** The most lines a classic may lack when the screen looks for the nearest ones. */
const WIDE = 1000;
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

const passes = (c: ClassicCandidate, filters: CookFilters): boolean =>
  (filters.country === undefined || c.country === filters.country) &&
  (filters.meatFree !== true || c.vegetarian) &&
  (filters.role === undefined || c.roles.includes(filters.role));

export const findClassics = (
  classics: readonly Classic[],
  source: CookSource,
  catalogue: ReadonlyMap<string, IngredientRecord>,
  today: string,
  filters: CookFilters,
  lang: Lang,
): FoundClassics => {
  const ingredients = withCatalogue(source.ingredients, catalogue);
  const base = cookInput({ ...source, ingredients }, today);
  const ask = (maxMissing: number) => {
    return classicsMakeable({
      ingredients: base.ingredients,
      stock: base.stock,
      today: base.today,
      ...(base.facts === undefined ? {} : { facts: base.facts }),
      classics,
      lang,
      options: { maxMissing },
    });
  };
  const within = ask(filters.lacking);
  if (!within.ok) return { ok: false };
  const shown = within.candidates.filter((c) => passes(c, filters));
  let nearest: ClassicCandidate[] = [];
  if (shown.length === 0) {
    const wide = ask(WIDE);
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
  return {
    ok: true,
    shown,
    nearest,
    matching,
    ingredients: new Map(ingredients.map((i) => [i.id, i])),
  };
};
