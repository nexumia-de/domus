// The one filter over every dish (./entry.ts): what the user feels like. The lists, the finder
// and the random pick share it, and it is kept in localStorage like the theme. Pure but for the
// functions that take a store. Every screen reads and keeps it through `currentDishFilter` and
// `keepDishFilter`, so that a choice holds for the page even where the browser keeps nothing.
import type { Course } from '@culina/engine';
import { browserStore, type KeyValueStore } from '../prefs';
import type { DishEntry, Origin } from './entry';

export interface DishFilter {
  /** Only dishes of this origin; undefined: both. */
  origin?: Origin;
  /** Only dishes with this character (an id of the character table). */
  character?: string;
  /** Only dishes of this course. */
  course?: string;
  /** Only dishes of this cuisine (a country code). */
  cuisine?: string;
  /** True: only dishes known to be without meat and fish. */
  meatFree?: true;
  /** True: only dishes whose every line has an amount. */
  completeOnly?: true;
}

export const EMPTY_FILTER: DishFilter = {};

/** True when no choice narrows the list. */
export const isEmptyFilter = (f: DishFilter): boolean =>
  f.origin === undefined &&
  f.character === undefined &&
  f.course === undefined &&
  f.cuisine === undefined &&
  f.meatFree !== true &&
  f.completeOnly !== true;

/** Whether an entry passes every choice of the filter. */
export const matchesFilter = (entry: DishEntry, f: DishFilter): boolean =>
  (f.origin === undefined || entry.origin === f.origin) &&
  (f.character === undefined || entry.characters.includes(f.character)) &&
  (f.course === undefined || entry.course === f.course) &&
  (f.cuisine === undefined || entry.cuisine === f.cuisine) &&
  (f.meatFree !== true || entry.meatFree === true) &&
  (f.completeOnly !== true || entry.complete);

/** Trimmed, case-insensitive substring of the name; an empty query keeps everything. */
export const matchesQuery = (entry: DishEntry, query: string): boolean => {
  const q = query.trim().toLowerCase();
  return q === '' || entry.name.toLowerCase().includes(q);
};

export interface Offered {
  origins: Origin[];
  characters: string[];
  courses: string[];
  cuisines: string[];
}

const inOrder = (found: Set<string>, order: readonly string[]): string[] => [
  ...order.filter((v) => found.has(v)),
  ...[...found].filter((v) => !order.includes(v)).sort(),
];

/**
 * The values at least one entry has, so that a control offers no choice that finds nothing in an
 * unfiltered list. Characters, courses and cuisines come in the given order; a value outside it
 * follows, sorted.
 */
export const offeredBy = (
  entries: readonly DishEntry[],
  order: {
    characters: readonly string[];
    courses: readonly string[];
    cuisines: readonly string[];
  },
): Offered => ({
  origins: (['own', 'shipped'] as const).filter((o) => entries.some((e) => e.origin === o)),
  characters: inOrder(new Set(entries.flatMap((e) => e.characters)), order.characters),
  courses: inOrder(
    new Set(entries.flatMap((e) => (e.course === undefined ? [] : [e.course]))),
    order.courses,
  ),
  cuisines: inOrder(
    new Set(entries.flatMap((e) => (e.cuisine === undefined ? [] : [e.cuisine]))),
    order.cuisines,
  ),
});

/** The order in which courses are offered (the engine's `Course`). */
export const COURSE_ORDER: readonly Course[] = [
  'starter',
  'soup',
  'main',
  'side',
  'dessert',
  'baking',
  'sauce',
  'breakfast',
  'snack',
];

export const DISH_FILTER_KEY = 'culina.dishes';

const text = (v: unknown): string | undefined =>
  typeof v === 'string' && v !== '' ? v : undefined;

/** Anything unreadable is the empty filter; a field that does not fit is left out. */
export const parseDishFilter = (value: unknown): DishFilter => {
  let raw: unknown = value;
  if (typeof value === 'string') {
    try {
      raw = JSON.parse(value);
    } catch {
      return {};
    }
  }
  if (typeof raw !== 'object' || raw === null) return {};
  const r = raw as Record<string, unknown>;
  const character = text(r['character']);
  const course = text(r['course']);
  const cuisine = text(r['cuisine']);
  return {
    ...(r['origin'] === 'own' || r['origin'] === 'shipped' ? { origin: r['origin'] } : {}),
    ...(character === undefined ? {} : { character }),
    ...(course === undefined ? {} : { course }),
    ...(cuisine === undefined ? {} : { cuisine }),
    ...(r['meatFree'] === true ? { meatFree: true as const } : {}),
    ...(r['completeOnly'] === true ? { completeOnly: true as const } : {}),
  };
};

export const readDishFilter = (store: KeyValueStore | null): DishFilter => {
  try {
    return parseDishFilter(store?.getItem(DISH_FILTER_KEY));
  } catch {
    return {};
  }
};

/** False when the choice could not be kept (no storage, quota, private mode). */
export const writeDishFilter = (store: KeyValueStore | null, filter: DishFilter): boolean => {
  try {
    if (!store) return false;
    store.setItem(DISH_FILTER_KEY, JSON.stringify(filter));
    return true;
  } catch {
    return false;
  }
};

/** The choice the store could not keep (private mode, no storage): it holds until the page closes. */
let unkept: DishFilter | undefined;

/** The one filter as every screen reads it: the choice the store could not keep, else the stored one. */
export const currentDishFilter = (store: KeyValueStore | null = browserStore()): DishFilter =>
  unkept ?? readDishFilter(store);

/**
 * Keeps the filter for every screen: in the store, or, where the store keeps nothing, for this
 * page. False when the store could not keep it.
 */
export const keepDishFilter = (
  filter: DishFilter,
  store: KeyValueStore | null = browserStore(),
): boolean => {
  const kept = writeDishFilter(store, filter);
  unkept = kept ? undefined : filter;
  return kept;
};
