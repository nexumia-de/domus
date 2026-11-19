// Addresses of the drinks list: search and filters are query parameters, so
// back works and a link can be shared. Other parameters of the route (a
// swap, later) are kept.

import { formatHash, type Route } from '../../router';
import { FILTER_KEYS, filterParams, type Filters } from '../browse/filters';
import { sortParams, type SortId } from '../browse/sort';

/** The route's address with these filters (and the sheet, when given). */
export function hashWith(route: Route, filters: Filters, sheet?: 'filters' | null): string {
  const query = new URLSearchParams(route.query);
  // `sort` stays: it belongs to the list, not to the filters.
  for (const key of ['q', 'sheet', ...FILTER_KEYS]) query.delete(key);
  for (const [key, value] of filterParams(filters)) query.set(key, value);
  const open = sheet === undefined ? route.query.get('sheet') : sheet;
  if (open) query.set('sheet', open);
  return formatHash(route.path, query);
}

/** The address of a drink's spec; the list's filters ride along so the list pane stays as it was. */
export function specHash(lineageId: string, filters: Filters, sort?: SortId): string {
  const query = filterParams(filters);
  for (const [key, value] of sortParams(sort ?? 'name')) query.set(key, value);
  return formatHash(['drinks', lineageId], query);
}
