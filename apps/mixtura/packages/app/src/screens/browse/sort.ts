// The order of the drinks list as a pure module: the sort id lives in the
// address (`sort=`), the default (name) is left out of it
// (docs/screens-browse.md#as-built-75). Sorting is stable, and the model
// hands the drinks over by name, so every tie falls back to the name.

import type { BrowseModel, Drink } from './model';

export const SORT_IDS = ['name', 'changed', 'template'] as const;
export type SortId = (typeof SORT_IDS)[number];
export const DEFAULT_SORT: SortId = 'name';

/** The sort named in the query; an unknown or missing value is the default. */
export function parseSort(query: URLSearchParams): SortId {
  const value = query.get('sort');
  return SORT_IDS.find((id) => id === value) ?? DEFAULT_SORT;
}

/** The query parameter for a sort; empty for the default. */
export function sortParams(sort: SortId): URLSearchParams {
  const params = new URLSearchParams();
  if (sort !== DEFAULT_SORT) params.set('sort', sort);
  return params;
}

/** When a drink was last changed, in ms; undefined for built-in drinks, which carry no date. */
function changedAt(drink: Drink): number | undefined {
  const text = drink.spec.updatedAt ?? drink.spec.createdAt;
  const time = text === undefined ? NaN : Date.parse(text);
  return Number.isNaN(time) ? undefined : time;
}

/**
 * The drinks in this order: by name, by last change (newest first, drinks
 * without a date last), or by template name (drinks without a template last).
 */
export function sortDrinks(model: BrowseModel, drinks: readonly Drink[], sort: SortId): Drink[] {
  const list = [...drinks];
  if (sort === 'changed') {
    return list.sort((a, b) => {
      const x = changedAt(a);
      const y = changedAt(b);
      if (x === y) return 0;
      if (x === undefined) return 1;
      if (y === undefined) return -1;
      return y - x;
    });
  }
  if (sort === 'template') {
    const nameOf = (d: Drink): string | undefined =>
      d.spec.templateId === undefined ? undefined : model.templateById.get(d.spec.templateId)?.name;
    return list.sort((a, b) => {
      const x = nameOf(a);
      const y = nameOf(b);
      if (x === y) return 0;
      if (x === undefined) return 1;
      if (y === undefined) return -1;
      return x.localeCompare(y, 'en');
    });
  }
  return list;
}
