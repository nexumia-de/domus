// The rows of a Notebook list (Components and Dishes): the user's own and the shipped ones in one
// plain list, in two groups, under the search and the origin choice. Pure: no DOM.
import type { Origin } from '../browse/entry';
import { filterByName } from './search';

export interface NotebookRow {
  origin: Origin;
  /** The id the list marks as open: an own id, or the key of a shipped component. */
  id: string;
  name: string;
  /** The muted line under the name; a shipped row says "Shipped" in it. */
  meta: string;
  /** Where the row leads. */
  href: string;
  /** The dish a shipped component belongs to; the search finds the row by that name too. */
  dish?: string;
}

export interface NotebookGroups {
  /** Undefined when the origin choice leaves the group out. */
  own?: NotebookRow[];
  shipped?: NotebookRow[];
}

/**
 * The two groups for an origin choice and a search: the lists' search (`filterByName`) on the name,
 * and for a shipped component also on the name of its dish. A group without any row of its origin
 * at all is left out, except the notebook's, which then says it is empty.
 */
export const notebookGroups = (
  rows: readonly NotebookRow[],
  origin: Origin | undefined,
  query: string,
): NotebookGroups => {
  const byName = filterByName(rows, query);
  const byDish = filterByName(
    rows.flatMap((row) => (row.dish === undefined ? [] : [{ name: row.dish, row }])),
    query,
  ).map((hit) => hit.row);
  const found = new Set([...byName, ...byDish]);
  const of = (o: Origin): NotebookRow[] => rows.filter((r) => r.origin === o && found.has(r));
  const anyShipped = rows.some((r) => r.origin === 'shipped');
  return {
    ...(origin === 'shipped' ? {} : { own: of('own') }),
    ...(origin === 'own' || !anyShipped ? {} : { shipped: of('shipped') }),
  };
};
