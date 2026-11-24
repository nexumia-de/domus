// The notebook cache: every record in memory (every version of a component or dish), so the screens stay synchronous. The store is
// opened and read once at startup (start.ts); writes go through the store first and only then
// change the cache (actions.ts). Without a store the cache is the empty, read-only notebook.
import type { CookedRecord, SkillRecord } from '@culina/engine';
import type { StockSpace } from '../shared-stock/space';
import type { ErrorCode, Store } from '../store';
import type { ComponentRecord, DishRecord, IngredientRecord, TastingRecord } from '../records';
import { localDayOf } from '../shared/day';

export interface NotebookState {
  ingredients: IngredientRecord[];
  components: ComponentRecord[];
  dishes: DishRecord[];
  tastings: TastingRecord[];
  /**
   * What is there: the collection `stock` of the used space, in the database all apps share
   * (src/shared-stock). Undefined before the start and in tests that do not need it.
   */
  stockSpace: StockSpace | undefined;
  /** Which techniques the user marked as learned: one record per technique. */
  skills: SkillRecord[];
  /** The day each own dish was last cooked: one record per dish family. */
  cooked: CookedRecord[];
  /** Undefined when the store could not be opened. */
  store: Store | undefined;
  /** Why the store could not be opened. */
  problem: ErrorCode | undefined;
  now: () => string;
  /**
   * The time zone of the device's calendar day (an IANA name); undefined is the device's own, as
   * the browser reports it. Only the day a dish was cooked reads it (`localToday`); tests set it.
   */
  timeZone: string | undefined;
  newId: () => string;
}

export const state: NotebookState = {
  ingredients: [],
  components: [],
  dishes: [],
  tastings: [],
  stockSpace: undefined,
  skills: [],
  cooked: [],
  store: undefined,
  problem: undefined,
  now: () => new Date().toISOString(),
  timeZone: undefined,
  newId: () => `u-${crypto.randomUUID()}`,
};

type Listener = () => void;
const listeners = new Set<Listener>();

/** Called after every change of the cache. Returns the way to stop listening. */
export const subscribe = (listener: Listener): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
export const emit = (): void => {
  for (const listener of listeners) listener();
};

const byName = (a: { name: string }, b: { name: string }): number =>
  a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }) ||
  (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);

export const sorted = <T extends { name: string }>(list: readonly T[]): T[] =>
  [...list].sort(byName);

/**
 * The calendar day of the injected clock in UTC, `YYYY-MM-DD`: the day of a version, a tasting
 * note and the stock's days left. (An open point: it is not the device's day; see `localToday`.)
 */
export const today = (): string => state.now().slice(0, 10);

/**
 * The device's calendar day at the injected clock's instant, `YYYY-MM-DD`, in `state.timeZone`
 * (the device's zone unless a test sets one): the day a dish was cooked is the cook's day, so a
 * dish cooked at 00:30 in Berlin is kept on that day, not on the UTC day before.
 */
export const localToday = (): string => localDayOf(state.now(), state.timeZone);

/** Empties the cache and forgets the store (tests; a store that could not open). */
export const reset = (): void => {
  state.ingredients = [];
  state.components = [];
  state.dishes = [];
  state.tastings = [];
  state.stockSpace?.stop();
  state.stockSpace = undefined;
  state.skills = [];
  state.cooked = [];
  state.store = undefined;
  state.problem = undefined;
  state.timeZone = undefined;
};
