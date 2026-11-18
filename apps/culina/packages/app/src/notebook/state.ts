// The notebook cache: every record in memory (every version of a component or dish), so the screens stay synchronous. The store is
// opened and read once at startup (start.ts); writes go through the store first and only then
// change the cache (actions.ts). Without a store the cache is the empty, read-only notebook.
import type { ErrorCode, Store } from '../store';
import type {
  ComponentRecord,
  DishRecord,
  IngredientRecord,
  StockRecord,
  TastingRecord,
} from '../records';

export interface NotebookState {
  ingredients: IngredientRecord[];
  components: ComponentRecord[];
  dishes: DishRecord[];
  tastings: TastingRecord[];
  /** What is there, in the order the store lists it; the screens sort. */
  stock: StockRecord[];
  /** Undefined when the store could not be opened. */
  store: Store | undefined;
  /** Why the store could not be opened. */
  problem: ErrorCode | undefined;
  now: () => string;
  newId: () => string;
}

export const state: NotebookState = {
  ingredients: [],
  components: [],
  dishes: [],
  tastings: [],
  stock: [],
  store: undefined,
  problem: undefined,
  now: () => new Date().toISOString(),
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

/** The calendar day of the injected clock, `YYYY-MM-DD`. */
export const today = (): string => state.now().slice(0, 10);

/** Empties the cache and forgets the store (tests; a store that could not open). */
export const reset = (): void => {
  state.ingredients = [];
  state.components = [];
  state.dishes = [];
  state.tastings = [];
  state.stock = [];
  state.store = undefined;
  state.problem = undefined;
};
