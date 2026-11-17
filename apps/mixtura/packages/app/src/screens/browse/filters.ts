// Search and filters of the drinks list as a pure module: parsing them from
// the URL, writing them back, applying them to the model, and naming the
// active ones for the chips (docs/screens-browse.md#filters). The URL is the
// only place they live.

import { isA } from '@mixtura/engine';
import type { BrowseModel, Drink } from './model';
import { normalise } from './normalise';
import { bandOf, inBand } from './strength';

export interface Filters {
  q: string;
  template?: string;
  method?: string;
  base?: string;
  strength?: string;
}

export const FILTER_KEYS = ['template', 'method', 'base', 'strength'] as const;
export type FilterKey = (typeof FILTER_KEYS)[number];

export function parseFilters(query: URLSearchParams): Filters {
  const filters: Filters = { q: (query.get('q') ?? '').trim() };
  for (const key of FILTER_KEYS) {
    const value = query.get(key);
    if (value) filters[key] = value;
  }
  return filters;
}

/** The query for these filters, in a fixed order; empty values are left out. */
export function filterParams(filters: Filters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  for (const key of FILTER_KEYS) {
    const value = filters[key];
    if (value) params.set(key, value);
  }
  return params;
}

/** The filters with one group turned off, or set to `value`. */
export function withFilter(filters: Filters, key: FilterKey, value?: string): Filters {
  const next: Filters = { q: filters.q };
  for (const other of FILTER_KEYS) {
    const kept = other === key ? value : filters[other];
    if (kept !== undefined) next[other] = kept;
  }
  return next;
}

/** The search text alone: every filter off. */
export function withoutFilters(filters: Filters): Filters {
  return { q: filters.q };
}

export function activeFilters(filters: Filters): FilterKey[] {
  return FILTER_KEYS.filter((key) => filters[key]);
}

/** Search words are all required, each as a substring of the drink's search text. */
export function matchesSearch(drink: Drink, q: string): boolean {
  const words = normalise(q).split(' ').filter(Boolean);
  return words.every((word) => drink.search.includes(word));
}

export function matchesFilters(model: BrowseModel, drink: Drink, filters: Filters): boolean {
  const { spec } = drink;
  if (filters.q && !matchesSearch(drink, filters.q)) return false;
  if (filters.template && spec.templateId !== filters.template) return false;
  if (filters.method && spec.method !== filters.method) return false;
  const base = filters.base;
  if (base && !model.baseIngredientsOf(spec).some((id) => isA(model.tree, id, base))) return false;
  if (filters.strength) {
    const band = bandOf(filters.strength);
    const abv = model.abvOf(spec);
    if (!band || abv === undefined || !inBand(band, abv)) return false;
  }
  return true;
}

export function applyFilters(
  model: BrowseModel,
  filters: Filters,
  from: readonly Drink[] = model.drinks,
): Drink[] {
  return from.filter((drink) => matchesFilters(model, drink, filters));
}

export interface Chip {
  key: FilterKey;
  label: string;
}

/** The active filters with the words the chips show; an id the data lacks shows as it is. */
export function chipsOf(
  model: BrowseModel,
  filters: Filters,
  words: {
    template: (name: string) => string;
    base: (name: string) => string;
  },
): Chip[] {
  const chips: Chip[] = [];
  for (const key of activeFilters(filters)) {
    const value = filters[key] as string;
    const label = {
      template: () => words.template(model.templateById.get(value)?.name ?? value),
      method: () => model.vocabulary.methods.find((m) => m.id === value)?.name ?? value,
      base: () => words.base(model.ingredientName(value) ?? value),
      strength: () => bandOf(value)?.label ?? value,
    }[key]();
    chips.push({ key, label });
  }
  return chips;
}
