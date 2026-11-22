// The rows of the Components list: the notebook's components and the shipped ones in one list, in
// two groups, under the search and the origin choice. Pure: no DOM.
import type { Origin } from '../browse/entry';
import type { ComponentRecord } from '../records';
import { filterByName } from '../shared/search';
import { strings } from '../strings';
import { componentMeta } from './meta';
import { roleLabel } from './names';
import type { ShippedEntry } from './shipped';

export interface ComponentRow {
  origin: Origin;
  /** The route parameter: an own id, or the key of a shipped component. */
  id: string;
  name: string;
  /** The muted line under the name: the role; for a shipped one also "Shipped" and its dish. */
  meta: string;
  /** The dish a shipped component belongs to; the search finds it by that name too. */
  dish?: string;
}

/** Every row: the notebook's components in their order, then the shipped ones. */
export const componentRows = (
  own: readonly ComponentRecord[],
  shipped: readonly ShippedEntry[],
): ComponentRow[] => [
  ...own.map((c): ComponentRow => ({
    origin: 'own',
    id: c.id,
    name: c.name,
    meta: componentMeta(c),
  })),
  ...shipped.map((s): ComponentRow => ({
    origin: 'shipped',
    id: s.key,
    name: s.name,
    meta: [
      s.role === undefined ? undefined : roleLabel(s.role),
      strings.browse.rowOrigin.shipped,
      s.dishName,
    ]
      .filter((part) => part !== undefined)
      .join(' · '),
    dish: s.dishName,
  })),
];

export interface ComponentGroups {
  /** Undefined when the origin choice leaves the group out. */
  own?: ComponentRow[];
  shipped?: ComponentRow[];
}

/**
 * The two groups for an origin choice and a search: the lists' search (`filterByName`) on the name,
 * and for a shipped component also on the name of its dish. A group without any row of its origin
 * at all is left out, except the notebook's, which then says it is empty.
 */
export const componentGroups = (
  rows: readonly ComponentRow[],
  origin: Origin | undefined,
  query: string,
): ComponentGroups => {
  const byName = filterByName(rows, query);
  const byDish = filterByName(
    rows.flatMap((row) => (row.dish === undefined ? [] : [{ name: row.dish, row }])),
    query,
  ).map((hit) => hit.row);
  const found = new Set([...byName, ...byDish]);
  const of = (o: Origin): ComponentRow[] => rows.filter((r) => r.origin === o && found.has(r));
  const anyShipped = rows.some((r) => r.origin === 'shipped');
  return {
    ...(origin === 'shipped' ? {} : { own: of('own') }),
    ...(origin === 'own' || !anyShipped ? {} : { shipped: of('shipped') }),
  };
};
