// The finder's one question: given the notebook, the filters and optionally one ingredient to
// start from, which candidates to show, in the engine's order. The filters only drop entries;
// nothing is reordered, so the screen's order is the engine's ranking.
import { makeable, usesIngredient } from '@culina/engine';
import type { MakeableCandidate, MakeableUseUp } from '@culina/engine';
import type { CookFilters } from '../prefs';
import { cookInput } from './input';
import type { CookSource } from './input';
import { lookupOf } from './lookup';
import type { Lookup } from './lookup';
import { offersFor } from './offers';
import { keyOf } from './rows';

/** The most lines a candidate may lack when the screen looks for the nearest ones. */
const WIDE = 1000;
/** How many of the nearest to name when nothing matches. */
const NEAREST = 3;

export type Found =
  | { ok: false }
  | {
      ok: true;
      look: Lookup;
      /** Candidates within the threshold, before the role and ingredient filters. */
      within: MakeableCandidate[];
      /** What is shown, in the engine's order. */
      shown: MakeableCandidate[];
      /** The roles of `within`, sorted. */
      roles: string[];
      /** When `shown` is empty: the nearest candidates that pass the other filters, fewest lacking first. */
      nearest: MakeableCandidate[];
      /** Stock items with a use-by, the nearest first, with the candidates that use each. */
      useUpFirst: MakeableUseUp[];
      /** Names in stock for a role (for the open roles of a dish). */
      offers(role: string): string[];
      /** True when a role or an ingredient narrows the list. */
      narrowed: boolean;
      /** True when something is ticked, and when the notebook has a component or a dish. */
      hasStock: boolean;
      hasRecipes: boolean;
    };

const passes = (
  c: MakeableCandidate,
  role: string | undefined,
  uses: ReadonlySet<string> | undefined,
): boolean =>
  (role === undefined || c.roles.includes(role)) &&
  (uses === undefined || (c.kind !== 'template' && uses.has(keyOf(c))));

export const find = (
  source: CookSource,
  today: string,
  filters: CookFilters,
  ingredientId?: string,
): Found => {
  const input = cookInput(source, today, { maxMissing: filters.lacking });
  const result = makeable(input);
  if (!result.ok) return { ok: false };
  let uses: Set<string> | undefined;
  if (ingredientId !== undefined) {
    const found = usesIngredient(input, ingredientId);
    if (!found.ok) return { ok: false };
    uses = new Set(found.records.map(keyOf));
  }
  const shown = result.candidates.filter((c) => passes(c, filters.role, uses));
  let nearest: MakeableCandidate[] = [];
  if (shown.length === 0) {
    const wide = makeable(cookInput(source, today, { maxMissing: WIDE }));
    if (wide.ok) {
      const rest = wide.candidates.filter((c) => passes(c, filters.role, uses));
      // A stable sort: candidates that lack the same number keep the engine's order.
      nearest = rest.sort((a, b) => a.lacking - b.lacking).slice(0, NEAREST);
    }
  }
  const look = lookupOf(source);
  return {
    ok: true,
    look,
    within: result.candidates,
    shown,
    roles: [...new Set(result.candidates.flatMap((c) => c.roles))].sort(),
    nearest,
    useUpFirst: result.useUpFirst,
    offers: offersFor(input, look),
    narrowed: filters.role !== undefined || ingredientId !== undefined,
    hasStock: source.stock.length > 0,
    hasRecipes: source.components.length + source.dishes.length > 0,
  };
};
