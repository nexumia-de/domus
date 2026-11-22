// The one list of dishes as Cook shows it (docs/decisions/cook-screen.md): which entries pass the
// filter, the search and "Only with what I have", in which order (by name, or "Use up first"), and
// what the quiet line under each name says. Pure: no DOM and no texts; the screen turns the meta
// into words (screens/dish-list.ts), the finder's answers come in as keys and marks.
import type { Lang } from '@culina/engine';
import { isCountry } from '../classics/list-view';
import type { UseUpMark } from '../cook/one-list';
import type { DishEntry, Origin } from './entry';
import { isEmptyFilter, matchesFilter, matchesQuery, type DishFilter } from './filter';

/** What the line under a name says, each part only where it is known. */
export interface RowMeta {
  course?: string;
  cuisine?: string;
  /** Only said when the list holds dishes of both origins (the filter does not fix one). */
  origin?: Origin;
  /** In the order "Use up first": the dated item the dish uses that sets its place. */
  useUp?: { itemId: string; daysLeft: number };
}

export interface ListRow {
  entry: DishEntry;
  meta: RowMeta;
}

export interface DishListView {
  /** The entries that pass, sorted by name. */
  rows: ListRow[];
  /** How many entries there are before the filter and the search. */
  total: number;
  /** True when a choice of the filter or a search text is set. */
  narrowed: boolean;
}

/** True when the entries come from both origins. */
export const bothOrigins = (entries: readonly DishEntry[]): boolean =>
  entries.some((e) => e.origin === 'own') && entries.some((e) => e.origin === 'shipped');

const metaOf = (entry: DishEntry, withOrigin: boolean, mark?: UseUpMark): RowMeta => ({
  ...(entry.course === undefined ? {} : { course: entry.course }),
  ...(entry.cuisine === undefined ? {} : { cuisine: entry.cuisine }),
  ...(withOrigin ? { origin: entry.origin } : {}),
  ...(mark === undefined ? {} : { useUp: { itemId: mark.itemId, daysLeft: mark.daysLeft } }),
});

/** What Cook adds to the filter and the search, each from the finder (src/dishes/). */
export interface CookNarrowing {
  /** "Only with what I have": the keys of the dishes the stock covers (`readyNowKeys`). */
  ready?: ReadonlySet<string>;
  /** The order "Use up first": the marks of the dishes that use a dated item (`useUpMarks`). */
  useUp?: ReadonlyMap<string, UseUpMark>;
}

/**
 * The rows for a filter and a search text: every entry that passes both (and, when given, is
 * ready), sorted by name in the content language (own and shipped dishes mixed), the key breaking a
 * tie so the order is stable. With `useUp` the dishes that use a dated item come first, in the
 * engine's order, and the rest follow by name.
 */
export const dishListView = (
  entries: readonly DishEntry[],
  filter: DishFilter,
  query: string,
  lang: Lang,
  cook: CookNarrowing = {},
): DishListView => {
  const collator = new Intl.Collator(lang, { sensitivity: 'base', numeric: true });
  const withOrigin = filter.origin === undefined && bothOrigins(entries);
  const { ready, useUp } = cook;
  const rankOf = (e: DishEntry): number => useUp?.get(e.key)?.rank ?? Infinity;
  const rows = entries
    .filter(
      (e) =>
        matchesFilter(e, filter) &&
        matchesQuery(e, query) &&
        (ready === undefined || ready.has(e.key)),
    )
    .sort(
      (a, b) =>
        (useUp === undefined || rankOf(a) === rankOf(b) ? 0 : rankOf(a) < rankOf(b) ? -1 : 1) ||
        collator.compare(a.name, b.name) ||
        (a.key < b.key ? -1 : 1),
    )
    .map((entry) => ({ entry, meta: metaOf(entry, withOrigin, useUp?.get(entry.key)) }));
  const narrowed = !isEmptyFilter(filter) || query.trim() !== '' || ready !== undefined;
  return { rows, total: entries.length, narrowed };
};

/**
 * The filter an old address of the classics stands for: `#/classics` is the shipped dishes,
 * `#/classics/<country>` those of one country. The other choices are dropped, so that the old link
 * shows every dish it showed before; a country the app does not know gives no cuisine. Only an
 * address from outside (a bookmark, an old link) comes here: no link inside the app leads to one,
 * because a link inside the app never changes the user's filter.
 */
export const classicsFilter = (country: string | undefined): DishFilter => ({
  origin: 'shipped',
  ...(isCountry(country) ? { cuisine: country } : {}),
});

/** One choice of the filter, as the folded filter's summary names it. */
export type ActiveChoice =
  | { kind: 'origin'; value: Origin }
  | { kind: 'character' | 'course' | 'cuisine'; value: string }
  | { kind: 'meatFree' | 'completeOnly' };

/** The choices that narrow, in the order of the controls; none for the empty filter. */
export const activeChoices = (filter: DishFilter): ActiveChoice[] => [
  ...(filter.origin === undefined ? [] : [{ kind: 'origin' as const, value: filter.origin }]),
  ...(filter.character === undefined
    ? []
    : [{ kind: 'character' as const, value: filter.character }]),
  ...(filter.course === undefined ? [] : [{ kind: 'course' as const, value: filter.course }]),
  ...(filter.cuisine === undefined ? [] : [{ kind: 'cuisine' as const, value: filter.cuisine }]),
  ...(filter.meatFree === true ? [{ kind: 'meatFree' as const }] : []),
  ...(filter.completeOnly === true ? [{ kind: 'completeOnly' as const }] : []),
];
