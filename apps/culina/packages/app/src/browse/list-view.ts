// The one list of dishes as the Dishes list and the start screen show it: which entries pass the
// filter and the search, in which order, and what the quiet line under each name says. Pure: no
// DOM and no texts; the screen turns the meta into words (screens/dish-list.ts).
import type { Lang } from '@culina/engine';
import { isCountry } from '../classics/list-view';
import type { DishEntry, Origin } from './entry';
import { isEmptyFilter, matchesFilter, matchesQuery, type DishFilter } from './filter';

/** What the line under a name says, each part only where it is known. */
export interface RowMeta {
  course?: string;
  cuisine?: string;
  /** Only said when the list holds dishes of both origins (the filter does not fix one). */
  origin?: Origin;
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

const metaOf = (entry: DishEntry, withOrigin: boolean): RowMeta => ({
  ...(entry.course === undefined ? {} : { course: entry.course }),
  ...(entry.cuisine === undefined ? {} : { cuisine: entry.cuisine }),
  ...(withOrigin ? { origin: entry.origin } : {}),
});

/**
 * The rows for a filter and a search text: every entry that passes both, sorted by name in the
 * content language (own and shipped dishes mixed), the key breaking a tie so the order is stable.
 */
export const dishListView = (
  entries: readonly DishEntry[],
  filter: DishFilter,
  query: string,
  lang: Lang,
): DishListView => {
  const collator = new Intl.Collator(lang, { sensitivity: 'base', numeric: true });
  const withOrigin = filter.origin === undefined && bothOrigins(entries);
  const rows = entries
    .filter((e) => matchesFilter(e, filter) && matchesQuery(e, query))
    .sort((a, b) => collator.compare(a.name, b.name) || (a.key < b.key ? -1 : 1))
    .map((entry) => ({ entry, meta: metaOf(entry, withOrigin) }));
  const narrowed = !isEmptyFilter(filter) || query.trim() !== '';
  return { rows, total: entries.length, narrowed };
};

/**
 * The filter an old address of the classics stands for: `#/classics` is the shipped dishes,
 * `#/classics/<country>` those of one country. The other choices are dropped, so that the old link
 * shows every dish it showed before; a country the app does not know gives no cuisine.
 */
export const classicsFilter = (country: string | undefined): DishFilter => ({
  origin: 'shipped',
  ...(isCountry(country) ? { cuisine: country } : {}),
});
