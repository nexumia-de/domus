// One list of what the stock allows: the notebook's own dishes and the shipped classics together,
// ordered by the engine's one ranking contract (`rankCandidates`: urgency, roles covered, name,
// id, kind), which both finders already follow; the union of two ranked lists ranked again is
// their merge by the same rule. Components and ratio cards are not dishes: they form a second
// group, shown only while the dish filter chooses nothing a component cannot have. The dish
// filter (browse/filter.ts) is read on each dish's entry. Pure: no DOM, no store.
import { rankCandidates } from '@culina/engine';
import type { ClassicCandidate, MakeableCandidate, MakeableUseUp } from '@culina/engine';
import { entryKey } from '../browse/entry';
import type { DishEntry, Origin } from '../browse/entry';
import { isEmptyFilter, matchesFilter } from '../browse/filter';
import type { DishFilter } from '../browse/filter';

/** A candidate of either finder. */
export type AnyCandidate = MakeableCandidate | ClassicCandidate;

export const originOf = (c: AnyCandidate): Origin => (c.kind === 'classic' ? 'shipped' : 'own');

/** A dish of the notebook or a shipped classic; not a component or a ratio card. */
export const isDish = (c: AnyCandidate): boolean => c.kind === 'dish' || c.kind === 'classic';

/** The key of the dish's entry (`own:<id>`, `shipped:<id>`). */
export const entryKeyOf = (c: AnyCandidate): string => entryKey(originOf(c), c.id);

/**
 * True when components and ratio cards stay in view: the dish filter chooses nothing but,
 * possibly, "mine". A character, course, cuisine, "without meat and fish" or "every amount" is a
 * fact of a dish, and "shipped" has no components.
 */
export const partsInView = (f: DishFilter): boolean => {
  const { origin, ...rest } = f;
  return origin !== 'shipped' && isEmptyFilter(rest);
};

/** What narrows the list besides the threshold. */
export interface Narrowing {
  filter: DishFilter;
  /** "Covers the role". */
  role?: string;
  /** "What uses <ingredient>": the `kind:id` of the own components and dishes that use it. */
  uses?: ReadonlySet<string>;
}

/** True when a narrowing chooses anything at all. */
export const isNarrowed = (n: Narrowing): boolean =>
  n.role !== undefined || n.uses !== undefined || !isEmptyFilter(n.filter);

const keeps = (c: AnyCandidate, n: Narrowing, entries: ReadonlyMap<string, DishEntry>): boolean => {
  if (n.role !== undefined && !c.roles.includes(n.role)) return false;
  if (n.uses !== undefined && (c.kind === 'classic' || !n.uses.has(`${c.kind}:${c.id}`)))
    return false;
  if (!isDish(c)) return partsInView(n.filter);
  const entry = entries.get(entryKeyOf(c));
  // A dish without an entry (not expected) is only kept while nothing is chosen.
  return entry === undefined ? isEmptyFilter(n.filter) : matchesFilter(entry, n.filter);
};

export interface OneList {
  /** Own dishes and classics, in the one ranking. */
  dishes: AnyCandidate[];
  /** Own components and ratio cards, in the same ranking. */
  parts: MakeableCandidate[];
}

/**
 * @param own - The engine's own candidates (`makeable`), any order.
 * @param classics - The engine's classics (`classicsMakeable`), any order.
 * @param entries - The dish entries by key, for the dish filter.
 */
export const oneList = (
  own: readonly MakeableCandidate[],
  classics: readonly ClassicCandidate[],
  entries: ReadonlyMap<string, DishEntry>,
  n: Narrowing,
): OneList => {
  const kept = rankCandidates<AnyCandidate>([...own, ...classics]).filter((c) =>
    keeps(c, n, entries),
  );
  return {
    dishes: kept.filter(isDish),
    parts: kept.filter((c): c is MakeableCandidate => !isDish(c)),
  };
};

/**
 * The nearest candidates under the same narrowing, from lists at a wide threshold: fewest lacking
 * first, the one ranking within the same number (a stable sort).
 */
export const nearestOf = (
  own: readonly MakeableCandidate[],
  classics: readonly ClassicCandidate[],
  entries: ReadonlyMap<string, DishEntry>,
  n: Narrowing,
  count = 3,
): AnyCandidate[] => {
  const { dishes, parts } = oneList(own, classics, entries, n);
  return rankCandidates<AnyCandidate>([...dishes, ...parts])
    .sort((a, b) => a.lacking - b.lacking)
    .slice(0, count);
};

export interface UseUpWithin extends Omit<MakeableUseUp, 'candidates'> {
  /** What uses the item among the candidates in view, in the one ranking. */
  candidates: AnyCandidate[];
}

/**
 * "Use up first" counted within what is in view: each dated item (the engine's `useUpFirst`, in
 * its order) with the candidates of the list that use it, by the engine's `usedItems`.
 */
export const useUpWithin = (
  useUp: readonly MakeableUseUp[],
  inView: readonly AnyCandidate[],
): UseUpWithin[] => {
  const ranked = rankCandidates(inView);
  return useUp.map((u) => ({
    itemId: u.itemId,
    useBy: u.useBy,
    daysLeft: u.daysLeft,
    candidates: ranked.filter((c) => c.usedItems.includes(u.itemId)),
  }));
};

/** The roles the candidates cover, each once, sorted. */
export const rolesOf = (candidates: readonly AnyCandidate[]): string[] =>
  [...new Set(candidates.flatMap((c) => c.roles))].sort();

/** Why a dish stands where it does in Cook's order "Use up first": the item that sets it. */
export interface UseUpMark {
  /** Its place among the dishes that use a dated item, 0 first. */
  rank: number;
  /** The stock item with the nearest use-by among those the dish uses (the engine's urgency). */
  itemId: string;
  daysLeft: number;
}

/**
 * Cook's order "Use up first" (docs/decisions/cook-screen.md): the dishes that use a stock item
 * with a use-by date, in the engine's one ranking (`rankCandidates`: the nearest use-by first),
 * keyed by entry. A dish that uses no dated item has no mark; the list puts it after, by name.
 */
export const useUpMarks = (candidates: readonly AnyCandidate[]): Map<string, UseUpMark> => {
  const marks = new Map<string, UseUpMark>();
  for (const c of rankCandidates(candidates.filter(isDish))) {
    if (c.urgency === undefined) continue;
    marks.set(entryKeyOf(c), {
      rank: marks.size,
      itemId: c.urgency.itemId,
      daysLeft: c.urgency.daysLeft,
    });
  }
  return marks;
};
